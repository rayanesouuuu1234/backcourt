"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ApiError from "@/components/ApiError";
import Hero from "@/components/Hero";
import { useFetch } from "@/components/useFetch";
import { api, type LoadPlayer, type LoadStatus } from "@/lib/api";
import { num } from "@/lib/format";

type Row = Record<string, number | string | null>;

const MOVE = [
  { key: "accelerations", label: "Accelerations", color: "#3b82f6" },
  { key: "decelerations", label: "Decelerations", color: "#8b5cf6" },
  { key: "jumps", label: "Jumps", color: "#14b8a6" },
  { key: "sprints", label: "Sprints", color: "#f59e0b" },
  { key: "exertions", label: "Exertions", color: "#ef4444" },
];
const AX = { fill: "#8a8f99", fontSize: 10 };
const GRID = "#2a2e36";
const TIP = { background: "#1a1d23", border: "1px solid #2a2e36", fontSize: 12, color: "#c9ccd3" };
const last = (n: string) => n.split(" ").at(-1) ?? n;

function Gauge({ v, floor, target, red }: { v: number | null; floor: number; target: number; red: number }) {
  const max = Math.max(2, red + 0.3);
  const x = (n: number) => `${Math.min(n / max, 1) * 100}%`;
  return (
    <span className="gauge">
      <span className="band" style={{ left: x(floor), width: `calc(${x(target)} - ${x(floor)})` }} />
      {v != null && <span className="dot" style={{ left: x(v), background: v > red ? "#ef4444" : v > target || v < floor ? "#f59e0b" : "#e7ecf6" }} />}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="chart-card">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

export default function LoadPage() {
  const status = useFetch<LoadStatus>("/api/load/status");
  const sessions = useFetch<{ session_date: string; session: string; players: number }[]>("/api/load/sessions");
  const [pick, setPick] = useState<string>("");
  const [session, setSession] = useState<Row[] | null>(null);
  const [player, setPlayer] = useState<string | null>(null);
  const [series, setSeries] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!pick && sessions.data?.length) {
      // full practices make better charts than a shootaround, so default to the latest one
      const s = sessions.data.find((x) => !/shootaround/i.test(x.session)) ?? sessions.data[0];
      setPick(`${s.session_date}|${s.session}`);
    }
  }, [sessions.data, pick]);

  useEffect(() => {
    if (!pick) return;
    const [d, s] = pick.split("|");
    api<Row[]>(`/api/load/session?date=${d}&session=${encodeURIComponent(s)}`).then(setSession).catch(() => setSession(null));
  }, [pick]);

  useEffect(() => {
    if (!player && status.data?.players.length) setPlayer(status.data.players[0].player);
  }, [status.data, player]);

  useEffect(() => {
    if (!player) return;
    api<Row[]>(`/api/load/player/${encodeURIComponent(player)}`).then(setSeries).catch(() => setSeries(null));
  }, [player]);

  const counts = useMemo(() => {
    const c = { red: 0, amber: 0, green: 0, baseline: 0 };
    status.data?.players.forEach((p) => (c[p.status] += 1));
    return c;
  }, [status.data]);

  const sessionRows = useMemo(
    () =>
      (session ?? []).map((r) => {
        const total = MOVE.reduce((a, m) => a + (Number(r[m.key]) || 0), 0) || 1;
        const out: Row = { ...r, short: last(String(r.player)) };
        MOVE.forEach((m) => (out[`${m.key}_pct`] = ((Number(r[m.key]) || 0) / total) * 100));
        return out;
      }),
    [session],
  );

  const t = status.data?.thresholds;

  return (
    <>
      <Hero
        kicker="Kinexon · load management"
        title="Player Load"
        subtitle={status.data ? `Through ${status.data.through} · load metric: ${status.data.load_metric.replace("_", " ")}` : undefined}
      />
      {status.error && <ApiError message={status.error} />}
      {status.data && t && (
        <>
          <div className="status-cards">
            {(["red", "amber", "green", "baseline"] as const).map((k) => (
              <div key={k} className={`scard ${k}`}>
                <div className="v">{counts[k]}</div>
                <div className="k">{k === "baseline" ? "Building baseline" : k}</div>
              </div>
            ))}
          </div>

          <div className="table-wrap" style={{ maxHeight: "none", marginBottom: 24 }}>
            <table className="board">
              <thead>
                <tr>
                  <th className="l">Player</th>
                  <th className="c">Status</th>
                  <th>ACWR (EWMA)</th>
                  <th className="c" title={`Green band ${t.floor} to ${t.target}`}>
                    Range
                  </th>
                  <th>Rolling ACWR</th>
                  <th>Monotony</th>
                  <th>Strain</th>
                  <th>Last load</th>
                  <th title="Load for the next session that keeps EWMA ACWR inside the green band">Next session</th>
                  <th className="l">Note</th>
                </tr>
              </thead>
              <tbody>
                {status.data.players.map((p: LoadPlayer) => (
                  <tr key={p.player} onClick={() => setPlayer(p.player)} className={player === p.player ? "picked" : ""}>
                    <td className="l" style={{ fontFamily: "var(--sans)", fontWeight: 600 }}>
                      {p.player}
                    </td>
                    <td className="c">
                      <span className={`status ${p.status}`}>{p.status}</span>
                    </td>
                    <td>{num(p.acwr_ewma, 2)}</td>
                    <td className="c">
                      <Gauge v={p.acwr_ewma} floor={t.floor} target={t.target} red={t.red} />
                    </td>
                    <td>{num(p.acwr, 2)}</td>
                    <td>{num(p.monotony, 2)}</td>
                    <td>{num(p.strain, 0)}</td>
                    <td>{num(p.last_load, 0)}</td>
                    <td>
                      {num(p.next_min, 0)} – {num(p.next_max, 0)}
                      {p.next_max_pct_typical != null && <span style={{ color: "var(--dim)", fontSize: 11 }}> ({num(p.next_max_pct_typical, 0)}% typ.)</span>}
                    </td>
                    <td className="l" style={{ color: "var(--muted)", fontFamily: "var(--sans)" }}>
                      {p.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {series && player && (
            <div className="chart-card" style={{ marginBottom: 24 }}>
              <div className="chart-title">{player}: daily load, EWMA acute / chronic, and ACWR</div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={series} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" tick={AX} tickFormatter={(d: string) => d.slice(5)} minTickGap={18} />
                  <YAxis yAxisId="l" tick={AX} />
                  <YAxis yAxisId="r" orientation="right" tick={AX} domain={[0, 2.2]} />
                  <ReferenceArea yAxisId="r" y1={t.floor} y2={t.target} fill="#22c55e" fillOpacity={0.07} />
                  <Tooltip contentStyle={TIP} formatter={(v) => num(Number(v), 2)} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#c9ccd3" }} />
                  <Bar isAnimationActive={false} yAxisId="l" dataKey="load" name="Daily load" fill="#3b4252" />
                  <Line isAnimationActive={false} yAxisId="l" dataKey="ewma_acute" name="Acute (7d EWMA)" stroke="#f59e0b" dot={false} strokeWidth={2} />
                  <Line isAnimationActive={false} yAxisId="l" dataKey="ewma_chronic" name="Chronic (28d EWMA)" stroke="#3b82f6" dot={false} strokeWidth={2} />
                  <Line isAnimationActive={false} yAxisId="r" dataKey="acwr_ewma" name="ACWR" stroke="#b3a369" strokeDasharray="5 4" dot={false} strokeWidth={1.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="row" style={{ marginBottom: 10 }}>
            <div className="section-label" style={{ margin: 0 }}>
              Session
            </div>
            <select className="select" value={pick} onChange={(e) => setPick(e.target.value)}>
              {(sessions.data ?? []).map((s) => (
                <option key={`${s.session_date}|${s.session}`} value={`${s.session_date}|${s.session}`}>
                  {s.session_date} · {s.session} ({s.players})
                </option>
              ))}
            </select>
          </div>

          {sessionRows.length > 0 && (
            <>
              <div className="chart-title">Group A: Movement Performance</div>
              <div className="chart-grid" style={{ marginBottom: 20 }}>
                <Card title="Movement Load per Player">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sessionRows} margin={{ top: 4, right: 4, left: -16, bottom: 30 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="short" tick={AX} angle={-40} textAnchor="end" interval={0} />
                      <YAxis tick={AX} />
                      <Tooltip contentStyle={TIP} />
                      {MOVE.map((m) => (
                        <Bar isAnimationActive={false} key={m.key} dataKey={m.key} name={m.label} fill={m.color} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="Proportional Activity Breakdown">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sessionRows} margin={{ top: 4, right: 4, left: 0, bottom: 30 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="short" tick={AX} angle={-40} textAnchor="end" interval={0} />
                      <YAxis tick={AX} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                      <Tooltip contentStyle={TIP} formatter={(v) => `${Number(v).toFixed(0)}%`} />
                      {MOVE.map((m) => (
                        <Bar isAnimationActive={false} key={m.key} dataKey={`${m.key}_pct`} name={m.label} stackId="a" fill={m.color} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="Jumps vs Sprints">
                  <ResponsiveContainer width="100%" height={260}>
                    <ScatterChart margin={{ top: 10, right: 20, left: -16, bottom: 10 }}>
                      <CartesianGrid stroke={GRID} />
                      <XAxis type="number" dataKey="sprints" name="Sprints" tick={AX} />
                      <YAxis type="number" dataKey="jumps" name="Jumps" tick={AX} />
                      <Tooltip contentStyle={TIP} />
                      <Scatter isAnimationActive={false} data={sessionRows} fill="#3b82f6">
                        <LabelList dataKey="short" position="top" style={{ fill: "#8a8f99", fontSize: 9 }} />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <div className="chart-title">Group B: Metabolic &amp; Distance Performance</div>
              <div className="chart-grid">
                <Card title="Metabolic Power vs Distance">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sessionRows} margin={{ top: 4, right: 0, left: -10, bottom: 30 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="short" tick={AX} angle={-40} textAnchor="end" interval={0} />
                      <YAxis yAxisId="l" tick={AX} />
                      <YAxis yAxisId="r" orientation="right" tick={AX} />
                      <Tooltip contentStyle={TIP} formatter={(v) => num(Number(v), 0)} />
                      <Bar isAnimationActive={false} yAxisId="l" dataKey="metabolic_power_w" name="Metabolic power (W)" fill="#3b82f6" />
                      <Bar isAnimationActive={false} yAxisId="r" dataKey="distance_ft" name="Distance (ft)" fill="#14b8a6" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="Average Speed (mph)">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sessionRows} margin={{ top: 14, right: 4, left: -16, bottom: 30 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="short" tick={AX} angle={-40} textAnchor="end" interval={0} />
                      <YAxis tick={AX} />
                      <Tooltip contentStyle={TIP} formatter={(v) => num(Number(v), 2)} />
                      <Bar isAnimationActive={false} dataKey="speed_avg_mph" name="Avg speed (mph)" fill="#f59e0b">
                        <LabelList dataKey="speed_avg_mph" position="top" formatter={(v) => num(Number(v), 1)} style={{ fill: "#c9ccd3", fontSize: 9 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="Metabolic Power per kg">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sessionRows} margin={{ top: 14, right: 4, left: -16, bottom: 30 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="short" tick={AX} angle={-40} textAnchor="end" interval={0} />
                      <YAxis tick={AX} />
                      <Tooltip contentStyle={TIP} formatter={(v) => num(Number(v), 2)} />
                      <Bar isAnimationActive={false} dataKey="metabolic_power_wkg" name="W/kg" fill="#ef4444">
                        <LabelList dataKey="metabolic_power_wkg" position="top" formatter={(v) => num(Number(v), 1)} style={{ fill: "#c9ccd3", fontSize: 9 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </>
          )}
          {status.data.errors.length > 0 && (
            <div className="err" style={{ marginTop: 16 }}>
              Skipped files: {status.data.errors.join(" · ")}
            </div>
          )}
        </>
      )}
    </>
  );
}
