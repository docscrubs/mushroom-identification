import { Link } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';

export function BackupReminder() {
  const isBackupNeeded = useAppStore((s) => s.isBackupNeeded);
  const dismissedAt = useAppStore((s) => s.backupReminderDismissedAt);
  const dismiss = useAppStore((s) => s.dismissBackupReminder);

  if (!isBackupNeeded() || dismissedAt) return null;

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">
          Back up your data
        </p>
        <p className="text-xs text-amber-600 mt-1">
          Your competency records and session history haven't been backed up recently.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          to="/settings"
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white font-medium active:bg-amber-700"
        >
          Back up now
        </Link>
        <button
          onClick={dismiss}
          className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs text-amber-700 font-medium active:bg-amber-200"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
