import { Activity, Flame, Gauge, Landmark, Ship, Sparkles, type LucideIcon } from 'lucide-react';
import { LAYERS, type Layer, type LayerId } from '../data/layers';

const ICONS: Record<LayerId, LucideIcon> = {
  growth: Activity,
  inflation: Flame,
  trade: Ship,
  financial: Landmark,
  geopolitical: Gauge,
  leverage: Sparkles,
};

export function LayerBar({ layer, onChange }: { layer: Layer; onChange: (id: LayerId) => void }) {
  return (
    <div className="layer-bar" role="tablist" aria-label="Map layer">
      {LAYERS.map((l) => {
        const Icon = ICONS[l.id];
        return (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={l.id === layer.id}
            className={`layer-chip${l.id === layer.id ? ' is-active' : ''}`}
            onClick={() => onChange(l.id)}
          >
            <Icon size={14} />
            {l.label}
          </button>
        );
      })}
    </div>
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
