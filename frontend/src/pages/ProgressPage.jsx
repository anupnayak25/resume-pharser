import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';

function wsUrlForScanId(scanId) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const u = new URL(base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = `/ws/progress/${encodeURIComponent(scanId)}`;
  return u.toString();
}

export default function ProgressPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state;
  const scanId = state?.scanId;
  const files = state?.files;
  const jdText = state?.jdText;
  const jobName = state?.jobName;

  const [percent, setPercent] = useState(0);
  const [status, setStatus] = useState('Starting…');
  const [error, setError] = useState('');

  const startedRef = useRef(false);

  const socketUrl = useMemo(() => (scanId ? wsUrlForScanId(scanId) : null), [scanId]);

  useEffect(() => {
    if (!scanId || !files || !jdText) {
      navigate('/', { replace: true });
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    let ws;
    let isMounted = true;
    let pingTimer;

    const run = async () => {
      try {
        ws = new WebSocket(socketUrl);
        ws.onopen = () => {
          try {
            const token = localStorage.getItem('token');
            if (token) ws.send(JSON.stringify({ type: 'auth', token }));
            ws.send('ping');
          } catch (_) {}
          pingTimer = setInterval(() => {
            try {
              ws.send('ping');
            } catch (_) {}
          }, 25000);
        };
        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (!isMounted) return;
            if (msg.type === 'start') {
              setStatus(`Analysing ${msg.total} resume(s)…`);
              setPercent(0);
            } else if (msg.type === 'progress') {
              setPercent(msg.percent ?? 0);
              setStatus(`Processed ${msg.processed}/${msg.total}: ${msg.filename}`);
            } else if (msg.type === 'error') {
              setError(msg.message || 'Processing failed');
              setStatus('Failed');
            } else if (msg.type === 'done') {
              setPercent(100);
              setStatus('Finalizing results…');
            }
          } catch (_) {
            // ignore non-json
          }
        };

        // Kick off the actual scoring request (runs in parallel with WS updates)
        const data = await api.checkScore(files, jdText, jobName || undefined, scanId);
        sessionStorage.setItem('scoreResult', JSON.stringify(data));
        navigate('/results', { replace: true });
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Upload failed. Please try again.');
        setStatus('Failed');
      } finally {
        if (pingTimer) clearInterval(pingTimer);
        try {
          ws?.close();
        } catch (_) {}
      }
    };

    run();

    return () => {
      isMounted = false;
      if (pingTimer) clearInterval(pingTimer);
      try {
        ws?.close();
      } catch (_) {}
    };
  }, [scanId, files, jdText, jobName, socketUrl, navigate]);

  const card = 'rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className={card + ' p-8'}>
          <h1 className="text-2xl font-extrabold tracking-tight">Analysing resumes</h1>
          <p className="mt-2 text-sm text-slate-400">Live progress updates while we process your files.</p>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium text-slate-200">{status}</div>
              <div className="tabular-nums text-slate-300">{percent}%</div>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width]"
                style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 text-xs text-slate-500">
            Don’t close this tab until the analysis finishes.
          </div>
        </div>
      </div>
    </div>
  );
}
