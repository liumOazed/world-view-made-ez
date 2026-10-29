import { scaleLinear, scaleSqrt } from 'd3-scale';
import { interpolateRgbBasis } from 'd3-interpolate';
import type { CountryProfile } from './countries';
import { LOADED, PILLARS, SCORED, scorecardOf, type PillarId } from './scorecard';
import { colorOf, SECTIONS, type SectionId } from './sections';

/** `section.sub` for the seven sections, or a scorecard layer. */
export type LayerId = `${SectionId}.${string}` | 'scorecard' | `score-${PillarId}`;

export interface Layer {
  id: LayerId;
  label: string;
  metric: string;
  unit: string;
  question: string;
  description: string;
  /** NaN means no data: the country is drawn in the empty color. */
  value: (c: CountryProfile) => number;
  format: (v: number) => string;
  color: (v: number) => string;
  /** Colors for the legend ramp, left to right. */
  ramp: string[];
  low: string;
  high: string;
  ticks: string[];
}

function ramp(colors: string[], domain: [number, number], sqrt = false) {
  const interp = interpolateRgbBasis(colors);
  const s = (sqrt ? scaleSqrt() : scaleLinear()).domain(domain).clamp(true);
  return (v: number) => interp(s(v));
}

const SCORE = ['#e11d48', '#f97316', '#eab308', '#2dd4bf', '#38bdf8', '#e0f2fe'];

/** One map layer per subsection. */
export const SECTION_LAYERS: Layer[] = SECTIONS.flatMap((s) =>
  s.subs.map((sub) => ({
    id: `${s.id}.${sub.id}` as LayerId,
    label: sub.label,
    metric: sub.map.metric,
    unit: sub.map.unit,
    question: sub.question,
    description: sub.map.description,
    value: (c: CountryProfile) => sub.map.value(c.name),
    format: sub.map.format,
    color: colorOf(sub.map),
    ramp: sub.map.ramp,
    low: sub.map.low,
    high: sub.map.high,
    ticks: sub.map.ticks,
  })),
);

export const LAYERS: Layer[] = [...SECTION_LAYERS];

export const sectionOf = (id: LayerId) => (id.includes('.') ? (id.split('.')[0] as SectionId) : null);
export const layerFor = (section: SectionId, sub?: string) => `${section}.${sub ?? SECTIONS.find((s) => s.id === section)!.subs[0].id}` as LayerId;

const score = (v: number) => (Number.isNaN(v) ? 'Not enough data' : `${Math.round(v)} / 100`);

LAYERS.push({
  id: 'scorecard',
  label: 'Country scorecard',
  metric: 'Overall scorecard',
  unit: `${LOADED.length} of ${SCORED.length} global indices loaded, 0–100`,
  question: 'How do countries compare across global indices?',
  description: 'Weighted blend of four pillars: economy, human development, institutions and stability.',
  value: (c) => scorecardOf(c.name)?.overall ?? NaN,
  format: score,
  color: ramp(SCORE, [15, 90]),
  ramp: SCORE,
  low: 'Weaker',
  high: 'Stronger',
  ticks: ['15', '50', '90'],
});

/** One layer per pillar, reached from the scorecard layer's sub-switcher. */
export const PILLAR_LAYERS: Layer[] = PILLARS.map((p) => ({
  ...LAYERS[LAYERS.length - 1],
  id: `score-${p.id}` as LayerId,
  label: p.short,
  metric: p.label,
  unit: `scorecard pillar, 0–100 · ${p.weight}% of overall`,
  question: `How do countries compare on ${p.label.toLowerCase()}?`,
  value: (c: CountryProfile) => scorecardOf(c.name)?.pillars[p.id].score ?? NaN,
}));

export const SCORE_LAYER = LAYERS[LAYERS.length - 1];

export const LAYER_BY_ID = Object.fromEntries([...LAYERS, ...PILLAR_LAYERS].map((l) => [l.id, l])) as Record<
  LayerId,
  Layer
>;
