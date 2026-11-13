/**
 * TRADABLE GOODS, REGION BY REGION.
 *
 * The one good each state or province is best known for producing and
 * selling, drawn as an icon over the region, like the trade goods of a
 * strategy-game map. One good per region is a simplification on purpose:
 * most regions make many things, and the map shows the one that sets each
 * apart (by value, or by its share of the country's output).
 *
 * The picks are hand-curated from public statistics, not fetched: national
 * agriculture, mining and industry statistics for each country (Thailand's
 * Office of Agricultural Economics, India's Ministry of Agriculture and
 * Indian Bureau of Mines, the Bangladesh Bureau of Statistics, Destatis and
 * the Länder statistics offices, USDA NASS, EIA and USGS, IBGE and CONAB,
 * and China's National Bureau of Statistics), with each country's largest
 * export by value from UN Comtrade (2023). They are a guide to what each
 * region is known for, not a measured figure, and the map says so.
 *
 * To add a country: list its first-level regions by their map key (the
 * names in public/geo/admin/<ISO3>.json, " Province" may be left off) and
 * add a headline good. Districts take their state's good.
 */

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
  sugar: { label: 'Sugarcane', category: 'farm', icon: 'cane' },
  cotton: { label: 'Cotton', category: 'farm', icon: 'Cloud' },
  tea: { label: 'Tea', category: 'farm', icon: 'Leaf' },
  coffee: { label: 'Coffee', category: 'farm', icon: 'Coffee' },
  fruit: { label: 'Fruit', category: 'farm', icon: 'Apple' },
  citrus: { label: 'Citrus', category: 'farm', icon: 'Citrus' },
  vegetables: { label: 'Vegetables', category: 'farm', icon: 'Carrot' },
  spices: { label: 'Spices', category: 'farm', icon: 'Flower' },
  oilseeds: { label: 'Oilseeds', category: 'farm', icon: 'Flower2' },
  rubber: { label: 'Rubber', category: 'farm', icon: 'TreeDeciduous' },
  palmOil: { label: 'Palm oil', category: 'farm', icon: 'TreePalm' },
  cassava: { label: 'Cassava', category: 'farm', icon: 'Sprout' },
  tobacco: { label: 'Tobacco', category: 'farm', icon: 'Cigarette' },
  jute: { label: 'Jute', category: 'farm', icon: 'Spool' },
  timber: { label: 'Timber & pulp', category: 'farm', icon: 'TreePine' },
  wine: { label: 'Wine', category: 'farm', icon: 'Grape' },
  livestock: { label: 'Cattle & meat', category: 'animal', icon: 'Beef' },
  pork: { label: 'Pigs & pork', category: 'animal', icon: 'Ham' },
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
  gold: { label: 'Gold', category: 'mining', icon: 'Coins' },
  gems: { label: 'Gems & jewellery', category: 'mining', icon: 'Gem' },
  rareEarths: { label: 'Rare earths', category: 'mining', icon: 'Atom' },
  minerals: { label: 'Salt & potash', category: 'mining', icon: 'Hexagon' },
  cement: { label: 'Cement', category: 'mining', icon: 'BrickWall' },
  textiles: { label: 'Textiles & clothing', category: 'made', icon: 'Shirt' },
  electronics: { label: 'Electronics', category: 'made', icon: 'Cpu' },
  cars: { label: 'Cars', category: 'made', icon: 'Car' },
  machinery: { label: 'Machinery', category: 'made', icon: 'Cog' },
  chemicals: { label: 'Chemicals', category: 'made', icon: 'FlaskConical' },
  pharma: { label: 'Medicines', category: 'made', icon: 'Pill' },
  steel: { label: 'Steel', category: 'made', icon: 'Anvil' },
  aircraft: { label: 'Aircraft', category: 'made', icon: 'Plane' },
  ships: { label: 'Ships', category: 'made', icon: 'Ship' },
  optics: { label: 'Optics & instruments', category: 'made', icon: 'Microscope' },
} satisfies Record<string, Good>;

export type GoodId = keyof typeof GOODS;
export const GOOD_IDS = Object.keys(GOODS) as GoodId[];
export const goodOf = (id: GoodId): Good => GOODS[id];

