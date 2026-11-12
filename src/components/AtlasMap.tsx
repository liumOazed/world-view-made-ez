import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, {
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type LayerSpecification,
  type Map as MLMap,
  type MapGeoJSONFeature,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoInterpolate } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, LineString, MultiPolygon, Point, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { Globe2, Map as MapIcon, Minus, Plus } from 'lucide-react';
import type { CountryProfile } from '../data/countries';
import { CHOKEPOINTS } from '../data/global';
import type { Layer } from '../data/layers';
import { regionalMeta } from '../data/regional';
import { COUNTRY_FEATURES } from '../geo';
import { useReducedEffects } from '../effects';
import { loadCities, mainBounds, pathOf, placeId, type Bounds, type Detail, type Place } from '../map/places';

export interface MapLink {
  name: string;
  color: string;
  /** Relative strength, roughly 0–100; sets line width. */
  weight: number;
}

interface Props {
  profiles: Map<string, CountryProfile>;
  layer: Layer;
  place: Place;
  onPlace: (p: Place) => void;
  /** Connections drawn from the selected country. Empty hides them. */
  links: MapLink[];
  detail: Detail | null;
  /** Room the floating panels take, so a fly-in centres the place in what is left. */
  inset: { right: number; bottom: number };
  showChokepoints: boolean;
  /** False while another page covers the map: the globe stops turning. */
  active: boolean;
}

/* ---------- palette ---------- */

const C = {
  space: '#070e1c',
  sea: '#0e1f3d',
  land: '#1d2a45',
  land2: '#2c3d61',
  empty: '#26324a',
  coast: '#3a4a6b',
  border: '#56688c',
  river: '#14294d',
  road: '#33466b',
  road2: '#6a7a9a',
  label: '#d7dce6',
  faint: '#8d99ad',
  halo: 'rgba(7, 14, 28, 0.88)',
  brass: '#c9a96e',
  sel: '#f1dfb6',
};
const FONT = ['noto'];
const MAX_FLY_ZOOM = 12.4;
const SPIN_DEG_PER_MS = 0.0035;
const ARC_STEPS = 64;

type WorldFeature = Feature<Polygon | MultiPolygon, { name: string }>;
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

/** Zoom at which the whole globe fits the viewport with a little room around it. */
/** The flat map's world view: the whole width of the world, a little cropped at the poles. */
function flatZoom(w: number, h: number) {
  return Math.max(Math.log2(w / 512), Math.log2(h / 360)) + 0.05;
}
const FLAT_CENTER: [number, number] = [12, 24];

function readFlat() {
  try {
    return localStorage.getItem('atlas-projection') === 'flat';
  } catch {
    return false;
  }
}

function worldZoom(w: number, h: number, lat = 18) {
  const r = Math.min(w, h) * (w < 720 ? 0.46 : 0.4);
  return Math.log2((r * 2 * Math.PI * Math.cos((lat * Math.PI) / 180)) / 512);
}

/** On-screen radius of the globe, from MapLibre's own camera model. */
function globeRadiusPx(map: MLMap) {
  const z = map.getZoom();
  const lat = map.getCenter().lat;
  const h = map.getContainer().clientHeight;
  const R = (512 * 2 ** z) / (2 * Math.PI) / Math.cos((lat * Math.PI) / 180);
  const D = (0.5 / Math.tan((map.transform.fov * Math.PI) / 360)) * h;
  return D * Math.tan(Math.asin(Math.min(1, R / (D + R))));
}

const graticule = (): FeatureCollection<LineString> => {
  const lines: Feature<LineString>[] = [];
  for (let lon = -180; lon < 180; lon += 20)
    lines.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: Array.from({ length: 33 }, (_, i) => [lon, -80 + i * 5]) } });
  for (let lat = -60; lat <= 60; lat += 20)
    lines.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]) } });
  return { type: 'FeatureCollection', features: lines };
};

/** Great-circle path with longitudes kept continuous, so lines never wrap the long way. */
function arcPath(a: [number, number], b: [number, number]) {
  const f = geoInterpolate(a, b);
  const pts: [number, number][] = [];
  let shift = 0;
  for (let i = 0; i <= ARC_STEPS; i++) {
    const [x, y] = f(i / ARC_STEPS);
    const prev = pts[i - 1];
    if (prev) {
      const d = x + shift - prev[0];
      if (d > 180) shift -= 360;
      else if (d < -180) shift += 360;
    }
    pts.push([x + shift, y]);
  }
  return pts;
}

/**
 * Natural Earth closes rings that touch the antimeridian with an edge from
 * +180 to -180. On a globe that edge circles the planet, so keep each ring's
 * longitudes continuous instead.
 */
