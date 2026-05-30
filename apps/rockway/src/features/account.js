/* Rockway feature — Account (profile, language, settings). */
(function (RW) {
  'use strict';
  const { esc } = RW.util;

  const acctRow = (e, n, s) => '<div class="row"><div class="lead">' + e + '</div><div class="body"><div class="name">' + n + '</div><div class="sub">' + s + '</div></div><div class="trail muted">›</div></div>';

  function render() {
    const langs = [['en', '🇬🇧 English'], ['es', '🇪🇸 Español'], ['yan', '🇬🇮 Llanito']];
    const langNote = RW.S.lang === 'yan' ? '¡Ozú! Llanito is the heart of Gibraltar — a mix of Andalusian Spanish and English.'
      : RW.S.lang === 'es' ? 'App disponible en español.' : 'Llanito, Gibraltar’s own tongue, is available too.';
    const body =
      '<div class="card" style="display:flex;gap:14px;align-items:center;margin-top:8px">' +
      '<div class="venue-emoji" style="background:var(--brand-soft);font-size:28px">🔑</div>' +
      '<div style="flex:1"><div style="font-weight:800;font-size:17px">' + esc(RW.S.name) + '</div>' +
      '<div class="muted tiny">' + esc(RW.userEmail || 'hello@rockway.gi') + '</div></div>' +
      '<div style="text-align:right"><div style="font-weight:900;font-size:18px;color:var(--brand)">' + RW.S.points + '</div><div class="muted tiny">points</div></div></div>' +
      RW.ui.sectionTitle('Language') +
      '<div class="seg">' + langs.map((l) => '<button class="' + (RW.S.lang === l[0] ? 'on' : '') + '" data-act="setLang" data-v="' + l[0] + '">' + l[1] + '</button>').join('') + '</div>' +
      '<div class="muted tiny" style="margin-top:8px">' + langNote + '</div>' +
      RW.ui.sectionTitle('Settings') + '<div class="card">' +
      acctRow('🔔', 'Notifications', 'Frontier alerts, order updates') +
      acctRow('💳', 'Payment methods', 'Visa ••42 · Rockway Wallet') +
      acctRow('🏠', 'Saved addresses', '12 Main Street + 1 more') +
      acctRow('🛟', 'Help & support', '24/7 Gibraltar support') + '</div>' +
      '<button class="btn ghost" style="margin-top:16px" data-act="resetDemo">Reset demo data</button>' +
      '<div class="muted tiny" style="text-align:center;margin-top:18px">Rockway · Gibraltar’s everything app · v1.0</div>';
    return RW.ui.screen({ title: 'Account', plain: true, tab: 'account', body, fab: false });
  }

  RW.register({
    id: 'account', title: 'Account', emoji: '⚙️', showTile: false, render,
    actions: {
      setLang: (el) => { RW.S.lang = el.dataset.v; RW.store.save(); RW.toast('Language updated'); RW.render(); },
      resetDemo: () => { if (confirm('Reset all Rockway demo data?')) { RW.store.reset(); RW.go('#/'); RW.render(); RW.toast('Demo data reset'); } },
    },
  });
})(window.RW);
