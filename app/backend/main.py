"""FastAPI backend serving DataSprint 2.0 #1 YOLO26m Road Damage Detector."""

from __future__ import annotations

import base64
import csv
import hashlib
import io
import os
import sys
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import numpy as np
import torch
import ultralytics
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageDraw, ImageOps

BACKEND_DIR = Path(__file__).resolve().parent
APP_DIR = BACKEND_DIR.parent
REPO_ROOT = APP_DIR.parent
SAMPLES_DIR = BACKEND_DIR / "samples"
FRONTEND_DIST_DIR = APP_DIR / "frontend" / "dist"

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import inference  # noqa: E402
from app.backend.generate_samples import ensure_samples  # noqa: E402

CLASS_META: dict[int, dict[str, Any]] = {
    0: {
        "code": "D00",
        "name": "Longitudinal Crack",
        "color": "#F59E0B",
        "opt_thr": 0.19,
        "ap50": 0.4775,
        "severity_weight": 14,
        "action": "Crack sealing",
    },
    1: {
        "code": "D10",
        "name": "Transverse Crack",
        "color": "#38BDF8",
        "opt_thr": 0.17,
        "ap50": 0.4913,
        "severity_weight": 16,
        "action": "Joint routing & seal",
    },
    2: {
        "code": "D20",
        "name": "Alligator Crack",
        "color": "#FB7185",
        "opt_thr": 0.21,
        "ap50": 0.6769,
        "severity_weight": 26,
        "action": "Base mill & overlay",
    },
    3: {
        "code": "D40",
        "name": "Pothole",
        "color": "#EF4444",
        "opt_thr": 0.31,
        "ap50": 0.5403,
        "severity_weight": 35,
        "action": "Urgent full-depth patch",
    },
}

BENCHMARKS: dict[str, Any] = {
    "public_lb": 44.99750,
    "public_rank": 1,
    "lead_over_second": 1.44267,
    "clean_val_score": 46.07,
    "map50": 0.5465,
    "map50_95": 0.2422,
    "precision": 0.6106,
    "recall": 0.5032,
    "f1": 0.5498,
    "opt_thr": 0.226,
    "kaggle_t4_ms": 18.144,
    "kaggle_t4_fps": 55.1,
    "colab_t4_ms": 21.30,
    "vram_mb": 148.1,
    "robustness_map50": 0.2775,
    "robustness_gain_vs_v2": 2.69,
    "composite_proxy": 50.55,
    "cleanlab_quality": 0.9519,
    "clean_vs_defect_auc": 0.9454,
    "bootstrap_ci_low": 44.731,
    "bootstrap_ci_high": 48.169,
}

SAMPLE_CATALOG: dict[str, dict[str, str]] = {
    "sample_longitudinal_crack.png": {
        "title": "Urban Lane Longitudinal Fissure",
        "subtitle": "Synthetic test scene · Wheel-path linear fracture pattern",
    },
    "sample_alligator_pothole.png": {
        "title": "Distressed Pavement & Pothole Cavity",
        "subtitle": "Synthetic test scene · Fatigue spiderweb + foreground depression",
    },
    "sample_clean_highway.png": {
        "title": "Resurfaced Clean Highway Segment",
        "subtitle": "Synthetic test scene · Intact asphalt negative control",
    },
}


class ModelState:
    def __init__(self) -> None:
        self.model: Any = None
        self.device: str = "cpu"
        self.device_name: str = "CPU"
        self.weights_sha256: str = ""
        self.weights_size_mb: float = 0.0
        self.lock = threading.Lock()


state = ModelState()


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _select_device() -> tuple[str, str]:
    override = os.getenv("DEVICE", "").strip().lower()
    if override == "cpu":
        return "cpu", "CPU"
    if override.startswith("cuda") and torch.cuda.is_available():
        return override, torch.cuda.get_device_name(0)
    if torch.cuda.is_available():
        return "cuda", torch.cuda.get_device_name(0)
    return "cpu", "CPU"


