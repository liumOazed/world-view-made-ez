/**
 * Domain-tuned economic & geopolitical sentiment and channel classifier.
 *
 * Designed for ATLAS: zero external API keys, deterministic, transparent,
 * and calibrated specifically for macroeconomics, trade, finance, and geopolitics.
 */

export const CHANNELS = [
  'Trade & Tariffs',
  'Inflation & Rates',
  'Growth & Markets',
  'Energy & Supply',
  'Politics & Policy',
  'Security & Conflict',
  'World & Society',
];

const CHANNEL_RULES = [
  {
    channel: 'Trade & Tariffs',
    re: /\b(tariffs?|trade\s+war|trade\s+deal|trade\s+pact|trade\s+deficit|trade\s+surplus|exports?|exporting|imports?|importing|customs|duties|sanctions?|sanctioned|embargo|wto|supply\s+chains?|semiconductors?|chips?|shipping|port\s+strike|freight|chokepoint|strait|mercosur|usmca|free\s+trade)\b/i,
  },
  {
    channel: 'Inflation & Rates',
    re: /\b(inflation\w*|deflation\w*|stagflation|cpi\b|pce\b|interest\s+rates?|rate\s+cut|rate\s+hike|central\s+banks?|federal\s+reserve|fomc|fed\b|ecb\b|boj\b|boe\b|rbi\b|pboc|rba\b|imf\b|currenc\w*|devalu\w*|exchange\s+rates?|forex|lira|yen|yuan|renminbi|peso|rupee|naira|rand|ringgit|euro|pound|dollar|yields?|treasur\w*|bond\s+market|monetary\s+policy|cost\s+of\s+living|living\s+costs?|wages?|minimum\s+wage)\b/i,
  },
  {
    channel: 'Energy & Supply',
    re: /\b(oil|crude|brent|opec\+?|lng\b|natural\s+gas|pipelines?|energy\s+crisis|energy\s+transition|power\s+grid|blackouts?|droughts?|harvests?|grains?|wheat|rice|corn|fertilizer|lithium|copper|iron\s+ore|nickel|cobalt|rare\s+earths?|mining|mines?|refiner\w*|nuclear\s+power|solar|wind\s+farm|electricity|fuel|petrol|diesel|coal|floods?|flooding|wildfires?|earthquakes?|cyclones?|typhoons?|hurricanes?|storms?|agricultur\w*)\b/i,
  },
  {
    channel: 'Security & Conflict',
    re: /\b(wars?|wartime|airstrikes?|missiles?|troops?|soldiers?|militar\w*|conflicts?|ceasefires?|invasions?|invad\w*|border\s+clash\w*|terror\w*|militias?|rebels?|insurgents?|coups?|navy|warships?|drones?|drone\s+strikes?|shelling|hostages?|nato\b|defense\s+pact|defence\s+pact|nuclear\s+weapon\w*|sabotage|cyberattack\w*|espionage|bombings?|killings?|killed|kills|casualties|air\s+defense|strikes?\s+on)\b/i,
  },
  {
    channel: 'Growth & Markets',
    re: /\b(gdp\b|recessions?|econom\w*|growth|stocks?|stock\s+market|equities|markets?|shares?|msci|ftse|nikkei|sensex|s&p|nasdaq|jobs?|unemployment|payroll\w*|hiring|layoffs?|manufactur\w*|pmi\b|factor\w*|fdi\b|invest\w*|ipos?|earnings|profits?|revenue|debts?|defaults?|credit\s+rating|downgrad\w*|upgrad\w*|stimulus|bailouts?|bankrupt\w*|airlines?|automakers?|banks?|banking|fintech|startups?|tech\s+giants?|housing|real\s+estate|retail|consumers?|spending|productivity)\b/i,
  },
  {
    channel: 'Politics & Policy',
    re: /\b(elect\w*|parliaments?|presidents?|prime\s+ministers?|cabinets?|coalitions?|protest\w*|demonstrat\w*|referendums?|legislat\w*|lawmakers?|budgets?|tax\w*|fiscal|subsid\w*|diploma\w*|envoys?|ambassadors?|summits?|treat\w*|bilateral|opposition|ministers?|courts?|judges?|constitut\w*|governments?|governors?|mayors?|senates?|congress|sanction\s+bill|policy|policies|regulati\w*|immigration|asylum|border\s+policy|corruption|scandal)\b/i,
  },
];

