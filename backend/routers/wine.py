from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from schemas.models import LookupPriceRequest
from services.openrouter import call_openrouter, call_openrouter_with_retry
from services.file_utils import read_and_validate_file, compress_and_encode_image, encode_image
from services.llm_parser import parse_json_response
from prompts.templates import identify_wine_prompt, lookup_price_prompt

router = APIRouter()

AVAILABLE_MODELS = [
    {"id": "openrouter/free", "name": "Free Router", "supports_vision": True, "provider": "OpenRouter", "description": "Seleziona automaticamente il miglior modello free. Supporta immagini e JSON strutturato."},
    {"id": "google/gemma-4-31b-it:free", "name": "Gemma 4 31B (Free)", "supports_vision": True, "provider": "Google", "description": "Modello free Google. Supporta immagini (rate limitato)."},
    {"id": "google/gemma-4-26b-a4b-it:free", "name": "Gemma 4 26B (Free)", "supports_vision": True, "provider": "Google", "description": "Modello free Google. Supporta immagini e JSON strutturato."},
    {"id": "openai/gpt-oss-20b:free", "name": "GPT-OSS 20B (Free)", "supports_vision": False, "provider": "OpenAI", "description": "Modello free OpenAI. Solo testo, JSON strutturato."},
    {"id": "nvidia/nemotron-3-super-120b-a12b:free", "name": "Nemotron 3 Super (Free)", "supports_vision": False, "provider": "NVIDIA", "description": "Modello free NVIDIA. Solo testo, JSON strutturato."},
    {"id": "nvidia/nemotron-nano-12b-v2-vl:free", "name": "Nemotron Nano VL (Free)", "supports_vision": True, "provider": "NVIDIA", "description": "Modello free NVIDIA. Supporta immagini."},
    {"id": "openai/gpt-5-nano", "name": "GPT-5 Nano", "supports_vision": True, "provider": "OpenAI", "description": "Veloce, molto economico. Supporta immagini e JSON. Richiede credito OpenRouter."},
    {"id": "google/gemma-3-27b-it", "name": "Gemma 3 27B", "supports_vision": True, "provider": "Google", "description": "Economico, buon rapporto qualità/prezzo. Supporta immagini e JSON. Richiede credito OpenRouter."},
    {"id": "google/gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite", "supports_vision": True, "provider": "Google", "description": "Veloce, bassissimo costo, context 1M. Supporta immagini e JSON. Richiede credito OpenRouter."},
    {"id": "openai/gpt-4.1-mini", "name": "GPT-4.1 Mini", "supports_vision": True, "provider": "OpenAI", "description": "Ottimo per abbinamenti, context 1M. Supporta immagini e JSON. Richiede credito OpenRouter."},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "supports_vision": True, "provider": "OpenAI", "description": "Veloce, economico. Richiede credito OpenRouter."},
    {"id": "openai/gpt-4o", "name": "GPT-4o", "supports_vision": True, "provider": "OpenAI", "description": "Massima qualità. Richiede credito OpenRouter."},
    {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "supports_vision": True, "provider": "Google", "description": "Veloce, basso costo. Richiede credito OpenRouter."},
    {"id": "anthropic/claude-haiku-4.5", "name": "Claude Haiku 4.5", "supports_vision": True, "provider": "Anthropic", "description": "Preciso, economico. Supporta immagini e JSON. Richiede credito OpenRouter."},
]

from services.openrouter import get_default_model


@router.get("/api/models")
async def get_models():
    return {"default": get_default_model(), "models": AVAILABLE_MODELS}


@router.post("/api/identify-wine")
async def identify_wine(
    file: UploadFile = File(...),
    model: str = Form("openai/gpt-4o"),
):
    image_bytes = await file.read()
    await read_and_validate_file(image_bytes, file.filename)
    compressed, mime = await compress_and_encode_image(image_bytes, file.content_type or "image/jpeg")
    b64 = encode_image(compressed, mime)

    prompt = identify_wine_prompt()
    messages = [{
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{b64}"},
            },
        ],
    }]

    data = await call_openrouter_with_retry(messages, model, parse_json_response, "identify-wine")
    if not data.get("name"):
        raise HTTPException(422, "Impossibile identificare il vino")
    return data


@router.post("/api/lookup-price")
async def lookup_price(req: LookupPriceRequest):
    prompt = lookup_price_prompt(
        req.wine_name, req.vintage or "", req.region or "", req.wine_type or ""
    )
    return await call_openrouter_with_retry(
        [{"role": "user", "content": prompt}],
        req.model,
        parse_json_response,
        "lookup-price",
    )
