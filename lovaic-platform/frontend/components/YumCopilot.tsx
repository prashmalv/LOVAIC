"use client";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { YumCopilotAnswer, YumInsights, yumCopilot, yumInsights } from "@/lib/api";

const ACCENT = "#e4002b"; // KFC/Yum red
const PALETTE = ["#e4002b", "#ff8a4c", "#ffb347", "#8b83ff", "#23d0c5", "#4d9dff", "#22e0a1", "#ff6584"];

const tooltipStyle = {
  background: "#12162a",
  border: "1px solid #262c4a",
  borderRadius: 12,
  color: "#f2f4fb",
  fontSize: 12,
};

interface Msg {
  q: string;
  a: YumCopilotAnswer | null;
}

export default function YumCopilot() {
  const [data, setData] = useState<YumInsights | null>(null);
  const [err, setErr] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    yumInsights().then(setData).catch(() => setErr(true));
    yumCopilot("").then((r) => setSuggested(r.suggested)).catch(() => {});
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [msgs]);

  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setInput("");
    setMsgs((m) => [{ q, a: null }, ...m]);
    try {
      const a = await yumCopilot(q);
      setMsgs((m) => m.map((x, i) => (i === 0 ? { ...x, a } : x)));
    } catch {
      setMsgs((m) =>
        m.map((x, i) =>
          i === 0 ? { ...x, a: { ...EMPTY, question: q, answer: "LOVAIC Assistance unreachable — start the backend on port 8000." } } : x
        )
      );
    } finally {
      setBusy(false);
    }
  };

  if (err)
    return (
      <div className="text-sm p-4 rounded-xl" style={{ background: "#ff5c7218", color: "var(--red)" }}>
        POS intelligence service unavailable — start the backend on port 8000.
      </div>
    );

  if (!data)
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 96 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );

  const sr = data.store_raw;
  const k = sr.kpis;

  return (
    <div className="flex flex-col gap-6">
      {/* provenance banner */}
      <div
        className="rounded-xl p-3 text-xs flex flex-wrap items-center gap-x-3 gap-y-1"
        style={{ background: "var(--surface-2)", color: "var(--text-dim)" }}
      >
        <span className="pill" style={{ color: ACCENT, borderColor: ACCENT, fontSize: 10 }}>
          ● LIVE ON REAL POS DATA
        </span>
        <span>
          Computed from <b style={{ color: "var(--text)" }}>{data.source_files.join(" + ")}</b>
        </span>
        <span>·</span>
        <span>
          Store <b style={{ color: "var(--text)" }}>{sr.store.id}</b> · {sr.store.city} · Class {sr.store.class} · {sr.store.date_from}–{sr.store.date_to}
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Kpi label="Total sales" value={k.total_sales_fmt} />
        <Kpi label="Transactions" value={k.transactions.toLocaleString()} />
        <Kpi label="Avg order value" value={k.aov_fmt} />
        <Kpi label="Basket size" value={`${k.basket_size} u`} />
        <Kpi label="Unique SKUs" value={k.unique_skus.toLocaleString()} />
        <Kpi label="Peak hour" value={`${sr.peak_hour % 12 || 12}${sr.peak_hour < 12 ? "am" : "pm"}`} />
      </div>

      {/* charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="font-semibold mb-1">Day-part demand curve</div>
          <div className="text-xs mb-3" style={{ color: "var(--text-dim)" }}>
            Hourly sales — the signal that drives kitchen prep &amp; staffing forecasts
          </div>
          <HoursChart hours={sr.hours} />
        </div>
        <div className="card p-5">
          <div className="font-semibold mb-1">Revenue by category</div>
          <div className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>
            Where the money comes from
          </div>
          <CategoryDonut cats={sr.categories} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="font-semibold mb-3">Top items by revenue</div>
          <div className="flex flex-col gap-2">
            {sr.top_items.slice(0, 7).map((it, i) => (
              <div key={it.name} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                <span className="text-sm flex items-center gap-2 truncate">
                  <span style={{ color: PALETTE[i % PALETTE.length], fontWeight: 700 }}>{i + 1}</span>
                  <span className="truncate">{it.name}</span>
                </span>
                <span className="text-sm font-semibold whitespace-nowrap ml-2">₹{it.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="font-semibold mb-3">Procurement &amp; margin (inward data)</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Mini label="Inward value" value={data.inward.total_inward_fmt} />
            <Mini label="Orders" value={String(data.inward.orders)} />
            <Mini label="Avg margin" value={`${data.inward.avg_margin_pct}%`} />
          </div>
          <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Thinnest-margin buys — renegotiation targets</div>
          <div className="flex flex-col gap-1.5">
            {data.inward.worst_margin.slice(0, 4).map((m) => (
              <div key={m.name} className="flex items-center justify-between text-sm">
                <span className="truncate">{m.name}</span>
                <span className="font-semibold whitespace-nowrap ml-2" style={{ color: m.margin_pct < 8 ? "var(--red)" : "var(--amber)" }}>
                  {m.margin_pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copilot */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">✨</span>
          <div className="font-bold text-lg">LOVAIC Assistance</div>
          <span className="pill" style={{ fontSize: 10, color: ACCENT, borderColor: ACCENT }}>AI on POS</span>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
          Ask in plain language — LOVAIC Assistance answers from this store&apos;s real POS &amp; inward data with numbers and recommended actions. Every figure traces to the source files.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {suggested.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={busy}
              className="pill"
              style={{ cursor: "pointer", fontSize: 11, color: "var(--text-dim)", borderColor: "var(--border)" }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            placeholder="e.g. When are my peak hours? Where am I leaking margin?"
            className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button
            className="btn btn-primary"
            style={{ background: `linear-gradient(120deg, ${ACCENT}, #ff6584)` }}
            onClick={() => ask(input)}
            disabled={busy}
          >
            {busy ? "Thinking…" : "Ask"}
          </button>
        </div>

        <div ref={logRef} className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 620 }}>
          {msgs.length === 0 && (
            <div className="text-sm p-4 rounded-xl" style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}>
              Pick a question above, or type your own. Try &quot;how should I plan staffing?&quot; or &quot;what stock is at waste risk?&quot;
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className="fade-up">
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span style={{ color: ACCENT }}>❯</span> {m.q}
              </div>
              {m.a ? <AnswerCard a={m.a} insights={data} /> : (
                <div className="flex gap-2 items-center text-sm p-3" style={{ color: "var(--text-dim)" }}>
                  <span className="live-dot" /> reading POS data…
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const EMPTY: YumCopilotAnswer = {
  question: "", answer: "", recommendations: [], metrics: [], chart: "", source: "", suggested: [],
};

function AnswerCard({ a, insights }: { a: YumCopilotAnswer; insights: YumInsights }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", borderLeft: `3px solid ${ACCENT}` }}>
      <p className="text-sm" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: mdBold(a.answer) }} />

      {a.metrics.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {a.metrics.map((m) => (
            <span key={m.label} className="pill" style={{ color: "var(--text-dim)", fontSize: 11 }}>
              {m.label}: <b style={{ color: "var(--text)" }}>{m.value}</b>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3">
        <MiniChart chart={a.chart} insights={insights} />
      </div>

      {a.recommendations.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>
            Recommended actions
          </div>
          <ul className="flex flex-col gap-1.5">
            {a.recommendations.map((r, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span style={{ color: ACCENT }}>➜</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {a.source && (
        <div className="text-xs mt-3" style={{ color: "var(--text-faint)" }}>
          Source: {a.source}
        </div>
      )}
    </div>
  );
}

// Renders the small chart the copilot references, from the already-loaded insights.
function MiniChart({ chart, insights }: { chart: string; insights: YumInsights }) {
  const sr = insights.store_raw;
  if (chart === "hours") return <HoursChart hours={sr.hours} height={150} />;
  if (chart === "categories") return <CategoryDonut cats={sr.categories} height={160} />;
  if (chart === "slow")
    return <SimpleBars data={sr.slow_movers.slice(0, 6).map((s) => ({ name: s.name, value: s.qty }))} label="units sold" />;
  if (chart === "margin")
    return <SimpleBars data={insights.inward.worst_margin.slice(0, 6).map((m) => ({ name: m.name, value: m.margin_pct }))} label="% margin" />;
  if (chart === "classification")
    return (
      <SimpleBars
        data={insights.classification.filter((c) => c.city.toLowerCase() !== "grand total").slice(0, 6).map((c) => ({ name: c.city, value: c.billed_stores }))}
        label="billed stores"
      />
    );
  return null;
}

function HoursChart({ hours, height = 220 }: { hours: { hour: number; sales: number; txns: number }[]; height?: number }) {
  const data = hours.map((h) => ({
    hour: `${h.hour % 12 || 12}${h.hour < 12 ? "a" : "p"}`,
    sales: h.sales,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="yum-hr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.55} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="hour" tick={{ fill: "#5f6690", fontSize: 10 }} interval={1} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#5f6690", fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${Number(v).toLocaleString()}`, "sales"]} cursor={{ stroke: ACCENT, strokeOpacity: 0.2 }} />
        <Area type="monotone" dataKey="sales" stroke={ACCENT} strokeWidth={2} fill="url(#yum-hr)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CategoryDonut({ cats, height = 220 }: { cats: { name: string; share: number }[]; height?: number }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={cats} dataKey="share" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
            {cats.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v}%`, n as string]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1 mt-1">
        {cats.slice(0, 5).map((c, i) => (
          <div key={c.name} className="flex items-center justify-between text-xs" style={{ color: "var(--text-dim)" }}>
            <span className="flex items-center gap-2">
              <span style={{ width: 9, height: 9, borderRadius: 3, background: PALETTE[i % PALETTE.length], display: "inline-block" }} />
              {c.name}
            </span>
            <span className="font-semibold">{c.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleBars({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={{ fill: "#9aa0c0", fontSize: 10 }} width={140} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v as number, label]} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs" style={{ color: "var(--text-dim)" }}>{label}</div>
      <div className="text-xl font-extrabold mt-1" style={{ color: ACCENT }}>{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: "var(--surface-2)" }}>
      <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>{label}</div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}

// tiny **bold** → <b>
function mdBold(s: string): string {
  const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}
