import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';

function wsUrlForScanId(scanId, token) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const u = new URL(base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = `/ws/progress/${encodeURIComponent(scanId)}`;

  // Preferred auth path: token in query string (backend supports this).
  // This avoids any race with the auth_required handshake.
  if (token) u.searchParams.set('token', token);

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
  const wsRef = useRef(null);
  const pingTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const token = useMemo(() => localStorage.getItem('token') || '', []);
  const socketUrl = useMemo(
    () => (scanId ? wsUrlForScanId(scanId, token) : null),
    [scanId, token]
  );

  useEffect(() => {
    // Always mark mounted at the beginning of each effect setup.
    // In React dev StrictMode, cleanup+setup can run twice; this prevents
    // isMountedRef from getting stuck false when startedRef short-circuits.
    isMountedRef.current = true;

    if (!scanId || !files || !jdText) {
      navigate('/', { replace: true });
      return;
    }

    if (!token) {
      localStorage.removeItem('token');
      navigate('/login', { replace: true });
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        wsRef.current = new WebSocket(socketUrl);
        const ws = wsRef.current;

        ws.onopen = () => {
          if (!isMountedRef.current) {
            ws.close();
            return;
          }
        };

        ws.onerror = (evt) => {
          if (!isMountedRef.current) return;
          setError('Connection error. Please try again.');
          setStatus('Failed');
        };

        ws.onclose = () => {};

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (!isMountedRef.current) return;

            if (msg.type === 'start') {
              setStatus(`Analysing ${msg.total} resume(s)…`);
              setPercent(0);
              return;
            }

            if (msg.type === 'progress') {
              setPercent(msg.percent ?? 0);
              setStatus(`Processed ${msg.processed}/${msg.total}: ${msg.filename}`);
              return;
            }

            if (msg.type === 'done') {
              setPercent(100);
              setStatus('Finalizing results…');
              return;
            }

            if (msg.type === 'error') {
              setError(msg.message || 'Server error');
              setStatus('Failed');
              return;
            }
          } catch (err) {
            // Ignore non-JSON or malformed WS payloads.
          }
        };

        // Kick off the actual scoring request
        const data = await api.checkScore(files, jdText, jobName || undefined, scanId);
        
        if (!isMountedRef.current) {
          ws.close();
          return;
        }
        
        sessionStorage.setItem('scoreResult', JSON.stringify(data));
        navigate('/results', { replace: true });
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(err.message || 'Upload failed. Please try again.');
        setStatus('Failed');
      }
    };

    run();

    return () => {
      isMountedRef.current = false;
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      // Only close if WebSocket exists and is fully OPEN (not CONNECTING)
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      } catch (_) {}
    };
  }, [scanId, files, jdText, jobName, socketUrl, navigate, token]);

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
