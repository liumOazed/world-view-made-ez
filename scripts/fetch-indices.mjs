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
import ExcelJS from 'exceljs';
import { isoCountries, mapCountries } from './lib/map-countries.mjs';

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
  pressFreedom: {
    publisher: 'Reporters Without Borders (RSF)',
    via: 'RSF download',
    page: 'https://rsf.org/en/index',
    note: 'Score 0–100, higher is freer (methodology since 2022)',
    fetch: rsf,
  },
  gii: {
    publisher: 'WIPO Global Innovation Index',
    via: 'WIPO data file',
    page: 'https://www.wipo.int/global_innovation_index/en/',
    note: 'Overall GII score, 0–100',
    fetch: gii,
  },
  eci: {
    publisher: 'Harvard Growth Lab',
    via: 'Harvard Dataverse (CC0)',
    page: 'https://atlas.hks.harvard.edu/rankings',
    note: 'Economic Complexity Index (HS products)',
    fetch: eci,
  },
  fsi: {
    publisher: 'Fund for Peace',
    via: 'Fragile States Index download',
    page: 'https://fragilestatesindex.org/excel/',
    note: 'Total score, 0–120, lower is more stable',
    fetch: fsi,
  },
  // Not automated yet: Heritage economic freedom, Cato/Fraser human freedom and
  // WEF gender gap block scripted downloads; the Social Progress Index data is
  // paid; GPI, GTI and EPI have no direct data file we could find.
};

const latestYears = (n) => Array.from({ length: n }, (_, i) => new Date().getUTCFullYear() - i);

async function get(url, as = 'text') {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { 'user-agent': 'atlas-world-view (github.com/liumOazed/world-view-made-ez)' } }).catch(
      (e) => ({ ok: false, status: e.message }),
    );
    if (res.ok) return as === 'json' ? res.json() : as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
    if (res.status === 404 || res.status === 403) throw new Error(`${res.status} on ${url}`);
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

/** ISO alpha-3 from an English country name, for files that have no codes. */
const NAME_FIX = {
  'Congo Democratic Republic': 'COD',
  'Congo Republic': 'COG',
  'Cote d\'Ivoire': 'CIV',
  "Côte d'Ivoire": 'CIV',
  'Guinea Bissau': 'GNB',
  Kosovo: 'XKX',
  'Micronesia': 'FSM',
  'Israel and West Bank': 'ISR',
  'Kyrgyz Republic': 'KGZ',
  'Slovak Republic': 'SVK',
  'Czechia': 'CZE',
  'Turkey': 'TUR',
  'Swaziland': 'SWZ',
  'Eswatini': 'SWZ',
  'Cape Verde': 'CPV',
  'Brunei Darussalam': 'BRN',
  'Laos': 'LAO',
  'North Korea': 'PRK',
  'South Korea': 'KOR',
  'Russia': 'RUS',
  'Vietnam': 'VNM',
  'Iran': 'IRN',
  'Syria': 'SYR',
  'Bolivia': 'BOL',
  'Venezuela': 'VEN',
  'Tanzania': 'TZA',
  'Moldova': 'MDA',
  'Macedonia': 'MKD',
  'North Macedonia': 'MKD',
  'Palestine': 'PSE',
};
const nameToIso = (name) => {
  const n = String(name).trim();
  return NAME_FIX[n] ?? isoCountries.getAlpha3Code(n, 'en');
};

async function xlsxRows(buf, sheet) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = sheet ? wb.getWorksheet(sheet) : wb.worksheets[0];
  if (!ws) throw new Error(`No sheet ${sheet}`);
  const rows = [];
  ws.eachRow((row) => rows.push(row.values.slice(1).map((v) => (v && typeof v === 'object' && 'result' in v ? v.result : v))));
  return rows;
}

/** RSF publishes one semicolon-separated CSV per year, with ISO codes and comma decimals. */
async function rsf() {
  for (const year of latestYears(3)) {
    let buf;
    try {
      buf = await get(`https://rsf.org/sites/default/files/import_classement/${year}.csv`, 'buffer');
    } catch (e) {
      console.warn(`  ${e.message}`);
      continue;
    }
    const [head, ...rows] = new TextDecoder('latin1').decode(buf).split(/\r?\n/).map((l) => l.split(';'));
    const iso = head.indexOf('ISO');
    const score = head.findIndex((h) => /^Score \d{4}$/.test(h.trim()));
    if (iso < 0 || score < 0) throw new Error(`Unexpected RSF columns: ${head.join(' | ')}`);
    const out = {};
    for (const r of rows) {
      const v = Number(r[score]?.replace(',', '.'));
      if (/^[A-Z]{3}$/.test(r[iso]) && Number.isFinite(v) && r[score] !== '') out[r[iso]] = [v, year];
    }
    return out;
  }
  throw new Error('No RSF file for recent years');
}

