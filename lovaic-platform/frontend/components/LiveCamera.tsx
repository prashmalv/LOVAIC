"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { detect, DetectResult, streamUrl } from "@/lib/api";
import { DetectMode } from "@/lib/config";
import { SeverityPill } from "./ui";

const CW = 640; // capture width sent to the engine

type Sub = "webcam" | "stream";

export default function LiveCamera({
  mode,
  accent = "#6c63ff",
}: {
  mode: DetectMode;
  accent?: string;
}) {
  const [sub, setSub] = useState<Sub>("webcam");
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["webcam", "stream"] as Sub[]).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className="pill"
            style={{
              cursor: "pointer",
              padding: "0.45rem 1rem",
              color: sub === s ? "#fff" : "var(--text-dim)",
              background: sub === s ? accent : "transparent",
              borderColor: sub === s ? accent : "var(--border)",
            }}
          >
            {s === "webcam" ? "📷 My camera (webcam)" : "🌐 Remote stream (RTSP / HLS / URL)"}
          </button>
        ))}
      </div>
      {sub === "webcam" ? <Webcam mode={mode} accent={accent} /> : <RemoteStream mode={mode} accent={accent} />}
    </div>
  );
}

/* ------------------------------ WEBCAM ------------------------------ */
interface Box {
  label: string;
  conf: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const DETECT_INTERVAL = 300; // ms between engine calls (throttle → light on CPU)
const LERP = 0.35; // box glide factor per animation frame

function Webcam({ mode, accent }: { mode: DetectMode; accent: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const busyRef = useRef(false);
  const targetRef = useRef<Box[]>([]); // latest detections
  const displayRef = useRef<Box[]>([]); // smoothed, currently drawn
  const rafRef = useRef<number>(0);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  // Continuous ~60fps render loop: glides boxes toward the latest detections
  // so movement is smooth even though the engine only updates a few times/sec.
  const render = useCallback(() => {
    const c = overlayRef.current;
    const v = videoRef.current;
    if (c && v && v.videoWidth) {
      const ch = Math.round((CW * v.videoHeight) / v.videoWidth);
      if (c.width !== CW) c.width = CW;
      if (c.height !== ch) c.height = ch;
      const ctx = c.getContext("2d");
      if (ctx) {
        const prev = displayRef.current;
        const next: Box[] = targetRef.current.map((t) => {
          const tcx = (t.x1 + t.x2) / 2;
          const tcy = (t.y1 + t.y2) / 2;
          let best: Box | null = null;
          let bd = Infinity;
          for (const p of prev) {
            if (p.label !== t.label) continue;
            const d = Math.hypot((p.x1 + p.x2) / 2 - tcx, (p.y1 + p.y2) / 2 - tcy);
            if (d < bd) {
              bd = d;
              best = p;
            }
          }
          const matched = best && bd < CW * 0.25;
          const s = matched ? (best as Box) : t; // new objects snap in
          const k = matched ? LERP : 1;
          return {
            label: t.label,
            conf: t.conf,
            x1: s.x1 + (t.x1 - s.x1) * k,
            y1: s.y1 + (t.y1 - s.y1) * k,
            x2: s.x2 + (t.x2 - s.x2) * k,
            y2: s.y2 + (t.y2 - s.y2) * k,
          };
        });
        displayRef.current = next;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.lineWidth = 2.5;
        ctx.font = "600 14px Inter, sans-serif";
        for (const d of next) {
          ctx.strokeStyle = accent;
          ctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
          const label = `${d.label} ${Math.round(d.conf * 100)}%`;
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = accent;
          ctx.fillRect(d.x1 - 1, Math.max(0, d.y1 - 19), tw + 10, 19);
          ctx.fillStyle = "#0b0e18";
          ctx.fillText(label, d.x1 + 4, Math.max(13, d.y1 - 5));
        }
      }
    }
    rafRef.current = requestAnimationFrame(render);
  }, [accent]);

  const capture = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.videoWidth === 0) return resolve(null);
      const ch = Math.round((CW * v.videoHeight) / v.videoWidth);
      c.width = CW;
      c.height = ch;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(v, 0, 0, CW, ch);
      c.toBlob(
        (b) => resolve(b ? new File([b], "frame.jpg", { type: "image/jpeg" }) : null),
        "image/jpeg",
        0.7
      );
    });
  }, []);

  const tick = useCallback(async () => {
    if (!runningRef.current) return;
    const t0 = performance.now();
    if (!busyRef.current) {
      busyRef.current = true;
      try {
        const f = await capture();
        if (f) {
          const r = await detect(f, mode);
          setResult(r);
          targetRef.current = r.detections.map((d) => ({
            label: d.label,
            conf: d.confidence,
            x1: d.bbox[0],
            y1: d.bbox[1],
            x2: d.bbox[2],
            y2: d.bbox[3],
          }));
          setFps(Math.round((1000 / Math.max(1, performance.now() - t0)) * 10) / 10);
        }
      } catch {
        setError("Vision engine unreachable — is the backend running on port 8000?");
        runningRef.current = false;
        setRunning(false);
      } finally {
        busyRef.current = false;
      }
    }
    if (runningRef.current) {
      const elapsed = performance.now() - t0;
      setTimeout(tick, Math.max(0, DETECT_INTERVAL - elapsed));
    }
  }, [mode, capture]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      runningRef.current = true;
      setRunning(true);
      tick();
      rafRef.current = requestAnimationFrame(render);
    } catch {
      setError("Camera permission denied, or no camera found. Allow access and retry.");
    }
  }, [tick, render]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
    targetRef.current = [];
    displayRef.current = [];
    const oc = overlayRef.current?.getContext("2d");
    oc?.clearRect(0, 0, overlayRef.current!.width, overlayRef.current!.height);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold" style={{ color: "var(--text-dim)" }}>
            {running ? "● LIVE" : "Camera idle"}
          </div>
          {running && (
            <span className="pill" style={{ color: accent }}>
              ~{fps} fps
            </span>
          )}
        </div>

        <div className="relative rounded-xl overflow-hidden" style={{ background: "#000", minHeight: 240 }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} playsInline muted style={{ width: "100%", display: "block" }} />
          <canvas
            ref={overlayRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ color: "var(--text-dim)" }}>
              <div className="text-4xl mb-2">📷</div>
              <div className="text-sm">Connect your camera to detect live</div>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <button
          className={`btn w-full mt-3 ${running ? "btn-ghost" : "btn-primary"}`}
          style={running ? {} : { background: `linear-gradient(120deg, ${accent}, var(--brand))` }}
          onClick={running ? stop : start}
        >
          {running ? "Stop camera" : "Start live detection"}
        </button>
        {error && (
          <div className="text-sm p-3 rounded-xl mt-3" style={{ background: "#ff5c7218", color: "var(--red)" }}>
            {error}
          </div>
        )}
      </div>

      <LiveInsight result={result} accent={accent} idleText="Point your camera at a scene — detections update a few times per second." />
    </div>
  );
}

