import LiveDetect from "@/components/LiveDetect";
import ModuleDashboard from "@/components/ModuleDashboard";
import { SectionTitle } from "@/components/ui";

const VIOLET = "#8b83ff";

export default function BfsiPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="Banking · Financial Services · Insurance"
        title="BFSI Branch Monitoring"
        desc="Track branch footfall and queue SLAs, and monitor security compliance across ATMs and cash-handling zones."
      />
      <LiveDetect mode="queue" accent={VIOLET} hint="Try a bank-branch frame with customers at counters." />
      <div>
        <div className="font-semibold text-lg mb-4">Branch analytics</div>
        <ModuleDashboard module="queue" accent={VIOLET} breakdownTitle="Service mix" hotspotTitle="Branches breaching SLA" />
      </div>
    </div>
  );
}
