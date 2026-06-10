# ROCKWAY — Tourism / Visitor Layer (Deep Research)

Research date: 2026-06-10. Scope: a tourism/visitor layer for Gibraltar's large cruise +
day-tripper market. Solo founder, no licence, prefer automatable / open-data / UGC, honest
data, affiliate-revenue where possible.

Status legend: VERIFIED (confirmed via official/primary source) · UNCERTAIN (plausible but
unconfirmed or secondary-source) · NOT VIABLE. Access model = how Rockway would integrate
(affiliate deep-link / API-feed / open-data / UGC / link-out / build-from-own-data).
Effort: S (days) · M (1-2 weeks) · L (weeks+). Monetisation: affiliate %, lead-gen, or none.

NOTE on overlap: tides/beaches and live weather are already shipped in **Weather & Sea**;
attraction *info* exists in **Explore**; **Discover** already does local-business directory +
slot booking. This report focuses on NEW monetisable/visitor-specific layers and is explicit
where something extends an existing feature rather than re-proposing it.

---

## A. ATTRACTION TICKETING

### A1. Official Upper Rock Nature Reserve combined ticket — VERIFIED
- **Feature:** Surface the official combined "Nature Reserve" pass and deep-link to the
  official booking flow.
- **What it is:** A single ticket covering ALL Upper Rock attractions — St Michael's Cave,
  Great Siege Tunnels, City Under Siege, WWII Tunnels, O'Hara's Battery, **Skywalk**,
  **Windsor Suspension Bridge**, Moorish Castle, the footpaths/Mediterranean Steps, plus the
  100 Ton Gun (outside the reserve). Adult £30.00, Child (5-11) £22.00, under-5 free.
  Online booking with 90-day validity and full refund guarantee.
- **Source/access model:** Official site **naturereserve.gi/tickets** sells online but lists
  **no affiliate or API/feed** for third parties. visitgibraltar.gi/see-and-do/nature-reserve-pass
  is the Tourist Board info page. So official = **link-out only** (no commission).
- **Effort:** S (static info card + outbound link; Explore already has the attraction data).
- **Monetisation:** None directly from the official site. (See A3 — reseller deep-links earn
  commission on the same product.)
- **Honesty caveat:** Prices change (the £30/£22 above is current as of 2025-26 — must be shown
  with a "check official site" disclaimer, not cached as "live").
- Sources:
  - https://naturereserve.gi/tickets/
  - https://www.visitgibraltar.gi/see-and-do/nature-reserve-pass
  - https://www.stmichaelscave.com/tickets-and-entry

### A2. Cable car (under refurbishment) — VERIFIED (status), UNCERTAIN (reopen date)
- **Feature:** "Cable car: closed for refurbishment" status card; flip to ticketing on reopen.
- **What it is:** Cable car is **closed for full refurbishment**. visitgibraltar.gi labels it
  "Cable Car – Under Construction." Reseller/aggregator pages cite an expected reopening around
  **2027** (UNCERTAIN — no firm government date found). Pre-closure prices: adult return incl.
  Nature Reserve ~£49, one-way ~£46.50; standalone return ~£19 / one-way £16.50 via naturereserve.gi.
- **Access model:** link-out now; affiliate deep-link on reopen (resellers will carry it).
- **Effort:** S. **Monetisation:** none until reopen, then affiliate (via A3).
- **Honesty caveat:** Do NOT show it as bookable while closed; show status honestly. Treat 2027
  as "expected, unconfirmed."
- Sources:
  - https://www.visitgibraltar.gi/see-and-do/cable-car
  - https://naturereserve.gi/experiences/cable-car/

### A3. Reseller deep-links with AFFILIATE commission — VERIFIED (best no-licence revenue)
- **Feature:** For each Explore attraction, add "Buy tickets" buttons that deep-link to the
  same product on resellers, carrying an affiliate tag. These resell the official Nature
  Reserve pass and tours, so Rockway earns commission with **no licence and no inventory**.