/** WIPO's GII data workbook (record on tind.wipo.int); update the record each September. */
const GII_FILE = { year: 2025, url: 'https://tind.wipo.int/record/58882/files/wipo-pub-2000-2025-gii-tech1.xlsx' };
async function gii() {
  const rows = await xlsxRows(await get(GII_FILE.url, 'buffer'), 'Data');
  const [head, ...data] = rows;
  const iso = head.indexOf('ISO3');
  const name = head.indexOf('NAME');
  const score = head.indexOf('SCORE');
  const out = {};
  for (const r of data) {
    if (r[name] === 'Global Innovation Index' && Number.isFinite(r[score])) out[r[iso]] = [r[score], GII_FILE.year];
  }
  return out;
}

/** Growth Lab's "Growth Projections and Complexity Rankings" on Harvard Dataverse. */
async function eci() {
  const DV = 'https://dataverse.harvard.edu/api';
  const list = await get(`${DV}/datasets/:persistentId/versions/:latest/files?persistentId=doi:10.7910/DVN/XTAQMC`, 'json');
  const files = list.data.map((f) => ({ id: f.dataFile.id, name: f.dataFile.originalFileName ?? f.dataFile.filename }));
  console.log(`  files: ${files.map((f) => f.name).join(', ')}`);
  const file = files.find((f) => /rank/i.test(f.name) && /\.(csv|tab)$/i.test(f.name)) ?? files.find((f) => /\.(csv|tab)$/i.test(f.name));
  if (!file) throw new Error('No CSV in the dataset');
  const text = await get(`${DV}/access/datafile/${file.id}?format=original`);
  const [head, ...rows] = parseCsv(text.includes('\t') && !text.split('\n')[0].includes(',') ? text.replaceAll('\t', ',') : text);
  console.log(`  ${file.name} columns: ${head.join(' | ')}`);
  const iso = head.findIndex((h) => /iso|country_code|code/i.test(h));
  const year = head.findIndex((h) => /^year$/i.test(h));
  const value = head.findIndex((h) => /^(hs_)?eci(_hs.*)?$/i.test(h));
  if (iso < 0 || year < 0 || value < 0) throw new Error('Unexpected ECI columns');
  const out = {};
  for (const r of rows) {
    const v = Number(r[value]);
    const y = Number(r[year]);
    if (!/^[A-Z]{3}$/.test(r[iso]) || r[value] === '' || !Number.isFinite(v) || y < OLDEST_YEAR) continue;
    if (!out[r[iso]] || y > out[r[iso]][1]) out[r[iso]] = [v, y];
  }
  return out;
}

/** Fund for Peace posts one workbook per year; take the newest linked from its Excel page. */
async function fsi() {
  const html = await get('https://fragilestatesindex.org/excel/');
  const links = [...html.matchAll(/https:\/\/fragilestatesindex\.org\/wp-content\/uploads\/[^"']+\.xlsx/gi)].map((m) => m[0]);
  const yearOf = (u) => Number(u.match(/(20\d\d)[^/]*\.xlsx$/i)?.[1] ?? 0);
  const url = links.sort((a, b) => yearOf(b) - yearOf(a))[0];
  if (!url) throw new Error('No FSI workbook linked');
  console.log(`  ${url}`);
  const [head, ...rows] = await xlsxRows(await get(url, 'buffer'));
  const country = head.indexOf('Country');
  const year = head.indexOf('Year');
  const total = head.indexOf('Total');
  const out = {};
  const missed = [];
  for (const r of rows) {
    const iso = nameToIso(r[country]);
    const y = r[year] instanceof Date ? r[year].getUTCFullYear() : Number(r[year]);
    if (!iso) missed.push(r[country]);
    else if (Number.isFinite(r[total])) out[iso] = [Math.round(r[total] * 10) / 10, y];
  }
  if (missed.length) console.warn(`  unmatched names: ${missed.join(', ')}`);
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
