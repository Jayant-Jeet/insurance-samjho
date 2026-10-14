import re
from typing import Any, List

_WS = re.compile(r"\s+")


def _norm(s: str) -> str:
    # PDF extraction changes line breaks/spacing; wording itself must still match verbatim.
    return _WS.sub(" ", s).strip()


def quote_in_page(quote: Any, page: Any, pages: List[str]) -> bool:
    if not isinstance(quote, str) or not quote.strip():
        return False
    if not isinstance(page, int) or isinstance(page, bool) or not (1 <= page <= len(pages)):
        return False
    return _norm(quote) in _norm(pages[page - 1])


def verify_evidence(node: Any, pages: List[str]) -> Any:
    """Recursively walk the extracted JSON (in place). For every `evidence` array,
    check each quote appears verbatim in the raw text of its page; if any does not,
    set the parent object's `confidence` to "verify"."""
    if isinstance(node, dict):
        evidence = node.get("evidence")
        if isinstance(evidence, list) and evidence:
            ok = all(
                isinstance(e, dict) and quote_in_page(e.get("quote"), e.get("page"), pages)
                for e in evidence
            )
            if not ok:
                node["confidence"] = "verify"
        for value in node.values():
            verify_evidence(value, pages)
    elif isinstance(node, list):
        for item in node:
            verify_evidence(item, pages)
    return node
