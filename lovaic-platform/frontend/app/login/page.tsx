"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth";
import { Portal } from "@/lib/config";

const PORTALS: {
  id: Portal;
  accent: string;
  badge: string;
  title: string;
  desc: string;
  org: string;
  user: string;
}[] = [
  {
    id: "gov",
    accent: "#23d0c5",
    badge: "GOVERNMENT",
    title: "AI Intel City",
    desc: "Municipal & law-enforcement command center.",
    org: "Ujjain Smart City",
    user: "Commissioner",
  },
  {
    id: "enterprise",
    accent: "#8b83ff",
    badge: "ENTERPRISE",
    title: "Vision Suite",
    desc: "Retail · BFSI · Manufacturing operations.",
    org: "Acme Retail Group",
    user: "Ops Manager",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Portal>("gov");
  const active = PORTALS.find((p) => p.id === selected)!;
  const [org, setOrg] = useState(active.org);
  const [user, setUser] = useState(active.user);

  const pick = (id: Portal) => {
    setSelected(id);
    const p = PORTALS.find((x) => x.id === id)!;
    setOrg(p.org);
    setUser(p.user);
  };

  const enter = () => {
    signIn({ portal: selected, org, user });
    router.push(selected === "gov" ? "/gov" : "/enterprise");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="grid-lines absolute inset-0 h-[400px] -z-10" />

      <Link href="/" className="flex items-center gap-2 mb-8" style={{ textDecoration: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rlailogo.png" alt="RLAI" style={{ height: 40, borderRadius: 9 }} />
        <span className="font-extrabold text-xl">LOVAIC</span>
      </Link>

      <h1 className="text-3xl font-bold mb-1">Choose your console</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-dim)" }}>
        Each login shows only the modules for that domain.
      </p>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        {PORTALS.map((p) => {
          const on = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              className="card p-5 text-left transition-all"
              style={{
                borderColor: on ? p.accent : "var(--border-soft)",
                boxShadow: on ? `0 0 30px ${p.accent}33` : "none",
                cursor: "pointer",
              }}
            >
              <span className="pill mb-3" style={{ color: p.accent, borderColor: p.accent }}>
                {p.badge}
              </span>
              <div className="text-xl font-bold">{p.title}</div>
              <div className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
                {p.desc}
              </div>
              <div
                className="mt-3 text-xs font-semibold"
                style={{ color: on ? p.accent : "var(--text-faint)" }}
              >
                {on ? "● Selected" : "○ Select"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="card p-5 w-full max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
              Organization
            </span>
            <input
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
              Your role
            </span>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </label>
        </div>
        <button
          className="btn btn-primary w-full mt-4"
          style={{ background: `linear-gradient(120deg, ${active.accent}, var(--brand))` }}
          onClick={enter}
        >
          Enter {active.title} →
        </button>
        <div className="text-center text-xs mt-3" style={{ color: "var(--text-faint)" }}>
          Demo access · no password required
        </div>
      </div>
    </div>
  );
}
