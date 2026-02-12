/**
 * Dataset enrichment script.
 *
 * Reads wildfooduk_mushrooms_final.json, applies structural improvements,
 * and writes wildfooduk_mushrooms_enriched.json.
 *
 * Structural improvements:
 * 1. Parse size fields into numeric min/max
 * 2. Convert season months to numeric
 * 3. Fix concatenation artefacts in possible_confusion
 * 4. Add enrichment field templates for all entries
 * 5. Populate enrichment fields for key species with rule engine knowledge
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MONTH_MAP = {
  'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
  'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
  'All': null, // handled specially
};

/**
 * Parse a free-text size string into { min, max } numeric values.
 * Handles: "5-10", "5–20", "5 – 10", "0,5–1,5", "1–3(5)",
 *          "10-16 but can be found up to 25cm", "3", "1-1.5cm", null
 */
function parseSize(sizeStr) {
  if (sizeStr === null || sizeStr === undefined) return { min: null, max: null };

  // Strip trailing "cm" (with or without space)
  let s = sizeStr.replace(/\s*cm\s*/gi, '').trim();

  // Handle parenthetical max FIRST: "1–3(5)" → use 5 as max
  // Must check before prose stripping which would remove the parenthetical
  const parenMatch = s.match(/^([\d.,]+)\s*[–\-]\s*([\d.,]+)\s*\(([\d.,]+)\)/);
  if (parenMatch) {
    const min = parseNum(parenMatch[1]);
    const max = parseNum(parenMatch[3]); // Use parenthetical as max
    return { min, max };
  }

  // Handle trailing prose: take only the numeric part at the start
  // Match patterns like "10-16 but can be found..."
  const proseMatch = s.match(/^([\d.,]+\s*[–\-]\s*[\d.,]+)/);
  if (proseMatch) {
    s = proseMatch[1];
  }

  // Handle range: "5-10", "5–20", "5 – 10"
  const rangeMatch = s.match(/^([\d.,]+)\s*[–\-]\s*([\d.,]+)/);
  if (rangeMatch) {
    return { min: parseNum(rangeMatch[1]), max: parseNum(rangeMatch[2]) };
  }

  // Handle single number: "3", "80"
  const singleMatch = s.match(/^([\d.,]+)/);
  if (singleMatch) {
    const val = parseNum(singleMatch[1]);
    return { min: val, max: val };
  }

  return { min: null, max: null };
}

/** Parse a number string, handling European comma decimals */
function parseNum(s) {
  if (!s) return null;
  // Replace comma with dot for European decimal
  const normalized = s.replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

/** Convert season month abbreviation to number */
function parseSeasonMonth(monthStr, isEnd) {
  if (monthStr === 'All') return isEnd ? 12 : 1;
  return MONTH_MAP[monthStr] ?? null;
}

/**
 * Fix concatenation artefacts from web scraping.
 * These occur when HTML tags were stripped without adding spaces.
 * e.g., "TheYellow Stainer" → "The Yellow Stainer"
 *       "withBirch" → "with Birch"
 *       "thenXerocomus" → "then Xerocomus"
 */
function fixConcatenation(text) {
  if (!text) return text;
  // Fix missing space where lowercase meets uppercase (most common scraping artefact)
  // This catches: withBirch, TheYellow, thenXerocomus, becomingXerocomus, etc.
  let fixed = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Fix missing space before opening parenthesis after word char
  fixed = fixed.replace(/([a-z).])\(([A-Z])/g, '$1 ($2');
  // Fix missing space between sentences (period immediately followed by uppercase, no space)
  // The first regex already handles lowercase.Upper, but not period-after-close-paren
  fixed = fixed.replace(/(\))\.([A-Z])/g, '$1. $2');
  return fixed;
}

// ─── Genus-level edibility knowledge from edibility.ts ───

