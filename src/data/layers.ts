import { scaleLinear, scaleSqrt } from 'd3-scale';
import { interpolateRgbBasis } from 'd3-interpolate';
import type { CountryProfile } from './countries';
import { LOADED, PILLARS, SCORED, scorecardOf, type PillarId } from './scorecard';
import { colorOf, SECTIONS, type SectionId } from './sections';
import { nationalHd, regionalHd, type HdField } from './regional';

/** `section.sub` for the seven sections, a scorecard layer, or a human development layer. */
export type LayerId = `${SectionId}.${string}` | 'scorecard' | `score-${PillarId}` | `hd.${HdField}`;

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
  /** Value for a state, province or district, where regional figures exist. */
  regional?: (country: string, key: string) => number;
}

function ramp(colors: string[], domain: [number, number], sqrt = false) {
  const interp = interpolateRgbBasis(colors);
  const s = (sqrt ? scaleSqrt() : scaleLinear()).domain(domain).clamp(true);
  return (v: number) => interp(s(v));
}

const SCORE = ['#b4424a', '#d9824f', '#e0bb6a', '#6fae9c', '#5f9bd3', '#d0e0ee'];

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

const SECTION_IDS = new Set<string>(SECTIONS.map((s) => s.id));
export const sectionOf = (id: LayerId) =>
  id.includes('.') && SECTION_IDS.has(id.split('.')[0]) ? (id.split('.')[0] as SectionId) : null;
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

/* ---------- human development, coloured region by region ---------- */

const HD_RAMP = ['#b4424a', '#d9824f', '#e0bb6a', '#6fae9c', '#5f9bd3', '#d0e0ee'];
type HdSpec = Pick<Layer, 'label' | 'metric' | 'unit' | 'question' | 'description' | 'format' | 'low' | 'high' | 'ticks'> & {
  domain: [number, number];
  sqrt?: boolean;
};
const hdLayer = (f: HdField, { domain, sqrt, ...o }: HdSpec): Layer => ({
  ...o,
  id: `hd.${f}`,
  value: (c) => nationalHd(c.name, f),
  regional: (country, key) => regionalHd(country, key, f),
  color: ramp(HD_RAMP, domain, sqrt),
  ramp: HD_RAMP,
});

export const HD_LAYERS: Layer[] = [
  hdLayer('hdi', {
    label: 'Human development',
    metric: 'Human Development Index',
    unit: '0–1, Global Data Lab',
    question: 'Where do people live longest, learn most and earn most?',
    description: 'Health, schooling and income in one index, for countries and their states or provinces.',
    format: (v) => v.toFixed(3),
    low: 'Lower',
    high: 'Higher',
    ticks: ['0.40', '0.70', '0.95'],
    domain: [0.4, 0.95],
  }),
  hdLayer('income', {
    label: 'Income per person',
    metric: 'GNI per person',
    unit: 'US$ per year (2011 PPP), Global Data Lab',
    question: 'Where are incomes highest, region by region?',
    description: 'Gross national income per person at purchasing-power parity, estimated for each region.',
    format: (v) => '$' + (v >= 10000 ? Math.round(v / 1000) : (v / 1000).toFixed(1)) + 'k',
    low: 'Poorer',
    high: 'Richer',
    ticks: ['$1k', '$15k', '$60k'],
    domain: [1000, 60000],
    sqrt: true,
  }),
  hdLayer('life', {
    label: 'Life expectancy',
    metric: 'Life expectancy at birth',
    unit: 'years, Global Data Lab',
    question: 'How long do people live, region by region?',
    description: 'Expected years of life at birth, for countries and their regions.',
    format: (v) => v.toFixed(1) + ' yrs',
    low: 'Shorter',
    high: 'Longer',
    ticks: ['55', '70', '85'],
    domain: [55, 85],
  }),
  hdLayer('school', {
    label: 'Schooling',
    metric: 'Mean years of schooling',
    unit: 'adults 25+, Global Data Lab',
    question: 'How much schooling have adults had, region by region?',
    description: 'Average years of school completed by adults aged 25 and over.',
    format: (v) => v.toFixed(1) + ' yrs',
    low: 'Fewer',
    high: 'More',
    ticks: ['1', '7', '14'],
    domain: [1, 14],
  }),
];

export const LAYER_BY_ID = Object.fromEntries([...LAYERS, ...PILLAR_LAYERS, ...HD_LAYERS].map((l) => [l.id, l])) as Record<
  LayerId,
  Layer
>;
