export const num = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined || Number.isNaN(v) ? "–" : v.toFixed(d);

export const signed = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined || Number.isNaN(v) ? "–" : `${v >= 0 ? "+" : ""}${v.toFixed(d)}`;

export const pct = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined || Number.isNaN(v) ? "–" : `${(v * 100).toFixed(d)}%`;

export const miles = (v: number | null | undefined) =>
  v === null || v === undefined ? "–" : Math.round(v).toLocaleString();

export const shortDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const QUAD_CUTOFFS: Record<"H" | "N" | "A", [number, number, number]> = {
  H: [30, 75, 160],
  N: [50, 100, 200],
  A: [75, 135, 240],
};

export const quadOf = (rank: number, site: "H" | "N" | "A") => {
  const [a, b, c] = QUAD_CUTOFFS[site];
  return rank <= a ? "Q1" : rank <= b ? "Q2" : rank <= c ? "Q3" : "Q4";
};

export const signClass = (v: number | null | undefined) => (v === null || v === undefined ? "" : v >= 0 ? "pos" : "neg");
