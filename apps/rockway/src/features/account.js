/* Rockway feature — Account (profile, language, settings). No wallet/points. */
(function (RW) {
  'use strict';
  const { esc } = RW.util;

  function initials(name) {
    const parts = (name || 'G').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }

  const LANGS = [
    { v: 'en', label: '🇬🇧 English' },
    { v: 'es', label: '🇪🇸 Español' },
    { v: 'yan', label: '🇬🇮 Llanito' },
  ];

  function langNote(lang) {
    if (lang === 'yan') return '¿Qué tal, mate? Llanito is Gibraltar’s own tongue — Andalusian Spanish and British English woven together. “Focona” for the border, “liqueribá” for liquorice. The heart of Llanito identity.';
    if (lang === 'es') return 'Rockway está disponible en español. La comunidad gibraltareña es bilingüe por naturaleza — el español conecta la ciudad con toda la región del Campo de Gibraltar.';
    return 'Gibraltar speaks English, Spanish and its own tongue — Llanito. Switch any time.';
  }

  function hero() {
    const name = RW.S.name || 'Gibraltarian';
    const email = RW.userEmail || 'hello@rockway.gi';
    const isBiz = !!RW.S.myBusiness;
    return '<div class="hero" style="background:linear-gradient(135deg,#14181f,#1455c0);border-radius:0 0 28px 28px">' +
      '<div style="display:flex;align-items:center;gap:14px">' +
      '<div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#e08a00);color:#14181f;display:grid;place-items:center;font-size:18px;font-weight:900;flex:0 0 auto;box-shadow:0 4px 14px rgba(243,178,27,.45)">' + esc(initials(name)) + '</div>' +
      '<div style="min-width:0"><div style="font-size:19px;font-weight:900;letter-spacing:-.3px">' + esc(name) + '</div>' +
      '<div style="font-size:12.5px;opacity:.8">' + esc(email) + '</div>' +
      '<div style="margin-top:6px"><span class="chip">' + (isBiz ? '🏪 Business owner' : '👋 Member') + '</span></div></div></div></div>';
  }

  function stats() {
    const s = (n, l) => '<div class="stat" style="text-align:center"><div class="n num">' + esc(String(n)) + '</div><div class="l">' + esc(l) + '</div></div>';
    const bookings = (RW.S.bookings || []).length;
    const saved = (RW.S.savedBusinesses || []).length + (RW.S.savedProperties || []).length + (RW.S.savedListings || []).length;
    const listings = (RW.S.listings || []).length;
    return '<div class="grid2" style="margin-bottom:4px">' + s(bookings, 'Bookings') + s(saved, 'Saved') + '</div>' +
      '<div class="grid2" style="margin-top:10px">' + s(listings, 'Your adverts') + s((RW.S.reservations || []).length, 'Reservations') + '</div>';
  }

  const settingRow = (e, bg, n, sub) => RW.ui.row({ lead: e, leadBg: bg, name: n, sub: sub, trail: '<span class="muted">›</span>' });

  function render() {
    const lang = RW.S.lang || 'en';
    const seg = '<div class="seg">' + LANGS.map((l) =>
      '<button class="' + (lang === l.v ? 'on' : '') + '" data-act="setLang" data-v="' + l.v + '">' + l.label + '</button>').join('') + '</div>';
    const body =
      RW.ui.sectionTitle('Your Rockway') + stats() +
      RW.ui.sectionTitle('For business') +
      '<div class="card"><div class="row" style="border:0;padding:6px 0"><div class="lead" style="background:var(--brand-soft)">🏪</div>' +
      '<div class="body"><div class="name">' + (RW.S.myBusiness ? esc(RW.S.myBusiness.name) : 'List your business') + '</div>' +
      '<div class="sub">' + (RW.S.myBusiness ? 'Manage your listing & bookings' : 'Free — reach the whole Rock') + '</div></div>' +
      '<div class="trail"><button class="btn sm" data-act="nav" data-route="#/business">' + (RW.S.myBusiness ? 'Manage' : 'Start') + '</button></div></div></div>' +
      RW.ui.sectionTitle('Language') + seg +
      '<div class="muted tiny" style="margin-top:8px">' + langNote(lang) + '</div>' +
      RW.ui.sectionTitle('Settings') + '<div class="card">' +
      settingRow('🔔', '#fde7ea', 'Notifications', 'Booking updates & frontier alerts') +
      settingRow('🏠', '#e6effc', 'Saved addresses', 'Add your home & work') +
      settingRow('🛟', '#fff4d6', 'Help & support', 'Chat · FAQ — Gibraltar support') +
      settingRow('ℹ️', '#f5f6f9', 'About Rockway', 'Gibraltar’s local marketplace · v2.0') +
      '</div>' +
      '<button class="btn ghost" style="margin-top:16px" data-act="resetDemo">Reset demo data</button>' +
      '<div class="muted tiny" style="text-align:center;margin-top:16px">Rockway · 🔑 Key to the Mediterranean</div>';
    return RW.ui.screen({ title: 'Account', plain: true, tab: 'account', body });
  }

  RW.register({
    id: 'account', title: 'Account', emoji: '⚙️', showTile: false, render,
    actions: {
      setLang: (el) => { RW.S.lang = el.dataset.v; RW.store.save(); RW.toast('Language updated'); RW.render(); },
      resetDemo: () => { if (confirm('Reset all Rockway demo data?')) { RW.store.reset(); RW.go('#/'); RW.render(); RW.toast('Demo data reset'); } },
    },
  });
})(window.RW);
