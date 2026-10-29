/** Systemic chokepoints: well-known shipping straits and the country each sits beside. */

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
  { name: 'Strait of Malacca', coords: [100.5, 3.0], carries: 'East Asia energy imports', country: 'Singapore' },
  { name: 'Taiwan Strait', coords: [119.8, 24.2], carries: 'Leading-edge chips', country: 'Taiwan' },
  { name: 'Panama Canal', coords: [-79.7, 9.1], carries: 'Atlantic–Pacific trade', country: 'Panama' },
  { name: 'Turkish Straits', coords: [29.0, 41.1], carries: 'Black Sea grain & oil', country: 'Turkey' },
];
