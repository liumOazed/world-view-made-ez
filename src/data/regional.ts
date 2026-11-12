import DATA from './regional.json';
import CONFLICT from './conflict-regional.json';

/**
 * Figures by state or province: human development, income growth, the gender
 * gap and population density from the Global Data Lab's Subnational Human
 * Development Database, matched to the map's regions by scripts/fetch-regional.mjs.
 * Districts take their state's figures. Conflict deaths come from UCDP's
 * geocoded events, counted where they happened (districts included).
 */

/** [shdi, gnic, lifexp, msch, esch, pop, sgdi, growth, density, regionIndex] */
type Row = (number | null)[];
interface CountryRows {
  year: number;
  national: Row | null;
  regions: string[];
  units: Record<string, Row>;
}
const C = (DATA as unknown as { countries: Record<string, CountryRows> }).countries;

export const REGIONAL_SOURCE = { name: DATA.source, url: DATA.url, retrieved: DATA.retrieved };

/** Field positions in each row. */
export const HD = { hdi: 0, income: 1, life: 2, school: 3, gender: 6, growth: 7, density: 8 } as const;
export type HdField = keyof typeof HD;

const val = (v: number | null | undefined) => (v == null ? NaN : v);

/** The country's own figure (GDL's national row). */
export const nationalHd = (country: string, f: HdField) => val(C[country]?.national?.[HD[f]]);

/** The figure for a region, or its state's for a district (keys are "State/District"). */
export function regionalHd(country: string, key: string, f: HdField) {
  const rows = C[country]?.units;
  if (!rows) return NaN;
  return val((rows[key] ?? rows[key.split('/')[0]])?.[HD[f]]);
}

/** GDL's own name for the region a key falls in, and the data year. */
export function regionalMeta(country: string, key: string) {
  const c = C[country];
  const row = c?.units[key] ?? c?.units[key.split('/')[0]];
  return row ? { region: c.regions[row[row.length - 1] ?? 0], year: c.year, own: !!c.units[key] } : null;
}

export const hasRegional = (country: string) => !!C[country] && Object.keys(C[country].units).length > 0;
export const regionalYear = (country: string) => C[country]?.year;

/* ---------- conflict deaths ---------- */

const K = (CONFLICT as unknown as { countries: Record<string, { national: number; units: Record<string, number> }> }).countries;
export const CONFLICT_YEARS = (CONFLICT as unknown as { years: [number, number] }).years;
export const nationalConflict = (country: string) => val(K[country]?.national);
/** Deaths in the region itself; a region with no recorded events had none. */
export const regionalConflict = (country: string, key: string) => (K[country] ? (K[country].units[key] ?? 0) : NaN);
export const hasConflict = (country: string) => !!K[country];
