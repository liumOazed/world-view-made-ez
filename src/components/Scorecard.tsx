import { useMemo, useState } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import type { CountryProfile } from '../data/countries';
import {
  CONTEXT,
  indexSource,
  LICENCE_META,
  LOADED,
  PILLARS,
  SCORED,
  scorecardOf,
  type IndexValue,
  type PillarId,
  type Scorecard,
} from '../data/scorecard';
import { Flag } from './Flag';

const band = (v: number | null) =>
  v === null ? '#5b6f8e' : v >= 75 ? '#5fd39a' : v >= 55 ? '#9fb3cf' : v >= 40 ? '#f2b84b' : '#ef7f86';

function Ring({ value, size = 92 }: { value: number | null; size?: number }) {
  const r = size / 2 - 7;
  const len = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <svg width={size} height={size} className="score-ring" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(148,197,255,0.1)" strokeWidth={7} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={band(value)}
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(len * v) / 100} ${len}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 6px ${band(value)})` }}
      />
      <text x="50%" y="50%" dy="0.1em" textAnchor="middle" className="score-ring-num">
        {value === null ? '—' : Math.round(value)}
      </text>
      <text x="50%" y="50%" dy="1.6em" textAnchor="middle" className="score-ring-of">
        / 100
      </text>
    </svg>
  );
}

function IndexRow({ v }: { v: IndexValue }) {
  const { def } = v;
  const src = indexSource(def.id);
  return (
    <li className="index-row">
      <div className="index-main">
        <div className="index-name">
          {def.name}
          {def.weight > 0 && <span className="index-weight">{def.weight}%</span>}
        </div>
        <div className="index-meta">
          {src ? (
            <a href={src.page} target="_blank" rel="noreferrer" title={src.note ?? `Via ${src.via}`}>
              {def.publisher}
            </a>
          ) : (
            def.publisher
          )}
          {v.year ? ` · ${v.year}` : ''}
          <span className="licence-dot" style={{ background: LICENCE_META[def.licence].color }} title={def.licenceNote} />
        </div>
      </div>
      <div className="index-val">
        {!v.loaded ? (
          <span className="muted small">Not loaded yet</span>
        ) : v.raw === null ? (
          <span className="muted small">Not covered</span>
        ) : (
          <>
            <strong>{def.format(v.raw)}</strong>
            <span className="index-rank">
              #{v.rank} of {v.of}
            </span>
          </>
        )}
      </div>
      <span className="bar thin index-bar">
        <span style={{ width: `${v.pct ?? 0}%`, background: band(v.pct) }} />
      </span>
    </li>
  );
}

export function ScorecardTab({ c }: { c: CountryProfile }) {
  const s = scorecardOf(c.name);
  const [open, setOpen] = useState<PillarId | null>('institutions');
  if (!s) return null;
  return (
    <div className="scorecard">
      {LOADED.length < SCORED.length && (
        <div className="mock-note">
          <Info size={13} /> Provisional: {LOADED.length} of {SCORED.length} indices loaded so far. The score uses only those.
        </div>
      )}
      <div className="score-hero">
        <Ring value={s.overall} />
        <div>
          <span className="eyebrow">Overall scorecard</span>
          <div className="score-rank">
            {s.rank ? (
              <>
                Rank <strong>#{s.rank}</strong> of {s.of}
              </>
            ) : (
              'Not enough data to rank'
            )}
          </div>
          <div className="muted small">
            {s.covered} of {LOADED.length} loaded indices cover {c.display} · percentile-based, best = 100
          </div>
        </div>
      </div>

      <div className="pillar-list">
        {PILLARS.map((p) => {
          const ps = s.pillars[p.id];
          const isOpen = open === p.id;
          const loaded = LOADED.some((d) => d.pillar === p.id);
          return (
            <div key={p.id} className={`pillar${isOpen ? ' is-open' : ''}`}>
              <button type="button" className="pillar-head" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
                <span className="pillar-emoji">{p.emoji}</span>
                <span className="pillar-name">
                  {p.label}
                  <span className="muted small"> · {p.weight}%</span>
                </span>
                <span className="pillar-score" style={{ color: band(ps.score) }}>
                  {ps.score === null ? '—' : Math.round(ps.score)}
                </span>
                <span className="bar pillar-bar-fill">
                  <span style={{ width: `${ps.score ?? 0}%`, background: p.color }} />
                </span>
                <span className="pillar-rank muted small">{ps.rank ? `#${ps.rank}` : loaded ? 'n/a' : 'Not loaded yet'}</span>
              </button>
              {isOpen && (
                <ul className="index-list">
                  {SCORED.filter((d) => d.pillar === p.id).map((d) => (
                    <IndexRow key={d.id} v={s.values[d.id]} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel-section">
        <div className="section-title">
          <h3>Perception & reputation</h3>
          <span className="muted small">Shown for context, not scored</span>
        </div>
        <div className="context-chips">
          {CONTEXT.map((d) => {
            const v = s.values[d.id];
            return (
              <div key={d.id} className="context-chip">
                <span className="muted small">{d.name}</span>
                <strong>{!v.loaded ? 'Not loaded yet' : v.raw === null ? 'Not ranked' : d.format(v.raw)}</strong>
              </div>
            );
          })}
        </div>
      </div>

      <div className="licence-key">
        {Object.values(LICENCE_META).map((l) => (
          <span key={l.label}>
            <span className="licence-dot" style={{ background: l.color }} /> {l.label}
          </span>
        ))}
        <a className="link" href="#method">
          Method & sources <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

const PRESETS: { id: string; label: string; weights: Record<PillarId, number> }[] = [
  { id: 'balanced', label: 'Balanced (proposed)', weights: { economy: 25, human: 30, institutions: 30, stability: 15 } },
  { id: 'prosperity', label: 'Prosperity first', weights: { economy: 45, human: 25, institutions: 20, stability: 10 } },
  { id: 'freedom', label: 'Freedom first', weights: { economy: 15, human: 25, institutions: 45, stability: 15 } },
];

export function Rankings({ profiles, onSelect }: { profiles: Map<string, CountryProfile>; onSelect: (name: string) => void }) {
  const [preset, setPreset] = useState('balanced');
  const weights = PRESETS.find((p) => p.id === preset)!.weights;
  const rows = useMemo(() => {
    const list: { c: CountryProfile; s: Scorecard; score: number }[] = [];
    for (const c of profiles.values()) {
      const s = scorecardOf(c.name);
      if (!s || s.overall === null) continue;
      // Re-weight over the pillars that have data loaded.
      const have = PILLARS.filter((p) => s.pillars[p.id].score !== null);
      const w = have.reduce((acc, p) => acc + weights[p.id], 0);
      const score = have.reduce((acc, p) => acc + s.pillars[p.id].score! * weights[p.id], 0) / w;
      list.push({ c, s, score });
    }
    list.sort((a, b) => b.score - a.score);
    return { top: list.slice(0, 12), total: list.length };
  }, [profiles, weights]);

  return (
    <section className="rankings" aria-labelledby="rankings-title" id="method">
      <div className="rankings-head">
        <div>
          <span className="eyebrow">
            Country scorecard{LOADED.length < SCORED.length ? ` · provisional, ${LOADED.length} of ${SCORED.length} indices loaded` : ''}
          </span>
          <h2 id="rankings-title">
            17 global indices. <span className="grad">One honest score.</span>
          </h2>
          <p className="muted">
            Each index is turned into a 0–100 percentile, averaged inside its pillar, then weighted. Perception rankings are
            shown but never scored. Indices not loaded yet are left out rather than guessed.
          </p>
        </div>
        <div className="preset-bar" role="tablist" aria-label="Weighting">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === preset}
              className={p.id === preset ? 'is-active' : undefined}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rankings-grid">
        <table className="rank-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Country</th>
              <th>Score</th>
              {PILLARS.map((p) => (
                <th key={p.id}>
                  {p.short} <span className="muted">{weights[p.id]}%</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.top.map(({ c, s, score }, i) => (
              <tr key={c.name} onClick={() => onSelect(c.name)}>
                <td className="muted">{i + 1}</td>
                <td>
                  <span className="rank-country">
                    <Flag country={c} size="sm" /> {c.display}
                  </span>
                </td>
                <td>
                  <strong style={{ color: band(score) }}>{Math.round(score)}</strong>
                </td>
                {PILLARS.map((p) => {
                  const v = s.pillars[p.id].score;
                  return (
                    <td key={p.id}>
                      <span className="rank-cell">
                        <span className="bar thin">
                          <span style={{ width: `${v ?? 0}%`, background: p.color }} />
                        </span>
                        <span className="muted small">{v === null ? '—' : Math.round(v)}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <caption className="rank-caption">
            Top 12 of {rows.total} ranked countries.
            {LOADED.length < SCORED.length && ' Provisional until all indices are loaded; the order will shift.'}
          </caption>
        </table>

        <div className="weights-card">
          <span className="eyebrow">How the 100 points split</span>
          {PILLARS.map((p) => (
            <div key={p.id} className="weights-pillar">
              <div className="weights-head">
                <span>
                  {p.emoji} {p.label}
                </span>
                <strong style={{ color: p.color }}>{p.weight}</strong>
              </div>
              <div className="weights-bars">
                {SCORED.filter((d) => d.pillar === p.id).map((d) => (
                  <span
                    key={d.id}
                    className="weights-seg"
                    style={{ flex: d.weight, background: p.color, opacity: indexSource(d.id) ? undefined : 0.15 }}
                    title={`${d.name}: ${d.weight}${indexSource(d.id) ? '' : ' (not loaded yet)'}`}
                  />
                ))}
              </div>
              <div className="weights-names muted small">
                {SCORED.filter((d) => d.pillar === p.id)
                  .map((d) => `${d.name.replace(/ Index$/, '').replace('World ', '')} ${d.weight}${indexSource(d.id) ? '' : ' (soon)'}`)
                  .join(' · ')}
              </div>
            </div>
          ))}
          <div className="weights-pillar">
            <div className="weights-head">
              <span>🌍 Perception & reputation</span>
              <strong className="muted">0</strong>
            </div>
            <div className="weights-names muted small">U.S. News Best Countries · Good Country · IMD Competitiveness (context only)</div>
          </div>
        </div>
      </div>
    </section>
  );
}
