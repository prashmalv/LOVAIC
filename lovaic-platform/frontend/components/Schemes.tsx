"use client";
import { useEffect, useState } from "react";
import { Scheme, schemes } from "@/lib/api";

const STATES = ["Madhya Pradesh", "Maharashtra", "Uttar Pradesh", "Rajasthan"];
const CATS = [
  { id: "all", label: "All", icon: "🗂️" },
  { id: "food", label: "Food", icon: "🍚" },
  { id: "economic", label: "Economic", icon: "💰" },
  { id: "business", label: "Business", icon: "🏪" },
];
const CAT_COLOR: Record<string, string> = {
  food: "var(--green)",
  economic: "var(--amber)",
  business: "var(--brand-2)",
};

export default function Schemes() {
  const [state, setState] = useState(STATES[0]);
  const [cat, setCat] = useState("all");
  const [list, setList] = useState<Scheme[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    schemes(state, cat)
      .then(setList)
      .catch(() => setErr(true));
  }, [state, cat]);

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--text-dim)" }}>State</span>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className="pill"
              style={{
                cursor: "pointer",
                color: cat === c.id ? "#fff" : "var(--text-dim)",
                background: cat === c.id ? "var(--teal)" : "transparent",
                borderColor: cat === c.id ? "var(--teal)" : "var(--border)",
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {err ? (
        <div className="text-sm p-3 rounded-xl" style={{ background: "#ff5c7218", color: "var(--red)" }}>Backend unreachable.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((s) => (
            <div key={s.name} className="card card-hover p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg">{s.name}</div>
                <span
                  className="pill"
                  style={{ color: CAT_COLOR[s.category] ?? "var(--text-dim)", borderColor: CAT_COLOR[s.category] ?? "var(--border)" }}
                >
                  {s.category}
                </span>
              </div>
              <div className="text-sm mb-3" style={{ color: "var(--teal)" }}>{s.benefit}</div>
              <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                <b>Eligibility:</b> {s.eligibility}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                {s.dept} · {s.state}
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-sm" style={{ color: "var(--text-dim)" }}>No schemes for this filter.</div>
          )}
        </div>
      )}
    </div>
  );
}
