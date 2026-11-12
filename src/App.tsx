import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUp, Hand, LayoutList } from 'lucide-react';
import { buildProfiles, LINK_META } from './data/countries';
import { INFLUENCE_COLOR, influenceLinks, supplyLinks, tradeLinks } from './data/connections';
import { LAYER_BY_ID, layerFor, sectionOf, type LayerId } from './data/layers';
import { findSub, SECTION_BY_ID, type SectionId } from './data/sections';
import { buildScorecards } from './data/scorecard';
import { COUNTRY_FEATURES } from './geo';
import { BrandMark, EffectsToggle, Header, type Route } from './components/Header';
import { AtlasMap, type MapLink } from './components/AtlasMap';
import { LensPicker } from './components/LensPicker';
import { Crumbs, PlaceCard, type LinksMode } from './components/PlaceCard';
import { GlobalOverview } from './components/GlobalOverview';
import { CountryPanel, type CountryTab } from './components/CountryPanel';
import { Explore, RegionStrip, type ExploreAction } from './components/Explore';
import { Rankings } from './components/Scorecard';
import { Drawer } from './components/Drawer';
import { placeId, useDetail, WORLD, type Place } from './map/places';
import { CONFLICT_YEARS, regionalYear } from './data/regional';

const DEFAULT_LAYER: LayerId = 'growth.gdp';

