/* Rockway feature — Visiting Gibraltar (cruise & day-trip planner).
 * The headline is the "I have X hours" planner: a curated itinerary engine
 * greedy-fills the visitor's shore time from honest, owned blocks (town →
 * Upper Rock → Europa/Catalan), always keeping a 45-min get-back buffer.
 * A live context strip composes frontier word + weather + runway closures +
 * GI holidays; a Tickets card links the OFFICIAL Nature Reserve price first,
 * resellers clearly labelled; a verified practical pack covers border/EES,
 * money, apes law, eSIM, sockets and pointers to Weather & Move.
 * Research: docs/research/ideas/tourism.md (§C planner, §A tickets, §H pack). */
(function (RW) {
  'use strict';
  const { esc } = RW.util;

  /* ---------------- safe live/api access ---------------- */
  function live(name) { try { return RW.live ? RW.live.get(name) : null; } catch (e) { return null; } }
  function liveSt(name) { try { return RW.live ? RW.live.status(name) : 'fail'; } catch (e) { return 'fail'; } }
  function gibToday() {
    try { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Gibraltar' }); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }

  /* ---------------- itinerary engine (curated, owned here) ----------------
   * Each block: { id, name, area, mins, ord (display order), pri (selection
   * priority), note, free?, mustSee?, ticket? (Nature Reserve pass),
   * requires? (only schedule if that block made the plan), minHours? }.
   * The cable car is CLOSED for refurbishment (expected ~2027) — it is never
   * offered; the taxi rock-tour is the honest way up. */
  const BUFFER_MIN = 45;
  const BLOCKS = [
    { id: 'casemates', name: 'Casemates Square', area: 'Town', mins: 30, ord: 10, pri: 1, free: true,
      note: 'Grand Casemates Gates, café terraces and the start of Main Street.' },
    { id: 'mainst', name: 'Main Street stroll', area: 'Town', mins: 45, ord: 20, pri: 2, free: true,
      note: 'Duty-free shops, the Cathedral and the Convent — Gibraltar in one walk.' },
    { id: 'rocktour', name: 'Upper Rock taxi rock-tour', area: 'Upper Rock', mins: 150, ord: 30, pri: 0, mustSee: true, ticket: true,
      note: 'Shared taxi-van up the Rock: Apes’ Den, Pillars of Hercules viewpoint and the big panoramas. The cable car is closed for refurbishment (expected ~2027), so the rock-tour is the way up.' },
    { id: 'cave', name: 'St Michael’s Cave', area: 'Upper Rock', mins: 45, ord: 40, pri: 4, ticket: true, requires: 'rocktour',
      note: 'The illuminated Cathedral Cave — included in the Nature Reserve ticket.' },
    { id: 'siege', name: 'Great Siege Tunnels', area: 'Upper Rock', mins: 60, ord: 50, pri: 5, ticket: true, requires: 'rocktour',
      note: 'Defence galleries hand-carved into the Rock in 1779–83 — in the reserve ticket.' },
    { id: 'skywalk', name: 'Skywalk + Windsor Bridge', area: 'Upper Rock', mins: 45, ord: 60, pri: 6, ticket: true, requires: 'rocktour',
      note: 'Glass platform 340 m up, then the suspension bridge — in the reserve ticket.' },
    { id: 'moorish', name: 'Moorish Castle', area: 'Upper Rock', mins: 30, ord: 70, pri: 7, ticket: true,
      note: 'The Tower of Homage (1333) — an easy stop on the walk back down to town.' },
    { id: 'lunch', name: 'Lunch stop', area: 'Town / marina', mins: 60, ord: 75, pri: 3, minHours: 5,
      note: 'Casemates terraces, Irish Town or Ocean Village — you pay the venue directly.' },
    { id: 'europa', name: 'Europa Point', area: 'South', mins: 60, ord: 80, pri: 8, free: true,
      note: 'Lighthouse, mosque and — on a clear day — Africa across the Strait. Includes the ride on bus 2.' },
    { id: 'catalan', name: 'Catalan Bay', area: 'East side', mins: 60, ord: 90, pri: 9, free: true,
      note: 'The old fishing-village cove under the east face — La Caleta.' },
  ];

  // Greedy fill: must-sees first, then by priority; respects requires/minHours;
  // always leaves the 45-min buffer inside the selected window.
  function buildPlan(totalMin) {
    const budget = totalMin - BUFFER_MIN;
    const chosen = [];
    let used = 0;
    const has = (id) => chosen.some((b) => b.id === id);
    const tryAdd = (b) => {
      if (b.minHours && totalMin < b.minHours * 60) return;
      if (b.requires && !has(b.requires)) return;
      if (used + b.mins > budget) return;
      chosen.push(b);
      used += b.mins;
    };
    BLOCKS.filter((b) => b.mustSee).sort((a, b) => a.pri - b.pri).forEach(tryAdd);
    BLOCKS.filter((b) => !b.mustSee).sort((a, b) => a.pri - b.pri).forEach(tryAdd);
    chosen.sort((a, b) => a.ord - b.ord);
    return { blocks: chosen, used, budget, spare: budget - used };
  }

  // relative offsets — '0:00', '2:30' (counted from stepping ashore)
  function fmtOff(m) {
    m = Math.max(0, Math.round(m));
    return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  }
  function humanMins(m) {
    m = Math.max(0, Math.round(m));
    return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '');
  }

  /* ---------------- UI state (session only — nothing persisted) ---------------- */
  let hoursVal = '5';   // '3' | '5' | '8' | 'full'
  let packOpen = -1;    // practical-pack accordion index
  const HOURS = [
    { label: '3 hours', value: '3' },
    { label: '5 hours', value: '5' },
    { label: '8 hours', value: '8' },
    { label: 'Full day', value: 'full' },
  ];
  const totalMin = () => (hoursVal === 'full' ? 660 : parseInt(hoursVal, 10) * 60);
  const hoursLabel = () => (hoursVal === 'full' ? 'full-day' : hoursVal + '-hour');

  /* ---------------- live context strip ---------------- */
  function ctxRow(glyph, html, src) {
    return '<div style="display:flex;align-items:center;gap:9px;margin-top:8px;padding-top:8px;border-top:1px solid var(--line)">' +
      '<span style="font-size:15px;line-height:1;flex:0 0 auto">' + glyph + '</span>' +
      '<span style="flex:1;min-width:0;font-size:12.5px;line-height:1.45;color:var(--ink)">' + html +
      ' <span style="color:var(--fog);font-size:11px;white-space:nowrap">· ' + esc(src) + '</span></span></div>';
  }
  const ctxSkel = () =>
    '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)">' +
    '<div class="skel" style="height:12px;width:72%">&nbsp;</div></div>';

  function contextCard() {
    let rows = '';

    // frontier word — community model, never a fake minute count
    try {
      const c = RW.api && RW.api.frontier ? RW.api.frontier.community('in-foot') : null;
      if (c) {
        rows += ctxRow('🛂', 'Frontier on foot: <b>' + esc(c.word) + '</b>',
          c.fresh ? c.count + ' community report' + (c.count === 1 ? '' : 's') : 'typical pattern, no fresh reports');
      }
    } catch (e) { /* frontier module absent */ }

    // weather — live Open-Meteo when wired, seed otherwise
    if (liveSt('weather') === 'loading') {
      rows += ctxSkel();
    } else {
      let w = null;
      try { w = RW.api && RW.api.weather ? RW.api.weather() : null; } catch (e) {}
      if (w && w.tempC != null) {
        rows += ctxRow(w.emoji || '🌥️',
          '<b class="num">' + esc(String(w.tempC)) + '°C</b>' + (w.condition ? ' · ' + esc(String(w.condition)) : ''),
          live('weather') ? 'Open-Meteo' : 'typical conditions');
      }
    }

    // runway crossing — only if a closure is on now or within ~2 h
    if (liveSt('flights') === 'loading') {
      rows += ctxSkel();
    } else {
      try {
        const R = RW.api && RW.api.runway;
        if (R && typeof R.closedNow === 'function' && R.closedNow()) {
          rows += ctxRow('✈️', '<b style="color:var(--brand)">Runway crossing closed now</b> — aircraft movement', 'gibraltarairport.gi');
        } else if (R && typeof R.next === 'function') {
          const nx = R.next();
          if (nx && typeof nx.minsUntil === 'number' && nx.minsUntil >= 0 && nx.minsUntil <= 120) {
            rows += ctxRow('✈️', 'Runway crossing closes ~<b class="num">' + esc(nx.start || '') + '</b>' +
              (nx.flight ? ' · ' + esc(nx.flight) : '') + ' — pedestrians wait, cars use the tunnel', 'gibraltarairport.gi');
          }
        }
      } catch (e) { /* runway module absent */ }
    }

    // Gibraltar public holiday today — attractions/shops may differ
    if (liveSt('holidays') === 'loading') {
      rows += ctxSkel();
    } else {
      const hp = live('holidays');
      if (hp && hp.ok && Array.isArray(hp.gi)) {
        const today = gibToday();
        const h = hp.gi.find((x) => x && x.date === today);
        if (h) rows += ctxRow('🇬🇮', '<b>' + esc(h.name) + '</b> today — some shops & offices close', 'Nager.Date');
      }
    }

    if (!rows) rows = ctxRow('🪨', 'All quiet — nothing on the radar right now', 'Rockway');
    return '<div class="card">' +
      '<div style="font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ash)">Right now</div>' +
      rows + '</div>';
  }

  /* ---------------- planner timeline ---------------- */
  function planRow(n, b, start) {
    const pills = [];
    if (b.mustSee) pills.push('<span class="pill-status info">Must-see</span>');
    if (b.ticket) pills.push('<span class="pill-status neutral">🎟 Reserve ticket</span>');
    if (b.free) pills.push('<span class="pill-status ok">Free</span>');
    return '<div class="row">' +
      '<div class="lead num" style="width:34px;height:34px;border-radius:50%;font-size:14px;font-weight:800;color:var(--slate)">' + n + '</div>' +
      '<div class="body"><div class="name">' + esc(b.name) + '</div>' +
      '<div class="sub" style="line-height:1.45">' + esc(b.area) + ' · ' + esc(b.note) + '</div>' +
      (pills.length ? '<div class="chips" style="margin-top:6px">' + pills.join('') + '</div>' : '') + '</div>' +
      '<div class="trail" style="align-self:flex-start;padding-top:2px">' +
      '<div class="num" style="font-size:12.5px;font-weight:700">' + fmtOff(start) + '–' + fmtOff(start + b.mins) + '</div>' +
      '<div class="tiny num" style="color:var(--fog);font-weight:600">' + humanMins(b.mins) + '</div></div></div>';
  }

  function plannerSection() {
    const plan = buildPlan(totalMin());
    let t = 0;
    let rows = '';
    plan.blocks.forEach((b, i) => { rows += planRow(i + 1, b, t); t += b.mins; });

    // the non-negotiable get-back buffer
    rows += '<div class="row" style="border-bottom:none">' +
      '<div class="lead" style="width:34px;height:34px;border-radius:50%;font-size:16px">⛴️</div>' +
      '<div class="body"><div class="name">Buffer to get back — don’t miss the ship.</div>' +
      (plan.spare > 0
        ? '<div class="sub">Plus ~<span class="num">' + plan.spare + ' min</span> spare in the plan for wandering or a coffee.</div>'
        : '') + '</div>' +
      '<div class="trail" style="align-self:flex-start;padding-top:2px">' +
      '<div class="num" style="font-size:12.5px;font-weight:700">' + fmtOff(plan.used) + '–' + fmtOff(plan.used + BUFFER_MIN) + '</div>' +
      '<div class="tiny num" style="color:var(--fog);font-weight:600">' + BUFFER_MIN + ' min</div></div></div>';

    const ticketed = plan.blocks.some((b) => b.ticket);
    return RW.ui.sectionTitle('I have…') +
      RW.ui.chips(HOURS, hoursVal, 'visitHours') +
      '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">' +
      '<div style="font-weight:700;font-size:14.5px">Your ' + esc(hoursLabel()) + ' plan</div>' +
      '<div class="tiny num" style="color:var(--fog);font-weight:600;flex:0 0 auto">' + humanMins(plan.used) + ' planned</div></div>' +
      '<div class="muted tiny" style="margin:3px 0 4px">Times count from when you step ashore — timings are Rockway estimates.</div>' +
      rows +
      (ticketed ? '<div class="muted tiny" style="padding-top:8px;border-top:1px solid var(--line)">Stops marked 🎟 need the Nature Reserve ticket — see Tickets below.</div>' : '') +
      '</div>';
  }

  /* ---------------- tickets (official first, resellers labelled) ----------------
   * AFFILIATE: when partner accounts are approved (GetYourGuide via
   * partner.getyourguide.com, Viator via Travelpayouts, Tiqets partner
   * programme, Klook for eSIMs) the tracking/campaign IDs slot into these
   * reseller URLs. Never cache or invent reseller prices — link out only,
   * and always keep the cheaper official naturereserve.gi link on top. */
  const RESELLERS = [
    { name: 'GetYourGuide', url: 'https://www.getyourguide.com/s/?q=Gibraltar' },
    { name: 'Viator', url: 'https://www.viator.com/searchResults/all?text=Gibraltar' },
    { name: 'Tiqets', url: 'https://www.tiqets.com/en/search?q=Gibraltar' },
  ];

  function ticketsSection() {
    const resellers = RESELLERS.map((r) =>
      '<a class="chip" href="' + esc(r.url) + '" target="_blank" rel="noopener" style="text-decoration:none;color:var(--ink)">' +
      esc(r.name) + ' ↗</a>').join('');
    return RW.ui.sectionTitle('Tickets') +
      '<div class="card">' +
      '<div style="font-weight:700;font-size:14.5px">Upper Rock Nature Reserve pass</div>' +
      '<div class="muted tiny" style="margin-top:3px;line-height:1.5">One ticket covers St Michael’s Cave, Great Siege Tunnels, Skywalk, Windsor Bridge, Moorish Castle and more.</div>' +
      '<a class="btn sea" href="https://naturereserve.gi/tickets/" target="_blank" rel="noopener" style="margin-top:10px;text-decoration:none">' +
      'Official: naturereserve.gi — adult <span class="num">£30</span> ↗</a>' +
      '<div class="kv" style="margin-top:6px"><span class="muted">Child (5–11)</span><span class="num" style="font-weight:700">£22</span></div>' +
      '<div class="kv"><span class="muted">Under 5</span><span style="font-weight:700">Free</span></div>' +
      '<div class="muted tiny" style="margin-top:8px">Also on resellers — prices vary and usually sit above the official <span class="num">£30</span>:</div>' +
      '<div class="chips">' + resellers + '</div>' +
      '<div class="muted tiny" style="margin-top:8px">Official prices current for 2025–26 — always check naturereserve.gi before you sail.</div>' +
      '</div>';
  }

  /* ---------------- practical pack (verified facts) ---------------- */
  const PACK = [
    { q: 'Passport & the border', a: 'You need a valid passport to enter Gibraltar. At the land frontier the EU Entry/Exit System (EES) does <b>NOT</b> apply under the 2025 UK–EU treaty — no biometric kiosks here, even though EES runs at other Schengen borders.' },
    { q: 'Money', a: 'The Gibraltar pound is pegged <span class="num">1:1</span> with GBP and both circulate side by side. Cards are accepted everywhere; many places take euros, but at a worse rate. Spend Gibraltar notes before you leave — UK shops may refuse them.' },
    { q: 'The apes (Barbary macaques)', a: 'They are wild and protected. <b>Feeding is illegal — fines up to <span class="num">£4,000</span></b> — and touching them is an offence too. Keep food out of sight and hold on to bags; they know exactly what a carrier bag means.' },
    // AFFILIATE: eSIM links below also take partner IDs later (Airalo / Klook — see comment above RESELLERS).
    { q: 'Phone & data (eSIM)', a: 'Gibraltar is outside both UK and EU roaming zones, so your home SIM may surcharge here. A travel eSIM is the easy fix: <a href="https://www.airalo.com/gibraltar-esim" target="_blank" rel="noopener" style="color:var(--sea);font-weight:700;text-decoration:none">Airalo ↗</a> · <a href="https://www.klook.com/esim/" target="_blank" rel="noopener" style="color:var(--sea);font-weight:700;text-decoration:none">Klook eSIM ↗</a>' },
    { q: 'Language', a: 'English is official; Spanish is spoken everywhere, and in the street you will hear llanito — the local blend of both.' },
    { q: 'Plug sockets', a: 'UK 3-pin (Type G), <span class="num">230 V</span> — same as Britain, different from Spain. Bring an adapter if you came over from Europe.' },
    { q: 'Tides & beaches', a: 'Eastern Beach, Catalan Bay, Camp Bay and Sandy Bay. Check today’s sea state and tide times in <span class="link" data-act="nav" data-route="#/weather">Weather &amp; Sea</span>.' },
    { q: 'Getting around', a: 'Town is a 10–15 min walk end to end; buses <span class="num">1–4</span> are free for everyone. One licensed taxi fleet (GTA), no ride-hailing — see <span class="link" data-act="nav" data-route="#/move">Move</span>.' },
  ];

  function packSection() {
    const rows = PACK.map((f, i) => {
      const open = packOpen === i;
      return '<div class="row" style="display:block;cursor:pointer" data-act="visitPack" data-i="' + i + '">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<div class="name" style="flex:1 1 auto;font-weight:700;font-size:14.5px">' + esc(f.q) + '</div>' +
        '<span class="muted" style="flex:0 0 auto;font-weight:800;font-size:16px">' + (open ? '−' : '+') + '</span></div>' +
        (open ? '<div class="muted" style="font-size:13px;line-height:1.55;margin-top:7px">' + f.a + '</div>' : '') +
        '</div>';
    }).join('');
    return RW.ui.sectionTitle('Know before you go') + '<div class="card">' + rows + '</div>';
  }

  /* ---------------- screen ---------------- */
  function render() {
    const body =
      '<div class="muted tiny" style="margin-bottom:10px">Cruise call or day trip — a realistic plan for your hours ashore, composed from live Rockway data.</div>' +
      RW.ui.sectionTitle('Right now on the Rock') + contextCard() +
      plannerSection() +
      ticketsSection() +
      packSection() +
      '<div class="muted tiny" style="margin-top:12px">Itinerary timings and the practical pack are curated by Rockway — verify opening hours locally on the day.</div>';
    return RW.ui.screen({ title: 'Visiting Gibraltar', body });
  }

  RW.register({
    id: 'visit',
    title: 'Visiting Gibraltar',
    emoji: '🧳',
    tileBg: '#fff4d6',
    section: 'explore',
    order: 18,
    tick: 60000, // keep the runway/frontier context honest while open
    render,
    actions: {
      visitHours: (el) => { hoursVal = el.dataset.v || '5'; RW.render(); },
      visitPack: (el) => {
        const i = parseInt(el.dataset.i, 10);
        packOpen = packOpen === i ? -1 : i;
        RW.render();
      },
    },
  });

  // Ask Rockway: visitor intent → one row to the planner
  RW.registerSearch(function (q) {
    if (['visit', 'itinerary', 'cruise', 'day trip', 'tourist'].some(function (w) { return q.indexOf(w) > -1; })) {
      return [{ group: 'Visiting', label: 'Visiting Gibraltar', sub: '“I have X hours” planner · tickets · know-before-you-go', route: '#/visit', lead: '🧳' }];
    }
    return [];
  });
})(window.RW);
