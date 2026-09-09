from fastapi import APIRouter, HTTPException
import logging

from schemas.models import PairRequest, PairReverseRequest, PairBatchRequest
from services.openrouter import call_openrouter, call_openrouter_with_retry
from services.llm_parser import parse_json_response
from prompts.templates import pair_prompt, pair_reverse_prompt, make_wines_list

router = APIRouter()
logger = logging.getLogger(__name__)


def validate_pair_result(data: dict, wines_count: int) -> dict:
    wine_idx = data.get("wine_index")
    if not isinstance(wine_idx, int) or wine_idx < 1 or wine_idx > wines_count:
        data["wine_index"] = 1

    raw_alts = data.get("alternatives", [])
    if not isinstance(raw_alts, list):
        raw_alts = []

    valid_alts = []
    seen = {data["wine_index"]}
    for alt in raw_alts:
        if not isinstance(alt, dict):
            continue
        idx = alt.get("wine_index")
        if not isinstance(idx, int) or idx < 1 or idx > wines_count:
            continue
        if idx in seen:
            continue
        seen.add(idx)
        valid_alts.append({"wine_index": idx, "note": alt.get("note", "")})
        if len(valid_alts) >= 3:
            break

    data["alternatives"] = valid_alts
    return data


@router.post("/api/pair")
async def pair_wine(req: PairRequest):
    wines_list = make_wines_list(req.wines)
    food_desc = req.food.description or req.food.category
    prompt = pair_prompt(req.food.name, food_desc, wines_list, req.max_price)

    data = await call_openrouter_with_retry(
        [{"role": "user", "content": prompt}],
        req.model,
        parse_json_response,
        "pair",
    )
    return validate_pair_result(data, len(req.wines))


@router.post("/api/pair-batch")
async def pair_batch(req: PairBatchRequest):
    results = []
    for food in req.foods:
        wines_list = make_wines_list(req.wines)
        food_desc = food.description or food.category
        prompt = pair_prompt(food.name, food_desc, wines_list)

        raw = await call_openrouter(
            [{"role": "user", "content": prompt}], req.model
        )
        result = parse_json_response(raw, "pair-batch")
        results.append(validate_pair_result(result, len(req.wines)))
    return results


@router.post("/api/pair-reverse")
async def pair_reverse(req: PairReverseRequest):
    prompt = pair_reverse_prompt(req.wine_type, req.name or "", req.region or "", req.max_price)

    data = await call_openrouter_with_retry(
        [{"role": "user", "content": prompt}],
        req.model,
        parse_json_response,
        "pair-reverse",
    )
    if not data.get("suggestions"):
        raise HTTPException(422, "Nessun suggerimento trovato")
    return data