/* --------------------------- REMOTE STREAM --------------------------- */
function RemoteStream({ mode, accent }: { mode: DetectMode; accent: string }) {
  const [url, setUrl] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [count, setCount] = useState(false);
  const [line, setLine] = useState<"horizontal" | "vertical">("horizontal");

  const samples = [
    { label: "Server webcam", value: "0" },
    { label: "RTSP example", value: "rtsp://<camera-ip>:554/stream" },
    { label: "HLS example", value: "https://<host>/live/stream.m3u8" },
  ];

  const opts = { count, line };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card p-5">
        <button
          className="btn btn-primary w-full mb-4"
          style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))` }}
          onClick={() => setActive(streamUrl("sample", mode, opts))}
        >
          ▶ Play sample street feed (no setup)
        </button>
        <div className="text-xs mb-4 text-center" style={{ color: "var(--text-faint)" }}>
          — or connect a real camera —
        </div>
        <div className="text-sm font-semibold mb-2" style={{ color: "var(--text-dim)" }}>
          Connect a camera feed
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="rtsp:// · https://….m3u8 · http://….mjpg · /path/video.mp4 · 0"
          className="w-full px-3 py-2.5 rounded-xl outline-none"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {samples.map((s) => (
            <button key={s.label} className="pill" style={{ cursor: "pointer", color: "var(--text-dim)" }} onClick={() => setUrl(s.value)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Footfall line-crossing counter */}
        <div className="flex items-center justify-between mt-4 p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={count} onChange={(e) => setCount(e.target.checked)} />
            Count footfall (line crossings — IN / OUT)
          </label>
          {count && (
            <select
              value={line}
              onChange={(e) => setLine(e.target.value as "horizontal" | "vertical")}
              className="px-2 py-1 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="horizontal">— horizontal line</option>
              <option value="vertical">| vertical line</option>
            </select>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            className="btn btn-primary flex-1"
            style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))` }}
            onClick={() => url.trim() && setActive(streamUrl(url.trim(), mode, opts))}
          >
            Connect & analyze
          </button>
          {active && (
            <button className="btn btn-ghost" onClick={() => setActive(null)}>
              Disconnect
            </button>
          )}
        </div>
        <div className="text-xs mt-3" style={{ color: "var(--text-faint)" }}>
          The backend pulls the feed, runs detection on every frame and streams back an annotated
          view. Use <b>0</b> for the server&apos;s own webcam, a reachable RTSP/HLS URL for a
          temple/street camera, or a local video file path for a canned demo. Footfall counting
          tracks objects across frames and tallies crossings of the drawn line.
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold" style={{ color: "var(--text-dim)" }}>
            {active ? "● LIVE ANNOTATED FEED" : "No feed connected"}
          </div>
        </div>
        <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ background: "#000", minHeight: 260 }}>
          {active ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active} alt="live stream" style={{ width: "100%", display: "block" }} />
          ) : (
            <div className="text-center py-10" style={{ color: "var(--text-dim)" }}>
              <div className="text-4xl mb-2">🌐</div>
              <div className="text-sm">Enter a stream URL and connect</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- shared panel --------------------------- */
function LiveInsight({
  result,
  accent,
  idleText,
}: {
  result: DetectResult | null;
  accent: string;
  idleText: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-sm font-semibold tracking-wide mb-4" style={{ color: "var(--text-dim)" }}>
        LOVAIC VISION ENGINE · RLAI
      </div>
      {!result ? (
        <div className="text-sm" style={{ color: "var(--text-faint)" }}>
          {idleText}
        </div>
      ) : (
        <div className="fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-bold">{result.insight.headline}</div>
            <SeverityPill severity={result.insight.severity} />
          </div>
          {Object.keys(result.counts).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(result.counts).map(([label, n]) => (
                <span key={label} className="pill" style={{ borderColor: accent, color: accent, background: `${accent}12` }}>
                  {label} × {n}
                </span>
              ))}
            </div>
          )}
          {result.insight.recommendations.length > 0 && (
            <ul className="flex flex-col gap-2">
              {result.insight.recommendations.map((r, i) => (
                <li key={i} className="text-sm flex gap-2 p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                  <span style={{ color: accent }}>➜</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
