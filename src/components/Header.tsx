import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles, Waves } from 'lucide-react';
import type { CountryProfile } from '../data/countries';
import { Flag } from './Flag';
import { setReducedEffects, useReducedEffects } from '../effects';

interface Props {
  profiles: Map<string, CountryProfile>;
  onSelect: (name: string) => void;
}

/** In-page sections, in reading order. */
const NAV = [
  { id: 'atlas-main', label: 'Map' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'explore', label: 'Explore' },
  { id: 'method', label: 'Method' },
];

/** Highlights the nav item for the section that holds the middle of the viewport. */
function useActiveSection() {
  const [active, setActive] = useState(NAV[0].id);
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return active;
}

export function EffectsToggle({ compact = false }: { compact?: boolean }) {
  const reduced = useReducedEffects();
  return (
    <button
      type="button"
      className={`effects-toggle${reduced ? ' is-reduced' : ''}${compact ? ' is-compact' : ''}`}
      role="switch"
      aria-checked={!reduced}
      title={reduced ? 'Motion and glass effects are off' : 'Turn off motion and glass effects'}
      onClick={() => setReducedEffects(!reduced)}
    >
      {reduced ? <Waves size={14} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
      <span>{reduced ? 'Effects off' : 'Effects on'}</span>
      <i className="effects-switch" aria-hidden="true" />
    </button>
  );
}

export function Header({ profiles, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeSection = useActiveSection();

  const all = useMemo(() => [...profiles.values()].sort((a, b) => b.gdp - a.gdp), [profiles]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all.filter((c) => c.curated).slice(0, 6);
    return all
      .filter((c) => c.display.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .sort((a, b) => Number(!a.display.toLowerCase().startsWith(q)) - Number(!b.display.toLowerCase().startsWith(q)))
      .slice(0, 7);
  }, [all, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const choose = (c: CountryProfile) => {
    onSelect(c.name);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <header className="topbar">
      <div className="topbar-inner wrap">
        <a className="brand" href="#atlas-main" aria-label="ATLAS, back to the map">
          <BrandMark />
          <span className="brand-text">
            <span className="brand-name">Atlas</span>
            <span className="brand-tag">The world, in context</span>
          </span>
        </a>

        <nav className="nav" aria-label="Primary">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={n.id === activeSection ? 'is-active' : undefined}
              aria-current={n.id === activeSection ? 'location' : undefined}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="topbar-end">
          <div className="search" role="combobox" aria-expanded={open} aria-haspopup="listbox">
            <Search size={16} className="search-icon" />
            <input
              ref={inputRef}
              value={query}
              placeholder="Search countries, companies or issues…"
              aria-label="Search countries"
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === 'Enter' && results[active]) {
                  choose(results[active]);
                } else if (e.key === 'Escape') {
                  inputRef.current?.blur();
                }
              }}
            />
            <kbd>/</kbd>
            {open && results.length > 0 && (
              <ul className="search-results" role="listbox">
                {!query && <li className="search-hint">Featured profiles</li>}
                {results.map((c, i) => (
                  <li
                    key={c.name}
                    role="option"
                    aria-selected={i === active}
                    className={i === active ? 'is-active' : undefined}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(c);
                    }}
                  >
                    <Flag country={c} size="sm" />
                    <span>{c.display}</span>
                    <small>{c.region}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <EffectsToggle />
          <div
            className="data-badge"
            title="Map and country figures come from IMF, World Bank, BIS, UN Comtrade and other open sources, with the year on every value. News is still a placeholder."
          >
            <span className="dot is-live" />
            Sourced data
          </div>
        </div>
      </div>
    </header>
  );
}

/** Armillary emblem: a globe inside a meridian ring, drawn in brass. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <circle cx="16" cy="16" r="14.25" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="16" cy="16" rx="4.6" ry="10.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M5.5 16h21M7.4 10.6h17.2M7.4 21.4h17.2" stroke="currentColor" strokeWidth="0.9" />
      <path d="M16 1.75v3M16 27.25v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
