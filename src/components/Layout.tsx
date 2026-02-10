import { Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-stone-50">
      <main className="mx-auto max-w-lg px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
