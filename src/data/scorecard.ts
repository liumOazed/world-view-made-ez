/**
 * COUNTRY SCORECARD — MOCK FOR REVIEW.
 *
 * The index list, pillars, weights and source notes below are the proposal.
 * The per-country values are generated placeholders shaped like each index's
 * real scale so the layout can be judged. None of them come from the actual
 * publishers yet.
 */
import { seeded, type CountryProfile } from './countries';

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
  /** Native scale, used to fake believable values. */
  min: number;
  max: number;
  lowerIsBetter?: boolean;
  format: (v: number) => string;
  year: number;
}

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);
const f3 = (v: number) => v.toFixed(3);
const int = (v: number) => String(Math.round(v));

export const INDICES: IndexDef[] = [
  // Economy & prosperity (25)
  { id: 'gdpPpp', name: 'GDP per capita (PPP)', publisher: 'World Bank WDI / IMF WEO', pillar: 'economy', weight: 8, cadence: 'Annual (IMF updates Apr & Oct)', coverage: 200, licence: 'open', licenceNote: 'CC BY 4.0', min: 900, max: 130000, format: (v) => `$${Math.round(v / 100) / 10}k`, year: 2025 },
  { id: 'gii', name: 'Global Innovation Index', publisher: 'WIPO', pillar: 'economy', weight: 6, cadence: 'Annual (Sept)', coverage: 133, licence: 'open', licenceNote: 'CC BY 4.0', min: 10, max: 68, format: f1, year: 2025 },
  { id: 'eci', name: 'Economic Complexity Index', publisher: 'Harvard Growth Lab (Atlas)', pillar: 'economy', weight: 6, cadence: 'Annual', coverage: 145, licence: 'free', licenceNote: 'Non-commercial, attribution', min: -2, max: 2.6, format: f2, year: 2023 },
  { id: 'econFreedom', name: 'Index of Economic Freedom', publisher: 'Heritage Foundation', pillar: 'economy', weight: 5, cadence: 'Annual (Feb)', coverage: 184, licence: 'free', licenceNote: 'Free download, attribution', min: 30, max: 85, format: f1, year: 2026 },
  // Human development & quality of life (30)
  { id: 'hdi', name: 'Human Development Index', publisher: 'UNDP', pillar: 'human', weight: 10, cadence: 'Annual (spring)', coverage: 193, licence: 'open', licenceNote: 'CC BY 3.0 IGO', min: 0.38, max: 0.97, format: f3, year: 2023 },
  { id: 'spi', name: 'Social Progress Index', publisher: 'Social Progress Imperative', pillar: 'human', weight: 7, cadence: 'Annual (Jan)', coverage: 170, licence: 'free', licenceNote: 'Non-commercial, attribution', min: 30, max: 92, format: f1, year: 2025 },
  { id: 'happiness', name: 'World Happiness Report', publisher: 'WHR / Gallup World Poll', pillar: 'human', weight: 5, cadence: 'Annual (March), 3-yr average', coverage: 147, licence: 'free', licenceNote: 'Free download, check reuse terms', min: 2, max: 7.8, format: f2, year: 2026 },
  { id: 'gender', name: 'Global Gender Gap Index', publisher: 'World Economic Forum', pillar: 'human', weight: 4, cadence: 'Annual (June)', coverage: 146, licence: 'free', licenceNote: 'Non-commercial, attribution', min: 0.57, max: 0.93, format: f3, year: 2025 },
  { id: 'epi', name: 'Environmental Performance Index', publisher: 'Yale / Columbia', pillar: 'human', weight: 4, cadence: 'Every 2 years', coverage: 180, licence: 'free', licenceNote: 'Free, attribution', min: 25, max: 78, format: f1, year: 2024 },
  // Institutions & freedom (30)
  { id: 'ruleOfLaw', name: 'Rule of Law Index', publisher: 'World Justice Project', pillar: 'institutions', weight: 8, cadence: 'Annual (Oct)', coverage: 142, licence: 'free', licenceNote: 'Non-commercial; WGI fills gaps', min: 0.28, max: 0.9, format: f2, year: 2025 },
  { id: 'cpi', name: 'Corruption Perceptions Index', publisher: 'Transparency International', pillar: 'institutions', weight: 7, cadence: 'Annual (Feb)', coverage: 180, licence: 'open', licenceNote: 'CC BY-ND 4.0', min: 8, max: 90, format: int, year: 2025 },
  { id: 'democracy', name: 'Democracy Index', publisher: 'EIU (or V-Dem as open swap)', pillar: 'institutions', weight: 7, cadence: 'Annual (Feb)', coverage: 167, licence: 'restricted', licenceNote: 'EIU data gated; V-Dem is CC BY-SA', min: 0.3, max: 9.8, format: f2, year: 2025 },
  { id: 'humanFreedom', name: 'Human Freedom Index', publisher: 'Cato Institute / Fraser', pillar: 'institutions', weight: 4, cadence: 'Annual (Dec), ~2-yr lag', coverage: 165, licence: 'free', licenceNote: 'Free, attribution', min: 3.5, max: 9.1, format: f2, year: 2023 },
  { id: 'pressFreedom', name: 'World Press Freedom Index', publisher: 'Reporters Without Borders', pillar: 'institutions', weight: 4, cadence: 'Annual (May)', coverage: 180, licence: 'free', licenceNote: 'Free, attribution', min: 18, max: 93, format: f1, year: 2026 },
  // Stability & security (15)
  { id: 'gpi', name: 'Global Peace Index', publisher: 'Institute for Economics & Peace', pillar: 'stability', weight: 7, cadence: 'Annual (June)', coverage: 163, licence: 'free', licenceNote: 'Non-commercial, attribution', min: 1.1, max: 3.4, lowerIsBetter: true, format: f2, year: 2026 },
  { id: 'fsi', name: 'Fragile States Index', publisher: 'Fund for Peace', pillar: 'stability', weight: 5, cadence: 'Annual', coverage: 179, licence: 'free', licenceNote: 'Non-commercial, attribution', min: 15, max: 112, lowerIsBetter: true, format: f1, year: 2025 },
  { id: 'gti', name: 'Global Terrorism Index', publisher: 'Institute for Economics & Peace', pillar: 'stability', weight: 3, cadence: 'Annual (March)', coverage: 163, licence: 'free', licenceNote: 'Non-commercial, attribution', min: 0, max: 8.6, lowerIsBetter: true, format: f2, year: 2026 },
  // Context only, not scored
  { id: 'usNews', name: 'U.S. News Best Countries', publisher: 'U.S. News & World Report', pillar: null, weight: 0, cadence: 'Annual (Sept)', coverage: 89, licence: 'restricted', licenceNote: 'Proprietary; rank only, linked', min: 1, max: 89, lowerIsBetter: true, format: (v) => `#${Math.round(v)}`, year: 2025 },
  { id: 'goodCountry', name: 'Good Country Index', publisher: 'Simon Anholt', pillar: null, weight: 0, cadence: 'Irregular', coverage: 169, licence: 'free', licenceNote: 'Free, attribution', min: 1, max: 169, lowerIsBetter: true, format: (v) => `#${Math.round(v)}`, year: 2023 },
  { id: 'competitiveness', name: 'World Competitiveness Ranking', publisher: 'IMD (WEF GCI discontinued)', pillar: null, weight: 0, cadence: 'Annual (June)', coverage: 69, licence: 'restricted', licenceNote: 'Paid data; rank only, linked', min: 1, max: 69, lowerIsBetter: true, format: (v) => `#${Math.round(v)}`, year: 2026 },
];

