import { API_BASE, DetectMode } from "./config";

export interface Detection {
  label: string;
  confidence: number;
  bbox: number[];
}

export interface Insight {
  headline: string;
  severity: "low" | "moderate" | "high" | "critical" | "info";
  metrics: Record<string, string | number>;
  recommendations: string[];
}

export interface DetectResult {
  mode: string;
  engine?: string;
  annotated_image: string;
  detections: Detection[];
  counts: Record<string, number>;
  insight: Insight;
}

// URL of the backend MJPEG stream for a given source (RTSP/HLS/HTTP/file/webcam-index).
export function streamUrl(
  src: string,
  mode: DetectMode,
  opts: {
    conf?: number;
    count?: boolean;
    line?: "horizontal" | "vertical";
    fid?: string;
    seg?: boolean;
    privacy?: boolean;
    classes?: string;
  } = {}
): string {
  const p = new URLSearchParams({ src, mode, conf: String(opts.conf ?? 0.35) });
  if (opts.count) {
    p.set("count", "true");
    p.set("line", opts.line ?? "horizontal");
  }
  if (opts.seg) p.set("seg", "true");
  if (opts.privacy) p.set("privacy", "true");
  if (opts.classes && opts.classes.trim()) p.set("classes", opts.classes.trim());
  if (opts.fid) p.set("fid", opts.fid);
  // cache-buster so reconnecting with new options always restarts the stream
  p.set("t", String(Date.now()));
  return `${API_BASE}/api/stream?${p.toString()}`;
}

export interface FeedStat {
  mode: string;
  in: number;
  out: number;
  net: number;
  counts: Record<string, number>;
  persons?: number;
  risk_score?: number;
  risk_level?: string;
}
export interface StreamStats {
  feeds: Record<string, FeedStat | null>;
  combined: {
    in: number;
    out: number;
    net: number;
    persons?: number;
    max_risk?: number;
    objects: Record<string, number>;
  };
}

export async function streamStats(fids: string[]): Promise<StreamStats> {
  const res = await fetch(`${API_BASE}/api/stream-stats?fids=${fids.join(",")}`);
  if (!res.ok) throw new Error("stats failed");
  return res.json();
}

export function heatmapUrl(fid: string): string {
  return `${API_BASE}/api/heatmap?fid=${encodeURIComponent(fid)}&t=${Date.now()}`;
}

export async function resetHeatmaps(fids: string[]): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/heatmap/reset?fids=${fids.join(",")}`, { method: "POST" });
  } catch {
    /* non-fatal */
  }
}

export interface DetectOpts {
  conf?: number;
  seg?: boolean;
  privacy?: boolean;
}

export async function detect(
  file: File,
  mode: DetectMode,
  opts: DetectOpts = {}
): Promise<DetectResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("mode", mode);
  fd.append("conf", String(opts.conf ?? 0.35));
  if (opts.seg) fd.append("seg", "true");
  if (opts.privacy) fd.append("privacy", "true");
  const res = await fetch(`${API_BASE}/api/detect`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Detection failed (${res.status})`);
  return res.json();
}

export interface Kpi {
  label: string;
  value: string | number;
  delta: number;
  unit: string;
}
export interface Series {
  name: string;
  hours: string[];
  values: number[];
}
export interface Breakdown {
  name: string;
  value: number;
}
export interface Hotspot {
  zone: string;
  score: number;
  trend: "up" | "down" | "flat";
}
export interface ModuleSummary {
  kpis: Kpi[];
  series: Series;
  breakdown: Breakdown[];
  hotspots: Hotspot[];
}

export async function analytics(module: string): Promise<ModuleSummary> {
  const res = await fetch(`${API_BASE}/api/analytics/${module}`);
  if (!res.ok) throw new Error("analytics failed");
  return res.json();
}

// --- Lost & Found ---------------------------------------------------------

export interface LostFoundItem {
  id: string;
  kind: "lost" | "found";
  title: string;
  description: string;
  category: string;
  location: string;
  contact: string;
  image: string;
  created_at: string;
  match_score?: number;
}

export async function reportLostFound(form: {
  file: File;
  kind: "lost" | "found";
  title: string;
  description: string;
  category: string;
  location: string;
  contact: string;
}): Promise<{ item: LostFoundItem; matches: LostFoundItem[] }> {
  const fd = new FormData();
  fd.append("file", form.file);
  fd.append("kind", form.kind);
  fd.append("title", form.title);
  fd.append("description", form.description);
  fd.append("category", form.category);
  fd.append("location", form.location);
  fd.append("contact", form.contact);
  const res = await fetch(`${API_BASE}/api/lostfound/report`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error("report failed");
  return res.json();
}

export async function listLostFound(
  kind?: "lost" | "found"
): Promise<LostFoundItem[]> {
  const q = kind ? `?kind=${kind}` : "";
  const res = await fetch(`${API_BASE}/api/lostfound/items${q}`);
  if (!res.ok) throw new Error("list failed");
  return (await res.json()).items;
}

export async function searchLostFound(
  file: File,
  kind?: "lost" | "found"
): Promise<LostFoundItem[]> {
  const fd = new FormData();
  fd.append("file", file);
  if (kind) fd.append("kind", kind);
  const res = await fetch(`${API_BASE}/api/lostfound/search`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error("search failed");
  return (await res.json()).results;
}

// --- Reference data -------------------------------------------------------

export interface ShelfAlert {
  sku: string;
  name: string;
  shelf: string;
  stock: number;
  status: "ok" | "low" | "out";
  expiry_days: number;
}
export async function shelfAlerts(): Promise<ShelfAlert[]> {
  const res = await fetch(`${API_BASE}/api/shelf`);
  return (await res.json()).alerts;
}

export interface Bin {
  id: string;
  zone: string;
  fill: number;
  status: "ok" | "filling" | "overflow";
  lat: number;
  lng: number;
}
export interface BinSuggestion {
  zone: string;
  reason: string;
  action: string;
}
export async function dustbins(): Promise<{ bins: Bin[]; suggestions: BinSuggestion[] }> {
  const res = await fetch(`${API_BASE}/api/dustbins`);
  return res.json();
}

export interface Scheme {
  name: string;
  category: string;
  state: string;
  benefit: string;
  eligibility: string;
  dept: string;
}
export async function schemes(state: string, category: string): Promise<Scheme[]> {
  const res = await fetch(
    `${API_BASE}/api/schemes?state=${encodeURIComponent(state)}&category=${category}`
  );
  return (await res.json()).schemes;
}
