/**
 * ILLUSTRATIVE DATA ONLY.
 *
 * Every number in this file is a hand-written placeholder chosen to make the
 * layout believable. None of it is live, sourced, or suitable for decisions.
 * The real product should replace this module with an API that returns the
 * same shape plus a source, reporting period and update timestamp per value.
 */

export type Region =
  | 'North America'
  | 'Latin America'
  | 'Europe'
  | 'Middle East'
  | 'Africa'
  | 'Asia'
  | 'Oceania';

export type LinkKind = 'exports' | 'imports' | 'energy' | 'food' | 'tech' | 'capital' | 'people';

export interface Partner {
  /** Country name exactly as it appears in the map geometry. */
  name: string;
  kind: LinkKind;
  /** Share of the relevant flow, in percent. */
  share: number;
}

export type IssueStatus = 'Verified' | 'Developing' | 'Online sentiment';

export interface Issue {
  title: string;
  channel: string;
  severity: 'High' | 'Medium' | 'Low';
  status: IssueStatus;
}

export interface Company {
  name: string;
  sector: string;
  note: string;
}

export interface CountryProfile {
  /** Name as used by the map geometry (join key). */
  name: string;
  display: string;
  iso2?: string;
  region: Region;
  curated: boolean;
  gdp: number; // USD bn
  gdpPc: number; // USD
  growth: number; // % y/y
  inflation: number; // % y/y
  unemployment: number; // %
  debt: number; // gov. debt, % GDP
  fiscal: number; // gov. fiscal balance, % GDP
  currentAccount: number; // % GDP
  tradeOpenness: number; // (exports + imports) / GDP, %
  finExposure: number; // index 0–100
  geoPressure: number; // index 0–100
  leverage: number; // index 0–100
  energyImporter: boolean;
  exportConcentration: number; // index 0–100
  reserveMonths: number; // months of import cover
  partners: Partner[];
  issues: Issue[];
  companies: Company[];
  leverageNote?: string;
}

type Row = [
  name: string,
  display: string,
  iso2: string,
  region: Region,
  gdp: number,
  gdpPc: number,
  growth: number,
  inflation: number,
  unemployment: number,
  debt: number,
  fiscal: number,
  currentAccount: number,
  tradeOpenness: number,
  finExposure: number,
  geoPressure: number,
  leverage: number,
  energyImporter: boolean,
  exportConcentration: number,
  reserveMonths: number,
];

