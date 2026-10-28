// Pulls small countries and territories that the 110m world map drops
// (Singapore, Hong Kong, Bahrain, Malta, …) out of the 50m dataset, so the
// app can add them without bundling the full 50m file.
//
//   node scripts/extract-small-countries.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const read = (f) => JSON.parse(readFileSync(require.resolve(`world-atlas/${f}`), 'utf8'));

const KEEP = [
  'Singapore', 'Hong Kong', 'Macao', 'Bahrain', 'Malta', 'Mauritius', 'Maldives', 'Seychelles',
  'Barbados', 'Cabo Verde', 'Comoros', 'Samoa', 'Tonga', 'Andorra', 'Monaco', 'Liechtenstein',
  'San Marino', 'Bermuda', 'Cayman Is.', 'Aruba', 'Curaçao', 'Grenada', 'Saint Lucia',
  'Antigua and Barb.', 'Dominica', 'St. Kitts and Nevis', 'St. Vin. and Gren.',
  'São Tomé and Principe', 'Palau', 'Micronesia', 'Marshall Is.', 'Kiribati', 'Nauru', 'Fr. Polynesia',
];

const small = read('countries-50m.json');
const round = (c) => (typeof c[0] === 'number' ? c.map((v) => Math.round(v * 1000) / 1000) : c.map(round));
const features = feature(small, small.objects.countries)
  .features.filter((f) => KEEP.includes(f.properties.name))
  .map((f) => ({
    type: 'Feature',
    properties: { name: f.properties.name },
    geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
  }));

writeFileSync(
  new URL('../src/data/small-countries.json', import.meta.url),
  JSON.stringify({ type: 'FeatureCollection', features }),
);
console.log(`Wrote ${features.length} features`);
