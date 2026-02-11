import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Rating, State } from 'ts-fsrs';
import { db } from '@/db/database';
import type { ReviewCard, ReviewSession } from '@/types/learning';
import type { CompetencyRecord } from '@/types/user';
import { getDueCards } from '@/learning/scheduler';
import {
  startReviewSession,
  submitReview,
  completeReviewSession,
  getDueCardCount,
  getReviewStats,
} from '@/learning/review-session';
import { getCompetencyLevel } from '@/learning/competency';
import {
  getCurrentSeasonMonth,
  getSeasonalRefreshPrompt,
  type SeasonalRefreshPrompt,
} from '@/learning/seasonal-refresh';
import { seedGenera } from '@/data/seed-genera';

type ViewMode = 'dashboard' | 'reviewing';

interface ReviewStatsData {
  total_reviews: number;
  total_correct: number;
  sessions_completed: number;
  accuracy: number;
}

export function LearnPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [dueCount, setDueCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [competencies, setCompetencies] = useState<CompetencyRecord[]>([]);
  const [stats, setStats] = useState<ReviewStatsData | null>(null);
  const [seasonalPrompt, setSeasonalPrompt] = useState<SeasonalRefreshPrompt | null>(null);

  // Review state
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [dueCards, setDueCards] = useState<ReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [due, total, comps, reviewStats] = await Promise.all([
        getDueCardCount(db),
        db.reviewCards.count(),
        db.competencies.toArray(),
        getReviewStats(db),
      ]);
      setDueCount(due);
      setTotalCards(total);
      setCompetencies(comps);
      setStats(reviewStats);

      // Seasonal refresh prompt
      const month = getCurrentSeasonMonth();
      setSeasonalPrompt(getSeasonalRefreshPrompt(seedGenera, month));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleStartReview = async () => {
    const allCards = await db.reviewCards.toArray();
    const due = getDueCards(allCards, 20);
    if (due.length === 0) return;

    const newSession = await startReviewSession(db, 20);
    setSession(newSession);
    setDueCards(due);
    setCurrentIndex(0);
    setShowAnswer(false);
    setViewMode('reviewing');
  };

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    if (!session || !dueCards[currentIndex]) return;

    await submitReview(db, session.session_id, dueCards[currentIndex].card_id, rating);

    if (currentIndex + 1 < dueCards.length) {
      setCurrentIndex((i) => i + 1);
      setShowAnswer(false);
    } else {
      await completeReviewSession(db, session.session_id);
      setViewMode('dashboard');
      setSession(null);
      loadDashboard();
    }
  };

  const handleEndReview = async () => {
    if (session) {
      await completeReviewSession(db, session.session_id);
    }
    setViewMode('dashboard');
    setSession(null);
    loadDashboard();
  };

  if (loading && viewMode === 'dashboard') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-amber-900">Learn</h1>
        <p className="text-stone-500">Loading...</p>
      </div>
    );
  }

  if (viewMode === 'reviewing') {
    return (
      <ReviewView
        card={dueCards[currentIndex]!}
        index={currentIndex}
        total={dueCards.length}
        showAnswer={showAnswer}
        onReveal={() => setShowAnswer(true)}
        onRate={handleRate}
        onEnd={handleEndReview}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-amber-900">Learn</h1>

      {/* Review prompt */}
      <div className="rounded-lg bg-white border border-stone-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">Spaced Repetition</h2>
          {dueCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-sm font-medium px-2.5 py-0.5 rounded">
              {dueCount} due
            </span>
          )}
        </div>

        {totalCards === 0 ? (
          <p className="text-stone-500 text-sm">
            No review cards yet. Cards are generated from genera in the knowledge base.
            Start an identification session to build your card deck.
          </p>
        ) : dueCount === 0 ? (
          <p className="text-green-700 text-sm">
            All caught up! No cards due for review. Check back later.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-stone-600 text-sm">
              {dueCount} card{dueCount !== 1 ? 's' : ''} ready for review.
              {totalCards > dueCount && ` (${totalCards} total in your deck)`}
            </p>
            <button
              onClick={handleStartReview}
              className="w-full rounded-lg bg-amber-700 px-4 py-3 text-white font-medium active:bg-amber-800"
            >
              Start Review ({Math.min(dueCount, 20)} cards)
            </button>
          </div>
        )}
      </div>

      {/* Seasonal prompt */}
      {seasonalPrompt && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-emerald-800">
            What&apos;s in Season
          </h3>
          <p className="text-sm text-emerald-700">{seasonalPrompt.message}</p>
          {seasonalPrompt.approaching.length > 0 && (
            <p className="text-xs text-emerald-600">
              Brush up on {seasonalPrompt.approaching.join(', ')} before they start fruiting.
            </p>
          )}
        </div>
      )}

      {/* Review Stats */}
      {stats && stats.total_reviews > 0 && (
        <div className="rounded-lg bg-white border border-stone-200 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Review Statistics</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-800">{stats.total_reviews}</div>
              <div className="text-xs text-stone-500">Total Reviews</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">
                {Math.round(stats.accuracy * 100)}%
              </div>
              <div className="text-xs text-stone-500">Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-700">{stats.sessions_completed}</div>
              <div className="text-xs text-stone-500">Sessions</div>
            </div>
          </div>
        </div>
      )}

      {/* Competency Dashboard */}
      {competencies.length > 0 && (
        <div className="rounded-lg bg-white border border-stone-200 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-stone-800">Your Competencies</h2>
          <div className="space-y-2">
            {competencies.map((comp) => (
              <CompetencyRow key={comp.skill_id} competency={comp} />
            ))}
          </div>
        </div>
      )}

      {/* Training modules link */}
      <Link
        to="/train"
        className="block rounded-lg bg-white border border-stone-200 p-4 active:bg-stone-50"
      >
        <h3 className="text-sm font-semibold text-amber-800">Genus Training</h3>
        <p className="text-xs text-stone-500 mt-1">
          Learn about identification features, lookalikes, and field techniques for all 20 genera.
        </p>
      </Link>

      {/* Card Deck Info */}
      {totalCards > 0 && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 p-4 space-y-2">
          <h3 className="text-sm font-medium text-stone-700">Card Deck</h3>
          <CardBreakdown />
        </div>
      )}

      <Link
        to="/"
        className="inline-block text-green-700 text-sm hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}

