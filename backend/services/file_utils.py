import base64
import json
import httpx
from io import BytesIO
from fastapi import HTTPException


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


async def compress_and_encode_image(image_bytes: bytes, mime: str, max_dim: int = 2048) -> tuple[bytes, str]:
    try:
        from PIL import Image, UnidentifiedImageError
        try:
            img = Image.open(BytesIO(image_bytes))
        except UnidentifiedImageError:
            return image_bytes, mime
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=80, optimize=True)
        compressed = buf.getvalue()
        return compressed, "image/jpeg"
    except ImportError:
        return image_bytes, mime


def encode_image(image_bytes: bytes, mime: str) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")


async def read_and_validate_file(file_bytes: bytes, filename: str | None = None):
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(413, f"File {filename or 'sconosciuto'} troppo grande (max 10MB)")
    return file_bytes


async def fetch_url_content(url: str) -> tuple[bytes, str, str]:
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "WinePair/1.0"})
            if resp.status_code != 200:
                raise HTTPException(
                    502,
                    f"Impossibile scaricare il menù da {url} (HTTP {resp.status_code})",
                )
            content_type = resp.headers.get("content-type", "").lower()
            return resp.content, content_type, resp.text
    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout durante il download del menù. Verifica l'URL e riprova.")
    except httpx.RequestError as e:
        raise HTTPException(502, f"Errore di connessione: {e}")


def extract_text_from_pdf(raw_bytes: bytes) -> str:
    from pypdf import PdfReader
    try:
        reader = PdfReader(BytesIO(raw_bytes))
        pages = [p.extract_text() for p in reader.pages if p.extract_text()]

        max_pages = 3
        if len(pages) > max_pages:
            pages = pages[:max_pages]

        return "\n".join(pages)
    except Exception as e:
        raise HTTPException(422, f"Impossibile leggere il PDF: {e}")


def pdf_to_images(raw_bytes: bytes, max_pages: int = 5, dpi: int = 200) -> list[bytes]:
    import fitz
    try:
        doc = fitz.open(stream=raw_bytes, filetype="pdf")
        images = []
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            pix = page.get_pixmap(dpi=dpi)
            img_bytes = pix.tobytes("png")
            images.append(img_bytes)
        doc.close()
        return images
    except Exception as e:
        raise HTTPException(422, f"Impossibile convertire il PDF in immagini: {e}")


def extract_text_from_html(raw_bytes: bytes) -> str:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(raw_bytes, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def extract_text_from_json_response(raw_bytes: bytes) -> str:
    raw_text = raw_bytes.decode("utf-8", errors="replace")
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return raw_text
    if isinstance(parsed, dict):
        return json.dumps(parsed, ensure_ascii=False, indent=2)
    return raw_text
