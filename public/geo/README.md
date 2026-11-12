# Map data

Loaded by the map only when someone opens a place, so the first page stays light.

| File | What | Source and licence |
| --- | --- | --- |
| `admin/<ISO3>.json` | States or provinces and districts for 194 countries (170 with both levels), with outline and label points, one TopoJSON file each | geoBoundaries gbOpen ADM1 and ADM2, simplified (CC BY 4.0) |
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

## How `admin/` was made

For each country, the geoBoundaries `_simplified` ADM1 and ADM2 files were
simplified with mapshaper (about 1,400 and 2,600 grid cells across the
country), each district was assigned to the state it overlaps most, the
states were dissolved into an outline, and an inner label point was added per
unit. Names lose transliteration macrons (Mahārāshtra → Maharashtra), and a
second level that would only repeat the first is dropped. The country list
and level names (State, Province, County…) are in `src/data/subnational.json`;
state names feed search through `src/data/places.json`.

## Adding or deepening a country

Bangladesh shows the hand-built route: a folder with `adm1.json`,
`adm2.json`, `adm3.json`, `outline.json`, `labels.json` and extras, plus an
entry in `SUBNATIONAL` in `src/map/places.ts`. Every other country only needs
its TopoJSON file and a line in `src/data/subnational.json`.

The glyphs in `public/glyphs/noto/` are Noto Sans ranges 0–511 and 8192–8447
(SIL Open Font Licence), from `smp-noto-glyphs`.
