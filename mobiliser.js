const session = requireRole('mobiliser');
let overviewPeriod = 'daily';
let overviewChartInstance = null;
let dailyCategory = 'all';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('avatarInitial').textContent = (session.profile.full_name || 'M')[0];
  bindMenu();
  bindMembers();
  bindDaily();
  bindProfile();
  bindSecurity();
  await loadOverview();
  await loadMembers();
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
    if (btn.dataset.view === 'daily') loadDaily();
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
  const grid = document.getElementById('overviewStats');
  grid.innerHTML = `
    <div class="card accent-navy"><div class="label">Total Members</div><div class="value">${overviewData.totalMembers}</div></div>
    <div class="card accent-army"><div class="label">Total Savings</div><div class="value">UGX ${Number(overviewData.totalSavings).toLocaleString()}</div></div>
    <div class="card accent-navy"><div class="label">Pending Loans</div><div class="value">${overviewData.pendingLoans}</div></div>
  `;
  const ctx = document.getElementById('overviewChart').getContext('2d');
  if (overviewChartInstance) overviewChartInstance.destroy();
  overviewChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.category),
      datasets: [{ label: 'Total Amount (UGX)', data: rows.map(r => Number(r.total)), backgroundColor: '#1d4076' }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function bindMembers() {
  document.getElementById('addMemberBtn').addEventListener('click', async () => {
    const full_name = document.getElementById('newMemberName').value.trim();
    const phone = document.getElementById('newMemberPhone').value.trim();
    const email = document.getElementById('newMemberEmail').value.trim();
    if (!full_name) return showToast({ title: 'Name required', message: 'Enter the member\'s full name.', warn: true });
    const res = await fetch('/api/mobiliser/members', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ full_name, phone, email }) });
    const data = await res.json();
    showToast({ title: res.ok ? 'Member added' : 'Failed', message: res.ok ? `${data.member_id} created with default password.` : data.error, warn: !res.ok });
    if (res.ok) { document.getElementById('newMemberName').value = ''; document.getElementById('newMemberPhone').value = ''; document.getElementById('newMemberEmail').value = ''; loadMembers(); }
  });
}

async function loadMembers() {
  const res = await fetch('/api/mobiliser/members', { headers: authHeaders() });
  const rows = await res.json();
  document.getElementById('membersTableBody').innerHTML = rows.map(m => `
    <tr>
      <td>${m.member_id}</td><td>${m.full_name}</td>
      <td>UGX ${Number(m.balance).toLocaleString()}</td>
      <td><span class="tag ${m.status === 'active' ? 'deposit' : 'withdrawal'}">${m.status}</span></td>
      <td>
        <select class="balCategory" data-id="${m.member_id}" style="padding:5px;border-radius:6px;">
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="share">Share</option>
          <option value="loan_repayment">Loan Repayment</option>
        </select>
        <input type="number" class="balAmount" data-id="${m.member_id}" placeholder="Amount" style="width:90px;padding:5px;border-radius:6px;border:1px solid var(--border);">
        <button class="btn btn-sm btn-navy applyBalBtn" data-id="${m.member_id}">Apply</button>
      </td>
      <td><button class="btn btn-sm btn-danger removeMemberBtn" data-id="${m.member_id}">Remove</button></td>
    </tr>`).join('');

  document.querySelectorAll('.applyBalBtn').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const category = document.querySelector(`.balCategory[data-id="${id}"]`).value;
    const amount = parseFloat(document.querySelector(`.balAmount[data-id="${id}"]`).value);
    if (!amount || amount <= 0) return showToast({ title: 'Invalid amount', message: 'Enter an amount greater than zero.', warn: true });
    const res = await fetch(`/api/mobiliser/members/${id}/balance`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ category, amount }) });
    const data = await res.json();
    showToast({ title: res.ok ? 'Balance updated' : 'Failed', message: data.message || data.error, warn: !res.ok });
    if (res.ok) { loadMembers(); loadOverview(); }
  }));

  document.querySelectorAll('.removeMemberBtn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm(`Remove member ${btn.dataset.id}? This cannot be undone.`)) return;
    const res = await fetch(`/api/mobiliser/members/${btn.dataset.id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) { showToast({ title: 'Member removed', message: btn.dataset.id + ' has been removed.' }); loadMembers(); }
  }));
}

function bindDaily() {
  document.querySelectorAll('#dailyCategoryFilter button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#dailyCategoryFilter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); dailyCategory = btn.dataset.category; loadDaily();
  }));
}

async function loadDaily() {
  const res = await fetch(`/api/mobiliser/transactions?period=daily&category=${dailyCategory}`, { headers: authHeaders() });
  const rows = await res.json();
  document.getElementById('dailyTableBody').innerHTML = rows.map(r => `
    <tr><td>${new Date(r.created_at).toLocaleString()}</td><td>${r.member_id}</td>
    <td><span class="tag ${r.category}">${r.category.replace('_',' ')}</span></td>
    <td>UGX ${Number(r.amount).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="4">No transactions today.</td></tr>';
}

function bindProfile() {
  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const full_name = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    const email = document.getElementById('profileEmail').value;
    const res = await fetch('/api/mobiliser/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ full_name, phone, email }) });
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

  document.getElementById('changeIdBtn').addEventListener('click', async () => {
    const targetRole = document.getElementById('idRoleSelect').value;
    const newId = document.getElementById('newIdValue').value.trim();
    if (!newId) return;
    const res = await fetch('/api/auth/change-id', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ targetRole, newId }) });
    const data = await res.json();
    showToast({ title: res.ok ? 'ID updated' : 'Failed', message: data.message || data.error, warn: !res.ok });
  });
}

function connectAndListen() {
  const socket = connectSocket();
  if (!socket) return;
  socket.on('notification', (payload) => { handleIncomingNotification(payload); loadOverview(); });
}
