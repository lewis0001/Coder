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

### Phase 2 — Live data instruments ✅ DONE (verified live in browser)
- [x] Six soft-fail proxies in server.js (news, weather+marine, flights,
  pharmacy, holidays GI/ES, fixtures) + RW.live client (TTL, skeletons, fallback)
- [x] Weather & Sea: live Open-Meteo drives the whole app; custom Levanter
  compass dial, temp sparkline, tide ribbon, beach/UV cards
- [x] Runway: live flight schedule → pedestrian-crossing closure countdown +
  custom SVG day-strip; flashes the Rock illustration on real closures
- [x] Today on the Rock: composed briefing (weather + holidays + live duty
  pharmacy + runway + matchday) — the retention card
- [x] Frontier holiday flags (GI + Andalucía)

### Design elevation ✅ DONE (de-AI pass)
- [x] Custom hand-drawn line-icon set (src/core/icons.js) — no emoji-in-pastel
- [x] Careem/Talabat-style service launchpad with live data baked into tiles
- [x] "Limestone & Key" v2: Fraunces editorial display face, hairline surfaces,
  de-glowed buttons, ink chips, dot-indicator tab bar, warm limestone canvas

### Phase 3 — Booking depth ✅ MOSTLY DONE (built solo; smoke-locked)
- [x] Discover: double-booking prevention (takenSlots) + whenIso/slot on
  bookings + review write-back (star composer, your-review-first, delete) +
  self-bookings mirror into the owner inbox
- [x] Activity: expandable booking cards — Cancel / Change time / View business;
  status line + Requested/Confirmed/Declined/Cancelled pills + dimming
- [x] Business: this-week schedule strip, block-out manager, Accept/Decline →
  sync the customer's booking status; fixed fmtWhen NaN
- [ ] Global search across all registries (home search bar → unified results)
- [ ] PWA manifest + service-worker shell cache + per-screen share buttons

### Phase 4 — Multiplayer & launch (unchanged — see docs/PLAN.md)
- [ ] Supabase (auth + shared listings/bookings/reviews) · moderation ·
  monetization (featured/job posts; verify Stripe-GI) · legal · deploy


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
