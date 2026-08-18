"""
Module 4 — Analyseur de CV (parsing).
Extrait le texte brut d'un CV PDF/DOCX. La structuration sémantique
(compétences, expériences, formation) est ensuite déléguée au LLM on-premise
via llm_client.py (extract_structured_cv) pour gérer l'hétérogénéité des formats
(exigence du CDC : normalisation vers le standard TUNISYS).
"""
import base64
import io

import pdfplumber
import docx


def extract_text_from_bytes(content: bytes, file_name: str) -> str:
    ext = (file_name or "").lower().rsplit(".", 1)[-1] if "." in (file_name or "") else ""

    if ext == "pdf":
        return _extract_pdf(content)
    if ext in ("docx",):
        return _extract_docx(content)
    try:
        return content.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _extract_pdf(content: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _extract_docx(content: bytes) -> str:
    document = docx.Document(io.BytesIO(content))
    return "\n".join(p.text for p in document.paragraphs if p.text)


def decode_base64_file(content_base64: str) -> bytes:
    return base64.b64decode(content_base64)
