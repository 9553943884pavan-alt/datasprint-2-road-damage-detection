# DataSprint 2.0 — Intelligent Road Damage Detection

**Team:** `PavanKumar9938` (Team ID: `17424795`) | **Kaggle Public LB:** **`44.99750` (`#1` Overall, Sub `#58788362`)** | **1× Tesla T4 Speed:** `21.30 ms` val / `21.93 ms` test (`Speed_T4 = 1.0000`)

This repository contains the deduplicated, reproducible codebase, COCO-pretrained YOLO26 model weights (tracked via Git LFS, `108.43 MB` across `3` unique `.pt` checkpoints), Colab training and diagnostic notebooks, official starter evaluation scripts (consolidated under `02_notebooks/starter_kit/`), submission CSVs, and technical reports for **DataSprint 2.0 — Intelligent Road Damage Detection** (Anveshan, NIE Mysuru).

---

## Verified Results Summary

| Run / Cohort | Model & Setup | Clean Val (`score.py`) | `mAP@50` / `mAP@50:95` | `P` / `R` | Stress `mAP@50` | `1× T4` Latency (`Speed`) | Composite Proxy | Kaggle Public LB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `9e682727` (`v2` Baseline) | `YOLO26s` (`640px`, 20 ep, `2,179` imgs) | `27.9160` | `0.3159` / `0.1248` | `0.3559` / `0.3862` | `0.1030` | `15.923 ms` (`1.000`) | `34.2437` | `26.82890` (`#58774828`) |
| **`653d43d6` (`v3` Champion `A_raw`)** | **`YOLO26m` (`768px`, Ep 38/50, `14,691` imgs, `70/30 OneOf`)** | **`46.0687`** | **`0.5465` / `0.2422`** | **`0.6106` / `0.5032`** | **`0.2775` (`2.69x`)** | **`21.302 ms` (`1.000`)** | **`50.5461`** | **`44.99750` (`#1`, `#58788362`)** |
| `653d43d6` (`B_lut`) | Conditional Gamma (`luma < 60 -> 115`) | `46.0721` | `0.5468` / `0.2423` | `0.6105` / `0.5028` | `0.2722` | `22.196 ms` (`1.000`) | `50.5223` | Not submitted |
| `653d43d6` (`C_lut_fliptta_wbf`) | Gamma LUT + Flip-TTA (`bs=2`) + WBF | `47.5532` | `0.5688` / `0.2491` | `0.5991` / `0.5427` | `0.2844` | `43.641 ms` (`0.758`) | `49.4223` | Not submitted (latency loss) |

**Per-Class `v3` Clean Val (`score.py`, `n=2,150` / `2,561` GT boxes):** `D00 = 0.4775` | `D10 = 0.4913` (`+0.2813` vs `v2`) | `D20 = 0.6769` | `D40 = 0.5403`.

**Latest `v3` Error Analysis (`461172af`, `1× T4`, Cleanlab `2.9.0`):** `500×` bootstrap `95% CI [44.731, 48.169]` (`P(v3>v2)=1.0`); Cleanlab ObjectLab mean label quality `0.9519` (`28/2,150` flagged, label-noise drag `-0.3799`); `IoU@0.75` collapses to `0.1722` (`D10=0.0843`); `720×720` India concrete trails `600×600` (`0.3662` vs `0.5941`); `dark_luma` `DRI=0.0484` (`-95.16%`); Eigen-CAM sky energy `22.75%` above `y=0.22×H`; GPU NMS `iou=0.55` gains `+0.2399 pts` (`n=600`).

---

## Folder Structure

Competition image/label files (`01_data/`, `train_images/`, `val_images/`, `test_images/`, `*_labels.csv`, `*_image_ids.csv`) are intentionally excluded via `.gitignore`. All `.pt` model checkpoints are tracked via Git LFS (`.gitattributes`).

