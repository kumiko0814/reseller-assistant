/* Re:sellerアシスタント 共通JS（モック版） */

const STORAGE = {
  LOGIN: 'reseller_login',
  REGISTERED_AT: 'reseller_registered_at',
  USAGE_TODAY: 'reseller_usage_today',
  USAGE_DATE: 'reseller_usage_date',
  HISTORY: 'reseller_history'
};

const MONITOR_DAYS = 5;
const MONITOR_DAILY_LIMIT = 5;

/* ---------- ログイン関連 ---------- */
function login(version) {
  const now = Date.now();
  localStorage.setItem(STORAGE.LOGIN, JSON.stringify({
    version: version, // "student" or "monitor"
    name: version === 'student' ? 'みさとさん' : 'モニター様',
    loggedInAt: now
  }));
  if (version === 'monitor' && !localStorage.getItem(STORAGE.REGISTERED_AT)) {
    localStorage.setItem(STORAGE.REGISTERED_AT, String(now));
  }
  location.href = 'app.html';
}

function logout() {
  if (!confirm('ログアウトしますか？')) return;
  localStorage.removeItem(STORAGE.LOGIN);
  location.href = 'index.html';
}

function requireLogin() {
  const raw = localStorage.getItem(STORAGE.LOGIN);
  if (!raw) {
    location.href = 'index.html';
    return null;
  }
  try { return JSON.parse(raw); } catch (e) {
    location.href = 'index.html';
    return null;
  }
}

/* ---------- モニター期限カウントダウン ---------- */
function getMonitorRemaining() {
  const registered = parseInt(localStorage.getItem(STORAGE.REGISTERED_AT) || '0', 10);
  if (!registered) return null;
  const expiresAt = registered + MONITOR_DAYS * 24 * 60 * 60 * 1000;
  const remaining = expiresAt - Date.now();
  return remaining;
}

function formatRemaining(ms) {
  if (ms <= 0) return '0日 0時間 0分';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${d}日 ${h}時間 ${m}分`;
}

function startCountdown(elId, onExpire) {
  const el = document.getElementById(elId);
  if (!el) return;
  const tick = () => {
    const r = getMonitorRemaining();
    if (r === null) { el.textContent = '残り --'; return; }
    if (r <= 0) {
      el.textContent = '期間終了';
      if (typeof onExpire === 'function') onExpire();
      return;
    }
    el.textContent = formatRemaining(r);
  };
  tick();
  setInterval(tick, 1000 * 30); // 30秒ごと
}

/* ---------- 利用回数（モニター版） ---------- */
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function getUsageToday() {
  const date = localStorage.getItem(STORAGE.USAGE_DATE);
  const today = getTodayKey();
  if (date !== today) {
    localStorage.setItem(STORAGE.USAGE_DATE, today);
    localStorage.setItem(STORAGE.USAGE_TODAY, '0');
    return 0;
  }
  return parseInt(localStorage.getItem(STORAGE.USAGE_TODAY) || '0', 10);
}

function incrementUsage() {
  const cur = getUsageToday();
  localStorage.setItem(STORAGE.USAGE_TODAY, String(cur + 1));
  return cur + 1;
}

function canUseMonitor() {
  const r = getMonitorRemaining();
  if (r === null) return true;
  if (r <= 0) return false;
  if (getUsageToday() >= MONITOR_DAILY_LIMIT) return false;
  return true;
}

/* ---------- 履歴 ---------- */
function addHistory(item) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(STORAGE.HISTORY) || '[]'); } catch(e){}
  list.unshift({ ...item, at: Date.now() });
  list = list.slice(0, 50);
  localStorage.setItem(STORAGE.HISTORY, JSON.stringify(list));
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE.HISTORY) || '[]'); } catch(e){ return []; }
}

/* ---------- ローディング ---------- */
function showLoading(targetSelector, text) {
  const t = document.querySelector(targetSelector);
  if (!t) return;
  t.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div class="loading-text">${text || 'AIが処理中…'}</div>
    </div>`;
}

function mockProcess(targetSelector, delayMs, callback) {
  showLoading(targetSelector);
  setTimeout(callback, delayMs || 1500);
}

/* ---------- コピー ---------- */
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'コピー済み';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('copied');
      }, 1600);
    }
  }).catch(() => alert('コピーに失敗しました'));
}

/* ---------- 画像プレビュー ---------- */
function setupImageUpload(zoneId, inputId, previewId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => {
    if (!preview) return;
    preview.innerHTML = '';
    const files = Array.from(e.target.files || []).slice(0, 6);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `<img src="${ev.target.result}" alt="">`;
        preview.appendChild(div);
      };
      reader.readAsDataURL(f);
    });
  });
}

/* ---------- 期限切れモーダル（モニター版） ---------- */
function showExpiredModal() {
  const m = document.getElementById('expired-modal');
  if (m) m.classList.add('show');
  document.querySelectorAll('.feature-card').forEach(c => c.classList.add('disabled'));
  const submitBtns = document.querySelectorAll('button[data-feature-submit]');
  submitBtns.forEach(b => { b.disabled = true; });
}

function checkExpiredOnLoad() {
  const r = getMonitorRemaining();
  if (r !== null && r <= 0) showExpiredModal();
}

/* ---------- ナビ active ---------- */
function setActiveNav(name) {
  document.querySelectorAll('.app-nav a').forEach(a => {
    if (a.dataset.nav === name) a.classList.add('active');
  });
}