// prettier-ignore
const ROWS: Row[] = [
  ['United States of America', 'United States', 'US', 'North America', 29200, 86000, 2.0, 2.9, 4.2, 121, -6.5, -3.9, 25, 35, 40, 95, false, 20, 3],
  ['China', 'China', 'CN', 'Asia', 18700, 13300, 4.7, 0.3, 5.1, 90, -7.0, 1.6, 37, 45, 55, 92, true, 25, 15],
  ['India', 'India', 'IN', 'Asia', 4000, 2800, 6.5, 3.5, 7.8, 82, -7.8, -1.0, 46, 40, 35, 55, true, 25, 9],
  ['Japan', 'Japan', 'JP', 'Asia', 4100, 33000, 0.7, 2.8, 2.5, 235, -4.5, 4.5, 45, 30, 30, 70, true, 30, 14],
  ['Germany', 'Germany', 'DE', 'Europe', 4700, 55000, 0.1, 2.2, 3.4, 63, -2.5, 6.0, 85, 35, 25, 72, true, 30, 2],
  ['United Kingdom', 'United Kingdom', 'GB', 'Europe', 3600, 52000, 1.1, 3.4, 4.5, 101, -4.5, -2.8, 63, 50, 25, 65, true, 25, 2],
  ['France', 'France', 'FR', 'Europe', 3200, 47000, 0.8, 1.2, 7.4, 113, -5.5, 0.2, 68, 45, 25, 60, true, 25, 2],
  ['Italy', 'Italy', 'IT', 'Europe', 2400, 40000, 0.6, 1.5, 6.3, 135, -3.5, 1.1, 60, 55, 25, 55, true, 25, 2],
  ['Spain', 'Spain', 'ES', 'Europe', 1800, 35000, 2.6, 2.6, 10.5, 101, -3.0, 3.0, 65, 45, 20, 50, true, 25, 2],
  ['Netherlands', 'Netherlands', 'NL', 'Europe', 1200, 64000, 1.5, 3.2, 3.7, 44, -2.0, 9.0, 160, 50, 25, 70, true, 25, 3],
  ['Poland', 'Poland', 'PL', 'Europe', 900, 24000, 3.2, 3.8, 3.0, 57, -6.0, 0.5, 105, 35, 55, 45, true, 30, 6],
  ['Norway', 'Norway', 'NO', 'Europe', 480, 87000, 1.2, 3.0, 4.0, 43, 10.0, 15.0, 70, 20, 25, 65, false, 70, 15],
  ['Ukraine', 'Ukraine', 'UA', 'Europe', 190, 5000, 2.5, 12.0, 11.0, 95, -20.0, -6.0, 75, 90, 95, 50, true, 50, 6],
  ['Russia', 'Russia', 'RU', 'Europe', 2100, 14800, 1.0, 8.5, 2.5, 20, -1.7, 2.5, 45, 70, 90, 75, false, 60, 18],
  ['Turkey', 'Türkiye', 'TR', 'Europe', 1300, 15000, 3.0, 35.0, 8.6, 25, -3.0, -2.2, 60, 75, 60, 55, true, 25, 4],
  ['Canada', 'Canada', 'CA', 'North America', 2200, 54000, 1.2, 2.2, 6.7, 107, -1.5, -0.8, 67, 35, 25, 60, false, 75, 2],
  ['Mexico', 'Mexico', 'MX', 'Latin America', 1900, 14000, 0.8, 4.0, 2.7, 58, -4.0, -0.6, 78, 45, 30, 50, false, 80, 4],
  ['Brazil', 'Brazil', 'BR', 'Latin America', 2200, 10300, 2.3, 4.8, 6.6, 87, -7.5, -2.7, 34, 45, 30, 60, false, 45, 13],
  ['Argentina', 'Argentina', 'AR', 'Latin America', 600, 13000, 4.5, 40.0, 7.0, 80, 0.5, -0.5, 30, 85, 50, 45, false, 45, 3],
  ['Chile', 'Chile', 'CL', 'Latin America', 330, 17000, 2.4, 4.3, 8.5, 42, -2.0, -2.0, 60, 40, 30, 75, true, 55, 6],
  ['Colombia', 'Colombia', 'CO', 'Latin America', 420, 8000, 2.5, 5.0, 9.5, 60, -6.5, -2.5, 40, 55, 45, 40, false, 55, 7],
  ['Saudi Arabia', 'Saudi Arabia', 'SA', 'Middle East', 1100, 32000, 3.0, 1.9, 3.5, 30, -3.0, -1.5, 55, 30, 45, 85, false, 75, 14],
  ['United Arab Emirates', 'United Arab Emirates', 'AE', 'Middle East', 540, 50000, 4.0, 2.2, 2.8, 30, 5.0, 8.0, 170, 40, 40, 75, false, 50, 6],
  ['Qatar', 'Qatar', 'QA', 'Middle East', 220, 80000, 2.0, 1.5, 0.2, 40, 4.0, 17.0, 90, 30, 40, 80, false, 85, 8],
  ['Iran', 'Iran', 'IR', 'Middle East', 400, 4600, 2.5, 35.0, 9.0, 35, -4.0, 2.0, 40, 80, 90, 65, false, 80, 10],
  ['Egypt', 'Egypt', 'EG', 'Africa', 350, 3300, 4.0, 15.0, 6.5, 90, -7.0, -5.0, 40, 85, 65, 55, true, 30, 5],
  ['Nigeria', 'Nigeria', 'NG', 'Africa', 250, 1100, 3.3, 24.0, 5.0, 50, -4.0, 4.0, 35, 65, 65, 45, true, 85, 6],
  ['South Africa', 'South Africa', 'ZA', 'Africa', 400, 6300, 1.0, 3.2, 32.0, 75, -5.5, -1.5, 55, 60, 45, 50, true, 45, 4],
  ['Kenya', 'Kenya', 'KE', 'Africa', 120, 2200, 4.8, 4.0, 5.5, 70, -5.5, -4.0, 33, 65, 45, 30, true, 40, 4],
  ['Ethiopia', 'Ethiopia', 'ET', 'Africa', 150, 1200, 6.5, 20.0, 3.5, 40, -2.0, -3.0, 25, 75, 75, 25, true, 60, 1.5],
  ['Ghana', 'Ghana', 'GH', 'Africa', 80, 2300, 4.0, 20.0, 14.0, 80, -5.0, 1.0, 60, 75, 50, 30, true, 70, 3],
  ['Bangladesh', 'Bangladesh', 'BD', 'Asia', 450, 2600, 4.0, 9.0, 4.5, 40, -4.5, -0.6, 30, 65, 55, 25, true, 85, 4],
  ['Pakistan', 'Pakistan', 'PK', 'Asia', 370, 1500, 3.0, 5.0, 8.0, 72, -6.0, -0.5, 30, 85, 70, 30, true, 55, 2.5],
  ['Sri Lanka', 'Sri Lanka', 'LK', 'Asia', 80, 3800, 4.0, 1.0, 4.5, 100, -6.0, 0.5, 50, 75, 50, 15, true, 50, 3],
  ['Vietnam', 'Vietnam', 'VN', 'Asia', 480, 4700, 6.8, 3.4, 2.2, 34, -3.5, 4.5, 175, 50, 40, 55, true, 45, 3],
  ['Thailand', 'Thailand', 'TH', 'Asia', 530, 7500, 2.5, 0.3, 1.0, 64, -4.0, 2.0, 120, 40, 40, 45, true, 30, 8],
  ['Malaysia', 'Malaysia', 'MY', 'Asia', 420, 12500, 4.5, 1.5, 3.2, 69, -4.0, 1.5, 135, 45, 30, 65, false, 35, 5],
  ['Singapore', 'Singapore', 'SG', 'Asia', 550, 90000, 2.5, 2.0, 2.0, 170, 3.0, 18.0, 320, 25, 20, 82, true, 30, 7],
  ['Indonesia', 'Indonesia', 'ID', 'Asia', 1400, 5100, 5.0, 1.9, 4.8, 40, -2.5, -0.8, 40, 45, 30, 60, false, 35, 6],
  ['Philippines', 'Philippines', 'PH', 'Asia', 460, 4000, 5.7, 2.0, 4.0, 60, -5.5, -3.0, 70, 45, 45, 35, true, 40, 7],
  ['South Korea', 'South Korea', 'KR', 'Asia', 1800, 35000, 1.5, 2.1, 2.8, 53, -1.5, 4.5, 85, 40, 45, 80, true, 30, 7],
  ['Taiwan', 'Taiwan', 'TW', 'Asia', 800, 34000, 4.0, 2.0, 3.4, 27, 0.0, 13.0, 120, 40, 85, 98, true, 60, 15],
  ['Kazakhstan', 'Kazakhstan', 'KZ', 'Asia', 290, 14000, 4.5, 8.5, 4.7, 23, -2.5, -2.0, 60, 45, 55, 50, false, 70, 8],
  ['Australia', 'Australia', 'AU', 'Oceania', 1800, 66000, 1.5, 2.8, 4.2, 50, -1.5, -1.8, 50, 35, 20, 60, false, 45, 3],
];

