import { ArrowUpRight, ChartColumn, Waypoints, ShieldAlert, Zap, type LucideIcon } from 'lucide-react';
import { REGIONS } from '../data/global';
import { Sparkline } from './Sparkline';

export type ExploreAction = 'compare' | 'connections' | 'risk' | 'shock';

const CARDS: { id: ExploreAction; title: string; body: string; tags: string; icon: LucideIcon; hue: string }[] = [
  { id: 'compare', title: 'Compare', body: 'Put countries and regions side by side and see how they diverge over time.', tags: 'Countries · Regions', icon: ChartColumn, hue: '#38bdf8' },
  { id: 'connections', title: 'Connections', body: 'Trace who supplies, buys, lends and powers whom, in both directions.', tags: 'Trade · Credit · Energy', icon: Waypoints, hue: '#a78bfa' },
  { id: 'risk', title: 'Risk & contagion', body: 'Separate exposure, vulnerability and resilience, with the evidence behind each.', tags: 'Exposure · Buffers', icon: ShieldAlert, hue: '#fb7185' },
  { id: 'shock', title: 'Shock scenarios', body: 'What if oil jumps 30% or a key market slumps? Follow the transmission channels.', tags: 'What-if · Pathways', icon: Zap, hue: '#fbbf24' },
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
          <button key={c.id} type="button" className="explore-card" style={{ ['--hue' as string]: c.hue }} onClick={() => onAction(c.id)}>
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
    <div className="region-strip">
      {REGIONS.map((r) => (
        <div key={r.name} className="region-card">
          <div className="region-name">
            <span className="region-dot" style={{ background: r.color, boxShadow: `0 0 10px ${r.color}` }} />
            {r.name}
          </div>
          <div className="region-body">
            <div>
              <div className="region-gdp">{r.gdp}</div>
              <div className="region-growth">
                <ArrowUpRight size={12} /> {r.growth.toFixed(1)}% growth
              </div>
            </div>
            <Sparkline values={r.series} color={r.color} width={56} height={24} />
          </div>
        </div>
      ))}
    </div>
  );
}
