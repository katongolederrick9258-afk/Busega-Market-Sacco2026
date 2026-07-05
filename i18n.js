const I18N = {
  en: {
    dashboard: 'Dashboard', transactions: 'Transactions', growth: 'Growth Graph',
    pendingLoans: 'Pending Loan Transactions', history: 'History', comments: 'Comments',
    settings: 'Settings', getInTouch: 'Get In Touch', logout: 'Log Out',
    balance: 'Account Balance', changePassword: 'Change Password', darkMode: 'Dark Mode',
    language: 'Language', postComment: 'Post a comment...'
  },
  lg: {
    dashboard: 'Ekyapa ky\'Obulambuzi', transactions: 'Empisa z\'Ensimbi', growth: 'Ekyakulakulanya',
    pendingLoans: 'Ebbanja Ebikyalindirirwa', history: 'Ebyafaayo', comments: 'Ebiwandiiko',
    settings: 'Entegeka', getInTouch: 'Tutuukirire', logout: 'Fuluma',
    balance: 'Sente ez\'oku Akawunti', changePassword: 'Kyusa Ekigambo ky\'Ekyama',
    darkMode: 'Enzikiza', language: 'Olulimi', postComment: 'Wandiika ekiwandiiko...'
  },
  sw: {
    dashboard: 'Dashibodi', transactions: 'Miamala', growth: 'Chati ya Ukuaji',
    pendingLoans: 'Mikopo Inayosubiri', history: 'Historia', comments: 'Maoni',
    settings: 'Mipangilio', getInTouch: 'Wasiliana Nasi', logout: 'Toka',
    balance: 'Salio la Akaunti', changePassword: 'Badilisha Nenosiri',
    darkMode: 'Hali ya Giza', language: 'Lugha', postComment: 'Andika maoni...'
  }
};

function applyTranslations(lang) {
  const dict = I18N[lang] || I18N.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
}
