// Temporary: list download links on publisher pages and peek at candidate files.
import ExcelJS from 'exceljs';

const PAGES = [
  'https://rsf.org/en/index',
  'https://epi.yale.edu/downloads',
  'https://fragilestatesindex.org/excel/',
  'https://fragilestatesindex.org/category/publications-and-downloads/',
  'https://www.heritage.org/index/',
  'https://www.heritage.org/index/pages/all-country-scores',
  'https://www.economicsandpeace.org/global-peace-index/',
  'https://www.visionofhumanity.org/maps/',
  'https://www.visionofhumanity.org/resources/',
  'https://www.socialprogress.org/download',
  'https://www.socialprogress.org/',
  'https://www.wipo.int/web-publications/global-innovation-index-2025/en/',
  'https://www.wipo.int/global_innovation_index/en/',
  'https://www.weforum.org/publications/global-gender-gap-report-2025/',
  'https://www.cato.org/human-freedom-index/2025',
  'https://www.fraserinstitute.org/economic-freedom/dataset',
  'https://www.fraserinstitute.org/studies/human-freedom-index-2025',
  'https://atlas.hks.harvard.edu/rankings',
  'https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi:10.7910/DVN/XTAQMC',
  'https://goodcountry.org/index/results/',
];
const FILES = [
  'https://rsf.org/sites/default/files/import_classement/2026.csv',
  'https://rsf.org/sites/default/files/import_classement/2025.csv',
  'https://fragilestatesindex.org/wp-content/uploads/2023/06/FSI-2023-DOWNLOAD.xlsx',
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
    for (const l of [...links].slice(0, 60)) console.log('  ', l);
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
    } else console.log(buf.toString('utf8', 0, 900));
  } catch (e) {
    console.log(`\n=== FILE ERROR ${url}: ${e.message}`);
  }
}

for (const u of PAGES) await page(u);
for (const u of FILES) await file(u);