const US = 'United States of America';

// prettier-ignore
const PARTNERS: Record<string, Partner[]> = {
  [US]: [
    { name: 'Mexico', kind: 'exports', share: 16 }, { name: 'Canada', kind: 'energy', share: 52 },
    { name: 'China', kind: 'imports', share: 14 }, { name: 'Taiwan', kind: 'tech', share: 40 },
    { name: 'Japan', kind: 'capital', share: 13 }, { name: 'United Kingdom', kind: 'capital', share: 9 },
  ],
  China: [
    { name: US, kind: 'exports', share: 15 }, { name: 'Russia', kind: 'energy', share: 20 },
    { name: 'Brazil', kind: 'food', share: 23 }, { name: 'Australia', kind: 'imports', share: 60 },
    { name: 'Taiwan', kind: 'tech', share: 35 }, { name: 'Saudi Arabia', kind: 'energy', share: 15 },
  ],
  India: [
    { name: US, kind: 'exports', share: 18 }, { name: 'Russia', kind: 'energy', share: 35 },
    { name: 'China', kind: 'imports', share: 15 }, { name: 'United Arab Emirates', kind: 'people', share: 18 },
    { name: 'Saudi Arabia', kind: 'energy', share: 15 },
  ],
  Japan: [
    { name: 'China', kind: 'exports', share: 18 }, { name: US, kind: 'exports', share: 20 },
    { name: 'Australia', kind: 'energy', share: 38 }, { name: 'Saudi Arabia', kind: 'energy', share: 40 },
    { name: 'Taiwan', kind: 'tech', share: 25 },
  ],
  Germany: [
    { name: US, kind: 'exports', share: 10 }, { name: 'China', kind: 'imports', share: 12 },
    { name: 'Norway', kind: 'energy', share: 45 }, { name: 'France', kind: 'exports', share: 8 },
    { name: 'Netherlands', kind: 'imports', share: 9 }, { name: 'Taiwan', kind: 'tech', share: 20 },
  ],
  'United Kingdom': [
    { name: US, kind: 'exports', share: 21 }, { name: 'Germany', kind: 'imports', share: 13 },
    { name: 'Norway', kind: 'energy', share: 55 }, { name: 'Netherlands', kind: 'capital', share: 8 },
    { name: 'China', kind: 'imports', share: 11 },
  ],
  France: [
    { name: 'Germany', kind: 'exports', share: 14 }, { name: 'Italy', kind: 'exports', share: 8 },
    { name: 'Norway', kind: 'energy', share: 30 }, { name: US, kind: 'capital', share: 12 },
    { name: 'China', kind: 'imports', share: 9 },
  ],
  Russia: [
    { name: 'China', kind: 'exports', share: 35 }, { name: 'India', kind: 'exports', share: 17 },
    { name: 'Turkey', kind: 'exports', share: 8 }, { name: 'China', kind: 'tech', share: 70 },
    { name: 'Kazakhstan', kind: 'imports', share: 6 },
  ],
  Brazil: [
    { name: 'China', kind: 'exports', share: 30 }, { name: US, kind: 'exports', share: 11 },
    { name: 'Argentina', kind: 'imports', share: 5 }, { name: 'Russia', kind: 'food', share: 25 },
    { name: US, kind: 'capital', share: 22 },
  ],
  Mexico: [
    { name: US, kind: 'exports', share: 80 }, { name: US, kind: 'energy', share: 70 },
    { name: 'China', kind: 'imports', share: 20 }, { name: US, kind: 'people', share: 95 },
    { name: 'Canada', kind: 'capital', share: 8 },
  ],
  Canada: [
    { name: US, kind: 'exports', share: 76 }, { name: 'China', kind: 'imports', share: 13 },
    { name: 'Mexico', kind: 'imports', share: 6 }, { name: 'Japan', kind: 'exports', share: 3 },
    { name: US, kind: 'capital', share: 50 },
  ],
  Bangladesh: [
    { name: US, kind: 'exports', share: 18 }, { name: 'Germany', kind: 'exports', share: 15 },
    { name: 'China', kind: 'imports', share: 26 }, { name: 'India', kind: 'food', share: 18 },
    { name: 'Qatar', kind: 'energy', share: 40 }, { name: 'Saudi Arabia', kind: 'people', share: 25 },
  ],
  Pakistan: [
    { name: US, kind: 'exports', share: 17 }, { name: 'China', kind: 'capital', share: 30 },
    { name: 'Saudi Arabia', kind: 'energy', share: 30 }, { name: 'Qatar', kind: 'energy', share: 25 },
    { name: 'United Arab Emirates', kind: 'people', share: 20 },
  ],
  'Sri Lanka': [
    { name: US, kind: 'exports', share: 23 }, { name: 'India', kind: 'imports', share: 25 },
    { name: 'China', kind: 'capital', share: 20 }, { name: 'United Arab Emirates', kind: 'energy', share: 30 },
    { name: 'Saudi Arabia', kind: 'people', share: 18 },
  ],
  Egypt: [
    { name: 'Saudi Arabia', kind: 'capital', share: 20 }, { name: 'United Arab Emirates', kind: 'capital', share: 25 },
    { name: 'Russia', kind: 'food', share: 45 }, { name: 'Ukraine', kind: 'food', share: 15 },
    { name: 'Italy', kind: 'exports', share: 8 }, { name: 'Qatar', kind: 'energy', share: 20 },
  ],
  Nigeria: [
    { name: 'India', kind: 'exports', share: 15 }, { name: 'Spain', kind: 'exports', share: 10 },
    { name: 'China', kind: 'imports', share: 25 }, { name: 'Netherlands', kind: 'energy', share: 20 },
    { name: US, kind: 'people', share: 30 },
  ],
  'South Africa': [
    { name: 'China', kind: 'exports', share: 11 }, { name: 'Germany', kind: 'exports', share: 8 },
    { name: US, kind: 'exports', share: 8 }, { name: 'Saudi Arabia', kind: 'energy', share: 22 },
    { name: 'United Kingdom', kind: 'capital', share: 25 },
  ],
  Ukraine: [
    { name: 'Poland', kind: 'exports', share: 13 }, { name: 'China', kind: 'exports', share: 8 },
    { name: 'Germany', kind: 'capital', share: 20 }, { name: US, kind: 'capital', share: 35 },
    { name: 'Turkey', kind: 'imports', share: 9 },
  ],
  Turkey: [
    { name: 'Germany', kind: 'exports', share: 8 }, { name: 'Russia', kind: 'energy', share: 45 },
    { name: 'China', kind: 'imports', share: 12 }, { name: 'United Kingdom', kind: 'capital', share: 10 },
    { name: 'Iran', kind: 'energy', share: 10 },
  ],
  Taiwan: [
    { name: 'China', kind: 'exports', share: 35 }, { name: US, kind: 'exports', share: 23 },
    { name: 'Japan', kind: 'tech', share: 30 }, { name: 'Qatar', kind: 'energy', share: 25 },
    { name: 'Australia', kind: 'energy', share: 30 },
  ],
  'South Korea': [
    { name: 'China', kind: 'exports', share: 20 }, { name: US, kind: 'exports', share: 18 },
    { name: 'Saudi Arabia', kind: 'energy', share: 33 }, { name: 'Australia', kind: 'energy', share: 25 },
    { name: 'Japan', kind: 'tech', share: 20 },
  ],
  Vietnam: [
    { name: US, kind: 'exports', share: 29 }, { name: 'China', kind: 'imports', share: 37 },
    { name: 'South Korea', kind: 'capital', share: 18 }, { name: 'Japan', kind: 'capital', share: 12 },
    { name: 'Taiwan', kind: 'tech', share: 15 },
  ],
  'Saudi Arabia': [
    { name: 'China', kind: 'exports', share: 17 }, { name: 'Japan', kind: 'exports', share: 10 },
    { name: 'India', kind: 'exports', share: 10 }, { name: 'South Korea', kind: 'exports', share: 9 },
    { name: US, kind: 'capital', share: 30 },
  ],
  Iran: [
    { name: 'China', kind: 'exports', share: 90 }, { name: 'United Arab Emirates', kind: 'imports', share: 30 },
    { name: 'Turkey', kind: 'imports', share: 12 }, { name: 'Russia', kind: 'food', share: 30 },
  ],
  Argentina: [
    { name: 'Brazil', kind: 'exports', share: 16 }, { name: 'China', kind: 'exports', share: 8 },
    { name: US, kind: 'capital', share: 30 }, { name: 'Brazil', kind: 'imports', share: 24 },
    { name: 'Chile', kind: 'energy', share: 10 },
  ],
  Singapore: [
    { name: 'China', kind: 'exports', share: 14 }, { name: US, kind: 'exports', share: 11 },
    { name: 'Malaysia', kind: 'imports', share: 12 }, { name: 'Qatar', kind: 'energy', share: 25 },
    { name: 'Taiwan', kind: 'tech', share: 20 }, { name: US, kind: 'capital', share: 20 },
  ],
  Australia: [
    { name: 'China', kind: 'exports', share: 33 }, { name: 'Japan', kind: 'exports', share: 13 },
    { name: 'South Korea', kind: 'exports', share: 8 }, { name: 'Malaysia', kind: 'energy', share: 15 },
    { name: US, kind: 'capital', share: 25 },
  ],
};