- **Confirmed products & programs:**
  - **GetYourGuide** — sells "Official Rock Nature Reserve & All Attractions" pass (~$57-67)
    and an "Official City Pass w/ Rock Tour" bundle. **Affiliate program: ~8% commission,
    30-day cookie, monthly payout**, run in-house (partner.getyourguide.com) and via CJ Affiliate.
    Has a Partner API + widgets/banners. VERIFIED program; product VERIFIED to exist (deep-link
    page returned 403 to the fetch bot but is indexed and live).
  - **Viator** (Tripadvisor) — sells Nature Reserve admission pass + 20+ Gibraltar tours.
    **Affiliate: 8% standard (10% promo through Jan 2026), 30-day cookie**; pay once experience
    is completed. Joinable directly or via Travelpayouts; approval ~3-10 days.
  - **Tiqets** — attraction-ticket specialist; **gross-margin-share commission model**, has a
    free **Distributor API** + widgets. Good for museum/attraction tickets.
  - **Klook** — **attractions ~5%, tours/hotels 6.5%, eSIM up to 20%**; offers data feeds, API,
    white-label. Strong for the eSIM cross-sell (see G3).
  - **Expedia** — also lists the Upper Rock entry ticket (affiliate via EAN, but Booking/Viator
    are simpler for a small app).
- **Aggregator shortcut — Travelpayouts:** single account to join Viator, GetYourGuide, Tiqets,
  Klook, Booking.com, etc. Lets a brand-new app sign up before it has traffic (programs review
  the site/channel, but you can register early). This is the lowest-friction path for a solo founder.
- **Access model:** affiliate deep-link (+ optional API/feed/widgets from GYG/Tiqets/Klook).
- **Effort:** S for deep-links per attraction; M to ingest a product feed/widget for live pricing.
- **Monetisation:** **HIGH for this market** — every cruise/day-tripper buys a Rock pass or tour;
  8% of a ~£30-67 pass + tour bundles is the single most reliable revenue line in this report.
- **Honesty caveat:** Label clearly as reseller links; resellers price ABOVE the official £30
  (markup), so be transparent that the official site is cheaper — frame as "convenience/skip-queue"
  or always also show the official link. Disclose affiliate relationship.
- Sources:
  - https://partner.getyourguide.com/
  - https://www.getyourguide.com/gibraltar-l166/gibraltar-nature-reserve-official-pass-to-all-attractions-t590869/
  - https://www.viator.com/tours/Gibraltar/Official-Nature-Reserve-Pass-All-Attractions/d50813-455957P1
  - https://www.travelpayouts.com/en/offers/viator-affiliate-program/
  - https://www.tiqets.com/en/partner-program/affiliate/ , https://www.tiqets.com/en/partner-program/api-program/
  - https://affiliate.klook.com/home
  - https://www.travelpayouts.com/blog/tours-and-activities-affiliate-programs/

---

## B. TOURS & EXPERIENCES

### B1. Rock tours — taxi association / official guides — VERIFIED
- **What it is:** Gibraltar Taxi Association (GTA) and "Official Rock Tours" run licensed
  guided tours (6-8 seat vans), Tourist-Board-approved. ~£25-30pp, or whole vehicle ~£360 for
  a 2h standard tour incl. Nature Reserve entry (≈£60pp full van); WWII tunnels often +£7.
- **Access model:** GTA itself = link-out / Discover listing (UGC). The SAME tours are resold on
  Viator/GetYourGuide = **affiliate deep-link** (commission). buytickets.gi also lists private
  taxi tours.
- **Effort:** S. **Monetisation:** affiliate via reseller; or lead-gen for direct operators.
- **Honesty caveat:** Per-person price depends on group size — show "from" pricing only.
- Sources:
  - https://www.visitgibraltar.gi/see-and-do/taxi-tours
  - https://gtagibraltartours.com/
  - https://www.buytickets.gi/attractions/gibraltar-private-taxi-tours-11

### B2. Dolphin-watching boat tours — VERIFIED
- **What it is:** Three main licensed operators in the Bay — **Dolphin Adventure** (dolphin.gi,
  Marina Bay), **Dolphin Safari** (dolphinsafari.gi), and **Rock Tours** (rocktoursgibraltar.com,
  10% combo discount). Trips ~1-1.5h, multiple daily sailings; the Bay of Gibraltar has resident
  dolphins so hit-rate is high.
- **Access model:** operators have own booking sites (link-out / Discover listing). Also resold
  on Viator = **affiliate deep-link**. naturereserve.gi even offers a "Dolphin Safari" add-on.
