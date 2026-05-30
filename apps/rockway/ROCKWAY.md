# Rockway — Gibraltar's everything app · MASTER STATE

> **READ THIS FIRST if you are picking up after a context wipe.** This is the
> single source of truth for vision, architecture, conventions and status.
> Then read `TODO.md` (live checklist) and `AGENTS.md` (feature contract).

## What we're building
**Rockway** — *Gibraltar's everything app*. One app for living on the Rock:
food, groceries, parcels, the **live frontier (border) queue**, transport,
money/wallet, government services, health, local marketplace, events and more.
Branded around Gibraltar: flag **red `#d4112a`** + **castle-key gold `#f3b21b`**,
Llanito language option, and details only a Gibraltarian would know.

## Design principles (per the product owner)
1. **Fully implemented, never partial.** Every feature must actually work
   (interactive, persists state, integrates with the wallet where money moves).
2. **Never break existing features.** Add via isolated modules; keep the smoke
   test green.
3. **Authentic, researched Gibraltar.** No generic placeholders. Respect real
   constraints (see `docs/gibraltar-research.md`). e.g. **there is no Uber-style
   ride-hailing** — taxis are the single-licensed **Gibraltar Taxi Association**.
4. **Not a typical AI app.** Avoid the cliché look (phone-in-frame mockup,
   purple gradients, generic emoji-tile launcher as the whole product). Lead
   with a distinctive, live, place-aware identity. Push the interaction model.

## How to run
- **Zero build.** `cd apps/rockway && node server.js` → http://localhost:4178
- Also runs by opening `index.html` directly (file://).
- **Verify:** `node test/smoke.js` (headless, no deps). Must exit 0.

## Architecture (plugin/registry — this is the key idea)
Plain `<script>` tags, no bundler, shared `window.RW` namespace. Each feature is
a self-contained file in `src/features/` that calls `RW.register({...})` once.
The home grid, router and action bus are **driven by what's registered**, so new
features appear with **zero edits to core files** — which is what lets multiple
agents build features in parallel without collisions.

```
apps/rockway/
  index.html            # loads core/*, then core/boot.js
  server.js             # zero-dep static server
  ROCKWAY.md            # << this file (master state)
  TODO.md               # live feature checklist
  AGENTS.md             # FEATURE MODULE CONTRACT (read before writing a feature)
  docs/gibraltar-research.md  # researched facts agents must respect
  test/smoke.js         # headless render + action test (keep green)
  src/
    styles.css          # design system
    core/
      util.js           # RW.util, RW.ICON, RW.toast, RW.go
      store.js          # RW.S (state) + RW.store (save/debit/credit/cart)
      registry.js       # RW.register / RW.action / RW.tiles / sections
      ui.js             # RW.ui.screen/topbar/tabbar/row/...
      router.js         # hash router + global action bus  → RW.render()
      boot.js           # MANIFEST of feature files + tolerant loader
    features/
      _shared.js        # RW.api: weather, promos, frontier model, cart catalog
      home, activity, account, cart   # core surfaces
      eat, shop, send, frontier, move, parking            # daily life
      wallet, pay, bills, topup, rewards                  # money
      gov, health, jobs, property, marketplace            # services
      events, explore, news, chat                         # explore & connect
```

### Boot/manifest decoupling
`core/boot.js` has a PRE-DECLARED `MANIFEST` listing **all** feature files,
including ones not built yet. Missing files fail their `onerror` and are skipped
gracefully, so the app always runs and features light up as files land. To add a
feature: create `src/features/<id>.js` (already referenced in the manifest) — no
shared-file edit needed.

### State & money
- All persisted state lives on `RW.S` (localStorage key `rockway.v1`).
- Add new persisted fields to `defaults()` in `store.js` (forward-compatible
  merge on load — never assume a field exists on old saves).
- **Move money only** via `RW.store.debit(amt,label)` / `credit(amt,label)` —
  this keeps the ledger, points and balance consistent.
- After mutating state, call `RW.render()` to refresh.

## Status snapshot
See `TODO.md` for the authoritative checklist.
- ✅ Core plugin architecture + "Limestone & Key" design system + live Rock
  hero + headless smoke test (green across **25 features**).
- ✅ Distinctive non-generic shell: "The Rock, now" living home (state-aware SVG).
- ✅ All 25 features built & integrated (each in an isolated module):
  home · activity · account · cart/checkout/tracking · eat · shop · send ·
  frontier · move · parking · wallet · pay · bills · topup · rewards · gov ·
  health · jobs · property · marketplace · events · explore · news · chat.
- ✅ Verified visually via headless Chromium screenshots.
- ⏳ Next (cross-cutting polish): "Everything" launcher w/ search, Night Rock
  dark theme, more live home signals, Llanito copy pass, PWA manifest.

## Working agreement for agents
- One agent ⇒ its own feature file(s). **Never** edit core, `index.html`,
  `boot.js`, other agents' files, or this doc's neighbours' files.
- Follow `AGENTS.md` exactly. Respect `docs/gibraltar-research.md`.
- Before finishing: run `node test/smoke.js` and ensure it stays green.
