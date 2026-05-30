/* Rockway feature — Account (profile, language, settings). */
(function (RW) {
  'use strict';
  const { esc, money } = RW.util;

  // ---- tier look-up (mirrors rewards.js thresholds — no import needed) ----
  var TIERS = [
    { name: 'Bronze Key', min: 0,    color: '#cd7f32' },
    { name: 'Silver Key', min: 250,  color: '#8e8e8e' },
    { name: 'Gold Key',   min: 750,  color: '#cfb53b' },
    { name: 'Rock Elite', min: 1500, color: '#a50d20' },
  ];
  function getTier(pts) {
    var t = TIERS[0];
    for (var i = 0; i < TIERS.length; i++) {
      if (pts >= TIERS[i].min) t = TIERS[i];
    }
    return t;
  }

  // ---- language display data ----
  var LANGS = [
    ['en',  '\u{1F1EC}\u{1F1E7} English'],
    ['es',  '\u{1F1EA}\u{1F1F8} Español'],
    ['yan', '\u{1F1EC}\u{1F1EE} Llanito'],
  ];

  // ---- build the profile hero (key motif, name, email, points + tier chip) ----
  function renderHero() {
    var pts   = typeof RW.S.points === 'number' ? RW.S.points : 0;
    var tier  = getTier(pts);
    var email = esc(RW.userEmail || 'hello@rockway.gi');
    var name  = esc(RW.S.name || 'Gibraltarian');

    // tier chip injected as raw HTML into the hero via the sub slot trick:
    // we build the whole block ourselves so we can include the chip + points
    var tierChip =
      '<span style="display:inline-flex;align-items:center;gap:5px;' +
      'background:rgba(255,255,255,0.22);padding:3px 10px;border-radius:999px;' +
      'font-size:12px;font-weight:800;white-space:nowrap;">' +
      '<span style="color:' + esc(tier.color) + ';font-size:13px">⬤</span> ' +
      esc(tier.name) + '</span>';

    var pointsBlock =
      '<div style="text-align:right;margin-left:auto;padding-left:14px;flex:0 0 auto">' +
        '<div class="num" style="font-size:26px;font-weight:900;line-height:1">' +
          esc(String(pts)) + ' <span style="font-size:18px">🔑</span>' +
        '</div>' +
        '<div style="font-size:11px;opacity:.85;margin-top:3px;font-weight:700">Keys</div>' +
      '</div>';

    return (
      '<div class="hero" style="background:linear-gradient(135deg,#14181f 0%,#1455c0 100%);' +
      'border-radius:0 0 28px 28px;margin-bottom:4px">' +
        '<div style="display:flex;align-items:flex-start;gap:0">' +
          '<div style="flex:1 1 auto;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
              '<div style="width:46px;height:46px;border-radius:14px;background:var(--gold);' +
              'color:var(--brand-dark);display:grid;place-items:center;font-size:22px;' +
              'flex:0 0 auto;box-shadow:0 4px 14px rgba(243,178,27,0.45)">🔑</div>' +
              '<div style="min-width:0">' +
                '<div style="font-size:18px;font-weight:900;letter-spacing:-.3px;' +
                'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name + '</div>' +
                '<div style="font-size:12px;opacity:.8;margin-top:1px">' + email + '</div>' +
              '</div>' +
            '</div>' +
            tierChip +
          '</div>' +
          pointsBlock +
        '</div>' +
      '</div>'
    );
  }

  // ---- language note (accurate, never cringe-y) ----
  function getLangNote(lang) {
    if (lang === 'yan') {
      return '¡Ozú! Llanito is Gibraltar’s cherished heritage tongue — ' +
        'Andalusian Spanish and British English woven together, with Genoese, Maltese and ' +
        'Haketia sprinkled in. A declining mother tongue, but very much the heart of ' +
        'Gibraltarian identity. ¿Qué tal, mate?';
    }
    if (lang === 'es') {
      return 'App disponible en español. Rockway sirve a toda la comunidad gibraltareña, ' +
        'incluyendo a los trabajadores fronterizos de la región.';
    }
    return 'Gibraltar speaks English, Spanish, and its own tongue — Llanito (Yanito). ' +
      'Switch to Llanito for a taste of home.';
  }

  // ---- "Your Rockway in numbers" stat grid ----
  function renderStats() {
    var orders  = (RW.S.orders  || []).length;
    var pts     = typeof RW.S.points === 'number' ? RW.S.points : 0;
    var saved   = (RW.S.savedProperties || []).length + (RW.S.savedListings || []).length;
    var tickets = (RW.S.tickets || []).length;

    function stat(num, label) {
      return '<div class="stat">' +
        '<div class="n num">' + esc(String(num)) + '</div>' +
        '<div class="l">' + esc(label) + '</div>' +
      '</div>';
    }

    return '<div class="grid2" style="margin-bottom:4px">' +
      stat(orders,  'Orders placed') +
      stat(pts,     'Keys earned') +
      stat(saved,   'Items saved') +
      stat(tickets, 'Tickets held') +
    '</div>';
  }

  // ---- notifications toggle row (Frontier alerts sub-toggle) ----
  function renderNotifRows() {
    var notifsOn   = RW.S.notificationsOn   !== false;   // default true
    var frontierOn = RW.S.frontierAlertsOn  !== false;   // default true

    var toggleStyle = function (on) {
      return 'display:inline-block;width:38px;height:22px;border-radius:11px;' +
        'background:' + (on ? 'var(--brand)' : 'var(--mist)') + ';' +
        'position:relative;flex:0 0 auto;transition:background .2s;cursor:pointer;border:0';
    };
    var knobStyle = function (on) {
      return 'position:absolute;top:3px;' + (on ? 'right:3px' : 'left:3px') + ';' +
        'width:16px;height:16px;border-radius:50%;background:#fff;' +
        'box-shadow:0 1px 4px rgba(0,0,0,.18);transition:right .2s,left .2s;';
    };

    function toggleBtn(act, on) {
      return '<button style="' + toggleStyle(on) + '" data-act="' + act + '">' +
        '<span style="' + knobStyle(on) + '"></span></button>';
    }

    var notifRow =
      '<div class="row">' +
        '<div class="lead" style="background:var(--brand-soft);font-size:22px">🔔</div>' +
        '<div class="body">' +
          '<div class="name">Notifications</div>' +
          '<div class="sub">Order updates, reminders, alerts</div>' +
        '</div>' +
        '<div class="trail">' + toggleBtn('accountToggleNotifs', notifsOn) + '</div>' +
      '</div>';

    var frontierRow =
      '<div class="row" style="' + (notifsOn ? '' : 'opacity:.45;pointer-events:none') + '">' +
        '<div class="lead" style="background:var(--sea-soft);font-size:22px">🚨</div>' +
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
      RW.ui.row({ lead: '💳', leadBg: '#e3f7ec', name: 'Payment methods',
        sub: 'Visa ·42 · Rockway Wallet', trail: '<span class="muted">›</span>' }) +
      RW.ui.row({ lead: '🏠', leadBg: '#e6effc', name: 'Saved addresses',
        sub: '12 Main Street + 1 more', trail: '<span class="muted">›</span>' }) +
      RW.ui.row({ lead: '🛟', leadBg: '#fff4d6', name: 'Help & support',
        sub: 'Chat · call · FAQ — Gibraltar support', trail: '<span class="muted">›</span>' }) +
      RW.ui.row({ lead: 'ℹ️',  leadBg: '#f5f6f9', name: 'About Rockway',
        sub: 'Gibraltar’s everything app · v1.0 · 🔑 Key to the Mediterranean',
        trail: '<span class="muted">›</span>' })
    );
  }

  function render() {
    var lang     = RW.S.lang || 'en';
    var langNote = getLangNote(lang);

    var segBtns = LANGS.map(function (l) {
      return '<button class="' + (lang === l[0] ? 'on' : '') +
        '" data-act="setLang" data-v="' + l[0] + '">' + l[1] + '</button>';
    }).join('');

    var body =
      RW.ui.sectionTitle('Your Rockway in numbers') +
      renderStats() +

      RW.ui.sectionTitle('Language') +
      '<div class="seg">' + segBtns + '</div>' +
      '<div class="muted tiny" style="margin-top:8px;line-height:1.55">' +
        esc(langNote) +
      '</div>' +

      RW.ui.sectionTitle('Notifications') +
      '<div class="card">' + renderNotifRows() + '</div>' +

      RW.ui.sectionTitle('Account') +
      '<div class="card">' + renderSettingsRows() + '</div>' +

      '<button class="btn ghost" style="margin-top:20px" data-act="resetDemo">' +
        'Reset demo data' +
      '</button>' +
      '<div class="muted tiny" style="text-align:center;margin-top:18px;line-height:1.6">' +
        'Rockway · Gibraltar’s everything app<br>' +
        'As long as the Keys remain on the Rock… 🔑' +
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
        var labels = { en: 'English selected', es: 'Español seleccionado', yan: '¡Llanito, mate!' };
        RW.toast(labels[RW.S.lang] || 'Language updated');
        RW.render();
      },
      resetDemo: function () {
        if (confirm('Reset all Rockway demo data?')) {
          RW.store.reset();
          RW.go('#/');
          RW.render();
          RW.toast('Demo data reset');
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
        RW.toast(RW.S.frontierAlertsOn ? 'Frontier alerts on' : 'Frontier alerts off');
        RW.render();
      },
    },
  });
})(window.RW);
