import os
import re
import base64
import json
import io
from typing import Any, Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv
import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader

load_dotenv()

app = FastAPI(title="WinePair API", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "openrouter/free")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

JSON_SUPPORTING_MODELS = {
    "openai/gpt-4o", "openai/gpt-4o-mini",
    "openrouter/free",
    "google/gemini-2.5-flash", "google/gemini-2.0-flash-001",
    "anthropic/claude-3.5-haiku",
}

HTTPX_TIMEOUT = 60.0

# ─── Pydantic models ────────────────────────────────────────────────────────

class Food(BaseModel):
    name: str
    category: str = "altro"
    emoji: str = ""
    description: Optional[str] = ""
    menu_price: Optional[str] = ""
    weight: Optional[str] = None

class Wine(BaseModel):
    name: str
    type: str = "rosso"
    region: Optional[str] = None
    vintage: Optional[str] = None
    menu_price: Optional[str] = None
    glass_available: Optional[bool] = False
    description: Optional[str] = None
    body: Optional[str] = None

    @field_validator("vintage", mode="before")
    @classmethod
    def coerce_vintage(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v)

class MenuData(BaseModel):
    foods: list[Food] = []
    wines: list[Wine] = []
    raw_text: Optional[str] = ""

class PairingResult(BaseModel):
    wine_index: int
    wine_name: str
    wine_type: str
    region: Optional[str] = None
    vintage: Optional[str] = None
    menu_price: Optional[str] = None
    avg_market_price: Optional[str] = None
    color: Optional[str] = None
    nose: Optional[str] = None
    palate: Optional[str] = None
    temperature: Optional[str] = None
    food_match_score: Optional[float] = None
    pairing_reason: Optional[str] = None
    pairing_principle: Optional[str] = None
    alternative_wine_index: Optional[int] = None
    alternative_note: Optional[str] = None

class FoodSuggestion(BaseModel):
    name: str
    category: str = ""
    emoji: str = ""
    description: Optional[str] = ""
    score: float = 5.0
    pairing_reason: str = ""
    pairing_principle: str = ""

class PairReverseResponse(BaseModel):
    suggestions: list[FoodSuggestion] = []

class IdentifiedWine(BaseModel):
    name: str
    type: str
    region: Optional[str] = None
    vintage: Optional[str] = None
    alcohol: Optional[str] = None
    grape: Optional[str] = None
    description: Optional[str] = None
    serving_temp: Optional[str] = None

class LookupPriceResponse(BaseModel):
    market_price: str = ""
    currency: Optional[str] = "EUR"
    source: Optional[str] = None
    confidence: Optional[str] = None

class ModelInfo(BaseModel):
    id: str
    name: str
    supports_vision: bool
    provider: str
    description: str

# ─── Helpers ────────────────────────────────────────────────────────────────

FALLBACK_MODELS: list[dict] = [
    {"id": "openrouter/free", "name": "Free Router", "supports_vision": True, "provider": "OpenRouter", "description": "Seleziona automaticamente il miglior modello free."},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "supports_vision": True, "provider": "OpenAI", "description": "Veloce, economico."},
    {"id": "openai/gpt-4o", "name": "GPT-4o", "supports_vision": True, "provider": "OpenAI", "description": "Massima qualit\u00e0."},
    {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "supports_vision": True, "provider": "Google", "description": "Veloce, basso costo."},
    {"id": "anthropic/claude-3.5-haiku", "name": "Claude 3.5 Haiku", "supports_vision": False, "provider": "Anthropic", "description": "Preciso, solo testo."},
]

def extract_json(raw: str) -> Any:
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    m = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", raw, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass
    brace_m = re.search(r"\{.*\}", raw, re.DOTALL)
    if brace_m:
        try:
            return json.loads(brace_m.group(0))
        except json.JSONDecodeError:
            pass
    bracket_m = re.search(r"\[.*\]", raw, re.DOTALL)
    if bracket_m:
        try:
            return json.loads(bracket_m.group(0))
        except json.JSONDecodeError:
            pass
    raise ValueError("Impossibile estrarre JSON dalla risposta del modello")

async def call_openrouter(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    use_json: bool = True,
) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": 4096,
    }
    if use_json and model in JSON_SUPPORTING_MODELS:
        body["response_format"] = {"type": "json_object"}
    try:
        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            resp = await client.post(OPENROUTER_URL, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Richiesta al modello scaduta")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Errore di connessione: {str(e)}")
    choices = data.get("choices", [])
    if not choices:
        raise HTTPException(status_code=502, detail="Risposta del modello non valida: nessuna scelta")
    return choices[0].get("message", {}).get("content", "")

