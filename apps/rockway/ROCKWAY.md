# Rockway — Gibraltar's everything app · MASTER STATE

> **READ THIS FIRST if you are picking up after a context wipe.** This is the
> single source of truth for vision, architecture, conventions and status.
> Then read `TODO.md` (live checklist) and `AGENTS.md` (feature contract).

## What we're building
**Rockway** — *Gibraltar's local marketplace* (PIVOTED from "everything app").
A realistic, launchable startup MVP: a **two-sided local-business discovery +
booking platform** (customers find & book dog groomers, salons, PTs, mechanics,
dentists, restaurant tables…; businesses self-onboard and manage bookings) plus
the genuinely-automatable community features. Branded around Gibraltar: flag
**red `#d4112a`** + **castle-key gold `#f3b21b`**, Llanito option, real local detail.

### Pivot rationale (IMPORTANT — agreed with product owner)
We deliberately **removed everything not easily automatable for an MVP** (needs a
banking licence, a government/health partnership, or delivery operations):
Eat, Shop, Send, Move, Wallet, Pay, Bills, Top-up, Rewards, Gov.gi, Health,
Parking, Cart. **No in-app payments / no wallet** — bookings are pay-in-person
requests (a PSP comes later). What's kept is automatable / user-generated /
open-data only:
- **Discover** (business directory + booking) + **For Business** (supply side) — the spine.
- **Frontier** reframed honestly: live cameras + community crowd-reports (Gibraltar
  has NO official wait-time feed, so we never invent minutes).
- **News** wired to the REAL Gibraltar Chronicle RSS via a server proxy
  (`/api/news`, 5-min cache) with graceful seed fallback (works offline/file://).
- **What's On** (free RSVPs), **Explore** (free reservations), **Marketplace**
  (classifieds), **Jobs**, **Property**, **Chat**.

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

### State (no money — payments removed in the pivot)
- All persisted state lives on `RW.S` (localStorage key **`rockway.v2`**).
- Add new persisted fields to `defaults()` in `store.js` (forward-compatible
  merge on load — never assume a field exists on old saves; guard `|| []`).
- There is **NO wallet / debit / credit** anymore. Bookings & reservations are
  free requests. After mutating state, call `RW.store.save()` then `RW.render()`.
- Key collections: `bookings`, `myBusiness`, `bizBookings`, `savedBusinesses`,
  `frontierReports`, `reservations` (events+explore), `listings`/`savedListings`,
  `jobApps`, `savedProperties`/`viewings`, `newsBookmarks`/`newsNotices`, `chats`.

## Status snapshot
See `TODO.md` for the authoritative checklist. Pivoted to the marketplace MVP:
- ✅ Core plugin architecture + "Limestone & Key" design system + live Rock hero.
- ✅ Headless smoke test green across **13 features**.
- ✅ Marketplace spine: **Discover** (14-business directory + slot booking) +
  **For Business** (self-onboard + accept/decline bookings).
- ✅ **Frontier** reframed (cameras + community reports). **News** live via
  Chronicle RSS proxy (verified: returns real current headlines).
- ✅ Kept & adapted: Home (living Rock) · Activity (bookings) · Account ·
  What's On (RSVP) · Explore (reserve) · Marketplace · Jobs · Property · Chat.
- ✅ Removed (not automatable): Eat, Shop, Send, Move, Wallet, Pay, Bills,
  Top-up, Rewards, Gov.gi, Health, Parking, Cart.
- ⏳ Next: richer booking (availability per business), business reviews write-back,
  Discover search, PWA manifest, optional Stripe deposit on bookings.

## Working agreement for agents
- One agent ⇒ its own feature file(s). **Never** edit core, `index.html`,
  `boot.js`, other agents' files, or this doc's neighbours' files.
- Follow `AGENTS.md` exactly. Respect `docs/gibraltar-research.md`.
- Before finishing: run `node test/smoke.js` and ensure it stays green.
