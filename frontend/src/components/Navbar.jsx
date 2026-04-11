import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <NavLink
          to="/"
          className="text-lg font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400"
        >
          ⚡ ResumeRank
        </NavLink>

        <div className="flex items-center gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              [
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-white/10 text-slate-100'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
              ].join(' ')
            }
          >
            Upload
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              [
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-white/10 text-slate-100'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
              ].join(' ')
            }
          >
            History
          </NavLink>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
            onClick={handleLogout}
            disabled={loggingOut}
            id="logout-btn"
          >
            {loggingOut ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              'Logout'
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