- **Effort:** S. **Monetisation:** affiliate (Viator) or lead-gen.
- **Honesty caveat:** Sightings not guaranteed; don't over-promise.
- Sources:
  - https://www.visitgibraltar.gi/see-and-do/dolphin-watching-boat-trips
  - https://www.dolphin.gi/ , https://www.dolphinsafari.gi/
  - https://www.viator.com/tours/Gibraltar/Dolphin-Watching-Excursion-Gibraltar/d50813-8379P3

### B3. Walking tours & diving — VERIFIED (walking), UNCERTAIN (diving affiliate)
- **What it is:** Guided walking tours (visitgibraltar.gi lists official guided walking tours);
  third-party self-guided audio apps already exist (GPSmyCity, SmartGuide, Navicup). Diving
  operators exist in the Bay (wreck dives) but no major affiliate confirmed.
- **Access model:** walking tours resold on Viator/GYG (**affiliate**); diving = link-out/Discover.
- **Effort:** S. **Monetisation:** affiliate (walking via reseller); diving low/none.
- Sources:
  - https://www.visitgibraltar.gi/see-and-do/Guided-Walking-Tours

---

## C. "I HAVE X HOURS" CRUISE / DAY-TRIP ITINERARY PLANNER — composable, HIGH NOVELTY

- **Feature:** User picks arrival mode (cruise ship / car-or-coach from Spain / frontier on foot)
  and available time (cruise calls dock ~6-8h; day-trippers often 3-5h). Rockway composes a
  realistic minute-by-minute itinerary from **its own existing data**: Explore attractions +
  walking/cable-car/taxi times, Weather & Sea (Levanter/heat/UV warnings), Runway (avoid the
  airport-runway pedestrian crossing closing during a flight), Frontier (border queue reports for
  land arrivals), Events/holidays (closures), and affiliate "buy tickets" CTAs inline.
- **Why high novelty:** No competitor composes border-queue + runway-closure + weather + opening
  hours into a single time-boxed plan. It's the natural capstone that ties every existing Rockway
  feature together and is the perfect surface to embed A3/B affiliate links ("Pre-book your Rock
  pass to skip the queue").
- **Cruise market sizing (VERIFIED):** Gibraltar handled ~184 cruise calls in 2024, projected
  ~231 in 2025; historically 400k+ cruise passengers/yr. Cruise schedules are published by the
  **Gibraltar Port Authority** and visitgibraltar.gi (a usable data source — see F2). A new cruise
  terminal is at the bidding stage (Expression of Interest Jan 2026) — not yet built.
- **Access model:** build-from-own-data (no external dependency for the core); affiliate links layered in.
- **Effort:** M (routing/time-budget logic + UI) — but reuses data already wired.
- **Monetisation:** indirect but strong — it's the highest-intent funnel into ticket/tour affiliate clicks.
- **Honesty caveat:** Travel times are estimates; cable car is closed (route around it); flag
  Levanter/heat days when the Med Steps or Skywalk are unpleasant. Use Port Authority schedule
  honestly rather than fabricating "your ship leaves at X."
- Sources:
  - https://www.gibraltarport.com/cruise/schedules
  - https://www.visitgibraltar.gi/cruise-schedules
  - https://en.wikipedia.org/wiki/Gibraltar_Cruise_Terminal
  - https://www.gibraltar.gov.gi/press-releases/expression-of-interest-development-and-operation-of-a-cruise-liner-terminal-at-the-port-of-gibraltar-11591

---

## D. ACCOMMODATION

- **Feature:** Hotel discovery (The Rock, Sunborn floating hotel, The Eliott, Caleta, etc.) +
  short-stay listings; deep-link to booking.
- **Access model:** **Booking.com affiliate** (CJ/Awin/Booking Partner Hub) — 30-day cookie,
  affiliate earns ~25-40% of Booking's commission (≈4% of stay value on completed stays);
  progressive volume tiers. Expedia/EAN similar. Both are **affiliate deep-link**; Booking is the
  simplest for a solo app. Short-stays could also be **UGC** in the existing Property module.
- **Effort:** S (deep-links / search box widget). **Monetisation:** moderate — Gibraltar has few
  hotels and many visitors are day-only, so volume is lower than tickets, but per-booking value is higher.
- **Honesty caveat:** Disclose affiliate; show real availability via the partner, don't cache prices.
- Sources:
  - https://www.booking.com/affiliate-program/v2/index.html
  - https://affiliates.support.booking.com/kb/s/article/Commission-and-Payments
  - https://www.awin.com/us/advertisers/partner/booking.com

---

## E. RESTAURANTS / DINING

- **Feature:** Dining discovery + reservations. Rockway's **Discover "Dining"** already does
  directory + slot booking, so the new angle is (a) menus and (b) reservation depth.
- **Access model options:**
  - **OpenTable** has Gibraltar restaurant listings and a reservations/affiliate/widget program —
    deep-link or embed; best fit for the existing Dining tab.
  - **TheFork** (Tripadvisor) is strong in Spain/Europe and offers discounted-cover deals + an
    affiliate program; relevant given cross-border visitors.
  - Direct table booking via Rockway's own Discover slots = **UGC/self-serve** (no commission, but
    deepens the existing For-Business product).
  - Menus = **UGC** (businesses upload) — honest, low-cost.