// prettier-ignore
const COMPANIES: Record<string, Company[]> = {
  [US]: [
    { name: 'Apple', sector: 'Technology', note: 'Global consumer hardware' },
    { name: 'Microsoft', sector: 'Technology', note: 'Software & cloud' },
    { name: 'NVIDIA', sector: 'Semiconductors', note: 'AI accelerators' },
    { name: 'JPMorgan Chase', sector: 'Financials', note: 'Largest US bank' },
  ],
  China: [
    { name: 'CATL', sector: 'Batteries', note: 'EV supply chain anchor' },
    { name: 'Tencent', sector: 'Technology', note: 'Platforms & gaming' },
    { name: 'ICBC', sector: 'Financials', note: 'State-owned bank' },
  ],
  Bangladesh: [
    { name: 'Ready-made garments', sector: 'Manufacturing', note: 'Dominant export sector' },
    { name: 'Beximco', sector: 'Conglomerate', note: 'Textiles, pharma' },
    { name: 'Grameenphone', sector: 'Telecom', note: 'Largest mobile operator' },
  ],
  Taiwan: [
    { name: 'TSMC', sector: 'Semiconductors', note: 'Leading-edge foundry' },
    { name: 'Foxconn', sector: 'Electronics', note: 'Contract manufacturing' },
    { name: 'MediaTek', sector: 'Semiconductors', note: 'Chip design' },
  ],
  Germany: [
    { name: 'SAP', sector: 'Software', note: 'Enterprise software' },
    { name: 'Siemens', sector: 'Industrials', note: 'Automation & rail' },
    { name: 'Volkswagen', sector: 'Autos', note: 'Large export employer' },
  ],
  Japan: [
    { name: 'Toyota', sector: 'Autos', note: 'Largest exporter' },
    { name: 'Sony', sector: 'Electronics', note: 'Sensors & entertainment' },
    { name: 'Tokyo Electron', sector: 'Semiconductors', note: 'Chip equipment' },
  ],
  India: [
    { name: 'Reliance', sector: 'Conglomerate', note: 'Energy, retail, telecom' },
    { name: 'TCS', sector: 'IT services', note: 'Services exports' },
    { name: 'HDFC Bank', sector: 'Financials', note: 'Private bank' },
  ],
  'Saudi Arabia': [
    { name: 'Saudi Aramco', sector: 'Energy', note: 'Crude oil producer' },
    { name: 'SABIC', sector: 'Chemicals', note: 'Petrochemicals' },
    { name: 'Al Rajhi Bank', sector: 'Financials', note: 'Islamic banking' },
  ],
  Singapore: [
    { name: 'DBS', sector: 'Financials', note: 'Largest Southeast Asian bank' },
    { name: 'PSA International', sector: 'Logistics', note: 'Port operator, transshipment' },
    { name: 'Singapore Airlines', sector: 'Transport', note: 'Regional aviation hub' },
  ],
  Netherlands: [
    { name: 'ASML', sector: 'Semiconductors', note: 'Lithography monopoly' },
    { name: 'Port of Rotterdam', sector: 'Logistics', note: "Europe's largest port" },
    { name: 'Shell', sector: 'Energy', note: 'Integrated energy' },
  ],
};

