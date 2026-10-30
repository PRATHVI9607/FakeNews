FROM node:22-alpine AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.11-slim
RUN useradd -m -u 1000 user
WORKDIR /app

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m nltk.downloader -d /usr/share/nltk_data punkt

USER user
ENV HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface \
    WEB_DIR=/app/static

# Bake the weights in so the first request does not wait on a download.
# Only models.py is copied first so code changes do not re-download them.
COPY api/app/models.py /tmp/specs/models.py
RUN cd /tmp/specs && python -c "from models import SPECS; from huggingface_hub import snapshot_download; [snapshot_download(s.repo) for s in SPECS]"

COPY --chown=user api/app ./app
COPY --from=web --chown=user /web/out ./static

EXPOSE 7860
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}
