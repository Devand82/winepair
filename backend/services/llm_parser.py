import json
import re
from fastapi import HTTPException


def extract_json(text: str) -> dict | list | None:
    if not text:
        return None
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass

    for start, end in [('{', '}'), ('[', ']')]:
        s = text.find(start)
        e = text.rfind(end)
        if s != -1 and e != -1 and e > s:
            candidate = text[s:e + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

    # Try to find JSON after stripping non-JSON prefix
    lines = text.split("\n")
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("{") or stripped.startswith("["):
            candidate = "\n".join(lines[i:])
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass
            break

    return None


def parse_json_response(raw: dict, endpoint: str):
    if "choices" not in raw or not raw["choices"]:
        detail = json.dumps(raw, ensure_ascii=False)[:300]
        raise HTTPException(502, f"Risposta inattesa dal modello: {detail}")

    content = raw["choices"][0]["message"]["content"]
    if content is None:
        raise HTTPException(
            422,
            "Risposta del modello non valida. Il modello non ha restituito testo.",
        )
    data = extract_json(content)
    if data is not None:
        return data

    raw_text = content[:500] if isinstance(content, str) else str(content)[:500]
    raise HTTPException(
        422,
        f"Risposta del modello non valida. Il modello non ha restituito JSON valido. "
        f"Risposta grezza: {raw_text}",
    )
