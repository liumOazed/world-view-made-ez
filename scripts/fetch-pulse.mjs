/**
 * Fetches recent global and country-level news from open RSS wires,
 * classifies economic channels, scores sentiment, and writes src/data/pulse.json.
 *
 * Run: node scripts/fetch-pulse.mjs
 */
import { writeFileSync } from 'node:fs';
import { mapCountries } from './lib/map-countries.mjs';
import { analyzeArticle, buildBrief } from './lib/sentiment.mjs';

const OUT = new URL('../src/data/pulse.json', import.meta.url);
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 8;

const GLOBAL_FEEDS = [
  { name: 'Google News · World', url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en', google: true },
  { name: 'Google News · Business', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en', google: true },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'France 24', url: 'https://www.france24.com/en/rss' },
  { name: 'DW World', url: 'https://rss.dw.com/xml/rss-en-world' },
  { name: 'DW Business', url: 'https://rss.dw.com/xml/rss-en-bus' },
];

// Core economies & geopolitical hubs with tightly scoped Google News queries
// (parenthesized OR clauses so the country term is always required).
const FOCUS_COUNTRIES = [
  ['United States of America', '"United States" (economy OR "Federal Reserve" OR tariffs OR inflation)'],
  ['China', 'China (economy OR trade OR tariffs OR Beijing)'],
  ['India', 'India (economy OR RBI OR trade OR inflation)'],
  ['Japan', 'Japan (economy OR "Bank of Japan" OR yen OR trade)'],
  ['Germany', 'Germany (economy OR inflation OR industry OR Berlin)'],
  ['United Kingdom', '(UK OR Britain) (economy OR "Bank of England" OR inflation)'],
  ['France', 'France (economy OR budget OR trade OR inflation)'],
  ['Italy', 'Italy (economy OR budget OR Rome OR trade)'],
  ['Spain', 'Spain (economy OR Madrid OR inflation OR trade)'],
  ['Netherlands', 'Netherlands (economy OR Dutch OR trade OR ASML)'],
  ['Poland', 'Poland (economy OR Warsaw OR zloty OR trade)'],
  ['Norway', 'Norway (economy OR oil OR krone OR Oslo)'],
  ['Ukraine', 'Ukraine (war OR economy OR Kyiv OR ceasefire)'],
  ['Russia', 'Russia (economy OR sanctions OR Moscow OR ruble)'],
  ['Turkey', '(Turkey OR Türkiye) (economy OR lira OR inflation OR Ankara)'],
  ['Canada', 'Canada (economy OR "Bank of Canada" OR trade OR tariffs)'],
  ['Mexico', 'Mexico -"New Mexico" (economy OR peso OR tariffs OR trade OR Banxico)'],
  ['Brazil', 'Brazil (economy OR "central bank" OR real OR trade)'],
  ['Argentina', 'Argentina (economy OR peso OR inflation OR Milei)'],
  ['Chile', 'Chile (economy OR copper OR peso OR "central bank")'],
  ['Colombia', 'Colombia (economy OR peso OR Bogota OR inflation)'],
  ['Saudi Arabia', '"Saudi Arabia" (oil OR economy OR OPEC OR Riyadh)'],
  ['United Arab Emirates', '(UAE OR "United Arab Emirates") (economy OR Dubai OR "Abu Dhabi")'],
  ['Qatar', 'Qatar (LNG OR gas OR economy OR Doha)'],
  ['Iran', 'Iran (sanctions OR oil OR economy OR Tehran)'],
  ['Israel', 'Israel (economy OR conflict OR ceasefire OR shekel)'],
  ['Egypt', 'Egypt (economy OR "Suez Canal" OR IMF OR pound)'],
  ['Nigeria', 'Nigeria (economy OR naira OR oil OR inflation)'],
  ['South Africa', '"South Africa" (economy OR rand OR power OR Eskom)'],
  ['Kenya', 'Kenya (economy OR shilling OR Nairobi OR debt)'],
  ['Ethiopia', 'Ethiopia (economy OR IMF OR "Addis Ababa" OR birr)'],
  ['Ghana', 'Ghana (economy OR debt OR cedi OR IMF)'],
  ['Bangladesh', 'Bangladesh (economy OR Dhaka OR exports OR IMF)'],
  ['Pakistan', 'Pakistan (economy OR IMF OR Islamabad OR rupee)'],
  ['Sri Lanka', '"Sri Lanka" (economy OR Colombo OR IMF OR debt)'],
  ['Vietnam', 'Vietnam (economy OR exports OR manufacturing OR trade)'],
  ['Thailand', 'Thailand (economy OR Bangkok OR baht OR exports)'],
  ['Malaysia', 'Malaysia (economy OR semiconductors OR ringgit OR trade)'],
  ['Singapore', 'Singapore (economy OR trade OR shipping OR MAS)'],
  ['Indonesia', 'Indonesia (economy OR Jakarta OR rupiah OR nickel)'],
  ['Philippines', 'Philippines (economy OR Manila OR peso OR inflation)'],
  ['South Korea', '"South Korea" (economy OR chips OR won OR Seoul)'],
  ['Taiwan', 'Taiwan (semiconductors OR TSMC OR economy OR Strait)'],
  ['Kazakhstan', 'Kazakhstan (economy OR oil OR tenge OR Astana)'],
  ['Australia', 'Australia (economy OR RBA OR "iron ore" OR inflation)'],
];

// Additional aliases for matching headlines from global wires to ATLAS map names.
// Entries prefixed with "=" are matched case-sensitively.
const EXTRA_ALIASES = {
  'United States of America': ['United States', '=U.S.', '=US', 'White House', 'Federal Reserve', '=FOMC'],
  'United Kingdom': ['United Kingdom', 'Britain', 'British', '=U.K.', '=UK', 'Bank of England', 'Downing Street'],
  'South Korea': ['South Korea', 'South Korean', 'Seoul'],
  'North Korea': ['North Korea', 'North Korean', 'Pyongyang'],
  'United Arab Emirates': ['=UAE', 'United Arab Emirates', 'Dubai', 'Abu Dhabi'],
  'Saudi Arabia': ['Saudi Arabia', 'Saudi', 'Riyadh'],
  'South Africa': ['South Africa', 'South African', 'Johannesburg'],
  Turkey: ['Turkey', 'Türkiye', 'Turkish', 'Ankara'],
  Russia: ['Russia', 'Russian', 'Moscow', 'Kremlin'],
  China: ['China', 'Chinese', 'Beijing', 'Shanghai'],
  Ukraine: ['Ukraine', 'Ukrainian', 'Kyiv', 'Kiev'],
  Israel: ['Israel', 'Israeli', 'Tel Aviv'],
  Palestine: ['Palestine', 'Palestinian', 'Gaza', 'West Bank'],
  Iran: ['Iran', 'Iranian', 'Tehran'],
  India: ['India', 'Indian', 'New Delhi', 'Mumbai'],
  Japan: ['Japan', 'Japanese', 'Tokyo', 'Bank of Japan'],
  Germany: ['Germany', 'German', 'Berlin'],
  France: ['France', 'French', 'Paris'],
  Italy: ['Italy', 'Italian', 'Rome'],
  Spain: ['Spain', 'Spanish', 'Madrid'],
  Canada: ['Canada', 'Canadian', 'Ottawa'],
  Mexico: ['Mexico', 'Mexican', 'Banxico'],
  Brazil: ['Brazil', 'Brazilian', 'Brasilia'],
  Argentina: ['Argentina', 'Argentine', 'Buenos Aires'],
  Taiwan: ['Taiwan', 'Taiwanese', 'Taipei', '=TSMC'],
  Australia: ['Australia', 'Australian', 'Canberra'],
  Indonesia: ['Indonesia', 'Indonesian', 'Jakarta'],
  Vietnam: ['Vietnam', 'Vietnamese', 'Hanoi'],
  Bangladesh: ['Bangladesh', 'Bangladeshi', 'Dhaka'],
  Pakistan: ['Pakistan', 'Pakistani', 'Islamabad'],
  Egypt: ['Egypt', 'Egyptian', 'Cairo', 'Suez Canal'],
  Nigeria: ['Nigeria', 'Nigerian', 'Lagos', 'Abuja'],
  Poland: ['Poland', 'Polish', 'Warsaw'],
  Netherlands: ['Netherlands', 'Dutch', 'Amsterdam'],
  Switzerland: ['Switzerland', 'Swiss', 'Zurich'],
  Sweden: ['Sweden', 'Swedish', 'Stockholm'],
  Norway: ['Norway', 'Norwegian', 'Oslo'],
  Greece: ['Greece', 'Greek', 'Athens'],
  Venezuela: ['Venezuela', 'Venezuelan', 'Caracas'],
  Sudan: ['Sudan', 'Sudanese', 'Khartoum'],
  'South Sudan': ['South Sudan', 'South Sudanese', 'Juba'],
  Yemen: ['Yemen', 'Yemeni', 'Houthi'],
  Syria: ['Syria', 'Syrian', 'Damascus'],
  Lebanon: ['Lebanon', 'Lebanese', 'Beirut'],
  Iraq: ['Iraq', 'Iraqi', 'Baghdad'],
  Myanmar: ['Myanmar', 'Burma'],
  'Dem. Rep. Congo': ['DR Congo', 'D.R. Congo', 'Democratic Republic of Congo', 'Democratic Republic of the Congo', 'Kinshasa'],
  Congo: ['Republic of Congo', 'Republic of the Congo', 'Congo-Brazzaville', 'Brazzaville'],
};

// Map names whose bare name is too ambiguous on its own; use EXTRA_ALIASES exclusively.
const OVERRIDE_BASE_NAME = new Set(['Congo', 'Dem. Rep. Congo', 'United States of America']);

// Compound/false-positive phrases stripped before testing a specific country.
const STRIP_BEFORE_MATCH = {
  Guinea: /\b(Guinea-Bissau|Equatorial\s+Guinea|Papua\s+New\s+Guinea|guinea\s+pigs?)\b/gi,
  Mexico: /\b(New\s+Mexico|Gulf\s+of\s+Mexico)\b/gi,
  Sudan: /\bSouth\s+Sudan\w*/gi,
  'United States of America': /\b(Latin|South|Central|North)\s+America\w*/gi,
  India: /\b(Indiana|Indian\s+Ocean|West\s+Indies|American\s+Indian)\b/gi,
  Georgia: /\b(Atlanta|Georgia\s+Tech|State\s+of\s+Georgia|University\s+of\s+Georgia)\b/gi,
  Jordan: /\b(Michael\s+Jordan|Air\s+Jordan|Jordan\s+Peterson|Jim\s+Jordan)\b/gi,
  Niger: /\bNigeria\w*/gi,
  Dominica: /\bDominican\s+Republic\b/gi,
  Ireland: /\bNorthern\s+Ireland\b/gi,
  'Dem. Rep. Congo': /\b(Republic\s+of\s+(?:the\s+)?Congo|Congo-Brazzaville|Brazzaville)\b/gi,
  Congo: /\b(DR\s+Congo|D\.R\.\s+Congo|Democratic\s+Republic\s+of\s+(?:the\s+)?Congo|Kinshasa)\b/gi,
};

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRss(xml, fallbackSource, isGoogle = false) {
  const items = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const tag = (name) => {
      const r = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i').exec(block);
      return r ? decodeEntities(r[1]) : '';
    };
    const rawTitle = tag('title');
    if (!rawTitle) continue;
    const url = tag('link');
    if (/\/sport(s)?\//i.test(url)) continue;
    let title = rawTitle;
    const rawSource = tag('source');
    let source = rawSource && !rawSource.startsWith('©') ? rawSource : fallbackSource;
    // Google News appends " - Publisher" to titles
    const dashIdx = rawTitle.lastIndexOf(' - ');
    if (dashIdx > 20 && rawTitle.length - dashIdx < 45) {
      if (!rawSource || rawSource.startsWith('©')) source = rawTitle.slice(dashIdx + 3).trim();
      title = rawTitle.slice(0, dashIdx).trim();
    }
    const pubRaw = tag('pubDate');
    const pubDate = pubRaw ? new Date(pubRaw) : null;
    const publishedAt = pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate.toISOString() : new Date().toISOString();
    // Google News RSS descriptions just echo the title and links; drop them to avoid double-scoring.
    const description = isGoogle ? '' : tag('description').slice(0, 260);
    items.push({ title, source, url, publishedAt, description });
  }
  return items;
}

async function fetchXml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ATLAS-WorldView/1.0 (+https://github.com/liumOazed/world-view-made-ez)' },
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (i < list.length) {
        const idx = i++;
        out[idx] = await fn(list[idx], idx);
      }
    }),
  );
  return out;
}

