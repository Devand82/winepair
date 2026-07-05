from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import Optional, List
import httpx, base64, os, json, re
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="WinePair API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "openrouter/free")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

AVAILABLE_MODELS = [
    {"id": "openrouter/free", "name": "Free Router", "supports_vision": True, "provider": "OpenRouter", "description": "Seleziona automaticamente il miglior modello free. Supporta immagini e JSON strutturato."},
    {"id": "google/gemma-4-31b-it:free", "name": "Gemma 4 31B (Free)", "supports_vision": True, "provider": "Google", "description": "Modello free Google. Supporta immagini (rate limitato)."},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "supports_vision": True, "provider": "OpenAI", "description": "Veloce, economico. Richiede credito OpenRouter."},
    {"id": "openai/gpt-4o", "name": "GPT-4o", "supports_vision": True, "provider": "OpenAI", "description": "Massima qualità. Richiede credito OpenRouter."},
    {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "supports_vision": True, "provider": "Google", "description": "Veloce, basso costo. Richiede credito OpenRouter."},
    {"id": "anthropic/claude-3.5-haiku", "name": "Claude 3.5 Haiku", "supports_vision": False, "provider": "Anthropic", "description": "Preciso, solo testo. Richiede credito OpenRouter."},
]


class Food(BaseModel):
    name: str
    category: str
    emoji: str
    description: Optional[str] = ""
    menu_price: Optional[str] = ""


class Wine(BaseModel):
    name: str
    type: str
    region: Optional[str] = ""
    vintage: Optional[str] = None
    menu_price: Optional[str] = ""
    glass_available: Optional[bool] = False

    @field_validator("vintage", mode="before")
    @classmethod
    def coerce_vintage(cls, v):
        if v is not None:
            return str(v)
        return v


class MenuData(BaseModel):
    foods: List[Food]
    wines: List[Wine]
    raw_text: Optional[str] = ""


class ExtractTextRequest(BaseModel):
    menu_text: str
    model: Optional[str] = None


class PairRequest(BaseModel):
    food: Food
    wines: List[Wine]
    model: Optional[str] = None
    max_price: Optional[float] = None


class PairReverseRequest(BaseModel):
    wine_type: str
    name: Optional[str] = ""
    region: Optional[str] = ""
    max_price: Optional[float] = None
    model: Optional[str] = None


class PairBatchRequest(BaseModel):
    foods: List[Food]
    wines: List[Wine]
    model: Optional[str] = None


JSON_SUPPORTING_MODELS = {
    "openrouter/free", "openai/gpt-4o-mini", "openai/gpt-4o",
    "google/gemini-2.5-flash",
}

async def call_openrouter(messages, model):
    model = model or DEFAULT_MODEL
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            body = {
                "model": model,
                "messages": messages,
                "temperature": 0.2,
            }
            if model in JSON_SUPPORTING_MODELS:
                body["response_format"] = {"type": "json_object"}
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            if resp.status_code == 402:
                raise HTTPException(402, "Credito OpenRouter insufficiente. Ricarica su openrouter.ai")
            if resp.status_code == 429:
                raise HTTPException(429, "Troppe richieste. Attendi qualche secondo e riprova.")
            if resp.status_code != 200:
                detail = resp.text or "Richiesta al server LLM fallita"
                raise HTTPException(502, detail)
            return resp.json()
    except httpx.TimeoutException:
        raise HTTPException(504, "Il modello non risponde. Il free model potrebbe essere sovraccarico. Riprova o cambia modello nelle impostazioni.")
    except httpx.RequestError as e:
        raise HTTPException(502, f"Errore di connessione: {e}")


