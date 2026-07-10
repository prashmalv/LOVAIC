import Appointments from "@/components/Appointments";
import LiveDetect from "@/components/LiveDetect";
import ModuleDashboard from "@/components/ModuleDashboard";
import { SectionTitle } from "@/components/ui";

const TEAL = "#23d0c5";

export default function QueuePage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="Citizen Services"
        title="Queue Management & Appointments"
        desc="Measure live queue length and wait-time at hospitals, police stations and municipal offices — and let citizens book slots that are recorded in the system."
      />
      <LiveDetect
        mode="queue"
        accent={TEAL}
        hint="Try a frame of people standing in a line at a counter."
      />

      <div>
        <div className="font-semibold text-lg mb-4">Appointment booking</div>
        <Appointments />
      </div>

      <div>
        <div className="font-semibold text-lg mb-4">Queue analytics</div>
        <ModuleDashboard
          module="queue"
          accent={TEAL}
          breakdownTitle="Footfall by department"
          hotspotTitle="Longest queues"
        />
      </div>
    </div>
  );
}
