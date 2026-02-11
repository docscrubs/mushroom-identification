import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/db/database';
import type { UserContribution, ContributionType } from '@/types/user';
import {
  addContribution,
  getContributions,
  deleteContribution,
} from '@/contributions/contribution-store';
import { exportUserData, importUserData, type ExportedData } from '@/contributions/data-export';

type ViewMode = 'list' | 'add_note' | 'add_exception' | 'export';

const TYPE_LABELS: Record<ContributionType, string> = {
  personal_note: 'Note',
  regional_override: 'Regional',
  exception_report: 'Exception',
  draft_heuristic: 'Draft',
};

export function ContributePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [contributions, setContributions] = useState<UserContribution[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContributions = useCallback(async () => {
    setLoading(true);
    try {
      setContributions(await getContributions(db));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  const handleDelete = async (id: string) => {
    await deleteContribution(db, id);
    loadContributions();
  };

  if (viewMode === 'add_note') {
    return (
      <AddNoteForm
        onSave={async (contrib) => {
          await addContribution(db, contrib);
          setViewMode('list');
          loadContributions();
        }}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  if (viewMode === 'add_exception') {
    return (
      <AddExceptionForm
        onSave={async (contrib) => {
          await addContribution(db, contrib);
          setViewMode('list');
          loadContributions();
        }}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  if (viewMode === 'export') {
    return <ExportImportView onBack={() => { setViewMode('list'); loadContributions(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-900">My Notes</h1>
        <Link to="/" className="text-amber-700 text-sm hover:underline">Home</Link>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('add_note')}
          className="flex-1 rounded-lg bg-amber-700 px-3 py-2.5 text-sm text-white font-medium active:bg-amber-800"
        >
          Add Note
        </button>
        <button
          onClick={() => setViewMode('add_exception')}
          className="flex-1 rounded-lg bg-stone-200 px-3 py-2.5 text-sm text-stone-700 font-medium active:bg-stone-300"
        >
          Report Exception
        </button>
        <button
          onClick={() => setViewMode('export')}
          className="rounded-lg bg-stone-200 px-3 py-2.5 text-sm text-stone-700 font-medium active:bg-stone-300"
        >
          Backup
        </button>
      </div>

      {loading ? (
        <p className="text-stone-500 text-sm">Loading...</p>
      ) : contributions.length === 0 ? (
        <p className="text-stone-500 text-sm">
          No contributions yet. Add personal notes about heuristics, report exceptions you&apos;ve observed, or back up your data.
        </p>
      ) : (
        <div className="space-y-2">
          {contributions.map((c) => (
            <div
              key={c.id}
              className="rounded-lg bg-white border border-stone-200 p-3 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {TYPE_LABELS[c.type]}
                </span>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-stone-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
              {c.heuristic_id && (
                <p className="text-xs text-stone-500">{c.heuristic_id.replace(/_/g, ' ')}</p>
              )}
              <p className="text-sm text-stone-700">{c.content}</p>
              {c.location && (
                <p className="text-xs text-stone-400">
                  {c.location.region}{c.location.habitat ? ` / ${c.location.habitat}` : ''}
                </p>
              )}
              <p className="text-xs text-stone-400">
                {new Date(c.date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddNoteForm({
  onSave,
  onCancel,
}: {
  onSave: (contrib: UserContribution) => Promise<void>;
  onCancel: () => void;
}) {
  const [heuristicId, setHeuristicId] = useState('');
  const [content, setContent] = useState('');
  const [region, setRegion] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await onSave({
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'personal_note',
      heuristic_id: heuristicId || undefined,
      content: content.trim(),
      location: region ? { region } : undefined,
      date: new Date().toISOString(),
      status: 'draft',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-amber-900">Add Note</h2>
        <button onClick={onCancel} className="text-sm text-stone-500">Cancel</button>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">Heuristic (optional)</span>
        <input
          type="text"
          placeholder="e.g. russula_taste_test"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          value={heuristicId}
          onChange={(e) => setHeuristicId(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">Your observation</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm h-24 resize-none"
          placeholder="e.g. In Hampshire, R. cyanoxantha always grows under beech..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">Region (optional)</span>
        <input
          type="text"
          placeholder="e.g. Hampshire, Devon..."
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
      </label>

      <button
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="w-full rounded-lg bg-amber-700 px-4 py-3 text-white font-medium active:bg-amber-800 disabled:opacity-50"
      >
        Save Note
      </button>
    </div>
  );
}

function AddExceptionForm({
  onSave,
  onCancel,
}: {
  onSave: (contrib: UserContribution) => Promise<void>;
  onCancel: () => void;
}) {
  const [heuristicId, setHeuristicId] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await onSave({
      id: `exception-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'exception_report',
      heuristic_id: heuristicId || undefined,
      content: content.trim(),
      date: new Date().toISOString(),
      status: 'submitted',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-amber-900">Report Exception</h2>
        <button onClick={onCancel} className="text-sm text-stone-500">Cancel</button>
      </div>

      <p className="text-sm text-stone-500">
        Report when a heuristic didn&apos;t match what you observed in the field.
      </p>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">Heuristic</span>
        <input
          type="text"
          placeholder="e.g. russula_taste_test"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          value={heuristicId}
          onChange={(e) => setHeuristicId(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">What happened?</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm h-24 resize-none"
          placeholder="e.g. R. olivacea tasted mild but was definitely that species (confirmed by spore print)..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </label>

      <button
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="w-full rounded-lg bg-amber-700 px-4 py-3 text-white font-medium active:bg-amber-800 disabled:opacity-50"
      >
        Submit Report
      </button>
    </div>
  );
}

function ExportImportView({ onBack }: { onBack: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      const data = await exportUserData(db);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mushroom-id-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Data exported successfully.');
    } catch {
      setError('Export failed.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: ExportedData = JSON.parse(text);
      if (!data.version || !data.exported_at) {
        setError('Invalid backup file format.');
        return;
      }
      const summary = await importUserData(db, data);
      setMessage(
        `Imported: ${summary.competencies_imported} competencies, ` +
        `${summary.review_cards_imported} cards, ` +
        `${summary.contributions_imported} contributions, ` +
        `${summary.sessions_imported} sessions.`,
      );
    } catch {
      setError('Import failed. Make sure this is a valid backup file.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-amber-900">Backup & Restore</h2>
        <button onClick={onBack} className="text-sm text-stone-500">Back</button>
      </div>

      <p className="text-sm text-stone-500">
        Export your data as a JSON file for safekeeping. Import a previous backup to restore your progress.
      </p>

      <button
        onClick={handleExport}
        className="w-full rounded-lg bg-amber-700 px-4 py-3 text-white font-medium active:bg-amber-800"
      >
        Export Data
      </button>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">Import from backup</span>
        <input
          type="file"
          accept=".json"
          onChange={handleImport}
          className="mt-1 w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-200 file:px-3 file:py-2 file:text-sm file:text-stone-700"
        />
      </label>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}
    </div>
  );
}
