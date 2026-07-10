import LiveDetect from "@/components/LiveDetect";
import ModuleDashboard from "@/components/ModuleDashboard";
import { SectionTitle } from "@/components/ui";

const TEAL = "#23d0c5";

export default function WastePage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="Municipal · Sanitation"
        title="Garbage & Plastic Detection"
        desc="Detect litter and plastic on roads or water bodies from any feed, and turn it into a waste-management work order."
      />
      <LiveDetect
        mode="garbage"
        accent={TEAL}
        hint="Try a street, riverbank or roadside frame with bottles/cups (plastic proxies)."
      />
      <div>
        <div className="font-semibold text-lg mb-4">Waste management analytics</div>
        <ModuleDashboard
          module="waste"
          accent={TEAL}
          breakdownTitle="Waste composition"
          hotspotTitle="Litter hotspots"
        />
      </div>
    </div>
  );
}
