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

  // Render a styled row of contact avatar buttons.
  // selectedIds: string (single) or array (multi-select).
  // actionName: data-act to fire on click.
  // accentVar: CSS var string for the selection ring colour.
  function avatarRow(selectedIds, actionName, accentVar) {
    var isArray = Array.isArray(selectedIds);
    var accent = accentVar || 'var(--brand)';
    var ctacts = contacts();
    if (!ctacts.length) {
      return '<p style="font-size:13px;color:var(--ash);margin:8px 0 12px">No contacts saved yet — add some in your Account.</p>';
    }
    return '<div style="display:flex;flex-wrap:wrap;gap:12px;margin:10px 0 6px;padding:2px 0">' +
      ctacts.map(function (c) {
        var active = isArray
          ? selectedIds.indexOf(c.id) !== -1
          : selectedIds === c.id;
        var bgStyle = active
          ? 'background:' + accent + ';'
          : 'background:var(--cloud);';
        var ringStyle = active
          ? 'box-shadow:0 0 0 3px ' + accent + ',0 0 0 5px rgba(255,255,255,0.9);'
          : 'box-shadow:0 0 0 2px var(--mist);';
        var emojiColor = active ? 'filter:brightness(1.1);' : '';
        var nameWeight = active ? '800' : '600';
        var nameColor = active ? 'var(--ink)' : 'var(--ash)';
        return '<button style="display:flex;flex-direction:column;align-items:center;gap:5px;' +
          'background:transparent;border:0;cursor:pointer;padding:2px;position:relative;transition:transform .12s" ' +
          'data-act="' + actionName + '" data-cid="' + esc(c.id) + '">' +
          '<span style="width:54px;height:54px;border-radius:50%;' + bgStyle + ringStyle +
          'display:grid;place-items:center;font-size:24px;transition:box-shadow .15s,background .15s;' + emojiColor + '">' +
          esc(c.emoji) + '</span>' +
          (active
            ? '<span style="position:absolute;top:0;right:0;width:18px;height:18px;border-radius:50%;' +
              'background:' + accent + ';display:grid;place-items:center;font-size:10px;' +
              'color:#fff;font-weight:900;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2)">✓</span>'
            : '') +
          '<span style="font-size:11px;font-weight:' + nameWeight + ';color:' + nameColor + ';' +
          'max-width:54px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s">' +
          esc(c.name) + '</span>' +
          '</button>';
      }).join('') + '</div>';
  }

  // ---- tab render functions ----

  function renderSend() {
    var ctacts = contacts();
    var contact = _sendContactId ? contactById(_sendContactId) : null;
    var avatars = avatarRow(_sendContactId, 'paySelectSend', 'var(--brand)');
    var selectedBanner = contact
      ? '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:8px;' +
        'background:var(--brand-soft,#eef0ff);border-radius:10px;font-size:13px;font-weight:700;color:var(--brand)">' +
        '<span style="font-size:18px">' + esc(contact.emoji) + '</span>' +
        'Paying <span style="margin-left:4px">' + esc(contact.name) + '</span>' +
        '</div>'
      : '';

    return '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Who are you paying?</label>' +
      (ctacts.length === 0
        ? RW.ui.empty('👤', 'No contacts yet — add some in Account.')
        : avatars + selectedBanner) +
      '<label class="fld">Amount (£)</label>' +
      '<input class="input num" id="pay-send-amount" type="number" min="0.01" step="0.01" placeholder="0.00">' +
      '<label class="fld">Note <span style="font-weight:500;color:var(--ash)">(optional)</span></label>' +
      '<input class="input" id="pay-send-note" placeholder="e.g. Pizza at Casemates">' +
      '<button class="btn" style="margin-top:14px" data-act="paySend">Send money</button>' +
      '</div>';
  }

  function renderRequest() {
    var ctacts = contacts();
    var contact = _reqContactId ? contactById(_reqContactId) : null;
    var avatars = avatarRow(_reqContactId, 'paySelectRequest', 'var(--sea)');
    var selectedBanner = contact
      ? '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:8px;' +
        'background:var(--sea-soft,#e8f0ff);border-radius:10px;font-size:13px;font-weight:700;color:var(--sea)">' +
        '<span style="font-size:18px">' + esc(contact.emoji) + '</span>' +
        'Requesting from <span style="margin-left:4px">' + esc(contact.name) + '</span>' +
        '</div>'
      : '';

    return '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Request from who?</label>' +
      (ctacts.length === 0
        ? RW.ui.empty('👤', 'No contacts yet — add some in Account.')
        : avatars + selectedBanner) +
      '<label class="fld">Amount (£)</label>' +
      '<input class="input num" id="pay-req-amount" type="number" min="0.01" step="0.01" placeholder="0.00">' +
      '<label class="fld">Note <span style="font-weight:500;color:var(--ash)">(optional)</span></label>' +
      '<input class="input" id="pay-req-note" placeholder="e.g. Drinks at Ocean Village">' +
      '<button class="btn sea" style="margin-top:14px" data-act="payRequest">Request money</button>' +
      '</div>';
  }

  function renderSplit() {
    var ctacts = contacts();
    var avatars = avatarRow(_splitContactIds, 'payToggleSplit', 'var(--sea)');
    var n = _splitContactIds.length;

    // Summary stat chips: how many people + who's in
    var summaryChips = '';
    if (n > 0) {
      var names = _splitContactIds.map(function (cid) {
        var c = contactById(cid);
        return c ? esc(c.emoji) + ' ' + esc(c.name) : '';
      }).filter(Boolean);
      summaryChips =
        '<div class="chips" style="margin:6px 0 10px">' +
        '<span class="chip" style="background:var(--sea-soft,#e8f0ff);color:var(--sea)">' +
        (n + 1) + ' people' +
        '</span>' +
        names.map(function (nm) {
          return '<span class="chip">' + nm + '</span>';
        }).join('') +
        '</div>';
    }

    // Per-person breakdown panel (shown after contact selection)
    var breakdownHtml = '';
    if (n > 0) {
      var shareRows =
        '<div class="kv" style="color:var(--ash)">' +
        '<span>You</span>' +
        '<span id="pay-split-share-you" class="num">—</span>' +
        '</div>' +
        _splitContactIds.map(function (cid) {
          var c = contactById(cid);
          if (!c) return '';
          return '<div class="kv" style="color:var(--ash)">' +
            '<span>' + esc(c.emoji) + ' ' + esc(c.name) + '</span>' +
            '<span class="pay-split-share num">—</span>' +
            '</div>';
        }).join('');

      breakdownHtml =
        '<div style="margin-top:14px;border-top:1px solid var(--mist);padding-top:12px">' +
        '<div style="font-size:11.5px;font-weight:700;letter-spacing:.04em;color:var(--ash);margin-bottom:8px">' +
        'SPLIT BETWEEN ' + (n + 1) + ' PEOPLE' +
        '</div>' +
        shareRows +
        '<div class="kv total">' +
        '<span>Each person pays</span>' +
        '<span id="pay-split-share" class="num">—</span>' +
        '</div>' +
        '</div>';
    }

    var btnLabel = n > 0
      ? 'Request from all · ' + n + (n === 1 ? ' person' : ' people')
      : 'Select contacts first';

    return '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Split with <span style="font-weight:500;color:var(--ash)">(tap to select)</span></label>' +
      (ctacts.length === 0
        ? RW.ui.empty('👤', 'No contacts yet — add some in Account.')
        : avatars + summaryChips) +
      '<label class="fld">Total bill (£)</label>' +
      '<input class="input num" id="pay-split-total" type="number" min="0.01" step="0.01" placeholder="0.00" ' +
      'oninput="(RW.getAction(\'paySplitCalc\'))(this)">' +
      breakdownHtml +
      '<button class="btn gold" style="margin-top:16px" data-act="paySplitRequestAll"' +
      (n === 0 ? ' disabled' : '') + '>' + btnLabel + '</button>' +
      '</div>';
  }

  function renderPending() {
    var reqs = requests().slice().reverse();
    var pending = reqs.filter(function (r) { return r.status === 'pending'; });
    var paid = reqs.filter(function (r) { return r.status !== 'pending'; });

    if (!reqs.length) {
      return RW.ui.empty(
        '✉️',
        'No outstanding requests yet, mate.\nSend a request and it\'ll show up here — te llamo p\'atr\xe1!'
      );
    }

    function reqCard(r) {
      var isPending = r.status === 'pending';
      var statusPill = isPending
        ? '<span class="pill-status warn">Pending</span>'
        : '<span class="pill-status ok">Paid</span>';
      var cardOpacity = isPending ? '' : 'opacity:0.72;';
      var amtColor = isPending ? 'color:var(--ink)' : 'color:var(--ash)';
      var nameColor = isPending ? 'color:var(--ink)' : 'color:var(--ash)';
      var leadBg = isPending ? 'background:var(--gold-soft)' : 'background:var(--green-soft)';
      var actions = isPending
        ? '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button class="btn sm ghost" style="flex:1" data-act="payRemind" data-rid="' + esc(r.id) + '">Remind</button>' +
          '<button class="btn sm" style="flex:1" data-act="payMarkPaid" data-rid="' + esc(r.id) + '">Mark paid</button>' +
          '</div>'
        : '';

      return '<div style="padding:12px 0;border-bottom:1px solid var(--mist);' + cardOpacity + '">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<div class="lead" style="border-radius:50%;' + leadBg + ';flex:0 0 auto">' + esc(r.emoji || '💸') + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:700;font-size:14.5px;' + nameColor + '">' + esc(r.name) + '</div>' +
        '<div style="font-size:12px;color:var(--ash);margin-top:2px">' +
        (r.note ? esc(r.note) + ' · ' : '') + fmtTime(r.t) +
        '</div>' +
        '</div>' +
        '<div style="text-align:right;flex:0 0 auto">' +
        '<div class="num" style="font-weight:800;font-size:16px;' + amtColor + '">' + money(r.amount) + '</div>' +
        '<div style="margin-top:5px">' + statusPill + '</div>' +
        '</div>' +
        '</div>' +
        actions +
        '</div>';
    }

    var html = '';

    if (pending.length) {
      html += RW.ui.sectionTitle('Awaiting payment (' + pending.length + ')');
      html += '<div class="card">' + pending.map(reqCard).join('') + '</div>';
    }

    if (paid.length) {
      html += RW.ui.sectionTitle('Settled up ✔');
      html += '<div class="card">' + paid.map(reqCard).join('') + '</div>';
    }

    return '<div style="margin-top:8px">' + html + '</div>';
  }

  // ---- main render ----
  function render() {
    var pending = pendingCount();
    var pendingBadge = pending > 0
      ? ' <span style="background:var(--brand);color:#fff;border-radius:999px;' +
        'padding:1px 7px;font-size:11px;font-weight:800;margin-left:4px">' + pending + '</span>'
      : '';

    var tabs = [
      { id: 'send',    label: '↑ Send' },
      { id: 'request', label: '↓ Request' },
      { id: 'split',   label: '÷ Split' },
      { id: 'pending', label: 'Requests' + pendingBadge },
    ];
    var seg = '<div class="seg" style="margin-top:8px">' +
      tabs.map(function (t) {
        return '<button class="' + (_tab === t.id ? 'on' : '') + '" ' +
          'data-act="payTab" data-tabid="' + t.id + '">' + t.label + '</button>';
      }).join('') + '</div>';

    var content;
    if (_tab === 'send')         content = renderSend();
    else if (_tab === 'request') content = renderRequest();
    else if (_tab === 'split')   content = renderSplit();
    else                         content = renderPending();

    var heroHtml = RW.ui.hero({
      emoji: '💸',
      title: 'Pay',
      sub: 'Send money, request, or split a bill on the Rock',
      accent: '#1455c0',
      chips: pending > 0 ? [pending + ' pending'] : [],
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
          shareEls.forEach(function (s) { s.textContent = formatted; });
        } else {
          if (shareEl) shareEl.textContent = '—';
          if (shareYouEl) shareYouEl.textContent = '—';
          shareEls.forEach(function (s) { s.textContent = '—'; });
        }
      },

      paySend: function () {
        var amtInput  = document.getElementById('pay-send-amount');
        var noteInput = document.getElementById('pay-send-note');
        var amount = amtInput ? parseFloat(amtInput.value) : NaN;
        var note   = noteInput ? noteInput.value.trim() : '';

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

        RW.toast('Sent ' + money(amount) + ' to ' + contact.name + ' — ¡qu\xe9 tal, mate!');
        _sendContactId = '';
        RW.render();
      },

      payRequest: function () {
        var amtInput  = document.getElementById('pay-req-amount');
        var noteInput = document.getElementById('pay-req-note');
        var amount = amtInput ? parseFloat(amtInput.value) : NaN;
        var note   = noteInput ? noteInput.value.trim() : '';

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

        RW.toast('Requested ' + money(amount) + ' from ' + contact.name + ' — te llamo p\'atr\xe1!');
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
        RW.toast('Requested ' + money(share) + ' each from ' + n + (n === 1 ? ' person' : ' people') + ' — ¡qu\xe9 tal, mate!');
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
        RW.toast(money(req.amount) + ' from ' + req.name + ' — received, ¡qu\xe9 tal!');
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
          '<div class="lead" style="border-radius:50%;background:var(--green-soft)">' + esc(r.emoji || '💸') + '</div>' +
          '<div class="body">' +
          '<div class="name">💸 Request: ' + esc(r.name) +
          ' · <span class="num">' + money(r.amount) + '</span></div>' +
          '<div class="sub">' + (r.note ? esc(r.note) + ' · ' : '') + fmtTime(r.t) + '</div>' +
          '</div>' +
          '<div class="trail">' + statusPill + '</div>' +
          '</div>',
      };
    });
  });

})(window.RW);
