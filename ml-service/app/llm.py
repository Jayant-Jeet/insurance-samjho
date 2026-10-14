import json
import os
import re
from pathlib import Path

import httpx

SCHEMA_PATH = Path(__file__).parent / "policy.schema.json"
VLLM_URL = os.getenv("VLLM_URL", "")
TRANSLATE_URL = os.getenv("TRANSLATE_URL", "")
VLLM_API_KEY = os.getenv("VLLM_API_KEY", "")
LOCAL_VLLM_URL = os.getenv("LOCAL_VLLM_URL", "http://localhost:8000/v1/chat/completions")
LOCAL_TRANSLATE_URL = os.getenv("LOCAL_TRANSLATE_URL", "http://localhost:8002/translate")
LOCAL_MODEL = os.getenv("LOCAL_VLLM_MODEL", "google/gemma-2-9b-it")
# Local server runs with --max-model-len 4096, so chunks and outputs are kept small.
LOCAL_CHUNK_CHARS = 4500
LOCAL_MAX_TOKENS = 1500
MODEL = os.getenv("VLLM_MODEL", "google/gemma-4-12b-it")
TIMEOUT = float(os.getenv("VLLM_TIMEOUT", "900"))

SYSTEM_PROMPT = """You are a precise insurance extraction AI. You extract facts from health-insurance policies into strict JSON.
CRITICAL RULES:
1. Every 'found' fact MUST include an 'evidence' array containing the exact page number and a SHORT VERBATIM quote copied perfectly from the text.
2. If a fact is absent, you MUST output status 'not_mentioned' and leave the value null. Never guess or infer.
3. Dates and arithmetic will be computed by code. Do not calculate them.
4. For the 'out_of_pocket_map', clearly separate policy facts (origin: 'document') from generic advice (origin: 'general_guidance').
"""

FEW_SHOT_USER = """=== PAGE 1 ===
Room Rent: Single Private A/C Room up to 1% of Sum Insured per day.
Pre-existing diseases are covered after 36 months.
Maternity expenses are excluded.
"""

FEW_SHOT_ASSISTANT = """{
  "financial_terms": {
    "room_rent": {
      "basis": {"status": "found", "value": "percent_of_sum_insured", "evidence": [{"page": 1, "quote": "up to 1% of Sum Insured per day"}]},
      "cap_percent_of_si": {"status": "found", "value": 1, "evidence": [{"page": 1, "quote": "1% of Sum Insured"}]}
    },
    "co_payment": {"percent": {"status": "not_mentioned", "value": null}}
  },
  "waiting_periods": {
    "pre_existing": {"months": {"status": "found", "value": 36, "evidence": [{"page": 1, "quote": "covered after 36 months"}]}}
  }
}"""


def _strip_unsupported(node):
    """llguidance rejects if/then/else; drop them (and allOf entries left empty)."""
    if isinstance(node, dict):
        out = {k: _strip_unsupported(v) for k, v in node.items() if k not in ("if", "then", "else")}
        if "allOf" in out:
            out["allOf"] = [x for x in out["allOf"] if x]
            if not out["allOf"]:
                del out["allOf"]
        return out
    if isinstance(node, list):
        return [_strip_unsupported(x) for x in node]
    return node


def load_schema() -> dict:
    return _strip_unsupported(json.loads(SCHEMA_PATH.read_text(encoding="utf-8")))


# ~4 chars/token; leaves room for the prompt scaffolding and 2048 output tokens in 8192.
MAX_CHUNK_CHARS = 11000


def chunk_text(text: str, limit: int = MAX_CHUNK_CHARS) -> list[str]:
    """Split on page markers so chunks stay within the model context."""
    parts = re.split(r"(?=^=== PAGE )", text, flags=re.M)
    chunks, cur = [], ""
    for part in parts:
        while len(part) > limit:
            if cur:
                chunks.append(cur)
                cur = ""
            chunks.append(part[:limit])
            part = part[limit:]
        if cur and len(cur) + len(part) > limit:
            chunks.append(cur)
            cur = ""
        cur += part
    if cur.strip():
        chunks.append(cur)
    return chunks or [text]


def _merge(a, b):
    if isinstance(a, dict) and isinstance(b, dict):
        if a.get("status") == "not_mentioned" and b.get("status") == "found":
            return b
        if a.get("status") == "found" and b.get("status") == "not_mentioned":
            return a
        return {k: _merge(a[k], b[k]) if k in a and k in b else a.get(k, b.get(k))
                for k in {**a, **b}}
    if isinstance(a, list) and isinstance(b, list):
        return a + [x for x in b if x not in a]
    return a if a not in (None, "") else b


