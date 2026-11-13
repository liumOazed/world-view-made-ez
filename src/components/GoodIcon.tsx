import { renderToStaticMarkup } from 'react-dom/server';
import {
  Anvil,
  Apple,
  Banana,
  Nut,
  Diamond,
  Cuboid,
  Shovel,
  Magnet,
  Zap,
  BatteryFull,
  Footprints,
  Sun,
  Droplets,
  BottleWine,
  Sofa,

  Atom,
  Bean,
  Beef,
  BrickWall,
  Car,
  Carrot,
  Cigarette,
  Citrus,
  Cloud,
  Coffee,
  Cog,
  Coins,
  Cpu,
  Cylinder,
  Droplet,
  Drumstick,
  Fish,
  Flame,
  FlaskConical,
  Flower,
  Flower2,
  Fuel,
  Gem,
  Grape,
  Ham,
  Hexagon,
  Leaf,
  Microscope,
  Milk,
  Mountain,
  Pickaxe,
  Pill,
  Plane,
  Ship,
  Shirt,
  Shrimp,
  Spool,
  Sprout,
  TreeDeciduous,
  TreePalm,
  TreePine,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { CATEGORY, GOODS, type GoodIcon, type GoodId } from '../data/goods';

const LUCIDE: Record<Exclude<GoodIcon, CustomIcon>, LucideIcon> = {
  Anvil,
  Banana,
  Nut,
  Diamond,
  Cuboid,
  Shovel,
  Magnet,
  Zap,
  BatteryFull,
  Footprints,
  Sun,
  Droplets,
  BottleWine,
  Sofa,

  Apple,
  Atom,
  Bean,
  Beef,
  BrickWall,
  Car,
  Carrot,
  Cigarette,
  Citrus,
  Cloud,
  Coffee,
  Cog,
  Coins,
  Cpu,
  Cylinder,
  Droplet,
  Drumstick,
  Fish,
  Flame,
  FlaskConical,
  Flower,
  Flower2,
  Fuel,
  Gem,
  Grape,
  Ham,
  Hexagon,
  Leaf,
  Microscope,
  Milk,
  Mountain,
  Pickaxe,
  Pill,
  Plane,
  Ship,
  Shirt,
  Shrimp,
  Spool,
  Sprout,
  TreeDeciduous,
  TreePalm,
  TreePine,
  Wheat,
};

/** Our own drawings, in Lucide's 24-unit stroke style, for goods Lucide lacks. */
type CustomIcon = 'paddy' | 'maize' | 'cane' | 'pod' | 'sheep';
const CUSTOM: Record<CustomIcon, string[]> = {
  // Rice plants standing in a flooded paddy, the tallest bending under its grain.
  paddy: [
    'M12 17V6',
    'M12 17c-.6-4.2-2.8-7.2-6.5-9',
    'M12 17c.6-4.2 2.8-7.2 6.5-9',
    'M12 6c1.6-1.8 4-2.4 6-1.6',
    'M3 20.5c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0',
  ],
  // A cob in its husk.
  maize: [
    'M12 2.5c2.4 0 3.8 3.4 3.8 8.2S14.4 19 12 19s-3.8-3.5-3.8-8.3S9.6 2.5 12 2.5Z',
    'M8.6 8h6.8',
    'M8.3 11.5h7.4',
    'M8.8 15h6.4',
    'M12 3v15.5',
    'M12 21.5c-3.6-.2-6.6-3.2-7-8.5',
    'M12 21.5c3.6-.2 6.6-3.2 7-8.5',
  ],
  // Two jointed canes with a leaf.
  // A ridged cocoa pod on its stalk.
  pod: [
    'M12 3.5c3.6 0 6 3.8 6 8.5s-2.4 8.5-6 8.5-6-3.8-6-8.5 2.4-8.5 6-8.5Z',
    'M12 3.6v16.8',
    'M9 5.2c-1 2-1.4 4.3-1.4 6.8s.4 4.8 1.4 6.8',
    'M15 5.2c1 2 1.4 4.3 1.4 6.8s-.4 4.8-1.4 6.8',
    'M12 3.5V1.5',
  ],
  // A sheep: a woolly body, a head and four legs.
  sheep: [
    'M7 9.5a2.6 2.6 0 0 1 4.6-1.6 2.6 2.6 0 0 1 4.4.6 2.6 2.6 0 0 1 1.6 4.6 2.6 2.6 0 0 1-2.8 3H8.4a2.6 2.6 0 0 1-2.2-3.8A2.6 2.6 0 0 1 7 9.5Z',
    'M6.4 11.2H4.2c-1 0-1.7-.8-1.5-1.8l.3-1.2',
    'M8.6 16.1V20',
    'M11.4 16.1V20',
    'M13.8 16.1V20',
    'M16.4 16.1V20',
  ],
  cane: ['M9 22V4', 'M15 22V7', 'M7.5 9.5h3', 'M7.5 15.5h3', 'M13.5 12.5h3', 'M13.5 18.5h3', 'M9 6c2.5-.3 4.6-1.6 6-4', 'M15 9c2-1 3.6-.8 5 .5'],
};

/** Just the glyph, sized for text. */
export function GoodGlyph({ icon, size = 14, strokeWidth = 2 }: { icon: GoodIcon; size?: number; strokeWidth?: number }) {
  if (icon in CUSTOM)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {CUSTOM[icon as CustomIcon].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  const I = LUCIDE[icon as Exclude<GoodIcon, CustomIcon>];
  return <I size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

/** A round badge in the good's category colour, as on the map. */
export function GoodBadge({ id, size = 22 }: { id: GoodId; size?: number }) {
  const g = GOODS[id];
  return (
    <span className="good-badge" style={{ width: size, height: size, background: CATEGORY[g.category].color }} title={g.label}>
      <GoodGlyph icon={g.icon} size={Math.round(size * 0.6)} strokeWidth={2.2} />
    </span>
  );
}

/**
 * The map's icon for a good, as SVG: a coin in the category colour with an
 * ivory rim and the glyph in white. Drawn at 2x for sharp edges.
 */
export function badgeSvg(id: GoodId, px = 64): string {
  const g = GOODS[id];
  const glyph = renderToStaticMarkup(<GoodGlyph icon={g.icon} size={24} strokeWidth={2.1} />)
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '')
    .replace(/currentColor/g, '#fbf6ea');
  const c = px / 2;
  const s = px * 0.56;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
<circle cx="${c}" cy="${c + 1.5}" r="${c - 3}" fill="rgba(4,9,20,0.55)"/>
<circle cx="${c}" cy="${c}" r="${c - 4}" fill="${CATEGORY[g.category].color}" stroke="#f1dfb6" stroke-width="3"/>
<circle cx="${c}" cy="${c}" r="${c - 8}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
<svg x="${c - s / 2}" y="${c - s / 2}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#fbf6ea" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
</svg>`;
}
