import CameraWall from "@/components/CameraWall";
import { SectionTitle } from "@/components/ui";
import { DetectMode } from "@/lib/config";

const FEEDS: { name: string; mode: DetectMode; count: boolean }[] = [
  { name: "Store 1 — Entrance", mode: "retail", count: true },
  { name: "Store 1 — Aisle 4", mode: "retail", count: false },
  { name: "Checkout Zone", mode: "queue", count: true },
  { name: "Warehouse Floor", mode: "ppe", count: false },
];

export default function EnterpriseWallPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="Multi-site Operations"
        title="Store & Site Camera Wall"
        desc="Every store and zone on one screen — footfall, dwell, queue and PPE at a glance, with combined entries/exits (IN / OUT / NET) across all cameras."
      />
      <CameraWall accent="#8b83ff" initial={FEEDS} />
    </div>
  );
}
