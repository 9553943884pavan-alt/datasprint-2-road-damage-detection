# Stage 1: Build React + Vite + Tailwind frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /build/app/frontend

COPY app/frontend/package*.json ./
RUN npm ci

COPY app/frontend/ ./
RUN npm run build

# Stage 2: Python FastAPI + YOLO26m inference server (serves /api/* and built SPA)
FROM python:3.12-slim
ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    SERVE_FRONTEND=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY app/backend/requirements.txt ./app/backend/requirements.txt
RUN pip install --no-cache-dir --index-url ${TORCH_INDEX_URL} torch==2.6.0 torchvision==0.21.0 \
    && pip install --no-cache-dir -r app/backend/requirements.txt

COPY inference.py ./inference.py
COPY weights/best.pt ./weights/best.pt
COPY app/backend/ ./app/backend/
COPY --from=frontend-builder /build/app/frontend/dist ./app/frontend/dist

RUN python app/backend/generate_samples.py && mkdir -p /app/app/backend/__pycache__

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.backend.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
