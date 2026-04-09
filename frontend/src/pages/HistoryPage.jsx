import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function scoreBadgeClass(score) {
  const pct = Math.round(score * 100);
  if (pct >= 70) return 'badge-green';
  if (pct >= 45) return 'badge-yellow';
  return 'badge-red';
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const PER_PAGE = 50;
  const navigate = useNavigate();

  const load = async (p = 0) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.history(PER_PAGE, p * PER_PAGE);
      setItems(data);
      setPage(p);
    } catch (err) {
      if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.message || 'Failed to load history.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0); }, []);

  const avgScore = items.length
    ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length * 100)
    : null;

  const topScore = items.length
    ? Math.round(Math.max(...items.map((i) => i.score)) * 100)
    : null;

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>🕒</span>
            <div>
              <h1 className="page-title">History</h1>
              <p className="page-sub">Your past resume analyses, sorted by most recent.</p>
            </div>
          </div>
          <button
            id="refresh-history-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => load(page)}
            disabled={loading}
          >
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 32 }} className="fade-up fade-up-d1">
          <div className="card stat-card" style={{ flex: '1 1 130px' }}>
            <div className="stat-label">Total Scans</div>
            <div className="stat-value">{items.length}</div>
          </div>
          <div className="card stat-card" style={{ flex: '1 1 130px' }}>
            <div className="stat-label">Avg Score</div>
            <div className="stat-value" style={{ color: 'var(--accent2)' }}>{avgScore}%</div>
          </div>
          <div className="card stat-card" style={{ flex: '1 1 130px' }}>
            <div className="stat-label">Best Score</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{topScore}%</div>
          </div>
          <div className="card stat-card" style={{ flex: '1 1 130px' }}>
            <div className="stat-label">Unique Jobs</div>
            <div className="stat-value">
              {new Set(items.map((i) => i.job_name).filter(Boolean)).size}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ height: 56, opacity: 0.4 - i * 0.05, animation: 'fadeUp 0.4s ease both', animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="empty fade-up">
          <div className="empty-icon">📭</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No history yet</div>
          <div style={{ fontSize: '0.875rem' }}>
            Go to <button className="nav-link" style={{ display: 'inline', color: 'var(--accent2)' }} onClick={() => navigate('/')}>Upload</button> to score your first resume!
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && items.length > 0 && (
        <div className="table-wrap fade-up fade-up-d2">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>File</th>
                <th>Job</th>
                <th>Score</th>
                <th>Similarity</th>
                <th>Skills</th>
                <th>Experience</th>
                <th>Yrs</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const pct = Math.round(item.score * 100);
                return (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{page * PER_PAGE + i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📄</span>
                        <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={item.filename}>
                          {item.filename}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{item.job_name || '—'}</td>
                    <td>
                      <span className={'badge ' + scoreBadgeClass(item.score)}>
                        {pct}%
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)' }}>
                      {item.similarity != null ? `${Math.round(item.similarity * 100)}%` : '—'}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>
                      {item.skill_score != null ? `${Math.round(item.skill_score * 100)}%` : '—'}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>
                      {item.experience_score != null ? `${Math.round(item.experience_score * 100)}%` : '—'}
                    </td>
                    <td style={{ color: 'var(--accent2)' }}>
                      {item.extracted_years != null ? item.extracted_years.toFixed(1) : '—'}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {fmt(item.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && items.length === PER_PAGE && (
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
          {page > 0 && (
            <button className="btn btn-ghost btn-sm" id="prev-page-btn" onClick={() => load(page - 1)}>
              ← Previous
            </button>
          )}
          <button className="btn btn-ghost btn-sm" id="next-page-btn" onClick={() => load(page + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
