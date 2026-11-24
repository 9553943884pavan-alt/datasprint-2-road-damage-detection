"""Modal 1.x GPU deployment entrypoint for RoadGuard AI (Tesla T4)."""

from __future__ import annotations

from pathlib import Path

import modal

REPO_ROOT = Path(__file__).resolve().parent.parent

app = modal.App("roadguard-ai-datasprint2")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libgl1", "libglib2.0-0")
    .uv_pip_install(
        "torch==2.6.0",
        "torchvision==0.21.0",
        "fastapi>=0.110.0",
        "uvicorn[standard]>=0.27.1",
        "python-multipart>=0.0.9",
        "pillow>=11.0.0",
        "numpy>=2.0.0",
        "opencv-python-headless>=4.10.0",
        "ultralytics>=8.4.216",
    )
    .env(
        {
            "SERVE_FRONTEND": "0",
            "PYTHONPATH": "/app",
        }
    )
    .add_local_file(
        str(REPO_ROOT / "inference.py"),
        remote_path="/app/inference.py",
        copy=True,
    )
    .add_local_file(
        str(REPO_ROOT / "weights" / "best.pt"),
        remote_path="/app/weights/best.pt",
        copy=True,
    )
    .add_local_dir(
        str(REPO_ROOT / "app" / "backend"),
        remote_path="/app/app/backend",
        copy=True,
        ignore=["__pycache__", "*.pyc", "samples"],
    )
)


@app.function(
    image=image,
    gpu="T4",
    scaledown_window=180,
    min_containers=0,
    max_containers=2,
    timeout=300,
)
@modal.concurrent(max_inputs=16)
@modal.asgi_app()
def api():
    import sys

    if "/app" not in sys.path:
        sys.path.insert(0, "/app")
    from app.backend.main import app as fastapi_app

    return fastapi_app
