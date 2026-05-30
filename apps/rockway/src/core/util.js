/* Rockway core — utilities, icons, toast.
 * Everything hangs off the global window.RW namespace so feature modules
 * (loaded as plain <script> tags, no bundler) can share it on file:// too. */
window.RW = window.RW || {};
(function (RW) {
  'use strict';

  const money = (n) => '£' + (Math.round(n * 100) / 100).toFixed(2);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const ref = (p) => p + Math.floor(1000 + Math.random() * 9000);

  function shade(hex, amt) {
    amt = amt == null ? -30 : amt;
    const n = parseInt(hex.slice(1), 16);
    let r = Math.max(0, Math.min(255, (n >> 16) + amt));
    let g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    let b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTime = (t) => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const dayPart = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; };

  RW.util = { money, sum, uid, esc, pick, ref, shade, fmtDate, fmtTime, dayPart };

  RW.ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h4l2 6 4-14 2 8h4"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12h3"/><path d="M3 9h13a2 2 0 012 2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  };

  // toast notification
  let toastT;
  RW.toast = function (msg) {
    const phone = document.querySelector('.phone');
    if (!phone) return;
    let w = phone.querySelector('.toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; phone.appendChild(w); }
    w.innerHTML = '<div class="toast">' + esc(msg) + '</div>';
    const t = w.querySelector('.toast');
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2000);
  };

  RW.go = (hash) => { location.hash = hash; };
})(window.RW);
