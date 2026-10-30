"use client";

import { useMemo, useState } from "react";
import type { BoardRow } from "@/lib/api";
import { COLUMNS, type Ctx } from "./columns";

export default function BoardTable({
  rows,
  total,
  ctx,
  cols,
  picked,
  onOpen,
  onToggle,
}: {
  rows: BoardRow[];
  total: number;
  ctx: Ctx;
  cols: Record<string, boolean>;
  picked: Set<string>;
  onOpen: (r: BoardRow) => void;
  onToggle: (r: BoardRow) => void;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const visible = COLUMNS.filter((c) => cols[c.key]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key);
    const val = (r: BoardRow) =>
      sort.key === "rank" ? r.quad_rank : sort.key === "program" ? r.name : col ? col.sort(r, ctx) : 0;
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, sort, ctx]);

  const head = (key: string, label: string, title?: string, align?: string) => (
    <th
      key={key}
      title={title}
      className={`${align ?? ""} ${sort.key === key ? "sorted" : ""}`}
      onClick={() =>
        setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "rank" || key === "program" ? 1 : -1 }))
      }
    >
      {label}
      {sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <section>
      <div className="board-head">
        <span className="k">
          Board · {rows.length} / {total}
        </span>
        <span className="hint" style={{ margin: 0 }}>
          Row = intel · click headers to sort · ◇ adds to schedule
        </span>
      </div>
      <div className="table-wrap">
        <table className="board">
          <thead>
            <tr>
              {head("rank", "Rk", ctx.rankSource === "ncaa" ? "Official NET rank last season" : "Model rank last season", "c")}
              {head("program", "Program", undefined, "l")}
              {visible.map((c) => head(c.key, c.label, c.title, c.align))}
              <th className="c" style={{ cursor: "default" }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.team_id} className={picked.has(r.team_id) ? "picked" : ""} onClick={() => onOpen(r)}>
                <td className="c">
                  <span className="rk">
                    <b>{Math.round(r.quad_rank)}</b>
                    <i>{ctx.rankSource === "ncaa" ? "NET" : "MODEL"}</i>
                  </span>
                </td>
                <td className="l">
                  <div className="prog">
                    {r.name}
                    <small>
                      {r.conference} · {r.city}, {r.state}
                    </small>
                  </div>
                </td>
                {visible.map((c) => (
                  <td key={c.key} className={c.align ?? ""}>
                    {c.cell(r, ctx)}
                  </td>
                ))}
                <td className="c">
                  <button
                    className={`add-btn ${picked.has(r.team_id) ? "on" : ""}`}
                    title={picked.has(r.team_id) ? "Remove from schedule" : `Add at best site (${r.best_site})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(r);
                    }}
                  >
                    <span>{picked.has(r.team_id) ? "✓" : "+"}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