function unwrapRing(r: number[][]) {
  let shift = 0;
  return r.map((pt, i) => {
    if (i) {
      const d = pt[0] - r[i - 1][0];
      if (d > 180) shift -= 360;
      else if (d < -180) shift += 360;
    }
    return shift ? [pt[0] + shift, pt[1]] : pt;
  });
}
function unwrapGeometry<G extends Polygon | MultiPolygon>(g: G): G {
  const crosses = (r: number[][]) => r.some((p, i) => i > 0 && Math.abs(p[0] - r[i - 1][0]) > 180);
  const fix = (rings: number[][][]) => rings.map((r) => (crosses(r) ? unwrapRing(r) : r));
  return (g.type === 'Polygon' ? { ...g, coordinates: fix(g.coordinates) } : { ...g, coordinates: g.coordinates.map(fix) }) as G;
}

const anchors = new Map(COUNTRY_FEATURES.map((f) => [f.properties.name, f.anchor] as const));

/* ---------- the style ---------- */

function buildStyle(world: FeatureCollection, countryLabels: FeatureCollection): StyleSpecification {
  const geo = (data: FeatureCollection = EMPTY_FC) => ({ type: 'geojson' as const, data });
  const hoverOr = (on: number | string, off: number | string | ExpressionSpecification): ExpressionSpecification => [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    on,
    off,
  ];
  const levelLayers = [1, 2, 3].flatMap((L): LayerSpecification[] => [
    // Region-by-region colours, where the measure has regional figures.
    { id: `lv${L}-data`, type: 'fill', source: `lv${L}`, layout: { visibility: 'none' }, paint: { 'fill-color': 'rgba(0,0,0,0)', 'fill-opacity': 0.94 } },
    {
      id: `lv${L}-fill`,
      type: 'fill',
      source: `lv${L}`,
      layout: { visibility: 'none' },
      paint: { 'fill-color': hoverOr('#f3efe6', C.space), 'fill-opacity': hoverOr(0.2, 0) },
    },
  ]);
  const levelLines: LayerSpecification[] = [
    { id: 'lv3-line', type: 'line', source: 'lv3', layout: { visibility: 'none' }, paint: { 'line-color': C.border, 'line-width': 0.6, 'line-opacity': 0.7 } },
    {
      id: 'lv2-line',
      type: 'line',
      source: 'lv2',
      layout: { visibility: 'none' },
      paint: { 'line-color': C.border, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 1.2], 'line-dasharray': [3, 2] },
    },
    {
      id: 'lv1-line',
      type: 'line',
      source: 'lv1',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#93a0b8', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1, 10, 2] },
    },
  ];
  const selLayers = [1, 2, 3].flatMap((L): LayerSpecification[] => [
    {
      id: `lv${L}-sel-glow`,
      type: 'line',
      source: `lv${L}`,
      layout: { visibility: 'none' },
      paint: { 'line-color': C.brass, 'line-width': 7, 'line-opacity': 0.28, 'line-blur': 4 },
    },
    { id: `lv${L}-sel`, type: 'line', source: `lv${L}`, layout: { visibility: 'none' }, paint: { 'line-color': C.sel, 'line-width': 2 } },
  ]);
  const unitLabels = [1, 2, 3].map(
    (L): LayerSpecification => ({
      id: `lv${L}-labels`,
      type: 'symbol',
      source: 'unit-labels',
      layout: {
        visibility: 'none',
        'text-field': L === 1 ? ['upcase', ['get', 'name']] : ['get', 'name'],
        'text-font': FONT,
        'text-size': L === 1 ? 13 : L === 2 ? 12.5 : 11.5,
        'text-letter-spacing': L === 1 ? 0.2 : 0.06,
        'text-max-width': 8,
      },
      paint: { 'text-color': L === 1 ? '#e6dcc6' : C.label, 'text-halo-color': C.halo, 'text-halo-width': 1.4 },
    }),
  );
  return {
    version: 8,
    glyphs: `${location.origin}${import.meta.env.BASE_URL}glyphs/{fontstack}/{range}.pbf`,
    projection: { type: 'globe' },
    sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.7, 7, 0] },
    sources: {
      world: { ...geo(world), maxzoom: 10, tolerance: 0.25 },
      graticule: geo(graticule()),
      'country-labels': geo(countryLabels),
      lv1: geo(),
      lv2: geo(),
      lv3: geo(),
      'unit-labels': geo(),
      rivers: geo(),
      roads: geo(),
      markets: geo(),
      cities: geo(),
      arcs: { ...geo(), lineMetrics: true },
      'arc-ends': geo(),
      flow: geo(),
      choke: geo({
        type: 'FeatureCollection',
        features: CHOKEPOINTS.map((c) => ({ type: 'Feature', properties: { name: c.name, carries: c.carries }, geometry: { type: 'Point', coordinates: c.coords } })),
      }),
    },
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': C.sea } },
      {
        id: 'graticule',
        type: 'line',
        source: 'graticule',
        paint: { 'line-color': '#9fb6dc', 'line-width': 0.5, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.13, 4, 0.05, 5, 0] },
      },
      { id: 'land', type: 'fill', source: 'world', paint: { 'fill-color': C.land } },
      { id: 'world-data', type: 'fill', source: 'world', paint: { 'fill-color': C.empty, 'fill-opacity': 0.94 } },
      { id: 'world-dim', type: 'fill', source: 'world', filter: ['==', ['get', 'name'], ''], paint: { 'fill-color': C.space, 'fill-opacity': 0.5 } },
      { id: 'world-hover', type: 'fill', source: 'world', paint: { 'fill-color': '#f3efe6', 'fill-opacity': hoverOr(0.12, 0) } },
      { id: 'rivers', type: 'fill', source: 'rivers', minzoom: 5, paint: { 'fill-color': C.river } },
      ...levelLayers,
      ...levelLines,
      {
        id: 'roads-minor',
        type: 'line',
        source: 'roads',
        minzoom: 7.5,
        filter: ['!=', ['get', 'highway'], 'trunk'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 7.5, 0.6, 12, 2.4] },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'roads',
        minzoom: 5.5,
        filter: ['==', ['get', 'highway'], 'trunk'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.road2, 'line-opacity': 0.75, 'line-width': ['interpolate', ['linear'], ['zoom'], 5.5, 0.6, 9, 1.5, 13, 4] },
      },
      { id: 'country-line', type: 'line', source: 'world', paint: { 'line-color': C.coast, 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.35, 6, 1.1] } },
      {
        id: 'sel-glow',
        type: 'line',
        source: 'world',
        filter: ['==', ['get', 'name'], ''],
        paint: { 'line-color': C.brass, 'line-width': 6, 'line-opacity': 0.22, 'line-blur': 4 },
      },
      { id: 'sel-line', type: 'line', source: 'world', filter: ['==', ['get', 'name'], ''], paint: { 'line-color': C.sel, 'line-width': 1.6 } },
      ...selLayers,
      {
        id: 'arc-glow',
        type: 'line',
        source: 'arcs',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': ['+', 5, ['get', 'w']], 'line-opacity': 0.14, 'line-blur': 4 },
      },
      {
        id: 'arc-line',
        type: 'line',
        source: 'arcs',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'w'], 'line-opacity': 0.75 },
      },
      {
        id: 'markets',
        type: 'circle',
        source: 'markets',
        minzoom: 11,
        paint: { 'circle-radius': 2.4, 'circle-color': '#d9c99a', 'circle-opacity': 0.7, 'circle-stroke-color': C.halo, 'circle-stroke-width': 0.8 },
      },
      {
        id: 'arc-ends',
        type: 'circle',
        source: 'arc-ends',
        paint: { 'circle-radius': 3, 'circle-color': ['get', 'color'], 'circle-stroke-color': C.space, 'circle-stroke-width': 1.2 },
      },
      {
        id: 'flow-glow',
        type: 'circle',
        source: 'flow',
        paint: { 'circle-radius': ['+', 5, ['get', 'w']], 'circle-color': ['get', 'color'], 'circle-opacity': 0.28, 'circle-blur': 1 },
      },
      { id: 'flow', type: 'circle', source: 'flow', paint: { 'circle-radius': ['+', 1.3, ['*', 0.45, ['get', 'w']]], 'circle-color': '#fbf6ea' } },
      {
        id: 'choke',
        type: 'circle',
        source: 'choke',
        maxzoom: 6,
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': hoverOr(6, 4.2),
          'circle-color': 'rgba(201, 169, 110, 0.22)',
          'circle-stroke-color': C.brass,
          'circle-stroke-width': 1.3,
        },
      },
      {
        id: 'city-dots',
        type: 'circle',
        source: 'cities',
        minzoom: 2.6,
        filter: ['==', ['get', 'cap'], 1],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.6, 8, ['case', ['==', ['get', 'cap'], 1], 4, 2.8]],
          'circle-color': ['case', ['==', ['get', 'cap'], 1], C.brass, C.label],
          'circle-stroke-color': C.halo,
          'circle-stroke-width': 1,
        },
      },
      {
        id: 'country-labels',
        type: 'symbol',
        source: 'country-labels',
        maxzoom: 7,
        filter: ['any', ['<', ['get', 'rank'], 36], ['>=', ['zoom'], 3.2]],
        layout: {
          'text-field': ['upcase', ['get', 'name']],
          'text-font': FONT,
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 8.5, 5, 12.5],
          'text-letter-spacing': 0.16,
          'text-max-width': 7,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: { 'text-color': 'rgba(232, 236, 244, 0.78)', 'text-halo-color': 'rgba(7, 14, 28, 0.7)', 'text-halo-width': 1, 'text-halo-blur': 0.6 },
      },
      ...unitLabels,
      {
        id: 'city-labels',
        type: 'symbol',
        source: 'cities',
        minzoom: 2.6,
        filter: ['==', ['get', 'cap'], 1],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT,
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 9, ['case', ['>=', ['get', 'pop'], 1000000], 15, 12]],
          'text-anchor': 'left',
          'text-offset': [0.6, 0],
          'symbol-sort-key': ['-', 0, ['get', 'pop']],
          'text-optional': true,
        },
        paint: { 'text-color': '#f3efe6', 'text-halo-color': C.halo, 'text-halo-width': 1.4 },
      },
    ],
  };
}

