/**
 * Fetches live market-implied probabilities (Polymarket Gamma API) and
 * daily FX moves vs USD (Frankfurter / ECB API) into src/data/nowcast.json.
 *
 * Run: node scripts/fetch-nowcast.mjs
 */
import { writeFileSync } from 'node:fs';
import { mapCountries } from './lib/map-countries.mjs';

const OUT = new URL('../src/data/nowcast.json', import.meta.url);
const TIMEOUT_MS = 12_000;

const EUROZONE = [
  'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria',
  'Portugal', 'Finland', 'Ireland', 'Greece', 'Slovakia', 'Slovenia',
  'Lithuania', 'Latvia', 'Estonia', 'Croatia', 'Luxembourg', 'Cyprus', 'Malta',
];

const CURRENCY_COUNTRIES = {
  EUR: EUROZONE,
  GBP: ['United Kingdom'],
  JPY: ['Japan'],
  CNY: ['China'],
  INR: ['India'],
  CAD: ['Canada'],
  AUD: ['Australia'],
  NZD: ['New Zealand'],
  CHF: ['Switzerland'],
  SEK: ['Sweden'],
  NOK: ['Norway'],
  DKK: ['Denmark'],
  PLN: ['Poland'],
  CZK: ['Czechia'],
  HUF: ['Hungary'],
  RON: ['Romania'],
  BGN: ['Bulgaria'],
  ISK: ['Iceland'],
  TRY: ['Turkey'],
  BRL: ['Brazil'],
  MXN: ['Mexico'],
  ZAR: ['South Africa'],
  KRW: ['South Korea'],
  SGD: ['Singapore'],
  HKD: ['Hong Kong'],
  IDR: ['Indonesia'],
  MYR: ['Malaysia'],
  PHP: ['Philippines'],
  THB: ['Thailand'],
  ILS: ['Israel'],
};

const KEEP_TAGS = new Set([
  'politics', 'geopolitics', 'economy', 'macro-indicators', 'fed', 'fed-rates',
  'global-rates', 'economic-policy', 'elections', 'world-elections', 'global-elections',
  'world', 'finance', 'trade', 'tariffs', 'middle-east', 'europe', 'asia', 'ukraine',
  'china', 'russia', 'iran', 'israel', 'taiwan', 'central-banks', 'recession', 'inflation',
]);
const DROP_TAGS = new Set([
  'sports', 'esports', 'nba', 'nfl', 'nhl', 'mlb', 'soccer', 'football', 'tennis',
  'ufc', 'mma', 'games', 'gaming', 'crypto', 'crypto-prices', 'pop-culture',
  'entertainment', 'movies', 'music', 'celebrities', 'weather',
]);

const COUNTRY_HINTS = {
  'United States of America': /\b(united states|u\.s\.|us\b|fed\b|fomc|federal reserve|trump|white house|congress|senate|american|powell|warsh)\b/i,
  China: /\b(china|chinese|beijing|xi jinping|pboc|yuan|taiwan strait)\b/i,
  Taiwan: /\b(taiwan|taipei|tsmc|taiwan strait)\b/i,
  Russia: /\b(russia|russian|moscow|putin|kremlin)\b/i,
  Ukraine: /\b(ukraine|ukrainian|kyiv|zelensky)\b/i,
  Israel: /\b(israel|israeli|gaza|netanyahu|idf)\b/i,
  Iran: /\b(iran|iranian|tehran|hormuz)\b/i,
  'United Kingdom': /\b(uk\b|u\.k\.|britain|british|bank of england|starmer|london)\b/i,
  Germany: /\b(germany|german|berlin|bundestag)\b/i,
  France: /\b(france|french|paris|macron)\b/i,
  Japan: /\b(japan|japanese|tokyo|bank of japan|boj|yen)\b/i,
  India: /\b(india|indian|modi|rbi|new delhi)\b/i,
  Canada: /\b(canada|canadian|ottawa|bank of canada)\b/i,
  Mexico: /\b(mexico|mexican|sheinbaum)\b/i,
  Brazil: /\b(brazil|brazilian|lula)\b/i,
  Argentina: /\b(argentina|argentine|milei)\b/i,
  Turkey: /\b(turkey|türkiye|turkish|erdogan)\b/i,
  'South Korea': /\b(south korea|korean|seoul)\b/i,
  'North Korea': /\b(north korea|pyongyang|kim jong)\b/i,
  'Saudi Arabia': /\b(saudi|riyadh|opec)\b/i,
  Venezuela: /\b(venezuela|maduro|caracas)\b/i,
  Australia: /\b(australia|australian|rba)\b/i,
  Poland: /\b(poland|polish|warsaw)\b/i,
  Italy: /\b(italy|italian|meloni)\b/i,
  Spain: /\b(spain|spanish|madrid)\b/i,
  Netherlands: /\b(netherlands|dutch)\b/i,
};

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ATLAS-WorldView/1.0 (+https://github.com/liumOazed/world-view-made-ez)' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isoDateDaysAgo(days) {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function fetchFx() {
  const start = isoDateDaysAgo(35);
  const data = await fetchJson(`https://api.frankfurter.dev/v1/${start}..?base=USD`);
  if (!data?.rates) return { date: null, countries: {} };

  const dates = Object.keys(data.rates).sort();
  if (dates.length < 2) return { date: null, countries: {} };

  const latestDate = dates[dates.length - 1];
  const latest = data.rates[latestDate];
  const d7Idx = Math.max(0, dates.length - 6); // ~5 trading days
  const d30Idx = 0; // ~30 calendar days ago
  const prev7 = data.rates[dates[d7Idx]];
  const prev30 = data.rates[dates[d30Idx]];

  // Note: Frankfurter returns local currency units per 1 USD (e.g. JPY=150).
  // When units per USD go UP, the local currency DEPRECIATED vs USD.
  // So local currency % move vs USD = ((prev / latest) - 1) * 100.
  const pctMove = (oldRate, newRate) => {
    if (!oldRate || !newRate) return null;
    return Math.round(((oldRate / newRate) - 1) * 1000) / 10;
  };

  const countries = {};
  for (const [ccy, list] of Object.entries(CURRENCY_COUNTRIES)) {
    const rate = latest[ccy];
    if (!rate) continue;
    const rec = {
      currency: ccy,
      perUsd: rate >= 100 ? Math.round(rate * 10) / 10 : Math.round(rate * 1000) / 1000,
      move7d: pctMove(prev7?.[ccy], rate),
      move30d: pctMove(prev30?.[ccy], rate),
    };
    for (const country of list) {
      countries[country] = rec;
    }
  }
  return { date: latestDate, countries };
}

