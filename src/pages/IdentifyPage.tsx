import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Observation, IdentificationResult } from '@/types';
import { assembleResult } from '@/engine/result-assembler';
import { featureRules } from '@/engine/feature-rules';
import { ALL_GENERA } from '@/engine/genera';
import { getGenusEdibility } from '@/engine/edibility';
import { generateOfflineExplanation } from '@/engine/explanation-templates';

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateObs(field: keyof Observation, raw: string) {
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
  }

  function handleIdentify() {
    const r = assembleResult(observation, ALL_GENERA, featureRules);
    setResult(r);
  }

  function handleReset() {
    setObservation({});
    setResult(null);
    setPhotoFile(null);
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

        <Field label="Photo (optional)">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-green-700 file:px-3 file:py-2 file:text-sm file:text-white"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPhotoFile(file);
                updateObs('photo_available', 'true');
              }
            }}
          />
          {photoFile && (
            <p className="text-xs text-green-700 mt-1">Photo attached: {photoFile.name}</p>
          )}
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

        <Field label="Smell">
          <input
            type="text"
            placeholder="e.g. mushroomy, anise, apricot, earthy..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            value={observation.smell ?? ''}
            onChange={(e) => updateObs('smell', e.target.value)}
          />
        </Field>

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
      {result && <ResultView result={result} observation={observation} />}
    </div>
  );
}

function ResultView({ result, observation }: { result: IdentificationResult; observation: Observation }) {
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
