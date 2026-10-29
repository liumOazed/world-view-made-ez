import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { geoDistance, geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath, type GeoProjection } from 'd3-geo';
import { Crosshair, Globe2, Map as MapIcon, Minus, Pause, Play, Plus } from 'lucide-react';
import type { CountryProfile } from '../data/countries';
import { CHOKEPOINTS } from '../data/global';
import type { Layer } from '../data/layers';
import type { CountryFeature } from '../geo';
import { Flag } from './Flag';

interface Props {
  features: CountryFeature[];
  profiles: Map<string, CountryProfile>;
  layer: Layer;
  selected: string | null;
  onSelect: (name: string | null) => void;
  /** Connections to draw from the selected country. Empty hides them. */
  links: MapLink[];
}

export interface MapLink {
  name: string;
  color: string;
  /** Relative strength, roughly 0–100; sets line width. */
  weight: number;
}

type Mode = 'globe' | 'flat';

interface View {
  /** Projection rotation in degrees: [lambda, phi]. Phi is ignored on the flat map. */
  lambda: number;
  phi: number;
  /** Zoom factor, 1–8. */
  k: number;
  /** Vertical pan of the flat map, in px. */
  ty: number;
}

interface Hover {
  name: string;
  x: number;
  y: number;
}

const fmtGdp = (bn: number) => (bn >= 1000 ? `$${(bn / 1000).toFixed(1)}T` : `$${Math.round(bn)}B`);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Tip {
  title: string;
  sub: string;
  x: number;
  y: number;
}

