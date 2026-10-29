// Temporary: list download links on publisher pages and peek at candidate files.
import ExcelJS from 'exceljs';

const PAGES = [
  'https://www.visionofhumanity.org/maps/',
  'https://epi.yale.edu/country/2024/all',
];
const FILES = [
  'https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi:10.7910/DVN/XTAQMC',
  'https://dataverse.harvard.edu/api/search?q=%22Environmental%20Performance%20Index%22&type=dataset&sort=date&order=desc&per_page=5',
  'https://tind.wipo.int/record/58882/files/wipo-pub-2000-2025-gii-tech1.xlsx',
];
const UA = { 'user-agent': 'Mozilla/5.0 (atlas-world-view; github.com/liumOazed/world-view-made-ez)' };

async function page(url) {
  try {
    const res = await fetch(url, { headers: UA });
    const html = await res.text();
    console.log(`\n=== PAGE ${res.status} ${url} (${html.length} chars)`);
    const links = new Set();
    for (const m of html.matchAll(/(?:href|src|data-[a-z-]+)=["']([^"']+)["']/gi)) {
      const h = m[1];
      if (/\.(csv|xlsx?|zip|json)(\?|$)/i.test(h) || /download|dataset|export|api\//i.test(h)) links.add(new URL(h, url).href);
    }
    for (const m of html.matchAll(/https?:[^"'\s<>]+\.(?:csv|xlsx?|zip)\b/gi)) links.add(m[0]);
    for (const l of [...links].slice(0, 80)) console.log('  ', l);
  } catch (e) {
    console.log(`\n=== PAGE ERROR ${url}: ${e.message}`);
  }
}

async function file(url) {
  try {
    const res = await fetch(url, { headers: UA });
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`\n=== FILE ${res.status} ${url} ${res.headers.get('content-type')} ${buf.length} bytes`);
    if (/\.xlsx/i.test(url)) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      for (const ws of wb.worksheets) {
        console.log(`  sheet "${ws.name}" ${ws.rowCount} rows`);
        for (let r = 1; r <= Math.min(5, ws.rowCount); r++) console.log('   ', JSON.stringify(ws.getRow(r).values).slice(0, 400));
      }
    } else console.log(buf.toString('utf8', 0, /dataverse/.test(url) ? 6000 : 900));
  } catch (e) {
    console.log(`\n=== FILE ERROR ${url}: ${e.message}`);
  }
}

for (const u of PAGES) await page(u);
for (const u of FILES) await file(u);
