import WhyLovaic from "@/components/WhyLovaic";
import { SectionTitle } from "@/components/ui";

export default function EnterprisePlatformPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="The LOVAIC RLAI engine"
        title="Why LOVAIC — beyond a bounding box"
        desc="Pixel-level accuracy, on-prem / sovereign deployment and privacy-first processing — the differentiators that matter when this runs across your real sites."
      />
      <WhyLovaic accent="#8b83ff" compact />
    </div>
  );
}
