import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Observation, IdentificationResult, LLMExplanation } from '@/types';
import { assembleResult } from '@/engine/result-assembler';
import { featureRules } from '@/engine/feature-rules';
import { ALL_GENERA } from '@/engine/genera';
import { getGenusEdibility } from '@/engine/edibility';
import { generateOfflineExplanation } from '@/engine/explanation-templates';
import { useAppStore } from '@/stores/app-store';
import { db } from '@/db/database';
import { extractFeatures, fileToDataUrl } from '@/llm/extract-features';
import { generateExplanation } from '@/llm/explain';
import { recordCalibration } from '@/llm/calibration';

type SelectOption = { value: string; label: string };

const GILL_TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: '-- Not observed --' },
  { value: 'gills', label: 'Gills (blade-like)' },
  { value: 'pores', label: 'Pores (spongy)' },
  { value: 'teeth', label: 'Teeth/spines' },
  { value: 'smooth', label: 'Smooth / none visible' },
  { value: 'ridges', label: 'Ridges (like chanterelle)' },
];

const FLESH_TEXTURE_OPTIONS: SelectOption[] = [
  { value: '', label: '-- Not observed --' },
  { value: 'brittle', label: 'Brittle (snaps like chalk)' },
  { value: 'fibrous', label: 'Fibrous (tears in strands)' },
  { value: 'soft', label: 'Soft / fleshy' },
  { value: 'tough', label: 'Tough / leathery' },
];

const CAP_SHAPE_OPTIONS: SelectOption[] = [
  { value: '', label: '-- Not observed --' },
  { value: 'convex', label: 'Convex (domed)' },
  { value: 'flat', label: 'Flat' },
  { value: 'funnel', label: 'Funnel / depressed' },
  { value: 'conical', label: 'Conical / bell-shaped' },
  { value: 'round', label: 'Round / ball-shaped' },
];

const HABITAT_OPTIONS: SelectOption[] = [
  { value: '', label: '-- Not observed --' },
  { value: 'woodland', label: 'Woodland / forest' },
  { value: 'grassland', label: 'Grassland / meadow' },
  { value: 'parkland', label: 'Parkland (trees in grass)' },
  { value: 'hedgerow', label: 'Hedgerow' },
  { value: 'garden', label: 'Garden / lawn' },
];

const SUBSTRATE_OPTIONS: SelectOption[] = [
  { value: '', label: '-- Not observed --' },
  { value: 'soil', label: 'Soil' },
  { value: 'wood', label: 'Wood (log, stump, trunk)' },
  { value: 'dung', label: 'Dung' },
  { value: 'leaf litter', label: 'Leaf litter' },
];

const GROWTH_PATTERN_OPTIONS: SelectOption[] = [
  { value: '', label: '-- Not observed --' },
  { value: 'solitary', label: 'Solitary (single)' },
  { value: 'scattered', label: 'Scattered (a few nearby)' },
  { value: 'clustered', label: 'Clustered / tufted' },
  { value: 'ring', label: 'In a ring or arc' },
  { value: 'tiered', label: 'Tiered / overlapping shelves' },
];

