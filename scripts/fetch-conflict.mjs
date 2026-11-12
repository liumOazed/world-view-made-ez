/**
 * Writes src/data/conflict-regional.json: deaths in organised violence over
 * the last five years of UCDP's Georeferenced Event Dataset, counted for every
 * state, province and district on the map by where each event happened.
 *
 * Source: Uppsala Conflict Data Program, UCDP GED (https://ucdp.uu.se), CC BY 4.0.
 * Counts use UCDP's best estimate of deaths. Events located only to a country
 * or a large area count for the country but not for any region.
 *
 * Usage: node scripts/fetch-conflict.mjs path/to/GEDEvent.csv
 */
import { createReadStream, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { feature } from 'topojson-client';
import { geoArea, geoBounds, geoContains } from 'd3-geo';

const root = new URL('..', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const CSV = process.argv[2];
if (!CSV) throw new Error('Pass the GED CSV path');
const SPAN = 5;

/* ---------- map regions ---------- */

const R2 = 6371 ** 2;
const areaOf = (f) => {
  const g = f.geometry;
  const parts = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  return parts.reduce((s, c) => {
    const x = geoArea({ type: 'Polygon', coordinates: c });
    return s + Math.min(x, 4 * Math.PI - x);
  }, 0) * R2;
};
// A Polygon ring wound the wrong way would "contain" the rest of the world; rewind by testing area.
const fix = (f) => {
  const g = f.geometry;
  const rings = (c) => {
    const a = geoArea({ type: 'Polygon', coordinates: c });
    return a > 2 * Math.PI ? c.map((r) => [...r].reverse()) : c;
  };
  return { ...f, geometry: g.type === 'MultiPolygon' ? { ...g, coordinates: g.coordinates.map(rings) } : { ...g, coordinates: rings(g.coordinates) } };
};
const prep = (f) => {
  const ff = fix(f);
  return { f: ff, key: f.properties.key, parent: f.properties.parent, bbox: geoBounds(ff), area: areaOf(ff) };
};

const countries = [];
const manifest = read('src/data/subnational.json');
for (const [country, m] of Object.entries(manifest)) {
  const topo = read(`public/geo/admin/${m.iso3}.json`);
  countries.push({
    country,
    adm1: feature(topo, topo.objects.adm1).features.map(prep),
    adm2: topo.objects.adm2 ? feature(topo, topo.objects.adm2).features.map(prep) : [],
  });
}
if (existsSync(new URL('public/geo/BGD/adm1.json', root))) {
  const bd = countries.find((c) => c.country === 'Bangladesh');
  const row = { country: 'Bangladesh', adm1: read('public/geo/BGD/adm1.json').features.map(prep), adm2: read('public/geo/BGD/adm2.json').features.map(prep) };
  if (bd) Object.assign(bd, row);
  else countries.push(row);
}
const inBox = ([lon, lat], [[x0, y0], [x1, y1]]) => lat >= y0 - 0.01 && lat <= y1 + 0.01 && (x0 <= x1 ? lon >= x0 - 0.01 && lon <= x1 + 0.01 : lon >= x0 || lon <= x1);
const all1 = countries.flatMap((c) => c.adm1.map((u) => ({ ...u, c })));

/* ---------- the events ---------- */

function splitCsv(line) {
  const out = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') out.push(cell), (cell = '');
    else cell += ch;
  }
  out.push(cell);
  return out;
}

const events = [];
let head = null;
let maxYear = 0;
const rl = createInterface({ input: createReadStream(CSV), crlfDelay: Infinity });
for await (const line of rl) {
  if (!head) {
    head = Object.fromEntries(splitCsv(line).map((h, i) => [h.trim().toLowerCase(), i]));
    console.log('columns:', Object.keys(head).join(', '));
    continue;
  }
  const r = splitCsv(line);
  const year = Number(r[head.year]);
  const deaths = Number(r[head.best]);
  if (!Number.isFinite(year) || !Number.isFinite(deaths)) continue;
  maxYear = Math.max(maxYear, year);
  events.push({ year, deaths, prec: Number(r[head.where_prec]), lon: Number(r[head.longitude]), lat: Number(r[head.latitude]) });
}
const from = maxYear - SPAN + 1;
const recent = events.filter((e) => e.year >= from && e.deaths > 0);
console.log(`${events.length} events up to ${maxYear}; ${recent.length} with deaths in ${from}-${maxYear}`);

/* ---------- count them by region ---------- */

const deaths = new Map(); // key -> deaths
const national = new Map(); // country -> deaths
let placed = 0;
for (const e of recent) {
  const p = [e.lon, e.lat];
  const u = all1.find((u) => inBox(p, u.bbox) && geoContains(u.f, p));
  if (!u) continue;
  placed++;
  national.set(u.c.country, (national.get(u.c.country) ?? 0) + e.deaths);
  // Events placed only to a country or a large area say little about which region suffered.
  if (e.prec > 4) continue;
  deaths.set(u.key, (deaths.get(u.key) ?? 0) + e.deaths);
  const d = u.c.adm2.find((d) => d.parent === u.key && inBox(p, d.bbox) && geoContains(d.f, p));
  if (d) deaths.set(d.key, (deaths.get(d.key) ?? 0) + e.deaths);
}
console.log(`placed ${placed} of ${recent.length} events on the map`);

/* ---------- per country ---------- */

const out = {};
for (const c of countries) {
  const units = {};
  for (const u of [...c.adm1, ...c.adm2]) if (deaths.get(u.key)) units[u.key] = deaths.get(u.key);
  out[c.country] = { national: national.get(c.country) ?? 0, units };
}

writeFileSync(
  new URL('src/data/conflict-regional.json', root),
  JSON.stringify({
    source: 'UCDP Georeferenced Event Dataset',
    url: 'https://ucdp.uu.se/downloads/',
    retrieved: new Date().toISOString().slice(0, 10),
    years: [from, maxYear],
    countries: out,
  }) + '\n',
);
console.log(`wrote ${Object.keys(out).length} countries`);