def parse_json_response(text: str) -> dict:
    obj = extract_json(text)
    if isinstance(obj, dict):
        return obj
    if isinstance(obj, list):
        return {"items": obj}
    raise ValueError("La risposta non contiene un oggetto JSON valido")

async def extract_with_vision(
    files: list[UploadFile],
    prompt: str,
    model: str = DEFAULT_MODEL,
    extra_text: str = "",
) -> str:
    images_base64 = []
    for f in files:
        data = await f.read()
        b64 = base64.b64encode(data).decode("utf-8")
        mime = f.content_type or "image/jpeg"
        images_base64.append(f"data:{mime};base64,{b64}")
    content: list[dict] = [{"type": "text", "text": prompt}]
    if extra_text:
        content.append({"type": "text", "text": f"Informazioni aggiuntive dall'utente:\n{extra_text}"})
    for img in images_base64:
        content.append({"type": "image_url", "image_url": {"url": img}})
    messages = [
        {"role": "system", "content": "Sei un sommelier esperto. Rispondi sempre in JSON."},
        {"role": "user", "content": content},
    ]
    return await call_openrouter(messages, model)

# ─── Prompt templates ───────────────────────────────────────────────────────

EXTRACT_TEXT_PROMPT = """Analizza il menu del ristorante qui sotto ed estrai l'elenco dei piatti e dei vini disponibili in formato JSON.

Per ogni piatto specifica: name (nome), category (antipasto/primo/secondo/dolce/altro), emoji (emoji rappresentativa), description (descrizione breve), menu_price (prezzo in formato stringa come "12€" o "" se non disponibile).
Per ogni vino specifica: name (nome), type (rosso/bianco/rosè/spumante/dolce), region (regione di produzione), vintage (annata come stringa o null), menu_price (prezzo in formato stringa).

Schema JSON richiesto:
{"foods": [{"name": "", "category": "", "emoji": "", "description": "", "menu_price": ""}], "wines": [{"name": "", "type": "", "region": "", "vintage": null, "menu_price": ""}], "raw_text": "testo originale del menu"}"""

PAIR_PROMPT = """Sei un sommelier esperto. Dato un piatto e una lista di vini disponibili, scegli il vino che si abbina meglio e fornisci una valutazione dettagliata.

Piatto: {food_name} ({food_category})
Descrizione: {food_description}
Prezzo: {food_price}
Vini disponibili: {wines_str}
{f_max_price}

Schema JSON richiesto:
{{"wine_index": 0, "wine_name": "", "wine_type": "", "region": "", "vintage": null, "menu_price": "", "avg_market_price": "", "color": "", "nose": "", "palate": "", "temperature": "", "food_match_score": 0, "pairing_reason": "", "pairing_principle": "", "alternative_wine_index": null, "alternative_note": null}}"""

BATCH_PAIR_PROMPT = """Sei un sommelier esperto. Date le seguenti portate di un menu degustazione e i vini disponibili, abbina ciascun piatto al vino più adatto.

Portate: {foods_str}
Vini disponibili: {wines_str}

Schema JSON richiesto (array di oggetti):
[{{"wine_index": 0, "wine_name": "", "wine_type": "", "region": "", "vintage": null, "menu_price": "", "avg_market_price": "", "food_match_score": 0, "pairing_reason": "", "pairing_principle": "", "alternative_wine_index": null, "alternative_note": null}}]"""

REVERSE_PROMPT = """Sei un sommelier esperto. Dato un vino, suggerisci i migliori piatti da abbinare.

Vino: {wine_name}
Tipo: {wine_type}
Regione: {wine_region}
{f_max_price}

Schema JSON richiesto:
{{"suggestions": [{{"name": "", "category": "", "emoji": "", "description": "", "score": 0, "pairing_reason": "", "pairing_principle": ""}}]}}"""

IDENTIFY_WINE_PROMPT = """Analizza questa foto di un'etichetta di vino e identifica il vino. Restituisci un JSON con le informazioni trovate.

Schema JSON richiesto:
{{"name": "", "type": "", "region": "", "vintage": null, "alcohol": "", "grape": "", "description": "", "serving_temp": ""}}"""

FETCH_MENU_PROMPT = """Analizza il testo del menu del ristorante qui sotto ed estrai l'elenco dei piatti e dei vini disponibili in formato JSON.

Testo del menu:
{menu_text}

Schema JSON richiesto:
{{"foods": [{{"name": "", "category": "", "emoji": "", "description": "", "menu_price": ""}}], "wines": [{{"name": "", "type": "", "region": "", "vintage": null, "menu_price": ""}}]}}"""

