import { Link } from 'react-router-dom';

export function LearnPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-amber-900">Learn</h1>

      <div className="rounded-lg bg-white border border-stone-200 p-6 space-y-4">
        <p className="text-stone-600">
          Training modules and spaced repetition reviews will appear here.
        </p>
        <p className="text-stone-400 text-sm italic">
          Coming in Phase 5 (Adaptive Learning).
        </p>
      </div>

      <Link
        to="/"
        className="inline-block text-green-700 text-sm hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