const GLOBE_START: View = { lambda: -60, phi: -18, k: 1, ty: 0 };
const FLAT_START: View = { lambda: 0, phi: 0, k: 1, ty: 0 };
const MIN_K = 1;
const MAX_K = 8;
const SPIN_DEG_PER_MS = 0.005;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function WorldMap({ features, profiles, layer, selected, onSelect, links }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 960, h: 520 });
  const [mode, setMode] = useState<Mode>('globe');
  const [view, setView] = useState<View>(GLOBE_START);
  const [spin, setSpin] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const viewRef = useRef(view);
  viewRef.current = view;
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const animRef = useRef(0);
  const frameRef = useRef(0);
  const pendingRef = useRef<View | null>(null);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

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

  // Flat map: fit the land (not the whole sphere) so Antarctica's absence
  // does not leave a band of empty ocean.
  const flatFit = useMemo(
    () =>
      geoNaturalEarth1().fitExtent(
        [
          [12, 18],
          [size.w - 12, size.h - 12],
        ],
        { type: 'FeatureCollection', features },
      ),
    [features, size],
  );
  // The globe fills most of the frame; the corners stay free for controls.
  const baseScale = mode === 'globe' ? Math.min(size.w, size.h) / 2 - 44 : flatFit.scale();

  const projection: GeoProjection = useMemo(() => {
    const c: [number, number] = [size.w / 2, size.h / 2];
    if (mode === 'globe') {
      return geoOrthographic()
        .scale(baseScale * view.k)
        .translate(c)
        .rotate([view.lambda, view.phi])
        .clipAngle(90)
        .precision(0.6);
    }
    const [tx, ty] = flatFit.translate();
    return geoNaturalEarth1()
      .scale(baseScale * view.k)
      .translate([c[0] + (tx - c[0]) * view.k, c[1] + (ty - c[1]) * view.k + view.ty])
      .rotate([view.lambda, 0]);
  }, [mode, size, baseScale, flatFit, view]);

  const path = useMemo(() => geoPath(projection), [projection]);
  // The far hemisphere, seen through the globe: same parallel projection,
  // viewed from behind and mirrored, so its points line up with the front.
  const farSide = useMemo(() => {
    if (mode !== 'globe') return '';
    const back = geoOrthographic()
      .scale(baseScale * view.k)
      .translate([size.w / 2, size.h / 2])
      .rotate([view.lambda + 180, -view.phi])
      .reflectX(true)
      .clipAngle(90)
      .precision(1.5);
    return geoPath(back)({ type: 'FeatureCollection', features }) ?? '';
  }, [mode, baseScale, size, view, features]);
  const outline = path({ type: 'Sphere' }) ?? '';
  const graticule = useMemo(() => path(geoGraticule10()) ?? '', [path]);
  const cLon = -view.lambda;
  const cLat = mode === 'globe' ? -view.phi : 0;
  const visible = useCallback(
    (p: [number, number]) => mode === 'flat' || geoDistance(p, [cLon, cLat]) < Math.PI / 2 - 0.03,
    [mode, cLon, cLat],
  );
  const project = useCallback((p: [number, number]) => projection(p) ?? [0, 0], [projection]);

  const shapes = useMemo(
    () =>
      features.map((f) => ({
        name: f.properties.name,
        d: path(f) ?? '',
        anchor: f.anchor,
        small: f.small,
      })),
    [features, path],
  );
  const anchors = useMemo(() => new Map(features.map((f) => [f.properties.name, f.anchor])), [features]);

  /* ---------- view animation ---------- */

  const animateTo = useCallback((target: Partial<View>, ms = 650) => {
    cancelAnimationFrame(animRef.current);
    const from = viewRef.current;
    const to = { ...from, ...target };
    const dl = ((((to.lambda - from.lambda) % 360) + 540) % 360) - 180;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = easeInOut(t);
      setView({
        lambda: from.lambda + dl * e,
        phi: from.phi + (to.phi - from.phi) * e,
        k: from.k + (to.k - from.k) * e,
        ty: from.ty + (to.ty - from.ty) * e,
      });
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  // Slow spin on the globe while nothing is selected and nobody is touching it.
  useEffect(() => {
    if (mode !== 'globe' || !spin || selected || dragging || pointerInside || reduceMotion) return;
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const dt = Math.min(64, now - last);
      last = now;
      setView((v) => ({ ...v, lambda: v.lambda + dt * SPIN_DEG_PER_MS }));
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [mode, spin, selected, dragging, pointerInside, reduceMotion]);

  // Back to the whole world when the selection is cleared.
  const hadSelection = useRef(false);
  useEffect(() => {
    if (selected) {
      hadSelection.current = true;
      return;
    }
    if (!hadSelection.current) return;
    hadSelection.current = false;
    if (mode === 'globe') setSpin(true);
    animateTo({ k: 1, ty: 0, ...(mode === 'globe' ? { phi: GLOBE_START.phi } : {}) }, 700);
  }, [selected, mode, animateTo]);

  // Turn the globe to face the selected country. Short hops are quick, long
  // ones take a little longer, so the camera never whips round.
  useEffect(() => {
    if (mode !== 'globe' || !selected) return;
    const a = anchors.get(selected);
    if (!a) return;
    const v = viewRef.current;
    const dist = geoDistance([-v.lambda, -v.phi], [a[0], clamp(a[1], -55, 55)]);
    animateTo({ lambda: -a[0], phi: -clamp(a[1], -55, 55) }, 700 + dist * 320);
  }, [selected, mode, anchors, animateTo]);

  /* ---------- pointer interaction ---------- */

  const degPerPx = 180 / (Math.PI * baseScale * view.k);

  const applyView = (v: View) => {
    pendingRef.current = v;
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      if (pendingRef.current) setView(pendingRef.current);
    });
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(animRef.current);
    dragRef.current = { x: e.clientX, y: e.clientY, view: viewRef.current, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      setDragging(true);
      setSpin(false);
      setHover(null);
      setTip(null);
      svgRef.current?.setPointerCapture(e.pointerId);
    }
    const v = d.view;
    if (mode === 'globe') {
      applyView({ ...v, lambda: v.lambda + dx * degPerPx, phi: clamp(v.phi - dy * degPerPx, -80, 80) });
    } else {
      const maxTy = ((v.k - 1) * size.h) / 2;
      applyView({ ...v, lambda: v.lambda + dx * degPerPx, ty: clamp(v.ty + dy, -maxTy, maxTy) });
    }
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.moved) {
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      setDragging(false);
    }
  };

  const zoomTo = useCallback(
    (k: number, animate = true) => {
      const v = viewRef.current;
      const nk = clamp(k, MIN_K, MAX_K);
      const maxTy = ((nk - 1) * size.h) / 2;
      const target = { k: nk, ty: clamp(v.ty, -maxTy, maxTy) };
      if (animate) animateTo(target, 350);
      else setView({ ...v, ...target });
    },
    [animateTo, size.h],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(animRef.current);
      setSpin(false);
      zoomTo(viewRef.current.k * Math.exp(-e.deltaY * 0.0015), false);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const v = viewRef.current;
    const step = 12 / v.k;
    const moves: Record<string, Partial<View>> = {
      ArrowLeft: { lambda: v.lambda + step },
      ArrowRight: { lambda: v.lambda - step },
      ArrowUp: mode === 'globe' ? { phi: clamp(v.phi - step, -80, 80) } : { ty: v.ty + 40 },
      ArrowDown: mode === 'globe' ? { phi: clamp(v.phi + step, -80, 80) } : { ty: v.ty - 40 },
    };
    if (moves[e.key]) {
      e.preventDefault();
      setSpin(false);
      animateTo(moves[e.key], 250);
    } else if (e.key === '+' || e.key === '=') zoomTo(v.k * 1.5);
    else if (e.key === '-') zoomTo(v.k / 1.5);
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    cancelAnimationFrame(animRef.current);
    setMode(m);
    const a = selected ? anchors.get(selected) : undefined;
    if (m === 'globe') {
      setView(a ? { ...GLOBE_START, lambda: -a[0], phi: -clamp(a[1], -55, 55) } : GLOBE_START);
      setSpin(!selected);
    } else {
      setView(FLAT_START);
    }
  };

  const reset = () => {
    setSpin(mode === 'globe' && !selected);
    animateTo(mode === 'globe' ? { ...GLOBE_START, lambda: viewRef.current.lambda } : FLAT_START, 500);
  };

  /* ---------- selection & connections ---------- */

  const related = useMemo(() => new Set(selected ? links.map((l) => l.name) : []), [selected, links]);

  const arcs = useMemo(() => {
    if (!selected) return [];
    const from = anchors.get(selected);
    if (!from) return [];
    return links.flatMap((l, i) => {
      const to = anchors.get(l.name);
      if (!to) return [];
      const d = path({ type: 'LineString', coordinates: [from, to] });
      if (!d) return [];
      return [
        {
          key: `${l.name}-${l.color}-${i}`,
          d,
          color: l.color,
          end: visible(to) ? project(to) : null,
          width: Math.min(4, 0.9 + l.weight / 28),
          delay: i * 0.1,
        },
      ];
    });
  }, [selected, links, anchors, path, project, visible]);

  const originAnchor = selected ? anchors.get(selected) : undefined;
  const origin = originAnchor && visible(originAnchor) ? project(originAnchor) : null;

  /* ---------- rendering helpers ---------- */

  const localPoint = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const countryHandlers = (name: string) => ({
    onPointerMove: (e: React.PointerEvent) => {
      if (dragRef.current?.moved) return;
      setTip(null);
      setHover({ name, ...localPoint(e) });
    },
    onPointerLeave: () => setHover((h) => (h?.name === name ? null : h)),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (suppressClick.current) return;
      onSelect(name === selected ? null : name);
    },
  });

  const fillOf = (name: string) => {
    const p = profiles.get(name);
    if (!p) return '#1e293b';
    const v = layer.value(p);
    return Number.isNaN(v) ? '#1e293b' : layer.color(v);
  };

  const hovered = hover ? profiles.get(hover.name) : undefined;
  const isGlobe = mode === 'globe';
  const R = baseScale * view.k;

  return (
    <div
      className={`map map-${mode}${dragging ? ' is-dragging' : ''}`}
      ref={wrapRef}
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
    >
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        tabIndex={0}
        role="img"
        aria-label={`${isGlobe ? 'Globe' : 'World map'} colored by ${layer.metric}. Drag to rotate, scroll or use plus and minus to zoom, arrow keys to turn. Use the search box to open a country.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          if (suppressClick.current) return;
          if (e.target === svgRef.current) onSelect(null);
        }}
      >
        <defs>
          <radialGradient id="ocean" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#0b2240" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#071629" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#040b16" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="globeSea" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#123a66" />
            <stop offset="55%" stopColor="#0a1f3d" />
            <stop offset="100%" stopColor="#050d1d" />
          </radialGradient>
          <radialGradient id="globeShade" cx="36%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#bfe9ff" stopOpacity="0.12" />
            <stop offset="45%" stopColor="#000" stopOpacity="0" />
            <stop offset="88%" stopColor="#000" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
          </radialGradient>
          {/* Soft halo: strongest just outside the rim, fading well beyond it. */}
          <radialGradient id="atmosphere" cx="50%" cy="50%" r="50%">
            <stop offset={`${(100 / 1.22) - 1}%`} stopColor="#67e8f9" stopOpacity="0" />
            <stop offset={`${100 / 1.22}%`} stopColor="#67e8f9" stopOpacity="0.16" />
            <stop offset="90%" stopColor="#38bdf8" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <filter id="selGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="sphereClip">
            <path d={outline} />
          </clipPath>
        </defs>

        {isGlobe ? (
          <circle
            cx={size.w / 2}
            cy={size.h / 2}
            r={R * 1.22}
            fill="url(#atmosphere)"
            pointerEvents="none"
          />
        ) : (
          <rect width={size.w} height={size.h} fill="url(#ocean)" pointerEvents="none" />
        )}

        <g clipPath="url(#sphereClip)" pointerEvents="none">
          <path d={outline} className={isGlobe ? 'sphere-globe' : 'sphere'} />
          <path d={graticule} className="graticule" />
        </g>

        {isGlobe && <path d={farSide} className="far-side" pointerEvents="none" />}

        <g className="countries">
          {shapes.map((s) => {
            if (!s.d) return null;
            const isSel = s.name === selected;
            const dim = selected && !isSel && !related.has(s.name);
            return (
              <path
                key={s.name}
                d={s.d}
                className={`country${isSel ? ' is-selected' : ''}${related.has(s.name) ? ' is-related' : ''}`}
                style={{ fill: fillOf(s.name), fillOpacity: dim ? (isGlobe ? 0.3 : 0.18) : 0.92 }}
                {...countryHandlers(s.name)}
              />
            );
          })}
        </g>

        {isGlobe && <path d={outline} fill="url(#globeShade)" pointerEvents="none" />}

        {isGlobe && <path d={outline} className="globe-rim" pointerEvents="none" />}

        {hover && hover.name !== selected && !dragging && (
          <path d={shapes.find((s) => s.name === hover.name)?.d} className="hover-outline" pointerEvents="none" />
        )}

        {selected && (
          <path
            d={shapes.find((s) => s.name === selected)?.d}
            className="selected-outline"
            filter="url(#selGlow)"
            pointerEvents="none"
          />
        )}

        {/* Small states get a marker so they can be seen and clicked. */}
        <g className="small-countries">
          {shapes.map((s) => {
            if (!s.small || !visible(s.anchor)) return null;
            const [x, y] = project(s.anchor);
            const isSel = s.name === selected;
            const dim = selected && !isSel && !related.has(s.name);
            return (
              <g
                key={s.name}
                transform={`translate(${x},${y})`}
                className={`small-country${isSel ? ' is-selected' : ''}`}
                opacity={dim ? 0.35 : 1}
                {...countryHandlers(s.name)}
              >
                <circle r={9} className="hit" />
                <circle r={isSel ? 4 : 2.6} style={{ fill: fillOf(s.name) }} className="dot" />
              </g>
            );
          })}
        </g>

        <g className="arcs" pointerEvents="none">
          {arcs.map((a) => (
            <g key={a.key}>
              <path d={a.d} stroke={a.color} strokeWidth={a.width + 2.5} className="arc-halo" />
              <path
                d={a.d}
                stroke={a.color}
                strokeWidth={a.width}
                className="arc"
                style={{ animationDelay: `${a.delay}s` }}
              />
              {a.end && <circle cx={a.end[0]} cy={a.end[1]} r={2.5} fill={a.color} className="arc-end" />}
            </g>
          ))}
          {origin && (
            <>
              <circle cx={origin[0]} cy={origin[1]} r={9} className="origin-pulse" />
              <circle cx={origin[0]} cy={origin[1]} r={3} className="origin-dot" />
            </>
          )}
        </g>

        <g className="chokepoints">
          {CHOKEPOINTS.map((c) => {
            if (!visible(c.coords)) return null;
            const [x, y] = project(c.coords);
            return (
              <g
                key={c.name}
                transform={`translate(${x},${y})`}
                className={`chokepoint${layer.id === 'leverage' ? ' is-emphasis' : ''}`}
                onPointerMove={(e) => {
                  if (dragRef.current?.moved) return;
                  setHover(null);
                  setTip({ title: c.name, sub: `Chokepoint · ${c.carries}`, ...localPoint(e) });
                }}
                onPointerLeave={() => setTip(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!suppressClick.current && profiles.has(c.country)) onSelect(c.country);
                }}
              >
                <circle r={9} className="cp-hit" />
                <circle r={6} className="cp-ring" />
                <rect x={-2.4} y={-2.4} width={4.8} height={4.8} transform="rotate(45)" className="cp-core" />
                {layer.id === 'leverage' && (
                  <text x={9} y={3.5} className="cp-label">
                    {c.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && hover && !tip && !dragging && (
        <div className={`tooltip${hover.x > size.w - 220 ? ' is-flipped' : ''}`} style={{ left: hover.x, top: hover.y }}>
          <div className="tooltip-name">
            <Flag country={hovered} size="xs" />
            {hovered.display}
          </div>
          <div className="tooltip-row">
            <span>GDP</span>
            <strong>{fmtGdp(hovered.gdp)}</strong>
          </div>
          <div className="tooltip-row">
            <span>{layer.metric}</span>
            <strong>
              {!Number.isNaN(layer.value(hovered)) && (
                <i className="tooltip-swatch" style={{ background: layer.color(layer.value(hovered)) }} />
              )}
              {layer.format(layer.value(hovered))}
            </strong>
          </div>
        </div>
      )}
      {tip && !dragging && (
        <div className={`tooltip${tip.x > size.w - 220 ? ' is-flipped' : ''}`} style={{ left: tip.x, top: tip.y }}>
          <div className="tooltip-name">{tip.title}</div>
          <div className="tooltip-foot">{tip.sub}</div>
        </div>
      )}

      <div className="view-toggle" role="radiogroup" aria-label="Map view">
        <button type="button" role="radio" aria-checked={isGlobe} className={isGlobe ? 'is-active' : undefined} onClick={() => switchMode('globe')}>
          <Globe2 size={14} /> Globe
        </button>
        <button type="button" role="radio" aria-checked={!isGlobe} className={!isGlobe ? 'is-active' : undefined} onClick={() => switchMode('flat')}>
          <MapIcon size={14} /> Flat
        </button>
      </div>

      <div className="drag-hint" aria-hidden="true">
        Drag to {isGlobe ? 'spin' : 'pan'} · scroll to zoom
      </div>

      <div className="zoom-controls">
        <button type="button" aria-label="Zoom in" onClick={() => { setSpin(false); zoomTo(view.k * 1.6); }}>
          <Plus size={16} />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomTo(view.k / 1.6)}>
          <Minus size={16} />
        </button>
        <button type="button" aria-label="Reset view" onClick={reset}>
          <Crosshair size={16} />
        </button>
        {isGlobe && (
          <button
            type="button"
            aria-label={spin ? 'Stop spinning' : 'Spin globe'}
            aria-pressed={spin}
            onClick={() => setSpin((s) => !s)}
          >
            {spin ? <Pause size={15} /> : <Play size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}
