"use client";
import { useEffect, useRef, useState } from "react";
import { streamStats, StreamStats, streamUrl } from "@/lib/api";
import { DetectMode } from "@/lib/config";

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
  const [feeds, setFeeds] = useState<Feed[]>(() =>
    initial.map((f, i) => makeFeed(`cam-${i + 1}`, f.name, "sample", f.mode, f.count))
  );
  const [stats, setStats] = useState<StreamStats | null>(null);

  // add-feed form
  const [name, setName] = useState("");
  const [src, setSrc] = useState("sample");
  const [mode, setMode] = useState<DetectMode>("safety");
  const [count, setCount] = useState(true);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const s = await streamStats(feeds.map((f) => f.fid));
        if (alive) setStats(s);
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

  const c = stats?.combined;

  return (
    <div className="flex flex-col gap-5">
      {/* combined summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Cameras online" value={feeds.length} accent={accent} />
        <Metric label="Total IN" value={c?.in ?? 0} accent="var(--green)" />
        <Metric label="Total OUT" value={c?.out ?? 0} accent="var(--amber)" />
        <Metric label="Net occupancy" value={c?.net ?? 0} accent={accent} />
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
                <div className="flex items-center justify-around mt-2 text-sm">
                  <span style={{ color: "var(--green)" }}>IN <b>{s?.in ?? 0}</b></span>
                  <span style={{ color: "var(--amber)" }}>OUT <b>{s?.out ?? 0}</b></span>
                  <span style={{ color: accent }}>NET <b>{s?.net ?? 0}</b></span>
                </div>
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

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs" style={{ color: "var(--text-dim)" }}>{label}</div>
      <div className="text-3xl font-extrabold mt-1" style={{ color: accent }}>{value}</div>
    </div>
  );
}
