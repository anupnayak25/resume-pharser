import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function scoreBadgeClass(score) {
  const pct = Math.round(score * 100);
  if (pct >= 70) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  if (pct >= 45) return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  return 'border-red-400/30 bg-red-400/10 text-red-200';
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const PER_PAGE = 50;
  const navigate = useNavigate();

  const load = async (p = 0, selectedJobId = jobId) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.history(PER_PAGE, p * PER_PAGE, selectedJobId);
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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError('');
      try {
        const jobRuns = await api.jobs(50, 0);
        setJobs(jobRuns);
        const firstJobId = jobRuns?.length ? jobRuns[0].id : null;
        setJobId(firstJobId);
        const data = await api.history(PER_PAGE, 0, firstJobId);
        setItems(data);
        setPage(0);
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
    init();
  }, []);

  const selectedJob = jobs.find((j) => j.id === jobId) || null;

  const avgScore = selectedJob?.avg_score != null
    ? Math.round(selectedJob.avg_score * 100)
    : (items.length ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length * 100) : null);

  const topScore = selectedJob?.best_score != null
    ? Math.round(selectedJob.best_score * 100)
    : (items.length ? Math.round(Math.max(...items.map((i) => i.score)) * 100) : null);

  const card = 'rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl';
  const label = 'text-xs font-medium uppercase tracking-wider text-slate-400';
  const button = 'inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50';
  const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 pb-16">
        {/* Header */}
        <div className="py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🕒</span>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">History</h1>
                <p className="mt-1 text-sm text-slate-400">History for a specific job description.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                className={input + ' min-w-[240px]'}
                value={jobId ?? ''}
                onChange={(e) => {
                  const next = e.target.value ? Number(e.target.value) : null;
                  setJobId(next);
                  if (next != null) load(0, next);
                  else setItems([]);
                }}
                disabled={loading || jobs.length === 0}
                aria-label="Select job description"
              >
                {jobs.length === 0 ? (
                  <option value="">No job descriptions yet</option>
                ) : (
                  jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {(j.job_name && j.job_name.trim()) ? j.job_name : `JD ${j.jd_hash.slice(0, 8)}`} ({j.total_scans})
                    </option>
                  ))
                )}
              </select>

              <button
                id="refresh-history-btn"
                className={button}
                onClick={() => load(page)}
                disabled={loading}
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  '↻ Refresh'
                )}
              </button>
            </div>
          </div>
        </div>

      {/* Summary stats */}
        {(selectedJob || items.length > 0) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={card}>
              <div className={label}>Total Scans</div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight">
                {selectedJob ? selectedJob.total_scans : items.length}
              </div>
            </div>
            <div className={card}>
              <div className={label}>Avg Score</div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-violet-200">
                {avgScore != null ? `${avgScore}%` : '—'}
              </div>
            </div>
            <div className={card}>
              <div className={label}>Best Score</div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-emerald-200">
                {topScore != null ? `${topScore}%` : '—'}
              </div>
            </div>
            <div className={card}>
              <div className={label}>Job</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {selectedJob
                  ? ((selectedJob.job_name && selectedJob.job_name.trim()) ? selectedJob.job_name : selectedJob.jd_hash.slice(0, 8))
                  : 'All (legacy)'}
              </div>
            </div>
          </div>
        )}

      {/* Error state */}
        {error && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
            {error}
          </div>
        )}

      {/* Loading skeleton */}
        {loading && (
          <div className="mt-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
        )}

      {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-10 text-center shadow-xl backdrop-blur-xl">
            <div className="text-4xl">📭</div>
            <div className="mt-3 text-base font-semibold">No history for this job description</div>
            <div className="mt-2 text-sm text-slate-400">
              Go to{' '}
              <button
                className="font-semibold text-violet-300 hover:text-violet-200"
                onClick={() => navigate('/')}
                type="button"
              >
                Upload
              </button>
              {' '}to score resumes.
            </div>
          </div>
        )}

      {/* Table */}
        {!loading && items.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">File</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Job</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Similarity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Skills</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Yrs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const pct = Math.round(item.score * 100);
                  return (
                    <tr key={item.id} className="border-t border-white/10">
                      <td className="px-4 py-3 text-xs text-slate-500">{page * PER_PAGE + i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[220px] items-center gap-2">
                          <span>📄</span>
                          <span className="truncate text-sm font-medium text-slate-200" title={item.filename}>{item.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{item.job_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={['inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', scoreBadgeClass(item.score)].join(' ')}>
                          {pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{item.similarity != null ? `${Math.round(item.similarity * 100)}%` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{item.skill_score != null ? `${Math.round(item.skill_score * 100)}%` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{item.experience_score != null ? `${Math.round(item.experience_score * 100)}%` : '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-violet-200">{item.extracted_years != null ? item.extracted_years.toFixed(1) : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{fmt(item.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Pagination */}
        {!loading && items.length === PER_PAGE && (
          <div className="mt-6 flex justify-center gap-2">
            {page > 0 && (
              <button className={button} id="prev-page-btn" onClick={() => load(page - 1)}>
                ← Previous
              </button>
            )}
            <button className={button} id="next-page-btn" onClick={() => load(page + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
