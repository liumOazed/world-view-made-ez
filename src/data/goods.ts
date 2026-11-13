/**
 * TRADABLE GOODS, REGION BY REGION.
 *
 * The one good each state or province is best known for producing and
 * selling, drawn as an icon over the region, like the trade goods of a
 * strategy-game map. One good per region is a simplification on purpose:
 * most regions make many things, and the map shows the one that sets each
 * apart (by value, or by its share of the country's output).
 *
 * Every country gets its main export (one good, at world scale), and every
 * country with a region map gets a good for each state or province too;
 * a region without a pick shows the country's main export, marked national.
 * The picks are hand-curated from public statistics, not fetched: national
 * agriculture, mining and industry statistics, USGS mineral yearbooks and
 * FAO production figures, with main exports from UN Comtrade (around 2023).
 * They are a guide to what each place is known for, not a measured figure,
 * and the map says so.
 *
 * Data lives in goods-headlines.ts (one main export per country) and
 * goods-regions.ts (one good per first-level region, keyed by the names in
 * public/geo/admin/<ISO3>.json; " Province" may be left off). Districts take
 * their state's good.
 */

import { HEADLINES } from './goods-headlines';
import { REGIONS } from './goods-regions';

export type GoodCategory = 'farm' | 'animal' | 'mining' | 'made';

export const CATEGORY: Record<GoodCategory, { label: string; color: string }> = {
  farm: { label: 'Crops & forests', color: '#4f9e6e' },
  animal: { label: 'Livestock & fish', color: '#c47a4f' },
  mining: { label: 'Energy & minerals', color: '#b8892f' },
  made: { label: 'Manufactured', color: '#7d5cc0' },
};
export const CATEGORIES = Object.keys(CATEGORY) as GoodCategory[];

/** Icon names: Lucide icons, or one of our own drawings (paddy, maize, cane). */
export type GoodIcon =
  | 'paddy'
  | 'maize'
  | 'cane'
  | 'pod'
  | 'sheep'
  | 'Banana'
  | 'Nut'
  | 'Diamond'
  | 'Cuboid'
  | 'Shovel'
  | 'Magnet'
  | 'Zap'
  | 'BatteryFull'
  | 'Footprints'
  | 'Sun'
  | 'Droplets'
  | 'BottleWine'
  | 'Sofa'
  | 'Wheat'
  | 'Bean'
  | 'Cloud'
  | 'Leaf'
  | 'Coffee'
  | 'Apple'
  | 'Citrus'
  | 'Carrot'
  | 'Flower'
  | 'Flower2'
  | 'TreeDeciduous'
  | 'TreePalm'
  | 'TreePine'
  | 'Sprout'
  | 'Cigarette'
  | 'Spool'
  | 'Grape'
  | 'Beef'
  | 'Ham'
  | 'Drumstick'
  | 'Milk'
  | 'Fish'
  | 'Shrimp'
  | 'Droplet'
  | 'Fuel'
  | 'Flame'
  | 'Pickaxe'
  | 'Mountain'
  | 'Cylinder'
  | 'Coins'
  | 'Gem'
  | 'Atom'
  | 'Hexagon'
  | 'BrickWall'
  | 'Shirt'
  | 'Cpu'
  | 'Car'
  | 'Cog'
  | 'FlaskConical'
  | 'Pill'
  | 'Anvil'
  | 'Plane'
  | 'Ship'
  | 'Microscope';

export interface Good {
  label: string;
  category: GoodCategory;
  icon: GoodIcon;
}

