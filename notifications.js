// Each notification "type" plays a distinct short tone using the WebAudio API
// (no external audio files needed, works instantly on Render with no static assets).
const SOUND_FREQ = {
  deposit: [660, 880],
  withdrawal: [440, 330],
  loan: [520, 620, 720],
  loan_repayment: [520, 620],
  share: [700, 900],
  loan_approved: [523, 659, 784],
  loan_disapproved: [392, 330],
  comment: [880, 988],
  system: [600, 600]
};

function playNotificationSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = SOUND_FREQ[type] || SOUND_FREQ.system;
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch (e) { /* Audio not available - fail silently */ }
}

function showToast({ title, message, warn }) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast' + (warn ? ' warn' : '');
  el.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

function handleIncomingNotification(payload) {
  playNotificationSound(payload.type);
  showToast({
    title: payload.title,
    message: payload.message,
    warn: ['withdrawal', 'loan_disapproved'].includes(payload.type)
  });
  const dot = document.getElementById('notifDot');
  if (dot) dot.classList.add('show');
}
