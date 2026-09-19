"use client";
import { useState } from "react";
import { DiscoverResult, DiscoveredCamera, discoverCameras } from "@/lib/api";

const VENDORS = [
  { id: "dahua", label: "Dahua / CP Plus" },
  { id: "hikvision", label: "Hikvision" },
  { id: "generic", label: "Generic / ONVIF" },
];

// NVR / IP-camera discovery: enter NVR details → list live channels → click Connect.
export default function CameraDiscovery({
  accent = "#6c63ff",
  onConnect,
  onConnectMany,
  connectLabel = "Connect",
}: {
  accent?: string;
  onConnect: (url: string) => void;
  onConnectMany?: (urls: string[]) => void;
  connectLabel?: string;
}) {
  const [host, setHost] = useState("");
  const [user, setUser] = useState("admin");
  const [pwd, setPwd] = useState("");
  const [port, setPort] = useState(554);
  const [channels, setChannels] = useState(16);
  const [vendor, setVendor] = useState("dahua");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<DiscoverResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const scan = async () => {
    if (!host.trim()) return;
    setLoading(true);
    setErr(null);
    setRes(null);
    try {
      const r = await discoverCameras({ host: host.trim(), user, pwd, rtsp_port: port, channels, vendor });
      setRes(r);
      if (!r.ok && r.error) setErr(r.error);
    } catch {
      setErr("Discovery service unreachable — is the backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  const field = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔍</span>
        <div className="font-bold">Discover NVR cameras</div>
        <span className="pill" style={{ fontSize: 10, color: accent, borderColor: accent }}>ONVIF / RTSP</span>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>
        Enter an NVR/camera IP and credentials — LOVAIC scans the channels and lists every live
        camera with a one-click <b>Connect</b>. The NVR must be reachable from the backend (a private
        LAN IP needs an on-site backend, router port-forward, or VPN).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
        <label className="flex flex-col text-xs col-span-2 md:col-span-1" style={{ color: "var(--text-dim)" }}>
          NVR IP / host
          <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="14.195.152.243"
            className="mt-1 px-3 py-2 rounded-lg outline-none text-sm" style={field} />
        </label>
        <label className="flex flex-col text-xs" style={{ color: "var(--text-dim)" }}>
          Username
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="admin"
            className="mt-1 px-3 py-2 rounded-lg outline-none text-sm" style={field} />
        </label>
        <label className="flex flex-col text-xs" style={{ color: "var(--text-dim)" }}>
          Password
          <input value={pwd} onChange={(e) => setPwd(e.target.value)} type="password" placeholder="••••••"
            className="mt-1 px-3 py-2 rounded-lg outline-none text-sm" style={field} />
        </label>
        <label className="flex flex-col text-xs" style={{ color: "var(--text-dim)" }}>
          RTSP port
          <input value={port} onChange={(e) => setPort(+e.target.value || 554)} type="number"
            className="mt-1 px-3 py-2 rounded-lg outline-none text-sm" style={field} />
        </label>
        <label className="flex flex-col text-xs" style={{ color: "var(--text-dim)" }}>
          Channels to scan
          <input value={channels} onChange={(e) => setChannels(Math.min(64, +e.target.value || 1))} type="number"
            className="mt-1 px-3 py-2 rounded-lg outline-none text-sm" style={field} />
        </label>
        <label className="flex flex-col text-xs" style={{ color: "var(--text-dim)" }}>
          Brand
          <select value={vendor} onChange={(e) => setVendor(e.target.value)}
            className="mt-1 px-3 py-2 rounded-lg outline-none text-sm" style={field}>
            {VENDORS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
      </div>

      <button
        className="btn btn-primary w-full"
        style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))` }}
        onClick={scan}
        disabled={loading || !host.trim()}
      >
        {loading ? `Scanning ${channels} channels…` : "🔍 Discover cameras"}
      </button>

      {loading && (
        <div className="text-xs mt-3" style={{ color: "var(--text-faint)" }}>
          Probing each channel over RTSP — this can take 20–60s for a full NVR. Live channels appear as they&apos;re found.
        </div>
      )}

      {err && (
        <div className="text-sm p-3 rounded-xl mt-3" style={{ background: "#ff5c7218", color: "var(--red)" }}>
          {err}
        </div>
      )}

      {res?.ok && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="text-sm font-semibold">
              Found <span style={{ color: accent }}>{res.found}</span> live camera{res.found === 1 ? "" : "s"} on {res.host}
              <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}> · {res.vendor_label} · scanned {res.scanned} ch</span>
            </div>
            {onConnectMany && res.cameras.length > 0 && (
              <button
                className="btn btn-primary"
                style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))`, padding: "0.4rem 0.8rem", fontSize: 13 }}
                onClick={() => onConnectMany(res.cameras.map((c) => c.url))}
              >
                ➕ Add all {res.found} to wall
              </button>
            )}
          </div>
          {res.note && <div className="text-xs mb-2" style={{ color: "var(--text-faint)" }}>{res.note}</div>}
          <div className="grid sm:grid-cols-2 gap-2">
            {res.cameras.map((c) => (
              <CameraCard key={c.channel} cam={c} accent={accent} onConnect={onConnect} connectLabel={connectLabel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CameraCard({ cam, accent, onConnect, connectLabel = "Connect" }: { cam: DiscoveredCamera; accent: string; onConnect: (url: string) => void; connectLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cam.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm">📹 {cam.name}</span>
        <span className="pill" style={{ fontSize: 10, color: accent, borderColor: accent }}>
          {cam.width}×{cam.height}
        </span>
      </div>
      <div className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>
        {cam.codec.toUpperCase()} · {cam.fps} fps
      </div>
      <div className="text-[10px] mb-2 truncate" style={{ color: "var(--text-faint)" }} title={cam.display_url}>
        {cam.display_url}
      </div>
      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1"
          style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))`, padding: "0.4rem 0.6rem", fontSize: 13 }}
          onClick={() => onConnect(cam.url)}
        >
          {connectLabel}
        </button>
        <button className="pill" style={{ cursor: "pointer", color: "var(--text-dim)", fontSize: 11 }} onClick={copy}>
          {copied ? "✓ Copied" : "Copy URL"}
        </button>
      </div>
    </div>
  );
}
