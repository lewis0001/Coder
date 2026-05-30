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

  function contactChips(selectedId, actionName) {
    return contacts().map(function (c) {
      var active = c.id === selectedId;
      return '<button class="chip" style="' +
        (active
          ? 'background:var(--brand);color:#fff;font-weight:800;'
          : 'background:var(--cloud);color:var(--slate);') +
        'border:0;cursor:pointer;padding:7px 13px;border-radius:999px;font-size:13px;font-family:inherit;" ' +
        'data-act="' + actionName + '" data-cid="' + esc(c.id) + '">' +
        esc(c.emoji) + ' ' + esc(c.name) + '</button>';
    }).join('');
  }

  function splitChips(selectedIds) {
    return contacts().map(function (c) {
      var active = selectedIds.indexOf(c.id) !== -1;
      return '<button class="chip" style="' +
        (active
          ? 'background:var(--sea);color:#fff;font-weight:800;'
          : 'background:var(--cloud);color:var(--slate);') +
        'border:0;cursor:pointer;padding:7px 13px;border-radius:999px;font-size:13px;font-family:inherit;" ' +
        'data-act="payToggleSplit" data-cid="' + esc(c.id) + '">' +
        esc(c.emoji) + ' ' + esc(c.name) + '</button>';
    }).join('');
  }

  function pendingCount() {
    return requests().filter(function (r) { return r.status === 'pending'; }).length;
  }

  // ---- tab render functions ----

  function renderSend() {
    var chips = contactChips(_sendContactId, 'paySelectSend');
    return '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Who are you paying?</label>' +
      '<div class="chips" style="margin-bottom:4px">' + chips + '</div>' +
      '<label class="fld">Amount (£)</label>' +
      '<input class="input" id="pay-send-amount" type="number" min="0.01" step="0.01" placeholder="0.00">' +
      '<label class="fld">Note (optional)</label>' +
      '<input class="input" id="pay-send-note" placeholder="e.g. Pizza at Casemates">' +
      '<button class="btn" style="margin-top:14px" data-act="paySend">Send money</button>' +
      '</div>';
  }

  function renderRequest() {
    var chips = contactChips(_reqContactId, 'paySelectRequest');
    return '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Request from who?</label>' +
      '<div class="chips" style="margin-bottom:4px">' + chips + '</div>' +
      '<label class="fld">Amount (£)</label>' +
      '<input class="input" id="pay-req-amount" type="number" min="0.01" step="0.01" placeholder="0.00">' +
      '<label class="fld">Note (optional)</label>' +
      '<input class="input" id="pay-req-note" placeholder="e.g. Drinks at Ocean Village">' +
      '<button class="btn sea" style="margin-top:14px" data-act="payRequest">Request money</button>' +
      '</div>';
  }

  function renderSplit() {
    var chips = splitChips(_splitContactIds);
    var n = _splitContactIds.length;
    // per-person share = total / (n + 1), includes self
    var splitHtml = '';
    if (n > 0) {
      splitHtml =
        '<div class="kv" style="margin-top:12px">' +
        '<span>People splitting (incl. you)</span>' +
        '<span style="font-weight:800">' + (n + 1) + '</span>' +
        '</div>' +
        '<div id="pay-split-preview" class="kv total">' +
        '<span>Each person pays</span>' +
        '<span id="pay-split-share">—</span>' +
        '</div>';
    }
    return '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Split with (select one or more)</label>' +
      '<div class="chips" style="margin-bottom:4px">' + chips + '</div>' +
      '<label class="fld">Total bill (£)</label>' +
      '<input class="input" id="pay-split-total" type="number" min="0.01" step="0.01" placeholder="0.00" ' +
      'data-act="paySplitCalc" oninput="(RW.getAction(\'paySplitCalc\'))(this)">' +
      splitHtml +
      '<button class="btn gold" style="margin-top:14px" data-act="paySplitRequestAll"' +
      (n === 0 ? ' disabled' : '') + '>Request from all</button>' +
      '</div>';
  }

  function renderPending() {
    var reqs = requests().slice().reverse();
    if (!reqs.length) {
      return RW.ui.empty('✉️', 'No outstanding requests yet, mate.');
    }
    var rows = reqs.map(function (r) {
      var isPending = r.status === 'pending';
      var statusPill = isPending
        ? '<span class="pill-status warn">Pending</span>'
        : '<span class="pill-status ok">Paid</span>';
      var actions = isPending
        ? '<button class="btn sm ghost" style="margin-right:6px" data-act="payRemind" data-rid="' + esc(r.id) + '">Remind</button>' +
          '<button class="btn sm" data-act="payMarkPaid" data-rid="' + esc(r.id) + '">Mark paid</button>'
        : '';
      return '<div class="row" style="flex-wrap:wrap;gap:8px;">' +
        '<div class="lead" style="background:var(--gold-soft)">' + esc(r.emoji || '💸') + '</div>' +
        '<div class="body">' +
        '<div class="name">' + esc(r.name) + ' · ' + money(r.amount) + '</div>' +
        '<div class="sub">' + (r.note ? esc(r.note) + ' · ' : '') + fmtTime(r.t) + '</div>' +
        '</div>' +
        '<div class="trail">' + statusPill + '</div>' +
        (actions ? '<div style="width:100%;display:flex;justify-content:flex-end;gap:6px;padding-top:4px">' + actions + '</div>' : '') +
        '</div>';
    }).join('');
    return '<div class="card" style="margin-top:8px">' + rows + '</div>';
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

    var body = seg + content;
    return RW.ui.screen({ title: 'Pay', body: body });
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
        _sendContactId = el.dataset.cid || '';
        RW.render();
      },

      paySelectRequest: function (el) {
        _reqContactId = el.dataset.cid || '';
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
        // Live-update the per-person share preview without a full re-render.
        var inp = document.getElementById('pay-split-total');
        var shareEl = document.getElementById('pay-split-share');
        if (!inp || !shareEl) return;
        var total = parseFloat(inp.value);
        var n = _splitContactIds.length;
        if (n > 0 && total > 0) {
          var share = Math.round((total / (n + 1)) * 100) / 100;
          shareEl.textContent = money(share);
        } else {
          shareEl.textContent = '—';
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
          '<div class="name">💸 Request: ' + esc(r.name) + ' · ' + money(r.amount) + '</div>' +
          '<div class="sub">' + (r.note ? esc(r.note) + ' · ' : '') + fmtTime(r.t) + '</div>' +
          '</div>' +
          '<div class="trail">' + statusPill + '</div>' +
          '</div>',
      };
    });
  });

})(window.RW);
