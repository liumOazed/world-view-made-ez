/**
 * THE SEVEN SECTIONS.
 *
 * Each topic has one home: the economy sections say what the number is,
 * Influence says who has leverage over whom, and Risk scores how dangerous it
 * is, citing the numbers from the other sections. Values come from
 * src/data/sections.json (scripts/fetch-sections.mjs), the FBIC influence file
 * and the scorecard indices. A subsection with no fetched data says so.
 */
import { scaleLinear, scaleSqrt } from 'd3-scale';
import { interpolateRgbBasis } from 'd3-interpolate';
import snapshot from './sections.json';
import { indexSource } from './scorecard';
import { influenceReach, influenceYear, influenceSource } from './connections';

export type SectionId = 'growth' | 'prices' | 'government' | 'trade' | 'money' | 'influence' | 'risk';

export interface Source {
  name: string;
  licence: string;
  url: string;
}

export interface Indicator {
  label: string;
  unit: string;
  source: string;
  code: string;
  retrieved: string;
  values: Record<string, [number, number]>;
  seriesFrom?: number;
  series?: Record<string, (number | null)[]>;
  forecast?: Record<string, [number, number]>;
}

interface Snapshot {
  sources: Record<string, Source>;
  indicators: Record<string, Indicator>;
}
const DATA = snapshot as unknown as Snapshot;
export const SOURCES = DATA.sources;
export const indicator = (id: string): Indicator | undefined => DATA.indicators[id];
export const valueOf = (id: string, country: string) => DATA.indicators[id]?.values[country];
const num = (id: string, country: string) => valueOf(id, country)?.[0] ?? NaN;

/* ---------- formatting ---------- */