/** A region's good, with an optional line on why. */
type Pick = GoodId | [GoodId, string];

interface CountryGoods {
  /** Largest export by value, UN Comtrade 2023. */
  headline: [GoodId, string];
  regions: Record<string, Pick>;
}

const THAILAND: CountryGoods = {
  headline: ['electronics', 'Computers, parts and chips are its largest export'],
  regions: {
    // Isan, the northeast: Thailand's rice bowl and home of jasmine rice.
    'Roi Et': ['rice', 'Thung Kula Ronghai, home of Hom Mali jasmine rice'],
    Surin: ['rice', 'Jasmine rice from the Thung Kula Ronghai plain'],
    'Si Sa Ket': ['rice', 'Jasmine rice from the Thung Kula Ronghai plain'],
    'Ubon Ratchathani': ['rice', 'The northeast’s largest rice-growing province'],
    Yasothon: ['rice', 'Jasmine and organic rice'],
    'Buri Ram': ['rice', 'Jasmine rice from the Thung Kula Ronghai plain'],
    'Maha Sarakham': ['rice', 'Jasmine rice from the Thung Kula Ronghai plain'],
    'Amnat Charoen': 'rice',
    'Sakon Nakhon': 'rice',
    'Nakhon Phanom': 'rice',
    'Nong Khai': 'rice',
    'Nong Bua Lam Phu': 'rice',
    Mukdahan: 'rice',
    Kalasin: ['sugar', 'Sugarcane and cassava for the northeast’s mills'],
    'Khon Kaen': ['sugar', 'One of the country’s largest sugarcane provinces'],
    'Udon Thani': ['sugar', 'Sugarcane for the northeast’s mills'],
    'Nakhon Ratchasima': ['cassava', 'Korat grows more cassava than any other province'],
    Chaiyaphum: ['cassava', 'Cassava and sugarcane on the upland plateau'],
    Loei: ['maize', 'Feed maize on the northern uplands'],
    'Bueng Kan': ['rubber', 'Rubber planted across the far northeast'],
    // The north.
    'Chiang Mai': ['fruit', 'Longan, much of it dried for export to China'],
    Lamphun: ['electronics', 'The Northern Region Industrial Estate'],
    'Chiang Rai': ['tea', 'Tea and coffee from the Doi Mae Salong hills'],
    Phayao: 'rice',
    Nan: ['maize', 'Feed maize on the hills'],
    Phrae: ['timber', 'Teak and the furniture made from it'],
    'Mae Hong Son': 'maize',
    Lampang: ['coal', 'Mae Moh, Thailand’s largest lignite mine and power plant'],
    Tak: ['maize', 'Feed maize and the Mae Sot border trade'],
    Sukhothai: 'rice',
    Uttaradit: ['fruit', 'Durian and langsat'],
    Phitsanulok: 'rice',
    'Kamphaeng Phet': ['sugar', 'Sugarcane and cassava'],
    Phichit: 'rice',
    Phetchabun: 'maize',
    'Nakhon Sawan': ['rice', 'The north’s main rice market'],
    'Uthai Thani': 'rice',
    // The central plain and Bangkok.
    Bangkok: ['gems', 'A world centre for cutting and trading gems and jewellery'],
    'Samut Prakan': ['cars', 'Car and parts plants along Bangkok’s eastern edge'],
    Nonthaburi: ['fruit', 'Orchards famous for durian'],
    'Pathum Thani': ['electronics', 'The Nava Nakorn industrial estate'],
    'Phra Nakhon Si Ayutthaya': ['electronics', 'Hard-disk drives and electronics estates'],
    'Ang Thong': 'rice',
    'Sing Buri': 'rice',
    'Chai Nat': 'rice',
    Lopburi: 'rice',
    Saraburi: ['cement', 'The heart of Thailand’s cement industry'],
    'Nakhon Nayok': 'rice',
    'Suphan Buri': ['rice', 'Central-plain rice, several crops a year'],
    'Nakhon Pathom': ['vegetables', 'Vegetables and fruit for Bangkok and export'],
    Ratchaburi: ['pork', 'More pigs than any other province'],
    Kanchanaburi: ['sugar', 'One of the largest sugarcane provinces'],
    'Samut Sakhon': ['fish', 'Mahachai, the centre of tuna and seafood processing'],
    'Samut Songkhram': ['fish', 'Fishing, salt and coconut sugar'],
    Phetchaburi: ['fruit', 'Pineapple and palm sugar'],
    'Prachuap Khiri Khan': ['fruit', 'Pineapple and coconut for canning'],
    // The east: the Eastern Economic Corridor.
    'Chon Buri': ['cars', 'Laem Chabang port and the Amata car plants'],
    Rayong: ['chemicals', 'Map Ta Phut, the largest petrochemical complex'],
    Chachoengsao: ['cars', 'Car plants in the Eastern Economic Corridor'],
    'Prachin Buri': ['electronics', 'The 304 industrial park'],
    'Sa Kaeo': ['sugar', 'Sugarcane and cassava'],
    Chanthaburi: ['fruit', 'Durian and mangosteen, much of it sold to China'],
    Trat: ['fruit', 'Durian and rambutan'],
    // The south: rubber and palm oil.
    'Surat Thani': ['palmOil', 'The largest oil-palm province'],
    Krabi: ['palmOil', 'Oil palm and rubber'],
    Chumphon: ['palmOil', 'Oil palm and durian'],
    'Nakhon Si Thammarat': ['rubber', 'One of the largest rubber provinces'],
    Songkhla: ['rubber', 'Rubber and the Hat Yai rubber market'],
    Trang: ['rubber', 'Where Thailand’s first rubber trees were planted'],
    Phatthalung: 'rubber',
    Satun: 'rubber',
    Yala: 'rubber',
    Narathiwat: 'rubber',
    Pattani: ['fish', 'Fishing and fish processing'],
    Phangnga: 'rubber',
    Phuket: ['rubber', 'Rubber, beside an economy of tourism'],
    Ranong: ['fish', 'A large fishing port on the Andaman Sea'],
  },
};

