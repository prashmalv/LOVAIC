"use client";
import { useEffect, useState } from "react";
import { ShelfAlert, shelfAlerts } from "@/lib/api";

const STATUS: Record<string, { c: string; label: string }> = {
  ok: { c: "var(--green)", label: "In stock" },
  low: { c: "var(--amber)", label: "Low stock" },
  out: { c: "var(--red)", label: "Out of stock" },
};

export default function ShelfAlerts() {
  const [rows, setRows] = useState<ShelfAlert[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    shelfAlerts().then(setRows).catch(() => setErr(true));
  }, []);

  if (err)
    return <div className="text-sm p-3 rounded-xl" style={{ background: "#ff5c7218", color: "var(--red)" }}>Backend unreachable.</div>;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--text-faint)", textAlign: "left" }}>
              {["Product", "Shelf", "Stock", "Status", "Expiry", "Action"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs uppercase tracking-wider font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = STATUS[r.status];
              const expirySoon = r.expiry_days <= 2;
              const action =
                r.status === "out" ? "Reorder now" : r.status === "low" ? "Restock soon" : expirySoon ? "Discount / rotate" : "—";
              return (
                <tr key={r.sku} style={{ borderTop: "1px solid var(--border-soft)" }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-faint)" }}>{r.sku}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-dim)" }}>{r.shelf}</td>
                  <td className="px-4 py-3 font-semibold">{r.stock}</td>
                  <td className="px-4 py-3">
                    <span className="pill" style={{ color: s.c, borderColor: s.c }}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ color: expirySoon ? "var(--red)" : "var(--text-dim)", fontWeight: expirySoon ? 700 : 400 }}>
                      {r.expiry_days}d {expirySoon ? "⚠" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ color: action === "—" ? "var(--text-faint)" : "var(--brand-2)", fontWeight: 600 }}>{action}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
