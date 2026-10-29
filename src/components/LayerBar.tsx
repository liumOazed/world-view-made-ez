import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Activity,
  Award,
  Banknote,
  ChevronDown,
  Flame,
  Landmark,
  ShieldAlert,
  Ship,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { layerFor, PILLAR_LAYERS, sectionOf, type Layer, type LayerId } from '../data/layers';
import { LOADED, SCORED } from '../data/scorecard';
import { SECTIONS, type SectionId } from '../data/sections';

const ICONS: Record<SectionId | 'scorecard', LucideIcon> = {
  growth: Activity,
  prices: Flame,
  government: Landmark,
  trade: Ship,
  money: Banknote,
  influence: Sparkles,
  risk: ShieldAlert,
  scorecard: Award,
};

type Tab = { id: SectionId | 'scorecard'; label: string };
const TABS: Tab[] = [...SECTIONS.map((s) => ({ id: s.id, label: s.label })), { id: 'scorecard', label: 'Scorecard' }];

const GAP = 4;
/** Room kept for the "More" button, which shows the active section's name when that section is hidden. */
const MORE_WIDTH = 96;
const CHEVRON = 22;

export function LayerBar({ layer, onChange, coverage }: { layer: Layer; onChange: (id: LayerId) => void; coverage: string }) {
  const section = sectionOf(layer.id) ?? 'scorecard';
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(TABS.length);
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep the sections on one row: whatever does not fit moves into a "More" menu.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const update = () => {
      const widths = [...measure.children].map((c) => (c as HTMLElement).offsetWidth + GAP);
      const avail = row.clientWidth + GAP;
      const total = widths.reduce((a, b) => a + b, 0);
      // Phones scroll the row sideways instead.
      if (total <= avail || row.clientWidth < 560) return setFit(TABS.length);
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

  const pick = (t: Tab) => {
    onChange(t.id === 'scorecard' ? 'scorecard' : layerFor(t.id));
    setMenuOpen(false);
  };
  const chip = (t: Tab, extra = '') => {
    const Icon = ICONS[t.id];
    const active = t.id === section;
    return (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={active}
        className={`layer-chip${active ? ' is-active' : ''}${extra}`}
        onClick={() => (active ? undefined : pick(t))}
      >
        <Icon size={14} />
        {t.label}
      </button>
    );
  };
  const shown = TABS.slice(0, fit);
  const hidden = TABS.slice(fit);
  const hiddenActive = hidden.find((t) => t.id === section);
  const subs =
    section === 'scorecard'
      ? [{ id: 'scorecard' as LayerId, label: 'All pillars' }, ...PILLAR_LAYERS.map((l) => ({ id: l.id, label: l.label }))]
      : SECTIONS.find((s) => s.id === section)!.subs.map((sub) => ({
          id: layerFor(section, sub.id),
          label: sub.label,
          partial: Boolean(sub.pending),
        }));

  return (
    <>
      <div className="layer-row" ref={rowRef}>
        <div className="layer-bar" role="tablist" aria-label="Section">
          {shown.map((t) => chip(t))}
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
              <div className="layer-menu" role="tablist" aria-label="More sections">
                {hidden.map((t) => chip(t, ' in-menu'))}
              </div>
            )}
          </div>
        )}
        <div className="layer-measure" ref={measureRef} aria-hidden="true">
          {TABS.map((t) => {
            const Icon = ICONS[t.id];
            return (
              <span key={t.id} className="layer-chip">
                <Icon size={14} />
                {t.label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="pillar-bar" role="tablist" aria-label="Subsection">
        {subs.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={l.id === layer.id}
            className={l.id === layer.id ? 'is-active' : undefined}
            onClick={() => onChange(l.id)}
            title={'partial' in l && l.partial ? 'Some of this subsection’s data is not fetched yet' : undefined}
          >
            {l.label}
            {'partial' in l && l.partial && <i className="partial-dot" aria-label="partly loaded" />}
          </button>
        ))}
        <span className="pillar-note">
          {section === 'scorecard' ? `${LOADED.length} of ${SCORED.length} indices loaded · weights 25 / 30 / 30 / 15` : coverage}
        </span>
      </div>
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
