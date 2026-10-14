"""Standalone local IndicTrans2 server: python -m app.serve_indictrans --port 8002"""
import argparse
import traceback
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL = "ai4bharat/indictrans2-en-indic-1B"
LANG_CODES = {"hi": "hin_Deva", "bn": "ben_Beng", "ta": "tam_Taml", "te": "tel_Telu",
              "mr": "mar_Deva", "gu": "guj_Gujr", "kn": "kan_Knda", "ml": "mal_Mlym"}
BATCH = 16

state: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    import torch
    from IndicTransToolkit.processor import IndicProcessor
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.bfloat16 if device == "cuda" else torch.float32
    state["device"] = device
    state["tok"] = AutoTokenizer.from_pretrained(MODEL, trust_remote_code=True)
    state["model"] = AutoModelForSeq2SeqLM.from_pretrained(
        MODEL, trust_remote_code=True, torch_dtype=dtype).to(device)
    state["ip"] = IndicProcessor(inference=True)
    yield


app = FastAPI(title="Local IndicTrans2", lifespan=lifespan)


class TranslateRequest(BaseModel):
    text: str | None = None
    texts: list[str] | None = None
    target_lang: str = "hi"


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL}


def _translate(texts: list[str], target: str) -> list[str]:
    import torch

    tok, model, ip, device = state["tok"], state["model"], state["ip"], state["device"]
    # length-sorted batches minimise padding; original order is restored at the end
    order = sorted(range(len(texts)), key=lambda k: len(texts[k]))
    sorted_texts = [texts[k] for k in order]
    out: list[str] = []
    for i in range(0, len(sorted_texts), BATCH):
        batch = ip.preprocess_batch(sorted_texts[i:i + BATCH], src_lang="eng_Latn", tgt_lang=target)
        inputs = tok(batch, truncation=True, padding="longest", max_length=256,
                     return_tensors="pt", return_attention_mask=True).to(device)
        kw = dict(min_length=0, max_length=200, num_beams=1, num_return_sequences=1)
        with torch.no_grad():
            try:
                gen = model.generate(**inputs, use_cache=True, **kw)
            except Exception:
                gen = model.generate(**inputs, use_cache=False, **kw)
        dec = tok.batch_decode(gen.detach().cpu().tolist(), skip_special_tokens=True,
                               clean_up_tokenization_spaces=True)
        out += ip.postprocess_batch(dec, lang=target)
    restored = [""] * len(out)
    for pos, k in enumerate(order):
        restored[k] = out[pos]
    return restored


@app.post("/translate")
def translate(req: TranslateRequest):
    target = LANG_CODES.get(req.target_lang, req.target_lang)
    if req.texts is None and req.text is None:
        raise HTTPException(400, "Provide 'text' or 'texts'")
    try:
        if req.texts is not None:
            return {"translations": _translate(req.texts, target)}
        return {"translation": _translate([req.text], target)[0]}
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(500, f"{type(exc).__name__}: {exc}") from exc


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8002)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
