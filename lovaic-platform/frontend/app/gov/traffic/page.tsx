import LiveDetect from "@/components/LiveDetect";
import ModuleDashboard from "@/components/ModuleDashboard";
import { SectionTitle } from "@/components/ui";

const TEAL = "#23d0c5";

export default function TrafficPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="Mobility · Traffic Police"
        title="AI Traffic Control"
        desc="Count vehicles, score congestion and recommend adaptive signal timing from junction feeds."
      />
      <LiveDetect
        mode="traffic"
        accent={TEAL}
        hint="Try a road / junction frame with cars, buses, bikes."
      />
      <div>
        <div className="font-semibold text-lg mb-4">Traffic analytics</div>
        <ModuleDashboard
          module="traffic"
          accent={TEAL}
          breakdownTitle="Vehicle mix"
          hotspotTitle="Congestion hotspots"
        />
      </div>
    </div>
  );
}
