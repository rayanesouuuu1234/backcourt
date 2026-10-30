"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ApiError from "@/components/ApiError";
import BoardTable from "@/components/builder/BoardTable";
import Filters, { defaultFilters, type FilterState, type QuadKey } from "@/components/builder/Filters";
import IntelDrawer from "@/components/builder/IntelDrawer";
import Ledger from "@/components/builder/Ledger";
import Hero from "@/components/Hero";
import { useFetch } from "@/components/useFetch";
import { post, SITES, type BoardRow, type Meta, type PlanResult, type SeasonSim, type Site } from "@/lib/api";
import { quadOf } from "@/lib/format";
import { useLedger, type LedgerItem } from "@/lib/ledger";

export default function ScheduleBuilder() {
  const meta = useFetch<Meta>("/api/meta");
  const board = useFetch<BoardRow[]>("/api/board");
  const { items, save } = useLedger();
  const [f, setF] = useState<FilterState>(defaultFilters());
  const [open, setOpen] = useState<BoardRow | null>(null);
  const [sim, setSim] = useState<SeasonSim | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [filling, setFilling] = useState(false);
  const [fillErr, setFillErr] = useState<string | null>(null);

  useEffect(() => {
    if (meta.data) setF((cur) => ({ ...cur, travel: meta.data!.optimizer.travel_ceiling_mi }));
  }, [meta.data]);

  const rows = useMemo(() => board.data ?? [], [board.data]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.team_id, r])), [rows]);
  const conferences = useMemo(() => Array.from(new Set(rows.map((r) => r.conference))).sort(), [rows]);
  const picked = useMemo(() => new Set(items.map((i) => i.team_id)), [items]);

  const filtered = useMemo(() => {
    const q = f.search.trim().toLowerCase();
    const anyIn = Object.values(f.confs).includes("in");
    return rows.filter((r) => {
      if (f.hideMates && r.conf_mate) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.conference.toLowerCase().includes(q)) return false;
      if (r.miles > f.travel) return false;
      const c = f.confs[r.conference];
      if (c === "out" || (anyIn && c !== "in")) return false;
      const quads = SITES.map((s) => (f.quadBasis === "last" ? r[`quad_${s}` as const] : quadOf(r.proj_rank, s))) as QuadKey[];
      return quads.some((qq) => f.quads[qq]);
    });
  }, [rows, f]);

  const ctx = useMemo(
    () => ({
      siteFor: (r: BoardRow): Site => (f.valueSite === "best" ? r.best_site : f.valueSite),
      rankSource: meta.data?.rank_source ?? "model",
    }),
    [f.valueSite, meta.data?.rank_source],
  );

  const nextDate = useCallback(
    (site: Site, current: LedgerItem[]) => {
      const used = new Set(current.map((i) => i.date));
      const slots = meta.data?.optimizer.slots ?? [];
      const fit = slots.find((s) => !used.has(s.date) && (s.site === site || s.site === "any")) ?? slots.find((s) => !used.has(s.date));
      return fit?.date ?? meta.data?.reference_date ?? "";
    },
    [meta.data],
  );

  const addAt = useCallback(
    (r: BoardRow, site: Site) => {
      const rest = items.filter((i) => i.team_id !== r.team_id);
      const existing = items.find((i) => i.team_id === r.team_id);
      const date = existing?.date ?? nextDate(site, rest);
      save([...rest, { team_id: r.team_id, name: r.name, conference: r.conference, site, date }]);
    },
    [items, save, nextDate],
  );

  const toggle = useCallback(
    (r: BoardRow) => {
      if (r.conf_mate) return;
      if (picked.has(r.team_id)) save(items.filter((i) => i.team_id !== r.team_id));
      else addAt(r, r.best_site);
    },
    [picked, items, save, addAt],
  );

  // re-simulate the season whenever the ledger changes
  const seq = useRef(0);
  useEffect(() => {
    if (!meta.data) return;
    const id = ++seq.current;
    setSimLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await post<{ season: SeasonSim | null }>("/api/simulate", {
          games: items.map((i) => ({ team_id: i.team_id, site: i.site, date: i.date })),
        });
        if (id === seq.current) setSim(res.season);
      } catch {
        /* the board still works without the sim */
      } finally {
        if (id === seq.current) setSimLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [items, meta.data]);

  const fill = async () => {
    if (!meta.data) return;
    setFilling(true);
    setFillErr(null);
    try {
      const byDate = new Map(items.map((i) => [i.date, i]));
      const slots = meta.data.optimizer.slots.map((s) => {
        const lock = byDate.get(s.date);
        return lock ? { date: s.date, site: lock.site, locked_team: lock.team_id } : { date: s.date, site: s.site };
      });
      const extra = items.filter((i) => !meta.data!.optimizer.slots.some((s) => s.date === i.date));
      const res = await post<PlanResult>("/api/optimize", {
        slots,
        settings: { excluded: extra.map((e) => e.team_id), travel_ceiling_mi: f.travel },
      });
      if (!res.games.length) throw new Error(res.status);
      save([
        ...res.games.map((g) => ({ team_id: g.team_id, name: g.name, conference: g.conference, site: g.site, date: g.date })),
        ...extra,
      ]);
    } catch (e) {
      setFillErr(e instanceof Error ? e.message : String(e));
    } finally {
      setFilling(false);
    }
  };

  const err = meta.error ?? board.error;
  const m = meta.data;

  return (
    <>
      <Hero
        kicker="Georgia Institute of Technology"
        title="Schedule Builder"
        subtitle="Non-conference opponent intelligence"
        right={m && <span className={`badge ${m.mode}`}>{m.mode === "demo" ? "Demo data · simulated league" : "Live data"}</span>}
      />
      {m && (
        <div className="strip">
          <div>
            <div className="k">Arena</div>
            <div className="v">{m.home.arena}</div>
          </div>
          <div>
            <div className="k">Locus</div>
            <div className="v">
              Atlanta, GA · {Math.abs(m.home.lat).toFixed(4)}°N / {Math.abs(m.home.lon).toFixed(4)}°W
            </div>
          </div>
          <div>
            <div className="k">Base season</div>
            <div className="v">{m.seasons.base_label}</div>
          </div>
          <div>
            <div className="k">Planning for</div>
            <div className="v">{m.seasons.target_label}</div>
          </div>
          <div>
            <div className="k">{m.home.name}</div>
            <div className="v">
              #{m.home.base_rank} last year → proj #{m.home.proj_rank}
            </div>
          </div>
          <div>
            <div className="k">Ranks from</div>
            <div className="v">{m.rank_source === "ncaa" ? "Official NET" : "Backcourt model"}</div>
          </div>
        </div>
      )}
      {err && <ApiError message={err} />}
      {fillErr && <div className="err" style={{ marginBottom: 12 }}>Optimizer: {fillErr}</div>}
      {m && board.data && (
        <div className="three">
          <Filters f={f} set={setF} conferences={conferences} hasTorvik={rows.some((r) => r.tv_barthag != null)} />
          <BoardTable rows={filtered} total={rows.length} ctx={ctx} cols={f.cols} picked={picked} onOpen={setOpen} onToggle={toggle} />
          <Ledger meta={m} items={items} byId={byId} sim={sim} simLoading={simLoading} onChange={save} onFill={fill} filling={filling} />
        </div>
      )}
      {(meta.loading || board.loading) && !board.data && (
        <div className="note">
          <span className="spin" /> Loading board
        </div>
      )}
      {open && m && (
        <IntelDrawer
          row={open}
          home={m.home.name}
          picked={picked.has(open.team_id)}
          onClose={() => setOpen(null)}
          onAdd={(s) => {
            addAt(open, s);
            setOpen(null);
          }}
        />
      )}
    </>
  );
}
