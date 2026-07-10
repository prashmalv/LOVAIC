import LostFound from "@/components/LostFound";
import { SectionTitle } from "@/components/ui";

export default function LostFoundPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="Citizen Portal · AI Search"
        title="Lost & Found"
        desc="Citizens report what they lost or found with a photo. LOVAIC's visual-search AI matches lost reports to found items automatically — so an item handed in can find its owner."
      />
      <LostFound />
    </div>
  );
}