export const SCORED = INDICES.filter((i) => i.pillar);
export const CONTEXT = INDICES.filter((i) => !i.pillar);

export interface IndexValue {
  def: IndexDef;
  raw: number | null;
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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** A fake latent "quality" per country so the placeholder indices correlate like real ones do. */
function latent(c: CountryProfile) {
  const wealth = clamp01((Math.log10(Math.max(600, c.gdpPc)) - 2.8) / 2.2);
  const calm = 1 - c.geoPressure / 100;
  return 0.6 * wealth + 0.4 * calm;
}

function fakeRaw(c: CountryProfile, d: IndexDef, total: number): number | null {
  const r = seeded(`${c.name}:${d.id}`);
  // Curated (large) economies are almost always covered; the rest fill up to the index's real coverage.
  const covered = c.curated ? d.coverage > 60 || r() < 0.8 : r() < (d.coverage - 44) / (total - 44);
  if (!covered) return null;
  if (d.id === 'gdpPpp') return Math.min(d.max, c.gdpPc * (1.15 + r() * 0.9));
  const q = clamp01(latent(c) + (r() - 0.5) * 0.2);
  const good = d.lowerIsBetter ? 1 - q : q;
  return d.min + good * (d.max - d.min);
}

let cache: Map<string, Scorecard> | null = null;

export function buildScorecards(profiles: Map<string, CountryProfile>): Map<string, Scorecard> {
  if (cache) return cache;
  const list = [...profiles.values()];
  const raws = new Map<string, Record<string, number | null>>();
  for (const c of list) raws.set(c.name, Object.fromEntries(INDICES.map((d) => [d.id, fakeRaw(c, d, list.length)])));

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
      .map((c) => ({ name: c.name, v: raws.get(c.name)![d.id] }))
      .filter((x): x is { name: string; v: number } => x.v !== null)
      .sort((a, b) => (d.lowerIsBetter ? a.v - b.v : b.v - a.v));
    const n = have.length;
    const pos = new Map(have.map((x, i) => [x.name, i]));
    for (const c of list) {
      const raw = raws.get(c.name)![d.id];
      const i = pos.get(c.name);
      const card = cards.get(c.name)!;
      card.values[d.id] = {
        def: d,
        raw,
        pct: i === undefined ? null : Math.round(100 * (1 - i / Math.max(1, n - 1))),
        rank: i === undefined ? null : i + 1,
        of: n,
      };
      if (d.pillar && raw !== null) card.covered++;
    }
  }

  // Pillar = weighted mean of the indices it has; needs 60% of the pillar's weight.
  for (const card of cards.values()) {
    let total = 0;
    let wsum = 0;
    let complete = true;
    for (const p of PILLARS) {
      const defs = SCORED.filter((d) => d.pillar === p.id);
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
    card.overall = complete ? total / wsum : null;
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
