import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function scoreBadgeClass(score) {
  const pct = Math.round(score * 100);
  if (pct >= 70) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  if (pct >= 45) return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  return 'border-red-400/30 bg-red-400/10 text-red-200';
}

function ScoreBar({ label, value }) {
  const pct = value != null ? Math.round(value * 100) : null;
  const barClass = pct == null
    ? 'bg-white/10'
    : pct >= 70
      ? 'bg-emerald-400'
      : pct >= 45
        ? 'bg-amber-400'
        : 'bg-red-400';
  const textClass = pct == null
    ? 'text-slate-400'
    : pct >= 70
      ? 'text-emerald-200'
      : pct >= 45
        ? 'text-amber-200'
        : 'text-red-200';
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between border-b border-white/10 py-2 text-xs">
        <span className="text-slate-400">{label}</span>
        <span className={['font-semibold', textClass].join(' ')}>{pct != null ? `${pct}%` : '—'}</span>
      </div>
      {pct != null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={['h-full rounded-full transition-[width] duration-700', barClass].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ResultCard({ item, rank, isPoor, onViewResume }) {
  const overallPct = Math.round(item.score * 100);
  const rankIcon = ['🥇', '🥈', '🥉'][rank] ?? `#${rank + 1}`;
  const rankText = rank === 0 ? 'text-yellow-300' : rank === 1 ? 'text-slate-200' : rank === 2 ? 'text-amber-400' : 'text-slate-400';

  return (
    <div
      className={[
        'rounded-2xl border bg-white/5 p-6 shadow-xl backdrop-blur-xl',
        isPoor ? 'border-red-500/40 bg-red-500/10' : 'border-white/10',
      ].join(' ')}
    >
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
        <span className={['mr-2 text-base', rankText].join(' ')}>{rankIcon}</span>
        Rank {rank + 1}
      </div>
      {isPoor && (
        <div className="mt-2 inline-flex rounded-full border border-red-400/40 bg-red-500/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-200">
          Poor Match
        </div>
      )}
      <div className="mt-2 break-all text-sm font-semibold">📄 {item.candidate_name || item.filename}</div>

      <div className="mt-3">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400/40 hover:bg-indigo-500/20 disabled:opacity-50"
          disabled={item.history_id == null}
          onClick={() => onViewResume(item)}
        >
          View Resume
        </button>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div className="text-5xl font-extrabold leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
          {overallPct}%
        </div>
        <span
          className={
            [
              'mb-1 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
              scoreBadgeClass(item.score),
            ].join(' ')
          }
        >
          {overallPct >= 70 ? 'Strong Match' : overallPct >= 45 ? 'Potential' : 'Weak Fit'}
        </span>
      </div>

      <ScoreBar label="Overall Score" value={item.score} />
      <ScoreBar label="Semantic Similarity" value={item.similarity} />
      <ScoreBar label="Skill Match" value={item.skill_score} />
      <ScoreBar label="Experience Match" value={item.experience_score} />

      {item.extracted_years != null && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">Experience (yrs)</span>
          <span className="font-semibold text-violet-200">{item.extracted_years.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('scoreResult');
    if (!raw) { navigate('/'); return; }
    try { setData(JSON.parse(raw)); } catch { navigate('/'); }
  }, [navigate]);

  if (!data) return null;

  const minOverallScore = data?.quota?.min_overall_score ?? 0.45;
  const quotaPct = Math.round(minOverallScore * 100);
  const jdText = typeof data?.jd_text === 'string' ? data.jd_text.trim() : '';

  const resultsRaw = Array.isArray(data.results) ? data.results : [];
  const errors = Array.isArray(data.errors) ? data.errors : [];

  const normalizeItem = (item) => {
    if (!item) return item;
    const score = typeof item.score === 'number' ? item.score : 0;
    const status = item.status ?? (score >= minOverallScore ? 'accepted' : 'rejected');
    const rejection_reason =
      status === 'rejected'
        ? (item.rejection_reason ?? `Overall score ${Math.round(score * 100)}% is below the required quota of ${quotaPct}%`)
        : null;
    return { ...item, status, rejection_reason };
  };

  const all = resultsRaw.map(normalizeItem);
  const rankedResults = [...all].sort((a, b) => b.score - a.score);
  const accepted = rankedResults.filter((r) => r.status !== 'rejected');
  const rejected = rankedResults.filter((r) => r.status === 'rejected');

  const best = accepted[0] ?? rankedResults[0];

  const onViewResume = async (item) => {
    if (item.history_id == null) {
      setError('Resume preview is not available for this item.');
      return;
    }
    setError('');
    try {
      const blob = await api.viewResume(item.history_id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message || 'Failed to open resume.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  Results {data.job_name ? `— ${data.job_name}` : ''}
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  {resultsRaw.length} resume{resultsRaw.length !== 1 ? 's' : ''} analysed
                  {errors.length > 0 && `, ${errors.length} error${errors.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <button
              id="new-analysis-btn"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
              onClick={() => { sessionStorage.removeItem('scoreResult'); navigate('/'); }}
            >
              ← New Analysis
            </button>
          </div>
        </div>

      {jdText && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Job Description</div>
          <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm leading-6 text-slate-200">
            {jdText}
          </p>
        </div>
      )}

      {/* Summary strip */}
      {best && (
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Top Candidate</div>
            <div className="mt-2 break-all text-sm font-semibold">🥇 {best.candidate_name || best.filename}</div>
          </div>
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Best Score</div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              {Math.round(best.score * 100)}%
            </div>
          </div>
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Required Quota</div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight">≥ {quotaPct}%</div>
            <div className="mt-1 text-xs text-slate-400">Overall match score</div>
          </div>
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Analysed</div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight">{resultsRaw.length}</div>
          </div>
          {errors.length > 0 && (
            <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Errors</div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-red-300">{errors.length}</div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      {/* Result cards grid */}
      {rankedResults.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rankedResults.map((item, i) => (
            <ResultCard
              key={item.filename + i}
              item={item}
              rank={i}
              isPoor={item.status === 'rejected'}
              onViewResume={onViewResume}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300 shadow-xl backdrop-blur-xl">
          No resumes met the required quota of <span className="font-semibold text-slate-100">{quotaPct}%</span>.
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-bold text-red-300">⚠️ Processing Errors</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">File</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Reason</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="px-4 py-3 text-sm text-slate-300">📄 {e.filename}</td>
                    <td className="px-4 py-3 text-sm text-red-200">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
