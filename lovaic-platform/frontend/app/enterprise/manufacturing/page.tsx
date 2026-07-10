import LiveDetect from "@/components/LiveDetect";
import ModuleDashboard from "@/components/ModuleDashboard";
import { SectionTitle } from "@/components/ui";

const VIOLET = "#8b83ff";

export default function ManufacturingPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="Industrial · EHS"
        title="Manufacturing Safety"
        desc="Detect people in restricted zones, monitor PPE compliance and flag line-side anomalies to keep the shop floor safe."
      />
      <LiveDetect mode="ppe" accent={VIOLET} hint="Try a shop-floor / site frame with workers — the engine checks head-protection (PPE) compliance." />
      <div>
        <div className="font-semibold text-lg mb-4">Shop-floor analytics</div>
        <ModuleDashboard module="safety" accent={VIOLET} breakdownTitle="Incident types" hotspotTitle="High-risk zones" />
      </div>
    </div>
  );
}
