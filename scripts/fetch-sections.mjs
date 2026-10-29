/**
 * Fetch the indicators behind the seven map sections into src/data/sections.json.
 *
 *   node scripts/fetch-sections.mjs
 *
 * Sources: IMF World Economic Outlook (DataMapper API), World Bank WDI (which
 * also republishes ILO, SIPRI, WGI and International Debt Statistics series),
 * BIS policy rates, Our World in Data energy data, the Fragile States Index
 * workbook and the ND-GAIN climate index. Each indicator keeps the latest value per
 * country with its year; IMF series also keep a short history and forecast.
 * Indicators that fail keep their previous values, so one broken download never
 * blanks a section. Needs internet access, which CI has; see
 * .github/workflows/refresh-sections.yml.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { isoCountries, mapCountries } from './lib/map-countries.mjs';

const OUT = new URL('../src/data/sections.json', import.meta.url);
const THIS_YEAR = new Date().getUTCFullYear();
// Values older than this are dropped rather than shown as current.
const OLDEST_YEAR = THIS_YEAR - 8;
// IMF history starts here; years after the last actual are forecasts.
const SERIES_FROM = THIS_YEAR - 9;
const UA = { 'user-agent': 'atlas-world-view (github.com/liumOazed/world-view-made-ez)' };

const SOURCES = {
  imf: { name: 'IMF World Economic Outlook', licence: 'Free reuse with attribution', url: 'https://www.imf.org/external/datamapper' },
  wdi: { name: 'World Bank World Development Indicators', licence: 'CC BY 4.0', url: 'https://data.worldbank.org/' },
  ilo: { name: 'ILO modelled estimates via World Bank', licence: 'CC BY 4.0', url: 'https://ilostat.ilo.org/' },
  pip: { name: 'World Bank Poverty and Inequality Platform', licence: 'CC BY 4.0', url: 'https://pip.worldbank.org/' },
  ids: { name: 'World Bank International Debt Statistics', licence: 'CC BY 4.0', url: 'https://www.worldbank.org/en/programs/debt-statistics/ids' },
  wgi: { name: 'World Bank Worldwide Governance Indicators', licence: 'CC BY 4.0', url: 'https://www.worldbank.org/en/publication/worldwide-governance-indicators' },
  sipri: { name: 'SIPRI Military Expenditure via World Bank', licence: 'Free with attribution', url: 'https://www.sipri.org/databases/milex' },
  ucdp: { name: 'UCDP battle-related deaths via World Bank', licence: 'CC BY 4.0', url: 'https://ucdp.uu.se/' },
  bis: { name: 'BIS central bank policy rates', licence: 'Free with attribution', url: 'https://data.bis.org/topics/CBPOL' },
  owid: { name: 'Energy Institute Statistical Review via Our World in Data', licence: 'CC BY 4.0', url: 'https://github.com/owid/energy-data' },
  fsi: { name: 'Fragile States Index (Fund for Peace)', licence: 'Non-commercial, with attribution', url: 'https://fragilestatesindex.org/' },
  ndgain: { name: 'ND-GAIN Country Index (University of Notre Dame)', licence: 'Free with attribution', url: 'https://gain.nd.edu/our-work/country-index/' },
};

/** IMF DataMapper series: id -> [code, label, unit]. */
const IMF = {
  gdpGrowth: ['NGDP_RPCH', 'Real GDP growth', '% change'],
  gdpUsd: ['NGDPD', 'GDP, current prices', 'US$ billions'],
  gdpPcUsd: ['NGDPDPC', 'GDP per capita, current prices', 'US$'],
  inflation: ['PCPIPCH', 'Inflation, average consumer prices', '% change'],
  deficit: ['GGXCNL_NGDP', 'Government net lending / borrowing', '% of GDP'],
  revenue: [['GGR_NGDP', 'rev'], 'Government revenue', '% of GDP'],
  spending: [['GGX_NGDP', 'exp'], 'Government expenditure', '% of GDP'],
  debt: ['GGXWDG_NGDP', 'Government gross debt', '% of GDP'],
  currentAccount: ['BCA_NGDPD', 'Current account balance', '% of GDP'],
};

