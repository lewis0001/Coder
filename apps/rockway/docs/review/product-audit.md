# Rockway — Product / Launch-Readiness Audit

Date: 2026-06-09 · Auditor lens: solo founder, no investment, no staff, no payments licence.
Scope: everything in `src/`, `index.html`, `server.js`, `test/smoke.js`, docs. **No app code was modified.**

---

## 0. Executive summary

The pivot is the right one and the bones are good: a zero-build plugin architecture
(`src/core/registry.js` + `boot.js`), a genuinely distinctive home surface (`src/core/rock.js`),
an honest frontier model (`src/features/frontier.js` — cameras + crowd reports, no fake minutes),
and one real live integration (Chronicle RSS via `server.js` `/api/news`). The smoke test is green.

But Rockway today is a **single-player demo wearing multiplayer clothes**. Everything "community"
(frontier reports, classifieds, noticeboard, RSVPs, business listings) lives only in the
viewer's own `localStorage` (`rockway.v2`); nothing is shared between two phones. Several
flows make **false delivery promises against real third parties** ("Viewing request sent to
Chestertons. They will be in touch shortly." — it goes nowhere), the **Bookings tab is
functionally broken** (verified: bookings never appear there), and the seed data fabricates
news articles under real mastheads (GBC/Chronicle) and job ads under real employers (Isolas LLP,
Jyske Bank, GHA). Those are the things that would burn trust in a 32k-person town where
everyone knows everyone — they must be fixed before showing this to a single Gibraltarian.

The single highest-leverage move: **add one thin backend (Supabase free tier)**. It
simultaneously unlocks real accounts (magic links), shared community data, review write-back,
a real business directory, and moderation — without breaking the no-bundler architecture
(supabase-js loads from a CDN `<script>` tag, fitting `boot.js`'s pattern).

---

## 1. Table-stakes gaps for a real launch

### 1.1 Verified functional bugs (found during audit, reproduced headlessly)

These outrank every feature gap because they break the product's spine:

1. **The "Bookings" tab never shows bookings — ever.** `src/features/activity.js:69`:
   `parts = parts || {}; if (parts.filter != null) currentFilter = parts.filter;` — the router
   (`src/core/router.js:23`) passes an **Array**, whose `.filter` is `Array.prototype.filter`
   (a function, `!= null`). So `currentFilter` becomes a function, every item with
   `kind:'bookings'` is filtered out, and the empty state literally renders
   **"No function filter() { [native code] } activity yet."** Clicking the All/Bookings chips
   does not recover (the `activityFilter` action sets state then calls `RW.render()`, which
   re-corrupts it). Verified: after `discConfirm` pushes a booking and routes to `#/activity`
   (discover.js:702), the booking is invisible there (it only shows on the Home "Your Rockway"
   stack). The customer's flagship flow ends on a broken screen. Smoke test misses it because
   it only greps for `undefined|\[object Object\]|NaN`.
2. **Property "View details →" throws.** `src/features/property.js:483` calls
   `RW.navigate(...)`, which doesn't exist anywhere (the core API is `RW.go`, util.js:53).
   Verified: `TypeError: RW.navigate is not a function`. Property detail screens are
   unreachable from the list and from Saved rows — the whole Property feature is effectively
   list-only.
3. **Weather is hardcoded and presented as live.** `src/features/_shared.js:15-19` pins
   21°C / "Levanter cloud over the Rock" forever; it drives the home hero, the brand topbar
   pill (`ui.js:12`) and the Rock SVG's Levanter state. On a rainy January night the app says
   21° with a Levanter. TODO.md already flags Open-Meteo; this should not ship without it
   or without removing the temperature.
4. **"Preview in Discover" shows a directory that doesn't contain you.**
   `RW.api.businesses()` returns the 14 hardcoded SEED entries only (discover.js:268);
   a freshly published `RW.S.myBusiness` never appears in Discover, yet business.js:208
   offers "Preview in Discover".
5. Smoke-test gap: `test/smoke.js` exercises only 4 actions and no detail routes beyond
   one Discover business; bugs 1 and 2 pass CI. Add action coverage for `propertyView`,
   `activityFilter`, `evtReserve`, `discConfirm`, and a regression grep for `native code`.

### 1.2 Global search — missing entirely

No search box exists anywhere. Discover (`discover.js`) has only category chips; Jobs,
Property, Marketplace, Events likewise. All data is already in-memory client-side
(14 businesses, 9 jobs, 20 properties, 10 events, 8 listings, 7 attractions), so a
client-side global search is an afternoon of work and transforms perceived completeness:

- Add a `#/search` feature module + a search field on Home (the design-vision.md "Everything
  sheet" already promises "fast, searchable" — unbuilt).
- Cheap pattern that fits the architecture: let each feature register a search provider
  (`RW.registerSearch(fn)` mirroring `RW.registerActivity`), each returning
  `{label, sub, route}` items; rank by simple substring/startsWith. No index needed at this scale.

### 1.3 Identity & onboarding

Today: `RW.S.name` defaults to `'Gibraltarian'` and **no UI ever sets it** (account.js renders
it but has no edit field); `RW.userEmail` is hardcoded to `hello@rockway.gi` in `boot.js:46`
and displayed on the Account hero as if it were the user's. There is no first-run experience.

- **Now (zero backend):** a one-time first-run card on Home — "What should we call you?" —
  writing `RW.S.name` (one input + save; store.js already persists it). Make the Account
  name/email editable. Cost: hours.
- **Real accounts (the cheapest credible path for a solo founder): Supabase free tier.**
  - Magic links (email OTP) — no passwords to store, no password-reset support burden;
    perfect for a low-frequency local-utility app.
  - Free tier: 50k MAU auth, 500MB Postgres, row-level security — enough for all of
    Gibraltar several times over.
  - Fits the zero-build constraint: `@supabase/supabase-js` via CDN `<script>` in
    `index.html`, exposed as `RW.db` — no bundler, consistent with the existing pattern.
  - Crucially it's not just auth: the same free Postgres is the shared data layer every
    "community" feature is silently missing (see 1.10).
  - Firebase Spark is a viable alternative (email-link sign-in is also free) but Firestore's
    model and lock-in make Supabase the better default; Clerk's free tier is auth-only
    (you'd still need a DB). Verdict: **Supabase magic links**.
- Keep guest mode: browsing/searching must never require login; gate only *posting*
  (listings, reports, reviews) and *booking*.

### 1.4 User-written reviews

`discover.js:341-361`: reviews are 8 canned strings dealt deterministically (3 per business),
and the header claims "(74 reviews)", "(203 reviews)" etc. — **fabricated social proof**, with
no write-back (TODO.md acknowledges). Two problems: (a) users can't review; (b) the fake counts
are a trust grenade the moment a real business is listed.

- Pre-backend: a "Write a review" form persisting to `RW.S.myReviews` and rendered above the
  seed reviews is honest-ish for a demo but pointless for a marketplace (nobody else sees it).
- Real fix rides on Supabase: `reviews(biz_id, author, rating, text, created_at)` + RLS
  (insert if authed), founder moderation flag. Reviews are *the* defensible local asset —
  Google reviews are thin for Gibraltar SMEs; this is a genuine wedge.
- Until then: change "(N reviews)" to nothing or "Example reviews" (see §5).

### 1.5 Booking lifecycle

What exists (discover.js): pick service → day chips (next 5 days) → time chips → booking stored
with `status:'Requested'`; business side (business.js) can Accept/Decline **only its own
fake seeded bookings** — the two sides are not connected even within one device.

Gaps, in priority order:

1. **Cancel** (customer): nothing sets `status:'Cancelled'` though activity.js styles it.
   A cancel button on the booking card is trivial and is the minimum for "free to cancel"
   copy (discover.js:574 promises "Free to cancel"!) to be true.
2. **Slots ignore business hours**: `timeSlots(9, 17, step)` (discover.js:544) for everyone —
   Rock Fitness opens 06:00, Sacarello's serves dinner to 22:00, Cala Salon is closed Mondays
   (`hours:'Tue–Sat'`). Parse `biz.hours` or add per-business `slotConfig` to the seed.
3. **No double-booking prevention**: the same user can book the same slot twice; nothing
   marks a slot taken (and without a backend, other users' bookings can't block anything).
   Client-side: grey out slots already in `RW.S.bookings` for that business/day. Real fix:
   uniqueness check in the backend at insert time.
4. **Status never progresses**: customer bookings stay "Requested" forever. Without a backend
   this can't be fixed honestly — another argument for Supabase (a businesses table +
   a bookings table + an owner login is the real two-sided MVP).
5. **`when` rots**: stored as the label `'Today · 10:00'` (discover.js:690) — next week it
   still says "Today". Store the ISO date (it's already computed) and format at render.
6. **Reminders**: web push is heavy (see 1.8). The zero-backend trick that works *today*:
   generate an **.ics file / Google-Calendar link** on confirmation ("Add to calendar") —
   genuinely useful, zero ops, and makes the no-reminder gap irrelevant for v1.

### 1.6 Share / deep links

- Hash routes **do** work as shareable URLs once hosted (`router.js` parses
  `location.hash` on load; `#/discover/biz-pc`, `#/jobs/j3`, `#/news/n1` all deep-link
  correctly — verified in the headless render). So `https://rockway.gi/#/discover/biz-pc`
  is shareable on WhatsApp (the medium that matters in Gibraltar).
- But: `newsShare` (news.js:591) only toasts **"Link copied: …" without copying anything** —
  a fake action. Implement `navigator.share` (mobile-first) with
  `navigator.clipboard.writeText(location.origin + location.pathname + '#/news/' + id)`
  fallback. Then add the same share affordance to Discover business detail, events,
  listings, property — businesses sharing their own Rockway page is the cheapest
  growth loop available.
- `document.title` never changes per screen, and there are no per-route OG tags (SPA limit);
  link unfurls will always show the generic title — acceptable for v1, fix the generic
  title/meta first (§4).

### 1.7 Notifications story

Nothing exists; worse, Account lists a dead "Notifications — Booking updates & frontier alerts"
row (account.js:61) that does nothing when tapped, and explore.js's "Notify me when it reopens"
(cable car) just sets a flag — no mechanism will ever notify.

- Realistic ladder for a solo founder:
  1. **v1: none — and say so.** Remove/disarm the dead settings row; change "Notify me" copy
     to "Remind me here when it reopens" or drop it.
  2. **v1.5 (with Supabase): transactional email** on booking accepted/declined via Resend
     free tier (3k emails/mo) triggered by a Supabase edge function. Email is the credible
     channel for booking confirmations.
  3. **v2: Web Push** — free (VAPID, no vendor) but needs a service worker + subscription
     storage + a send path; iOS requires the PWA to be installed to Home Screen. Pair it
     with the PWA work (1.8). The killer push use-case is *frontier alerts* ("heavy at the
     focona, Friday 17:30") — that's a P2 differentiator, not launch-blocking.

### 1.8 PWA installability

Not started: **no `manifest.json`, no service worker, no offline cache** (TODO.md lists it).
Currently only `theme-color` and an emoji SVG favicon (index.html:6,9). Also note: Inter is
loaded from Google Fonts (index.html:10-11) — an external dependency that breaks offline and
is a GDPR irritant (German case law on Google Fonts IP transfer; Gibraltar applies GDPR).

- Add: `manifest.json` (name, 192/512 maskable icons drawn from the key/castle identity,
  `display:standalone`, `start_url:'./#/'`, theme `#d4112a`), a small SW that precaches the
  ~20 static files and serves cache-first (the app is already fully client-side — it will
  work offline *perfectly* except `/api/news`, which already has a seed fallback path),
  self-host Inter (two woff2 files).
- This is cheap (a day) and high-value: "add Rockway to your home screen" is the entire
  distribution strategy for a local app without app-store budget.

### 1.9 Legal & trust/safety

Nothing exists: no Terms, no Privacy notice, no content rules, no report mechanism, and UGC
surfaces are live (noticeboard `#/news/post`, classifieds posting, frontier notes, chat).

Minimum credible kit (template-able in a weekend):
- **Terms of use + UGC policy** (no scams, no harassment, sell-legal-things, we can remove
  anything) and **Privacy notice**. Today's honest privacy story is great copy: "everything
  you do stays on your device" — true until the backend lands, then rewrite. Gibraltar applies
  the GDPR framework (DPA 2004 as amended); the regulator is the **Gibraltar Regulatory
  Authority** — check whether GRA data-controller registration applies to you once you store
  user data server-side (small annual formality; verify, don't assume).
- localStorage-only today = **no cookie banner needed**; keep it that way by choosing
  cookieless analytics (1.11).
- **Report button** on every listing/notice/review: v1 = `mailto:` link with the item id
  prefilled; with backend = a `reports` table and a founder admin view (the moderation
  queue is you, on your phone, and at Gibraltar scale that's fine).
- Light input hygiene already exists (`esc()` everywhere, maxlengths on notices/frontier
  notes) — good. Add a posting rate cap once shared.

### 1.10 The unspoken table-stake: a shared data layer

Worth stating explicitly because every gap above lands here: `store.js` is localStorage
(`rockway.v2`) and `server.js` has exactly one read-only endpoint (`/api/news`). **No two
users can see each other's anything.** "Share report with the Rock", "You're live on
Rockway!", "Post to Noticeboard", "Reserved — see you there!" are all single-player. One
Supabase project (free) + 5 tables (profiles, businesses, bookings, listings, reports)
converts the five most-promised features from theatre to product. Keep the seed data as
fallback exactly like news.js does (live fetch → seed fallback) — that pattern is already
proven in this codebase.

### 1.11 SEO / "list your business" funnel + founder analytics

- index.html is the app shell; hash routing means **one indexable page**, currently titled
  *"Rockway — Gibraltar's everything app"* with a meta description promising food delivery,
  parcels and a wallet (index.html:7-8) — the pre-pivot pitch. Fix the title/meta (P0 copy),
  then add a small static `business.html` ("List your business on Rockway — free", what you
  get, screenshots, CTA into `#/business`) — server.js serves static files already. Local
  SEO ("dog groomer Gibraltar") is winnable with plain static pages per category later (P2).
- The in-app funnel exists and is decent (offers card `o1` in _shared.js → `#/business`
  onboarding → dashboard) but ends in localStorage limbo with **fake seeded customer bookings**
  (business.js `seedDemoBookings` — "Lucia G.", "Marco A.", "Deborah S."). A real café owner
  who self-onboards will Accept a booking from a customer who does not exist. Until the
  backend exists, the honest v1 funnel is: onboarding form → **email the founder**
  (`mailto:` or a Formspree/Tally form) → founder curates the directory. Label the dashboard
  preview as demo.
- **Analytics (cheapest honest option):** Cloudflare Web Analytics — free, cookieless, no
  consent banner needed, one `<script>`. Alternatives: GoatCounter (free, open source),
  Plausible (~€9/mo) if you want nicer funnels; Umami self-hosted if you enjoy ops (you
  don't, you're solo). Add a few manual events that matter: booking attempted, business
  onboarding started/completed, search used. Server-side, log `/api/*` hits to a file —
  `server.js` is yours.

---

## 2. Everything-app breadth — what to add (kept automatable / zero-ops)

Context that shapes the ranking: anything marked **UGC** is worthless until the shared
backend exists (see 1.10) — open-data features are therefore the best pre-backend wins.
The noticeboard (news.js) already has `Lost & Found`, `Charity`, `Community` types with
seeds — several "new features" below are promotions of that, not new builds.

| # | Feature | Value (why) | Effort | Data source | Verdict |
|---|---------|-------------|--------|-------------|---------|
| 1 | **Public-holiday calendar (GIB + Spain/Andalucía)** | Frontier pain is holiday-driven (docs/research/frontier.md); "Spanish holiday today — expect heavy queues" on the Frontier screen + Rock hero is daily-utility gold for 12–15k commuters. Also feeds events. | **Low** (static JSON/year; Nager.Date free API covers GI + ES incl. regional; add La Línea feria dates by hand) | Open data | **Do first.** Pure data, zero ops, unique. |
| 2 | **Sea / beach conditions — Catalan Bay & Sandy Bay** (+ replace fake weather) | Half the Rock is at the beach May–Oct; pairs with the existing Levanter identity. Fixes audit bug 1.1#3 at the same time. | **Low** (Open-Meteo weather + marine APIs: free, keyless — wave height, wind, sea temp, UV; same proxy pattern as `/api/news`) | Open data | **Do second.** Label as forecast; skip precise tide tables (no free reliable source) — show "sea state", not tide times. |
| 3 | **Duty pharmacy today** | Real recurring need (docs/research/gov-health.md: rota on gha.gi/duty-pharmacy); exactly the "open data, zero ops" promise. | Low–Med (scrape gha.gi rota via proxy w/ cached fallback; or founder keys in the monthly rota — 5 min/month) | Open data / founder-curated | **Yes.** Small card on Home after 19:00 + a tile. |
| 4 | **Lost & found (dedicated surface)** | Huge in small towns; seeds already exist (news.js `INITIAL_NOTICES` nb1/nb4). Emotional, shareable, zero-controversy UGC. | Low (promote noticeboard type to its own tile/route + photo later) | UGC (**needs backend**) | **Yes — first UGC feature to go live when backend lands.** |
| 5 | **Carpool / lift board (frontier commuters)** | Genuinely Gibraltar-shaped: thousands cross daily, parking in La Línea + walking is the meta; a lifts board (route, time, seats, recurring) has no incumbent except WhatsApp groups. | Med (a listing type + filters; trust features needed: profiles, report) | UGC (**needs backend** + accounts) | **Yes, P2 flagship.** Free, no money moves (keep it cost-share only — no fares — to stay clear of taxi licensing sensitivities; GTA is politically protected). |
| 6 | **"New on the Rock" business spotlight** | Automatic marketing carrot for the supply side ("get featured on Home when you join"); zero extra content cost — it derives from signups. | Low (Home card reading newest businesses) | Derived from own data | **Yes** — ship with the real directory; later the paid "Featured" slot sits beside it (§3). |
| 7 | **Polls ("should Main Street pedestrianise?")** | Engagement + civic identity; great share bait. Open-UGC polls are a moderation trap — make them **founder-authored, one a week**. | Low (one table + vote-once per account) | Founder-curated (**needs backend** for shared counts) | **Yes, lightweight.** Pairs naturally with News. |
| 8 | **Volunteer / charity board** | Goodwill + differentiates from Facebook; `Charity` notice type already seeded (Foodbank Gibraltar). | Low (noticeboard category + recurring-need flag) | UGC/founder-curated | **Yes, as a noticeboard view** — not its own feature file. |
| 9 | **Local sports fixtures & results** | Real interest (Gibraltar FL, Victoria Stadium, darts/netball scene) but there is **no clean open feed**; manual upkeep rots fast and stale scores are worse than none. | Med–High ongoing | Manual/scrape (fragile) | **Defer.** Revisit as club-submitted UGC ("club accounts post their own fixtures") after the backend — that version is zero-ops. |
| 10 | Noticeboard upgrades (photos, expiry, categories nav) | Supports #4/#8; expiry esp. (stale notices kill trust). | Low | UGC | **Yes, alongside #4.** |

Sequencing: 1–2–3 now (open data, no backend), 6 with the real directory, 4–10–8 the week
the backend lands, 7 after accounts, 5 as the P2 hero, 9 only via club self-serve.

---

## 3. Monetization without licences/staff

### Sanity check on the licensing distinction — broadly correct, with caveats

- **Correct core:** selling *Rockway's own services* (featured placement, promoted events,
  job-post fees, classified bumps) makes Rockway an ordinary **merchant**; Stripe (or any
  PSP) is the regulated entity processing the card payment. No PSP/e-money licence is needed
  to *accept payment for your own product* — that requirement attaches to handling **other
  people's money** (taking the customer's £35 groom fee and passing it to Paws & Claws,
  holding funds, splitting payments). The pivot doc's instinct (`ROCKWAY.md` "No in-app
  payments… a PSP comes later") is right; payments *between* customers and businesses should
  come later via Stripe Connect-style flows where the PSP, not Rockway, is in the funds flow.
- **Caveat 1 — Stripe availability in Gibraltar:** Gibraltar is **not** on Stripe's
  supported-countries list (UK is; GI is a separate jurisdiction). Verify before building
  the plan on Payment Links. Solo-founder workarounds, in order of sanity: (a) incorporate a
  **UK Ltd** (common for Gib founders; Stripe-supported, ~£12 + an accountant), (b) use a
  **merchant of record** (Paddle / Lemon Squeezy — they handle everything for a higher cut),
  (c) **PayPal Business** (available in Gibraltar) or Revolut Business payment links —
  uglier checkout, zero blockers. The *model* is identical in all cases.
- **Caveat 2:** money-laundering/consumer rules don't bite at this size for own-revenue
  sales, but keep clean records; Gibraltar has **no VAT**, which genuinely simplifies
  invoicing local SMEs.
- **Caveat 3:** advertising/featured placement must be *labelled* ("Featured") to keep the
  directory's trust — bake the badge in from day one.

### Simplest credible model (recommended)

Liquidity first: **every base thing stays free** (listing a business, posting a classified,
RSVPing, posting jobs *for the first months*). Then exactly **two SKUs**, both fulfilled
manually by the founder via a payment link + a flag in the data:

1. **"Featured on Rockway" — £19/month per business.** Pinned top of its Discover category +
   the Home "New on the Rock"/spotlight card + a gold key badge. Fulfilment: founder flips
   `featured:true` after the Stripe/PayPal subscription email arrives. 10 businesses ≈
   £190/mo — covers all infra (~£0–25/mo) immediately.
2. **Job posting — £29/30 days** (companies/recruiters only; always free for individuals
   offering work like babysitting). Gibraltar's gaming/finance recruiters pay multiples of
   this elsewhere. Same manual fulfilment.

Defer: classified bumps (£2 — fights free Facebook Marketplace habit, low £, high friction),
promoted events (sell manually to the Music-Festival tier only, ad-hoc), booking deposits
(needs Connect + appetite, P2+). One warning from the copy audit: business onboarding
currently promises **"free forever"** and "Free listing" (business.js:106-110, _shared.js o1
"List your business free"). Keep base listings free so the promise holds, and never paywall
what was promised free — sell *prominence*, not *presence*.

---

## 4. Copy / brand audit

Overall: the Limestone & Key voice is strong and the Gibraltar detail is mostly excellent
(Casemates, la focona, GTA-not-Uber, cable-car-closed handled perfectly in explore.js).
Llanito usage is *mostly* tasteful — the chat canned replies (chat.js:19-30) are genuinely
charming and research-accurate ("Te llamo p'atrá…", "No me des la lata"), and the Account
language note (account.js:19) is lovely. But the pivot left scar tissue, and several strings
make promises the code can't keep.

### The worst 5 copy spots (with replacements)

1. **`index.html:7-8` — the page title and meta description still sell the dead product.**
   `"Rockway — Gibraltar's everything app"` / `"…food, shopping, parcels, wallet, live
   frontier times, transport, government services…"`. This is what Google, WhatsApp unfurls
   and browser tabs show. → Replace:
   *Title:* `Rockway — Find & book Gibraltar's local businesses` ·
   *Description:* `Discover and book the Rock's groomers, salons, trades and tables — plus live
   Gibraltar news, the frontier as it really is, events, jobs, property and local classifieds.`
   (Also: ROCKWAY.md's own H1 and AGENTS.md line 3 still say "everything app" — internal, but
   they steer future agents off-pivot.)

2. **False third-party delivery claims** — the worst *category* of copy in the app because it
   manufactures real-world no-shows against real companies:
   - property.js:522 `'Viewing request sent to ' + listing.agent + '. They will be in touch shortly.'` (Chestertons/BMI/Seekers/BFA are real firms; nothing is sent)
   - jobs.js:388 `'Application submitted – ' + j.employer + ' will be in touch.'` (Isolas LLP, Jyske Bank, GHA are real employers)
   - discover.js:709 / marketplace.js:388 `'Message sent to X. They'll reply shortly.'` (no message exists; chat.js is right there and isn't even used)
   → Replace with honest demo copy until the backend exists: `"Demo — in the live app this
   goes straight to {name}."`, and wire `discMessage` to actually open `#/chat/<bizId>`
   (the chat feature already supports creating threads).

3. **`chat.js:14-15, 40-46` — the "Courier" pinned thread**, with replies like *"Hi! Courier
   here — your parcel is on the way"* and *"Parcel left at the door"*. There is no delivery
   product; this is pre-pivot ghost UI in a tier-1 surface. → Remove the thread, or rebrand
   it into something the pivot supports: a **"Rockway Tips"** thread (frontier tips, duty
   pharmacy tonight, what's on this weekend). Same fix for activity.js:102's empty state
   *"Your orders, parcels & bookings appear here."* → *"Your bookings and reservations appear
   here."* And the support auto-reply *"Typical response time is under 10 minutes"*
   (chat.js:35) is a fabricated SLA from a bot — soften to *"a real person reads this — we'll
   reply as soon as we can."*

4. **`frontier.js:45-46` — "📣 Share report with the Rock" / "your report helps everyone"**
   (plus home.js hero "N recent reports"). Reports live in the reporter's own localStorage;
   nobody else ever sees them. The frontier feature's whole brand is *honesty about data* —
   this one string undermines it. → Until the backend: `"Log your crossing — saved on this
   device (community sharing coming soon)"`; after the backend, the current copy becomes true
   and great. Same family: explore.js:352 *"We'll let you know when the cable car reopens!"*
   (no notification mechanism — see 1.7) and account.js:74's `'Language updated'` toast when
   **nothing translates** (the EN/ES/Llanito switcher changes only the explainer paragraph;
   either ship real string tables or relabel the section "Language — coming soon" with the
   note as flavour).

5. **`home.js:19` — `'Buenas, ' + dayPart()` renders "Buenas, morning 🇬🇮".** The one place
   the Llanito garnish misfires — it reads like a string-concatenation bug, on the first line
   of the app. → Map it properly: `Buenas — qué tal?` as a fixed greeting, or per-daypart
   `Buenas (morning) / Buenas tardes (afternoon) / Buenas noches (evening)`, or the
   research-blessed `¿Qué tal, mate?`. Small, but it's literally the first sentence a
   Gibraltarian reads.

Minor nits worth a sweep: events.js:124 St Michael's Cave Concert emoji is `🩸` (a blood
drop — presumably meant 🎻); explore.js:16 uses `🦍` (gorilla) for the macaque reserve where
events.js correctly uses 🐒 (and research warns the macaque imagery is identity-sensitive);
styles.css:1 header comment still says "everything app"; account.js dead settings rows
("Saved addresses" — there are no addresses post-pivot) should be deleted or wired
(Help & support → `#/chat/support` is a one-liner).

---

## 5. The demo-data problem

Inventory of what ships fictional today:

| Surface | Seed | Risk level |
|---|---|---|
| Discover (discover.js) | 14 businesses; most invented (Rock Barbers, Cala Salon…) but **at least one real** (Sacarello's — real Irish Town institution since 1888, with a plausible real phone number) — all bookable, all with fabricated ratings/review counts | **Severe** — a user can "book" a table at a real restaurant that will never see the request; "Booking requested — Sacarello's will confirm shortly" is false |
| Jobs (jobs.js) | 9 vacancies; ~half attributed to **real employers** (Isolas LLP, Jyske Bank, GHA, HM Govt, The Landings) with fabricated salaries and an Apply flow | **Severe** — fake jobs at real firms + "will be in touch" |
| News (news.js) | 8 fully fabricated articles under **real mastheads** (GBC, Chronicle, Panorama, YGTV), incl. an invented quote from a real public figure (Minister Albert Isola, news.js n4) | **Severe** — fabricated journalism attributed to real outlets/people; the one category that could draw an angry email from an editor on day one |
| Property (property.js) | 20 invented listings badged with the 4 real agents | High (same false-attribution pattern) |
| Marketplace / noticeboard | Invented private sellers ("Maria L.", lost cat Milo) | Low (no real entities harmed) |
| Business dashboard | `seedDemoBookings()` injects 3 fake customers when a **real** owner publishes | High (real owner accepts ghosts) |
| Events (events.js) | Mix: 4 real festivals (National Day, Calentita, Music, Literary) + 6 invented (Sunset Yoga, Dolphin Regatta…), two already date-stale (e5 31 May, e6 5 Jun vs today 9 Jun) | Medium |
| Frontier | Honest by design (no fake data) | None — the model to copy |

### Options

- **(a) Clearly-labelled "example" listings** — cheap, honest, but a directory full of
  "EXAMPLE" badges looks like vapourware and still pollutes search/social shares.
- **(b) Founder-curated real public info** — list real Gibraltar businesses from public
  sources (name, category, area, public phone, hours — facts, like any directory/GibYellow
  does), booking **disabled** until claimed: "📞 Call" + "Own this business? Claim your free
  listing." This is how every directory bootstraps; it's legal (public facts), useful on day
  one, and turns demo data into a sales pipeline.
- **(c) Empty-but-inviting states** — honest, zero risk, but a discovery app that discovers
  nothing is dead on first open; only works for pure-UGC surfaces.

### Recommendation — one strategy, applied per surface type

**Adopt (b) as the primary strategy for the directory spine, (c) for UGC surfaces, and
delete every fabrication attributed to a real third party.** Concretely:

1. **Discover:** founder spends 2–3 evenings building 30–50 *real* business entries from
   public info (the research docs already name candidates). Booking enabled only for
   businesses the founder has actually spoken to (start with 3–5 friendly ones — a groomer,
   a barber, a PT — relaying requests via WhatsApp manually; that *is* the MVP);
   everyone else gets Call/Claim. Remove fabricated ratings/review counts entirely until
   real reviews exist (1.4).
2. **Jobs / Property:** delete the fabricated listings. Replace with honest **aggregation
   link-outs** (gov.gi/vacancies, RecruitGibraltar, Property Gibraltar, the four agents'
   sites — the research dossier maps them) styled as the same cards, until real direct
   postings arrive via the paid job SKU (§3). A links page that's honest beats a board
   that's fake.
3. **News:** delete the 8 fabricated articles. The live Chronicle RSS already works and is
   the better product; keep a *static* "About Gibraltar's news outlets" card as the offline
   fallback instead of fake stories (the current seed fallback is the only thing standing
   between file:// demos and an empty screen — an "offline / demo headlines" label is the
   minimum if any seeds must stay).
4. **Marketplace / noticeboard / chat contacts:** empty-but-inviting + the founder posting
   their own real first items (sell an actual KALLAX). Kill `seedDemoBookings()` for real
   publishes — replace with an empty "Share your link to get your first booking" state +
   a separate, labelled "Try a demo booking" button if the dashboard needs showing off.
5. **Events:** keep the 4 real festivals (verify 2026 dates), drop or label the invented
   ones, and add a date-floor so past events stop rendering as reservable.
6. Keep a global **"Demo data" switch** while showing the app privately: `RW.S.demo=true`
   shows today's rich seeds with an "EXAMPLE" ribbon; off = launch data. The
   `resetDemo` plumbing in account.js already half-exists.

---

## 6. Prioritized launch checklist

### P0 — must fix before showing *anyone* (≈ 2–4 founder-days, no backend required)

- [ ] **Fix the Bookings tab** (`activity.js:69` Array/`parts.filter` bug) — bookings must
      appear after `discConfirm` routes there; add a smoke-test assertion (booking ref in
      `#/activity` HTML; grep for `native code`).
- [ ] **Fix Property detail** (`property.js:483` `RW.navigate` → `RW.go`); smoke-test the
      `propertyView` action.
- [ ] **De-weaponise the demo data**: remove/disable booking on real-named businesses
      (Sacarello's), delete fake jobs at real employers, delete fabricated news articles
      (and the invented Isola quote), delete fake property listings under real agents,
      remove fabricated "(N reviews)" counts, kill `seedDemoBookings()` for real publishes
      — per §5.
- [ ] **Kill false-delivery toasts** (§4.2): honest demo wording, or wire `discMessage` to
      the existing chat; make news "Share" actually copy/share (`navigator.share`/clipboard).
- [ ] **index.html title + meta description** → marketplace pitch (§4.1).
- [ ] **Remove pre-pivot ghosts**: Courier chat thread + parcel replies, "orders, parcels"
      empty state, dead Account rows (or wire Help & support → `#/chat/support`).
- [ ] **Frontier copy honesty**: "saved on this device" until reports are shared (§4.4);
      same for cable-car "notify me" and the "Language updated" non-translation toast.
- [ ] **Fix "Buenas, morning"** greeting (§4.5) + the 🩸/🦍 emoji slips.
- [ ] **Weather: stop hardcoding 21°/Levanter** — wire Open-Meteo through a `/api/weather`
      proxy (clone of the news proxy) or hide the temperature.

### P1 — before public launch (≈ 2–3 weeks; this is the backend wave)

- [ ] **Supabase project**: magic-link auth + tables (profiles, businesses, bookings,
      listings/notices, frontier_reports, reviews, reports) with RLS; load supabase-js via
      CDN script consistent with `boot.js`; keep seed fallbacks news.js-style.
- [ ] **Name capture / first-run onboarding** (local), then real accounts; gate posting &
      booking behind login, keep browsing open.
- [ ] **Real directory**: 30–50 founder-curated real businesses, claim-this-listing flow,
      booking live for the 3–5 onboarded ones; "New on the Rock" home spotlight.
- [ ] **Booking lifecycle v1**: cancel button (make "Free to cancel" true), slots respect
      `biz.hours`, taken-slot greying, ISO `when` storage, "Add to calendar" (.ics) on
      confirmation; booking-accepted email via Resend free tier.
- [ ] **Review write-back** (form → Supabase, founder moderation flag) and remove seed
      reviews.
- [ ] **Global search** (`#/search` + provider registry over businesses/jobs/property/
      events/listings/attractions) + search field on Home.
- [ ] **PWA**: manifest + icons + precache SW + self-hosted Inter; "Add to Home Screen"
      nudge.
- [ ] **Legal & safety**: Terms, Privacy, UGC policy pages (+ footer links in Account);
      report button on listings/notices/reviews; check GRA data-controller registration.
- [ ] **Analytics**: Cloudflare Web Analytics (or GoatCounter) + booking/onboarding events;
      simple server-side log.
- [ ] **Open-data quick wins** (§2 #1–3): GIB+ES holiday calendar wired into Frontier &
      Home; Catalan Bay/Sandy Bay sea conditions via Open-Meteo marine; duty-pharmacy card.
- [ ] **Business funnel**: static `business.html` landing; onboarding submits to the founder
      (email/form) until self-serve is trustworthy; demo-data switch with EXAMPLE ribbons.
- [ ] Jobs/Property converted to honest aggregation link-outs until real supply exists (§5.2).
- [ ] Smoke-test hardening (actions for every feature, detail routes, `native code` grep).

### P2 — growth (post-launch)

- [ ] **Monetization switch-on**: "Featured on Rockway" £19/mo + job posts £29 via payment
      links (resolve the Stripe-in-Gibraltar question first: UK Ltd / PayPal / MoR — §3);
      "Featured" badges baked into Discover.
- [ ] **Carpool / lift board** for frontier commuters (accounts + report tooling first) —
      the most Gibraltar-shaped growth feature available (§2 #5).
- [ ] **Lost & found** as a headline surface + noticeboard photos/expiry; volunteer/charity
      view; weekly founder-authored poll.
- [ ] **Web push** (SW exists by then): booking updates + opt-in frontier alerts; "frontier
      heavy" is the notification people will install the app for.
- [ ] Shared frontier reports go live (community copy becomes true); typical-by-hour chart
      enriched by real report history.
- [ ] Real i18n for the EN/ES/Llanito switcher (ES at minimum — La Línea users are an
      untapped audience), or remove the switcher.
- [ ] SEO: pre-rendered static pages per category/business for indexable URLs; per-route
      `document.title` + share cards.
- [ ] Booking deposits via Stripe Connect (only when volume justifies; PSP holds funds,
      Rockway stays out of the money flow).
- [ ] Club-submitted sports fixtures; promoted events sold ad-hoc to the big four festivals.

---

*Method note: every feature file in `src/features/` plus all of `src/core/`, `index.html`,
`server.js`, `test/smoke.js`, `ROCKWAY.md`, `TODO.md`, `AGENTS.md`, `docs/research/*` and
`docs/gibraltar-research.md` was read in full. Bugs in §1.1 were reproduced in the project's
own headless harness (same shim as `test/smoke.js`); no app code was changed.*
