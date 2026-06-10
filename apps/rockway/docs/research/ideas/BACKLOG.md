# Rockway — Feature Ideas Backlog (synthesised)

> Built from six verified research lanes in `docs/research/ideas/` (civic,
> transport, money, community, tourism, platform-ai). Each idea is scored on
> **impact × novelty × automatability ÷ effort**, and tagged for how it's
> sourced and whether it earns money without a licence.
>
> Tags: **[UGC]** user-generated · **[OPEN]** open/free data or API ·
> **[SCRAPE]** scrape-proxy (same pattern as our news/flights feeds) ·
> **[LINK]** honest link-out · **[AFF]** affiliate revenue, no licence ·
> **[PART]** needs a partnership for the best version.

## 0. Do-now honesty fixes (free, found during research)
These correct things already shipped — small edits, high integrity payoff:
- **Frontier: EES does NOT apply at the Gibraltar land border** (11-Jun-2025
  treaty + Gov Technical Notice 748/2025). Our Frontier pill currently implies
  it does — reword to "no routine EES controls for residents/ID holders."
- **Move: buses 1–4 are free for *everyone*** (only Calypso Route 5 is paid) —
  fix the "residents free" copy.
- **Cable car closed 18 Nov 2025 → ~late 2027** (unconfirmed) — Explore/Move
  already say closed; keep, and add the "get to the top another way" card.

## 1. Top 12 — highest conviction (cross-lane)
| # | Feature | Lane | Source | Effort | Earns? | Why it wins |
|---|---|---|---|---|---|---|
| 1 | **Frontier car-pool / lift board** | community | [UGC] | M | — | ~15k cross the border *daily* — the single most-repeated daily action on the Rock. Strongest retention hook we found. Reuses listings + chat + reputation. |
| 2 | **"Ask Rockway" smart concierge (no-LLM)** | platform | [UGC]/[OPEN] | M | — | Retrieval layer over the registry + live feeds + our new search providers. Answers "dog groomer free Saturday?" by composing directory + slot data — no generic bot can. £0, offline, can't hallucinate. Haiku fallback later (~£10–20/mo). |
| 3 | **Web Push notifications (VAPID, self-hosted)** | platform | [OPEN] | M | — | The habit engine: frontier spike, bin day, duty pharmacy, matchday, booking confirmed. £0. iOS needs PWA install → pair with an Add-to-Home-Screen flow. |
| 4 | **Attraction-ticket + tours affiliate** | tourism | [AFF] | S | **£££** | The #1 revenue line, no licence/inventory: resell the official Rock pass & tours via GetYourGuide/Viator/Tiqets/Klook (join all via Travelpayouts ~8%+). Always also link the cheaper official price. |
| 5 | **"I have X hours" cruise/day-trip planner** | tourism | [OPEN] | M | **£££** | Highest novelty — composes border-queue + runway-closure + weather + hours into a time-boxed plan, funnelling into #4. Nothing else on the market does this. |
| 6 | **Government services directory** | civic | [LINK] | S–M | — | Life-event-grouped deep-links to ~40 eServices + gov.gi pages, bilingual, "verified DATE". Highest everyday utility, zero data-risk; reuses Discover card UX. |
| 7 | **"One Road" live bus strip** | transport | [SCRAPE] | M | — | Marker format now captured (`busTracker.php` → `c<N>.png` overlays). A live stylised line of the single road, buses moving on it. Community + timetable fallback when the feed sleeps. |
| 8 | **Cruise-day advisory + crowding meter** | transport | [PART]/[OPEN] | S→M | — | "MSC Meraviglia in port — Main St & frontier busy 10:00–16:00." Feeds Home, Frontier, Discover, the planner. Manual monthly JSON now; AIS confirms what's actually berthed. |
| 9 | **eSIM + practical-visitor pack** | tourism | [AFF] | S | **££** | Gibraltar is outside *both* UK & EU roaming → eSIM genuinely needed; Klook pays up to 20% (highest %). Bundled with the EES/apes/currency/accessibility info pack (free SEO magnet). |
| 10 | **Map of the Rock** | tourism | [OPEN] | S–M | — | MapLibre + Protomaps/OSM ≈ **$0.50/mo**. The canvas for the planner, Discover pins, bus strip, parking, attractions — lifts conversion everywhere. |
| 11 | **Loyalty stamp-cards + Wallet passes** | money | [OPEN] | M | — | Digital "10th coffee free" for Discover businesses; Apple/Google Wallet `.pkpass` (free libs). A retention + business-acquisition hook; no licence (no money held). |
| 12 | **Lost & Found + Free-stuff (OLIO) board** | community | [UGC] | S | — | Lost pets + give-away surplus. High-volume, feel-good, walking-distance-relevant in a dense town → daily opens. A "free" variant of classifieds. |

