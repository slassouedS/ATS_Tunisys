# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

# Dépendances système pour pdfplumber (PyMuPDF/Pillow libs) et compilation légère
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# PyTorch CPU-only installe en premier et explicitement depuis l'index officiel :
# sans cela, "pip install sentence-transformers" tire la variante CUDA par defaut
# (plusieurs Go, avec les paquets nvidia-*), inutile ici (pas de GPU requis pour
# le scoring par embeddings) et beaucoup plus sensible aux coupures reseau.
# Cache pip monte (persiste entre tentatives, meme en cas d'echec reseau en cours de route).
# Retry au niveau shell en plus des retries internes de pip (--retries), car le
# reseau observe ici coupe parfois la connexion en plein milieu meme apres
# plusieurs tentatives internes de pip.
RUN --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    for i in 1 2 3 4 5; do \
      pip install --timeout 120 --retries 10 torch --index-url https://download.pytorch.org/whl/cpu && break || \
      { echo ">>> Tentative $i echouee (incident reseau probable), nouvel essai dans 15s..."; sleep 15; }; \
    done

RUN --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    for i in 1 2 3 4 5; do \
      pip install --timeout 120 --retries 10 -r requirements.txt && break || \
      { echo ">>> Tentative $i echouee (incident reseau probable), nouvel essai dans 15s..."; sleep 15; }; \
    done

COPY app ./app

# Pré-télécharge le modèle d'embeddings au build pour éviter la latence au premier appel.
# Retry manuel en cas de coupure réseau pendant le téléchargement depuis Hugging Face Hub.
ENV HF_HUB_DOWNLOAD_TIMEOUT=120
RUN for i in 1 2 3 4 5; do \
      python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" && break || \
      { echo "Tentative $i echouee, nouvel essai dans 10s..."; sleep 10; }; \
    done

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
