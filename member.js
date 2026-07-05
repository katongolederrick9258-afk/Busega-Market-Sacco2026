const session = requireRole('member');
let profile = session ? session.profile : {};
let growthChartInstance = null;
let currentPeriod = 'daily';
let currentCategory = 'all';
let commentRotationIndex = 0;
let commentRotationTimer = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  applyTheme(profile.theme || 'light');
  applyTranslations(profile.language || 'en');
  document.getElementById('langSelect').value = profile.language || 'en';
  document.getElementById('themeSwitch').classList.toggle('on', (profile.theme || 'light') === 'dark');

  setAvatar(profile.profile_picture);
  document.getElementById('statMemberId').textContent = profile.member_id || session.role;

  bindMenu();
  bindPasswordToggle();
  bindPasswordChange();
  bindLoanRequest();
  bindPeriodFilters();
  bindCommentPosting();

  await refreshProfile();
  await loadDashboardData();
  await loadComments();
  connectAndListen();
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark');
}

function setAvatar(url) {
  const img = document.getElementById('avatarImg');
  const initial = document.getElementById('avatarInitial');
  const menuPreview = document.getElementById('menuAvatarPreview');
  if (url) {
    img.src = url; img.style.display = 'block'; initial.style.display = 'none';
    menuPreview.src = url;
  } else {
    initial.textContent = (profile.full_name || 'M')[0];
    menuPreview.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="100%" height="100%" fill="%230a1630"/></svg>';
  }
}

// ---------- Menu ----------
function bindMenu() {
  const overlay = document.getElementById('menuOverlay');
  const panel = document.getElementById('menuPanel');
  const open = () => { overlay.classList.add('open'); panel.classList.add('open'); document.getElementById('notifDot').classList.remove('show'); };
  const close = () => { overlay.classList.remove('open'); panel.classList.remove('open'); };

  document.getElementById('hamburgerBtn').addEventListener('click', open);
  document.getElementById('menuClose').addEventListener('click', close);
  overlay.addEventListener('click', close);

  document.querySelectorAll('.menu-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-' + btn.dataset.view).classList.add('active');
      close();
      if (btn.dataset.view === 'growth') renderGrowthChart();
      if (btn.dataset.view === 'transactions') loadTransactions();
      if (btn.dataset.view === 'loans') loadLoans();
      if (btn.dataset.view === 'history') loadHistory();
      if (btn.dataset.view === 'comments') loadComments(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  document.getElementById('langSelect').addEventListener('change', async (e) => {
    applyTranslations(e.target.value);
    profile.language = e.target.value;
    await fetch('/api/members/me/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ language: e.target.value }) });
  });

  document.getElementById('themeSwitch').addEventListener('click', async function () {
    this.classList.toggle('on');
    const theme = this.classList.contains('on') ? 'dark' : 'light';
    applyTheme(theme);
    profile.theme = theme;
    await fetch('/api/members/me/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ theme }) });
  });

  document.getElementById('avatarUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('picture', file);
    const res = await fetch('/api/members/me/profile-picture', { method: 'POST', headers: authHeaders(), body: fd });
    const data = await res.json();
    if (res.ok) { setAvatar(data.profile_picture); showToast({ title: 'Profile picture updated', message: 'Your new photo is now visible across the portal.' }); }
  });
}

function bindPasswordToggle() {
  document.querySelectorAll('.toggle-visibility[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });
}

function bindPasswordChange() {
  document.getElementById('changePwBtn').addEventListener('click', async () => {
    const currentPassword = document.getElementById('currentPw').value;
    const newPassword = document.getElementById('newPw').value;
    const msg = document.getElementById('pwMsg');
    const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ currentPassword, newPassword }) });
    const data = await res.json();
    msg.textContent = data.message || data.error;
    msg.style.color = res.ok ? 'var(--army-700)' : '#a8352f';
    if (res.ok) { document.getElementById('currentPw').value = ''; document.getElementById('newPw').value = ''; }
  });
}

function bindLoanRequest() {
  document.getElementById('requestLoanBtn').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const purpose = document.getElementById('loanPurpose').value;
    if (!amount || amount <= 0) return showToast({ title: 'Invalid amount', message: 'Enter an amount greater than zero.', warn: true });
    const res = await fetch('/api/members/me/loans', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ amount, purpose }) });
    const data = await res.json();
    showToast({ title: res.ok ? 'Loan requested' : 'Request failed', message: data.message || data.error, warn: !res.ok });
    if (res.ok) { document.getElementById('loanAmount').value = ''; document.getElementById('loanPurpose').value = ''; loadDashboardData(); }
  });
}

function bindPeriodFilters() {
  document.querySelectorAll('#periodFilter button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#periodFilter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); currentPeriod = btn.dataset.period; loadTransactions();
  }));
  document.querySelectorAll('#categoryFilter button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#categoryFilter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); currentCategory = btn.dataset.category; loadTransactions();
  }));
}

function bindCommentPosting() {
  document.getElementById('postCommentBtn').addEventListener('click', async () => {
    const content = document.getElementById('menuCommentInput').value.trim();
    if (!content) return;
    const res = await fetch('/api/members/me/comments', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ content }) });
    if (res.ok) { document.getElementById('menuCommentInput').value = ''; showToast({ title: 'Comment posted', message: 'Thanks for your feedback!' }); loadComments(); }
  });
}

