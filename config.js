// When frontend is served by the same Node server (recommended for Render),
// leaving API_BASE empty means requests go to the same origin.
// If you host frontend separately, set this to your backend's URL, e.g.
// const API_BASE = 'https://busega-sacco-api.onrender.com';
const API_BASE = '';

function authHeaders() {
  const token = localStorage.getItem('sacco_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function getSession() {
  const token = localStorage.getItem('sacco_token');
  const role = localStorage.getItem('sacco_role');
  const profileRaw = localStorage.getItem('sacco_profile');
  if (!token || !role) return null;
  return { token, role, profile: profileRaw ? JSON.parse(profileRaw) : {} };
}

function requireRole(role) {
  const session = getSession();
  if (!session || session.role !== role) {
    window.location.href = '/pages/login.html';
    return null;
  }
  return session;
}

function logout() {
  localStorage.removeItem('sacco_token');
  localStorage.removeItem('sacco_role');
  localStorage.removeItem('sacco_profile');
  window.location.href = '/pages/login.html';
}
