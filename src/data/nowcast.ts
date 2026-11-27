import snapshot from './nowcast.json';

export interface FxPulse {
  currency: string;
  perUsd: number;
  move7d: number | null;
  move30d: number | null;
}

export interface PredictionMarket {
  title: string;
  outcome: string | null;
  prob: number;
  change24h: number | null;
  volume24h: number;
  category: string;
  url: string;
  countries: string[];
}

interface NowcastSnapshot {
  retrieved: string;
  fxSource: string;
  fxDate: string | null;
  fxCountries: Record<string, FxPulse>;
  marketsSource: string;
  marketsGlobal: PredictionMarket[];
  marketsByCountry: Record<string, PredictionMarket[]>;
}

const DATA = snapshot as NowcastSnapshot;

export const NOWCAST_RETRIEVED = DATA.retrieved;
export const FX_SOURCE = DATA.fxSource;
export const FX_DATE = DATA.fxDate;
export const MARKETS_SOURCE = DATA.marketsSource;
export const GLOBAL_MARKETS = DATA.marketsGlobal;

export const fxOf = (country: string): FxPulse | null => DATA.fxCountries[country] ?? null;
export const fxMove30dOf = (country: string): number => DATA.fxCountries[country]?.move30d ?? NaN;
export const marketsOf = (country: string): PredictionMarket[] => DATA.marketsByCountry[country] ?? [];

export function fmtFxMove(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function fmtUsdVol(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}