// ---------- Data loading ----------
async function refreshProfile() {
  const res = await fetch('/api/members/me', { headers: authHeaders() });
  if (res.ok) {
    profile = await res.json();
    localStorage.setItem('sacco_profile', JSON.stringify(profile));
    setAvatar(profile.profile_picture);
    document.getElementById('statMemberId').textContent = profile.member_id;
    document.getElementById('statBalance').textContent = 'UGX ' + Number(profile.balance).toLocaleString();
  }
}

async function loadDashboardData() {
  const [txRes, loanRes] = await Promise.all([
    fetch('/api/members/me/transactions', { headers: authHeaders() }),
    fetch('/api/members/me/loans', { headers: authHeaders() })
  ]);
  const txs = await txRes.json();
  const loans = await loanRes.json();
  const sums = { deposit: 0, withdrawal: 0, loan: 0, share: 0 };
  txs.forEach(t => { if (sums[t.category] !== undefined) sums[t.category] += Number(t.amount); });
  document.getElementById('catDeposits').textContent = sums.deposit.toLocaleString();
  document.getElementById('catWithdrawals').textContent = sums.withdrawal.toLocaleString();
  document.getElementById('catLoans').textContent = sums.loan.toLocaleString();
  document.getElementById('catShares').textContent = sums.share.toLocaleString();
  document.getElementById('statPendingLoans').textContent = loans.filter(l => l.status === 'pending').length;
}

async function loadTransactions() {
  const res = await fetch(`/api/members/me/transactions?period=${currentPeriod}&category=${currentCategory}`, { headers: authHeaders() });
  const rows = await res.json();
  document.getElementById('txTableBody').innerHTML = rows.map(r => `
    <tr><td>${new Date(r.created_at).toLocaleString()}</td>
    <td><span class="tag ${r.category}">${r.category.replace('_',' ')}</span></td>
    <td>UGX ${Number(r.amount).toLocaleString()}</td>
    <td>UGX ${Number(r.balance_after).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="4">No transactions found for this period.</td></tr>';
}

async function loadLoans() {
  const res = await fetch('/api/members/me/loans', { headers: authHeaders() });
  const rows = await res.json();
  document.getElementById('loansTableBody').innerHTML = rows.map(r => `
    <tr><td>${new Date(r.requested_at).toLocaleString()}</td>
    <td>UGX ${Number(r.amount_requested).toLocaleString()}</td>
    <td>${r.purpose || '—'}</td>
    <td><span class="tag ${r.status}">${r.status}</span></td></tr>`).join('') || '<tr><td colspan="4">No loan requests yet.</td></tr>';
}

async function loadHistory() {
  const res = await fetch('/api/members/me/transactions', { headers: authHeaders() });
  const rows = await res.json();
  document.getElementById('historyTableBody').innerHTML = rows.map(r => `
    <tr><td>${new Date(r.created_at).toLocaleString()}</td>
    <td><span class="tag ${r.category}">${r.category.replace('_',' ')}</span></td>
    <td>UGX ${Number(r.amount).toLocaleString()}</td>
    <td>UGX ${Number(r.balance_after).toLocaleString()}</td>
    <td>${r.description || '—'}</td></tr>`).join('') || '<tr><td colspan="5">No history yet.</td></tr>';
}

async function renderGrowthChart() {
  const res = await fetch('/api/members/me/growth', { headers: authHeaders() });
  const rows = await res.json();
  const labels = rows.map(r => new Date(r.recorded_at).toLocaleDateString());
  const values = rows.map(r => Number(r.balance));
  const ctx = document.getElementById('growthChart').getContext('2d');
  if (growthChartInstance) growthChartInstance.destroy();
  growthChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Balance (UGX)', data: values, borderColor: '#4b5e37', backgroundColor: 'rgba(75,94,55,0.15)', fill: true, tension: 0.3 }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

async function loadComments(fullView = false) {
  const res = await fetch('/api/members/comments', { headers: authHeaders() });
  const rows = await res.json();

  const track = document.getElementById('commentTrack');
  track.innerHTML = rows.map(c => `<div class="comment-card"><strong>${c.member_name}</strong><p>${escapeHtml(c.content)}</p></div>`).join('') || '<div class="comment-card"><p>No comments yet — be the first to share your experience!</p></div>';
  startCommentRotation(rows.length);

  if (fullView) {
    document.getElementById('allCommentsList').innerHTML = rows.map(c => `<div class="comment-card" style="margin-bottom:10px;"><strong>${c.member_name}</strong><p>${escapeHtml(c.content)}</p></div>`).join('') || '<p>No comments yet.</p>';
  }
}

function startCommentRotation(count) {
  clearInterval(commentRotationTimer);
  if (count <= 1) return;
  const track = document.getElementById('commentTrack');
  const cardHeight = 84;
  commentRotationIndex = 0;
  commentRotationTimer = setInterval(() => {
    commentRotationIndex = (commentRotationIndex + 1) % count;
    track.style.transform = `translateY(-${commentRotationIndex * cardHeight}px)`;
  }, 4000);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ---------- Real-time ----------
function connectAndListen() {
  const socket = connectSocket();
  if (!socket) return;
  socket.on('notification', (payload) => { handleIncomingNotification(payload); refreshProfile(); loadDashboardData(); });
  socket.on('balance-update', () => { refreshProfile(); loadDashboardData(); });
  socket.on('new-comment', () => loadComments());
}
