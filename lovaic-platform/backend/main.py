"""
LOVAIC Vision Intelligence Platform — CV backend.

One YOLOv8 engine, many verticals. Real detection on uploaded frames +
Lost & Found visual search + simulated analytics for the dashboards.

Run:  uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import os

import cv2
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app import analytics, lostfound, vision

app = FastAPI(title="LOVAIC Vision Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo: open. Lock down for production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_MODES = {"general", "garbage", "traffic", "queue", "safety", "retail", "ppe"}

# Bundled demo clip so the "remote stream" experience works with zero setup.
SAMPLE_FEED = os.path.join(os.path.dirname(__file__), "storage", "sample_feed.mp4")


@app.on_event("startup")
def _startup():
    # Generate the bundled demo clip on first boot (no-op if it already exists).
    import make_sample

    make_sample.ensure()


@app.get("/health")
def health():
    return {"status": "ok", "engine": "yolov8n", "modes": sorted(VALID_MODES)}


@app.post("/api/detect")
async def detect(
    file: UploadFile = File(...),
    mode: str = Form("general"),
    conf: float = Form(0.35),
    seg: bool = Form(False),
    privacy: bool = Form(False),
):
    """Run real Vision detection and interpret it for the given vertical.

    seg=true → pixel-level instance segmentation; privacy=true → blur people.
    """
    if mode not in VALID_MODES:
        mode = "general"
    raw = await file.read()
    return vision.detect(raw, mode=mode, conf=conf, seg=seg, privacy=privacy)


# --- Live camera / video stream (RTSP · HLS · HTTP-MJPEG · file · webcam) ---

def _error_frame(text: str) -> bytes:
    import numpy as np

    img = (np.ones((360, 640, 3), dtype="uint8") * 18)
    cv2.putText(img, "Stream unavailable", (40, 170), cv2.FONT_HERSHEY_SIMPLEX,
                0.9, (114, 92, 255), 2, cv2.LINE_AA)
    cv2.putText(img, text[:60], (40, 210), cv2.FONT_HERSHEY_SIMPLEX,
                0.5, (200, 200, 200), 1, cv2.LINE_AA)
    ok, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


# Live per-feed stats for the multi-camera wall (fid -> latest snapshot).
STREAM_STATS: dict[str, dict] = {}


def _mjpeg(src: str, mode: str, conf: float, count: bool, line: str,
          fid: str | None, seg: bool, privacy: bool):
    """Generator yielding annotated MJPEG frames from any OpenCV-readable source."""
    boundary = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
    cap = cv2.VideoCapture(int(src) if src.isdigit() else src)
    if not cap.isOpened():
        yield boundary + _error_frame(f"Could not open: {src}") + b"\r\n"
        return
    counter = vision.LineCounter(line) if count else None
    tracker = vision.SimpleTracker() if count else None
    fails = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                # Loop file sources so demo clips replay; give up on dead live feeds.
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ok, frame = cap.read()
                if not ok:
                    fails += 1
                    if fails > 30:
                        break
                    continue
            fails = 0
            if counter is not None and tracker is not None:
                annotated, counts = vision.annotate_tracked(frame, mode, counter, tracker,
                                                             conf=conf, privacy=privacy)
                if fid:
                    STREAM_STATS[fid] = {
                        "mode": mode,
                        "in": counter.in_count,
                        "out": counter.out_count,
                        "net": counter.in_count - counter.out_count,
                        "counts": counts,
                    }
            else:
                annotated = vision.annotate_frame(frame, mode=mode, conf=conf,
                                                  seg=seg, privacy=privacy)
            ok2, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not ok2:
                continue
            yield boundary + buf.tobytes() + b"\r\n"
    finally:
        cap.release()
        if fid:
            STREAM_STATS.pop(fid, None)


@app.get("/api/stream")
def stream(src: str, mode: str = "general", conf: float = 0.35,
           count: bool = False, line: str = "horizontal", fid: str | None = None,
           seg: bool = False, privacy: bool = False):
    """Pull a live stream (or looping video/webcam) and return annotated MJPEG.

    `src` may be an RTSP/HLS/HTTP video URL, a local file path, or a webcam
    index (e.g. "0" = the server's own camera). Runs on CPU — fine for a
    single-stream demo; use a GPU host for many concurrent feeds.

    Set `count=true` for footfall line-crossing counting (IN/OUT/NET) with
    `line` = "horizontal"|"vertical". Pass a `fid` to publish live per-feed
    stats to /api/stream-stats (used by the multi-camera wall).
    """
    if mode not in VALID_MODES:
        mode = "general"
    if src == "sample":
        src = SAMPLE_FEED
    if line not in ("horizontal", "vertical"):
        line = "horizontal"
    return StreamingResponse(
        _mjpeg(src, mode, conf, count, line, fid, seg, privacy),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/api/stream-stats")
def stream_stats(fids: str = ""):
    """Return live per-feed + combined counts for the given comma-separated fids."""
    wanted = [f for f in fids.split(",") if f]
    feeds = {f: STREAM_STATS.get(f) for f in wanted}
    total_in = total_out = 0
    objects: dict[str, int] = {}
    for snap in feeds.values():
        if not snap:
            continue
        total_in += snap.get("in", 0)
        total_out += snap.get("out", 0)
        for k, v in snap.get("counts", {}).items():
            objects[k] = objects.get(k, 0) + v
    return {
        "feeds": feeds,
        "combined": {"in": total_in, "out": total_out,
                     "net": total_in - total_out, "objects": objects},
    }


# --- Lost & Found citizen portal -------------------------------------------

@app.post("/api/lostfound/report")
async def lostfound_report(
    file: UploadFile = File(...),
    kind: str = Form(...),  # "lost" | "found"
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("other"),
    location: str = Form(""),
    contact: str = Form(""),
):
    kind = "found" if kind == "found" else "lost"
    raw = await file.read()
    return lostfound.add_item(kind, raw, title, description, category, location, contact)


@app.get("/api/lostfound/items")
def lostfound_items(kind: str | None = None):
    return {"items": lostfound.list_items(kind)}


@app.post("/api/lostfound/search")
async def lostfound_search(
    file: UploadFile = File(...),
    kind: str | None = Form(None),
):
    raw = await file.read()
    return {"results": lostfound.search_by_photo(raw, kind=kind)}


# --- Analytics / reference data --------------------------------------------

@app.get("/api/analytics/{module}")
def analytics_module(module: str):
    return analytics.module_summary(module)


@app.get("/api/shelf")
def shelf():
    return {"alerts": analytics.shelf_alerts()}


@app.get("/api/dustbins")
def dustbins():
    return analytics.dustbin_network()


@app.get("/api/schemes")
def schemes(state: str = "Madhya Pradesh", category: str = "all"):
    return {"schemes": analytics.schemes(state, category)}
