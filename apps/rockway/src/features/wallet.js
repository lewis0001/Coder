/* Rockway feature — Wallet (balance, transactions, top-up, QR pay). */
(function (RW) {
  'use strict';
  const { esc, money, fmtTime } = RW.util;

  function render() {
    const txns = RW.S.txns.slice().reverse().slice(0, 15).map((t) =>
      '<div class="row"><div class="lead" style="background:' + (t.kind === 'in' ? 'var(--green-soft)' : 'var(--brand-soft)') + '">' + (t.kind === 'in' ? '⬇️' : '⬆️') + '</div>' +
      '<div class="body"><div class="name">' + esc(t.label) + '</div><div class="sub">' + fmtTime(t.t) + '</div></div>' +
      '<div class="trail" style="color:' + (t.kind === 'in' ? 'var(--green)' : 'var(--ink)') + '">' + (t.amt > 0 ? '+' : '') + money(Math.abs(t.amt)) + '</div></div>').join('');
    const body =
      '<div class="balance-card"><div class="lbl">Rockway Wallet balance</div><div class="amt">' + money(RW.S.wallet) + '</div>' +
      '<div style="opacity:.8;font-size:12px;margin-top:4px">🔑 ' + esc(RW.S.name) + ' · Gibraltar · ' + RW.S.points + ' pts</div></div>' +
      '<div class="grid2" style="margin-top:12px">' +
      '<button class="btn gold" data-act="topupWallet">＋ Top up</button>' +
      '<button class="btn dark" data-act="payqr">Pay / Scan</button></div>' +
      RW.ui.sectionTitle('Transactions') +
      '<div class="card">' + (txns || '<div class="muted tiny" style="padding:10px">No transactions yet.</div>') + '</div>';
    return RW.ui.screen({ title: 'Wallet', plain: true, tab: 'wallet', body, fab: false });
  }

  RW.register({
    id: 'wallet', title: 'Wallet', emoji: '💳', tileBg: '#e7e9ee', section: 'money', order: 10, render,
    actions: {
      topupWallet: () => { RW.store.credit(50, 'Top-up · Visa ••42'); RW.toast('£50.00 added to wallet'); RW.render(); },
      payqr: () => RW.toast('📷 Point at a Rockway QR to pay'),
    },
  });
})(window.RW);