# Smaller sub-schemas keep each constrained generation short enough to finish
# inside the 8192-token context instead of being truncated.
SECTION_GROUPS = [
    ["out_of_pocket_map", "findings"],
    ["financial_terms", "waiting_periods"],
    ["meta", "policy", "coverage", "exclusions", "claims", "conditions", "premium"],
]

# Local Gemma handles one heavy section per call; pairing cards with findings drops findings.
LOCAL_GROUPS = [["out_of_pocket_map"], ["findings"], ["financial_terms", "waiting_periods"],
                ["meta", "policy", "coverage", "exclusions", "claims", "conditions", "premium"]]

GROUP_HINTS = {
    "out_of_pocket_map": (
        "Produce 3-6 out_of_pocket_map cards about the biggest financial risks for the policyholder "
        "(room rent limits, co-payment, waiting periods, sub-limits, exclusions, deductibles). "
        "Each card item must quote the policy verbatim with its page. "
    ),
    "findings": (
        "Also produce 2-6 findings: each flags a restrictive, unusual or risky clause "
        "(e.g. room-rent cap, co-payment, long waiting period, exclusion) with a title, detail, "
        "severity and a suggested question to ask the insurer. "
    ),
}


def _sub_schema(schema: dict, keys: list[str]) -> dict:
    out = dict(schema)
    out["properties"] = {k: v for k, v in schema["properties"].items() if k in keys}
    out["required"] = [k for k in schema.get("required", []) if k in keys]
    for k, lo, hi in (("out_of_pocket_map", 3, 6), ("findings", 2, 6)):
        if k in out["properties"]:
            out["properties"][k] = {**out["properties"][k], "minItems": lo, "maxItems": hi}
    return out


def _dedupe(items: list, keyfn) -> list:
    seen, out = set(), []
    for it in items:
        k = keyfn(it)
        if k not in seen:
            seen.add(k)
            out.append(it)
    return out


def _text(d, lang="en") -> str:
    return ((d or {}).get(lang) or "").strip().lower() if isinstance(d, dict) else ""


_STOP = {"the", "a", "an", "of", "to", "for", "and", "or", "in", "on", "is", "are", "be", "by",
         "with", "your", "you", "may", "can", "will", "this", "that", "as", "at", "if", "it"}


def _words(s: str) -> set:
    return {w for w in re.findall(r"[a-z0-9]+", s.lower()) if w not in _STOP}


def _dedupe_fuzzy(items: list, textfn, threshold: float = 0.5) -> list:
    """Drop items whose key words overlap an earlier item by >= threshold (Jaccard)."""
    out, sigs = [], []
    for it in items:
        w = _words(textfn(it))
        if any(w and s and len(w & s) / len(w | s) >= threshold for s in sigs):
            continue
        sigs.append(w)
        out.append(it)
    return out


def _localized_slots(result: dict) -> list:
    """All LocalizedText dicts in cards and findings."""
    slots = []

    def walk(node):
        if isinstance(node, dict):
            if isinstance(node.get("en"), str) and node["en"].strip():
                slots.append(node)
                return
            for k, v in node.items():
                if k != "evidence":
                    walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(result)
    return slots


async def _translate_hindi(result: dict, batch: int = 24, mode: str = "online") -> None:
    """Translate all English text to Hindi with IndicTrans2; failures keep any existing text."""
    url = LOCAL_TRANSLATE_URL if mode == "local" else TRANSLATE_URL
    if not url:
        return
    slots = _localized_slots(result)
    if mode == "local":
        # CPU translator: small batches keep each call well under the timeout
        batch = 6
    print(f"[translate] {len(slots)} texts, batch {batch}", flush=True)
    for i in range(0, len(slots), batch):
        print(f"[translate] {i}/{len(slots)}", flush=True)
        group = slots[i:i + batch]
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
                resp = await client.post(url, json={"texts": [s["en"] for s in group], "target_lang": "hi"})
                resp.raise_for_status()
            out = resp.json()["translations"]
        except Exception as e:
            print(f"[translate] batch {i} failed: {e!r}", flush=True)
            continue
        if len(out) != len(group):
            print(f"[translate] batch {i} length mismatch {len(out)} vs {len(group)}", flush=True)
            continue
        for s, hi in zip(group, out):
            if isinstance(hi, str) and hi.strip():
                s["hi"] = hi.strip()

