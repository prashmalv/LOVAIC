import Schemes from "@/components/Schemes";
import { SectionTitle } from "@/components/ui";

export default function SchemesPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="Welfare · Citizen Outreach"
        title="Scheme Discovery"
        desc="Surface the right state-specific and central welfare schemes — food, economic and business support — to the citizens who qualify."
      />
      <Schemes />
    </div>
  );
}
