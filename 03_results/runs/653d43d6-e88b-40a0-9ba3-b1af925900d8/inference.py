import math
import os
import numpy as np

_HERE = os.path.dirname(os.path.abspath(__file__))
WEIGHTS = os.path.join(_HERE, "weights", "best.pt")
IMGSZ = 768
USE_FP16 = True
CONF_FLOOR = 0.001
IOU_NMS = 0.6
MAX_DET = 100
ENABLE_LUT = False
ENABLE_FLIP_TTA = False
LUMA_THRESH = 60.0
TARGET_LUMA = 115.0
WBF_IOU_THR = 0.55

def _build_lut_table():
    x = np.arange(256, dtype=np.float32) / 255.0
    tgt = math.log(TARGET_LUMA / 255.0)
    luts = {}
    for lum in range(int(LUMA_THRESH)):
        gamma = max(0.35, min(0.85, tgt / math.log(max(float(lum), 8.0) / 255.0)))
        luts[lum] = np.clip(np.round(255.0 * (x ** gamma)), 0, 255).astype(np.uint8)
    return luts

def _wbf_two_views(ba, sa, la, bb, sb, lb, iou_thr, max_det):
    out = []
    classes = sorted(set([int(c) for c in la] + [int(c) for c in lb]))
    for cid in classes:
        cands = []
        for b, s, c in zip(ba, sa, la):
            if int(c) == cid:
                cands.append((float(s), np.asarray(b, dtype=np.float64)))
        for b, s, c in zip(bb, sb, lb):
            if int(c) == cid:
                cands.append((float(s), np.asarray(b, dtype=np.float64)))
        cands.sort(key=lambda t: t[0], reverse=True)
        clusters = []
        for sc, box in cands:
            best_i, best_iou = -1, iou_thr
            bx1, by1, bx2, by2 = box
            barea = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
            for ci, cl in enumerate(clusters):
                cx1, cy1, cx2, cy2 = cl["fused"]
                iw = max(0.0, min(bx2, cx2) - max(bx1, cx1))
                ih = max(0.0, min(by2, cy2) - max(by1, cy1))
                inter = iw * ih
                if inter <= 0.0:
                    continue
                carea = max(0.0, cx2 - cx1) * max(0.0, cy2 - cy1)
                iou = inter / max(1e-9, barea + carea - inter)
                if iou >= best_iou:
                    best_iou, best_i = iou, ci
            if best_i >= 0:
                cl = clusters[best_i]
                ws = cl["w_sum"] + sc
                cl["fused"] = (cl["fused"] * cl["w_sum"] + box * sc) / max(1e-9, ws)
                cl["w_sum"] = ws
                cl["scores"].append(sc)
            else:
                clusters.append({"fused": box.copy(), "w_sum": sc, "scores": [sc]})
        for cl in clusters:
            fb = cl["fused"]
            out.append((cid, float(sum(cl["scores"]) / 2.0), float(fb[0]), float(fb[1]), float(fb[2]), float(fb[3])))
    out.sort(key=lambda t: t[1], reverse=True)
    return out[:max_det]

def _extract_res(r):
    if r.boxes is None or len(r.boxes) == 0:
        return np.zeros((0, 4), dtype=np.float32), np.zeros((0,), dtype=np.float32), np.zeros((0,), dtype=np.int64)
    return r.boxes.xyxy.cpu().numpy(), r.boxes.conf.cpu().numpy(), r.boxes.cls.cpu().numpy().astype(int)

def _filter_boxes(items, orig_w, orig_h):
    out = []
    for cid, sc, x1, y1, x2, y2 in items:
        cid_i = int(cid)
        sc_f = max(0.0, min(1.0, float(sc)))
        fx1 = max(0.0, min(float(orig_w), float(x1)))
        fy1 = max(0.0, min(float(orig_h), float(y1)))
        fx2 = max(0.0, min(float(orig_w), float(x2)))
        fy2 = max(0.0, min(float(orig_h), float(y2)))
        if 0 <= cid_i <= 3 and math.isfinite(sc_f) and (fx2 - fx1) >= 0.5 and (fy2 - fy1) >= 0.5:
            out.append((cid_i, sc_f, fx1, fy1, fx2, fy2))
    out.sort(key=lambda t: t[1], reverse=True)
    return out[:MAX_DET]

class _Model:
    def __init__(self, yolo, device, fp16_kwargs, luts):
        self.yolo = yolo
        self.device = device
        self.fp16_kwargs = fp16_kwargs
        self.luts = luts

def load(device="cuda"):
    from ultralytics import YOLO
    from ultralytics.cfg import DEFAULT_CFG_DICT
    fp16_kwargs = {}
    if USE_FP16 and str(device).startswith("cuda"):
        if "quantize" in DEFAULT_CFG_DICT:
            fp16_kwargs["quantize"] = 16
        else:
            fp16_kwargs["half"] = True
    luts = _build_lut_table() if ENABLE_LUT else None
    return _Model(YOLO(WEIGHTS), device, fp16_kwargs, luts)

def predict(model, image):
    orig_h, orig_w = int(image.shape[0]), int(image.shape[1])
    inp = image
    if model.luts is not None:
        mean_lum = float(image[::4, ::4].mean())
        if mean_lum < LUMA_THRESH:
            inp = model.luts[max(0, min(int(LUMA_THRESH) - 1, int(mean_lum)))][image]
    bgr = np.ascontiguousarray(inp[:, :, ::-1])
    if ENABLE_FLIP_TTA:
        bgr_flip = np.ascontiguousarray(bgr[:, ::-1, :])
        results = model.yolo.predict(
            [bgr, bgr_flip],
            imgsz=IMGSZ,
            conf=CONF_FLOOR,
            iou=IOU_NMS,
            max_det=MAX_DET,
            agnostic_nms=False,
            device=model.device,
            verbose=False,
            **model.fp16_kwargs,
        )
        b0, s0, l0 = _extract_res(results[0])
        b1, s1, l1 = _extract_res(results[1])
        if len(b1) > 0:
            b1_u = b1.copy()
            b1_u[:, 0] = float(orig_w) - b1[:, 2]
            b1_u[:, 2] = float(orig_w) - b1[:, 0]
        else:
            b1_u = b1
        merged = _wbf_two_views(b0, s0, l0, b1_u, s1, l1, WBF_IOU_THR, MAX_DET)
        return _filter_boxes(merged, orig_w, orig_h)

    r = model.yolo.predict(
        bgr,
        imgsz=IMGSZ,
        conf=CONF_FLOOR,
        iou=IOU_NMS,
        max_det=MAX_DET,
        agnostic_nms=False,
        device=model.device,
        verbose=False,
        **model.fp16_kwargs,
    )[0]
    b0, s0, l0 = _extract_res(r)
    raw_items = [(int(c), float(s), float(bx[0]), float(bx[1]), float(bx[2]), float(bx[3])) for c, s, bx in zip(l0, s0, b0)]
    return _filter_boxes(raw_items, orig_w, orig_h)
