import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [files, setFiles] = useState([]);
  const [jdText, setJdText] = useState('');
  const [jobName, setJobName] = useState('');
  const [dragging, setDragging] = useState(false);
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

    const scanId =
      (globalThis.crypto && globalThis.crypto.randomUUID && globalThis.crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    navigate('/progress', {
      state: {
        scanId,
        files,
        jdText,
        jobName: jobName || undefined,
      },
    });
  };

  const card = 'rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl';
  const label = 'text-xs font-medium uppercase tracking-wider text-slate-400';
  const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="pt-10 pb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Score Resumes</h1>
              <p className="mt-1 text-sm text-slate-400">Upload resumes & a job description — get AI-powered match scores instantly.</p>
            </div>
          </div>
        </div>
 {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </div>
          )}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <div className={label}>Resumes (PDF / DOCX / TXT)</div>
              <div
                id="drop-zone"
                className={
                  [
                    'relative mt-3 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-12 text-center transition',
                    dragging
                      ? 'border-indigo-400 bg-indigo-500/5 shadow-[0_0_40px_rgba(99,102,241,0.18)]'
                      : 'border-white/15 hover:border-indigo-400 hover:bg-indigo-500/5',
                  ].join(' ')
                }
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
                  className="absolute inset-0 opacity-0"
                  onChange={(e) => addFiles(e.target.files)}
                />
                <div className="text-4xl">📂</div>
                <div className="mt-2 text-base font-semibold">
                  {dragging ? 'Drop files here' : 'Click or drag & drop resumes'}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Supports PDF, DOCX, TXT · Max 1000 files
                </div>
              </div>
               
            <div className="mt-5 flex flex-wrap gap-3">
              <div className={card + ' flex-1 p-5'}>
                <div className={label}>Resumes</div>
                <div className="mt-1 text-3xl font-extrabold tracking-tight">{files.length}</div>
              </div>
              <div className={card + ' flex-1 p-5'}>
                <div className={label}>JD Words</div>
                <div className="mt-1 text-3xl font-extrabold tracking-tight">
                  {jdText.trim().split(/\s+/).filter(Boolean).length}
                </div>
              </div>
            </div>
        

        
            </div>

            <div className="space-y-4">
              <div>
                <label className={label} htmlFor="job-name">Job / Role Name (optional)</label>
                <input
                  id="job-name"
                  className={input}
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                />
              </div>

              <div>
                <label className={label} htmlFor="jd-text">Job Description *</label>
                <textarea
                  id="jd-text"
                  className={input + ' min-h-[120px] resize-y'}
                  placeholder="Paste the full job description here…"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              </div>
               <div className="mt-6">
            <button
              id="submit-btn"
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:shadow-indigo-500/30 disabled:opacity-60"
            >
              <>🚀 Analyse Resumes</>
            </button>
          </div>
            </div>
          </div>
            {files.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="inline-flex max-w-[240px] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100"
                    >
                      <span>📄</span>
                      <span className="truncate" title={f.name}>{f.name}</span>
                      <button
                        type="button"
                        className="ml-1 text-slate-400 transition hover:text-red-300"
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}



        </form>
      </div>
    </div>
  );
}
