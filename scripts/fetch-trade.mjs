/**
 * Fetch each country's top trade partners from UN Comtrade (the data behind
 * World Bank WITS) and write src/data/trade.json.
 *
 *   node scripts/fetch-trade.mjs            all countries on the map
 *   node scripts/fetch-trade.mjs DEU BGD    just these (ISO alpha-3), merged into the existing file
 *
 * Uses the public preview API (no key, max 500 rows per call), which allows
 * roughly one request every ten seconds, so a full pass takes several runs.
 * Each run fills in missing countries first, then any older than STALE_DAYS,
 * and keeps everything it already has. It needs internet access, which CI
 * has; see .github/workflows/refresh-trade.yml.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const countries = require('i18n-iso-countries');
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
const world = require('world-atlas/countries-110m.json');
const small = JSON.parse(readFileSync(new URL('../src/data/small-countries.json', import.meta.url), 'utf8'));

const OUT = new URL('../src/data/trade.json', import.meta.url);
const API = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS';
const REF = 'https://comtradeapi.un.org/files/v1/app/reference/Reporters.json';
// 2023 is the most recent year most reporters have filed; 2024 is still patchy.
const YEARS = [2023, 2022, 2024, 2021];
const TOP = 15;
const PAUSE_MS = 10_000;
const STALE_DAYS = 30;

// Fetched first, so a run that is cut short still covers the biggest economies.
const PRIORITY = `USA CHN DEU JPN IND GBR FRA ITA BRA CAN RUS KOR AUS ESP MEX IDN NLD SAU TUR CHE POL TWN BEL SWE
  ARG NOR AUT ARE IRL ISR THA SGP MYS VNM PHL BGD EGY NGA ZAF PAK CHL COL KEN ETH GHA LKA KAZ QAT IRN UKR`.split(/\s+/);

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
// Where Comtrade's numeric code differs from ISO 3166 (used only if the reference file is unavailable).
const COMTRADE_CODE = { USA: 842, FRA: 251, IND: 699, NOR: 579, CHE: 757, TWN: 490, ITA: 380 };
// Comtrade reports Taiwan as "Other Asia, nes".
const PARTNER_ISO = { S19: 'TWN' };

/** Map name -> ISO alpha-3, for every country drawn on the map. */
function mapCountries() {
  const out = new Map();
  for (const g of world.objects.countries.geometries) {
    const iso = NAME_ISO[g.properties.name] ?? (g.id ? countries.numericToAlpha3(g.id) : undefined);
    if (iso) out.set(g.properties.name, iso);
  }
  for (const f of small.features) {
    const iso = NAME_ISO[f.properties.name] ?? countries.getAlpha3Code(f.properties.name, 'en');
    if (iso) out.set(f.properties.name, iso);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { accept: 'application/json' } }).catch((e) => ({ ok: false, status: e.message }));
    if (res.ok) return res.json();
    const wait = res.status === 429 ? 10_000 * (i + 1) : 2_000 * 2 ** i;
    console.warn(`  ${res.status} on ${url.replace(API, '')}, retrying in ${wait / 1000}s`);
    await sleep(wait);
  }
  throw new Error(`Failed after ${tries} tries: ${url}`);
}

/** ISO alpha-3 -> Comtrade reporter code. */
async function reporterCodes() {
  try {
    const ref = await getJson(REF, 3);
    const rows = ref.results ?? ref;
    const out = new Map();
    for (const r of rows) {
      if (r.isGroup || !r.reporterCodeIsoAlpha3) continue;
      // Prefer the current entry when a code was re-used historically.
      if (!r.entryExpiredDate || !out.has(r.reporterCodeIsoAlpha3)) out.set(r.reporterCodeIsoAlpha3, r.reporterCode ?? r.id);
    }
    console.log(`Loaded ${out.size} Comtrade reporter codes`);
    return out;
  } catch (e) {
    console.warn(`Reporter reference unavailable (${e.message}); falling back to ISO numeric codes`);
    return new Map();
  }
}

/** Keep only the plain totals rows (no customs / transport / second-partner breakdowns). */
const plain = (r) =>
  (r.partner2Code ?? 0) === 0 && (r.motCode ?? 0) === 0 && (r.customsCode ?? 'C00') === 'C00' && r.partnerCode !== 0;

async function query(params) {
  const qs = new URLSearchParams({ includeDesc: 'true', ...params });
  await sleep(PAUSE_MS);
  const body = await getJson(`${API}?${qs}`);
  if (body.error) throw new Error(body.error);
  return (body.data ?? []).filter(plain);
}

