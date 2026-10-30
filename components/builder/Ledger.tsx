"use client";

import type { BoardRow, Meta, SeasonSim, Site } from "@/lib/api";
import { SITES } from "@/lib/api";
import { num, pct, shortDate, signed } from "@/lib/format";
import type { LedgerItem } from "@/lib/ledger";
import WabHistogram from "../WabHistogram";

export function tripMiles(r: BoardRow | undefined, s: Site) {
  if (!r) return 0;
  return s === "A" ? r.miles : s === "N" ? r.miles / 2 : 0;
}

export default function Ledger({
  meta,
  items,
  byId,
  sim,
  simLoading,
  onChange,
  onFill,
  filling,
}: {
  meta: Meta;
  items: LedgerItem[];
  byId: Map<string, BoardRow>;
  sim: SeasonSim | null;
  simLoading: boolean;
  onChange: (items: LedgerItem[]) => void;
  onFill: () => void;
  filling: boolean;
}) {
  const slots = meta.optimizer.slots;
  const q1 = items.reduce((a, it) => a + (byId.get(it.team_id)?.[`p_q1_${it.site}` as const] ?? 0), 0);
  const away = items.reduce((a, it) => a + tripMiles(byId.get(it.team_id), it.site), 0);
  const avgRank = items.length ? items.reduce((a, it) => a + (byId.get(it.team_id)?.proj_rank ?? 0), 0) / items.length : null;

  const update = (i: number, patch: Partial<LedgerItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const sorted = items.map((it, i) => ({ it, i })).sort((a, b) => a.it.date.localeCompare(b.it.date));

  return (
    <aside className="panel corners sticky ledger">
      <div className="panel-head">
        <div>
          <div className="kicker">Board</div>
          <h3>Schedule</h3>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ font: "700 30px/1 var(--display)", color: "var(--gold-2)" }}>
            {String(items.length).padStart(2, "0")}
            <span style={{ fontSize: 16, color: "var(--muted)" }}>/{slots.length}</span>
          </div>
          <div className="kicker" style={{ fontSize: 9 }}>
            Slots
          </div>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="v">{num(q1, 1)}</div>
          <div className="k">Q1 chances</div>
        </div>
        <div className="tile">
          <div className="v">{Math.round(away).toLocaleString()}</div>
          <div className="k">Trip mi</div>
        </div>
        <div className="tile">
          <div className="v">{avgRank ? `#${Math.round(avgRank)}` : "–"}</div>
          <div className="k">Avg proj rk</div>
        </div>
      </div>

      {sim && (
        <>
          <div className="odds">
            <div>
              <div className="kicker" style={{ marginBottom: 4 }}>
                At-large odds
              </div>
              <div className="big">
                {Math.round(sim.at_large * 100)}
                <small>%</small>
              </div>
            </div>
            <div className="lines">
              <div>
                Full season <b>{num(sim.exp_wins, 1)}–{num(sim.exp_losses, 1)}</b>
              </div>
              <div>
                WAB <b>{signed(sim.wab_mean)}</b>
              </div>
              <div>
                WAB 80%{" "}
                <b>
                  {signed(sim.wab_p10)} / {signed(sim.wab_p90)}
                </b>
              </div>
              <div>
                Q1 wins <b>{num(sim.q1_wins_mean, 1)}</b>
              </div>
              <div>
                Q3/Q4 losses <b>{num(sim.bad_losses_mean, 1)}</b>
              </div>
            </div>
          </div>
          <div style={{ padding: "8px 14px 4px", borderBottom: "1px solid var(--line)" }}>
            <div className="kicker" style={{ fontSize: 9 }}>
              Where WAB lands across {sim.games}-game seasons {simLoading && <span className="spin" />}
            </div>
            <WabHistogram hist={sim.wab_hist} />
          </div>
        </>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <div className="hex">
            <span>+</span>
          </div>
          <b>Empty ledger.</b>
          Pick up opponents from the board with ◇, or let the optimizer fill it.
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {sorted.map(({ it, i }) => {
            const r = byId.get(it.team_id);
            return (
              <div className="pick" key={`${it.team_id}-${i}`}>
                <div>
                  <div className="nm">{it.name}</div>
                  <div className="meta">
                    {it.conference} · proj #{r?.proj_rank ?? "?"} · win {pct(r?.[`p_win_${it.site}` as const])} · Q1{" "}
                    {pct(r?.[`p_q1_${it.site}` as const])}
                  </div>
                </div>
                <button className="x-btn" title="Remove" onClick={() => remove(i)}>
                  ×
                </button>
                <div className="ctrl">
                  <select className="select" value={it.date} onChange={(e) => update(i, { date: e.target.value })}>
                    {Array.from(new Set([it.date, ...slots.map((s) => s.date)])).sort().map((d) => (
                      <option key={d} value={d}>
                        {shortDate(d)}
                      </option>
                    ))}
                  </select>
                  <div className="seg">
                    {SITES.map((s) => (
                      <button key={s} className={it.site === s ? "on" : ""} onClick={() => update(i, { site: s })}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: 14, display: "flex", gap: 8, borderTop: "1px solid var(--line)" }}>
        <button className="btn" style={{ flex: 1 }} onClick={onFill} disabled={filling}>
          {filling ? (
            <>
              <span className="spin" /> Optimizing
            </>
          ) : items.length ? (
            "Fill open slots"
          ) : (
            "Build with optimizer"
          )}
        </button>
        {items.length > 0 && (
          <button className="btn ghost" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      <div className="hint" style={{ padding: "0 14px 14px" }}>
        Odds include the {meta.conference_games.length}-game {meta.home.conference} slate. Picks you&apos;ve made stay locked when the optimizer fills the rest.
      </div>
    </aside>
  );
}
