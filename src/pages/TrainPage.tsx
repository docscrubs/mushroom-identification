import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { seedGenera } from '@/data/seed-genera';
import { generateTrainingModules } from '@/learning/training-modules';
import type { TrainingModule, TrainingContent } from '@/types/learning';

export function TrainPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGenus = searchParams.get('genus');

  // Generate all modules
  const allModules = useMemo(() => {
    const modules: TrainingModule[] = [];
    for (const profile of seedGenera) {
      modules.push(...generateTrainingModules(profile));
    }
    return modules;
  }, []);

  const filteredModules = selectedGenus
    ? allModules.filter((m) => m.genus === selectedGenus)
    : [];

  if (selectedGenus && filteredModules.length > 0) {
    return (
      <ModuleViewer
        modules={filteredModules}
        genus={selectedGenus}
        onBack={() => setSearchParams({})}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-900">Training</h1>
        <Link to="/learn" className="text-amber-700 text-sm hover:underline">
          Back to Learn
        </Link>
      </div>

      <p className="text-sm text-stone-500">
        Select a genus to learn about its identification features, lookalikes, and field techniques.
      </p>

      <div className="space-y-2">
        {seedGenera.map((profile) => {
          const moduleCount = allModules.filter((m) => m.genus === profile.genus).length;
          return (
            <button
              key={profile.genus}
              onClick={() => setSearchParams({ genus: profile.genus })}
              className="w-full rounded-lg bg-white border border-stone-200 p-4 text-left active:bg-stone-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-stone-800">{profile.genus}</span>
                  <span className="text-sm text-stone-500 ml-2">
                    ({profile.common_names.join(', ')})
                  </span>
                </div>
                <span className="text-xs text-stone-400">
                  {moduleCount} module{moduleCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                {profile.identification_narrative ?? profile.notes}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModuleViewer({
  modules,
  genus,
  onBack,
}: {
  modules: TrainingModule[];
  genus: string;
  onBack: () => void;
}) {
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const activeModule = modules[activeModuleIndex]!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-amber-900">{genus}</h1>
        <button
          onClick={onBack}
          className="text-sm text-amber-700 hover:underline"
        >
          All genera
        </button>
      </div>

      {/* Module tabs */}
      {modules.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {modules.map((mod, i) => (
            <button
              key={mod.module_id}
              onClick={() => setActiveModuleIndex(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                i === activeModuleIndex
                  ? 'bg-amber-700 text-white'
                  : 'bg-stone-100 text-stone-600 active:bg-stone-200'
              }`}
            >
              {mod.title.replace(`${genus} `, '').replace(`${genus}`, 'Overview')}
            </button>
          ))}
        </div>
      )}

      {/* Module content */}
      <div className="rounded-lg bg-white border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
          <h2 className="font-semibold text-stone-800">{activeModule.title}</h2>
          <p className="text-xs text-stone-500 mt-0.5">{activeModule.description}</p>
        </div>

        <div className="p-4 space-y-4">
          {activeModule.content.map((item, i) => (
            <ContentBlock key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentBlock({ item }: { item: TrainingContent }) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  if (item.type === 'text') {
    return (
      <div className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
        {item.content}
      </div>
    );
  }

  if (item.type === 'image' && item.image_ref) {
    return (
      <img
        src={item.image_ref}
        alt={item.content}
        className="rounded-lg border border-stone-200 max-w-full"
      />
    );
  }

  if (item.type === 'quiz' && item.quiz_options) {
    const isCorrect = selectedAnswer === item.quiz_correct_index;
    const isAnswered = selectedAnswer !== null;

    return (
      <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 space-y-3">
        <p className="font-medium text-violet-900 text-sm">{item.content}</p>
        <div className="space-y-2">
          {item.quiz_options.map((option, i) => {
            let optionClass = 'bg-white border-stone-200 text-stone-700 active:bg-stone-50';
            if (isAnswered) {
              if (i === item.quiz_correct_index) {
                optionClass = 'bg-green-100 border-green-300 text-green-800';
              } else if (i === selectedAnswer) {
                optionClass = 'bg-red-100 border-red-300 text-red-800';
              } else {
                optionClass = 'bg-stone-50 border-stone-200 text-stone-400';
              }
            }
            return (
              <button
                key={i}
                onClick={() => !isAnswered && setSelectedAnswer(i)}
                disabled={isAnswered}
                className={`w-full rounded-lg border p-2.5 text-left text-sm ${optionClass}`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {isAnswered && (
          <p className={`text-sm font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? 'Correct!' : 'Not quite. The correct answer is highlighted in green.'}
          </p>
        )}
      </div>
    );
  }

  return null;
}