const ROUTES: Record<string, Route> = { '': 'map', map: 'map', 'atlas-main': 'map', rankings: 'rankings', explore: 'explore', method: 'method' };
const routeOf = () => ROUTES[location.hash.replace(/^#\/?/, '')] ?? 'map';

function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(routeOf);
  useEffect(() => {
    const on = () => {
      setRoute(routeOf());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r: Route) => {
    location.hash = r === 'map' ? '/' : `/${r}`;
  }, []);
  return [route, go];
}

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

export default function App() {
  const profiles = useMemo(() => {
    const p = buildProfiles(COUNTRY_FEATURES.map((f) => ({ name: f.properties.name, centroid: f.anchor })));
    buildScorecards(p);
    return p;
  }, []);
  const [route, goRoute] = useRoute();
  const [layerId, setLayerId] = useState<LayerId>(DEFAULT_LAYER);
  const [place, setPlace] = useState<Place>(WORLD);
  const [tab, setTab] = useState<CountryTab>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const vp = useViewport();
  const phone = vp.w <= 720;

  const selected = place.country;
  const detail = useDetail(selected);
  const layer = LAYER_BY_ID[layerId];
  const sub = useMemo(() => {
    const s = sectionOf(layerId);
    return s ? findSub(s, layerId.split('.')[1]) : null;
  }, [layerId]);
  const country = selected ? profiles.get(selected) : undefined;
  const anchors = useMemo(
    () => new Map(COUNTRY_FEATURES.map((f) => [f.properties.name, f.anchor] as [string, [number, number]])),
    [],
  );
  const trade = useMemo(() => (country ? tradeLinks(country, profiles, anchors, 10) : []), [country, profiles, anchors]);
  const influence = useMemo(() => (country ? influenceLinks(country, profiles, anchors, 5) : []), [country, profiles, anchors]);
  const supply = useMemo(() => (country ? supplyLinks(country, profiles) ?? [] : []), [country, profiles]);
  const coverageNote = useMemo(() => {
    const n = [...profiles.values()].filter((p) => Number.isFinite(layer.value(p))).length;
    return `${n} countries${sub?.pending ? ' · partly loaded' : ''}${sub?.ours ? ' · our measure' : ''}`;
  }, [layer, profiles, sub]);

  const regionNote = layer.regional
    ? place.country && layer.hasRegional?.(place.country)
      ? `by region, ${layer.regionSource === 'events' ? CONFLICT_YEARS.join('–') : regionalYear(place.country)}`
      : 'no regional figures for this country, so regions show the national value'
    : 'regions show the national value; measures marked “by region” colour each region';

  // Connections belong to the measures that explain them; the others keep the colours readable.
  const links = useMemo((): MapLink[] => {
    if (sub?.arcs === 'trade') return trade.map((l) => ({ name: l.name, color: LINK_META[l.kind].color, weight: l.share }));
    if (sub?.arcs === 'energy') return supply.map((l) => ({ name: l.name, color: LINK_META[l.kind].color, weight: l.share }));
    if (sub?.arcs === 'influence') return influence.map((l) => ({ name: l.name, color: INFLUENCE_COLOR, weight: l.score }));
    return [];
  }, [sub, trade, supply, influence]);
  const linksMode: LinksMode = sub?.arcs === 'trade' ? 'trade' : sub?.arcs === 'influence' ? 'influence' : null;

  const goPlace = useCallback((p: Place) => {
    setPlace((cur) => (placeId(cur) === placeId(p) ? cur : p));
    if (!p.country) {
      setDrawerOpen(false);
      setTab('overview');
    }
  }, []);
  const select = useCallback(
    (name: string | null) => {
      goPlace(name ? { country: name, path: [] } : WORLD);
      if (route !== 'map') goRoute('map');
    },
    [goPlace, route, goRoute],
  );

  // A section picked on the map opens the same section in the country view.
  const changeLayer = useCallback(
    (id: LayerId) => {
      setLayerId(id);
      const s = sectionOf(id);
      if (selected && s && tab !== 'overview') setTab(s);
      if (selected && id === 'scorecard') setTab('scorecard');
    },
    [selected, tab],
  );
  const changeTab = useCallback(
    (t: CountryTab) => {
      setTab(t);
      if (t in SECTION_BY_ID && sectionOf(layerId) !== t) setLayerId(layerFor(t as SectionId));
    },
    [layerId],
  );

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('input, .lens')) setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const onExplore = (a: ExploreAction) => {
    goPlace({ country: selected ?? 'Bangladesh', path: [] });
    setDrawerOpen(true);
    const t: SectionId = a === 'connections' ? 'trade' : a === 'compare' ? 'growth' : 'risk';
    setTab(t);
    setLayerId(a === 'connections' ? 'trade.dependency' : a === 'shock' ? 'risk.shock' : layerFor(t));
    goRoute('map');
  };

  const showCard = route === 'map' && !!country && !drawerOpen;
  const inset = drawerOpen
    ? phone
      ? { right: 0, bottom: vp.h * 0.6 }
      : { right: Math.min(470, vp.w * 0.4), bottom: 0 }
    : showCard
      ? phone
        ? { right: 0, bottom: vp.h * 0.42 }
        : { right: 372, bottom: 0 }
      : { right: 0, bottom: 0 };

  return (
    <div className={`app route-${route}`}>
      <div className="bg-aurora" aria-hidden="true" />
      <Header profiles={profiles} route={route} onSelect={select} onPlace={(p) => (goPlace(p), route !== 'map' && goRoute('map'))} />

      <main id="atlas-main" className={`map-page${showCard ? ' has-card' : ''}${drawerOpen ? ' has-drawer' : ''}`} hidden={route !== 'map'}>
        <AtlasMap
          profiles={profiles}
          layer={layer}
          place={place}
          onPlace={goPlace}
          links={links}
          detail={detail}
          inset={inset}
          showChokepoints={layerId.startsWith('influence.') || layerId.startsWith('trade.') || layerId.startsWith('risk.')}
          active={route === 'map'}
        />
        <h1 className="sr-only">Atlas: the world, in context</h1>
        <Crumbs place={place} profiles={profiles} onPlace={goPlace} />
        {!country && (
          <div className="map-toast">
            <Hand size={14} /> <span>Click any country to zoom in. Try Bangladesh.</span>
            <button type="button" onClick={() => setDrawerOpen((o) => !o)} aria-expanded={drawerOpen} aria-controls="drawer">
              <LayoutList size={13} /> World overview
            </button>
          </div>
        )}
        {showCard && (
          <PlaceCard
            place={place}
            detail={detail}
            profiles={profiles}
            layer={layer}
            linksMode={linksMode}
            onLinks={(m) => changeLayer(m === 'trade' ? 'trade.dependency' : m === 'influence' ? 'influence.network' : DEFAULT_LAYER)}
            onPlace={goPlace}
            onProfile={() => setDrawerOpen(true)}
          />
        )}
        {!(phone && (showCard || drawerOpen)) && (
          <LensPicker layer={layer} onChange={changeLayer} note={place.path.length || (place.country && layer.regional) ? regionNote : coverageNote} />
        )}

        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={country ? country.display : 'Global overview'}>
          {country ? (
            <CountryPanel
              country={country}
              profiles={profiles}
              tab={tab}
              onTab={changeTab}
              trade={trade}
              influence={influence}
              onSelect={(n) => goPlace({ country: n, path: [] })}
              onClose={() => setDrawerOpen(false)}
              layerId={layerId}
              onLayer={changeLayer}
            />
          ) : (
            <GlobalOverview layer={layer} profiles={profiles} onSelect={(n) => (goPlace({ country: n, path: [] }), setDrawerOpen(false))} />
          )}
        </Drawer>
      </main>

      {route !== 'map' && (
        <>
          <div className="paper page">
            <div className="wrap">
              {route === 'rankings' && (
                <Rankings
                  profiles={profiles}
                  onSelect={(n) => {
                    goPlace({ country: n, path: [] });
                    setTab('scorecard');
                    setLayerId('scorecard');
                    setDrawerOpen(true);
                    goRoute('map');
                  }}
                />
              )}
              {route === 'explore' && (
                <>
                  <Explore onAction={onExplore} />
                  <section className="page-block" aria-labelledby="regions-title">
                    <h2 id="regions-title" className="page-h2">
                      Regions at a glance
                    </h2>
                    <RegionStrip profiles={profiles} />
                  </section>
                </>
              )}
              {route === 'method' && <Method />}
            </div>
          </div>
          <Footer />
          <ScrollTop />
        </>
      )}
    </div>
  );
}

function Method() {
  return (
    <section className="method" aria-labelledby="method-title">
      <span className="eyebrow">Method</span>
      <h2 id="method-title">
        Where every number <em className="grad">comes from.</em>
      </h2>
      <div className="method-grid">
        <div>
          <h3>Country data</h3>
          <p>
            The seven sections draw on the IMF World Economic Outlook, World Bank (with ILO, SIPRI, UCDP and debt statistics), BIS, Our
            World in Data, the Fragile States Index, the ND-GAIN climate index, UN Comtrade and the FBIC Index, refreshed by scheduled jobs.
            Every value shows its year, and anything not fetched yet says so. The News tab and the developing-story text are still
            illustrative.
          </p>
        </div>
        <div>
          <h3>The map</h3>
          <p>
            Country outlines come from Natural Earth (1:50m) via world-atlas. Below the country level, boundaries come from geoBoundaries
            (CC BY 4.0): 194 countries open into their states or provinces, 170 of them into districts too, and Bangladesh down to its 544
            upazilas and city areas.
            Main roads and markets are © OpenStreetMap contributors (ODbL); town sizes come from GeoNames.
          </p>
        </div>
        <div>
          <h3>Sectors</h3>
          <p>
            Services, industry (with manufacturing inside it) and agriculture are World Bank value added as a share of GDP. The sector
            mix blends three colours by how far each share runs above a typical economy (services 55%, industry 26%, agriculture 9%),
            because services is the largest sector almost everywhere; the leading sector is the one furthest above that. The shift
            compares the latest shares with those of about ten years earlier. Sector figures are national: no open worldwide source
            splits them by state, so regions show their country's mix.
          </p>
        </div>
        <div>
          <h3>Regions</h3>
          <p>
            The human development measures (HDI, income per person, life expectancy and schooling) are coloured state by state, from the
            Global Data Lab's Subnational Human Development Database (Radboud University, SHDI v8.1, latest year 2022), matched to the map's
            states and provinces by name. Where the Lab reports a group of provinces as one region, each province takes the group's figure;
            districts take their state's, except in Bangladesh, where the Lab's district groups give districts their own. The same file
            gives income growth (average over five years), the gender development index and population, which is spread over each
            region's land for density. Conflict deaths are UCDP's geocoded events (GED, CC BY 4.0) from the last five years, counted in
            the state and district where each happened. Every other measure is national only, so regions take their country's colour
            (marked "national").
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer" id="method-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <BrandMark size={34} />
          <div>
            <div className="footer-name">Atlas</div>
            <p className="muted small">The world, in context.</p>
          </div>
        </div>
        <div className="footer-about">
          <h2 className="footer-title">About the data</h2>
          <p>
            IMF, World Bank, BIS, Our World in Data, UN Comtrade and more, refreshed on a schedule, with the year on every value. Regional
            human development from the Global Data Lab. Map
            boundaries from Natural Earth and geoBoundaries; roads and markets from OpenStreetMap; towns from GeoNames.{' '}
            <a href="#/method">Read the method</a>.
          </p>
        </div>
        <div className="footer-side">
          <EffectsToggle />
          <a className="footer-top" href="#/">
            <ArrowUp size={14} aria-hidden="true" /> Back to the map
          </a>
        </div>
      </div>
      <div className="wrap footer-base">
        <span>Atlas prototype</span>
        <span aria-hidden="true">·</span>
        <span>Natural Earth · geoBoundaries (CC BY 4.0) · © OpenStreetMap contributors · GeoNames</span>
      </div>
    </footer>
  );
}

/** Floating "Top" button for the long reading pages. */
function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      type="button"
      className={`scroll-top${show ? ' is-visible' : ''}`}
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <ArrowUp size={15} aria-hidden="true" />
      <span>Top</span>
    </button>
  );
}
