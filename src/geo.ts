import { geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';

export type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }> & {
  /** Point used for connection arcs and labels, [lon, lat]. */
  anchor: [number, number];
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

export const COUNTRY_FEATURES: CountryFeature[] = (
  feature(topo, topo.objects.countries).features as Feature<Polygon | MultiPolygon, { name: string }>[]
)
  .filter((f) => f.properties.name !== 'Antarctica' && f.properties.name !== 'Fr. S. Antarctic Lands')
  .map((f) => ({
    ...f,
    anchor: ANCHORS[f.properties.name] ?? (geoCentroid(f) as [number, number]),
  }));
