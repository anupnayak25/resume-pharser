const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      detail = json.detail || JSON.stringify(json);
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

// Auth
export const api = {
  signup: (email, password) =>
    fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  login: (email, password) =>
    fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  me: () =>
    fetch(`${BASE_URL}/me`, { headers: authHeaders() }).then(handleResponse),

  // Score/Upload
  checkScore: (resumes, jd_text, job_name, scan_id) => {
    const form = new FormData();
    resumes.forEach((f) => form.append('resumes', f));
    form.append('jd_text', jd_text);
    if (job_name) form.append('job_name', job_name);
    if (scan_id) form.append('scan_id', scan_id);
    return fetch(`${BASE_URL}/check-score`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    }).then(handleResponse);
  },

  // History
  jobs: (limit = 50, offset = 0) =>
    fetch(`${BASE_URL}/jobs?limit=${limit}&offset=${offset}`, {
      headers: authHeaders(),
    }).then(handleResponse),

  history: (limit = 50, offset = 0, jobId) => {
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (jobId != null) qs.set('job_id', String(jobId));
    return fetch(`${BASE_URL}/history?${qs.toString()}`, {
      headers: authHeaders(),
    }).then(handleResponse);
  },
};
