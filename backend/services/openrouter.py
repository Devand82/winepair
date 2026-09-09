import httpx
import os
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "openrouter/free")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

JSON_SUPPORTING_MODELS = {
    "openrouter/free", "openai/gpt-4o-mini", "openai/gpt-4o",
    "google/gemini-2.5-flash", "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free", "openai/gpt-oss-20b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openai/gpt-5-nano", "google/gemma-3-27b-it",
    "google/gemini-2.5-flash-lite", "openai/gpt-4.1-mini",
    "anthropic/claude-haiku-4.5",
}

MAX_RETRIES = 2


async def call_openrouter(messages, model: str | None = None, attempt: int = 1):
    model = model or DEFAULT_MODEL
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            body = {
                "model": model,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 8192,
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
            raw = resp.json()
            choices = raw.get("choices", [])
            content = choices[0]["message"]["content"] if choices else None
            logger.warning(f"openrouter model={model} status={resp.status_code} choices={len(choices)} content_type={type(content).__name__ if content is not None else 'NoneType'} content_len={len(content) if isinstance(content, str) else 0}")
            return raw
    except httpx.TimeoutException:
        raise HTTPException(
            504,
            "Il modello non risponde. Il free model potrebbe essere sovraccarico. Riprova o cambia modello.",
        )
    except httpx.RequestError as e:
        if attempt < MAX_RETRIES:
            return await call_openrouter(messages, model, attempt + 1)
        raise HTTPException(502, f"Errore di connessione: {e}")


async def call_openrouter_with_retry(messages, model: str | None, parse_fn, endpoint: str):
    model = model or DEFAULT_MODEL
    raw = await call_openrouter(messages, model)

    try:
        return parse_fn(raw, endpoint)
    except HTTPException as e:
        if e.status_code == 422 and endpoint != "pair-batch":
            retry_prompt = (
                "ATTENZIONE: La tua risposta precedente non era in formato JSON valido. "
                "Rispondi SOLO con JSON valido, niente markdown, niente testo extra. "
                "La risposta deve essere ESCLUSIVAMENTE un oggetto JSON."
            )
            retry_messages = messages + [
                {"role": "assistant", "content": raw["choices"][0]["message"]["content"] or ""},
                {"role": "user", "content": retry_prompt},
            ]
            raw2 = await call_openrouter(retry_messages, model, attempt=2)
            return parse_fn(raw2, endpoint)
        raise


def get_default_model():
    return DEFAULT_MODEL
