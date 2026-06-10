# Civic, Government & Public-Services data for Rockway

Research date: **2026-06-10**. Method: every URL below was probed with WebFetch
and/or cross-checked with web search. Marks:

- ✅ **VERIFIED** — fetched/confirmed live during this session.
- ⚠️ **CAVEAT** — works but with a ToS / bot-wall / key / login condition.
- ❓ **UNCERTAIN** — exists but could not be fully confirmed from this US datacenter IP; re-test from deployment.
- ❌ **NOT VIABLE** — checked and ruled out.

**Access-model vocabulary used:** *free API* (open JSON/REST), *API-key* (free
or cheap signup), *scrape* (server-rendered HTML, no feed), *link-out only* (no
data, deep-link the official page/app), *partnership needed* (must email the
owner).

**Big environmental caveat (carried over from `live-data.md` and re-confirmed):**
Gibraltar gov/health/utility sites sit behind **F5 BigIP / SiteGround sgcaptcha
/ generic 403** that reject *datacenter* IPs. In this session
`api.openchargemap.io`, `parking.gibcarparks.com`, `gibtele.com`,
`gha.gi`-adjacent pages, and the gov.gi statistics download tree variously
returned **403 / empty**. They almost always work from a residential/browser
context. **Anything Rockway proxies must be re-tested from the real deployment
IP** before being declared dead. The gov.gi *content* pages (press releases,
official notices, tender notices, parliament) answered fine from here, so the
proxy pattern is sound for those.

**Honesty posture for this whole category:** civic data is *the* place where
fabricated "live" status would do real harm (a wrong duty pharmacy or a stale
road-closure is worse than none). Almost everything below is best built as
**deep-link + last-checked timestamp**, not as fake real-time. Where it's a pure
link-out, say so in the UI.

**Not duplicating `live-data.md`:** it already wired news (Chronicle), weather,
flights/runway, ships, duty pharmacy, holidays, fixtures, bus tracker, webcams,
and the **gov.gi press-releases scrape**. This doc finds *new* civic ground and
treats the press-release scrape as an already-owned primitive it can extend.

---

## 1. Gibraltar OPEN DATA / statistics

### Findings
- ✅ The Statistics Office publishes through `gibraltar.gov.gi/statistics`:
  - `https://www.gibraltar.gov.gi/statistics/downloads` — Abstract of Statistics,
    GDP Estimates (2010–2025), Census (…2012, 2022), Air Traffic / Tourist /
    Hotel Occupancy / Employment surveys.
  - `https://www.gibraltar.gov.gi/statistics/statistics-topic-area` — tables by
    topic: Education, Electricity, Employment, Health, Housing, Justice, Port,
    **Public Toilets**, Social Security, Tourism, Transport, Water, Government
    Contracts, etc.
- ❌ **There is NO open-data portal and NO API.** Formats are **PDF and Excel
  only** (one "fillable" xlsx). No CSV/JSON, no CKAN/Socrata, no `statistics.gov.gi`.
  The Open Knowledge "Global Open Data Index" entry for GI is a stub.
- Access model: **scrape / manual** (download + parse PDFs/Excel once a year).