function parseJsonArr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  }
  return [];
}

function pickCategory(tags, title) {
  const t = `${tags.join(' ')} ${title}`.toLowerCase();
  if (/\b(fed|fomc|rate|ecb|boj|inflation|cpi|recession|gdp|economy|tariff|trade)\b/.test(t)) return 'Macro & Rates';
  if (/\b(election|nominee|president|prime minister|mayor|parliament|senate|vote)\b/.test(t)) return 'Elections';
  if (/\b(war|ceasefire|strike|invade|invasion|nuclear|nato|conflict|military|missile)\b/.test(t)) return 'Geopolitics';
  return 'Policy';
}

async function fetchMarkets(allMapNames) {
  const pages = await Promise.all([
    fetchJson('https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume24hr&ascending=false&limit=100&offset=0'),
    fetchJson('https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume24hr&ascending=false&limit=100&offset=100'),
  ]);
  const events = pages.flat().filter(Boolean);

  const nameMatchers = allMapNames
    .filter((n) => n.length >= 4 && !COUNTRY_HINTS[n])
    .map((n) => [n, new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')]);

  const parsed = [];
  for (const e of events) {
    const tags = (e.tags ?? []).map((t) => String(t.slug ?? '').toLowerCase());
    if (tags.some((t) => DROP_TAGS.has(t))) continue;
    const vol24 = Number(e.volume24hr ?? 0);
    if (vol24 < 5000) continue;

    const keep = tags.some((t) => KEEP_TAGS.has(t)) || /\b(fed|rate|tariff|recession|election|ceasefire|war|oil|gdp|inflation)\b/i.test(e.title ?? '');
    if (!keep) continue;

    const markets = (e.markets ?? []).filter((m) => m.active !== false && m.closed !== true);
    if (!markets.length) continue;

    // Pick the leading active market inside the event (highest Yes probability or volume)
    let best = null;
    for (const m of markets) {
      const outcomes = parseJsonArr(m.outcomes);
      const prices = parseJsonArr(m.outcomePrices).map(Number);
      if (!outcomes.length || !prices.length) continue;
      const yesIdx = outcomes.findIndex((o) => String(o).toLowerCase() === 'yes');
      const idx = yesIdx >= 0 ? yesIdx : 0;
      const prob = Math.round((prices[idx] ?? 0) * 100);
      if (prob <= 1 || prob >= 99) continue; // skip settled/tail noise
      const chg = typeof m.oneDayPriceChange === 'number' ? Math.round(m.oneDayPriceChange * 1000) / 10 : null;
      const label = markets.length > 1 ? (m.groupItemTitle || m.question || e.title) : e.title;
      const mVol = Number(m.volume24hr ?? vol24);
      if (!best || prob > best.prob || (prob === best.prob && mVol > best.vol)) {
        best = { label: String(label), question: String(m.question ?? e.title), prob, change24h: chg, vol: mVol };
      }
    }
    if (!best) continue;

    const text = `${e.title} ${best.question} ${tags.join(' ')}`;
    const matched = new Set();
    for (const [country, re] of Object.entries(COUNTRY_HINTS)) {
      if (re.test(text)) matched.add(country);
    }
    for (const [country, re] of nameMatchers) {
      if (re.test(e.title ?? '')) matched.add(country);
    }

    parsed.push({
      title: String(e.title),
      outcome: best.label !== e.title ? best.label : null,
      prob: best.prob,
      change24h: best.change24h,
      volume24h: Math.round(vol24),
      category: pickCategory(tags, e.title),
      url: `https://polymarket.com/event/${e.slug}`,
      countries: [...matched].slice(0, 3),
    });
  }

  parsed.sort((a, b) => b.volume24h - a.volume24h);

  const byCountry = {};
  for (const m of parsed) {
    for (const c of m.countries) {
      byCountry[c] ??= [];
      if (byCountry[c].length < 5) byCountry[c].push(m);
    }
  }

  return { global: parsed.slice(0, 12), byCountry, total: parsed.length };
}

async function main() {
  const allMapNames = [...mapCountries().keys()];
  console.log('Fetching Polymarket prediction markets & Frankfurter ECB FX rates...');
  const [fx, markets] = await Promise.all([fetchFx(), fetchMarkets(allMapNames)]);

  const snapshot = {
    retrieved: new Date().toISOString(),
    fxSource: 'Frankfurter · European Central Bank reference rates',
    fxDate: fx.date,
    fxCountries: fx.countries,
    marketsSource: 'Polymarket (open live odds)',
    marketsGlobal: markets.global,
    marketsByCountry: markets.byCountry,
  };

  writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(
    `Wrote ${Object.keys(fx.countries).length} FX countries & ${markets.total} prediction markets (${Object.keys(markets.byCountry).length} countries) to src/data/nowcast.json`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
