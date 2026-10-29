import { scaleLinear, scaleSqrt } from 'd3-scale';
import { interpolateRgbBasis } from 'd3-interpolate';
import type { CountryProfile } from './countries';
import { PILLARS, scorecardOf, type PillarId } from './scorecard';

export type LayerId =
  | 'growth'
  | 'inflation'
  | 'trade'
  | 'financial'
  | 'geopolitical'
  | 'leverage'
  | 'scorecard'
  | `score-${PillarId}`;

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

const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
const idx = (v: number) => `${Math.round(v)} / 100`;

function ramp(colors: string[], domain: [number, number], sqrt = false) {
  const interp = interpolateRgbBasis(colors);
  const s = (sqrt ? scaleSqrt() : scaleLinear()).domain(domain).clamp(true);
  return (v: number) => interp(s(v));
}

const GROWTH = ['#f43f5e', '#f97316', '#1e40af', '#0ea5e9', '#2dd4bf', '#bbf7d0'];
const INFLATION = ['#1d4ed8', '#0ea5e9', '#facc15', '#f97316', '#ef4444'];
const TRADE = ['#172554', '#1d4ed8', '#06b6d4', '#a7f3d0'];
const FINANCIAL = ['#0f2a3f', '#0e7490', '#eab308', '#f97316', '#e11d48'];
const GEO = ['#13233f', '#4338ca', '#a21caf', '#f43f5e'];
const LEVERAGE = ['#0f1e3a', '#3b2a7a', '#7c3aed', '#c084fc', '#f5d0fe'];
const SCORE = ['#e11d48', '#f97316', '#eab308', '#2dd4bf', '#38bdf8', '#e0f2fe'];

export const LAYERS: Layer[] = [
  {
    id: 'growth',
    label: 'Economic growth',
    metric: 'Real GDP growth',
    unit: '% year over year',
    question: 'Where is output growing or contracting?',
    description: 'Change in inflation-adjusted output versus a year earlier.',
    value: (c) => c.growth,
    format: pct,
    color: (() => {
      const s = scaleLinear<string>().domain([-4, -0.5, 1.5, 3, 5, 7.5]).range(GROWTH).clamp(true);
      return (v: number) => s(v);
    })(),
    ramp: GROWTH,
    low: 'Contracting',
    high: 'Expanding',
    ticks: ['−4%', '+2%', '+8%'],
  },
  {
    id: 'inflation',
    label: 'Inflation',
    metric: 'Consumer price inflation',
    unit: '% year over year',
    question: 'Where are prices rising fastest?',
    description: 'Change in the consumer price index versus a year earlier.',
    value: (c) => c.inflation,
    format: (v) => `${v.toFixed(1)}%`,
    color: ramp(INFLATION, [0, 40], true),
    ramp: INFLATION,
    low: 'Stable',
    high: 'High',
    ticks: ['0%', '10%', '40%+'],
  },
  {
    id: 'trade',
    label: 'Trade dependency',
    metric: 'Trade openness',
    unit: '(exports + imports) as % of GDP',
    question: 'How much does the economy rely on trade?',
    description: 'Higher means more exposed to swings in foreign demand and supply.',
    value: (c) => c.tradeOpenness,
    format: (v) => `${Math.round(v)}% of GDP`,
    color: ramp(TRADE, [20, 180]),
    ramp: TRADE,
    low: 'Closed',
    high: 'Open',
    ticks: ['20%', '100%', '180%'],
  },
  {
    id: 'financial',
    label: 'Financial exposure',
    metric: 'External financial exposure',
    unit: 'composite index, 0–100',
    question: 'Who is most exposed to a funding squeeze?',
    description: 'Foreign-currency debt, refinancing needs and reserve cover, combined.',
    value: (c) => c.finExposure,
    format: idx,
    color: ramp(FINANCIAL, [0, 100]),
    ramp: FINANCIAL,
    low: 'Buffered',
    high: 'Exposed',
    ticks: ['0', '50', '100'],
  },
  {
    id: 'geopolitical',
    label: 'Geopolitical pressure',
    metric: 'Geopolitical pressure',
    unit: 'composite index, 0–100',
    question: 'Where are conflict, sanctions and tensions concentrated?',
    description: 'Conflict exposure, sanctions and diplomatic friction, combined.',
    value: (c) => c.geoPressure,
    format: idx,
    color: ramp(GEO, [0, 100]),
    ramp: GEO,
    low: 'Calm',
    high: 'Tense',
    ticks: ['0', '50', '100'],
  },
  {
    id: 'leverage',
    label: 'Influence & leverage',
    metric: 'Strategic leverage',
    unit: 'composite index, 0–100',
    question: 'Who holds something the world cannot easily replace?',
    description: 'Control of critical resources, chokepoints, currencies or supply chains.',
    value: (c) => c.leverage,
    format: idx,
    color: ramp(LEVERAGE, [0, 100]),
    ramp: LEVERAGE,
    low: 'Dependent',
    high: 'Pivotal',
    ticks: ['0', '50', '100'],
  },
];

const score = (v: number) => (Number.isNaN(v) ? 'Not enough data' : `${Math.round(v)} / 100`);

LAYERS.push({
  id: 'scorecard',
  label: 'Country scorecard',
  metric: 'Overall scorecard',
  unit: '17 global indices, 0–100',
  question: 'How do countries compare across 17 global indices?',
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

export const LAYER_BY_ID = Object.fromEntries([...LAYERS, ...PILLAR_LAYERS].map((l) => [l.id, l])) as Record<
  LayerId,
  Layer
>;
