# Species Enrichments: diagnostic_features & safety_checks

These 7 species currently have `null` for both `diagnostic_features` and `safety_checks` in `src/data/wildfooduk_mushrooms_enriched.json`. The enrichments below are derived **mechanically from existing field descriptions** already in the dataset — no new mycological facts were invented.

"NEVER" statements are added only where the source data gives a specific colour/feature that clearly excludes another (e.g., "deep pink" gills clearly excludes "white" gills).

---

## 1. Field Mushroom (Agaricus campestris)

**Source data:** cap "White, sometimes discoloured grey/brown", gills "start deep pink and soon turn to dark brown", spore print "Chocolate brown", no volva mentioned, habitat "Pasture, meadows, lawns"

**`diagnostic_features`:**
> Gills start deep pink, darkening to chocolate brown/black — NEVER white; Cap white to grey-brown — NEVER olive, green, or yellow; Chocolate brown spore print; No volva at base; Delicate ring that often breaks away; Grassland habitat (meadows, lawns, pasture)

**`safety_checks`:**
> CRITICAL: If gills are WHITE, this is NOT a Field Mushroom — consider Amanita phalloides (Death Cap) which is deadly; If cap has ANY green or olive tones, this is NOT a Field Mushroom — consider Death Cap; ALWAYS dig around stem base and check for a volva (cup/sack) — presence of volva means Amanita, not Agaricus; Scratch stem base — bright chrome yellow staining with ink/chemical smell = Yellow Stainer (toxic)

---

## 2. Horse Mushroom (Agaricus arvensis)

**Source data:** cap "White, sometimes discoloured grey/brown", gills "almost white but quickly turn from pale pink/grey to brown", spore print "Dark purple/brown", flesh "aniseed smell", no volva

**`diagnostic_features`:**
> Large (10-16cm cap); White cap bruising slightly yellow; Gills quickly pass from pale pink/grey to brown — NEVER stay permanently white; Dark purple-brown spore print; Strong aniseed smell from flesh; Double-edged ring; No volva at base; Cog-wheel appearance under unopened caps

**`safety_checks`:**
> Can look similar to Amanitas when young and gills are still pale — ALWAYS dig around base to check for volva; Horse Mushroom has NO volva; If a volva is present, this is Amanita (potentially deadly); Confirm aniseed smell from flesh — Death Cap has no aniseed smell; Scratch stem base — bright chrome yellow + ink smell = Yellow Stainer (toxic)

---

## 3. Fool's Funnel (Clitocybe rivulosa) — DEADLY

**Source data:** cap "White and slightly dusty when young, very pale grey/brown on aging", gills "running down the stem (decurrent)", habitat "Pasture, fields, lawns, beside paths and roadsides, frequently in rings or troops"

**`diagnostic_features`:**
> Small white funnel-shaped cap (3-6cm); Gills decurrent (running down the stem); White/cream gills becoming pinkish buff; No ring on stem; Grows in fairy rings on lawns and grassland; White spore print; Cap becomes depressed in centre with inrolled edge

**`safety_checks`:**
> DEADLY — contains lethal amounts of muscarine; Grows in same fairy rings as edible Fairy Ring Champignon (Marasmius oreades); Key distinction: Fool's Funnel gills run DOWN the stem (decurrent); Marasmius gills are FREE of stem; Fool's Funnel stem is soft; Marasmius stem is tough and wiry

---

## 4. Panthercap (Amanita pantherina) — DEADLY

**Source data:** cap "Dark brown to slightly red brown covered in thick white scales", skirt "does not have the striations... and is smooth", volva is "obvious, bulbous, marginate (with a 'gutter' running around the top edge)"

**`diagnostic_features`:**
> Dark brown to red-brown cap with pure WHITE warts/scales; Smooth ring (skirt) with NO striations on upper surface; Marginate volva with distinctive gutter/rim at top; White gills, free of stem; White spore print; Prefers acidic soil and beech woodland

**`safety_checks`:**
> DEADLY — distinguish from the edible Blusher (Amanita rubescens) by: Panthercap skirt is SMOOTH, Blusher skirt has STRIATIONS; Panthercap does NOT blush red when damaged, Blusher DOES; Panthercap has pure white cap scales, Blusher has off-white to grey scales; Panthercap volva has a gutter/rim (marginate), Blusher's base is simply bulbous

---

## 5. Grey Spotted Amanita (Amanita excelsa)

**Source data:** cap "Grey-silver coloured to light brown to a darker red/brown and covered in off-white to grey scales", skirt "has obvious striations on the upper surface", base "bulbous rather than appearing from a volva"

**`diagnostic_features`:**
> Grey-silver to brown cap with off-white to grey scales; Ring (skirt) with STRIATIONS on upper surface — key distinguishing feature; Bulbous base with NO gutter/rim (not marginate); White gills, free of stem; White spore print

**`safety_checks`:**
> Can be confused with deadly Panthercap (Amanita pantherina); Key check: examine the ring — Grey Spotted has STRIATIONS on upper surface, Panthercap ring is SMOOTH; Base: Grey Spotted is simply bulbous, Panthercap has marginate volva with gutter/rim; Not recommended for beginners due to Panthercap confusion risk

---

## 6. Blusher (Amanita rubescens)

**Source data:** flesh "White but 'blushing' pink to red when bruised or exposed to air", skirt "top has fine grooves or striations", scales "off-white to grey"

**`diagnostic_features`:**
> Flesh-coloured to light/dark brown cap with off-white to GREY scales; Flesh blushes pink to red when bruised or exposed to air — definitive feature; Ring (skirt) with STRIATIONS on upper surface; Bulbous base, not marginate when mature; White spore print

**`safety_checks`:**
> Can be confused with deadly Panthercap (Amanita pantherina); Key test: cut or damage the flesh — Blusher turns PINK/RED, Panthercap does NOT change colour; Check ring: Blusher has STRIATIONS, Panthercap ring is SMOOTH; Check scales: Blusher scales are off-white to GREY, Panthercap scales are pure WHITE; Must be thoroughly cooked — toxic raw

---

## 7. Devil's Bolete (Rubroboletus satanas)

**Source data:** cap "Off-white with light tan, buff, sometimes with red tones", pores "Fine blood red pores fading to orange, bruising blue/green", stem "Swollen towards the base, red/orange turning chrome yellow towards the apex"

**`diagnostic_features`:**
> Pale/off-white cap (unusual for a bolete); Blood RED pores (not tubes) underneath — key danger sign; Swollen stem with red-orange lower half and yellow upper half; Fine red reticulation (mesh pattern) on stem; Flesh turns pale blue when cut; Grows with oak and beech

**`safety_checks`:**
> Any bolete with RED pores should be treated with extreme caution; Blue staining alone is harmless in boletes, but red pores + blue staining = danger; Do not confuse with edible Lurid Bolete which has a darker cap

---

## Impact Assessment

The most impactful enrichment is **#1 (Field Mushroom)** — adding explicit `diagnostic_features` and `safety_checks` that state gills are never white and cap is never olive/green directly addresses the Death Cap confusion failure mode that prompted this work.

All enrichments are used by Stage 2 of the two-stage pipeline (see `two-stage-pipeline-plan.md`) where the LLM compares user-described features against these specific dataset entries.
