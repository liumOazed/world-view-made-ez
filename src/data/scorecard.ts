/**
 * COUNTRY SCORECARD.
 *
 * Values come from src/data/indices.json (scripts/fetch-indices.mjs). Indices
 * not loaded yet have no values and are left out of the score, which is then
 * provisional: pillars and the overall score are computed from what is loaded.
 */
import type { CountryProfile } from './countries';
import snapshot from './indices.json';

export type PillarId = 'economy' | 'human' | 'institutions' | 'stability';

export interface Pillar {
  id: PillarId;
  label: string;
  short: string;
  weight: number;
  color: string;
  emoji: string;
}

export const PILLARS: Pillar[] = [
  { id: 'economy', label: 'Economy & prosperity', short: 'Economy', weight: 25, color: '#38bdf8', emoji: '🏦' },
  { id: 'human', label: 'Human development & quality of life', short: 'Human', weight: 30, color: '#5eead4', emoji: '👨‍👩‍👧' },
  { id: 'institutions', label: 'Institutions & freedom', short: 'Institutions', weight: 30, color: '#a78bfa', emoji: '🏛️' },
  { id: 'stability', label: 'Stability & security', short: 'Stability', weight: 15, color: '#fbbf24', emoji: '🛡️' },
];

export type Licence = 'open' | 'free' | 'restricted';

export interface IndexDef {
  id: string;
  name: string;
  publisher: string;
  /** null = shown for context, not scored. */
  pillar: PillarId | null;
  weight: number;
  cadence: string;
  coverage: number;
  licence: Licence;
  licenceNote: string;
  lowerIsBetter?: boolean;
  format: (v: number) => string;
}

interface Snapshot {
  indices: Record<
    string,
    { publisher: string; via: string; page: string; note?: string; retrieved: string; values: Record<string, [number, number]> }
  >;
}
const DATA = (snapshot as Snapshot).indices;

/** Where a loaded index came from, or undefined while it is not loaded. */
export const indexSource = (id: string) => DATA[id];

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);
const f3 = (v: number) => v.toFixed(3);
const int = (v: number) => String(Math.round(v));

