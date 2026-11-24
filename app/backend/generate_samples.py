"""Generate deterministic synthetic 960x640 road-surface demo PNG samples.

Uses only NumPy + Pillow (zero external downloads, zero competition data) so the
repo stays clean and strictly compliant with DataSprint 2.0 rules.
"""

from __future__ import annotations

from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


SAMPLES_DIR = Path(__file__).resolve().parent / "samples"
WIDTH = 960
HEIGHT = 640


def _make_asphalt_base(rng: np.random.Generator, base_val: int = 86, contrast: int = 18) -> Image.Image:
    """Synthesize a perspective-graded asphalt roadway surface."""
    y_grid = np.linspace(0.0, 1.0, HEIGHT, dtype=np.float32)[:, None]
    x_grid = np.linspace(-1.0, 1.0, WIDTH, dtype=np.float32)[None, :]

    # Slight horizon gradient (lighter sky strip at top 14%, darker near camera)
    road_grad = base_val + 14.0 * (1.0 - y_grid) - 6.0 * (x_grid**2)
    coarse = rng.normal(0.0, contrast * 0.55, size=(HEIGHT // 2, WIDTH // 2)).astype(np.float32)
    coarse = np.repeat(np.repeat(coarse, 2, axis=0), 2, axis=1)
    fine = rng.normal(0.0, contrast * 0.75, size=(HEIGHT, WIDTH)).astype(np.float32)

    texture = np.clip(road_grad + coarse + fine, 22, 195)
    # Warm-cool slight asphalt tint
    rgb = np.stack(
        [
            np.clip(texture - 1.5, 0, 255),
            np.clip(texture, 0, 255),
            np.clip(texture + 3.0, 0, 255),
        ],
        axis=-1,
    ).astype(np.uint8)

    img = Image.fromarray(rgb, mode="RGB")
    draw = ImageDraw.Draw(img)

    # Top horizon / roadside band for realistic dashcam framing
    draw.rectangle([0, 0, WIDTH, 92], fill=(138, 152, 168))
    draw.rectangle([0, 74, WIDTH, 96], fill=(64, 72, 60))
    draw.line([(0, 96), (WIDTH, 96)], fill=(45, 48, 52), width=3)

    # Perspective shoulders (left & right curbs)
    draw.polygon([(0, 96), (170, 96), (0, 340)], fill=(74, 80, 72))
    draw.polygon([(WIDTH, 96), (WIDTH - 170, 96), (WIDTH, 340)], fill=(74, 80, 72))

    # Yellow left edge stripe + white right shoulder line
    draw.line([(235, 102), (48, HEIGHT)], fill=(214, 174, 48), width=8)
    draw.line([(725, 102), (912, HEIGHT)], fill=(216, 220, 222), width=7)

    # Perspective dashed centerline
    for i in range(5):
        t0 = 0.14 + i * 0.19
        t1 = t0 + 0.095
        y0 = int(96 + t0 * (HEIGHT - 96))
        y1 = int(96 + t1 * (HEIGHT - 96))
        w = max(4, int(4 + i * 2.2))
        draw.line([(WIDTH // 2, y0), (WIDTH // 2, y1)], fill=(224, 226, 228), width=w)

    return img


def _draw_jagged_crack(
    draw: ImageDraw.ImageDraw,
    rng: np.random.Generator,
    points: list[tuple[float, float]],
    base_width: int = 4,
    jitter: float = 4.5,
    sub_steps: int = 8,
    color: tuple[int, int, int] = (24, 25, 28),
) -> None:
    """Draw a jagged multi-segment pavement fissure with subtle pale spall border."""
    expanded: list[tuple[float, float]] = []
    for (x0, y0), (x1, y1) in zip(points[:-1], points[1:]):
        for s in range(sub_steps):
            alpha = s / sub_steps
            px = x0 + (x1 - x0) * alpha + float(rng.normal(0.0, jitter))
            py = y0 + (y1 - y0) * alpha + float(rng.normal(0.0, jitter * 0.45))
            expanded.append((px, py))
    expanded.append(points[-1])

    # Subtle bright weathered edge before dark crack core
    shifted = [(x + 2.0, y + 1.0) for x, y in expanded]
    draw.line(shifted, fill=(108, 110, 114), width=max(1, base_width + 2), joint="curve")
    draw.line(expanded, fill=color, width=base_width, joint="curve")


def build_longitudinal_sample(rng: np.random.Generator) -> Image.Image:
    """Road scene with prominent wheel-path longitudinal crack and minor secondary line."""
    img = _make_asphalt_base(rng, base_val=88, contrast=17)
    draw = ImageDraw.Draw(img)

    _draw_jagged_crack(
        draw,
        rng,
        [(595, 190), (618, 285), (642, 390), (668, 505), (694, 628)],
        base_width=6,
        jitter=5.5,
        sub_steps=10,
    )
    _draw_jagged_crack(
        draw,
        rng,
        [(622, 308), (596, 368), (602, 435)],
        base_width=3,
        jitter=3.5,
        sub_steps=7,
    )
    return img.filter(ImageFilter.GaussianBlur(radius=0.35))


def build_alligator_pothole_sample(rng: np.random.Generator) -> Image.Image:
    """Distressed pavement featuring alligator fatigue patch + foreground pothole."""
    img = _make_asphalt_base(rng, base_val=82, contrast=20)
    draw = ImageDraw.Draw(img)

    # Alligator fatigue cracking network in left-center lane
    center_x, center_y = 330, 415
    for ang in np.linspace(0, 2 * np.pi, 9, endpoint=False):
        r_outer = float(rng.uniform(75, 125))
        _draw_jagged_crack(
            draw,
            rng,
            [
                (center_x, center_y),
                (center_x + 0.5 * r_outer * np.cos(ang), center_y + 0.38 * r_outer * np.sin(ang)),
                (center_x + r_outer * np.cos(ang + 0.15), center_y + 0.62 * r_outer * np.sin(ang + 0.15)),
            ],
            base_width=4,
            jitter=4.0,
            sub_steps=6,
        )
    # Cross-connecting rings for classic crocodile pattern
    ring_pts = []
    for ang in np.linspace(0, 2 * np.pi, 12, endpoint=True):
        rx = 66.0 + float(rng.uniform(-10, 12))
        ry = 44.0 + float(rng.uniform(-7, 9))
        ring_pts.append((center_x + rx * np.cos(ang), center_y + ry * np.sin(ang)))
    _draw_jagged_crack(draw, rng, ring_pts, base_width=4, jitter=2.5, sub_steps=3)

    # Foreground right pothole depression
    px, py = 665, 490
    draw.ellipse([px - 88, py - 48, px + 88, py + 48], fill=(112, 108, 102))
    draw.ellipse([px - 78, py - 40, px + 78, py + 40], fill=(34, 34, 38))
    draw.ellipse([px - 62, py - 28, px + 60, py + 31], fill=(22, 22, 26))
    # Aggregate pebbles & rim shadow inside pothole
    for _ in range(90):
        ox = float(rng.uniform(-64, 64))
        oy = float(rng.uniform(-30, 30))
        if (ox / 66.0) ** 2 + (oy / 32.0) ** 2 <= 1.0:
            tone = int(rng.integers(38, 92))
            r = int(rng.integers(2, 5))
            draw.ellipse([px + ox - r, py + oy - r, px + ox + r, py + oy + r], fill=(tone, tone, tone + 2))
    # Radiating edge crack off pothole rim
    _draw_jagged_crack(draw, rng, [(px - 74, py - 8), (px - 132, py - 34), (px - 178, py - 52)], base_width=4)

    return img.filter(ImageFilter.GaussianBlur(radius=0.35))


def build_clean_highway_sample(rng: np.random.Generator) -> Image.Image:
    """Clean freshly paved highway asphalt reference."""
    img = _make_asphalt_base(rng, base_val=92, contrast=13)
    return img.filter(ImageFilter.GaussianBlur(radius=0.3))


def ensure_samples() -> list[Path]:
    """Generate the three synthetic .png road-surface samples if absent."""
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(2026)
    outputs = {
        "sample_longitudinal_crack.png": build_longitudinal_sample(rng),
        "sample_alligator_pothole.png": build_alligator_pothole_sample(rng),
        "sample_clean_highway.png": build_clean_highway_sample(rng),
    }
    paths: list[Path] = []
    for name, img in outputs.items():
        path = SAMPLES_DIR / name
        img.save(path, format="PNG")
        paths.append(path)
    return paths


if __name__ == "__main__":
    created = ensure_samples()
    for p in created:
        print(f"Generated {p} ({p.stat().st_size} bytes)")