function compilePattern(alias) {
  const caseSensitive = alias.startsWith('=') || (alias.length <= 4 && alias === alias.toUpperCase());
  const clean = alias.startsWith('=') ? alias.slice(1) : alias;
  const escaped = clean.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Avoid matching trailing periods inside \b when alias ends with "." (e.g. U.S.)
  const suffix = /\.$/.test(clean) ? '(?!\\w)' : '\\b';
  return new RegExp(`\\b${escaped}${suffix}`, caseSensitive ? '' : 'i');
}

function buildMatchers(allMapNames) {
  const matchers = new Map();
  for (const name of allMapNames) {
    const base = OVERRIDE_BASE_NAME.has(name) ? [] : [name];
    const aliases = new Set([...base, ...(EXTRA_ALIASES[name] ?? [])]);
    // Short ambiguous country names like "Chad" or "Mali" require exact capitalization
    const patterns = [...aliases]
      .filter((a) => a.replace(/^=/, '').length >= 2)
      .map((a) => compilePattern(name === 'Chad' || name === 'Mali' ? `=${a.replace(/^=/, '')}` : a));
    if (patterns.length) {
      matchers.set(name, {
        name,
        strip: STRIP_BEFORE_MATCH[name] ?? null,
        patterns,
      });
    }
  }
  return matchers;
}

