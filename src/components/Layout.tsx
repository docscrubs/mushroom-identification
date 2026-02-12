import { Outlet, Link, useLocation } from 'react-router-dom';

function NavLink({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`text-xs px-2 py-1 rounded ${
        isActive
          ? 'text-green-800 font-semibold'
          : 'text-stone-500 active:text-stone-700'
      }`}
    >
      {label}
    </Link>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="mx-auto max-w-lg px-4 pt-3 flex items-center justify-between">
        <Link to="/" className="text-sm font-bold text-green-900">MID</Link>
        <div className="flex gap-1">
          <NavLink to="/chat" label="Identify" />
          <NavLink to="/learn" label="Learn" />
          <NavLink to="/contribute" label="Notes" />
          <NavLink to="/settings" label="Settings" />
        </div>
      </nav>
      <main className="mx-auto max-w-lg px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
