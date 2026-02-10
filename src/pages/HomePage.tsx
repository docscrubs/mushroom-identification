import { Link } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { BackupReminder } from '@/components/BackupReminder';

export function HomePage() {
  const isOnline = useAppStore((s) => s.isOnline);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-900">Mushroom ID</h1>
        <p className="text-green-700">
          UK Foraging Guide &amp; Training System
        </p>
        <p className="text-sm text-amber-700">
          {isOnline ? 'Online' : 'Offline'} mode
        </p>
      </div>

      <BackupReminder />

      <div className="grid gap-4">
        <Link
          to="/identify"
          className="block rounded-xl bg-green-700 p-6 text-white text-center shadow-md active:bg-green-800"
        >
          <div className="text-2xl mb-1">Identify</div>
          <div className="text-green-200 text-sm">
            Start an identification session
          </div>
        </Link>

        <Link
          to="/learn"
          className="block rounded-xl bg-amber-700 p-6 text-white text-center shadow-md active:bg-amber-800"
        >
          <div className="text-2xl mb-1">Learn</div>
          <div className="text-amber-200 text-sm">
            Training &amp; spaced repetition
          </div>
        </Link>

        <Link
          to="/settings"
          className="block rounded-xl bg-stone-200 p-6 text-stone-800 text-center shadow-md active:bg-stone-300"
        >
          <div className="text-lg mb-1">Settings</div>
          <div className="text-stone-500 text-sm">
            Backup, preferences &amp; data
          </div>
        </Link>
      </div>

      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
        <strong>Safety disclaimer:</strong> Never eat any mushroom based solely
        on this app's identification. Always cross-reference with multiple
        sources and consult an experienced forager. When in doubt, leave it out.
      </div>
    </div>
  );
}
