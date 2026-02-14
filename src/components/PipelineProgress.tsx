import type { PipelineStage } from '@/types/pipeline';

const STAGES: { key: PipelineStage; label: string; defaultStatus: string }[] = [
  { key: 'candidates', label: 'Candidates', defaultStatus: 'Generating candidates...' },
  { key: 'lookup', label: 'Lookup', defaultStatus: 'Looking up species...' },
  { key: 'verification', label: 'Verification', defaultStatus: 'Verifying against dataset...' },
];

interface PipelineProgressProps {
  stage: PipelineStage;
  statusText?: string;
}

export function PipelineProgress({ stage, statusText }: PipelineProgressProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage);
  const currentStage = STAGES[currentIndex]!;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;

          return (
            <div key={s.key} className="flex items-center gap-1">
              <div
                data-stage={s.key}
                data-active={String(isActive)}
                data-completed={String(isCompleted)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  isActive
                    ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                    : isCompleted
                      ? 'bg-green-600 text-white'
                      : 'bg-stone-100 text-stone-400'
                }`}
              >
                {isCompleted && (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {s.label}
              </div>
              {i < STAGES.length - 1 && (
                <div className={`w-3 h-px ${i < currentIndex ? 'bg-green-400' : 'bg-stone-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Status text */}
      <p className="text-[10px] text-stone-500">
        {statusText ?? currentStage.defaultStatus}
      </p>
    </div>
  );
}
