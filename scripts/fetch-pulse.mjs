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
  { name: 'Google News · World', url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en' },
  { name: 'Google News · Business', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'France 24', url: 'https://www.france24.com/en/rss' },
  { name: 'DW World', url: 'https://rss.dw.com/xml/rss-en-world' },
  { name: 'DW Business', url: 'https://rss.dw.com/xml/rss-en-bus' },
];

// Core economies & geopolitical hubs that get a dedicated Google News query so
// every major country on the globe has fresh, relevant headlines.
const FOCUS_COUNTRIES = [
  ['United States of America', 'United States economy OR Federal Reserve OR tariffs'],
  ['China', 'China economy OR trade OR Beijing'],
  ['India', 'India economy OR RBI OR trade'],
  ['Japan', 'Japan economy OR Bank of Japan OR yen'],
  ['Germany', 'Germany economy OR inflation OR industry'],
  ['United Kingdom', 'UK economy OR Bank of England OR Britain'],
  ['France', 'France economy OR Paris budget OR trade'],
  ['Italy', 'Italy economy OR Rome'],
  ['Spain', 'Spain economy OR Madrid'],
  ['Netherlands', 'Netherlands economy OR Dutch trade'],
  ['Poland', 'Poland economy OR Warsaw'],
  ['Norway', 'Norway economy OR oil OR Oslo'],
  ['Ukraine', 'Ukraine war OR economy OR Kyiv'],
  ['Russia', 'Russia economy OR sanctions OR Moscow'],
  ['Turkey', 'Turkey economy OR lira OR Ankara'],
  ['Canada', 'Canada economy OR Bank of Canada OR trade'],
  ['Mexico', 'Mexico economy OR peso OR tariffs'],
  ['Brazil', 'Brazil economy OR central bank OR trade'],
  ['Argentina', 'Argentina economy OR peso OR Milei'],
  ['Chile', 'Chile economy OR copper OR central bank'],
  ['Colombia', 'Colombia economy OR Bogota'],
  ['Saudi Arabia', 'Saudi Arabia oil OR economy OR Riyadh'],
  ['United Arab Emirates', 'UAE economy OR Dubai OR Abu Dhabi'],
  ['Qatar', 'Qatar LNG OR economy OR Doha'],
  ['Iran', 'Iran sanctions OR oil OR Tehran'],
  ['Israel', 'Israel economy OR conflict OR Middle East'],
  ['Egypt', 'Egypt economy OR Suez Canal OR IMF'],
  ['Nigeria', 'Nigeria economy OR naira OR oil'],
  ['South Africa', 'South Africa economy OR rand OR power'],
  ['Kenya', 'Kenya economy OR Nairobi'],
  ['Ethiopia', 'Ethiopia economy OR Addis Ababa'],
  ['Ghana', 'Ghana economy OR debt'],
  ['Bangladesh', 'Bangladesh economy OR Dhaka OR exports'],
  ['Pakistan', 'Pakistan economy OR IMF OR Islamabad'],
  ['Sri Lanka', 'Sri Lanka economy OR Colombo'],
  ['Vietnam', 'Vietnam economy OR exports OR manufacturing'],
  ['Thailand', 'Thailand economy OR Bangkok'],
  ['Malaysia', 'Malaysia economy OR semiconductors OR ringgit'],
  ['Singapore', 'Singapore economy OR trade OR shipping'],
  ['Indonesia', 'Indonesia economy OR Jakarta OR nickel'],
  ['Philippines', 'Philippines economy OR Manila'],
  ['South Korea', 'South Korea economy OR chips OR Seoul'],
  ['Taiwan', 'Taiwan semiconductors OR TSMC OR Strait'],
  ['Kazakhstan', 'Kazakhstan economy OR oil'],
  ['Australia', 'Australia economy OR RBA OR iron ore'],
];

