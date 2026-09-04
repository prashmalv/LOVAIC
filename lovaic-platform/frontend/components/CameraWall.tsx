"use client";
import { useEffect, useRef, useState } from "react";
import { heatmapUrl, resetHeatmaps, streamStats, StreamStats, streamUrl } from "@/lib/api";
import { DetectMode } from "@/lib/config";

interface RecRow {
  t: number;
  feeds: Record<string, { name: string; persons: number; in: number; out: number; net: number; risk: number }>;
}

function downloadBlob(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface Feed {
  fid: string;
  name: string;
  src: string;
  mode: DetectMode;
  count: boolean;
  url: string; // computed once so re-renders never restart the stream
}

const MODES: DetectMode[] = ["traffic", "safety", "queue", "retail", "garbage", "ppe", "general"];

function makeFeed(fid: string, name: string, src: string, mode: DetectMode, count: boolean): Feed {
  return { fid, name, src, mode, count, url: streamUrl(src, mode, { count, fid }) };
}

export default function CameraWall({
  accent = "#6c63ff",
  initial,
}: {
  accent?: string;
  initial: { name: string; mode: DetectMode; count: boolean }[];
}) {
  const seed = useRef(0);
  // Build feeds on the client only — the stream URLs carry a Date.now() cache-
  // buster, so generating them during SSR would mismatch on hydration.
  const [feeds, setFeeds] = useState<Feed[]>([]);
  useEffect(() => {
    setFeeds(initial.map((f, i) => makeFeed(`cam-${i + 1}`, f.name, "sample", f.mode, f.count)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [stats, setStats] = useState<StreamStats | null>(null);

  // add-feed form
  const [name, setName] = useState("");
  const [src, setSrc] = useState("sample");
  const [mode, setMode] = useState<DetectMode>("safety");
  const [count, setCount] = useState(true);

  // recording
  const recRef = useRef<{ on: boolean; startedAt: number; rows: RecRow[] }>({
    on: false,
    startedAt: 0,
    rows: [],
  });
  const [rec, setRec] = useState({ on: false, elapsed: 0, rows: 0 });

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const s = await streamStats(feeds.map((f) => f.fid));
        if (!alive) return;
        setStats(s);
        if (recRef.current.on) {
          const row: RecRow = { t: Date.now(), feeds: {} };
          for (const f of feeds) {
            const snap = s.feeds?.[f.fid];
            row.feeds[f.fid] = {
              name: f.name,
              persons: snap?.persons ?? 0,
              in: snap?.in ?? 0,
              out: snap?.out ?? 0,
              net: snap?.net ?? 0,
              risk: snap?.risk_score ?? 0,
            };
          }
          recRef.current.rows.push(row);
        }
      } catch {
        /* ignore transient */
      }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [feeds]);

  // recording UI timer
  useEffect(() => {
    if (!rec.on) return;
    const id = setInterval(() => {
      setRec((r) => ({
        ...r,
        elapsed: Math.round((Date.now() - recRef.current.startedAt) / 1000),
        rows: recRef.current.rows.length,
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [rec.on]);

  const startRec = () => {
    recRef.current = { on: true, startedAt: Date.now(), rows: [] };
    resetHeatmaps(feeds.map((f) => f.fid));
    setRec({ on: true, elapsed: 0, rows: 0 });
  };

  const stopRec = async () => {
    recRef.current.on = false;
    setRec((r) => ({ ...r, on: false }));
    const rows = recRef.current.rows;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const fs = feeds;

    // time-series CSV
    const head = ["time_iso", "elapsed_s"];
    for (const f of fs) head.push(`${f.name} persons`, `${f.name} in`, `${f.name} out`, `${f.name} net`, `${f.name} risk`);
    const lines = [head.map(csvEscape).join(",")];
    for (const row of rows) {
      const cells: (string | number)[] = [
        new Date(row.t).toISOString(),
        Math.round((row.t - recRef.current.startedAt) / 1000),
      ];
      for (const f of fs) {
        const d = row.feeds[f.fid] ?? { persons: 0, in: 0, out: 0, net: 0, risk: 0 };
        cells.push(d.persons, d.in, d.out, d.net, d.risk);
      }
      lines.push(cells.map(csvEscape).join(","));
    }
    downloadBlob(`lovaic-footfall-${stamp}.csv`, lines.join("\n"), "text/csv");

    // summary CSV
    const sum = ["camera,peak_persons,total_in,total_out,net,max_risk"];
    for (const f of fs) {
      let peak = 0, mIn = 0, mOut = 0, mRisk = 0;
      for (const row of rows) {
        const d = row.feeds[f.fid];
        if (!d) continue;
        peak = Math.max(peak, d.persons);
        mIn = Math.max(mIn, d.in);
        mOut = Math.max(mOut, d.out);
        mRisk = Math.max(mRisk, d.risk);
      }
      sum.push([f.name, peak, mIn, mOut, mIn - mOut, mRisk].map(csvEscape).join(","));
    }
    downloadBlob(`lovaic-summary-${stamp}.csv`, sum.join("\n"), "text/csv");

    // heatmap PNG per feed
    for (const f of fs) {
      try {
        const blob = await (await fetch(heatmapUrl(f.fid))).blob();
        downloadBlob(`lovaic-heatmap-${f.name.replace(/\s+/g, "_")}-${stamp}.png`, blob, "image/png");
      } catch {
        /* skip */
      }
    }
  };

  const addFeed = () => {
    seed.current += 1;
    const fid = `cam-x${seed.current}`;
    setFeeds((f) => [
      ...f,
      makeFeed(fid, name.trim() || `Camera ${f.length + 1}`, src.trim() || "sample", mode, count),
    ]);
    setName("");
  };

  const removeFeed = (fid: string) => setFeeds((f) => f.filter((x) => x.fid !== fid));

  // bulk add: one URL per line
  const [bulk, setBulk] = useState("");
  const addMany = () => {
    const urls = bulk.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setFeeds((prev) => {
      const next = [...prev];
      urls.forEach((u, i) => {
        seed.current += 1;
        next.push(makeFeed(`cam-x${seed.current}`, `Camera ${prev.length + i + 1}`, u, mode, count));
      });
      return next;
    });
    setBulk("");
  };

  const c = stats?.combined;

  return (
    <div className="flex flex-col gap-5">
      {/* combined summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Metric label="Cameras online" value={feeds.length} accent={accent} />
        <Metric label="Live persons" value={c?.persons ?? 0} accent={accent} />
        <Metric label="Total IN" value={c?.in ?? 0} accent="var(--green)" />
        <Metric label="Total OUT" value={c?.out ?? 0} accent="var(--amber)" />
        <Metric label="Net occupancy" value={c?.net ?? 0} accent={accent} />
        <Metric label="Max stampede risk" value={c?.max_risk ?? 0} accent={(c?.max_risk ?? 0) >= 50 ? "var(--red)" : (c?.max_risk ?? 0) >= 25 ? "var(--amber)" : "var(--green)"} />
      </div>

      {/* recording control */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            style={{
              width: 12, height: 12, borderRadius: 99,
              background: rec.on ? "var(--red)" : "var(--text-faint)",
              boxShadow: rec.on ? "0 0 10px var(--red)" : "none",
              animation: rec.on ? "pulse-dot 1.2s infinite" : "none",
            }}
          />
          <div>
            <div className="font-semibold text-sm">
              {rec.on ? "Recording…" : "Record footfall + crowd stats"}
            </div>
            <div className="text-xs" style={{ color: "var(--text-dim)" }}>
              {rec.on
                ? `${String(Math.floor(rec.elapsed / 60)).padStart(2, "0")}:${String(rec.elapsed % 60).padStart(2, "0")} · ${rec.rows} samples`
                : "Captures per-camera IN/OUT, occupancy & stampede risk → CSV + heatmaps"}
            </div>
          </div>
        </div>
        {rec.on ? (
          <button className="btn btn-primary" style={{ background: "linear-gradient(120deg, var(--red), var(--accent))" }} onClick={stopRec}>
            ⏹ Stop &amp; download
          </button>
        ) : (
          <button className="btn btn-primary" style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))` }} onClick={startRec} disabled={feeds.length === 0}>
            ⏺ Start recording
          </button>
        )}
      </div>

      {c && Object.keys(c.objects).length > 0 && (
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>
            Combined detections across all feeds
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(c.objects).map(([k, v]) => (
              <span key={k} className="pill" style={{ borderColor: accent, color: accent, background: `${accent}12` }}>
                {k} × {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* add-feed control */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs" style={{ color: "var(--text-dim)" }}>
          Camera name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Temple Gate"
            className="mt-1 px-3 py-2 rounded-lg outline-none" style={inp} />
        </label>
        <label className="flex flex-col text-xs" style={{ color: "var(--text-dim)" }}>
          Source
          <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="sample · rtsp://… · 0"
            className="mt-1 px-3 py-2 rounded-lg outline-none" style={{ ...inp, minWidth: 200 }} />
        </label>
        <label className="flex flex-col text-xs" style={{ color: "var(--text-dim)" }}>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as DetectMode)}
            className="mt-1 px-3 py-2 rounded-lg outline-none" style={inp}>
            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-dim)" }}>
          <input type="checkbox" checked={count} onChange={(e) => setCount(e.target.checked)} /> count footfall
        </label>
        <button className="btn btn-primary" style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))` }} onClick={addFeed}>
          + Add camera
        </button>
      </div>

      {/* bulk add — paste several stream URLs at once */}
      <div className="card p-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <label className="flex flex-col text-xs flex-1" style={{ color: "var(--text-dim)" }}>
          Add multiple feeds — one URL per line (uses the Mode + footfall setting above)
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={3}
            placeholder={"https://www.youtube.com/watch?v=…\nhttps://www.youtube.com/watch?v=…"}
            className="mt-1 px-3 py-2 rounded-lg outline-none font-mono text-xs"
            style={inp}
          />
        </label>
        <button className="btn btn-ghost" onClick={addMany}>+ Add all</button>
      </div>

      {/* the wall */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {feeds.map((f) => {
          const s = stats?.feeds?.[f.fid];
          return (
            <div key={f.fid} className="card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="live-dot" />
                  <span className="font-semibold text-sm">{f.name}</span>
                  <span className="pill" style={{ color: accent, borderColor: accent, fontSize: 10 }}>{f.mode}</span>
                </div>
                <button onClick={() => removeFeed(f.fid)} className="text-xs" style={{ color: "var(--text-faint)", cursor: "pointer", background: "none", border: "none" }}>
                  ✕
                </button>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: "#000" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.name} style={{ width: "100%", display: "block" }} />
              </div>
              {f.count && (
                <>
                  <div className="flex items-center justify-around mt-2 text-sm">
                    <span style={{ color: "var(--green)" }}>IN <b>{s?.in ?? 0}</b></span>
                    <span style={{ color: "var(--amber)" }}>OUT <b>{s?.out ?? 0}</b></span>
                    <span style={{ color: accent }}>NET <b>{s?.net ?? 0}</b></span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                      👥 {s?.persons ?? 0} in frame
                    </span>
                    <RiskPill score={s?.risk_score ?? 0} level={s?.risk_level} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs" style={{ color: "var(--text-faint)" }}>
        Each tile is a live annotated feed from the vision engine. On CPU, keep it to a few
        feeds for smooth playback; a GPU host scales to a full video wall. All demo tiles use
        the bundled sample clip — point “Source” at real RTSP/HLS URLs for live cameras.
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
};

function RiskPill({ score, level }: { score: number; level?: string }) {
  const c =
    score >= 75 ? "var(--red)" : score >= 50 ? "#ff8a4c" : score >= 25 ? "var(--amber)" : "var(--green)";
  return (
    <span className="pill" style={{ color: c, borderColor: c, background: `${c}18`, fontSize: 10 }}>
      ⚠ risk {score} {level ? `· ${level}` : ""}
    </span>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs" style={{ color: "var(--text-dim)" }}>{label}</div>
      <div className="text-3xl font-extrabold mt-1" style={{ color: accent }}>{value}</div>
    </div>
  );
}