- **Effort:** S (OpenTable/TheFork link-out) → M (deep menu/UGC integration with Discover).
- **Monetisation:** low (OpenTable pays restaurants-side, not always publishers; TheFork affiliate
  is modest). Primary value is engagement + supporting the existing For-Business funnel.
- **Honesty caveat:** Don't show "live availability" unless the partner feed provides it.
- Sources:
  - https://www.opentable.com/neighborhood/gi/gibraltar/gibraltar-restaurants
  - https://www.thefork.com/

---

## F. AUDIO / SELF-GUIDED TOURS  + OFFICIAL / OPEN-DATA RESOURCES

### F1. Self-guided / audio tours (record once, host free) — VIABLE, UGC/own-content
- **Feature:** Rockway hosts free self-guided routes (Main Street heritage walk, Upper Rock loop,
  Catalan Bay) with text + optional recorded audio + photos, pinned to the map (G). Add QR codes
  at landmarks/plaques linking to the relevant stop.
- **Why viable for solo founder:** record once, host as static content; competitors (GPSmyCity,
  SmartGuide, Navicup) charge for this — Rockway can give it free to drive ticket/tour affiliate clicks.
- **Content sources:** Gibraltar **Heritage Trust** + visitgibraltar.gi heritage/culture pages for
  facts; existing blue/heritage plaques around town. (No formal Heritage Trust API/feed found —
  content would be compiled manually or via UGC, with attribution.)
- **Access model:** own-content + UGC; link-out for facts.
- **Effort:** M (content creation is the cost, not engineering). **Monetisation:** indirect (drives
  A3/B affiliate clicks); honest because it's clearly editorial/community content.
- Sources:
  - https://www.visitgibraltar.gi/see-and-do/heritage-culture
  - https://www.gpsmycity.com/gps-tour-guides/gibraltar-5943.html (competitor benchmark)

### F2. Official Tourist Board / open data — VERIFIED (partial)
- **Gibraltar Tourist Board / visitgibraltar.gi** = authoritative info source (attractions,
  accessibility, cruise schedules, dolphin operators) — link-out / manual reference, no public API found.
- **Gibraltar Port Authority** publishes cruise schedules (usable for the C planner).
- **Gibraltar GeoPortal (geoportal.gov.gi)** = government geographic data service — potential source
  for accurate attraction/boundary/footpath geodata for the map (G). UNCERTAIN on open licence terms.
- **Access model:** open-data / link-out. **Effort:** S-M. **Monetisation:** none directly.
- Sources:
  - https://www.gibraltar.gov.gi/gibraltar-tourist-board
  - https://www.geoportal.gov.gi/
  - https://www.gibraltarport.com/cruise/schedules

---

## G. MAPS — free tiles for a Rockway map of the Rock — VERIFIED

- **Feature:** Interactive map of the Rock with attractions, dining, hotels, beaches, footpaths,
  apes' den, cruise terminal and TIC pinned; the substrate for the itinerary planner (C) and
  self-guided tours (F1).
