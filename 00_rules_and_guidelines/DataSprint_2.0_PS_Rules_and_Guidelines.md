# DataSprint 2.0: Intelligent Road Damage Detection — Problem Statement, Rules & Guidelines

**Competition:** DataSprint 2.0 (36-Hour AI & ML Hackathon)  
**Organisers:** Team Anveshan (Applied Research & AI/ML Club), The National Institute of Engineering (NIE), Mysuru  
**Supporting Sponsors:** InterviewBuddy (Official Gold Partner), Navan AI (Community & Agentic AI Partner)  
**Dates:** 23–25 November 2026  
**Official Links (from Organizer Emails):**
- **Problem Statements & Submission Portal (Linktree):** https://linktr.ee/anveshan_nie
- **Official Participant WhatsApp Group:** https://chat.whatsapp.com/FeKywQXx4EXBDrvLGiyDK1
- **Organizer Contact (Email Source):** `2023ci_deepankargupta_a@nie.ac.in` / `anveshan@nie.ac.in`

---

## 1. Problem Overview & Task Definition

Cities and highway agencies need automated detection of road damage from vehicle-mounted smartphone photos. Given a road photo from India, Japan, or the Czech Republic (spanning shadows, glare, wet roads, and intentionally degraded test conditions), predict a bounding box, class ID, and confidence score for every damaged area. Photos with no damage must produce no boxes (`none` in Kaggle submission CSV).

### Classes

| `class_id` | Code | Damage Type |
| :---: | :---: | --- |
| `0` | `D00` | Longitudinal crack |
| `1` | `D10` | Transverse crack |
| `2` | `D20` | Alligator crack |
| `3` | `D40` | Pothole |

---

## 2. Dataset Specification & Licence

- **Source & Attribution:** RDD2020 (CC BY-NC 3.0 — `https://creativecommons.org/licenses/by-nc/3.0/`).  
  Citation: Arya, D., Maeda, H., Ghosh, S. K., Toshniwal, D., Omata, H., Kashiyama, T., Seto, T., Mraz, A. and Sekimoto, Y. (2021), *"RDD2020: An Image Dataset for Smartphone-based Road Damage Detection and Classification"*, Mendeley Data, V1, doi: `10.17632/5ty2wb6gvg.1`.
- **Restrictions:** Non-commercial / competition use only. Images were renamed (`img_XXXXXX.jpg`), re-saved, and a hidden portion of `test_images` was intentionally degraded (blur, low light, noise, heavy JPEG compression).

### Provided Splits & Files

| Asset | Details |
| --- | --- |
| `train_images/` & `train_labels.csv` | **14,691** training `.jpg` photos; labels in pixel coordinates (`image_id,class_id,x_min,y_min,x_max,y_max`). Undamaged photos have no label rows. |
| `val_images/`, `val_labels.csv`, `val_image_ids.csv` | **2,150** validation `.jpg` photos and ground truth labels for local validation & official scoring. |
| `test_images/`, `test_image_ids.csv` | **4,200** test `.jpg` photos (normal + hidden degraded photos mixed; no labels). |
| Starter Kit Scripts | `score.py`, `check_submission.py`, `make_kaggle_submission.py`, `inference.py`, `benchmark_speed.py`, `train_baseline.py`, `README.md`, `requirements.txt` |
| Presentation Template | `DataSprint2.0_by_Anveshan_PPT_Template.pptx` |

---

## 3. Evaluation Metric & Scoring Rules

### Final Score (out of 100)

$$\text{Final Score} = 100 \times \left(0.30 \cdot \text{mAP@50} + 0.25 \cdot \text{mAP@50:95} + 0.15 \cdot \text{Precision} + 0.15 \cdot \text{Recall} + 0.10 \cdot \text{Speed} + 0.05 \cdot \text{Robustness}\right)$$

Every individual metric lies in $[0, 1]$:
1. **`mAP@50` (30%):** COCO-style 101-point interpolated Average Precision at IoU $\ge 0.50$, averaged across classes (max 100 detections per image by highest confidence; classes with 0 GT boxes in scored split are skipped).
2. **`mAP@50:95` (25%):** Mean AP over IoU thresholds $0.50, 0.55, \dots, 0.95$.
3. **`Precision` (15%) & `Recall` (15%):** Evaluated at IoU $0.50$ at the **single global confidence threshold** (grid step `0.001`) that maximizes mean F1 across classes. Keep low-confidence boxes down to `0.001` — thresholding early lowers mAP and harms threshold sweep!
4. **`Speed` (10%, post-deadline):** Measured by organizers on **1× NVIDIA T4 GPU**, batch size `1` (one image at a time), using median latency per image:
   - $\le 25\text{ ms}$ scores `1.0`
   - $\ge 250\text{ ms}$ scores `0.0`
   - Intermediate latencies are scored on a log scale between `0` and `1`.