LOOKUP_PRICE_PROMPT = """Cerca il prezzo di mercato attuale per il seguente vino. Fornisci il prezzo in EUR basandoti sulle tue conoscenze.

Vino: {wine_name}
{f_vintage}
{f_region}
{f_wine_type}

Schema JSON richiesto:
{{"market_price": "", "currency": "EUR", "source": "", "confidence": ""}}"""

# ─── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.2.0"}

@app.get("/api/models")
async def get_models():
    return {"default": DEFAULT_MODEL, "models": FALLBACK_MODELS}

class ExtractTextRequest(BaseModel):
    menu_text: str
    model: Optional[str] = None

@app.post("/api/extract-text", response_model=MenuData)
async def extract_text(req: ExtractTextRequest):
    if not req.menu_text.strip():
        raise HTTPException(status_code=400, detail="Testo del menu vuoto")
    messages = [
        {"role": "system", "content": "Sei un sommelier. Rispondi sempre in JSON."},
        {"role": "user", "content": f"{EXTRACT_TEXT_PROMPT}\n\nMenù: {req.menu_text}"},
    ]
    resp = await call_openrouter(messages, req.model or DEFAULT_MODEL)
    data = parse_json_response(resp)
    data["raw_text"] = req.menu_text
    return MenuData(**data)

@app.post("/api/extract-image", response_model=MenuData)
async def extract_image(
    files: list[UploadFile] = File(...),
    model: Optional[str] = None,
    extra_text: Optional[str] = Form(default=""),
):
    if not files:
        raise HTTPException(status_code=400, detail="Nessun file caricato")
    prompt = EXTRACT_TEXT_PROMPT
    resp = await extract_with_vision(files, prompt, model or DEFAULT_MODEL, extra_text or "")
    data = parse_json_response(resp)
    data["raw_text"] = data.get("raw_text", "")
    return MenuData(**data)

@app.post("/api/extract-document", response_model=MenuData)
async def extract_document(
    files: list[UploadFile] = File(...),
    model: Optional[str] = None,
    extra_text: Optional[str] = Form(default=""),
):
    if not files:
        raise HTTPException(status_code=400, detail="Nessun file caricato")

    text_parts: list[str] = []
    image_files: list[UploadFile] = []

    for f in files:
        data = await f.read()
        if f.content_type == "application/pdf":
            try:
                reader = PdfReader(io.BytesIO(data))
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)
            except Exception as e:
                text_parts.append(f"[Errore lettura PDF: {str(e)}]")
        else:
            await f.seek(0)
            image_files.append(f)

    if text_parts and not image_files:
        full_text = "\n".join(text_parts)
        return await extract_text(full_text, model)

    prompt = EXTRACT_TEXT_PROMPT
    if text_parts:
        prompt += f"\n\nTesto estratto dal PDF:\n{''.join(text_parts)}"

    if image_files:
        resp = await extract_with_vision(image_files, prompt, model or DEFAULT_MODEL, extra_text or "")
    else:
        return MenuData()

    data = parse_json_response(resp)
    return MenuData(**data)

class FetchMenuRequest(BaseModel):
    url: str
    model: Optional[str] = None

