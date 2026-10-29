import { useRef, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Translucent panel that floats over the map's right edge; on phones it is a
 * bottom sheet that can be dragged down to close.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const start = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);

  return (
    <aside
      id="drawer"
      className={`drawer${open ? ' is-open' : ''}`}
      aria-label={title}
      aria-hidden={!open}
      inert={!open}
      style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
    >
      <div
        className="drawer-grip"
        onPointerDown={(e) => {
          start.current = e.clientY;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => start.current !== null && setDrag(Math.max(0, e.clientY - start.current))}
        onPointerUp={() => {
          if (drag > 90) onClose();
          start.current = null;
          setDrag(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(0);
        }}
      >
        <span />
      </div>
      <button type="button" className="drawer-close" aria-label="Close panel" onClick={onClose}>
        <ChevronRight size={16} />
      </button>
      <div className="drawer-scroll">{children}</div>
    </aside>
  );
}