// Weighted macro/geopolitical lexicon: -3 (severe adverse) to +3 (strong positive).
const LEXICON = new Map([
  // Severe adverse (-3)
  ['war', -3], ['invasion', -3], ['invades', -3], ['default', -3], ['defaults', -3],
  ['collapse', -3], ['collapses', -3], ['collapsed', -3], ['crisis', -3], ['crises', -3],
  ['recession', -3], ['famine', -3], ['coup', -3], ['airstrike', -3], ['airstrikes', -3],
  ['missile', -3], ['missiles', -3], ['attack', -3], ['attacks', -3], ['attacked', -3],
  ['shelling', -3], ['bombing', -3], ['bombings', -3], ['sanctions', -3], ['sanctioned', -3],
  ['embargo', -3], ['bankruptcy', -3], ['bankrupt', -3], ['crash', -3], ['crashes', -3],
  ['hyperinflation', -3], ['devaluation', -3], ['blackout', -3], ['blackouts', -3],
  ['blockade', -3], ['deadly', -3], ['killed', -3], ['kills', -3], ['killing', -3],
  ['deaths', -3], ['massacre', -3], ['sabotage', -3], ['hostage', -3], ['hostages', -3],
  // Moderate adverse (-2)
  ['tariff', -2], ['tariffs', -2], ['downgrade', -2], ['downgrades', -2], ['downgraded', -2],
  ['slump', -2], ['slumps', -2], ['slumped', -2], ['slumping', -2], ['plunge', -2],
  ['plunges', -2], ['plunged', -2], ['plunging', -2], ['tumble', -2], ['tumbles', -2],
  ['tumbled', -2], ['sliding', -2], ['slides', -2], ['slid', -2], ['sinks', -2],
  ['sank', -2], ['contraction', -2], ['contracts', -2], ['shrinks', -2], ['shrinking', -2],
  ['deficit', -2], ['deficits', -2], ['shortage', -2], ['shortages', -2], ['shortfall', -2],
  ['disruption', -2], ['disruptions', -2], ['strike', -2], ['strikes', -2], ['protest', -2],
  ['protests', -2], ['protesters', -2], ['unrest', -2], ['clash', -2], ['clashes', -2],
  ['tensions', -2], ['tension', -2], ['escalation', -2], ['escalates', -2], ['escalating', -2],
  ['conflict', -2], ['conflicts', -2], ['turmoil', -2], ['chaos', -2], ['volatility', -2],
  ['volatile', -2], ['selloff', -2], ['layoffs', -2], ['layoff', -2], ['unemployment', -2],
  ['drought', -2], ['droughts', -2], ['flood', -2], ['floods', -2], ['flooding', -2],
  ['flooded', -2], ['earthquake', -2], ['disaster', -2], ['disasters', -2], ['wildfire', -2],
  ['wildfires', -2], ['stagflation', -2], ['stagnation', -2], ['warning', -2], ['warns', -2],
  ['warned', -2], ['threat', -2], ['threats', -2], ['threatens', -2], ['retaliation', -2],
  ['retaliates', -2], ['penalty', -2], ['violence', -2], ['violent', -2], ['fraud', -2],
  ['corruption', -2], ['scandal', -2], ['ban', -2], ['bans', -2], ['banned', -2],
  ['detained', -2], ['arrested', -2], ['jailed', -2], ['seized', -2], ['block', -2],
  ['blocks', -2], ['blocked', -2], ['stumbles', -2], ['falters', -2], ['worsens', -2],
  ['worsening', -2], ['damaged', -2], ['casualties', -2], ['wounded', -2], ['injured', -2],
  ['victims', -2], ['losing', -2],
  // Mild adverse (-1)
  ['inflation', -1], ['slowdown', -1], ['slows', -1], ['slowing', -1], ['sluggish', -1],
  ['stagnant', -1], ['stalls', -1], ['stalled', -1], ['weak', -1], ['weaker', -1],
  ['weakens', -1], ['weakening', -1], ['weakness', -1], ['falls', -1], ['falling', -1],
  ['fell', -1], ['drop', -1], ['drops', -1], ['dropped', -1], ['dropping', -1],
  ['decline', -1], ['declines', -1], ['declining', -1], ['risk', -1], ['risks', -1],
  ['risky', -1], ['pressure', -1], ['pressures', -1], ['strain', -1], ['strained', -1],
  ['concerns', -1], ['concern', -1], ['fears', -1], ['fear', -1], ['worries', -1],
  ['worry', -1], ['uncertainty', -1], ['uncertain', -1], ['cautious', -1], ['delay', -1],
  ['delays', -1], ['delayed', -1], ['dispute', -1], ['disputes', -1], ['row', -1],
  ['complaint', -1], ['difficult', -1], ['slips', -1], ['slipped', -1], ['struggles', -1],
  ['struggling', -1], ['losses', -1], ['loss', -1], ['headwinds', -1], ['tightening', -1],
  ['fragile', -1], ['debt', -1], ['hit', -1], ['hits', -1], ['drags', -1], ['weighs', -1],
  ['rejects', -1], ['rejected', -1], ['halts', -1], ['halted', -1], ['probe', -1],
  ['probes', -1], ['fine', -1], ['fined', -1], ['gloomy', -1], ['pessimistic', -1],
  ['negative', -1], ['cut', -1], ['cuts', -1], ['hike', -1], ['hikes', -1], ['storms', -1],
  ['military', -1], ['drills', -1], ['exercises', -1], ['tactics', -1], ['troops', -1],
  ['deployment', -1], ['deployed', -1], ['tense', -1], ['incursion', -2], ['warship', -2],
  ['warships', -2], ['weapons', -2], ['combat', -2], ['provocation', -2], ['mobilization', -2],
  // Mild positive (+1)
  ['growth', 1], ['grows', 1], ['growing', 1], ['rises', 1], ['rising', 1], ['rose', 1],
  ['climbs', 1], ['climbed', 1], ['climbing', 1], ['jumps', 1], ['jumped', 1], ['gains', 1],
  ['gain', 1], ['gained', 1], ['rebound', 1], ['rebounds', 1], ['rebounded', 1],
  ['rebounding', 1], ['steady', 1], ['stable', 1], ['stability', 1], ['stabilizes', 1],
  ['resilient', 1], ['resilience', 1], ['solid', 1], ['robust', 1], ['strong', 1],
  ['stronger', 1], ['strength', 1], ['strengthens', 1], ['good', 1], ['positive', 1],
  ['upbeat', 1], ['easing', 1], ['eases', 1], ['eased', 1], ['cools', 1], ['cooling', 1],
  ['talks', 1], ['dialogue', 1], ['cooperation', 1], ['investment', 1], ['investments', 1],
  ['invests', 1], ['expansion', 1], ['expands', 1], ['expanding', 1], ['reform', 1],
  ['reforms', 1], ['stimulus', 1], ['support', 1], ['supports', 1], ['approves', 1],
  ['approved', 1], ['greenlight', 1], ['resumes', 1], ['resumed', 1], ['hiring', 1],
  ['lifts', 1], ['lifted', 1], ['spare', 1], ['spares', 1], ['spared', 1],
  ['exempt', 1], ['exempts', 1], ['exempted', 1], ['exemption', 1], ['hopes', 1],
  ['accelerates', 1], ['revival', 1], ['revives', 1], ['progress', 1], ['extending', 1],
  // Moderate positive (+2)
  ['recovery', 2], ['recovers', 2], ['recovered', 2], ['rally', 2], ['rallies', 2],
  ['rallied', 2], ['surplus', 2], ['boom', 2], ['booming', 2], ['upgrade', 2],
  ['upgrades', 2], ['upgraded', 2], ['deal', 2], ['deals', 2], ['agreement', 2],
  ['accord', 2], ['treaty', 2], ['pact', 2], ['partnership', 2], ['breakthrough', 2],
  ['soars', 2], ['soared', 2], ['surges', 2], ['surged', 2], ['outperforms', 2],
  ['beats', 2], ['boost', 2], ['boosts', 2], ['boosted', 2], ['optimism', 2],
  ['optimistic', 2], ['confidence', 2], ['truce', 2], ['rescue', 2], ['rescues', 2],
  // Strong positive (+3)
  ['ceasefire', 3], ['peace', 3], ['prosperity', 3], ['resolved', 3],
]);

