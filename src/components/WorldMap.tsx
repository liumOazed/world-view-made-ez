import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import 'd3-transition';
import { Crosshair, Minus, Plus } from 'lucide-react';
import { LINK_META, type CountryProfile } from '../data/countries';
import { CHOKEPOINTS } from '../data/global';
import type { Layer } from '../data/layers';
import type { CountryFeature } from '../geo';

interface Props {
  features: CountryFeature[];
  profiles: Map<string, CountryProfile>;
  layer: Layer;
  selected: string | null;
  onSelect: (name: string | null) => void;
}

interface Hover {
  name: string;
  x: number;
  y: number;
}

interface Tip {
  title: string;
  sub: string;
  x: number;
  y: number;
}

export function WorldMap({ features, profiles, layer, selected, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 960, h: 520 });
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [hover, setHover] = useState<Hover | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { path, project, outline } = useMemo(() => {
    const projection = geoNaturalEarth1().fitExtent(
      [
        [12, 18],
        [size.w - 12, size.h - 12],
      ],
      { type: 'FeatureCollection', features },
    );
    return {
      path: geoPath(projection),
      project: (p: [number, number]) => projection(p) ?? [0, 0],
      outline: geoPath(projection)({ type: 'Sphere' }) ?? '',
    };
  }, [features, size]);

  const graticule = useMemo(() => path(geoGraticule10()) ?? '', [path]);
  const shapes = useMemo(
    () => features.map((f) => ({ name: f.properties.name, d: path(f) ?? '', anchor: f.anchor })),
    [features, path],
  );
  const anchors = useMemo(() => new Map(shapes.map((s) => [s.name, s.anchor])), [shapes]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([
        [0, 0],
        [size.w, size.h],
      ])
      .on('zoom', (e) => setTransform(e.transform));
    zoomRef.current = z;
    select(svg).call(z).on('dblclick.zoom', null);
    return () => {
      select(svg).on('.zoom', null);
    };
  }, [size]);

  const zoomBy = (k: number) => {
    if (svgRef.current && zoomRef.current)
      select(svgRef.current).transition().duration(350).call(zoomRef.current.scaleBy, k);
  };
  const resetZoom = () => {
    if (svgRef.current && zoomRef.current)
      select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, zoomIdentity);
  };

  const profile = selected ? profiles.get(selected) : undefined;
  const related = useMemo(() => new Set(profile?.partners.map((p) => p.name) ?? []), [profile]);

  const arcs = useMemo(() => {
    if (!profile) return [];
    const from = anchors.get(profile.name);
    if (!from) return [];
    const [x0, y0] = project(from);
    const seen = new Map<string, number>();
    return profile.partners.flatMap((p, i) => {
      const to = anchors.get(p.name);
      if (!to) return [];
      const n = seen.get(p.name) ?? 0;
      seen.set(p.name, n + 1);
      const [x1, y1] = project(to);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const dist = Math.hypot(dx, dy) || 1;
      const bend = 0.22 + n * 0.14;
      const cx = (x0 + x1) / 2 + (dy / dist) * dist * bend * (dx > 0 ? -1 : 1);
      const cy = (y0 + y1) / 2 - Math.abs(dx / dist) * dist * bend;
      return [
        {
          key: `${p.name}-${p.kind}-${i}`,
          d: `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`,
          color: LINK_META[p.kind].color,
          end: [x1, y1] as [number, number],
          width: 0.8 + p.share / 30,
          delay: i * 0.12,
        },
      ];
    });
  }, [profile, anchors, project]);

  const origin = profile && anchors.get(profile.name) ? project(anchors.get(profile.name)!) : null;
  const k = transform.k;

  const showTip = (e: React.PointerEvent, title: string, sub: string) => {
    const r = wrapRef.current!.getBoundingClientRect();
    setTip({ title, sub, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const hovered = hover ? profiles.get(hover.name) : undefined;

  return (
    <div className="map" ref={wrapRef}>
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        role="img"
        aria-label={`World map colored by ${layer.metric}. Use the search box to open a country.`}
        onClick={(e) => {
          if (e.target === svgRef.current) onSelect(null);
        }}
      >
        <defs>
          <radialGradient id="ocean" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#0b2240" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#071629" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#040b16" stopOpacity="0" />
          </radialGradient>
          <filter id="landGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="selGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="sphereClip">
            <path d={outline} />
          </clipPath>
        </defs>

        <rect width={size.w} height={size.h} fill="url(#ocean)" pointerEvents="none" />

        <g transform={transform.toString()}>
          <g clipPath="url(#sphereClip)" pointerEvents="none">
            <path d={outline} className="sphere" />
            <path d={graticule} className="graticule" />
          </g>

          <g filter="url(#landGlow)" opacity={selected ? 0.3 : 0.8} pointerEvents="none">
            {shapes.map((s) => {
              const p = profiles.get(s.name);
              return <path key={s.name} d={s.d} fill={p ? layer.color(layer.value(p)) : '#1e293b'} />;
            })}
          </g>

          <g className="countries">
            {shapes.map((s) => {
              const p = profiles.get(s.name);
              const isSel = s.name === selected;
              const dim = selected && !isSel && !related.has(s.name);
              return (
                <path
                  key={s.name}
                  d={s.d}
                  className={`country${isSel ? ' is-selected' : ''}${related.has(s.name) ? ' is-related' : ''}${hover?.name === s.name ? ' is-hover' : ''}`}
                  fill={p ? layer.color(layer.value(p)) : '#1e293b'}
                  fillOpacity={dim ? 0.16 : 0.94}
                  onPointerMove={(e) => {
                    const r = wrapRef.current!.getBoundingClientRect();
                    setTip(null);
                    setHover({ name: s.name, x: e.clientX - r.left, y: e.clientY - r.top });
                  }}
                  onPointerLeave={() => setHover((h) => (h?.name === s.name ? null : h))}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(s.name === selected ? null : s.name);
                  }}
                />
              );
            })}
          </g>

          {selected && (
            <path
              d={shapes.find((s) => s.name === selected)?.d}
              className="selected-outline"
              filter="url(#selGlow)"
              pointerEvents="none"
            />
          )}

          <g className="arcs" pointerEvents="none">
            {arcs.map((a) => (
              <g key={a.key}>
                <path d={a.d} stroke={a.color} strokeWidth={(a.width + 2.5) / k} className="arc-halo" />
                <path
                  d={a.d}
                  stroke={a.color}
                  strokeWidth={a.width / k}
                  className="arc"
                  style={{ animationDelay: `${a.delay}s` }}
                />
                <circle cx={a.end[0]} cy={a.end[1]} r={3 / k} fill={a.color} className="arc-end" />
              </g>
            ))}
            {origin && (
              <>
                <circle cx={origin[0]} cy={origin[1]} r={10 / k} className="origin-pulse" />
                <circle cx={origin[0]} cy={origin[1]} r={3.5 / k} className="origin-dot" />
              </>
            )}
          </g>

          <g className="chokepoints">
            {CHOKEPOINTS.map((c) => {
              const [x, y] = project(c.coords);
              return (
                <g
                  key={c.name}
                  transform={`translate(${x},${y}) scale(${1 / k})`}
                  className={`chokepoint${layer.id === 'leverage' ? ' is-emphasis' : ''}`}
                  onPointerMove={(e) => showTip(e, c.name, `Chokepoint · ${c.carries}`)}
                  onPointerLeave={() => setTip(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (profiles.has(c.country)) onSelect(c.country);
                  }}
                >
                  <circle r={9} className="cp-ring" />
                  <rect x={-3.2} y={-3.2} width={6.4} height={6.4} transform="rotate(45)" className="cp-core" />
                  {layer.id === 'leverage' && (
                    <text x={9} y={3.5} className="cp-label">
                      {c.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {hovered && hover && !tip && (
        <div className="tooltip" style={{ left: hover.x, top: hover.y }}>
          <div className="tooltip-name">{hovered.display}</div>
          <div className="tooltip-row">
            <span>{layer.metric}</span>
            <strong style={{ color: layer.color(layer.value(hovered)) }}>{layer.format(layer.value(hovered))}</strong>
          </div>
          <div className="tooltip-foot">Illustrative · click to open</div>
        </div>
      )}
      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="tooltip-name">{tip.title}</div>
          <div className="tooltip-foot">{tip.sub}</div>
        </div>
      )}

      <div className="zoom-controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.6)}>
          <Plus size={16} />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.6)}>
          <Minus size={16} />
        </button>
        <button type="button" aria-label="Reset view" onClick={resetZoom}>
          <Crosshair size={16} />
        </button>
      </div>
    </div>
  );
}
