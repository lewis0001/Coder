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
### Phase 1 — Honesty & brand polish (agents, one file each)
- [ ] News: remove fabricated seed articles; live-first; Example labels
- [ ] Jobs: UGC reframe; no fake vacancies at real employers
- [ ] Property: Example labels; de-brand fakes from real agents
- [ ] Discover: "Example" badge on seed businesses (pre-"claim listing")
- [ ] Frontier: honest single-device copy until backend
- [ ] Account: wire or remove the 4 dead settings rows
- [ ] Palette discipline pass (one red, gold accent; kill stray greens/blues)

### Phase 2 — Novel live data (verified sources; one agent per feature)
- [ ] Live weather + Levanter meter (Open-Meteo)
- [ ] Runway-closure countdown (gibraltarairport.gi proxy) ← signature
- [ ] Tides & beach conditions (Open-Meteo marine)
- [ ] "Today on the Rock" morning briefing card
- [ ] GI + Andalucía holidays → frontier risk flags (Nager.Date)
- [ ] Duty pharmacy today (dutypharmacy.gi proxy)
- [ ] Gibraltar FC fixtures (TheSportsDB)
- [ ] Ships in the Bay (aisstream.io → /api/bay → Rock hero dots)
- [ ] One Road bus strip (track.bus.gi busTracker.php proxy + fallback)

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
