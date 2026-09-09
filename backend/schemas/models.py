from pydantic import BaseModel, field_validator
from typing import Optional, List


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


class FetchMenuRequest(BaseModel):
    url: str
    model: Optional[str] = None


class LookupPriceRequest(BaseModel):
    wine_name: str
    vintage: Optional[str] = None
    region: Optional[str] = None
    wine_type: Optional[str] = None
    model: Optional[str] = None
