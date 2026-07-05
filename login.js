const API_BASE = '';
let selectedRole = 'member';

const roleTabs = document.querySelectorAll('.role-tabs button');
const idLabel = document.getElementById('idLabel');
const loginId = document.getElementById('loginId');
const errorBox = document.getElementById('formError');

const ROLE_META = {
  member: { label: 'Member ID', placeholder: 'e.g. M-0001' },
  mobiliser: { label: 'Mobiliser ID', placeholder: 'e.g. MOB-XXXX-XXXX' },
  admin: { label: 'Admin ID', placeholder: 'e.g. ADMIN' }
};

roleTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    roleTabs.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    selectedRole = btn.dataset.role;
    idLabel.textContent = ROLE_META[selectedRole].label;
    loginId.placeholder = ROLE_META[selectedRole].placeholder;
    errorBox.classList.remove('show');
  });
});

document.getElementById('togglePw').addEventListener('click', function () {
  const pw = document.getElementById('loginPassword');
  const isPw = pw.type === 'password';
  pw.type = isPw ? 'text' : 'password';
  this.textContent = isPw ? '🙈' : '👁';
  this.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const id = loginId.value.trim();
  const password = document.getElementById('loginPassword').value;
  errorBox.classList.remove('show');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedRole, id, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign in failed.');

    localStorage.setItem('sacco_token', data.token);
    localStorage.setItem('sacco_role', data.role);
    localStorage.setItem('sacco_profile', JSON.stringify(data.profile));

    const dest = { member: '/pages/member.html', mobiliser: '/pages/mobiliser.html', admin: '/pages/admin.html' }[selectedRole];
    window.location.href = dest;
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});
