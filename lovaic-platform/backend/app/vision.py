"""
Core computer-vision engine for the LOVAIC platform.

A single Vision model powers every "real" module. Each vertical is just a
different *interpretation* of the same detections — exactly the way a product
like YOLO exposes one engine behind many tasks.
"""
from __future__ import annotations

import base64
import io
import re
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np
from PIL import Image

# ---------------------------------------------------------------------------
# Model registry (swappable engine)
#
# The platform is model-agnostic: one detection backbone per "task family",
# loaded lazily and cached. This is the plug-in point — drop in a custom
# fine-tuned weight (e.g. a plastic-waste or PPE model) via env var and the
# whole product uses it, no other code change.
#
#   LOVAIC_MODEL_COCO    default "yolov8n.pt"       (person / vehicles / common objects)
#   LOVAIC_MODEL_OIV7    default "yolov8n-oiv7.pt"  (Open Images V7: Plastic bag, Helmet, ...)
#   LOVAIC_MODEL_CUSTOM  optional path to your own fine-tuned .pt (wins for its modes)
# ---------------------------------------------------------------------------
import os

_MODELS: dict[str, Any] = {}

_MODEL_FILES = {
    "coco": os.getenv("LOVAIC_MODEL_COCO", "yolov8n.pt"),
    # Open Images V7 gives real waste/PPE vocabulary (Plastic bag, Tin can, Helmet…)
    "oiv7": os.getenv("LOVAIC_MODEL_OIV7", "yolov8n-oiv7.pt"),
    # Instance segmentation: pixel-level masks (not just boxes) — LOVAIC's edge.
    "seg": os.getenv("LOVAIC_MODEL_SEG", "yolov8n-seg.pt"),
    "custom": os.getenv("LOVAIC_MODEL_CUSTOM", ""),
}

# Which model each detection mode prefers; falls back to COCO if it can't load.
MODE_MODEL = {
    "garbage": "oiv7",   # plastic / litter vocabulary
    "ppe": "oiv7",       # helmet / safety gear vocabulary
    "traffic": "coco",
    "queue": "coco",
    "safety": "coco",
    "retail": "coco",
    "general": "coco",
}


def _load(model_key: str):
    from ultralytics import YOLO

    name = _MODEL_FILES.get(model_key) or ""
    if not name:
        raise ValueError(f"no weight configured for '{model_key}'")
    return YOLO(name)


def get_model(model_key: str = "coco"):
    """Lazy-load + cache a model by key, gracefully falling back to COCO."""
    # A configured custom weight overrides the requested family (single custom demo).
    if model_key in ("oiv7", "coco") and _MODEL_FILES.get("custom"):
        model_key_eff = "custom"
    else:
        model_key_eff = model_key
    if model_key_eff not in _MODELS:
        try:
            _MODELS[model_key_eff] = _load(model_key_eff)
        except Exception:
            # download failed / offline / bad path → fall back to COCO nano
            if "coco" not in _MODELS:
                _MODELS["coco"] = _load("coco")
            _MODELS[model_key_eff] = _MODELS["coco"]
    return _MODELS[model_key_eff]


# ---------------------------------------------------------------------------
# Vertical configuration
#
# Counting is matcher-based (case-insensitive substring), so the SAME logic
# works whether the label comes from COCO ("bottle") or Open Images
# ("Plastic bag", "Tin can") or your custom model ("plastic_waste").
# ---------------------------------------------------------------------------

VEHICLE_MATCH = ["car", "truck", "bus", "motorcycle", "bicycle", "van",
                 "vehicle", "train", "auto", "rickshaw"]
PLASTIC_MATCH = ["bottle", "cup", "wine glass", "plastic", "tin can", "can",
                 "waste", "garbage", "trash", "packaging", "wrapper", "container", "litter"]
PERSON_MATCH = ["person", "man", "woman", "boy", "girl", "pedestrian"]
HELMET_MATCH = ["helmet", "hard hat", "hardhat"]


def _match_count(counts: dict[str, int], needles: list[str]) -> int:
    """Word-boundary matcher — 'man' matches label 'Man' but NOT 'Human face'.

    Single-word needles match whole tokens; multi-word needles ('tin can')
    match as a substring. Keeps counting robust across COCO / OIV7 / custom
    label vocabularies.
    """
    total = 0
    for label, n in counts.items():
        low = label.lower()
        tokens = set(re.findall(r"[a-z]+", low))
        for k in needles:
            if (" " in k and k in low) or (" " not in k and k in tokens):
                total += n
                break
    return total


