import { Anchor, ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { CHOKEPOINTS, GLOBAL_KPIS, STORIES } from '../data/global';
import { Sparkline } from './Sparkline';

export function GlobalOverview({ onSelect }: { onSelect: (name: string) => void }) {
  return (
    <div className="panel-body fade-in">
      <div className="panel-head">
        <span className="eyebrow">Global overview</span>
        <h2>The world this quarter</h2>
        <p className="muted">Four signals that matter, with their direction of travel. Click any country on the map to go deeper.</p>
      </div>

      <div className="kpi-list">
        {GLOBAL_KPIS.map((k) => {
          const Arrow = k.direction === 'up' ? ArrowUpRight : ArrowDownRight;
          const tone = k.good ? 'good' : 'bad';
          return (
            <div key={k.label} className="kpi-row">
              <div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">
                  {k.value}
                  <span className={`delta ${tone}`}>
                    <Arrow size={13} />
                    {k.change}
                  </span>
                </div>
                <div className="kpi-note">{k.note}</div>
              </div>
              <Sparkline values={k.series} color={k.good ? '#5eead4' : '#fb7185'} />
            </div>
          );
        })}
      </div>

      <section className="panel-section">
        <div className="section-title">
          <h3>Developing stories</h3>
          <span className="pill">Sources on click</span>
        </div>
        <ul className="story-list">
          {STORIES.map((s) => (
            <li key={s.title}>
              <button type="button" onClick={() => s.country && onSelect(s.country)}>
                <span className={`status status-${s.status.toLowerCase()}`}>{s.status}</span>
                <span className="story-title">{s.title}</span>
                <span className="story-meta">
                  {s.tag} · {s.region} · {s.age} ago
                </span>
              </button>
            </li>
          ))}
        </ul>
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
    </div>
  );
}
