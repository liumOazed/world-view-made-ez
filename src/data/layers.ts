import { scaleLinear, scaleLog, scaleSqrt, scaleSymlog } from 'd3-scale';
import { interpolateRgbBasis } from 'd3-interpolate';
import type { CountryProfile } from './countries';
import { LOADED, PILLARS, SCORED, scorecardOf, type PillarId } from './scorecard';
import { colorOf, SECTIONS, type SectionId } from './sections';
import { CONFLICT_YEARS, hasConflict, hasRegional, nationalConflict, nationalHd, regionalConflict, regionalHd, type HdField } from './regional';

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
  /** Whether this country has regional figures for the layer. */
  hasRegional?: (country: string) => boolean;
  /** Where the regional figures come from: Global Data Lab regions, or events counted on the map. */
  regionSource?: 'gdl' | 'events';
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
  hasRegional,
  regionSource: 'gdl',
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

/* ---------- region-by-region measures inside the sections ---------- */

/** Colours placed at given values (for diverging and log scales). */
function stops(colors: string[], at: number[], scale: (v: number) => number = (v) => v) {
  const s = scaleLinear<string>().domain(at.map(scale)).range(colors).clamp(true);
  return (v: number) => s(scale(v));
}
const GROWTH_RAMP = ['#b4424a', '#e0bb6a', '#d0e0ee', '#6fa8dc', '#2f6db5'];
const DENSITY_RAMP = ['#e8e1f2', '#b9a6d9', '#8a6cc0', '#5d3f99', '#341f63'];
const GENDER_RAMP = ['#b4424a', '#d9824f', '#e0bb6a', '#6fae9c', '#5f9bd3'];
const CONFLICT_RAMP = ['#e9e3d6', '#e6b98f', '#d9824f', '#b4424a', '#6e1e2a'];
const log10 = scaleLog().domain([1, 10]);
const symlog = scaleSymlog().constant(10).domain([0, 1]);

const own = (id: LayerId, f: HdField, o: Omit<Layer, 'id' | 'value' | 'regional' | 'hasRegional' | 'regionSource'>): Layer => ({
  ...o,
  id,
  value: (c) => nationalHd(c.name, f),
  regional: (country, key) => regionalHd(country, key, f),
  hasRegional,
  regionSource: 'gdl',
});

export const REGION_LAYERS: Layer[] = [
  own('growth.r-growth' as LayerId, 'growth', {
    label: 'Income growth',
    metric: 'Growth of income per person',
    unit: '% a year over 5 years, Global Data Lab',
    question: 'Where have incomes grown fastest, region by region?',
    description: 'Average yearly growth of gross national income per person (2011 PPP $) over the last five years, for each state or province.',
    format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
    color: stops(GROWTH_RAMP, [-4, -1, 0, 3, 7]),
    ramp: GROWTH_RAMP,
    low: 'Shrinking',
    high: 'Growing',
    ticks: ['−4%', '0', '+7%'],
  }),
  own('prices.r-density' as LayerId, 'density', {
    label: 'Population density',
    metric: 'Population density',
    unit: 'people per km², Global Data Lab',
    question: 'Where do people live most densely?',
    description: "Each region's population over its land area.",
    format: (v) => `${v >= 100 ? Math.round(v).toLocaleString('en') : v.toFixed(1)} /km²`,
    color: stops(DENSITY_RAMP, [1, 10, 100, 500, 3000], (v) => log10(Math.max(1, v))),
    ramp: DENSITY_RAMP,
    low: 'Sparse',
    high: 'Dense',
    ticks: ['1', '100', '3,000'],
  }),
  own('prices.r-gender' as LayerId, 'gender', {
    label: 'Gender gap',
    metric: 'Gender Development Index',
    unit: "women's HDI over men's, Global Data Lab",
    question: 'Where are women furthest behind men in health, schooling and income?',
    description: "Women's human development as a share of men's; 1 means parity.",
    format: (v) => v.toFixed(3),
    color: stops(GENDER_RAMP, [0.6, 0.8, 0.9, 0.97, 1.02]),
    ramp: GENDER_RAMP,
    low: 'Wider gap',
    high: 'Parity',
    ticks: ['0.60', '0.90', '1.02'],
  }),
  {
    id: 'risk.r-conflict' as LayerId,
    label: 'Conflict deaths',
    metric: 'Deaths in organised violence',
    unit: `${CONFLICT_YEARS[0]}–${CONFLICT_YEARS[1]}, UCDP`,
    question: 'Where has organised violence killed people in the last five years?',
    description: "Deaths in state-based, non-state and one-sided violence (UCDP's best estimate), counted in the region where each event happened.",
    value: (c) => nationalConflict(c.name),
    regional: regionalConflict,
    hasRegional: hasConflict,
    regionSource: 'events',
    format: (v) => (v === 0 ? 'none recorded' : Math.round(v).toLocaleString('en')),
    color: stops(CONFLICT_RAMP, [0, 10, 100, 1000, 10000], (v) => symlog(v)),
    ramp: CONFLICT_RAMP,
    low: 'None',
    high: 'Many',
    ticks: ['0', '100', '10k+'],
  },
];

export const LAYER_BY_ID = Object.fromEntries([...LAYERS, ...PILLAR_LAYERS, ...HD_LAYERS, ...REGION_LAYERS].map((l) => [l.id, l])) as Record<
  LayerId,
  Layer
>;
