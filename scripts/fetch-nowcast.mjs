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

// Bulgaria adopted the euro on January 1, 2026.
const EUROZONE = [
  'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria',
  'Portugal', 'Finland', 'Ireland', 'Greece', 'Slovakia', 'Slovenia',
  'Lithuania', 'Latvia', 'Estonia', 'Croatia', 'Luxembourg', 'Cyprus', 'Malta',
  'Bulgaria',
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
  'entertainment', 'movies', 'music', 'celebrities', 'weather', 'ai-compute', 'gpu',
]);
const DROP_TITLE_RE = /\b(rental price|h100|h200|b200|b300|a100|gpu|tweet|tweets|box office|spotify|youtube|mrbeast|oscar|grammy|gta\s*vi)\b/i;

// Strict country matchers run against the market title (not noisy Polymarket tags).
const COUNTRY_HINTS = {
  'United States of America': [
    /(?:\bU\.S\.(?!\w)|\b(?:US|FOMC)\b)/,
    /\b(United States|Federal Reserve|Fed Decision|Fed Chair|White House|US President|Democratic Presidential|Republican Presidential|Powell|Warsh)\b/i,
  ],
  China: [/\b(China|Chinese|Beijing|Xi Jinping|PBOC|yuan|Taiwan Strait)\b/i],
  Taiwan: [/\b(Taiwan|Taipei|TSMC|Taiwan Strait)\b/i],
  Russia: [/\b(Russia|Russian|Moscow|Putin|Kremlin)\b/i],
  Ukraine: [/\b(Ukraine|Ukrainian|Kyiv|Zelensky)\b/i],
  Israel: [/\b(Israel|Israeli|Netanyahu|Gaza|IDF)\b/i],
  Iran: [/\b(Iran|Iranian|Tehran|Hormuz|Khamenei)\b/i],
  'United Kingdom': [
    /(?:\bU\.K\.(?!\w)|\bUK\b)/,
    /\b(United Kingdom|Britain|British|Bank of England|Keir Starmer|Downing Street)\b/i,
  ],
  Germany: [/\b(Germany|German|Berlin|Bundestag)\b/i],
  France: [/\b(France|French|Paris|Macron|Le Pen)\b/i],
  Japan: [/\b(Japan|Japanese|Tokyo|Bank of Japan|BOJ|yen)\b/i],
  India: [/\b(India|Indian|Modi|RBI|New Delhi)\b/i],
  Canada: [/\b(Canada|Canadian|Ottawa|Bank of Canada)\b/i],
  Mexico: [/\b(Mexico|Mexican|Sheinbaum)\b/i],
  Brazil: [/\b(Brazil|Brazilian|Lula)\b/i],
  Argentina: [/\b(Argentina|Argentine|Milei)\b/i],
  Turkey: [/\b(Turkey|Türkiye|Turkish|Erdogan)\b/i],
  'South Korea': [/\b(South Korea|South Korean|Seoul)\b/i],
  'North Korea': [/\b(North Korea|North Korean|Pyongyang|Kim Jong)\b/i],
  'Saudi Arabia': [/\b(Saudi Arabia|Saudi|Riyadh|OPEC)\b/i],
  Venezuela: [/\b(Venezuela|Maduro|Caracas)\b/i],
  Australia: [/\b(Australia|Australian|RBA)\b/i],
  Poland: [/\b(Poland|Polish|Warsaw)\b/i],
  Italy: [/\b(Italy|Italian|Meloni)\b/i],
  Spain: [/\b(Spain|Spanish|Madrid)\b/i],
  Netherlands: [/\b(Netherlands|Dutch)\b/i],
  Sweden: [/\b(Sweden|Swedish|Stockholm)\b/i],
  Norway: [/\b(Norway|Norwegian|Oslo)\b/i],
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

function isoDateDaysAgo(days, fromMs = Date.now()) {
  const d = new Date(fromMs - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Drop isolated bad prints: an interior point that sits more than 4% away from the
 * median of its two neighbours on each side, while those neighbours agree with each
 * other to within 3%, is treated as a feed glitch and skipped.
 */
function cleanSeries(dates, ratesByDate, ccy) {
  const raw = dates
    .map((d) => ({ date: d, ms: Date.parse(`${d}T00:00:00Z`), rate: ratesByDate[d]?.[ccy] }))
    .filter((p) => typeof p.rate === 'number' && Number.isFinite(p.rate) && p.rate > 0);

  if (raw.length < 5) return raw;
  const cleaned = [];
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i];
    if (i > 0 && i < raw.length - 1) {
      const neigh = raw.slice(Math.max(0, i - 2), i).concat(raw.slice(i + 1, i + 3)).map((p) => p.rate);
      const m = median(neigh);
      const spread = (Math.max(...neigh) - Math.min(...neigh)) / m;
      if (Math.abs(cur.rate - m) / m > 0.04 && spread < 0.03) {
        console.warn(`Skipping FX outlier for ${ccy} on ${cur.date}: ${cur.rate} (neighbour median ${m.toFixed(4)})`);
        continue;
      }
    }
    cleaned.push(cur);
  }
  return cleaned;
}

/**
 * Reference rate around `targetMs`: the median of trading days within ±2 days,
 * so one stray print at the anchor date cannot drive the 7d / 30d move.
 * Falls back to the closest trading day within ±4 days.
 */
function anchorRate(series, targetMs) {
  const near = series.filter((p) => Math.abs(p.ms - targetMs) <= 2 * 86_400_000);
  if (near.length) return { rate: median(near.map((p) => p.rate)), dates: near.map((p) => p.date) };
  let best = null;
  let bestDiff = Infinity;
  for (const p of series) {
    const diff = Math.abs(p.ms - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best && bestDiff <= 4 * 86_400_000 ? { rate: best.rate, dates: [best.date] } : null;
}

async function fetchFx() {
  const start = isoDateDaysAgo(37);
  const data = await fetchJson(`https://api.frankfurter.dev/v1/${start}..?base=USD`);
  if (!data?.rates) return { date: null, countries: {} };

  const dates = Object.keys(data.rates).sort();
  if (dates.length < 2) return { date: null, countries: {} };

  const latestDate = dates[dates.length - 1];
  const latestMs = Date.parse(`${latestDate}T00:00:00Z`);
  const target7Ms = latestMs - 7 * 86_400_000;
  const target30Ms = latestMs - 30 * 86_400_000;

  // Frankfurter returns local currency units per 1 USD (e.g. JPY=150).
  // Local currency % move vs USD = ((oldRate / newRate) - 1) * 100.
  const pctMove = (oldRate, newRate, maxAbs = 35) => {
    if (!oldRate || !newRate) return null;
    const pct = Math.round(((oldRate / newRate) - 1) * 1000) / 10;
    if (Math.abs(pct) > maxAbs) {
      console.warn(`Rejecting implausible FX move: ${pct}% (${oldRate} -> ${newRate})`);
      return null;
    }
    return pct;
  };

  const countries = {};
  for (const [ccy, list] of Object.entries(CURRENCY_COUNTRIES)) {
    const series = cleanSeries(dates, data.rates, ccy);
    if (series.length < 2) continue;
    const latest = series[series.length - 1];
    const p7 = anchorRate(series, target7Ms);
    const p30 = anchorRate(series, target30Ms);
    console.log(
      `${ccy}: ${latest.date} ${latest.rate} · 7d ref ${p7 ? `${p7.rate} (${p7.dates.join(',')})` : 'n/a'} · 30d ref ${p30 ? `${p30.rate} (${p30.dates.join(',')})` : 'n/a'}`,
    );
    const rec = {
      currency: ccy,
      perUsd: latest.rate >= 100 ? Math.round(latest.rate * 10) / 10 : Math.round(latest.rate * 1000) / 1000,
      move7d: pctMove(p7?.rate, latest.rate, 25),
      move30d: pctMove(p30?.rate, latest.rate, 40),
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
  const titleLow = String(title || '').toLowerCase();
  const tagLow = tags.join(' ').toLowerCase();

  // Classify primarily by title, checking Geopolitics & Macro before Elections.
  const check = (s) => {
    if (/\b(war|ceasefire|strike|invad\w*|invasion|nuclear|nato|conflict|military|missile|strait|peace\s+deal|annex|sanctions?|blockade)\b/.test(s)) {
      return 'Geopolitics';
    }
    if (/\b(fed\b|fomc|rate\s+cut|rate\s+hike|interest\s+rate|ecb|boj|inflation|cpi|recession|gdp|economy|tariff|dut(?:y|ies)|trade|oil|default|currency)\b/.test(s)) {
      return 'Macro & Rates';
    }
    if (/\b(election|nominee|president|prime\s+minister|chancellor|mayor|parliament|senate|vote|out\s+of\s+power)\b/.test(s)) {
      return 'Elections';
    }
    return null;
  };

  return check(titleLow) ?? check(tagLow) ?? 'Policy';
}

const MONTH_RE = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i;
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Parse a deadline date from a "by date" market label/question, or null if not date-based. */
function parseDeadlineMs(label, question, nowMs) {
  const text = `${label} ${question}`;
  const m = MONTH_RE.exec(text);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    const day = Number(m[2]);
    let year = m[3] ? Number(m[3]) : new Date(nowMs).getUTCFullYear();
    let ms = Date.UTC(year, mon, day);
    // If no year was written and that month/day already passed this year, it refers to next year.
    if (!m[3] && ms < nowMs - 14 * 86_400_000) {
      ms = Date.UTC(year + 1, mon, day);
    }
    return ms;
  }
  const yOnly = /\bby\s+(?:end\s+of\s+)?(202\d)\b/i.exec(text) ?? /\b(202\d)\b/.exec(label);
  if (yOnly) return Date.UTC(Number(yOnly[1]), 11, 31);
  return null;
}

async function fetchMarkets(allMapNames) {
  const pages = await Promise.all([
    fetchJson('https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume24hr&ascending=false&limit=100&offset=0'),
    fetchJson('https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume24hr&ascending=false&limit=100&offset=100'),
  ]);
  const events = pages.flat().filter(Boolean);

  const nameMatchers = allMapNames
    .filter((n) => n.length >= 4 && !COUNTRY_HINTS[n] && n !== 'Guinea' && n !== 'Congo' && n !== 'Sudan')
    .map((n) => [n, new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')]);

  const nowMs = Date.now();
  const parsed = [];

  for (const e of events) {
    const title = String(e.title ?? '').trim();
    if (!title || DROP_TITLE_RE.test(title)) continue;

    const tags = (e.tags ?? []).map((t) => String(t.slug ?? '').toLowerCase());
    if (tags.some((t) => DROP_TAGS.has(t))) continue;
    const vol24 = Number(e.volume24hr ?? 0);
    if (vol24 < 5000) continue;

    const keep = tags.some((t) => KEEP_TAGS.has(t)) || /\b(fed|rate|tariff|recession|election|ceasefire|war|oil|gdp|inflation)\b/i.test(title);
    if (!keep) continue;

    const markets = (e.markets ?? []).filter((m) => m.active !== false && m.closed !== true);
    if (!markets.length) continue;

    const candidates = [];
    for (const m of markets) {
      const outcomes = parseJsonArr(m.outcomes);
      const prices = parseJsonArr(m.outcomePrices).map(Number);
      if (!outcomes.length || !prices.length) continue;
      const yesIdx = outcomes.findIndex((o) => String(o).toLowerCase() === 'yes');
      const idx = yesIdx >= 0 ? yesIdx : 0;
      const prob = Math.round((prices[idx] ?? 0) * 100);
      if (prob <= 1 || prob >= 99) continue;
      const chg = typeof m.oneDayPriceChange === 'number' ? Math.round(m.oneDayPriceChange * 1000) / 10 : null;
      const label = markets.length > 1 ? String(m.groupItemTitle || m.question || title) : title;
      const question = String(m.question ?? title);
      const deadlineMs = markets.length > 1 ? parseDeadlineMs(label, question, nowMs) : null;
      candidates.push({ label, question, prob, change24h: chg, vol: Number(m.volume24hr ?? vol24), deadlineMs });
    }
    if (!candidates.length) continue;

    // For cumulative "by date" markets (e.g. ceasefire by Dec 2026 / Mar 2027 / Dec 2027),
    // pick the nearest upcoming deadline rather than the furthest date (which trivially has highest prob).
    const dated = candidates.filter((c) => c.deadlineMs !== null && c.deadlineMs >= nowMs - 86_400_000);
    const isDateSeries = dated.length >= 2 && dated.length >= candidates.length * 0.6;

    let best;
    if (isDateSeries) {
      dated.sort((a, b) => a.deadlineMs - b.deadlineMs);
      best = dated.find((c) => c.prob >= 5 && c.prob <= 95) ?? dated[0];
    } else {
      candidates.sort((a, b) => b.prob - a.prob || b.vol - a.vol);
      best = candidates[0];
    }

    // Tag countries strictly from the event title (avoids noisy Polymarket tags and generic multi-country lists).
    const matched = new Set();
    for (const [country, regexes] of Object.entries(COUNTRY_HINTS)) {
      if (regexes.some((re) => re.test(title))) matched.add(country);
    }
    for (const [country, re] of nameMatchers) {
      if (re.test(title)) matched.add(country);
    }

    parsed.push({
      title,
      outcome: best.label !== title ? best.label : null,
      prob: best.prob,
      change24h: best.change24h,
      volume24h: Math.round(vol24),
      category: pickCategory(tags, title),
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
