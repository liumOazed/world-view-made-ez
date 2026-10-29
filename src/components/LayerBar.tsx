import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Activity, Award, ChevronDown, Flame, Gauge, Landmark, Ship, Sparkles, type LucideIcon } from 'lucide-react';
import { LAYERS, PILLAR_LAYERS, type Layer, type LayerId } from '../data/layers';
import { LOADED, SCORED } from '../data/scorecard';

const ICONS: Partial<Record<LayerId, LucideIcon>> = {
  growth: Activity,
  inflation: Flame,
  trade: Ship,
  financial: Landmark,
  geopolitical: Gauge,
  leverage: Sparkles,
  scorecard: Award,
};

const GAP = 4;
/** Room kept for the "More" button, which shows the active layer's name when that layer is hidden. */
const MORE_WIDTH = 96;
const CHEVRON = 22;

export function LayerBar({ layer, onChange }: { layer: Layer; onChange: (id: LayerId) => void }) {
  const isScore = layer.id === 'scorecard' || layer.id.startsWith('score-');
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(LAYERS.length);
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep the layers on one row: whatever does not fit moves into a "More" menu.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const update = () => {
      const widths = [...measure.children].map((c) => (c as HTMLElement).offsetWidth + GAP);
      const avail = row.clientWidth + GAP;
      const total = widths.reduce((a, b) => a + b, 0);
      // Phones scroll the row sideways instead.
      if (total <= avail || row.clientWidth < 560) return setFit(LAYERS.length);
      let used = Math.max(MORE_WIDTH, ...widths.map((w) => w + CHEVRON));
      let n = 0;
      while (n < widths.length && used + widths[n] <= avail) used += widths[n++];
      setFit(Math.max(1, n));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(row);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !rowRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const isActive = (id: LayerId) => id === layer.id || (id === 'scorecard' && isScore);
  const chip = (l: Layer, extra = '') => {
    const Icon = ICONS[l.id] ?? Award;
    const active = isActive(l.id);
    return (
      <button
        key={l.id}
        type="button"
        role="tab"
        aria-selected={active}
        className={`layer-chip${active ? ' is-active' : ''}${l.id === 'scorecard' ? ' is-new' : ''}${extra}`}
        onClick={() => {
          onChange(l.id);
          setMenuOpen(false);
        }}
      >
        <Icon size={14} />
        {l.label}
      </button>
    );
  };
  const shown = LAYERS.slice(0, fit);
  const hidden = LAYERS.slice(fit);
  const hiddenActive = hidden.find((l) => isActive(l.id));

  return (
    <>
      <div className="layer-row" ref={rowRef}>
        <div className="layer-bar" role="tablist" aria-label="Map layer">
          {shown.map((l) => chip(l))}
        </div>
        {hidden.length > 0 && (
          <div className="layer-more">
            <button
              type="button"
              className={`layer-chip${hiddenActive ? ' is-active' : ''}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {hiddenActive ? hiddenActive.label : 'More'}
              <ChevronDown size={14} />
            </button>
            {menuOpen && (
              <div className="layer-menu" role="tablist" aria-label="More map layers">
                {hidden.map((l) => chip(l, ' in-menu'))}
              </div>
            )}
          </div>
        )}
        <div className="layer-measure" ref={measureRef} aria-hidden="true">
          {LAYERS.map((l) => {
            const Icon = ICONS[l.id] ?? Award;
            return (
              <span key={l.id} className={`layer-chip${l.id === 'scorecard' ? ' is-new' : ''}`}>
                <Icon size={14} />
                {l.label}
              </span>
            );
          })}
        </div>
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
          <span className="pillar-note">
            {LOADED.length} of {SCORED.length} indices loaded · weights 25 / 30 / 30 / 15
          </span>
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
  const first = layer.ticks[0];
  const last = layer.ticks[layer.ticks.length - 1];
  return (
    <div className={`legend${keys?.length ? ' has-keys' : ''}`} aria-live="polite">
      <div className="legend-body" key={layer.id}>
        <div className="legend-head">
          <strong>{layer.metric}</strong>
          <span>{layer.unit}</span>
        </div>
        <div className="legend-ramp" style={{ background: `linear-gradient(90deg, ${layer.ramp.join(', ')})` }} />
        <div className="legend-ends">
          <span>
            <b>{first}</b>
            {layer.low}
          </span>
          <span>
            <b>{last}</b>
            {layer.high}
          </span>
        </div>
        {keys?.length ? (
          <div className="legend-keys">
            <span className="legend-key-title">{keyTitle}</span>
            <ul>
              {keys.map((k) => (
                <li key={k.label}>
                  <span className="legend-swatch" style={{ background: k.color }} />
                  {k.label}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="legend-desc">{layer.description}</p>
        )}
      </div>
    </div>
  );
}
