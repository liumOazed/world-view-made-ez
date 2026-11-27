import snapshot from './pulse.json';
import { resilience } from './sections';

export type PulseSeverity = 'High' | 'Medium' | 'Low';

export interface PulseArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: number;
  channel: string;
  severity: PulseSeverity;
  countries?: string[];
}

export interface ChannelPulse {
  count: number;
  sentiment: number;
}

export interface CountryPulse {
  sentiment: number;
  volume: number;
  severity: PulseSeverity;
  dominantChannel: string;
  channels: Record<string, ChannelPulse>;
  brief: string;
  articles: PulseArticle[];
}

export interface PulseMover {
  name: string;
  sentiment: number;
  volume: number;
  dominantChannel: string;
  severity: PulseSeverity;
}

interface PulseSnapshot {
  source: string;
  retrieved: string;
  countryCount: number;
  articleCount: number;
  global: PulseArticle[];
  movers: PulseMover[];
  countries: Record<string, CountryPulse>;
}

const DATA = snapshot as PulseSnapshot;

export const PULSE_SOURCE = DATA.source;
export const PULSE_RETRIEVED = DATA.retrieved;
export const PULSE_GLOBAL = DATA.global;
export const PULSE_MOVERS = DATA.movers;
export const PULSE_META = { countryCount: DATA.countryCount, articleCount: DATA.articleCount };

export const pulseOf = (country: string): CountryPulse | null => DATA.countries[country] ?? null;

export const sentimentOf = (country: string): number => DATA.countries[country]?.sentiment ?? NaN;

export const attentionOf = (country: string): number => DATA.countries[country]?.volume ?? NaN;

/**
 * Signal vs. Resilience: compares live news sentiment against structural resilience (0–100).
 * Negative values indicate adverse live news colliding with structural fragility;
 * positive values indicate constructive news backed by resilience.
 */
export function divergenceOf(country: string): number {
  const p = DATA.countries[country];
  if (!p) return NaN;
  const r = resilience(country)?.score;
  if (r === undefined || Number.isNaN(r)) return p.sentiment;
  // Weight adverse news more heavily when structural resilience is low.
  const fragility = (100 - r) / 100; // 0 (very resilient) .. 1 (very fragile)
  if (p.sentiment < 0) {
    return Math.max(-100, Math.round(p.sentiment * (0.65 + fragility * 0.75)));
  }
  return Math.min(100, Math.round(p.sentiment * (0.65 + (1 - fragility) * 0.6)));
}

export interface DivergenceVerdict {
  label: string;
  tone: 'bad' | 'warn' | 'good' | 'neutral';
  note: string;
}

export function divergenceVerdict(country: string): DivergenceVerdict | null {
  const p = DATA.countries[country];
  if (!p) return null;
  const r = resilience(country)?.score;
  if (r === undefined || Number.isNaN(r)) {
    return {
      label: toneLabel(p.sentiment),
      tone: p.sentiment <= -20 ? 'bad' : p.sentiment >= 20 ? 'good' : 'neutral',
      note: 'Structural resilience score not available for comparison.',
    };
  }
  if (p.sentiment <= -20 && r < 52) {
    return {
      label: 'Vulnerability alert',
      tone: 'bad',
      note: `Negative live coverage (${fmtSentiment(p.sentiment)}) colliding with low structural resilience (${Math.round(r)}/100).`,
    };
  }
  if (p.sentiment <= -20 && r >= 52) {
    return {
      label: 'Resilient shock',
      tone: 'warn',
      note: `Adverse headlines (${fmtSentiment(p.sentiment)}), but stronger structural buffers (${Math.round(r)}/100) absorb near-term stress.`,
    };
  }
  if (p.sentiment >= 15 && r >= 55) {
    return {
      label: 'Tailwind',
      tone: 'good',
      note: `Constructive coverage (${fmtSentiment(p.sentiment)}) aligned with solid structural resilience (${Math.round(r)}/100).`,
    };
  }
  if (p.sentiment >= 15 && r < 55) {
    return {
      label: 'Cautious rebound',
      tone: 'neutral',
      note: `Improving headlines (${fmtSentiment(p.sentiment)}), though structural buffers remain modest (${Math.round(r)}/100).`,
    };
  }
  return {
    label: 'Steady pulse',
    tone: 'neutral',
    note: `Balanced live coverage (${fmtSentiment(p.sentiment)}) against a ${Math.round(r)}/100 structural resilience score.`,
  };
}

export function fmtSentiment(v: number): string {
  if (Number.isNaN(v)) return 'No coverage';
  const rounded = Math.round(v);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

export function toneLabel(v: number): string {
  if (Number.isNaN(v)) return 'Quiet';
  if (v <= -35) return 'Sharply negative';
  if (v <= -12) return 'Negative';
  if (v >= 35) return 'Strongly positive';
  if (v >= 12) return 'Positive';
  return 'Mixed';
}

export function relativeTime(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function formatSnapshotTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
}
