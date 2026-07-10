import Shell, { NavItem } from "@/components/Shell";

const NAV: NavItem[] = [
  { href: "/enterprise", label: "Overview", icon: "📊" },
  { href: "/enterprise/wall", label: "Camera Wall", icon: "🎛️", tag: "LIVE" },
  { href: "/enterprise/retail", label: "Retail Intelligence", icon: "🛒", tag: "LIVE" },
  { href: "/enterprise/bfsi", label: "BFSI Monitoring", icon: "🏦" },
  { href: "/enterprise/manufacturing", label: "Manufacturing", icon: "🏭" },
];

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell portalLabel="Vision Suite" portalTag="Enterprise" accent="#8b83ff" nav={NAV}>
      {children}
    </Shell>
  );
}
