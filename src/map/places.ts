import { useEffect, useState } from 'react';
import type { Feature, FeatureCollection, LineString, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import INDEX from '../data/places.json';
import MANIFEST from '../data/subnational.json';

/**
 * Places below the country level. Every country with published boundaries
 * lists its levels here, top down. Most come from one TopoJSON file per
 * country in public/geo/admin/<ISO3>.json (states, then districts), listed in
 * src/data/subnational.json; Bangladesh has its own folder with a third level
 * and street-scale extras. Files load only when someone opens that country.
 */

export interface AdminLevel {
  singular: string;
  plural: string;
  /** File name in public/geo/<ISO3>/, without .json; empty for a TopoJSON country. */
  file: string;
}

export interface Subnational {
  iso3: string;
  levels: AdminLevel[];
  /** Street-scale extras shown from the district level down. */
  extras: ('roads' | 'markets' | 'rivers')[];
  credit: string;
  /** All levels in one TopoJSON file at public/geo/admin/<ISO3>.json. */
  topo?: boolean;
}

const GENERATED: Record<string, Subnational> = Object.fromEntries(
  Object.entries(MANIFEST as unknown as Record<string, { iso3: string; levels: [string, string][] }>).map(([name, m]) => [
    name,
    {
      iso3: m.iso3,
      levels: m.levels.map(([singular, plural]) => ({ singular, plural, file: '' })),
      extras: [],
      credit: 'geoBoundaries (CC BY 4.0)',
      topo: true,
    },
  ]),
);

export const SUBNATIONAL: Record<string, Subnational> = {
  ...GENERATED,
  Bangladesh: {
    iso3: 'BGD',
    levels: [
      { singular: 'Division', plural: 'divisions', file: 'adm1' },
      { singular: 'District', plural: 'districts', file: 'adm2' },
      { singular: 'Upazila', plural: 'upazilas and city areas', file: 'adm3' },
    ],
    extras: ['rivers', 'roads', 'markets'],
    credit: 'geoBoundaries (CC BY 4.0) · roads and markets © OpenStreetMap contributors',
  },
};

/** Where the map is: a country, then a key per level below it ("Dhaka", "Dhaka/Gazipur", …). */
export interface Place {
  country: string | null;
  path: string[];
}
export const WORLD: Place = { country: null, path: [] };
export const placeId = (p: Place) => [p.country ?? '', ...p.path].join('|');
/** "Dhaka/Gazipur/Kaliakair" → the keys of each level down to it. */
export const pathOf = (key: string) => key.split('/').map((_, i, a) => a.slice(0, i + 1).join('/'));
export const nameOf = (key: string) => key.slice(key.lastIndexOf('/') + 1);

export type UnitProps = { name: string; key: string; parent: string };
export type Unit = Feature<Polygon | MultiPolygon, UnitProps>;
type Lines = FeatureCollection<LineString | MultiLineString | Polygon | MultiPolygon>;

export interface Detail {
  country: string;
  spec: Subnational;
  outline: Feature<Polygon | MultiPolygon> | null;
  levels: FeatureCollection<Polygon | MultiPolygon, UnitProps>[];
  labels: FeatureCollection<Point, { name: string; key: string; lvl: number }>;
  extras: Partial<Record<'roads' | 'markets' | 'rivers', Lines | FeatureCollection<Point>>>;
  /** Unit by key, with its level (1 = top). */
  byKey: Map<string, { unit: Unit; level: number }>;
  /** Children by parent key; '' holds the top level. */
  children: Map<string, Unit[]>;
}

const base = import.meta.env.BASE_URL;
const getJson = <T,>(path: string): Promise<T> =>
  fetch(`${base}geo/${path}`).then((r) => {
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.json() as Promise<T>;
  });

const cache = new Map<string, Promise<Detail>>();

export function loadDetail(country: string): Promise<Detail> | null {
  const spec = SUBNATIONAL[country];
  if (!spec) return null;
  let p = cache.get(country);
  if (!p) {
    const dir = spec.iso3 + '/';
    p = (spec.topo ? loadTopo(spec) : Promise.all([
      getJson<FeatureCollection<Polygon | MultiPolygon>>(dir + 'outline.json').catch(() => null),
      Promise.all(spec.levels.map((l) => getJson<FeatureCollection<Polygon | MultiPolygon, UnitProps>>(dir + l.file + '.json'))),
      getJson<Detail['labels']>(dir + 'labels.json'),
      Promise.all(spec.extras.map((e) => getJson<Lines>(dir + e + '.json').then((d) => [e, d] as const))),
    ])).then(([outline, levels, labels, extras]) => {
      const byKey = new Map<string, { unit: Unit; level: number }>();
      const children = new Map<string, Unit[]>();
      let id = 1;
      levels.forEach((fc, i) =>
        fc.features.forEach((f) => {
          f.id = id++;
          byKey.set(f.properties.key, { unit: f, level: i + 1 });
          const list = children.get(f.properties.parent) ?? [];
          list.push(f);
          children.set(f.properties.parent, list);
        }),
      );
      for (const list of children.values()) list.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
      return {
        country,
        spec,
        outline: outline?.features[0] ?? null,
        levels,
        labels,
        extras: Object.fromEntries(extras),
        byKey,
        children,
      };
    });
    p.catch(() => cache.delete(country));
    cache.set(country, p);
  }
  return p;
}

type Loaded = [
  FeatureCollection<Polygon | MultiPolygon> | null,
  FeatureCollection<Polygon | MultiPolygon, UnitProps>[],
  Detail['labels'],
  (readonly [string, Lines])[],
];

/** One TopoJSON file holds every level, the outline and the label points. */
async function loadTopo(spec: Subnational): Promise<Loaded> {
  const topo = await getJson<Topology>(`admin/${spec.iso3}.json`);
  const fc = <T,>(name: string) => (topo.objects[name] ? (feature(topo, topo.objects[name]) as unknown as T) : null);
  const levels = spec.levels.map((_, i) => fc<FeatureCollection<Polygon | MultiPolygon, UnitProps>>(`adm${i + 1}`)!);
  for (const l of levels) l.features = l.features.filter((f) => f.geometry);
  return [
    fc<FeatureCollection<Polygon | MultiPolygon>>('outline'),
    levels,
    fc<Detail['labels']>('labels') ?? { type: 'FeatureCollection', features: [] },
    [],
  ];
}

/** The loaded boundaries for a country, or null while they load (or when it has none yet). */
export function useDetail(country: string | null): Detail | null {
  const [detail, setDetail] = useState<Detail | null>(null);
  useEffect(() => {
    let live = true;
    const p = country ? loadDetail(country) : null;
    if (!p) {
      setDetail(null);
      return;
    }
    p.then((d) => live && setDetail(d)).catch(() => live && setDetail(null));
    return () => {
      live = false;
    };
  }, [country]);
  return detail && detail.country === country ? detail : null;
}

/* ---------- cities (GeoNames), shared by the map and the cards ---------- */

export type City = Feature<Point, { name: string; pop: number; cc: string; cap?: number }>;
let citiesP: Promise<FeatureCollection<Point, City['properties']>> | null = null;
export const loadCities = () => (citiesP ??= getJson('cities.json'));

/* ---------- search index, bundled so places are found before their shapes load ---------- */

export interface PlaceHit {
  name: string;
  country: string;
  key: string;
  level: number;
  /** "District · Dhaka" */
  kind: string;
}
export const PLACE_INDEX: PlaceHit[] = Object.entries(INDEX as unknown as Record<string, [string, number][]>).flatMap(
  ([country, rows]) =>
    rows.map(([key, level]) => {
      const spec = SUBNATIONAL[country];
      const parent = key.includes('/') ? nameOf(key.slice(0, key.lastIndexOf('/'))) : country;
      return { name: nameOf(key), country, key, level, kind: `${spec?.levels[level - 1]?.singular ?? 'Place'} · ${parent}` };
    }),
);

/* ---------- geometry helpers ---------- */

type Poly = Polygon | MultiPolygon;
const polys = (g: Poly) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);

