import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function DashboardPage() {
  const [files, setFiles] = useState([]);
  const [jdText, setJdText] = useState('');
  const [jobName, setJobName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();
  const navigate = useNavigate();

  const addFiles = (incoming) => {
    const accepted = [...incoming].filter(
      (f) => !files.find((x) => x.name === f.name && x.size === f.size)
    );
    setFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (idx) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!files.length) { setError('Please upload at least one resume.'); return; }
    if (!jdText.trim()) { setError('Please paste a job description.'); return; }
    setLoading(true);
    try {
      const data = await api.checkScore(files, jdText, jobName || undefined);
      // Store in sessionStorage so ResultPage can read it
      sessionStorage.setItem('scoreResult', JSON.stringify(data));
      navigate('/results');
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pct = (v) => (v != null ? `${Math.round(v * 100)}%` : '—');

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2rem' }}>🎯</span>
          <div>
            <h1 className="page-title">Score Resumes</h1>
            <p className="page-sub">Upload resumes & a job description — get AI-powered match scores instantly.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Drop Zone */}
          <div className="fade-up fade-up-d1">
            <div className="input-label" style={{ marginBottom: 10 }}>Resumes (PDF / DOCX / TXT)</div>
            <div
              id="drop-zone"
              className={'drop-zone' + (dragging ? ' dragging' : '')}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
                onChange={(e) => addFiles(e.target.files)}
              />
              <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>📂</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {dragging ? 'Drop files here' : 'Click or drag & drop resumes'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Supports PDF, DOCX, TXT · Max 1000 files
              </div>
            </div>

            {/* File chips */}
            {files.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {files.map((f, i) => (
                  <div key={i} className="file-chip">
                    <span>📄</span>
                    <span title={f.name}>{f.name}</span>
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      aria-label="Remove file"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job Description */}
          <div className="flex col gap fade-up fade-up-d2">
            <div className="input-wrap">
              <label className="input-label" htmlFor="job-name">Job / Role Name (optional)</label>
              <input
                id="job-name"
                className="input"
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
              />
            </div>

            <div className="input-wrap" style={{ flex: 1 }}>
              <label className="input-label" htmlFor="jd-text">Job Description *</label>
              <textarea
                id="jd-text"
                className="input"
                placeholder="Paste the full job description here…"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                style={{ minHeight: 220, resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>
        )}

        {/* Stats row */}
        {files.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }} className="fade-up fade-up-d3">
            <div className="card stat-card" style={{ flex: '1 1 140px' }}>
              <div className="stat-label">Resumes</div>
              <div className="stat-value">{files.length}</div>
            </div>
            <div className="card stat-card" style={{ flex: '1 1 140px' }}>
              <div className="stat-label">JD Words</div>
              <div className="stat-value">{jdText.trim().split(/\s+/).filter(Boolean).length}</div>
            </div>
          </div>
        )}

        <div className="fade-up fade-up-d4">
          <button
            id="submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ padding: '14px 36px', fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Analysing Resumes…
              </>
            ) : (
              <>🚀 Analyse Resumes</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
