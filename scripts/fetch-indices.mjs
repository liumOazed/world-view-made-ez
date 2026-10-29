/**
 * Fetch the country scorecard indices into src/data/indices.json.
 *
 *   node scripts/fetch-indices.mjs
 *
 * Each source gives the latest value per country (ISO alpha-3) and its year.
 * Sources that fail keep their previous values, so one broken download never
 * blanks the scorecard. Needs internet access, which CI has; see
 * .github/workflows/refresh-indices.yml.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { mapCountries } from './lib/map-countries.mjs';

const OUT = new URL('../src/data/indices.json', import.meta.url);
const owid = (slug) => `https://ourworldindata.org/grapher/${slug}.csv`;
const wb = (indicator, source) =>
  `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=20000&mrnev=1${source ? `&source=${source}` : ''}`;
// Values older than this are dropped rather than shown as current.
const OLDEST_YEAR = new Date().getUTCFullYear() - 7;

/**
 * Scorecard index id -> where its data comes from. Our World in Data republishes
 * several indices with the original publisher's numbers; `publisher` is who made
 * the index, `via` is where we download it.
 */
const SOURCES = {
  gdpPpp: {
    publisher: 'World Bank WDI',
    via: 'World Bank API',
    page: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.PP.KD',
    note: 'GDP per capita, PPP (constant 2021 international $)',
    fetch: () => worldBank(wb('NY.GDP.PCAP.PP.KD')),
  },
  ruleOfLaw: {
    publisher: 'World Bank Worldwide Governance Indicators',
    via: 'World Bank API',
    page: 'https://www.worldbank.org/en/publication/worldwide-governance-indicators',
    note: 'Rule of Law estimate, about −2.5 to +2.5. Stands in until World Justice Project data is added.',
    // The WGI series moved to new codes in 2024; try the new one first.
    fetch: () => worldBank(wb('GOV_WGI_RL.EST'), wb('GOV_WGI_RL_EST'), wb('RL.EST', 3)),
  },
  hdi: {
    publisher: 'UNDP Human Development Report',
    via: 'Our World in Data',
    page: 'https://ourworldindata.org/grapher/human-development-index',
    fetch: () => owidCsv('human-development-index'),
  },
  happiness: {
    publisher: 'World Happiness Report (Gallup World Poll)',
    via: 'Our World in Data',
    page: 'https://ourworldindata.org/grapher/happiness-cantril-ladder',
    note: 'Life evaluation, 0–10 (Cantril ladder)',
    fetch: () => owidCsv('happiness-cantril-ladder'),
  },
  cpi: {
    publisher: 'Transparency International',
    via: 'Our World in Data',
    page: 'https://ourworldindata.org/grapher/ti-corruption-perception-index',
    fetch: () => owidCsv('ti-corruption-perception-index'),
  },
  democracy: {
    publisher: 'V-Dem Institute',
    via: 'Our World in Data',
    page: 'https://ourworldindata.org/grapher/liberal-democracy-index',
    note: 'Liberal Democracy Index, 0–1, used in place of the EIU Democracy Index',
    fetch: () => owidCsv('liberal-democracy-index'),
  },
  // Next batch, from the publishers' own downloads: press freedom (RSF; OWID's
  // copy stops at 2021 on the old scale), economic complexity (Harvard Growth
  // Lab), innovation (WIPO), economic freedom, social progress, gender gap,
  // EPI, human freedom, peace, fragility and terrorism.
};

async function get(url, as = 'text') {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { 'user-agent': 'atlas-world-view (github.com/liumOazed/world-view-made-ez)' } }).catch(
      (e) => ({ ok: false, status: e.message }),
    );
    if (res.ok) return as === 'json' ? res.json() : res.text();
    console.warn(`  ${res.status} on ${url}, retrying`);
    await new Promise((r) => setTimeout(r, 3000 * 2 ** i));
  }
  throw new Error(`Failed: ${url}`);
}

/** Minimal CSV parser that handles quoted fields. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') row.push(field), (field = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field), rows.push(row), (row = []), (field = '');
    } else field += ch;
  }
  if (field || row.length) row.push(field), rows.push(row);
  return rows.filter((r) => r.length > 1);
}

/** Latest value per ISO code from an OWID grapher CSV (Entity, Code, Year, value, ...). */
async function owidCsv(slug) {
  const [head, ...rows] = parseCsv(await get(owid(slug)));
  const code = head.indexOf('Code');
  const year = head.indexOf('Year');
  const value = head.findIndex((h, i) => i > year && h && !/region|continent|annotation/i.test(h));
  if (code < 0 || year < 0 || value < 0) throw new Error(`Unexpected columns: ${head.join(' | ')}`);
  console.log(`  column "${head[value]}"`);
  const out = {};
  for (const r of rows) {
    const iso = r[code];
    const v = Number(r[value]);
    const y = Number(r[year]);
    if (!/^[A-Z]{3}$/.test(iso) || r[value] === '' || !Number.isFinite(v) || y < OLDEST_YEAR) continue;
    if (!out[iso] || y > out[iso][1]) out[iso] = [v, y];
  }
  return out;
}

/** Most recent non-empty value per country from the World Bank API; tries each URL in turn. */
async function worldBank(...urls) {
  let rows = [];
  for (const url of urls) {
    const body = await get(url, 'json');
    rows = Array.isArray(body) ? body[1] ?? [] : [];
    if (rows.length) break;
    console.warn(`  no rows from ${url}: ${JSON.stringify(body).slice(0, 160)}`);
  }
  if (!rows.length) throw new Error('No rows from any World Bank URL');
  const out = {};
  for (const r of rows) {
    const iso = r.countryiso3code;
    const y = Number(r.date);
    if (!iso || r.value === null || y < OLDEST_YEAR) continue;
    if (!out[iso] || y > out[iso][1]) out[iso] = [r.value, y];
  }
  return out;
}

async function main() {
  const countries = mapCountries();
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { indices: {} };
  const today = new Date().toISOString().slice(0, 10);
  // Keep previous values only for sources still configured.
  const indices = Object.fromEntries(Object.entries(prev.indices).filter(([id]) => SOURCES[id]));
  const failed = [];

  for (const [id, src] of Object.entries(SOURCES)) {
    console.log(`${id} (${src.publisher})`);
    try {
      const byIso = await src.fetch();
      const values = {};
      for (const [name, iso] of countries) if (byIso[iso]) values[name] = byIso[iso];
      const n = Object.keys(values).length;
      if (n < 20) throw new Error(`only ${n} countries matched`);
      const years = Object.values(values).map(([, y]) => y);
      console.log(`  ${n} countries, years ${Math.min(...years)}–${Math.max(...years)}`);
      const { fetch: _, ...meta } = src;
      indices[id] = { ...meta, retrieved: today, values };
    } catch (e) {
      failed.push(id);
      console.warn(`  failed: ${e.message}${indices[id] ? ' (keeping previous values)' : ''}`);
    }
  }

  const sorted = Object.fromEntries(Object.entries(indices).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, JSON.stringify({ indices: sorted }, null, 1) + '\n');
  console.log(`Wrote ${Object.keys(sorted).length} indices (${Object.keys(SOURCES).length} configured); failed: ${failed.join(', ') || 'none'}`);
  if (Object.keys(sorted).length === 0) process.exit(1);
}

main();
