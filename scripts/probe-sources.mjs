// Temporary: checks which regional data sources the runner can reach.
const get = (u) => fetch(u, { redirect: 'follow' }).then(async (r) => ({ s: r.status, t: await r.text() })).catch((e) => ({ s: 'ERR', t: e.message }));
for (const q of ['DOSE subnational', 'Database of Subnational Economic output', 'Wenz Kotz subnational GDP']) {
  const { s, t } = await get(`https://zenodo.org/api/records?q=${encodeURIComponent(q)}&size=6`);
  console.log('\nZENODO', q, s, t.length);
  try {
    for (const h of JSON.parse(t).hits.hits) console.log(' ', h.id, h.metadata?.title, '|', h.metadata?.version, '|', (h.files ?? []).map((f) => `${f.key} ${f.size} ${f.links?.self}`).join(' ; '));
  } catch {
    console.log(t.slice(0, 300));
  }
}
const a = await get('https://globaldatalab.org/areadata/table/iwi/');
console.log('\nAREADATA links', [...new Set([...a.t.matchAll(/href="([^"]*(download|csv|export)[^"]*)"/gi)].map((m) => m[1]))].slice(0, 30).join('\n'));
const b = await get('https://globaldatalab.org/areadata/');
console.log('\nAREADATA indicators', [...new Set([...b.t.matchAll(/href="(\/areadata\/[^"]+)"/gi)].map((m) => m[1]))].slice(0, 80).join(' '));