/* ---------- component ---------- */

interface Tip {
  x: number;
  y: number;
  title: string;
  sub: string;
  swatch?: string;
}

export function AtlasMap({ profiles, layer, place, onPlace, links, detail, inset, showChokepoints, active }: Props) {
  const reduced = useReducedEffects();
  const wrapRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const [flat, setFlat] = useState(readFlat);
  const flatRef = useRef(flat);
  flatRef.current = flat;
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);

  // Latest props for map event handlers, which are bound once.
  const live = useRef({ place, detail, layer, profiles, onPlace, reduced, active, inset, links });
  live.current = { place, detail, layer, profiles, onPlace, reduced, active, inset, links };

  const worldRef = useRef<WorldFeature[]>([]);
  const outlinesRef = useRef(new Map<string, Feature<Polygon | MultiPolygon>>());
  const flownRef = useRef('');
  const skipFlyRef = useRef(false);
  const pauseUntil = useRef(0);
  const hoverRef = useRef<{ source: string; id: string | number } | null>(null);
  const arcsRef = useRef<{ pts: [number, number][]; color: string; w: number }[]>([]);
  const drawStart = useRef(0);
  const originRef = useRef<maplibregl.Marker | null>(null);

  const countryLabels = useMemo((): FeatureCollection<Point> => {
    const ranked = COUNTRY_FEATURES.filter((f) => !f.small)
      .map((f) => ({ f, p: profiles.get(f.properties.name) }))
      .sort((a, b) => (b.p?.gdp ?? 0) - (a.p?.gdp ?? 0));
    return {
      type: 'FeatureCollection',
      features: ranked.map(({ f, p }, rank) => ({
        type: 'Feature',
        properties: { name: p?.display ?? f.properties.name, rank },
        geometry: { type: 'Point', coordinates: f.anchor },
      })),
    };
  }, [profiles]);

  /* ----- create the map once ----- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ids = new Map<string, number>();
    const withIds = (fs: WorldFeature[]) =>
      fs.map((f) => {
        const n = f.properties.name;
        if (!ids.has(n)) ids.set(n, ids.size + 1);
        const g = outlinesRef.current.get(n);
        return { ...f, id: ids.get(n), geometry: unwrapGeometry((g?.geometry ?? f.geometry) as Polygon | MultiPolygon) } as WorldFeature;
      });
    worldRef.current = withIds(COUNTRY_FEATURES as WorldFeature[]);
    const w = el.clientWidth || 1200;
    const h = el.clientHeight || 800;
    const map = new maplibregl.Map({
      container: el,
      style: buildStyle({ type: 'FeatureCollection', features: worldRef.current }, countryLabels),
      center: [78, 18],
      zoom: worldZoom(w, h),
      minZoom: 0.6,
      maxZoom: 15,
      attributionControl: false,
      renderWorldCopies: false,
      dragRotate: false,
      pitchWithRotate: false,
      fadeDuration: 180,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          'Natural Earth · Boundaries © geoBoundaries (CC BY 4.0) · Roads, markets © OpenStreetMap contributors (ODbL) · Places © GeoNames',
      }),
      'bottom-left',
    );
    // Missing glyph ranges or an aborted fetch should not break the map.
    map.on('error', (e) => console.warn('[map]', e.error?.message ?? e));
    mapRef.current = map;

    const pause = (ms = 5000) => (pauseUntil.current = performance.now() + ms);
    for (const ev of ['mousedown', 'touchstart', 'wheel'] as const) map.on(ev, () => pause());

    map.on('load', () => {
      setReady(true);
      // Keep the credits folded into the (i) button until asked for.
      el.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      // The detailed 1:50m outlines arrive after first paint.
      import('world-atlas/countries-50m.json').then((m) => {
        const topo = m.default as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
        const fs = (feature(topo, topo.objects.countries).features as WorldFeature[]).filter(
          (f) => f.properties.name !== 'Antarctica' && f.properties.name !== 'Fr. S. Antarctic Lands',
        );
        worldRef.current = withIds(fs);
        (map.getSource('world') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: worldRef.current });
      });
      loadCities().then((c) => (map.getSource('cities') as GeoJSONSource | undefined)?.setData(c));
    });

    // Shading over the globe: a lit limb top-left and a darker edge, like a lamp on a desk globe.
    const shade = () => {
      const s = shadeRef.current;
      if (!s) return;
      const z = map.getZoom();
      const op = flatRef.current ? 0 : Math.max(0, Math.min(1, (5 - z) / 2));
      s.style.opacity = String(op);
      if (!op) return;
      const r = globeRadiusPx(map);
      const c = map.project(map.getCenter());
      s.style.width = s.style.height = `${2 * r}px`;
      s.style.transform = `translate(${c.x - r}px, ${c.y - r}px)`;
    };
    map.on('move', shade);
    map.on('resize', shade);
    map.on('load', shade);

    // Zooming well out by hand returns to the world view.
    map.on('zoomend', (e) => {
      const { place: p } = live.current;
      if (!('originalEvent' in e) || !e.originalEvent || !p.country) return;
      if (map.getZoom() < 2.4) {
        skipFlyRef.current = true;
        live.current.onPlace({ country: null, path: [] });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- which layers answer the pointer at this level ----- */
  const levelState = useCallback(() => {
    const { place: p, detail: d0 } = live.current;
    const d = d0 && d0.country === p.country ? d0 : null;
    const n = d ? d.levels.length : 0;
    const depth = p.path.length;
    const activeLevel = d ? Math.min(depth + 1, n) : 0;
    const cur = p.path[depth - 1] ?? '';
    // At the deepest level the siblings stay clickable.
    const parentKey = activeLevel === depth + 1 ? cur : cur.includes('/') ? cur.slice(0, cur.lastIndexOf('/')) : '';
    return { d, n, depth, activeLevel, cur, parentKey };
  }, []);

  const pick = useCallback(
    (point: maplibregl.PointLike): MapGeoJSONFeature | undefined => {
      const map = mapRef.current;
      if (!map) return;
      const { activeLevel } = levelState();
      const order = ['choke'];
      for (let L = activeLevel; L >= 1; L--) order.push(`lv${L}-fill`);
      order.push('world-hover');
      for (const id of order) {
        if (!map.getLayer(id) || map.getLayoutProperty(id, 'visibility') === 'none') continue;
        const f = map.queryRenderedFeatures(point, { layers: [id] })[0];
        if (f) return f;
      }
    },
    [levelState],
  );

  /* ----- hover and click ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const setHover = (f?: MapGeoJSONFeature) => {
      const h = hoverRef.current;
      if (h && (!f || h.source !== f.source || h.id !== f.id)) map.setFeatureState(h, { hover: false });
      hoverRef.current = f && f.id != null ? { source: f.source, id: f.id } : null;
      if (hoverRef.current) map.setFeatureState(hoverRef.current, { hover: true });
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      const f = pick(e.point);
      setHover(f);
      map.getCanvas().style.cursor = f ? 'pointer' : '';
      if (!f) return setTip(null);
      const { layer: L, profiles: P, detail: d } = live.current;
      let title = String(f.properties.name);
      let sub = '';
      let swatch: string | undefined;
      if (f.layer.id === 'choke') sub = `Chokepoint · ${f.properties.carries}`;
      else if (f.layer.id === 'world-hover') {
        const p = P.get(title);
        title = p?.display ?? title;
        const v = p ? L.value(p) : NaN;
        sub = Number.isFinite(v) ? `${L.metric}: ${L.format(v)}` : `${L.metric}: no data`;
        swatch = Number.isFinite(v) ? L.color(v) : undefined;
      } else if (d) {
        const lvl = Number(f.layer.id[2]);
        const spec = d.spec.levels[lvl - 1];
        const cp = live.current.place.country ? P.get(live.current.place.country) : undefined;
        const key = String(f.properties.key);
        const rv = L.regional && d.country ? L.regional(d.country, key) : NaN;
        const v = Number.isFinite(rv) ? rv : cp ? L.value(cp) : NaN;
        swatch = Number.isFinite(v) ? L.color(v) : undefined;
        const meta = Number.isFinite(rv) && L.regionSource === 'gdl' ? regionalMeta(d.country, key) : null;
        const tag = !Number.isFinite(rv) ? ' (national)' : meta && !meta.own ? ` (${d.spec.levels[0].singular.toLowerCase()})` : '';
        sub = `${spec.singular} · ${L.metric}: ${Number.isFinite(v) ? `${L.format(v)}${tag}` : 'no data'}`;
      }
      const r = wrapRef.current!.getBoundingClientRect();
      setTip({ x: e.point.x, y: e.point.y, title, sub, swatch, ...(e.point.x > r.width - 240 ? { x: e.point.x - 250 } : {}) });
    };
    const onLeave = () => {
      setHover();
      setTip(null);
    };
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const f = pick(e.point);
      if (!f) return;
      const { place: p, onPlace } = live.current;
      pauseUntil.current = performance.now() + 8000;
      if (f.layer.id === 'choke') return;
      if (f.layer.id === 'world-hover') {
        const n = String(f.properties.name);
        if (n !== p.country || p.path.length) onPlace({ country: n, path: [] });
        return;
      }
      onPlace({ country: p.country, path: pathOf(String(f.properties.key)) });
    };
    map.on('mousemove', onMove);
    map.on('click', onClick);
    map.getCanvas().addEventListener('mouseleave', onLeave);
    return () => {
      map.off('mousemove', onMove);
      map.off('click', onClick);
      map.getCanvas().removeEventListener('mouseleave', onLeave);
    };
  }, [ready, pick, levelState]);

  /* ----- data colors ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const pairs: string[] = [];
    for (const [name, p] of profiles) {
      const v = layer.value(p);
      if (Number.isFinite(v)) pairs.push(name, layer.color(v));
    }
    const expr = (pairs.length ? ['match', ['get', 'name'], ...pairs, C.empty] : C.empty) as unknown as ExpressionSpecification;
    map.setPaintProperty('world-data', 'fill-color', expr);
  }, [ready, layer, profiles]);

  /* ----- regional colours for the open country ----- */
  const pid = placeId(place);
  const regional = !!(layer.regional && detail && layer.hasRegional?.(detail.country));
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !detail) return;
    detail.levels.forEach((fc, i) => {
      const pairs: string[] = [];
      if (regional) {
        for (const f of fc.features) {
          const key = String(f.properties?.key);
          const v = layer.regional!(detail.country, key);
          if (Number.isFinite(v)) pairs.push(key, layer.color(v));
        }
      }
      const expr = (pairs.length ? ['match', ['get', 'key'], ...pairs, 'rgba(0,0,0,0)'] : 'rgba(0,0,0,0)') as unknown as ExpressionSpecification;
      map.setPaintProperty(`lv${i + 1}-data`, 'fill-color', expr);
    });
  }, [ready, detail, layer, regional]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { n, activeLevel, parentKey } = levelState();
    for (let L = 1; L <= 3; L++) {
      const on = regional && L <= n && L <= activeLevel;
      map.setLayoutProperty(`lv${L}-data`, 'visibility', on ? 'visible' : 'none');
      if (on) map.setFilter(`lv${L}-data`, L === activeLevel ? ['==', ['get', 'parent'], parentKey] : null);
    }
  }, [ready, pid, detail, regional, levelState]);

  /* ----- boundaries for the open country ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const set = (id: string, data: FeatureCollection) => (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
    if (!detail) {
      for (const id of ['lv1', 'lv2', 'lv3', 'unit-labels', 'rivers', 'roads', 'markets']) set(id, EMPTY_FC);
      return;
    }
    detail.levels.forEach((fc, i) => set(`lv${i + 1}`, fc));
    set('unit-labels', detail.labels);
    for (const k of ['rivers', 'roads', 'markets'] as const) set(k, (detail.extras[k] as FeatureCollection) ?? EMPTY_FC);
    // Swap the country's outline for the one its divisions were cut from, so the edges meet.
    if (detail.outline && !outlinesRef.current.has(detail.country)) {
      outlinesRef.current.set(detail.country, detail.outline);
      worldRef.current = worldRef.current.map((f) =>
        f.properties.name === detail.country ? ({ ...f, geometry: detail.outline!.geometry } as WorldFeature) : f,
      );
      set('world', { type: 'FeatureCollection', features: worldRef.current });
    }
  }, [ready, detail]);

  /* ----- per-level visibility, filters and the fly-in ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { d, n, depth, activeLevel, cur, parentKey } = levelState();
    const vis = (id: string, on: boolean) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    const country = place.country ?? '';

    // The chosen measure stays on at every level; regions show their country's value.
    vis('world-data', true);
    map.setPaintProperty('world-dim', 'fill-opacity', depth === 0 ? 0.55 : 0.62);
    map.setFilter('sel-line', ['==', ['get', 'name'], country]);
    map.setFilter('sel-glow', ['==', ['get', 'name'], depth === 0 ? country : '']);

    for (let L = 1; L <= 3; L++) {
      const exists = L <= n;
      vis(`lv${L}-fill`, exists && L <= activeLevel);
      vis(`lv${L}-line`, exists && L <= activeLevel);
      vis(`lv${L}-labels`, exists && L === activeLevel);
      vis(`lv${L}-sel`, exists && L === depth);
      vis(`lv${L}-sel-glow`, exists && L === depth);
      if (!exists) continue;
      const isActive = L === activeLevel;
      map.setFilter(`lv${L}-fill`, isActive ? ['==', ['get', 'parent'], parentKey] : null);
      // Colours show through where you are; the rest of the country steps back.
      const here = isActive ? (depth === n ? cur : '') : place.path[L - 1];
      const base: ExpressionSpecification | number = here ? ['case', ['==', ['get', 'key'], here], 0, isActive ? 0.3 : 0.5] : 0;
      map.setPaintProperty(`lv${L}-fill`, 'fill-opacity', [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        isActive ? 0.2 : 0.1,
        base,
      ] as ExpressionSpecification);
      map.setFilter(
        `lv${L}-labels`,
        ['all', ['==', ['get', 'lvl'], L], parentKey ? ['==', ['index-of', `${parentKey}/`, ['get', 'key']], 0] : true] as FilterSpecification,
      );
      map.setFilter(`lv${L}-sel`, ['==', ['get', 'key'], cur]);
      map.setFilter(`lv${L}-sel-glow`, ['==', ['get', 'key'], cur]);
    }
    for (const id of ['rivers', 'roads-minor', 'roads-major', 'markets']) vis(id, !!d && depth >= 1);

    // Cities: capitals and megacities everywhere, more towns inside the open country.
    const cc = place.country ? profiles.get(place.country)?.iso2 : undefined;
    const cityFilter = (
      cc
        ? ['any', ['==', ['get', 'cap'], 1], ['>=', ['get', 'pop'], 5000000], ['all', ['==', ['get', 'cc'], cc], ['any', ['>=', ['get', 'pop'], 250000], ['>=', ['zoom'], 7.6]]]]
        : ['any', ['==', ['get', 'cap'], 1], ['>=', ['get', 'pop'], 5000000]]
    ) as FilterSpecification;
    map.setFilter('city-dots', cityFilter);
    map.setFilter('city-labels', cityFilter);

    /* fly */
    const { reduced: rd, inset: ins, links: lk } = live.current;
    let target: { id: string; bounds?: Bounds } = { id: 'world' };
    if (place.country) {
      const unit = d ? [...place.path].reverse().map((k) => d.byKey.get(k)).find(Boolean) : undefined;
      if (unit) target = { id: unit.unit.properties.key, bounds: mainBounds(unit.unit.geometry) };
      else {
        const f = worldRef.current.find((x) => x.properties.name === place.country);
        if (f) target = { id: place.country, bounds: mainBounds(f.geometry) };
      }
      // With connections showing, step back far enough to see where they go.
      if (!place.path.length && lk.length) target = { id: `${place.country}+links` };
    }
    if (target.id === flownRef.current) return;
    flownRef.current = target.id;
    if (skipFlyRef.current) {
      skipFlyRef.current = false;
      return;
    }
    const el = map.getContainer();
    const W = el.clientWidth;
    const H = el.clientHeight;
    const duration = rd ? 0 : 1700;
    pauseUntil.current = performance.now() + duration + 600;
    if (target.bounds) {
      const pad = {
        top: Math.min(80, H * 0.12),
        bottom: Math.min(H * 0.6, 116 + ins.bottom),
        left: Math.min(64, W * 0.08),
        right: Math.min(W * 0.55, 56 + ins.right),
      };
      map.fitBounds(target.bounds, { padding: pad, duration, maxZoom: MAX_FLY_ZOOM, essential: true });
    } else {
      const a = place.country ? anchors.get(place.country) : undefined;
      const fl = flatRef.current;
      const z = fl ? flatZoom(W, H) + (a ? 0.6 : 0) : worldZoom(W, H) - (a ? 0.15 : 0);
      map.flyTo({
        center: a ? [a[0] + (ins.right ? 18 : 0), Math.max(-30, Math.min(40, a[1]))] : fl ? FLAT_CENTER : [map.getCenter().lng, 18],
        zoom: z,
        duration,
        essential: true,
      });
    }
    // pid stands in for place; the rest are read from refs on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pid, detail, links.length > 0, profiles, levelState]);

  /* ----- focus: everything but the open country (and its partners) steps back ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const keep = place.country ? [place.country, ...(place.path.length ? [] : links.map((l) => l.name))] : [];
    map.setFilter('world-dim', keep.length ? ['!', ['in', ['get', 'name'], ['literal', keep]]] : ['==', ['get', 'name'], '']);
  }, [ready, place.country, place.path.length, links]);

  /* ----- chokepoints ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (map && ready) map.setLayoutProperty('choke', 'visibility', showChokepoints && place.path.length === 0 ? 'visible' : 'none');
  }, [ready, showChokepoints, place.path.length]);

  /* ----- connections ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const from = place.country ? anchors.get(place.country) : undefined;
    arcsRef.current =
      from && place.path.length === 0
        ? links.flatMap((l) => {
            const to = anchors.get(l.name);
            return to ? [{ pts: arcPath(from, to), color: l.color, w: Math.min(3.6, 0.9 + l.weight / 26) }] : [];
          })
        : [];
    const ends: FeatureCollection = {
      type: 'FeatureCollection',
      features: arcsRef.current.map((a) => ({ type: 'Feature', properties: { color: a.color }, geometry: { type: 'Point', coordinates: a.pts[a.pts.length - 1] } })),
    };
    (map.getSource('arc-ends') as GeoJSONSource).setData(ends);
    drawStart.current = performance.now();
    if (!arcsRef.current.length) {
      (map.getSource('arcs') as GeoJSONSource).setData(EMPTY_FC);
      (map.getSource('flow') as GeoJSONSource).setData(EMPTY_FC);
    }
    // A pulsing brass ring marks where the connections start.
    originRef.current?.remove();
    originRef.current = null;
    if (from && arcsRef.current.length) {
      const dot = document.createElement('div');
      dot.className = 'map-origin';
      originRef.current = new maplibregl.Marker({ element: dot }).setLngLat(from).addTo(map);
    }
  }, [ready, links, place.country, place.path.length]);

  /* ----- animation: the globe turns, arcs draw in, and light flows along them ----- */
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let last = performance.now();
    let flowOn = false;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const map = mapRef.current;
      if (!map) return;
      const dt = Math.min(64, t - last);
      last = t;
      const { place: p, reduced: rd, active: on } = live.current;
      if (!on) return;
      if (!rd && !flatRef.current && !p.country && t > pauseUntil.current && !map.isMoving()) {
        const c = map.getCenter();
        map.jumpTo({ center: [c.lng - SPIN_DEG_PER_MS * dt, c.lat] });
      }
      const arcs = arcsRef.current;
      if (!arcs.length) return;
      const prog = rd ? 1 : Math.min(1, (t - drawStart.current) / 1100);
      if (prog < 1 || !flowOn) {
        const k = Math.max(2, Math.ceil(prog * ARC_STEPS) + 1);
        (map.getSource('arcs') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: arcs.map((a) => ({ type: 'Feature', properties: { color: a.color, w: a.w }, geometry: { type: 'LineString', coordinates: a.pts.slice(0, k) } })),
        });
        flowOn = prog >= 1;
      }
      if (rd) return (map.getSource('flow') as GeoJSONSource).setData(EMPTY_FC);
      const pts: Feature<Point>[] = [];
      arcs.forEach((a, i) => {
        for (let j = 0; j < 3; j++) {
          const f = (t / 2600 + j / 3 + i * 0.137) % 1;
          if (f > prog) continue;
          const x = f * ARC_STEPS;
          const i0 = Math.floor(x);
          const p0 = a.pts[i0];
          const p1 = a.pts[Math.min(ARC_STEPS, i0 + 1)];
          const u = x - i0;
          pts.push({
            type: 'Feature',
            properties: { color: a.color, w: a.w },
            geometry: { type: 'Point', coordinates: [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u] },
          });
        }
      });
      (map.getSource('flow') as GeoJSONSource).setData({ type: 'FeatureCollection', features: pts });
    };
    // Re-draw arcs from the start whenever they change.
    drawStart.current = performance.now();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, links]);

  /* ----- globe or flat map ----- */
  useEffect(() => {
    try {
      localStorage.setItem('atlas-projection', flat ? 'flat' : 'globe');
    } catch {
      /* private window: the choice just isn't remembered */
    }
    const map = mapRef.current;
    if (!map || !ready) return;
    const el = map.getContainer();
    const W = el.clientWidth;
    const H = el.clientHeight;
    map.setProjection({ type: flat ? 'mercator' : 'globe' });
    map.setMinZoom(flat ? flatZoom(W, H) - 0.4 : 0.6);
    // Keep the open place in view; the world view gets the projection's own framing.
    if (!live.current.place.country) {
      pauseUntil.current = performance.now() + 1500;
      map.jumpTo(flat ? { center: FLAT_CENTER, zoom: flatZoom(W, H) } : { center: [map.getCenter().lng, 18], zoom: worldZoom(W, H) });
    }
    map.fire('move');
  }, [ready, flat]);

  const zoomBy = (dz: number) => {
    const map = mapRef.current;
    if (!map) return;
    pauseUntil.current = performance.now() + 6000;
    map.easeTo({ zoom: map.getZoom() + dz, duration: reduced ? 0 : 400 });
  };

  return (
    <div className="atlas-map">
      <div ref={wrapRef} className="atlas-canvas" aria-label="World map. Click a country to zoom in; click again on a region to go deeper." role="region" />
      <div ref={shadeRef} className="globe-shade" aria-hidden="true" />
      {tip && (
        <div className="map-tip" style={{ transform: `translate(${tip.x + 14}px, ${tip.y + 14}px)` }}>
          <b>{tip.title}</b>
          <span>
            {tip.swatch && <i style={{ background: tip.swatch }} />}
            {tip.sub}
          </span>
        </div>
      )}
      <div className="view-toggle" role="radiogroup" aria-label="Map view">
        <button type="button" role="radio" aria-checked={!flat} className={!flat ? 'is-active' : undefined} onClick={() => setFlat(false)}>
          <Globe2 size={14} /> Globe
        </button>
        <button type="button" role="radio" aria-checked={flat} className={flat ? 'is-active' : undefined} onClick={() => setFlat(true)}>
          <MapIcon size={14} /> Flat
        </button>
      </div>
      <div className="map-ctrls" role="group" aria-label="Map controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1)}>
          <Plus size={16} />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(-1)}>
          <Minus size={16} />
        </button>
        <button type="button" aria-label="Back to the whole world" onClick={() => onPlace({ country: null, path: [] })}>
          <Globe2 size={16} />
        </button>
      </div>
    </div>
  );
}


