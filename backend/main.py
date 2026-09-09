from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="WinePair API", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.extract import router as extract_router
from routers.pairing import router as pairing_router
from routers.wine import router as wine_router

app.include_router(extract_router)
app.include_router(pairing_router)
app.include_router(wine_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.2.0"}
