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
- **No payments / no wallet.** Rockway is a booking marketplace with no in-app
  money for the MVP (`RW.store.debit`/`credit` were removed). Bookings/reservations
  are free requests confirmed by the business. Don't reintroduce a wallet.
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

## 5. Design rules (v2 — "Limestone & Key", world-class or nothing)
- **Palette discipline**: Gibraltar red `var(--brand)` is for PRIMARY actions
  and live signals only. Secondary buttons: `.btn.sea` (now quiet ink) or
  `.btn.ghost`. NO new hex colours, NO gradients as decoration, NO glow
  box-shadows. Status colours only via `.pill-status ok|warn|info|danger|neutral`.
- **Type**: section titles/screen titles automatically use the Fraunces display
  face — never set `font-family` inline. All figures (money, times, counts) get
  `class="num"`. Body stays Inter.
- **Active chips are ink** (`.chip.tap` + `.on`) — never red.
- **Honesty in UI**: anything live shows its source + freshness ("Live ·
  gibraltarairport.gi · 12m ago" — use `RW.live.ageMin(name)`); anything
  modelled/estimated says so; anything seeded says `Example`.
- **No exotic Unicode spaces in code** (a U+2002 once broke a fix); curly
  apostrophes are fine inside text, never a straight `'` inside a
  single-quoted JS string.

## 6. Live data (RW.live)
`var w = RW.live.get('weather')` → payload or `null` (offline/file:///loading).
While `RW.live.status(name) === 'loading'` render `.skel` placeholders sized
like the final content; on `null + status 'fail'` render the seed fallback with
no error noise. Available: news, weather, flights, pharmacy, holidays, fixtures
(payload shapes documented in server.js header + the feature prompts).
