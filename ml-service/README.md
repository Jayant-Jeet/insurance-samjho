# ML Service

```
pip install -r requirements.txt
vllm serve google/gemma-4-12b-it --port 8000     # separate process / GPU box
uvicorn app.main:app --port 8001
pytest
```

Env: `VLLM_URL`, `VLLM_MODEL`, `VLLM_TIMEOUT`.

`POST /process-policy` (multipart `file`) -> schema-conformant JSON; every `evidence[].quote`
is checked against the page text, and the parent's `confidence` becomes `"verify"` on mismatch
(whitespace is normalised, wording must match exactly).
