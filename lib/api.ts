export type Site = "H" | "N" | "A";
export const SITES: Site[] = ["H", "N", "A"];
export const SITE_LABEL: Record<Site, string> = { H: "Home", N: "Neutral", A: "Away" };

export interface BoardRow {
  team_id: string;
  name: string;
  conference: string;
  city: string;
  state: string;
  quad_rank: number;
  model_rank: number;
  base_rating: number;
  off: number;
  def: number;
  win_vs_avg: number;
  w: number;
  l: number;
  wab: number;
  wab_rank: number;
  home_wpct: number | null;
  away_wpct: number | null;
  q1_w: number;
  q1_l: number;
  resume_points: number;
  late: number;
  late_trend: number;
  home_edge: number;
  proj: number;
  proj_sd: number;
  proj_rank: number;
  rank_p10: number;
  rank_p90: number;
  continuity: number;
  experience: number;
  recruit_score: number | null;
  recruit_z: number;
  portal_in: number | null;
  portal_out: number | null;
  nil_proxy: number;
  regression_risk: "low" | "watch" | "high";
  miles: number;
  tz_shift: number;
  deal: "buy" | "series" | "neutral_or_road";
  best_site: Site;
  best_ev: number;
  quad_H: string;
  quad_N: string;
  quad_A: string;
  ev_H: number;
  ev_N: number;
  ev_A: number;
  sd_H: number;
  sd_N: number;
  sd_A: number;
  p_win_H: number;
  p_win_N: number;
  p_win_A: number;
  p_q1_H: number;
  p_q1_N: number;
  p_q1_A: number;
  p_q4_H: number;
  p_q4_N: number;
  p_q4_A: number;
  exp_wab_H: number;
  exp_wab_N: number;
  exp_wab_A: number;
  conf_mate: boolean;
  tv_barthag?: number | null;
  tv_adjoe?: number | null;
  tv_adjde?: number | null;
  tv_adjt?: number | null;
  tv_wab?: number | null;
}

export interface SlotCfg {
  date: string;
  site: "H" | "N" | "A" | "any";
  locked_team?: string | null;
}

export interface Meta {
  built_at: string;
  mode: "demo" | "live";
  rank_source: "model" | "ncaa";
  reference_date: string;
  home: {
    team_id: string;
    name: string;
    arena: string;
    lat: number;
    lon: number;
    conference: string;
    proj: number;
    proj_sd: number;
    proj_rank: number;
    base_rank: number;
    base_sheet: Record<string, number> | null;
  };
  seasons: { base: number; target: number; base_label: string; target_label: string };
  selection: { center: number; scale: number };
  optimizer: {
    risk_aversion: number;
    travel_ceiling_mi: number;
    max_total_travel_mi: number;
    max_per_conference: number;
    min_q1_chances: number;
    max_q4_games: number;
    respect_deal_types: boolean;
    slots: SlotCfg[];
  };
  conference_games: { date: string; team_id: string; site: Site; name: string }[];
  projection_fit: { fitted: boolean; r2?: number; rmse?: number; seasons?: number[] };
}

export interface Hist {
  counts: number[];
  edges: number[];
}

export interface SeasonSim {
  games: number;
  exp_wins: number;
  exp_losses: number;
  wab_mean: number;
  wab_p10: number;
  wab_p90: number;
  q1_wins_mean: number;
  bad_losses_mean: number;
  rank_median: number;
  score_mean: number;
  at_large: number;
  p_wab_positive: number;
  wab_hist: Hist;
  wins_hist: Hist;
}

export interface PlannedGame {
  slot: number;
  date: string;
  team_id: string;
  name: string;
  conference: string;
  site: Site;
  ev: number;
  var: number;
  p_win: number;
  exp_wab: number;
  p_q1: number;
  p_q4: number;
  proj_rank: number;
  trip_miles: number;
  locked: boolean;
}

export interface PlanResult {
  status: string;
  games: PlannedGame[];
  totals?: { ev: number; sd: number; exp_wins: number; exp_wab: number; q1_chances: number; q4_games: number; trip_miles: number };
  season?: SeasonSim;
  frontier?: { risk_aversion: number; status: string; ev?: number; sd?: number; at_large?: number; q1_chances?: number; duplicate?: boolean }[];
  risk_aversion?: number;
}

export interface LoadPlayer {
  player: string;
  date: string;
  status: "red" | "amber" | "green" | "baseline";
  note: string;
  acwr_ewma: number | null;
  acwr: number | null;
  acute: number;
  chronic: number;
  monotony: number | null;
  strain: number | null;
  last_load: number;
  next_min: number;
  next_max: number;
  next_max_pct_typical: number | null;
}

export interface LoadStatus {
  load_metric: string;
  through: string;
  thresholds: { target: number; floor: number; red: number };
  players: LoadPlayer[];
  errors: string[];
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* not json */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const post = <T,>(path: string, body: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