- **Best stack for a tiny app:**
  - **MapLibre GL JS** (open-source renderer, no per-load fees) +
  - **Protomaps PMTiles** — single-file OSM basemap served from cheap object storage / Cloudflare
    via HTTP range requests. Cost example: ~50k map loads ≈ **$0.50/mo on Cloudflare** vs ~$350/mo
    on Google Maps. **Commercial use requires GitHub Sponsorship** of Protomaps (modest) OR
    self-generate `planet.pmtiles` from OSM yourself (free, ~2-3h build) and self-host.
  - Alternative free hosted tiles: **OpenFreeMap** (free, donation-backed).
- **Licensing:** OSM data under **ODbL** — free use with **visible "© OpenStreetMap" attribution**.
  Gibraltar is small (6.7 km²) so a clipped PMTiles file is tiny and cheap to host.
- **Access model:** open-data (OSM) + open-source (MapLibre); near-zero cost.
- **Effort:** S-M (clip Gibraltar extract, style, add pins; tide/beach data already exists).
- **Monetisation:** none directly; it's the canvas that increases affiliate conversion.
- **Honesty caveat:** Attribute OSM correctly; footpath/opening data must be marked as
  "from OSM/community, verify locally."
- Sources:
  - https://protomaps.com/ , https://protomaps.com/blog/free-tier-maps/
  - https://github.com/protomaps/basemaps
  - https://openfreemap.org/
  - https://maplibre.org (renderer)

---

## H. PRACTICAL VISITOR INFO — VERIFIED (high-value, honest, free)

A static "Know before you go" card set. All VERIFIED; pure own-content (no licence, no cost),
and a magnet for cruise/day-trip search traffic.

- **Passport / border / EES — VERIFIED + important honesty point:** UK & most visitors need a
  valid **passport** to enter Gibraltar. Crucially, under the **11 June 2025 UK-EU political
  agreement on Gibraltar**, the EU **Entry/Exit System (EES) is intended NOT to apply at the
  Gibraltar-Spain frontier** (now or future) — even though EES became fully operational at other
  Schengen borders on **10 April 2026**. This is a genuinely valuable, frequently-misunderstood
  fact Rockway can explain clearly.
- **Currency — VERIFIED:** Gibraltar pound (GIP), at parity with and interchangeable with GBP.
  GBP accepted everywhere; **euros widely accepted near the frontier** but at poorer rates; cards
  widely accepted. (Note: GIP notes may not be accepted back in the UK.)
- **Language — VERIFIED:** English (official) + Spanish + Llanito (local code-switching). Already
  in app context.
- **Electricity — VERIFIED:** Type G (UK) plugs, 230V/50Hz.
- **SIM / eSIM — VERIFIED + cross-sell:** Gibraltar sits **outside both UK and EU roaming zones**,
  so UK and EU SIMs may incur surcharges. Gibtelecom is the main network. A **travel eSIM**
  (from ~£1.50) is genuinely useful → **Klook eSIM affiliate pays up to 20%**, or Airalo affiliate.
  Honest, helpful, and the highest-commission affiliate category found.
- **Accessibility — VERIFIED:** Tourist Board gives **free Upper Rock access to disabled persons**;
  wheelchair-accessible taxi tours (~£90 first hr / £60 thereafter, 2h min); WWII Tunnels mostly
  accessible, Great Siege Tunnels partly, **St Michael's Cave interior not** wheelchair accessible;
  cable car difficult (and currently closed); Camp Bay has access ramps to the shoreline.
- **Apes etiquette / rules — VERIFIED:** Barbary macaques are wild and protected. **Feeding is
  illegal — fines up to £4,000.** **Touching/interfering is illegal** (offence since Aug 2020,
  except under licence). Keep bags in vehicles (they associate bags with food); keep food out of
  sight; recognise the "round-mouth threat"; don't stand between adults and babies or corner them
  in stairways. Strong, honest safety content.
- **Tides / beaches — ALREADY SHIPPED:** Eastern Beach (largest, sandy), Catalan Bay, Camp Bay,
  Sandy Bay. Tide ribbon + beaches already live in **Weather & Sea** — surface those here, don't rebuild.
- **Opening hours:** per-attraction (Explore data) + closures on Gibraltar public holidays
  (holidays proxy already wired). Show with "verify" disclaimer.
