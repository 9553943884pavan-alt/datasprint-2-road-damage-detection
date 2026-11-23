# DataSprint 2.0 — Intelligent Road Damage Detection

**Team:** `PavanKumar9938` (Team ID: `17424795`) | **Kaggle Public LB:** **`44.99750` (`#1` Overall, Sub `#58788362`)** | **1× Tesla T4 Speed:** `21.30 ms` val / `21.93 ms` test (`Speed_T4 = 1.0000`)

This repository contains the complete reproducible codebase, COCO-pretrained YOLO26 model weights (stored via Git LFS, `108.43 MB` deduplicated across `weights/best.pt`, `v3 last.pt`, and `v2 best.pt`), training and diagnostic notebooks, official starter evaluation scripts, submission CSVs, and technical reports for **DataSprint 2.0 — Intelligent Road Damage Detection** (Anveshan, NIE Mysuru).

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

## Repository Layout

- `inference.py` & `weights/best.pt` — Standalone offline `1× Tesla T4` inference contract (`load(device)` + `predict(model, image)`, `YOLO26m` FP16 `768px`, `conf >= 0.001`, `iou=0.60`, `agnostic_nms=False`, `max_det=100`).
- `benchmark_speed.py`, `score.py`, `make_kaggle_submission.py`, `check_submission.py`, `train_baseline.py` — Official competition verification & scoring utilities.
- `DataSprint2_Technical_Writeup_2Page.pdf` — Exact 2-page technical write-up satisfying competition Rules Section B.8.d.
- `00_rules_and_guidelines/` — Official problem statement, rules, starter README, and presentation template.
- `02_notebooks/` — Complete reproducible Colab notebooks (`00_full_dataset_eda_v1`, `01_datasprint_eda_and_baseline_v2`, `02_datasprint_full_train_v3`, `02b_datasprint_v3_eval_and_submit`, `03_datasprint_error_analysis_v1`, `03b_datasprint_error_analysis_v3`, `04_datasprint_dfine_m_skycrop_*`) + `starter_kit/inference.py` baseline reference.
- `03_results/` — Canonical logged run manifests, training curves, `v2`/`v3` checkpoints (`*.pt` tracked via Git LFS), and error analysis JSONs & plots (`c63e3536`, `461172af`).
- `04_submissions/` — Validated Kaggle submission CSVs (`submission_9e682727...csv` & winning `submission_001798f3...csv`).
- `05_reports/` — Exported Google Sheets Tracker PDF, full living Technical Report PDF, and `autopilot/project_memory.json`.

*(Competition image/label files under `01_data/` are excluded via `.gitignore` per competition data distribution rules.)*

---

## Offline `1× Tesla T4` Reproduction Instructions

```bash
git clone https://github.com/9553943884pavan-alt/datasprint-2-road-damage-detection.git
cd datasprint-2-road-damage-detection
git lfs install && git lfs pull
pip install -r requirements.txt

# Place competition validation/test images & label CSVs in the working directory, then verify:
python benchmark_speed.py --repo . --images val_images --out-csv val_pred.csv --out-json val_speed.json
python score.py --pred val_pred.csv --gt val_labels.csv --image-ids val_image_ids.csv

# Generate and check Kaggle test submission:
python benchmark_speed.py --repo . --images test_images --out-csv test_pred.csv --out-json test_speed.json
python make_kaggle_submission.py --pred test_pred.csv --image-ids test_image_ids.csv --out submission.csv
python check_submission.py --pred submission.csv --image-ids test_image_ids.csv
```

---

## Mandatory Compliance Statement

- **Generic Pretrained Weights Only:** Initialized strictly from Ultralytics generic COCO checkpoints (`yolo26s.pt`, `yolo26m.pt`). Zero road/pavement/crack-pretrained weights and zero Objects365/DINOv3 weights were used.
- **Competition Data Only:** Trained and validated solely on the official `14,691` train / `2,150` val / `4,200` test competition partitions with zero external road or crack datasets.
- **References & Links:** [Google Sheets Experiment Tracker](https://docs.google.com/spreadsheets/d/1vV_PznSUwoTXO1xN0gbigATpID_XKsJ7TdEHRu2XYP0/edit) | [Google Doc Full Report](https://docs.google.com/document/d/1Zuy7Fj5oitn2LOqGKfjFYh6lm-pICSMqKajjc3_DTHU/edit) | [Google Drive Workspace](https://drive.google.com/drive/folders/1n8ddoVvmlpff1ScGLi_WPw-pPBe_AyC1)
