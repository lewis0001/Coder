# Rockway — live build checklist

Status: ✅ done · 🔨 in progress · ⏳ queued · 🔬 needs research
Product: **Gibraltar local-business discovery + booking marketplace** (MVP).
No in-app payments. Only automatable / UGC / open-data features. (See ROCKWAY.md
"Pivot rationale".)

## Foundation
- [x] Plugin/registry architecture (core/*) + zero-build, file:// support
- [x] Design system (styles.css) + "Limestone & Key" + living Rock hero
- [x] Persistence (store.js v2 — bookings/listings, no wallet)
- [x] Headless smoke test (test/smoke.js) — **green, 13 features**
- [x] Scaffold docs (ROCKWAY.md, AGENTS.md, this file, design-vision.md)
- [x] Gibraltar research dossier (docs/research/*)

## Marketplace spine
- [x] Discover — 14-business directory, category filters, business detail,
  service list + day/slot booking → RW.S.bookings
- [x] For Business — self-onboard listing + dashboard (accept/decline bookings)
- [x] Activity — unified bookings + reservations feed
- [x] Account — profile, language (EN/ES/Llanito), business CTA, stats

## Automatable community features
- [x] Frontier — live cameras + community crowd-reports (honest; no fake minutes)
- [x] News — LIVE Gibraltar Chronicle RSS via /api/news proxy + seed fallback
- [x] What's On — events with free RSVP/reservations
- [x] Explore — attractions/tours, free reserve/enquire (operators sell tickets)
- [x] Marketplace — local classifieds (post/save)
- [x] Jobs — local board (apply/save)
- [x] Property — rent/buy listings (save/request viewing)
- [x] Chat — customer ⇄ business / friends threads

## Removed in pivot (not easily automatable for MVP)
- [x] Eat, Shop, Send, Move, Wallet, Pay, Bills, Top-up, Rewards, Gov.gi,
  Health, Parking, Cart/checkout

## Next (optional)
- [ ] Per-business availability (real open slots vs generic) + booking reschedule/cancel
- [ ] Write a review back onto a business (currently read-only seed reviews)
- [ ] Discover search box + map view
- [ ] Real weather API on the Rock hero (Open-Meteo, same proxy pattern as news)
- [ ] PWA manifest + offline cache
- [ ] Optional card deposit on booking via a PSP (Stripe) — when licensed

## Continuity
- Manifest in `src/core/boot.js` lists every feature file.
- After each change: `node test/smoke.js` (must stay green) + update this file.
- New persisted state → add to `defaults()` in `src/core/store.js` (guard `|| []`).