const signed = (v: number, d = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}`;
const usd = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1e12 ? `${(a / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(0)}M` : a.toFixed(0);
  return `${v < 0 ? '−' : ''}$${s}`;
};
const count = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(Math.round(v)));

export type Fmt = (v: number) => string;
export const FMT = {
  pct: (v: number) => `${v.toFixed(1)}%`,
  pctSigned: (v: number) => `${signed(v)}%`,
  usd,
  usdBn: (v: number) => usd(v * 1e9),
  dollars: (v: number) => `$${Math.round(v).toLocaleString('en-US')}`,
  months: (v: number) => `${v.toFixed(1)} mo`,
  index: (v: number) => v.toFixed(1),
  wgi: (v: number) => signed(v, 2),
  count,
  kwh: (v: number) => `${Math.round(v).toLocaleString('en-US')} kWh`,
  fx: (v: number) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(v >= 10 ? 1 : 3)),
  score: (v: number) => `${Math.round(v)} / 100`,
} satisfies Record<string, Fmt>;

/**
 * How each indicator reads in a country view: its format and whether a higher
 * value is good news (null when it depends).
 */
export interface MetricMeta {
  fmt: Fmt;
  higherIsBetter: boolean | null;
  /** Short label override for tight rows. */
  label?: string;
}

export const META: Record<string, MetricMeta> = {
  gdpGrowth: { fmt: FMT.pctSigned, higherIsBetter: true },
  gdpUsd: { fmt: FMT.usdBn, higherIsBetter: null, label: 'GDP (current US$)' },
  gdpPcPpp: { fmt: FMT.dollars, higherIsBetter: true, label: 'GDP per person, PPP' },
  gdpPcUsd: { fmt: FMT.dollars, higherIsBetter: true, label: 'GDP per person, US$' },
  outputPerWorker: { fmt: FMT.dollars, higherIsBetter: true },
  agriculture: { fmt: FMT.pct, higherIsBetter: null },
  industry: { fmt: FMT.pct, higherIsBetter: null },
  manufacturing: { fmt: FMT.pct, higherIsBetter: null },
  services: { fmt: FMT.pct, higherIsBetter: null },
  inflation: { fmt: FMT.pct, higherIsBetter: false },
  unemployment: { fmt: FMT.pct, higherIsBetter: false },
  youthUnemployment: { fmt: FMT.pct, higherIsBetter: false },
  participation: { fmt: FMT.pct, higherIsBetter: true },
  consumption: { fmt: FMT.pct, higherIsBetter: null },
  consumptionGrowth: { fmt: FMT.pctSigned, higherIsBetter: true },
  gini: { fmt: FMT.index, higherIsBetter: false },
  poverty: { fmt: FMT.pct, higherIsBetter: false },
  deficit: { fmt: FMT.pctSigned, higherIsBetter: true, label: 'Budget balance' },
  revenue: { fmt: FMT.pct, higherIsBetter: null },
  spending: { fmt: FMT.pct, higherIsBetter: null },
  debt: { fmt: FMT.pct, higherIsBetter: false },
  tax: { fmt: FMT.pct, higherIsBetter: null },
  tradeOpenness: { fmt: FMT.pct, higherIsBetter: null },
  exports: { fmt: FMT.usd, higherIsBetter: null },
  imports: { fmt: FMT.usd, higherIsBetter: null },
  currentAccount: { fmt: FMT.pctSigned, higherIsBetter: true },
  reservesMonths: { fmt: FMT.months, higherIsBetter: true },
  reserves: { fmt: FMT.usd, higherIsBetter: true },
  fxRate: { fmt: FMT.fx, higherIsBetter: null },
  fdi: { fmt: FMT.pctSigned, higherIsBetter: true },
  policyRate: { fmt: FMT.pct, higherIsBetter: null },
  lendingRate: { fmt: FMT.pct, higherIsBetter: null },
  realRate: { fmt: FMT.pctSigned, higherIsBetter: null },
  savings: { fmt: FMT.pct, higherIsBetter: true },
  privateCredit: { fmt: FMT.pct, higherIsBetter: null },
  npl: { fmt: FMT.pct, higherIsBetter: false },
  bankCapital: { fmt: FMT.pct, higherIsBetter: true },
  militarySpend: { fmt: FMT.pct, higherIsBetter: null },
  energyImports: { fmt: FMT.pctSigned, higherIsBetter: false },
  fossilShare: { fmt: FMT.pct, higherIsBetter: false },
  renewablesShare: { fmt: FMT.pct, higherIsBetter: true },
  energyPerCapita: { fmt: FMT.kwh, higherIsBetter: null },
  fuelExports: { fmt: FMT.pct, higherIsBetter: null },
  oresExports: { fmt: FMT.pct, higherIsBetter: null },
  migrants: { fmt: FMT.pct, higherIsBetter: null },
  remittances: { fmt: FMT.pct, higherIsBetter: null },
  externalDebt: { fmt: FMT.pct, higherIsBetter: false },
  debtService: { fmt: FMT.pct, higherIsBetter: false },
  shortTermDebt: { fmt: FMT.pct, higherIsBetter: false },
  politicalStability: { fmt: FMT.wgi, higherIsBetter: true },
  battleDeaths: { fmt: FMT.count, higherIsBetter: false },
  fsiGrievance: { fmt: FMT.index, higherIsBetter: false },
  fsiDemographic: { fmt: FMT.index, higherIsBetter: false },
  fsiRefugees: { fmt: FMT.index, higherIsBetter: false },
  fsiEconomy: { fmt: FMT.index, higherIsBetter: false },
  fsiLegitimacy: { fmt: FMT.index, higherIsBetter: false },
  ndgain: { fmt: FMT.index, higherIsBetter: true },
  ndVulnerability: { fmt: (v) => v.toFixed(3), higherIsBetter: false },
  ndReadiness: { fmt: (v) => v.toFixed(3), higherIsBetter: true },
};

/* ---------- computed measures (ours, from the fetched numbers) ---------- */

/** Goods and services balance as % of GDP, from World Bank trade and IMF GDP. */
export function tradeBalance(c: string) {
  const ex = valueOf('exports', c);
  const im = valueOf('imports', c);
  const gdp = num('gdpUsd', c);
  if (!ex || !im || ex[1] !== im[1] || !Number.isFinite(gdp)) return NaN;
  return ((ex[0] - im[0]) / (gdp * 1e9)) * 100;
}

/** Fuel plus ores and metals, as a share of merchandise exports. */
export function commodityExports(c: string) {
  const f = num('fuelExports', c);
  const o = num('oresExports', c);
  return Number.isFinite(f) || Number.isFinite(o) ? (Number.isFinite(f) ? f : 0) + (Number.isFinite(o) ? o : 0) : NaN;
}

/** IMF growth forecast for next year. */
export const nextYearGrowth = (c: string) => indicator('gdpGrowth')?.forecast?.[c]?.[0] ?? NaN;

export type Outlook = 'Contraction' | 'Weak' | 'Steady' | 'Strong';
/**
 * Our own rule, not a published probability: the IMF's growth forecast for
 * next year sorted into four bands.
 */
export function outlookOf(c: string): Outlook | null {
  const g = nextYearGrowth(c);
  if (!Number.isFinite(g)) return null;
  return g < 0 ? 'Contraction' : g < 1 ? 'Weak' : g < 4 ? 'Steady' : 'Strong';
}

/** Percentile rank (0–100, higher = better) of each country for one measure. */
function percentiles(read: (c: string) => number, countries: string[], higherIsBetter: boolean) {
  const vals = countries.map((c) => [c, read(c)] as const).filter(([, v]) => Number.isFinite(v));
  const sorted = vals.map(([, v]) => v).sort((a, b) => a - b);
  const out = new Map<string, number>();
  for (const [c, v] of vals) {
    let lo = 0;
    while (lo < sorted.length && sorted[lo] < v) lo++;
    let hi = lo;
    while (hi < sorted.length && sorted[hi] === v) hi++;
    const p = ((lo + hi - 1) / 2 / Math.max(1, sorted.length - 1)) * 100;
    out.set(c, higherIsBetter ? p : 100 - p);
  }
  return out;
}

export interface ResilienceInput {
  id: string;
  label: string;
  higherIsBetter: boolean;
  read: (c: string) => number;
  fmt: Fmt;
  home: SectionId;
}

const fsiTotal = (c: string) => indexSource('fsi')?.values[c]?.[0] ?? NaN;

/** Inputs to the resilience score; each one lives in its home section. */
export const RESILIENCE_INPUTS: ResilienceInput[] = [
  { id: 'reservesMonths', label: 'Reserves', higherIsBetter: true, read: (c) => num('reservesMonths', c), fmt: FMT.months, home: 'trade' },
  { id: 'currentAccount', label: 'Current account', higherIsBetter: true, read: (c) => num('currentAccount', c), fmt: FMT.pctSigned, home: 'trade' },
  { id: 'debt', label: 'Public debt', higherIsBetter: false, read: (c) => num('debt', c), fmt: FMT.pct, home: 'government' },
  { id: 'deficit', label: 'Budget balance', higherIsBetter: true, read: (c) => num('deficit', c), fmt: FMT.pctSigned, home: 'government' },
  { id: 'inflation', label: 'Inflation', higherIsBetter: false, read: (c) => num('inflation', c), fmt: FMT.pct, home: 'prices' },
  { id: 'politicalStability', label: 'Political stability', higherIsBetter: true, read: (c) => num('politicalStability', c), fmt: FMT.wgi, home: 'risk' },
  { id: 'fsi', label: 'Fragile States Index', higherIsBetter: false, read: fsiTotal, fmt: FMT.index, home: 'risk' },
  { id: 'ndgain', label: 'Climate readiness (ND-GAIN)', higherIsBetter: true, read: (c) => num('ndgain', c), fmt: FMT.index, home: 'risk' },
];
const MIN_INPUTS = 5;

let resilienceCache: Map<string, { score: number; parts: { input: ResilienceInput; pct: number }[] }> | null = null;
/** Our composite: the mean percentile across the inputs a country has, if it has enough of them. */
export function resilience(c: string, countries?: string[]) {
  if (!resilienceCache) {
    const names = countries ?? Object.keys(indicator('gdpUsd')?.values ?? {});
    const ranks = RESILIENCE_INPUTS.map((input) => ({ input, ranks: percentiles(input.read, names, input.higherIsBetter) }));
    resilienceCache = new Map();
    for (const n of names) {
      const parts = ranks.flatMap(({ input, ranks: r }) => (r.has(n) ? [{ input, pct: r.get(n)! }] : []));
      if (parts.length < MIN_INPUTS) continue;
      resilienceCache.set(n, { score: parts.reduce((s, p) => s + p.pct, 0) / parts.length, parts });
    }
  }
  return resilienceCache.get(c);
}

/* ---------- map scales ---------- */

const RED_BLUE = ['#e11d48', '#f97316', '#1e40af', '#0ea5e9', '#2dd4bf', '#bbf7d0'];
const HEAT = ['#1d4ed8', '#0ea5e9', '#facc15', '#f97316', '#ef4444'];
const COOL = ['#172554', '#1d4ed8', '#06b6d4', '#a7f3d0'];
const WARM = ['#0f2a3f', '#0e7490', '#eab308', '#f97316', '#e11d48'];
const VIOLET = ['#0f1e3a', '#3b2a7a', '#7c3aed', '#c084fc', '#f5d0fe'];
const GOOD = ['#e11d48', '#f97316', '#eab308', '#2dd4bf', '#38bdf8', '#e0f2fe'];
const DIVERGE = ['#e11d48', '#f97316', '#334155', '#0ea5e9', '#5eead4'];

export interface MapSpec {
  metric: string;
  unit: string;
  value: (c: string) => number;
  format: Fmt;
  ramp: string[];
  /** Domain stops matching the ramp colors, or [min, max] for an even spread. */
  domain: number[];
  sqrt?: boolean;
  low: string;
  high: string;
  ticks: string[];
  description: string;
}

function colorFor(spec: Pick<MapSpec, 'ramp' | 'domain' | 'sqrt'>) {
  if (spec.domain.length === spec.ramp.length) {
    const s = scaleLinear<string>().domain(spec.domain).range(spec.ramp).clamp(true);
    return (v: number) => s(v);
  }
  const interp = interpolateRgbBasis(spec.ramp);
  const s = (spec.sqrt ? scaleSqrt() : scaleLinear()).domain(spec.domain as [number, number]).clamp(true);
  return (v: number) => interp(s(v));
}
export const colorOf = colorFor;

const ind = (
  id: string,
  rest: Omit<MapSpec, 'metric' | 'unit' | 'value' | 'format'> & Partial<Pick<MapSpec, 'metric' | 'unit' | 'format'>>,
): MapSpec => ({
  metric: indicator(id)?.label ?? META[id]?.label ?? id,
  unit: indicator(id)?.unit ?? '',
  value: (c) => num(id, c),
  format: META[id]?.fmt ?? FMT.index,
  ...rest,
});

/* ---------- sections ---------- */

export interface Subsection {
  id: string;
  label: string;
  question: string;
  map: MapSpec;
  /** Indicator ids shown in the country view, headline first. */
  metrics: string[];
  /** Connection lines drawn on the map when a country is selected. */
  arcs?: 'trade' | 'influence' | 'energy';
  /** Where a related number lives, per the one-home rule. */
  seeAlso?: { section: SectionId; sub: string; label: string }[];
  /** Data not fetched yet, said plainly in the UI. */
  pending?: string;
  /** Set when the measure is our own construction rather than a published figure. */
  ours?: string;
}

export interface Section {
  id: SectionId;
  label: string;
  short: string;
  blurb: string;
  subs: Subsection[];
}

const influenceSpec: MapSpec = {
  metric: 'Influence capacity (FBIC)',
  unit: `percentile of total influence over other countries, ${influenceYear}`,
  value: (c) => influenceReach(c),
  format: (v) => `${Math.round(v)} / 100`,
  ramp: VIOLET,
  domain: [0, 100],
  low: 'Little reach',
  high: 'Wide reach',
  ticks: ['0', '50', '100'],
  description: 'FBIC Index (Pardee Institute): economic, security and political ties, summed over every other country.',
};

export const SECTIONS: Section[] = [
  {
    id: 'growth',
    label: 'Growth',
    short: 'Growth',
    blurb: 'What the economy produces and where it is heading.',
    subs: [
      {
        id: 'gdp',
        label: 'GDP & growth',
        question: 'Where is output growing or contracting?',
        map: ind('gdpGrowth', {
          ramp: RED_BLUE,
          domain: [-4, -0.5, 1.5, 3, 5, 7.5],
          low: 'Contracting',
          high: 'Expanding',
          ticks: ['−4%', '+2%', '+8%'],
          description: 'Change in inflation-adjusted output versus the year before (IMF WEO).',
        }),
        metrics: ['gdpGrowth', 'gdpUsd'],
      },
      {
        id: 'perCapita',
        label: 'GDP per capita',
        question: 'Where is output per person highest?',
        map: ind('gdpPcPpp', {
          ramp: COOL,
          domain: [1000, 120000],
          sqrt: true,
          low: 'Lower',
          high: 'Higher',
          ticks: ['$1k', '$30k', '$120k'],
          description: 'GDP per person at purchasing power parity, constant 2021 international dollars.',
        }),
        metrics: ['gdpPcPpp', 'gdpPcUsd'],
      },
      {
        id: 'productivity',
        label: 'Productivity & output',
        question: 'How much does each worker produce?',
        map: ind('outputPerWorker', {
          ramp: COOL,
          domain: [2000, 200000],
          sqrt: true,
          low: 'Lower',
          high: 'Higher',
          ticks: ['$2k', '$50k', '$200k'],
          description: 'GDP per person employed, constant 2021 PPP dollars (ILO modelled estimates).',
        }),
        metrics: ['outputPerWorker'],
      },
      {
        id: 'sectors',
        label: 'Sectors',
        question: 'How big is manufacturing in each economy?',
        map: ind('manufacturing', {
          ramp: COOL,
          domain: [0, 30],
          low: 'Small',
          high: 'Large',
          ticks: ['0%', '15%', '30%+'],
          description: 'Manufacturing value added as a share of GDP. The country view shows all four sectors.',
        }),
        metrics: ['services', 'industry', 'manufacturing', 'agriculture'],
      },
      {
        id: 'outlook',
        label: 'Outlook & recession odds',
        question: 'Where is growth expected next year?',
        map: {
          metric: 'IMF growth forecast, next year',
          unit: '% change, real GDP',
          value: nextYearGrowth,
          format: FMT.pctSigned,
          ramp: RED_BLUE,
          domain: [-4, -0.5, 1.5, 3, 5, 7.5],
          low: 'Contraction',
          high: 'Strong',
          ticks: ['−4%', '+2%', '+8%'],
          description: 'IMF World Economic Outlook projection. The outlook band is our own rule on that forecast.',
        },
        metrics: ['gdpGrowth'],
        ours: 'Outlook band is our rule on the IMF forecast: below 0% contraction, 0–1% weak, 1–4% steady, above 4% strong. No open per-country recession probability exists.',
      },
    ],
  },
  {
    id: 'prices',
    label: 'Prices & people',
    short: 'Prices',
    blurb: 'Cost of living and how people are doing.',
    subs: [
      {
        id: 'inflation',
        label: 'Inflation',
        question: 'Where are prices rising fastest?',
        map: ind('inflation', {
          ramp: HEAT,
          domain: [0, 40],
          sqrt: true,
          low: 'Stable',
          high: 'High',
          ticks: ['0%', '10%', '40%+'],
          description: 'Average consumer price inflation for the year (IMF WEO).',
        }),
        metrics: ['inflation'],
      },
      {
        id: 'employment',
        label: 'Employment',
        question: 'Where is unemployment highest?',
        map: ind('unemployment', {
          ramp: HEAT,
          domain: [0, 30],
          sqrt: true,
          low: 'Low',
          high: 'High',
          ticks: ['0%', '8%', '30%'],
          description: 'Unemployment as a share of the labour force (ILO modelled estimates).',
        }),
        metrics: ['unemployment', 'youthUnemployment', 'participation'],
      },
      {
        id: 'consumption',
        label: 'Consumption',
        question: 'How much of the economy is household spending?',
        map: ind('consumption', {
          ramp: COOL,
          domain: [20, 100],
          low: 'Smaller share',
          high: 'Larger share',
          ticks: ['20%', '60%', '100%'],
          description: 'Household final consumption expenditure as a share of GDP.',
        }),
        metrics: ['consumption', 'consumptionGrowth'],
      },
      {
        id: 'inequality',
        label: 'Inequality & poverty',
        question: 'Where is income most unequal?',
        map: ind('gini', {
          ramp: WARM,
          domain: [24, 63],
          low: 'More equal',
          high: 'Less equal',
          ticks: ['24', '40', '63'],
          description: 'Gini index from household surveys; survey years vary by country.',
        }),
        metrics: ['gini', 'poverty'],
      },
    ],
  },
  {
    id: 'government',
    label: 'Government',
    short: 'Government',
    blurb: 'Public finances.',
    subs: [
      {
        id: 'budget',
        label: 'Budget & deficit',
        question: 'Who runs the largest budget deficits?',
        map: ind('deficit', {
          metric: 'Budget balance',
          ramp: DIVERGE,
          domain: [-10, -5, 0, 3, 8],
          low: 'Deficit',
          high: 'Surplus',
          ticks: ['−10%', '0%', '+8%'],
          description: 'General government net lending (+) or borrowing (−), share of GDP (IMF WEO).',
        }),
        metrics: ['deficit', 'revenue', 'spending'],
      },
      {
        id: 'debt',
        label: 'Public debt',
        question: 'Where is government debt highest?',
        map: ind('debt', {
          ramp: WARM,
          domain: [0, 150],
          low: 'Low',
          high: 'High',
          ticks: ['0%', '75%', '150%+'],
          description: 'General government gross debt as a share of GDP (IMF WEO).',
        }),
        metrics: ['debt'],
      },
      {
        id: 'tax',
        label: 'Tax',
        question: 'How much does the state collect in tax?',
        map: ind('tax', {
          ramp: COOL,
          domain: [0, 35],
          low: 'Low',
          high: 'High',
          ticks: ['0%', '18%', '35%'],
          description: 'Central government tax revenue as a share of GDP (World Bank).',
        }),
        metrics: ['tax'],
      },
    ],
  },
  {
    id: 'trade',
    label: 'Trade',
    short: 'Trade',
    blurb: 'Goods, money and currency crossing borders.',
    subs: [
      {
        id: 'dependency',
        label: 'Trade dependency',
        question: 'How much does the economy rely on trade?',
        map: ind('tradeOpenness', {
          ramp: COOL,
          domain: [20, 180],
          low: 'Closed',
          high: 'Open',
          ticks: ['20%', '100%', '180%'],
          description: 'Exports plus imports of goods and services, share of GDP. Select a country for its top trade partners.',
        }),
        metrics: ['tradeOpenness'],
        arcs: 'trade',
      },
      {
        id: 'balance',
        label: 'Trade balance',
        question: 'Who sells the world more than it buys?',
        map: {
          metric: 'Trade balance',
          unit: 'goods and services, % of GDP',
          value: tradeBalance,
          format: FMT.pctSigned,
          ramp: DIVERGE,
          domain: [-20, -5, 0, 5, 20],
          low: 'Deficit',
          high: 'Surplus',
          ticks: ['−20%', '0%', '+20%'],
          description: 'Exports minus imports of goods and services (World Bank), over GDP (IMF).',
        },
        metrics: ['exports', 'imports'],
      },
      {
        id: 'external',
        label: 'Current account & reserves',
        question: 'Who earns more abroad than it spends?',
        map: ind('currentAccount', {
          ramp: DIVERGE,
          domain: [-10, -3, 0, 3, 10],
          low: 'Deficit',
          high: 'Surplus',
          ticks: ['−10%', '0%', '+10%'],
          description: 'Current account balance as a share of GDP (IMF WEO).',
        }),
        metrics: ['currentAccount', 'reservesMonths', 'reserves'],
      },
      {
        id: 'currency',
        label: 'Currency',
        question: 'How many units of local currency buy one US dollar?',
        map: ind('fxRate', {
          ramp: COOL,
          domain: [0.3, 30000],
          sqrt: true,
          low: 'Few',
          high: 'Many',
          ticks: ['<1', '100', '10k+'],
          description: 'Official exchange rate, annual average. The level only says how a currency is denominated, not its strength.',
        }),
        metrics: ['fxRate'],
        pending: 'Year-on-year moves and the real effective exchange rate (BIS) are not fetched yet.',
      },
      {
        id: 'investment',
        label: 'Investment & capital flows',
        question: 'Where is foreign direct investment flowing in?',
        map: ind('fdi', {
          ramp: DIVERGE,
          domain: [-2, 0, 1.5, 4, 10],
          low: 'Outflow',
          high: 'Large inflow',
          ticks: ['−2%', '+2%', '+10%'],
          description: 'Net inflows of foreign direct investment, share of GDP.',
        }),
        metrics: ['fdi'],
        pending: 'Who invests where (IMF bilateral direct investment) is not fetched yet.',
      },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    short: 'Money',
    blurb: 'Rates, savings and banks.',
    subs: [
      {
        id: 'rates',
        label: 'Interest rates & policy',
        question: 'Where are central bank rates highest?',
        map: ind('policyRate', {
          ramp: HEAT,
          domain: [0, 30],
          sqrt: true,
          low: 'Low',
          high: 'High',
          ticks: ['0%', '8%', '30%'],
          description: 'Central bank policy rate, latest month (BIS). Covers about 60 economies, euro members share the ECB rate.',
        }),
        metrics: ['policyRate', 'lendingRate', 'realRate'],
      },
      {
        id: 'savings',
        label: 'Savings',
        question: 'Which economies save the most?',
        map: ind('savings', {
          ramp: COOL,
          domain: [0, 50],
          low: 'Low',
          high: 'High',
          ticks: ['0%', '25%', '50%'],
          description: 'Gross national savings as a share of GDP.',
        }),
        metrics: ['savings'],
      },
      {
        id: 'banking',
        label: 'Banking system',
        question: 'Where are bad loans weighing on banks?',
        map: ind('npl', {
          ramp: WARM,
          domain: [0, 25],
          sqrt: true,
          low: 'Healthy',
          high: 'Stressed',
          ticks: ['0%', '6%', '25%'],
          description: 'Non-performing loans as a share of gross loans (IMF Financial Soundness Indicators via World Bank).',
        }),
        metrics: ['npl', 'bankCapital', 'privateCredit'],
      },
    ],
  },
  {
    id: 'influence',
    label: 'Influence',
    short: 'Influence',
    blurb: 'Who has leverage over whom.',
    subs: [
      {
        id: 'network',
        label: 'Influence network',
        question: 'Who has the most capacity to sway other countries?',
        map: influenceSpec,
        metrics: [],
        arcs: 'influence',
      },
      {
        id: 'leverage',
        label: 'Economic leverage & sanctions',
        question: 'Who can apply economic pressure, and on whom?',
        map: influenceSpec,
        metrics: [],
        arcs: 'influence',
        pending: 'FBIC’s economic strand and sanctions lists are not fetched yet; the map shows overall FBIC influence for now.',
      },
      {
        id: 'security',
        label: 'Security & alliances',
        question: 'Who spends the most on defence?',
        map: ind('militarySpend', {
          ramp: VIOLET,
          domain: [0, 6],
          sqrt: true,
          low: 'Low',
          high: 'High',
          ticks: ['0%', '2%', '6%+'],
          description: 'Military expenditure as a share of GDP (SIPRI via World Bank).',
        }),
        metrics: ['militarySpend'],
        pending: 'Alliance membership and arms transfers are not fetched yet.',
      },
      {
        id: 'energy',
        label: 'Energy, resources & supply chains',
        question: 'Who depends on imported energy?',
        map: ind('energyImports', {
          metric: 'Net energy imports',
          ramp: ['#2dd4bf', '#0ea5e9', '#334155', '#f97316', '#e11d48'],
          domain: [-200, -20, 0, 50, 100],
          low: 'Exporter',
          high: 'Importer',
          ticks: ['−200%', '0', '100%'],
          description: 'Energy imports net of exports, as a share of energy use. Negative means a net exporter.',
        }),
        metrics: ['energyImports', 'fossilShare', 'renewablesShare', 'energyPerCapita', 'fuelExports'],
        arcs: 'energy',
      },
      {
        id: 'diplomacy',
        label: 'Diplomacy & institutions',
        question: 'Who has the widest political ties?',
        map: influenceSpec,
        metrics: [],
        arcs: 'influence',
        pending: 'FBIC’s political strand and UN voting data are not fetched yet; the map shows overall FBIC influence for now.',
      },
      {
        id: 'people',
        label: 'Soft power & people',
        question: 'Where do migrants make up the largest share of people?',
        map: ind('migrants', {
          ramp: VIOLET,
          domain: [0, 50],
          sqrt: true,
          low: 'Few',
          high: 'Many',
          ticks: ['0%', '12%', '50%+'],
          description: 'International migrant stock as a share of population (UN DESA via World Bank).',
        }),
        metrics: ['migrants', 'remittances'],
      },
    ],
  },
  {
    id: 'risk',
    label: 'Risk',
    short: 'Risk',
    blurb: 'How dangerous it is, as scores that cite the numbers above.',
    subs: [
      {
        id: 'resilience',
        label: 'Resilience score',
        question: 'Which economies have the strongest buffers?',
        map: {
          metric: 'Resilience score',
          unit: 'our composite, 0–100, higher is more resilient',
          value: (c) => resilience(c)?.score ?? NaN,
          format: FMT.score,
          ramp: GOOD,
          domain: [10, 90],
          low: 'Fragile',
          high: 'Resilient',
          ticks: ['10', '50', '90'],
          description: 'Mean percentile across reserves, current account, debt, budget balance, inflation, political stability, fragility and climate readiness.',
        },
        metrics: [],
        ours: 'Our composite: each input is ranked against every country, then averaged. Countries need at least five of the eight inputs.',
      },
      {
        id: 'debtRisk',
        label: 'Debt & external financing',
        question: 'Where is foreign debt heaviest?',
        map: ind('externalDebt', {
          ramp: WARM,
          domain: [0, 120],
          low: 'Light',
          high: 'Heavy',
          ticks: ['0%', '60%', '120%+'],
          description: 'External debt stocks as a share of GNI. Covers low and middle income countries only (World Bank IDS).',
        }),
        metrics: ['externalDebt', 'debtService', 'shortTermDebt'],
        seeAlso: [{ section: 'government', sub: 'debt', label: 'Public debt' }],
      },
      {
        id: 'contagion',
        label: 'Financial contagion',
        question: 'How much could banks abroad pull back?',
        map: ind('shortTermDebt', {
          metric: 'Short-term external debt',
          ramp: WARM,
          domain: [0, 50],
          low: 'Low',
          high: 'High',
          ticks: ['0%', '25%', '50%'],
          description: 'Short-term debt as a share of total external debt: the part that has to be rolled over within a year.',
        }),
        metrics: ['shortTermDebt', 'privateCredit'],
        pending: 'Cross-border bank claims (BIS banking statistics) are not fetched yet; the map uses short-term external debt as a stand-in.',
      },
      {
        id: 'shock',
        label: 'Shock exposure',
        question: 'Who relies on commodity exports?',
        map: {
          metric: 'Commodity exports',
          unit: 'fuel, ores and metals, % of merchandise exports',
          value: commodityExports,
          format: FMT.pct,
          ramp: WARM,
          domain: [0, 100],
          low: 'Diversified',
          high: 'Concentrated',
          ticks: ['0%', '50%', '100%'],
          description: 'Fuel plus ores and metals as a share of goods exports: high values swing with commodity prices.',
        },
        metrics: ['fuelExports', 'oresExports'],
        seeAlso: [
          { section: 'trade', sub: 'dependency', label: 'Trade dependency' },
          { section: 'influence', sub: 'energy', label: 'Energy imports' },
        ],
      },
      {
        id: 'political',
        label: 'Political & conflict',
        question: 'Where is political violence most likely?',
        map: ind('politicalStability', {
          metric: 'Political stability',
          ramp: GOOD,
          domain: [-2.5, 1.5],
          low: 'Unstable',
          high: 'Stable',
          ticks: ['−2.5', '0', '+1.5'],
          description: 'Political Stability and Absence of Violence estimate (World Bank Worldwide Governance Indicators).',
        }),
        metrics: ['politicalStability', 'battleDeaths', 'fsiLegitimacy'],
      },
      {
        id: 'social',
        label: 'Social stability',
        question: 'Where are societies under most strain?',
        map: {
          metric: 'Fragile States Index',
          unit: 'total score, 0–120, lower is more stable',
          value: fsiTotal,
          format: FMT.index,
          ramp: [...GOOD].reverse(),
          domain: [20, 110],
          low: 'Stable',
          high: 'Fragile',
          ticks: ['20', '65', '110'],
          description: 'Fund for Peace: twelve pressures from security to public services, summed.',
        },
        metrics: ['fsiGrievance', 'fsiDemographic', 'fsiRefugees', 'fsiEconomy'],
        seeAlso: [{ section: 'prices', sub: 'inequality', label: 'Inequality & poverty' }],
      },
      {
        id: 'climate',
        label: 'Climate & disasters',
        question: 'Who is most exposed to climate change, and least ready for it?',
        map: ind('ndgain', {
          metric: 'Climate adaptation (ND-GAIN)',
          ramp: GOOD,
          domain: [25, 75],
          low: 'Vulnerable',
          high: 'Prepared',
          ticks: ['25', '50', '75'],
          description: 'ND-GAIN Country Index (Notre Dame): vulnerability to climate change set against readiness to adapt.',
        }),
        metrics: ['ndgain', 'ndVulnerability', 'ndReadiness'],
        pending: 'Disaster hazard scores (INFORM Risk Index) are not loaded: its API returned no data.',
      },
    ],
  },
];

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<SectionId, Section>;

export function findSub(section: SectionId, sub: string) {
  return SECTION_BY_ID[section].subs.find((s) => s.id === sub) ?? SECTION_BY_ID[section].subs[0];
}

/** How many countries the subsection's map can color. */
export function coverage(sub: Subsection, countries: string[]) {
  return countries.filter((c) => Number.isFinite(sub.map.value(c))).length;
}

/** Source line for an indicator: publisher, year range and licence. */
export function sourceOf(id: string) {
  const i = indicator(id);
  if (!i) return undefined;
  const src = SOURCES[i.source];
  return { ...src, code: i.code, retrieved: i.retrieved };
}

/* ---------- world aggregates ---------- */

/**
 * A world figure per year from the IMF series: weighted by GDP in US$ when
 * `weighted`, otherwise the median country. Years after the latest actual are
 * forecasts.
 */
export function worldSeries(id: string, weighted: boolean) {
  const ind = indicator(id);
  const gdp = indicator('gdpUsd');
  if (!ind?.series || ind.seriesFrom === undefined || !gdp?.series) return null;
  const len = Math.max(...Object.values(ind.series).map((s) => s.length));
  const out: { year: number; value: number; n: number }[] = [];
  for (let i = 0; i < len; i++) {
    const pairs = Object.entries(ind.series)
      .map(([c, s]) => [s[i], gdp.series![c]?.[i]] as const)
      .filter((p): p is readonly [number, number] => p[0] !== null && p[0] !== undefined && typeof p[1] === 'number');
    if (pairs.length < 50) continue;
    let value: number;
    if (weighted) {
      const w = pairs.reduce((s, [, g]) => s + g, 0);
      value = pairs.reduce((s, [v, g]) => s + v * g, 0) / w;
    } else {
      const sorted = pairs.map(([v]) => v).sort((a, b) => a - b);
      value = sorted[Math.floor(sorted.length / 2)];
    }
    out.push({ year: ind.seriesFrom + i, value, n: pairs.length });
  }
  return out;
}

export { influenceSource };
