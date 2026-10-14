import io
from typing import List

import pdfplumber


def extract_pages(pdf_bytes: bytes) -> List[str]:
    """Return the raw text of each PDF page; index 0 is page 1."""
    pages: List[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return pages


def build_prompt_text(pages: List[str]) -> str:
    """Concatenate pages with explicit page markers so the model can cite page numbers."""
    return "\n\n".join(f"=== PAGE {i} ===\n{text}" for i, text in enumerate(pages, start=1))
