"use client";
import { useState } from "react";
import LiveDetect, { SampleFrame } from "./LiveDetect";
import { DetectMode } from "@/lib/config";

const ACCENT = "#e4002b";

// Bundled demo frames (public/samples). See public/samples/CREDITS.md for licenses.
const S: Record<string, SampleFrame> = {
  foodQueue: { label: "Food queue", url: "/samples/food-queue.jpg" },
  storeQueue: { label: "Store queue", url: "/samples/queue-store.jpg" },
  crowd: { label: "Crowd / hall", url: "/samples/students-queue.jpg" },
  counter: { label: "Billing counter", url: "/samples/counter.jpg" },
  kitchen: { label: "Kitchen crew", url: "/samples/kitchen.jpg" },
  busQueue: { label: "Outdoor queue", url: "/samples/bus-queue.jpg" },
};

// The six in-restaurant Computer Vision layers from the RLAI × Yum blueprint (Pillar C),
// each mapped to a LOVAIC detection mode.
const LAYERS: {
  id: string;
  icon: string;
  title: string;
  mode: DetectMode;
  what: string;
  impact: string;
  hint: string;
  samples: SampleFrame[];
}[] = [
  {
    id: "customer",
    icon: "🧍",
    title: "Customer Intelligence",
    mode: "queue",
    what: "Walk-ins, repeat/VIP recognition and dwell time by zone.",
    impact: "Sharper footfall insight and personalization triggers.",
    hint: "Try a dine-in / counter frame with customers.",
    samples: [S.foodQueue, S.crowd, S.storeQueue, S.busQueue],
  },
  {
    id: "queue",
    icon: "⏱️",
    title: "Queue & Service",
    mode: "queue",
    what: "Billing-queue length, unattended customers and service response time.",
    impact: "Faster service recovery and shorter wait times.",
    hint: "Try a billing-counter or drive-thru frame.",
    samples: [S.storeQueue, S.busQueue, S.foodQueue, S.crowd],
  },
  {
    id: "space",
    icon: "🗺️",
    title: "Space Intelligence",
    mode: "retail",
    what: "Table occupancy, floor heatmaps and true peak-hour patterns.",
    impact: "Layout and staffing tuned to real peaks.",
    hint: "Try a wide dining-area frame.",
    samples: [S.crowd, S.foodQueue, S.kitchen],
  },
  {
    id: "safety",
    icon: "🦺",
    title: "Safety & Hygiene",
    mode: "ppe",
    what: "PPE / gloves / cap compliance, kitchen hygiene and fire/smoke risk.",
    impact: "Stronger compliance and food-safety risk reduction.",
    hint: "Try a kitchen / back-of-house frame.",
    samples: [S.kitchen, S.counter],
  },
  {
    id: "workforce",
    icon: "👷",
    title: "Workforce & SOP",
    mode: "safety",
    what: "Attendance, counter presence and opening/closing SOP adherence.",
    impact: "SOP adherence and labour-compliance visibility.",
    hint: "Try a counter / crew-station frame.",
    samples: [S.counter, S.kitchen, S.storeQueue],
  },
  {
    id: "revenue",
    icon: "🧾",
    title: "Revenue Protection",
    mode: "retail",
    what: "Billed-vs-delivered checks and till/handover anomaly detection.",
    impact: "Reduced shrinkage and order-till leakage.",
    hint: "Try a handover / packing-counter frame. Pairs with the POS Copilot below.",
    samples: [S.counter, S.storeQueue],
  },
];

export default function YumVision() {
  const [active, setActive] = useState(LAYERS[0]);

  return (
    <div className="flex flex-col gap-5">
      {/* layer selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {LAYERS.map((l) => {
          const on = l.id === active.id;
          return (
            <button
              key={l.id}
              onClick={() => setActive(l)}
              className="card card-hover p-3 text-left"
              style={{
                cursor: "pointer",
                borderColor: on ? ACCENT : "var(--border)",
                background: on ? `${ACCENT}12` : undefined,
              }}
            >
              <div className="text-2xl mb-1">{l.icon}</div>
              <div className="text-sm font-bold leading-tight" style={{ color: on ? ACCENT : "var(--text)" }}>
                {l.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* active layer context */}
      <div className="card p-4" style={{ borderLeft: `3px solid ${ACCENT}` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{active.icon}</span>
          <span className="font-bold">{active.title}</span>
          <span className="pill" style={{ fontSize: 10, color: ACCENT, borderColor: ACCENT }}>LOVAIC™ · Pillar C</span>
        </div>
        <div className="text-sm" style={{ color: "var(--text-dim)" }}>{active.what}</div>
        <div className="text-sm mt-1">
          <span style={{ color: "var(--text-faint)" }}>Business impact: </span>
          <span style={{ color: "var(--green)" }}>{active.impact}</span>
        </div>
      </div>

      {/* the actual vision engine for this layer */}
      <LiveDetect key={active.id} mode={active.mode} accent={ACCENT} hint={active.hint} samples={active.samples} />
    </div>
  );
}
