import { useEffect, useRef, useState } from 'react';
import { Activity, Award, Banknote, ChevronDown, Flame, HeartPulse, Landmark, ShieldAlert, Ship, Sparkles, type LucideIcon } from 'lucide-react';
import { HD_LAYERS, layerFor, PILLAR_LAYERS, sectionOf, type Layer, type LayerId } from '../data/layers';
import { SECTIONS, type SectionId } from '../data/sections';

type Group = SectionId | 'scorecard' | 'hd';

const ICONS: Record<Group, LucideIcon> = {
  growth: Activity,
  prices: Flame,
  government: Landmark,
  trade: Ship,
  money: Banknote,
  influence: Sparkles,
  risk: ShieldAlert,
  scorecard: Award,
  hd: HeartPulse,
};

const GROUPS: { id: Group; label: string; subs: { id: LayerId; label: string; partial?: boolean }[] }[] = [
  ...SECTIONS.map((s) => ({
    id: s.id,
    label: s.label,
    subs: s.subs.map((sub) => ({ id: layerFor(s.id, sub.id), label: sub.label, partial: Boolean(sub.pending) })),
  })),
  {
    id: 'scorecard' as const,
    label: 'Scorecard',
    subs: [{ id: 'scorecard' as LayerId, label: 'All pillars' }, ...PILLAR_LAYERS.map((l) => ({ id: l.id, label: l.label }))],
  },
  // Coloured state by state, not only by country.
  { id: 'hd', label: 'Human development', subs: HD_LAYERS.map((l) => ({ id: l.id, label: l.label })) },
];

/**
 * One control for what the map is coloured by: a pill with the current
 * measure and its colour key, opening a menu of every section and measure.
 */
export function LensPicker({ layer, onChange, note }: { layer: Layer; onChange: (id: LayerId) => void; note: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const section: Group = layer.id.startsWith('hd.') ? 'hd' : (sectionOf(layer.id) ?? 'scorecard');
  const [group, setGroup] = useState<Group>(section);
  const Icon = ICONS[section];

  useEffect(() => setGroup(section), [section]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const g = GROUPS.find((x) => x.id === group)!;
  return (
    <div className="lens" ref={rootRef}>
      {open && (
        <div className="lens-menu" role="dialog" aria-label="Colour the map by">
          <div className="lens-groups" role="tablist" aria-label="Section">
            {GROUPS.map((x) => {
              const I = ICONS[x.id];
              return (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  aria-selected={x.id === group}
                  className={x.id === section ? 'is-current' : undefined}
                  onClick={() => setGroup(x.id)}
                >
                  <I size={14} /> {x.label}
                </button>
              );
            })}
          </div>
          <ul className="lens-subs" aria-label={g.label}>
            {g.subs.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={s.id === layer.id}
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                >
                  {s.label}
                  {s.partial && <i className="partial-dot" title="Some of this data is not fetched yet" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="lens-pill" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon size={15} className="lens-icon" />
        <span className="lens-text">
          <small>Colour by</small>
          <span>{layer.label}</span>
        </span>
        <span className="lens-key" aria-hidden="true">
          <span className="lens-ramp" style={{ background: `linear-gradient(90deg, ${layer.ramp.join(', ')})` }} />
          <span className="lens-ends">
            <span>{layer.ticks[0]}</span>
            <span>{layer.ticks[layer.ticks.length - 1]}</span>
          </span>
        </span>
        <ChevronDown size={15} className="lens-chev" />
      </button>
      <div className="lens-note">
        {layer.metric} · {layer.unit} · {note}
      </div>
    </div>
  );
}