## 2. Strong second tier
- **"Affecting me today" board** [SCRAPE+UGC] — gov notices + RGP + runway + community reports, one road = genuinely useful. (civic #2)
- **Calendar: subscribe-able webcal/.ics feeds** [OPEN] — events, fixtures, bin day, your bookings → permanent presence in the user's calendar. Underrated, ~£0. (platform §4)
- **Bay radar (AIS) + marinas** [OPEN, BETA] — aisstream.io free websocket; ships drifting across the Rock hero. Design for stale-data grace. (transport #5)
- **Club & society directory (sports-first)** [UGC] — football/padel/cricket/sailing + multi-faith communities; it's the For-Business model with a "club" type. (community B2)
- **"Ask the Rock" recommendations Q&A** [UGC] — "best plumber?" threads auto-link to Discover listings → SEO + directory flywheel. (community A3)
- **Safety & emergency card** [LINK+SCRAPE] — offline 999/112, GHA, coastguard + RGP appeals lane. (civic #3)
- **Health & wellbeing hub** [LINK+SCRAPE] — PCC appointment deep-link, blood donation, crisis lines (extends the duty-pharmacy tile). (civic #4)
- **Government lane in News** [SCRAPE] — official notices + tenders + parliament + consultations; near-free clone of the press proxy. (civic #5)
- **Accommodation deep-links** [AFF] — Booking.com (30-day cookie, high per-booking value). (tourism D)
- **Charity donation link-outs** [LINK] — JustGiving/PayPal Giving; community fundraising board. (money/community)
- **Borrow/lend/swap board** [UGC] — tools, books, baby gear; trust is high in a small town. (community A5)
- **Parking + EV card** [LINK+OPEN] — zones 1–4 explainer + pay-by-app deep-link + OpenChargeMap pins. (civic #6 / transport #8)
- **Recycling & amenities map** [SCRAPE/curated] — bring-banks, WEEE, civic-amenity-site hours, public toilets. (civic #7)
- **Community fuel board** [UGC+OPEN] — cross-border price gap (Spanish gasolineras API for the Spain side); community-reported for Gib. (transport #7)
- **i18n: English / Español / Llanito** [—] — lightweight, cheap signature differentiator; doubles as the concierge's query lexicon. (platform §7)

## 3. Money map (no licence — our own revenue or affiliate)
1. **Affiliate** (highest, zero ops): attraction tickets > eSIM (20%) > tours > hotels. Join via **Travelpayouts** before launch; always also show the official price.
2. **Our own revenue** (Stripe Payment Links — Stripe *does* support Gibraltar, no-VAT regime): Featured business listing, Featured event, Job post.
3. **Loyalty / Wallet passes** — drives sign-ups + business value; no money held.
4. **AVOID without a licence:** escrow, collected tips/splits, multi-merchant gift cards, custodied crypto (PSD2/e-money/GFSC-DLT territory).

## 4. Recommended build order
- **Wave A — habit & integrity (no new accounts needed):** honesty fixes (§0) → **Ask Rockway** smart concierge (no-LLM) → **frontier car-pool** → **Lost&Found/Free-stuff**. All UGC/registry — pure code.
- **Wave B — needs the server/keys:** **Web Push** (needs subscription storage — pairs with the Supabase step) → **Map of the Rock** → **One Road bus strip** + **cruise-day advisory**.
- **Wave C — revenue:** **affiliate tickets/eSIM** + **cruise-day planner** + **government services directory** + **accommodation** (register affiliates now; 3–10 day reviews).
- **Wave D — civic depth:** government News lane, safety card, health hub, parking/EV, recycling map, calendar feeds.

## Honesty posture (applies to every civic/live feature)
Never fabricate live closure/queue/appointment/parking/score status. Label
official-vs-community, stamp "as of DATE/Xm ago", and link the authoritative
source. This is the brand's moat in a town where wrong "live" info does real harm.