/** World Bank series: id -> [code(s), label, unit, source]. Several codes are tried in turn. */
const WB = {
  gdpPcPpp: ['NY.GDP.PCAP.PP.KD', 'GDP per capita, PPP', 'constant 2021 int. $', 'wdi'],
  outputPerWorker: ['SL.GDP.PCAP.EM.KD', 'GDP per person employed', 'constant 2021 PPP $', 'ilo'],
  agriculture: ['NV.AGR.TOTL.ZS', 'Agriculture, value added', '% of GDP', 'wdi'],
  industry: ['NV.IND.TOTL.ZS', 'Industry, value added', '% of GDP', 'wdi'],
  manufacturing: ['NV.IND.MANF.ZS', 'Manufacturing, value added', '% of GDP', 'wdi'],
  services: ['NV.SRV.TOTL.ZS', 'Services, value added', '% of GDP', 'wdi'],
  unemployment: ['SL.UEM.TOTL.ZS', 'Unemployment', '% of labour force', 'ilo'],
  youthUnemployment: ['SL.UEM.1524.ZS', 'Youth unemployment (15–24)', '% of youth labour force', 'ilo'],
  participation: ['SL.TLF.CACT.ZS', 'Labour force participation', '% of population 15+', 'ilo'],
  consumption: ['NE.CON.PRVT.ZS', 'Household consumption', '% of GDP', 'wdi'],
  consumptionGrowth: ['NE.CON.PRVT.KD.ZG', 'Household consumption growth', '% change', 'wdi'],
  gini: ['SI.POV.GINI', 'Gini index', '0–100, higher is more unequal', 'pip'],
  poverty: ['SI.POV.DDAY', 'Extreme poverty (international line)', '% of population', 'pip'],
  tax: ['GC.TAX.TOTL.GD.ZS', 'Tax revenue', '% of GDP', 'wdi'],
  exports: ['NE.EXP.GNFS.CD', 'Exports of goods and services', 'current US$', 'wdi'],
  imports: ['NE.IMP.GNFS.CD', 'Imports of goods and services', 'current US$', 'wdi'],
  tradeOpenness: ['NE.TRD.GNFS.ZS', 'Trade openness', '% of GDP', 'wdi'],
  reservesMonths: ['FI.RES.TOTL.MO', 'Reserves in months of imports', 'months', 'wdi'],
  reserves: ['FI.RES.TOTL.CD', 'Total reserves incl. gold', 'current US$', 'wdi'],
  fxRate: ['PA.NUS.FCRF', 'Exchange rate', 'local currency per US$, period average', 'wdi'],
  fdi: ['BX.KLT.DINV.WD.GD.ZS', 'FDI, net inflows', '% of GDP', 'wdi'],
  lendingRate: ['FR.INR.LEND', 'Bank lending rate', '%', 'wdi'],
  realRate: ['FR.INR.RINR', 'Real interest rate', '%', 'wdi'],
  savings: ['NY.GNS.ICTR.ZS', 'Gross savings', '% of GDP', 'wdi'],
  privateCredit: ['FS.AST.PRVT.GD.ZS', 'Domestic credit to private sector', '% of GDP', 'wdi'],
  npl: ['FB.AST.NPER.ZS', 'Bank non-performing loans', '% of gross loans', 'wdi'],
  bankCapital: ['FB.BNK.CAPA.ZS', 'Bank capital to assets', '%', 'wdi'],
  militarySpend: ['MS.MIL.XPND.GD.ZS', 'Military expenditure', '% of GDP', 'sipri'],
  energyImports: ['EG.IMP.CONS.ZS', 'Net energy imports', '% of energy use', 'wdi'],
  fuelExports: ['TX.VAL.FUEL.ZS.UN', 'Fuel exports', '% of merchandise exports', 'wdi'],
  oresExports: ['TX.VAL.MMTL.ZS.UN', 'Ores and metals exports', '% of merchandise exports', 'wdi'],
  migrants: ['SM.POP.TOTL.ZS', 'International migrant stock', '% of population', 'wdi'],
  remittances: ['BX.TRF.PWKR.DT.GD.ZS', 'Remittances received', '% of GDP', 'wdi'],
  externalDebt: ['DT.DOD.DECT.GN.ZS', 'External debt stocks', '% of GNI', 'ids'],
  debtService: ['DT.TDS.DECT.EX.ZS', 'External debt service', '% of exports and income', 'ids'],
  shortTermDebt: ['DT.DOD.DSTC.ZS', 'Short-term external debt', '% of total external debt', 'ids'],
  politicalStability: [['GOV_WGI_PV.EST', 'GOV_WGI_PV_EST', 'PV.EST'], 'Political stability and absence of violence', 'estimate, about −2.5 to +2.5', 'wgi'],
  battleDeaths: ['VC.BTL.DETH', 'Battle-related deaths', 'people', 'ucdp'],
};

