import { ReactNode } from "react";
import { Kpi } from "@/lib/api";

const SEV_COLOR: Record<string, string> = {
  info: "var(--blue)",
  low: "var(--green)",
  moderate: "var(--amber)",
  high: "#ff8a4c",
  critical: "var(--red)",
};

export function SeverityPill({ severity }: { severity: string }) {
  const c = SEV_COLOR[severity] ?? "var(--text-dim)";
  return (
    <span
      className="pill"
      style={{ color: c, borderColor: c, background: `${c}18` }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 99,
          background: c,
          display: "inline-block",
        }}
      />
      {severity.toUpperCase()}
    </span>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  desc,
  right,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        {eyebrow && (
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "var(--brand-2)" }}
          >
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          {title}
        </h2>
        {desc && (
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            {desc}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

export function KpiCard({ kpi, accent }: { kpi: Kpi; accent?: string }) {
  const positive = kpi.delta >= 0;
  return (
    <div className="card card-hover p-4">
      <div className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>
        {kpi.label}
      </div>
      <div className="flex items-end gap-2 mt-2">
        <div
          className="text-3xl font-extrabold leading-none"
          style={{ color: accent ?? "var(--text)" }}
        >
          {kpi.value}
          {kpi.unit && (
            <span className="text-base font-semibold ml-1" style={{ color: "var(--text-dim)" }}>
              {kpi.unit}
            </span>
          )}
        </div>
      </div>
      <div
        className="text-xs font-semibold mt-2"
        style={{ color: positive ? "var(--green)" : "var(--red)" }}
      >
        {positive ? "▲" : "▼"} {Math.abs(kpi.delta)}% vs last period
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`card p-5 ${hover ? "card-hover" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="pill" style={{ color: "var(--green)", borderColor: "var(--green)" }}>
      <span className="live-dot" /> {label}
    </span>
  );
}

export function Trend({ trend }: { trend: "up" | "down" | "flat" }) {
  const map = {
    up: { c: "var(--red)", s: "▲" },
    down: { c: "var(--green)", s: "▼" },
    flat: { c: "var(--text-dim)", s: "▬" },
  }[trend];
  return <span style={{ color: map.c }}>{map.s}</span>;
}