### Rockway concept — "Rock in numbers" facts strip / about-Gibraltar context
A small curated **stats widget** (population ~32k, GDP, tourist arrivals,
top employment sectors) sourced from a **once-a-year manual import** of the
Abstract of Statistics into a JSON file. Use it as flavour in Explore / Today,
and as denominators for other features (e.g. "X cruise passengers vs 32k
residents"). Not live — label "Source: HMGoG Abstract of Statistics 20XX".
- Source: gov.gi statistics PDFs · Access: **manual import (annual)**
- Effort: **S** (one-off curation) · Value: low–medium (context, not utility)
- Caveat: static; never imply it's live. Low priority.

---

## 2. eGovernment — deep-link targets (egov.gi / portal.egov.gi)

This is the **strongest civic opportunity**: a single, honest "Government
services" hub in Rockway that **deep-links** to the real eServices and their
informational landing pages, so residents stop hunting through gov.gi.

### Findings (✅ all confirmed this session)
- `https://portal.egov.gi/` and `https://portal.egov.gi/services` — full eServices
  directory, **public, no login to browse**.
- **Category deep-links work** (the per-service URLs like
  `/services/dvld/register-a-motor-vehicle` **404** — those search snippets were
  stale — so link to the *category*, not the leaf):
  - ✅ `https://portal.egov.gi/All-Services/DVLD` — loads the driving/vehicle
    list without login (verified).
- Full service catalogue verified at `/services`:
  - **Driving & Transport** — licence, learner's, IDP, CBT, book driving/theory
    test, **book MOT (roadworthiness)**, change of address, change of ownership,
    duplicate logbook.
  - **Health** — book a Primary Care advanced appointment, link GHA number,
    register/renew healthcare, request a sick note.
  - **Housing** — pay rent online, view waiting-list position, copy of tenancy
    agreement, apply for govt accommodation, paperless billing.
  - **Tax** (`https://tax.egov.gi/`) — pay income tax, tax return, manage tax
    code/allowances, S1 certificate, register for Tax eServices.
  - **Immigration & Home Affairs** — ID/Civilian registration card & permit of
    residence, certificate of residence, passport smartform, marriages & civil
    partnerships.
  - **Parliament & Elections** — register to vote / edit, search Register of
    Electors.
  - **Gazette** — publish a notice, subscribe to the Gazette.
  - **Town Planning & Building Control** — submit / view applications.
  - **Office of Fair Trading** — new business licence (corporate).
  - **FOI** request; **Lottery** results; **UBO register** search; **Property**
    (Register of Property Occupation).
- ✅ The **gov.gi informational pages** are stable, server-rendered and
  deep-linkable, and each links onward to the portal — e.g. the DVLD page
  `…/driving-licences/driver-and-vehicle-licensing-department` explicitly links
  `https://portal.egov.gi/All-Services/DVLD`. These are the right "context +
  jump" targets.
- Access model: **link-out only** (deep-link; auth happens on egov, not in Rockway).

### Rockway concept — "Government services" directory (deep-link hub)
A clean, searchable, **bilingual (EN/ES/Llanito-friendly)** index of the ~40
eServices grouped by life-event ("Driving", "Health", "Housing", "Tax", "Moving
to Gibraltar"), each a card with a one-line plain-English description, the
phone/email, opening hours, and a **"Open on Gov.gi" deep-link**. This is exactly
the kind of *navigation* layer a tiny island's fragmented gov estate lacks, and
it's **zero data risk** (pure link-out, plus a "verified DATE" stamp on the
descriptions). It also slots naturally beside Rockway's existing Discover
directory — same card UX.
- Source: portal.egov.gi + gov.gi landing pages · Access: **link-out only**
- Effort: **S–M** (curation of ~40 links + descriptions; no backend)
- Value: **High** (everyday utility for 32k residents + frontier workers)
- Caveat: links/labels drift; needs a quarterly re-check. Never embed the login.

---

## 3. Official apps already out there (so Rockway complements, not duplicates)

- ✅ **Gov.gi eServices** — official HMGoG app, iOS
  (`apps.apple.com/gb/app/gov-gi-eservices/id1641697110`) & Android
  (`play.google.com/store/apps/details?id=webviewgold.goveservices`). Covers tax,
  driving, GHA appointment booking, housing, **eGov Membership Pass** (digital ID
  / kiosks, "Smart City" 2025). **This owns the *transactional* layer.**
- ✅ **Gibraltar Parking** (smartsys) — iOS `id1599574054` / Android
  `io.smartsys.gibraltar`. Owns **live parking + payment**.
- ✅ **frontierqueue.gi** (web app) — owns the queue cams (link-out, per live-data.md).

**Implication:** Rockway should **not** rebuild auth-gated transactions or
payments. Its lane is **aggregation, navigation, context, and the things no
official app does** (a unified directory, civic notices in one feed, "what's
affecting me today"). Deep-link *into* these apps where a transaction is needed.

---

## 4. Civic notices, road closures, tenders, gazette, parliament

`live-data.md` already proved the **press-releases** scrape
(`gibraltar.gov.gi/press-releases`, 200, plain HTML, no bot-wall). The same
proxy pattern extends to several sibling pages — all ✅ confirmed
server-rendered and scrapeable this session:

| Page | URL | Status | Feed? |
|---|---|---|---|
| Press releases | `gibraltar.gov.gi/press/press-releases` | ✅ scrape (live-data.md) | no RSS |
| **Official notices** | `gibraltar.gov.gi/press/official-notices` | ✅ scrape; paginated list, dated; verified items "June 02 2026" back to Feb 2026 (RPI, beach facilities, vacancies…) | no RSS |
| **Tender notices** | `gibraltar.gov.gi/press/tender-notices` | ✅ scrape; "1–10 of 28", dated, e.g. *Smith Dorrien Bridge refurbishment* 29 May 2026 | no RSS |
| Procurement Office | `procurement.gov.gi` (+ Supplier Network Portal) | ❓ exists; supplier-registration flow | link-out |
| **Parliament — Bills** | `parliament.gi/proceedings-of-parliament/bills` | ✅ scrape; by year/month → PDFs; verified B20–B22/2026 (Supreme Court, Legal Services, Health Protection bills) | no RSS |
| Parliament — Agenda / Meetings / Hansard / Papers Laid / Motions | `parliament.gi/proceedings-of-parliament/*` | ✅ scrape; also has **live video** + **video archive** + audio + Hansard PDFs | no RSS |
| Gazette (publish/subscribe) | `portal.egov.gi/services/gaz`; subscribe by email `gazette@gibraltar.gov.gi` | ⚠️ email-subscribe / link-out; weekly Thursday PDF | no public API |
| Laws of Gibraltar | `gibraltarlaws.gov.gi` | ❓ link-out | — |

- ❌ **Road closures / roadworks / traffic notices have NO dedicated feed.** They
  surface inside **press releases + official notices** (gov.gi), and crucially
  via the **Royal Gibraltar Police WhatsApp channel** (see §6) which broadcasts
  road closures, missing persons, court outcomes. So the honest source for road
  closures = the gov.gi notices scrape + RGP news scrape + (link-out) the RGP
  WhatsApp channel, **plus Rockway's own community reports** (same pattern as the
  existing Frontier queue reports).
- ⚠️ Third-party tender aggregators (biddetail, tenderimpulse, tendersinfo,
  gibraltartenders.com) exist but are paywalled/ToS-grey — **don't scrape them**;
  use the official gov.gi tender-notices page.

### Rockway concept A — "Official lane" in News (extends the press-release proxy)
Add **Official Notices** and **Tender Notices** as separate filterable lanes
inside the existing News feature, alongside the Chronicle RSS and the
press-releases scrape — one "Government" tab with sub-filters
(Press / Notices / Tenders / Parliament). Same fetch→parse→TTL-cache→JSON proxy.
- Source: 3× gov.gi scrapes + parliament scrape · Access: **scrape** (no RSS)
- Effort: **S** (clones the existing press proxy) · Value: medium–high
- Caveat: no RSS so parse HTML defensively; cache ~1 h; attribute HMGoG.

### Rockway concept B — "Affecting me today" road/closure board
A civic board that **fuses**: (a) keyword-filtered gov.gi notices/press for
"road closure / diversion / works / water supply interruption", (b) RGP news
items tagged road/closure, (c) **community reports** ("Main St dug up at X"),
and (d) the runway pedestrian-crossing closures Rockway already computes. One
map-light list: "Open / Closed / Works", each with source + timestamp.
- Source: notices scrape + RGP scrape + UGC · Access: **scrape + UGC**
- Effort: **M** · Value: **High** (genuinely useful on a one-road peninsula)
- Caveat: label scraped items "official", community items "unconfirmed". This is
  where honesty matters most — never auto-promote a community report to "closed".

### Rockway concept C — "Have your say" consultations + parliament watch
- ✅ Public consultations are announced **only as press releases** (verified
  many: 25-Year Environment Plan, school half-days, voting age 16, audit
  threshold) — no consultations index page. So: keyword-filter the
  press-release scrape for "consultation" → a **"Have your say" card** with the
  deadline and the contact email/PDF link.
- Parliament: a "Next sitting / latest bills" widget from the bills + agenda
  scrape, deep-linking the **live video / Hansard**.
- Source: press scrape + parliament scrape · Access: **scrape**
- Effort: **S** · Value: medium (civic-engagement niche, but cheap)

---

## 5. Parking & EV charging

### Parking — Gibraltar Car Parks
- ✅ Live data **exists**: the **Gibraltar Parking app (smartsys)** shows
  red/amber/green markers with **per-car-park available-space counts** from
  installed **Smart Parking sensors** (verified via store listings + smartsys
  ecosystem). `parking.gibcarparks.com` is the web counterpart; `gibcarparks.com`
  is the corporate site (rentals, waiting list).
- ⚠️ `parking.gibcarparks.com/` returned **empty/blocked** to WebFetch (JS app
  and/or datacenter-IP block) — ❓ re-test from deployment. **No public/documented
  API found**; the live counts are inside the smartsys app, not an open endpoint.
  Treat live space-counts as **partnership needed** (ask smartsys/GCP Ltd for a
  feed) or **link-out only** to their app for now.
- Access model: **link-out only** (to the official app) / *partnership needed*
  for real counts.

### EV charging
- ✅ Data **exists and is small** (~9 stations: Midtown L6 incl. DC fast,
  Lathbury Sports Complex, etc.; networks Virta/Zunder/Tesla; ~44 Type-2
  connectors per electromaps).
- ⚠️ **OpenChargeMap** is the right open source but `api.openchargemap.io/v3/poi?...countrycode=GI`
  returned **403 from this datacenter IP** (both with/without a dummy key).
  OCM's real API is **free with a registered API key** (`X-API-Key` / `key=`
  param), CC-BY data. ❓ The 403 here is IP/edge-shaped; from deployment a keyed
  request to `countrycode=GI` should return the handful of GI POIs as JSON.
  Access model: **free API-key** (OpenChargeMap).
