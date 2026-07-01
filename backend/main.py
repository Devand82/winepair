from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import httpx, base64, os, json
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="WinePair API", version="1.0.0")

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
    {"id": "google/gemini-2.0-flash-001", "name": "Gemini 2.0 Flash", "supports_vision": True, "provider": "Google", "description": "Veloce, basso costo. Richiede credito OpenRouter."},
    {"id": "anthropic/claude-3.5-haiku", "name": "Claude 3.5 Haiku", "supports_vision": False, "provider": "Anthropic", "description": "Preciso, solo testo. Richiede credito OpenRouter."},
]


class Food(BaseModel):
    name: str
    category: str
    emoji: str
    description: Optional[str] = ""


class Wine(BaseModel):
    name: str
    type: str
    region: Optional[str] = ""
    vintage: Optional[str] = None
    menu_price: Optional[str] = ""
    glass_available: Optional[bool] = False


class MenuData(BaseModel):
    foods: List[Food]
    wines: List[Wine]


class ExtractTextRequest(BaseModel):
    menu_text: str
    model: Optional[str] = None


class PairRequest(BaseModel):
    food: Food
    wines: List[Wine]
    model: Optional[str] = None


async def call_openrouter(messages, model):
    model = model or DEFAULT_MODEL
    body = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
    }
    if model != "openrouter/free":
        body["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient(timeout=120) as client:
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


def parse_json_response(raw: dict, endpoint: str):
    content = raw["choices"][0]["message"]["content"]
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(422,
            f"Risposta del modello non valida. Il modello non ha restituito JSON valido. "
            f"Risposta grezza: {content[:500]}"
        )
    return data


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/models")
async def get_models():
    return {"default": DEFAULT_MODEL, "models": AVAILABLE_MODELS}


@app.post("/api/extract-text")
async def extract_text(req: ExtractTextRequest):
    prompt = (
        "Sei un esperto sommelier e chef italiano. Analizza il seguente menù.\n"
        "Restituisci SOLO un JSON valido:\n"
        '{"foods":[{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars"}],'
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
    return MenuData(**data)


@app.post("/api/extract-image")
async def extract_image(
    file: UploadFile = File(...),
    model: str = Form("openai/gpt-4o"),
    extra_text: str = Form(""),
):
    image_bytes = await file.read()
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    mime = file.content_type or "image/jpeg"

    prompt = (
        "Sei un esperto sommelier e chef italiano. Analizza il menù nell'immagine.\n"
        "Restituisci SOLO un JSON valido:\n"
        '{"foods":[{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars"}],'
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
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{b64}"},
                },
            ],
        }
    ]

    raw = await call_openrouter(messages, model)
    data = parse_json_response(raw, "extract-image")
    if not data.get("foods"):
        raise HTTPException(422, "Nessun piatto trovato nell'immagine")
    if not data.get("wines"):
        raise HTTPException(422, "Nessun vino trovato. Includi la carta vini nell'immagine")
    return MenuData(**data)


@app.post("/api/pair")
async def pair_wine(req: PairRequest):
    wines_list = "\n".join(
        f"{i+1}. {w.name} | {w.type} | {w.region or 'N/D'} | {w.vintage or 'N/D'} | {w.menu_price or 'N/D'}"
        for i, w in enumerate(req.wines)
    )

    prompt = (
        "Sei un sommelier professionista italiano con 20 anni di esperienza.\n"
        f'Il cliente ha scelto: "{req.food.name}" ({req.food.description or req.food.category}).\n'
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
