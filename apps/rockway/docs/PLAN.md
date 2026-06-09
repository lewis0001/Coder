# Rockway — Polish & Launch Plan

> Synthesized from the four parallel audits in `docs/review/` (ux-audit,
> code-audit, product-audit, live-data — all verified findings, dated
> 2026-06-09/10). Constraint: **launchable by a solo founder with no
> licences, no employees, no big spend.** Everything here is automatable,
> user-generated, or free open data. Keep `node test/smoke.js` green at
> every step; update `TODO.md` as items land.

## Phase 0 — Critical fixes ✅ DONE (commit "P0 critical fixes")
All verified by the hardened smoke test + headless-Chromium screenshots:
1. ✅ **App-wide scrolling restored** — `#app { display: contents }` (the
   wrapper broke the `.phone` flex chain; everything below the fold was
   unreachable on every screen).
2. ✅ **Bookings tab fixed** — `activity.js` read `parts.filter` off the
   router's *array* (= `Array.prototype.filter`), hiding every booking and
   rendering a stringified function. Booking flow now lands somewhere real.
3. ✅ **Property details reachable** — `RW.navigate` (nonexistent) → `RW.go`.
4. ✅ **Server crash fixed** — malformed `%` URL no longer kills the process
   (400 instead); traversal check tightened to `ROOT + sep`.
5. ✅ **Chat composer visible** — sticky bar now sits above the tab bar.
6. ✅ **Tab bar active state** derived from route (Discover detail →
   Discover; For Business → Account).
7. ✅ **Day-phase Rock hero legible** — top scrim added.
8. ✅ **Double-escapes fixed** — marketplace hero/labels, chat thread title
   (en-space byte!), plus smoke-test regex now catches `&amp;amp;` and
   `native code` app-wide.
9. ✅ **News "All" chip collision** — source/category values namespaced.
10. ✅ **Honest business dashboard** — removed fake "profile views" and the
    3 ghost bookings injected on publish; proper empty state remains.
11. ✅ **Published business appears in Discover** (incl. `getBusiness`
    resolution + `starRating` guard for unrated new listings).
12. ✅ **Past slots/events** — "Today" hides past times (20-min lead);
    past events can't be reserved (guard + label).
13. ✅ Pivot residue: dead CSS (~80 lines) + `ICON.wallet`/`cartFab`/`sum`
    removed; index.html meta, registry contract doc, Courier chat thread,
    "orders & parcels" copy, "Buenas, evening" greeting, frontier
    input-wiping 30s tick, invalid `#3a5group` colour, 🩸 cave-concert emoji.
14. ✅ Store contract: `evtCat/evtMon/_exploreFilter/_cableCarNotify/_bizDraftCat`
    added to `defaults()`.
15. ✅ Smoke hardened: booking E2E → Bookings tab, property detail route,
    published-biz-in-Discover, chat thread route, leakage regexes.

## Phase 1 — Honesty & brand polish (no backend; agent-parallelizable)
The product audit's "trust landmine": fake content attributed to REAL
entities must go before anyone outside sees this.
- [ ] **News**: delete fabricated seed articles bylined GBC/Chronicle/Panorama
  (one invents a quote from a real minister). Live Chronicle RSS is already
  real — make it the only "news"; keep seeds ONLY as clearly-labelled
  `Example` items or drop entirely; home Top Story prefers live. (news.js)
- [ ] **Jobs**: stop fabricating vacancies at real employers (Isolas, Jyske,
  GHA). Reframe: user/business-posted board (UGC) + clearly-labelled example
  cards. (jobs.js)
- [ ] **Property**: same — label seeds `Example listing`, drop real-agent
  branding from fakes, keep honest "saved/viewing request" language. (property.js)
- [ ] **Discover seeds**: badge seed businesses `Example` until claimed
  (groundwork for "claim this listing"); real bookable flow stays for the
  user's own published business. (discover.js)
- [ ] **Frontier copy**: "your report helps everyone" → honest single-device
  wording until Phase 4 backend ("reports are stored on this device for now").
- [ ] **Account**: wire the 4 dead settings rows (notifications toggle,
  addresses, help, about → real mini-screens or remove). (account.js)
- [ ] **Palette discipline pass** ("Limestone & Key"): one red for primary
  actions, gold accent, retire WhatsApp-green Send / most sea-blue CTAs;
  unify pill/chip styles. (styles.css + sweep)
