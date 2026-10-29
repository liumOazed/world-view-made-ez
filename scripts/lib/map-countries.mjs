/** Map name -> ISO alpha-3 for every country drawn on the ATLAS map. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const isoCountries = require('i18n-iso-countries');
isoCountries.registerLocale(require('i18n-iso-countries/langs/en.json'));
const world = require('world-atlas/countries-110m.json');
const small = JSON.parse(readFileSync(new URL('../../src/data/small-countries.json', import.meta.url), 'utf8'));

// Map names the ISO library cannot resolve.
const NAME_ISO = {
  Kosovo: 'XKX',
  Micronesia: 'FSM',
  'Marshall Is.': 'MHL',
  'Cayman Is.': 'CYM',
  'São Tomé and Principe': 'STP',
  'St. Vin. and Gren.': 'VCT',
  'St. Kitts and Nevis': 'KNA',
  'Fr. Polynesia': 'PYF',
  'Cabo Verde': 'CPV',
  'Antigua and Barb.': 'ATG',
};

export function mapCountries() {
  const out = new Map();
  for (const g of world.objects.countries.geometries) {
    const iso = NAME_ISO[g.properties.name] ?? (g.id ? isoCountries.numericToAlpha3(g.id) : undefined);
    if (iso) out.set(g.properties.name, iso);
  }
  for (const f of small.features) {
    const iso = NAME_ISO[f.properties.name] ?? isoCountries.getAlpha3Code(f.properties.name, 'en');
    if (iso) out.set(f.properties.name, iso);
  }
  return out;
}
