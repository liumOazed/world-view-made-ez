/**
 * Domain-tuned economic & geopolitical sentiment and channel classifier.
 *
 * Designed for ATLAS: zero external API keys, deterministic, transparent,
 * and tuned specifically for macroeconomics, trade, finance, and geopolitics.
 */

export const CHANNELS = [
  'Trade & Tariffs',
  'Inflation & Rates',
  'Growth & Markets',
  'Energy & Supply',
  'Politics & Policy',
  'Security & Conflict',
];

const CHANNEL_RULES = [
  {
    channel: 'Trade & Tariffs',
    re: /\b(tariffs?|trade\s+war|exports?|imports?|customs|duties|sanctions?|embargo|wto|trade\s+deal|supply\s+chain|semiconductors?|chips?|shipping|port\s+strike|freight|chokepoint|strait)\b/i,
  },
  {
    channel: 'Inflation & Rates',
    re: /\b(inflation|cpi|interest\s+rates?|rate\s+cut|rate\s+hike|central\s+bank|fed\b|federal\s+reserve|ecb\b|boj\b|boe\b|rbi\b|pboc|imf|currency|devaluation|exchange\s+rate|yields?|bond\s+market|monetary\s+policy|deflation|cost\s+of\s+living)\b/i,
  },
  {
    channel: 'Energy & Supply',
    re: /\b(oil|crude|brent|opec|lng|natural\s+gas|pipeline|energy\s+crisis|power\s+grid|blackout|drought|harvest|grain|wheat|fertilizer|lithium|copper|mining|refinery|nuclear\s+power|solar|wind\s+farm|electricity)\b/i,
  },
  {
    channel: 'Security & Conflict',
    re: /\b(war|airstrikes?|missile|troops?|military|conflict|ceasefire|invasion|border\s+clash|terror|militia|rebels?|insurgent|coup|navy|warship|drone\s+strike|shelling|hostage|nato|defense\s+pact|nuclear\s+weapon)\b/i,
  },
  {
    channel: 'Growth & Markets',
    re: /\b(gdp|recession|economy|economic|growth|stocks?|equities|markets?|jobs?|unemployment|payroll|manufacturing|pmi|factory|fdi|investment|ipo|earnings|debt|default|credit\s+rating|downgrade|upgrade|stimulus|bailout|bankruptcy)\b/i,
  },
  {
    channel: 'Politics & Policy',
    re: /\b(election|parliament|president|prime\s+minister|cabinet|coalition|protest|demonstrat|referendum|legislation|budget|tax|fiscal|subsidy|diploma|summit|treaty|bilateral|opposition|minister|court|constitution)\b/i,
  },
];

// Weighted macro/geopolitical lexicon: -3 (severe adverse) to +3 (strong positive).
const LEXICON = new Map([
  // Severe adverse (-3)
  ['war', -3], ['invasion', -3], ['default', -3], ['collapse', -3], ['crisis', -3],
  ['recession', -3], ['famine', -3], ['coup', -3], ['airstrike', -3], ['airstrikes', -3],
  ['missile', -3], ['missiles', -3], ['attack', -3], ['attacks', -3], ['shelling', -3],
  ['sanctions', -3], ['embargo', -3], ['bankruptcy', -3], ['crash', -3], ['hyperinflation', -3],
  ['devaluation', -3], ['blackout', -3], ['blockade', -3], ['deadly', -3], ['killed', -3],
  // Moderate adverse (-2)
  ['tariff', -2], ['tariffs', -2], ['downgrade', -2], ['slump', -2], ['plunge', -2],
  ['plunges', -2], ['contraction', -2], ['shrinks', -2], ['shrinking', -2], ['deficit', -2],
  ['shortage', -2], ['shortages', -2], ['disruption', -2], ['disruptions', -2], ['strike', -2],
  ['strikes', -2], ['protest', -2], ['protests', -2], ['unrest', -2], ['clash', -2],
  ['clashes', -2], ['tensions', -2], ['escalation', -2], ['escalates', -2], ['conflict', -2],
  ['turmoil', -2], ['volatility', -2], ['selloff', -2], ['layoffs', -2], ['unemployment', -2],
  ['drought', -2], ['flood', -2], ['floods', -2], ['earthquake', -2], ['disaster', -2],
  ['debt', -2], ['stagflation', -2], ['warning', -2], ['warns', -2], ['threat', -2],
  ['threatens', -2], ['retaliation', -2], ['retaliates', -2], ['penalty', -2], ['fine', -2],
  // Mild adverse (-1)
  ['inflation', -1], ['slowdown', -1], ['slows', -1], ['stalls', -1], ['weak', -1],
  ['weaker', -1], ['weakens', -1], ['falls', -1], ['fell', -1], ['drop', -1],
  ['drops', -1], ['decline', -1], ['declines', -1], ['risk', -1], ['risks', -1],
  ['pressure', -1], ['strain', -1], ['concerns', -1], ['fears', -1], ['uncertainty', -1],
  ['delay', -1], ['delays', -1], ['dispute', -1], ['cuts', -1], ['slips', -1],
  ['struggles', -1], ['losses', -1], ['loss', -1], ['headwinds', -1], ['tightening', -1],
  // Mild positive (+1)
  ['growth', 1], ['grows', 1], ['rises', 1], ['rose', 1], ['gains', 1],
  ['gain', 1], ['rebound', 1], ['rebounds', 1], ['steady', 1], ['stable', 1],
  ['stability', 1], ['resilient', 1], ['resilience', 1], ['easing', 1], ['eases', 1],
  ['cools', 1], ['cooling', 1], ['talks', 1], ['dialogue', 1], ['cooperation', 1],
  ['investment', 1], ['invests', 1], ['expansion', 1], ['expands', 1], ['reform', 1],
  ['reforms', 1], ['stimulus', 1], ['support', 1], ['approves', 1], ['approved', 1],
  // Moderate positive (+2)
  ['recovery', 2], ['recovers', 2], ['rally', 2], ['rallies', 2], ['surplus', 2],
  ['boom', 2], ['booming', 2], ['upgrade', 2], ['upgrades', 2], ['deal', 2],
  ['agreement', 2], ['accord', 2], ['treaty', 2], ['pact', 2], ['partnership', 2],
  ['breakthrough', 2], ['soars', 2], ['surges', 2], ['outperforms', 2], ['beats', 2],
  ['boost', 2], ['boosts', 2], ['optimism', 2], ['confidence', 2], ['truce', 2],
  ['lifting', 2], ['record', 1], ['historic', 1],
  // Strong positive (+3)
  ['ceasefire', 3], ['peace', 3], ['prosperity', 3], ['resolved', 3],
]);

