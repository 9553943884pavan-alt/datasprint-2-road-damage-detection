# Error Analysis Diagnosis: `9e682727-8382-46b2-bdb9-747d3df1cd08`

- **Official Clean Val Accuracy Score:** `27.92 / 100` (`mAP@50=0.3159`, `mAP@50:95=0.1248`, `P=0.3559`, `R=0.3862`, `opt_thr=0.106`)
- **Clean Road vs Defect Road Separation:** `ROC-AUC=0.9015` | At `opt_thr=0.106`, **15.8% of clean roads triggered a false alarm** (`clean_fp_by_cls={'D00': 61, 'D10': 23, 'D20': 55, 'D40': 53}`).
- **Confidence Calibration (`D-ECE`):** `D-ECE(>=0.05)=0.0746`, `Overconfidence Gap=-0.0746`, `Conf-IoU Spearman=0.3253`.
- **5-Fold OOF Post-Processing Simulator:** `27.26 / 100` (`-0.65 pts`, consensus `sky_cut=0.0`, `clean_gate=0.0`).

## Ranked Failure Root Causes (TIDE Exact Oracle +Delta mAP@50)
1. **`Loc` (`+9.91 mAP@50 pts`)**: Model finds the right damage type in roughly the right spot (IoU 0.10-0.50), but the box is slightly shifted/loose — fixing this also boosts mAP@50:95.
2. **`Bkg` (`+6.99 mAP@50 pts`)**: Model hallucinates damage on clean pavement/shadows/crosswalks (False Positives — fix via full 42% background training, sky/hood cutoff, clean-road gate).
3. **`Cls` (`+1.29 mAP@50 pts`)**: Model draws an accurate box (IoU>=0.50) but picks the wrong damage code (e.g., D00 vs D10 or D00 vs D20).
4. **`Both` (`+1.20 mAP@50 pts`)**: Model gets both the class wrong and box loose (IoU 0.10-0.50).
5. **`Dupe` (`+1.12 mAP@50 pts`)**: Model emits overlapping duplicate boxes for the same crack.
6. **`Miss` (`+0.97 mAP@50 pts`)**: Model fails to spot real damage at all (False Negatives — highest fix priority via higher imgsz, more epochs, full dataset, stronger backbone).

## Proposed Next Actions
- If `Miss` + `Loc` lead: use higher resolution (`768px+`), stronger capacity (`YOLO26l` or `D-FINE-M`), and longer cosine training.
- Check `06_eigencam_and_hall_of_shame_fp.png`: **3** clean-road high-conf detections sit inside damaged-road feature neighborhoods (`arXiv:2606.10666`).
- Only adopt OOF-verified post-processing rules when `OOF Gain > +0.30 pts` consistently across folds.