# Rockway — live build checklist

> Authoritative plan: **docs/PLAN.md** (synthesis of the 4 audits in
> docs/review/). This file tracks execution state. Keep `node test/smoke.js`
> green; update here after each wave.

Product: Gibraltar local-business discovery + booking marketplace + genuinely
automatable community features. Solo-launchable: no payments licence, no
delivery ops, no fabricated "live" data.

## Done
- [x] Plugin/registry architecture · design system · living Rock hero
- [x] 13 features: home, discover, business, activity, account, frontier,
  marketplace, jobs, property, events, explore, news (live Chronicle RSS),
  chat
- [x] Research dossiers (docs/research/*) + 4 audit reports (docs/review/*)
- [x] **Phase 0 — critical fixes** (see docs/PLAN.md for the full list):
  scrolling restored · Bookings tab fixed · property details reachable ·
  server crash fixed · chat composer visible · tab states · day-hero scrim ·
  double-escapes · news chip collision · honest business dashboard ·
  published biz in Discover · past slots/events guards · pivot residue ·
  store contract · smoke hardened (booking E2E etc.)

## Next up
### Phase 1 — Honesty & brand polish ✅ DONE (9-agent wave)
- [x] News live-first (fabrications deleted) · Jobs UGC board (de-branded) ·
  Property de-branded + list-your-property · Discover Example badges + search ·
  Frontier honest copy + holiday flags · Account fully wired (toggles,
  addresses, help/about) · design system v2 palette discipline (integrator)

### Phase 2 — Novel live data ✅ DONE (this wave; all six proxies verified live)
- [x] Weather & Sea: live Open-Meteo + Levanter meter dial + 24h sparkline +
  tide ribbon + beaches + UV; overrides RW.api.weather app-wide
- [x] Runway: live schedule → closure countdown + SVG day strip + Rock hook
- [x] "Today on the Rock" composed briefing (homeCard + #/today)
- [x] Holidays GI/ES → frontier flags + briefing (Nager.Date)
- [x] Duty pharmacy (dutypharmacy.gi) · Fixtures matchday ribbon (TheSportsDB)
- [ ] DEFERRED: Ships in the Bay (aisstream needs a key) · One Road bus strip
  (needs a daytime capture of track.bus.gi markers) — see PLAN.md

### Phase 3 — Marketplace depth
- [ ] Booking cancel/reschedule + owner↔customer status sync
- [ ] Double-booking prevention (own business blocks taken slots)
- [ ] Review write-back after a booking
- [ ] Global search across all registries
- [ ] PWA manifest + service worker + share buttons

### Phase 4 — Multiplayer & launch
- [ ] Supabase (magic-link auth + shared listings/bookings/reports/reviews)
- [ ] Moderation: report-content button + founder queue
- [ ] Monetization: Featured listing £19/mo · job post £29 (verify Stripe-GI;
  PayPal/MoR fallback)
- [ ] T&Cs/privacy · Plausible analytics · deploy (static + proxy) + domain

## Continuity
- Manifest: src/core/boot.js. New persisted state → defaults() in store.js.
- Verify: `node test/smoke.js` + puppeteer screenshots (server: `node server.js`).
