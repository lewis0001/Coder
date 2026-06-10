# ROCKWAY — Community, Social & Engagement Features

Research + product brainstorm for the COMMUNITY / SOCIAL / ENGAGEMENT pillar. Compiled 2026-06-10.

Scope: features that are mostly **user-generated or open-data**, so a solo founder can ship and run them **without partnerships**. Each is adapted to Gibraltar's specifics: ~32k people, 6.7 km², dense, multi-faith, English/Spanish/Llanito, and a **Spanish land border that ~15,000 people cross daily for work** (the single biggest behavioural fact about the place — most of it is commuter flow). [VERIFIED — gibraltarrelocation.com: https://gibraltarrelocation.com/blog/working-in-gibraltar-living-in-spain ; ~10,600 Spanish cross-frontier workers per GBC: https://www.gbc.gi/news/spanish-cross-frontier-workers-reportedly-feeling-uncertainty-fatigue-concern-over-absence-treaty]

Already built (per `_CONTEXT.md`) and NOT re-proposed: classifieds, jobs, property, events RSVP, chat, frontier queue reports + holiday flags, news, weather/marine, flights/runway, pharmacy, fixtures (national team via TheSportsDB), business directory + booking, reviews, Today briefing, noticeboard, global search, PWA.

Effort key: **S** = days, **M** = 1–3 weeks, **L** = 1+ month. Effort assumes solo founder, reuse of existing UGC + chat + notification plumbing.

---

## A. Hyperlocal staples

