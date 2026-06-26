const BASE_URL = '';

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}/api${path}`, opts);
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.reload();
    throw new Error('Unauthorized');
  }
  return res.json();
}

export default {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path)
};
