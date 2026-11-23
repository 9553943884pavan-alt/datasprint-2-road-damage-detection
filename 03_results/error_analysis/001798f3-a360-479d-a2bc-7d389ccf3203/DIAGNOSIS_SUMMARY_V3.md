# Advanced Error Analysis v3 Diagnosis: `001798f3-a360-479d-a2bc-7d389ccf3203`

- **v3 Clean Val Accuracy:** `46.0687 / 100` (`95% Boot CI = [44.73, 48.17]`, `+18.1526 pts` vs `v2`)
- **T4 4-Bucket Stress Mean DRI:** `0.5473` | Bright/720px CLAHE Delta `mAP@50` = `+0.0045`
- **Cleanlab ObjectLab:** `28` flagged val images (`overlooked=1`, `swap=1`, `bad_loc=4`)
- **Eigen-CAM Top-22% Sky Energy:** `22.75%` | **Live T4 NMS Sweep:** best `iou=0.55` (`+0.2399 pts`) | **5-Fold OOF PP Gain:** `-0.3794 pts`

## Ranked TIDE Oracle Root Causes (+Delta mAP@50 if Fixed)
1. **`Loc` (`+9.88 mAP@50 pts`)**
2. **`Bkg` (`+8.68 mAP@50 pts`)**
3. **`Cls` (`+1.54 mAP@50 pts`)**
4. **`Miss` (`+1.18 mAP@50 pts`)**
5. **`Both` (`+1.08 mAP@50 pts`)**
6. **`Dupe` (`+0.64 mAP@50 pts`)**