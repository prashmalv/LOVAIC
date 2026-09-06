"use client";
import { useEffect, useRef } from "react";

export interface Zone {
  linePos: number; // 0-1 along the perpendicular axis
  roi: { x: number; y: number; w: number; h: number } | null; // normalized 0-1
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/**
 * Interactive overlay drawn on top of a feed image:
 *  - drag the counting line anywhere (when `count`)
 *  - draw a detection ROI by dragging on empty space; move it by dragging the
 *    body; resize via the 4 corner handles.
 * Coordinates are normalized 0-1 and reported through onChange.
 */
export default function ZoneEditor({
  orientation,
  count,
  value,
  onChange,
  accent = "#6c63ff",
}: {
  orientation: "horizontal" | "vertical";
  count: boolean;
  value: Zone;
  onChange: (z: Zone) => void;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const valRef = useRef(value);
  valRef.current = value;
  const drag = useRef<null | { type: string; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; px: number; py: number }>(null);

  const norm = (e: PointerEvent | React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const p = norm(e);
      const v = valRef.current;
      if (d.type === "line") {
        onChange({ ...v, linePos: clamp(orientation === "horizontal" ? p.y : p.x, 0.02, 0.98) });
      } else if (d.type === "new") {
        onChange({ ...v, roi: { x: Math.min(d.sx, p.x), y: Math.min(d.sy, p.y), w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy) } });
      } else if (d.type === "move" && v.roi) {
        onChange({ ...v, roi: { ...v.roi, x: clamp(d.ox + (p.x - d.px), 0, 1 - v.roi.w), y: clamp(d.oy + (p.y - d.py), 0, 1 - v.roi.h) } });
      } else if (d.type.startsWith("rz") && v.roi) {
        let { x, y, w, h } = { x: d.ox, y: d.oy, w: d.ow, h: d.oh };
        const right = d.ox + d.ow, bottom = d.oy + d.oh;
        if (d.type.includes("e")) w = clamp(p.x - x, 0.03, 1 - x);
        if (d.type.includes("s")) h = clamp(p.y - y, 0.03, 1 - y);
        if (d.type.includes("w")) { x = clamp(p.x, 0, right - 0.03); w = right - x; }
        if (d.type.includes("n")) { y = clamp(p.y, 0, bottom - 0.03); h = bottom - y; }
        onChange({ ...v, roi: { x, y, w, h } });
      }
    };
    const up = () => (drag.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation]);

  const startNew = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return; // let handles win
    const p = norm(e);
    drag.current = { type: "new", sx: p.x, sy: p.y, ox: 0, oy: 0, ow: 0, oh: 0, px: p.x, py: p.y };
  };

  const roi = value.roi;
  const pct = (n: number) => `${n * 100}%`;
  const handle = (t: string, x: number, y: number) => (
    <div
      data-handle="1"
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!roi) return;
        drag.current = { type: `rz-${t}`, sx: 0, sy: 0, ox: roi.x, oy: roi.y, ow: roi.w, oh: roi.h, px: 0, py: 0 };
      }}
      style={{
        position: "absolute", left: pct(x), top: pct(y), width: 12, height: 12,
        marginLeft: -6, marginTop: -6, borderRadius: 3, background: accent,
        border: "2px solid #fff", cursor: `${t}-resize`, touchAction: "none",
      }}
    />
  );

  return (
    <div
      ref={ref}
      onPointerDown={startNew}
      style={{ position: "absolute", inset: 0, cursor: "crosshair", touchAction: "none" }}
    >
      {/* counting line */}
      {count && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            drag.current = { type: "line", sx: 0, sy: 0, ox: 0, oy: 0, ow: 0, oh: 0, px: 0, py: 0 };
          }}
          style={
            orientation === "horizontal"
              ? { position: "absolute", left: 0, right: 0, top: pct(value.linePos), height: 3, marginTop: -1, background: accent, cursor: "ns-resize", boxShadow: "0 0 6px rgba(0,0,0,.6)", touchAction: "none" }
              : { position: "absolute", top: 0, bottom: 0, left: pct(value.linePos), width: 3, marginLeft: -1, background: accent, cursor: "ew-resize", boxShadow: "0 0 6px rgba(0,0,0,.6)", touchAction: "none" }
          }
        >
          <span style={{ position: "absolute", background: accent, color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 4, ...(orientation === "horizontal" ? { left: 8, top: -18 } : { top: 8, left: 6 }) }}>
            counting line — drag
          </span>
        </div>
      )}

      {/* ROI rectangle */}
      {roi && roi.w > 0 && roi.h > 0 && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            const p = norm(e);
            drag.current = { type: "move", sx: 0, sy: 0, ox: roi.x, oy: roi.y, ow: roi.w, oh: roi.h, px: p.x, py: p.y };
          }}
          style={{
            position: "absolute", left: pct(roi.x), top: pct(roi.y), width: pct(roi.w), height: pct(roi.h),
            border: `2px solid ${accent}`, background: `${accent}18`, cursor: "move", touchAction: "none",
          }}
        >
          <span style={{ position: "absolute", top: -18, left: 0, background: accent, color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 4 }}>
            detection zone
          </span>
          {handle("nw", roi.x, roi.y)}
          {handle("ne", roi.x + roi.w, roi.y)}
          {handle("sw", roi.x, roi.y + roi.h)}
          {handle("se", roi.x + roi.w, roi.y + roi.h)}
        </div>
      )}
    </div>
  );
}
