/**
 * Writes src/data/regional.json: human development figures by state or
 * province, from the Global Data Lab's Subnational Human Development Database
 * (SHDI), matched to the map's own first-level regions by name.
 *
 * Source: Global Data Lab, Radboud University (https://globaldatalab.org/shdi),
 * via the public PRIO mirror of SHDI-SGDI-Total. Free to use with attribution.
 *
 * GDL regions are sometimes groups of provinces ("North (Kano, Kaduna, ...)");
 * every province named in a group gets the group's values.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const SRC =
  process.env.SHDI_URL ??
  'https://cdn.cloud.prio.org/files/831b54bf-9efd-4be6-a618-9794109790c1/SHDI-SGDI-Total%2080.csv?inline=true';
const root = new URL('..', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));

/* ---------- our regions ---------- */

const manifest = read('src/data/subnational.json');
const ours = new Map(); // iso3 -> { country, units: [{ key, name }] }
for (const [country, m] of Object.entries(manifest)) {
  const topo = read(`public/geo/admin/${m.iso3}.json`);
  ours.set(m.iso3, { country, units: topo.objects.adm1.geometries.map((g) => g.properties) });
}
if (existsSync(new URL('public/geo/BGD/adm1.json', root))) {
  const bd = read('public/geo/BGD/adm1.json');
  ours.set('BGD', { country: 'Bangladesh', units: bd.features.map((f) => f.properties) });
}

/* ---------- the CSV ---------- */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') row.push(cell), (cell = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows;
}

const SNAP = new URL('scripts/data/shdi-latest.json', root);
const FIELDS = ['iso', 'year', 'code', 'level', 'region', 'shdi', 'gnic', 'lifexp', 'msch', 'esch', 'pop'];
const num = (s) => {
  const v = Number(s);
  return s === '' || s == null || !Number.isFinite(v) ? null : v;
};

/** Latest year per GDL region with an HDI value, as rows in FIELDS order. */
let latest;
if (process.env.SHDI_OFFLINE) {
  latest = JSON.parse(readFileSync(SNAP, 'utf8')).rows;
} else {
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`SHDI download failed: ${res.status}`);
  const rows = parseCsv(await res.text()).filter((r) => r.length > 3);
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  console.log('columns:', head.join(', '));
  const at = Object.fromEntries(
    FIELDS.map((f) => [f, head.indexOf({ iso: 'iso_code', code: 'gdlcode' }[f] ?? f)]),
  );
  for (const [k, v] of Object.entries(at)) if (v < 0) console.warn(`missing column ${k}`);
  const best = new Map();
  for (const r of rows) {
    if (num(r[at.shdi]) === null) continue;
    const cur = best.get(r[at.code]);
    if (!cur || Number(r[at.year]) > Number(cur[at.year])) best.set(r[at.code], r);
  }
  latest = [...best.values()].map((r) =>
    FIELDS.map((f) => (['iso', 'code', 'level', 'region'].includes(f) ? r[at[f]].trim() : num(r[at[f]]))),
  );
  mkdirSync(new URL('scripts/data/', root), { recursive: true });
  writeFileSync(SNAP, JSON.stringify({ source: SRC, fields: FIELDS, rows: latest }) + '\n');
}
const C = Object.fromEntries(FIELDS.map((f, i) => [f, i]));

/* ---------- name matching ---------- */

const ALIAS = {
  chittagong: 'chattogram',
  barisal: 'barishal',
  bogra: 'bogura',
  jessore: 'jashore',
  comilla: 'cumilla',
  orissa: 'odisha',
  pondicherry: 'puducherry',
  uttaranchal: 'uttarakhand',
  'nct of delhi': 'delhi',
};
const STOP =
  /\b(province|provinces|state|states|region|regions|division|governorate|oblast|department|county|counties|district|districts|prefecture|municipality|city|metropolitan|capital|autonomous|special|federal|territory|incl|including|and|the|of|de|del|la|le|el)\b/g;
const norm = (s) => {
  let n = String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  n = ALIAS[n] ?? n;
  return n.replace(STOP, ' ').replace(/\s+/g, ' ').trim();
};
/** "North (Kano, Kaduna and Katsina)" -> ['north', 'kano', 'kaduna', 'katsina'] */
function names(region) {
  const out = [];
  const m = region.match(/^([^(]*)\((.*)\)\s*$/);
  const main = m ? m[1] : region;
  out.push(main);
  if (m) out.push(...m[2].split(/,|;|\band\b|\+|\//));
  for (const part of main.split(/,|;|\band\b|\+|\//)) out.push(part);
  return [...new Set(out.map(norm).filter((s) => s.length > 1))];
}

const out = {};
let matchedTotal = 0;
let unitsTotal = 0;
const report = [];
for (const [iso, { country, units }] of ours) {
  const regions = latest.filter((r) => r[C.iso] === iso && !/national/i.test(r[C.level] ?? ''));
  const national = latest.find((r) => r[C.iso] === iso && /national/i.test(r[C.level] ?? ''));
  if (!regions.length && !national) continue;
  const cands = regions.map((r) => ({ r, n: names(r[C.region]) }));
  const pick = (u) => {
    const n = norm(u.name);
    if (!n) return null;
    // Exact name, then a name that starts or ends the same way (Jammu and Kashmir ~ Jammu Kashmir).
    return (
      cands.find((c) => c.n.includes(n)) ??
      cands.find((c) => c.n.some((x) => x.length >= 4 && n.length >= 4 && (x.startsWith(n) || n.startsWith(x)))) ??
      null
    );
  };
  const units2 = {};
  const regionNames = [];
  const idx = new Map();
  let matched = 0;
  for (const u of units) {
    const c = pick(u);
    if (!c) continue;
    matched++;
    const r = c.r;
    if (!idx.has(r[C.code])) idx.set(r[C.code], regionNames.push(r[C.region]) - 1);
    units2[u.key] = [(r[C.shdi]), (r[C.gnic]), (r[C.lifexp]), (r[C.msch]), (r[C.esch]), (r[C.pop]), idx.get(r[C.code])];
  }
  matchedTotal += matched;
  unitsTotal += units.length;
  report.push(`${iso} ${matched}/${units.length}${regions.length ? '' : ' (national only)'}`);
  if (matched < units.length && regions.length)
    console.log(
      `${iso}: unmatched ${units
        .filter((u) => !units2[u.key])
        .map((u) => u.name)
        .slice(0, 12)
        .join(' | ')}  ||  GDL: ${regions
        .map((r) => r[C.region])
        .slice(0, 14)
        .join(' | ')}`,
    );
  const nat = national ? [(national[C.shdi]), (national[C.gnic]), (national[C.lifexp]), (national[C.msch]), (national[C.esch]), (national[C.pop])] : null;
  const year = Number((regions[0] ?? national)[C.year]);
  out[country] = { year, national: nat, regions: regionNames, units: units2 };
}

console.log(report.join('  '));
console.log(`matched ${matchedTotal} of ${unitsTotal} first-level regions in ${Object.keys(out).length} countries`);
writeFileSync(
  new URL('src/data/regional.json', root),
  JSON.stringify(
    {
      source: 'Global Data Lab, Subnational Human Development Database (SHDI)',
      url: 'https://globaldatalab.org/shdi',
      retrieved: new Date().toISOString().slice(0, 10),
      fields: ['shdi', 'gnic', 'lifexp', 'msch', 'esch', 'pop', 'region'],
      countries: out,
    },
    null,
    0,
  ) + '\n',
);