export const INDICES: IndexDef[] = [
  // Economy & prosperity (25)
  { id: 'gdpPpp', name: 'GDP per capita (PPP)', publisher: 'World Bank WDI', pillar: 'economy', weight: 8, cadence: 'Annual (IMF updates Apr & Oct)', coverage: 200, licence: 'open', licenceNote: 'CC BY 4.0', format: (v) => `$${(v / 1000).toFixed(1)}k` },
  { id: 'gii', name: 'Global Innovation Index', publisher: 'WIPO', pillar: 'economy', weight: 6, cadence: 'Annual (Sept)', coverage: 133, licence: 'open', licenceNote: 'CC BY 4.0', format: f1 },
  { id: 'eci', name: 'Economic Complexity Index', publisher: 'Harvard Growth Lab (Atlas)', pillar: 'economy', weight: 6, cadence: 'Annual', coverage: 145, licence: 'free', licenceNote: 'Non-commercial, attribution', format: f2 },
  { id: 'econFreedom', name: 'Index of Economic Freedom', publisher: 'Heritage Foundation', pillar: 'economy', weight: 5, cadence: 'Annual (Feb)', coverage: 184, licence: 'free', licenceNote: 'Free download, attribution', format: f1 },
  // Human development & quality of life (30)
  { id: 'hdi', name: 'Human Development Index', publisher: 'UNDP', pillar: 'human', weight: 10, cadence: 'Annual (spring)', coverage: 193, licence: 'open', licenceNote: 'CC BY 3.0 IGO', format: f3 },
  { id: 'spi', name: 'Social Progress Index', publisher: 'Social Progress Imperative', pillar: 'human', weight: 7, cadence: 'Annual (Jan)', coverage: 170, licence: 'free', licenceNote: 'Non-commercial, attribution', format: f1 },
  { id: 'happiness', name: 'Life evaluation (World Happiness Report)', publisher: 'WHR / Gallup World Poll', pillar: 'human', weight: 5, cadence: 'Annual (March), 3-yr average', coverage: 147, licence: 'free', licenceNote: 'Free download, check reuse terms', format: f2 },
  { id: 'gender', name: 'Global Gender Gap Index', publisher: 'World Economic Forum', pillar: 'human', weight: 4, cadence: 'Annual (June)', coverage: 146, licence: 'free', licenceNote: 'Non-commercial, attribution', format: f3 },
  { id: 'epi', name: 'Environmental Performance Index', publisher: 'Yale / Columbia', pillar: 'human', weight: 4, cadence: 'Every 2 years', coverage: 180, licence: 'free', licenceNote: 'Free, attribution', format: f1 },
  // Institutions & freedom (30)
  { id: 'ruleOfLaw', name: 'Rule of Law', publisher: 'World Bank WGI (WJP planned)', pillar: 'institutions', weight: 8, cadence: 'Annual', coverage: 200, licence: 'open', licenceNote: 'CC BY 4.0', format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}` },
  { id: 'cpi', name: 'Corruption Perceptions Index', publisher: 'Transparency International', pillar: 'institutions', weight: 7, cadence: 'Annual (Feb)', coverage: 180, licence: 'open', licenceNote: 'CC BY-ND 4.0', format: int },
  { id: 'democracy', name: 'Liberal Democracy Index', publisher: 'V-Dem (in place of EIU)', pillar: 'institutions', weight: 7, cadence: 'Annual (March)', coverage: 179, licence: 'open', licenceNote: 'CC BY-SA 4.0', format: f2 },
  { id: 'humanFreedom', name: 'Human Freedom Index', publisher: 'Cato Institute / Fraser', pillar: 'institutions', weight: 4, cadence: 'Annual (Dec), ~2-yr lag', coverage: 165, licence: 'free', licenceNote: 'Free, attribution', format: f2 },
  { id: 'pressFreedom', name: 'World Press Freedom Index', publisher: 'Reporters Without Borders', pillar: 'institutions', weight: 4, cadence: 'Annual (May)', coverage: 180, licence: 'free', licenceNote: 'Free, attribution', format: f1 },
  // Stability & security (15)
  { id: 'gpi', name: 'Global Peace Index', publisher: 'Institute for Economics & Peace', pillar: 'stability', weight: 7, cadence: 'Annual (June)', coverage: 163, licence: 'free', licenceNote: 'Non-commercial, attribution', lowerIsBetter: true, format: f2 },
  { id: 'fsi', name: 'Fragile States Index', publisher: 'Fund for Peace', pillar: 'stability', weight: 5, cadence: 'Annual', coverage: 179, licence: 'free', licenceNote: 'Non-commercial, attribution', lowerIsBetter: true, format: f1 },
  { id: 'gti', name: 'Global Terrorism Index', publisher: 'Institute for Economics & Peace', pillar: 'stability', weight: 3, cadence: 'Annual (March)', coverage: 163, licence: 'free', licenceNote: 'Non-commercial, attribution', lowerIsBetter: true, format: f2 },
  // Context only, not scored
  { id: 'usNews', name: 'U.S. News Best Countries', publisher: 'U.S. News & World Report', pillar: null, weight: 0, cadence: 'Annual (Sept)', coverage: 89, licence: 'restricted', licenceNote: 'Proprietary; rank only, linked', lowerIsBetter: true, format: (v) => `#${Math.round(v)}` },
  { id: 'goodCountry', name: 'Good Country Index', publisher: 'Simon Anholt', pillar: null, weight: 0, cadence: 'Irregular', coverage: 169, licence: 'free', licenceNote: 'Free, attribution', lowerIsBetter: true, format: (v) => `#${Math.round(v)}` },
  { id: 'competitiveness', name: 'World Competitiveness Ranking', publisher: 'IMD (WEF GCI discontinued)', pillar: null, weight: 0, cadence: 'Annual (June)', coverage: 69, licence: 'restricted', licenceNote: 'Paid data; rank only, linked', lowerIsBetter: true, format: (v) => `#${Math.round(v)}` },
];

export const SCORED = INDICES.filter((i) => i.pillar);
export const CONTEXT = INDICES.filter((i) => !i.pillar);

export interface IndexValue {
  def: IndexDef;
  /** False while this index has no data in the snapshot. */
  loaded: boolean;
  raw: number | null;
  year: number | null;
  /** 0–100 percentile among covered countries, best = 100. */
  pct: number | null;
  rank: number | null;
  of: number;
}