function inRing([x, y]: number[], r: number[][]) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[j];
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) c = !c;
  }
  return c;
}
/** Planar point-in-polygon: right for the small units it is used on. */
export const contains = (g: Poly, pt: number[]) =>
  polys(g).some((p) => inRing(pt, p[0]) && !p.slice(1).some((h) => inRing(pt, h)));

const R_KM = 6371.0088;
const rad = Math.PI / 180;
/** Spherical area of a ring in km² (sign-free). */
function ringArea(r: number[][]) {
  let s = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[i + 1];
    s += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad));
  }
  return Math.abs((s * R_KM * R_KM) / 2);
}
export const areaKm2 = (g: Poly) =>
  polys(g).reduce((a, p) => a + ringArea(p[0]) - p.slice(1).reduce((h, r) => h + ringArea(r), 0), 0);

export type Bounds = [[number, number], [number, number]];
function ringBounds(rings: number[][][]): Bounds {
  let w = 180, s = 90, e = -180, n = -90;
  for (const r of rings)
    for (const [x, y] of r) {
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    }
  return [[w, s], [e, n]];
}
/**
 * Bounds of a shape's main body: the largest part, plus any part close to it.
 * Keeps France on Europe and the US on the lower 48 instead of the whole Pacific.
 */
export function mainBounds(g: Poly): Bounds {
  const parts = polys(g).map((p) => ({ b: ringBounds([p[0]]), a: ringArea(p[0]) }));
  parts.sort((a, b) => b.a - a.a);
  const [main] = parts;
  let [[w, s], [e, n]] = main.b;
  const pad = Math.max(e - w, n - s) * 0.35 + 1;
  for (const p of parts.slice(1)) {
    const [[pw, ps], [pe, pn]] = p.b;
    if (pw > w - pad && pe < e + pad && ps > s - pad && pn < n + pad && p.a > main.a * 0.002) {
      w = Math.min(w, pw);
      s = Math.min(s, ps);
      e = Math.max(e, pe);
      n = Math.max(n, pn);
    }
  }
  return [[w, s], [e, n]];
}
