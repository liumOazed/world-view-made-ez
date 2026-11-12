import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Hand, MapPin, Sparkles, Waypoints, X } from 'lucide-react';
import type { CountryProfile } from '../data/countries';
import type { Layer } from '../data/layers';
import { META, valueOf } from '../data/sections';
import { CONFLICT_YEARS, regionalMeta } from '../data/regional';
import { areaKm2, contains, loadCities, nameOf, pathOf, SUBNATIONAL, type City, type Detail, type Place } from '../map/places';
import { Flag } from './Flag';

export type LinksMode = 'trade' | 'influence' | null;

interface Props {
  place: Place;
  detail: Detail | null;
  profiles: Map<string, CountryProfile>;
  layer: Layer;
  linksMode: LinksMode;
  onLinks: (m: LinksMode) => void;
  onPlace: (p: Place) => void;
  onProfile: () => void;
}

const fmtNum = (v: number) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1));
const fmtPop = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v));

function Fig({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="pc-fig">
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </div>
  );
}

function countryFig(id: string, label: string, country: string) {
  const v = valueOf(id, country);
  return <Fig label={label} value={v ? META[id].fmt(v[0]) : '—'} note={v ? String(v[1]) : 'no data'} />;
}

export function PlaceCard({ place, detail, profiles, layer, linksMode, onLinks, onPlace, onProfile }: Props) {
  const [cities, setCities] = useState<City[]>([]);
  useEffect(() => {
    let live = true;
    loadCities().then((c) => live && setCities(c.features as City[]));
    return () => {
      live = false;
    };
  }, []);

  const country = place.country ? profiles.get(place.country) : undefined;
  const d = detail && detail.country === place.country ? detail : null;
  const spec = place.country ? SUBNATIONAL[place.country] : undefined;
  const depth = place.path.length;
  const key = place.path[depth - 1];
  const unit = key ? d?.byKey.get(key) : undefined;
  const kids = d ? d.children.get(depth ? key : '') ?? [] : [];
  const childLevel = spec?.levels[depth];

  // Towns from GeoNames that sit inside this unit, largest first.
  const towns = useMemo(() => {
    if (!unit || !country?.iso2) return [];
    return cities
      .filter((c) => c.properties.cc === country.iso2 && contains(unit.unit.geometry, c.geometry.coordinates))
      .sort((a, b) => b.properties.pop - a.properties.pop);
  }, [unit, cities, country]);

  if (!place.country || !country) return null;

  const go = (k: string) => onPlace({ country: place.country, path: pathOf(k) });
  const v = layer.value(country);

  let body;
  if (!depth) {
    body = (
      <>
        <div className="pc-head">
          <div className="pc-kicker">
            <span>Country · {country.region}</span>
            <span>IMF WEO</span>
          </div>
          <h2>
            <Flag country={country} size="sm" /> {country.display}
          </h2>
        </div>
        <div className="pc-figs">
          {countryFig('gdpUsd', 'GDP', country.name)}
          {countryFig('gdpGrowth', 'Growth', country.name)}
          {countryFig('inflation', 'Inflation', country.name)}
        </div>
        <p className="pc-lens">
          <i style={{ background: Number.isFinite(v) ? layer.color(v) : 'var(--line-strong)' }} />
          {layer.metric}: <b>{Number.isFinite(v) ? layer.format(v) : 'no data'}</b>
        </p>
        <div className="pc-links" role="group" aria-label="Connections on the map">
          <button type="button" aria-pressed={linksMode === 'trade'} onClick={() => onLinks(linksMode === 'trade' ? null : 'trade')}>
            <Waypoints size={13} /> Trade links
          </button>
          <button type="button" aria-pressed={linksMode === 'influence'} onClick={() => onLinks(linksMode === 'influence' ? null : 'influence')}>
            <Sparkles size={13} /> Influence
          </button>
        </div>
        {spec ? (
          d ? (
            <>
              <div className="pc-hint">
                <Hand size={15} /> Click a {spec.levels[0].singular.toLowerCase()} on the map to zoom in.
              </div>
              <ChildList title={`${kids.length} ${spec.levels[0].plural}`} kids={kids.map((k) => k.properties.key)} onGo={go} />
            </>
          ) : (
            <p className="pc-note">Loading {spec.levels[0].plural}…</p>
          )
        ) : (
          <p className="pc-note">
            Our boundary source doesn't publish regions for {country.display} yet, so the map stops at the country here.
          </p>
        )}
      </>
    );
  } else {
    const lvl = spec!.levels[depth - 1];
    const parents = place.path.slice(0, -1).map((k, i) => `${nameOf(k)} ${spec!.levels[i].singular}`);
    const area = unit ? areaKm2(unit.unit.geometry) : NaN;
    const biggest = towns[0]?.properties;
    body = (
      <>
        <div className="pc-head">
          <div className="pc-kicker">
            <span>{lvl.singular}</span>
            <span>{country.display}</span>
          </div>
          <h2>{nameOf(key)}</h2>
          <div className="pc-sub">{[...parents.reverse(), country.display].join(' · ')}</div>
        </div>
        <div className="pc-figs">
          <Fig label="Area" value={Number.isFinite(area) ? fmtNum(area) : '—'} note="km²" />
          <Fig
            label={childLevel ? childLevel.plural.split(' ')[0].replace(/^./, (c) => c.toUpperCase()) : 'Towns'}
            value={childLevel ? String(kids.length) : String(towns.length)}
            note={childLevel ? 'inside' : 'on GeoNames'}
          />
          <Fig label="Largest town" value={biggest ? fmtPop(biggest.pop) : '—'} note={biggest ? biggest.name : 'none listed'} />
        </div>
        <RegionLens layer={layer} country={place.country} unitKey={key} national={v} stateWord={spec!.levels[0].singular.toLowerCase()} />
        {childLevel ? (
          <>
            <div className="pc-hint">
              <Hand size={15} /> Click a {childLevel.singular.toLowerCase()} to zoom in.
            </div>
            <ChildList title={childLevel.plural.replace(/^./, (c) => c.toUpperCase())} kids={kids.map((k) => k.properties.key)} onGo={go} />
          </>
        ) : (
          <>
            {towns.length > 0 && (
              <div className="pc-towns">
                {towns.slice(0, 4).map((t) => (
                  <span key={t.properties.name}>
                    <MapPin size={12} /> {t.properties.name} <small>{fmtPop(t.properties.pop)}</small>
                  </span>
                ))}
              </div>
            )}
            <p className="pc-note">Street level: main roads and markets come from OpenStreetMap. Schools, clinics and transit can be added the same way.</p>
          </>
        )}
        <p className="pc-note">
          Measures marked “by region” under Colour by have figures for each region (Global Data Lab, UCDP). Boundaries from{' '}
          {spec!.credit.split(' · ')[0]}; town sizes from GeoNames.
        </p>
      </>
    );
  }

  return (
    <aside className="place-card" aria-live="polite" aria-label={`${depth ? nameOf(key) : country.display} details`} key={place.path.join('|') || country.name}>
      <button type="button" className="pc-close" aria-label="Back to the whole world" onClick={() => onPlace({ country: null, path: [] })}>
        <X size={15} />
      </button>
      {body}
      <button type="button" className="pc-profile" onClick={onProfile}>
        {depth ? `Open ${country.display} profile` : 'Open full profile'} <ArrowRight size={15} />
      </button>
    </aside>
  );
}

