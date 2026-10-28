import { geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import smallCountries from './data/small-countries.json';

export type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }> & {
  /** Point used for connection arcs and labels, [lon, lat]. */
  anchor: [number, number];
  /** Too small to click as a shape; drawn with a marker as well. */
  small: boolean;
};

// Centroids of multi-part countries can land in the sea; pin these to an
// economic centre instead.
const ANCHORS: Record<string, [number, number]> = {
  'United States of America': [-97, 38.5],
  France: [2.4, 46.6],
  Norway: [9, 61],
  Russia: [45, 56],
  Canada: [-98, 55],
  Netherlands: [5.3, 52.2],
  Indonesia: [110, -7],
  Malaysia: [102, 4],
  Chile: [-71, -33],
  Japan: [138.5, 36.5],
  'United Kingdom': [-1.5, 52.5],
};

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;

type Raw = Feature<Polygon | MultiPolygon, { name: string }>;

const base = (feature(topo, topo.objects.countries).features as Raw[]).filter(
  (f) => f.properties.name !== 'Antarctica' && f.properties.name !== 'Fr. S. Antarctic Lands',
);
// Small states missing from the 110m data, extracted from 50m by
// scripts/extract-small-countries.mjs.
const extra = (smallCountries as { features: Raw[] }).features;

export const COUNTRY_FEATURES: CountryFeature[] = [
  ...base.map((f) => ({ f, small: false })),
  ...extra.map((f) => ({ f, small: true })),
].map(({ f, small }) => ({
  ...f,
  small,
  anchor: ANCHORS[f.properties.name] ?? (geoCentroid(f) as [number, number]),
}));
