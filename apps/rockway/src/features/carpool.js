/* Rockway feature — Frontier car-pool ("Lifts across the Focona").
 * The Rock's biggest daily action: ~36k people cross the Gibraltar–La Línea
 * border every day. No dedicated app exists (only ad-hoc Facebook). This is an
 * honest NOTICEBOARD of lift offers & requests — Rockway never handles money or
 * arranges rides; people agree any fuel cost-share between themselves. Keeping
 * money off-platform keeps us clear of taxi/payments licensing. */
(function (RW) {
  'use strict';
  const { esc, uid, fmtTime } = RW.util;

  // session-only filter + composer state
  var filterKind = 'all';   // 'all' | 'offer' | 'request'
  var composing = false;
  var draft = { kind: 'offer', dir: 'into-gib', days: 'Weekdays' };

  var DIRS = { 'into-gib': 'Into Gibraltar', 'to-spain': 'To Spain' };
  var SEED_TOWNS = ['La Línea', 'San Roque', 'Estepona', 'Algeciras', 'Manilva', 'Sotogrande'];

  function lifts() { return (RW.S.lifts = RW.S.lifts || []); }

  function kindPill(k) {
    return k === 'offer'
      ? '<span class="pill-status ok">Offering a lift</span>'
      : '<span class="pill-status info">Looking for a lift</span>';
  }

  // a single lift card
  function liftCard(l) {
    var mine = l.by === (RW.S.name || 'Gibraltarian');
    var route = esc(l.from || '?') + ' → ' + esc(l.to || (l.dir === 'into-gib' ? 'Gibraltar' : 'the border'));
    return '<div class="card" style="margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' + kindPill(l.kind) +
      '<span class="chip">' + esc(DIRS[l.dir] || '') + '</span>' +
      '<span style="margin-left:auto;font-size:11px;color:var(--ash)">' + esc(fmtTime(l.t)) + '</span></div>' +
      '<div style="font-weight:800;font-size:15px">' + route + '</div>' +
      '<div style="font-size:12.5px;color:var(--ash);margin-top:3px">' +
        esc(l.days || 'Flexible') + ' · ' + (l.time ? '<span class="num">' + esc(l.time) + '</span>' : 'time flexible') +
        (l.kind === 'offer' && l.seats ? ' · <span class="num">' + esc(String(l.seats)) + '</span> seat' + (l.seats === 1 ? '' : 's') : '') +
      '</div>' +
      (l.note ? '<div style="font-size:13px;margin-top:6px;line-height:1.45">' + esc(l.note) + '</div>' : '') +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:10px">' +
        '<span style="font-size:12px;color:var(--ash)">by ' + esc(l.by || 'A neighbour') + '</span>' +
        (mine
          ? '<button class="btn sm ghost" style="margin-left:auto" data-act="cpDelete" data-id="' + esc(l.id) + '">Remove</button>'
          : '<button class="btn sm" style="margin-left:auto" data-act="cpMessage" data-id="' + esc(l.id) + '">💬 Message</button>') +
      '</div></div>';
  }

  function composer() {
    if (!composing) {
      return '<button class="btn" style="margin-bottom:14px" data-act="cpCompose">＋ Post a lift</button>';
    }
    var seg = function (act, val, cur, opts) {
      return '<div class="seg" style="margin-bottom:10px">' + opts.map(function (o) {
        return '<button class="' + (cur === o[0] ? 'on' : '') + '" data-act="' + act + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>';
      }).join('') + '</div>';
    };
    var dayChips = ['Weekdays', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d) {
      return '<span class="chip tap' + (draft.days === d ? ' on' : '') + '" data-act="cpDays" data-v="' + d + '">' + d + '</span>';
    }).join('');
    return '<div class="card" style="margin-bottom:14px">' +
      '<div style="font-weight:800;margin-bottom:10px">Post a lift</div>' +
      seg('cpKind', null, draft.kind, [['offer', 'I’m offering'], ['request', 'I need a lift']]) +
      seg('cpDir', null, draft.dir, [['into-gib', 'Into Gibraltar'], ['to-spain', 'To Spain']]) +
      '<label class="fld">From</label><input class="input" id="cp-from" list="cp-towns" placeholder="e.g. Estepona" value="' + esc(draft.from || '') + '">' +
      '<datalist id="cp-towns">' + SEED_TOWNS.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist>' +
      '<label class="fld">To</label><input class="input" id="cp-to" placeholder="' + (draft.dir === 'into-gib' ? 'e.g. Europort' : 'e.g. La Línea') + '">' +
      '<label class="fld">Days</label><div class="chips" style="margin-bottom:4px">' + dayChips + '</div>' +
      '<label class="fld">Time</label><input class="input" id="cp-time" type="time" value="' + esc(draft.time || '08:00') + '">' +
      (draft.kind === 'offer' ? '<label class="fld">Spare seats</label><input class="input" id="cp-seats" type="number" min="1" max="6" value="' + esc(String(draft.seats || 2)) + '">' : '') +
      '<label class="fld">Note (optional)</label><input class="input" id="cp-note" maxlength="120" placeholder="Share fuel? Boot space? Non-smoker?">' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button class="btn" data-act="cpPost">Post to the board</button>' +
        '<button class="btn ghost" data-act="cpCancel">Cancel</button>' +
      '</div></div>';
  }

  function matchHint() {
    // if the user has an open request, surface offers going the same way
    var name = RW.S.name || 'Gibraltarian';
    var myReq = lifts().filter(function (l) { return l.by === name && l.kind === 'request'; })[0];
    if (!myReq) return '';
    var matches = lifts().filter(function (l) { return l.kind === 'offer' && l.dir === myReq.dir; });
    if (!matches.length) return '';
    return '<div class="card" style="margin-bottom:14px;box-shadow:inset 0 0 0 1.5px var(--gold-soft)">' +
      '<div style="font-weight:800;font-size:14px">🚗 ' + matches.length + ' lift' + (matches.length === 1 ? '' : 's') + ' going your way (' + esc(DIRS[myReq.dir]) + ')</div>' +
      '<div class="muted tiny" style="margin-top:4px">Scroll down to message a driver.</div></div>';
  }

  function render() {
    var all = lifts().slice().sort(function (a, b) { return b.t - a.t; });
    var visible = filterKind === 'all' ? all : all.filter(function (l) { return l.kind === filterKind; });

    var intro = '<div class="muted tiny" style="margin-bottom:12px">Share the drive across <strong>la Focona</strong>. Rockway is just the noticeboard — agree any fuel cost between yourselves. Not a taxi service.</div>';

    var chips = RW.ui.chips([
      { label: 'Everything', value: 'all' },
      { label: 'Offering', value: 'offer' },
      { label: 'Looking', value: 'request' },
    ], filterKind, 'cpFilter', true);

    var board = visible.length
      ? visible.map(liftCard).join('')
      : RW.ui.empty('🚗', 'No lifts posted yet.<br>Be the first — offer a seat or ask for one across the border.');

    var body = intro + composer() + matchHint() + RW.ui.sectionTitle('The board') + chips + board;
    return RW.ui.screen({ title: 'Frontier car-pool', body: body });
  }

  RW.register({
    id: 'carpool', title: 'Car-pool', emoji: '🚗', tileBg: '#e6effc', section: 'daily', order: 22, render: render,
    actions: {
      cpFilter: function (el) { filterKind = el.dataset.v; RW.render(); },
      cpCompose: function () { composing = true; RW.render(); },
      cpCancel: function () { composing = false; RW.render(); },
      cpKind: function (el) { draft.kind = el.dataset.v; RW.render(); },
      cpDir: function (el) { draft.dir = el.dataset.v; RW.render(); },
      cpDays: function (el) { draft.days = el.dataset.v; RW.render(); },
      cpPost: function () {
        var g = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
        var from = g('cp-from');
        if (!from) { RW.toast('Add where you’re starting from.'); return; }
        var seats = parseInt(g('cp-seats'), 10);
        lifts().push({
          id: uid(), t: Date.now(), kind: draft.kind, dir: draft.dir,
          from: from, to: g('cp-to'), days: draft.days || 'Flexible',
          time: g('cp-time'), seats: (draft.kind === 'offer' && seats > 0) ? seats : null,
          note: g('cp-note').slice(0, 120), by: RW.S.name || 'Gibraltarian',
        });
        RW.store.save();
        composing = false;
        draft = { kind: 'offer', dir: 'into-gib', days: 'Weekdays' };
        RW.toast('Posted to the board 🚗');
        RW.render();
      },
      cpDelete: function (el) {
        RW.S.lifts = lifts().filter(function (l) { return l.id !== el.dataset.id; });
        RW.store.save();
        RW.toast('Lift removed.');
        RW.render();
      },
      cpMessage: function () {
        RW.toast('Open Chat to arrange the lift with your neighbour.');
        RW.go('#/chat');
      },
    },
  });

  // surface the user's own lifts in Activity
  RW.registerActivity(function () {
    var name = RW.S.name || 'Gibraltarian';
    return lifts().filter(function (l) { return l.by === name; }).map(function (l) {
      return { t: l.t, kind: 'bookings', html:
        '<div class="card row"><div class="lead">🚗</div>' +
        '<div class="body"><div class="name">' + (l.kind === 'offer' ? 'Lift offered' : 'Lift wanted') + ' · ' + esc(l.from || '') + '</div>' +
        '<div class="sub">' + esc(DIRS[l.dir] || '') + ' · ' + esc(l.days || '') + '</div></div>' +
        '<div class="trail"><span class="pill-status ' + (l.kind === 'offer' ? 'ok' : 'info') + '">Board</span></div></div>' };
    });
  });

  // global search
  RW.registerSearch(function (q) {
    return lifts().filter(function (l) {
      return (String(l.from || '') + ' ' + String(l.to || '') + ' ' + String(l.note || '')).toLowerCase().indexOf(q) !== -1;
    }).map(function (l) {
      return { group: 'Car-pool', label: (l.kind === 'offer' ? 'Lift offered' : 'Lift wanted') + ': ' + (l.from || '?') + ' → ' + (l.to || ''), sub: DIRS[l.dir] + ' · ' + (l.days || ''), route: '#/carpool', lead: '🚗' };
    });
  });
})(window.RW);
