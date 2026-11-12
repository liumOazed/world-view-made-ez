import { valueOf } from './sections';

/**
 * The four parts of an economy (World Bank value added, % of GDP) and the
 * colours they share across the map, the legend and the cards. Industry is
 * split in two: manufacturing, and the rest of it (oil, gas, mining,
 * construction and utilities), so a petrostate does not read as a factory economy.
 */
export const SECTOR_COLORS = { services: '#4f93d6', manufacturing: '#9a6fd0', extraction: '#d9a441', agriculture: '#57b08a' } as const;
export type Sector = keyof typeof SECTOR_COLORS;
export const SECTOR_LABEL: Record<Sector, string> = {
  services: 'Services',
  manufacturing: 'Manufacturing',
  extraction: 'Extraction & construction',
  agriculture: 'Agriculture',
};
export const SECTORS: Sector[] = ['services', 'manufacturing', 'extraction', 'agriculture'];
export type Shares = Record<Sector, number>;

/**
 * A typical economy. Services is the largest sector almost everywhere, so the
 * maps show what a country has more of than most, not simply what is biggest.
 */
export const TYPICAL: Shares = { services: 55, manufacturing: 13, extraction: 13, agriculture: 9 };

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (w: number[]) => {
  const t = w.reduce((a, b) => a + b, 0) || 1;
  const c = [0, 1, 2].map((i) => Math.round(SECTORS.reduce((sum, k, j) => sum + rgb(SECTOR_COLORS[k])[i] * (w[j] / t), 0)));
  return `rgb(${c.join(',')})`;
};

function read(country: string, suffix = ''): { shares: Shares; year: number } | null {
  const v = (['services', 'industry', 'manufacturing', 'agriculture'] as const).map((k) => valueOf(k + suffix, country));
  if (!v.every((x) => x && Number.isFinite(x[0]))) return null;
  const [services, industry, manufacturing, agriculture] = v.map((x) => x![0]);
  return {
    shares: { services, manufacturing, extraction: Math.max(0, industry - manufacturing), agriculture },
    year: Math.min(...v.map((x) => x![1])),
  };
}
export const sharesOf = (country: string) => read(country)?.shares ?? null;

/** The sector colours blended by how far each share runs above a typical economy's. */
export const blend = (s: Shares) => mix(SECTORS.map((k) => (s[k] / TYPICAL[k]) ** 2.2));
/** The sector a country leans on more than most. */
export const leader = (s: Shares) => SECTORS.reduce((a, b) => (s[b] / TYPICAL[b] > s[a] / TYPICAL[a] ? b : a));
export const mixText = (s: Shares) => SECTORS.map((k) => `${SECTOR_LABEL[k]} ${Math.round(s[k])}%`).join(' · ');

/** Change in each sector's share over about a decade, in percentage points. */
export function shiftOf(country: string) {
  const now = read(country);
  const then = read(country, 'Past');
  if (!now || !then) return null;
  const d = Object.fromEntries(SECTORS.map((k) => [k, now.shares[k] - then.shares[k]])) as Shares;
  const gainer = SECTORS.reduce((a, b) => (d[b] > d[a] ? b : a));
  return { d, gainer, from: then.year, to: now.year };
}
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
export const shiftText = (s: NonNullable<ReturnType<typeof shiftOf>>) =>
  `${SECTORS.map((k) => `${SECTOR_LABEL[k]} ${signed(s.d[k])}`).join(' · ')} pts since ${s.from}`;
/** The gaining sector's colour, stronger the bigger the gain (full strength at 8 points). */
export function shiftColor(s: NonNullable<ReturnType<typeof shiftOf>>) {
  const t = Math.max(0.12, Math.min(1, s.d[s.gainer] / 8));
  const a = rgb('#2a3650');
  const b = rgb(SECTOR_COLORS[s.gainer]);
  return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`;
}

/**
 * Manufacturing value added per person, in current US dollars: the manufacturing
 * share of GDP applied to GDP per person.
 */
export function manufacturingPerPerson(country: string): number {
  const share = valueOf('manufacturing', country)?.[0];
  const gdp = valueOf('gdpPcUsd', country)?.[0];
  return share !== undefined && gdp !== undefined ? (share / 100) * gdp : NaN;
}
