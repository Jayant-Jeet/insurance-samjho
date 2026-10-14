import asyncio

import httpx
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .llm import extract_policy
from .pdf_utils import build_prompt_text, extract_pages
from .verify import verify_evidence

app = FastAPI(title="Insurance Samjho ML Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://www.insurancesamjho.tech",
        "https://insurancesamjho.tech",
    ],
    allow_origin_regex=r"https://[a-z0-9-]+\.vercel\.app",
    allow_methods=["GET"],
    allow_headers=["*"],
)

LOCAL_MODELS = {
    "gemma": {
        "name": "google/gemma-2-9b-it",
        "port": 8000,
        "urls": ["http://localhost:8000/health", "http://localhost:8000/v1/models"],
    },
    "indictrans": {
        "name": "ai4bharat/indictrans2-en-indic-1B",
        "port": 8002,
        "urls": ["http://localhost:8002/health"],
    },
}


async def _is_up(client: httpx.AsyncClient, urls: list[str]) -> bool:
    for url in urls:
        try:
            if (await client.get(url)).status_code == 200:
                return True
        except httpx.HTTPError:
            continue
    return False


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/local-models")
async def local_models_health():
    async with httpx.AsyncClient(timeout=1.5) as client:
        states = await asyncio.gather(*(_is_up(client, m["urls"]) for m in LOCAL_MODELS.values()))
    models = {
        key: {"name": m["name"], "port": m["port"], "ready": ready}
        for (key, m), ready in zip(LOCAL_MODELS.items(), states)
    }
    return {"all_ready": all(states), "models": models}


@app.post("/process-policy")
async def process_policy(file: UploadFile = File(...), mode: str = Query("online")):
    if mode not in ("online", "local"):
        raise HTTPException(400, "mode must be 'online' or 'local'")
    data = await file.read()
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "Uploaded file is not a PDF")
    try:
        pages = extract_pages(data)
    except Exception as exc:
        raise HTTPException(422, f"Could not read PDF: {exc}")
    if not any(p.strip() for p in pages):
        raise HTTPException(422, "No extractable text (scanned PDF?). OCR is not supported yet.")
    try:
        result = await extract_policy(build_prompt_text(pages), mode=mode)
    except (httpx.HTTPError, ValueError, RuntimeError) as exc:
        raise HTTPException(502, f"vLLM server error: {exc}")
    if not result.get("out_of_pocket_map"):
        raise HTTPException(502, "Model returned no out_of_pocket_map (output was malformed or incomplete). Please retry.")
    return verify_evidence(result, pages)