def _decode_image_bytes(raw: bytes) -> np.ndarray:
    try:
        with Image.open(io.BytesIO(raw)) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            return np.asarray(im, dtype=np.uint8)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}") from exc


def _run_model_timed(rgb: np.ndarray) -> tuple[list[tuple[int, float, float, float, float, float]], float]:
    if state.model is None:
        raise HTTPException(status_code=503, detail="Model weights are not loaded")

    is_cuda = state.device.startswith("cuda") and torch.cuda.is_available()
    with state.lock:
        if is_cuda:
            torch.cuda.synchronize()
        t0 = time.perf_counter()
        raw_preds = inference.predict(state.model, rgb)
        if is_cuda:
            torch.cuda.synchronize()
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
    return raw_preds, round(elapsed_ms, 2)


def _format_detections(
    raw_preds: list[tuple[int, float, float, float, float, float]],
    width: int,
    height: int,
    min_conf: float,
) -> list[dict[str, Any]]:
    img_area = max(1.0, float(width) * float(height))
    items: list[dict[str, Any]] = []
    for idx, (cid, score, x1, y1, x2, y2) in enumerate(raw_preds):
        if score < min_conf:
            continue
        meta = CLASS_META[int(cid)]
        box_area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        items.append(
            {
                "id": f"det-{idx}",
                "class_id": int(cid),
                "code": meta["code"],
                "label": meta["name"],
                "color": meta["color"],
                "score": round(float(score), 4),
                "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                "area_pct": round((box_area / img_area) * 100.0, 2),
                "opt_thr": meta["opt_thr"],
            }
        )
    return items