// prettier-ignore
const LEVERAGE_NOTES: Record<string, string> = {
  Taiwan: 'Produces the majority of leading-edge chips. Small economy, outsized global leverage.',
  Netherlands: 'Hosts ASML (lithography) and Rotterdam, a gateway for European trade.',
  Egypt: 'Controls the Suez Canal, a route for a meaningful share of seaborne trade.',
  Iran: 'Borders the Strait of Hormuz, a chokepoint for Gulf oil and LNG.',
  Qatar: 'One of the largest LNG exporters, critical for Asian and European gas.',
  'Saudi Arabia': 'Spare oil capacity gives it influence over global energy prices.',
  Russia: 'Major supplier of energy, grain and fertilizer to many importers.',
  Ukraine: 'Large grain and sunflower oil exporter; food security channel for MENA.',
  China: 'Dominates refining of critical minerals and many manufacturing supply chains.',
  'United States of America': 'Issuer of the main reserve currency; dollar funding sets global conditions.',
  Chile: 'Large copper and lithium producer, key inputs for electrification.',
  Singapore: 'Transshipment hub on the Strait of Malacca and one of Asia’s main financial and refining centres.',
  Malaysia: 'Sits on the Strait of Malacca and is a hub for chip packaging and testing.',
  Panama: 'Operates the Panama Canal linking Atlantic and Pacific trade.',
  'Dem. Rep. Congo': 'Supplies most of the world’s mined cobalt.',
};

