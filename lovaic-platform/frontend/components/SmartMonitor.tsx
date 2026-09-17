"use client";
import { useEffect, useRef, useState } from "react";
import { analyzeVLMFrame, FeedStat, streamStats, streamUrl } from "@/lib/api";
import { DetectMode } from "@/lib/config";

// Alert-oriented prompt per vertical — asks the VLM to assess + recommend.
const PROMPTS: Record<string, string> = {
  safety: "You are a safety control-room analyst. Assess crowd density and any stampede / crowd-crush risk in this frame, and recommend one immediate action.",
  queue: "Assess this queue: how long is it, is anyone distressed, and what should staff do?",
  garbage: "Describe the garbage / litter / plastic waste here and recommend a specific municipal action.",
  traffic: "Assess the traffic and congestion; note vehicles, pedestrians, blockages and recommend an action.",
  ppe: "Check PPE compliance: is anyone without a safety helmet or in a restricted zone? Recommend an action.",
  retail: "Note shopper activity, queues at billing and anything staff should act on.",
  general: "Describe what is happening and flag anything that needs attention.",
};

const SAMPLES = [
  { label: "Sample feed", value: "sample" },
  { label: "YouTube live", value: "https://www.youtube.com/watch?v=" },
];

function sumMatch(counts: Record<string, number>, keys: string[]): number {
  let n = 0;
  for (const [k, v] of Object.entries(counts))
    if (keys.some((s) => k.toLowerCase().includes(s))) n += v;
  return n;
}

// Returns a trigger reason when the live stats warrant a VLM look, else null.
function trigger(mode: DetectMode, s: FeedStat): { reason: string; sev: string } | null {
  const counts = s.counts ?? {};
  const risk = s.risk_score ?? 0;
  const persons = s.persons ?? 0;
  if (mode === "safety" || mode === "queue") {
    if (risk >= 50) return { reason: `crowd risk ${risk} (${persons} persons)`, sev: "high" };
  }
  if (mode === "ppe") {
    const helmets = sumMatch(counts, ["helmet", "hardhat", "hard hat"]);
    if (persons > 0 && helmets < persons) return { reason: `${persons - helmets} without helmet`, sev: "high" };
  }
  if (mode === "garbage") {
    const waste = sumMatch(counts, ["plastic", "bottle", "trash", "garbage", "waste", "can", "cup"]);
    if (waste > 0) return { reason: `${waste} waste item(s)`, sev: "moderate" };
  }
  if (mode === "traffic") {
    const veh = sumMatch(counts, ["car", "truck", "bus", "motorcycle", "vehicle", "auto"]);
    if (veh >= 8) return { reason: `${veh} vehicles — congestion`, sev: "moderate" };
  }
  return null;
}

interface Alert {
  t: number;
  text: string;
  reason: string;
  sev: string;
}

const COOLDOWN_MS = 25000; // don't fire the slow VLM more than ~once/25s

