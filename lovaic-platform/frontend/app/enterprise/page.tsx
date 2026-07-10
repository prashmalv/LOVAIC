import Link from "next/link";
import { SectionTitle } from "@/components/ui";

const TILES = [
  { href: "/enterprise/retail", icon: "🛒", title: "Retail Intelligence", metric: "1,860 footfall", sub: "14.2 min dwell · 31% conv." },
  { href: "/enterprise/bfsi", icon: "🏦", title: "BFSI Monitoring", metric: "SLA 92%", sub: "branch queues & compliance" },
  { href: "/enterprise/manufacturing", icon: "🏭", title: "Manufacturing", metric: "98% PPE", sub: "zone safety & anomalies" },
];

export default function EnterpriseHome() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="Vision Suite"
        title="Enterprise Operations Overview"
        desc="Operational intelligence across your physical spaces, from one vision engine."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Sites connected" value="42" accent="var(--brand-2)" />
        <Stat label="Cameras live" value="318" accent="var(--teal)" />
        <Stat label="Insights / day" value="1.2k" accent="var(--green)" />
        <Stat label="Alerts open" value="11" accent="var(--red)" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="card card-hover p-6 block" style={{ textDecoration: "none" }}>
            <div className="text-4xl mb-3">{t.icon}</div>
            <div className="font-bold text-lg" style={{ color: "var(--text)" }}>{t.title}</div>
            <div className="text-2xl font-extrabold mt-2" style={{ color: "var(--brand-2)" }}>{t.metric}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{t.sub}</div>
            <div className="mt-4 font-semibold text-sm" style={{ color: "var(--brand-2)" }}>Open module →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs" style={{ color: "var(--text-dim)" }}>{label}</div>
      <div className="text-3xl font-extrabold mt-1" style={{ color: accent }}>{value}</div>
    </div>
  );
}