function ChildList({ title, kids, onGo }: { title: string; kids: string[]; onGo: (key: string) => void }) {
  return (
    <div className="pc-list">
      <div className="pc-list-title">{title}</div>
      <ul>
        {kids.map((k) => (
          <li key={k}>
            <button type="button" onClick={() => onGo(k)}>
              {nameOf(k)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The trail from the world down to where the map is, each step clickable. */
export function Crumbs({ place, profiles, onPlace }: { place: Place; profiles: Map<string, CountryProfile>; onPlace: (p: Place) => void }) {
  const spec = place.country ? SUBNATIONAL[place.country] : undefined;
  const steps: { label: string; to: Place }[] = [{ label: 'World', to: { country: null, path: [] } }];
  if (place.country) steps.push({ label: profiles.get(place.country)?.display ?? place.country, to: { country: place.country, path: [] } });
  place.path.forEach((k, i) =>
    steps.push({
      label: i < place.path.length - 1 && spec ? `${nameOf(k)} ${spec.levels[i].singular}` : nameOf(k),
      to: { country: place.country, path: place.path.slice(0, i + 1) },
    }),
  );
  return (
    <nav className="crumbs" aria-label="Where you are on the map">
      {steps.map((s, i) => (
        <span key={i} className="crumb">
          {i > 0 && <span className="crumb-sep">/</span>}
          <button type="button" aria-current={i === steps.length - 1 ? 'location' : undefined} onClick={() => onPlace(s.to)}>
            {s.label}
          </button>
        </span>
      ))}
    </nav>
  );
}

/** The colour-by measure for a region: its own figure where Global Data Lab has one, else the country's. */
function RegionLens({ layer, country, unitKey, national, stateWord }: { layer: Layer; country: string; unitKey: string; national: number; stateWord: string }) {
  const rv = layer.regional ? layer.regional(country, unitKey) : NaN;
  const own = Number.isFinite(rv);
  const v = own ? rv : national;
  const meta = own && layer.regionSource === 'gdl' ? regionalMeta(country, unitKey) : null;
  const tag = !own ? 'national' : meta && !meta.own ? stateWord : 'regional';
  const named = meta && !/^\d+ regions$/.test(meta.region) ? meta.region : null;
  return (
    <p className="pc-lens">
      <i style={{ background: Number.isFinite(v) ? layer.color(v) : 'var(--line-strong)' }} />
      {layer.metric}: <b>{Number.isFinite(v) ? layer.format(v) : 'no data'}</b>
      <span className="pc-tag">{tag}</span>
      {meta && (
        <span className="pc-src">
          {named ? `Global Data Lab region: ${named}` : 'Global Data Lab'} · {meta.year}
        </span>
      )}
      {own && layer.regionSource === 'events' && (
        <span className="pc-src">
          UCDP events in this area · {CONFLICT_YEARS[0]}–{CONFLICT_YEARS[1]}
        </span>
      )}
    </p>
  );
}