def extract_json(text: str) -> dict | list | None:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to extract JSON from markdown code blocks
    m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try to find first { and last } or first [ and last ]
    for start, end in [('{', '}'), ('[', ']')]:
        s = text.find(start)
        e = text.rfind(end)
        if s != -1 and e != -1 and e > s:
            candidate = text[s:e+1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

    return None


def parse_json_response(raw: dict, endpoint: str):
    if "choices" not in raw or not raw["choices"]:
        detail = json.dumps(raw, ensure_ascii=False)[:300]
        raise HTTPException(502, f"Risposta inattesa dal modello: {detail}")
    content = raw["choices"][0]["message"]["content"]

    data = extract_json(content)
    if data is not None:
        return data

    # If the model wraps the JSON with extra text, try to find the outermost JSON
    raise HTTPException(422,
        f"Risposta del modello non valida. Il modello non ha restituito JSON valido. "
        f"Risposta grezza: {content[:500]}"
    )


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.1.0"}


@app.get("/api/models")
async def get_models():
    return {"default": DEFAULT_MODEL, "models": AVAILABLE_MODELS}


@app.post("/api/extract-text")
async def extract_text(req: ExtractTextRequest):
    prompt = (
        "Sei un esperto sommelier e chef italiano. Analizza il seguente menù.\n"
        "Restituisci SOLO un JSON valido:\n"
        '{"foods":[{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars","menu_price":""}],'
        '"wines":[{"name":"","type":"rosso|bianco|rosè|spumante|dolce","region":"","vintage":null,"menu_price":"","glass_available":false}]}\n'
        "Includi TUTTI i piatti e TUTTI i vini. Non inventare nulla.\n"
        "MENÙ:\n---\n" + req.menu_text + "\n---"
    )
    raw = await call_openrouter(
        [{"role": "user", "content": prompt}], req.model
    )
    data = parse_json_response(raw, "extract-text")
    if not data.get("foods"):
        raise HTTPException(422, "Nessun piatto trovato nel menù")
    if not data.get("wines"):
        raise HTTPException(422, "Nessun vino trovato. Includi la carta vini nel testo")
    data["raw_text"] = req.menu_text
    return MenuData(**data)


@app.post("/api/extract-image")
async def extract_image(
    files: List[UploadFile] = File(...),
    model: str = Form("openai/gpt-4o"),
    extra_text: str = Form(""),
):
    MAX_FILE_SIZE = 10 * 1024 * 1024
    all_text_parts = []
    image_contents = []

    for file in files:
        image_bytes = await file.read()
        if len(image_bytes) > MAX_FILE_SIZE:
            raise HTTPException(413, f"File {file.filename} troppo grande (max 10MB)")
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        mime = file.content_type or "image/jpeg"
        image_contents.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mime};base64,{b64}"},
        })
        all_text_parts.append(f"[Immagine: {file.filename}]")

    prompt = (
        "Sei un esperto sommelier e chef italiano. Analizza il menù nelle immagini.\n"
        "Restituisci SOLO un JSON valido:\n"
        '{"foods":[{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars","menu_price":""}],'
        '"wines":[{"name":"","type":"rosso|bianco|rosè|spumante|dolce","region":"","vintage":null,"menu_price":"","glass_available":false}]}\n'
        "Includi TUTTI i piatti e TUTTI i vini. Non inventare nulla."
    )
    if extra_text:
        prompt += "\n\nNote aggiuntive:\n" + extra_text

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                *image_contents,
            ],
        }
    ]

    raw = await call_openrouter(messages, model)
    data = parse_json_response(raw, "extract-image")
    if not data.get("foods"):
        raise HTTPException(422, "Nessun piatto trovato nell'immagine")
    if not data.get("wines"):
        raise HTTPException(422, "Nessun vino trovato. Includi la carta vini nell'immagine")
    data["raw_text"] = "; ".join(all_text_parts)
    return MenuData(**data)


