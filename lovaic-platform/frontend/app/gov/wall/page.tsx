import CameraWall from "@/components/CameraWall";
import { SectionTitle } from "@/components/ui";
import { DetectMode } from "@/lib/config";

const FEEDS: { name: string; mode: DetectMode; count: boolean }[] = [
  { name: "Ring Rd Junction", mode: "traffic", count: true },
  { name: "Central Market", mode: "safety", count: true },
  { name: "Temple Gate", mode: "safety", count: true },
  { name: "Riverfront Ghat 3", mode: "garbage", count: false },
];

export default function GovWallPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="City Surveillance"
        title="Multi-Camera Command Wall"
        desc="Many live feeds on one screen — each analysed for its own mission, with combined city-wide footfall (IN / OUT / NET) across all cameras."
      />
      <CameraWall accent="#23d0c5" initial={FEEDS} />
    </div>
  );
}