const NEGATORS = new Set(['not', 'no', 'never', 'without', 'averts', 'avoids', 'avoided', 'halts', 'halted', 'ends', 'ended', 'eases', 'lifts', 'lifted']);
const INTENSIFIERS = new Set(['sharp', 'sharply', 'severe', 'severely', 'major', 'deep', 'deeply', 'rapid', 'rapidly', 'massive', 'historic', 'heavy', 'worst', 'steep']);
const HIGH_IMPACT_RE = /\b(war|invasion|sanctions?|tariffs?|recession|default|crisis|central\s+bank|rate\s+cut|rate\s+hike|ceasefire|coup|oil\s+shock|emergency|bailout|downgrade|election)\b/i;

/**
 * Score a headline/summary string.
 * Returns { score: -100..100, channel, severity }.
 */
export function analyzeArticle(title, summary = '') {
  const text = `${title} ${summary}`.trim();
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(Boolean);

  let raw = 0;
  let hits = 0;

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    const base = LEXICON.get(w);
    if (base === undefined) continue;

    let weight = base;
    // Check 1–2 tokens back for negation or intensifier
    const prev1 = tokens[i - 1];
    const prev2 = tokens[i - 2];
    if (NEGATORS.has(prev1) || NEGATORS.has(prev2)) {
      weight = -weight * 0.7;
    } else if (INTENSIFIERS.has(prev1) || INTENSIFIERS.has(prev2)) {
      weight = weight * 1.35;
    }
    raw += weight;
    hits++;
  }

  // Smoothly normalize into [-100, 100] using tanh so single-word spikes stay calibrated
  const normalized = hits === 0 ? 0 : Math.round(Math.tanh(raw / 4.2) * 100);

  // Classify economic channel
  let channel = 'Politics & Policy';
  let bestScore = 0;
  for (const rule of CHANNEL_RULES) {
    const matches = text.match(new RegExp(rule.re.source, 'gi'));
    const count = matches ? matches.length : 0;
    if (count > bestScore) {
      bestScore = count;
      channel = rule.channel;
    }
  }

  // Severity based on intensity + high-impact trigger
  const abs = Math.abs(normalized);
  const highImpact = HIGH_IMPACT_RE.test(title);
  const severity = abs >= 50 || (highImpact && abs >= 25) ? 'High' : abs >= 20 || highImpact ? 'Medium' : 'Low';

  return { score: normalized, channel, severity };
}

/**
 * Produce a restrained, editorial 1-sentence brief for a country's live pulse.
 */
export function buildBrief(display, sentiment, volume, dominantChannel, topArticle) {
  const toneWord =
    sentiment <= -35
      ? 'sharply negative'
      : sentiment <= -12
        ? 'cautious to negative'
        : sentiment >= 35
          ? 'markedly positive'
          : sentiment >= 12
            ? 'constructively positive'
            : 'mixed';

  const lead = `Coverage is ${toneWord} across ${volume} recent ${volume === 1 ? 'report' : 'reports'}, led by ${dominantChannel.toLowerCase()}.`;
  if (!topArticle) return lead;
  const cleanTitle = topArticle.title.replace(/\s+[-–|]\s+[^-–|]{2,40}$/, '').trim();
  return `${lead} Top story: “${cleanTitle}”.`;
}