const YES_NO_OPTIONS: SelectOption[] = [
  { value: '', label: '-- Not observed --' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const CONFIDENCE_COLORS: Record<string, string> = {
  definitive: 'bg-green-100 text-green-800 border-green-300',
  high: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  moderate: 'bg-amber-50 text-amber-800 border-amber-200',
  low: 'bg-orange-50 text-orange-800 border-orange-200',
  insufficient: 'bg-stone-100 text-stone-600 border-stone-200',
};

export function IdentifyPage() {
  const [observation, setObservation] = useState<Observation>({});
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [textDescription, setTextDescription] = useState('');
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Set<string>>(new Set());
  const [llmExplanation, setLlmExplanation] = useState<LLMExplanation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasApiKey = useAppStore((s) => s.hasApiKey);
  const llmLoading = useAppStore((s) => s.llmLoading);
  const llmError = useAppStore((s) => s.llmError);
  const setLlmLoading = useAppStore((s) => s.setLlmLoading);
  const setLlmError = useAppStore((s) => s.setLlmError);

  // Track manual user edits to prevent AI overwriting
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());

  function updateObs(field: keyof Observation, raw: string, isUserEdit = true) {
    setObservation((prev) => {
      const next = { ...prev };
      if (raw === '') {
        delete next[field];
      } else if (raw === 'true') {
        (next as Record<string, unknown>)[field] = true;
      } else if (raw === 'false') {
        (next as Record<string, unknown>)[field] = false;
      } else {
        (next as Record<string, unknown>)[field] = raw;
      }
      return next;
    });
    if (isUserEdit) {
      setUserEditedFields((prev) => new Set(prev).add(field));
      // If user edits an AI-suggested field, remove the badge
      setAiSuggestedFields((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  }

  async function handleAnalyseWithAI() {
    setLlmLoading(true);
    setLlmError(null);

    try {
      // Convert photos to data URLs
      const photoDataUrls = await Promise.all(photoFiles.map(fileToDataUrl));

      const outcome = await extractFeatures(
        db,
        photoDataUrls,
        textDescription || null,
        observation,
      );

      if (!outcome.ok) {
        setLlmError(outcome.message);
        return;
      }

      // Pre-fill empty fields with AI extraction (user-filled fields NOT overwritten)
      const extracted = outcome.result.extracted_observations;
      const newSuggested = new Set<string>();

      setObservation((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(extracted)) {
          if (value === null || value === undefined || value === '') continue;
          // Only pre-fill if user hasn't manually edited this field AND field is currently empty
          const currentValue = prev[key as keyof Observation];
          const isEmpty = currentValue === undefined || currentValue === null || currentValue === '';
          if (isEmpty && !userEditedFields.has(key)) {
            (next as Record<string, unknown>)[key] = value;
            newSuggested.add(key);
          }
        }
        return next;
      });

      setAiSuggestedFields(newSuggested);

      // Store extraction result for calibration later
      useAppStore.getState().setLastExtractionResult(outcome.result);
    } finally {
      setLlmLoading(false);
    }
  }

  function handleIdentify() {
    // Merge user text description into observation so the rule engine can match against it
    let obsForEngine = observation;
    if (textDescription) {
      const existing = observation.description_notes ?? '';
      if (!existing.includes(textDescription)) {
        obsForEngine = {
          ...observation,
          description_notes: existing ? `${existing} ${textDescription}` : textDescription,
        };
      }
    }
    const r = assembleResult(obsForEngine, ALL_GENERA, featureRules);
    setResult(r);
    setLlmExplanation(null);

    // If API key is configured, attempt LLM explanation in background (silently fails offline)
    if (hasApiKey) {
      generateExplanation(db, r, observation).then((explanation) => {
        setLlmExplanation(explanation);
      });

      // Record calibration if we have an extraction result
      const extraction = useAppStore.getState().lastExtractionResult;
      if (extraction?.direct_identification) {
        recordCalibration(db, extraction.direct_identification, r, 'session-' + Date.now());
      }
    }
  }

  function handleReset() {
    setObservation({});
    setResult(null);
    setPhotoFiles([]);
    setTextDescription('');
    setAiSuggestedFields(new Set());
    setUserEditedFields(new Set());
    setLlmExplanation(null);
    setLlmError(null);
    useAppStore.getState().setLastExtractionResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const showAiButton = hasApiKey;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-green-900">Identify</h1>
        <Link to="/" className="text-green-700 text-sm hover:underline">
          Home
        </Link>
      </div>

      <p className="text-sm text-stone-500">
        Every field is optional. The more you provide, the higher the confidence.
      </p>

      {/* Observation form */}
      <div className="rounded-lg bg-white border border-stone-200 p-4 space-y-4">
        <h2 className="font-semibold text-stone-700">Observations</h2>

        {/* Photo upload — multi-photo */}
        <Field label="Photos (up to 3)">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-green-700 file:px-3 file:py-2 file:text-sm file:text-white"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).slice(0, 3);
              if (files.length > 0) {
                setPhotoFiles(files);
                updateObs('photo_available', 'true');
              }
            }}
          />
          {photoFiles.length > 0 && (
            <div className="flex gap-2 mt-2">
              {photoFiles.map((f, i) => (
                <PhotoThumbnail key={i} file={f} />
              ))}
            </div>
          )}
        </Field>

        {/* Text description — always visible (works offline too) */}
        <Field label="Describe what you see (optional)">
          <textarea
            placeholder="e.g. distant gills, cap dipped in centre, concentric colour bands, milk when cut, tough stem..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm h-20 resize-none"
            value={textDescription}
            onChange={(e) => setTextDescription(e.target.value)}
          />
          <p className="text-xs text-stone-400 mt-1">
            Diagnostic details like gill spacing, cap shape, milk, staining, smell, or texture help the rule engine even without AI.
          </p>
        </Field>

        <FieldWithBadge label="What's under the cap?" aiSuggested={aiSuggestedFields.has('gill_type')}>
          <Select
            options={GILL_TYPE_OPTIONS}
            value={(observation.gill_type as string) ?? ''}
            onChange={(v) => updateObs('gill_type', v)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Flesh texture" aiSuggested={aiSuggestedFields.has('flesh_texture')}>
          <Select
            options={FLESH_TEXTURE_OPTIONS}
            value={(observation.flesh_texture as string) ?? ''}
            onChange={(v) => updateObs('flesh_texture', v)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Cap shape" aiSuggested={aiSuggestedFields.has('cap_shape')}>
          <Select
            options={CAP_SHAPE_OPTIONS}
            value={(observation.cap_shape as string) ?? ''}
            onChange={(v) => updateObs('cap_shape', v)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Ring (skirt) on stem?" aiSuggested={aiSuggestedFields.has('ring_present')}>
          <Select
            options={YES_NO_OPTIONS}
            value={observation.ring_present === true ? 'true' : observation.ring_present === false ? 'false' : ''}
            onChange={(v) => updateObs('ring_present', v)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Volva (cup/bag at base)?" aiSuggested={aiSuggestedFields.has('volva_present')}>
          <Select
            options={YES_NO_OPTIONS}
            value={observation.volva_present === true ? 'true' : observation.volva_present === false ? 'false' : ''}
            onChange={(v) => updateObs('volva_present', v)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Stem present?" aiSuggested={aiSuggestedFields.has('stem_present')}>
          <Select
            options={YES_NO_OPTIONS}
            value={observation.stem_present === true ? 'true' : observation.stem_present === false ? 'false' : ''}
            onChange={(v) => updateObs('stem_present', v)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Gill colour" aiSuggested={aiSuggestedFields.has('gill_color')}>
          <input
            type="text"
            placeholder="e.g. white, pink, brown..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.gill_color ?? ''}
            onChange={(e) => updateObs('gill_color', e.target.value)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Spore print colour" aiSuggested={aiSuggestedFields.has('spore_print_color')}>
          <input
            type="text"
            placeholder="e.g. white, cream, brown..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.spore_print_color ?? ''}
            onChange={(e) => updateObs('spore_print_color', e.target.value)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Cap colour" aiSuggested={aiSuggestedFields.has('cap_color')}>
          <input
            type="text"
            placeholder="e.g. red, brown, white, yellow..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.cap_color ?? ''}
            onChange={(e) => updateObs('cap_color', e.target.value)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Stem colour" aiSuggested={aiSuggestedFields.has('stem_color')}>
          <input
            type="text"
            placeholder="e.g. white, lilac, brown..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.stem_color ?? ''}
            onChange={(e) => updateObs('stem_color', e.target.value)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Bruising / colour change when cut" aiSuggested={aiSuggestedFields.has('bruising_color')}>
          <input
            type="text"
            placeholder="e.g. blue, inky black, pink..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.bruising_color ?? ''}
            onChange={(e) => updateObs('bruising_color', e.target.value)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Habitat" aiSuggested={aiSuggestedFields.has('habitat')}>
          <Select
            options={HABITAT_OPTIONS}
            value={(observation.habitat as string) ?? ''}
            onChange={(v) => updateObs('habitat', v)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Growing on" aiSuggested={aiSuggestedFields.has('substrate')}>
          <Select
            options={SUBSTRATE_OPTIONS}
            value={(observation.substrate as string) ?? ''}
            onChange={(v) => updateObs('substrate', v)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Growth pattern" aiSuggested={aiSuggestedFields.has('growth_pattern')}>
          <Select
            options={GROWTH_PATTERN_OPTIONS}
            value={(observation.growth_pattern as string) ?? ''}
            onChange={(v) => updateObs('growth_pattern', v)}
          />
        </FieldWithBadge>

        <FieldWithBadge label="Smell" aiSuggested={aiSuggestedFields.has('smell')}>
          <input
            type="text"
            placeholder="e.g. mushroomy, anise, apricot, earthy..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.smell ?? ''}
            onChange={(e) => updateObs('smell', e.target.value)}
          />
        </FieldWithBadge>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 pt-2">
          {showAiButton && (
            <button
              onClick={handleAnalyseWithAI}
              disabled={llmLoading || (photoFiles.length === 0 && !textDescription)}
              className="rounded-lg bg-violet-600 px-4 py-3 text-white font-medium active:bg-violet-700 disabled:opacity-50"
            >
              {llmLoading ? 'Analysing...' : 'Analyse with AI'}
            </button>
          )}

          {llmError && (
            <p className="text-sm text-red-600">{llmError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleIdentify}
              className="flex-1 rounded-lg bg-green-700 px-4 py-3 text-white font-medium active:bg-green-800"
            >
              Identify
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg bg-stone-200 px-4 py-3 text-stone-700 text-sm active:bg-stone-300"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <ResultView
          result={result}
          observation={observation}
          llmExplanation={llmExplanation}
        />
      )}
    </div>
  );
}

function ResultView({
  result,
  observation,
  llmExplanation,
}: {
  result: IdentificationResult;
  observation: Observation;
  llmExplanation: LLMExplanation | null;
}) {
  const explanation = generateOfflineExplanation(result, observation);
  const activeCandidates = result.candidates.filter(
    (c) => !c.contradicting_evidence.some((e) => e.tier === 'exclusionary') && c.score > 0,
  );
  const eliminatedCandidates = result.candidates.filter(
    (c) => c.contradicting_evidence.some((e) => e.tier === 'exclusionary'),
  );

  const topCandidate = activeCandidates[0];
  const topEdibility = topCandidate ? getGenusEdibility(topCandidate.genus) : undefined;

  return (
    <div className="space-y-4">
      {/* Explanation summary */}
      <div className="rounded-lg bg-green-50 border border-green-200 p-4">
        <p className="text-sm font-medium text-green-900">{explanation.summary}</p>
        <p className="text-sm text-green-800 mt-2">{explanation.identification}</p>
      </div>

      {/* LLM-enhanced explanation */}
      {llmExplanation && (
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-violet-800">AI-Enhanced Explanation</h3>
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-200 text-violet-700">AI</span>
          </div>
          <p className="text-sm text-violet-900">{llmExplanation.summary}</p>
          <p className="text-sm text-violet-800 mt-1">{llmExplanation.detailed_explanation}</p>
          {llmExplanation.safety_emphasis && (
            <p className="text-sm text-violet-700 mt-1 font-medium">{llmExplanation.safety_emphasis}</p>
          )}
          {llmExplanation.suggested_questions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-violet-700">You might also want to know:</p>
              <ul className="mt-1 text-xs text-violet-600 list-disc list-inside">
                {llmExplanation.suggested_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Safety warnings */}
      {result.safety.warnings.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-300 p-4 space-y-2">
          <h3 className="font-bold text-red-800">Safety Warnings</h3>
          {result.safety.warnings.map((w, i) => (
            <p key={i} className="text-sm text-red-700">
              {w.message}
            </p>
          ))}
        </div>
      )}

      {/* Candidates */}
      <div className="rounded-lg bg-white border border-stone-200 p-4 space-y-3">
        <h3 className="font-semibold text-stone-700">Candidates</h3>
        {activeCandidates.length === 0 ? (
          <p className="text-stone-500 text-sm">
            No strong candidates with current observations.
          </p>
        ) : (
          activeCandidates.map((c) => (
            <div
              key={c.genus}
              className={`rounded-lg border p-3 ${CONFIDENCE_COLORS[c.confidence] ?? ''}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{c.genus}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-white/50">
                  {c.confidence} ({(c.score * 100).toFixed(0)}%)
                </span>
              </div>
              {c.matching_evidence.length > 0 && (
                <div className="mt-2 text-xs space-y-1">
                  <span className="font-medium">Supporting:</span>
                  {c.matching_evidence.slice(0, 4).map((e, i) => (
                    <span key={i} className="ml-1">
                      {e.summary}
                      {i < Math.min(c.matching_evidence.length, 4) - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {eliminatedCandidates.length > 0 && (
          <details className="text-sm text-stone-400">
            <summary className="cursor-pointer hover:text-stone-600">
              Eliminated ({eliminatedCandidates.length})
            </summary>
            <div className="mt-1 space-y-1">
              {eliminatedCandidates.map((c) => (
                <div key={c.genus} className="text-xs">
                  <span className="line-through">{c.genus}</span> —{' '}
                  {c.contradicting_evidence[0]?.summary}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Reasoning */}
      <details className="rounded-lg bg-white border border-stone-200 p-4">
        <summary className="font-semibold text-stone-700 cursor-pointer">
          Reasoning
        </summary>
        <ol className="mt-2 space-y-1 text-sm text-stone-600 list-decimal list-inside">
          {result.reasoning_chain.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </details>

      {/* Dangerous lookalikes */}
      {result.safety.dangerous_lookalikes.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
          <h3 className="font-semibold text-amber-800">
            Dangerous Lookalikes
          </h3>
          {result.safety.dangerous_lookalikes.map((l, i) => (
            <div key={i} className="text-sm text-amber-700">
              <span className="font-medium">{l.genus}</span>
              {l.species !== l.genus && (
                <span className="text-xs ml-1">({l.species})</span>
              )}
              <ul className="list-disc list-inside mt-1 text-xs">
                {l.distinguishing_features.map((f, j) => (
                  <li key={j}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Genus edibility info */}
      {topEdibility && (
        <div
          className={`rounded-lg border p-4 ${
            topEdibility.default_safety === 'deadly' || topEdibility.default_safety === 'toxic'
              ? 'bg-red-50 border-red-200'
              : topEdibility.default_safety === 'edible'
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
          }`}
        >
          <h3 className="font-semibold text-stone-700">
            {topCandidate!.genus} — Genus Safety
          </h3>
          <p className="text-sm mt-1">{topEdibility.foraging_advice}</p>
          {topEdibility.warnings.length > 0 && (
            <ul className="mt-2 text-xs list-disc list-inside space-y-1">
              {topEdibility.warnings.map((w, i) => (
                <li key={i} className="text-red-700">{w}</li>
              ))}
            </ul>
          )}
          {topEdibility.requires_cooking && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              Must be cooked — toxic raw.
            </p>
          )}
          {topEdibility.beginner_safe && (
            <p className="mt-1 text-xs text-green-700">
              Suitable for beginners (with correct identification).
            </p>
          )}
        </div>
      )}

      {/* Ambiguities — follow-up questions */}
      {result.ambiguities.length > 0 && (
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 space-y-3">
          <h3 className="font-semibold text-violet-800">Clarifications Needed</h3>
          {result.ambiguities.map((a) => (
            <div key={a.id} className="text-sm space-y-1">
              <p className="font-medium text-violet-700">{a.question}</p>
              <p className="text-xs text-violet-600">{a.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Suggested next steps */}
      {result.suggested_actions.length > 0 && (
        <div className="rounded-lg bg-blue-50 border blue-200 p-4 space-y-2">
          <h3 className="font-semibold text-blue-800">Next Steps</h3>
          {result.suggested_actions.slice(0, 4).map((a, i) => (
            <div key={i} className="text-sm text-blue-700 flex gap-2">
              <span
                className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${
                  a.priority === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {a.priority}
              </span>
              <span>{a.action}</span>
            </div>
          ))}
        </div>
      )}

      {/* Edibility gated by confidence */}
      {result.edibility && (
        <div
          className={`rounded-lg border p-4 ${
            result.edibility.available
              ? 'bg-green-50 border-green-200'
              : 'bg-stone-50 border-stone-200'
          }`}
        >
          <h3 className="font-semibold text-stone-700">Edibility Assessment</h3>
          {result.edibility.available ? (
            <p className="text-sm text-green-700 mt-1">
              {result.edibility.notes}
            </p>
          ) : (
            <p className="text-sm text-stone-500 mt-1">
              {result.edibility.reason_unavailable}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PhotoThumbnail({ file }: { file: File }) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return src ? (
    <img src={src} alt={file.name} className="w-16 h-16 rounded-lg object-cover border border-stone-200" />
  ) : null;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function FieldWithBadge({
  label,
  aiSuggested,
  children,
}: {
  label: string;
  aiSuggested: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {label}
        {aiSuggested && (
          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-600">
            AI
          </span>
        )}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Select({
  options,
  value,
  onChange,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
