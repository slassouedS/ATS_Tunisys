"""
Client vers le LLM on-premise servi par Ollama (aucune donnée candidat
n'est envoyée à un tiers — décision explicite du projet).
Utilisé pour :
  - le résumé/normalisation du CV (Module 4)
  - la génération de l'explication qualitative du score (Module 6)
  - le NLU basique du chatbot (Module 3, non détaillé ici)
"""
import os
import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:8b")


def generate(prompt: str, system: str | None = None, timeout: float = 60.0, model: str | None = None) -> str:
    """Appel simple non-streamé à /api/generate d'Ollama.
    Le modele peut etre surcharge par appel (permet un changement dynamique
    depuis l'ecran Admin, sans redemarrer ce service)."""
    payload = {
        "model": model or OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "keep_alive": "30m",  # garde le modele charge en memoire pour eviter
                               # les rechargements lents (>20s) entre requetes
    }
    if system:
        payload["system"] = system

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(f"{OLLAMA_URL}/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "").strip()
    except Exception as e:
        # Dégradation gracieuse : le scoring sémantique (embeddings) reste disponible
        # même si le LLM génératif est temporairement indisponible.
        return f"[LLM indisponible: {e}]"


def explain_match(cv_text: str, offer_text: str, similarity_pct: float, model: str | None = None) -> str:
    system = (
        "Tu es un assistant RH neutre et factuel pour TUNISYS. "
        "Explique en 2-3 phrases courtes, en français, pourquoi ce CV correspond "
        "(ou pas) à cette offre, en citant des éléments concrets (compétences, "
        "expérience). Reste objectif, ne fais aucune supposition sur l'identité, "
        "l'origine, le genre ou l'âge du candidat — uniquement les compétences et l'expérience."
    )
    prompt = (
        f"Score de similarité sémantique calculé : {similarity_pct:.1f}%.\n\n"
        f"--- OFFRE ---\n{offer_text[:3000]}\n\n"
        f"--- CV (extrait) ---\n{cv_text[:3000]}\n\n"
        "Explication concise :"
    )
    return generate(prompt, system=system, model=model)