const INDIA: CountryGoods = {
  headline: ['fuel', 'Refined petroleum is its largest export'],
  regions: {
    Punjab: ['wheat', 'The granary of India: wheat and rice for the national stock'],
    Haryana: ['wheat', 'Wheat and basmati rice'],
    'Uttar Pradesh': ['sugar', 'Grows more sugarcane than any other state'],
    'Madhya Pradesh': ['soy', 'The soya state: about half of India’s soybeans'],
    Rajasthan: ['oilseeds', 'Mustard seed, about half the national crop'],
    Gujarat: ['fuel', 'Jamnagar, the world’s largest refining complex'],
    Maharashtra: ['cars', 'Car and truck plants around Pune and Mumbai'],
    Telangana: ['pharma', 'Hyderabad, a centre of generic medicine making'],
    'Andhra Pradesh': ['shrimp', 'India’s largest shrimp and fish farms'],
    Karnataka: ['coffee', 'About 70% of India’s coffee'],
    Kerala: ['spices', 'Pepper and cardamom, beside rubber'],
    'Tamil Nadu': ['textiles', 'Tiruppur knitwear and cotton mills'],
    Goa: ['ironOre', 'Iron ore mines, much of it shipped abroad'],
    Odisha: ['ironOre', 'India’s largest iron ore producer'],
    Jharkhand: ['coal', 'Coal from the Jharia and Bokaro fields'],
    Chhattisgarh: ['coal', 'Coal, and rice on the plains'],
    'West Bengal': ['jute', 'Most of the world’s jute is grown and spun here'],
    Bihar: ['rice', 'Rice and maize, and litchi from Muzaffarpur'],
    Assam: ['tea', 'About half of India’s tea'],
    'Arunachal Pradesh': 'timber',
    Meghalaya: ['spices', 'Lakadong turmeric and ginger'],
    Nagaland: 'timber',
    Manipur: 'rice',
    Mizoram: ['timber', 'Bamboo forests'],
    Tripura: ['rubber', 'India’s second-largest rubber state'],
    Sikkim: ['spices', 'Large cardamom'],
    'Himachal Pradesh': ['fruit', 'Apples from the hills'],
    Uttarakhand: ['pharma', 'Medicine plants at Haridwar'],
    'Jammu and Kashmir': ['fruit', 'Apples, walnuts and saffron'],
    Ladakh: ['livestock', 'Pashmina goats'],
    Delhi: ['textiles', 'Garment workshops and exporters'],
    'Dadra and Nagar Haveli and Daman and Diu': ['textiles', 'Synthetic yarn mills at Silvassa'],
    Puducherry: 'fish',
    Lakshadweep: ['fish', 'Tuna'],
    'Andaman and Nicobar Islands': 'fish',
  },
};