// Phrase-level signals applied directly to the headline text.
const PHRASES = [
  { re: /\bgood\s+news\b/i, weight: 2.2 },
  { re: /\bbad\s+news\b/i, weight: -2.2 },
  { re: /\btrade\s+war\b/i, weight: -2.5 },
  { re: /\btrade\s+deal\b/i, weight: 2.5 },
  { re: /\bpeace\s+talks?\b/i, weight: 1.5 },
  { re: /\bunder\s+pressure\b/i, weight: -1.5 },
  { re: /\bkeeps?\s+sliding\b/i, weight: -1.5 },
  { re: /\brecord\s+high\b/i, weight: 1.5 },
  { re: /\brecord\s+low\b/i, weight: -1.8 },
  { re: /\bjob\s+cuts?\b/i, weight: -2.0 },
  { re: /\brate\s+cut\b/i, weight: 1.0 },
  { re: /\brate\s+hike\b/i, weight: -1.0 },
  { re: /\boil\s+shock\b/i, weight: -2.5 },
  { re: /\bcost\s+of\s+living\b/i, weight: -1.2 },
  { re: /\bspare[sd]?\s+\w+/i, weight: 1.4 },
  { re: /\bavoids?\s+recession\b/i, weight: 2.5 },
];

const NEGATORS = new Set(['not', 'no', 'never', 'without', 'averts', 'avoids', 'avoided', 'halts', 'halted', 'ends', 'ended', 'eases', 'lifts', 'lifted']);
const INTENSIFIERS = new Set(['sharp', 'sharply', 'severe', 'severely', 'major', 'deep', 'deeply', 'rapid', 'rapidly', 'massive', 'heavy', 'worst', 'steep', 'steeply']);
const CONTRAST_RE = /\b(but|however|yet|though|although|despite)\b/i;
const HIGH_IMPACT_RE = /\b(war|invasion|sanctions?|tariffs?|recession|default|crisis|central\s+bank|rate\s+cut|rate\s+hike|ceasefire|coup|oil\s+shock|emergency|bailout|downgrade|election|bankruptcy)\b/i;