```text
datasprint-2-road-damage-detection/
├── .gitattributes                              # Git LFS tracking rule (*.pt)
├── .gitignore                                  # Excludes competition data (01_data/, *.jpg, label CSVs) & caches
├── README.md                                   # Documentation, folder structure & reproducibility guide
├── requirements.txt                            # Pinned Python dependencies for inference & analysis
├── DataSprint2_Technical_Writeup_2Page.pdf     # Exact 2-page technical write-up (Rules Section B.8.d)
├── inference.py                                # Root Top-10 offline T4 inference contract: load(device), predict(model, image)
├── weights/
│   └── best.pt                                 # Champion v3 YOLO26m Epoch-38 weights (44.06 MB, Git LFS)
│
├── 00_rules_and_guidelines/                    # Official competition docs, starter README & Finale PPT template
│   ├── DataSprint2.0_by_Anveshan_PPT_Template.pptx
│   ├── DataSprint_2.0_PS_Rules_and_Guidelines.md
│   ├── README.md
│   └── requirements.txt
│
├── 02_notebooks/                               # Reproducible notebooks & official starter evaluation suite
│   ├── starter_kit/                            # Official competition starter/verifier scripts
│   │   ├── benchmark_speed.py                  # Offline 1x T4 speed & prediction generator (--repo .)
│   │   ├── score.py                            # Official Clean/Stress metric evaluator (mAP50, mAP50:95, best-F1 P/R)
│   │   ├── make_kaggle_submission.py           # Converts flat CSV predictions into Kaggle PredictionString format
│   │   ├── check_submission.py                 # Validates row count, empty 'none' sentinel, bounds & file size
│   │   ├── train_baseline.py                   # Official YOLOv8n starter training script reference
│   │   └── inference.py                        # Original starter kit baseline inference reference
│   ├── 00_full_dataset_eda_v1.ipynb            # 21,041-image EDA & cross-split leakage audit
│   ├── 00_kaggle_to_drive_transfer.ipynb       # Competition data staging helper
│   ├── 01_datasprint_eda_and_baseline_v1.ipynb # v1 preflight attempt
│   ├── 01_datasprint_eda_and_baseline_v2.ipynb # v2 YOLO26s baseline (640px, 20 ep)
│   ├── 02_datasprint_full_train_v3.ipynb       # v3 YOLO26m L4 training (768px, 50 ep, 14,691 imgs, 70/30 OneOf)
│   ├── 02b_datasprint_v3_eval_and_submit.ipynb # Decoupled 1x T4 3-way A/B evaluation & #1 LB submission builder
│   ├── 03_datasprint_error_analysis_v1.ipynb   # Deep TIDE/DRI/Eigen-CAM error analysis on v2 baseline
│   ├── 03b_datasprint_error_analysis_v3.ipynb  # GPU T4 Advanced EA (Cleanlab 2.9.0, NMS sweep, Eigen-CAM) on v3
│   ├── 04_datasprint_dfine_m_skycrop_v1.ipynb  # Next-stage D-FINE-M + Top-22% Sky-Crop Colab notebook
│   └── 04_datasprint_dfine_m_skycrop_kaggle.ipynb
│
├── 03_results/                                 # Canonical run logs, weights, metrics & diagnostic plots (zero dupes)
│   └── runs/
│       ├── 70228600-90a8-46f5-abbc-e7dfc6e168d4/  # Full 21,041-image EDA JSON + 7 plots
│       ├── 9e682727-8382-46b2-bdb9-747d3df1cd08/  # v2 Baseline (metrics, curves & best.pt 20.31 MB via LFS)
│       ├── c63e3536-4431-4eeb-8837-89ae396a01de/  # v2 Deep Error Analysis report, predictions & 7 plots
│       ├── 001798f3-a360-479d-a2bc-7d389ccf3203/  # v3 L4 50-epoch train logs, results.csv & last.pt (44.06 MB LFS)
│       ├── 653d43d6-e88b-40a0-9ba3-b1af925900d8/  # v3 Winning T4 3-way A/B eval JSONs, val/test predictions & ckpts
│       ├── 461172af-4de1-48a7-8042-a63b4dec4a3d/  # v3 GPU Error Analysis report, Cleanlab CSV & 9 plots
│       └── {06760f00,450e514d,67a3382d,68efeaec,a547f394}/ # Preserved failed/aborted attempt event logs
│
├── 04_submissions/                             # Validated Kaggle CSV submissions
│   ├── submission_9e682727-8382-46b2-bdb9-747d3df1cd08.csv  # v2 Baseline (Public LB 26.82890)
│   └── submission_001798f3-a360-479d-a2bc-7d389ccf3203.csv  # v3 Champion (Public LB 44.99750, #1 Overall)
│
└── 05_reports/                                 # Living reports, tracker export & project state
    ├── DataSprint 2.0 — Road Damage Experiment Tracker.pdf
    ├── DataSprint 2.0 — Technical Report & Experiment Log.pdf
    └── autopilot/
        ├── project_memory.json                 # Canonical project-specific experiment memory
        ├── project_state.json
        └── setup_plan.json
```

---

## Reproducibility Commands

### 1. Environment & Git LFS Setup

```bash
git clone https://github.com/9553943884pavan-alt/datasprint-2-road-damage-detection.git
cd datasprint-2-road-damage-detection
git lfs install
git lfs pull
pip install -r requirements.txt
```

Verify that [weights/best.pt](weights/best.pt) pulled completely (`44,058,777` bytes, not a Git LFS pointer) before running inference.

### 2. Offline `1× Tesla T4` Validation Scoring & Speed Benchmark (Top-10 Contract)