export const GOODS = {
  rice: { label: 'Rice', category: 'farm', icon: 'paddy' },
  wheat: { label: 'Wheat', category: 'farm', icon: 'Wheat' },
  maize: { label: 'Maize', category: 'farm', icon: 'maize' },
  soy: { label: 'Soybeans', category: 'farm', icon: 'Bean' },
  sugar: { label: 'Sugar', category: 'farm', icon: 'cane' },
  cotton: { label: 'Cotton', category: 'farm', icon: 'Cloud' },
  tea: { label: 'Tea', category: 'farm', icon: 'Leaf' },
  coffee: { label: 'Coffee', category: 'farm', icon: 'Coffee' },
  fruit: { label: 'Fruit', category: 'farm', icon: 'Apple' },
  citrus: { label: 'Citrus', category: 'farm', icon: 'Citrus' },
  vegetables: { label: 'Vegetables', category: 'farm', icon: 'Carrot' },
  spices: { label: 'Spices', category: 'farm', icon: 'Flower' },
  oilseeds: { label: 'Oilseeds', category: 'farm', icon: 'Sun' },
  flowers: { label: 'Cut flowers', category: 'farm', icon: 'Flower2' },
  banana: { label: 'Bananas', category: 'farm', icon: 'Banana' },
  cocoa: { label: 'Cocoa', category: 'farm', icon: 'pod' },
  nuts: { label: 'Nuts', category: 'farm', icon: 'Nut' },
  olives: { label: 'Olives & olive oil', category: 'farm', icon: 'Droplets' },
  rubber: { label: 'Rubber', category: 'farm', icon: 'TreeDeciduous' },
  palmOil: { label: 'Palm & coconut oil', category: 'farm', icon: 'TreePalm' },
  cassava: { label: 'Cassava', category: 'farm', icon: 'Sprout' },
  tobacco: { label: 'Tobacco', category: 'farm', icon: 'Cigarette' },
  jute: { label: 'Jute & sisal', category: 'farm', icon: 'Spool' },
  timber: { label: 'Timber & pulp', category: 'farm', icon: 'TreePine' },
  wine: { label: 'Wine', category: 'farm', icon: 'Grape' },
  spirits: { label: 'Spirits & beer', category: 'made', icon: 'BottleWine' },
  livestock: { label: 'Cattle & meat', category: 'animal', icon: 'Beef' },
  pork: { label: 'Pigs & pork', category: 'animal', icon: 'Ham' },
  sheep: { label: 'Sheep & wool', category: 'animal', icon: 'sheep' },
  poultry: { label: 'Poultry', category: 'animal', icon: 'Drumstick' },
  dairy: { label: 'Dairy', category: 'animal', icon: 'Milk' },
  fish: { label: 'Fish & seafood', category: 'animal', icon: 'Fish' },
  shrimp: { label: 'Shrimp', category: 'animal', icon: 'Shrimp' },
  oil: { label: 'Oil', category: 'mining', icon: 'Droplet' },
  fuel: { label: 'Refined fuel', category: 'mining', icon: 'Fuel' },
  gas: { label: 'Natural gas', category: 'mining', icon: 'Flame' },
  coal: { label: 'Coal', category: 'mining', icon: 'Pickaxe' },
  ironOre: { label: 'Iron ore', category: 'mining', icon: 'Mountain' },
  copper: { label: 'Copper', category: 'mining', icon: 'Cylinder' },
  gold: { label: 'Gold & precious metals', category: 'mining', icon: 'Coins' },
  diamonds: { label: 'Diamonds', category: 'mining', icon: 'Diamond' },
  aluminium: { label: 'Aluminium & bauxite', category: 'mining', icon: 'Cuboid' },
  ores: { label: 'Metal ores', category: 'mining', icon: 'Shovel' },
  uranium: { label: 'Uranium', category: 'mining', icon: 'Atom' },
  lithium: { label: 'Lithium', category: 'mining', icon: 'BatteryFull' },
  electricity: { label: 'Electricity', category: 'mining', icon: 'Zap' },
  gems: { label: 'Gems & jewellery', category: 'mining', icon: 'Gem' },
  rareEarths: { label: 'Rare earths', category: 'mining', icon: 'Magnet' },
  minerals: { label: 'Potash, phosphate & salt', category: 'mining', icon: 'Hexagon' },
  cement: { label: 'Cement & stone', category: 'mining', icon: 'BrickWall' },
  textiles: { label: 'Textiles & clothing', category: 'made', icon: 'Shirt' },
  footwear: { label: 'Leather & footwear', category: 'made', icon: 'Footprints' },
  furniture: { label: 'Furniture', category: 'made', icon: 'Sofa' },
  electronics: { label: 'Electronics', category: 'made', icon: 'Cpu' },
  cars: { label: 'Cars', category: 'made', icon: 'Car' },
  machinery: { label: 'Machinery', category: 'made', icon: 'Cog' },
  chemicals: { label: 'Chemicals', category: 'made', icon: 'FlaskConical' },
  pharma: { label: 'Medicines', category: 'made', icon: 'Pill' },
  steel: { label: 'Steel', category: 'made', icon: 'Anvil' },
  aircraft: { label: 'Aircraft', category: 'made', icon: 'Plane' },
  ships: { label: 'Ships', category: 'made', icon: 'Ship' },
  optics: { label: 'Instruments & medical devices', category: 'made', icon: 'Microscope' },
} satisfies Record<string, Good>;

export type GoodId = keyof typeof GOODS;
export const GOOD_IDS = Object.keys(GOODS) as GoodId[];
export const goodOf = (id: GoodId): Good => GOODS[id];

/** A region's good, with an optional line on why. */
export type Pick = GoodId | [GoodId, string];

const pickOf = (p: Pick): [GoodId, string | null] => (Array.isArray(p) ? p : [p, null]);

/** Countries with a main export listed. */
export const GOODS_COUNTRIES = Object.keys(HEADLINES);
/** Countries with a good for each state or province. */
export const REGIONAL_GOODS_COUNTRIES = Object.keys(REGIONS);
export const hasGoods = (country: string) => country in HEADLINES;
export const hasRegionalGoods = (country: string) => country in REGIONS;

export interface RegionGood {
  id: GoodId;
  good: Good;
  note: string | null;
}

/** The good a state or province is known for; districts take their state's. */
export function regionGood(country: string, key: string): RegionGood | null {
  const regions = REGIONS[country];
  if (!regions) return null;
  const top = key.split('/')[0];
  const pick = regions[top] ?? regions[top.replace(/ Province$/, '')];
  if (!pick) return null;
  const [id, note] = pickOf(pick);
  return { id, good: GOODS[id], note };
}

/** The country's main export. */
export function headlineGood(country: string): RegionGood | null {
  const h = HEADLINES[country];
  if (!h) return null;
  const [id, note] = pickOf(h);
  return { id, good: GOODS[id], note };
}

const shortName = (key: string) =>
  key.replace(/ (Province|Prefecture|Region|Oblast|Krai|Governorate|Governate|Voivodeship|Municipality|Autonomous Region|Special Administrative Region)$/, '').replace(/^Región (de |del )?/, '');

/** Goods in a country, most regions first. */
export function goodsSummary(country: string): { id: GoodId; good: Good; regions: string[] }[] {
  const regions = REGIONS[country];
  if (!regions) return [];
  const by = new Map<GoodId, string[]>();
  for (const [key, pick] of Object.entries(regions)) {
    const [id] = pickOf(pick);
    by.set(id, [...(by.get(id) ?? []), shortName(key)]);
  }
  return [...by.entries()]
    .map(([id, regions]) => ({ id, good: GOODS[id], regions: regions.sort() }))
    .sort((a, b) => b.regions.length - a.regions.length || a.good.label.localeCompare(b.good.label));
}

export const GOODS_SOURCE =
  'Hand-curated from national agriculture, mining and industry statistics, USGS and FAO; main exports from UN Comtrade (around 2023).';
