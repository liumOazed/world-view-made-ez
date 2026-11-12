// Temporary: checks which regional data sources the runner can reach.
const tryUrl = async (u, n = 600) => {
  try {
    const r = await fetch(u, { redirect: 'follow' });
    const t = r.headers.get('content-type') ?? '';
    const body = /json|text|html/.test(t) ? (await r.text()).slice(0, n) : `[${r.headers.get('content-length')} bytes]`;
    console.log(`\n== ${u}\n${r.status} ${t}\n${body.replace(/\s+/g, ' ')}`);
  } catch (e) {
    console.log(`\n== ${u}\nERR ${e.message}`);
  }
};
const z = await fetch('https://zenodo.org/api/records?q=%22DOSE%22%20subnational%20economic%20output&size=5').then((r) => r.json()).catch((e) => ({ e: e.message }));
for (const h of z.hits?.hits ?? []) console.log('ZENODO', h.id, h.metadata?.title, h.metadata?.version, (h.files ?? []).map((f) => `${f.key} ${f.size} ${f.links?.self}`).join(' | '));
for (const u of [
  'https://ucdp.uu.se/downloads/ged/ged251-csv.zip',
  'https://ucdp.uu.se/downloads/ged/ged241-csv.zip',
  'https://ucdp.uu.se/downloads/',
  'https://globaldatalab.org/areadata/',
  'https://globaldatalab.org/areadata/table/iwi/',
  'https://cdn.cloud.prio.org/files/831b54bf-9efd-4be6-a618-9794109790c1/SHDI-SGDI-Total%2080.csv?inline=true',
]) await tryUrl(u);