@app.post("/api/pair")
async def pair_wine(req: PairRequest):
    wines_list = "\n".join(
        f"{i+1}. {w.name} | {w.type} | {w.region or 'N/D'} | {w.vintage or 'N/D'} | {w.menu_price or 'N/D'}"
        for i, w in enumerate(req.wines)
    )

    price_filter = ""
    if req.max_price:
        price_filter = f"Seleziona solo vini con prezzo massimo di {req.max_price}€.\n"

    prompt = (
        "Sei un sommelier professionista italiano con 20 anni di esperienza.\n"
        f'Il cliente ha scelto: "{req.food.name}" ({req.food.description or req.food.category}).\n'
        + price_filter +
        "Vini disponibili:\n" + wines_list + "\n\n"
        "Seleziona il vino che si abbina MEGLIO. SOLO JSON valido:\n"
        '{"wine_index":int,"wine_name":"","wine_type":"","region":"","vintage":null,'
        '"menu_price":"","avg_market_price":"es. 25-35€","color":"colore e aspetto visivo",'
        '"nose":"profumi principali","palate":"gusto corpo struttura","temperature":"temp servizio",'
        '"food_match_score":8,"pairing_reason":"2-3 frasi tecniche da sommelier",'
        '"pairing_principle":"concordanza|contrapposizione|territorialità|grassezza",'
        '"alternative_wine_index":null,"alternative_note":null}'
    )

    raw = await call_openrouter(
        [{"role": "user", "content": prompt}], req.model
    )
    return parse_json_response(raw, "pair")


@app.post("/api/pair-reverse")
async def pair_reverse(req: PairReverseRequest):
    prompt = (
        "Sei un sommelier professionista italiano con 20 anni di esperienza.\n"
        f'Il cliente ha un vino: "{req.wine_type}"'
        + (f' "{req.name}"' if req.name else "")
        + (f' della regione {req.region}' if req.region else "")
        + ".\n"
        + (f"Budget massimo per piatto: {req.max_price}€.\n" if req.max_price else "")
        + "Suggerisci 5 piatti che si abbinano bene a questo vino. "
        "Restituisci SOLO un JSON valido:\n"
        '{"suggestions":['
        '{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars",'
        '"score":8,"pairing_reason":"spiega l\'abbinamento","pairing_principle":"concordanza|contrapposizione|territorialità|grassezza"}'
        "]}\n"
        "Includi un mix di categorie. Dai la priorità ai migliori abbinamenti."
    )

    raw = await call_openrouter(
        [{"role": "user", "content": prompt}], req.model
    )
    data = parse_json_response(raw, "pair-reverse")
    if not data.get("suggestions"):
        raise HTTPException(422, "Nessun suggerimento trovato")
    return data


@app.post("/api/identify-wine")
async def identify_wine(
    file: UploadFile = File(...),
    model: str = Form("openai/gpt-4o"),
):
    MAX_FILE_SIZE = 10 * 1024 * 1024
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(413, "File troppo grande (max 10MB)")
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    mime = file.content_type or "image/jpeg"

    prompt = (
        "Sei un sommelier ed esperto di vini. Identifica il vino nell'immagine.\n"
        "Restituisci SOLO un JSON valido:\n"
        '{"name":"","type":"rosso|bianco|rosè|spumante|dolce","region":"","vintage":null,'
        '"alcohol":"es. 13.5%","grape":"uvaggio principale","description":"breve descrizione del vino",'
        '"serving_temp":"temperatura di servizio"}\n'
        "Se non puoi identificare esattamente, fornisci una stima basata sull'etichetta."
    )

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{b64}"},
                },
            ],
        }
    ]

    raw = await call_openrouter(messages, model)
    data = parse_json_response(raw, "identify-wine")
    if not data.get("name"):
        raise HTTPException(422, "Impossibile identificare il vino")
    return data


class FetchMenuRequest(BaseModel):
    url: str
    model: Optional[str] = None