async function get(url, as = 'text', tries = 4, timeout = 60000) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeout) }).catch((e) => ({ ok: false, status: e.message }));
    if (res.ok) return as === 'json' ? res.json() : as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
    if (res.status === 404 || res.status === 403 || res.status === 400 || i === tries - 1) throw new Error(`${res.status} on ${url}`);
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

const round = (v) => Number(Math.abs(v) >= 1000 ? v.toPrecision(6) : v.toPrecision(4));

/**
 * IMF DataMapper returns every year it has, actuals and projections together,
 * as { values: { CODE: { ISO: { year: value } } } }. The WEO marks no flag in
 * this API, so we treat years before the current one as actuals.
 */
async function imf(codes) {
  let byIso;
  for (const code of [codes].flat()) {
    const body = await get(`https://www.imf.org/external/datamapper/api/v1/${code}`, 'json').catch((e) => console.warn(`  ${e.message}`));
    byIso = body?.values?.[code];
    if (byIso) break;
    console.warn(`  no values for ${code}: ${JSON.stringify(body ?? null).slice(0, 160)}`);
  }
  if (!byIso) throw new Error('No values from any IMF code');
  const out = {};
  for (const [iso, years] of Object.entries(byIso)) {
    if (!/^[A-Z]{3}$/.test(iso)) continue;
    const series = [];
    for (let y = SERIES_FROM; y <= THIS_YEAR + 1; y++) series.push(years[y] ?? null);
    const actual = Object.keys(years)
      .map(Number)
      .filter((y) => y < THIS_YEAR && y >= OLDEST_YEAR && Number.isFinite(years[y]))
      .sort((a, b) => b - a)[0];
    if (!actual) continue;
    out[iso] = {
      value: [round(years[actual]), actual],
      series: series.map((v) => (Number.isFinite(v) ? round(v) : null)),
      forecast: Number.isFinite(years[THIS_YEAR + 1]) ? [round(years[THIS_YEAR + 1]), THIS_YEAR + 1] : undefined,
    };
  }
  return out;
}

