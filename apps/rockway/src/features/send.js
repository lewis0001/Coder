/* Rockway feature — Send a parcel (courier). */
(function (RW) {
  'use strict';
  const { esc, money, uid, ref } = RW.util;

  function render() {
    const recent = RW.S.parcels.slice().reverse().map((p) =>
      '<div class="row"><div class="lead">📦</div><div class="body"><div class="name">' + esc(p.size) + ' parcel → ' + esc(p.to) + '</div>' +
      '<div class="sub">Ref ' + p.ref + ' · ' + esc(p.status) + '</div></div><div class="trail">' + money(p.price) + '</div></div>').join('');
    const body =
      '<div class="card" style="margin-top:8px">' +
      '<label class="fld" style="margin-top:0">Pick-up</label><input class="input" id="p-from" value="12 Main Street, Gibraltar">' +
      '<label class="fld">Drop-off</label><input class="input" id="p-to" placeholder="e.g. Ocean Village Marina">' +
      '<label class="fld">Parcel size</label>' +
      '<div class="seg" id="p-size" data-val="Small"><button class="on" data-act="psize" data-v="Small" data-p="4.5">Small £4.50</button><button data-act="psize" data-v="Medium" data-p="7">Medium £7</button><button data-act="psize" data-v="Large" data-p="11">Large £11</button></div>' +
      '<div class="kv total" style="margin-top:14px"><span>Quote</span><span id="p-quote">£4.50</span></div>' +
      '<button class="btn" style="margin-top:12px" data-act="sendParcel">Book courier</button></div>' +
      (RW.S.parcels.length ? RW.ui.sectionTitle('Your parcels') + '<div class="card">' + recent + '</div>' : '');
    return RW.ui.screen({ title: 'Send a parcel', body });
  }

  RW.register({
    id: 'send', title: 'Send', emoji: '📦', tileBg: '#ede7fb', section: 'daily', order: 30, render,
    actions: {
      psize: (el) => {
        const seg = el.closest('.seg');
        seg.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
        el.classList.add('on'); seg.dataset.val = el.dataset.v;
        document.getElementById('p-quote').textContent = money(parseFloat(el.dataset.p));
      },
      sendParcel: () => {
        const to = (document.getElementById('p-to').value || 'Ocean Village').trim();
        const seg = document.getElementById('p-size');
        const price = parseFloat(seg.querySelector('button.on').dataset.p);
        if (!RW.store.debit(price, 'Parcel to ' + to)) { RW.toast('Top up your wallet first'); return; }
        RW.S.parcels.push({ id: uid(), ref: ref('PX'), t: Date.now(), to, size: seg.dataset.val, price, status: 'Courier assigned' });
        RW.store.save(); RW.toast('📦 Courier booked!'); RW.go('#/activity');
      },
    },
  });
})(window.RW);
