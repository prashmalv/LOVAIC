import WhyLovaic from "@/components/WhyLovaic";
import { SectionTitle } from "@/components/ui";

export default function GovPlatformPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="The LOVAIC RLAI engine"
        title="Why LOVAIC — the sovereign vision platform"
        desc="Purpose-built for public infrastructure: pixel-level understanding, privacy by design, and data that never leaves government control."
      />
      <WhyLovaic accent="#23d0c5" compact />
    </div>
  );
}