// prettier-ignore
const ISSUES: Record<string, Issue[]> = {
  [US]: [
    { title: 'Tariff changes on key trade partners', channel: 'Trade', severity: 'High', status: 'Verified' },
    { title: 'Housing affordability debate', channel: 'Households', severity: 'Medium', status: 'Developing' },
    { title: 'AI regulation and chip export controls', channel: 'Technology', severity: 'Medium', status: 'Verified' },
  ],
  China: [
    { title: 'Property sector restructuring continues', channel: 'Credit', severity: 'High', status: 'Verified' },
    { title: 'Low inflation and weak consumer demand', channel: 'Prices', severity: 'Medium', status: 'Developing' },
    { title: 'Export controls on critical minerals', channel: 'Trade', severity: 'Medium', status: 'Verified' },
  ],
  Bangladesh: [
    { title: 'Garment export orders shift with Western demand', channel: 'Exports', severity: 'High', status: 'Developing' },
    { title: 'Foreign reserves and IMF program review', channel: 'FX & reserves', severity: 'High', status: 'Verified' },
    { title: 'Energy import costs and power shortages', channel: 'Energy', severity: 'Medium', status: 'Online sentiment' },
  ],
  Egypt: [
    { title: 'Red Sea disruption cuts Suez revenue', channel: 'FX & reserves', severity: 'High', status: 'Verified' },
    { title: 'Gulf investment inflows', channel: 'Capital', severity: 'Medium', status: 'Verified' },
    { title: 'Food price pressure on households', channel: 'Prices', severity: 'Medium', status: 'Online sentiment' },
  ],
  Taiwan: [
    { title: 'AI chip demand lifts exports', channel: 'Exports', severity: 'Medium', status: 'Verified' },
    { title: 'Cross-strait military activity', channel: 'Geopolitics', severity: 'High', status: 'Developing' },
    { title: 'Power grid capacity for fabs', channel: 'Energy', severity: 'Medium', status: 'Developing' },
  ],
};

