/**
 * Fetch FBIC (Formal Bilateral Influence Capacity, Pardee Center, University of
 * Denver) from Harvard Dataverse into src/data/influence.json.
 *
 *   node scripts/fetch-fbic.mjs
 *
 * Needs internet access, which CI has; see .github/workflows/refresh-fbic.yml.
 */
const DV = 'https://dataverse.harvard.edu/api';
const DOI = 'doi:10.7910/DVN/SLLEIR';
const UA = { 'user-agent': 'atlas-world-view (github.com/liumOazed/world-view-made-ez)' };

async function main() {
  const meta = await (await fetch(`${DV}/datasets/:persistentId/?persistentId=${DOI}`, { headers: UA })).json();
  const v = meta.data.latestVersion;
  console.log(`version ${v.versionNumber}.${v.versionMinorNumber}, released ${v.releaseTime}, licence ${v.license?.name ?? JSON.stringify(v.termsOfUse ?? '').slice(0, 200)}`);
  for (const f of v.files) {
    const d = f.dataFile;
    console.log(`  ${d.id} ${d.originalFileName ?? d.filename} ${d.contentType} ${d.originalFileSize ?? d.filesize} ${f.description ?? ''}`);
  }
  // Peek at each tabular file.
  for (const f of v.files) {
    const d = f.dataFile;
    if (!/csv|tab|text/.test(d.originalFileFormat ?? d.contentType)) continue;
    const res = await fetch(`${DV}/access/datafile/${d.id}?format=original`, { headers: UA });
    const reader = res.body.getReader();
    const { value } = await reader.read();
    reader.cancel();
    console.log(`\n--- ${d.originalFileName ?? d.filename} (${res.status})\n${Buffer.from(value ?? []).toString('utf8', 0, 1200)}`);
  }
}

main();