function scoreTokens(text) {
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(Boolean);
  let raw = 0;
  let hits = 0;
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    const base = LEXICON.get(w);
    if (base === undefined) continue;

    let weight = base;
    const prev1 = tokens[i - 1];
    const prev2 = tokens[i - 2];
    if (NEGATORS.has(prev1) || NEGATORS.has(prev2)) {
      weight = -weight * 0.7;
    } else if (INTENSIFIERS.has(prev1) || INTENSIFIERS.has(prev2)) {
      weight = weight * 1.25;
    }
    raw += weight;
    hits++;
  }
  return { raw, hits };
}

/**
 * Score a headline (plus optional non-duplicate summary) and classify its economic channel.
 * Returns { score: -100..100, channel, severity }.
 */
export function analyzeArticle(title, summary = '') {
  const cleanTitle = String(title || '').trim();
  const cleanSummary = String(summary || '').trim();
  // Avoid double-scoring when RSS descriptions just repeat the headline.
  const titlePrefix = cleanTitle.toLowerCase().slice(0, 32);
  const useSummary = cleanSummary.length > 20 && (!titlePrefix || !cleanSummary.toLowerCase().includes(titlePrefix));

  let raw = 0;
  let hits = 0;

  // Handle contrastive headlines ("X happens, but Y...") by emphasizing the post-contrast clause.
  const contrastMatch = CONTRAST_RE.exec(cleanTitle);
  if (contrastMatch && contrastMatch.index > 6) {
    const before = cleanTitle.slice(0, contrastMatch.index);
    const after = cleanTitle.slice(contrastMatch.index + contrastMatch[0].length);
    const sBefore = scoreTokens(before);
    const sAfter = scoreTokens(after);
    raw += sBefore.raw * 0.75 + sAfter.raw * 1.25;
    hits += sBefore.hits + sAfter.hits;
  } else {
    const sTitle = scoreTokens(cleanTitle);
    raw += sTitle.raw;
    hits += sTitle.hits;
  }

  for (const p of PHRASES) {
    if (p.re.test(cleanTitle)) {
      raw += p.weight;
      hits++;
    }
  }

  if (useSummary) {
    const sSum = scoreTokens(cleanSummary);
    raw += sSum.raw * 0.35;
    hits += sSum.hits;
  }

  // Calibrated tanh curve: single -3 word => ~-34, moderate multi-signal => ±50, extreme stacked => ±75+.
  const normalized = hits === 0 ? 0 : Math.round(Math.tanh(raw / 8.5) * 100);

  // Classify economic channel (title weighted 2x over summary); fall back to World & Society.
  let channel = 'World & Society';
  let bestScore = 0;
  for (const rule of CHANNEL_RULES) {
    const tMatches = cleanTitle.match(new RegExp(rule.re.source, 'gi'));
    const sMatches = useSummary ? cleanSummary.match(new RegExp(rule.re.source, 'gi')) : null;
    const count = (tMatches ? tMatches.length * 2 : 0) + (sMatches ? sMatches.length : 0);
    if (count > bestScore) {
      bestScore = count;
      channel = rule.channel;
    }
  }

  const abs = Math.abs(normalized);
  const highImpact = HIGH_IMPACT_RE.test(cleanTitle);
  const severity = abs >= 48 || (highImpact && abs >= 24) ? 'High' : abs >= 18 || highImpact ? 'Medium' : 'Low';

  return { score: normalized, channel, severity };
}

/**
 * Produce a restrained, editorial 1-sentence brief for a country's live pulse.
 */
export function buildBrief(_display, sentiment, shownCount, totalVolume, dominantChannel, topArticle) {
  const toneWord =
    sentiment <= -30
      ? 'sharply negative'
      : sentiment <= -10
        ? 'cautious to negative'
        : sentiment >= 30
          ? 'markedly positive'
          : sentiment >= 10
            ? 'constructively positive'
            : 'mixed';

  const countText =
    totalVolume > shownCount
      ? `${shownCount} latest reports (${totalVolume} matched)`
      : `${shownCount} recent ${shownCount === 1 ? 'report' : 'reports'}`;
  const lead = `Coverage is ${toneWord} across ${countText}, led by ${dominantChannel.toLowerCase()}.`;
  if (!topArticle) return lead;
  const cleanTitle = topArticle.title.replace(/\s+[-–|]\s+[^-–|]{2,40}$/, '').trim();
  return `${lead} Top story: “${cleanTitle}”.`;
}