// prettier-ignore
const REGION_ISSUES: Record<Region, Issue[]> = {
  'North America': [
    { title: 'Trade policy uncertainty', channel: 'Trade', severity: 'Medium', status: 'Developing' },
    { title: 'Interest rate path', channel: 'Credit', severity: 'Medium', status: 'Verified' },
    { title: 'Labor market cooling', channel: 'Jobs', severity: 'Low', status: 'Developing' },
  ],
  'Latin America': [
    { title: 'Commodity price swings', channel: 'Exports', severity: 'Medium', status: 'Verified' },
    { title: 'US demand and remittances', channel: 'People', severity: 'Medium', status: 'Developing' },
    { title: 'Fiscal consolidation debate', channel: 'Fiscal', severity: 'Medium', status: 'Online sentiment' },
  ],
  Europe: [
    { title: 'Energy price normalisation', channel: 'Energy', severity: 'Medium', status: 'Verified' },
    { title: 'Defence spending and fiscal rules', channel: 'Fiscal', severity: 'Medium', status: 'Developing' },
    { title: 'Industrial competitiveness worries', channel: 'Exports', severity: 'Medium', status: 'Online sentiment' },
  ],
  'Middle East': [
    { title: 'Oil price and OPEC+ output', channel: 'Energy', severity: 'High', status: 'Verified' },
    { title: 'Shipping disruption in the Red Sea', channel: 'Trade', severity: 'High', status: 'Developing' },
    { title: 'Diversification programmes', channel: 'Investment', severity: 'Low', status: 'Verified' },
  ],
  Africa: [
    { title: 'Debt service and refinancing needs', channel: 'Credit', severity: 'High', status: 'Verified' },
    { title: 'Food and fuel import costs', channel: 'Prices', severity: 'Medium', status: 'Developing' },
    { title: 'Currency pressure', channel: 'FX & reserves', severity: 'Medium', status: 'Online sentiment' },
  ],
  Asia: [
    { title: 'Export demand from US and China', channel: 'Exports', severity: 'Medium', status: 'Developing' },
    { title: 'Supply-chain relocation', channel: 'Investment', severity: 'Medium', status: 'Verified' },
    { title: 'Energy import bill', channel: 'Energy', severity: 'Low', status: 'Online sentiment' },
  ],
  Oceania: [
    { title: 'Commodity exports to Asia', channel: 'Exports', severity: 'Medium', status: 'Verified' },
    { title: 'Housing costs', channel: 'Households', severity: 'Medium', status: 'Online sentiment' },
    { title: 'Climate and disaster resilience', channel: 'Fiscal', severity: 'Low', status: 'Developing' },
  ],
};

// prettier-ignore
const REGION_PARTNERS: Record<Region, Partner[]> = {
  'North America': [
    { name: US, kind: 'exports', share: 60 }, { name: 'China', kind: 'imports', share: 15 },
    { name: 'Canada', kind: 'energy', share: 30 }, { name: US, kind: 'capital', share: 40 },
  ],
  'Latin America': [
    { name: US, kind: 'exports', share: 30 }, { name: 'China', kind: 'imports', share: 20 },
    { name: 'Brazil', kind: 'food', share: 10 }, { name: 'Spain', kind: 'capital', share: 12 },
    { name: US, kind: 'people', share: 40 },
  ],
  Europe: [
    { name: 'Germany', kind: 'exports', share: 22 }, { name: 'China', kind: 'imports', share: 12 },
    { name: 'Norway', kind: 'energy', share: 25 }, { name: US, kind: 'capital', share: 12 },
    { name: 'Netherlands', kind: 'imports', share: 8 },
  ],
  'Middle East': [
    { name: 'China', kind: 'exports', share: 22 }, { name: 'India', kind: 'exports', share: 12 },
    { name: US, kind: 'capital', share: 15 }, { name: 'Germany', kind: 'imports', share: 8 },
    { name: 'Russia', kind: 'food', share: 20 },
  ],
  Africa: [
    { name: 'China', kind: 'imports', share: 20 }, { name: 'India', kind: 'exports', share: 10 },
    { name: 'Saudi Arabia', kind: 'energy', share: 15 }, { name: 'Russia', kind: 'food', share: 15 },
    { name: 'France', kind: 'capital', share: 12 },
  ],
  Asia: [
    { name: 'China', kind: 'imports', share: 25 }, { name: US, kind: 'exports', share: 15 },
    { name: 'Japan', kind: 'capital', share: 10 }, { name: 'Saudi Arabia', kind: 'energy', share: 20 },
    { name: 'Taiwan', kind: 'tech', share: 10 },
  ],
  Oceania: [
    { name: 'China', kind: 'exports', share: 30 }, { name: 'Australia', kind: 'imports', share: 20 },
    { name: 'Japan', kind: 'exports', share: 10 }, { name: US, kind: 'capital', share: 20 },
  ],
};

// prettier-ignore
const REGION_BASE: Record<Region, { growth: number; inflation: number; gdpPc: number; debt: number; geo: number; fin: number }> = {
  'North America': { growth: 1.5, inflation: 3, gdpPc: 40000, debt: 60, geo: 25, fin: 35 },
  'Latin America': { growth: 2.4, inflation: 5, gdpPc: 8000, debt: 60, geo: 40, fin: 55 },
  Europe: { growth: 1.6, inflation: 3, gdpPc: 30000, debt: 60, geo: 35, fin: 40 },
  'Middle East': { growth: 2.6, inflation: 5, gdpPc: 15000, debt: 50, geo: 65, fin: 50 },
  Africa: { growth: 3.8, inflation: 10, gdpPc: 1600, debt: 60, geo: 55, fin: 65 },
  Asia: { growth: 4.3, inflation: 4, gdpPc: 5000, debt: 55, geo: 45, fin: 50 },
  Oceania: { growth: 2.5, inflation: 3, gdpPc: 15000, debt: 45, geo: 25, fin: 40 },
};