/** Most recent non-empty value per country from the World Bank API; tries each code in turn. */
async function worldBank(codes) {
  for (const code of [codes].flat()) {
    const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&mrnev=1`;
    let body;
    try {
      body = await get(url, 'json');
    } catch (e) {
      console.warn(`  ${e.message}`);
      continue;
    }
    const rows = Array.isArray(body) ? body[1] ?? [] : [];
    if (!rows.length) {
      console.warn(`  no rows for ${code}: ${JSON.stringify(body).slice(0, 160)}`);
      continue;
    }
    const out = {};
    for (const r of rows) {
      const iso = r.countryiso3code;
      const y = Number(r.date);
      if (!iso || r.value === null || y < OLDEST_YEAR) continue;
      if (!out[iso] || y > out[iso].value[1]) out[iso] = { value: [round(r.value), y] };
    }
    return out;
  }
  throw new Error('No rows from any World Bank code');
}

// Euro area members share the ECB policy rate (BIS reports it as XM).
const EURO = ['AUT', 'BEL', 'HRV', 'CYP', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'PRT', 'SVK', 'SVN', 'ESP'];

/** BIS central bank policy rates, monthly; latest observation per economy. */
async function bisPolicyRates() {
  const text = await get('https://stats.bis.org/api/v1/data/WS_CBPOL/M..?format=csv&lastNObservations=1');
  const [head, ...rows] = parseCsv(text);
  const area = head.indexOf('REF_AREA');
  const period = head.indexOf('TIME_PERIOD');
  const value = head.indexOf('OBS_VALUE');
  if (area < 0 || period < 0 || value < 0) throw new Error(`Unexpected BIS columns: ${head.join(' | ')}`);
  const out = {};
  let euro;
  for (const r of rows) {
    const v = Number(r[value]);
    const year = Number(r[period].slice(0, 4));
    // Series that stopped (national rates before the euro) end years ago.
    if (r[value] === '' || !Number.isFinite(v) || year < THIS_YEAR - 1) continue;
    const entry = { value: [v, year], period: r[period] };
    if (r[area] === 'XM') euro = entry;
    else {
      const iso = isoCountries.alpha2ToAlpha3(r[area]);
      if (iso) out[iso] = entry;
    }
  }
  if (euro) for (const iso of EURO) out[iso] = euro;
  return out;
}

/** Our World in Data energy dataset, one CSV with every country and year. */
let owidEnergyRows;
async function owidEnergy(column) {
  owidEnergyRows ??= parseCsv(await get('https://owid-public.owid.io/data/energy/owid-energy-data.csv'));
  const [head, ...rows] = owidEnergyRows;
  const iso = head.indexOf('iso_code');
  const year = head.indexOf('year');
  const col = head.indexOf(column);
  if (iso < 0 || year < 0 || col < 0) throw new Error(`No column ${column}`);
  const out = {};
  for (const r of rows) {
    const v = Number(r[col]);
    const y = Number(r[year]);
    if (!/^[A-Z]{3}$/.test(r[iso]) || r[col] === '' || !Number.isFinite(v) || y < OLDEST_YEAR) continue;
    if (!out[r[iso]] || y > out[r[iso]].value[1]) out[r[iso]] = { value: [round(v), y] };
  }
  return out;
}

/** ISO alpha-3 from an English country name, for files that have no codes. */
const NAME_FIX = {
  'Congo Democratic Republic': 'COD',
  'Congo Republic': 'COG',
  "Cote d'Ivoire": 'CIV',
  "Côte d'Ivoire": 'CIV',
  'Guinea Bissau': 'GNB',
  Kosovo: 'XKX',
  Micronesia: 'FSM',
  'Israel and West Bank': 'ISR',
  'Kyrgyz Republic': 'KGZ',
  'Slovak Republic': 'SVK',
  Czechia: 'CZE',
  Turkey: 'TUR',
  Swaziland: 'SWZ',
  Eswatini: 'SWZ',
  'Cape Verde': 'CPV',
  'Brunei Darussalam': 'BRN',
  Laos: 'LAO',
  'North Korea': 'PRK',
  'South Korea': 'KOR',
  Russia: 'RUS',
  Vietnam: 'VNM',
  Iran: 'IRN',
  Syria: 'SYR',
  Bolivia: 'BOL',
  Venezuela: 'VEN',
  Tanzania: 'TZA',
  Moldova: 'MDA',
  Macedonia: 'MKD',
  'North Macedonia': 'MKD',
  Palestine: 'PSE',
};
const nameToIso = (name) => {
  const n = String(name).trim();
  return NAME_FIX[n] ?? isoCountries.getAlpha3Code(n, 'en');
};

/** Fragile States Index sub-indicators from the newest workbook on its Excel page. */
let fsiRows;
async function fsiColumn(match) {
  if (!fsiRows) {
    const html = await get('https://fragilestatesindex.org/excel/');
    const links = [...html.matchAll(/https:\/\/fragilestatesindex\.org\/wp-content\/uploads\/[^"']+\.xlsx/gi)].map((m) => m[0]);
    const yearOf = (u) => Number(u.match(/(20\d\d)[^/]*\.xlsx$/i)?.[1] ?? 0);
    const url = links.sort((a, b) => yearOf(b) - yearOf(a))[0];
    if (!url) throw new Error('No FSI workbook linked');
    console.log(`  ${url}`);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await get(url, 'buffer'));
    fsiRows = [];
    wb.worksheets[0].eachRow((row) =>
      fsiRows.push(row.values.slice(1).map((v) => (v && typeof v === 'object' && 'result' in v ? v.result : v))),
    );
    console.log(`  FSI columns: ${fsiRows[0].join(' | ')}`);
  }
  const [head, ...rows] = fsiRows;
  const country = head.indexOf('Country');
  const year = head.indexOf('Year');
  const col = head.findIndex((h) => match.test(String(h)));
  if (country < 0 || col < 0) throw new Error(`No FSI column for ${match}`);
  const out = {};
  for (const r of rows) {
    const iso = nameToIso(r[country]);
    const y = r[year] instanceof Date ? r[year].getUTCFullYear() : Number(r[year]);
    if (iso && Number.isFinite(r[col])) out[iso] = { value: [round(r[col]), y] };
  }
  return out;
}

/**
 * ND-GAIN Country Index (University of Notre Dame): one zip of wide CSVs
 * (ISO3, Name, then one column per year). The zip's name changes each year,
 * so it is read from the download page.
 */
const NDGAIN_PAGE = 'https://gain.nd.edu/our-work/country-index/download-data/';
const NDGAIN_FALLBACK = 'https://gain.nd.edu/assets/647440/ndgain_countryindex_2026.zip';
let ndgainZip;
async function ndgain(file) {
  if (!ndgainZip) {
    const html = await get(NDGAIN_PAGE).catch(() => '');
    const link = html.match(/https?:\/\/gain\.nd\.edu\/assets\/[^"']+ndgain_countryindex[^"']*\.zip/i)?.[0] ?? NDGAIN_FALLBACK;
    console.log(`  ${link}`);
    ndgainZip = await JSZip.loadAsync(await get(link, 'buffer'));
    console.log(`  files: ${Object.keys(ndgainZip.files).filter((f) => f.endsWith('.csv')).slice(0, 40).join(', ')}`);
  }
  // Several files share a name (indicator metadata too): take the first with year columns.
  const names = Object.keys(ndgainZip.files)
    .filter((f) => new RegExp(`(^|/)${file}\\.csv$`, 'i').test(f))
    .sort((a, b) => a.split('/').length - b.split('/').length);
  let head, rows, iso, years;
  for (const name of names) {
    [head, ...rows] = parseCsv(await ndgainZip.files[name].async('string'));
    iso = head.findIndex((h) => /^iso3$/i.test(h.trim()));
    years = head.map((h, i) => [Number(h), i]).filter(([y]) => y > 1990 && y <= THIS_YEAR);
    if (iso >= 0 && years.length) break;
  }
  if (!names.length) throw new Error(`No ${file}.csv in the ND-GAIN zip`);
  if (iso < 0 || !years.length) throw new Error(`Unexpected ND-GAIN columns in ${names.join(', ')}`);
  const out = {};
  for (const r of rows) {
    for (const [y, i] of [...years].reverse()) {
      const v = Number(r[i]);
      if (r[i] !== '' && r[i] !== 'NA' && Number.isFinite(v) && y >= OLDEST_YEAR) {
        out[r[iso]] = { value: [round(v), y] };
        break;
      }
    }
  }
  return out;
}

/** Every indicator: id -> { label, unit, source, code, fetch }. */
const INDICATORS = {
  ...Object.fromEntries(
    Object.entries(IMF).map(([id, [code, label, unit]]) => [
      id,
      { label, unit, source: 'imf', code: [code].flat()[0], fetch: () => imf(code) },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(WB).map(([id, [code, label, unit, source]]) => [
      id,
      { label, unit, source, code: [code].flat()[0], fetch: () => worldBank(code) },
    ]),
  ),
  policyRate: { label: 'Central bank policy rate', unit: '%', source: 'bis', code: 'WS_CBPOL', fetch: bisPolicyRates },
  fossilShare: { label: 'Fossil fuels in primary energy', unit: '%', source: 'owid', code: 'fossil_share_energy', fetch: () => owidEnergy('fossil_share_energy') },
  renewablesShare: { label: 'Renewables in primary energy', unit: '%', source: 'owid', code: 'renewables_share_energy', fetch: () => owidEnergy('renewables_share_energy') },
  energyPerCapita: { label: 'Energy use per person', unit: 'kWh', source: 'owid', code: 'energy_per_capita', fetch: () => owidEnergy('energy_per_capita') },
  fsiGrievance: { label: 'Group grievance', unit: '0–10, higher is worse', source: 'fsi', code: 'C3', fetch: () => fsiColumn(/^C3/) },
  fsiDemographic: { label: 'Demographic pressures', unit: '0–10, higher is worse', source: 'fsi', code: 'S1', fetch: () => fsiColumn(/^S1/) },
  fsiRefugees: { label: 'Refugees and displaced people', unit: '0–10, higher is worse', source: 'fsi', code: 'S2', fetch: () => fsiColumn(/^S2/) },
  fsiEconomy: { label: 'Economic decline', unit: '0–10, higher is worse', source: 'fsi', code: 'E1', fetch: () => fsiColumn(/^E1/) },
  fsiLegitimacy: { label: 'State legitimacy', unit: '0–10, higher is worse', source: 'fsi', code: 'P1', fetch: () => fsiColumn(/^P1/) },
  ndgain: { label: 'ND-GAIN climate adaptation index', unit: '0–100, higher is better prepared', source: 'ndgain', code: 'gain', fetch: () => ndgain('gain') },
  ndVulnerability: { label: 'Climate vulnerability', unit: '0–1, higher is more vulnerable', source: 'ndgain', code: 'vulnerability', fetch: () => ndgain('vulnerability') },
  ndReadiness: { label: 'Readiness to adapt', unit: '0–1, higher is better', source: 'ndgain', code: 'readiness', fetch: () => ndgain('readiness') },
};

async function main() {
  const countries = mapCountries();
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { indicators: {} };
  const today = new Date().toISOString().slice(0, 10);
  const indicators = Object.fromEntries(Object.entries(prev.indicators).filter(([id]) => INDICATORS[id]));
  const failed = [];

  for (const [id, def] of Object.entries(INDICATORS)) {
    console.log(`${id} (${def.source} ${def.code})`);
    try {
      const byIso = await def.fetch();
      const values = {};
      const series = {};
      const forecast = {};
      for (const [name, iso] of countries) {
        const row = byIso[iso];
        if (!row) continue;
        values[name] = row.value;
        if (row.series) series[name] = row.series;
        if (row.forecast) forecast[name] = row.forecast;
      }
      const n = Object.keys(values).length;
      if (n < 20) throw new Error(`only ${n} countries matched`);
      const years = Object.values(values).map(([, y]) => y);
      console.log(`  ${n} countries, years ${Math.min(...years)}–${Math.max(...years)}`);
      const { fetch: _, ...meta } = def;
      indicators[id] = {
        ...meta,
        retrieved: today,
        values,
        ...(Object.keys(series).length ? { seriesFrom: SERIES_FROM, series } : {}),
        ...(Object.keys(forecast).length ? { forecast } : {}),
      };
    } catch (e) {
      failed.push(id);
      console.warn(`  failed: ${e.message}${indicators[id] ? ' (keeping previous values)' : ''}`);
    }
  }

  const sorted = Object.fromEntries(Object.entries(indicators).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, JSON.stringify({ sources: SOURCES, indicators: sorted }) + '\n');
  console.log(`Wrote ${Object.keys(sorted).length} of ${Object.keys(INDICATORS).length} indicators; failed: ${failed.join(', ') || 'none'}`);
  if (Object.keys(sorted).length === 0) process.exit(1);
}

main();
