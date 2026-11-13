/**
 * DIPLOMACY: WHO IS CLOSE TO WHOM, AND WHO WOULD FIGHT FOR WHOM.
 *
 * Two hand-curated layers of data, as of early 2026:
 *
 * 1. Alliances and security groupings (BLOCS) and bilateral defence treaties
 *    (PACTS), from the treaties themselves and the members' own lists. A
 *    mutual-defence bloc or pact makes its members treaty allies; a looser
 *    security grouping (the Quad, AUKUS, the SCO, US major non-NATO ally
 *    status and so on) makes them security partners.
 *
 * 2. Relations between pairs of countries (TIES), on five steps from allied
 *    to hostile, drawn from diplomatic records, alliances, arms ties, open
 *    disputes and recent conflicts. Members of a defence bloc, the EU or Five
 *    Eyes count as close unless a pair says otherwise (Greece and Turkey are
 *    both in NATO, for instance, but are listed as strained). Pairs that are
 *    not listed count as neutral, which mostly means "ordinary relations",
 *    not "no relations".
 *
 * It is a judgement, not a measurement, and the map says so.
 */

export type Level = 2 | 1 | 0 | -1 | -2;

export const LEVEL: Record<Level, { label: string; color: string }> = {
  2: { label: 'Close allies', color: '#3d9a63' },
  1: { label: 'Friendly', color: '#8fc49a' },
  0: { label: 'Neutral', color: '#34405a' },
  [-1]: { label: 'Strained', color: '#e0b25a' },
  [-2]: { label: 'Hostile', color: '#c9434b' },
};
export const LEVELS: Level[] = [2, 1, -1, -2];
export const FOCUS_COLOR = '#a4c2f0';

/* ---------- blocs ---------- */

export type BlocKind = 'defence' | 'partnership';

export interface Bloc {
  id: string;
  name: string;
  short: string;
  kind: BlocKind;
  /** Colour on the world map (defence blocs only). */
  color?: string;
  since: number;
  about: string;
  members: string[];
  /** Members whose part is frozen or partial, with why. */
  caveat?: Record<string, string>;
}

const NATO = [
  'Albania', 'Belgium', 'Bulgaria', 'Canada', 'Croatia', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
  'Hungary', 'Iceland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Montenegro', 'Netherlands', 'Macedonia', 'Norway', 'Poland',
  'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Turkey', 'United Kingdom', 'United States of America',
];
const EU = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
  'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania',
  'Slovakia', 'Slovenia', 'Spain', 'Sweden',
];

