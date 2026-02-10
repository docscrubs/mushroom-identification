import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/db/database';
import { exportUserData, importUserData, createExportBlob } from '@/db/backup';
import { useAppStore } from '@/stores/app-store';

export function SettingsPage() {
  const lastBackupDate = useAppStore((s) => s.lastBackupDate);
  const sessionsSinceBackup = useAppStore((s) => s.sessionsSinceBackup);
  const recordBackup = useAppStore((s) => s.recordBackup);
  const [status, setStatus] = useState<string | null>(null);

  async function handleExport() {
    try {
      const json = await exportUserData(db);
      const blob = createExportBlob(json);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mushroom-id-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      recordBackup();
      setStatus('Backup exported successfully.');
    } catch {
      setStatus('Export failed. Please try again.');
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await importUserData(db, text);
        setStatus('Data restored successfully.');
      } catch {
        setStatus('Import failed. Is this a valid backup file?');
      }
    };
    input.click();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Settings</h1>

      <section className="rounded-lg bg-white border border-stone-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">
          Backup &amp; Restore
        </h2>
        <p className="text-sm text-stone-600">
          Export your competency data, session history, and personal notes.
          Core knowledge base data ships with the app and doesn't need backup.
        </p>

        {lastBackupDate && (
          <p className="text-sm text-stone-500">
            Last backup: {new Date(lastBackupDate).toLocaleDateString()}
          </p>
        )}
        {sessionsSinceBackup > 0 && (
          <p className="text-sm text-amber-600">
            {sessionsSinceBackup} session{sessionsSinceBackup !== 1 ? 's' : ''}{' '}
            since last backup
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white active:bg-green-800"
          >
            Export Data
          </button>
          <button
            onClick={handleImport}
            className="rounded-lg bg-stone-200 px-4 py-2 text-sm text-stone-700 active:bg-stone-300"
          >
            Import Data
          </button>
        </div>

        {status && (
          <p className="text-sm text-green-700">{status}</p>
        )}
      </section>

      <Link
        to="/"
        className="inline-block text-green-700 text-sm hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
