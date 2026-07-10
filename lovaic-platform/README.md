# LOVAIC  Vision Intelligence Platform

> One vision engine, many missions. A demo-ready computer-vision product that turns
> CCTV / drone / satellite frames into real-time decisions — an **AI Intel City**
> for government and a **Vision Suite** for enterprise (Retail · BFSI · Manufacturing).

LOVAIC Like YOLO, a single detection engine powers many tasks. LOVAIC runs **real Vision
detection** on any frame you upload and interprets it per vertical, backed by live
analytics dashboards.

```
lovaic-platform/
├── backend/     FastAPI + YOLOv8 (real detection) + ResNet18 visual search + analytics
└── frontend/    Next.js 16 + Tailwind v4 — landing, two logins, portal dashboards
```

## Capabilities

**Government — AI Intel City**
- ♻️ Garbage & Plastic detection → waste-management actions
- 🚦 AI Traffic control → congestion scoring + signal suggestions
- 🧍 Queue management + appointment booking (recorded in system)
- 🛡️ Safety & Security → crowd density / anomaly alerts
- 🔎 **Lost & Found citizen portal** → post lost/found items, AI photo-search matches & notifies
- 🗑️ Smart dustbins → overflow + placement suggestions
- 📜 Scheme discovery → state + central welfare schemes

**Enterprise — Vision Suite**
- 🛒 Retail intelligence → footfall, dwell, staff attention, shelf stock-out/expiry
- 🏦 BFSI branch monitoring → queue SLA + compliance
- 🏭 Manufacturing safety → zone/PPE monitoring

> "Real detection + simulated analytics": object detection is genuine (YOLOv8 / ResNet18);
> the time-series dashboards use deterministic simulated data so every module looks complete.

---

## Run it

### Option A — Docker (one command, recommended)

```bash
docker compose up --build
```

Open http://localhost:3000 (API on http://localhost:8000). The backend image bundles
OpenCV + ffmpeg; model weights download on first request. For a remote host, bake your
public API URL into the frontend build:

```bash
NEXT_PUBLIC_API_BASE=https://api.example.com docker compose up --build
```

### Option B — local dev

#### 1. Backend (CV engine) — port 8000

```bash
cd backend
python3 -m venv venv            # already created if you ran setup
./venv/bin/pip install -r requirements.txt
./venv/bin/uvicorn main:app --reload --port 8000
```

The first `/api/detect` call downloads `yolov8n.pt` (~6 MB) and ResNet18 weights automatically.

### 2. Frontend — port 3000

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 → **Launch console** → pick **Government** or **Enterprise**.

Point the frontend at a different backend via `frontend/.env.local`:
```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### One-shot

```bash
./run.sh          # starts backend + frontend together
```

### Option C — Azure (public URL, run from anywhere)

```bash
az login
./deploy/azure/deploy-azure.sh     # everything under resource group "rlai-lovaic"
```

Builds both images in the cloud (no local Docker needed) and deploys to Azure Container
Apps. See [deploy/azure/AZURE.md](deploy/azure/AZURE.md) for details & customisation.

---

## Live camera (real-time)

Every live module has a **Snapshot** and a **🔴 Live camera** tab:

- **My camera (webcam):** the browser captures your laptop/USB camera and sends frames
  to the engine a few times per second. Boxes are **interpolated at 60fps** so they glide
  smoothly, while detection is **throttled** (~3/sec) to stay light on the CPU. Runs
  entirely on your machine; just allow the camera permission.
- **Remote stream (RTSP / HLS / URL):** paste a camera feed and the backend pulls it,
  runs detection on every frame, and streams back an annotated view. Accepts:
  - `rtsp://<ip>:554/stream` — a temple / street / CCTV IP camera
  - `https://<host>/live/stream.m3u8` — an HLS feed
  - `http://<host>/video.mjpg` — an MJPEG feed
  - `/path/to/clip.mp4` — a local video file (loops, great for canned demos)
  - `0` — the server machine's own webcam
