import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUp, Globe2, PanelRightClose, PanelRightOpen, Sparkles, Waypoints, X } from 'lucide-react';
import { buildProfiles, LINK_META } from './data/countries';
import { INFLUENCE_COLOR, influenceLinks, supplyLinks, tradeLinks } from './data/connections';
import { LAYER_BY_ID, layerFor, sectionOf, type LayerId } from './data/layers';
import { findSub, SECTION_BY_ID, type SectionId } from './data/sections';
import { buildScorecards } from './data/scorecard';
import { COUNTRY_FEATURES } from './geo';
import { BrandMark, EffectsToggle, Header } from './components/Header';
import { WorldMap, type MapLink } from './components/WorldMap';
import { LayerBar, Legend, type LegendKey } from './components/LayerBar';
import { GlobalOverview } from './components/GlobalOverview';
import { CountryPanel, type CountryTab } from './components/CountryPanel';
import { Flag } from './components/Flag';
import { Explore, RegionStrip, type ExploreAction } from './components/Explore';
import { Rankings } from './components/Scorecard';
import { Drawer } from './components/Drawer';

const DEFAULT_LAYER: LayerId = 'growth.gdp';

export default function App() {
  const profiles = useMemo(() => {
    const p = buildProfiles(COUNTRY_FEATURES.map((f) => ({ name: f.properties.name, centroid: f.anchor })));
    buildScorecards(p);
    return p;
  }, []);
  const [layerId, setLayerId] = useState<LayerId>(DEFAULT_LAYER);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<CountryTab>('overview');
  // The drawer starts closed so the first view is the whole globe.
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const influence = useMemo(
    () => (country ? influenceLinks(country, profiles, anchors, 5) : []),
    [country, profiles, anchors],
  );
  const supply = useMemo(() => (country ? supplyLinks(country, profiles) ?? [] : []), [country, profiles]);
  const coverageNote = useMemo(() => {
    const n = [...profiles.values()].filter((p) => Number.isFinite(layer.value(p))).length;
    return `${n} countries${sub?.pending ? ' · partly loaded' : ''}${sub?.ours ? ' · our measure' : ''}`;
  }, [layer, profiles, sub]);

  // Connections belong to the subsection that explains them; other layers
  // show the country on its own so the colors stay readable.
  const { links, keys, keyTitle } = useMemo((): { links: MapLink[]; keys: LegendKey[]; keyTitle: string } => {
    if (sub?.arcs === 'trade' || sub?.arcs === 'energy') {
      const list = sub.arcs === 'trade' ? trade : supply;
      const kinds = [...new Set(list.map((l) => l.kind))];
      return {
        links: list.map((l) => ({ name: l.name, color: LINK_META[l.kind].color, weight: l.share })),
        keys: kinds.map((k) => ({ label: LINK_META[k].label, color: LINK_META[k].color })),
        keyTitle: sub.arcs === 'trade' ? `Top ${list.length} trade links` : 'Main energy, food and chip suppliers',
      };
    }
    if (sub?.arcs === 'influence') {
      return {
        links: influence.map((l) => ({ name: l.name, color: INFLUENCE_COLOR, weight: l.score })),
        keys: [{ label: 'Countries it influences most', color: INFLUENCE_COLOR }],
        keyTitle: `Top ${influence.length} influenced`,
      };
    }
    return { links: [], keys: [], keyTitle: '' };
  }, [sub, trade, supply, influence]);

  const select = useCallback((name: string | null) => {
    setSelected(name);
    if (name) setDrawerOpen(true);
    else setTab('overview');
  }, []);

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
      if (e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('input, .layer-menu')) setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const onExplore = (a: ExploreAction) => {
    const target = selected ?? 'Bangladesh';
    setSelected(target);
    setDrawerOpen(true);
    const t: SectionId = a === 'connections' ? 'trade' : a === 'compare' ? 'growth' : 'risk';
    setTab(t);
    setLayerId(a === 'connections' ? 'trade.dependency' : a === 'shock' ? 'risk.shock' : layerFor(t));
    document.getElementById('atlas-main')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app">
      <div className="bg-aurora" aria-hidden="true" />
      <Header profiles={profiles} onSelect={select} />

      <main id="atlas-main" className={`main wrap${drawerOpen ? ' drawer-open' : ''}`}>
        <section className="stage" aria-label="World intelligence map">
          <div className="stage-head">
            <div className="stage-title">
              <h1>
                Global insights, <em className="grad">in seconds.</em>
              </h1>
              <p className="muted">
                {layer.question} <span className="stage-hint">Click any country to explore.</span>
              </p>
            </div>
            <button
              type="button"
              className={`drawer-toggle${drawerOpen ? ' is-active' : ''}`}
              aria-expanded={drawerOpen}
              aria-controls="drawer"
              onClick={() => setDrawerOpen((o) => !o)}
            >
              {drawerOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              {country ? country.display : 'Overview'}
            </button>
          </div>
          <LayerBar layer={layer} onChange={changeLayer} coverage={coverageNote} />
          <div className="map-frame">
            <WorldMap
              features={COUNTRY_FEATURES}
              profiles={profiles}
              layer={layer}
              selected={selected}
              onSelect={select}
              links={links}
            />
            {country && (
              <div className="selection-bar" role="toolbar" aria-label={`${country.display} selected`}>
                <Flag country={country} size="sm" />
                <strong>{country.display}</strong>
                <span className="selection-sep" />
                <button
                  type="button"
                  className={sub?.arcs === 'trade' ? 'is-active' : undefined}
                  aria-pressed={sub?.arcs === 'trade'}
                  onClick={() => changeLayer('trade.dependency')}
                >
                  <Waypoints size={13} /> Trade links
                </button>
                <button
                  type="button"
                  className={sub?.arcs === 'influence' ? 'is-active' : undefined}
                  aria-pressed={sub?.arcs === 'influence'}
                  onClick={() => changeLayer('influence.network')}
                >
                  <Sparkles size={13} /> Influence
                </button>
                <span className="selection-sep" />
                <button type="button" className="selection-reset" onClick={() => select(null)}>
                  <Globe2 size={13} /> Back to world <X size={12} />
                </button>
              </div>
            )}
            <Legend layer={layer} keyTitle={keyTitle} keys={selected ? keys : []} />
          </div>
          <RegionStrip profiles={profiles} />
        </section>

        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={country ? country.display : 'Global overview'}>
          {country ? (
            <CountryPanel
              country={country}
              profiles={profiles}
              tab={tab}
              onTab={changeTab}
              trade={trade}
              influence={influence}
              onSelect={select}
              onClose={() => select(null)}
              layerId={layerId}
              onLayer={changeLayer}
            />
          ) : (
            <GlobalOverview layer={layer} profiles={profiles} onSelect={select} />
          )}
        </Drawer>
      </main>

      {/* Light "paper" band: reading sections sit on ivory below the dark map. */}
      <div className="paper">
        <div className="wrap">
          <Rankings
            profiles={profiles}
            onSelect={(n) => {
              select(n);
              setTab('scorecard');
              setLayerId('scorecard');
              document.getElementById('atlas-main')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          <Explore onAction={onExplore} />
        </div>
      </div>

      <footer className="footer" id="method">
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
              The seven sections draw on the IMF World Economic Outlook, World Bank (with ILO, SIPRI, UCDP and debt statistics),
              BIS, Our World in Data, the Fragile States Index, the ND-GAIN climate index, UN Comtrade and the FBIC Index, refreshed
              by scheduled jobs. Every value shows its year, and anything not fetched yet says so. The News tab and the
              developing-story text are still illustrative.
            </p>
          </div>
          <div className="footer-side">
            <EffectsToggle />
            <a className="footer-top" href="#atlas-main">
              <ArrowUp size={14} aria-hidden="true" /> Back to top
            </a>
          </div>
        </div>
        <div className="wrap footer-base">
          <span>Atlas prototype</span>
          <span aria-hidden="true">·</span>
          <span>Boundaries from Natural Earth via world-atlas</span>
        </div>
      </footer>

      <ScrollTop hidden={drawerOpen} />
    </div>
  );
}

/** Floating "Top" button, shown once the map has scrolled out of view. */
function ScrollTop({ hidden }: { hidden: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const visible = show && !hidden;
  return (
    <button
      type="button"
      className={`scroll-top${visible ? ' is-visible' : ''}`}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <ArrowUp size={15} aria-hidden="true" />
      <span>Top</span>
    </button>
  );
}
