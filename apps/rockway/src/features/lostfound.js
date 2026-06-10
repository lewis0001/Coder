/* Rockway feature — Lost & Found + Free-stuff ("Reunite & Recycle").
 * Hyperlocal staples that thrive in a dense town: lost/found pets & items, and
 * give-away surplus (OLIO-style). Pure UGC noticeboard, walking-distance posts. */
(function (RW) {
  'use strict';
  const { esc, uid, fmtTime } = RW.util;

  var filter = 'all';
  var composing = false;
  var draft = { kind: 'lost' };

  const KINDS = {
    lost: { label: 'Lost', emoji: '😿', pill: 'danger' },
    found: { label: 'Found', emoji: '🔎', pill: 'ok' },
    free: { label: 'Free to a good home', emoji: '🎁', pill: 'info' },
  };

  function board() { return (RW.S.lostfound = RW.S.lostfound || []); }

  function card(it) {
    var k = KINDS[it.kind] || KINDS.lost;
    var mine = it.by === (RW.S.name || 'Gibraltarian');
    return '<div class="card" style="margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
      '<span class="pill-status ' + k.pill + '">' + k.emoji + ' ' + k.label + '</span>' +
      '<span style="margin-left:auto;font-size:11px;color:var(--ash)">' + esc(fmtTime(it.t)) + '</span></div>' +
      '<div style="font-weight:800;font-size:15px">' + esc(it.title) + '</div>' +
      (it.where ? '<div style="font-size:12.5px;color:var(--ash);margin-top:3px">📍 ' + esc(it.where) + '</div>' : '') +
      (it.note ? '<div style="font-size:13px;margin-top:6px;line-height:1.45">' + esc(it.note) + '</div>' : '') +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:10px">' +
      '<span style="font-size:12px;color:var(--ash)">by ' + esc(it.by || 'A neighbour') + '</span>' +
      (mine
        ? '<button class="btn sm ghost" style="margin-left:auto" data-act="lfDelete" data-id="' + esc(it.id) + '">Remove</button>'
        : (it.contact
            ? '<a class="btn sm" style="margin-left:auto;text-decoration:none" href="' + esc(it.contact.indexOf('@') > -1 ? 'mailto:' + it.contact : 'tel:' + it.contact) + '">Contact</a>'
            : '<button class="btn sm" style="margin-left:auto" data-act="lfMessage">💬 Message</button>')) +
      '</div></div>';
  }

  function composer() {
    if (!composing) return '<button class="btn" style="margin-bottom:14px" data-act="lfCompose">＋ Post a notice</button>';
    var seg = '<div class="seg" style="margin-bottom:10px">' +
      Object.keys(KINDS).map(function (k) {
        return '<button class="' + (draft.kind === k ? 'on' : '') + '" data-act="lfKind" data-v="' + k + '">' + KINDS[k].emoji + ' ' + KINDS[k].label.split(' ')[0] + '</button>';
      }).join('') + '</div>';
    return '<div class="card" style="margin-bottom:14px">' +
      '<div style="font-weight:800;margin-bottom:10px">Post a notice</div>' + seg +
      '<label class="fld">What' + (draft.kind === 'free' ? ' are you giving away' : '') + '?</label>' +
      '<input class="input" id="lf-title" maxlength="80" placeholder="' + (draft.kind === 'lost' ? 'e.g. Tabby cat, red collar' : draft.kind === 'found' ? 'e.g. Set of keys, VW fob' : 'e.g. Two-seater sofa, good condition') + '">' +
      '<label class="fld">Where</label><input class="input" id="lf-where" maxlength="60" placeholder="e.g. Catalan Bay, near the chapel">' +
      '<label class="fld">Details (optional)</label><input class="input" id="lf-note" maxlength="160" placeholder="Anything that helps">' +
      '<label class="fld">Contact (optional — phone or email)</label><input class="input" id="lf-contact" maxlength="60" placeholder="Leave blank to be messaged in-app">' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<button class="btn" data-act="lfPost">Post</button><button class="btn ghost" data-act="lfCancel">Cancel</button></div></div>';
  }

  function render() {
    var all = board().slice().sort(function (a, b) { return b.t - a.t; });
    var visible = filter === 'all' ? all : all.filter(function (i) { return i.kind === filter; });
    var chips = RW.ui.chips([
      { label: 'Everything', value: 'all' },
      { label: '😿 Lost', value: 'lost' },
      { label: '🔎 Found', value: 'found' },
      { label: '🎁 Free', value: 'free' },
    ], filter, 'lfFilter', true);
    var list = visible.length
      ? visible.map(card).join('')
      : RW.ui.empty('🧷', 'Nothing posted yet.<br>Lost a pet, found some keys, or giving something away? Post it.');
    var intro = '<div class="muted tiny" style="margin-bottom:12px">Reunite lost things with their owners, and give good stuff a second life — all within walking distance.</div>';
    return RW.ui.screen({ title: 'Lost & Found', body: intro + composer() + RW.ui.sectionTitle('Noticeboard') + chips + list });
  }

  RW.register({
    id: 'lostfound', title: 'Lost & Found', emoji: '🧷', tileBg: '#e3f7ec', section: 'explore', order: 45, render: render,
    actions: {
      lfFilter: function (el) { filter = el.dataset.v; RW.render(); },
      lfCompose: function () { composing = true; RW.render(); },
      lfCancel: function () { composing = false; RW.render(); },
      lfKind: function (el) { draft.kind = el.dataset.v; RW.render(); },
      lfMessage: function () { RW.toast('Open Chat to reach your neighbour.'); RW.go('#/chat'); },
      lfPost: function () {
        var g = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
        var title = g('lf-title');
        if (!title) { RW.toast('Add a short description first.'); return; }
        board().push({ id: uid(), t: Date.now(), kind: draft.kind, title: title, where: g('lf-where'), note: g('lf-note').slice(0, 160), contact: g('lf-contact'), by: RW.S.name || 'Gibraltarian' });
        RW.store.save();
        composing = false; draft = { kind: 'lost' };
        RW.toast('Posted to the noticeboard 🙌');
        RW.render();
      },
      lfDelete: function (el) {
        RW.S.lostfound = board().filter(function (i) { return i.id !== el.dataset.id; });
        RW.store.save(); RW.toast('Notice removed.'); RW.render();
      },
    },
  });

  RW.registerSearch(function (q) {
    return board().filter(function (i) {
      return (String(i.title) + ' ' + String(i.where || '') + ' ' + String(i.note || '')).toLowerCase().indexOf(q) !== -1;
    }).map(function (i) {
      var k = KINDS[i.kind] || KINDS.lost;
      return { group: 'Lost & Found', label: k.label + ': ' + i.title, sub: i.where || '', route: '#/lostfound', lead: k.emoji };
    });
  });
})(window.RW);