- **▶ Play sample street feed (no setup):** a bundled 9-second clip with real people + a
  bus, so the remote-stream experience works out-of-the-box with no camera/URL. Regenerate
  it any time with `./venv/bin/python make_sample.py`.
- **Footfall counting (line crossings):** tick "Count footfall" on a stream to enable
  per-feed object tracking + a virtual line — the feed shows a live **IN / OUT / NET**
  tally, e.g. people entering vs leaving a temple, store or gate.
- **Multi-camera wall** (`Camera Wall` in either portal): many live feeds on one screen,
  each analysed for its own mission, with **combined IN / OUT / NET** and total detections
  across every camera. Add feeds on the fly (sample clip, or real RTSP/HLS URLs). Each
  camera tracks independently, so counts never leak between feeds.

### Do I need a big GPU VM?
**No — for a demo a laptop is enough.** Detection runs on CPU at ~5–12 FPS for a single
stream, which looks smooth. You only need a GPU host when you scale to **many concurrent
cameras** or **high-FPS 24×7** production. To go faster later: use a GPU box, run the
heavier `yolov8s/m` weights, or process every Nth frame.

---

## Swappable detection models (plug-in engine)

The engine is model-agnostic — each vertical picks the best backbone, loaded lazily and
cached (`backend/app/vision.py`):

| Family | Default weight | Used by | Recognises |
|--------|----------------|---------|------------|
| `coco` | `yolov8n.pt` | traffic, queue, safety, retail | person, car, bus, truck, bottle… |
| `oiv7` | `yolov8n-oiv7.pt` (Open Images V7) | **garbage/plastic**, **PPE** | Plastic bag, Tin can, Waste container, **Helmet**… |

Counting is **word-boundary matcher-based**, so the same logic works across COCO, Open
Images and any custom vocabulary. Override any weight — or drop in your **own fine-tuned
model** — with env vars (no code change):

```bash
export LOVAIC_MODEL_COCO=yolov8s.pt              # bigger/faster-accuracy COCO
export LOVAIC_MODEL_OIV7=path/to/open-images.pt
export LOVAIC_MODEL_CUSTOM=path/to/plastic-ppe-finetuned.pt   # wins for garbage & PPE modes
```

If a weight can't be downloaded/loaded (offline etc.), the engine **falls back to COCO
nano** automatically, so a demo never hard-fails.

### Train your own model

For production-grade plastic/PPE accuracy, fine-tune on a labelled dataset and plug the
result in — no code change:

```bash
cd backend
# 1. get a YOLO-format dataset (e.g. TACO litter, or a Roboflow PPE/plastic dataset),
#    edit datasets/plastic_ppe.example.yaml to point at it
./venv/bin/python train_custom.py --data datasets/plastic_ppe.example.yaml \
    --base yolov8n.pt --epochs 50 --imgsz 640 --name lovaic-custom
# 2. point the platform at the trained weight and restart the backend
export LOVAIC_MODEL_CUSTOM=runs/detect/lovaic-custom/weights/best.pt
```

Training is compute-heavy — a GPU is strongly recommended. `train_custom.py` lists free,
YOLO-exportable datasets to start from.

---

## Demo tips
- Upload a **street / riverbank** photo in *Waste* (real Open-Images plastic/waste classes).
- Upload a **traffic junction** photo in *Traffic*, a **crowd** photo in *Safety*.
- In *Lost & Found*: post a "found" item photo, then post a similar "lost" photo — watch AI match them.
- In *Manufacturing*: use the **Live camera** on people — it reports **PPE (helmet) compliance %**.
- Fastest way to show live video: *Traffic* → Live camera → **Play sample street feed**.
- Every module shows the annotated frame + counts + recommended actions.

## Notes
- Detection is real; the time-series dashboards are deterministic simulated data (by design).
- Vocabulary depends on the loaded model — see **Swappable detection models** above. For the
  most accurate plastic/PPE, fine-tune a model and set `LOVAIC_MODEL_CUSTOM`.
- Auth is demo-only (portal selection stored client-side). Add real SSO for production.