const GENUS_EDIBILITY = {
  'Amanita': { status: 'deadly', danger_level: 'deadly', requires_cooking: false, beginner_safe: false },
  'Agaricus': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false },
  'Russula': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: true },
  'Boletus': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: true },
  'Cantharellus': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Lactarius': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false },
  'Pleurotus': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Macrolepiota': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false },
  'Coprinopsis': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false },
  'Hydnum': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Laetiporus': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: true },
  'Fistulina': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Marasmius': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false },
  'Craterellus': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Sparassis': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Calvatia': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false },
  'Leccinum': { status: 'edible', danger_level: 'safe', requires_cooking: true, beginner_safe: true },
  'Armillaria': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: false },
  'Clitocybe': { status: 'deadly', danger_level: 'deadly', requires_cooking: false, beginner_safe: false },
  'Lepista': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: false },
  // Additional genera from the dataset not in the original 20
  'Cortinarius': { status: 'deadly', danger_level: 'deadly', requires_cooking: false, beginner_safe: false },
  'Galerina': { status: 'deadly', danger_level: 'deadly', requires_cooking: false, beginner_safe: false },
  'Lepiota': { status: 'deadly', danger_level: 'deadly', requires_cooking: false, beginner_safe: false },
  'Inocybe': { status: 'toxic', danger_level: 'dangerous', requires_cooking: false, beginner_safe: false },
  'Entoloma': { status: 'toxic', danger_level: 'dangerous', requires_cooking: false, beginner_safe: false },
  'Paxillus': { status: 'toxic', danger_level: 'dangerous', requires_cooking: false, beginner_safe: false },
  'Hypholoma': { status: 'toxic', danger_level: 'dangerous', requires_cooking: false, beginner_safe: false },
  'Tricholoma': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false },
  'Coprinus': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false },
  'Morchella': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: false },
  'Hericium': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Lycoperdon': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false },
  'Suillus': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Auricularia': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Tuber': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Chlorophyllum': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: false },
  'Paralepista': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: false },
  'Xerocomellus': { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true },
  'Neoboletus': { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: false },
};

// ─── Species-level enrichments from rule engine knowledge ───

