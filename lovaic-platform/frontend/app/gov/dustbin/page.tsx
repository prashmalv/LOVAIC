import Dustbins from "@/components/Dustbins";
import LiveDetect from "@/components/LiveDetect";
import { SectionTitle } from "@/components/ui";

export default function DustbinPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="Sanitation · Urban Planning"
        title="Smart Dustbins"
        desc="Detect overflowing bins from feeds, track fill levels across the network, and get data-driven suggestions on where new bins should go."
      />
      <LiveDetect mode="garbage" accent="#23d0c5" hint="Try a frame of a public bin / dumpster to gauge overflow." />
      <div>
        <div className="font-semibold text-lg mb-4">Bin network & placement</div>
        <Dustbins />
      </div>
    </div>
  );
}
