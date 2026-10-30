"use client";

import { useMemo, useState } from "react";
import ApiError from "@/components/ApiError";
import Hero from "@/components/Hero";
import { useFetch } from "@/components/useFetch";
import { post, SITES, SITE_LABEL, type BoardRow, type Meta, type Site } from "@/lib/api";

interface ReportFile {
  file: string;
  url: string;
  modified: number;
}

export default function ReportsPage() {
  const meta = useFetch<Meta>("/api/meta");
  const board = useFetch<BoardRow[]>("/api/board");
  const list = useFetch<ReportFile[]>("/api/reports");
  const [opp, setOpp] = useState("");
  const [date, setDate] = useState("");
  const [site, setSite] = useState<Site>("H");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const teams = useMemo(() => [...(board.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [board.data]);
  const upcoming = meta.data?.conference_games ?? [];

  const make = async (o = opp, d = date, s = site) => {
    if (!o || !d) {
      setErr("Pick an opponent and a date.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await post<{ url: string }>("/api/reports/gameprep", { opponent: o, date: d, site: s });
      window.open(res.url, "_blank");
      await list.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Hero kicker="Game prep" title="Reports" subtitle="Matchup odds, opponent profile, our workload flags, and lineup net ratings in one page" />
      {(meta.error || board.error) && <ApiError message={(meta.error ?? board.error)!} />}
      <div className="two">
        <section className="panel corners">
          <div className="panel-head">
            <div>
              <div className="kicker">New</div>
              <h3>Game-prep report</h3>
            </div>
          </div>
          <div className="panel-body">
            <div className="grid-form">
              <div className="field">
                <label>Opponent</label>
                <select className="select" style={{ width: "100%", padding: 9 }} value={opp} onChange={(e) => setOpp(e.target.value)}>
                  <option value="">Choose…</option>
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.name} ({t.conference})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Date</label>
                <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Site</label>
              <div className="seg">
                {SITES.map((s) => (
                  <button key={s} className={site === s ? "on" : ""} onClick={() => setSite(s)}>
                    {SITE_LABEL[s].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn" style={{ marginTop: 18 }} onClick={() => make()} disabled={busy}>
              {busy ? (
                <>
                  <span className="spin" /> Building
                </>
              ) : (
                "Build report"
              )}
            </button>
            {err && (
              <div className="err" style={{ marginTop: 12 }}>
                {err}
              </div>
            )}
            <p className="hint" style={{ marginTop: 16 }}>
              To email it to the staff automatically, use the CLI: <code>backcourt report gameprep Duke --date 2027-01-17 --site A --email</code> with SMTP
              settings in <code>.env</code>.
            </p>

            {upcoming.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 22 }}>
                  Conference slate, one click
                </div>
                <div className="chips">
                  {upcoming.slice(0, 20).map((g) => (
                    <button key={`${g.date}-${g.team_id}`} className="chip-btn" onClick={() => make(g.team_id, g.date, g.site)} disabled={busy}>
                      {g.date.slice(5)} {g.site === "H" ? "vs" : "at"} {g.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="panel corners">
          <div className="panel-head">
            <div>
              <div className="kicker">Library</div>
              <h3>Recent</h3>
            </div>
          </div>
          <div className="panel-body">
            {list.data?.length ? (
              <table className="mini">
                <tbody>
                  {list.data.map((r) => (
                    <tr key={r.file}>
                      <td>
                        <a href={r.url} target="_blank" rel="noreferrer">
                          {r.file.replace(".html", "").replaceAll("_", " ")}
                        </a>
                      </td>
                      <td className="n" style={{ color: "var(--dim)" }}>
                        {new Date(r.modified * 1000).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="note">No reports yet.</div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
