import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Observation, IdentificationResult, Heuristic, FollowUpQuestion } from '@/types';
import { assembleResult } from '@/engine/result-assembler';
import { featureRules } from '@/engine/feature-rules';
import { ALL_GENERA } from '@/engine/genera';
import { getGenusEdibility } from '@/engine/edibility';
import { generateOfflineExplanation } from '@/engine/explanation-templates';
import { db } from '@/db/database';
import { buildGuidanceContext, type GuidanceContext } from '@/learning/adaptive-guidance';
import { SafetyDisclaimer } from '@/components/SafetyDisclaimer';

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

const MONTH_OPTIONS: SelectOption[] = [
  { value: '', label: '-- Current month --' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YES_NO_OPTIONS: SelectOption[] = [
  { value: '', label: '-- Not observed --' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

/** Maps observation fields to inline widget types for follow-up questions */
const FIELD_WIDGETS: Record<string, { type: 'select' | 'boolean' | 'text' | 'number'; options?: SelectOption[] }> = {
  gill_type: { type: 'select', options: GILL_TYPE_OPTIONS },
  flesh_texture: { type: 'select', options: FLESH_TEXTURE_OPTIONS },
  cap_shape: { type: 'select', options: CAP_SHAPE_OPTIONS },
  habitat: { type: 'select', options: HABITAT_OPTIONS },
  substrate: { type: 'select', options: SUBSTRATE_OPTIONS },
  growth_pattern: { type: 'select', options: GROWTH_PATTERN_OPTIONS },
  season_month: { type: 'select', options: MONTH_OPTIONS },
  ring_present: { type: 'boolean' },
  volva_present: { type: 'boolean' },
  stem_present: { type: 'boolean' },
  gill_color: { type: 'text' },
  gill_attachment: { type: 'text' },
  spore_print_color: { type: 'text' },
  cap_color: { type: 'text' },
  cap_texture: { type: 'text' },
  stem_color: { type: 'text' },
  bruising_color: { type: 'text' },
  smell: { type: 'text' },
  cap_size_cm: { type: 'number' },
};

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
  const [guidance, setGuidance] = useState<GuidanceContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [heuristics, setHeuristics] = useState<Heuristic[]>([]);
  const [reIdentifyCounter, setReIdentifyCounter] = useState(0);
  const [resultUpdated, setResultUpdated] = useState(false);
  const observationRef = useRef(observation);
  observationRef.current = observation;
  const resultRef = useRef<HTMLDivElement>(null);

  // Load heuristics from DB once
  useEffect(() => {
    db.heuristics.toArray().then(setHeuristics);
  }, []);

  // Re-run identification when a follow-up answer is provided
  useEffect(() => {
    if (reIdentifyCounter > 0) {
      handleIdentify().then(() => {
        setResultUpdated(true);
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => setResultUpdated(false), 2500);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reIdentifyCounter]);

  function updateObs(field: keyof Observation, raw: string) {
    setObservation((prev) => {
      const next = { ...prev };
      if (raw === '') {
        delete next[field];
      } else if (raw === 'true') {
        (next as Record<string, unknown>)[field] = true;
      } else if (raw === 'false') {
        (next as Record<string, unknown>)[field] = false;
      } else if (field === 'season_month') {
        (next as Record<string, unknown>)[field] = parseInt(raw, 10);
      } else {
        (next as Record<string, unknown>)[field] = raw;
      }
      return next;
    });
  }

  async function handleIdentify() {
    // Use ref to always read the latest observation (needed for re-identify via effect)
    const currentObs = observationRef.current;
    // Merge user text description into observation so the rule engine can match against it
    let obsForEngine = currentObs;
    if (textDescription) {
      const existing = currentObs.description_notes ?? '';
      if (!existing.includes(textDescription)) {
        obsForEngine = {
          ...currentObs,
          description_notes: existing ? `${existing} ${textDescription}` : textDescription,
        };
      }
    }
    const r = assembleResult(obsForEngine, ALL_GENERA, featureRules, heuristics);
    setResult(r);

    // Build adaptive guidance from user's competency records
    const candidateGenera = r.candidates
      .filter((c) => c.score > 0)
      .map((c) => c.genus);
    const competencies = await db.competencies.toArray();
    const guidance = buildGuidanceContext(competencies, candidateGenera);
    setGuidance(guidance);
  }

  function handleReset() {
    setObservation({});
    setResult(null);
    setPhotoFiles([]);
    setTextDescription('');
    setGuidance(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

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

        <Field label="What's under the cap?">
          <Select
            options={GILL_TYPE_OPTIONS}
            value={(observation.gill_type as string) ?? ''}
            onChange={(v) => updateObs('gill_type', v)}
          />
        </Field>

        <Field label="Flesh texture">
          <Select
            options={FLESH_TEXTURE_OPTIONS}
            value={(observation.flesh_texture as string) ?? ''}
            onChange={(v) => updateObs('flesh_texture', v)}
          />
        </Field>

        <Field label="Cap shape">
          <Select
            options={CAP_SHAPE_OPTIONS}
            value={(observation.cap_shape as string) ?? ''}
            onChange={(v) => updateObs('cap_shape', v)}
          />
        </Field>

        <Field label="Ring (skirt) on stem?">
          <Select
            options={YES_NO_OPTIONS}
            value={observation.ring_present === true ? 'true' : observation.ring_present === false ? 'false' : ''}
            onChange={(v) => updateObs('ring_present', v)}
          />
        </Field>

        <Field label="Volva (cup/bag at base)?">
          <Select
            options={YES_NO_OPTIONS}
            value={observation.volva_present === true ? 'true' : observation.volva_present === false ? 'false' : ''}
            onChange={(v) => updateObs('volva_present', v)}
          />
        </Field>

        <Field label="Stem present?">
          <Select
            options={YES_NO_OPTIONS}
            value={observation.stem_present === true ? 'true' : observation.stem_present === false ? 'false' : ''}
            onChange={(v) => updateObs('stem_present', v)}
          />
        </Field>

        <Field label="Gill colour">
          <input
            type="text"
            placeholder="e.g. white, pink, brown..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.gill_color ?? ''}
            onChange={(e) => updateObs('gill_color', e.target.value)}
          />
        </Field>

        <Field label="Spore print colour">
          <input
            type="text"
            placeholder="e.g. white, cream, brown..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.spore_print_color ?? ''}
            onChange={(e) => updateObs('spore_print_color', e.target.value)}
          />
        </Field>

        <Field label="Cap colour">
          <input
            type="text"
            placeholder="e.g. red, brown, white, yellow..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.cap_color ?? ''}
            onChange={(e) => updateObs('cap_color', e.target.value)}
          />
        </Field>

        <Field label="Stem colour">
          <input
            type="text"
            placeholder="e.g. white, lilac, brown..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.stem_color ?? ''}
            onChange={(e) => updateObs('stem_color', e.target.value)}
          />
        </Field>

        <Field label="Bruising / colour change when cut">
          <input
            type="text"
            placeholder="e.g. blue, inky black, pink..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.bruising_color ?? ''}
            onChange={(e) => updateObs('bruising_color', e.target.value)}
          />
        </Field>

        <Field label="Habitat">
          <Select
            options={HABITAT_OPTIONS}
            value={(observation.habitat as string) ?? ''}
            onChange={(v) => updateObs('habitat', v)}
          />
        </Field>

        <Field label="Growing on">
          <Select
            options={SUBSTRATE_OPTIONS}
            value={(observation.substrate as string) ?? ''}
            onChange={(v) => updateObs('substrate', v)}
          />
        </Field>

        <Field label="Growth pattern">
          <Select
            options={GROWTH_PATTERN_OPTIONS}
            value={(observation.growth_pattern as string) ?? ''}
            onChange={(v) => updateObs('growth_pattern', v)}
          />
        </Field>

        <Field label="Month found">
          <Select
            options={MONTH_OPTIONS}
            value={observation.season_month != null ? String(observation.season_month) : ''}
            onChange={(v) => updateObs('season_month', v)}
          />
          <p className="text-xs text-stone-400 mt-1">
            If not set, assumes the current month. Change this for older photos or dried specimens.
          </p>
        </Field>

        <Field label="Smell">
          <input
            type="text"
            placeholder="e.g. mushroomy, anise, apricot, earthy..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.smell ?? ''}
            onChange={(e) => updateObs('smell', e.target.value)}
          />
        </Field>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
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

      {/* Results */}
      {result && (
        <div ref={resultRef}>
          {resultUpdated && (
            <div className="rounded-lg bg-teal-100 border border-teal-300 px-4 py-2 text-sm font-medium text-teal-800 animate-pulse">
              Results updated with your new observation
            </div>
          )}
          <ResultView
            result={result}
            observation={observation}
            guidance={guidance}
            onAnswerQuestion={(feature, value) => {
              updateObs(feature, value);
              setReIdentifyCounter((c) => c + 1);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ResultView({
  result,
  observation,
  guidance,
  onAnswerQuestion,
}: {
  result: IdentificationResult;
  observation: Observation;
  guidance: GuidanceContext | null;
  onAnswerQuestion: (feature: keyof Observation, value: string) => void;
}) {
  const explanation = generateOfflineExplanation(result, observation, guidance?.overallLevel);
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

      {/* Triggered heuristics — targeted identification procedures */}
      {result.triggered_heuristics.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-4">
          <h3 className="font-semibold text-amber-800">Targeted Tests</h3>
          {result.triggered_heuristics.map((h) => (
            <div key={h.heuristic_id} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-amber-900">{h.name}</span>
                <span className="text-xs text-amber-600 italic">for {h.genus}</span>
              </div>
              {h.steps.length > 0 && (
                <ol className="list-decimal list-inside text-sm text-amber-800 space-y-1 ml-1">
                  {h.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
              {h.safety_notes.length > 0 && (
                <div className="text-xs text-red-700 bg-red-50 rounded p-2 space-y-0.5">
                  {h.safety_notes.map((note, i) => (
                    <p key={i}>{note}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interactive follow-up questions */}
      <FollowUpSection
        questions={result.follow_up_questions}
        onAnswer={onAnswerQuestion}
      />

      {/* Heuristic-driven suggested actions (procedural, not answerable) */}
      {result.suggested_actions.length > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
          <h3 className="font-semibold text-blue-800">Recommended Actions</h3>
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

      <SafetyDisclaimer compact />
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

function FollowUpSection({
  questions,
  onAnswer,
}: {
  questions: FollowUpQuestion[];
  onAnswer: (feature: keyof Observation, value: string) => void;
}) {
  if (questions.length === 0) return null;

  const newTests = questions.filter((q) => !q.previously_available);
  const previouslyAvailable = questions.filter((q) => q.previously_available);

  return (
    <div className="rounded-lg bg-teal-50 border border-teal-200 p-4 space-y-4">
      <h3 className="font-semibold text-teal-800">Follow-up Questions</h3>

      {/* New tests — things the user can actively check */}
      {newTests.length > 0 && (
        <div className="space-y-3">
          {newTests.map((q) => (
            <FollowUpCard key={q.feature} question={q} onAnswer={onAnswer} />
          ))}
        </div>
      )}

      {/* Previously available — form fields left empty */}
      {previouslyAvailable.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-teal-600 italic">
            You may not have had this information earlier — if you can check now, it would help:
          </p>
          {previouslyAvailable.map((q) => (
            <FollowUpCard key={q.feature} question={q} onAnswer={onAnswer} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function FollowUpCard({
  question,
  onAnswer,
  compact = false,
}: {
  question: FollowUpQuestion;
  onAnswer: (feature: keyof Observation, value: string) => void;
  compact?: boolean;
}) {
  const [textValue, setTextValue] = useState('');
  const widget = FIELD_WIDGETS[question.feature];

  const handleSubmitText = () => {
    if (textValue.trim()) {
      onAnswer(question.feature as keyof Observation, textValue.trim());
      setTextValue('');
    }
  };

  return (
    <div className={`${compact ? 'py-1' : 'bg-white rounded-lg border border-teal-100 p-3'} space-y-1.5`}>
      <div className="flex items-start gap-2">
        {question.safety_relevant && (
          <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 mt-0.5">
            safety
          </span>
        )}
        <p className={`text-sm ${compact ? 'text-teal-700' : 'font-medium text-teal-900'}`}>
          {question.question}
        </p>
      </div>
      <p className="text-xs text-teal-600">{question.impact_note}</p>

      {/* Inline answer widget */}
      {widget && (
        <div className="pt-1">
          {widget.type === 'boolean' && (
            <div className="flex gap-2">
              <button
                onClick={() => onAnswer(question.feature as keyof Observation, 'true')}
                className="px-3 py-1.5 text-sm rounded-md bg-teal-100 text-teal-800 hover:bg-teal-200 active:bg-teal-300"
              >
                Yes
              </button>
              <button
                onClick={() => onAnswer(question.feature as keyof Observation, 'false')}
                className="px-3 py-1.5 text-sm rounded-md bg-teal-100 text-teal-800 hover:bg-teal-200 active:bg-teal-300"
              >
                No
              </button>
            </div>
          )}
          {widget.type === 'select' && widget.options && (
            <select
              className="w-full rounded-md border border-teal-200 px-2 py-1.5 text-sm bg-white"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) onAnswer(question.feature as keyof Observation, e.target.value);
              }}
            >
              <option value="" disabled>Choose...</option>
              {widget.options.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {(widget.type === 'text' || widget.type === 'number') && (
            <div className="flex gap-2">
              <input
                type={widget.type === 'number' ? 'number' : 'text'}
                placeholder="Type answer..."
                className="flex-1 rounded-md border border-teal-200 px-2 py-1.5 text-sm"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitText(); }}
              />
              <button
                onClick={handleSubmitText}
                disabled={!textValue.trim()}
                className="px-3 py-1.5 text-sm rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
              >
                Set
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
