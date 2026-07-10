import LiveDetect from "@/components/LiveDetect";
import ModuleDashboard from "@/components/ModuleDashboard";
import ShelfAlerts from "@/components/ShelfAlerts";
import { SectionTitle } from "@/components/ui";

const VIOLET = "#8b83ff";

export default function RetailPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="Retail Chains"
        title="Retail Intelligence"
        desc="Understand footfall, dwell time, staff attentiveness and shelf health — how long customers stay, what they browse together, and when stock runs low or is about to expire."
      />
      <LiveDetect mode="retail" accent={VIOLET} hint="Try a store-aisle or checkout frame with shoppers." />

      <div>
        <div className="font-semibold text-lg mb-4">Store analytics</div>
        <ModuleDashboard module="retail" accent={VIOLET} breakdownTitle="Zone footfall" hotspotTitle="Hot zones" />
      </div>

      <div>
        <div className="font-semibold text-lg mb-2">Shelf stock-out & expiry alerts</div>
        <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
          Vision + inventory signals flag shelves running low and items nearing expiry so staff can restock or rotate in time.
        </p>
        <ShelfAlerts />
      </div>
    </div>
  );
}
