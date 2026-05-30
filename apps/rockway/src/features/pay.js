/* Rockway feature — Pay (peer-to-peer money, requests, and bill splitting). */
(function (RW) {
  'use strict';
  const { esc, money, uid, fmtTime } = RW.util;

  // ---- module-level selection state (re-read on every render) ----
  // Active tab: 'send' | 'request' | 'split' | 'pending'
  var _tab = 'send';
  // Selected contact id for send/request
  var _sendContactId = '';
  var _reqContactId = '';
  // Selected contact ids for split (array of ids)
  var _splitContactIds = [];

  // ---- helpers ----
  function contacts() {
    return RW.S.contacts || [];
  }

  function requests() {
    return RW.S.payRequests = RW.S.payRequests || [];
  }

  function contactById(id) {
    return contacts().find(function (c) { return c.id === id; }) || null;
  }

  function pendingCount() {
    return requests().filter(function (r) { return r.status === 'pending'; }).length;
  }

  // Render a row of contact avatar buttons.
  // Each avatar shows the contact emoji inside a circle; selected contacts get
  // a brand-coloured ring and a small tick badge.  actionName / multiSelect
  // controls single vs. multi-select behaviour.
  function avatarRow(selectedIds, actionName) {
    var isArray = Array.isArray(selectedIds);
    return '<div style="display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 4px">' +
      contacts().map(function (c) {
        var active = isArray
          ? selectedIds.indexOf(c.id) !== -1
          : selectedIds === c.id;
        var ringColor = isArray ? 'var(--sea)' : 'var(--brand)';
        var ring = active
          ? 'box-shadow:0 0 0 3px ' + ringColor + ';'
          : 'box-shadow:0 0 0 2px var(--mist);';
        return '<button style="display:flex;flex-direction:column;align-items:center;gap:4px;' +
          'background:transparent;border:0;cursor:pointer;padding:0;position:relative" ' +
          'data-act="' + actionName + '" data-cid="' + esc(c.id) + '">' +
          '<span style="width:50px;height:50px;border-radius:50%;background:var(--cloud);' +
          'display:grid;place-items:center;font-size:22px;transition:box-shadow .15s;' + ring + '">' +
          esc(c.emoji) +
          (active ? '<span style="position:absolute;top:-2px;right:-2px;' +
            'width:16px;height:16px;border-radius:50%;background:' + ringColor + ';' +
            'display:grid;place-items:center;font-size:9px;color:#fff;font-weight:900;' +
            'border:2px solid #fff">✓</span>' : '') +
          '</span>' +
          '<span style="font-size:11px;font-weight:' + (active ? '800' : '600') + ';' +
          'color:' + (active ? 'var(--ink)' : 'var(--ash)') + ';max-width:50px;' +
          'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          esc(c.name) + '</span>' +
          '</button>';
      }).join('') + '</div>';
  }

  // ---- tab render functions ----

  function renderSend() {
    var avatars = avatarRow(_sendContactId, 'paySelectSend');
    var contact = _sendContactId ? contactById(_sendContactId) : null;
    return '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Who are you paying?</label>' +
      avatars +
      (contact
        ? '<div style="margin-bottom:8px;font-size:13px;color:var(--ash)">Paying <strong>' + esc(contact.name) + '</strong></div>'
        : '') +
      '<label class="fld">Amount (£)</label>' +
      '<input class="input num" id="pay-send-amount" type="number" min="0.01" step="0.01" placeholder="0.00">' +
      '<label class="fld">Note (optional)</label>' +
      '<input class="input" id="pay-send-note" placeholder="e.g. Pizza at Casemates">' +
      '<button class="btn" style="margin-top:14px" data-act="paySend">Send money</button>' +
      '</div>';
  }

  function renderRequest() {
    var avatars = avatarRow(_reqContactId, 'paySelectRequest');
    var contact = _reqContactId ? contactById(_reqContactId) : null;
    return '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Request from who?</label>' +
      avatars +
      (contact
        ? '<div style="margin-bottom:8px;font-size:13px;color:var(--ash)">Requesting from <strong>' + esc(contact.name) + '</strong></div>'
        : '') +
      '<label class="fld">Amount (£)</label>' +
      '<input class="input num" id="pay-req-amount" type="number" min="0.01" step="0.01" placeholder="0.00">' +
      '<label class="fld">Note (optional)</label>' +
      '<input class="input" id="pay-req-note" placeholder="e.g. Drinks at Ocean Village">' +
      '<button class="btn sea" style="margin-top:14px" data-act="payRequest">Request money</button>' +
      '</div>';
  }

  function renderSplit() {
    var avatars = avatarRow(_splitContactIds, 'payToggleSplit');
    var n = _splitContactIds.length;

    // Per-person breakdown: show a kv row for each selected contact + you
    var breakdownHtml = '';
    if (n > 0) {
      var peopleRows = '<div class="kv" style="color:var(--ash)">' +
        '<span>You</span>' +
        '<span id="pay-split-share-you" class="num">—</span>' +
        '</div>' +
        _splitContactIds.map(function (cid) {
          var c = contactById(cid);
          if (!c) return '';
          return '<div class="kv" style="color:var(--ash)">' +
            '<span>' + esc(c.emoji) + ' ' + esc(c.name) + '</span>' +
            '<span class="pay-split-share num">—</span>' +
            '</div>';
        }).join('');

      breakdownHtml =
        '<div style="margin-top:14px;border-top:1px solid var(--mist);padding-top:10px">' +
        '<div style="font-size:12px;font-weight:700;color:var(--ash);margin-bottom:6px">' +
        'SPLIT BETWEEN ' + (n + 1) + ' PEOPLE</div>' +
        peopleRows +
        '<div class="kv total">' +
        '<span>Each person pays</span>' +
        '<span id="pay-split-share" class="num">—</span>' +
        '</div>' +
        '</div>';
    }

    return '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Split with (select one or more)</label>' +
      avatars +
      '<label class="fld">Total bill (£)</label>' +
      '<input class="input num" id="pay-split-total" type="number" min="0.01" step="0.01" placeholder="0.00" ' +
      'oninput="(RW.getAction(\'paySplitCalc\'))(this)">' +
      breakdownHtml +
      '<button class="btn gold" style="margin-top:14px" data-act="paySplitRequestAll"' +
      (n === 0 ? ' disabled' : '') + '>Request from all · ' + (n > 0 ? n + ' people' : 'select contacts first') + '</button>' +
      '</div>';
  }

  function renderPending() {
    var reqs = requests().slice().reverse();
    var pending = reqs.filter(function (r) { return r.status === 'pending'; });
    var paid = reqs.filter(function (r) { return r.status !== 'pending'; });

    if (!reqs.length) {
      return RW.ui.empty('✉️', 'No outstanding requests yet, mate.\nSend a request and it\'ll show up here — te llamo p\'atrá!');
    }

    function reqCard(r) {
      var isPending = r.status === 'pending';
      var statusPill = isPending
        ? '<span class="pill-status warn">Pending</span>'
        : '<span class="pill-status ok">Paid</span>';
      var actions = isPending
        ? '<div style="display:flex;gap:6px;margin-top:10px">' +
          '<button class="btn sm ghost" style="flex:1" data-act="payRemind" data-rid="' + esc(r.id) + '">Remind</button>' +
          '<button class="btn sm" style="flex:1" data-act="payMarkPaid" data-rid="' + esc(r.id) + '">Mark paid</button>' +
          '</div>'
        : '';
      return '<div style="padding:12px 0;border-bottom:1px solid var(--mist)">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<div class="lead" style="background:var(--gold-soft);flex:0 0 auto">' + esc(r.emoji || '💸') + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:700;font-size:14.5px">' + esc(r.name) + '</div>' +
        '<div style="font-size:12.5px;color:var(--ash);margin-top:2px">' +
        (r.note ? esc(r.note) + ' · ' : '') + fmtTime(r.t) +
        '</div>' +
        '</div>' +
        '<div style="text-align:right;flex:0 0 auto">' +
        '<div class="num" style="font-weight:800;font-size:15px">' + money(r.amount) + '</div>' +
        '<div style="margin-top:4px">' + statusPill + '</div>' +
        '</div>' +
        '</div>' +
        actions +
        '</div>';
    }

    var html = '';

    if (pending.length) {
      html += RW.ui.sectionTitle('Awaiting payment (' + pending.length + ')');
      html += '<div class="card">' +
        pending.map(reqCard).join('') +
        '</div>';
    }

    if (paid.length) {
      html += RW.ui.sectionTitle('Settled up');
      html += '<div class="card">' +
        paid.map(function (r) {
          return '<div style="padding:12px 0;border-bottom:1px solid var(--mist)">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
            '<div class="lead" style="background:var(--green-soft);flex:0 0 auto">' + esc(r.emoji || '💸') + '</div>' +
            '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:14.5px;color:var(--ash)">' + esc(r.name) + '</div>' +
            '<div style="font-size:12.5px;color:var(--ash);margin-top:2px">' +
            (r.note ? esc(r.note) + ' · ' : '') + fmtTime(r.t) +
            '</div>' +
            '</div>' +
            '<div style="text-align:right;flex:0 0 auto">' +
            '<div class="num" style="font-weight:800;font-size:15px;color:var(--ash)">' + money(r.amount) + '</div>' +
            '<div style="margin-top:4px"><span class="pill-status ok">Paid</span></div>' +
            '</div>' +
            '</div>' +
            '</div>';
        }).join('') +
        '</div>';
    }

    return '<div style="margin-top:8px">' + html + '</div>';
  }

  // ---- main render ----
  function render() {
    var pending = pendingCount();
    var pendingBadge = pending > 0
      ? ' <span style="background:var(--brand);color:#fff;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:800;margin-left:4px">' + pending + '</span>'
      : '';

    // Segmented tab bar
    var tabs = [
      { id: 'send', label: '↑ Send' },
      { id: 'request', label: '↓ Request' },
      { id: 'split', label: '÷ Split' },
      { id: 'pending', label: 'Requests' + pendingBadge },
    ];
    var seg = '<div class="seg" style="margin-top:8px">' +
      tabs.map(function (t) {
        return '<button class="' + (_tab === t.id ? 'on' : '') + '" ' +
          'data-act="payTab" data-tabid="' + t.id + '">' + t.label + '</button>';
      }).join('') + '</div>';

    var content;
    if (_tab === 'send') content = renderSend();
    else if (_tab === 'request') content = renderRequest();
    else if (_tab === 'split') content = renderSplit();
    else content = renderPending();

    var heroHtml = RW.ui.hero({
      emoji: '💸',
      title: 'Pay',
      sub: 'Send money, request, or split a bill',
      accent: '#1455c0',
    });

    var body = seg + content;
    return RW.ui.screen({ title: 'Pay', hero: heroHtml, body: body });
  }

  // ---- actions ----

  RW.register({
    id: 'pay',
    title: 'Pay',
    emoji: '💸',
    tileBg: '#e3f7ec',
    section: 'money',
    order: 20,
    render: render,
    actions: {

      payTab: function (el) {
        _tab = el.dataset.tabid || 'send';
        RW.render();
      },

      paySelectSend: function (el) {
        var cid = el.dataset.cid || '';
        // toggle off if already selected
        _sendContactId = _sendContactId === cid ? '' : cid;
        RW.render();
      },

      paySelectRequest: function (el) {
        var cid = el.dataset.cid || '';
        _reqContactId = _reqContactId === cid ? '' : cid;
        RW.render();
      },

      payToggleSplit: function (el) {
        var cid = el.dataset.cid || '';
        var idx = _splitContactIds.indexOf(cid);
        if (idx === -1) {
          _splitContactIds.push(cid);
        } else {
          _splitContactIds.splice(idx, 1);
        }
        RW.render();
      },

      paySplitCalc: function () {
        // Live-update per-person share preview without a full re-render.
        var inp = document.getElementById('pay-split-total');
        var shareEl = document.getElementById('pay-split-share');
        var shareYouEl = document.getElementById('pay-split-share-you');
        var shareEls = document.querySelectorAll('.pay-split-share');
        if (!inp) return;
        var total = parseFloat(inp.value);
        var n = _splitContactIds.length;
        if (n > 0 && total > 0 && !isNaN(total)) {
          var share = Math.round((total / (n + 1)) * 100) / 100;
          var formatted = money(share);
          if (shareEl) shareEl.textContent = formatted;
          if (shareYouEl) shareYouEl.textContent = formatted;
          shareEls.forEach(function (el) { el.textContent = formatted; });
        } else {
          if (shareEl) shareEl.textContent = '—';
          if (shareYouEl) shareYouEl.textContent = '—';
          shareEls.forEach(function (el) { el.textContent = '—'; });
        }
      },

      paySend: function () {
        var amtInput = document.getElementById('pay-send-amount');
        var noteInput = document.getElementById('pay-send-note');
        var amount = amtInput ? parseFloat(amtInput.value) : NaN;
        var note = noteInput ? noteInput.value.trim() : '';

        if (!_sendContactId) {
          RW.toast('Choose a contact first, mate');
          return;
        }
        if (!amount || amount <= 0 || isNaN(amount)) {
          RW.toast('Enter a valid amount');
          return;
        }

        var contact = contactById(_sendContactId);
        if (!contact) {
          RW.toast('Contact not found');
          return;
        }

        var label = 'Sent to ' + contact.name + (note ? ' · ' + note : '');
        var ok = RW.store.debit(amount, label);
        if (!ok) {
          RW.toast('Not enough funds — top up your wallet first');
          return;
        }

        RW.toast('Sent ' + money(amount) + ' to ' + contact.name);
        _sendContactId = '';
        RW.render();
      },

      payRequest: function () {
        var amtInput = document.getElementById('pay-req-amount');
        var noteInput = document.getElementById('pay-req-note');
        var amount = amtInput ? parseFloat(amtInput.value) : NaN;
        var note = noteInput ? noteInput.value.trim() : '';

        if (!_reqContactId) {
          RW.toast('Choose a contact first, mate');
          return;
        }
        if (!amount || amount <= 0 || isNaN(amount)) {
          RW.toast('Enter a valid amount');
          return;
        }

        var contact = contactById(_reqContactId);
        if (!contact) {
          RW.toast('Contact not found');
          return;
        }

        var req = {
          id: uid(),
          t: Date.now(),
          name: contact.name,
          emoji: contact.emoji,
          amount: Math.round(amount * 100) / 100,
          note: note,
          status: 'pending',
        };

        requests().push(req);
        RW.store.save();

        RW.toast('Requested ' + money(amount) + ' from ' + contact.name + ' — te llamo p\'atrá!');
        _reqContactId = '';
        _tab = 'pending';
        RW.render();
      },

      paySplitRequestAll: function () {
        var totalInput = document.getElementById('pay-split-total');
        var total = totalInput ? parseFloat(totalInput.value) : NaN;

        if (_splitContactIds.length === 0) {
          RW.toast('Select at least one contact to split with');
          return;
        }
        if (!total || total <= 0 || isNaN(total)) {
          RW.toast('Enter the total bill amount');
          return;
        }

        var n = _splitContactIds.length;
        var share = Math.round((total / (n + 1)) * 100) / 100;

        _splitContactIds.forEach(function (cid) {
          var contact = contactById(cid);
          if (!contact) return;
          requests().push({
            id: uid(),
            t: Date.now(),
            name: contact.name,
            emoji: contact.emoji,
            amount: share,
            note: 'Bill split · ' + money(total) + ' total',
            status: 'pending',
          });
        });

        RW.store.save();
        RW.toast('Requested ' + money(share) + ' each from ' + n + ' people — ¡qué tal, mate!');
        _splitContactIds = [];
        _tab = 'pending';
        RW.render();
      },

      payMarkPaid: function (el) {
        var rid = el.dataset.rid || '';
        var reqs = requests();
        var req = reqs.find(function (r) { return r.id === rid; });
        if (!req) return;

        req.status = 'paid';
        RW.store.credit(req.amount, 'Received from ' + req.name + (req.note ? ' · ' + req.note : ''));
        RW.store.save();
        RW.toast(money(req.amount) + ' from ' + req.name + ' — received!');
        RW.render();
      },

      payRemind: function (el) {
        var rid = el.dataset.rid || '';
        var reqs = requests();
        var req = reqs.find(function (r) { return r.id === rid; });
        if (!req) return;
        RW.toast('Reminder sent to ' + req.name + ' — no me des la lata!');
      },
    },
  });

  // ---- surface pay requests to Activity ----
  RW.registerActivity(function () {
    return requests().map(function (r) {
      var statusPill = r.status === 'pending'
        ? '<span class="pill-status warn">Pending</span>'
        : '<span class="pill-status ok">Paid</span>';
      return {
        t: r.t,
        html: '<div class="card row">' +
          '<div class="lead" style="background:var(--green-soft)">' + esc(r.emoji || '💸') + '</div>' +
          '<div class="body">' +
          '<div class="name">💸 Request: ' + esc(r.name) + ' · <span class="num">' + money(r.amount) + '</span></div>' +
          '<div class="sub">' + (r.note ? esc(r.note) + ' · ' : '') + fmtTime(r.t) + '</div>' +
          '</div>' +
          '<div class="trail">' + statusPill + '</div>' +
          '</div>',
      };
    });
  });

})(window.RW);
