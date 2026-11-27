import snapshot from './trade.json';
import { resilience } from './sections';
import { tie } from './diplomacy';

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
  /** Direct dependence on origin (%), when hop === 1. */
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
 * Compute 1st-order and 2nd-order shock contagion from `origin` across the global trade & diplomacy graph.
 */
export function computeRipples(origin: string, channel: ShockChannel = 'all'): { byCountry: Map<string, RippleHit>; top: RippleHit[] } {
  const originTrade = TRADE.countries[origin];
  const byCountry = new Map<string, RippleHit>();
  if (!originTrade) return { byCountry, top: [] };

  const adjustResilience = (name: string, raw: number) => {
    const r = resilience(name)?.score;
    const mult = r === undefined || Number.isNaN(r) ? 1 : 0.78 + ((100 - r) / 100) * 0.44;
    return Math.max(1, Math.min(100, Math.round(raw * mult)));
  };

  // 1st-order direct exposure
  for (const [name, t] of Object.entries(TRADE.countries)) {
    if (name === origin) continue;
    const dep = directDependence(t, originTrade.iso, channel);
    let raw = dep?.raw ?? 0;
    let label = dep?.label ?? 'Diplomatic tie';
    const sharePct = dep?.sharePct ?? 0;

    // Close diplomatic allies/rivals also feel policy/sanctions spillover when viewing all channels
    if (channel === 'all') {
      const d = tie(origin, name);
      if (d && Math.abs(d.level) >= 2) {
        raw = Math.max(raw, raw + 12);
        if (!dep) label = d.level > 0 ? 'Allied spillover' : 'Geopolitical friction';
      }
    }

    if (raw < 6) continue;
    const score = adjustResilience(name, raw);
    byCountry.set(name, { name, score, hop: 1, channel: label, sharePct, tier: tierOf(score) });
  }

  // 2nd-order contagion via the top 6 most-exposed direct hubs
  const directHubs = [...byCountry.values()]
    .filter((h) => h.score >= 28)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  for (const hub of directHubs) {
    const hubTrade = TRADE.countries[hub.name];
    if (!hubTrade) continue;
    for (const [name, t] of Object.entries(TRADE.countries)) {
      if (name === origin || name === hub.name) continue;
      const dep = directDependence(t, hubTrade.iso, channel === 'all' ? 'trade' : channel);
      if (!dep || dep.raw < 14) continue;
      const indirectRaw = (hub.score / 100) * dep.raw * 0.42;
      if (indirectRaw < 8) continue;
      const score = adjustResilience(name, indirectRaw);
      const existing = byCountry.get(name);
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

  const top = [...byCountry.values()].sort((a, b) => b.score - a.score);
  return { byCountry, top };
}