const BANGLADESH: CountryGoods = {
  headline: ['textiles', 'Ready-made clothes are over 80% of its exports'],
  regions: {
    Dhaka: ['textiles', 'Garment factories in Gazipur, Narayanganj and Savar'],
    Chattogram: ['steel', 'Ship-breaking yards at Sitakunda, and the main port'],
    Khulna: ['shrimp', 'Shrimp farms near the Sundarbans'],
    Rajshahi: ['fruit', 'Mangoes, and rice in the Barind'],
    Rangpur: ['rice', 'Rice, potatoes and tobacco'],
    Mymensingh: ['fish', 'The country’s largest fish farms'],
    Sylhet: ['tea', 'Most of the country’s tea gardens, and its gas fields'],
    Barishal: ['fish', 'Hilsa from the river mouths'],
  },
};

const GERMANY: CountryGoods = {
  headline: ['cars', 'Cars and parts are its largest export'],
  regions: {
    'Baden-Württemberg': ['machinery', 'Machine tools, beside Mercedes-Benz and Porsche'],
    Bayern: ['cars', 'BMW in Munich and Audi in Ingolstadt'],
    Niedersachsen: ['cars', 'Volkswagen in Wolfsburg'],
    'Nordrhein-Westfalen': ['steel', 'Duisburg, Europe’s largest steelworks'],
    'Rheinland-Pfalz': ['chemicals', 'BASF in Ludwigshafen'],
    'Sachsen-Anhalt': ['chemicals', 'The Leuna and Bitterfeld chemical parks'],
    Hessen: ['pharma', 'Medicine and chemical makers around Frankfurt and Darmstadt'],
    Saarland: ['steel', 'Steelworks at Dillingen and Völklingen'],
    Sachsen: ['electronics', 'Silicon Saxony: chip plants around Dresden'],
    Thüringen: ['optics', 'Optics and instruments in Jena'],
    Hamburg: ['aircraft', 'Airbus at Finkenwerder'],
    Bremen: ['cars', 'Mercedes-Benz, the city’s largest employer'],
    Berlin: ['electronics', 'Electrical equipment and its Siemens works'],
    Brandenburg: ['coal', 'Lignite from the Lusatia field'],
    'Mecklenburg-Vorpommern': ['wheat', 'Grain and rapeseed farms'],
    'Schleswig-Holstein': ['dairy', 'Dairy farms, beside wind power'],
  },
};

