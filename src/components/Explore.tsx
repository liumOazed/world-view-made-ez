import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, ChartColumn, Waypoints, ShieldAlert, Zap, type LucideIcon } from 'lucide-react';
import type { CountryProfile, Region } from '../data/countries';
import { FMT, indicator } from '../data/sections';
import { Sparkline, TREND_NEUTRAL } from './Sparkline';

export type ExploreAction = 'compare' | 'connections' | 'risk' | 'shock';

const CARDS: { id: ExploreAction; title: string; body: string; tags: string; icon: LucideIcon }[] = [
  { id: 'compare', title: 'Compare', body: 'Put countries and regions side by side and see how they diverge over time.', tags: 'Countries · Regions', icon: ChartColumn },
  { id: 'connections', title: 'Connections', body: 'Trace who supplies, buys, lends and powers whom, in both directions.', tags: 'Trade · Credit · Energy', icon: Waypoints },
  { id: 'risk', title: 'Risk & contagion', body: 'Separate exposure, vulnerability and resilience, with the evidence behind each.', tags: 'Exposure · Buffers', icon: ShieldAlert },
  { id: 'shock', title: 'Shock scenarios', body: 'What if oil jumps 30% or a key market slumps? Follow the transmission channels.', tags: 'What-if · Pathways', icon: Zap },
];

export function Explore({ onAction }: { onAction: (a: ExploreAction) => void }) {
  return (
    <section className="explore" aria-labelledby="explore-title">
      <div className="explore-intro">
        <span className="eyebrow">Explore deeper</span>
        <h2 id="explore-title">
          Show the world.
          <br />
          <span className="grad">Explain the connections.</span>
        </h2>
        <p className="muted">Four ways to go beyond the map.</p>
      </div>
      <div className="explore-cards">
        {CARDS.map((c) => (
          <button key={c.id} type="button" className="explore-card" onClick={() => onAction(c.id)}>
            <span className="explore-icon">
              <c.icon size={20} />
            </span>
            <span className="explore-title">{c.title}</span>
            <span className="explore-body">{c.body}</span>
            <span className="explore-foot">
              <span>{c.tags}</span>
              <ArrowUpRight size={16} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

const REGION_ORDER: Region[] = ['North America', 'Europe', 'Asia', 'Middle East', 'Africa', 'Latin America'];

/** Regional GDP and GDP-weighted growth, summed from IMF country data. */
export function RegionStrip({ profiles }: { profiles: Map<string, CountryProfile> }) {
  const regions = useMemo(() => {
    const growth = indicator('gdpGrowth');
    const gdp = indicator('gdpUsd');
    if (!growth?.series || !gdp?.series) return [];
    return REGION_ORDER.map((name) => {
      const members = [...profiles.values()].filter((p) => p.region === name && gdp.series![p.name]);
      const len = gdp.series![members[0]?.name]?.length ?? 0;
      // Actual years only: the series ends with this year and next year's forecasts.
      const series: number[] = [];
      let total = 0;
      let year = 0;
      for (let i = 0; i < len - 2; i++) {
        let w = 0;
        let g = 0;
        for (const m of members) {
          const gi = growth.series![m.name]?.[i];
          const wi = gdp.series![m.name]?.[i];
          if (gi == null || wi == null) continue;
          w += wi;
          g += gi * wi;
        }
        if (w > 0) {
          series.push(g / w);
          total = w;
          year = (growth.seriesFrom ?? 0) + i;
        }
      }
      return { name, total, year, growth: series[series.length - 1] ?? NaN, series };
    }).filter((r) => r.series.length > 2);
  }, [profiles]);

  return (
    <div className="region-strip" aria-label="Regional overview">
      {regions.map((r) => {
        const Arrow = r.growth >= 0 ? ArrowUpRight : ArrowDownRight;
        return (
          <div key={r.name} className="region-card" title={`IMF WEO, ${r.year}. GDP in current US$, growth weighted by GDP.`}>
            <div>
              <div className="region-name">{r.name}</div>
              <div className="region-figures">
                <span className="region-gdp">{FMT.usdBn(r.total)}</span>
                <span className="region-growth">
                  <Arrow size={11} />
                  {r.growth.toFixed(1)}%
                </span>
              </div>
            </div>
            <Sparkline values={r.series} color={TREND_NEUTRAL} width={44} height={18} />
          </div>
        );
      })}
    </div>
  );
}