const SPECIES_ENRICHMENTS = {
  // === DEADLY SPECIES ===
  'Amanita phalloides': {
    edibility_detail: { status: 'deadly', danger_level: 'deadly', requires_cooking: false, beginner_safe: false, notes: 'DEADLY. One cap can kill an adult. Symptoms delayed 6-24 hours with false recovery period. Causes irreversible liver failure.' },
    diagnostic_features: ['Greenish-yellow to olive cap (can also be white/pale)', 'White gills that stay white (never pink or brown)', 'Large membranous volva (sack) at base — may be underground', 'Prominent ring (skirt) on upper stem', 'White spore print'],
    safety_checks: ['ALWAYS dig around the base to check for volva — it may be buried', 'If the mushroom has white gills + ring + volva, treat as Death Cap until proven otherwise', 'Symptoms delayed 6-24 hours — seek immediate medical attention if suspected ingestion'],
  },
  'Amanita virosa': {
    edibility_detail: { status: 'deadly', danger_level: 'deadly', requires_cooking: false, beginner_safe: false, notes: 'DEADLY. Contains same amatoxins as Death Cap. Pure white — can be mistaken for edible white mushrooms.' },
    diagnostic_features: ['Pure white throughout — cap, gills, stem', 'Shaggy/fibrous stem', 'Prominent volva at base', 'Ring on stem (may be fragile)', 'White spore print', 'Grows in woodland, often with birch'],
    safety_checks: ['Any all-white woodland mushroom with a volva should be treated as Destroying Angel', 'ALWAYS dig around base to check for volva'],
  },
  'Amanita muscaria': {
    edibility_detail: { status: 'toxic', danger_level: 'dangerous', requires_cooking: false, beginner_safe: false, notes: 'Toxic. Contains ibotenic acid and muscimol. Rarely fatal but causes severe symptoms including hallucinations, nausea, and disorientation.' },
    diagnostic_features: ['Bright red cap with white warts/spots (rain can wash spots off)', 'White gills', 'White stem with ring and bulbous base with volval remnants', 'Grows under birch and pine'],
    safety_checks: ['Iconic appearance but rain-washed specimens without white spots can be confused with other red-capped mushrooms'],
  },

  // === TOXIC/DANGEROUS SPECIES ===
  'Agaricus xanthodermus': {
    edibility_detail: { status: 'toxic', danger_level: 'dangerous', requires_cooking: false, beginner_safe: false, notes: 'Toxic. Causes severe GI upset. The most commonly misidentified toxic mushroom in the UK.' },
    diagnostic_features: ['Cap white, smooth, may have slight grey tinge', 'Turns bright chrome yellow when scratched at cap edge or cut at stem base', 'Strong unpleasant smell of Indian ink, chemicals, or iodine (especially when cooking)', 'Gills pink then brown (like other Agaricus)'],
    safety_checks: ['ALWAYS scratch the stem base — chrome yellow staining + chemical smell = Yellow Stainer', 'Cook test: the chemical smell becomes very strong when heated — discard immediately'],
  },
  'Cortinarius rubellus': {
    edibility_detail: { status: 'deadly', danger_level: 'deadly', requires_cooking: false, beginner_safe: false, notes: 'DEADLY. Causes irreversible kidney failure. Symptoms delayed 3-14 DAYS after ingestion. No effective treatment once symptoms appear.' },
    diagnostic_features: ['Tawny/orange-brown conical to umbonate cap', 'Rusty brown spore print', 'Cobweb-like cortina (veil remnants) on stem', 'Grows in conifer woodland'],
    safety_checks: ['Any brown mushroom with cobweb veil remnants and rusty spore print — NEVER eat', 'Can resemble Blewits (Lepista) — always check spore print colour (Lepista = pink, Cortinarius = rusty brown)'],
  },
  'Galerina marginata': {
    edibility_detail: { status: 'deadly', danger_level: 'deadly', requires_cooking: false, beginner_safe: false, notes: 'DEADLY. Contains same amatoxins as Death Cap. Grows on wood and can be mistaken for edible Honey Fungus.' },
    diagnostic_features: ['Small brown cap, hygrophanous (changes colour as it dries)', 'Ring on stem', 'Grows in clusters on dead wood', 'Rusty brown spore print', 'Smaller clusters than Armillaria'],
    safety_checks: ['CRITICAL: Armillaria (Honey Fungus) has WHITE spore print; Galerina has RUSTY BROWN', 'Any brown mushroom growing on wood with a ring MUST have a spore print taken before eating', 'Never eat Honey Fungus without confirming white spore print'],
  },

  // === KEY EDIBLE SPECIES ===
  'Cantharellus cibarius': {
    edibility_detail: { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true, notes: 'Choice edible. Very safe identification when confirmed — forked ridges (not gills), apricot smell, and egg-yolk yellow colour.' },
    diagnostic_features: ['Egg-yolk yellow colour throughout', 'Forked ridges/veins under cap (NOT true gills — they are blunt, forking, and run down stem)', 'Distinctive apricot/peach smell', 'Grows on soil in woodland, often with oak or beech', 'Firm, white flesh when cut'],
    safety_checks: ['Distinguish from False Chanterelle (Hygrophoropsis aurantiaca): True chanterelle has blunt forked RIDGES, false has thin true GILLS', 'True chanterelle flesh is white when cut; false chanterelle is orange throughout', 'True chanterelle smells of apricots; false chanterelle has no distinctive smell'],
  },
  'Hydnum repandum': {
    edibility_detail: { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true, notes: 'One of the safest edible wild mushrooms. Teeth/spines under the cap are unique — no dangerous lookalikes in the UK.' },
    diagnostic_features: ['Pale cream to pale orange cap', 'Teeth/spines (not gills or pores) hanging under the cap', 'Short, stout, off-centre stem', 'Grows on soil in woodland'],
    safety_checks: [],
  },
  'Boletus edulis': {
    edibility_detail: { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true, notes: 'Choice edible — the Penny Bun / Cep / Porcini. Highly prized.' },
    diagnostic_features: ['Brown cap with a slightly tacky surface when wet', 'White pores that age to greenish-yellow (never red)', 'Swollen stem with fine white network (reticulation) at top', 'White flesh that does NOT change colour when cut', 'Grows with oak, beech, birch, pine'],
    safety_checks: ['Avoid any bolete with red pores — may be toxic (Satan\'s Bolete)', 'Avoid bitter-tasting boletes (Bitter Bolete/Tylopilus felleus looks similar but tastes intensely bitter)', 'Blue staining when cut is harmless in most boletes — it is red pores that indicate danger'],
  },
  'Pleurotus ostreatus': {
    edibility_detail: { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true, notes: 'Safe, distinctive edible. Grows on wood in shelf-like clusters. Few dangerous lookalikes.' },
    diagnostic_features: ['Grows in overlapping shelf-like clusters on dead/dying hardwood', 'Cap blue-grey to brown, fan or oyster-shaped', 'White gills running down to a short lateral stem (or no stem)', 'White spore print', 'Grows late autumn through winter'],
    safety_checks: [],
  },
  'Sparassis crispa': {
    edibility_detail: { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true, notes: 'Unmistakable cauliflower-like shape. No dangerous lookalikes. Needs thorough washing.' },
    diagnostic_features: ['Large cauliflower-like mass of wavy, flattened lobes', 'Cream to pale yellow-brown', 'Grows at base of conifers (usually pine)', 'Can be very large (up to 40cm across)'],
    safety_checks: [],
  },
  'Fistulina hepatica': {
    edibility_detail: { status: 'edible', danger_level: 'safe', requires_cooking: false, beginner_safe: true, notes: 'Unmistakable — looks like a tongue of raw beef on a tree. Safe, no dangerous lookalikes.' },
    diagnostic_features: ['Tongue-shaped bracket growing from oak (or sweet chestnut)', 'Deep red on top, lighter underneath', 'Pores on underside', 'Exudes red juice when cut — resembles raw meat', 'Flesh has red marbling like beef'],
    safety_checks: [],
  },
  'Laetiporus sulphureus': {
    edibility_detail: { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: true, notes: 'Distinctive and popular edible. Must check host tree and only eat young soft specimens. Cook thoroughly.' },
    diagnostic_features: ['Bright orange-yellow brackets growing in overlapping tiers on trees', 'Sulphur-yellow pore surface underneath', 'Soft and fleshy when young, becoming tough and chalky when old', 'No stem — grows directly from tree trunk or stump'],
    safety_checks: ['ALWAYS check what tree it is growing on — specimens on yew or eucalyptus may absorb toxins and should NOT be eaten', 'Only eat young, soft specimens — tough old specimens are indigestible', 'Can cause GI upset in some individuals — try a small amount first', 'Must cook thoroughly'],
  },
  'Macrolepiota procera': {
    edibility_detail: { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false, notes: 'Choice edible but requires care. Must confirm large size, snakeskin stem pattern, and absence of volva.' },
    diagnostic_features: ['Very large — mature cap >15cm (often 20-30cm)', 'Distinctive snakeskin/tiger-stripe pattern on stem', 'Large moveable double ring on stem', 'Cap covered in brown scales on pale background', 'No volva at base'],
    safety_checks: ['CRITICAL: Any lepiota-type mushroom with cap <10cm could be a deadly small Lepiota species — NEVER eat small "parasols"', 'Must confirm NO volva at base (volva = Amanita, not Parasol)', 'Must confirm snakeskin pattern on stem', 'Confirm the ring slides freely up and down the stem'],
  },
  'Coprinopsis atramentaria': {
    edibility_detail: { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false, notes: 'Edible but causes SEVERE illness when consumed with alcohol. Contains coprine which blocks alcohol metabolism.' },
    diagnostic_features: ['Grey-brown egg-shaped cap when young', 'Cap becomes bell-shaped, then dissolves (deliquesces) into black ink', 'Grows in clusters near stumps or buried wood', 'No distinctive ring (unlike Shaggy Ink Cap)'],
    safety_checks: ['NEVER consume with alcohol — coprine causes violent vomiting, palpitations, and flushing', 'Avoid ALL alcohol for 3 days before and after eating', 'Must eat very fresh, before cap begins dissolving into ink'],
  },

  // === SPECIES WITH IMPORTANT SAFETY CHECKS ===
  'Armillaria mellea': {
    edibility_detail: { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: false, notes: 'Edible when thoroughly cooked but has a DEADLY lookalike (Galerina marginata). Not for beginners.' },
    diagnostic_features: ['Honey-coloured cap with fine dark scales', 'White ring on stem', 'Grows in large clusters on dead/dying trees', 'White spore print', 'Dark bootlace-like rhizomorphs at base'],
    safety_checks: ['CRITICAL: Take a spore print before eating. WHITE = Armillaria (edible when cooked). RUSTY BROWN = Galerina marginata (DEADLY)', 'Must cook thoroughly — toxic raw', 'Can cause GI upset even when cooked in some individuals'],
  },
  'Lepista nuda': {
    edibility_detail: { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: true, beginner_safe: false, notes: 'Good edible when cooked. Must confirm lilac stem, pink spore print, and perfumed smell to distinguish from deadly Cortinarius.' },
    diagnostic_features: ['Lilac/violet stem (fading with age)', 'Cap grey-brown to lilac-brown', 'Pink spore print', 'Perfumed/soapy smell', 'Often in leaf litter in late autumn'],
    safety_checks: ['CRITICAL: Take a spore print. PINK = Lepista (edible when cooked). RUSTY BROWN = Cortinarius (potentially DEADLY — kidney failure)', 'Check stem colour: Lepista has lilac stem; dangerous Cortinarius may have brown/rusty tones', 'Must cook thoroughly — toxic raw'],
  },
  'Marasmius oreades': {
    edibility_detail: { status: 'edible_with_caution', danger_level: 'caution', requires_cooking: false, beginner_safe: false, notes: 'Good edible but grows alongside deadly Clitocybe rivulosa in fairy rings on lawns.' },
    diagnostic_features: ['Small (2-5cm cap), tan/buff, convex to slightly umbonate', 'Widely spaced (distant) cream gills that are FREE of the stem', 'Tough, wiry stem that bends without breaking', 'Grows in fairy rings on lawns and grassland', 'Revives when rehydrated after drying'],
    safety_checks: ['CRITICAL: Clitocybe rivulosa (Fool\'s Funnel) also grows in fairy rings on lawns and is DEADLY', 'Distinguish by: Marasmius has TOUGH wiry stem + FREE gills; Clitocybe rivulosa has SOFT stem + DECURRENT gills (running down stem)', 'When in doubt, leave it — the risk of confusing with Clitocybe rivulosa is significant'],
  },
};


