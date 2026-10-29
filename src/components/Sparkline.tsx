import { useId } from 'react';

/** Trend colors follow meaning: green favorable, red adverse, blue-gray neutral. */
export const TREND_GOOD = '#5fd39a';
export const TREND_BAD = '#ef7f86';
export const TREND_NEUTRAL = '#8a9dba';

interface Props {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

export function Sparkline({ values, color, width = 84, height = 28 }: Props) {
  const id = useId();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - 3 - ((v - min) / span) * (height - 6),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeOpacity="0.75" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="1.8" fill={color} />
    </svg>
  );
}