export default function SmartMonitor({ mode, accent = "#8b83ff" }: { mode: DetectMode; accent?: string }) {
  const [url, setUrl] = useState("sample");
  const [active, setActive] = useState<string | null>(null);
  const [fid] = useState(() => "sm-" + Math.random().toString(36).slice(2, 8));
  const [stats, setStats] = useState<FeedStat | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auto, setAuto] = useState(true);
  const [tier, setTier] = useState<"lite" | "pro">("lite");
  const [analyzing, setAnalyzing] = useState(false);

  const srcRef = useRef("");
  const lastRef = useRef(0);
  const busyRef = useRef(false);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const tierRef = useRef(tier);
  tierRef.current = tier;

  const runSLM = async (reason: string, sev = "info") => {
    if (busyRef.current || !srcRef.current) return;
    busyRef.current = true;
    lastRef.current = Date.now();
    setAnalyzing(true);
    try {
      const r = await analyzeVLMFrame(srcRef.current, PROMPTS[mode] ?? PROMPTS.general, mode, tierRef.current);
      setAlerts((a) => [{ t: Date.now(), text: r.text, reason, sev }, ...a].slice(0, 30));
    } catch {
      setAlerts((a) => [{ t: Date.now(), text: "LOVAIC SLM unreachable.", reason, sev: "info" }, ...a]);
    } finally {
      busyRef.current = false;
      setAnalyzing(false);
    }
  };

  const connect = (s: string) => {
    srcRef.current = s;
    lastRef.current = 0;
    setAlerts([]);
    setActive(streamUrl(s, mode, { count: true, fid, line: "horizontal" }));
  };

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const poll = async () => {
      try {
        const s = await streamStats([fid]);
        if (!alive) return;
        const snap = s.feeds?.[fid] ?? null;
        setStats(snap);
        if (autoRef.current && snap && !busyRef.current && Date.now() - lastRef.current > COOLDOWN_MS) {
          const t = trigger(mode, snap);
          if (t) runSLM(t.reason, t.sev);
        }
      } catch {
        /* transient */
      }
    };
    poll();
    const id = setInterval(poll, 2500);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, fid, mode]);

  const sevColor = (s: string) =>
    s === "high" || s === "critical" ? "var(--red)" : s === "moderate" ? "var(--amber)" : accent;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* left: live YOLO feed + controls */}
      <div className="flex flex-col gap-4">
        <div className="card p-4">
          <div className="flex gap-2 mb-3 flex-wrap">
            {SAMPLES.map((s) => (
              <button key={s.label} className="pill" style={{ cursor: "pointer", color: "var(--text-dim)" }} onClick={() => setUrl(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="sample · youtube.com/watch?v=… · rtsp://…"
              className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            {active ? (
              <button className="btn btn-ghost" onClick={() => { setActive(null); srcRef.current = ""; }}>Stop</button>
            ) : (
              <button className="btn btn-primary" style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))` }} onClick={() => url.trim() && connect(url.trim())}>
                Start
              </button>
            )}
          </div>
        </div>

        <div className="card p-3">
          <div className="rounded-xl overflow-hidden" style={{ background: "#000", minHeight: 220 }}>
            {active ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active} alt="live" style={{ width: "100%", display: "block" }} />
            ) : (
              <div className="text-center py-12" style={{ color: "var(--text-dim)" }}>
                <div className="text-4xl mb-2">⚡</div>
                <div className="text-sm">Start a feed — YOLO detects, LOVAIC SLM reasons</div>
              </div>
            )}
          </div>
          {stats && (
            <div className="flex items-center justify-around mt-2 text-sm flex-wrap gap-2">
              <span>👥 <b>{stats.persons ?? 0}</b></span>
              <span style={{ color: "var(--green)" }}>IN <b>{stats.in ?? 0}</b></span>
              <span style={{ color: "var(--amber)" }}>OUT <b>{stats.out ?? 0}</b></span>
              <span style={{ color: (stats.risk_score ?? 0) >= 50 ? "var(--red)" : "var(--text-dim)" }}>⚠ risk <b>{stats.risk_score ?? 0}</b></span>
            </div>
          )}
        </div>

        <div className="card p-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-commentary
          </label>
          <div className="flex gap-1">
            {(["lite", "pro"] as const).map((t) => (
              <button key={t} className="pill" style={{ cursor: "pointer", fontSize: 10, color: tier === t ? "#fff" : "var(--text-dim)", background: tier === t ? accent : "transparent", borderColor: tier === t ? accent : "var(--border)" }} onClick={() => setTier(t)}>
                {t === "lite" ? "SLM Lite 500M" : "SLM Pro 2B"}
              </button>
            ))}
          </div>
          <button className="btn btn-primary ml-auto" style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))` }} disabled={!active || analyzing} onClick={() => runSLM("manual", "info")}>
            {analyzing ? "Analyzing…" : "🧠 Analyze now"}
          </button>
        </div>
      </div>

      {/* right: LOVAIC SLM alert log */}
      <div className="card p-5 flex flex-col" style={{ minHeight: 400 }}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-dim)" }}>
            LOVAIC SLM · LIVE COMMENTARY
          </div>
          {analyzing && <span className="pill" style={{ color: accent }}>reasoning…</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {["YOLO detects", "SLM reasons", "🔒 sovereign"].map((t) => (
            <span key={t} className="pill" style={{ fontSize: 10, color: accent, borderColor: accent }}>{t}</span>
          ))}
        </div>

        {alerts.length === 0 && !analyzing && (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            YOLO watches every frame; when it detects a condition (crowd risk, no-helmet, waste…),
            LOVAIC SLM analyzes that frame and posts a natural-language alert here. Or hit
            <b> Analyze now</b> any time.
          </div>
        )}

        <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 520 }}>
          {alerts.map((a, i) => (
            <div key={i} className="p-3 rounded-xl fade-up" style={{ background: "var(--surface-2)", borderLeft: `3px solid ${sevColor(a.sev)}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="pill" style={{ fontSize: 10, color: sevColor(a.sev), borderColor: sevColor(a.sev) }}>
                  {a.reason}
                </span>
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {new Date(a.t).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm" style={{ color: "var(--text)", lineHeight: 1.55 }}>{a.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
