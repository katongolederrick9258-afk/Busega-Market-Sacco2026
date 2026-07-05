const session = requireRole('admin');
let overviewPeriod = 'daily';
let overviewChartInstance = null;
let loanStatus = 'pending';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('avatarInitial').textContent = (session.profile.full_name || 'A')[0];
  bindMenu();
  bindLoans();
  bindProfile();
  bindSecurity();
  await loadOverview();
  await loadMembers();
  await loadLoans();
  connectAndListen();
}

function bindMenu() {
  const overlay = document.getElementById('menuOverlay');
  const panel = document.getElementById('menuPanel');
  const open = () => { overlay.classList.add('open'); panel.classList.add('open'); document.getElementById('notifDot').classList.remove('show'); };
  const close = () => { overlay.classList.remove('open'); panel.classList.remove('open'); };
  document.getElementById('hamburgerBtn').addEventListener('click', open);
  document.getElementById('menuClose').addEventListener('click', close);
  overlay.addEventListener('click', close);

  document.querySelectorAll('.menu-item[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    close();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('themeSwitch').addEventListener('click', function () {
    this.classList.toggle('on');
    document.body.classList.toggle('theme-dark', this.classList.contains('on'));
  });

  document.querySelectorAll('#overviewPeriodFilter button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#overviewPeriodFilter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); overviewPeriod = btn.dataset.period; renderOverviewForPeriod();
  }));
}

let overviewData = null;
async function loadOverview() {
  const res = await fetch('/api/admin/overview', { headers: authHeaders() });
  overviewData = await res.json();
  renderOverviewForPeriod();
}

function renderOverviewForPeriod() {
  if (!overviewData) return;
  const rows = overviewData.periods[overviewPeriod] || [];
  document.getElementById('overviewStats').innerHTML = `
    <div class="card accent-navy"><div class="label">Total Members</div><div class="value">${overviewData.totalMembers}</div></div>
    <div class="card accent-army"><div class="label">Total Savings</div><div class="value">UGX ${Number(overviewData.totalSavings).toLocaleString()}</div></div>
    <div class="card accent-navy"><div class="label">Pending Loans</div><div class="value">${overviewData.pendingLoans}</div></div>
  `;
  const ctx = document.getElementById('overviewChart').getContext('2d');
  if (overviewChartInstance) overviewChartInstance.destroy();
  overviewChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: rows.map(r => r.category), datasets: [{ label: 'Total Amount (UGX)', data: rows.map(r => Number(r.total)), backgroundColor: '#3b4a2b' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

async function loadMembers() {
  const res = await fetch('/api/members', { headers: authHeaders() });
  const rows = await res.json();
  document.getElementById('membersTableBody').innerHTML = rows.map(m => `
    <tr><td>${m.member_id}</td><td>${m.full_name}</td>
    <td>UGX ${Number(m.balance).toLocaleString()}</td>
    <td><span class="tag ${m.status === 'active' ? 'deposit' : 'withdrawal'}">${m.status}</span></td></tr>`).join('');
}

function bindLoans() {
  document.querySelectorAll('#loanStatusFilter button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#loanStatusFilter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); loanStatus = btn.dataset.status; loadLoans();
  }));
}

async function loadLoans() {
  const res = await fetch(`/api/admin/loans?status=${loanStatus}`, { headers: authHeaders() });
  const rows = await res.json();
  document.getElementById('loansTableBody').innerHTML = rows.map(l => `
    <tr>
      <td>${new Date(l.requested_at).toLocaleString()}</td>
      <td>${l.full_name} (${l.member_id})</td>
      <td>UGX ${Number(l.amount_requested).toLocaleString()}</td>
      <td>${l.purpose || '—'}</td>
      <td><span class="tag ${l.status}">${l.status}</span></td>
      <td>${l.status === 'pending' ? `
        <button class="btn btn-sm btn-army approveBtn" data-id="${l.id}">Approve</button>
        <button class="btn btn-sm btn-danger disapproveBtn" data-id="${l.id}">Disapprove</button>` : '—'}</td>
    </tr>`).join('') || '<tr><td colspan="6">No loan requests found.</td></tr>';

  document.querySelectorAll('.approveBtn').forEach(btn => btn.addEventListener('click', () => decideLoan(btn.dataset.id, 'approved')));
  document.querySelectorAll('.disapproveBtn').forEach(btn => btn.addEventListener('click', () => {
    const note = prompt('Optional note for the member (reason for disapproval):') || '';
    decideLoan(btn.dataset.id, 'disapproved', note);
  }));
}

async function decideLoan(id, decision, note) {
  const res = await fetch(`/api/admin/loans/${id}/decision`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ decision, note }) });
  const data = await res.json();
  showToast({ title: res.ok ? 'Loan decision recorded' : 'Failed', message: data.message || data.error, warn: !res.ok });
  if (res.ok) { loadLoans(); loadOverview(); loadMembers(); }
}

function bindProfile() {
  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const full_name = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    const email = document.getElementById('profileEmail').value;
    const res = await fetch('/api/admin/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ full_name, phone, email }) });
    const data = await res.json();
    showToast({ title: res.ok ? 'Profile updated' : 'Failed', message: data.message || data.error, warn: !res.ok });
  });
}

function bindSecurity() {
  document.getElementById('changePwBtn').addEventListener('click', async () => {
    const currentPassword = document.getElementById('curPw').value;
    const newPassword = document.getElementById('newPw').value;
    const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ currentPassword, newPassword }) });
    const data = await res.json();
    showToast({ title: res.ok ? 'Password changed' : 'Failed', message: data.message || data.error, warn: !res.ok });
  });
}

function connectAndListen() {
  const socket = connectSocket();
  if (!socket) return;
  socket.on('notification', (payload) => { handleIncomingNotification(payload); loadOverview(); loadLoans(); });
}