// ─── Main enrichment logic ───

function enrichEntry(entry) {
  const enriched = { ...entry };

  // 1. Parse size fields
  const capSize = parseSize(entry.average_cap_width_cm);
  const height = parseSize(entry.average_mushroom_height_cm);
  enriched.cap_width_min_cm = capSize.min;
  enriched.cap_width_max_cm = capSize.max;
  enriched.height_min_cm = height.min;
  enriched.height_max_cm = height.max;

  // 2. Parse season months
  enriched.season_start_month = parseSeasonMonth(entry.season_start, false);
  enriched.season_end_month = parseSeasonMonth(entry.season_end, true);

  // 3. Fix concatenation artefacts in all free-text fields
  const TEXT_FIELDS = [
    'about', 'cap', 'under_cap_description', 'stem', 'skirt', 'flesh',
    'habitat', 'possible_confusion', 'spore_print', 'taste', 'smell',
    'frequency', 'other_facts',
  ];
  for (const field of TEXT_FIELDS) {
    if (enriched[field]) {
      enriched[field] = fixConcatenation(enriched[field]);
    }
  }

  // 4. Add genus-level edibility detail
  const genus = entry.scientific_name?.split(' ')[0];
  const genusEdibility = genus ? GENUS_EDIBILITY[genus] : null;

  // Species-level enrichment overrides genus-level
  const speciesEnrichment = SPECIES_ENRICHMENTS[entry.scientific_name];

  if (speciesEnrichment?.edibility_detail) {
    enriched.edibility_detail = speciesEnrichment.edibility_detail;
  } else if (genusEdibility) {
    // Map original edibility to more specific status using genus knowledge
    let status = genusEdibility.status;
    let danger_level = genusEdibility.danger_level;

    // If the original data says "Poisonous" and genus is marked deadly, keep deadly
    // If original says "Edible" but genus has caution, note the caution
    if (entry.edibility === 'Poisonous') {
      if (status === 'edible' || status === 'edible_with_caution') {
        status = 'toxic';
        danger_level = 'dangerous';
      }
    } else if (entry.edibility === 'Edible') {
      if (status === 'deadly') {
        // Rare: edible species in a dangerous genus (e.g., Amanita rubescens)
        status = 'edible_with_caution';
        danger_level = 'dangerous';
      }
    } else if (entry.edibility === 'Inedible') {
      if (status === 'deadly') {
        status = 'deadly'; // Keep deadly for dangerous genera
      } else {
        status = 'inedible';
        danger_level = danger_level === 'deadly' ? 'deadly' : 'caution';
      }
    }

    enriched.edibility_detail = {
      status,
      danger_level,
      requires_cooking: genusEdibility.requires_cooking,
      beginner_safe: genusEdibility.beginner_safe,
      notes: null,
    };
  } else {
    // Unknown genus — derive from original edibility
    const statusMap = { 'Edible': 'edible', 'Poisonous': 'toxic', 'Inedible': 'inedible' };
    const dangerMap = { 'Edible': 'safe', 'Poisonous': 'dangerous', 'Inedible': 'caution' };
    enriched.edibility_detail = {
      status: statusMap[entry.edibility] ?? 'unknown',
      danger_level: dangerMap[entry.edibility] ?? 'caution',
      requires_cooking: false,
      beginner_safe: false,
      notes: null,
    };
  }

  // 5. Add species-level enrichment fields
  enriched.diagnostic_features = speciesEnrichment?.diagnostic_features ?? null;
  enriched.safety_checks = speciesEnrichment?.safety_checks ?? null;

  return enriched;
}

