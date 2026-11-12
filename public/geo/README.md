# Map data

Loaded by the map only when someone opens a place, so the first page stays light.

| File | What | Source and licence |
| --- | --- | --- |
| `cities.json` | Capitals, big cities and Bangladeshi towns with population | GeoNames (CC BY 4.0), via all-the-cities |
| `BGD/outline.json` | Bangladesh outline, dissolved from the divisions so the edges meet | geoBoundaries gbOpen (CC BY 4.0) |
| `BGD/adm1.json` | 8 divisions | geoBoundaries gbOpen ADM1 (CC BY 4.0) |
| `BGD/adm2.json` | 64 districts | geoBoundaries gbOpen ADM2 (CC BY 4.0) |
| `BGD/adm3.json` | 544 upazilas and city areas | geoBoundaries ADM3 polygons via the `bangladesh-geojson` package, re-tagged to their district and division by point-in-polygon |
| `BGD/labels.json` | One label point inside each unit | derived from the shapes above |
| `BGD/roads.json`, `BGD/markets.json` | Trunk and primary roads, bazars | © OpenStreetMap contributors (ODbL), via `bangladesh-geojson` |
| `BGD/rivers.json` | Major rivers | `@geo-maps/earth-rivers-1km` |

Every unit carries `name`, `key` and `parent`. Keys are paths from the top
level down (`Dhaka`, `Dhaka/Gazipur`, `Dhaka/Gazipur/Kaliakair`), so a place
can be found from its key alone and names can repeat across districts.

District names use the current official spellings (Bogura, Cumilla, Jashore,
Brahmanbaria, Chapai Nawabganj, Moulvibazar).

## Adding a country

1. Put its levels in `public/geo/<ISO3>/` as `adm1.json`, `adm2.json`, … with
   `name`, `key` and `parent` on each feature, plus `outline.json` and
   `labels.json`.
2. Add an entry to `SUBNATIONAL` in `src/map/places.ts` naming the levels.
3. Add its keys to `src/data/places.json` so search can find them.

The glyphs in `public/glyphs/noto/` are Noto Sans ranges 0–511 and 8192–8447
(SIL Open Font Licence), from `smp-noto-glyphs`.