const USA: CountryGoods = {
  headline: ['oil', 'Crude and refined oil are its largest exports'],
  regions: {
    Alabama: ['cars', 'Mercedes-Benz, Hyundai and Honda plants'],
    Alaska: ['oil', 'The North Slope fields'],
    Arizona: ['copper', 'About two thirds of US copper'],
    Arkansas: ['rice', 'Grows about half of US rice'],
    California: ['electronics', 'Silicon Valley, beside almonds and fruit'],
    Colorado: 'livestock',
    Connecticut: ['aircraft', 'Jet engines and helicopters'],
    Delaware: 'chemicals',
    Florida: ['citrus', 'Oranges for juice'],
    Georgia: ['poultry', 'More chicken than any other state'],
    Hawaii: ['coffee', 'Kona coffee and macadamia nuts'],
    Idaho: ['vegetables', 'About a third of US potatoes'],
    Illinois: ['soy', 'The largest soybean state'],
    Indiana: ['steel', 'The largest steel-making state'],
    Iowa: ['maize', 'The largest maize state, and pigs'],
    Kansas: ['wheat', 'The wheat state'],
    Kentucky: ['cars', 'Toyota’s largest plant, in Georgetown'],
    Louisiana: ['gas', 'Most US liquefied gas is shipped from here'],
    Maine: ['fish', 'Lobster'],
    Maryland: 'poultry',
    Massachusetts: ['pharma', 'Biotech around Boston'],
    Michigan: ['cars', 'Detroit and its car makers'],
    Minnesota: ['ironOre', 'The Mesabi Range, most US iron ore'],
    Mississippi: ['cotton', 'Cotton in the Delta'],
    Missouri: 'soy',
    Montana: 'wheat',
    Nebraska: ['livestock', 'Beef cattle'],
    Nevada: ['gold', 'Most US gold'],
    'New Hampshire': 'machinery',
    'New Jersey': ['pharma', 'Many of the large medicine makers'],
    'New Mexico': ['oil', 'The Permian Basin'],
    'New York': ['gems', 'New York’s diamond and jewellery trade'],
    'North Carolina': ['tobacco', 'The largest tobacco state'],
    'North Dakota': ['oil', 'The Bakken field'],
    Ohio: ['aircraft', 'Jet engines near Cincinnati'],
    Oklahoma: 'oil',
    Oregon: ['electronics', 'Intel’s chip plants'],
    Pennsylvania: ['gas', 'The Marcellus shale'],
    'Rhode Island': 'gems',
    'South Carolina': ['cars', 'BMW’s largest plant, in Spartanburg'],
    'South Dakota': 'livestock',
    Tennessee: ['cars', 'Nissan, GM and Volkswagen plants'],
    Texas: ['oil', 'The largest oil and gas state'],
    Utah: ['copper', 'Bingham Canyon copper mine'],
    Vermont: 'dairy',
    Virginia: 'coal',
    Washington: ['aircraft', 'Boeing'],
    'West Virginia': 'coal',
    Wisconsin: ['dairy', 'The dairy state'],
    Wyoming: ['coal', 'The Powder River Basin'],
    'Puerto Rico': ['pharma', 'Medicine plants'],
    'American Samoa': ['fish', 'Tuna canning'],
  },
};

// Keys follow the map's boundary file, spelling included.
const BRAZIL: CountryGoods = {
  headline: ['soy', 'Soybeans are its largest export'],
  regions: {
    'Mato Grosso': ['soy', 'The largest soybean state'],
    Goias: 'soy',
    Tocantins: 'soy',
    Piaui: 'soy',
    Maranhao: 'soy',
    Para: ['ironOre', 'Carajás, the world’s largest iron ore mine'],
    'Minas Gerais': ['coffee', 'About half of Brazil’s coffee'],
    'Espirito Santo': ['coffee', 'Conilon coffee'],
    'Sao Paulo': ['sugar', 'Sugar, ethanol and orange juice'],
    'Rio de Jeneiro': ['oil', 'The offshore pre-salt fields'],
    Parana: ['poultry', 'The largest chicken state'],
    'Santa Catarina': ['pork', 'Pigs and pork'],
    'Rio Grande do Sul': ['rice', 'About 70% of Brazil’s rice'],
    'Mato Grosso do Sul': ['timber', 'Pulp mills at Três Lagoas'],
    Bahia: ['cotton', 'Cotton in western Bahia, and cocoa on the coast'],
    Amazonas: ['electronics', 'The Manaus Free Trade Zone'],
    Acre: 'timber',
    Amapa: 'gold',
    Rondonia: 'livestock',
    Roraima: 'livestock',
    Alagoas: 'sugar',
    Pernambuco: 'sugar',
    Paraiba: 'sugar',
    'Rio Granda do Norte': ['fruit', 'Melons'],
    Ceara: ['fruit', 'Cashew nuts and melons'],
    Sergipe: ['citrus', 'Oranges'],
  },
};

