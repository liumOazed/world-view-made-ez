import { useMemo } from 'react';
import { Anchor, ArrowDownRight, ArrowRight, ArrowUpRight, Info } from 'lucide-react';
import type { CountryProfile } from '../data/countries';
import { CHOKEPOINTS } from '../data/global';
import type { Layer } from '../data/layers';
import { FMT, nextYearGrowth, SOURCES, worldSeries } from '../data/sections';
import { Sparkline, TREND_BAD, TREND_GOOD } from './Sparkline';

const THIS_YEAR = new Date().getUTCFullYear();

interface Kpi {
  label: string;
  note: string;
  fmt: (v: number) => string;
  higherIsBetter: boolean;
  series: { year: number; value: number }[];
}

function useKpis(): Kpi[] {
  return useMemo(() => {
    const defs: [string, string, boolean, (v: number) => string, boolean, string][] = [
      ['gdpGrowth', 'World GDP growth', true, FMT.pctSigned, true, 'GDP-weighted, real'],
      ['inflation', 'Inflation, median country', false, FMT.pct, false, 'Average consumer prices'],
      ['debt', 'Public debt', true, FMT.pct, false, 'GDP-weighted, % of GDP'],
      ['currentAccount', 'Current account, median', false, FMT.pctSigned, true, '% of GDP'],
    ];
    return defs.flatMap(([id, label, weighted, fmt, higherIsBetter, note]) => {
      const s = worldSeries(id, weighted);
      return s ? [{ label, note, fmt, higherIsBetter, series: s }] : [];
    });
  }, []);
}

export function GlobalOverview({
  layer,
  profiles,
  onSelect,
}: {
  layer: Layer;
  profiles: Map<string, CountryProfile>;
  onSelect: (name: string) => void;
}) {
  const kpis = useKpis();
  const ranked = useMemo(() => {
    const rows = [...profiles.values()]
      .map((p) => ({ name: p.name, display: p.display, v: layer.value(p) }))
      .filter((r) => Number.isFinite(r.v))
      .sort((a, b) => b.v - a.v);
    return rows;
  }, [layer, profiles]);
  const shrinking = useMemo(
    () => [...profiles.keys()].filter((c) => nextYearGrowth(c) < 0).length,
    [profiles],
  );

  return (
    <div className="panel-body fade-in">
      <div className="panel-head">
        <span className="eyebrow">Global overview</span>
        <h2>The world this year</h2>
        <p className="muted">
          Four signals from the IMF World Economic Outlook, with history. {shrinking} economies are forecast to shrink next year.
        </p>
      </div>

      <div className="kpi-list">
        {kpis.map((k) => {
          const actual = k.series.filter((p) => p.year < THIS_YEAR);
          const now = actual[actual.length - 1];
          const prev = actual[actual.length - 2];
          const next = k.series.find((p) => p.year === THIS_YEAR + 1);
          const up = now.value >= prev.value;
          const good = up === k.higherIsBetter;
          const Arrow = up ? ArrowUpRight : ArrowDownRight;
          return (
            <div key={k.label} className="kpi-row">
              <div>
                <div className="kpi-label">
                  {k.label} · {now.year}
                </div>
                <div className="kpi-value">
                  {k.fmt(now.value)}
                  <span className={`delta ${good ? 'good' : 'bad'}`}>
                    <Arrow size={13} />
                    {Math.abs(now.value - prev.value).toFixed(1)} pp
                  </span>
                </div>
                <div className="kpi-note">
                  {k.note}
                  {next && ` · ${next.year} forecast ${k.fmt(next.value)}`}
                </div>
              </div>
              <Sparkline values={actual.map((p) => p.value)} color={good ? TREND_GOOD : TREND_BAD} />
            </div>
          );
        })}
      </div>

      <section className="panel-section">
        <div className="section-title">
          <h3>{layer.metric}</h3>
          <span className="pill">{ranked.length} countries</span>
        </div>
        <div className="rank-cols">
          {[
            { title: 'Highest', rows: ranked.slice(0, 5) },
            { title: 'Lowest', rows: ranked.slice(-5).reverse() },
          ].map((col) => (
            <div key={col.title}>
              <div className="rank-col-title">{col.title}</div>
              <ol className="rank-list">
                {col.rows.map((r) => (
                  <li key={r.name}>
                    <button type="button" onClick={() => onSelect(r.name)}>
                      <span className="rank-swatch" style={{ background: layer.color(r.v) }} />
                      <span className="rank-name">{r.display}</span>
                      <span className="rank-val">{layer.format(r.v)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="footnote">
          <Info size={12} />
          <span>{layer.description}</span>
        </p>
      </section>

      <section className="panel-section">
        <div className="section-title">
          <h3>Systemic chokepoints</h3>
          <span className="pill">Leverage</span>
        </div>
        <ul className="choke-list">
          {CHOKEPOINTS.slice(0, 5).map((c) => (
            <li key={c.name}>
              <button type="button" onClick={() => onSelect(c.country)}>
                <Anchor size={14} />
                <span className="choke-name">{c.name}</span>
                <span className="choke-carries">{c.carries}</span>
                <ArrowRight size={14} className="choke-go" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <p className="footnote">
        <Info size={12} />
        <span>
          World figures are computed from{' '}
          <a href={SOURCES.imf?.url} target="_blank" rel="noreferrer">
            {SOURCES.imf?.name ?? 'IMF WEO'}
          </a>{' '}
          country data; they differ slightly from the IMF’s own PPP-weighted aggregates.
        </span>
      </p>
    </div>
  );
}
