import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'mushroom-id-onboarding-complete';

export function OnboardingOverlay() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setShow(true);
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  const steps = [
    {
      title: 'Welcome to Mushroom ID',
      body: 'An adaptive identification and training system for UK mushroom foraging. This app combines a deterministic rule engine with optional AI-assisted analysis.',
    },
    {
      title: 'Safety First',
      body: 'This app is a learning tool, NOT a definitive identification guide. Never eat any wild mushroom based solely on this app. Always cross-reference with authoritative field guides and consult experienced foragers. When in doubt, leave it out.',
    },
    {
      title: 'Offline-First',
      body: 'Core identification works fully offline using the built-in knowledge base and rule engine. AI features require an internet connection and API key (optional, configured in Settings).',
    },
    {
      title: 'How It Works',
      body: 'Identify: Enter observations to get genus candidates with confidence levels and safety warnings.\n\nLearn: Build knowledge through spaced repetition flashcards and training modules.\n\nMy Notes: Record personal observations and back up your data.',
    },
  ];

  const current = steps[step]!;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        <h2 className="text-xl font-bold text-amber-900">{current.title}</h2>
        <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">{current.body}</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === step ? 'bg-amber-700' : 'bg-stone-200'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-lg bg-stone-200 px-4 py-2.5 text-sm text-stone-700 font-medium"
            >
              Back
            </button>
          )}
          {isLast ? (
            <button
              onClick={handleComplete}
              className="flex-1 rounded-lg bg-amber-700 px-4 py-2.5 text-sm text-white font-medium"
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 rounded-lg bg-amber-700 px-4 py-2.5 text-sm text-white font-medium"
            >
              Next
            </button>
          )}
        </div>

        <button
          onClick={handleComplete}
          className="w-full text-xs text-stone-400 hover:text-stone-600"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