@app.post("/api/fetch-menu", response_model=MenuData)
async def fetch_menu(req: FetchMenuRequest):
    if not req.url.strip():
        raise HTTPException(status_code=400, detail="URL vuoto")

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(req.url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            body = resp.content
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout nel recupero dell'URL")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Impossibile recuperare l'URL: {str(e)}")

    menu_text = ""
    if "pdf" in content_type:
        try:
            reader = PdfReader(io.BytesIO(body))
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    menu_text += t + "\n"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Errore lettura PDF: {str(e)}")
    elif "json" in content_type:
        menu_text = body.decode("utf-8", errors="replace")
    else:
        soup = BeautifulSoup(body, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        menu_text = soup.get_text(separator="\n", strip=True)

    if not menu_text.strip():
        raise HTTPException(status_code=400, detail="Nessun testo estratto dall'URL")

    messages = [
        {"role": "system", "content": "Sei un sommelier esperto. Rispondi sempre in JSON."},
        {"role": "user", "content": FETCH_MENU_PROMPT.format(menu_text=menu_text)},
    ]
    resp = await call_openrouter(messages, req.model or DEFAULT_MODEL)
    data = parse_json_response(resp)
    return MenuData(**data)

class PairRequest(BaseModel):
    food: Food
    wines: list[Wine]
    model: Optional[str] = None
    max_price: Optional[float] = None

@app.post("/api/pair", response_model=PairingResult)
async def pair(req: PairRequest):
    if not req.wines:
        raise HTTPException(status_code=400, detail="Nessun vino disponibile")
    wines_str = json.dumps([w.model_dump() for w in req.wines], ensure_ascii=False)
    f_max_price = f"Prezzo massimo: {req.max_price}€" if req.max_price else ""
    prompt = PAIR_PROMPT.format(
        food_name=req.food.name, food_category=req.food.category,
        food_description=req.food.description or "", food_price=req.food.menu_price or "",
        wines_str=wines_str, f_max_price=f_max_price,
    )
    messages = [
        {"role": "system", "content": "Sei un sommelier esperto. Rispondi sempre in JSON."},
        {"role": "user", "content": prompt},
    ]
    resp = await call_openrouter(messages, req.model or DEFAULT_MODEL)
    data = parse_json_response(resp)
    return PairingResult(**data)

class PairBatchRequest(BaseModel):
    foods: list[Food]
    wines: list[Wine]
    model: Optional[str] = None

@app.post("/api/pair-batch", response_model=list[PairingResult])
async def pair_batch(req: PairBatchRequest):
    if not req.foods:
        raise HTTPException(status_code=400, detail="Nessun piatto specificato")
    if not req.wines:
        raise HTTPException(status_code=400, detail="Nessun vino disponibile")
    foods_str = json.dumps([f.model_dump() for f in req.foods], ensure_ascii=False)
    wines_str = json.dumps([w.model_dump() for w in req.wines], ensure_ascii=False)
    prompt = BATCH_PAIR_PROMPT.format(foods_str=foods_str, wines_str=wines_str)
    messages = [
        {"role": "system", "content": "Sei un sommelier esperto. Rispondi sempre in JSON."},
        {"role": "user", "content": prompt},
    ]
    resp = await call_openrouter(messages, req.model or DEFAULT_MODEL)
    data = extract_json(resp)
    if isinstance(data, dict) and "items" in data:
        data = data["items"]
    if isinstance(data, dict):
        data = list(data.values()) if not any(k.isdigit() for k in data) else [data]
    if not isinstance(data, list):
        raise HTTPException(status_code=502, detail="Risposta non valida dal modello")
    return [PairingResult(**item) for item in data]

class PairReverseRequest(BaseModel):
    wine_type: str = "rosso"
    name: Optional[str] = None
    region: Optional[str] = None
    max_price: Optional[float] = None
    model: Optional[str] = None

@app.post("/api/pair-reverse", response_model=PairReverseResponse)
async def pair_reverse(req: PairReverseRequest):
    wine_name = req.name or f"vino {req.wine_type}"
    wine_region = req.region or "Italia"
    f_max_price = f"Prezzo massimo per piatto: {req.max_price}€" if req.max_price else ""
    prompt = REVERSE_PROMPT.format(
        wine_name=wine_name, wine_type=req.wine_type,
        wine_region=wine_region, f_max_price=f_max_price,
    )
    messages = [
        {"role": "system", "content": "Sei un sommelier esperto. Rispondi sempre in JSON."},
        {"role": "user", "content": prompt},
    ]
    resp = await call_openrouter(messages, req.model or DEFAULT_MODEL)
    data = parse_json_response(resp)
    return PairReverseResponse(**data)

@app.post("/api/identify-wine", response_model=IdentifiedWine)
async def identify_wine(
    file: UploadFile = File(...),
    model: Optional[str] = None,
):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Nessun file caricato")
    prompt = IDENTIFY_WINE_PROMPT
    resp = await extract_with_vision([file], prompt, model or DEFAULT_MODEL)
    data = parse_json_response(resp)
    return IdentifiedWine(**data)

class LookupPriceRequest(BaseModel):
    wine_name: str
    vintage: Optional[str] = None
    region: Optional[str] = None
    wine_type: Optional[str] = None
    model: Optional[str] = None

@app.post("/api/lookup-price", response_model=LookupPriceResponse)
async def lookup_price(req: LookupPriceRequest):
    if not req.wine_name.strip():
        raise HTTPException(status_code=400, detail="Nome vino richiesto")
    f_vintage = f"Annata: {req.vintage}" if req.vintage else ""
    f_region = f"Regione: {req.region}" if req.region else ""
    f_wine_type = f"Tipo: {req.wine_type}" if req.wine_type else ""
    prompt = LOOKUP_PRICE_PROMPT.format(
        wine_name=req.wine_name, f_vintage=f_vintage,
        f_region=f_region, f_wine_type=f_wine_type,
    )
    messages = [
        {"role": "system", "content": "Sei un esperto di prezzi dei vini. Rispondi sempre in JSON."},
        {"role": "user", "content": prompt},
    ]
    resp = await call_openrouter(messages, req.model or DEFAULT_MODEL)
    data = parse_json_response(resp)
    return LookupPriceResponse(**data)
