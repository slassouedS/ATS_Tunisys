"""
Module 6 — Scoring & Présélection IA.
Approche : similarité sémantique par embeddings (sentence-transformers, local,
rapide, déterministe) -> le score en %.

L'explication est generee localement (pas d'appel LLM) pour garantir un
scoring rapide et fiable a chaque candidature -- l'appel LLM synchrone pour
justifier chaque score s'est revele trop lent/instable sur certaines machines
CPU (>60s, echecs frequents). Le LLM reste disponible separement pour le
chatbot, ou une lenteur ponctuelle est moins genante pour l'utilisateur.
"""
from sentence_transformers import SentenceTransformer
import numpy as np

_model = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))


def _template_explanation(score_pct: float) -> str:
    if score_pct >= 85:
        return (f"Excellente correspondance ({score_pct:.0f}%) : le profil du candidat "
                 "recoupe fortement les competences et l'experience recherchees dans l'offre.")
    if score_pct >= 70:
        return (f"Bonne correspondance ({score_pct:.0f}%) : plusieurs elements du CV "
                 "correspondent aux exigences du poste, une revue manuelle est recommandee.")
    if score_pct >= 50:
        return (f"Correspondance partielle ({score_pct:.0f}%) : certains elements se "
                 "recoupent, mais des ecarts significatifs subsistent avec le profil recherche.")
    return (f"Correspondance faible ({score_pct:.0f}%) : le CV semble peu aligne avec "
             "les exigences de cette offre specifique.")


def score_candidate(cv_text: str, offer_text: str, model: str | None = None) -> dict:
    model_ = _get_model()
    embeddings = model_.encode([cv_text, offer_text])
    similarity = cosine_similarity(embeddings[0], embeddings[1])

    # Normalisation empirique : la similarité cosinus de sentence-transformers
    # se situe généralement entre 0.2 et 0.9 pour des textes pertinents/non pertinents.
    # On étire linéairement vers une échelle 0-100% plus lisible pour un recruteur.
    score_pct = max(0.0, min(100.0, (similarity - 0.15) / (0.75 - 0.15) * 100))

    return {
        "score": round(score_pct, 2),
        "explanation": _template_explanation(score_pct),
    }