// ─── Run ───

const inputPath = join(__dirname, 'wildfooduk_mushrooms_final.json');
const outputPath = join(__dirname, 'wildfooduk_mushrooms_enriched.json');

const raw = readFileSync(inputPath, 'utf-8');
const data = JSON.parse(raw);

console.log(`Read ${data.length} entries from ${inputPath}`);

const enriched = data.map(enrichEntry);

// Stats
let sizesParsed = 0;
let sizesFailedCap = [];
let sizesFailedHeight = [];
let speciesEnriched = 0;
let genusEdibilityApplied = 0;

for (const e of enriched) {
  if (e.cap_width_min_cm !== null || e.cap_width_max_cm !== null) sizesParsed++;
  else if (e.average_cap_width_cm !== null) sizesFailedCap.push(e.average_cap_width_cm);

  if (e.height_min_cm === null && e.average_mushroom_height_cm !== null) {
    sizesFailedHeight.push(e.average_mushroom_height_cm);
  }

  if (e.diagnostic_features !== null) speciesEnriched++;
  if (e.edibility_detail) genusEdibilityApplied++;
}

console.log(`\nStructural improvements:`);
console.log(`  Cap sizes parsed: ${sizesParsed}/${data.filter(e => e.average_cap_width_cm !== null).length}`);
if (sizesFailedCap.length > 0) console.log(`  Cap size parse failures: ${JSON.stringify(sizesFailedCap)}`);
if (sizesFailedHeight.length > 0) console.log(`  Height parse failures: ${JSON.stringify(sizesFailedHeight)}`);
console.log(`  Season months added: ${enriched.filter(e => e.season_start_month !== null).length}`);
console.log(`  Edibility detail added: ${genusEdibilityApplied}`);
console.log(`  Species with full enrichment (diagnostic features + safety checks): ${speciesEnriched}`);

writeFileSync(outputPath, JSON.stringify(enriched, null, 2), 'utf-8');
console.log(`\nWrote enriched dataset to ${outputPath}`);
