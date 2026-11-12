import DATA from './regional.json';

/**
 * Human development by state or province, from the Global Data Lab's
 * Subnational Human Development Database, matched to the map's regions by
 * scripts/fetch-regional.mjs. Districts take their state's figures.
 */

type Row = [number | null, number | null, number | null, number | null, number | null, number | null, number];
interface CountryRows {
  year: number;
  national: (number | null)[] | null;
  regions: string[];
  units: Record<string, Row>;
}
const C = (DATA as unknown as { countries: Record<string, CountryRows> }).countries;

export const REGIONAL_SOURCE = { name: DATA.source, url: DATA.url, retrieved: DATA.retrieved };

/** Field positions in each row. */
export const HD = { hdi: 0, income: 1, life: 2, school: 3 } as const;
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
  return row ? { region: c.regions[row[6]], year: c.year, own: !!c.units[key] } : null;
}

export const hasRegional = (country: string) => !!C[country] && Object.keys(C[country].units).length > 0;
export const regionalYear = (country: string) => C[country]?.year;
