"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ApiError from "@/components/ApiError";
import Hero from "@/components/Hero";
import { useFetch } from "@/components/useFetch";
import WabHistogram from "@/components/WabHistogram";
import { post, type BoardRow, type Meta, type PlanResult, type SlotCfg } from "@/lib/api";
import { miles, num, pct, shortDate, signed } from "@/lib/format";
import { useLedger } from "@/lib/ledger";

interface Settings {
  objective: "at_large" | "resume_points";
  risk_aversion: number;
  travel_ceiling_mi: number;
  max_total_travel_mi: number;
  max_per_conference: number;
  min_q1_chances: number;
  max_q4_games: number;
  respect_deal_types: boolean;
}

function Slider({ label, value, min, max, step, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  return (
    <div className="field">
      <div className="row">
        <label>{label}</label>
        <span>{fmt ? fmt(value) : value}</span>
      </div>
      <input className="range" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export default function OptimizerPage() {
  const meta = useFetch<Meta>("/api/meta");
  const board = useFetch<BoardRow[]>("/api/board");
  const { save } = useLedger();
  const [slots, setSlots] = useState<SlotCfg[]>([]);
  const [s, setS] = useState<Settings | null>(null);
  const [res, setRes] = useState<PlanResult | null>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const m = meta.data;
    if (!m) return;
    setSlots(m.optimizer.slots.map((x) => ({ date: x.date, site: x.site, locked_team: null })));
    setS({
      objective: "at_large",
      risk_aversion: m.optimizer.risk_aversion,
      travel_ceiling_mi: m.optimizer.travel_ceiling_mi,
      max_total_travel_mi: m.optimizer.max_total_travel_mi,
      max_per_conference: m.optimizer.max_per_conference,
      min_q1_chances: m.optimizer.min_q1_chances,
      max_q4_games: m.optimizer.max_q4_games,
      respect_deal_types: m.optimizer.respect_deal_types,
    });
  }, [meta.data]);

  const teams = useMemo(
    () => (board.data ?? []).filter((r) => !r.conf_mate).sort((a, b) => a.name.localeCompare(b.name)),
    [board.data],
  );

  const run = async () => {
    if (!s) return;
    setRunning(true);
    setErr(null);
    setSent(false);
    try {
      const { objective, ...settings } = s;
      const out = await post<PlanResult>("/api/optimize", { slots, settings, objective });
      if (!out.games.length) throw new Error(out.status);
      setRes(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const setSlot = (i: number, patch: Partial<SlotCfg>) => setSlots(slots.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const frontier = (res?.frontier ?? []).filter((f) => f.at_large != null).map((f) => ({ ...f, at_large: (f.at_large ?? 0) * 100 }));

  return (
    <>
      <Hero kicker="Schedule optimizer" title="Optimizer" subtitle="Fills every open non-conference slot to give us the best shot at an at-large bid" />
      {(meta.error || board.error) && <ApiError message={(meta.error ?? board.error)!} />}
      {meta.data && s && (
        <div className="two" style={{ gridTemplateColumns: "420px minmax(0,1fr)" }}>
          <aside className="panel corners">
            <div className="panel-head">
              <div>
                <div className="kicker">Constraints</div>
                <h3>Setup</h3>
              </div>
            </div>
            <div className="panel-body">
              <div className="section-label">Goal</div>
              <div className="seg" style={{ marginBottom: 6 }}>
                <button className={s.objective === "at_large" ? "on" : ""} onClick={() => setS({ ...s, objective: "at_large" })}>
                  AT-LARGE ODDS
                </button>
                <button className={s.objective === "resume_points" ? "on" : ""} onClick={() => setS({ ...s, objective: "resume_points" })}>
                  RESUME POINTS
                </button>
              </div>
              <div className="hint">
                {s.objective === "at_large"
                  ? "Tries a range of risk levels, plays each schedule out across thousands of seasons, keeps the one with the best odds."
                  : "Maximizes expected resume points minus risk aversion × variance, at the risk level below."}
              </div>

              <div className="grid-form" style={{ marginTop: 10 }}>
                {s.objective === "resume_points" && (
                  <Slider label="Risk aversion" value={s.risk_aversion} min={-0.5} max={1} step={0.05} onChange={(v) => setS({ ...s, risk_aversion: v })} fmt={(v) => v.toFixed(2)} />
                )}
                <Slider label="Travel ceiling" value={s.travel_ceiling_mi} min={300} max={5000} step={100} onChange={(v) => setS({ ...s, travel_ceiling_mi: v })} fmt={(v) => `${v.toLocaleString()} mi`} />
                <Slider label="Season trip budget" value={s.max_total_travel_mi} min={0} max={15000} step={250} onChange={(v) => setS({ ...s, max_total_travel_mi: v })} fmt={(v) => `${v.toLocaleString()} mi`} />
                <Slider label="Max per conference" value={s.max_per_conference} min={1} max={5} step={1} onChange={(v) => setS({ ...s, max_per_conference: v })} />
                <Slider label="Min Q1 chances" value={s.min_q1_chances} min={0} max={8} step={0.5} onChange={(v) => setS({ ...s, min_q1_chances: v })} />
                <Slider label="Max Q4 games" value={s.max_q4_games} min={0} max={8} step={0.5} onChange={(v) => setS({ ...s, max_q4_games: v })} />
              </div>
              <label className="check" style={{ marginTop: 12 }}>
                <input type="checkbox" checked={s.respect_deal_types} onChange={(e) => setS({ ...s, respect_deal_types: e.target.checked })} />
                Only sites a deal would realistically allow
              </label>

              <div className="section-label" style={{ marginTop: 20 }}>
                Slots
              </div>
              <table className="mini">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Site</th>
                    <th>Lock opponent</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((x, i) => (
                    <tr key={i}>
                      <td>
                        <input className="select" type="date" value={x.date} onChange={(e) => setSlot(i, { date: e.target.value })} style={{ width: 132 }} />
                      </td>
                      <td>
                        <select className="select" value={x.site} onChange={(e) => setSlot(i, { site: e.target.value as SlotCfg["site"] })}>
                          {["any", "H", "N", "A"].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="select" value={x.locked_team ?? ""} onChange={(e) => setSlot(i, { locked_team: e.target.value || null })} style={{ maxWidth: 150 }}>
                          <option value="">open</option>
                          {teams.map((t) => (
                            <option key={t.team_id} value={t.team_id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn ghost" onClick={() => setSlots([...slots, { date: slots.at(-1)?.date ?? meta.data!.reference_date, site: "any", locked_team: null }])}>
                  + Slot
                </button>
                {slots.length > 1 && (
                  <button className="btn ghost" onClick={() => setSlots(slots.slice(0, -1))}>
                    − Slot
                  </button>
                )}
              </div>
              <button className="btn" style={{ width: "100%", marginTop: 18 }} onClick={run} disabled={running}>
                {running ? (
                  <>
                    <span className="spin" /> Solving
                  </>
                ) : (
                  "Optimize schedule"
                )}
              </button>
            </div>
          </aside>

          <section>
            {err && <div className="err" style={{ marginBottom: 14 }}>{err}</div>}
            {!res && !err && (
              <div className="panel" style={{ padding: 40, textAlign: "center" }}>
                <div className="kicker">Ready</div>
                <p className="note" style={{ maxWidth: 520, margin: "10px auto 0" }}>
                  Set the slots and limits, then optimize. The solver picks one opponent per slot from {teams.length} eligible programs, then the
                  whole season (including the {meta.data.conference_games.length} conference games) gets simulated so the odds are apples to apples.
                </p>
              </div>
            )}
            {res && res.season && (
              <>
                <div className="kv" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 14 }}>
                  <div>
                    <div className="k">At-large odds</div>
                    <div className="v" style={{ fontSize: 34, color: "var(--gold-2)" }}>{pct(res.season.at_large)}</div>
                  </div>
                  <div>
                    <div className="k">Full season</div>
                    <div className="v">
                      {num(res.season.exp_wins, 1)}–{num(res.season.exp_losses, 1)}
                    </div>
                  </div>
                  <div>
                    <div className="k">WAB</div>
                    <div className="v">{signed(res.season.wab_mean)}</div>
                    <div className="s">
                      {signed(res.season.wab_p10)} to {signed(res.season.wab_p90)}
                    </div>
                  </div>
                  <div>
                    <div className="k">Q1 wins</div>
                    <div className="v">{num(res.season.q1_wins_mean, 1)}</div>
                  </div>
                  <div>
                    <div className="k">Trip miles</div>
                    <div className="v">{miles(res.totals?.trip_miles)}</div>
                  </div>
                </div>

                <div className="table-wrap" style={{ maxHeight: "none" }}>
                  <table className="board">
                    <thead>
                      <tr>
                        <th className="l">Date</th>
                        <th className="l">Opponent</th>
                        <th className="c">Site</th>
                        <th>Proj</th>
                        <th>P(Win)</th>
                        <th>P(Q1)</th>
                        <th>P(Q4)</th>
                        <th>Exp WAB</th>
                        <th>EV</th>
                        <th>Miles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.games.map((g) => (
                        <tr key={`${g.slot}-${g.team_id}`} style={{ cursor: "default" }}>
                          <td className="l">{shortDate(g.date)}</td>
                          <td className="l">
                            <div className="prog">
                              {g.name} {g.locked && <span className="tag">locked</span>}
                              <small>{g.conference}</small>
                            </div>
                          </td>
                          <td className="c">{g.site}</td>
                          <td>#{g.proj_rank}</td>
                          <td>{pct(g.p_win)}</td>
                          <td>{pct(g.p_q1)}</td>
                          <td>{pct(g.p_q4)}</td>
                          <td className={g.exp_wab >= 0 ? "pos" : "neg"}>{signed(g.exp_wab, 2)}</td>
                          <td>{signed(g.ev, 2)}</td>
                          <td>{miles(g.trip_miles)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", gap: 10, margin: "12px 0 22px", alignItems: "center" }}>
                  <button
                    className="btn"
                    onClick={() => {
                      save(res.games.map((g) => ({ team_id: g.team_id, name: g.name, conference: g.conference, site: g.site, date: g.date })));
                      setSent(true);
                    }}
                  >
                    Send to Schedule Builder
                  </button>
                  {sent && <span className="note">Saved. Open Schedule Builder to tweak it.</span>}
                </div>

                <div className="chart-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="panel" style={{ padding: 14 }}>
                    <div className="section-label">WAB across simulated seasons</div>
                    <WabHistogram hist={res.season.wab_hist} height={200} />
                  </div>
                  <div className="panel" style={{ padding: 14 }}>
                    <div className="section-label">Risk setting vs at-large odds</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={frontier} margin={{ top: 8, right: 14, left: -10, bottom: 0 }}>
                        <CartesianGrid stroke="#1e3a69" strokeDasharray="2 4" />
                        <XAxis dataKey="risk_aversion" tick={{ fill: "#8ea2c3", fontSize: 11 }} label={{ value: "← more variance · less →", fill: "#5f7598", fontSize: 10, position: "insideBottom", dy: 8 }} />
                        <YAxis tick={{ fill: "#8ea2c3", fontSize: 11 }} unit="%" domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ background: "#0d1d3b", border: "1px solid #2a4b80", fontSize: 12 }} formatter={(v) => `${Number(v).toFixed(1)}%`} />
                        <Line isAnimationActive={false} type="monotone" dataKey="at_large" stroke="#d6c48a" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    {res.risk_aversion != null && (
                      <div className="hint">Picked risk setting {res.risk_aversion.toFixed(2)}. Negative means the plan leans into coin-flip games.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
