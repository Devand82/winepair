from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
import logging

from schemas.models import ExtractTextRequest, MenuData, FetchMenuRequest
from services.openrouter import call_openrouter, call_openrouter_with_retry
from services.file_utils import (
    read_and_validate_file, compress_and_encode_image, encode_image,
    fetch_url_content, extract_text_from_pdf, extract_text_from_html,
    extract_text_from_json_response, pdf_to_images,
)
from services.llm_parser import parse_json_response
from prompts.templates import extract_text_prompt, extract_image_prompt, make_wines_list

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/api/extract-text")
async def extract_text(req: ExtractTextRequest):
    prompt = extract_text_prompt(req.menu_text)
    data = await call_openrouter_with_retry(
        [{"role": "user", "content": prompt}],
        req.model,
        parse_json_response,
        "extract-text",
    )
    if not data.get("foods"):
        raise HTTPException(422, "Nessun piatto trovato nel menù")
    if not data.get("wines"):
        raise HTTPException(422, "Nessun vino trovato. Includi la carta vini nel testo")
    data["raw_text"] = req.menu_text
    return MenuData(**data)


@router.post("/api/extract-image")
async def extract_image(
    files: List[UploadFile] = File(...),
    model: str = Form("openai/gpt-4o"),
    extra_text: str = Form(""),
):
    all_text_parts = []
    image_contents = []

    for file in files:
        image_bytes = await file.read()
        await read_and_validate_file(image_bytes, file.filename)
        compressed, mime = await compress_and_encode_image(image_bytes, file.content_type or "image/jpeg")
        b64 = encode_image(compressed, mime)
        image_contents.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mime};base64,{b64}"},
        })
        all_text_parts.append(f"[Immagine: {file.filename}]")

    prompt = extract_image_prompt(extra_text)
    messages = [{
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            *image_contents,
        ],
    }]

    data = await call_openrouter_with_retry(messages, model, parse_json_response, "extract-image")
    if isinstance(data, list):
        if data and isinstance(data[0], dict) and "name" in data[0] and "category" in data[0]:
            data = {"foods": data, "wines": []}
        else:
            data = data[0] if data else {}
    if not data.get("foods"):
        raise HTTPException(422, "Nessun piatto trovato nell'immagine")
    if not data.get("wines"):
        raise HTTPException(422, "Nessun vino trovato. Includi la carta vini nell'immagine")
    data["raw_text"] = "; ".join(all_text_parts)
    return MenuData(**data)


@router.post("/api/fetch-menu")
async def fetch_menu(req: FetchMenuRequest):
    raw_bytes, content_type, _ = await fetch_url_content(req.url)

    extracted_text = ""
    if "pdf" in content_type:
        extracted_text = extract_text_from_pdf(raw_bytes)
    elif "html" in content_type:
        extracted_text = extract_text_from_html(raw_bytes)
    elif "json" in content_type:
        extracted_text = extract_text_from_json_response(raw_bytes)
    else:
        extracted_text = raw_bytes.decode("utf-8", errors="replace")

    if not extracted_text.strip():
        raise HTTPException(
            422, "Nessun testo estratto dal menù. Il QR potrebbe non puntare a un menù testuale."
        )

    prompt = extract_text_prompt(extracted_text)
    data = await call_openrouter_with_retry(
        [{"role": "user", "content": prompt}],
        req.model,
        parse_json_response,
        "fetch-menu",
    )
    if not data.get("foods"):
        raise HTTPException(422, "Nessun piatto trovato nel menù")
    if not data.get("wines"):
        raise HTTPException(422, "Nessun vino trovato. Includi la carta vini")
    data["raw_text"] = extracted_text
    return MenuData(**data)


@router.post("/api/extract-document")
async def extract_document(
    files: List[UploadFile] = File(...),
    model: str = Form("openai/gpt-4o"),
    extra_text: str = Form(""),
):
    all_text_parts = []
    image_contents = []
    text_content = ""

    for file in files:
        raw_bytes = await file.read()
        await read_and_validate_file(raw_bytes, file.filename)
        ct = file.content_type or ""
        name_lower = file.filename.lower() if file.filename else ""

        if "pdf" in ct or name_lower.endswith(".pdf"):
            page_text = extract_text_from_pdf(raw_bytes)
            logger.warning(f"extract-document PDF '{file.filename}' text_len={len(page_text)}")
            if len(page_text.strip()) > 50:
                text_content += "\n" + page_text
                all_text_parts.append(f"[PDF: {file.filename}]")
            else:
                logger.warning(f"extract-document PDF '{file.filename}' scanato, conversione in immagini...")
                pdf_images = pdf_to_images(raw_bytes)
                for idx, img_bytes in enumerate(pdf_images):
                    compressed, mime = await compress_and_encode_image(img_bytes, "image/png")
                    b64 = encode_image(compressed, mime)
                    image_contents.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"},
                    })
                all_text_parts.append(f"[PDF immagini: {file.filename}, {len(pdf_images)} pagine]")
                logger.warning(f"extract-document PDF '{file.filename}' convertito in {len(pdf_images)} immagini")
        else:
            compressed, mime = await compress_and_encode_image(raw_bytes, ct or "image/jpeg")
            b64 = encode_image(compressed, mime)
            image_contents.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{b64}"},
            })
            all_text_parts.append(f"[Immagine: {file.filename}]")

    logger.warning(f"extract-document total text_content_len={len(text_content)} files_count={len(files)}")

    if text_content.strip() and not image_contents:
        prompt = extract_image_prompt(extra_text)
        prompt = prompt.replace(
            "Analizza il menu nelle immagini.",
            "Analizza il seguente menu.",
        )
        if text_content.strip():
            prompt += "\n\n" + text_content
        messages = [{"role": "user", "content": prompt}]
    elif image_contents:
        prompt = extract_image_prompt(extra_text)
        if text_content.strip():
            prompt += "\n\nTesto aggiuntivo dal PDF:\n" + text_content
        messages = [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                *image_contents,
            ],
        }]
    else:
        raise HTTPException(422, "Nessun file valido inviato.")

    data = await call_openrouter_with_retry(messages, model, parse_json_response, "extract-document")
    logger.warning(f"extract-document type={type(data).__name__} keys={list(data.keys()) if isinstance(data, dict) else 'N/A'} foods={len(data.get('foods', [])) if isinstance(data, dict) else 'N/A'} wines={len(data.get('wines', [])) if isinstance(data, dict) else 'N/A'} text_content_len={len(text_content)} image_contents={len(image_contents)}")
    if isinstance(data, list):
        if data and isinstance(data[0], dict) and "name" in data[0] and "category" in data[0]:
            data = {"foods": data, "wines": []}
        else:
            data = data[0] if data else {}
    if not data.get("foods"):
        logger.warning(f"extract-document NO FOODS: data_keys={list(data.keys()) if isinstance(data, dict) else type(data).__name__}")
        raise HTTPException(422, "Nessun piatto trovato nel documento")
    if not data.get("wines"):
        logger.warning(f"extract-document NO WINES: foods_count={len(data.get('foods', []))}")
        raise HTTPException(422, "Nessun vino trovato. Includi la carta vini nel documento")
    data["raw_text"] = "; ".join(all_text_parts)
    return MenuData(**data)
