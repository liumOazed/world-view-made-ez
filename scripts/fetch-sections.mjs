/**
 * Fetch the indicators behind the seven map sections into src/data/sections.json.
 *
 *   node scripts/fetch-sections.mjs
 *
 * Sources: IMF World Economic Outlook (DataMapper API), World Bank WDI (which
 * also republishes ILO, SIPRI, WGI and International Debt Statistics series),
 * BIS policy rates, Our World in Data energy data, the Fragile States Index
 * workbook and the INFORM Risk Index. Each indicator keeps the latest value per
 * country with its year; IMF series also keep a short history and forecast.
 * Indicators that fail keep their previous values, so one broken download never
 * blanks a section. Needs internet access, which CI has; see
 * .github/workflows/refresh-sections.yml.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import ExcelJS from 'exceljs';
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
  inform: { name: 'INFORM Risk Index (European Commission JRC)', licence: 'CC BY 4.0', url: 'https://drmkc.jrc.ec.europa.eu/inform-index' },
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
 * INFORM Risk Index: find the newest release's workflow, then pull every
 * indicator country by country (the API returns nothing for an all-country
 * query). Scores are cached so the four indicators share one pass.
 */
const INFORM_API = 'https://drmkc.jrc.ec.europa.eu/inform-index/API/InformAPI';
let informScores;
async function inform(indicator) {
  if (!informScores) {
    let flow;
    for (const year of [THIS_YEAR + 1, THIS_YEAR, THIS_YEAR - 1]) {
      const list = await get(`${INFORM_API}/workflows/GetByWorkflowGroup/INFORM${year}`, 'json').catch(() => []);
      const flows = (Array.isArray(list) ? list : []).filter((w) => w.WorkflowId);
      if (!flows.length) continue;
      flow = { ...flows.sort((a, b) => b.WorkflowId - a.WorkflowId)[0], year };
      console.log(`  INFORM${year} workflow ${flow.WorkflowId} (${flow.Name ?? ''})`);
      break;
    }
    if (!flow) throw new Error('No INFORM workflow found');
    // Log what a few query shapes return, so a changed API is easy to diagnose.
    for (const q of [
      `countries/Scores/?WorkflowId=${flow.WorkflowId}&Iso3=AFG`,
      `countries/Scores/?WorkflowId=${flow.WorkflowId}&IndicatorId=INFORM&Iso3=AFG`,
      `Countries/Scores/?WorkflowId=${flow.WorkflowId}&IndicatorId=INFORM`,
      `countries/Scores?workflowId=${flow.WorkflowId}&iso3=AFG`,
    ]) {
      const res = await fetch(`${INFORM_API}/${q}`, { headers: UA, signal: AbortSignal.timeout(20000) }).catch((e) => ({ status: e.message, text: async () => '' }));
      console.log(`  ${q} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    informScores = new Map();
    const isos = [...new Set(mapCountries().values())];
    let logged = false;
    let misses = 0;
    for (let i = 0; i < isos.length; i += 8) {
      // One try per country: the API is slow, and a run must finish in minutes.
      if (i >= 40 && misses > i * 0.8) throw new Error(`INFORM returned nothing for ${misses} of the first ${i} countries`);
      await Promise.all(
        isos.slice(i, i + 8).map(async (iso) => {
          const rows = await get(`${INFORM_API}/countries/Scores/?WorkflowId=${flow.WorkflowId}&Iso3=${iso}`, 'json', 1, 15000).catch(() => []);
          if (!Array.isArray(rows) || !rows.length) return void misses++;
          if (rows.length && !logged) (logged = true), console.log(`  row: ${JSON.stringify(rows[0])}`);
          for (const r of rows) {
            const v = Number(r.IndicatorScore ?? r.Score ?? r.Value);
            if (Number.isFinite(v)) informScores.set(`${iso}:${r.IndicatorId}`, [round(v), flow.year]);
          }
        }),
      );
    }
    console.log(`  ${informScores.size} INFORM scores`);
  }
  const out = {};
  for (const [key, value] of informScores) {
    const [iso, id] = key.split(':');
    if (id === indicator) out[iso] = { value };
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
  informRisk: { label: 'INFORM disaster and crisis risk', unit: '0–10, higher is worse', source: 'inform', code: 'INFORM', fetch: () => inform('INFORM') },
  informHazard: { label: 'Hazard and exposure', unit: '0–10, higher is worse', source: 'inform', code: 'HA', fetch: () => inform('HA') },
  informVulnerability: { label: 'Vulnerability', unit: '0–10, higher is worse', source: 'inform', code: 'VU', fetch: () => inform('VU') },
  informCoping: { label: 'Lack of coping capacity', unit: '0–10, higher is worse', source: 'inform', code: 'CC', fetch: () => inform('CC') },
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
