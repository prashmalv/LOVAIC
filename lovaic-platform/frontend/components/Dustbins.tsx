"use client";
import { useEffect, useState } from "react";
import { Bin, BinSuggestion, dustbins } from "@/lib/api";

const STATUS: Record<string, { c: string; label: string }> = {
  ok: { c: "var(--green)", label: "OK" },
  filling: { c: "var(--amber)", label: "Filling" },
  overflow: { c: "var(--red)", label: "Overflow" },
};

export default function Dustbins() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [sug, setSug] = useState<BinSuggestion[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    dustbins()
      .then((d) => {
        setBins(d.bins);
        setSug(d.suggestions);
      })
      .catch(() => setErr(true));
  }, []);

  if (err)
    return <div className="text-sm p-3 rounded-xl" style={{ background: "#ff5c7218", color: "var(--red)" }}>Backend unreachable.</div>;

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        <div className="font-semibold mb-3">Bin network fill levels</div>
        <div className="grid sm:grid-cols-2 gap-4">
          {bins.map((b) => {
            const s = STATUS[b.status];
            return (
              <div key={b.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{b.zone}</div>
                    <div className="text-xs" style={{ color: "var(--text-faint)" }}>{b.id}</div>
                  </div>
                  <span className="pill" style={{ color: s.c, borderColor: s.c }}>{s.label}</span>
                </div>
                <div className="mt-3 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div style={{ width: `${b.fill}%`, height: "100%", background: s.c, borderRadius: 999, transition: "width .5s" }} />
                </div>
                <div className="text-xs mt-1 font-semibold" style={{ color: s.c }}>{b.fill}% full</div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="font-semibold mb-3">Placement suggestions</div>
        <div className="flex flex-col gap-3">
          {sug.map((s, i) => (
            <div key={i} className="card p-4">
              <div className="font-semibold text-sm">{s.zone}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{s.reason}</div>
              <div className="mt-2 text-sm p-2 rounded-lg" style={{ background: "var(--surface-2)", color: "var(--teal)" }}>
                ➜ {s.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