@dataclass
class Insight:
    headline: str
    severity: str  # "low" | "moderate" | "high" | "critical" | "info"
    metrics: dict[str, Any] = field(default_factory=dict)
    recommendations: list[str] = field(default_factory=list)


def _severity_from_count(count: int, thresholds: tuple[int, int, int]) -> str:
    low, mod, high = thresholds
    if count >= high:
        return "critical"
    if count >= mod:
        return "high"
    if count >= low:
        return "moderate"
    return "low"


def interpret(mode: str, counts: dict[str, int]) -> Insight:
    """Turn raw class counts into a vertical-specific insight + action list."""
    total = sum(counts.values())

    if mode == "garbage":
        plastic = _match_count(counts, PLASTIC_MATCH)
        sev = _severity_from_count(plastic, (1, 4, 8))
        recs = [
            "Log geo-tagged litter incident to the Municipal Waste dashboard.",
            "Dispatch nearest sanitation crew for spot collection.",
        ]
        if plastic >= 4:
            recs.append("Flag location as a recurring hotspot — schedule a fixed pickup route.")
        if plastic >= 8:
            recs.append("Recommend an additional segregated dustbin within 50m radius.")
        return Insight(
            headline=f"{plastic} plastic-waste item(s) detected",
            severity="info" if plastic == 0 else sev,
            metrics={"plastic_items": plastic, "total_objects": total},
            recommendations=recs if plastic else ["Zone is clean — no action required."],
        )

    if mode == "traffic":
        vehicles = _match_count(counts, VEHICLE_MATCH)
        people = _match_count(counts, PERSON_MATCH)
        sev = _severity_from_count(vehicles, (5, 12, 20))
        congestion = {"low": "Free-flowing", "moderate": "Building up",
                      "high": "Congested", "critical": "Gridlock"}[sev]
        recs = [
            f"Signal timing suggestion: extend green phase for the busy approach.",
        ]
        if sev in ("high", "critical"):
            recs += [
                "Alert traffic control room — deploy officer at junction.",
                "Trigger dynamic re-routing on connected message boards.",
            ]
        return Insight(
            headline=f"{vehicles} vehicles · flow: {congestion}",
            severity=sev,
            metrics={"vehicles": vehicles, "pedestrians": people, "flow": congestion},
            recommendations=recs,
        )

    if mode == "queue":
        people = _match_count(counts, PERSON_MATCH)
        sev = _severity_from_count(people, (4, 8, 15))
        wait = people * 2  # ~2 min/person heuristic
        recs = []
        if sev in ("high", "critical"):
            recs += [
                "Open an additional service counter.",
                "Push token-based appointment slots to the citizen app.",
            ]
        else:
            recs.append("Staffing adequate for current footfall.")
        return Insight(
            headline=f"{people} people in queue · ~{wait} min wait",
            severity=sev,
            metrics={"queue_length": people, "est_wait_min": wait},
            recommendations=recs,
        )

    if mode == "safety":
        people = _match_count(counts, PERSON_MATCH)
        sev = _severity_from_count(people, (10, 25, 50))
        density = {"low": "Sparse", "moderate": "Normal",
                   "high": "Crowded", "critical": "Overcrowded — stampede risk"}[sev]
        recs = ["Continuous monitoring active."]
        if sev in ("high", "critical"):
            recs = [
                "Raise crowd-density alert to the control room.",
                "Restrict further entry / open alternate exits.",
                "Position response team at the high-density zone.",
            ]
        return Insight(
            headline=f"{people} persons · crowd: {density}",
            severity=sev,
            metrics={"person_count": people, "crowd_level": density},
            recommendations=recs,
        )

    if mode == "retail":
        people = _match_count(counts, PERSON_MATCH)
        sev = _severity_from_count(people, (3, 8, 15))
        recs = ["Footfall within normal range."]
        if sev in ("high", "critical"):
            recs = [
                "Peak footfall — deploy floor staff to reduce checkout wait.",
                "Promote fast-moving combos near the entrance.",
            ]
        return Insight(
            headline=f"{people} shoppers in frame",
            severity="info" if people == 0 else sev,
            metrics={"shoppers": people, "objects_on_shelf": total - people},
            recommendations=recs,
        )

    if mode == "ppe":
        people = _match_count(counts, PERSON_MATCH)
        helmets = _match_count(counts, HELMET_MATCH)
        missing = max(people - helmets, 0)
        compliance = 100 if people == 0 else round(min(helmets, people) / people * 100)
        sev = "low" if missing == 0 else "high" if missing >= 3 else "moderate"
        recs = ["PPE compliance within policy."]
        if missing > 0:
            recs = [
                f"{missing} worker(s) without detected head protection — flag to floor supervisor.",
                "Trigger PPE non-compliance alert on the shop-floor dashboard.",
                "Log incident for the EHS audit trail.",
            ]
        return Insight(
            headline=f"PPE compliance {compliance}% · {people} workers, {helmets} helmets",
            severity="info" if people == 0 else sev,
            metrics={"workers": people, "helmets": helmets, "missing_ppe": missing,
                     "compliance_pct": compliance},
            recommendations=recs,
        )

    # general / fallback
    return Insight(
        headline=f"{total} objects detected across {len(counts)} classes",
        severity="info",
        metrics={"total_objects": total, "classes": len(counts)},
        recommendations=[],
    )


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

