import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function LoginPage() {
  const [tab, setTab] = useState('login');   // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      if (tab === 'login') {
        const data = await api.login(email, password);
        localStorage.setItem('token', data.access_token);
        navigate('/');
      } else {
        await api.signup(email, password);
        setSuccess('Account created! Logging you in…');
        const data = await api.login(email, password);
        localStorage.setItem('token', data.access_token);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 [background-image:radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.35)_0%,rgba(0,0,0,0)_70%)] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
        <div className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
          ⚡ ResumeRank
        </div>
        <div className="mt-1 text-sm text-slate-400">
          {tab === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your free account.'}
        </div>

        <div className="mt-8 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            id="tab-login"
            type="button"
            className={
              [
                'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
                tab === 'login'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-100',
              ].join(' ')
            }
            onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
          >
            Sign In
          </button>
          <button
            id="tab-signup"
            type="button"
            className={
              [
                'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
                tab === 'signup'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-100',
              ].join(' ')
            }
            onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              type="password"
              placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200">
              {success}
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:shadow-indigo-500/30 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            ) : (
              <>{tab === 'login' ? 'Sign In →' : 'Create Account →'}</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {tab === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            className="font-semibold text-violet-300 hover:text-violet-200"
            onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
          >
            {tab === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