- **Access model:** own-content (H) + existing proxies; eSIM = affiliate.
- **Effort:** S. **Monetisation:** eSIM affiliate (high %); otherwise engagement/SEO.
- Sources:
  - https://www.gibraltar.gov.gi/press-releases/technical-notice-schengen-entryexit-system-7482025-11319
  - https://commonslibrary.parliament.uk/research-briefings/cbp-10676/
  - https://home-affairs.ec.europa.eu/news/entryexit-system-ees-fully-operational-2026-04-10_en
  - https://www.revolut.com/esim/gibraltar-esim/ , https://www.airalo.com/gibraltar-esim
  - https://www.worldstandards.eu/electricity/plug-voltage-by-country/gibraltar/
  - https://naturereserve.gi/general-guideline-when-viewing-the-macaques/
  - https://en.wikipedia.org/wiki/Barbary_macaques_in_Gibraltar
  - https://www.chronicle.gi/new-draft-law-protects-barbary-macaques-from-being-touched/
  - https://www.visitgibraltar.gi/accessibility , https://www.visitgibraltar.gi/accessible-sites
  - https://gibraltar.com/en/travel/see-and-do/beaches-and-bays/eastern-beach.php

---

## RANKED SHORTLIST (top 8)

Ranked by (revenue potential x fit with solo-founder/no-licence/honest constraints x novelty).

1. **Attraction-ticket reseller deep-links (A3)** — VERIFIED. The #1 money line. Every cruise/
   day-tripper buys a Rock pass or tour; GetYourGuide (8%), Viator (8-10%), Tiqets (margin-share),
   Klook all carry the exact products and pay commission with **no licence/inventory**. Travelpayouts
   = one-stop sign-up. Effort S. **Best affiliate opportunity overall.**

2. **"I have X hours" cruise/day-trip itinerary planner (C)** — HIGH NOVELTY, build-from-own-data.
   Unique composition of border-queue + runway-closure + weather + hours; ties every existing feature
   together and is the highest-intent funnel into the A3 affiliate links. Effort M.

3. **Practical visitor info pack (H)** — VERIFIED, free, honest, SEO magnet. The EES-doesn't-apply
   border fact, currency, apes-rules/fines, accessibility. Carries the **eSIM affiliate (up to 20%
   via Klook)** — the highest-percentage affiliate category. Effort S.

4. **Map of the Rock (G)** — VERIFIED near-zero cost (MapLibre + Protomaps/OSM, ODbL attribution).
   The canvas for #2 and #6; boosts conversion of every other feature. Effort S-M.

5. **Accommodation deep-links (D)** — VERIFIED. Booking.com affiliate (4%-ish of stay / 25-40% of
   their cut, 30-day cookie). Lower volume (few hotels, many day-trippers) but high per-booking value.
   Effort S.

6. **Self-guided / audio heritage tours (F1)** — VIABLE own-content/UGC. Free where competitors
   charge; pins to the map; drives ticket/tour affiliate clicks. Cost is content, not code. Effort M.

7. **Tours & experiences affiliate (B)** — VERIFIED. Rock taxi tours, dolphin-watching, walking
   tours all resold on Viator/GYG = affiliate; or lead-gen/Discover for direct operators. Effort S.

8. **Dining reservations (E)** — VERIFIED but lowest monetisation. Extend existing Discover "Dining"
   with OpenTable/TheFork deep-links + UGC menus; mainly engagement + supports the For-Business funnel.
   Effort S-M.

### Best AFFILIATE-revenue opportunities (no licence needed), in order
1. **Attraction tickets / Rock pass** via GetYourGuide / Viator / Tiqets / Klook (~8% + margin-share) — highest volume.
2. **eSIM** via Klook (up to 20%) / Airalo — highest percentage, genuinely useful for Gibraltar's out-of-roaming-zone status.
3. **Tours & dolphin trips** via Viator / GetYourGuide (8-10%).
4. **Hotels** via Booking.com (30-day cookie, volume-tiered) — highest per-booking value.

All affiliate joins are free and self-serve (Travelpayouts aggregates them); most require a quick
site review (3-10 days) but you can register before launch. Universal honesty rule: never cache
reseller prices as "live," always disclose the affiliate relationship, and where a reseller marks
up the official £30 Nature Reserve pass, also show/link the cheaper official naturereserve.gi price.
