# Rockway — FEATURE MODULE CONTRACT (read before writing a feature)

You are building **one self-contained feature** for Rockway, Gibraltar's
everything app. Do not edit core files, `index.html`, `boot.js`, or any other
agent's feature file. Your file is already referenced in the boot manifest.

## 1. Skeleton
Create `src/features/<id>.js`:

```js
/* Rockway feature — <Name> (<one-line purpose>). */
(function (RW) {
  'use strict';
  const { esc, money, uid, ref, fmtDate, fmtTime } = RW.util;

  // ---- your seed data here (authentic Gibraltar — see docs/gibraltar-research.md) ----

  function render(parts) {
    const body = '' +
      RW.ui.sectionTitle('Section') +
      '<div class="card">...</div>';
    return RW.ui.screen({ title: '<Name>', body });
  }

  RW.register({
    id: '<id>',              // unique; == first route segment (#/<id>) and filename
    title: '<Name>',
    emoji: '🔑',
    tileBg: '#eef0f5',       // home tile icon bg
    section: 'services',     // 'daily' | 'money' | 'services' | 'explore'
    order: 30,               // sort within section
    render,
    actions: {               // optional; names must be globally unique
      myAction: (el, ev) => { /* ... */ RW.render(); },
    },
    // homeCard: () => '<html>',   // optional widget on the Home screen
    // homeOrder: 20,
    // tick: 5000,                 // optional live-refresh interval (ms)
  });
})(window.RW);
```

## 2. Rules (non-negotiable)
- **Fully implement.** No "coming soon" stubs. Every button does something real
  and, where state changes, persists it and reflects on re-render.
- **Move money only via** `RW.store.debit(amount, label)` (returns false if
  insufficient — handle it) and `RW.store.credit(amount, label)`. Never mutate
  `RW.S.wallet` directly.
- **Persist** by writing to `RW.S.<field>` then `RW.store.save()`. If you need a
  NEW persisted array/field, it must also be added to `defaults()` in
  `src/core/store.js` — coordinate; the integrator does this, not you. Until
  then, guard reads: `RW.S.myField = RW.S.myField || []`.
- **Refresh UI** after state changes with `RW.render()`.
- **Escape all user/dynamic strings** with `esc()`.
- **Action names are global** — prefix with your feature id (e.g. `billsPay`).
- **Surface history** to the Activity tab when relevant:
  `RW.registerActivity(() => RW.S.x.map(i => ({ t:i.t, html:'<div class="card">…</div>' })))`.
- **Authenticity:** use `docs/gibraltar-research.md`. If a generic super-app
  feature doesn't fit Gibraltar's reality, adapt it (don't fake it).

## 3. UI building blocks (use these — don't reinvent styling)
- `RW.ui.screen({ title, body, brand, plain, tab, hero, sticky, fab })` → full screen.
- `RW.ui.sectionTitle(label, linkText?, linkRoute?)`
- `RW.ui.row({ lead, name, sub, trail, route, leadBg })`
- `RW.ui.empty(emoji, text, btnLabel?, btnRoute?)`
- CSS classes available: `.card .btn (.ghost/.dark/.sea/.gold/.sm) .input .seg
  .chip .pill-status (.ok/.warn) .kv (.total) .grid2 .stat .qty .row` etc.
  (see `src/styles.css`). Brand vars: `--brand --gold --sea --green --ink`.
- Buttons fire actions via `data-act="name"` plus any `data-*` you read from
  `el.dataset` in the handler.

## 4. Definition of done
- `node test/smoke.js` passes (it auto-renders your route + checks for leaks).
- Your feature renders, every control works, money/points stay consistent,
  state survives reload, and you didn't touch another module.
