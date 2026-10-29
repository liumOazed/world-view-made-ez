import { ArrowUpRight, ChartColumn, Waypoints, ShieldAlert, Zap, type LucideIcon } from 'lucide-react';
import { REGIONS } from '../data/global';
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

export function RegionStrip() {
  return (
    <div className="region-strip" aria-label="Regional overview">
      {REGIONS.map((r) => (
        <div key={r.name} className="region-card">
          <div>
            <div className="region-name">{r.name}</div>
            <div className="region-figures">
              <span className="region-gdp">{r.gdp}</span>
              <span className="region-growth">
                <ArrowUpRight size={11} />
                {r.growth.toFixed(1)}%
              </span>
            </div>
          </div>
          <Sparkline values={r.series} color={TREND_NEUTRAL} width={44} height={18} />
        </div>
      ))}
    </div>
  );
}
