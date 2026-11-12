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
import { GROUPS, MERGE } from './regional-groups.mjs';

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
  ours.set(m.iso3, {
    country,
    units: topo.objects.adm1.geometries.map((g) => g.properties),
    subs: topo.objects.adm2?.geometries.map((g) => g.properties) ?? [],
  });
}
if (existsSync(new URL('public/geo/BGD/adm1.json', root))) {
  const bd = read('public/geo/BGD/adm1.json');
  const bd2 = read('public/geo/BGD/adm2.json');
  ours.set('BGD', { country: 'Bangladesh', units: bd.features.map((f) => f.properties), subs: bd2.features.map((f) => f.properties) });
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
const STOP = new RegExp(
  '\\b(' +
    [
      'province', 'provinces', 'provincia', 'prov', 'state', 'states', 'region', 'regions', 'regiao', 'division',
      'governorate', 'governate', 'oblast', 'krai', 'okrug', 'kraj', 'republic', 'department', 'departement',
      'departamento', 'county', 'counties', 'district', 'districts', 'prefecture', 'municipality', 'municipio',
      'comarca', 'voivodeship', 'novads', 'lan', 'city', 'metropolitan', 'capital', 'autonomous', 'autonoma',
      'special', 'federal', 'territory', 'incl', 'including', 'and', 'the', 'of', 'de', 'del', 'la', 'le', 'l',
      'el', 'al', 'an', 'ar', 'as', 'ad', 'az', 'du', 'des', 'do', 'da', 'dos', 'das',
    ].join('|') +
    ')\\b',
  'g',
);
const fixText = (s) => {
  if (!/[ÃÂ]/.test(s)) return s;
  const t = Buffer.from(s, 'latin1').toString('utf8');
  return t.includes('�') ? s : t;
};
const norm = (s) => {
  let n = fixText(String(s))
    .replace(/[ıİ]/g, 'i')
    .replace(/[łŁ]/g, 'l')
    .replace(/[đĐ]/g, 'd')
    .replace(/[øØ]/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`ʿʾ‘]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  n = ALIAS[n] ?? n;
  return n.replace(STOP, ' ').replace(/\s+/g, ' ').trim();
};
const tight = (s) => s.replace(/ /g, '');

/** "North (Kano, Kaduna and Katsina)" -> ['north', 'kano', 'kaduna', 'katsina'] */
function names(region) {
  const out = [];
  const r = region.replace(/^[IVX]+[AB]?-/, ''); // "IVA-CALABARZON"
  const m = r.match(/^([^(]*)\((.*)\)?\s*$/);
  const main = m ? m[1] : r;
  out.push(main);
  if (m) {
    const inner = m[2].replace(/\)$/, '');
    out.push(...inner.split(/,|;|\band\b|&|\+|\//));
    // "(Kabul Wardak Kapisa)": a list without commas.
    if (!/[,;&]/.test(inner)) out.push(...inner.split(' ').filter((w) => w.length >= 4));
  }
  for (const part of main.split(/,|;|\band\b|&|\+|\/| - /)) out.push(part);
  return [...new Set(out.map(norm).filter((s) => s.length > 1))].map(tight);
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

/** Does a hand-written GDL name refer to this GDL region? */
const sameRegion = (label, region) => {
  const a = tight(norm(label));
  const b = names(region);
  return a === tight(norm(region)) || a === b[0] || (a.length >= 4 && (b[0] ?? '').startsWith(a));
};

const FIELDS_OUT = [C.shdi, C.gnic, C.lifexp, C.msch, C.esch, C.pop];
/** Population-weighted mean of several GDL rows (for map regions larger than GDL's). */
function blend(rs) {
  const w = rs.map((r) => r[C.pop] ?? 1);
  return FIELDS_OUT.map((f, i) => {
    if (f === C.pop) return rs.reduce((s, r) => s + (r[C.pop] ?? 0), 0) || null;
    let s = 0;
    let ws = 0;
    rs.forEach((r, k) => {
      if (r[f] == null) return;
      s += r[f] * w[k];
      ws += w[k];
    });
    return ws ? Math.round((s / ws) * 1000) / 1000 : null;
  });
}

const out = {};
let matchedTotal = 0;
let unitsTotal = 0;
const report = [];
for (const [iso, { country, units, subs }] of ours) {
  const regions = latest.filter((r) => r[C.iso] === iso && !/national/i.test(r[C.level] ?? ''));
  const national = latest.find((r) => r[C.iso] === iso && /national/i.test(r[C.level] ?? ''));
  if (!regions.length && !national) continue;

  const groups = GROUPS[iso] ?? {};
  const merge = MERGE[iso] ?? {};
  // A hand-written GDL name: the region spelled exactly so, else the closest loose match.
  const find = (label) =>
    regions.find((r) => r[C.region].trim().toLowerCase() === label.toLowerCase()) ?? regions.find((r) => sameRegion(label, r[C.region]));
  const cands = regions.map((r) => ({ r, n: names(r[C.region]), wild: false }));
  for (const [label, list] of Object.entries(groups)) {
    const c = cands.find((c) => c.r === find(label));
    if (!c) {
      console.warn(`${iso}: no GDL region for "${label}"`);
      continue;
    }
    for (const x of list) x === '*' ? (c.wild = true) : c.n.push(tight(norm(x)));
  }
  const merges = new Map(
    Object.entries(merge).map(([unit, list]) => [
      tight(norm(unit)),
      list.map(find).filter(Boolean),
    ]),
  );
  const pick = (u) => {
    const n = tight(norm(u.name));
    if (!n) return null;
    const m = merges.get(n);
    if (m?.length) return m;
    const one = (c) => c && [c.r];
    // Exact, then a name that starts the same way, then a near spelling, then a catch-all group.
    let c = cands.find((c) => c.n.includes(n));
    c ??= cands.find((c) => c.n.some((x) => x.length >= 4 && n.length >= 4 && (x.startsWith(n) || n.startsWith(x))));
    if (!c && n.length >= 5) {
      let best = null;
      let bd = n.length >= 8 ? 3 : 2;
      for (const k of cands)
        for (const x of k.n) {
          const d = lev(n, x);
          if (d < bd) (bd = d), (best = k);
        }
      c = best;
    }
    c ??= cands.find((c) => c.wild);
    return one(c);
  };

  const units2 = {};
  const regionNames = [];
  const idx = new Map();
  let matched = 0;
  for (const u of units) {
    const rs = pick(u);
    if (!rs) continue;
    matched++;
    const label = rs.map((r) => r[C.region]).join(' + ');
    if (!idx.has(label)) idx.set(label, regionNames.push(label) - 1);
    const v = rs.length === 1 ? FIELDS_OUT.map((f) => rs[0][f]) : blend(rs);
    units2[u.key] = [...v, idx.get(label)];
  }

  // Where GDL's regions are finer than our states (groups of districts), match
  // districts by name too, and give each state the blend of its districts' regions.
  if (regions.length > units.length && subs.length) {
    const exact = (n) => cands.find((c) => c.n.includes(n)) ?? (n.length >= 5 ? cands.find((c) => c.n.some((x) => x.length >= 5 && (x.startsWith(n) || n.startsWith(x)))) : null);
    const within = new Map();
    for (const u of subs) {
      const c = exact(tight(norm(u.name)));
      if (!c) continue;
      const label = c.r[C.region];
      if (!idx.has(label)) idx.set(label, regionNames.push(label) - 1);
      units2[u.key] = [...FIELDS_OUT.map((f) => c.r[f]), idx.get(label)];
      if (!within.has(u.parent)) within.set(u.parent, new Set());
      within.get(u.parent).add(c.r);
    }
    for (const u of units) {
      const rs = [...(within.get(u.key) ?? [])];
      if (!rs.length) continue;
      if (!units2[u.key]) matched++;
      const label = `${rs.length} regions`;
      if (!idx.has(label)) idx.set(label, regionNames.push(label) - 1);
      units2[u.key] = [...(rs.length === 1 ? FIELDS_OUT.map((f) => rs[0][f]) : blend(rs)), idx.get(label)];
    }
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
  const nat = national ? FIELDS_OUT.map((f) => national[f]) : null;
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
