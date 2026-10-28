/** ILLUSTRATIVE DATA ONLY — placeholders for layout, not live statistics. */

export interface GlobalKpi {
  label: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
  /** Whether the direction is good news. */
  good: boolean;
  series: number[];
  note: string;
}

export const GLOBAL_KPIS: GlobalKpi[] = [
  {
    label: 'Global GDP growth',
    value: '3.1%',
    change: '+0.2 pp',
    direction: 'up',
    good: true,
    series: [2.6, 2.8, 3.3, 3.0, 2.9, 3.0, 3.2, 3.1],
    note: 'Steady, below pre-2020 average',
  },
  {
    label: 'Global inflation',
    value: '4.2%',
    change: '−0.6 pp',
    direction: 'down',
    good: true,
    series: [8.6, 7.9, 6.8, 5.9, 5.3, 4.9, 4.6, 4.2],
    note: 'Easing, services still sticky',
  },
  {
    label: 'World trade volume',
    value: '$32.6T',
    change: '+1.9%',
    direction: 'up',
    good: true,
    series: [30.1, 30.8, 31.2, 31.0, 31.5, 31.9, 32.3, 32.6],
    note: 'Recovering, more fragmented',
  },
  {
    label: 'Global debt to GDP',
    value: '93.4%',
    change: '+0.6 pp',
    direction: 'up',
    good: false,
    series: [91.2, 91.8, 92.0, 92.3, 92.6, 92.9, 93.1, 93.4],
    note: 'Rising, led by large economies',
  },
];

export interface Story {
  title: string;
  tag: string;
  region: string;
  age: string;
  status: 'Verified' | 'Developing';
  country?: string;
}

export const STORIES: Story[] = [
  { title: 'Red Sea shipping detours keep freight costs elevated', tag: 'Trade', region: 'Middle East', age: '2h', status: 'Verified', country: 'Egypt' },
  { title: 'New round of chip export controls announced', tag: 'Technology', region: 'Asia', age: '5h', status: 'Verified', country: 'Taiwan' },
  { title: 'Oil prices jump on supply concerns', tag: 'Energy', region: 'Global', age: '7h', status: 'Developing', country: 'Saudi Arabia' },
  { title: 'Frontier markets face refinancing wall', tag: 'Credit', region: 'Africa', age: '1d', status: 'Developing', country: 'Ghana' },
];

export interface Chokepoint {
  name: string;
  coords: [number, number];
  carries: string;
  country: string;
}

export const CHOKEPOINTS: Chokepoint[] = [
  { name: 'Strait of Hormuz', coords: [56.4, 26.5], carries: 'Gulf oil & LNG', country: 'Iran' },
  { name: 'Suez Canal', coords: [32.4, 30.2], carries: 'Asia–Europe trade', country: 'Egypt' },
  { name: 'Bab el-Mandeb', coords: [43.4, 12.6], carries: 'Red Sea access', country: 'Yemen' },
  { name: 'Strait of Malacca', coords: [100.5, 3.0], carries: 'East Asia energy imports', country: 'Malaysia' },
  { name: 'Taiwan Strait', coords: [119.8, 24.2], carries: 'Leading-edge chips', country: 'Taiwan' },
  { name: 'Panama Canal', coords: [-79.7, 9.1], carries: 'Atlantic–Pacific trade', country: 'Panama' },
  { name: 'Turkish Straits', coords: [29.0, 41.1], carries: 'Black Sea grain & oil', country: 'Turkey' },
];

export interface RegionSummary {
  name: string;
  gdp: string;
  growth: number;
  color: string;
  series: number[];
}

export const REGIONS: RegionSummary[] = [
  { name: 'North America', gdp: '$31.4T', growth: 1.9, color: '#38bdf8', series: [2.4, 2.2, 2.6, 2.1, 1.9, 2.0, 1.8, 1.9] },
  { name: 'Europe', gdp: '$27.9T', growth: 1.1, color: '#a78bfa', series: [0.5, 0.4, 0.7, 0.9, 1.0, 0.9, 1.2, 1.1] },
  { name: 'Asia', gdp: '$39.2T', growth: 4.2, color: '#5eead4', series: [4.6, 4.4, 4.5, 4.1, 4.3, 4.0, 4.4, 4.2] },
  { name: 'Middle East', gdp: '$4.6T', growth: 2.8, color: '#fbbf24', series: [1.8, 2.1, 2.0, 2.6, 2.4, 2.9, 2.7, 2.8] },
  { name: 'Africa', gdp: '$3.1T', growth: 3.7, color: '#fb923c', series: [3.2, 3.3, 3.5, 3.4, 3.6, 3.5, 3.8, 3.7] },
  { name: 'Latin America', gdp: '$6.9T', growth: 2.3, color: '#f472b6', series: [2.0, 2.2, 1.9, 2.1, 2.4, 2.2, 2.5, 2.3] },
];
