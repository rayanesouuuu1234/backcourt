"use client";

import type { Site } from "@/lib/api";
import { COLUMNS } from "./columns";

export type QuadKey = "Q1" | "Q2" | "Q3" | "Q4";

export interface FilterState {
  search: string;
  travel: number;
  quads: Record<QuadKey, boolean>;
  quadBasis: "last" | "proj";
  confs: Record<string, "in" | "out">;
  hideMates: boolean;
  valueSite: "best" | Site;
  cols: Record<string, boolean>;
}

export const defaultFilters = (travel = 3000): FilterState => ({
  search: "",
  travel,
  quads: { Q1: true, Q2: true, Q3: true, Q4: true },
  quadBasis: "last",
  confs: {},
  hideMates: true,
  valueSite: "best",
  cols: Object.fromEntries(COLUMNS.map((c) => [c.key, c.on])),
});

export default function Filters({
  f,
  set,
  conferences,
  hasTorvik,
}: {
  f: FilterState;
  set: (f: FilterState) => void;
  conferences: string[];
  hasTorvik: boolean;
}) {
  const cycle = (c: string) => {
    const next = { ...f.confs };
    if (!next[c]) next[c] = "in";
    else if (next[c] === "in") next[c] = "out";
    else delete next[c];
    set({ ...f, confs: next });
  };
  const nIn = Object.values(f.confs).filter((v) => v === "in").length;
  const nOut = Object.values(f.confs).filter((v) => v === "out").length;

  return (
    <aside className="panel corners sticky">
      <div className="panel-head">
        <div>
          <div className="kicker">Parameters</div>
          <h3>Filters</h3>
        </div>
        <button className="link-btn" onClick={() => set(defaultFilters())}>
          Reset
        </button>
      </div>
      <div className="panel-body" style={{ maxHeight: "calc(100vh - 190px)", overflowY: "auto" }}>
        <div className="section-label">Search</div>
        <input className="input" placeholder="team or conference" value={f.search} onChange={(e) => set({ ...f, search: e.target.value })} />

        <div className="section-label row">
          <span>Travel ceiling</span>
          <span style={{ color: "var(--gold-2)" }}>{f.travel.toLocaleString()} mi</span>
        </div>
        <input className="range" type="range" min={100} max={5000} step={50} value={f.travel} onChange={(e) => set({ ...f, travel: Number(e.target.value) })} />

        <div className="section-label">Value at</div>
        <div className="seg">
          {(["best", "H", "N", "A"] as const).map((s) => (
            <button key={s} className={f.valueSite === s ? "on" : ""} onClick={() => set({ ...f, valueSite: s })}>
              {s === "best" ? "BEST" : s}
            </button>
          ))}
        </div>

        <div className="section-label">Quadrants</div>
        <div className="hint">Show programs that can land in a checked quadrant (home, neutral, or away).</div>
        <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
          {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
            <label key={q} className="check">
              <input type="checkbox" checked={f.quads[q]} onChange={(e) => set({ ...f, quads: { ...f.quads, [q]: e.target.checked } })} />
              {q}
            </label>
          ))}
        </div>
        <div className="seg">
          <button className={f.quadBasis === "last" ? "on" : ""} onClick={() => set({ ...f, quadBasis: "last" })}>
            LAST SEASON
          </button>
          <button className={f.quadBasis === "proj" ? "on" : ""} onClick={() => set({ ...f, quadBasis: "proj" })}>
            PROJECTED
          </button>
        </div>

        <div className="section-label">Table columns</div>
        <div className="checks">
          {COLUMNS.filter((c) => c.key !== "tv_barthag" || hasTorvik).map((c) => (
            <label key={c.key} className="check" title={c.title}>
              <input type="checkbox" checked={!!f.cols[c.key]} onChange={(e) => set({ ...f, cols: { ...f.cols, [c.key]: e.target.checked } })} />
              {c.label}
            </label>
          ))}
        </div>

        <label className="check" style={{ marginTop: 14 }}>
          <input type="checkbox" checked={f.hideMates} onChange={(e) => set({ ...f, hideMates: e.target.checked })} />
          Hide conference opponents
        </label>

        <div className="section-label row">
          <span>Conferences</span>
          <span style={{ color: "var(--dim)", letterSpacing: ".08em" }}>
            {nIn ? `${nIn} only` : "All"} · {nOut} hidden
          </span>
        </div>
        <div className="hint">Each click cycles: add to filter → hide → show again.</div>
        <div className="chips">
          {conferences.map((c) => (
            <button key={c} className={`chip-btn ${f.confs[c] === "in" ? "on" : f.confs[c] === "out" ? "off" : ""}`} onClick={() => cycle(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