- Aggregators (Place to Plug, Electromaps, Chargemap, Octopus Electroverse) all
  list Gibraltar — **link-out** fallback if OCM proves unreachable.

### Rockway concept — "Where to park / where to charge" tile
Because the dataset is tiny (a dozen car parks, ~9 EV sites), Rockway can hold a
**hand-curated JSON of locations + tariffs + connector types** and render them on
its existing map UI, then **link out** to the Gibraltar Parking app for live
space counts and to the charger's network app to start a session. If OCM keys
out from deployment, layer the EV POIs live on top.
- Source: OCM (free API-key) for EV ✅❓ + curated parking JSON + link-out to
  smartsys app · Access: **free API-key + link-out**
- Effort: **S** (static + link-out) / **M** (OCM live layer)
- Value: medium (useful to drivers & visitors; small but real)
- Caveat: don't claim live parking spaces unless smartsys gives a feed — link-out
  to their app for that and say so.

---

## 6. Royal Gibraltar Police / Fire / Ambulance (safety)

### Findings
- ✅ `police.gi/news` — **server-rendered, paginated** news archive ("1–15 of
  1547"), dated items (arrests, charges, appeals), month/year filters. **No RSS**
  → scrapeable. ⚠️ It's a *police* site; scrape gently, attribute, cache long.
- ✅ `police.gi/report-online` and `police.gi/report/missing-person` — online
  report forms; **missing-person reporting page exists** but is a *form*, not a
  public case database. Link-out.
- ✅ **RGP WhatsApp channel** — official broadcast of **road closures, missing
  persons, court outcomes, policing matters** (announced via gov.gi / GBC).
  This is the de-facto real-time civic alert channel. **Link-out only** (WhatsApp
  channel deep-link) — not scrapeable.
- Emergency numbers (static facts, safe to hardcode): **999 / 112** emergency;
  **199** RGP non-emergency / urgent missing person; ambulance & fire via 190 /
  112. Verify exact non-emergency numbers from `police.gi/contact` and the GHA
  pages before shipping (small risk of error → label "check official").
- Fire & Rescue / Ambulance: no feed; info pages + numbers only → link-out.

### Rockway concept — "Safety & emergency" card + RGP appeals lane
A persistent, **offline-cached emergency card** (999/112, 199, GHA, coastguard,
border) — genuinely the kind of thing you want one tap away — plus an **"RGP
latest"** lane (scrape of `police.gi/news`, appeals + road items) and a prominent
**link-out to the RGP WhatsApp channel** as the real-time source.
- Source: hardcoded numbers (verified) + police.gi scrape + WhatsApp link-out
- Access: **scrape + link-out** · Effort: **S–M** · Value: **High** (safety)
- Caveat: emergency numbers MUST be correct and clearly "official"; appeals are
  scraped (timestamp + link to police.gi). Never present a scraped appeal as
  "active now" without the source link.

---

## 7. GHA / health

### Findings
- ⚠️ `gha.gi` historically **403s from datacenter IPs** (per live-data.md); ❓
  re-test from deployment. Content (service pages, contact, mental-health,
  PCC, blood) is otherwise public and link-worthy.
- ✅ **PCC appointment booking** is an **eService** ("Book a Primary Care
  advanced appointment", requires GHA-number link) → **deep-link** to
  `portal.egov.gi` / the Gov.gi app, don't rebuild.
- ✅ **Blood donation** — register via `blooddonations@gha.gi` / 20072266 ext
  2252, donors 18–60. Static info → card + link/email.
- ✅ **Mental health** — `gha.gi/service/mental-health/`; National Mental Health
  Strategy 2021-26; Community Mental Health Team. Helpline numbers exist (e.g.
  Samaritans Gibraltar) → a **"someone to talk to" card** of verified lines.
- ✅ **Vaccination / flu / COVID clinics** — announced as **press releases**
  (e.g. "GHA continues its Covid vaccination campaign", 840/2025) → surfaced by
  the press-release scrape; no booking API → link-out to eService.
- St Bernard's Hospital — info + numbers only → link-out.

### Rockway concept — "Health & wellbeing" hub
A card cluster: **PCC appointment** (deep-link eService), **duty pharmacy**
(already built), **blood donation** (info + email), **mental-health / crisis
lines** (verified numbers, offline-cached), and **vaccination notices**
(filtered from the press scrape). All deep-link/link-out; the only "live" parts
are the existing duty-pharmacy tile and the press-derived clinic notices.
- Source: gha.gi link-out + eService deep-link + press scrape + curated numbers
- Access: **link-out + scrape** · Effort: **S–M** · Value: **High**
- Caveat: crisis-line numbers must be verified and prominent; clinic dates carry
  a source/timestamp. Don't imply appointment availability.

---

## 8. Education, university, culture/library

### Findings
- ⚠️ Official **school term dates** live under `gibraltar.gov.gi/education`
  (Dept of Education) but the canonical machine-readable calendar wasn't found;
  individual schools publish PDFs, and `publicholidays.eu/gibraltar/school-holidays/`
  aggregates them. Access: **manual import** of term/holiday dates into JSON
  (changes once a year) — the reliable, honest path.
- ✅ **University of Gibraltar** `unigib.edu.gi`, **John Mackintosh Hall** &
  **public library** under **Gibraltar Cultural Services** `culture.gi`
  (`culture.gi/venues/john-mackintosh-hall/`, `culture.gi/library/`). GCS runs
  **100+ events/year**; events also announced as **gov.gi press releases**
  (e.g. "GCS Summer Activities…", 442/2026) and on MEECT (`meect.gov.gi/culture`).
  `culture.gi/whats-on/` returned empty to WebFetch ❓ (JS or path) — re-check;
  the press-release scrape is the reliable cultural-events source meanwhile.

### Rockway concept — "School calendar" chip + culture events lane
- A **term-dates / school-holidays chip** from a hand-imported JSON, feeding the
  existing Today briefing ("school holiday today → frontier/parking lighter,
  family events"). Effort **S**, value medium, caveat static-but-accurate.
- A **culture/library events lane** in the existing Events feature, seeded from
  the press-release scrape (filter GCS/library/JMH/unigib) + UGC. Effort **S**,
  value medium. These complement Rockway's existing Events (RSVP) cleanly.

---

## 9. Utilities self-service

### Findings
- ✅ **AquaGib** (water + the GEA electricity bill, one monthly invoice;
  100% govt-owned since Dec 2024) — `aquagib.gi`; **pay online** at
  `forms.aquagib.gi/payment/`; bill-explained page. **GEA** `gea.gi` (downloads,
  contact). Access: **link-out** to self-service payment.
- ⚠️ **No public power/water OUTAGE feed found.** Planned interruptions are
  announced as **gov.gi press releases / official notices** → caught by the
  notices scrape. Unplanned outages: no API → community reports.
- ✅ **Gibtelecom** — a **status page exists** but only for **Cloud & BaaS**
  (`cloud.status.gibtele.com`, powered by *Sorry™*, "All services running
  normally", has a `/api` status endpoint ✅❓). This is **not** consumer
  broadband/mobile status. Consumer `gibtele.com` **403'd** from this IP ❓.
  Access: **API-key/free** for the Sorry status JSON (enterprise scope) /
  **link-out** for consumer.

### Rockway concept — "Utilities" quick-links + outage notices
A small utilities card: **pay water+electric** (link-out to forms.aquagib.gi),
**Gibtelecom support / status** (link-out), and **planned-interruption notices**
surfaced from the press/official-notices scrape (water main works, scheduled
power cuts). Unplanned outages → community report ("power out in Catalan Bay")
with the same honesty labelling as Frontier reports.
- Source: link-out + notices scrape + UGC · Access: **link-out + scrape + UGC**
- Effort: **S** · Value: medium · Caveat: no real-time outage truth — be explicit
  that planned items are official and live outages are community-reported.

---

## 10. Waste, recycling, public toilets/benches/wifi

### Findings
- ✅ Waste/recycling info: `thinkinggreen.gov.gi/waste` (+ `/recycling`,
  `/local-waste-centres`) and `gibraltar.gov.gi/environment/waste`. Civic
  Amenities Site (Old Incinerator, Dobinson Way) hours **Mon–Fri 08–20,
  Sat–Sun 09–17**. Bring-bank recycling (Britannia services bins) + brown
  organic bins; WEEE bins. **No collection-by-address schedule / no API** — it's
  a contractor-run bring-bank + bin-store model (verified). Access: **scrape /
  curated static**.
- ✅ **Public toilets** appear as a **statistics topic area** (location/usage
  data exists in Abstract of Statistics) → can curate a **public-toilet
  locations JSON**. Benches/public wifi: no dataset found — UGC or skip.

### Rockway concept — "Recycling & amenities" map
A curated **map of recycling bring-banks, WEEE points, the Civic Amenities Site
(with hours), and public toilets** (toilets from the stats topic + manual
verification). Add a "what goes in the brown/blue bin" explainer. All static
curated JSON on the existing map UI + link-out to thinkinggreen.gov.gi.
- Source: thinkinggreen.gov.gi (scrape/manual) + stats topic · Access: **curated**
- Effort: **S–M** · Value: medium (everyday + tourist) · Caveat: locations
  hand-verified, dated; no live "is the bin full" data.

---

## Ranked shortlist — top 8 civic features to build

Legend for each: **[L]** pure link-out · **[D]** real data (scrape/API/curated) ·
**[P]** partnership needed for the best version.

| # | Feature | Type | Source(s) & access | Effort | Why it wins |
|---|---|---|---|---|---|
| **1** | **Government services directory** (life-event grouped deep-links to ~40 eServices + gov.gi landing pages, bilingual, "verified DATE") | **[L]** | `portal.egov.gi` + `gibraltar.gov.gi/*` — **link-out only** ✅ | **S–M** | Highest everyday value, zero data-risk, no official app does *navigation*; reuses Discover card UX |
| **2** | **"Affecting me today" road/closure & works board** (gov.gi notices + RGP news + runway crossings + community reports) | **[D]** + UGC | official-notices & press scrape ✅, police.gi scrape ✅, UGC | **M** | On a one-road peninsula this is genuinely useful; fuses owned primitives; honest official-vs-community labelling |
| **3** | **Safety & emergency card + RGP appeals lane** (offline 999/112/199 + GHA/coastguard; police.gi scrape; WhatsApp link-out) | **[D]**+**[L]** | hardcoded verified numbers + `police.gi/news` scrape ✅ + RGP WhatsApp link | **S–M** | Safety utility you want one-tap; cheap; appeals add stickiness |
| **4** | **Health & wellbeing hub** (PCC appt deep-link, blood donation, crisis lines, vaccination notices; duty pharmacy already built) | **[L]**+**[D]** | eService deep-link ✅, curated lines, press scrape ✅, gha.gi link-out ⚠️ | **S–M** | High value; mostly link-out so low risk; extends existing pharmacy tile |
| **5** | **"Government" lane in News** (Official Notices + Tender Notices + Parliament bills/sittings + "Have your say" consultations) | **[D]** | gov.gi notices/tenders scrape ✅ + parliament scrape ✅ (no RSS) | **S** | Near-free clone of the existing press-release proxy; civic transparency |
| **6** | **Where to park / where to charge** (curated car-park + EV JSON on map; live spaces & charging via link-out to official apps) | **[L]**+**[D]**+**[P]** | OpenChargeMap free API-key ✅❓ + curated parking + smartsys app link-out; live counts = **partnership** | **S–M** | Small but real driver/visitor utility; honest (link-out for live counts) |
| **7** | **Recycling & amenities map** (bring-banks, WEEE, Civic Amenities Site hours, public toilets) | **[D]** curated | thinkinggreen.gov.gi scrape/manual ✅ + stats topic ✅ | **S–M** | Everyday + tourist value; fully static so trivially honest |
| **8** | **School calendar + culture/library events** (term-dates chip feeding Today; GCS/JMH/library/unigib events lane) | **[D]** curated + scrape | manual term JSON + press-release scrape ✅ + culture.gi link-out ❓ | **S** | Cheap; feeds the existing Today briefing & Events; family-relevant |

### Cross-cutting notes
- **Reuse the `server.js` press-release proxy** for items 2, 4, 5, 7, 8 — they're
  all the same fetch→parse→TTL-cache→JSON→graceful-fallback pattern. **None of
  the gov.gi content pages offer RSS**, so parse HTML defensively and cache ~1 h.
- **No Gibraltar open-data API or GTFS-style anything exists** for civics —
  everything is scrape, curated-static, or link-out. Set expectations: Rockway's
  civic value is **aggregation + navigation + community**, not live government data.
- **Re-test from the deployment IP** before ruling out: `api.openchargemap.io`
  (EV, free key), `parking.gibcarparks.com`, `gha.gi`, `gibtele.com`,
  `culture.gi/whats-on`, and the statistics download tree — all 403'd/blocked
  here in a datacenter-IP-shaped way.
- **Don't duplicate official apps**: Gov.gi eServices owns transactions/payments;
  Gibraltar Parking owns live spaces+payment; frontierqueue.gi owns the cams.
  Deep-link into them.
- **Honesty labelling is the whole game here**: official scrape = source + "as of
  DATE"; community = "unconfirmed, reported by user"; emergency numbers = verified
  + "official"; never fabricate live status for closures, outages, appts, or
  parking spaces.

### Ruled out / dead ends
- ❌ Open-data portal / API / `statistics.gov.gi` — does not exist (PDF/Excel only).
- ❌ Dedicated road-closure / roadworks feed — none; only notices + RGP + UGC.
- ❌ Waste collection-by-address schedule / API — none (bring-bank model).
- ❌ Public power/water outage API — none (planned = notices, live = UGC).
- ❌ RSS anywhere on gov.gi / parliament / police.gi — none found.
- ❌ Third-party tender aggregators — paywalled/ToS-grey; use official page only.
- ⚠️ Gibcarparks live API — not public (partnership or link-out to their app).
