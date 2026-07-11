"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, signOut, Session } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  tag?: string;
}

export default function Shell({
  portalLabel,
  portalTag,
  accent,
  nav,
  children,
}: {
  portalLabel: string;
  portalTag: string;
  accent: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 flex flex-col p-4 sticky top-0 h-screen"
        style={{ borderRight: "1px solid var(--border-soft)", background: "var(--bg-2)" }}
      >
        <Link href="/" className="flex items-center gap-2 mb-1" style={{ textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rlailogo.png" alt="RLAI" style={{ height: 32, borderRadius: 7 }} />
          <div>
            <div className="font-extrabold leading-none" style={{ color: "var(--text)" }}>
              LOVAIC
            </div>
            <div className="text-[10px] tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>
              Vision Intelligence
            </div>
          </div>
        </Link>

        <div
          className="mt-4 mb-4 p-2 rounded-xl text-xs"
          style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}44` }}
        >
          <div className="font-bold uppercase tracking-wider text-[10px]">{portalTag}</div>
          <div style={{ color: "var(--text-dim)" }}>{portalLabel}</div>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
                style={{
                  textDecoration: "none",
                  background: active ? `${accent}1c` : "transparent",
                  color: active ? "var(--text)" : "var(--text-dim)",
                  border: active ? `1px solid ${accent}55` : "1px solid transparent",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.tag && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    {item.tag}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          className="btn btn-ghost mt-3 text-sm"
          onClick={() => {
            signOut();
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="flex items-center justify-between px-8 py-4 sticky top-0 z-10"
          style={{
            borderBottom: "1px solid var(--border-soft)",
            background: "rgba(7,9,18,0.72)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-dim)" }}>
            <span className="live-dot" /> Vision engine online · {nav.length} modules
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold">{session?.org ?? "—"}</div>
              <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                {session?.user ?? "guest"}
              </div>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
              style={{ background: `${accent}22`, color: accent }}
            >
              {(session?.org ?? "L")[0]}
            </div>
          </div>
        </header>

        <main className="p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
