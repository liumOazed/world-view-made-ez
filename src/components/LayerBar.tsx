import { Activity, Award, Flame, Gauge, Landmark, Ship, Sparkles, type LucideIcon } from 'lucide-react';
import { LAYERS, PILLAR_LAYERS, type Layer, type LayerId } from '../data/layers';

const ICONS: Partial<Record<LayerId, LucideIcon>> = {
  growth: Activity,
  inflation: Flame,
  trade: Ship,
  financial: Landmark,
  geopolitical: Gauge,
  leverage: Sparkles,
  scorecard: Award,
};

export function LayerBar({ layer, onChange }: { layer: Layer; onChange: (id: LayerId) => void }) {
  const isScore = layer.id === 'scorecard' || layer.id.startsWith('score-');
  return (
    <>
    <div className="layer-bar" role="tablist" aria-label="Map layer">
      {LAYERS.map((l) => {
        const Icon = ICONS[l.id] ?? Award;
        const active = l.id === layer.id || (l.id === 'scorecard' && isScore);
        return (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`layer-chip${active ? ' is-active' : ''}${l.id === 'scorecard' ? ' is-new' : ''}`}
            onClick={() => onChange(l.id)}
          >
            <Icon size={14} />
            {l.label}
          </button>
        );
      })}
    </div>
    {isScore && (
      <div className="pillar-bar" role="tablist" aria-label="Scorecard pillar">
        {[{ id: 'scorecard' as LayerId, label: 'Overall' }, ...PILLAR_LAYERS].map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={l.id === layer.id}
            className={l.id === layer.id ? 'is-active' : undefined}
            onClick={() => onChange(l.id)}
          >
            {l.label}
          </button>
        ))}
        <span className="pillar-note">Mock values · 17 indices · weights 25 / 30 / 30 / 15</span>
      </div>
    )}
    </>
  );
}

export interface LegendKey {
  label: string;
  color: string;
}

export function Legend({ layer, keyTitle, keys }: { layer: Layer; keyTitle?: string; keys?: LegendKey[] }) {
  return (
    <div className={`legend${keys?.length ? ' has-keys' : ''}`} aria-live="polite">
      <div className="legend-head">
        <span className="eyebrow">Selected metric</span>
        <strong>{layer.metric}</strong>
        <span className="legend-unit">{layer.unit}</span>
      </div>
      <div className="legend-ramp" style={{ background: `linear-gradient(90deg, ${layer.ramp.join(', ')})` }} />
      <div className="legend-ticks">
        {layer.ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="legend-ends">
        <span>{layer.low}</span>
        <span>{layer.high}</span>
      </div>
      {keys?.length ? (
        <div className="legend-keys">
          <span className="eyebrow">{keyTitle}</span>
          <ul>
            {keys.map((k) => (
              <li key={k.label}>
                <span className="legend-swatch" style={{ background: k.color, boxShadow: `0 0 8px ${k.color}` }} />
                {k.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="legend-desc">{layer.description}</p>
      )}
    </div>
  );
}
