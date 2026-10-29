import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { CountryProfile } from '../data/countries';
import { Flag } from './Flag';

interface Props {
  profiles: Map<string, CountryProfile>;
  onSelect: (name: string) => void;
}

const NAV = ['Map', 'Countries', 'Connections', 'Scenarios', 'Method'];

export function Header({ profiles, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(
    () => [...profiles.values()].sort((a, b) => b.gdp - a.gdp),
    [profiles],
  );
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
      <a className="brand" href="#" aria-label="ATLAS home">
        <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
          <defs>
            <linearGradient id="brandG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5eead4" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="13" fill="none" stroke="url(#brandG)" strokeWidth="2.2" />
          <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="url(#brandG)" strokeWidth="1.5" />
          <path d="M3 16h26M5.5 9.5h21M5.5 22.5h21" stroke="url(#brandG)" strokeWidth="1.3" />
        </svg>
        <span className="brand-name">ATLAS</span>
        <span className="brand-tag">The world, in context</span>
      </a>

      <nav className="nav" aria-label="Primary">
        {NAV.map((n, i) => (
          <a key={n} href="#" className={i === 0 ? 'is-active' : undefined} onClick={(e) => e.preventDefault()}>
            {n}
          </a>
        ))}
      </nav>

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

      <div className="data-badge" title="Map and country figures come from IMF, World Bank, BIS, UN Comtrade and other open sources, with the year on every value. News is still a placeholder.">
        <span className="dot is-live" />
        Sourced data
      </div>
    </header>
  );
}
