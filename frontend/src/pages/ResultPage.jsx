import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function scoreBadge(score) {
  const pct = Math.round(score * 100);
  if (pct >= 70) return 'badge-green';
  if (pct >= 45) return 'badge-yellow';
  return 'badge-red';
}

function ScoreBar({ label, value }) {
  const pct = value != null ? Math.round(value * 100) : null;
  const color = pct == null ? 'var(--muted)' : pct >= 70 ? 'var(--green)' : pct >= 45 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="score-row">
        <span className="score-key">{label}</span>
        <span className="score-val" style={{ color }}>{pct != null ? `${pct}%` : '—'}</span>
      </div>
      {pct != null && (
        <div className="progress-track" style={{ marginTop: 4 }}>
          <div
            className="progress-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

function ResultCard({ item, rank }) {
  const overallPct = Math.round(item.score * 100);
  const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
  const rankIcon = ['🥇', '🥈', '🥉'][rank] ?? `#${rank + 1}`;

  return (
    <div className="card result-card fade-up" style={{ animationDelay: `${rank * 0.07}s` }}>
      <div className="result-rank">
        <span style={{ color: rankColors[rank] ?? 'var(--muted)', fontSize: '1rem' }}>{rankIcon}</span>
        {' '}Rank {rank + 1}
      </div>
      <div className="result-filename">📄 {item.filename}</div>

      {/* Big score */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 18 }}>
        <div className="big-score">{overallPct}%</div>
        <span className={'badge ' + scoreBadge(item.score)} style={{ marginBottom: 6 }}>
          {overallPct >= 70 ? 'Strong Match' : overallPct >= 45 ? 'Potential' : 'Weak Fit'}
        </span>
      </div>

      <ScoreBar label="Overall Score" value={item.score} />
      <ScoreBar label="Semantic Similarity" value={item.similarity} />
      <ScoreBar label="Skill Match" value={item.skill_score} />
      <ScoreBar label="Experience Match" value={item.experience_score} />

      {item.extracted_years != null && (
        <div className="score-row" style={{ marginTop: 4 }}>
          <span className="score-key">Experience (yrs)</span>
          <span className="score-val" style={{ color: 'var(--accent2)' }}>{item.extracted_years.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('scoreResult');
    if (!raw) { navigate('/'); return; }
    try { setData(JSON.parse(raw)); } catch { navigate('/'); }
  }, [navigate]);

  if (!data) return null;

  const best = data.results[0];

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>📊</span>
            <div>
              <h1 className="page-title">
                Results {data.job_name ? `— ${data.job_name}` : ''}
              </h1>
              <p className="page-sub">
                {data.results.length} resume{data.results.length !== 1 ? 's' : ''} analysed
                {data.errors.length > 0 && `, ${data.errors.length} error${data.errors.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            id="new-analysis-btn"
            className="btn btn-ghost"
            onClick={() => { sessionStorage.removeItem('scoreResult'); navigate('/'); }}
          >
            ← New Analysis
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {best && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 32 }} className="fade-up fade-up-d1">
          <div className="card stat-card" style={{ flex: '1 1 160px' }}>
            <div className="stat-label">Top Candidate</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 4, color: 'var(--text)', wordBreak: 'break-all' }}>
              🥇 {best.filename}
            </div>
          </div>
          <div className="card stat-card" style={{ flex: '1 1 130px' }}>
            <div className="stat-label">Best Score</div>
            <div className="stat-value" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {Math.round(best.score * 100)}%
            </div>
          </div>
          <div className="card stat-card" style={{ flex: '1 1 130px' }}>
            <div className="stat-label">Analysed</div>
            <div className="stat-value">{data.results.length}</div>
          </div>
          {data.errors.length > 0 && (
            <div className="card stat-card" style={{ flex: '1 1 130px' }}>
              <div className="stat-label">Errors</div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>{data.errors.length}</div>
            </div>
          )}
        </div>
      )}

      {/* Result cards grid */}
      <div className="result-grid">
        {data.results.map((item, i) => (
          <ResultCard key={item.filename + i} item={item} rank={i} />
        ))}
      </div>

      {/* Errors */}
      {data.errors.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, color: 'var(--red)' }}>
            ⚠️ Processing Errors
          </h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>File</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {data.errors.map((e, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--muted)' }}>📄 {e.filename}</td>
                    <td style={{ color: 'var(--red)' }}>{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