@app.post("/api/fetch-menu")
async def fetch_menu(req: FetchMenuRequest):
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(req.url, headers={"User-Agent": "WinePair/1.0"})
            if resp.status_code != 200:
                raise HTTPException(502, f"Impossibile scaricare il menù da {req.url} (HTTP {resp.status_code})")
            content_type = resp.headers.get("content-type", "").lower()
            raw_bytes = resp.content
    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout durante il download del menù. Verifica l'URL e riprova.")
    except httpx.RequestError as e:
        raise HTTPException(502, f"Errore di connessione: {e}")

    extracted_text = ""

    if "pdf" in content_type:
        from io import BytesIO
        from pypdf import PdfReader
        try:
            reader = PdfReader(BytesIO(raw_bytes))
            pages = [p.extract_text() for p in reader.pages if p.extract_text()]
            extracted_text = "\n".join(pages)
        except Exception as e:
            raise HTTPException(422, f"Impossibile estrarre il testo dal PDF: {e}")

    elif "html" in content_type:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(raw_bytes, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        extracted_text = soup.get_text(separator="\n", strip=True)

    elif "json" in content_type:
        raw_text = raw_bytes.decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            extracted_text = raw_text
        else:
            if isinstance(parsed, dict):
                extracted_text = json.dumps(parsed, ensure_ascii=False, indent=2)
            else:
                extracted_text = raw_text

    else:
        extracted_text = raw_bytes.decode("utf-8", errors="replace")

    if not extracted_text.strip():
        raise HTTPException(422, "Nessun testo estratto dal menù. Il QR potrebbe non puntare a un menù testuale.")

    prompt = (
        "Sei un esperto sommelier e chef italiano. Analizza il seguente menù.\n"
        "Restituisci SOLO un JSON valido:\n"
        '{"foods":[{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars","menu_price":""}],'
        '"wines":[{"name":"","type":"rosso|bianco|rosè|spumante|dolce","region":"","vintage":null,"menu_price":"","glass_available":false}]}\n'
        "Includi TUTTI i piatti e TUTTI i vini. Non inventare nulla.\n"
        "MENÙ:\n---\n" + extracted_text + "\n---"
    )
    raw = await call_openrouter(
        [{"role": "user", "content": prompt}], req.model
    )
    data = parse_json_response(raw, "fetch-menu")
    if not data.get("foods"):
        raise HTTPException(422, "Nessun piatto trovato nel menù")
    if not data.get("wines"):
        raise HTTPException(422, "Nessun vino trovato. Includi la carta vini")
    data["raw_text"] = extracted_text
    return MenuData(**data)


@app.post("/api/extract-document")
async def extract_document(
    files: List[UploadFile] = File(...),
    model: str = Form("openai/gpt-4o"),
    extra_text: str = Form(""),
):
    from io import BytesIO
    from pypdf import PdfReader
    import base64

    all_text_parts = []
    image_contents = []
    text_content = ""
    MAX_FILE_SIZE = 10 * 1024 * 1024

    for file in files:
        raw_bytes = await file.read()
        if len(raw_bytes) > MAX_FILE_SIZE:
            raise HTTPException(413, f"File {file.filename} troppo grande (max 10MB)")

        ct = file.content_type or ""
        name_lower = file.filename.lower() if file.filename else ""

        if "pdf" in ct or name_lower.endswith(".pdf"):
            try:
                reader = PdfReader(BytesIO(raw_bytes))
                pages = [p.extract_text() for p in reader.pages if p.extract_text()]
                page_text = "\n".join(pages)
                text_content += "\n" + page_text
                all_text_parts.append(f"[PDF: {file.filename}]")
            except Exception as e:
                raise HTTPException(422, f"Impossibile leggere il PDF {file.filename}: {e}")
        else:
            b64 = base64.b64encode(raw_bytes).decode("utf-8")
            mime = ct or "image/jpeg"
            image_contents.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{b64}"},
            })
            all_text_parts.append(f"[Immagine: {file.filename}]")

    if text_content.strip() and not image_contents:
        prompt = (
            "Sei un esperto sommelier e chef italiano. Analizza il seguente menù.\n"
            "Restituisci SOLO un JSON valido:\n"
            '{"foods":[{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars","menu_price":""}],'
            '"wines":[{"name":"","type":"rosso|bianco|rosè|spumante|dolce","region":"","vintage":null,"menu_price":"","glass_available":false}]}\n'
            "Includi TUTTI i piatti e TUTTI i vini. Non inventare nulla.\n"
            "MENÙ:\n---\n" + text_content + "\n---"
        )
        if extra_text:
            prompt += "\n\nNote aggiuntive:\n" + extra_text
        messages = [{"role": "user", "content": prompt}]
    elif image_contents:
        prompt = (
            "Sei un esperto sommelier e chef italiano. Analizza il menù nelle immagini.\n"
            "Restituisci SOLO un JSON valido:\n"
            '{"foods":[{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars","menu_price":""}],'
            '"wines":[{"name":"","type":"rosso|bianco|rosè|spumante|dolce","region":"","vintage":null,"menu_price":"","glass_available":false}]}\n'
            "Includi TUTTI i piatti e TUTTI i vini. Non inventare nulla."
        )
        if text_content.strip():
            prompt += "\n\nTesto aggiuntivo dal PDF:\n" + text_content
        if extra_text:
            prompt += "\n\nNote aggiuntive:\n" + extra_text
        messages = [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                *image_contents,
            ],
        }]
    else:
        raise HTTPException(422, "Nessun file valido inviato.")

    raw = await call_openrouter(messages, model)
    data = parse_json_response(raw, "extract-document")
    if not data.get("foods"):
        raise HTTPException(422, "Nessun piatto trovato nel documento")
    if not data.get("wines"):
        raise HTTPException(422, "Nessun vino trovato. Includi la carta vini nel documento")
    data["raw_text"] = "; ".join(all_text_parts)
    return MenuData(**data)


