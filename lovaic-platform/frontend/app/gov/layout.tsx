import Shell, { NavItem } from "@/components/Shell";

const NAV: NavItem[] = [
  { href: "/gov", label: "Command Center", icon: "🛰️" },
  { href: "/gov/wall", label: "Camera Wall", icon: "🎛️", tag: "LIVE" },
  { href: "/gov/waste", label: "Waste & Plastic", icon: "♻️", tag: "LIVE" },
  { href: "/gov/traffic", label: "Traffic Control", icon: "🚦", tag: "LIVE" },
  { href: "/gov/queue", label: "Queue & Booking", icon: "🧍" },
  { href: "/gov/safety", label: "Safety & Security", icon: "🛡️", tag: "LIVE" },
  { href: "/gov/lostfound", label: "Lost & Found", icon: "🔎", tag: "AI" },
  { href: "/gov/dustbin", label: "Smart Dustbins", icon: "🗑️" },
  { href: "/gov/schemes", label: "Scheme Discovery", icon: "📜" },
];

export default function GovLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell portalLabel="AI Intel City" portalTag="Government" accent="#23d0c5" nav={NAV}>
      {children}
    </Shell>
  );
}
