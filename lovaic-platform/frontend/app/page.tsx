import Link from "next/link";

const CAPABILITIES = [
  { icon: "♻️", title: "Garbage & Plastic Detection", desc: "Spot litter and plastic on roads or water bodies; auto-suggest waste-management actions.", tag: "Gov" },
  { icon: "🚦", title: "AI Traffic Control", desc: "Vehicle counting, congestion scoring and adaptive signal recommendations.", tag: "Gov" },
  { icon: "🧍", title: "Queue Management", desc: "Live queue length & wait-time for hospitals, police & municipal offices with appointments.", tag: "Gov" },
  { icon: "🛡️", title: "Safety & Security", desc: "Crowd-density, anomaly and restricted-zone alerts across CCTV feeds.", tag: "Gov" },
  { icon: "🔎", title: "Lost & Found Portal", desc: "Citizens post lost/found items; AI photo-search reunites them automatically.", tag: "Gov" },
  { icon: "🗑️", title: "Smart Dustbins", desc: "Overflow detection and optimal bin-placement suggestions per locality.", tag: "Gov" },
  { icon: "📜", title: "Scheme Discovery", desc: "Surface state-specific food, economic & business welfare schemes to citizens.", tag: "Gov" },
  { icon: "🛒", title: "Retail Intelligence", desc: "Dwell time, footfall, staff attentiveness and shelf stock-out / expiry alerts.", tag: "Enterprise" },
  { icon: "🏦", title: "BFSI Monitoring", desc: "Branch footfall, queue SLA, and security compliance for banks & insurers.", tag: "Enterprise" },
  { icon: "🏭", title: "Manufacturing", desc: "PPE compliance, zone safety and line-side anomaly detection.", tag: "Enterprise" },
];

const SOURCES = [
  { icon: "📹", label: "CCTV upload & stream" },
  { icon: "🛸", label: "Drone feeds" },
  { icon: "🛰️", label: "Satellite imagery" },
  { icon: "📶", label: "Even low-resolution" },
];

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      <div className="grid-lines absolute inset-0 h-[600px] -z-10" />

      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white"
            style={{ background: "linear-gradient(135deg, #23d0c5, #6c63ff)" }}
          >
            L
          </div>
          <span className="font-extrabold text-lg">LOVAIC</span>
        </div>
        <Link href="/login" className="btn btn-primary">
          Launch console →
        </Link>
      </nav>

      <header className="text-center max-w-4xl mx-auto px-6 pt-16 pb-12">
        <span className="pill mb-6" style={{ color: "var(--teal)", borderColor: "var(--teal)" }}>
          <span className="live-dot" /> One vision engine · many missions
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-5">
          Turn any camera into an <span className="gradient-text">AI decision engine</span>
        </h1>
        <p className="text-lg mb-8" style={{ color: "var(--text-dim)" }}>
          LOVAIC is a computer-vision platform that reads CCTV, drone and satellite feeds in
          real time — powering an <b>AI Intel City</b> for governments and a vision suite for
          retail, BFSI &amp; manufacturing. Detect, understand, and act.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/login" className="btn btn-primary">
            Enter a portal
          </Link>
          <a href="#capabilities" className="btn btn-ghost">
            See capabilities
          </a>
        </div>

        <div className="flex items-center justify-center gap-4 mt-10 flex-wrap">
          {SOURCES.map((s) => (
            <span key={s.label} className="pill" style={{ color: "var(--text-dim)" }}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-5 mb-20">
        <PortalCard
          accent="#23d0c5"
          badge="GOVERNMENT"
          title="AI Intel City"
          desc="A civic command center — waste, traffic, safety, queues, lost & found, dustbins and welfare schemes in one screen."
          points={["Garbage & waste management", "Traffic & queue control", "Safety + Lost & Found", "Scheme discovery"]}
          href="/login"
        />
        <PortalCard
          accent="#8b83ff"
          badge="ENTERPRISE"
          title="Vision Suite"
          desc="Operational intelligence for physical spaces — retail analytics, BFSI branch monitoring and manufacturing safety."
          points={["Retail dwell & footfall", "Shelf stock-out & expiry", "BFSI branch SLA", "Manufacturing PPE safety"]}
          href="/login"
        />
      </section>

      <section id="capabilities" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--brand-2)" }}>
            Capability grid
          </div>
          <h2 className="text-3xl font-bold mt-1">LOVAIC — one engine, every task</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="card card-hover p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{c.icon}</span>
                <span
                  className="pill"
                  style={{
                    color: c.tag === "Gov" ? "var(--teal)" : "var(--brand-2)",
                    borderColor: c.tag === "Gov" ? "var(--teal)" : "var(--brand-2)",
                  }}
                >
                  {c.tag}
                </span>
              </div>
              <div className="font-bold mb-1">{c.title}</div>
              <div className="text-sm" style={{ color: "var(--text-dim)" }}>
                {c.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer
        className="text-center py-8 text-sm"
        style={{ color: "var(--text-faint)", borderTop: "1px solid var(--border-soft)" }}
      >
        LOVAIC Vision Intelligence Platform · Real Vision detection + analytics · Demo build
      </footer>
    </div>
  );
}

function PortalCard({
  accent,
  badge,
  title,
  desc,
  points,
  href,
}: {
  accent: string;
  badge: string;
  title: string;
  desc: string;
  points: string[];
  href: string;
}) {
  return (
    <Link href={href} className="card card-hover p-6 block" style={{ textDecoration: "none" }}>
      <span className="pill mb-3" style={{ color: accent, borderColor: accent }}>
        {badge}
      </span>
      <h3 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
        {desc}
      </p>
      <ul className="flex flex-col gap-2">
        {points.map((p) => (
          <li key={p} className="text-sm flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
            <span style={{ color: accent }}>●</span> {p}
          </li>
        ))}
      </ul>
      <div className="mt-5 font-semibold" style={{ color: accent }}>
        Open portal →
      </div>
    </Link>
  );
}
