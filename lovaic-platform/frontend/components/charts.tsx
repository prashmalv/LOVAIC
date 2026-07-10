"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Breakdown, Series } from "@/lib/api";

const PALETTE = ["#6c63ff", "#23d0c5", "#ff6584", "#ffb347", "#4d9dff", "#22e0a1"];

const tooltipStyle = {
  background: "#12162a",
  border: "1px solid #262c4a",
  borderRadius: 12,
  color: "#f2f4fb",
  fontSize: 12,
};

export function TrendArea({ series, color = "#6c63ff" }: { series: Series; color?: string }) {
  const data = series.hours.map((h, i) => ({ hour: h, value: series.values[i] }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="hour"
          tick={{ fill: "#5f6690", fontSize: 10 }}
          interval={3}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fill: "#5f6690", fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: color, strokeOpacity: 0.2 }} />
        <Area
          type="monotone"
          dataKey="value"
          name={series.name}
          stroke={color}
          strokeWidth={2}
          fill={`url(#g-${color})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data }: { data: Breakdown[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BarList({ data, color = "#23d0c5" }: { data: Breakdown[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#9aa0c0", fontSize: 11 }}
          width={110}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LegendDots({ data }: { data: Breakdown[] }) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: PALETTE[i % PALETTE.length],
                display: "inline-block",
              }}
            />
            {d.name}
          </span>
          <span className="font-semibold">{d.value}%</span>
        </div>
      ))}
    </div>
  );
}
