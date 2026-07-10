"use client";
import { useEffect, useState } from "react";
import { analytics, ModuleSummary } from "@/lib/api";
import { BarList, Donut, LegendDots, TrendArea } from "./charts";
import { Card, KpiCard, LiveBadge, Trend } from "./ui";

export default function ModuleDashboard({
  module,
  accent = "#6c63ff",
  breakdownTitle = "Category breakdown",
  hotspotTitle = "Priority zones",
}: {
  module: string;
  accent?: string;
  breakdownTitle?: string;
  hotspotTitle?: string;
}) {
  const [data, setData] = useState<ModuleSummary | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    analytics(module).then(setData).catch(() => setErr(true));
  }, [module]);

  if (err)
    return (
      <div className="text-sm p-4 rounded-xl" style={{ background: "#ff5c7218", color: "var(--red)" }}>
        Analytics service unavailable — start the backend on port 8000.
      </div>
    );

  if (!data)
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 110 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} accent={accent} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">{data.series.name} · 24h</div>
            <LiveBadge />
          </div>
          <TrendArea series={data.series} color={accent} />
        </Card>

        <Card>
          <div className="font-semibold mb-3">{breakdownTitle}</div>
          <Donut data={data.breakdown} />
          <LegendDots data={data.breakdown} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="font-semibold mb-3">Distribution</div>
          <BarList data={data.breakdown} color={accent} />
        </Card>
        <Card>
          <div className="font-semibold mb-3">{hotspotTitle}</div>
          <div className="flex flex-col gap-2">
            {data.hotspots.map((h) => (
              <div
                key={h.zone}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "var(--surface-2)" }}
              >
                <span className="text-sm font-medium">{h.zone}</span>
                <span className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{
                      background: `${accent}22`,
                      color: accent,
                    }}
                  >
                    {h.score}
                  </span>
                  <Trend trend={h.trend} />
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
