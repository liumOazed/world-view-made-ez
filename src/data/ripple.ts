import snapshot from './trade.json';
import { resilience } from './sections';

export type ShockChannel = 'all' | 'trade' | 'energy' | 'chips' | 'food';

export const SHOCK_CHANNELS: { id: ShockChannel; label: string }[] = [
  { id: 'all', label: 'All channels' },
  { id: 'trade', label: 'Broad trade' },
  { id: 'energy', label: 'Energy' },
  { id: 'chips', label: 'Tech & chips' },
  { id: 'food', label: 'Food & grain' },
];

export interface RippleHit {
  name: string;
  /** Exposure score, 0–100 (resilience-adjusted). */
  score: number;
  /** 1 = direct trade/supply partner, 2 = secondary spillover via a major hub. */
  hop: 1 | 2;
  /** Primary transmission channel. */
  channel: string;
  /** Direct dependence on origin (%), when hop === 1 (or dependence on `via`, when hop === 2). */
  sharePct: number;
  /** Intermediate hub country name when hop === 2. */
  via?: string;
  tier: 'Severe' | 'High' | 'Moderate' | 'Mild';
}

interface PartnerFlow {
  iso: string;
  exp: number;
  imp: number;
  energy: number;
  food: number;
  chips: number;
}
interface CountryTrade {
  iso: string;
  year: number;
  exportsTotal: number;
  importsTotal: number;
  partners: PartnerFlow[];
}
interface TradeSnapshot {
  isoToName: Record<string, string>;
  countries: Record<string, CountryTrade>;
}

const TRADE = snapshot as TradeSnapshot;

export const RIPPLE_COVERAGE = Object.keys(TRADE.countries).length;
export const hasRippleCoverage = (origin: string): boolean => Boolean(TRADE.countries[origin]);

function tierOf(score: number): RippleHit['tier'] {
  if (score >= 65) return 'Severe';
  if (score >= 42) return 'High';
  if (score >= 22) return 'Moderate';
  return 'Mild';
}

/**
 * Measure direct dependence (0..100 raw) of `target` on `originIso` for a given shock channel.
 */
function directDependence(
  target: CountryTrade,
  originIso: string,
  channel: ShockChannel,
): { raw: number; sharePct: number; label: string } | null {
  const p = target.partners.find((x) => x.iso === originIso);
  if (!p) return null;
  const totalTrade = target.exportsTotal + target.importsTotal;
  const impTotal = target.importsTotal || 1;
  const tradeShare = totalTrade > 0 ? (p.exp + p.imp) / totalTrade : 0;
  const energyShare = p.energy / impTotal;
  const chipsShare = p.chips / impTotal;
  const foodShare = p.food / impTotal;

  if (channel === 'energy') {
    if (p.energy <= 0) return null;
    return { raw: Math.min(100, energyShare * 360), sharePct: Math.round(energyShare * 1000) / 10, label: 'Energy supply' };
  }
  if (channel === 'chips') {
    if (p.chips <= 0) return null;
    return { raw: Math.min(100, chipsShare * 420), sharePct: Math.round(chipsShare * 1000) / 10, label: 'Tech & chips' };
  }
  if (channel === 'food') {
    if (p.food <= 0) return null;
    return { raw: Math.min(100, foodShare * 420), sharePct: Math.round(foodShare * 1000) / 10, label: 'Food & grain' };
  }
  if (channel === 'trade') {
    if (tradeShare <= 0.005) return null;
    return { raw: Math.min(100, tradeShare * 240), sharePct: Math.round(tradeShare * 1000) / 10, label: 'Broad trade' };
  }

  // 'all': pick strongest transmission channel
  const candidates = [
    { raw: energyShare * 340, sharePct: energyShare * 100, label: 'Energy supply' },
    { raw: chipsShare * 380, sharePct: chipsShare * 100, label: 'Tech & chips' },
    { raw: foodShare * 360, sharePct: foodShare * 100, label: 'Food & grain' },
    { raw: tradeShare * 230, sharePct: tradeShare * 100, label: 'Broad trade' },
  ].sort((a, b) => b.raw - a.raw);

  const best = candidates[0];
  if (!best || best.raw < 4) return null;
  return { raw: Math.min(100, best.raw), sharePct: Math.round(best.sharePct * 10) / 10, label: best.label };
}

/**
 * Compute 1st-order and 2nd-order shock contagion from `origin` across UN Comtrade flows,
 * scaled by each downstream country's structural resilience.
 */
export function computeRipples(
  origin: string,
  channel: ShockChannel = 'all',
): { covered: boolean; byCountry: Map<string, RippleHit>; top: RippleHit[] } {
  const originTrade = TRADE.countries[origin];
  const byCountry = new Map<string, RippleHit>();
  if (!originTrade) return { covered: false, byCountry, top: [] };

  const adjustResilience = (name: string, raw: number) => {
    const r = resilience(name)?.score;
    const mult = r === undefined || Number.isNaN(r) ? 1 : 0.78 + ((100 - r) / 100) * 0.44;
    return Math.max(1, Math.min(100, Math.round(raw * mult)));
  };

  // 1st-order direct exposure (meaningful bilateral flow: raw >= 16; weaker links tracked separately)
  const weakDirect = new Map<string, RippleHit>();
  for (const [name, t] of Object.entries(TRADE.countries)) {
    if (name === origin) continue;
    const dep = directDependence(t, originTrade.iso, channel);
    if (!dep || dep.raw < 6) continue;
    const score = adjustResilience(name, dep.raw);
    const hit: RippleHit = { name, score, hop: 1, channel: dep.label, sharePct: dep.sharePct, tier: tierOf(score) };
    if (dep.raw >= 16) {
      byCountry.set(name, hit);
    } else {
      weakDirect.set(name, hit);
    }
  }

  // 2nd-order contagion via every direct hub with score >= 12 (so global transit hubs like China, US, NL, ZA propagate too)
  const directHubs = [...byCountry.values(), ...weakDirect.values()].filter((h) => h.score >= 12);

  for (const hub of directHubs) {
    const hubTrade = TRADE.countries[hub.name];
    if (!hubTrade) continue;
    for (const [name, t] of Object.entries(TRADE.countries)) {
      if (name === origin || name === hub.name) continue;
      // Don't overwrite strong direct partners; surface 2nd-order ripples for non-direct or weakly-linked economies.
      const existing = byCountry.get(name);
      if (existing && existing.hop === 1) continue;

      const dep = directDependence(t, hubTrade.iso, channel === 'all' ? 'trade' : channel);
      if (!dep || dep.raw < 10) continue;
      const indirectRaw = (hub.score / 100) * dep.raw * 0.65;
      if (indirectRaw < 6) continue;
      const score = adjustResilience(name, indirectRaw);
      const weak = weakDirect.get(name);
      if (weak && weak.score >= score) continue;
      if (!existing || score > existing.score) {
        byCountry.set(name, {
          name,
          score,
          hop: 2,
          channel: `${hub.channel} ripple`,
          sharePct: dep.sharePct,
          via: hub.name,
          tier: tierOf(score),
        });
      }
    }
  }

  // Keep weak direct links if no stronger 2nd-order spillover path replaced them.
  for (const [name, hit] of weakDirect.entries()) {
    if (!byCountry.has(name)) byCountry.set(name, hit);
  }

  const top = [...byCountry.values()].sort((a, b) => b.score - a.score);
  return { covered: true, byCountry, top };
}