async def extract_policy(policy_text: str, mode: str = "online") -> dict:
    chunks = chunk_text(policy_text, LOCAL_CHUNK_CHARS if mode == "local" else MAX_CHUNK_CHARS)
    schema = load_schema()
    result: dict = {}
    for chunk in chunks:
        groups = LOCAL_GROUPS if mode == "local" else SECTION_GROUPS
        for keys in groups:
            hint = "".join(GROUP_HINTS.get(k, "") for k in keys)
            part = await _extract_chunk(chunk, _sub_schema(schema, keys), hint, mode)
            result = _merge(result, part) if result else part
    if isinstance(result.get("out_of_pocket_map"), list):
        result["out_of_pocket_map"] = _dedupe(
            result["out_of_pocket_map"],
            lambda c: _text(c.get("headline")) or c.get("scenario"))
        result["out_of_pocket_map"] = _dedupe_fuzzy(
            result["out_of_pocket_map"],
            lambda c: _text(c.get("headline")) or str(c.get("scenario")))
    if isinstance(result.get("findings"), list):
        result["findings"] = _dedupe(
            result["findings"], lambda f: _text(f.get("title")) or f.get("id"))
        result["findings"] = _dedupe_fuzzy(
            result["findings"],
            lambda f: _text(f.get("title")) or _text(f.get("detail")) or str(f.get("id")))
    await _translate_hindi(result, mode=mode)
    return result


async def _extract_chunk(policy_text: str, schema: dict | None = None, hint: str = "",
                         mode: str = "online") -> dict:
    """Call the vLLM endpoint with the schema so decoding is constrained to
    policy.schema.json: local OpenAI-compatible server, or the Modal endpoint (VLLM_URL)."""
    if mode != "local" and not VLLM_URL:
        raise RuntimeError("VLLM_URL is not set; set it to the Modal web endpoint URL")
    prompt = (
        f"{SYSTEM_PROMPT}\n"
        f"EXAMPLE INPUT:\n{FEW_SHOT_USER}\n"
        f"EXAMPLE OUTPUT:\n{FEW_SHOT_ASSISTANT}\n\n"
        f"Extract the requested policy details from this text. {hint}\n\n{policy_text}"
    )
    schema = schema or load_schema()
    if mode == "local":
        # Required keys trap small models in whitespace loops under constrained decoding.
        schema = _relax_required(schema)
        prompt += LOCAL_NOTE
        url, headers = LOCAL_VLLM_URL, {}
        payload = {
            "model": LOCAL_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "max_tokens": LOCAL_MAX_TOKENS,
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": "policy", "schema": schema},
            },
        }
    else:
        url = VLLM_URL
        headers = {"Authorization": f"Bearer {VLLM_API_KEY}"} if VLLM_API_KEY else {}
        payload = {"prompt": prompt, "schema": schema}
    last: Exception | None = None
    for attempt in range(2 if mode == "local" else 1):
        if attempt:
            payload["temperature"] = 0.3
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
        try:
            return _parse_json(resp.json()["choices"][0]["message"]["content"])
        except ValueError as exc:
            last = exc
    raise last


LOCAL_NOTE = ('\nText fields such as title, headline, detail and advice are objects like '
              '{"en": "text"}, never plain strings.')


def _relax_required(n):
    """Drop 'required' except on text, evidence, card and finding objects."""
    if isinstance(n, dict):
        props = n.get("properties", {})
        keep = isinstance(props, dict) and bool(
            {"en", "quote", "risk", "severity", "headline"} & set(props))
        return {k: (v if k == "required" and keep else _relax_required(v))
                for k, v in n.items() if k != "required" or keep}
    if isinstance(n, list):
        return [_relax_required(x) for x in n]
    return n


def _close(text: str) -> str:
    stack, in_str, esc = [], False, False
    for ch in text:
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
        elif ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]" and stack:
            stack.pop()
    fixed = text.rstrip().rstrip(",")
    if in_str:
        fixed += '"'
    return fixed + "".join(reversed(stack))


def _parse_json(text: str) -> dict:
    """Parse model output; if truncated, close open strings/brackets, and as a last
    resort cut back to the last complete element."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        err = exc
    try:
        return json.loads(_close(text))
    except json.JSONDecodeError as exc:
        err = exc
    cut = len(text)
    for _ in range(200):
        cut = max(text.rfind(",", 0, cut), -1)
        if cut <= 0:
            break
        try:
            return json.loads(_close(text[:cut]))
        except json.JSONDecodeError:
            continue
    raise ValueError(f"Model returned invalid JSON: {err}") from err
