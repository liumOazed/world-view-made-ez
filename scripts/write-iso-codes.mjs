/** Writes src/data/iso-codes.json: map name -> ISO alpha-2, used for flags. */
import { writeFileSync } from 'node:fs';
import { isoCountries, mapCountries } from './lib/map-countries.mjs';

const out = {};
for (const [name, iso3] of mapCountries()) {
  const iso2 = iso3 === 'XKX' ? 'XK' : isoCountries.alpha3ToAlpha2(iso3);
  if (iso2) out[name] = iso2;
}
writeFileSync(new URL('../src/data/iso-codes.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`Wrote ${Object.keys(out).length} codes`);