- [ ] **Copy sweep**: ROCKWAY.md architecture tree, remaining "everything
  app" phrasing anywhere user-visible.

## Phase 2 — Novel live data (the signature wave; all sources VERIFIED in docs/review/live-data.md)
Pattern: tiny same-origin proxy in server.js (like `/api/news`) + graceful
seed fallback. Each is its own feature file / isolated edit ⇒ one agent each.
- [ ] **Live weather + Levanter meter** (S) — Open-Meteo (no key) for
  36.14,−5.35 replaces the hardcoded 21°; Levanter detected from easterly
  wind + humidity (validated live: 83°, 94% RH, fog). Drives the Rock hero
  sky + a small "Levanter meter" card.
- [ ] **Runway countdown strip** (M, signature) — proxy gibraltarairport.gi
  arrivals/departures (server-rendered HTML, ~8 movements/day) → "Next
  pedestrian-crossing closure ~14:25 · EZY8901 arriving". Pedestrian-framed
  (cars use the Kingsway tunnel). Flash the runway on the Rock SVG.
- [ ] **Tides & sea conditions** (S) — Open-Meteo marine returns a correct
  Gibraltar tide curve (`sea_level_height_msl`) + waves; beach card for
  Catalan Bay / Sandy Bay / Eastern Beach.
- [ ] **"Today on the Rock" briefing** (S) — composes weather, holidays,
  duty pharmacy, next event, flights into one morning card on Home.
- [ ] **Holidays → frontier risk flags** (S) — Nager.Date for GI + Andalucía
  (Spanish holidays change the queues); chips on the Frontier screen.
- [ ] **Duty pharmacy today** (S) — dutypharmacy.gi serves parseable HTML.
- [ ] **Gibraltar FC fixtures** (S) — TheSportsDB free key (verified: next
  fixture returned). Small card in News/What's On.
- [ ] **Ships in the Bay** (M) — aisstream.io free websocket (server keeps
  the socket, exposes `/api/bay`); live ship dots on the Rock hero. Cruise
  calls: monthly manual import (port site is bot-walled — re-test from
  deploy IP).
- [ ] **One Road bus strip** (M) — proxy `POST track.bus.gi/busTracker.php?id=N`
  (4s polling upstream app); needs one daytime capture of marker markup.
  Honest fallback: timetable + community "I'm on the bus" reports.
  (Re-introduces transport, this time honestly automatable.)

## Phase 3 — Marketplace depth (still no backend)
- [ ] **Booking lifecycle**: cancel/reschedule from Bookings; owner
  Accept/Decline already exists — sync customer-side status; per-business
  availability blocks double-booking (myBusiness bookings block slots).
- [ ] **Review write-back**: customers leave a rating/review on a business
  after a booking (local until Phase 4).
- [ ] **Global search** across businesses/jobs/property/events/classifieds
  (registry-driven, one search index fn per feature).
- [ ] **PWA**: manifest + icons + service-worker shell cache; hash routes
  already shareable as URLs — add per-screen share buttons.

## Phase 4 — Multiplayer & launch (the one real infrastructure move)
- [ ] **Supabase free tier** (CDN script fits zero-build): magic-link auth;
  shared tables for businesses, bookings, frontier reports, classifieds,
  noticeboard, reviews. This single move makes every "community" feature
  genuinely multi-user. RLS for per-user writes; simple moderation flags +
  report-content button.
- [ ] **Monetization** (own-revenue only, no money-transmitter licence):
  "Featured on Rockway" £19/mo + job post £29 via payment links.
  ⚠ Verify Stripe availability for Gibraltar entities (not on supported
  list) — fallbacks: UK Ltd, PayPal GI, Paddle/LemonSqueezy as MoR.
- [ ] **Legal & analytics**: T&Cs/privacy pages; Plausible (or self-hosted
  counter) for founder analytics.
- [ ] **Deploy**: static host + the Node proxy (Render/Fly free tier) or
  port `/api/*` to serverless functions; point a domain; OG tags.

## Working agreement
- Phases 1–2 fan out one agent per file (no shared-file collisions);
  core/styles edits stay with the integrator.
- Every wave ends: smoke green → screenshot pass → commit → push.
