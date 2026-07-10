import LiveDetect from "@/components/LiveDetect";
import ModuleDashboard from "@/components/ModuleDashboard";
import { SectionTitle } from "@/components/ui";

const TEAL = "#23d0c5";

export default function SafetyPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="Police · Disaster Management"
        title="Safety & Security"
        desc="Crowd-density estimation and anomaly alerts across public feeds — surface stampede risk and restricted-zone breaches before they escalate."
      />
      <LiveDetect
        mode="safety"
        accent={TEAL}
        hint="Try a crowd frame — market, station, event or gathering."
      />
      <div>
        <div className="font-semibold text-lg mb-4">Security analytics</div>
        <ModuleDashboard
          module="safety"
          accent={TEAL}
          breakdownTitle="Alert types"
          hotspotTitle="High-density zones"
        />
      </div>
    </div>
  );
}
