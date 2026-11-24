# RoadGuard AI — Final Demo Web App

Full-stack road damage detection interface for **Anveshan DataSprint 2.0** (#1 Kaggle Public LB `44.99750`) powered by our champion `YOLO26m` weights (`weights/best.pt`) and root `inference.py`.

## Stack
- **Backend (`app/backend/`)**: Python, FastAPI, Uvicorn, Ultralytics `YOLO26m`, PyTorch CUDA/CPU auto-detection
- **Frontend (`app/frontend/`)**: React 19, Vite, TypeScript, Tailwind CSS v4, **shadcn/ui**, **Magic UI**, **Aceternity UI**

## Run Locally (Two Terminals from Repo Root)

### 1. Start the Python FastAPI Backend (`:8000`)
```bash
python -m uvicorn app.backend.main:app --host 127.0.0.1 --port 8000
```
Wait until `/api/health` reports `model_loaded: true`.

### 2. Start the React + Vite Frontend (`:5173`)
```bash
cd app/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Open `http://127.0.0.1:5173` in your browser (`/api/*` requests proxy cleanly to `:8000`).

---

## Option A Deployment (Recommended): Vercel Frontend + Modal NVIDIA A10 / L4 GPU Backend

### 1. Deploy the GPU Backend to Modal (`gpu=["A10", "L4"]`)
Run from the **repository root** (`c:\Users\Pavan\Downloads\DataSprinit`):
```bash
pip install modal
modal token new
modal deploy app/modal_app.py
```
Modal outputs a permanent HTTPS URL (e.g. `https://<workspace>--roadguard-ai-datasprint2-api.modal.run`). Verify `<MODAL_URL>/api/health` returns `device: "cuda"` (`NVIDIA A10G` / `L4`).

For zero cold starts during your Final Demo Round slot, set `min_containers=1` in `app/modal_app.py` shortly before presenting, then revert to `min_containers=0` afterward.

### 2. Deploy the React + Vite Frontend to Vercel
Deploy `app/frontend/` as the Vercel root directory (SPA routing configured via `app/frontend/vercel.json`) with environment variable:
```env
VITE_API_BASE_URL=https://<workspace>--roadguard-ai-datasprint2-api.modal.run
```

---

## Option B: Single-Container Docker Deployment

Build from the **repository root** so `inference.py` and `weights/best.pt` are included:

```bash
docker build -f app/Dockerfile -t roadguard-ai:latest .
docker run -p 7860:7860 roadguard-ai:latest
```

Then open `http://127.0.0.1:7860` — FastAPI serves both `/api/*` and the compiled `app/frontend/dist` bundle.
