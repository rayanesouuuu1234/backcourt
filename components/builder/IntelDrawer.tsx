"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, SITES, SITE_LABEL, type BoardRow, type Site } from "@/lib/api";
import { miles, num, pct, signClass, signed } from "@/lib/format";

interface TeamDetail {
  team: BoardRow;
  games: { date: string; opp_name: string; site: Site; pts: number; opp_pts: number; win: number; quad: number; opp_rank: number; wab: number }[];
  history: { season: number; rating: number; rank: number; late: number }[];
}

export default function IntelDrawer({
  row,
  home,
  picked,
  onClose,
  onAdd,
}: {
  row: BoardRow;
  home: string;
  picked: boolean;
  onClose: () => void;
  onAdd: (site: Site) => void;
}) {
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    api<TeamDetail>(`/api/teams/${row.team_id}`).then(setDetail).catch((e) => setErr(String(e)));
  }, [row.team_id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const r = row;
  const notes: string[] = [];
  if (r.late_trend > 0.8) notes.push(`Finishes about ${r.late_trend.toFixed(1)} pts better than it starts. Play them early.`);
  if (r.late_trend < -0.8) notes.push(`Tends to fade by ${Math.abs(r.late_trend).toFixed(1)} pts. Later in the calendar is better.`);
  if (r.regression_risk === "high") notes.push("Veteran roster that lost a lot of minutes. Good bet to slide down from last year.");
  if (r.p_q1_A > 0.5 && r.p_q1_H < 0.3) notes.push("Q1 only if we go there. A road game turns a Q2 into a Q1 chance.");
  if (r.conf_mate) notes.push(`${home}'s conference opponent. Not available as a non-conference game.`);
  if (r.deal === "buy") notes.push("Likely a buy game: they come to us for a guarantee.");
  if (r.deal === "neutral_or_road") notes.push("Unlikely to come to McCamish without a return trip. Think neutral or road.");

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className="row">
            <div className="kicker">
              {r.conference} · {r.city}, {r.state} · {miles(r.miles)} mi
            </div>
            <button className="link-btn" onClick={onClose}>
              Close ✕
            </button>
          </div>
          <h2>{r.name}</h2>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {SITES.map((s) => (
              <button key={s} className="btn ghost" onClick={() => onAdd(s)} disabled={r.conf_mate}>
                {picked ? "Move to" : "Add"} {SITE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="drawer-body">
          <div className="kv">
            <div>
              <div className="k">Last season</div>
              <div className="v">#{Math.round(r.quad_rank)}</div>
              <div className="s">
                {r.w}-{r.l} · WAB {signed(r.wab)}
              </div>
            </div>
            <div>
              <div className="k">Rating</div>
              <div className={`v ${signClass(r.base_rating)}`}>{signed(r.base_rating)}</div>
              <div className="s">
                O {signed(r.off)} · D {signed(r.def)}
              </div>
            </div>
            <div>
              <div className="k">Projected</div>
              <div className="v">#{r.proj_rank}</div>
              <div className="s">
                likely #{Math.round(r.rank_p10)} to #{Math.round(r.rank_p90)}
              </div>
            </div>
            <div>
              <div className="k">Late trend</div>
              <div className={`v ${signClass(r.late_trend)}`}>{signed(r.late_trend, 2)}</div>
              <div className="s">pts start to finish</div>
            </div>
            <div>
              <div className="k">Continuity</div>
              <div className="v">{pct(r.continuity)}</div>
              <div className="s">
                exp {num(r.experience, 2)} yrs · <span className={`tag ${r.regression_risk}`}>{r.regression_risk}</span>
              </div>
            </div>
            <div>
              <div className="k">Their building</div>
              <div className="v">{signed(r.home_edge)}</div>
              <div className="s">home edge (pts)</div>
            </div>
          </div>

          {notes.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: 22 }}>
                Read
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text)" }}>
                {notes.map((n) => (
                  <li key={n} style={{ margin: "4px 0" }}>
                    {n}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="section-label" style={{ marginTop: 22 }}>
            By site, next season
          </div>
          <div className="site-grid">
            <div className="h" />
            {SITES.map((s) => (
              <div key={s} className="h top">
                {SITE_LABEL[s]}
              </div>
            ))}
            <div className="h">Quad (last yr)</div>
            {SITES.map((s) => (
              <div key={s}>
                <span className={`q ${r[`quad_${s}` as const]}`}>{r[`quad_${s}` as const]}</span>
              </div>
            ))}
            <div className="h">P(win)</div>
            {SITES.map((s) => (
              <div key={s}>{pct(r[`p_win_${s}` as const])}</div>
            ))}
            <div className="h">P(Q1)</div>
            {SITES.map((s) => (
              <div key={s}>{pct(r[`p_q1_${s}` as const])}</div>
            ))}
            <div className="h">P(Q4)</div>
            {SITES.map((s) => (
              <div key={s}>{pct(r[`p_q4_${s}` as const])}</div>
            ))}
            <div className="h">Exp WAB</div>
            {SITES.map((s) => (
              <div key={s} className={signClass(r[`exp_wab_${s}` as const])}>
                {signed(r[`exp_wab_${s}` as const], 2)}
              </div>
            ))}
            <div className="h">EV ± sd</div>
            {SITES.map((s) => (
              <div key={s} style={{ color: s === r.best_site ? "var(--gold-2)" : undefined }}>
                {signed(r[`ev_${s}` as const], 2)} <span style={{ color: "var(--dim)" }}>±{num(r[`sd_${s}` as const], 2)}</span>
              </div>
            ))}
          </div>

          {detail && detail.history.length > 1 && (
            <>
              <div className="section-label" style={{ marginTop: 22 }}>
                Rating by season
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={detail.history} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#1e3a69" strokeDasharray="2 4" />
                  <XAxis dataKey="season" tick={{ fill: "#8ea2c3", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#8ea2c3", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#0d1d3b", border: "1px solid #2a4b80", fontSize: 12 }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="rating" stroke="#d6c48a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          <div className="section-label" style={{ marginTop: 22 }}>
            Game log
          </div>
          {err && <div className="err">{err}</div>}
          {!detail && !err && (
            <div className="note">
              <span className="spin" /> loading
            </div>
          )}
          {detail && (
            <table className="mini">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th className="n">Opp rk</th>
                  <th className="n">Quad</th>
                  <th className="n">WAB</th>
                </tr>
              </thead>
              <tbody>
                {[...detail.games].reverse().map((g) => (
                  <tr key={`${g.date}-${g.opp_name}`}>
                    <td>{g.date.slice(5)}</td>
                    <td>
                      {g.site === "H" ? "vs" : g.site === "A" ? "at" : "n"} {g.opp_name}
                    </td>
                    <td className={g.win ? "w" : "lo"}>
                      {g.win ? "W" : "L"} {g.pts}-{g.opp_pts}
                    </td>
                    <td className="n">{Math.round(g.opp_rank)}</td>
                    <td className="n">
                      <span className={`q Q${g.quad}`}>Q{g.quad}</span>
                    </td>
                    <td className={`n ${signClass(g.wab)}`}>{signed(g.wab, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </aside>
    </>
  );
}
