/**
 * Download reference images for all mushroom species from Wikipedia.
 * Uses the Wikipedia pageimages API to find representative photos,
 * then downloads them to public/images/mushrooms/.
 *
 * Usage: node scripts/download-images.mjs
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'images', 'mushrooms');

// Map of output filename -> Wikipedia article title
const SPECIES_MAP = {
  'amanita_phalloides': 'Amanita phalloides',
  'amanita_virosa': 'Amanita virosa',
  'amanita_pantherina': 'Amanita pantherina',
  'amanita_muscaria': 'Amanita muscaria',
  'amanita_rubescens': 'Amanita rubescens',
  'agaricus_campestris': 'Agaricus campestris',
  'agaricus_arvensis': 'Agaricus arvensis',
  'agaricus_xanthodermus': 'Agaricus xanthodermus',
  'russula_cyanoxantha': 'Russula cyanoxantha',
  'russula_virescens': 'Russula virescens',
  'russula_vesca': 'Russula vesca',
  'russula_emetica': 'Russula emetica',
  'russula_foetens': 'Russula foetens',
  'boletus_edulis': 'Boletus edulis',
  'boletus_satanas': 'Rubroboletus satanas',
  'boletus_luridiformis': 'Neoboletus luridiformis',
  'cantharellus_cibarius': 'Cantharellus cibarius',
  'lactarius_deliciosus': 'Lactarius deliciosus',
  'lactarius_torminosus': 'Lactarius torminosus',
  'pleurotus_ostreatus': 'Pleurotus ostreatus',
  'macrolepiota_procera': 'Macrolepiota procera',
  'coprinopsis_comatus': 'Coprinus comatus',
  'coprinopsis_atramentaria': 'Coprinopsis atramentaria',
  'hydnum_repandum': 'Hydnum repandum',
  'laetiporus_sulphureus': 'Laetiporus sulphureus',
  'fistulina_hepatica': 'Fistulina hepatica',
  'marasmius_oreades': 'Marasmius oreades',
  'craterellus_cornucopioides': 'Craterellus cornucopioides',
  'sparassis_crispa': 'Sparassis crispa',
  'calvatia_gigantea': 'Calvatia gigantea',
  'leccinum_scabrum': 'Leccinum scabrum',
  'leccinum_versipelle': 'Leccinum versipelle',
  'armillaria_mellea': 'Armillaria mellea',
  'clitocybe_rivulosa': 'Clitocybe rivulosa',
  'clitocybe_dealbata': 'Clitocybe dealbata',
  'lepista_nuda': 'Lepista nuda',
  'lepista_saeva': 'Lepista saeva',
};

function fetchBuffer(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      }
    };
    protocol.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location, retries).then(resolve, reject);
      }
      if ((res.statusCode === 429 || res.statusCode === 403) && retries > 0) {
        res.resume();
        const waitTime = 8000;
        console.log(`    HTTP ${res.statusCode}, waiting ${waitTime / 1000}s (${retries} retries left)...`);
        return setTimeout(() => fetchBuffer(url, retries - 1).then(resolve, reject), waitTime);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getImageUrlsFromAPI(titles) {
  const encoded = titles.map(t => encodeURIComponent(t)).join('|');
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=pageimages&format=json&pithumbsize=800`;

  const data = await fetchBuffer(apiUrl);
  const json = JSON.parse(data.toString());
  const pages = json.query.pages;
  const results = {};

  for (const [, page] of Object.entries(pages)) {
    if (page.thumbnail?.source) {
      results[page.title] = page.thumbnail.source;
    }
  }
  return results;
}

// Alternative: use the Wikimedia REST API for image thumbnails
async function getImageUrlREST(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

  try {
    const data = await fetchBuffer(apiUrl);
    const json = JSON.parse(data.toString());
    return json.thumbnail?.source || json.originalimage?.source || null;
  } catch {
    return null;
  }
}

async function downloadImage(url, filepath) {
  const data = await fetchBuffer(url);
  await writeFile(filepath, data);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fileExistsAndNotEmpty(filepath) {
  if (!existsSync(filepath)) return false;
  const stats = statSync(filepath);
  return stats.size > 1000; // at least 1KB
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const entries = Object.entries(SPECIES_MAP);

  console.log('Phase 1: Fetching image URLs from Wikipedia REST API...\n');

  const urlMap = {};
  for (const [filename, wikiTitle] of entries) {
    if (fileExistsAndNotEmpty(join(OUTPUT_DIR, `${filename}.jpg`))) {
      continue; // Skip URL lookup for already downloaded
    }
    console.log(`  Looking up: ${wikiTitle}`);
    const url = await getImageUrlREST(wikiTitle);
    if (url) {
      urlMap[wikiTitle] = url;
    } else {
      console.log(`    -> No image found`);
    }
    await delay(500);
  }

  console.log(`\nPhase 2: Downloading images...\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  for (const [filename, wikiTitle] of entries) {
    const filepath = join(OUTPUT_DIR, `${filename}.jpg`);

    if (fileExistsAndNotEmpty(filepath)) {
      console.log(`  EXISTS ${filename}`);
      downloaded++;
      continue;
    }

    const url = urlMap[wikiTitle];
    if (!url) {
      console.log(`  SKIP  ${filename} - no image URL`);
      skipped++;
      continue;
    }

    try {
      await downloadImage(url, filepath);
      const stats = statSync(filepath);
      console.log(`  OK    ${filename} (${Math.round(stats.size / 1024)}KB)`);
      downloaded++;
      await delay(2000);
    } catch (err) {
      console.log(`  FAIL  ${filename} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
  console.log(`Total images in directory: check public/images/mushrooms/`);
}

main().catch(console.error);
