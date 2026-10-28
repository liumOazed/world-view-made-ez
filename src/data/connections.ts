import { geoDistance } from 'd3-geo';
import { seeded, type CountryProfile, type LinkKind } from './countries';

/**
 * ILLUSTRATIVE connection logic. Curated partners come first; the rest of a
 * top-N list is filled deterministically from major hubs and neighbours so
 * every country has a full set to explore.
 */

export interface TradeLink {
  name: string;
  kind: LinkKind;
  share: number;
}

export interface InfluenceLink {
  name: string;
  /** Strongest channel through which the selected country matters to `name`. */
  kind: LinkKind | 'regional';
  /** Relative strength, 0–100. */
  score: number;
}

type Anchors = Map<string, [number, number]>;

const HUBS = [
  'United States of America', 'China', 'Germany', 'Japan', 'India', 'United Kingdom', 'France',
  'South Korea', 'Netherlands', 'Saudi Arabia', 'Singapore', 'United Arab Emirates', 'Russia',
  'Brazil', 'Italy', 'Canada', 'Australia', 'Mexico', 'Turkey', 'Indonesia',
];
// What each hub is most likely to be for a trading partner.
const HUB_KIND: Record<string, LinkKind> = {
  'Saudi Arabia': 'energy', 'United Arab Emirates': 'energy', Russia: 'energy', Norway: 'energy', Qatar: 'energy',
  Taiwan: 'tech', 'South Korea': 'tech', Netherlands: 'tech', Japan: 'tech',
  Brazil: 'food', Australia: 'food', Canada: 'food',
  'United Kingdom': 'capital', Singapore: 'capital', France: 'capital',
  China: 'imports', Germany: 'imports', Italy: 'imports', Turkey: 'imports', Indonesia: 'imports',
  'United States of America': 'exports', India: 'exports', Mexico: 'exports',
};

function nearest(name: string, anchors: Anchors, profiles: Map<string, CountryProfile>, n: number) {
  const from = anchors.get(name);
  if (!from) return [];
  return [...anchors.entries()]
    .filter(([other]) => other !== name && profiles.has(other))
    .map(([other, a]) => ({ name: other, dist: geoDistance(from, a) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

/** Top `n` trade connections across sectors, strongest first. */
export function tradeLinks(
  c: CountryProfile,
  profiles: Map<string, CountryProfile>,
  anchors: Anchors,
  n = 10,
): TradeLink[] {
  const out: TradeLink[] = [];
  const keys = new Set<string>();
  const countries = new Set<string>();
  const add = (l: TradeLink) => {
    const key = `${l.name}|${l.kind}`;
    if (l.name === c.name || keys.has(key) || !profiles.has(l.name)) return;
    keys.add(key);
    countries.add(l.name);
    out.push(l);
  };
  c.partners.forEach(add);

  const r = seeded(`${c.name}:trade`);
  let share = Math.max(4, Math.min(20, ...out.map((l) => l.share)));
  // Big economies first, then the nearest neighbours.
  const candidates = [...HUBS, ...nearest(c.name, anchors, profiles, 4).map((x) => x.name)].filter(
    (name) => !countries.has(name) && name !== c.name,
  );

  for (const name of candidates) {
    if (out.length >= n) break;
    if (countries.has(name)) continue;
    share = Math.max(2, Math.round(share * (0.75 + r() * 0.2)));
    add({ name, kind: HUB_KIND[name] ?? 'exports', share });
  }
  return out.sort((a, b) => b.share - a.share).slice(0, n);
}

/** The `n` countries most exposed to `c`, i.e. where it holds the most leverage. */
export function influenceLinks(
  c: CountryProfile,
  profiles: Map<string, CountryProfile>,
  anchors: Anchors,
  n = 5,
): InfluenceLink[] {
  const scores = new Map<string, { raw: number; kind: LinkKind; best: number }>();
  for (const other of profiles.values()) {
    if (other.name === c.name) continue;
    for (const p of other.partners) {
      if (p.name !== c.name) continue;
      const s = scores.get(other.name) ?? { raw: 0, kind: p.kind, best: 0 };
      s.raw += p.share;
      if (p.share > s.best) {
        s.best = p.share;
        s.kind = p.kind;
      }
      scores.set(other.name, s);
    }
  }

  // Influence over a large economy counts for more than over a tiny one.
  const weighted = [...scores.entries()].map(([name, s]) => {
    const size = Math.pow(Math.max(10, profiles.get(name)!.gdp), 0.35);
    return { name, kind: s.kind as InfluenceLink['kind'], value: s.raw * size };
  });
  weighted.sort((a, b) => b.value - a.value);
  const top = weighted.slice(0, n);

  // Countries with little recorded leverage still sway their neighbours.
  if (top.length < n) {
    const r = seeded(`${c.name}:influence`);
    const base = top.length ? top[top.length - 1].value : c.leverage;
    let v = base;
    for (const near of nearest(c.name, anchors, profiles, 12)) {
      if (top.length >= n) break;
      if (top.some((t) => t.name === near.name)) continue;
      v = v * (0.7 + r() * 0.2);
      top.push({ name: near.name, kind: 'regional', value: v });
    }
  }

  const max = Math.max(...top.map((t) => t.value), 1);
  return top.map((t) => ({ name: t.name, kind: t.kind, score: Math.max(8, Math.round((t.value / max) * 100)) }));
}

export const INFLUENCE_LABEL: Record<InfluenceLink['kind'], string> = {
  exports: 'Key buyer of its exports',
  imports: 'Key supplier of goods',
  energy: 'Energy supplier',
  food: 'Food supplier',
  tech: 'Chip & tech supplier',
  capital: 'Lender & investor',
  people: 'Jobs & remittances',
  regional: 'Regional weight',
};

export const INFLUENCE_COLOR = '#e879f9';
