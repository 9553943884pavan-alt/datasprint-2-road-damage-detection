import os
import numpy as np

_HERE = os.path.dirname(os.path.abspath(__file__))
WEIGHTS = os.path.join(_HERE, "weights", "best.pt")
IMGSZ = 640

class _Model:
    def __init__(self, yolo, device):
        self.yolo, self.device = yolo, device

def load(device="cuda"):
    from ultralytics import YOLO
    return _Model(YOLO(WEIGHTS), device)

def predict(model, image):
    bgr = np.ascontiguousarray(image[:, :, ::-1])
    r = model.yolo.predict(bgr, imgsz=IMGSZ, conf=0.001, iou=0.6, max_det=100,
                           device=model.device, verbose=False)[0]
    if r.boxes is None or len(r.boxes) == 0:
        return []
    xyxy = r.boxes.xyxy.cpu().numpy()
    conf = r.boxes.conf.cpu().numpy()
    cls = r.boxes.cls.cpu().numpy().astype(int)
    return [(int(c), float(s), float(b[0]), float(b[1]), float(b[2]), float(b[3]))
            for c, s, b in zip(cls, conf, xyxy)]