/** In order of precedence for the world map: a country takes the colour of the first defence bloc it is in. */
export const BLOCS: Bloc[] = [
  {
    id: 'nato',
    name: 'North Atlantic Treaty Organization',
    short: 'NATO',
    kind: 'defence',
    color: '#4f86d9',
    since: 1949,
    about: 'An attack on one is an attack on all (Article 5).',
    members: NATO,
  },
  {
    id: 'pacific',
    name: 'US treaty allies in Asia and the Pacific',
    short: 'US Pacific treaties',
    kind: 'defence',
    color: '#4fb3b8',
    since: 1951,
    about:
      'Separate mutual-defence treaties with the United States (Japan, South Korea, the Philippines, Thailand, Australia through ANZUS) and the Compacts of Free Association; Australia and New Zealand are also bound to each other.',
    members: ['Japan', 'South Korea', 'Philippines', 'Thailand', 'Australia', 'New Zealand', 'Marshall Is.', 'Micronesia', 'Palau', 'Papua New Guinea'],
    caveat: { 'New Zealand': 'US guarantees to New Zealand have been suspended since 1986; the tie to Australia stands.', 'Papua New Guinea': 'Bound to Australia by the 2025 Pukpuk treaty.' },
  },
  {
    id: 'rio',
    name: 'Inter-American Treaty of Reciprocal Assistance',
    short: 'Rio Treaty',
    kind: 'defence',
    color: '#8ab9e6',
    since: 1947,
    about: 'Mutual defence across the Americas; rarely invoked, and several states have left.',
    members: [
      'United States of America', 'Argentina', 'Bahamas', 'Brazil', 'Chile', 'Colombia', 'Costa Rica', 'Dominican Rep.', 'El Salvador',
      'Guatemala', 'Haiti', 'Honduras', 'Panama', 'Paraguay', 'Peru', 'Trinidad and Tobago', 'Uruguay',
    ],
  },
  {
    id: 'csto',
    name: 'Collective Security Treaty Organization',
    short: 'CSTO',
    kind: 'defence',
    color: '#c9434b',
    since: 1992,
    about: 'Russia-led mutual defence among former Soviet states.',
    members: ['Russia', 'Belarus', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Armenia'],
    caveat: { Armenia: 'Froze its part in 2024 and has said it will leave.' },
  },
  {
    id: 'east',
    name: 'Treaties of China and Russia with North Korea',
    short: 'China–Russia–N. Korea treaties',
    kind: 'defence',
    color: '#8c3657',
    since: 1961,
    about: 'China’s 1961 treaty and Russia’s 2024 treaty both pledge aid to North Korea if it is attacked.',
    members: ['China', 'North Korea'],
  },
  {
    id: 'gcc',
    name: 'Gulf Cooperation Council (Peninsula Shield)',
    short: 'GCC',
    kind: 'defence',
    color: '#d9a441',
    since: 1981,
    about: 'Gulf monarchies with a joint defence pact and force.',
    members: ['Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'],
  },
  {
    id: 'aes',
    name: 'Alliance of Sahel States',
    short: 'Sahel alliance',
    kind: 'defence',
    color: '#b5714a',
    since: 2023,
    about: 'Mutual defence among the three military governments that left ECOWAS.',
    members: ['Mali', 'Burkina Faso', 'Niger'],
  },
  {
    id: 'africa',
    name: 'SADC and ECOWAS defence pacts',
    short: 'African regional pacts',
    kind: 'defence',
    color: '#8fa35a',
    since: 1981,
    about: 'Mutual-defence protocols of the Southern African Development Community (2003) and ECOWAS (1981).',
    members: [
      'Angola', 'Botswana', 'Comoros', 'Dem. Rep. Congo', 'eSwatini', 'Lesotho', 'Madagascar', 'Malawi', 'Mauritius', 'Mozambique',
      'Namibia', 'Seychelles', 'South Africa', 'Tanzania', 'Zambia', 'Zimbabwe',
      'Benin', 'Cabo Verde', "Côte d'Ivoire", 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Liberia', 'Nigeria', 'Senegal', 'Sierra Leone', 'Togo',
    ],
  },
  {
    id: 'other',
    name: 'Other mutual-defence pacts',
    short: 'Other defence pacts',
    kind: 'defence',
    color: '#9a8fc0',
    since: 2021,
    about: 'Bilateral pacts outside the big blocs, such as Pakistan with Saudi Arabia (2025) and Azerbaijan with Turkey (2021).',
    members: ['Pakistan', 'Azerbaijan', 'N. Cyprus'],
  },
  {
    id: 'eu',
    name: 'European Union mutual-assistance clause',
    short: 'EU',
    kind: 'partnership',
    since: 2009,
    about: 'Article 42.7 obliges members to aid one attacked; neutral members keep their own policy.',
    members: EU,
  },
  {
    id: 'quad',
    name: 'Quadrilateral Security Dialogue',
    short: 'Quad',
    kind: 'partnership',
    since: 2007,
    about: 'Security partnership of four Indo-Pacific democracies.',
    members: ['United States of America', 'India', 'Japan', 'Australia'],
  },
  {
    id: 'aukus',
    name: 'AUKUS',
    short: 'AUKUS',
    kind: 'partnership',
    since: 2021,
    about: 'Nuclear submarines and advanced technology shared between three allies.',
    members: ['Australia', 'United Kingdom', 'United States of America'],
  },
  {
    id: 'fiveeyes',
    name: 'Five Eyes',
    short: 'Five Eyes',
    kind: 'partnership',
    since: 1946,
    about: 'The closest intelligence-sharing alliance.',
    members: ['United States of America', 'United Kingdom', 'Canada', 'Australia', 'New Zealand'],
  },
  {
    id: 'fpda',
    name: 'Five Power Defence Arrangements',
    short: 'FPDA',
    kind: 'partnership',
    since: 1971,
    about: 'The UK, Australia and New Zealand consult on the defence of Malaysia and Singapore.',
    members: ['United Kingdom', 'Australia', 'New Zealand', 'Malaysia', 'Singapore'],
  },
  {
    id: 'mnna',
    name: 'US major non-NATO allies',
    short: 'US major non-NATO ally',
    kind: 'partnership',
    since: 1987,
    about: 'A US designation that brings arms, training and defence research ties, without a defence guarantee.',
    members: [
      'United States of America', 'Argentina', 'Bahrain', 'Brazil', 'Colombia', 'Egypt', 'Israel', 'Jordan', 'Kenya', 'Kuwait', 'Morocco',
      'Pakistan', 'Qatar', 'Saudi Arabia', 'Tunisia', 'Taiwan',
    ],
  },
  {
    id: 'sco',
    name: 'Shanghai Cooperation Organisation',
    short: 'SCO',
    kind: 'partnership',
    since: 2001,
    about: 'Eurasian security club led by China and Russia; no defence pledge, and some members are rivals.',
    members: ['China', 'Russia', 'India', 'Pakistan', 'Iran', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Uzbekistan', 'Belarus'],
  },
  {
    id: 'csto-cis',
    name: 'Union State of Russia and Belarus',
    short: 'Union State',
    kind: 'partnership',
    since: 1999,
    about: 'Russia and Belarus share a defence space; Russian nuclear weapons are based in Belarus.',
    members: ['Russia', 'Belarus'],
  },
];

/** Mutual-defence treaties between two states, outside or across the blocs. */
export const PACTS: [string, string, string][] = [
  ['United States of America', 'Japan', 'US–Japan Security Treaty (1960)'],
  ['United States of America', 'South Korea', 'US–South Korea Mutual Defense Treaty (1953)'],
  ['United States of America', 'Philippines', 'US–Philippines Mutual Defense Treaty (1951)'],
  ['United States of America', 'Australia', 'ANZUS (1951)'],
  ['United States of America', 'Thailand', 'Manila Pact and Thanat–Rusk communiqué (1954, 1962)'],
  ['United States of America', 'Marshall Is.', 'Compact of Free Association'],
  ['United States of America', 'Micronesia', 'Compact of Free Association'],
  ['United States of America', 'Palau', 'Compact of Free Association'],
  ['Australia', 'New Zealand', 'ANZUS and the Closer Defence Relations'],
  ['Australia', 'Papua New Guinea', 'Pukpuk mutual-defence treaty (2025)'],
  ['China', 'North Korea', 'Treaty of Friendship (1961)'],
  ['Russia', 'North Korea', 'Comprehensive Strategic Partnership treaty (2024)'],
  ['Saudi Arabia', 'Pakistan', 'Strategic Mutual Defence Agreement (2025)'],
  ['Turkey', 'Azerbaijan', 'Shusha Declaration (2021)'],
  ['Turkey', 'N. Cyprus', 'Turkey’s guarantee and troops in the north'],
  ['France', 'Poland', 'Treaty of Nancy (2025)'],
  ['France', 'Greece', 'Strategic defence partnership (2021)'],
];

/** Close bilateral security ties without a defence pledge: bases, troops, access deals, major arms partnerships. */
export const SECURITY: [string, string, string][] = [
  ['Japan', 'Australia', 'Reciprocal access agreement (2022)'],
  ['Japan', 'Philippines', 'Reciprocal access agreement (2024)'],
  ['Japan', 'United Kingdom', 'Reciprocal access agreement and a joint fighter jet'],
  ['Italy', 'United Kingdom', 'Joint fighter jet (GCAP)'],
  ['Japan', 'Italy', 'Joint fighter jet (GCAP)'],
  ['United States of America', 'Israel', 'US military aid and missile defence'],
  ['United States of America', 'Taiwan', 'Arms sales under the Taiwan Relations Act'],
  ['United States of America', 'Singapore', 'US access to Singapore’s bases'],
  ['United States of America', 'United Arab Emirates', 'US base at Al Dhafra'],
  ['United States of America', 'Oman', 'US access to Omani ports and bases'],
  ['United States of America', 'Djibouti', 'Camp Lemonnier'],
  ['United States of America', 'Iraq', 'US troops against Islamic State'],
  ['United States of America', 'Ukraine', 'Weapons and intelligence'],
  ['United States of America', 'Vietnam', 'Comprehensive strategic partnership'],
  ['United States of America', 'Papua New Guinea', 'Defence cooperation agreement (2023)'],
  ['United States of America', 'Guyana', 'Defence cooperation against Venezuela’s claim'],
  ['United States of America', 'Ecuador', 'Security cooperation against drug gangs'],
  ['United States of America', 'El Salvador', 'Security cooperation'],
  ['United Kingdom', 'Bahrain', 'British naval base'],
  ['United Kingdom', 'Oman', 'British base at Duqm'],
  ['United Kingdom', 'Kenya', 'British army training'],
  ['United Kingdom', 'Brunei', 'British troops in Brunei'],
  ['United Kingdom', 'Ukraine', '100-year partnership'],
  ['United Kingdom', 'Qatar', 'Joint air squadron'],
  ['France', 'India', 'Rafale jets and submarines'],
  ['France', 'United Arab Emirates', 'French base in Abu Dhabi'],
  ['France', 'Djibouti', 'French base and defence treaty'],
  ['France', 'Côte d\'Ivoire', 'Defence partnership'],
  ['France', 'Ukraine', 'Weapons and training'],
  ['France', 'Armenia', 'Arms supplier'],
  ['France', 'Egypt', 'Rafale jets'],
  ['Germany', 'Ukraine', 'Second-largest military backer'],
  ['India', 'Armenia', 'Major arms supplier'],
  ['India', 'Bhutan', 'Indian military training team'],
  ['India', 'Mauritius', 'Indian-built base at Agaléga'],
  ['India', 'Israel', 'Arms and intelligence'],
  ['India', 'Russia', 'Main arms supplier'],
  ['India', 'Philippines', 'BrahMos missiles'],
  ['Russia', 'Iran', 'Drones and arms'],
  ['Russia', 'Mali', 'Russian Africa Corps troops'],
  ['Russia', 'Central African Rep.', 'Russian forces guard the government'],
  ['Russia', 'Burkina Faso', 'Russian troops'],
  ['Russia', 'Niger', 'Russian troops'],
  ['Russia', 'Libya', 'Backs Haftar in the east'],
  ['Russia', 'Myanmar', 'Arms for the junta'],
  ['Russia', 'Algeria', 'Main arms supplier'],
  ['Russia', 'Venezuela', 'Arms supplier'],
  ['Russia', 'Laos', 'Military training and arms'],
  ['China', 'Pakistan', 'Main arms supplier; joint jet production'],
  ['China', 'Cambodia', 'Chinese-built naval base at Ream'],
  ['China', 'Djibouti', 'China’s first overseas base'],
  ['China', 'Solomon Is.', 'Security pact (2022)'],
  ['China', 'Myanmar', 'Arms supplier'],
  ['China', 'Iran', 'Joint naval drills'],
  ['China', 'Serbia', 'Arms supplier'],
  ['Turkey', 'Qatar', 'Turkish base in Qatar'],
  ['Turkey', 'Somalia', 'Turkish base in Mogadishu'],
  ['Turkey', 'Syria', 'Trains the new army'],
  ['Turkey', 'Libya', 'Turkish troops back the Tripoli government'],
  ['Turkey', 'Ukraine', 'Drones'],
  ['Turkey', 'Mali', 'Turkish drones'],
  ['Israel', 'Azerbaijan', 'Arms supplier'],
  ['Iran', 'Yemen', 'Arms the Houthis'],
  ['Iran', 'Iraq', 'Iran-backed militias'],
  ['South Korea', 'Poland', 'Tanks, howitzers and jets'],
  ['South Korea', 'United Arab Emirates', 'Korean troops train in the UAE'],
  ['Egypt', 'Somalia', 'Egyptian troops in the AU mission'],
  ['Egypt', 'Sudan', 'Backs Sudan’s army'],
  ['United Arab Emirates', 'Somaliland', 'UAE base at Berbera'],
  ['Rwanda', 'Mozambique', 'Rwandan troops in Cabo Delgado'],
  ['Rwanda', 'Central African Rep.', 'Rwandan troops'],
  ['Uganda', 'S. Sudan', 'Ugandan troops back the government'],
  ['Uganda', 'Dem. Rep. Congo', 'Joint operations against rebels'],
  ['Burundi', 'Dem. Rep. Congo', 'Burundian troops beside Congo’s army'],
  ['Kenya', 'Haiti', 'Led the security mission in Haiti'],
  ['Australia', 'Nauru', 'Nakamarra treaty (2025)'],
  ['Australia', 'Indonesia', 'Defence cooperation agreement (2024)'],
  ['Australia', 'Philippines', 'Visiting forces agreement'],
  ['Australia', 'Fiji', 'Vuvale partnership'],
  ['Australia', 'Solomon Is.', 'Police and security treaty'],
  ['Australia', 'Vanuatu', 'Security agreement'],
  ['Saudi Arabia', 'Egypt', 'Military cooperation'],
  ['Hungary', 'Chad', 'Hungarian troops in Chad'],
  ['Germany', 'Lithuania', 'German brigade based in Lithuania'],
];

/* ---------- relations between pairs ---------- */

/**
 * `A | B | level | why`. Symmetric. Listed pairs override what alliances
 * imply. Levels: 2 close, 1 friendly, -1 strained, -2 hostile.
 */
const TIES = `
India|Russia|2|Old partner and main arms supplier
India|Japan|2|Special strategic partners
India|France|2|Rafale jets, submarines and a strategic partnership
India|Israel|2|Arms, intelligence and technology ties
India|United Arab Emirates|2|Trade pact and close leaders
India|Bhutan|2|Friendship treaty; India guides Bhutan’s security
India|Mauritius|2|Close ties and an Indian-built airstrip at Agaléga
India|United States of America|1|Strategic partners, strained by 2025 tariffs
India|Australia|1|Quad partners
India|Saudi Arabia|1
India|Nepal|1
India|Sri Lanka|1
India|Maldives|1|Ties restored in 2025 after a rift
India|Afghanistan|1|Reopened its embassy to the Taliban government in 2025
India|Iran|1|Chabahar port
India|Vietnam|1
India|Indonesia|1
India|Singapore|1
India|United Kingdom|1|Free trade agreement in 2025
India|Germany|1
India|Egypt|1
India|Armenia|2|Major arms supplier to Armenia
India|Greece|1
India|Cyprus|1
India|Philippines|1|BrahMos missiles
India|South Korea|1
India|Brazil|1
India|South Africa|1
India|Kenya|1
India|Guyana|1
India|Fiji|1
India|Pakistan|-2|Fought a short war in May 2025; Kashmir dispute
India|China|-1|Border clashes; a partial thaw since 2024
India|Bangladesh|-1|Strained since Sheikh Hasina fled to India in 2024
India|Turkey|-1|Backed Pakistan in 2025
India|Azerbaijan|-1|Backed Pakistan in 2025
India|Canada|-1|Rift over a Sikh activist’s killing, easing since 2025
United States of America|United Kingdom|2|The “special relationship”
United States of America|Israel|2|Largest recipient of US military aid
United States of America|Taiwan|2|Arms sales and backing under the Taiwan Relations Act
United States of America|Saudi Arabia|2|Arms and security partnership
United States of America|Jordan|2
United States of America|Argentina|2|Close under President Milei; a $20 billion currency swap
United States of America|El Salvador|2|Close under President Bukele
United States of America|Morocco|2|Recognised Morocco’s claim to Western Sahara
United States of America|Singapore|2|Close security partner
United States of America|Ecuador|2|Close under President Noboa
United States of America|Guyana|2|Security backing against Venezuela’s claim
United States of America|Canada|1|Allies, strained by tariffs since 2025
United States of America|Mexico|1|Trade partners, strained by tariffs and migration
United States of America|Ukraine|1|Main backer, with pressure over a peace deal
United States of America|United Arab Emirates|1
United States of America|Qatar|2|Hosts the largest US base in the region; US security guarantee in 2025
United States of America|Bahrain|2|Hosts the US Fifth Fleet
United States of America|Kuwait|1
United States of America|Egypt|1
United States of America|Iraq|1
United States of America|Pakistan|1|Warmer since 2025
United States of America|Vietnam|1
United States of America|Indonesia|1
United States of America|Kenya|1
United States of America|Azerbaijan|1|Brokered the 2025 Armenia–Azerbaijan accord
United States of America|Armenia|1
United States of America|Peru|1
United States of America|Bolivia|1|Ambassadors restored in 2025
United States of America|Paraguay|1
United States of America|Panama|1
United States of America|Dominican Rep.|1
United States of America|Papua New Guinea|1
United States of America|Iran|-2|Struck Iran’s nuclear sites in June 2025
United States of America|North Korea|-2
United States of America|Russia|-2|War in Ukraine; on-and-off peace talks
United States of America|Cuba|-2|Embargo since 1962
United States of America|Venezuela|-1|US strikes on boats and the seizure of Maduro in January 2026
United States of America|China|-1|Strategic rivals; trade war
United States of America|Nicaragua|-1
United States of America|Brazil|-1|2025 tariffs over the Bolsonaro trial
United States of America|Colombia|-1|Clashes with President Petro in 2025
United States of America|South Africa|-1|Rows over land reform and Israel in 2025
United States of America|Denmark|-1|Strained over US claims on Greenland
United States of America|Greenland|-1|US claims on the island
United States of America|Afghanistan|-1
United States of America|Belarus|-1|A thaw since 2025 prisoner releases
United States of America|Eritrea|-1
United States of America|Zimbabwe|-1
United States of America|Yemen|-1|Struck the Houthis in 2025
United States of America|Palestine|-1
Russia|Belarus|2|Union State
Russia|China|2|“No limits” partnership
Russia|Iran|2|Drones, arms and a 2025 partnership treaty
Russia|Mali|2|Russian Africa Corps troops
Russia|Central African Rep.|2|Russian forces guard the government
Russia|Venezuela|1
Russia|Cuba|2
Russia|Nicaragua|2
Russia|Serbia|1
Russia|Hungary|1
Russia|Myanmar|2|Arms and support for the junta
Russia|Burkina Faso|1
Russia|Niger|1
Russia|Eritrea|1
Russia|Algeria|1|Main arms supplier
Russia|Egypt|1
Russia|United Arab Emirates|1
Russia|Saudi Arabia|1|OPEC+ partners
Russia|Turkey|1
Russia|Kazakhstan|2
Russia|Tajikistan|2|Russia’s largest base abroad
Russia|Kyrgyzstan|2
Russia|Uzbekistan|1
Russia|Mongolia|1
Russia|Vietnam|1
Russia|Laos|1
Russia|South Africa|1
Russia|Sudan|1
Russia|Libya|1|Backs Haftar in the east
Russia|Afghanistan|1|First to recognise the Taliban government, in 2025
Russia|Ukraine|-2|Full-scale war since 2022
Russia|United Kingdom|-2
Russia|Poland|-2
Russia|Lithuania|-2
Russia|Latvia|-2
Russia|Estonia|-2
Russia|Finland|-2|Closed border
Russia|Germany|-2
Russia|France|-2
Russia|Moldova|-2|Russian troops in Transnistria
Russia|Canada|-2
Russia|Sweden|-2
Russia|Denmark|-2
Russia|Czechia|-2
Russia|Romania|-2
Russia|Netherlands|-2
Russia|Georgia|-1|Occupies a fifth of Georgia; a thaw with the government
Russia|Azerbaijan|-1|Row over a downed airliner in 2025
Russia|Armenia|-1|Armenia feels let down over Karabakh
Russia|Japan|-1
Russia|South Korea|-1
Russia|Australia|-1
Russia|New Zealand|-1
Russia|Switzerland|-1
Russia|Austria|-1
Russia|Ireland|-1
Russia|Slovakia|1
China|Pakistan|2|“All-weather” partners; the CPEC corridor
China|Cambodia|2
China|Laos|2
China|Serbia|2|“Ironclad friendship”
China|Hong Kong|2
China|Macao|2
China|Myanmar|1
China|Iran|1|Largest buyer of Iran’s oil
China|Hungary|1
China|Belarus|1
China|Venezuela|1
China|Cuba|2
China|Solomon Is.|1|2022 security pact
China|Kazakhstan|2
China|Uzbekistan|1
China|Kyrgyzstan|1
China|Tajikistan|1
China|Turkmenistan|1|Buys most of its gas
China|Mongolia|1
China|Bangladesh|1
China|Sri Lanka|1
China|Nepal|1
China|Maldives|1
China|Thailand|1
China|Malaysia|1
China|Indonesia|1
China|South Africa|2
China|Ethiopia|1
China|Zimbabwe|2
China|Djibouti|1|Its first overseas base
China|Egypt|1
China|Saudi Arabia|1
China|United Arab Emirates|1
China|Algeria|1
China|Nigeria|1
China|Angola|1
China|Tanzania|2
China|Kenya|1
China|Dem. Rep. Congo|1
China|Zambia|1
China|Afghanistan|1
China|Timor-Leste|1
China|Nicaragua|1
China|Bolivia|1
China|Peru|1|Chancay megaport
China|Chile|1
China|Vanuatu|1
China|Kiribati|1
China|Samoa|1
China|Tonga|1
China|Nauru|1
China|Taiwan|-2|Claims the island and drills to blockade it
China|Philippines|-2|Clashes in the South China Sea
China|Japan|-1|Row over Taiwan since late 2025
China|Lithuania|-1|Downgraded ties over a Taiwanese office
China|Paraguay|-1|No ties; Paraguay recognises Taiwan
China|Vietnam|1|Party-to-party ties despite sea disputes
China|Canada|-1
China|Australia|0
Pakistan|Turkey|2
Pakistan|Azerbaijan|2
Pakistan|United Arab Emirates|1
Pakistan|Qatar|1
Pakistan|Bangladesh|1|Warmer since 2024
Pakistan|Afghanistan|-2|Border fighting in October 2025
Pakistan|Iran|0
Iran|Iraq|1|Close to Baghdad’s ruling parties
Iran|Venezuela|1
Iran|Belarus|1
Iran|Armenia|1
Iran|Tajikistan|1
Iran|Oman|1|Oman mediates for Iran
Iran|Qatar|1|Share the largest gas field
Iran|North Korea|1
Iran|Yemen|1|Arms the Houthis
Iran|Israel|-2|Twelve-day war in June 2025
Iran|Syria|-2|Lost its ally when Assad fell in 2024
Iran|Bahrain|-1
Iran|Azerbaijan|-1
Iran|United Kingdom|-1
Iran|Canada|-1|No diplomatic ties since 2012
Iran|Germany|-1
Iran|France|-1
Iran|Jordan|-1
Iran|Ukraine|-2|Supplied Russia’s drones
Israel|Germany|2
Israel|Azerbaijan|2|Oil and arms
Israel|Argentina|2
Israel|Somaliland|2|Recognised Somaliland in December 2025
Israel|United Arab Emirates|1|Abraham Accords
Israel|Bahrain|1|Abraham Accords
Israel|Morocco|1|Abraham Accords
Israel|Greece|1
Israel|Cyprus|1
Israel|Hungary|1
Israel|Czechia|2
Israel|Ecuador|1
Israel|Paraguay|1
Israel|Guatemala|2
Israel|Singapore|1
Israel|Lebanon|-2|War with Hezbollah
Israel|Yemen|-2|Houthi missile war
Israel|Palestine|-2|War in Gaza
Israel|Turkey|-2|Turkey cut trade over Gaza
Israel|South Africa|-2|South Africa’s genocide case at the ICJ
Israel|Algeria|-2
Israel|Iraq|-2
Israel|Colombia|-2|Colombia cut ties in 2024
Israel|Syria|-1|Strikes and talks with the new government
Israel|Jordan|-1|Peace treaty, chilled by Gaza
Israel|Egypt|-1|Peace treaty, chilled by Gaza
Israel|Spain|-1|Arms embargo in 2025
Israel|Ireland|-1
Israel|Qatar|-1|Israeli strike on Doha in 2025
Israel|Malaysia|-1|No relations
Israel|Indonesia|-1|No relations
Israel|Pakistan|-1|No relations
Israel|Libya|-1
Israel|Brazil|-1
Israel|Chile|-1
Israel|Belize|-1
Israel|Saudi Arabia|0
United Kingdom|France|2|Lancaster House treaties
United Kingdom|Germany|2|Trinity House defence pact (2024)
United Kingdom|Poland|2
United Kingdom|Ukraine|2|100-year partnership
United Kingdom|Japan|2|Building a fighter jet together
United Kingdom|Italy|1|Building a fighter jet together
United Kingdom|Ireland|1
United Kingdom|Norway|2
United Kingdom|Portugal|2|The world’s oldest alliance, from 1386
United Kingdom|Mauritius|1|Chagos Islands deal in 2025
United Kingdom|Oman|1
United Kingdom|Jordan|2
United Kingdom|Kenya|1|British army training in Kenya
United Kingdom|Nigeria|1
United Kingdom|Brunei|1|British troops in Brunei
United Kingdom|Bermuda|2
United Kingdom|Cayman Is.|2
United Kingdom|Falkland Is.|2
United Kingdom|Argentina|-1|Falklands dispute
United Kingdom|Belarus|-1
United Kingdom|Zimbabwe|-1
France|Germany|2|The Franco-German engine
France|Belgium|2
France|United Arab Emirates|2|French base in Abu Dhabi
France|Morocco|2|Backed Morocco’s plan for Western Sahara in 2024
France|Djibouti|2|French base and defence treaty
France|Ukraine|2
France|Armenia|2|Arms supplier
France|Lebanon|2
France|Egypt|1
France|Qatar|1
France|Italy|1
France|Côte d'Ivoire|1
France|Australia|1
France|New Caledonia|2
France|Fr. Polynesia|2
France|Algeria|-2|Deep diplomatic crisis since 2024
France|Mali|-2|Expelled French troops
France|Burkina Faso|-2|Expelled French troops
France|Niger|-2|Expelled French troops
France|Chad|-1|Chad ended the defence pact in 2024
France|Azerbaijan|-1
Germany|Netherlands|2
Germany|Austria|2
Germany|Ukraine|2|Second-largest military backer
Germany|Lithuania|2|German brigade based in Lithuania
Germany|Poland|1
Germany|Japan|1
Germany|Namibia|1
Germany|Belarus|-1
Turkey|Qatar|2|Turkish base in Qatar
Turkey|Syria|2|Main backer of the new government
Turkey|Somalia|2|Turkish base and training in Mogadishu
Turkey|Libya|1|Backs the Tripoli government
Turkey|Ukraine|1
Turkey|Hungary|1
Turkey|Albania|1
Turkey|Bosnia and Herz.|1
Turkey|Kosovo|1
Turkey|Kazakhstan|1|Organization of Turkic States
Turkey|Uzbekistan|1|Organization of Turkic States
Turkey|Kyrgyzstan|1|Organization of Turkic States
Turkey|Turkmenistan|1
Turkey|Egypt|1|Ties restored in 2023
Turkey|United Arab Emirates|1
Turkey|Saudi Arabia|1
Turkey|Malaysia|1
Turkey|Indonesia|1
Turkey|Bangladesh|1
Turkey|Sudan|1
Turkey|Chad|1
Turkey|Greece|-1|Disputes in the Aegean, eased since 2023
Turkey|Cyprus|-2|Turkish troops in the north since 1974
Turkey|Armenia|-1|Normalising after decades of closed borders
Japan|Australia|2|Reciprocal access agreement
Japan|Philippines|2|Reciprocal access agreement (2024)
Japan|Taiwan|1
Japan|Vietnam|1
Japan|Indonesia|1
Japan|Italy|1
Japan|France|1
Japan|South Korea|1|Improving since 2023
Japan|Singapore|1
Japan|Malaysia|1
Japan|Bangladesh|1
Japan|Sri Lanka|1
Japan|Djibouti|1|Its only overseas base
Japan|Mongolia|1
Japan|Cambodia|1
Japan|Thailand|1
Japan|North Korea|-2
South Korea|Poland|2|Huge arms deals
South Korea|United Arab Emirates|2|Built its nuclear plant; Korean troops train there
South Korea|Vietnam|1
South Korea|Australia|1
South Korea|Saudi Arabia|1
South Korea|Indonesia|1|Co-developing a fighter jet
South Korea|Mongolia|1
South Korea|North Korea|-2|Still technically at war
North Korea|Belarus|1
North Korea|Laos|1
North Korea|Cuba|1
Australia|United Kingdom|2
Australia|Nauru|2|Nakamarra security treaty (2025)
Australia|Fiji|1
Australia|Solomon Is.|1
Australia|Vanuatu|1
Australia|Samoa|1
Australia|Tonga|1
Australia|Indonesia|1|Defence cooperation pact (2024)
Australia|Philippines|1
Australia|Singapore|2
Australia|Timor-Leste|1
Australia|Canada|2
New Zealand|Samoa|2
New Zealand|Tonga|1
New Zealand|Fiji|1
New Zealand|United Kingdom|2
Ukraine|Poland|2
Ukraine|Lithuania|2
Ukraine|Latvia|2
Ukraine|Estonia|2
Ukraine|Finland|2
Ukraine|Sweden|2
Ukraine|Denmark|2
Ukraine|Netherlands|2
Ukraine|Canada|2
Ukraine|Czechia|1
Ukraine|Norway|2
Ukraine|Moldova|1
Ukraine|Romania|1
Ukraine|Japan|1
Ukraine|Italy|1
Ukraine|Spain|1
Ukraine|Belgium|2
Ukraine|Azerbaijan|1
Ukraine|Austria|1
Ukraine|Switzerland|1
Ukraine|Argentina|1
Ukraine|Hungary|-1|Hungary blocks EU aid and accession talks
Ukraine|Slovakia|-1|Slovakia’s government opposes arms aid
Ukraine|Belarus|-2|Russia attacked from Belarus in 2022
Ukraine|North Korea|-2|North Korean troops fought for Russia
Ukraine|Mali|-2|Mali cut ties in 2024
Ukraine|Georgia|-1
Saudi Arabia|Egypt|2
Saudi Arabia|Bahrain|2
Saudi Arabia|United Arab Emirates|1|Gulf partners, at odds over Yemen since late 2025
Saudi Arabia|Jordan|1
Saudi Arabia|Morocco|1
Saudi Arabia|Syria|2|Backs the new government
Saudi Arabia|United Kingdom|1
Saudi Arabia|France|1
Saudi Arabia|Sudan|1|Backs the army
Saudi Arabia|Yemen|1|Backs the recognised government
Saudi Arabia|Iran|0|Restored ties in 2023
Saudi Arabia|Lebanon|1
Saudi Arabia|Bangladesh|1
Saudi Arabia|Maldives|1
Saudi Arabia|Indonesia|1
United Arab Emirates|Egypt|2
United Arab Emirates|Chad|1
United Arab Emirates|Ethiopia|1
United Arab Emirates|Somaliland|2|Runs the port of Berbera
United Arab Emirates|Libya|1|Backs Haftar in the east
United Arab Emirates|Rwanda|1
United Arab Emirates|Serbia|1
United Arab Emirates|Greece|1
United Arab Emirates|Cyprus|1
United Arab Emirates|Sudan|-2|Sudan cut ties, accusing it of arming the RSF
United Arab Emirates|Somalia|-1
Egypt|Greece|2
Egypt|Cyprus|2
Egypt|Sudan|1|Backs the army
Egypt|Eritrea|1
Egypt|Somalia|2|Troops for the AU mission
Egypt|Jordan|1
Egypt|Qatar|1
Egypt|Tunisia|1
Egypt|Algeria|1
Egypt|Lebanon|1
Egypt|Palestine|1
Egypt|Iraq|1
Egypt|Ethiopia|-2|Dispute over the Grand Ethiopian Renaissance Dam
Ethiopia|Eritrea|-2|Fears of a new war over sea access
Ethiopia|Somaliland|1
Ethiopia|Kenya|1
Ethiopia|Djibouti|1|Its main port
Ethiopia|Somalia|0|Patched up a 2024 rift
Algeria|Morocco|-2|Cut ties in 2021 over Western Sahara
Algeria|Mali|-2|Shot down a Malian drone in 2025
Algeria|Tunisia|2
Algeria|Italy|2|Gas pipeline partners
Algeria|W. Sahara|2|Backs the Polisario Front
Algeria|South Africa|1
Algeria|Turkey|1
Algeria|Qatar|1
Algeria|Mauritania|1
Algeria|Libya|1
Algeria|Palestine|2
Algeria|Niger|-1
Algeria|Burkina Faso|-1
Morocco|Spain|1
Morocco|United Arab Emirates|2
Morocco|Mauritania|1
Morocco|Senegal|1
Morocco|Côte d'Ivoire|1
Morocco|Gabon|1
Morocco|Kenya|1
Morocco|Mali|1|Offers Sahel states access to the Atlantic
Morocco|Burkina Faso|1
Morocco|Niger|1
Morocco|W. Sahara|-2|Controls most of the territory the Polisario claims
Morocco|South Africa|-1
Morocco|Tunisia|-1|Rift since 2022
Nigeria|Niger|-1|Tension since Niger’s 2023 coup
Nigeria|Cameroon|1
Nigeria|Chad|1
Nigeria|Benin|1
South Africa|Zimbabwe|2
South Africa|Namibia|2
South Africa|Botswana|2
South Africa|Lesotho|2
South Africa|Mozambique|1
South Africa|Brazil|1
South Africa|Cuba|1
South Africa|Iran|1
South Africa|Palestine|2
South Africa|Rwanda|-1|Its troops died fighting M23 in Congo in 2025
South Africa|Germany|1
South Africa|United Kingdom|1
Dem. Rep. Congo|Rwanda|-2|War with Rwanda-backed M23; a 2025 peace deal is fragile
Dem. Rep. Congo|Burundi|2|Burundian troops fight beside Congo’s army
Dem. Rep. Congo|Angola|1
Dem. Rep. Congo|United States of America|1|2025 peace and minerals deal
Dem. Rep. Congo|Uganda|1|Joint operations against rebels
Rwanda|Burundi|-2|Border closed since 2024
Rwanda|Belgium|-2|Cut ties in 2025
Rwanda|Mozambique|2|Rwandan troops fight insurgents in Cabo Delgado
Rwanda|Central African Rep.|2|Rwandan troops protect the government
Rwanda|Uganda|1
Rwanda|Kenya|1
Rwanda|Qatar|1
Rwanda|Benin|1
Kenya|Uganda|1
Kenya|Tanzania|1
Kenya|Somalia|1|Troops for the AU mission
Kenya|Haiti|1|Led the security mission in Haiti
Kenya|S. Sudan|1
Kenya|Sudan|-1|Hosted the RSF’s parallel government talks
Sudan|Eritrea|2
Sudan|Iran|1
Sudan|Qatar|1
Sudan|Chad|-2|Accuses Chad of supplying the RSF
Somalia|Qatar|1
Somalia|Eritrea|1
Somalia|Somaliland|-2|Claims Somaliland, which has ruled itself since 1991
Somaliland|Taiwan|2|Mutual offices
Somaliland|Djibouti|-1
Eritrea|Djibouti|-1|Border dispute
Mali|Côte d'Ivoire|-1
Burkina Faso|Côte d'Ivoire|-1|Accuses it of harbouring opponents
Niger|Benin|-1|Border closed since 2023
Mali|Turkey|1|Turkish drones
Burkina Faso|Turkey|1
Niger|Turkey|1
Mali|Togo|1
Burkina Faso|Togo|1
Niger|Togo|1
Niger|Chad|1
Chad|Hungary|1|Hungarian troops in Chad
Chad|Cameroon|1
Chad|Central African Rep.|1
Ghana|Côte d'Ivoire|1
Ghana|Burkina Faso|1
Senegal|Gambia|2
Senegal|Mauritania|1
Senegal|Mali|1
Cameroon|Eq. Guinea|1
Cameroon|Gabon|1
Cameroon|Congo|1
Uganda|S. Sudan|2|Ugandan troops back the government
Uganda|Tanzania|1
Uganda|Burundi|1
Uganda|Russia|1
Tanzania|Mozambique|1
Tanzania|Burundi|1
Zimbabwe|Mozambique|1
Zimbabwe|Russia|1
Zimbabwe|Belarus|1
Angola|Portugal|2
Angola|Cuba|1
Angola|Brazil|1
Angola|United States of America|1|Lobito rail corridor
Mozambique|Portugal|1
Libya|Italy|1
Libya|Qatar|1
Libya|Tunisia|1
Libya|Egypt|0
Tunisia|Italy|1
Mauritania|Spain|1
Mauritania|Mali|-1
Brazil|Uruguay|2
Brazil|Portugal|2
Brazil|China|2|Largest trade partner; BRICS
Brazil|Paraguay|1
Brazil|Bolivia|1
Brazil|Colombia|1
Brazil|Chile|1
Brazil|France|1
Brazil|Mexico|1
Brazil|Russia|1
Brazil|Argentina|-1|Lula and Milei barely speak
Brazil|Venezuela|-1|Blocked Venezuela from BRICS in 2024
Argentina|Italy|2
Argentina|Chile|1
Argentina|Uruguay|1
Argentina|Paraguay|1
Argentina|Ecuador|1
Argentina|Venezuela|-2|Expelled Argentine diplomats in 2024
Mexico|Canada|1
Mexico|Cuba|1
Mexico|Guatemala|1
Mexico|Colombia|1
Mexico|Ecuador|-2|Cut ties after Ecuador raided its embassy in 2024
Mexico|Peru|-2|Peru cut ties in 2025 over an asylum case
Mexico|Spain|-1|Row over an apology for the conquest
Colombia|Spain|1
Colombia|Ecuador|-1|Tariff war in 2025
Colombia|Peru|-1|Dispute over an Amazon island in 2025
Venezuela|Cuba|2
Venezuela|Nicaragua|2
Venezuela|Belarus|1
Venezuela|Guyana|-2|Claims two-thirds of Guyana
Venezuela|Peru|-1
Venezuela|Chile|-1
Venezuela|Ecuador|-2
Venezuela|Panama|-1
Venezuela|Bolivia|-1
Cuba|Nicaragua|2
Cuba|Vietnam|1
Cuba|Belarus|1
Nicaragua|Costa Rica|-1
Nicaragua|Iran|1
Peru|Chile|1
Peru|Ecuador|1
Peru|Brazil|1
Chile|Uruguay|1
Chile|Bolivia|-1|Bolivia wants its lost coast back
Guyana|Brazil|1
Guyana|Suriname|1
Guyana|Trinidad and Tobago|1
Paraguay|Taiwan|2|Recognises Taiwan
Guatemala|Taiwan|2|Recognises Taiwan
Guatemala|Belize|-1|Border claim before the ICJ
Belize|Taiwan|2|Recognises Taiwan
Haiti|Taiwan|2|Recognises Taiwan
Haiti|Dominican Rep.|-1|Border and migration tension
St. Kitts and Nevis|Taiwan|2|Recognises Taiwan
Saint Lucia|Taiwan|2|Recognises Taiwan
St. Vin. and Gren.|Taiwan|2|Recognises Taiwan
Marshall Is.|Taiwan|2|Recognises Taiwan
Palau|Taiwan|2|Recognises Taiwan
eSwatini|Taiwan|2|Recognises Taiwan
Costa Rica|Panama|1
Canada|United Kingdom|2
Canada|France|2
Hungary|Serbia|2
Hungary|Slovakia|2
Hungary|Azerbaijan|1
Serbia|Kosovo|-2|Does not recognise Kosovo
Serbia|Croatia|-1
Serbia|Albania|-1
Serbia|Montenegro|-1
Serbia|Belarus|1
Serbia|Azerbaijan|1
Serbia|Israel|1
Serbia|Macedonia|1
Kosovo|Albania|2
Kosovo|Germany|1
Kosovo|Macedonia|1
Kosovo|United Kingdom|1
Kosovo|United States of America|2|Backed its independence
Albania|Italy|2|Migrant-centre deal
Greece|Cyprus|2
Greece|Macedonia|0
Cyprus|N. Cyprus|-2|Divided island
Cyprus|France|1
N. Cyprus|Azerbaijan|1
Armenia|Azerbaijan|-1|A 2025 peace accord, after Azerbaijan retook Karabakh
Armenia|Belarus|-1
Armenia|Georgia|1
Armenia|Greece|1
Armenia|Cyprus|1
Azerbaijan|Kazakhstan|1
Azerbaijan|Uzbekistan|1
Azerbaijan|Turkmenistan|1
Azerbaijan|Georgia|1
Azerbaijan|Italy|1|Main buyer of its oil
Georgia|Turkey|1
Georgia|China|1
Moldova|Romania|2
Moldova|France|1
Moldova|Germany|1
Belarus|Poland|-2|Migrant pushes and closed border crossings
Belarus|Lithuania|-2
Belarus|Latvia|-2
Belarus|Kazakhstan|1
Poland|Lithuania|2
Poland|Finland|2
Poland|Czechia|1
Poland|Hungary|-1|Split over Russia
Lithuania|Latvia|2
Lithuania|Estonia|2
Lithuania|Taiwan|1
Latvia|Estonia|2
Estonia|Finland|2
Finland|Sweden|2
Denmark|Greenland|2
Denmark|Faeroe Is.|2
Netherlands|Aruba|2
Netherlands|Curaçao|2
Spain|Portugal|2
Spain|Italy|1
Spain|Palestine|1|Recognised Palestine in 2024
Spain|Chile|1
Spain|Venezuela|-1
Portugal|Cabo Verde|2
Portugal|Timor-Leste|1
Portugal|São Tomé and Principe|1
Portugal|Guinea-Bissau|1
Austria|Switzerland|2
Austria|Liechtenstein|2
Austria|Hungary|1
Switzerland|Liechtenstein|2|Customs union and shared franc
Switzerland|Germany|2
Switzerland|France|1
Switzerland|Italy|1
Ireland|Palestine|2|Recognised Palestine in 2024
Ireland|United States of America|1
Slovakia|Czechia|2
Czechia|Taiwan|1
Romania|Bulgaria|1
Bulgaria|Macedonia|-1|Blocks its EU talks over language and history
Bulgaria|Greece|1
Bulgaria|Turkey|1
Macedonia|Albania|1
Croatia|Slovenia|1
Croatia|Bosnia and Herz.|0
Bosnia and Herz.|United States of America|1
Montenegro|United States of America|1
Italy|Israel|0
Norway|Palestine|1|Recognised Palestine in 2024
Iraq|Turkey|0
Iraq|Jordan|1
Iraq|Saudi Arabia|1
Iraq|Kuwait|1
Syria|Qatar|2|Backed the opposition that took power
Syria|Jordan|1
Syria|Lebanon|0
Syria|Russia|0|Russia sheltered Assad but keeps talking to the new rulers
Syria|Ukraine|1
Syria|United States of America|1|Sanctions lifted in 2025
Lebanon|Qatar|1
Lebanon|United States of America|1
Jordan|Palestine|2
Qatar|Palestine|1
Qatar|Afghanistan|1|Hosts Taliban talks
Bahrain|United Kingdom|2|British naval base
Palestine|Turkey|1
Palestine|Iran|1
Palestine|Saudi Arabia|1
Afghanistan|Iran|0
Afghanistan|Uzbekistan|1
Afghanistan|Turkmenistan|1
Afghanistan|Tajikistan|-1|Tajikistan backs anti-Taliban groups
Kazakhstan|Uzbekistan|2
Uzbekistan|Tajikistan|1
Uzbekistan|Kyrgyzstan|1
Uzbekistan|Turkmenistan|1
Kyrgyzstan|Tajikistan|1|Settled their border in 2025
Turkmenistan|Iran|1
Mongolia|United States of America|1
Bangladesh|Myanmar|-1|A million Rohingya refugees
Bangladesh|United States of America|1
Sri Lanka|Maldives|1
Myanmar|Belarus|1
Myanmar|India|0
Thailand|Cambodia|-2|Border fighting in 2025
Thailand|Laos|1
Thailand|Malaysia|1
Thailand|Vietnam|1
Cambodia|Vietnam|1
Cambodia|Laos|1
Laos|Vietnam|2|“Special relationship”
Vietnam|Philippines|0
Vietnam|Australia|1
Philippines|South Korea|1
Philippines|Taiwan|1
Indonesia|Malaysia|1
Indonesia|Singapore|1
Indonesia|Timor-Leste|1
Indonesia|Papua New Guinea|1
Indonesia|Russia|1
Malaysia|Singapore|1
Malaysia|Brunei|2
Malaysia|Philippines|0|Philippine claim to Sabah
Singapore|Brunei|1
Puerto Rico|United States of America|2|A US territory
Honduras|United States of America|1
Jamaica|United States of America|1
Bahamas|United States of America|1
Barbados|United Kingdom|1
Antigua and Barb.|United Kingdom|1
Grenada|Cuba|1
Dominica|China|1
Monaco|France|2|France guarantees Monaco’s defence
San Marino|Italy|2
Andorra|France|2|Co-prince and defence guarantee
Andorra|Spain|2|Co-prince and defence guarantee
`;

/* ---------- derived lookups ---------- */

const pairKey = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

export interface Tie {
  level: Level;
  note: string | null;
  /** Where the level comes from: a listed pair, or membership of a bloc. */
  from: 'listed' | string;
}

const LISTED = new Map<string, Tie>();
for (const line of TIES.trim().split('\n')) {
  const [a, b, l, note] = line.split('|');
  LISTED.set(pairKey(a, b), { level: Number(l) as Level, note: note || null, from: 'listed' });
}

const defenceBlocs = BLOCS.filter((b) => b.kind === 'defence');
/** Groupings whose members are taken as close friends unless a pair says otherwise. */
const CLOSE_IDS = new Set(['nato', 'csto', 'gcc', 'aes', 'eu', 'fiveeyes']);
const FRIENDLY_IDS = new Set(['africa']);
const blocsOf = new Map<string, Bloc[]>();
for (const b of BLOCS) for (const m of b.members) blocsOf.set(m, [...(blocsOf.get(m) ?? []), b]);

const PACT_BY = new Map<string, string>();
for (const [a, b, name] of PACTS) PACT_BY.set(pairKey(a, b), name);
const SECURITY_BY = new Map<string, string>();
for (const [a, b, name] of SECURITY) SECURITY_BY.set(pairKey(a, b), name);

/** The bloc of each country on the world map (first defence bloc it belongs to). */
export function blocOf(country: string): Bloc | null {
  return defenceBlocs.find((b) => b.members.includes(country)) ?? null;
}
export const blocsFor = (country: string) => blocsOf.get(country) ?? [];

const shared = (a: string, b: string) => (blocsOf.get(a) ?? []).filter((x) => x.members.includes(b));

/** How two countries get on: a listed pair first, then shared blocs, else neutral. */
export function tie(a: string, b: string): Tie {
  if (a === b) return { level: 2, note: null, from: 'self' };
  const listed = LISTED.get(pairKey(a, b));
  if (listed) return listed;
  const pact = PACT_BY.get(pairKey(a, b));
  if (pact) return { level: 2, note: pact, from: 'pact' };
  const both = shared(a, b);
  const free = both.filter((x) => !x.caveat?.[a] && !x.caveat?.[b]);
  const close = free.find((x) => CLOSE_IDS.has(x.id));
  if (close) return { level: 2, note: `Both in ${close.short}`, from: close.id };
  const friendly = free.find((x) => FRIENDLY_IDS.has(x.id));
  if (friendly) return { level: 1, note: `Both in ${friendly.short}`, from: friendly.id };
  // Russia and the NATO and EU states have been at odds since 2022.
  const west = (x: string) => NATO.includes(x) || EU.includes(x);
  if ((a === 'Russia' && west(b)) || (b === 'Russia' && west(a))) return { level: -1, note: 'Sanctions and expulsions since 2022', from: 'rule' };
  return { level: 0, note: null, from: 'none' };
}

/* ---------- military alignment ---------- */

export type Stance = 'self' | 'treaty' | 'partner' | 'rival' | 'none';

export const STANCE: Record<Exclude<Stance, 'none' | 'self'>, { label: string; color: string }> = {
  treaty: { label: 'Treaty ally', color: '#3d9a63' },
  partner: { label: 'Security partner', color: '#8fc49a' },
  rival: { label: 'Military rival', color: '#c9434b' },
};

export interface Alignment {
  stance: Stance;
  /** The treaty, bloc or dispute behind it. */
  why: string | null;
}

/** Whether two countries are bound to defend each other, partners, or rivals. */
export function alignment(a: string, b: string): Alignment {
  if (a === b) return { stance: 'self', why: null };
  const pact = PACT_BY.get(pairKey(a, b));
  if (pact) return { stance: 'treaty', why: pact };
  const both = shared(a, b);
  // The Pacific "bloc" is a web of treaties with the US, not a pact among all its members.
  const def = both.find((x) => x.kind === 'defence' && x.id !== 'pacific' && x.id !== 'other' && !x.caveat?.[a] && !x.caveat?.[b]);
  if (def) return { stance: 'treaty', why: def.short };
  const t = LISTED.get(pairKey(a, b));
  if (t?.level === -2) return { stance: 'rival', why: t.note ?? 'Hostile relations' };
  const sec = SECURITY_BY.get(pairKey(a, b));
  if (sec) return { stance: 'partner', why: sec };
  const part = both.find((x) => x.id !== 'pacific' && x.id !== 'other' && !x.caveat?.[a] && !x.caveat?.[b]);
  if (part) {
    // An SCO seat does not make India and Pakistan partners.
    if ((t?.level ?? 0) < 0) return { stance: 'none', why: null };
    return { stance: 'partner', why: part.short };
  }
  return { stance: 'none', why: null };
}

/** Everyone with a non-neutral tie to a country, closest first. */
export function tiesOf(country: string, all: string[]): { name: string; tie: Tie }[] {
  return all
    .filter((n) => n !== country)
    .map((n) => ({ name: n, tie: tie(country, n) }))
    .filter((x) => x.tie.level !== 0)
    .sort((x, y) => y.tie.level - x.tie.level || (x.tie.from === 'listed' ? -1 : 0) - (y.tie.from === 'listed' ? -1 : 0) || x.name.localeCompare(y.name));
}

export function alignmentsOf(country: string, all: string[]): { name: string; a: Alignment }[] {
  const order: Stance[] = ['treaty', 'partner', 'rival'];
  return all
    .filter((n) => n !== country)
    .map((n) => ({ name: n, a: alignment(country, n) }))
    .filter((x) => x.a.stance !== 'none')
    .sort((x, y) => order.indexOf(x.a.stance) - order.indexOf(y.a.stance) || x.name.localeCompare(y.name));
}

export const DIPLOMACY_SOURCE =
  'Hand-curated from treaties, alliance member lists and the diplomatic record, as of early 2026. A judgement, not a measurement.';
