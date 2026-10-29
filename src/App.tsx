import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe2, PanelRightClose, PanelRightOpen, Sparkles, Waypoints, X } from 'lucide-react';
import { buildProfiles, LINK_META } from './data/countries';
import { INFLUENCE_COLOR, influenceLinks, supplyLinks, tradeLinks } from './data/connections';
import { LAYER_BY_ID, layerFor, sectionOf, type LayerId } from './data/layers';
import { findSub, SECTION_BY_ID, type SectionId } from './data/sections';
import { buildScorecards } from './data/scorecard';
import { COUNTRY_FEATURES } from './geo';
import { Header } from './components/Header';
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
    setLayerId(a === 'connections' ? 'trade.dependency' : layerFor(t));
    document.getElementById('atlas-main')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app">
      <div className="bg-aurora" aria-hidden="true" />
      <Header profiles={profiles} onSelect={select} />

      <main id="atlas-main" className={`main${drawerOpen ? ' drawer-open' : ''}`}>
        <section className="stage" aria-label="World intelligence map">
          <div className="stage-head">
            <h1>
              Global insights. <span className="grad">In seconds.</span>
            </h1>
            <p className="muted">
              {layer.question} <span className="stage-hint">Click any country to explore.</span>
            </p>
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

      <footer className="footer">
        <p>
          <strong>About the data.</strong> The seven sections draw on the IMF World Economic Outlook, World Bank (with ILO, SIPRI,
          UCDP and debt statistics), BIS, Our World in Data, the Fragile States Index, the INFORM Risk Index, UN Comtrade and the
          FBIC Index, refreshed by scheduled jobs. Every value shows its year, and anything not fetched yet says so. The News
          tab and the developing-story text are still illustrative.
        </p>
        <p className="muted small">ATLAS prototype · Boundaries from Natural Earth via world-atlas.</p>
      </footer>
    </div>
  );
}