def _summarize_detections(
    detections: list[dict[str, Any]],
    display_conf: float,
    use_per_class_opt: bool,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    counts = {meta["code"]: 0 for meta in CLASS_META.values()}
    active: list[dict[str, Any]] = []
    penalty = 0.0

    for det in detections:
        thr = float(det["opt_thr"]) if use_per_class_opt else display_conf
        if det["score"] >= thr:
            active.append(det)
            counts[det["code"]] += 1
            meta = CLASS_META[det["class_id"]]
            penalty += meta["severity_weight"] * min(1.0, det["score"] / 0.35)

    integrity_score = max(0, min(100, round(100.0 - penalty)))

    if not active:
        severity_tier = "Clean Road"
        recommended_action = "No actionable surface distress above operating threshold."
    elif counts["D40"] > 0 or integrity_score < 55:
        severity_tier = "Critical — Urgent Pothole Repair"
        recommended_action = "Dispatch patching crew immediately; pothole or severe structural risk detected."
    elif counts["D20"] > 0 or integrity_score < 78:
        severity_tier = "Moderate — Scheduled Patch"
        recommended_action = "Schedule localized mill-and-overlay maintenance to arrest fatigue propagation."
    else:
        severity_tier = "Low — Routine Seal"
        recommended_action = "Perform preventive crack sealing during next scheduled corridor sweep."

    summary = {
        "counts": counts,
        "total_count": len(active),
        "integrity_score": integrity_score,
        "severity_tier": severity_tier,
        "recommended_action": recommended_action,
        "threshold_mode": "per_class_opt" if use_per_class_opt else "global",
        "display_conf": display_conf,
    }
    return active, summary


def _to_prediction_string(detections: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        parts.append(
            f"{det['class_id']} {det['score']:.4f} {x1:.2f} {y1:.2f} {x2:.2f} {y2:.2f}"
        )
    return " ".join(parts)


def _render_annotated_base64(rgb: np.ndarray, detections: list[dict[str, Any]]) -> str:
    img = Image.fromarray(rgb, mode="RGB")
    draw = ImageDraw.Draw(img)
    line_w = max(2, round(min(img.width, img.height) / 280))
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        color = det["color"]
        draw.rectangle([x1, y1, x2, y2], outline=color, width=line_w)
        tag = f"{det['code']} {int(round(det['score'] * 100))}%"
        ty = max(0.0, y1 - 18.0)
        draw.rectangle([x1, ty, min(float(img.width), x1 + len(tag) * 7.2 + 8), ty + 18.0], fill=color)
        draw.text((x1 + 4, ty + 3), tag, fill="#090D16")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_samples()
    weights_path = Path(inference.WEIGHTS)
    if not weights_path.is_file():
        raise RuntimeError(f"Champion weights not found at {weights_path}")

    device, device_name = _select_device()
    state.device = device
    state.device_name = device_name
    state.weights_sha256 = _sha256_file(weights_path)
    state.weights_size_mb = round(weights_path.stat().st_size / (1024 * 1024), 2)
    state.model = inference.load(device=device)

    # Single warm-up pass so first interactive frame returns at steady-state latency.
    warmup_rgb = np.zeros((inference.IMGSZ, inference.IMGSZ, 3), dtype=np.uint8)
    _run_model_timed(warmup_rgb)
    yield


app = FastAPI(
    title="RoadGuard AI — Anveshan DataSprint 2.0 API",
    version="1.0.0",
    lifespan=lifespan,
)

raw_origins = os.getenv("ALLOWED_ORIGINS", "*").strip()
if raw_origins == "*":
    cors_origins = ["*"]
else:
    cors_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def get_health() -> dict[str, Any]:
    return {
        "status": "ok" if state.model is not None else "loading",
        "model_loaded": state.model is not None,
        "architecture": "YOLO26m (Epoch 38)",
        "device": state.device,
        "device_name": state.device_name,
        "weights_sha256": state.weights_sha256,
        "weights_size_mb": state.weights_size_mb,
        "imgsz": inference.IMGSZ,
        "iou_nms": inference.IOU_NMS,
        "max_det": inference.MAX_DET,
        "conf_floor": inference.CONF_FLOOR,
        "ultralytics_version": ultralytics.__version__,
        "torch_version": torch.__version__,
        "classes": list(CLASS_META.values()),
        "benchmarks": BENCHMARKS,
    }


@app.get("/api/samples")
def list_samples() -> dict[str, Any]:
    ensure_samples()
    samples: list[dict[str, str]] = []
    for path in sorted(SAMPLES_DIR.glob("*.png")):
        info = SAMPLE_CATALOG.get(
            path.name,
            {
                "title": path.stem.replace("_", " ").title(),
                "subtitle": "Synthetic road-surface PNG sample",
            },
        )
        samples.append(
            {
                "id": path.stem,
                "filename": path.name,
                "title": info["title"],
                "subtitle": info["subtitle"],
                "url": f"/api/samples/{path.name}",
            }
        )
    return {"samples": samples}


@app.get("/api/samples/{filename}")
def get_sample(filename: str) -> FileResponse:
    safe_name = Path(filename).name
    if safe_name != filename or not safe_name.endswith(".png"):
        raise HTTPException(status_code=400, detail="Invalid sample filename")
    target = (SAMPLES_DIR / safe_name).resolve()
    if target.parent != SAMPLES_DIR.resolve() or not target.is_file():
        raise HTTPException(status_code=404, detail="Sample not found")
    return FileResponse(target, media_type="image/png")


@app.post("/api/predict")
async def predict_single(
    file: UploadFile = File(...),
    min_conf: float = Query(0.01, ge=0.001, le=0.95),
    include_floor: bool = Query(False),
    display_conf: float = Query(0.226, ge=0.001, le=0.95),
    use_per_class_opt: bool = Query(False),
    return_annotated: bool = Query(False),
) -> dict[str, Any]:
    raw_bytes = await file.read()
    rgb = _decode_image_bytes(raw_bytes)
    height, width = int(rgb.shape[0]), int(rgb.shape[1])

    raw_preds, latency_ms = _run_model_timed(rgb)
    effective_min = inference.CONF_FLOOR if include_floor else min_conf
    detections = _format_detections(raw_preds, width, height, effective_min)
    active, summary = _summarize_detections(detections, display_conf, use_per_class_opt)

    response: dict[str, Any] = {
        "filename": file.filename or "uploaded_image.png",
        "width": width,
        "height": height,
        "latency_ms": latency_ms,
        "fps": round(1000.0 / max(latency_ms, 0.1), 1),
        "device": state.device_name,
        "min_conf": effective_min,
        "detections": detections,
        "summary_at_default": summary,
        "prediction_string": _to_prediction_string(detections if include_floor else active),
    }
    if return_annotated:
        response["annotated_base64"] = _render_annotated_base64(rgb, active)
    return response


@app.post("/api/predict/batch")
async def predict_batch(
    files: list[UploadFile] = File(...),
    conf_threshold: float = Query(0.226, ge=0.001, le=0.95),
) -> dict[str, Any]:
    if not files:
        raise HTTPException(status_code=400, detail="At least one image file is required")

    items: list[dict[str, Any]] = []
    totals = {meta["code"]: 0 for meta in CLASS_META.values()}
    latencies: list[float] = []
    damaged_images = 0

    csv_buf = io.StringIO()
    writer = csv.writer(csv_buf)
    writer.writerow(["image_id", "PredictionString"])

    for upload in files:
        raw_bytes = await upload.read()
        rgb = _decode_image_bytes(raw_bytes)
        height, width = int(rgb.shape[0]), int(rgb.shape[1])
        raw_preds, latency_ms = _run_model_timed(rgb)
        latencies.append(latency_ms)

        all_dets = _format_detections(raw_preds, width, height, inference.CONF_FLOOR)
        active, summary = _summarize_detections(all_dets, conf_threshold, use_per_class_opt=False)

        if summary["total_count"] > 0:
            damaged_images += 1
        for code, cnt in summary["counts"].items():
            totals[code] += cnt

        pred_str = _to_prediction_string(all_dets)
        image_id = Path(upload.filename or f"image_{len(items) + 1}.png").stem
        writer.writerow([image_id, pred_str])

        items.append(
            {
                "filename": upload.filename or f"image_{len(items) + 1}.png",
                "image_id": image_id,
                "width": width,
                "height": height,
                "latency_ms": latency_ms,
                "total_count": summary["total_count"],
                "counts": summary["counts"],
                "integrity_score": summary["integrity_score"],
                "severity_tier": summary["severity_tier"],
                "top_score": round(active[0]["score"], 4) if active else 0.0,
                "detections": active,
                "prediction_string": pred_str,
            }
        )

    total_images = len(items)
    mean_latency = round(sum(latencies) / max(1, total_images), 2)
    return {
        "total_images": total_images,
        "damaged_images": damaged_images,
        "damaged_pct": round((damaged_images / max(1, total_images)) * 100.0, 1),
        "conf_threshold": conf_threshold,
        "mean_latency_ms": mean_latency,
        "aggregate_counts": totals,
        "items": items,
        "kaggle_csv": csv_buf.getvalue(),
    }


if FRONTEND_DIST_DIR.joinpath("index.html").is_file() and os.getenv("SERVE_FRONTEND", "1") != "0":
    assets_dir = FRONTEND_DIST_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str) -> FileResponse:
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API route not found")
        dist_root = FRONTEND_DIST_DIR.resolve()
        candidate = (dist_root / full_path).resolve()
        if full_path and candidate.is_relative_to(dist_root) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST_DIR / "index.html")
else:

    @app.get("/")
    def get_root_info() -> dict[str, str]:
        return {
            "service": "RoadGuard AI — DataSprint 2.0 GPU API",
            "status": "ok",
            "health": "/api/health",
            "docs": "/docs",
        }
