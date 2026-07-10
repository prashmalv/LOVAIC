"""
Generate a bundled demo "street feed" clip so the Remote-stream experience
works with zero setup (no live camera / RTSP needed).

We synthesise smooth camera motion (pan + zoom, "Ken Burns") over real photos
that the detector genuinely recognises (people + a bus), so the canned feed
shows real live detection — not fake overlays.

Run once:  ./venv/bin/python make_sample.py
"""
import os

import cv2
import numpy as np

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "storage", "sample_feed.mp4")


def _assets_dir() -> str:
    """Locate ultralytics' bundled sample images, wherever the package lives."""
    try:
        import ultralytics

        return os.path.join(os.path.dirname(ultralytics.__file__), "assets")
    except Exception:
        return ""


ASSETS = _assets_dir()

W, H = 960, 540
FPS = 20
SEG_FRAMES = 90  # per source image


def ken_burns(img, frames):
    ih, iw = img.shape[:2]
    out = []
    for i in range(frames):
        t = i / max(1, frames - 1)
        # zoom from 1.0 -> 0.82 of the frame, drifting to the right
        scale = 1.0 - 0.18 * t
        cw, ch = int(iw * scale), int(ih * scale)
        max_x = iw - cw
        x0 = int(max_x * (0.15 + 0.7 * t))
        y0 = int((ih - ch) * 0.25)
        crop = img[y0:y0 + ch, x0:x0 + cw]
        out.append(cv2.resize(crop, (W, H)))
    return out


def load(name, fallback_color):
    p = os.path.join(ASSETS, name)
    if os.path.exists(p):
        img = cv2.imread(p)
        if img is not None:
            return img
    return np.full((H, W, 3), fallback_color, dtype="uint8")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    sources = [load("bus.jpg", (60, 60, 60)), load("zidane.jpg", (40, 40, 40))]
    writer = cv2.VideoWriter(OUT, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))
    total = 0
    for img in sources:
        for frame in ken_burns(img, SEG_FRAMES):
            writer.write(frame)
            total += 1
    writer.release()
    print(f"wrote {OUT} ({total} frames, {total / FPS:.1f}s)")
    return OUT


def ensure() -> None:
    """Generate the sample clip if it doesn't exist yet (best-effort)."""
    if os.path.exists(OUT):
        return
    try:
        main()
    except Exception as e:  # never block startup on this
        print(f"[make_sample] could not generate sample feed: {e}")


if __name__ == "__main__":
    main()
