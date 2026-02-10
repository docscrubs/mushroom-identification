# Adaptive Mushroom Identification & Training System

## Project Summary

An expert system for UK mushroom foraging that combines image analysis with contextual decision trees, safety heuristics, and interactive disambiguation. Crucially, it adapts guidance based on demonstrated user competency, functioning as both an identification tool and a progressive training platform.

## Problem Statement

Current AI mushroom identification apps (iNaturalist, Picture Mushroom, etc.) fail for practical foraging because:

- They treat it as pure image classification
- Training data biased toward "textbook" specimens
- No context (location, season, substrate, ecological associations)
- Can't handle developmental stages or decay
- No interactive disambiguation
- Output ranked species lists with no reasoning

Meanwhile, experienced foragers use:
1. **Ecological context** - habitat, substrate, associated trees, season, geography
2. **Gestalt recognition** - "that's a Russula" before detailed examination
3. **Discriminating tests** - taste, smell, spore print color, bruising reactions
4. **Exclusion rules** - "definitely not X because of Y"
5. **Safety heuristics** - binary rules like the Russula taste test

## Core Innovation: Adaptive Competency Model

The system tracks what users have *proven* they can do, not just what they claim. Each identification session is both a foraging decision and a competency assessment.

### User Model Tracks:
- Demonstrated competencies (with evidence)
- Current learning edges
- Mistakes made and corrected
- Confidence calibration (do they know what they don't know?)
- Regional experience
- Seasonal experience

### Adaptive Behaviour:
- Skip basics user knows
- Unlock new species as prerequisites are met
- Adjust safety guardrails based on track record
- Present training opportunities contextually

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  Photo upload + structured questions + conversational    │
└─────────────────────────────────┬───────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────┐
│                   DECISION ENGINE                        │
│                                                          │
│  1. Context gathering (location, season, habitat)        │
│  2. Genus-level classification (image + context)         │
│  3. Interactive disambiguation (guided questions)        │
│  4. Rule application (heuristics, safety checks)         │
│  5. Confidence assessment + safety warnings              │
└─────────────────────────────────┬───────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────┐
│                   KNOWLEDGE BASE                         │
│                                                          │
│  - Genus profiles (morphology, ecology, lookalikes)      │
│  - Species discrimination keys                           │
│  - Regional/seasonal occurrence data                     │
│  - Foraging heuristics and rules of thumb                │
│  - Safety rules and dangerous lookalikes                 │
│  - Test procedures (taste, smell, bruising, etc.)        │
└─────────────────────────────────────────────────────────┘
```

## Knowledge Base Schema

### Genus Profile Example

```yaml
genus: Russula
common_names: ["Brittlegills"]
confidence_markers:
  high:
    - Brittle flesh that snaps cleanly (like chalk)
    - No ring or volva
    - Attached gills, often brittle
    - Cap often brightly colored
  moderate:
    - White to cream spore print (most species)
    - Mycorrhizal with trees
ecological_context:
  habitat: ["woodland", "forest edges", "parkland with trees"]
  substrate: "soil near trees"
  associations: ["oak", "birch", "beech", "pine", "spruce"]
  season:
    UK: ["July", "August", "September", "October"]
uk_occurrence: "very common"
lookalike_genera:
  - genus: Lactarius
    distinction: "Lactarius exudes milk when cut; Russula does not"
  - genus: Amanita
    distinction: "Amanita has volva at base, often has ring, flesh not brittle"
```

### Foraging Heuristic Example

```yaml
heuristic_id: russula_taste_test
applies_to: 
  genus: Russula
  confidence_required: high
rule: |
  Taste a tiny piece of the cap flesh (not gills). 
  Chew briefly and spit out. Wait 30 seconds.
outcomes:
  - condition: "Mild, nutty, or no strong taste"
    conclusion: "Edible (though quality varies by species)"
    confidence: high
  - condition: "Peppery, hot, burning, or acrid"
    conclusion: "Reject - inedible or mildly toxic"
    confidence: high
exceptions:
  - "R. olivacea can taste mild but causes GI upset in some people"
source: "Traditional foraging knowledge, widely documented"
```

### Safety Rule Example

```yaml
rule_id: avoid_white_agarics
priority: critical
rule: |
  In the UK, avoid all white-capped, white-gilled mushrooms 
  with a ring and volva until you can confidently identify 
  Agaricus species and distinguish them from Amanita.
rationale: |
  Destroying Angel (Amanita virosa) and Death Cap (A. phalloides) 
  are responsible for most UK mushroom fatalities.
applies_to:
  morphology:
    - cap_color: white
    - gill_color: white
    - has_ring: true
```

## User Competency Model

```yaml
user_id: gavin_001
created: 2025-01-15
region: UK_South

competencies:
  genus_recognition:
    Russula:
      status: confident
      evidence:
        - date: 2025-09-12
          type: correct_identification
          notes: "Correctly identified brittlegill texture, applied taste test"
        - date: 2025-09-20
          type: correct_rejection
          notes: "Correctly rejected Lactarius based on milk test"
      unlocks:
        - russula_species_discrimination
        - skip_brittlegill_explanation
        
    Boletus:
      status: learning
      gaps:
        - "Hasn't encountered Rubroboletus group"
        - "Hasn't practiced reticulation assessment"

  safety_discriminations:
    agaricus_vs_amanita:
      status: not_demonstrated
      required_for: "Foraging white field mushrooms"
      training_available: true

calibration:
  false_positives: 0
  false_negatives: 2
  appropriate_uncertainty: 5
  notes: "Tends toward caution - good for safety"
```

## Competency Assessment Mechanics

The system doesn't just ask "do you know this?" - it observes and infers from behaviour:

### Positive Signals (increase competency confidence)
- User volunteers relevant observations before being asked
- User applies previously learned heuristics unprompted
- User correctly rejects lookalikes with reasoning
- User expresses appropriate uncertainty
- User asks good discriminating questions

### Negative Signals (flag for review/training)
- User skips safety checks
- User expresses false confidence
- User misapplies heuristics
- User ignores context (season, location)
- User pushes for "just tell me if it's edible"

### Calibration Tracking
The system tracks not just correctness but *calibration* - does the user know what they don't know?
- **false_positives**: Said confident but was wrong (dangerous)
- **false_negatives**: Was unsure but could have been confident (overcautious, less critical)
- **appropriate_uncertainty**: Correctly expressed doubt on ambiguous cases

## Competency Upgrade/Downgrade Rules

```yaml
upgrade_rule:
  competency: russula_genus_recognition
  from: learning
  to: confident
  requires:
    correct_identifications: 3
    correct_rejections: 1
    false_positives: 0
    timespan_days: 30

refresh_rule:
  trigger: season_start
  action: Prompt review of critical safety discriminations

decay_rule:
  trigger: no_activity_days > 180
  action: Demote species-level competencies to "needs_refresh"
```

## Training Module Structure

```yaml
training_module:
  id: agaricus_amanita_discrimination
  
  prerequisites:
    - basic_mushroom_anatomy
    - understands_volva_concept
    
  learning_objectives:
    - Reliably identify presence/absence of volva
    - Distinguish Agaricus gill color progression from Amanita
    - Know the smell differences
    - Understand why this matters (toxicity)
    
  content:
    - type: explanation
    - type: visual_comparison
    - type: interactive_quiz
    - type: field_exercise
        
  assessment:
    required_correct: 5
    must_include:
      - real_world_identification
      - correct_rejection_of_amanita
    unlocks:
      - white_mushroom_foraging
```

## Spaced Repetition for Safety

```yaml
spaced_repetition:
  item: death_cap_recognition
  priority: critical
  schedule:
    - after: first_learning, interval_days: 3
    - after: first_review, interval_days: 7
    - after: second_review, interval_days: 21
    - ongoing: season_start
```

## Training Mode Examples

### Adaptive Guidance Based on Competency

**Beginner (no demonstrated competencies):**
```
User: [uploads photo of white mushroom in grass]

System: I can see a white mushroom growing in grass. Before we go 
further, I want to share something important:

White mushrooms with gills are a category where dangerous species 
exist - including some of the most toxic mushrooms in the UK. I'll 
help you explore what this might be, but I won't guide you toward 
eating anything white-gilled until you've built up some key skills.

Let's start with observation. Can you see:
1. Is there a ring (skirt) around the stem?
2. Is there a cup or bag-like structure at the base?
```

**Same photo, user with demonstrated Agaricus/Amanita discrimination:**
```
User: [uploads photo of white mushroom in grass]

System: White mushroom in grassland - potential Agaricus territory. 
You know the drill, but let's confirm:

Base structure? And what's happening with the gills - any pink tinge, 
or pure white?
```

### Proactive Training Prompts

```
System: You've correctly identified Russulas several times now and 
you're comfortable with the taste test. 

Would you like to start learning species-level discrimination? 
The main edible targets in your area are:
- R. cyanoxantha (Charcoal Burner) - excellent eating
- R. virescens (Greencracked Brittlegill) - choice
- R. vesca (Bare-toothed Brittlegill) - good

This involves learning gill flexibility tests and some cap features. 
It's optional - the genus-level taste test already tells you what's 
safe - but species ID helps you find the best ones.

Interested?
```

### Key Reframe

Claude isn't the identifier - it's the expert system interface that guides you through identification using your senses and its structured knowledge. The system asks questions, you perform tests, together you reach a conclusion.

## Implementation Options

### Minimal (works now)
- Single large system prompt with core genus profiles and heuristics
- No external knowledge base
- Works in any Claude interface
- Limited by context window

### Better (recommended)
- Knowledge base as structured YAML/JSON files
- MCP server providing lookup tools
- Claude Code or API-based
- Can scale to comprehensive coverage

### Full
- Searchable vector DB for fuzzy matching
- Photo analysis extracts structured features before lookup
- Seasonal/location data from external sources
- Mobile-friendly interface
- Community-contributed heuristics with provenance

## Implementation Considerations

**Storage:** User model should persist via kmdb, lightweight database, or cloud storage

**Privacy:** Tracks learning and potentially foraging locations - keep local/user-controlled

**Liability:** Clear disclaimers - educational tool only, user bears responsibility

**Feedback loops:** System should learn from corrections and track confusing discriminations

## Next Steps

1. Capture core knowledge: genus profiles, discrimination keys, safety rules (the tedious but valuable work)
2. Design the user model schema in full detail
3. Create core training modules for UK foraging fundamentals
4. Build MCP server managing both mycological knowledge and competency tracking
5. Test with real foraging sessions

## Sources for Knowledge Capture

- Phillips, Buczacki, Sterry (standard field guides)
- John Wright's River Cottage handbooks (excellent for UK)
- First Nature, Fungi of Great Britain and Ireland (online keys)
- Foraging communities and traditional knowledge
- Personal experience and rules

## Files in This Handoff

- `genus-profile-schema.yaml` - Template for genus profiles
- `heuristic-schema.yaml` - Template for foraging rules
- `user-model-schema.yaml` - Full user competency model
- `training-module-schema.yaml` - Training content structure