const CHINA: CountryGoods = {
  headline: ['electronics', 'Phones, computers and parts are its largest exports'],
  regions: {
    'Guangzhou Province': ['electronics', 'Guangdong, the Pearl River Delta factories'],
    'Jiangsu Province': ['chemicals', 'Chemicals and electronics'],
    'Zhejiang Province': ['textiles', 'Textiles and small goods'],
    'Shanghai Municipality': ['ships', 'Shipyards and car plants'],
    'Beijing Municipality': 'electronics',
    'Tianjin Municipality': ['oil', 'Bohai Bay oil and refining'],
    'Chongqing Municipality': ['electronics', 'A third of the world’s laptops'],
    'Shandong Province': ['vegetables', 'Vegetables and garlic, the largest farm exporter'],
    'Henan Province': ['wheat', 'More wheat than any other province'],
    'Hunan Province': ['rice', 'The largest rice province'],
    'Heilongjiang Province': ['soy', 'Soybeans, and the Daqing oil field'],
    'Hebei Province': ['steel', 'About a quarter of China’s steel'],
    'Shanxi Province': ['coal', 'The largest coal province'],
    'Inner Mongolia Autonomous Region': ['rareEarths', 'Bayan Obo, the world’s largest rare-earth mine'],
    'Xinjiang Uyghur Autonomous Region': ['cotton', 'About 90% of China’s cotton'],
    'Guangxi Zhuang Autonomous Region': ['sugar', 'About 60% of China’s sugar'],
    'Yunnan Province': ['tobacco', 'Tobacco, tea and coffee'],
    'Fujian Province': ['tea', 'Oolong and white tea'],
    'Hainan Province': ['rubber', 'Natural rubber'],
    'Jilin Province': ['cars', 'FAW in Changchun'],
    'Hubei Province': ['cars', 'Car plants in Wuhan'],
    'Anhui Province': ['cars', 'Chery and electric-car makers in Hefei'],
    'Liaoning Province': 'machinery',
    'Jiangxi Province': ['copper', 'Dexing, Asia’s largest open-pit copper mine'],
    'Gansu Province': ['minerals', 'Nickel at Jinchang'],
    'Qinghai Province': ['minerals', 'Potash and lithium from the salt lakes'],
    'Ningxia Ningxia Hui Autonomous Region': ['wine', 'Helan Mountain vineyards'],
    'Shaanxi Province': ['fruit', 'The largest apple province'],
    'Sichuan Province': ['pork', 'More pigs than any other province'],
    'Guizhou Province': 'coal',
    'Tibet Autonomous Region': ['livestock', 'Yak and sheep herding'],
    'Taiwan Province': ['electronics', 'Chips'],
  },
};

const DATA: Record<string, CountryGoods> = {
  Thailand: THAILAND,
  India: INDIA,
  Bangladesh: BANGLADESH,
  Germany: GERMANY,
  'United States of America': USA,
  Brazil: BRAZIL,
  China: CHINA,
};

export const GOODS_COUNTRIES = Object.keys(DATA);
export const hasGoods = (country: string) => country in DATA;

export interface RegionGood {
  id: GoodId;
  good: Good;
  note: string | null;
}

/** The good a state or province is known for; districts take their state's. */
export function regionGood(country: string, key: string): RegionGood | null {
  const regions = DATA[country]?.regions;
  if (!regions) return null;
  const top = key.split('/')[0];
  const pick = regions[top] ?? regions[top.replace(/ Province$/, '')];
  if (!pick) return null;
  const [id, note] = Array.isArray(pick) ? pick : [pick, null];
  return { id, good: GOODS[id], note };
}

/** The country's largest export by value. */
export function headlineGood(country: string): RegionGood | null {
  const c = DATA[country];
  return c ? { id: c.headline[0], good: GOODS[c.headline[0]], note: c.headline[1] } : null;
}

/** Goods in a country, most regions first. */
export function goodsSummary(country: string): { id: GoodId; good: Good; regions: string[] }[] {
  const c = DATA[country];
  if (!c) return [];
  const by = new Map<GoodId, string[]>();
  for (const [key, pick] of Object.entries(c.regions)) {
    const id = Array.isArray(pick) ? pick[0] : pick;
    by.set(id, [...(by.get(id) ?? []), key.replace(/ (Province|Municipality|Autonomous Region|Special Administrative Region)$/, '')]);
  }
  return [...by.entries()]
    .map(([id, regions]) => ({ id, good: GOODS[id], regions: regions.sort() }))
    .sort((a, b) => b.regions.length - a.regions.length || a.good.label.localeCompare(b.good.label));
}

export const GOODS_SOURCE =
  'Hand-curated from national agriculture, mining and industry statistics (Thailand OAE, India MoA and IBM, BBS, Destatis, USDA, EIA and USGS, IBGE and CONAB, China NBS); headline export from UN Comtrade 2023.';
