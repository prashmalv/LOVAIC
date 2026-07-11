"use client";
import { useCallback, useRef, useState } from "react";
import { detect, DetectResult } from "@/lib/api";
import { DetectMode } from "@/lib/config";
import LiveCamera from "./LiveCamera";
import { SeverityPill } from "./ui";

const SOURCES = [
  { id: "cctv", label: "CCTV", icon: "📹" },
  { id: "drone", label: "Drone", icon: "🛸" },
  { id: "satellite", label: "Satellite", icon: "🛰️" },
  { id: "upload", label: "Upload", icon: "📁" },
];

export default function LiveDetect({
  mode,
  accent = "#6c63ff",
  hint,
}: {
  mode: DetectMode;
  accent?: string;
  hint?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("cctv");
  const [view, setView] = useState<"snapshot" | "live">("snapshot");
  const [seg, setSeg] = useState(true);
  const [privacy, setPrivacy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      setPreview(URL.createObjectURL(file));
      setLoading(true);
      try {
        const r = await detect(file, mode, { seg, privacy });
        setResult(r);
      } catch (e) {
        setError(
          "Could not reach the vision engine. Make sure the backend is running on port 8000."
        );
      } finally {
        setLoading(false);
      }
    },
    [mode, seg, privacy]
  );

  const onFile = (f?: File | null) => {
    if (f) run(f);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {([
          { id: "snapshot", label: "🖼️ Snapshot" },
          { id: "live", label: "🔴 Live camera" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className="pill"
            style={{
              cursor: "pointer",
              padding: "0.45rem 1rem",
              color: view === t.id ? "#fff" : "var(--text-dim)",
              background: view === t.id ? accent : "transparent",
              borderColor: view === t.id ? accent : "var(--border)",
            }}
          >
            {t.label}
          </button>
        ))}

        <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 0.25rem" }} />

        <Toggle on={seg} setOn={setSeg} accent={accent} label="◆ Pixel masks" title="Pixel-level instance segmentation — LOVAIC's edge over box-only detectors" />
        <Toggle on={privacy} setOn={setPrivacy} accent="var(--green)" label="🛡 Privacy blur" title="On-frame redaction of people/faces — privacy by design" />
      </div>

      {view === "live" ? (
        <LiveCamera mode={mode} accent={accent} seg={seg} privacy={privacy} />
      ) : (
        SnapshotView()
      )}
    </div>
  );

  function SnapshotView() {
    return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Input side */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className="pill"
              style={{
                cursor: "pointer",
                color: source === s.id ? "#fff" : "var(--text-dim)",
                background: source === s.id ? accent : "transparent",
                borderColor: source === s.id ? accent : "var(--border)",
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div
          className="dropzone flex flex-col items-center justify-center text-center p-8"
          style={{ minHeight: 260 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0]);
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result?.annotated_image || preview}
              alt="frame"
              style={{ maxHeight: 320, borderRadius: 12, maxWidth: "100%" }}
            />
          ) : (
            <>
              <div className="text-5xl mb-3 opacity-60">🎯</div>
              <div className="font-semibold">Drop a frame or click to analyze</div>
              <div className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
                {hint ?? "Upload a still frame captured from any feed."}
              </div>
              <div className="text-xs mt-3" style={{ color: "var(--text-faint)" }}>
                Simulating a <b>{SOURCES.find((s) => s.id === source)?.label}</b> source ·
                even low-resolution frames work
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        {preview && (
          <button
            className="btn btn-ghost w-full mt-3"
            onClick={() => {
              setPreview(null);
              setResult(null);
              setError(null);
            }}
          >
            Clear & analyze another frame
          </button>
        )}
      </div>

      {/* Output side */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-dim)" }}>
            {result?.engine ? result.engine.toUpperCase() : "LOVAIC RLAI ENGINE"}
          </div>
          {loading && <span className="pill" style={{ color: accent }}>Analyzing…</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="pill" style={{ fontSize: 10, color: accent, borderColor: accent }}>◆ {seg ? "Pixel-level" : "Object-level"}</span>
          <span className="pill" style={{ fontSize: 10, color: privacy ? "var(--green)" : "var(--text-faint)", borderColor: privacy ? "var(--green)" : "var(--border)" }}>🛡 {privacy ? "Redacted" : "Privacy-ready"}</span>
          <span className="pill" style={{ fontSize: 10, color: "var(--text-dim)" }}>🇮🇳 Sovereign · on-prem</span>
        </div>

        {error && (
          <div
            className="text-sm p-3 rounded-xl"
            style={{ background: "#ff5c7218", color: "var(--red)" }}
          >
            {error}
          </div>
        )}

        {!result && !loading && !error && (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            Detections, counts and recommended actions will appear here.
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            <div className="skeleton" style={{ height: 28, width: "70%" }} />
            <div className="skeleton" style={{ height: 60 }} />
            <div className="skeleton" style={{ height: 60 }} />
          </div>
        )}

        {result && (
          <div className="fade-up">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold">{result.insight.headline}</div>
              <SeverityPill severity={result.insight.severity} />
            </div>

            {/* metrics */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(result.insight.metrics).map(([k, v]) => (
                <span key={k} className="pill" style={{ color: "var(--text-dim)" }}>
                  {k.replace(/_/g, " ")}: <b style={{ color: "var(--text)" }}>{v}</b>
                </span>
              ))}
            </div>

            {/* detected classes */}
            {Object.keys(result.counts).length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>
                  Detected objects
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.counts).map(([label, n]) => (
                    <span
                      key={label}
                      className="pill"
                      style={{ borderColor: accent, color: accent, background: `${accent}12` }}
                    >
                      {label} × {n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* recommendations */}
            {result.insight.recommendations.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>
                  Recommended actions
                </div>
                <ul className="flex flex-col gap-2">
                  {result.insight.recommendations.map((r, i) => (
                    <li
                      key={i}
                      className="text-sm flex gap-2 p-3 rounded-xl"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <span style={{ color: accent }}>➜</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    );
  }
}

function Toggle({
  on,
  setOn,
  accent,
  label,
  title,
}: {
  on: boolean;
  setOn: (v: boolean) => void;
  accent: string;
  label: string;
  title?: string;
}) {
  return (
    <button
      onClick={() => setOn(!on)}
      title={title}
      className="pill"
      style={{
        cursor: "pointer",
        padding: "0.45rem 0.85rem",
        color: on ? "#fff" : "var(--text-dim)",
        background: on ? accent : "transparent",
        borderColor: on ? accent : "var(--border)",
      }}
    >
      {label}
    </button>
  );
}
