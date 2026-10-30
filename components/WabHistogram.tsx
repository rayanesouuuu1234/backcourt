"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Hist } from "@/lib/api";

export default function WabHistogram({ hist, height = 110, label = "WAB" }: { hist: Hist; height?: number; label?: string }) {
  const total = hist.counts.reduce((a, b) => a + b, 0) || 1;
  const data = hist.counts.map((c, i) => {
    const mid = (hist.edges[i] + hist.edges[i + 1]) / 2;
    return { x: Math.round(mid * 10) / 10, share: c / total };
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="x" tick={{ fill: "#8ea2c3", fontSize: 10 }} axisLine={{ stroke: "#1e3a69" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,.04)" }}
          contentStyle={{ background: "#0d1d3b", border: "1px solid #2a4b80", fontSize: 12 }}
          formatter={(v) => [`${(Number(v) * 100).toFixed(1)}% of seasons`, ""]}
          labelFormatter={(l) => `${label} ≈ ${l}`}
        />
        <Bar dataKey="share" isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.x} fill={d.x >= 0 ? "#b3a369" : "#4a5f86"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
