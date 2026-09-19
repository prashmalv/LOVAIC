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
    linePos?: number;
    roi?: { x: number; y: number; w: number; h: number } | null;
    gender?: boolean;
  } = {}
): string {
  const p = new URLSearchParams({ src, mode, conf: String(opts.conf ?? 0.35) });
  if (opts.count) {
    p.set("count", "true");
    p.set("line", opts.line ?? "horizontal");
    if (opts.linePos != null) p.set("line_pos", opts.linePos.toFixed(3));
  }
  if (opts.seg) p.set("seg", "true");
  if (opts.privacy) p.set("privacy", "true");
  if (opts.gender) p.set("gender", "true");
  if (opts.classes && opts.classes.trim()) p.set("classes", opts.classes.trim());
  if (opts.roi) {
    const r = opts.roi;
    p.set("roi", [r.x, r.y, r.x + r.w, r.y + r.h].map((n) => n.toFixed(3)).join(","));
  }
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

// --- LOVAIC SLM (sovereign vision-language model) -------------------------

export interface VlmResult {
  text: string;
  tier?: string;
  error?: boolean;
}

export async function analyzeVLM(file: File, prompt: string, tier = "lite"): Promise<VlmResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("prompt", prompt);
  fd.append("tier", tier);
  const res = await fetch(`${API_BASE}/api/vlm`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`LOVAIC SLM failed (${res.status})`);
  return res.json();
}

export async function analyzeVLMFrame(
  src: string, prompt: string, mode: string, tier = "lite"
): Promise<VlmResult> {
  const p = new URLSearchParams({ src, prompt, mode, tier });
  const res = await fetch(`${API_BASE}/api/vlm-frame?${p.toString()}`);
  if (!res.ok) throw new Error(`LOVAIC SLM failed (${res.status})`);
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
  gender?: boolean;
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
  if (opts.gender) fd.append("gender", "true");
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

// --- NVR / IP-camera discovery --------------------------------------------

export interface DiscoveredCamera {
  channel: number;
  name: string;
  url: string;
  display_url: string;
  codec: string;
  width: number;
  height: number;
  fps: number;
}

export interface DiscoverResult {
  ok: boolean;
  error?: string;
  host?: string;
  vendor?: string;
  vendor_label?: string;
  scanned?: number;
  found?: number;
  private?: boolean;
  cameras: DiscoveredCamera[];
  note?: string | null;
}

export async function discoverCameras(form: {
  host: string;
  user?: string;
  pwd?: string;
  rtsp_port?: number;
  channels?: number;
  vendor?: string;
  sub?: number;
}): Promise<DiscoverResult> {
  const fd = new FormData();
  fd.append("host", form.host);
  fd.append("user", form.user ?? "");
  fd.append("pwd", form.pwd ?? "");
  fd.append("rtsp_port", String(form.rtsp_port ?? 554));
  fd.append("channels", String(form.channels ?? 16));
  fd.append("vendor", form.vendor ?? "dahua");
  fd.append("sub", String(form.sub ?? 0));
  const res = await fetch(`${API_BASE}/api/discover`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`discover failed (${res.status})`);
  return res.json();
}

// --- Yum! India: POS Intelligence + Store Performance Copilot -------------

export interface YumInsights {
  generated_at: string;
  source_files: string[];
  store_raw: {
    store: {
      id: string | number;
      city: string;
      class: string;
      type: string;
      date_from: string;
      date_to: string;
    };
    kpis: {
      total_sales: number;
      total_sales_fmt: string;
      transactions: number;
      line_items: number;
      units_sold: number;
      aov: number;
      aov_fmt: string;
      basket_size: number;
      unique_skus: number;
    };
    hours: { hour: number; sales: number; txns: number }[];
    peak_hour: number;
    months: { name: string; value: number }[];
    categories: { name: string; value: number; share: number }[];
    brands: { name: string; value: number }[];
    top_items: { name: string; revenue: number; qty: number; category: string }[];
    slow_movers: { name: string; qty: number; revenue: number; category: string }[];
    discount: {
      lines_discounted: number;
      discount_value: number;
      discount_value_fmt: string;
      overcharge_lines: number;
      discount_pct_of_lines: number;
    };
  };
  sales_sample: {
    lines: number;
    total_sales: number;
    cities: { name: string; value: number; txns: number }[];
    credit_share_pct: number;
    credit_value: number;
    credit_value_fmt: string;
    price_anomalies: number;
  };
  inward: {
    lines: number;
    orders: number;
    total_inward: number;
    total_inward_fmt: string;
    po_count: number;
    avg_margin_pct: number;
    best_margin: { name: string; purchase: number; mrp: number; margin_pct: number; qty: number }[];
    worst_margin: { name: string; purchase: number; mrp: number; margin_pct: number; qty: number }[];
  };
  classification: { city: string; billed_stores: number; a: number; b: number; c: number }[];
}

export interface YumCopilotAnswer {
  question: string;
  answer: string;
  recommendations: string[];
  metrics: { label: string; value: string }[];
  chart: string;
  source: string;
  suggested: string[];
}

export async function yumInsights(): Promise<YumInsights> {
  const res = await fetch(`${API_BASE}/api/yum/insights`);
  if (!res.ok) throw new Error("yum insights failed");
  return res.json();
}

export async function yumCopilot(q: string): Promise<YumCopilotAnswer> {
  const res = await fetch(`${API_BASE}/api/yum/copilot?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("yum copilot failed");
  return res.json();
}
