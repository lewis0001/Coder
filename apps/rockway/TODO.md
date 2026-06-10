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

### Phase 3 — Booking depth ✅ DONE (built solo; smoke-locked)
- [x] Discover: double-booking prevention (takenSlots) + whenIso/slot on
  bookings + review write-back (star composer, your-review-first, delete) +
  self-bookings mirror into the owner inbox
- [x] Activity: expandable booking cards — Cancel / Change time / View business;
  status line + Requested/Confirmed/Declined/Cancelled pills + dimming
- [x] Business: this-week schedule strip, block-out manager, Accept/Decline →
  sync the customer's booking status; fixed fmtWhen NaN
- [x] Global search: provider bus (RW.registerSearch) + 9 feature providers +
  #/search surface (live typing, grouped results) + home search bar
- [x] PWA: manifest + brand icons + service worker (offline shell verified:
  full app renders with networking disabled; /api network-first w/ fallback)

## Wave A — community + concierge ✅ DONE (built solo)
> Strategy shift (docs/research/ideas/compete-findings.md): **Gib Local** already
> owns the live-territory niche (border/weather/bus/flights), so those feeds are
> table-stakes. Rockway's wedge = **booking marketplace + community + concierge +
> design**. Build there, keep feeds excellent but as supporting cast.
- [x] Honesty fix: Frontier EES — states EES does NOT apply at the land border.
- [x] **Frontier car-pool** — honest lift board (offers/requests, direction,
  days/time, seats, match hint), no money movement. Verified white space.
- [x] **Lost & Found + Free-stuff** — UGC noticeboard (lost/found/free).
- [x] **Ask Rockway** concierge — no-LLM intent engine over live feeds +
  fuzzy directory; composes answers; ES/Llanito synonyms; home's primary CTA.
- [x] Research: 6 idea lanes + synthesised BACKLOG.md + competitive findings.

## Wave B — next (some need the server/keys)
- [ ] Web Push notifications (VAPID) — needs subscription storage (pairs w/ Supabase)
- [ ] Map of the Rock (MapLibre + Protomaps, ~$0.50/mo) — canvas for planner/Discover
- [ ] "One Road" live bus strip (busTracker.php c<N>.png markers — format captured)
- [ ] Cruise-day advisory; affiliate tickets/eSIM + cruise "I have X hours" planner
- [ ] Booking polish: reminders, "book again", waitlist (vs Booksy/Fresha)

### Phase 4 — Multiplayer & launch (unchanged — see docs/PLAN.md)
- [ ] Supabase (auth + shared listings/bookings/reviews) · moderation ·
  monetization (featured/job posts; verify Stripe-GI) · legal · deploy


### Deferred live-data items (see PLAN.md)
- [ ] Ships in the Bay (aisstream.io needs a free key from a GitHub login)
- [ ] One Road bus strip (needs one daytime capture of track.bus.gi markers)

## Continuity
- Manifest: src/core/boot.js. New persisted state → defaults() in store.js.
- Verify: `node test/smoke.js` + puppeteer screenshots (server: `node server.js`).
