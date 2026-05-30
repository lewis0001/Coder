/* Rockway feature — Account (profile, language, settings). */
(function (RW) {
  'use strict';
  const { esc, money } = RW.util;

  // ---- tier look-up (mirrors rewards.js thresholds — no import needed) ----
  var TIERS = [
    { name: 'Bronze Key', min: 0,    color: '#cd7f32', next: 250  },
    { name: 'Silver Key', min: 250,  color: '#8e8e8e', next: 750  },
    { name: 'Gold Key',   min: 750,  color: '#cfb53b', next: 1500 },
    { name: 'Rock Elite', min: 1500, color: '#a50d20', next: null  },
  ];

  function getTier(pts) {
    var t = TIERS[0];
    for (var i = 0; i < TIERS.length; i++) {
      if (pts >= TIERS[i].min) t = TIERS[i];
    }
    return t;
  }

  // progress 0–100 toward the next tier boundary (returns 100 if already at top)
  function tierProgress(pts) {
    var tier = getTier(pts);
    if (tier.next === null) return 100;
    var span = tier.next - tier.min;
    var done = pts - tier.min;
    return Math.min(100, Math.round((done / span) * 100));
  }

  function ptsToNext(pts) {
    var tier = getTier(pts);
    if (tier.next === null) return 0;
    return tier.next - pts;
  }

  // derive a short 1–2 letter avatar from name
  function initials(name) {
    var parts = (name || 'G').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }

  // ---- language display data (action values must stay 'en'/'es'/'yan') ----
  var LANGS = [
    { v: 'en',  label: '\u{1F1EC}\u{1F1E7} English'  },
    { v: 'es',  label: '\u{1F1EA}\u{1F1F8} Español' },
    { v: 'yan', label: '\u{1F1EC}\u{1F1EE} Llanito'  },
  ];

  // ---- build the profile hero ----
  function renderHero() {
    var pts      = typeof RW.S.points === 'number' ? RW.S.points : 0;
    var wallet   = typeof RW.S.wallet  === 'number' ? RW.S.wallet  : 0;
    var tier     = getTier(pts);
    var progress = tierProgress(pts);
    var left     = ptsToNext(pts);
    var email    = esc(RW.userEmail || 'hello@rockway.gi');
    var name     = RW.S.name || 'Gibraltarian';
    var av       = esc(initials(name));
    var nameSafe = esc(name);

    // progress bar toward next tier (hidden at Rock Elite)
    var progressBar = '';
    if (tier.next !== null) {
      progressBar =
        '<div style="margin-top:10px">' +
          '<div style="display:flex;justify-content:space-between;' +
          'font-size:10.5px;opacity:.8;font-weight:700;margin-bottom:4px">' +
            '<span>' + esc(tier.name) + '</span>' +
            '<span>' + esc(String(left)) + ' keys to ' + esc(TIERS[TIERS.indexOf(tier) + 1] ? TIERS[TIERS.indexOf(tier) + 1].name : '') + '</span>' +
          '</div>' +
          '<div style="height:5px;border-radius:999px;background:rgba(255,255,255,0.2)">' +
            '<div style="height:100%;border-radius:999px;width:' + esc(String(progress)) + '%;' +
            'background:' + esc(tier.color) + ';transition:width .4s"></div>' +
          '</div>' +
        '</div>';
    } else {
      progressBar =
        '<div style="margin-top:10px;font-size:11px;opacity:.8;font-weight:700">' +
          '✨ Rock Elite — top tier. As long as the keys remain on the Rock.' +
        '</div>';
    }

    // tier chip
    var tierChip =
      '<span style="display:inline-flex;align-items:center;gap:5px;' +
      'background:rgba(255,255,255,0.18);padding:3px 10px 3px 8px;border-radius:999px;' +
      'font-size:11.5px;font-weight:800;white-space:nowrap;backdrop-filter:blur(4px)">' +
      '<span style="color:' + esc(tier.color) + ';font-size:11px">⬤</span>' +
      esc(tier.name) + '</span>';

    // points block (right side)
    var pointsBlock =
      '<div style="text-align:right;flex:0 0 auto;padding-left:12px">' +
        '<div class="num" style="font-size:28px;font-weight:900;line-height:1">' +
          esc(String(pts)) +
        '</div>' +
        '<div style="font-size:11px;opacity:.8;font-weight:700;margin-top:1px">' +
          '&#x1F511; Keys' +
        '</div>' +
        '<div style="font-size:13px;font-weight:800;margin-top:6px;' +
        'background:rgba(255,255,255,0.15);padding:3px 8px;border-radius:8px">' +
          '£' + esc(money(wallet).replace('£', '')) +
        '</div>' +
        '<div style="font-size:10px;opacity:.7;font-weight:600;margin-top:2px">Wallet</div>' +
      '</div>';

    return (
      '<div class="hero" style="background:linear-gradient(135deg,#14181f 0%,#1455c0 100%);' +
      'border-radius:0 0 28px 28px;margin-bottom:4px;padding:20px 18px 18px">' +
        // avatar + name row
        '<div style="display:flex;align-items:flex-start;gap:0">' +
          '<div style="flex:1 1 auto;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">' +
              // avatar circle
              '<div style="width:50px;height:50px;border-radius:50%;' +
              'background:linear-gradient(135deg,var(--gold),#e08a00);' +
              'color:#14181f;display:grid;place-items:center;font-size:17px;' +
              'font-weight:900;flex:0 0 auto;box-shadow:0 4px 14px rgba(243,178,27,0.45);' +
              'letter-spacing:0">' + av + '</div>' +
              // name + email
              '<div style="min-width:0">' +
                '<div style="font-size:18px;font-weight:900;letter-spacing:-.3px;' +
                'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + nameSafe + '</div>' +
                '<div style="font-size:12px;opacity:.75;margin-top:2px;' +
                'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + email + '</div>' +
              '</div>' +
            '</div>' +
            tierChip +
          '</div>' +
          pointsBlock +
        '</div>' +
        progressBar +
      '</div>'
    );
  }

  // ---- language note (accurate, never cringe-y) ----
  function getLangNote(lang) {
    if (lang === 'yan') {
      return '¿Qué tal, mate? Llanito is Gibraltar’s cherished heritage tongue — ' +
        'Andalusian Spanish and British English woven together mid-sentence, with Genoese, ' +
        'Maltese and Haketía sprinkled in. A declining mother tongue, but very much the ' +
        'heart of Gibraltarian identity. “Liqueribá” for liquorice, “chinga” for ' +
        'chewing gum, “Focona” for the border — a whole world in a single sentence.';
    }
    if (lang === 'es') {
      return 'Rockway disponible en español. La comunidad gibraltareña es ' +
        'bilingüe por naturaleza: el español conecta la ciudad con la región ' +
        'y con los miles de trabajadores fronterizos que cruzan La Focona cada día.';
    }
    return 'Gibraltar speaks English, Spanish and its own cherished tongue — ' +
      'Llanito (Yanito). Switch to Llanito for a taste of home, or Español ' +
      'to connect with the wider Bay of Gibraltar community.';
  }

  // ---- "Your Rockway in numbers" stat grid ----
  function renderStats() {
    var orders  = (RW.S.orders  || []).length;
    var pts     = typeof RW.S.points === 'number' ? RW.S.points : 0;
    var saved   = (RW.S.savedProperties || []).length +
                  (RW.S.savedListings   || []).length;
    var tickets = (RW.S.tickets || []).length;

    function stat(icon, num, label) {
      return '<div class="stat" style="text-align:center">' +
        '<div style="font-size:20px;line-height:1;margin-bottom:4px">' + icon + '</div>' +
        '<div class="n num" style="font-size:20px">' + esc(String(num)) + '</div>' +
        '<div class="l">' + esc(label) + '</div>' +
      '</div>';
    }

    return '<div class="grid2" style="margin-bottom:4px;grid-template-columns:repeat(4,1fr)">' +
      stat('🛒', orders,  'Orders')   +
      stat('🔑', pts,     'Keys')     +
      stat('👍', saved,   'Saved')    +
      stat('🎫', tickets, 'Tickets')  +
    '</div>';
  }

  // ---- notifications toggle rows (Frontier alerts sub-toggle) ----
  function renderNotifRows() {
    var notifsOn   = RW.S.notificationsOn  !== false;   // default true
    var frontierOn = RW.S.frontierAlertsOn !== false;   // default true

    function toggleBtn(act, on) {
      return '<button style="display:inline-block;width:40px;height:24px;border-radius:12px;' +
        'background:' + (on ? 'var(--brand)' : 'var(--mist)') + ';' +
        'position:relative;flex:0 0 auto;transition:background .2s;cursor:pointer;border:0;' +
        'vertical-align:middle" data-act="' + act + '">' +
        '<span style="position:absolute;top:4px;' + (on ? 'right:4px' : 'left:4px') + ';' +
        'width:16px;height:16px;border-radius:50%;background:#fff;' +
        'box-shadow:0 1px 4px rgba(0,0,0,.18);transition:right .2s,left .2s"></span>' +
        '</button>';
    }

    var notifRow =
      '<div class="row">' +
        '<div class="lead" style="background:var(--brand-soft)">&#x1F514;</div>' +
        '<div class="body">' +
          '<div class="name">Notifications</div>' +
          '<div class="sub">Order updates, reminders &amp; offers</div>' +
        '</div>' +
        '<div class="trail">' + toggleBtn('accountToggleNotifs', notifsOn) + '</div>' +
      '</div>';

    var dimStyle = notifsOn ? '' : 'opacity:.4;pointer-events:none;';
    var frontierRow =
      '<div class="row" style="' + dimStyle + '">' +
        '<div class="lead" style="background:var(--sea-soft)">&#x1F6A8;</div>' +
        '<div class="body">' +
          '<div class="name">Frontier alerts</div>' +
          '<div class="sub">Live border wait times from La Focona</div>' +
        '</div>' +
        '<div class="trail">' + toggleBtn('accountToggleFrontier', frontierOn) + '</div>' +
      '</div>';

    return notifRow + frontierRow;
  }

  // ---- settings rows ----
  function renderSettingsRows() {
    return (
      RW.ui.row({
        lead: '💳', leadBg: '#e3f7ec',
        name: 'Payment methods',
        sub: 'Visa ·42 · Rockway Wallet (GIP)',
        trail: '<span class="muted">›</span>',
      }) +
      RW.ui.row({
        lead: '🏠', leadBg: '#e6effc',
        name: 'Saved addresses',
        sub: '12 Main Street, Gibraltar · + 1 more',
        trail: '<span class="muted">›</span>',
      }) +
      RW.ui.row({
        lead: '🛟', leadBg: '#fff4d6',
        name: 'Help &amp; support',
        sub: 'Chat · call · FAQ — Rock-based support team',
        trail: '<span class="muted">›</span>',
      }) +
      RW.ui.row({
        lead: 'ℹ️', leadBg: '#f5f6f9',
        name: 'About Rockway',
        sub: 'Gibraltar’s everything app · v1.0 · 🔑 Key to the Mediterranean',
        trail: '<span class="muted">›</span>',
      })
    );
  }

  function render() {
    var lang     = RW.S.lang || 'en';
    var langNote = getLangNote(lang);

    var segBtns = LANGS.map(function (l) {
      return '<button class="' + (lang === l.v ? 'on' : '') +
        '" data-act="setLang" data-v="' + l.v + '">' + l.label + '</button>';
    }).join('');

    // current lang pill label
    var currentLangLabel = (LANGS.find(function (l) { return l.v === lang; }) || LANGS[0]).label;

    var body =
      // ---- numbers ----
      RW.ui.sectionTitle('Your Rockway in numbers') +
      renderStats() +

      // ---- language ----
      RW.ui.sectionTitle('Language') +
      '<div class="seg" style="margin-bottom:10px">' + segBtns + '</div>' +
      '<div style="display:flex;align-items:flex-start;gap:8px;' +
      'background:var(--white);border-radius:var(--radius-sm);padding:11px 13px;' +
      'box-shadow:var(--shadow-sm);margin-bottom:4px">' +
        '<span style="font-size:15px;flex:0 0 auto;margin-top:1px">💬</span>' +
        '<p style="margin:0;font-size:12px;color:var(--ash);line-height:1.6">' +
          esc(langNote) +
        '</p>' +
      '</div>' +

      // ---- notifications ----
      RW.ui.sectionTitle('Notifications') +
      '<div class="card" style="padding:4px 14px">' + renderNotifRows() + '</div>' +

      // ---- account settings ----
      RW.ui.sectionTitle('Account') +
      '<div class="card" style="padding:4px 14px">' + renderSettingsRows() + '</div>' +

      // ---- reset + footer ----
      '<div style="margin-top:24px;text-align:center">' +
        '<button class="btn ghost sm" style="max-width:200px;margin:0 auto" data-act="resetDemo">' +
          'Reset demo data' +
        '</button>' +
      '</div>' +
      '<div class="muted tiny" style="text-align:center;margin-top:16px;line-height:1.7;padding-bottom:4px">' +
        'Rockway · Gibraltar’s everything app<br>' +
        '🔑 Key to the Mediterranean · GX11 1AA<br>' +
        '<span style="opacity:.7">As long as the keys remain on the Rock…</span>' +
      '</div>';

    return RW.ui.screen({
      title: 'Account',
      plain: true,
      tab: 'account',
      hero: renderHero(),
      body: body,
      fab: false,
    });
  }

  RW.register({
    id: 'account',
    title: 'Account',
    emoji: '⚙️',
    showTile: false,
    render: render,
    actions: {
      setLang: function (el) {
        RW.S.lang = el.dataset.v;
        RW.store.save();
        var labels = {
          en:  'English selected',
          es:  'Español seleccionado',
          yan: '¿Qué tal, mate! Llanito it is',
        };
        RW.toast(labels[RW.S.lang] || 'Language updated');
        RW.render();
      },
      resetDemo: function () {
        if (confirm('Reset all Rockway demo data? This cannot be undone.')) {
          RW.store.reset();
          RW.go('#/');
          RW.render();
          RW.toast('Demo data reset — fresh start!');
        }
      },
      accountToggleNotifs: function () {
        RW.S.notificationsOn = !(RW.S.notificationsOn !== false);
        RW.store.save();
        RW.toast(RW.S.notificationsOn ? 'Notifications on' : 'Notifications off');
        RW.render();
      },
      accountToggleFrontier: function () {
        if (RW.S.notificationsOn === false) return;
        RW.S.frontierAlertsOn = !(RW.S.frontierAlertsOn !== false);
        RW.store.save();
        var msg = RW.S.frontierAlertsOn
          ? 'Frontier alerts on — La Focona times live'
          : 'Frontier alerts off';
        RW.toast(msg);
        RW.render();
      },
    },
  });
})(window.RW);