async function fetchCountry(name, iso, code, isoByCode) {
  let year;
  let exp = [];
  let imp = [];
  for (const y of YEARS) {
    exp = await query({ reporterCode: code, period: y, flowCode: 'X', cmdCode: 'TOTAL' });
    imp = await query({ reporterCode: code, period: y, flowCode: 'M', cmdCode: 'TOTAL' });
    if (exp.length + imp.length > 0) {
      year = y;
      break;
    }
  }
  if (!year) return null;

  const partnerIso = (r) => {
    const p = r.partnerISO ?? isoByCode.get(r.partnerCode);
    return PARTNER_ISO[p] ?? p;
  };
  const by = new Map();
  const row = (r) => {
    const p = partnerIso(r);
    if (!p || p === 'W00' || p === iso) return null;
    if (!by.has(p)) by.set(p, { iso: p, exp: 0, imp: 0, energy: 0, food: 0, chips: 0 });
    return by.get(p);
  };
  for (const r of exp) {
    const p = row(r);
    if (p) p.exp += r.primaryValue ?? 0;
  }
  for (const r of imp) {
    const p = row(r);
    if (p) p.imp += r.primaryValue ?? 0;
  }
  const exportsTotal = [...by.values()].reduce((s, p) => s + p.exp, 0);
  const importsTotal = [...by.values()].reduce((s, p) => s + p.imp, 0);
  const top = [...by.values()].sort((a, b) => b.exp + b.imp - (a.exp + a.imp)).slice(0, TOP);

  // What it buys from its top partners: energy (HS 27), food (HS 01-24), chips (HS 8542).
  const partnerCodes = [...new Set(imp.filter((r) => top.some((t) => t.iso === partnerIso(r))).map((r) => r.partnerCode))].join(',');
  if (partnerCodes) {
    const products = [
      ['energy', '27'],
      ['food', Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0')).join(',')],
      ['chips', '8542'],
    ];
    for (const [field, cmdCode] of products) {
      const rows = await query({ reporterCode: code, period: year, flowCode: 'M', cmdCode, partnerCode: partnerCodes });
      for (const r of rows) {
        const p = top.find((t) => t.iso === partnerIso(r));
        if (p) p[field] += r.primaryValue ?? 0;
      }
    }
  }

  const round = (v) => Math.round(v / 1e6); // USD millions
  return {
    iso,
    year,
    exportsTotal: round(exportsTotal),
    importsTotal: round(importsTotal),
    partners: top.map((p) => ({
      iso: p.iso,
      exp: round(p.exp),
      imp: round(p.imp),
      energy: round(p.energy),
      food: round(p.food),
      chips: round(p.chips),
    })),
  };
}

async function main() {
  const all = mapCountries();
  const only = new Set(process.argv.slice(2).map((s) => s.toUpperCase()));
  const rank = (iso) => (PRIORITY.includes(iso) ? PRIORITY.indexOf(iso) : PRIORITY.length);
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { countries: {} };
  const today = new Date().toISOString().slice(0, 10);
  const age = (name) => {
    const r = prev.countries[name]?.retrieved ?? prev.retrieved;
    return prev.countries[name] && r ? (Date.parse(today) - Date.parse(r)) / 86_400_000 : Infinity;
  };
  // Missing countries first (biggest economies first), then the stalest.
  const targets = [...all]
    .filter(([name, iso]) => (only.size ? only.has(iso) : age(name) > STALE_DAYS))
    .sort((a, b) => (age(b[0]) === Infinity) - (age(a[0]) === Infinity) || rank(a[1]) - rank(b[1]) || age(b[0]) - age(a[0]));
  console.log(`${targets.length} countries to fetch`);
  const codes = await reporterCodes();
  const codeOf = (iso) => codes.get(iso) ?? COMTRADE_CODE[iso] ?? Number(countries.alpha3ToNumeric(iso));
  const isoByCode = new Map([...codes].map(([iso, code]) => [code, iso]));

  const out = { ...prev.countries };
  // Tag rows from before per-country dates existed.
  for (const c of Object.values(out)) c.retrieved ??= prev.retrieved;
  const isoToName = Object.fromEntries([...all].map(([name, iso]) => [iso, name]));
  // Saved after every country, so a run stopped by its time limit keeps what it fetched.
  const save = () => {
    const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(
      OUT,
      JSON.stringify(
        {
          source: 'UN Comtrade (HS, annual goods trade), the data behind World Bank WITS',
          sourceUrl: 'https://comtradeplus.un.org/',
          licence: 'UN Comtrade terms of use; attribution required',
          retrieved: Object.values(out).reduce((m, c) => (c.retrieved > m ? c.retrieved : m), ''),
          units: 'USD millions',
          isoToName,
          countries: sorted,
        },
        null,
        1,
      ) + '\n',
    );
    return sorted;
  };
  const failed = [];
  let fetched = 0;
  let i = 0;
  for (const [name, iso] of targets) {
    i++;
    const code = codeOf(iso);
    if (!code) continue;
    try {
      const data = await fetchCountry(name, iso, code, isoByCode);
      if (data) {
        out[name] = { ...data, retrieved: today };
        fetched++;
        save();
        console.log(`[${i}/${targets.length}] ${name}: ${data.year}, ${data.partners.length} partners`);
      } else console.log(`[${i}/${targets.length}] ${name}: no data`);
      if (i === 8 && fetched === 0) {
        throw new Error('No data for the first 8 countries; the API or its response format has probably changed');
      }
    } catch (e) {
      if (e.message.startsWith('No data for the first')) throw e;
      failed.push(name);
      console.warn(`[${i}/${targets.length}] ${name}: ${e.message}`);
      if (prev.countries[name]) out[name] = prev.countries[name];
    }
  }

  const sorted = save();
  console.log(`Wrote ${Object.keys(sorted).length} countries; ${failed.length} failed${failed.length ? `: ${failed.join(', ')}` : ''}`);
  if (targets.length && fetched === 0) process.exit(1);
}

main();