/** Deterministic pseudo-random in [0, 1) from a string seed. */
export function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function regionFor(lon: number, lat: number): Region {
  if (lon < -30) return lat > 24 ? 'North America' : 'Latin America';
  if (lon < 60) {
    if (lat > 35) return 'Europe';
    if (lon > 34 && lat > 12) return 'Middle East';
    return 'Africa';
  }
  if (lat < -8 || (lon > 140 && lat < 0)) return 'Oceania';
  return 'Asia';
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function fromRow(r: Row): CountryProfile {
  const [name, display, iso2, region, gdp, gdpPc, growth, inflation, unemployment, debt, fiscal,
    currentAccount, tradeOpenness, finExposure, geoPressure, leverage, energyImporter,
    exportConcentration, reserveMonths] = r;
  return {
    name, display, iso2, region, curated: true, gdp, gdpPc, growth, inflation, unemployment, debt,
    fiscal, currentAccount, tradeOpenness, finExposure, geoPressure, leverage, energyImporter,
    exportConcentration, reserveMonths,
    partners: (PARTNERS[name] ?? REGION_PARTNERS[region]).filter((p) => p.name !== name),
    issues: ISSUES[name] ?? REGION_ISSUES[region],
    companies: COMPANIES[name] ?? [],
    leverageNote: LEVERAGE_NOTES[name],
  };
}

function generated(name: string, lon: number, lat: number): CountryProfile {
  const region = regionFor(lon, lat);
  const b = REGION_BASE[region];
  const r = seeded(name);
  const gdpPc = Math.round(b.gdpPc * (0.35 + r() * 1.6));
  return {
    name,
    display: name,
    region,
    curated: false,
    gdp: Math.round(5 + r() * 120),
    gdpPc,
    growth: round1(b.growth + (r() - 0.5) * 4),
    inflation: round1(Math.max(0.2, b.inflation * (0.4 + r() * 1.6))),
    unemployment: round1(3 + r() * 10),
    debt: Math.round(b.debt * (0.5 + r())),
    fiscal: round1(-6 + r() * 6),
    currentAccount: round1(-7 + r() * 9),
    tradeOpenness: Math.round(35 + r() * 90),
    finExposure: Math.round(clamp(b.fin + (r() - 0.5) * 40, 5, 98)),
    geoPressure: Math.round(clamp(b.geo + (r() - 0.5) * 40, 5, 98)),
    leverage: Math.round(clamp(10 + r() * 35 + (LEVERAGE_NOTES[name] ? 40 : 0), 5, 95)),
    energyImporter: r() > 0.35,
    exportConcentration: Math.round(30 + r() * 60),
    reserveMonths: round1(1.5 + r() * 8),
    partners: REGION_PARTNERS[region].filter((p) => p.name !== name),
    issues: REGION_ISSUES[region],
    companies: [],
    leverageNote: LEVERAGE_NOTES[name],
  };
}

const CURATED = new Map(ROWS.map((r) => [r[0], fromRow(r)]));

/** Build a profile for every country on the map, keyed by map name. */
export function buildProfiles(
  features: { name: string; centroid: [number, number] }[],
): Map<string, CountryProfile> {
  const out = new Map<string, CountryProfile>();
  for (const f of features) {
    out.set(f.name, CURATED.get(f.name) ?? generated(f.name, f.centroid[0], f.centroid[1]));
  }
  return out;
}

/**
 * A short illustrative history ending at `current`, for "direction of travel".
 * Eight quarterly points; the slope is seeded so it is stable between renders.
 */
export function history(seed: string, current: number, spread = 1): number[] {
  const r = seeded(seed);
  const drift = (r() - 0.5) * spread * 0.9;
  const pts: number[] = [];
  for (let i = 7; i >= 0; i--) {
    pts.push(current - drift * i + (r() - 0.5) * spread * 0.35 * (i === 0 ? 0 : 1));
  }
  return pts;
}

export function flagEmoji(iso2?: string): string | null {
  if (!iso2 || iso2.length !== 2) return null;
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...iso2.toUpperCase().split('').map((c) => base + c.charCodeAt(0) - 65),
  );
}

export const LINK_META: Record<LinkKind, { label: string; color: string; verb: string }> = {
  exports: { label: 'Export market', color: '#5eead4', verb: 'buys its exports' },
  imports: { label: 'Key supplier', color: '#38bdf8', verb: 'supplies goods' },
  energy: { label: 'Energy', color: '#fbbf24', verb: 'supplies energy' },
  food: { label: 'Food', color: '#a3e635', verb: 'supplies food' },
  tech: { label: 'Semiconductors', color: '#c084fc', verb: 'supplies chips' },
  capital: { label: 'Capital & credit', color: '#f472b6', verb: 'lends or invests' },
  people: { label: 'Remittances & tourism', color: '#fb923c', verb: 'sends remittances' },
};
