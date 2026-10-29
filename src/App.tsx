import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Globe2, Sparkles, Waypoints, X } from 'lucide-react';
import { buildProfiles, LINK_META } from './data/countries';
import { INFLUENCE_COLOR, influenceLinks, tradeLinks } from './data/connections';
import { LAYER_BY_ID, type LayerId } from './data/layers';
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

export default function App() {
  const profiles = useMemo(() => {
    const p = buildProfiles(COUNTRY_FEATURES.map((f) => ({ name: f.properties.name, centroid: f.anchor })));
    buildScorecards(p);
    return p;
  }, []);
  const [layerId, setLayerId] = useState<LayerId>('growth');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<CountryTab>('overview');
  const [panelOpen, setPanelOpen] = useState(true);
  const layer = LAYER_BY_ID[layerId];
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

  // Connections belong to the layer that explains them; other layers show the
  // country on its own so the colors stay readable.
  const { links, keys, keyTitle } = useMemo((): { links: MapLink[]; keys: LegendKey[]; keyTitle: string } => {
    if (layerId === 'trade') {
      const kinds = [...new Set(trade.map((l) => l.kind))];
      return {
        links: trade.map((l) => ({ name: l.name, color: LINK_META[l.kind].color, weight: l.share })),
        keys: kinds.map((k) => ({ label: LINK_META[k].label, color: LINK_META[k].color })),
        keyTitle: `Top ${trade.length} trade links`,
      };
    }
    if (layerId === 'leverage') {
      return {
        links: influence.map((l) => ({ name: l.name, color: INFLUENCE_COLOR, weight: l.score })),
        keys: [{ label: 'Countries it influences most', color: INFLUENCE_COLOR }],
        keyTitle: `Top ${influence.length} influenced`,
      };
    }
    return { links: [], keys: [], keyTitle: '' };
  }, [layerId, trade, influence]);

  const select = useCallback((name: string | null) => {
    setSelected(name);
    if (name) setPanelOpen(true);
    else setTab('overview');
  }, []);

  const onExplore = (a: ExploreAction) => {
    const target = selected ?? 'Bangladesh';
    if (a === 'connections') setLayerId('leverage');
    setSelected(target);
    setPanelOpen(true);
    setTab(a === 'connections' ? 'trade' : a === 'compare' ? 'economy' : 'risk');
    document.getElementById('atlas-main')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app">
      <div className="bg-aurora" aria-hidden="true" />
      <Header profiles={profiles} onSelect={select} />

      <main id="atlas-main" className={`main${panelOpen ? '' : ' panel-collapsed'}`}>
        <section className="stage" aria-label="World intelligence map">
          <div className="stage-head">
            <h1>
              Global insights. <span className="grad">In seconds.</span>
            </h1>
            <p className="muted">
              {layer.question} <span className="stage-hint">Click any country to explore.</span>
            </p>
          </div>
          <LayerBar layer={layer} onChange={setLayerId} />
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
                  className={layerId === 'trade' ? 'is-active' : undefined}
                  aria-pressed={layerId === 'trade'}
                  onClick={() => setLayerId('trade')}
                >
                  <Waypoints size={13} /> Trade links
                </button>
                <button
                  type="button"
                  className={layerId === 'leverage' ? 'is-active' : undefined}
                  aria-pressed={layerId === 'leverage'}
                  onClick={() => setLayerId('leverage')}
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
          <RegionStrip />
        </section>

        <div className="panel-wrap">
          <button
            type="button"
            className="panel-handle"
            aria-expanded={panelOpen}
            aria-controls="side-panel"
            aria-label={panelOpen ? 'Collapse side panel' : 'Expand side panel'}
            title={panelOpen ? 'Collapse panel' : 'Expand panel'}
            onClick={() => setPanelOpen((o) => !o)}
          >
            {panelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          {panelOpen ? (
            <aside
              key={selected ?? 'global'}
              id="side-panel"
              className={`side-panel${country ? ' is-country' : ''}`}
              aria-live="polite"
            >
              {country ? (
                <CountryPanel
                  country={country}
                  profiles={profiles}
                  tab={tab}
                  onTab={setTab}
                  trade={trade}
                  influence={influence}
                  onSelect={select}
                  onClose={() => select(null)}
                />
              ) : (
                <GlobalOverview onSelect={select} />
              )}
            </aside>
          ) : (
            <button
              type="button"
              id="side-panel"
              className="panel-rail"
              onClick={() => setPanelOpen(true)}
              aria-label="Expand side panel"
            >
              <span>{country ? country.display : 'Global overview'}</span>
            </button>
          )}
        </div>
      </main>

      <Rankings
        profiles={profiles}
        onSelect={(n) => {
          select(n);
          setTab('scorecard');
          document.getElementById('atlas-main')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <Explore onAction={onExplore} />

      <footer className="footer">
        <p>
          <strong>About the data.</strong> Every figure on this page is an illustrative placeholder for layout only. It is not
          live, sourced or suitable for decisions. The production version will attach a source, reporting period and update
          time to every value, drawing on IMF, World Bank, UN Comtrade, WITS and BIS data.
        </p>
        <p className="muted small">ATLAS prototype · Boundaries from Natural Earth via world-atlas.</p>
      </footer>
    </div>
  );
}