// Additional aliases for matching headlines from global wires to ATLAS map names.
const EXTRA_ALIASES = {
  'United States of America': ['United States', 'U.S.', 'US ', 'America', 'American', 'Washington', 'Fed ', 'Federal Reserve', 'White House'],
  'United Kingdom': ['United Kingdom', 'Britain', 'British', 'UK ', 'U.K.', 'London', 'Bank of England'],
  'South Korea': ['South Korea', 'South Korean', 'Seoul'],
  'North Korea': ['North Korea', 'North Korean', 'Pyongyang'],
  'United Arab Emirates': ['UAE', 'United Arab Emirates', 'Dubai', 'Abu Dhabi'],
  'Saudi Arabia': ['Saudi Arabia', 'Saudi', 'Riyadh'],
  'South Africa': ['South Africa', 'South African', 'Johannesburg'],
  Turkey: ['Turkey', 'Türkiye', 'Turkish', 'Ankara'],
  Russia: ['Russia', 'Russian', 'Moscow', 'Kremlin'],
  China: ['China', 'Chinese', 'Beijing', 'Shanghai'],
  Ukraine: ['Ukraine', 'Ukrainian', 'Kyiv', 'Kiev'],
  Israel: ['Israel', 'Israeli', 'Tel Aviv', 'Gaza'],
  Palestine: ['Palestine', 'Palestinian', 'Gaza', 'West Bank'],
  Iran: ['Iran', 'Iranian', 'Tehran'],
  India: ['India', 'Indian', 'New Delhi', 'Mumbai'],
  Japan: ['Japan', 'Japanese', 'Tokyo', 'Bank of Japan'],
  Germany: ['Germany', 'German', 'Berlin'],
  France: ['France', 'French', 'Paris'],
  Italy: ['Italy', 'Italian', 'Rome'],
  Spain: ['Spain', 'Spanish', 'Madrid'],
  Canada: ['Canada', 'Canadian', 'Ottawa'],
  Mexico: ['Mexico', 'Mexican'],
  Brazil: ['Brazil', 'Brazilian', 'Brasilia'],
  Argentina: ['Argentina', 'Argentine', 'Buenos Aires'],
  Taiwan: ['Taiwan', 'Taiwanese', 'Taipei', 'TSMC'],
  Australia: ['Australia', 'Australian', 'Canberra'],
  Indonesia: ['Indonesia', 'Indonesian', 'Jakarta'],
  Vietnam: ['Vietnam', 'Vietnamese', 'Hanoi'],
  Bangladesh: ['Bangladesh', 'Bangladeshi', 'Dhaka'],
  Pakistan: ['Pakistan', 'Pakistani', 'Islamabad'],
  Egypt: ['Egypt', 'Egyptian', 'Cairo', 'Suez'],
  Nigeria: ['Nigeria', 'Nigerian', 'Lagos'],
  Poland: ['Poland', 'Polish', 'Warsaw'],
  Netherlands: ['Netherlands', 'Dutch', 'Amsterdam'],
  Switzerland: ['Switzerland', 'Swiss', 'Zurich'],
  Sweden: ['Sweden', 'Swedish', 'Stockholm'],
  Norway: ['Norway', 'Norwegian', 'Oslo'],
  Greece: ['Greece', 'Greek', 'Athens'],
  Venezuela: ['Venezuela', 'Venezuelan', 'Caracas'],
  Sudan: ['Sudan', 'Sudanese', 'Khartoum'],
  Yemen: ['Yemen', 'Yemeni', 'Houthi', 'Red Sea'],
  Syria: ['Syria', 'Syrian', 'Damascus'],
  Lebanon: ['Lebanon', 'Lebanese', 'Beirut'],
  Iraq: ['Iraq', 'Iraqi', 'Baghdad'],
  Myanmar: ['Myanmar', 'Burma'],
  'Dem. Rep. Congo': ['DR Congo', 'Democratic Republic of Congo', 'Congo', 'Kinshasa'],
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

function parseRss(xml, fallbackSource) {
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
    const description = tag('description').slice(0, 260);
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

function buildMatchers(allMapNames) {
  const matchers = [];
  for (const name of allMapNames) {
    const aliases = new Set([name, ...(EXTRA_ALIASES[name] ?? [])]);
    const patterns = [...aliases]
      .filter((a) => a.length >= 3)
      .map((a) => {
        const escaped = a.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, a.length <= 3 && a === a.toUpperCase() ? '' : 'i');
      });
    if (patterns.length) matchers.push({ name, patterns });
  }
  return matchers;
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
    return parseRss(xml, f.name);
  });

  const countryResults = await mapLimit(FOCUS_COUNTRIES, CONCURRENCY, async ([country, query]) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const xml = await fetchXml(url);
    const items = parseRss(xml, 'Google News').slice(0, 10);
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
      for (const m of matchers) {
        if (m.patterns.some((re) => re.test(item.title))) {
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

  // 2. Targeted country feeds
  for (const { country, items } of countryResults) {
    for (const item of items) {
      if (new Date(item.publishedAt).getTime() < cutoff) continue;
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
    // Sort by recency first, then severity
    arts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const avgSentiment = Math.round(arts.reduce((s, a) => s + a.sentiment, 0) / arts.length);

    /** @type {Record<string, { count: number; sum: number }>} */
    const chanAcc = {};
    for (const a of arts) {
      chanAcc[a.channel] ??= { count: 0, sum: 0 };
      chanAcc[a.channel].count += 1;
      chanAcc[a.channel].sum += a.sentiment;
    }
    const channels = {};
    let dominantChannel = 'Politics & Policy';
    let maxChan = 0;
    for (const [ch, v] of Object.entries(chanAcc)) {
      channels[ch] = { count: v.count, sentiment: Math.round(v.sum / v.count) };
      if (v.count > maxChan) {
        maxChan = v.count;
        dominantChannel = ch;
      }
    }

    const highCount = arts.filter((a) => a.severity === 'High').length;
    const severity = highCount >= 2 || Math.abs(avgSentiment) >= 40 ? 'High' : highCount >= 1 || Math.abs(avgSentiment) >= 18 ? 'Medium' : 'Low';
    const topArticles = arts.slice(0, 6);
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