// --- Sub-components ---

function ReviewView(props: {
  card: ReviewCard;
  index: number;
  total: number;
  showAnswer: boolean;
  onReveal: () => void;
  onRate: (rating: 1 | 2 | 3 | 4) => void;
  onEnd: () => void;
}) {
  const { card, index, total, showAnswer, onReveal, onRate, onEnd } = props;

  const cardTypeLabel: Record<string, string> = {
    safety_recognition: 'Safety',
    feature_recognition: 'Feature',
    genus_recognition: 'Genus',
    discrimination_pair: 'Lookalike',
    heuristic_recall: 'Heuristic',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-amber-900">Review</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">
            {index + 1} / {total}
          </span>
          <button
            onClick={onEnd}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            End
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-600 transition-all duration-300"
          style={{ width: `${((index) / total) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div className="rounded-xl bg-white border border-stone-200 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            {cardTypeLabel[card.card_type] ?? card.card_type}
          </span>
          <span className="text-xs text-stone-400">{card.genus}</span>
        </div>

        {/* Question */}
        <div className="p-5 space-y-4">
          <p className="text-stone-800 text-lg leading-relaxed">{card.question}</p>

          {!showAnswer ? (
            <button
              onClick={onReveal}
              className="w-full rounded-lg bg-stone-100 border border-stone-200 px-4 py-3 text-stone-700 font-medium active:bg-stone-200"
            >
              Show Answer
            </button>
          ) : (
            <div className="space-y-4">
              {/* Answer */}
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="font-medium text-green-900">{card.answer}</p>
              </div>

              {/* Explanation */}
              <p className="text-sm text-stone-600 leading-relaxed">
                {card.explanation}
              </p>

              {/* Rating buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => onRate(Rating.Again)}
                  className="rounded-lg bg-red-100 border border-red-200 px-2 py-2.5 text-sm font-medium text-red-800 active:bg-red-200"
                >
                  Again
                </button>
                <button
                  onClick={() => onRate(Rating.Hard)}
                  className="rounded-lg bg-orange-100 border border-orange-200 px-2 py-2.5 text-sm font-medium text-orange-800 active:bg-orange-200"
                >
                  Hard
                </button>
                <button
                  onClick={() => onRate(Rating.Good)}
                  className="rounded-lg bg-green-100 border border-green-200 px-2 py-2.5 text-sm font-medium text-green-800 active:bg-green-200"
                >
                  Good
                </button>
                <button
                  onClick={() => onRate(Rating.Easy)}
                  className="rounded-lg bg-blue-100 border border-blue-200 px-2 py-2.5 text-sm font-medium text-blue-800 active:bg-blue-200"
                >
                  Easy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {card.difficulty_hint && (
        <p className="text-xs text-center text-stone-400">
          Difficulty: {card.difficulty_hint}
        </p>
      )}
    </div>
  );
}

function CompetencyRow({ competency }: { competency: CompetencyRecord }) {
  const level = getCompetencyLevel(competency.status);
  const maxLevel = 4;
  const percentage = (level / maxLevel) * 100;

  const statusColors: Record<string, string> = {
    not_started: 'bg-stone-200',
    aware: 'bg-yellow-400',
    aware_not_confident: 'bg-yellow-400',
    learning: 'bg-amber-500',
    confident: 'bg-green-500',
    expert: 'bg-emerald-600',
  };

  const statusLabels: Record<string, string> = {
    not_started: 'Not started',
    aware: 'Aware',
    aware_not_confident: 'Aware',
    learning: 'Learning',
    confident: 'Confident',
    expert: 'Expert',
  };

  const displayName = competency.skill_id.includes('.')
    ? competency.skill_id.split('.').pop()!
    : competency.skill_id;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-stone-700 w-24 truncate" title={competency.skill_id}>
        {displayName}
      </span>
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${statusColors[competency.status] ?? 'bg-stone-300'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-stone-500 w-16 text-right">
        {statusLabels[competency.status] ?? competency.status}
      </span>
    </div>
  );
}

function CardBreakdown() {
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const cards = await db.reviewCards.toArray();
      const counts: Record<string, number> = {};
      for (const card of cards) {
        const state = card.state === State.New ? 'New' :
          card.state === State.Learning ? 'Learning' :
          card.state === State.Review ? 'Review' :
          'Relearning';
        counts[state] = (counts[state] ?? 0) + 1;
      }
      setBreakdown(counts);
    })();
  }, []);

  const stateColors: Record<string, string> = {
    New: 'text-blue-600',
    Learning: 'text-amber-600',
    Review: 'text-green-600',
    Relearning: 'text-red-600',
  };

  return (
    <div className="flex gap-4 text-xs">
      {Object.entries(breakdown).map(([state, count]) => (
        <span key={state} className={stateColors[state] ?? 'text-stone-600'}>
          {state}: {count}
        </span>
      ))}
    </div>
  );
}
