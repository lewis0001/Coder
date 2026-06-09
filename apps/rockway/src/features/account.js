/* Rockway feature — Account (profile, language, notification prefs, saved
 * addresses, help & about). No wallet/points. Sub-screens: #/account/help and
 * #/account/about (back button uses history, so it returns where you came from). */
(function (RW) {
  'use strict';
  const { esc, uid } = RW.util;

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

  // ---- notification preferences (defaults: bookings on, the rest opt-in) ----
  const PREFS = [
    { k: 'notifBookings', def: true, name: 'Booking updates', sub: 'Confirmations & changes to your requests' },
    { k: 'notifFrontier', def: false, name: 'Frontier reports digest', sub: 'Morning summary of community queue reports' },
    { k: 'notifEvents', def: false, name: 'What’s On weekly', sub: 'The week’s events on the Rock, every Monday' },
  ];

  function prefOn(k) {
    const p = RW.S.prefs || {};
    if (p[k] == null) {
      const d = PREFS.find((x) => x.k === k);
      return !!(d && d.def);
    }
    return !!p[k];
  }

  // Pure-CSS switch from spans: ink track when on, mist when off, white knob.
  function toggle(k) {
    const on = prefOn(k);
    return '<span role="switch" aria-checked="' + (on ? 'true' : 'false') + '" data-act="accountToggle" data-k="' + k + '"' +
      ' style="display:inline-block;flex:0 0 auto;width:44px;height:26px;border-radius:999px;cursor:pointer;position:relative;background:' +
      (on ? 'var(--ink)' : 'var(--mist)') + '">' +
      '<span style="position:absolute;top:3px;' + (on ? 'right:3px' : 'left:3px') +
      ';width:20px;height:20px;border-radius:50%;background:var(--white);box-shadow:var(--shadow-sm)"></span></span>';
  }

  function prefRows() {
    return PREFS.map((p) =>
      '<div class="row"><div class="body"><div class="name">' + esc(p.name) + '</div>' +
      '<div class="sub">' + esc(p.sub) + '</div></div>' +
      '<div class="trail">' + toggle(p.k) + '</div></div>').join('');
  }

  // ---- saved addresses ----
  function addrEmoji(label) {
    const l = (label || '').toLowerCase();
    if (l.indexOf('home') > -1 || l.indexOf('casa') > -1) return '🏠';
    if (l.indexOf('work') > -1 || l.indexOf('office') > -1) return '💼';
    return '📍';
  }

  function addressesCard() {
    const list = RW.S.addresses || [];
    const rows = list.map((a) => RW.ui.row({
      lead: addrEmoji(a.label), leadBg: 'var(--sea-soft)', name: a.label || 'Address', sub: a.line || '',
      trail: '<button class="btn sm ghost" style="padding:5px 12px;font-size:15px;line-height:1" data-act="accountDelAddr" data-id="' + esc(a.id) + '" aria-label="Remove address">×</button>',
    })).join('');
    const empty = '<div class="muted tiny" style="padding:2px 0 4px;line-height:1.5">No addresses yet — add Home or Work so mobile services (groomers, trades, cleaners) know where to come.</div>';
    return '<div class="card">' + (list.length ? rows : empty) +
      '<div style="margin-top:10px"><button class="btn sm sea" data-act="accountAddAddr">+ Add address</button></div></div>';
  }

  // ---- profile hero ----
  function hero() {
    const name = RW.S.name || 'Gibraltarian';
    const email = RW.userEmail || 'hello@rockway.gi';
    const isBiz = !!RW.S.myBusiness;
    return '<div class="hero" style="background:linear-gradient(135deg,var(--ink),var(--sea));border-radius:0 0 28px 28px">' +
      '<div style="display:flex;align-items:center;gap:14px">' +
      '<div style="width:54px;height:54px;border-radius:50%;background:var(--gold);color:var(--ink);display:grid;place-items:center;font-size:18px;font-weight:900;flex:0 0 auto">' + esc(initials(name)) + '</div>' +
      '<div style="min-width:0;flex:1 1 auto">' +
      '<div style="display:flex;align-items:center;gap:8px;min-width:0">' +
      '<div style="font-size:19px;font-weight:900;letter-spacing:-.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(name) + '</div>' +
      '<button data-act="accountEditName" aria-label="Edit name" title="Edit name" style="flex:0 0 auto;width:26px;height:26px;padding:0;border:0;border-radius:9px;background:rgba(255,255,255,.16);color:#fff;font-size:13px;cursor:pointer;display:grid;place-items:center">✎</button></div>' +
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

  // ---- Help & support sub-screen (#/account/help) ----
  const FAQS = [
    { q: 'How do bookings work?', a: 'Pick a business in Discover, choose a service and a time, and send the request — it’s free. The business confirms (watch the Bookings tab) and you pay them in person. Rockway never takes payment in the app.' },
    { q: 'Is my data shared?', a: 'No. For now everything — your name, bookings, addresses, preferences — stays on this device in local storage. Nothing is uploaded or shared; online accounts arrive with the app release.' },
    { q: 'How do I list my business?', a: 'Tap “List your business” under For business on the Account screen. Onboarding takes a couple of minutes — name, category, services, hours — and booking requests come straight to you.' },
    { q: 'Is Rockway free?', a: 'Yes. Free for customers, and free for businesses to list and take bookings. If paid extras ever arrive (like featured placement), the basics stay free.' },
  ];
  let faqOpen = -1; // UI-only accordion state

  function renderHelp() {
    const faq = '<div class="card">' + FAQS.map((f, i) => {
      const open = faqOpen === i;
      return '<div class="row" style="display:block;cursor:pointer" data-act="accountFaq" data-i="' + i + '">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<div class="name" style="flex:1 1 auto;font-weight:700;font-size:14.5px">' + esc(f.q) + '</div>' +
        '<span class="muted" style="flex:0 0 auto;font-weight:800;font-size:16px">' + (open ? '−' : '+') + '</span></div>' +
        (open ? '<div class="muted" style="font-size:13px;line-height:1.55;margin-top:7px">' + esc(f.a) + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
    const body =
      RW.ui.sectionTitle('FAQ') + faq +
      RW.ui.sectionTitle('Still stuck?') +
      '<div class="card"><div class="muted tiny" style="line-height:1.5;margin-bottom:10px">Rockway is built on the Rock by a tiny team — email us and a human replies, usually within a day.</div>' +
      '<a class="btn ghost" href="mailto:hello@rockway.gi" style="text-decoration:none">✉️ Email us — hello@rockway.gi</a></div>';
    return RW.ui.screen({ title: 'Help & support', tab: 'account', body });
  }

  // ---- About sub-screen (#/account/about) ----
  function renderAbout() {
    const kv = (k, v) => '<div class="kv"><span class="muted">' + esc(k) + '</span><span style="font-weight:600;text-align:right">' + esc(v) + '</span></div>';
    const body =
      '<div class="card" style="text-align:center;padding:22px 16px">' +
      '<div style="font-size:40px">🔑</div>' +
      '<div class="display" style="font-size:22px;font-weight:600;margin-top:6px">Rockway</div>' +
      '<div class="muted tiny" style="margin-top:2px">Gibraltar’s local marketplace · <span class="num">v2.0</span></div></div>' +
      RW.ui.sectionTitle('The story') +
      '<div class="card"><p style="margin:0;font-size:13.5px;line-height:1.6;color:var(--slate)">Built for the Rock. Rockway set out as Gibraltar’s “everything app” and was deliberately pared back to what a small local team can run honestly: finding and booking real local businesses — pay in person, no wallet — plus the community pieces that work without big operations: frontier reports from people actually in the queue, local news, What’s On, classifieds, jobs and property. If a feature can’t be real in Gibraltar, it isn’t in the app.</p></div>' +
      RW.ui.sectionTitle('Data sources') +
      '<div class="card">' +
      kv('Weather', 'Open-Meteo') +
      kv('News', 'Gibraltar Chronicle (headlines & links)') +
      kv('Flights', 'gibraltarairport.gi') +
      kv('Holidays', 'Nager.Date') +
      '<div class="muted" style="font-size:11.5px;margin-top:8px;line-height:1.5">Fetched read-only with caching; everything else lives on this device.</div></div>' +
      RW.ui.sectionTitle('Demo data') +
      '<button class="btn ghost" data-act="resetDemo">Reset demo data</button>' +
      '<div class="muted tiny" style="margin-top:8px">Clears bookings, addresses and preferences stored on this device.</div>' +
      '<div class="muted tiny" style="text-align:center;margin-top:16px">Rockway · 🔑 Key to the Mediterranean</div>';
    return RW.ui.screen({ title: 'About Rockway', tab: 'account', body });
  }

  // ---- main screen ----
  function renderMain() {
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
      RW.ui.sectionTitle('Notifications') +
      '<div class="card">' + prefRows() + '</div>' +
      '<div class="muted tiny" style="margin-top:8px">Push notifications arrive with the app release — preferences saved for then.</div>' +
      RW.ui.sectionTitle('Saved addresses') + addressesCard() +
      RW.ui.sectionTitle('Support') + '<div class="card">' +
      RW.ui.row({ lead: '🛟', leadBg: 'var(--gold-soft)', name: 'Help & support', sub: 'FAQ · email us — hello@rockway.gi', trail: '<span class="muted">›</span>', route: '#/account/help' }) +
      RW.ui.row({ lead: 'ℹ️', leadBg: 'var(--cloud)', name: 'About Rockway', sub: 'The story · data sources · v2.0', trail: '<span class="muted">›</span>', route: '#/account/about' }) +
      '</div>' +
      '<div class="muted tiny" style="text-align:center;margin-top:16px">Rockway · 🔑 Key to the Mediterranean</div>';
    return RW.ui.screen({ title: 'Account', plain: true, tab: 'account', hero: hero(), body });
  }

  function render(parts) {
    parts = parts || [];
    if (parts[0] === 'help') return renderHelp();
    if (parts[0] === 'about') return renderAbout();
    return renderMain();
  }

  RW.register({
    id: 'account', title: 'Account', emoji: '⚙️', showTile: false, render,
    actions: {
      setLang: (el) => { RW.S.lang = el.dataset.v; RW.store.save(); RW.toast('Language updated'); RW.render(); },
      resetDemo: () => { if (confirm('Reset all Rockway demo data?')) { RW.store.reset(); RW.go('#/'); RW.render(); RW.toast('Demo data reset'); } },
      accountEditName: () => {
        const v = prompt('Your name:', RW.S.name || 'Gibraltarian');
        if (v == null) return;
        const name = v.trim().slice(0, 40);
        if (!name) return;
        RW.S.name = name;
        RW.store.save(); RW.toast('Name updated'); RW.render();
      },
      accountToggle: (el) => {
        RW.S.prefs = RW.S.prefs || {};
        RW.S.prefs[el.dataset.k] = !prefOn(el.dataset.k);
        RW.store.save(); RW.render();
      },
      accountAddAddr: () => {
        const label = prompt('Label this address (Home, Work…):', 'Home');
        if (label == null || !label.trim()) return;
        const line = prompt('Address line (e.g. 12/4 Main Street, GX11 1AA):', '');
        if (line == null || !line.trim()) return;
        RW.S.addresses = RW.S.addresses || [];
        RW.S.addresses.push({ id: uid(), label: label.trim().slice(0, 24), line: line.trim().slice(0, 80) });
        RW.store.save(); RW.toast('Address saved'); RW.render();
      },
      accountDelAddr: (el) => {
        RW.S.addresses = (RW.S.addresses || []).filter((a) => a.id !== el.dataset.id);
        RW.store.save(); RW.toast('Address removed'); RW.render();
      },
      accountFaq: (el) => {
        const i = parseInt(el.dataset.i, 10);
        faqOpen = faqOpen === i ? -1 : i;
        RW.render();
      },
    },
  });
})(window.RW);