### A1. Lost & Found (pets-first)
- **Feature:** Post a lost or found item/pet with photo, last-seen pin on a map, date, contact-via-chat. Auto-expire/resolve toggle ("Reunited!"). Dedicated **Pets** sub-board (the highest-emotion, highest-share category on every hyperlocal app). Push to people who opted into Lost & Found alerts.
- **Why it fits:** 6.7 km² means a lost dog is genuinely findable by the crowd within hours — the area is small enough that a single post reaches the whole "neighbourhood." Lost & Found and pets are flagship categories on Nextdoor precisely because they convert lurkers into posters. [VERIFIED — Nextdoor Lost & Found is a named core category: https://reti.us/marketing/nextdoor-lost-found/]
- **Data/UGC source:** 100% user-generated. No partnership needed.
- **Effort:** **S** (reuses classifieds post model + map pin + chat).
- **Value:** High emotional pull, very shareable, drives sign-ups ("someone found my cat on Rockway").
- **Risks:** Scams (fake "found, pay to return"); stale posts. Mitigate with resolve/expiry and report button.

### A2. Neighbourhood alerts (community safety, honest framing)
- **Feature:** Lightweight, **user-posted** local alerts: roadworks, water/power cuts, a scam doing the rounds, a burst pipe, a gate closed. Map-pinned, category-tagged, time-stamped. Opt-in push within categories.
- **Why it fits:** Citizen proves real-time local alerting is sticky, but Citizen relies on **staffed scanning of 900 emergency radio channels** — impossible for a solo founder and legally fraught. [VERIFIED — Citizen R1 radio / staffed model: https://en.wikipedia.org/wiki/Citizen_(app)] ROCKWAY's honest version is **community-sourced** alerts, not fabricated "live" feeds — consistent with the no-fake-live-data constraint. Existing frontier-queue reports already prove the crowd will post timely status.
- **Data/UGC source:** UGC. Could overlay genuinely-open gov press releases later (gibraltar.gov.gi RSS) but not required.
- **Effort:** **M** (categories, map, opt-in push, dedup).
- **Value:** Medium-high; pairs with frontier alerts to build the "check Rockway first" habit.
- **Risks:** Misinformation / panic. Keep it factual-categories only (no crime accusations naming individuals); rate-limit; flag. Avoid anything resembling vigilantism.

### A3. "Ask the Rock" — recommendations & local Q&A
- **Feature:** Post a question ("best plumber on the Rock?", "paediatric dentist who takes GHA?", "where to buy calentita ingredients?"). Answers thread; recommended businesses **auto-link to existing Discover directory listings**; upvotes surface the best answer.
- **Why it fits:** "Recommendations" is one of Nextdoor's pillar features and taps neighbours' collective knowledge for trades/services. [VERIFIED — Nextdoor Recommendations: https://dxbapps.com/blog/nextdoor-app] In a 32k town the same dozen tradespeople come up repeatedly — answers compound into a living, SEO-friendly knowledge base and **feed the directory + reviews you already have** (growth flywheel).
- **Data/UGC source:** UGC, cross-linked to existing business directory.
- **Effort:** **M** (Q&A threading, upvotes, business cross-link).
- **Value:** High — evergreen content, strong SEO, reinforces Discover/reviews.
- **Risks:** Business owners gaming recommendations of themselves. Mitigate: show poster identity, limit self-recs, flag.

### A4. Free-stuff / food-sharing (OLIO model)
- **Feature:** "Give it away" board — surplus food, furniture, baby gear. Photo + pickup window + location + claim-via-chat. Sub-categories: Food (near-expiry, garden gluts), Household, Kids.
- **Why it fits:** OLIO's whole thesis is that **bottom-up, hyperlocal, real-time** redistribution works — average item is requested within ~21 minutes. [VERIFIED — OLIO ~21-min request time / hyperlocal model: https://www.aboutamazon.eu/news/aws/olios-tessa-clarke-tackling-food-waste-with-hyper-local-community-sharing-app] Density makes Gibraltar an ideal OLIO-style micro-market: every listing is within walking distance. Distinct from your paid classifieds (this is free/gift culture, lower friction, higher posting volume).
- **Data/UGC source:** UGC only.
- **Effort:** **S** (a free-flag variant of classifieds + pickup window field).
- **Value:** High volume of light, feel-good posts → habit + daily opens.
- **Risks:** Food safety liability — add a clear disclaimer; no cooked-food-from-strangers promotion beyond "at your own risk."

### A5. Borrow / lend / swap (tools, books, baby gear)
- **Feature:** A lending library board: list what you're willing to lend (drill, pressure washer, ladder, kids' books), request to borrow via chat, optional "due back" reminder. Could include a **book/board-game swap** sub-board.
- **Why it fits:** High-value, rarely-used items (a tile cutter, a carpet cleaner) are exactly what dense small communities should share rather than each buy. Trust is higher in a town where reputational stakes are real.
- **Data/UGC source:** UGC.
- **Effort:** **S–M** (variant of classifieds with lend/borrow state + return reminder).
- **Value:** Medium; nice differentiator, lower frequency than free-stuff.
- **Risks:** Disputes over damage/non-return. Keep platform out of liability ("arrange between yourselves"); lean on reputation/profiles (see C1).

### A6. Frontier car-pool & ride-share (the standout)
- **Feature:** Commuter car-pool matching for the daily La Línea / San Roque / Algeciras ↔ Gibraltar crossing. Driver posts a recurring route + departure window + seats; rider requests; match via chat; optional cost-share. Tie into existing **frontier queue reports** ("border is 45 min — leave now / share a car").
- **Why it fits:** This is the killer one. ~15,000 people cross **each direction daily**, mostly Spanish workers from La Línea, San Roque, Algeciras. [VERIFIED — gibraltarrelocation.com; GBC] They share the same chokepoint (Focona) on a predictable daily rhythm — the ideal carpool substrate. BlaBlaCar explicitly re-engineered for **small cities and the 85% who don't live near a transit hub**, matching riders to sub-segments of drivers' existing routes. [VERIFIED — BlaBlaCar small-city optimisation: https://techcrunch.com/2018/01/30/blablacar-is-optimizing-its-service-for-small-cities-and-has-a-new-visual-identity/] You don't need ML matching at this scale — a recurring-route board + time-window filter is enough.
- **Data/UGC source:** UGC. Departure-zone fields (LL/SR/Alg + Gib parking area).
- **Effort:** **M** (recurring routes, time windows, route matching, chat).
- **Value:** **Very high & uniquely Gibraltar.** Daily-frequency, money-saving, parking-scarcity-solving, border-pain-solving — exactly the kind of habit loop super-apps chase (Gojek's flywheel: a ride user becomes a food user because services compound). [VERIFIED — Gojek flywheel: https://onix-systems.com/blog/successful-cases-in-super-apps-development]
- **Risks:** Safety/trust (women commuters esp.), insurance/legal (cost-sharing vs. paid taxi — keep it strictly non-profit cost-share, with disclaimer), liability if matches go wrong. Reputation/verified profiles are the mitigation. Cross-border data/treaty sensitivity post-2025 deal — keep it purely a noticeboard, take no payment.

---

## B. Local sports

### B1. Local league fixtures, results & standings (beyond the national team)
- **Feature:** Fixtures / results / tables for the **Gibraltar Football League / National League** and ideally futsal, women's, youth — extending the national-team fixtures you already pull from TheSportsDB.
- **Why it fits:** Football is the centre of Gibraltar sport; clubs like Lincoln Red Imps, Europa FC, St Joseph's, Bruno's Magpies are followed locally. [VERIFIED — Sport in Gibraltar: https://en.wikipedia.org/wiki/Sport_in_Gibraltar] Matchday is a proven daily-habit hook (you already compose matchday into the Today briefing).
- **Data/UGC source:** **Caveat — honest data flag.** Aggregators (LiveScore, Flashscore, BetExplorer) carry Gibraltar National League tables, but these are **scraping targets, not licensed feeds**, and ToS/legality are dubious for a commercial app. [UNCERTAIN — coverage exists but feed terms unknown: https://www.flashscore.com/football/gibraltar/national-league/ ; https://www.betexplorer.com/football/gibraltar/national-league/] TheSportsDB's depth for the *domestic* league (vs. national team) is unverified. **Recommended honest path:** start with whatever TheSportsDB cleanly provides; for the rest, a **UGC/curator model** — let club admins or a volunteer post fixtures/results (cheap, accurate, no scraping risk). Confirm GibraltarFA.com publication terms before any automated pull.
- **Effort:** **M** (if TheSportsDB extends cleanly) → **L** (if building UGC league-admin tooling + tables logic).
- **Value:** High for the engaged football minority; matchday push is a habit driver.
- **Risks:** Data-source legality and accuracy; don't fabricate "live" scores you can't verify (violates the honest-data constraint).

### B2. Club & society directory (sports-first, then all clubs)
- **Feature:** Self-onboard directory for clubs — football, futsal, cricket (Gibraltar Cricket), rugby (GRFC), sailing (Royal Gibraltar Yacht Club), padel/tennis, athletics, plus non-sport societies. Each gets a profile: training times, contact, how to join, social links, "follow" for updates. **Reuse the existing business self-onboard + follow plumbing.**
- **Why it fits:** Gibraltar has a dense club scene across many sports and the GSLA runs the facilities. [VERIFIED — GSLA facilities + sport breadth: https://www.gsla.gi/facilities/ ; https://en.wikipedia.org/wiki/Sport_in_Gibraltar] A newcomer (or a relocating fintech worker) has no single "where do I join padel?" map today.
- **Data/UGC source:** UGC (clubs self-onboard), same model as For Business.
- **Effort:** **S** (it's the business directory with a "club" type).
- **Value:** Medium-high; evergreen, low maintenance, feeds events.
- **Risks:** Cold-start (need a handful of clubs seeded). Low ongoing risk.

### B3. Pitch / court availability (NOT a booking integration)
- **Feature:** Show GSLA facility info (padel, tennis, MUGA, 5-a-side, pool, sports hall) with **honest link-out to the official GSLA online booking system** — same pattern as your Frontier camera link-outs. Optionally a UGC "looking for players" board ("need 1 for padel tonight 7pm").
- **Why it fits:** GSLA already runs an online booking system (regs published 2024); facilities are public. [VERIFIED — GSLA facilities + online booking system regulations 2024: https://www.gsla.gi/facilities/] Don't rebuild it — link out honestly (your established proxy pattern). The **"need a 4th for padel" pickup board** is the genuinely additive, UGC part and very sticky for a padel-mad scene.
- **Data/UGC source:** Static facility info + link-out; UGC for player-finder.
- **Effort:** **S** (info + link-out + small UGC board).
- **Value:** Medium; player-finder is the hook.
- **Risks:** Low. Don't claim live availability you can't verify.

---

## C. Reputation, profiles & growth loops

### C1. Profiles & lightweight reputation
- **Feature:** A real user profile (name, photo, "Gibraltarian since / commuter from La Línea" optional badge), with history of helpful actions: items given away, recommendations made, found-pet reunions, verified email. Light reputation signal (helpful-count, verified badge) — **not** a heavy karma economy.
- **Why it fits:** Reputation is the trust substrate that makes carpool, lending, and free-stuff safe in a market where people will physically meet. WeChat-class super-apps grew on a **social/identity backbone**, then layered services on top. [VERIFIED — super-apps built on social/identity framework: https://blog.logrocket.com/product-management/super-apps-growth-playbook-tech-mirage/]
- **Data/UGC source:** Derived from existing activity.
- **Effort:** **M** (profile + activity aggregation + verification badge).
- **Value:** High (enabler for A5/A6/D); cross-cuts everything.
- **Risks:** Privacy — keep address/precise location private; let users control what's shown.

### C2. Follow businesses/clubs + referrals & invites
- **Feature:** Follow a business/club → get their posts/offers in a feed + push. "Invite a neighbour" referral with a tiny in-app reward (badge, early feature access — no cash). Share-out deep links for any listing (Lost pet, free sofa, carpool).
- **Why it fits:** In a 32k market, **word-of-mouth is the only viable acquisition channel** — referrals and shareable content are the growth loop. Lost-pet and free-stuff posts are inherently shareable (the OLIO/Nextdoor virality engine).
- **Data/UGC source:** N/A (mechanic on top of existing entities).
- **Effort:** **S–M** (follow already partly exists; add referral tracking + share links).
- **Value:** High for growth; modest for daily engagement.
- **Risks:** Referral abuse (fake accounts) — cap rewards, require verified email.

---

## D. Civic engagement

### D1. Community polls
- **Feature:** Quick one-tap polls ("Should the frontier open earlier in summer?", "Best beach: Catalan Bay vs Sandy Bay?"). Light, fun + occasionally serious. Results shown after voting.
- **Why it fits:** Lowest-friction engagement primitive; one tap, instant dopamine, very shareable. Great filler that keeps the feed alive on quiet days.
- **Data/UGC source:** UGC (you or users create polls).
- **Effort:** **S**.
- **Value:** Medium; cheap daily-engagement filler.
- **Risks:** Trivialisation/brigading — moderate poll creation initially (you create them).

### D2. Petitions ("Rock Voice")
- **Feature:** Residents create a petition, others sign (verified email, one per person), public signature count, optional thresholds that trigger visibility. Honest framing: this is **community pressure / sentiment**, not an official government channel.
- **Why it fits:** The UK e-petition model (10k → gov response, 100k → debate consideration) is well-understood and trusted. [VERIFIED — UK petitions thresholds: https://petition.parliament.uk/ ; https://en.wikipedia.org/wiki/UK_Parliament_petitions_website] A scaled threshold for 32k people (e.g. 1,000 signatures = "significant") gives civic weight without overclaiming.
- **Data/UGC source:** UGC + verified-email signing.
- **Effort:** **M** (one-person-one-signature integrity is the hard part).
- **Value:** Medium-high; episodic spikes (a hot local issue drives a surge of sign-ups).
- **Risks:** Duplicate/bot signatures undermine credibility; defamation in petition text. Verified email + moderation + clear "unofficial" disclaimer.

### D3. "Report a problem" — 311-style (honest, no false promises)
- **Feature:** Photo + map-pin + category (pothole, broken streetlight, fly-tipping, broken bench) → **shared public board**, with a generated, copy-ready report (and where a genuine official contact/form exists, a link-out to it). The honest twist: ROCKWAY is a **community log + escalation aid**, not the gov ticketing system — unless/until a real gov channel partners.
- **Why it fits:** FixMyStreet (UK) / NYC311 prove demand for photo-pin issue reporting; FixMyStreet's model is citizen-maps-it-then-routes-to-council. [VERIFIED — FixMyStreet model: https://www.fixmystreet.com/ ; NYC311 report-problems: https://portal.311.nyc.gov/report-problems/] But routing requires the council to receive reports — which a solo founder can't guarantee. So make value stand alone: a public, visible log creates accountability pressure even without an integration, and the data is genuinely useful UGC.
- **Data/UGC source:** UGC. Optional link-out to real gov forms.
- **Effort:** **M**.
- **Value:** Medium; strong civic credibility; risk of disappointment if users expect a fix.
- **Risks:** **Expectation management is the whole game** — never imply the gov will act. Frame as "community-reported, help raise visibility."

### D4. Consultations digest
- **Feature:** Surface official public consultations (open-data / gov press) with a "have your say" link-out + a community discussion thread.
- **Why it fits:** Cheap civic value layered on existing news/RSS plumbing.
- **Data/UGC source:** Gov press/RSS (link-out) + UGC discussion.
- **Effort:** **S** (if a gov consultations feed exists) — [UNCERTAIN: a structured GI consultations feed not confirmed].
- **Value:** Low-medium, niche.
- **Risks:** Low.

---

## E. Volunteering, charity & community good

### E1. Volunteering & charity board
- **Feature:** Charities/causes post needs (volunteers, donations, events); residents browse and respond. Profiles for the major local charities; tie into **GBC Open Day** (Gibraltar's biggest charity night) season.
- **Why it fits:** Gibraltar has a strong, well-known charitable culture — GBC Open Day has raised £2m+ and there's a published register of local charities. [VERIFIED — GBC Open Day £2m+: https://www.gbc.gi/open-day/donate ; register of GI charities: https://www.gibraltar.gov.gi/list-of-gibraltar-charities] Feel-good, shareable, community-defining content.
- **Data/UGC source:** UGC (charities self-onboard, same as business model) + public charity register for seeding.
- **Effort:** **S–M**.
- **Value:** Medium; reputation halo for the app, episodic spikes around Open Day.
- **Risks:** Fake fundraising/scams — verify charity identity against the public register before featuring; flag.

### E2. Blood-donation drives
- **Feature:** Show current GHA blood-donor need/registration info + push alerts when a drive is on; honest link-out to the GHA registration (blooddonations@gha.gi / phone).
- **Why it fits:** The GHA has publicly called for blood-donor registration (incl. Brexit contingency). [VERIFIED — GHA blood-donor call + contact: https://www.gbc.gi/news/gha-calls-public-register-their-interest-donate-blood] High-trust, life-saving, community-good content; a push when a drive is on is genuinely useful (not spam).
- **Data/UGC source:** Static GHA info + your manual/UGC drive posting + link-out.
- **Effort:** **S**.
- **Value:** Medium; strong goodwill.
- **Risks:** Don't fabricate "urgent" claims; only push verified drives.

### E3. Community fundraising board
- **Feature:** List local fundraisers/JustGiving-style campaigns (link-out to the real payment platform — ROCKWAY does **not** handle money). Discussion + share.
- **Effort:** **S** (link-out board).
- **Value:** Low-medium; folds into E1.
- **Risks:** Scam fundraisers — verify, flag, never take payment in-app.

---

## F. Llanito corner — language, culture & heritage

### F1. Llanito word/phrase of the day
- **Feature:** A daily Llanito word/phrase with meaning + (optional) audio + example (e.g. *focona* = the border; *liqueribá* = liquorice; *te llamo p'atrá* = "I'll call you back"). Surfaced in the Today briefing. Users submit/upvote words → crowdsourced living dictionary.
- **Why it fits:** Llanito is the heart of Gibraltarian identity but a **declining mother tongue** — celebrating it is differentiating, deeply local, and emotionally resonant; no competitor does it. [Cross-ref: `culture.md` (Llanito section, internal research).] A daily morsel is a perfect habit hook (Wordle-style ritual).
- **Data/UGC source:** Seed from your existing `culture.md` word list; then UGC submissions + upvotes.
- **Effort:** **S** (content scheduler) → **M** (UGC dictionary + audio).
- **Value:** **High for identity/retention**; uniquely Gibraltar; very shareable.
- **Risks:** Accuracy/authenticity of crowdsourced words (some blog-sourced words are dubious — see culture.md caveat). Light curation needed.

### F2. Local recipes & heritage (calentita & co.)
- **Feature:** Community recipe collection of Gibraltarian dishes — calentita (the "national dish"), rosto, panissa, torta de acelga — with stories; plus a heritage micro-feed (this-day-in-Gibraltar, National Day countdown to 10 Sept, macaque legend).
- **Why it fits:** Food + heritage are unifying, identity-affirming, evergreen and shareable; National Day (red & white, 10 Sept) is a built-in annual moment. [Cross-ref: `culture.md`.]
- **Data/UGC source:** UGC recipes + your heritage research.
- **Effort:** **S–M**.
- **Value:** Medium; warm, differentiating, low-frequency.
- **Risks:** Low. Light moderation.

---

## G. Notifications — daily habit vs. spam

The retention engine. Principle: **every push must be timely, personal, and actionable**, or it trains users to mute. Super-app stickiness comes from services that compound into a daily reason to open. [VERIFIED — super-app flywheel/engagement: https://onix-systems.com/blog/successful-cases-in-super-apps-development]

**Genuinely useful (ship these):**
- **Frontier alert** — "Border now ~50 min northbound" (already have queue reports). The #1 daily-relevant push for 15k commuters. [VERIFIED commuter volume above]
- **Your booking / your match** — booking reminder, carpool match, lent-item due-back, RSVP'd event today.
- **Matchday** — your followed club / national team kicks off today.
- **Lost & Found pet near you** — opt-in, high-emotion, time-critical.
- **Bin day / collection reminder** — classic habit-former (Gov collection schedule; [UNCERTAIN: open schedule source not confirmed — may need UGC/manual]).
- **Llanito word of the day** — opt-in ritual.
- **Blood drive on now** — verified, rare, high-value.

**Spam / avoid (default-off or never):**
- Generic "new listings posted" digests, engagement-bait ("5 people viewed your profile"), poll nags, anything non-personal at high frequency.

**Rule of thumb:** default-on only for things the user explicitly subscribed to (a route, a club, a category). Everything else opt-in. Per-category notification controls from day one.

---

## H. UGC moderation reality for a solo founder

The hard constraint: one person cannot watch a town-sized feed. Design so the **community + lightweight tooling** does the work. Industry consensus for small platforms: a report/flag system, block/mute, and an admin dashboard are **non-negotiable at launch**; founder-led manual review is sufficient while volume is low, then add cheap AI tooling as you grow. [VERIFIED — small-platform moderation guidance: https://www.unitary.ai/articles/why-user-generated-content-moderation-is-critical-for-small-and-medium-sized-platforms ; report/flag/admin-dashboard as baseline: https://lovable.dev/guides/how-to-make-a-social-media-website]

Practical, low-effort stack:
1. **Report/flag on every UGC object** → simple admin queue (reuse one pattern everywhere). **S**
2. **Block/mute users**; auto-hide content from blocked users. **S**
3. **Rate limits** (posts/hour, new-account cooldown) to throttle spam at the source. **S**
4. **Verified email required to post**; phone-verify for higher-trust actions (carpool, petitions). **S–M**
5. **Auto-hide on N reports** pending review (community-as-first-filter); founder reviews queue. **S**
6. **Trusted-user / club-admin roles** to delegate moderation of their own boards. **M**
7. **Keyword/spam filter** (cheap, deterministic) before any paid AI moderation. **S**; AI moderation only once volume justifies it.
8. **Clear, short community guidelines** + one-line disclaimers on risky boards (food safety, carpool, lending, "report a problem" expectations).

Reputation (C1) is also a moderation tool: trusted profiles, visible history, no anonymous high-risk actions.

---

## RANKED SHORTLIST (top 10)

Ranked by (Gibraltar fit × daily-habit potential × low solo-founder effort × honest-data safety):

1. **Frontier car-pool & ride-share (A6)** — uniquely Gibraltar, ~30k daily crossings, daily frequency, solves real pain. The signature feature. (M)
2. **Lost & Found, pets-first (A1)** — high emotion, shareable, trivial to build on existing models, drives sign-ups. (S)
3. **"Ask the Rock" recommendations/Q&A (A3)** — evergreen, SEO, feeds directory+reviews flywheel. (M)
4. **Free-stuff / food-sharing, OLIO model (A4)** — high-volume feel-good posts, density-perfect, low effort. (S)
5. **Llanito word of the day (F1)** — identity-defining habit ritual, uniquely Gibraltar, cheap. (S)
6. **Notifications done right (G)** — the retention engine that makes everything else sticky. (M, cross-cutting)
7. **Club & society directory + padel "need a 4th" player-finder (B2/B3)** — reuses business model, fills a real gap. (S)
8. **Neighbourhood alerts, community-sourced (A2)** — pairs with frontier to own "check Rockway first," honest framing. (M)
9. **Profiles & reputation (C1)** — the trust enabler for carpool/lending/free-stuff; cross-cutting. (M)
10. **Petitions "Rock Voice" + polls (D2/D1)** — civic weight + cheap daily-engagement filler, episodic spikes. (S–M)

Just below the line: Volunteering/charity board (E1), Report-a-problem (D3), Local league fixtures (B1 — gated on honest data source), Borrow/lend (A5), Recipes/heritage (F2).

---

## THE 3 MOST LIKELY TO DRIVE DAILY-HABIT RETENTION

1. **Frontier car-pool + frontier alerts (A6 + G).** The border crossing is the one thing ~15,000 people do **every single day** in both directions. A carpool match, a "border is 50 min — leave now" push, and a parking/cost saving make ROCKWAY a daily-utility before it's anything else. Nothing else in Gibraltar life has this frequency or universality. [VERIFIED commuter volume above]

2. **Llanito word of the day (F1).** The Wordle insight: a tiny, delightful, identity-affirming daily morsel creates a check-in ritual at near-zero ongoing cost — and it's emotionally unique to Gibraltar (a beloved, declining tongue). It costs almost nothing to run and is highly shareable ("¿sabes qué quiere deci...?").

3. **Lost & Found (pets) + Free-stuff feed (A1 + A4).** Together these generate a steady stream of high-emotion, time-sensitive, shareable posts — the OLIO/Nextdoor virality engine (item requested in ~21 min) — giving people a reason to open and refresh daily and pulling in non-users via shares. [VERIFIED OLIO ~21-min: aboutamazon.eu link above]

These three cover the three retention archetypes: **utility habit** (carpool/frontier), **ritual habit** (Llanito), and **serendipity/emotion habit** (lost-pets/free-stuff) — a balanced daily-open portfolio for a tiny bordered town.

---

## Source notes (VERIFIED / UNCERTAIN)
- **VERIFIED — ~15,000 daily crossings each way / ~10,600 Spanish cross-frontier workers:** https://gibraltarrelocation.com/blog/working-in-gibraltar-living-in-spain ; https://www.gbc.gi/news/spanish-cross-frontier-workers-reportedly-feeling-uncertainty-fatigue-concern-over-absence-treaty
- **VERIFIED — OLIO hyperlocal model, ~21-min request time:** https://www.aboutamazon.eu/news/aws/olios-tessa-clarke-tackling-food-waste-with-hyper-local-community-sharing-app
- **VERIFIED — Nextdoor Lost & Found and Recommendations as core categories:** https://reti.us/marketing/nextdoor-lost-found/ ; https://dxbapps.com/blog/nextdoor-app
- **VERIFIED — Citizen relies on staffed scanning of ~900 emergency radio channels (not replicable solo):** https://en.wikipedia.org/wiki/Citizen_(app)
- **VERIFIED — BlaBlaCar optimised for small cities / route-segment matching:** https://techcrunch.com/2018/01/30/blablacar-is-optimizing-its-service-for-small-cities-and-has-a-new-visual-identity/
- **VERIFIED — Gojek/super-app flywheel & social-backbone engagement:** https://onix-systems.com/blog/successful-cases-in-super-apps-development ; https://blog.logrocket.com/product-management/super-apps-growth-playbook-tech-mirage/
- **VERIFIED — Gibraltar multi-faith places of worship (Catholic, Anglican cathedral 1825, Methodist, ~5 synagogues, Ibrahim-al-Ibrahim mosque at Europa Point, Hindu Mandir inaugurated 2000):** https://www.hiddeneurope.eu/letter-from-europe/posts/unravelling-gibraltarian-identity/ ; https://en.wikipedia.org/wiki/Gibraltar_Hindu_Temple ; https://www.visitgibraltar.gi/see-and-do/religious-interest  *(B-list note: faith-community service-times/calendar directory — strong multi-faith fit, modeled as a UGC directory like B2; ranked just outside top 10 on frequency.)*
- **VERIFIED — Gibraltar sport breadth + clubs (Lincoln Red Imps, Europa FC, St Joseph's; cricket, GRFC rugby, Royal Gibraltar Yacht Club sailing):** https://en.wikipedia.org/wiki/Sport_in_Gibraltar
- **VERIFIED — GSLA facilities (padel, tennis, MUGA, 5-a-side, pool, sports hall) + online booking system regs 2024:** https://www.gsla.gi/facilities/
- **VERIFIED — FixMyStreet citizen-maps-then-routes model; NYC311 report-problems:** https://www.fixmystreet.com/ ; https://portal.311.nyc.gov/report-problems/
- **VERIFIED — UK e-petition thresholds (10k gov response / 100k debate consideration):** https://petition.parliament.uk/ ; https://en.wikipedia.org/wiki/UK_Parliament_petitions_website
- **VERIFIED — GBC Open Day raised £2m+; public GI charity register; GHA blood-donor registration call + contacts:** https://www.gbc.gi/open-day/donate ; https://www.gibraltar.gov.gi/list-of-gibraltar-charities ; https://www.gbc.gi/news/gha-calls-public-register-their-interest-donate-blood
- **VERIFIED — small-platform moderation baseline (report/flag/block/admin queue; founder-led then AI):** https://www.unitary.ai/articles/why-user-generated-content-moderation-is-critical-for-small-and-medium-sized-platforms ; https://lovable.dev/guides/how-to-make-a-social-media-website
- **UNCERTAIN — Gibraltar domestic league fixtures/results/tables data feed:** aggregators carry tables (https://www.flashscore.com/football/gibraltar/national-league/ ; https://www.betexplorer.com/football/gibraltar/national-league/) but feed licensing/ToS is unconfirmed; TheSportsDB domestic-league depth unverified; GibraltarFA.com publication terms not confirmed. Treat as UGC/curator-first to stay honest-data compliant.
- **UNCERTAIN — open feeds for bin/collection schedule and gov consultations:** not confirmed; may require UGC/manual seeding.
