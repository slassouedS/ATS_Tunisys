"""
TUNISYS ATS — Microservice IA (Python/FastAPI)
Modules couverts : 4 (Parsing CV), 6 (Scoring), embryon Module 3 (Chatbot NLU).
100% on-premise : LLM via Ollama (llm_client.py), embeddings locaux (scoring.py).
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import time
import httpx

from . import parsing, scoring, llm_client

app = FastAPI(
    title="TUNISYS ATS - IA Service",
    description="Parsing CV, Scoring sémantique, Chatbot NLU — LLM on-premise (Ollama)",
    version="1.0.0",
)


class ParseCvRequest(BaseModel):
    file_name: str
    content_base64: str


class ParseCvResponse(BaseModel):
    text: str
    duration_ms: int


class ScoreRequest(BaseModel):
    cv_text: str
    offer_text: str
    model: str | None = None


class ScoreResponse(BaseModel):
    score: float
    explanation: str


class ChatRequest(BaseModel):
    message: str
    context: str | None = None
    model: str | None = None


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/models")
def list_models():
    """Liste les modeles reellement telecharges dans Ollama (pas une liste
    devinee) -- utilise par l'ecran Admin > Configuration IA."""
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(f"{llm_client.OLLAMA_URL}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            return {"models": [m["name"] for m in data.get("models", [])]}
    except Exception as e:
        return {"models": [], "error": str(e)}


@app.post("/api/parse-cv", response_model=ParseCvResponse)
def parse_cv(req: ParseCvRequest):
    """Module 4 — extraction texte du CV. Exigence CDC : < 3s. """
    start = time.time()
    try:
        content = parsing.decode_base64_file(req.content_base64)
        text = parsing.extract_text_from_bytes(content, req.file_name)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Impossible de parser le CV : {e}")

    duration_ms = int((time.time() - start) * 1000)
    return ParseCvResponse(text=text, duration_ms=duration_ms)


@app.post("/api/score", response_model=ScoreResponse)
def score(req: ScoreRequest):
    """Module 6 — score de matching CV vs offre + explication qualitative."""
    if not req.cv_text.strip() or not req.offer_text.strip():
        raise HTTPException(status_code=422, detail="cv_text et offer_text sont requis")
    result = scoring.score_candidate(req.cv_text, req.offer_text, model=req.model)
    return ScoreResponse(**result)


@app.post("/api/chatbot", response_model=ChatResponse)
def chatbot(req: ChatRequest):
    """Module 3 — Chatbot d'accueil (FAQ, guidage). Version minimale : appel direct
    au LLM on-premise avec un system prompt cadré ; à enrichir avec du RAG sur la
    FAQ TUNISYS et les offres publiées si le besoin grandit."""
    system = (
        "Tu es l'assistant virtuel du site carrière de TUNISYS. Tu aides les "
        "candidats à comprendre le processus de recrutement, la culture d'entreprise, "
        "et à déposer leur candidature. Réponds en français, de façon concise et chaleureuse. "
        "Si tu ne sais pas, invite la personne à contacter l'équipe RH."
    )
    prompt = req.message if not req.context else f"Contexte: {req.context}\n\nQuestion: {req.message}"
    reply = llm_client.generate(prompt, system=system, model=req.model)
    return ChatResponse(reply=reply)
