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
    <div className="auth-page">
      <div className="card auth-card fade-up">
        {/* Brand */}
        <div className="auth-logo">⚡ ResumeRank</div>
        <div className="auth-sub">
          {tab === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your free account.'}
        </div>

        {/* Tab row */}
        <div className="tab-row">
          <button
            id="tab-login"
            className={'tab-btn' + (tab === 'login' ? ' active' : '')}
            onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
          >
            Sign In
          </button>
          <button
            id="tab-signup"
            className={'tab-btn' + (tab === 'signup' ? ' active' : '')}
            onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex col gap">
          <div className="input-wrap">
            <label className="input-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="input-wrap">
            <label className="input-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="input"
              type="password"
              placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary btn-full mt"
            disabled={loading}
            style={{ padding: '13px' }}
          >
            {loading
              ? <span className="spinner" />
              : tab === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <div className="auth-divider mt" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          {tab === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            className="nav-link"
            style={{ display: 'inline', padding: '0 4px', color: 'var(--accent2)' }}
            onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
          >
            {tab === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
