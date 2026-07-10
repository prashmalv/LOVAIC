import Link from "next/link";
import { SectionTitle } from "@/components/ui";

const TILES = [
  { href: "/gov/waste", icon: "♻️", title: "Waste & Plastic", metric: "148 incidents", sub: "9 hotspots active" },
  { href: "/gov/traffic", icon: "🚦", title: "Traffic Control", metric: "4 congested", sub: "26 signals auto-tuned" },
  { href: "/gov/queue", icon: "🧍", title: "Queue & Booking", metric: "18 min wait", sub: "384 appointments" },
  { href: "/gov/safety", icon: "🛡️", title: "Safety & Security", metric: "37 alerts", sub: "214 feeds monitored" },
  { href: "/gov/lostfound", icon: "🔎", title: "Lost & Found", metric: "AI photo search", sub: "citizen portal" },
  { href: "/gov/dustbin", icon: "🗑️", title: "Smart Dustbins", metric: "2 overflowing", sub: "3 placement tips" },
  { href: "/gov/schemes", icon: "📜", title: "Scheme Discovery", metric: "6 schemes", sub: "MP + Central" },
];

const ALERTS = [
  { sev: "critical", txt: "Dustbin overflow at Riverfront Ghat 3 — crew dispatched", t: "2m ago", c: "var(--red)" },
  { sev: "high", txt: "Congestion building at Ring Rd × MG Rd — signal re-tuned", t: "6m ago", c: "#ff8a4c" },
  { sev: "moderate", txt: "Plastic hotspot flagged near Market Rd junction", t: "12m ago", c: "var(--amber)" },
  { sev: "info", txt: "Lost item matched: black backpack → owner notified", t: "24m ago", c: "var(--teal)" },
  { sev: "high", txt: "Queue > 15 at Hospital OPD — extra counter opened", t: "31m ago", c: "#ff8a4c" },
];

export default function GovHome() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="AI Intel City"
        title="Civic Command Center"
        desc="Live vision intelligence across the city — one screen, every mission."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="City feeds online" value="214" accent="var(--teal)" />
        <Stat label="Active alerts (24h)" value="37" accent="var(--red)" />
        <Stat label="Avg. response time" value="3.4 min" accent="var(--green)" />
        <Stat label="Actions recommended" value="126" accent="var(--brand-2)" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="font-semibold mb-3">Mission modules</div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {TILES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="card card-hover p-5 block"
                style={{ textDecoration: "none" }}
              >
                <div className="text-3xl mb-3">{t.icon}</div>
                <div className="font-bold" style={{ color: "var(--text)" }}>
                  {t.title}
                </div>
                <div className="text-xl font-extrabold mt-2" style={{ color: "var(--teal)" }}>
                  {t.metric}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
                  {t.sub}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="font-semibold mb-3">Live alert feed</div>
          <div className="card p-4 flex flex-col gap-3">
            {ALERTS.map((a, i) => (
              <div key={i} className="flex gap-3 pb-3" style={{ borderBottom: i < ALERTS.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                <span style={{ color: a.c, fontSize: 10, marginTop: 5 }}>●</span>
                <div className="flex-1">
                  <div className="text-sm">{a.txt}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                    {a.t}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs" style={{ color: "var(--text-dim)" }}>
        {label}
      </div>
      <div className="text-3xl font-extrabold mt-1" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