@app.post("/api/pair-batch")
async def pair_batch(req: PairBatchRequest):
    results = []
    for food in req.foods:
        wines_list = "\n".join(
            f"{i+1}. {w.name} | {w.type} | {w.region or 'N/D'} | {w.vintage or 'N/D'} | {w.menu_price or 'N/D'}"
            for i, w in enumerate(req.wines)
        )

        prompt = (
            "Sei un sommelier professionista italiano con 20 anni di esperienza.\n"
            f'Il cliente ha scelto: "{food.name}" ({food.description or food.category}).\n'
            "Vini disponibili:\n" + wines_list + "\n\n"
            "Seleziona il vino che si abbina MEGLIO. SOLO JSON valido:\n"
            '{"wine_index":int,"wine_name":"","wine_type":"","region":"","vintage":null,'
            '"menu_price":"","avg_market_price":"es. 25-35€","color":"colore e aspetto visivo",'
            '"nose":"profumi principali","palate":"gusto corpo struttura","temperature":"temp servizio",'
            '"food_match_score":8,"pairing_reason":"2-3 frasi tecniche da sommelier",'
            '"pairing_principle":"concordanza|contrapposizione|territorialità|grassezza",'
            '"alternative_wine_index":null,"alternative_note":null}'
        )

        raw = await call_openrouter(
            [{"role": "user", "content": prompt}], req.model
        )
        result = parse_json_response(raw, "pair-batch")
        results.append(result)
    return results


class LookupPriceRequest(BaseModel):
    wine_name: str
    vintage: Optional[str] = None
    region: Optional[str] = None
    wine_type: Optional[str] = None
    model: Optional[str] = None


@app.post("/api/lookup-price")
async def lookup_price(req: LookupPriceRequest):
    prompt = (
        "Sei un esperto di mercato enologico con conoscenza enciclopedica dei prezzi dei vini italiani.\n"
        f'Cerca il prezzo di mercato attuale per: "{req.wine_name}"'
        + (f' {req.vintage}' if req.vintage else "")
        + (f' della regione {req.region}' if req.region else "")
        + (f' ({req.wine_type})' if req.wine_type else "")
        + ".\n"
        "Fornisci un range di prezzo preciso basato sui reali valori di mercato (enoteche, wine-shop, produttore).\n"
        "Restituisci SOLO un JSON valido:\n"
        '{"market_price":"es. 45-60€","currency":"EUR","source":"database mercato enologico","confidence":"alta|media|bassa"}\n'
        "Se non hai dati sufficienti, fornisci comunque una stima ragionata indicando confidence bassa."
    )
    raw = await call_openrouter(
        [{"role": "user", "content": prompt}], req.model
    )
    data = parse_json_response(raw, "lookup-price")
    return data