export interface Scorecard {
  name: string;
  overall: number | null;
  rank: number | null;
  of: number;
  pillars: Record<PillarId, { score: number | null; rank: number | null }>;
  values: Record<string, IndexValue>;
  covered: number;
}

export const LOADED = SCORED.filter((d) => DATA[d.id]);

let cache: Map<string, Scorecard> | null = null;

export function buildScorecards(profiles: Map<string, CountryProfile>): Map<string, Scorecard> {
  if (cache) return cache;
  const list = [...profiles.values()];
  const raws = new Map<string, Record<string, [number, number] | null>>();
  for (const c of list) raws.set(c.name, Object.fromEntries(INDICES.map((d) => [d.id, DATA[d.id]?.values[c.name] ?? null])));

  const cards = new Map<string, Scorecard>();
  for (const c of list) {
    cards.set(c.name, {
      name: c.name,
      overall: null,
      rank: null,
      of: 0,
      pillars: { economy: { score: null, rank: null }, human: { score: null, rank: null }, institutions: { score: null, rank: null }, stability: { score: null, rank: null } },
      values: {},
      covered: 0,
    });
  }

  for (const d of INDICES) {
    const have = list
      .map((c) => ({ name: c.name, v: raws.get(c.name)![d.id]?.[0] ?? null }))
      .filter((x): x is { name: string; v: number } => x.v !== null)
      .sort((a, b) => (d.lowerIsBetter ? a.v - b.v : b.v - a.v));
    const n = have.length;
    const pos = new Map(have.map((x, i) => [x.name, i]));
    for (const c of list) {
      const got = raws.get(c.name)![d.id];
      const raw = got?.[0] ?? null;
      const i = pos.get(c.name);
      const card = cards.get(c.name)!;
      card.values[d.id] = {
        def: d,
        loaded: Boolean(DATA[d.id]),
        raw,
        year: got?.[1] ?? null,
        pct: i === undefined ? null : Math.round(100 * (1 - i / Math.max(1, n - 1))),
        rank: i === undefined ? null : i + 1,
        of: n,
      };
      if (d.pillar && raw !== null) card.covered++;
    }
  }

  // Pillar = weighted mean of the indices a country has, among those loaded; it
  // needs 60% of the loaded weight. Pillars with nothing loaded are skipped.
  for (const card of cards.values()) {
    let total = 0;
    let wsum = 0;
    let complete = true;
    for (const p of PILLARS) {
      const defs = LOADED.filter((d) => d.pillar === p.id);
      if (!defs.length) continue;
      const full = defs.reduce((s, d) => s + d.weight, 0);
      let acc = 0;
      let w = 0;
      for (const d of defs) {
        const v = card.values[d.id].pct;
        if (v !== null) {
          acc += v * d.weight;
          w += d.weight;
        }
      }
      const score = w >= 0.6 * full ? acc / w : null;
      card.pillars[p.id].score = score;
      if (score === null) complete = false;
      else {
        total += score * p.weight;
        wsum += p.weight;
      }
    }
    card.overall = complete && wsum > 0 ? total / wsum : null;
  }

  const rankBy = (get: (s: Scorecard) => number | null, set: (s: Scorecard, r: number, of: number) => void) => {
    const ranked = [...cards.values()].filter((s) => get(s) !== null).sort((a, b) => get(b)! - get(a)!);
    ranked.forEach((s, i) => set(s, i + 1, ranked.length));
  };
  rankBy((s) => s.overall, (s, r, of) => ((s.rank = r), (s.of = of)));
  for (const p of PILLARS) rankBy((s) => s.pillars[p.id].score, (s, r) => (s.pillars[p.id].rank = r));

  cache = cards;
  return cards;
}

export function scorecardOf(name: string): Scorecard | undefined {
  return cache?.get(name);
}

export const LICENCE_META: Record<Licence, { label: string; color: string }> = {
  open: { label: 'Open licence', color: '#5eead4' },
  free: { label: 'Free, with terms', color: '#fbbf24' },
  restricted: { label: 'Restricted', color: '#fb7185' },
};
