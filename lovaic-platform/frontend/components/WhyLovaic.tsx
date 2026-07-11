const DIFFERENTIATORS = [
  {
    icon: "◆",
    title: "Pixel-level, not just boxes",
    desc: "LOVAIC segments objects at the pixel — capturing exact shape, overlap and partial occlusion. Box-only detectors miss all of that.",
  },
  {
    icon: "🛡",
    title: "Privacy by design",
    desc: "Faces and people are redacted on the frame itself. Raw identities never leave your perimeter — GDPR / DPDP friendly out of the box.",
  },
  {
    icon: "🏛",
    title: "Sovereign & on-prem",
    desc: "Run in your own data center or sovereign cloud, fully air-gap capable. Your footage and your models stay under your control.",
  },
  {
    icon: "🧠",
    title: "Proprietary RLAI engine",
    desc: "A multi-model orchestration stack with domain reasoning tuned per vertical — not a single off-the-shelf model bolted onto a UI.",
  },
  {
    icon: "🎯",
    title: "Higher-fidelity insight",
    desc: "Pixel masks + object tracking + vertical reasoning together mean fewer false alarms and richer, action-ready output.",
  },
  {
    icon: "🔌",
    title: "Any source, even low-res",
    desc: "CCTV, drone and satellite feeds — one engine, live. No special cameras required.",
  },
];

const COMPARISON = [
  { k: "Output", box: "Bounding boxes", lov: "Pixel-precise instance masks" },
  { k: "Privacy", box: "Raw frames processed as-is", lov: "On-frame face / person redaction" },
  { k: "Deployment", box: "Cloud SaaS only", lov: "Sovereign · on-prem · air-gapped" },
  { k: "Intelligence", box: "Generic class labels", lov: "Domain reasoning + recommended actions" },
  { k: "Your data", box: "Leaves your perimeter", lov: "Never leaves your control" },
];

export default function WhyLovaic({
  accent = "#8b83ff",
  heading = "Beyond a bounding box",
  compact = false,
}: {
  accent?: string;
  heading?: string;
  compact?: boolean;
}) {
  return (
    <div>
      {!compact && (
        <div className="text-center mb-10">
          <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--brand-2)" }}>
            Why LOVAIC · not just another detector
          </div>
          <h2 className="text-3xl font-bold mt-1">{heading}</h2>
          <p className="text-sm mt-2 max-w-2xl mx-auto" style={{ color: "var(--text-dim)" }}>
            Most demos draw boxes on a frame. The LOVAIC RLAI engine works at the pixel level,
            keeps data sovereign, and reasons about your domain — so it holds up in the field,
            not just in a slide.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {DIFFERENTIATORS.map((d) => (
          <div key={d.title} className="card card-hover p-5">
            <div className="text-2xl mb-2" style={{ color: accent }}>{d.icon}</div>
            <div className="font-bold mb-1">{d.title}</div>
            <div className="text-sm" style={{ color: "var(--text-dim)" }}>{d.desc}</div>
          </div>
        ))}
      </div>

      {/* comparison */}
      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="p-3" style={{ color: "var(--text-faint)" }}></div>
          <div className="p-3" style={{ color: "var(--text-dim)" }}>Typical box detector</div>
          <div className="p-3" style={{ color: accent }}>LOVAIC Vision AI</div>
        </div>
        {COMPARISON.map((row, i) => (
          <div key={row.k} className="grid grid-cols-3 text-sm" style={{ borderTop: i ? "1px solid var(--border-soft)" : "none" }}>
            <div className="p-3 font-semibold" style={{ color: "var(--text-dim)" }}>{row.k}</div>
            <div className="p-3" style={{ color: "var(--text-faint)" }}>✕ {row.box}</div>
            <div className="p-3" style={{ color: "var(--text)" }}>
              <span style={{ color: accent }}>✓</span> {row.lov}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-6">
        {["Pixel-level segmentation", "Privacy-first", "Sovereign / on-prem", "Multi-source", "Made in India 🇮🇳"].map((t) => (
          <span key={t} className="pill" style={{ color: accent, borderColor: accent }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
