# ATLAS · The world, in context

A map-first command center for understanding a country's economy, its connections, and its exposure to global shocks.

> **All data in this prototype is illustrative.** Every figure is a placeholder chosen for layout. It is not live, sourced, or suitable for decisions.

![ATLAS homepage](docs/screenshots/home.png)

**Live site:** https://liumoazed.github.io/world-view-made-ez/

## What's here

- **World intelligence map** (D3 + Natural Earth boundaries): six layers (growth, inflation, trade dependency, financial exposure, geopolitical pressure, influence & leverage). Color always means the selected metric, and the legend updates with it. Zoom, pan, hover, click.
- **Country intelligence panel**: opens on click or search. Tabs for Overview, Economy (with direction of travel), Connections (who supplies, buys, lends, powers it; click to jump), Risk (Exposure / Vulnerability / Resilience kept separate, plus a what-if shock explorer showing transmission pathways), and News (verified vs developing vs online sentiment).
- **Global overview**: four headline signals with trends, developing stories, and systemic chokepoints.
- **Explore**: Compare, Connections, Risk & contagion, Shock scenarios.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Every push to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.

Press `/` to jump to search.

## Structure

```
src/
  data/countries.ts   illustrative country profiles, partners, issues
  data/layers.ts      map layers, color scales, legends
  data/risk.ts        explainable exposure / vulnerability / resilience + shock pathways
  data/global.ts      global KPIs, stories, chokepoints, regions
  geo.ts              TopoJSON → GeoJSON with arc anchors
  components/         Header, WorldMap, LayerBar/Legend, GlobalOverview, CountryPanel, Explore
```

Replacing `src/data/*` with an API that returns the same shapes (plus source, period and timestamp per value) is the path to real data from IMF, World Bank, UN Comtrade, WITS and BIS.
