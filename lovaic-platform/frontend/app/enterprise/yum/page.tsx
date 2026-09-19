import YumCopilot from "@/components/YumCopilot";
import YumVision from "@/components/YumVision";
import { SectionTitle } from "@/components/ui";

const ACCENT = "#e4002b";

export default function YumPage() {
  return (
    <div className="flex flex-col gap-10">
      <SectionTitle
        eyebrow="Client Showcase · KFC · Pizza Hut · Taco Bell · Costa Coffee"
        title="Yum! India — AI Empowerment Blueprint"
        desc="Two capability layers from the RLAI × Yum! India solution blueprint: the LOVAIC™ in-restaurant computer-vision bundle, and an AI copilot that turns raw POS data into operator decisions. Everything below runs on the real vision engine and real POS files — nothing is mocked."
      />

      {/* CV bundle */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: ACCENT }}
          >
            Pillar C · Computer Vision (LOVAIC™)
          </span>
        </div>
        <h3 className="text-xl font-bold mb-1">In-Restaurant Intelligence Layers</h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-dim)" }}>
          Six vision layers that sit on top of cameras already in KFC/Pizza Hut dine-in stores — adding
          queue, dwell, hygiene, workforce and revenue-protection intelligence the kiosks alone can&apos;t
          capture. Pick a layer and analyze a frame or a live feed.
        </p>
        <YumVision />
      </section>

      {/* POS AI insights */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: ACCENT }}
          >
            Pillar D + H · AI Layer on POS Data
          </span>
        </div>
        <h3 className="text-xl font-bold mb-1">POS Intelligence &amp; Store Performance Copilot</h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-dim)" }}>
          The same store&apos;s point-of-sale and inward-supply data, turned into an operator-ready
          dashboard and a plain-language copilot. This is how AI layers on top of the numbers Yum
          already collects — surfacing demand curves, margin leakage, waste risk and procurement
          opportunities without a data team.
        </p>
        <YumCopilot />
      </section>
    </div>
  );
}