function matchesCountry(matcher, text) {
  const cleaned = matcher.strip ? text.replace(matcher.strip, ' ') : text;
  return matcher.patterns.some((re) => re.test(cleaned));
}

function normKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 72);
}

async function main() {
  const allMapNames = [...mapCountries().keys()];
  const matchers = buildMatchers(allMapNames);
  const cutoff = Date.now() - 10 * 24 * 3600 * 1000; // last 10 days

  console.log(`Fetching ${GLOBAL_FEEDS.length} global feeds + ${FOCUS_COUNTRIES.length} country feeds...`);

  const globalResults = await mapLimit(GLOBAL_FEEDS, CONCURRENCY, async (f) => {
    const xml = await fetchXml(f.url);
    return parseRss(xml, f.name, Boolean(f.google));
  });

  const countryResults = await mapLimit(FOCUS_COUNTRIES, CONCURRENCY, async ([country, query]) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const xml = await fetchXml(url);
    const items = parseRss(xml, 'Google News', true).slice(0, 12);
    return { country, items };
  });

  /** @type {Map<string, any[]>} */
  const byCountry = new Map();
  const addFor = (country, art) => {
    let list = byCountry.get(country);
    if (!list) {
      list = [];
      byCountry.set(country, list);
    }
    if (list.some((x) => normKey(x.title) === normKey(art.title))) return;
    list.push(art);
  };

  const globalPool = [];
  const seenGlobal = new Set();

  // 1. Global feeds: tag every mentioned country + populate global pool
  for (const feedItems of globalResults) {
    for (const item of feedItems) {
      if (new Date(item.publishedAt).getTime() < cutoff) continue;
      const analysis = analyzeArticle(item.title, item.description);
      const enriched = {
        title: item.title,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        sentiment: analysis.score,
        channel: analysis.channel,
        severity: analysis.severity,
      };

      const matched = [];
      for (const m of matchers.values()) {
        if (matchesCountry(m, item.title)) {
          matched.push(m.name);
          addFor(m.name, enriched);
        }
      }

      const key = normKey(item.title);
      if (!seenGlobal.has(key)) {
        seenGlobal.add(key);
        globalPool.push({ ...enriched, countries: matched.slice(0, 3) });
      }
    }
  }

  // 2. Targeted country feeds (verified against country matcher so off-topic hits are excluded)
  for (const { country, items } of countryResults) {
    const m = matchers.get(country);
    for (const item of items) {
      if (new Date(item.publishedAt).getTime() < cutoff) continue;
      if (m && !matchesCountry(m, item.title)) continue;
      const analysis = analyzeArticle(item.title, item.description);
      addFor(country, {
        title: item.title,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        sentiment: analysis.score,
        channel: analysis.channel,
        severity: analysis.severity,
      });
    }
  }

  // 3. Aggregate per country
  const countries = {};
  for (const [country, arts] of byCountry.entries()) {
    if (arts.length === 0) continue;
    arts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const topArticles = arts.slice(0, 8);
    const avgSentiment = Math.round(topArticles.reduce((s, a) => s + a.sentiment, 0) / topArticles.length);

    // Compute channel chips strictly from topArticles so no filter chip can ever yield an empty list.
    /** @type {Record<string, { count: number; sum: number }>} */
    const chanAcc = {};
    for (const a of topArticles) {
      chanAcc[a.channel] ??= { count: 0, sum: 0 };
      chanAcc[a.channel].count += 1;
      chanAcc[a.channel].sum += a.sentiment;
    }
    const channels = {};
    let dominantChannel = topArticles[0].channel;
    let maxChan = 0;
    for (const [ch, v] of Object.entries(chanAcc)) {
      channels[ch] = { count: v.count, sentiment: Math.round(v.sum / v.count) };
      if (v.count > maxChan) {
        maxChan = v.count;
        dominantChannel = ch;
      }
    }

    const highCount = topArticles.filter((a) => a.severity === 'High').length;
    const severity = highCount >= 2 || Math.abs(avgSentiment) >= 35 ? 'High' : highCount >= 1 || Math.abs(avgSentiment) >= 16 ? 'Medium' : 'Low';
    const brief = buildBrief(country, avgSentiment, arts.length, dominantChannel, topArticles[0]);

    countries[country] = {
      sentiment: avgSentiment,
      volume: arts.length,
      severity,
      dominantChannel,
      channels,
      brief,
      articles: topArticles,
    };
  }

  // Global top stories: prioritize high-impact + recent + country-tagged
  globalPool.sort((a, b) => {
    const score = (x) => (x.severity === 'High' ? 30 : x.severity === 'Medium' ? 15 : 0) + Math.min(20, Math.abs(x.sentiment) * 0.3) + (x.countries.length ? 10 : 0);
    return score(b) - score(a) || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Top movers: highest attention & sentiment magnitude
  const movers = Object.entries(countries)
    .map(([name, c]) => ({
      name,
      sentiment: c.sentiment,
      volume: c.volume,
      dominantChannel: c.dominantChannel,
      severity: c.severity,
      score: c.volume * (1 + Math.abs(c.sentiment) / 40),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ score: _s, ...rest }) => rest);

  const snapshot = {
    source: 'Open global wires (Google News, BBC, Al Jazeera, France 24, DW) · ATLAS sentiment engine',
    retrieved: new Date().toISOString(),
    countryCount: Object.keys(countries).length,
    articleCount: Object.values(countries).reduce((s, c) => s + c.volume, 0),
    global: globalPool.slice(0, 10),
    movers,
    countries,
  };

  writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${snapshot.countryCount} countries (${snapshot.articleCount} matched reports) to src/data/pulse.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
