import type { ReactNode } from "react";
import type { BoardRow, Site } from "@/lib/api";
import { miles, num, pct, signClass, signed } from "@/lib/format";

export interface Ctx {
  siteFor: (r: BoardRow) => Site;
  rankSource: "model" | "ncaa";
}

export interface Col {
  key: string;
  label: string;
  title: string;
  group: "Resume" | "Projection" | "Value" | "Roster" | "Travel";
  on: boolean;
  align?: "l" | "c";
  sort: (r: BoardRow, c: Ctx) => number | string;
  cell: (r: BoardRow, c: Ctx) => ReactNode;
}

const ev = (r: BoardRow, s: Site) => r[`ev_${s}` as const];
const pwin = (r: BoardRow, s: Site) => r[`p_win_${s}` as const];
const pq1 = (r: BoardRow, s: Site) => r[`p_q1_${s}` as const];

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = Math.min(Math.abs(value) / max, 1) * 50;
  const left = value >= 0 ? 50 : 50 - w;
  return (
    <span className="track">
      <span className="fill" style={{ left: `${left}%`, width: `${w}%`, background: color }} />
    </span>
  );
}

function Quad({ q }: { q: string | null }) {
  return q ? <span className={`q ${q}`}>{q}</span> : <>–</>;
}

export const COLUMNS: Col[] = [
  {
    key: "wab", label: "WAB", group: "Resume", on: true,
    title: "Wins above bubble last season: wins minus what a bubble team would have won against the same schedule",
    sort: (r) => r.wab, cell: (r) => <span className={signClass(r.wab)}>{signed(r.wab)}</span>,
  },
  {
    key: "quad_H", label: "Home Q", group: "Resume", on: true, align: "c",
    title: "Quadrant if we host them, based on last season's rank", sort: (r) => r.quad_rank, cell: (r) => <Quad q={r.quad_H} />,
  },
  {
    key: "quad_N", label: "Neut Q", group: "Resume", on: true, align: "c",
    title: "Quadrant at a neutral site", sort: (r) => r.quad_rank, cell: (r) => <Quad q={r.quad_N} />,
  },
  {
    key: "quad_A", label: "Away Q", group: "Resume", on: true, align: "c",
    title: "Quadrant if we go to them", sort: (r) => r.quad_rank, cell: (r) => <Quad q={r.quad_A} />,
  },
  {
    key: "diff", label: "Diff", group: "Resume", on: true,
    title: "Rating: points better than an average D1 team on a neutral floor", sort: (r) => r.base_rating,
    cell: (r) => <span className={signClass(r.base_rating)}>{signed(r.base_rating)}</span>,
  },
  { key: "record", label: "W-L", group: "Resume", on: false, title: "Record vs D1", sort: (r) => r.w - r.l, cell: (r) => `${r.w}-${r.l}` },
  { key: "off", label: "Adj O", group: "Resume", on: false, title: "Offense, points vs average", sort: (r) => r.off, cell: (r) => signed(r.off) },
  { key: "def", label: "Adj D", group: "Resume", on: false, title: "Defense, points saved vs average", sort: (r) => r.def, cell: (r) => signed(r.def) },
  { key: "winavg", label: "Win% v Avg", group: "Resume", on: false, title: "Chance to beat an average D1 team on a neutral floor", sort: (r) => r.win_vs_avg, cell: (r) => pct(r.win_vs_avg) },
  { key: "home_wpct", label: "Home W%", group: "Resume", on: false, title: "Home win %", sort: (r) => r.home_wpct ?? -1, cell: (r) => pct(r.home_wpct) },
  { key: "away_wpct", label: "Away W%", group: "Resume", on: false, title: "Road win %", sort: (r) => r.away_wpct ?? -1, cell: (r) => pct(r.away_wpct) },
  {
    key: "tv_barthag", label: "T-Rank", group: "Resume", on: false, title: "Barttorvik Barthag (live data only)",
    sort: (r) => r.tv_barthag ?? -1, cell: (r) => (r.tv_barthag == null ? "–" : r.tv_barthag.toFixed(3)),
  },
  {
    key: "exp", label: "Exp", group: "Roster", on: true, title: "Minutes-weighted years of college experience on the new roster",
    sort: (r) => r.experience, cell: (r) => num(r.experience, 2),
  },
  {
    key: "late", label: "Late", group: "Projection", on: true,
    title: "In-season trend: how many points better they finish than they start (multi-season average). Positive = play them early",
    sort: (r) => r.late_trend,
    cell: (r) => (
      <span className="spark">
        <span className={signClass(r.late_trend)}>{signed(r.late_trend, 2)}</span>
        <Bar value={r.late_trend} max={2.5} color={r.late_trend >= 0 ? "#8fe0b2" : "#ef6b6b"} />
      </span>
    ),
  },
  {
    key: "proj", label: "Proj", group: "Projection", on: true, title: "Projected rank next season (80% range under it)",
    sort: (r) => r.proj_rank,
    cell: (r) => (
      <span className="spark">
        <span>#{r.proj_rank}</span>
        <span style={{ fontSize: 10, color: "var(--dim)" }}>{Math.round(r.rank_p10)}–{Math.round(r.rank_p90)}</span>
      </span>
    ),
  },
  {
    key: "ev", label: "EV", group: "Value", on: true,
    title: "Expected resume value of scheduling them at the chosen site (quadrant points + WAB - travel)",
    sort: (r, c) => ev(r, c.siteFor(r)),
    cell: (r, c) => {
      const s = c.siteFor(r);
      const v = ev(r, s);
      return (
        <span className="spark">
          <span className={signClass(v)}>
            {signed(v, 2)} <span style={{ color: "var(--dim)", fontSize: 10 }}>{s}</span>
          </span>
          <Bar value={v} max={0.4} color={v >= 0 ? "#d6c48a" : "#ef6b6b"} />
        </span>
      );
    },
  },
  { key: "pwin", label: "P(Win)", group: "Value", on: true, title: "Our win probability at the chosen site", sort: (r, c) => pwin(r, c.siteFor(r)), cell: (r, c) => pct(pwin(r, c.siteFor(r))) },
  { key: "pq1", label: "P(Q1)", group: "Value", on: true, title: "Chance the game ends up Q1 once final ranks are in", sort: (r, c) => pq1(r, c.siteFor(r)), cell: (r, c) => pct(pq1(r, c.siteFor(r))) },
  { key: "miles", label: "Miles", group: "Travel", on: false, title: "Miles from McCamish Pavilion", sort: (r) => r.miles, cell: (r) => miles(r.miles) },
  { key: "cont", label: "Cont.", group: "Roster", on: false, title: "Share of last season's minutes returning", sort: (r) => r.continuity, cell: (r) => pct(r.continuity) },
  {
    key: "risk", label: "Risk", group: "Roster", on: false, align: "c",
    title: "Regression risk: older roster that lost a lot of minutes", sort: (r) => ({ high: 2, watch: 1, low: 0 })[r.regression_risk],
    cell: (r) => <span className={`tag ${r.regression_risk}`}>{r.regression_risk}</span>,
  },
  { key: "nil", label: "NIL*", group: "Roster", on: false, title: "NIL proxy percentile from recruiting + portal intake (real NIL numbers aren't public)", sort: (r) => r.nil_proxy, cell: (r) => num(r.nil_proxy, 0) },
  { key: "recruit", label: "Recruit", group: "Roster", on: false, title: "Incoming recruiting class score", sort: (r) => r.recruit_score ?? -1, cell: (r) => num(r.recruit_score, 0) },
  {
    key: "deal", label: "Deal", group: "Travel", on: false, align: "c", title: "How a game like this usually gets made",
    sort: (r) => r.deal, cell: (r) => <span className="tag">{({ buy: "buy", series: "H&H", neutral_or_road: "N/road" })[r.deal]}</span>,
  },
];