def _read_image(raw: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return np.array(img)  # RGB


def _encode_jpeg(bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        return ""
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode("ascii")


# Per-mode class whitelist (substring match on model class names). Keeps the
# engine from counting irrelevant objects — e.g. YOLO mislabelling a dense crowd
# as "teddy bear". `None` = no filter. A request can override with its own list.
MODE_CLASSES: dict[str, list[str] | None] = {
    "safety": PERSON_MATCH,
    "queue": PERSON_MATCH,
    "retail": PERSON_MATCH,
    "traffic": VEHICLE_MATCH + PERSON_MATCH,
    "garbage": PLASTIC_MATCH,
    "ppe": PERSON_MATCH + HELMET_MATCH,
    "general": None,
}


def _run(rgb: np.ndarray, mode: str, conf: float, model_key: str | None = None,
         classes: list[str] | None = None):
    """Core inference shared by snapshot detection and live streaming.

    `model_key` overrides the per-mode model (e.g. "seg"). `classes` (a list of
    class-name substrings) restricts what the engine detects; when omitted the
    per-mode whitelist applies, so each vertical only sees relevant objects.
    """
    model = get_model(model_key or MODE_MODEL.get(mode, "coco"))
    keep = classes if classes else MODE_CLASSES.get(mode)
    predict_kw: dict[str, Any] = {}
    if keep:
        ids = [i for i, n in model.names.items() if any(k in n.lower() for k in keep)]
        if ids:
            predict_kw["classes"] = ids
    results = model.predict(rgb, conf=conf, verbose=False, **predict_kw)
    r = results[0]
    names = r.names

    detections: list[dict[str, Any]] = []
    counts: dict[str, int] = {}
    if r.boxes is not None:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            label = names[cls_id]
            confidence = float(box.conf[0])
            xyxy = [float(x) for x in box.xyxy[0].tolist()]
            detections.append({"label": label, "confidence": round(confidence, 3), "bbox": xyxy})
            counts[label] = counts.get(label, 0) + 1

    return r, detections, counts, interpret(mode, counts)


_PRIVACY_MATCH = ("person", "man", "woman", "boy", "girl", "face", "head", "people")


def _apply_privacy(bgr: np.ndarray, r) -> np.ndarray:
    """Privacy-by-design: blur every detected person/face region in-frame.

    Uses pixel masks when the segmentation engine is active (precise redaction),
    otherwise the detection box. Raw identities never leave the frame.
    """
    if r.boxes is None:
        return bgr
    names = r.names
    masks = getattr(r, "masks", None)
    mask_data = masks.data.cpu().numpy() if masks is not None else None
    h, w = bgr.shape[:2]
    for i, box in enumerate(r.boxes):
        label = names[int(box.cls[0])].lower()
        if not any(k in label for k in _PRIVACY_MATCH):
            continue
        if mask_data is not None and i < len(mask_data):
            m = cv2.resize(mask_data[i], (w, h)) > 0.5
            blurred = cv2.GaussianBlur(bgr, (0, 0), 14)
            bgr[m] = blurred[m]
        else:
            x1, y1, x2, y2 = (max(0, int(v)) for v in box.xyxy[0].tolist())
            roi = bgr[y1:y2, x1:x2]
            if roi.size:
                bgr[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (0, 0), 14)
    return bgr


def detect(raw: bytes, mode: str = "general", conf: float = 0.35,
           seg: bool = False, privacy: bool = False,
           classes: list[str] | None = None) -> dict[str, Any]:
    """Run detection and return annotated image + structured detections + insight.

    seg     → pixel-level instance segmentation (masks, not just boxes)
    privacy → blur detected people/faces in the returned frame
    classes → restrict detection to these class-name substrings
    """
    rgb = _read_image(raw)
    r, detections, counts, insight = _run(rgb, mode, conf,
                                          model_key="seg" if seg else None, classes=classes)
    annotated = r.plot(boxes=not privacy)  # ultralytics returns BGR
    if privacy:
        annotated = _apply_privacy(annotated, r)
    return {
        "mode": mode,
        "engine": "LOVAIC RLAI · pixel-segmentation" if seg else "LOVAIC RLAI",
        "annotated_image": _encode_jpeg(annotated),
        "detections": detections,
        "counts": counts,
        "insight": {
            "headline": insight.headline,
            "severity": insight.severity,
            "metrics": insight.metrics,
            "recommendations": insight.recommendations,
        },
    }


_SEV_BGR = {
    "info": (255, 157, 77),
    "low": (161, 224, 34),
    "moderate": (71, 179, 255),
    "high": (76, 138, 255),
    "critical": (114, 92, 255),
}


def _overlay_banner(bgr: np.ndarray, insight: Insight, mode: str) -> None:
    """Draw a translucent status banner (headline + severity) on a live frame."""
    h, w = bgr.shape[:2]
    color = _SEV_BGR.get(insight.severity, (200, 200, 200))
    bar_h = max(34, int(h * 0.09))
    overlay = bgr.copy()
    cv2.rectangle(overlay, (0, 0), (w, bar_h), (18, 12, 12), -1)
    cv2.addWeighted(overlay, 0.55, bgr, 0.45, 0, bgr)
    cv2.rectangle(bgr, (0, 0), (8, bar_h), color, -1)
    scale = max(0.5, bar_h / 60)
    cv2.putText(bgr, f"{mode.upper()} | {insight.headline}", (16, int(bar_h * 0.62)),
                cv2.FONT_HERSHEY_SIMPLEX, scale, (245, 245, 245), 1, cv2.LINE_AA)
    tag = f"LOVAIC RLAI - {insight.severity.upper()}"
    (tw, _), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, scale * 0.7, 1)
    cv2.putText(bgr, tag, (w - tw - 14, int(bar_h * 0.62)),
                cv2.FONT_HERSHEY_SIMPLEX, scale * 0.7, color, 1, cv2.LINE_AA)


def annotate_frame(frame_bgr: np.ndarray, mode: str = "general", conf: float = 0.35,
                   max_w: int = 640, seg: bool = False, privacy: bool = False,
                   classes: list[str] | None = None) -> np.ndarray:
    """Annotate a single BGR video frame (boxes/masks + status banner) for streaming."""
    h, w = frame_bgr.shape[:2]
    if w > max_w:
        scale = max_w / w
        frame_bgr = cv2.resize(frame_bgr, (max_w, int(h * scale)))
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    r, _, _, insight = _run(rgb, mode, conf, model_key="seg" if seg else None, classes=classes)
    annotated = r.plot(boxes=not privacy)  # BGR
    if privacy:
        annotated = _apply_privacy(annotated, r)
    _overlay_banner(annotated, insight, mode)
    return annotated


# ---------------------------------------------------------------------------
# Footfall: per-feed centroid tracker + line-crossing counter
#
# Each stream owns its OWN tracker + counter instances, so counts never leak
# between cameras on a multi-camera wall (the earlier shared-ByteTrack state
# would have mixed IDs across feeds).
# ---------------------------------------------------------------------------

class SimpleTracker:
    """Tiny greedy centroid tracker — assigns stable IDs frame-to-frame."""

    def __init__(self, dist_frac: float = 0.08, ttl: int = 25):
        self.next_id = 1
        self.objs: dict[int, tuple[float, float, int]] = {}  # id -> (cx, cy, age)
        self.dist_frac = dist_frac
        self.ttl = ttl

    def assign(self, centroids: list[tuple[float, float]], w: int, h: int) -> list[int]:
        max_d = (w + h) / 2 * self.dist_frac
        for oid in list(self.objs):  # age everything
            cx, cy, age = self.objs[oid]
            self.objs[oid] = (cx, cy, age + 1)
        used: set[int] = set()
        ids: list[int] = []
        for cx, cy in centroids:
            best, bd = None, max_d
            for oid, (ox, oy, _) in self.objs.items():
                if oid in used:
                    continue
                d = ((cx - ox) ** 2 + (cy - oy) ** 2) ** 0.5
                if d < bd:
                    bd, best = d, oid
            if best is None:
                best = self.next_id
                self.next_id += 1
            used.add(best)
            self.objs[best] = (cx, cy, 0)
            ids.append(best)
        for oid in list(self.objs):  # prune stale
            if self.objs[oid][2] > self.ttl and oid not in used:
                del self.objs[oid]
        return ids


class LineCounter:
    """Counts tracked objects crossing a virtual mid-line, split IN vs OUT."""

    def __init__(self, orientation: str = "horizontal"):
        self.orientation = orientation  # "horizontal" | "vertical"
        self.in_count = 0
        self.out_count = 0
        self._side: dict[int, int] = {}

    def update(self, tracks: list[tuple[int, float, float]], w: int, h: int) -> None:
        line = h / 2 if self.orientation == "horizontal" else w / 2
        for tid, cx, cy in tracks:
            pos = cy if self.orientation == "horizontal" else cx
            side = 1 if pos >= line else -1
            prev = self._side.get(tid)
            if prev is not None and prev != side:
                if side == 1:
                    self.in_count += 1
                else:
                    self.out_count += 1
            self._side[tid] = side


def person_count(counts: dict[str, int]) -> int:
    return _match_count(counts, PERSON_MATCH)


def stampede_metrics(persons: int) -> dict[str, Any]:
    """Crowd-density → stampede-risk proxy (0-100). Honest heuristic on person
    count in the frame; not a validated predictor, but a useful density signal."""
    score = min(100, round(persons / 40 * 100))
    level = ("critical" if score >= 75 else "high" if score >= 50
             else "moderate" if score >= 25 else "low")
    return {"persons": persons, "risk_score": score, "risk_level": level}


def annotate_tracked(frame_bgr: np.ndarray, mode: str, counter: LineCounter,
                     tracker: SimpleTracker, conf: float = 0.35,
                     max_w: int = 640, privacy: bool = False,
                     classes: list[str] | None = None
                     ) -> tuple[np.ndarray, dict[str, int], list[tuple[float, float]]]:
    """Annotate a frame with boxes + crossing line + IN/OUT tally.

    Returns (annotated_bgr, class_counts, normalized_centroids). Uses the feed's
    own tracker so counting is isolated per camera. `privacy` blurs people.
    `classes` restricts detection to given class-name substrings.
    """
    h0, w0 = frame_bgr.shape[:2]
    if w0 > max_w:
        s = max_w / w0
        frame_bgr = cv2.resize(frame_bgr, (max_w, int(h0 * s)))
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    r, _, counts, insight = _run(rgb, mode, conf, classes=classes)

    centroids: list[tuple[float, float]] = []
    if r.boxes is not None:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            centroids.append(((x1 + x2) / 2, (y1 + y2) / 2))

    annotated = r.plot(boxes=not privacy)
    if privacy:
        annotated = _apply_privacy(annotated, r)
    h, w = annotated.shape[:2]
    ids = tracker.assign(centroids, w, h)
    counter.update([(i, cx, cy) for i, (cx, cy) in zip(ids, centroids)], w, h)

    if counter.orientation == "horizontal":
        cv2.line(annotated, (0, h // 2), (w, h // 2), (108, 99, 255), 2)
    else:
        cv2.line(annotated, (w // 2, 0), (w // 2, h), (108, 99, 255), 2)

    _overlay_banner(annotated, insight, mode)

    label = f"IN {counter.in_count}   OUT {counter.out_count}   NET {counter.in_count - counter.out_count}"
    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
    cv2.rectangle(annotated, (8, h - th - 18), (8 + tw + 16, h - 6), (18, 12, 12), -1)
    cv2.putText(annotated, label, (16, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                (34, 224, 161), 2, cv2.LINE_AA)

    # stampede-risk chip (bottom-right)
    sm = stampede_metrics(person_count(counts))
    rc = {"low": (161, 224, 34), "moderate": (71, 179, 255),
          "high": (76, 138, 255), "critical": (114, 92, 255)}[sm["risk_level"]]
    rlabel = f"CROWD {sm['persons']} - RISK {sm['risk_score']}"
    (rw, rh), _ = cv2.getTextSize(rlabel, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
    cv2.rectangle(annotated, (w - rw - 18, h - rh - 18), (w - 4, h - 6), (18, 12, 12), -1)
    cv2.putText(annotated, rlabel, (w - rw - 12, h - 14), cv2.FONT_HERSHEY_SIMPLEX,
                0.55, rc, 2, cv2.LINE_AA)

    # normalized centroids for the heatmap accumulator
    cents = [(cx / w, cy / h) for cx, cy in centroids]
    return annotated, counts, cents
