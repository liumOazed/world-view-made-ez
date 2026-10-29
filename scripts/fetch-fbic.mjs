/**
 * Fetch FBIC (Formal Bilateral Influence Capacity, Pardee Institute, University
 * of Denver) from Harvard Dataverse and write src/data/influence.json.
 *
 *   node scripts/fetch-fbic.mjs
 *
 * FBIC scores how much capacity country A has to influence country B, from
 * their economic, security and political ties (directed dyads, 1995 onwards).
 * For the latest year we keep, per country, who it influences most, who
 * influences it most, and its total outward influence. The dataset is CC0.
 * Needs internet access, which CI has; see .github/workflows/refresh-fbic.yml.
 */
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { isoCountries, mapCountries } from './lib/map-countries.mjs';

const OUT = new URL('../src/data/influence.json', import.meta.url);
const DV = 'https://dataverse.harvard.edu/api';
const DOI = 'doi:10.7910/DVN/SLLEIR';
const UA = { 'user-agent': 'atlas-world-view (github.com/liumOazed/world-view-made-ez)' };
const TOP = 10;

// FBIC country names the ISO library does not resolve.
const NAME_ISO = {
  Brunei: 'BRN',
  'Cape Verde': 'CPV',
  'Congo, Dem. Rep.': 'COD',
  'Congo, Rep.': 'COG',
  'Democratic Republic of the Congo': 'COD',
  'Republic of the Congo': 'COG',
  Congo: 'COG',
  "Cote d'Ivoire": 'CIV',
  'Ivory Coast': 'CIV',
  Czechia: 'CZE',
  'Czech Republic': 'CZE',
  'East Timor': 'TLS',
  Eswatini: 'SWZ',
  Swaziland: 'SWZ',
  Kosovo: 'XKX',
  Laos: 'LAO',
  Macedonia: 'MKD',
  'North Macedonia': 'MKD',
  Micronesia: 'FSM',
  'North Korea': 'PRK',
  'South Korea': 'KOR',
  Palestine: 'PSE',
  Russia: 'RUS',
  'Sao Tome and Principe': 'STP',
  Syria: 'SYR',
  Taiwan: 'TWN',
  Turkey: 'TUR',
  'United States': 'USA',
  'United States of America': 'USA',
  Vietnam: 'VNM',
  'Vatican City': 'VAT',
  'Saint Vincent and the Grenadines': 'VCT',
  'Saint Kitts and Nevis': 'KNA',
  'Saint Lucia': 'LCA',
};
const isoOf = (name) => NAME_ISO[name] ?? isoCountries.getAlpha3Code(name, 'en');

async function main() {
  const meta = await (await fetch(`${DV}/datasets/:persistentId/?persistentId=${DOI}`, { headers: UA })).json();
  const v = meta.data.latestVersion;
  const file = v.files.find((f) => /fbic.*\.(csv|tab)$/i.test(f.dataFile.originalFileName ?? f.dataFile.filename));
  if (!file) throw new Error('No FBIC data file in the dataset');
  console.log(`Dataverse v${v.versionNumber}.${v.versionMinorNumber} (${v.releaseTime}), ${v.license?.name}, ${file.dataFile.filename}`);

  const res = await fetch(`${DV}/access/datafile/${file.dataFile.id}?format=original`, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} downloading FBIC`);
  const lines = createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });

  // Keep only the latest year: rows arrive in any order, so track it as we go.
  let latest = 0;
  let rows = [];
  let head;
  for await (const line of lines) {
    if (!head) {
      head = line.split(',').map((h) => h.trim().replace(/"/g, ''));
      continue;
    }
    // Names can contain commas when quoted ("Congo, Rep."), so split from the right.
    const m = line.match(/^("[^"]*"|[^,]*),("[^"]*"|[^,]*),(\d{4}),(.*)$/);
    if (!m) continue;
    const year = Number(m[3]);
    const fbic = Number(m[4]);
    if (m[4] === 'NA' || !Number.isFinite(fbic) || fbic <= 0 || year < latest) continue;
    if (year > latest) (latest = year), (rows = []);
    rows.push([m[1].replace(/"/g, ''), m[2].replace(/"/g, ''), fbic]);
  }
  console.log(`Columns ${head.join(', ')}; latest year ${latest}, ${rows.length} dyads`);

  const nameByIso = new Map([...mapCountries()].map(([name, iso]) => [iso, name]));
  const unmatched = new Set();
  const mapName = (n) => {
    const name = nameByIso.get(isoOf(n));
    if (!name) unmatched.add(n);
    return name;
  };
  const over = new Map();
  const by = new Map();
  const reach = new Map();
  for (const [a, b, fbic] of rows) {
    const A = mapName(a);
    const B = mapName(b);
    if (!A || !B || A === B) continue;
    if (!over.has(A)) over.set(A, []);
    if (!by.has(B)) by.set(B, []);
    over.get(A).push([B, fbic]);
    by.get(B).push([A, fbic]);
    reach.set(A, (reach.get(A) ?? 0) + fbic);
  }
  if (unmatched.size) console.warn(`Not on the map: ${[...unmatched].sort().join(', ')}`);

  const top = (list) =>
    list
      .sort((x, y) => y[1] - x[1])
      .slice(0, TOP)
      .map(([n, f]) => [n, Number(f.toPrecision(4))]);
  const countries = {};
  for (const name of [...new Set([...over.keys(), ...by.keys()])].sort()) {
    countries[name] = {
      reach: Number((reach.get(name) ?? 0).toPrecision(4)),
      over: top(over.get(name) ?? []),
      by: top(by.get(name) ?? []),
    };
  }
  const n = Object.keys(countries).length;
  if (n < 100) throw new Error(`Only ${n} countries matched`);
  const show = (c) => `${c}: over ${countries[c]?.over.slice(0, 3).map((x) => x[0]).join(', ')}; by ${countries[c]?.by.slice(0, 3).map((x) => x[0]).join(', ')}`;
  console.log(show('United States of America'));
  console.log(show('Mexico'));
  console.log(show('Germany'));

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        source: 'Formal Bilateral Influence Capacity (FBIC) Index, Pardee Institute, University of Denver',
        sourceUrl: 'https://korbel.du.edu/pardee/formal-bilateral-influence-capacity/',
        dataUrl: `https://doi.org/${DOI.slice(4)}`,
        licence: v.license?.name ?? 'CC0 1.0',
        year: latest,
        retrieved: new Date().toISOString().slice(0, 10),
        countries,
      },
      null,
      1,
    ) + '\n',
  );
  console.log(`Wrote ${n} countries for ${latest}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