Place the official competition dataset splits (`val_images/`, `val_labels.csv`, `val_image_ids.csv`, `test_images/`, `test_image_ids.csv`) into the repository root (all ignored automatically by `.gitignore`), then run:

```bash
# Run single-image (batch=1) offline T4 benchmark & export raw predictions
python 02_notebooks/starter_kit/benchmark_speed.py --repo . --images val_images --out-csv val_pred.csv --out-json val_speed.json

# Compute official competition accuracy score (expects ~46.0687 clean Val / ~21.30 ms on 1x T4)
python 02_notebooks/starter_kit/score.py --pred val_pred.csv --gt val_labels.csv --image-ids val_image_ids.csv
```

Root `inference.py` loads `weights/best.pt` via relative path (`os.path.join(_HERE, "weights", "best.pt")`) and implements `load(device)` + `predict(model, image)` returning `(class_id, score, x_min, y_min, x_max, y_max)` tuples down to `conf >= 0.001`:

```python
import numpy as np
from PIL import Image
import inference

model = inference.load("cuda")
img = np.asarray(Image.open("val_images/img_000001.jpg").convert("RGB"))
detections = inference.predict(model, img)  # [(class_id, score, x1, y1, x2, y2), ...]
```

### 3. Test Prediction, Kaggle CSV Export & Format Verification

```bash
# Time 4,200 test images on 1x T4 (~21.93 ms/img median, ~102.7s total)
python 02_notebooks/starter_kit/benchmark_speed.py --repo . --images test_images --out-csv test_pred.csv --out-json test_speed.json

# Convert flat predictions to Kaggle format ('none' for undamaged images, conf >= 0.001)
python 02_notebooks/starter_kit/make_kaggle_submission.py --pred test_pred.csv --image-ids test_image_ids.csv --out submission.csv

# Run official format & bounds check
python 02_notebooks/starter_kit/check_submission.py --pred submission.csv --image-ids test_image_ids.csv
```

### 4. End-to-End Training & Error Analysis Notebook Reproduction Order

Run the notebooks inside `02_notebooks/` in sequence on Google Colab (L4/T4 GPU, `ultralytics==8.4.216`, `albumentations==2.0.8`, `cleanlab==2.9.0`, `seed=42`):

1. `02_notebooks/00_full_dataset_eda_v1.ipynb` — Verifies image integrity, MD5 leak checks, and test degradation shifts across all `21,041` images.
2. `02_notebooks/01_datasprint_eda_and_baseline_v2.ipynb` — Trains & scores the `v2` `YOLO26s` (`640px`) baseline (`27.9160` Val / `26.82890` LB).
3. `02_notebooks/02_datasprint_full_train_v3.ipynb` — Trains champion `v3` `YOLO26m` (`768px`, `50 epochs`, `14,691` train imgs staged on NVMe, `70/30 OneOf` degradation augmentation) on 1× NVIDIA L4 (`best.pt` at Epoch 38).
4. `02_notebooks/02b_datasprint_v3_eval_and_submit.ipynb` — Benchmarks `A_raw`, `B_lut`, and `C_lut_fliptta_wbf` on 1× Tesla T4, packages root `inference.py`, and generates `#1` LB `submission_001798f3...csv` (`44.99750`).
5. `02_notebooks/03b_datasprint_error_analysis_v3.ipynb` — Runs the GPU T4 error analysis suite (`500×` bootstrap, Cleanlab ObjectLab `2.9.0`, TIDE, IoU decay, Eigen-CAM sky energy, 4-bucket DRI, GPU NMS sweep, and 5-fold OOF check).

---

## Mandatory Compliance Statement

- **Generic Pretrained Weights Only:** Initialized strictly from Ultralytics generic COCO checkpoints (`yolo26s.pt`, `yolo26m.pt`). Zero road/pavement/crack-pretrained weights and zero Objects365/DINOv3 weights were used.
- **Competition Data Only:** Trained and validated solely on the official `14,691` train / `2,150` val / `4,200` test competition partitions with zero external road or crack datasets.
- **Links:** [Google Sheets Experiment Tracker](https://docs.google.com/spreadsheets/d/1vV_PznSUwoTXO1xN0gbigATpID_XKsJ7TdEHRu2XYP0/edit) | [Google Doc Full Report](https://docs.google.com/document/d/1Zuy7Fj5oitn2LOqGKfjFYh6lm-pICSMqKajjc3_DTHU/edit) | [2-Page PDF (Drive)](https://drive.google.com/file/d/1IlV-Sk9pc0iUJm908KhvY-yFaxclyMir/view) | [Google Drive Workspace](https://drive.google.com/drive/folders/1n8ddoVvmlpff1ScGLi_WPw-pPBe_AyC1)