5. **`Robustness` (5%, post-deadline):** `mAP@50` measured on the hidden degraded subset of `test_images` (blur, low light, noise, heavy JPEG compression).

### Leaderboard Splits & Tie-Breaks
- **Public Leaderboard:** Accuracy-only (first 4 metrics scaled to 100) on **30% of normal test images**.
- **Private Leaderboard:** Other **70% of normal test images** + post-deadline Speed & Robustness checks.
- **Tie-Breaks:** Within `0.1` Final Score points $\rightarrow$ higher `mAP@50:95` $\rightarrow$ higher `Recall` $\rightarrow$ earlier final submission.
- **Starter Baseline:** `train_baseline.py` (YOLOv8n, 5 epochs, COCO weights) scores ~`30.5` out of `100` on the Public Leaderboard.

---

## 4. Submission Requirements & Format

### Kaggle CSV Schema (`submission.csv`)
- **Columns:** `image_id,PredictionString` — **exactly one row per ID in `test_image_ids.csv` (4,200 rows)**.
- **`PredictionString`:** Space-separated tuples `class score x_min y_min x_max y_max` repeated per box (original pixel coordinates, `0 <= class <= 3`, `0 <= score <= 1`, `x_max > x_min`, `y_max > y_min`).
- **Empty Predictions:** Must write the literal word `none` (never leave `PredictionString` blank/empty, or Kaggle rejects with null value errors).
- **Confidence Floor:** Keep predictions down to `score >= 0.001` (max 100 detections per image scored; max file size checked by `check_submission.py` is `50 MB`).
- **Pre-Upload Check:**
  ```bash
  python benchmark_speed.py --repo . --images test_images --out-csv test_pred.csv --out-json test_speed.json
  python make_kaggle_submission.py --pred test_pred.csv --image-ids test_image_ids.csv --out submission.csv
  python check_submission.py --pred submission.csv --image-ids test_image_ids.csv
  ```

### Official Participation & Operational Rules (Gmail + Kaggle)
1. **One Team, One Track (Strict):** Teams may compete in **ONLY ONE TRACK**; participating in multiple tracks causes immediate disqualification. (Team max size on Kaggle: up to 4 members; no merging after start.)
2. **Mandatory 24-Hour Valid Submission:** Every team **must submit at least one valid submission within the first 24 hours** to remain eligible for Finale Demo/Presentation shortlisting.
3. **Submission Limit Discrepancy (IMPORTANT — Plan Conservatively!):**
   - **Team Anveshan Gmail (23 Nov 2026, 09:15 IST):** *"Each team is permitted a maximum of 5 submissions."*
   - **Kaggle Page:** *"You can make 10 submissions in total. There is no daily limit. A file rejected for a format error does not count."*
   - **Action Rule:** Budget strictly assuming **5 submissions max** unless organizers explicitly clarify on the official WhatsApp group / Linktree that Kaggle's 10-submission cap applies. Select 1 final submission before deadline.
4. **Finale Shortlisting:** **Top 15 teams per track** are shortlisted for the Finale Demo/Presentation Round (prepare deck using `DataSprint2.0_by_Anveshan_PPT_Template.pptx`).

---

## 5. Fair Play, Approved Weights & Top-10 Verification Contract

- **Data Restriction:** Use **only** the provided competition data. Outside road, pavement, or crack datasets are **strictly prohibited**.
- **Pretrained Weights Restriction:** **Only generic COCO or ImageNet weights** are allowed (e.g., Ultralytics COCO detection weights, `torchvision` COCO/ImageNet weights, `timm` ImageNet weights). Weights pretrained on any road/pavement/crack dataset are **never allowed**.
- **No Cheating:** No manual labeling of test images, hard-coded outputs, or leaderboard probing.
- **Top-10 Verification Contract (Private Leaderboard):**
  - Share a **public repository with a pinned commit** + a **write-up of at most 2 pages** listing every pretrained weight, library, and compute resource used, and confirming zero outside data.
  - Organizers will rerun `inference.py` from the **root of your repository** **offline (no internet)** on **1× T4 GPU**:
    - `model = load(device)` (called once, not timed)
    - `detections = predict(model, image)` (called once per RGB `uint8` `[H, W, 3]` image, batch size 1, timed)
    - Must load all weights from paths relative to `inference.py`.
    - TTA, ensembles, and tiling are allowed inside `predict()`, and their runtime counts toward both the speed score and total runtime.
    - Must **reproduce accuracy score within 2 points** and **finish within 30 minutes**.
