import { useCallback, useMemo, useState } from 'react';
import { buildProfiles } from './data/countries';
import { LAYER_BY_ID, type LayerId } from './data/layers';
import { COUNTRY_FEATURES } from './geo';
import { Header } from './components/Header';
import { WorldMap } from './components/WorldMap';
import { LayerBar, Legend } from './components/LayerBar';
import { GlobalOverview } from './components/GlobalOverview';
import { CountryPanel, type CountryTab } from './components/CountryPanel';
import { Explore, RegionStrip, type ExploreAction } from './components/Explore';

export default function App() {
  const profiles = useMemo(
    () => buildProfiles(COUNTRY_FEATURES.map((f) => ({ name: f.properties.name, centroid: f.anchor }))),
    [],
  );
  const [layerId, setLayerId] = useState<LayerId>('growth');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<CountryTab>('overview');
  const layer = LAYER_BY_ID[layerId];
  const country = selected ? profiles.get(selected) : undefined;

  const select = useCallback((name: string | null) => {
    setSelected(name);
    if (!name) setTab('overview');
  }, []);

  const onExplore = (a: ExploreAction) => {
    const target = selected ?? 'Bangladesh';
    if (a === 'connections') setLayerId('leverage');
    setSelected(target);
    setTab(a === 'connections' ? 'trade' : a === 'compare' ? 'economy' : 'risk');
    document.getElementById('atlas-main')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app">
      <div className="bg-aurora" aria-hidden="true" />
      <Header profiles={profiles} onSelect={select} />

      <main id="atlas-main" className="main">
        <section className="stage" aria-label="World intelligence map">
          <div className="stage-head">
            <div>
              <h1>
                Global insights. <span className="grad">In seconds.</span>
              </h1>
              <p className="muted">{layer.question} Click any country to explore.</p>
            </div>
            <div className="stage-meta">
              <span className="eyebrow">World intelligence map</span>
              <span className="stage-year">2026 · Illustrative, not live</span>
            </div>
          </div>
          <LayerBar layer={layer} onChange={setLayerId} />
          <div className="map-frame">
            <WorldMap
              features={COUNTRY_FEATURES}
              profiles={profiles}
              layer={layer}
              selected={selected}
              onSelect={select}
            />
            <Legend layer={layer} />
          </div>
          <RegionStrip />
        </section>

        <aside className={`side-panel${country ? ' is-country' : ''}`} aria-live="polite">
          {country ? (
            <CountryPanel
              country={country}
              profiles={profiles}
              tab={tab}
              onTab={setTab}
              onSelect={select}
              onClose={() => select(null)}
            />
          ) : (
            <GlobalOverview onSelect={select} />
          )}
        </aside>
      </main>

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
