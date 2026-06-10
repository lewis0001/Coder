# Transport, Travel & Maritime — Gibraltar (Rockway research)

Research date: **2026-06-10** (probes ~13:40 Gibraltar time — note: this is a
**daytime, buses-running** session, which finally lets us pin down the live bus
marker format that the live-data.md probe couldn't capture at 00:40).

Method: every endpoint was hit with `curl` (US **datacenter IP**) and/or
WebFetch; page sources inspected for real endpoints. Marks:

- ✅ **VERIFIED** — responded with usable data this session.
- ⚠️ **CAVEAT** — works, but with a condition (ToS, bot-wall, key, beta).
- ❌ **NOT VIABLE** — checked and ruled out (with evidence).
- ❓ **UNCERTAIN** — couldn't confirm from this IP; re-test from deployment.

**Environmental caveat (unchanged):** Gibraltar e-gov + SiteGround sites
(`gibraltarport.com`, `citibus.gi`, `gha.gi`, `gbc.gi`) reject **datacenter IPs**
with `sgcaptcha`/F5 challenges. Re-test everything server-side from the actual
deployment IP. The `server.js` proxy pattern (fetch → parse → TTL cache → JSON →
graceful fallback) is the template for everything below.

This doc deliberately goes **deeper/adjacent** to what live-data.md already
covered (flights, frontier, weather/marine/tides, holidays, deferred AIS + bus).

---

## 1. CRUISE SHIPS — the single highest-value transport signal

**Why it matters:** a cruise call dumps 2,000–5,250 passengers into a 6.7 km²
town for ~6–10 h. It is *the* driver of Main St crowding, taxi/tour demand,
frontier coach traffic and restaurant load. frontier.md already wants an
`isCruiseDay` flag; this is the data behind it.

### Sources & access model
- ⚠️❓ **Official: Gibraltar Port Authority** —
  `https://www.gibraltarport.com/cruise/schedules`. **Re-checked this session:
  still HTTP 202 + `sgcaptcha` bot-wall from datacenter IP** (confirmed
  `sgcaptcha` token in body; WebFetch returned empty). No JSON/ICS/CSV export
  link was visible in the challenge page. ❓ Almost certainly renders fine from a
  residential IP / real browser — **must be verified from the deployment IP**
  before ruling on whether it's directly scrapeable.
- ✅ **CruiseMapper** — `https://www.cruisemapper.com/ports/gibraltar-port-4030`
  fetched cleanly: a full **dated table (ship · arrival · departure)**, verified
  live for June 2026 (e.g. *ms Oosterdam* Jun 1 07:00–18:00; *AIDAcosma* Jun 9
  08:00–18:00; *Norwegian Dawn* recurring; *Mein Schiff 6* Jun 27 07:00–19:00).
  No API/JSON/export. Footer "Terms of use" — **scraping is ToS-grey**; fine as a
  *manual* monthly reference, not an automated proxy.
- ⚠️ **CruiseTimetables** —
  `https://www.cruisetimetables.com/gibraltar-uk-cruise-ship-schedule-2026.html`
  fetched cleanly, **Jun–Dec 2026 with passenger counts** (great for the
  crowding model: AIDAcosma 5,252 pax vs SeaDream I ~110). Carries explicit
  **©CruiseTimetables.com** — copyrighted; manual reference only.
- ❌ **AIS passenger-type cross-check** — when AIS is wired (§7), any vessel with
  `ShipType` = passenger sitting at the cruise terminal **confirms** a call in
  real time without scraping anyone. This is the honest "is a ship *actually*
  here right now" signal to pair with the calendar.

### Feature concept — "Cruise day" advisory + crowding meter
- A **monthly-maintained JSON** (`cruise-2026.json`: date, ship, pax, arr/dep)
  is the honest MVP — ~200 calls/yr, published far ahead, a 10-min manual import
  cross-referenced against CruiseMapper. From it derive:
  - Home-hero + Frontier chip: **"Cruise day — *AIDAcosma* (5,252) in port
    ~08:00–18:00; Main St & taxis busy, frontier coach traffic up."**
  - A **crowding meter** scaled by total pax in port that day (one ship vs
    "double day" with two calls — common in the CruiseMapper table).
  - Feeds Discover (restaurants flag "busy — cruise day") and Taxis (§5).
- Upgrade once the deployment IP confirms gibraltarport.com renders: a real
  scrape of the official schedule replaces the manual JSON.
- **Source/access:** manual JSON (honest MVP) → GPA scrape (verify from
  deployment) → AIS confirm. **Effort:** S (manual) / M (scrape). **Value:**
  Very high. **Caveat:** label as "scheduled — subject to change"; never invent
  a ship that isn't on the calendar.

---

## 2. FERRIES — Gibraltar ↔ Tanger Med (FRS/DFDS), + Algeciras alternatives

### Verified facts
- ✅ **Route exists, runs all year.** FRS (now **FRS DFDS** after the Jan 2024
  DFDS acquisition) operates **Gibraltar (cruise terminal) ↔ Tanger Med**,
  ~**1.5 h crossing**, low frequency (**1–2 crossings/week**, marketed as a
  19:00 departure on operating days), fares from **~€37.50**. Confirmed across
  Direct Ferries, Ferryhopper, Omio, NetFerry.
  (`https://www.ferryhopper.com/en/ferry-routes/direct/ferry-tanger-gibraltar`)
- ⚠️ **No clean official deep-link.** `frs.world/.../gibraltar-tanger-med`
  returned **404**; the brand now lives under DFDS at `frs.es`/`frs.world` with
  shifting URLs. **Omio is described as "the only official third-party seller"**
  for FRS Iberia. So a reliable deep-link points at an aggregator
  (Ferryhopper/Omio/Direct Ferries) rather than the operator.
- ✅ **Algeciras alternatives (the real ferry hub).** The high-frequency Morocco
  ferries run from **Algeciras** and **Tarifa** (Spanish side, ~20–40 min from
  the frontier): Algeciras ↔ Tanger Med, Tarifa ↔ Tanger Ville. Multiple
  operators (FRS DFDS, Balearia, AML). These are the practical option for most
  travellers; Gibraltar's own service is sparse and seasonal.

### Feature concept — "To Africa" / ferry card in Explore + Today
- A small **"Ferries to Morocco"** card: shows the **Gibraltar→Tanger Med**
  next sailing (from a hardcoded weekly schedule + "verify on operator", since
  it's 1–2×/wk and the operator URL is unstable), and a **"more frequent from
  Algeciras/Tarifa"** pointer with deep-links to Ferryhopper/Direct Ferries.
- Pair with the **Strait sea-state chip** (Open-Meteo marine, already verified
  in live-data.md): "Strait choppy today — crossings may be rough."
- **Source/access:** static schedule + aggregator deep-links (no scrapeable
  official feed). **Effort:** S. **Value:** Medium (niche but characteristically
  Gibraltarian — Africa is visible across the water). **Caveat:** "Schedules
  change seasonally — confirm with the operator"; do not present live
  availability we can't see.

---

## 3. CABLE CAR — closed; honest "what to do instead"

### Verified facts
- ❌/⚠️ **Closed for a full rebuild.** Officially **closed 18 Nov 2025**, ~2-year
  rebuild, **reopening targeted late 2027**. Throughput will jump from ~260 to
  ~1,150 pax/h with accessible cabins. Confirmed by multiple sources incl.
  VisitGibraltar's own Facebook announcement and the Wikipedia article.
  (`https://en.wikipedia.org/wiki/Gibraltar_Cable_Car`,
  `https://rockymonkey.gi/blog/gibraltar-cable-car-closed-2026-2027-guide`)
- ✅ Official site `naturereserve.gi/experiences/cable-car/` exists but the ride
  is **not sellable**; no live ticketing to integrate during the closure.

### Feature concept — "Cable car closed — get to the top instead" card
- A **status card** (CLOSED · reopening ~2027) that pivots straight into the
  *alternatives* people actually need: **taxi rock tours (§5), e-bike up (§6),
  Mediterranean Steps / walking routes (§6)**, and the Upper Rock Nature Reserve
  ticket. This turns a dead feature into a high-utility decision aid during the
  exact 2-year window tourists are confused (search volume confirms: "How to
  Visit Gibraltar in 2026: No Cable Car").
- **Source/access:** static status + internal links; flip to live ticketing when
  it reopens. **Effort:** S. **Value:** High *right now* (2026–27 is peak
  confusion). **Caveat:** state the reopening date as "expected late 2027".

---

## 4. AIRPORT / AIRLINES — deeper than the runway-strip already built

live-data.md already nails the **runway closure-countdown** (scrape
gibraltarairport.gi schedule + ADS-B). New/adjacent layers:

### Verified facts
- ✅ **Only two carriers, ~5 UK routes.** `gibraltarairport.gi/airlines-and-
  destinations/airlines-destinations` is **server-rendered HTML (scrapeable)**,
  lists **British Airways** (LHR) and **easyJet** (LGW, Manchester, Bristol,
  Birmingham). FlightConnections confirms easyJet ≈54% of departures. No
  long-haul, no Spanish domestic. This tiny, stable route map is fully modelable.
- ✅ **EES does NOT apply at the Gibraltar–Spain land border.** Per the **11 Jun
  2025 political agreement** and Gibraltar Gov **Technical Notice 748/2025**,
  there are to be **no routine immigration controls** Gib↔Spain/Schengen;
  Gibraltar residents/ID-card holders are **exempt from EES**. EES went fully
  operational at Schengen external borders **10 Apr 2026** and caused **up to
  3-hour airport queues elsewhere in Europe** — but the **frontier** is the
  exception. *This is a correction to any assumption that EES hammers the land
  border.* (`gibraltar.gov.gi/press-releases/technical-notice-schengen-
  entryexit-system-7482025-11319`)
- ✅ **Airport parking, scrapeable/known:** short-stay in front of terminal
  **£0.50/30 min up to £2.00 max (2 h cap, 08:00–21:00, no overnight)**, managed
  by Gibraltar Car Parks Ltd; **no long-stay at terminal** — multi-storey by
  Sundial Roundabout ~**£15/day**. (`gibraltarairport.gi/at-the-airport/car-
  parking`) Pay online via the same `parking.gibcarparks.com` portal as §9.

### Feature concept(s)
- **"Border & travel status" explainer chip** (high value, low effort): a plain
  honest card — *"Land frontier: no EES checks for residents/ID holders (Jun
  2025 treaty). Air arrivals: standard UK domestic-style entry."* Kills the #1
  tourist confusion of 2026. **Effort:** S. **Value:** High.
- **Route map mini-card** in Explore: "Flying out? GIB → LHR (BA), LGW/MAN/BRS/
  BHX (easyJet)" with deep-links to britishairways.com / easyjet.com. **S / Med.**
- **Airport parking tile**: live-ish status not available, but the **rates +
  "2h cap, use Sundial multi-storey for long-stay"** rule is itself the useful
  content. **S / Med.**
- ⚠️ **AeroDataBox** remains the cheap schedule backup (~300–600 calls/mo free,
  then $5/mo) if the airport scrape ever breaks — not needed while it works.

---

## 5. BUSES — the "One Road" strip is now fully spec'd (live marker format CAPTURED)

### Verified facts — the daytime capture live-data.md was missing
- ✅ **`busTracker.php` live-marker format is now confirmed.** At **13:43 local
  (buses running)**, `POST/GET https://track.bus.gi/busTracker.php?id=2`
  returned an HTML fragment:
  ```html
  <div ...>Last Updated: 10/06/2026 13:43:23 - <a href='routeInfo.php?id=2&sys=1'>More Info</a></div>
  <img id='backgroundImage' src='R2/cbackground.png' style='position:absolute;width:100%;max-width:700px;...'>
  <img src='R2/c4.png'  style='position:absolute;width:100%;max-width:700px;...'>
  <img src='R2/c15.png' style='position:absolute;width:100%;max-width:700px;...'>
  ```
  **The bus positions are encoded as which numbered PNG overlays appear.** Each
  `R<route>/c<N>.png` is a **pre-rendered full-frame transparent overlay with the
  bus drawn at schematic stop/segment N** (route 2's frame had buses at positions
  **4** and **15**). They stack full-width over `cbackground.png`. So the proxy
  doesn't need pixel math — it just **parses out the `c<N>.png` filenames** to
  know how many buses are live and which schematic segment each is at.
- ✅ **Polling:** `displayRoute.php` loads jQuery + jquery.mobile-1.4.5, defines
  `function refreshRequired()` and uses `setInterval` + `.load(...busTracker...)`
  to refresh the fragment (the 4 s cadence noted in live-data.md). Confirmed the
  page pulls `busTracker.php` via jQuery `.load()`.
- ✅ **"Unavailable" / error path:** `busTracker.php?id=5` returned
  **`Error 12 ...This page is unavailable at this time...`** with the Bus Company
  phone **+350 200 47622** / `info@gibraltarbuscompany.gi`. So **Route 5 (the
  Calypso/Citibus frontier route) is NOT on track.bus.gi** — confirming
  live-data.md: no live data for Route 5, community-reports fallback only.
- ✅ **Fares & "free" — corrected & precise:** **Routes 1, 2, 3, 4 are FREE for
  ALL passengers at all times** (not just residents — Gov free-bus policy).
  **Route 5 (frontier ↔ airport ↔ town) is the only fare-paying route**,
  operated **jointly by Gibraltar Bus Company + Calypso/Citibus** (red
  double-deckers): **£1.80 / €2.70 adult, £1.50 / €2.20 child.**
  (`gibraltar.gov.gi/transport-traffic-and-technical-services/bus-service`,
  `citibus.gi/tickets-and-fares` — ⚠️ citibus is sgcaptcha-walled from DC IP)
- ❌ **Still no GTFS / GTFS-RT** anywhere (Mobility Database / Transitland empty
  for Gibraltar). Moovit has Gibraltar lines (incl. Route 5) but no open feed.

### Feature concept — "One Road" live strip (ready to build)
- Single stylised vertical line (frontier → town → Europa Point). **Proxy
  `busTracker.php` per route, parse the `c<N>.png` filenames → N maps to a stop/
  segment index on Rockway's own line → place a dot.** No map tiles, no pixel
  math. Route pills 1/2/3/4 = free (green), 5 = paid (red).
- **Graceful degradation:** on `Error 12`/`unavailable`, fall to **timetable
  ghost-dots + community "bus just passed X" reports** (same UX as frontier
  reports). Route 5 is *always* timetable+community (no live source).
- Add a **"Buses are free" badge** on routes 1–4 — a genuine delighter most
  visitors don't know.
- **Source/access:** `busTracker.php` (open, unauthenticated public e-gov
  endpoint; same legal posture as the Chronicle RSS proxy) + static timetable +
  community reports. **Effort:** M (parser is now trivial; the strip SVG + the
  one-time stop-index mapping per route is the work). **Value:** High. **Caveat:**
  HTML blob format could change silently; tracking is frequently "unavailable" —
  design degraded state first. Attribute to Gibraltar Bus Company.

---

## 6. TAXIS, ROCK TOURS & MICROMOBILITY

### Verified facts — taxis
- ✅ **Gibraltar Taxi Association** is the regulated body; tours operate as
  **GTA Tours** (`gtagibraltartours.com`) and via VisitGibraltar's taxi-tours
  page. **Regulated rock-tour fares are fixed per-vehicle**, e.g. a **~2 h
  standard tour ≈ £360/vehicle (up to ~6 pax, Nature Reserve entry included)**;
  hourly tours from ~£30–40 quoted by individual drivers. (Prices vary by
  source/season — TripAdvisor + buytickets.gi.)
- ⚠️ **No public dispatch API / app.** Booking is **phone or in-person at the
  rank** (frontier, Main St, cruise terminal); individual drivers list personal
  mobiles. No Uber/Bolt (no ride-hailing operates in Gibraltar). So integration
  = **link-out / tap-to-call**, not a live dispatch feed.

### Verified facts — micromobility & walking
- ✅ **No public bike-share or e-scooter scheme** as of 2026 — only **private
  e-bike operators** (EBike-Gibraltar `ebike-gibraltar.com`, ~£35 rentals +
  "Rock to the Top" tours; plus GibTours/RockTours e-bike hire). Personal
  e-scooters: regulations still being formalised, roads not pavements.
- ✅ **Mediterranean Steps** is the marquee walking route: ~2–3 h, Jew's Gate →
  eastern face → near O'Hara's Battery, raw limestone/steps, big Strait/Morocco
  views; strenuous, proper shoes. (`takeyourbackpack.com/.../hike-mediterranean-
  steps/`). Royal Anglian Way is the gentler alternative.

### Feature concept(s)
- **"Get to the top" / Rock-tour card** (pairs with the closed cable car §3):
  tap-to-call GTA + private drivers, **regulated fare reference** ("~£360/2h per
  car, up to 6 — Nature Reserve included"), e-bike operators, and the
  **Mediterranean Steps walking route** with distance/time/difficulty + the
  **elevation profile** (compute from open elevation data — e.g. Open-Meteo /
  Open-Elevation along the path; honest "estimated"). **Effort:** S (links +
  static fares) / M (elevation profile + accessibility notes). **Value:** High
  during cable-car closure.
- **Accessibility lane:** because the cable car (step-free) is gone, an honest
  "step-free to the top? Only by taxi/road during 2026–27 closure; Med Steps and
  most trails are NOT accessible" note is genuinely useful. **S.**
- **Caveat:** fares are "indicative/regulated — confirm with driver"; trail times
  are estimates; no live taxi availability.

---

## 7. MARITIME — ships in the Bay (AIS) + marinas

### Verified facts — AIS
- ✅ **aisstream.io free websocket — re-confirmed this session.**
  `wss://stream.aisstream.io/v0/stream`; **API key via GitHub (or other) login**
  at `/apikeys`. Subscribe with JSON:
  ```json
  {"APIKey":"<key>","BoundingBoxes":[[[36.0,-5.50],[36.25,-5.20]]],
   "FilterMessageTypes":["PositionReport"]}
  ```
  ⚠️ **Still BETA, explicitly "no SLA / no uptime guarantee"**; throttling at
  key/user level; no stated commercial ban but design for stale data. The Bay is
  one of Europe's busiest bunkering anchorages → dense coverage.
  (`https://aisstream.io/documentation`)
- ⚠️ **VesselFinder embed** — free JS embed, configurable lat/lon/zoom (their own
  example centres **36.00, -5.40** = the Strait), names + tracks. **ToS allow
  external display with attribution/branding rules, but prohibit using content to
  build a competing AIS/maritime service** — so it's a fine **fallback iframe**,
  not a data source to re-skin. (`vesselfinder.com/embed`, `/terms`)
- ❌ **AISHub** — needs you to contribute your own receiver feed (hardware).
- ⚠️ **MarineTraffic embed** — free basic iframe, branded, ToS-grey.

### Verified facts — marinas
- ✅ Three marinas, all with public contacts (no live-berth API):
  **Ocean Village** (`oceanvillage.gi/marinas/`, short-term:
  `marinareception@oceanvillage.gi`), **Marina Bay** (`marinabay.gi`,
  adjacent/250+ berths combined), **Queensway Quay** (`queenswayquay.com`, 95–156
  berths, superyacht-oriented, **+350 200 44700**, `info@queenswayquay.com`).
  GPA lists them under `gibraltarport.com/yachting/private-marinas` (bot-walled).

### Feature concept — "Bay radar" (as live-data.md §3) + marina directory
- The Bay-radar dot layer from aisstream is the headline (already in live-data.md
  priority table). **New adjacent:** a **marinas directory card** (3 marinas,
  contacts, berth sizes, tap-to-email/call) for the yachting audience + a
  **"visiting by boat?"** entry that ties to Queensway Quay's VAT-reset niche.
- **Source/access:** aisstream websocket relay (free key) → VesselFinder iframe
  fallback; marina contacts are static directory data. **Effort:** M (radar) / S
  (marina cards). **Value:** Very high (radar) / Low–Med (marina directory).
  **Caveat:** AIS is best-effort beta — cache last-known, stamp freshness.

---

## 8. FUEL — cross-border price gap (community-reported model)

### Verified facts
- ✅ **The gap is real and a genuine cross-border behaviour:** Gibraltar fuel is
  notably cheaper than Spain — Spanish Euro-95 ~**€1.55/L**, diesel ~**€1.65/L**
  (Jun 2026, fuel-prices.eu); Gibraltar petrol quoted ~**£1.04/L**. La Línea
  residents routinely cross to fill up.
- ❌ **No official Gibraltar fuel feed.** Only aggregators with stale/ToS-grey
  data: `findcheapfuel.com/county/Gibraltar`, Numbeo, Expatistan,
  `gibraltarqueue.com/fuel-price-in-gibraltar/`. (Spain *does* have the official
  geoportalgasolineras API, but that's Spanish stations only.) ✅ Spain side could
  be pulled from the Spanish Govt fuel API if a Gib-vs-Spain comparison is wanted.

### Feature concept — community-reported fuel board + cross-border gap
- Same UX as frontier reports: users post **"£/L at <station> today"** for the
  handful of Gibraltar stations; show a **median + a "vs Spain" delta** (Spain
  side from the official Spanish gasolineras API, which *is* open). Headline:
  *"Filling up? ~£1.04/L here vs ~€1.55 in La Línea."*
- **Source/access:** UGC (community) for Gibraltar + Spanish Govt gasolineras API
  for the comparison. **Effort:** S (UGC reuses existing reports infra) / M (+
  Spain API + currency conversion). **Value:** Medium–High (very Gibraltar). 
  **Caveat:** "community-reported, not live" — never present a fabricated live
  price; show report age.

---

## 9. PARKING — zones + pay-by-app deep-link

### Verified facts
- ✅ **Residential Parking Scheme zones 1–4** exist (Zone 1 Jul 2017, Zone 2 Mar
  2018, Zone 3 = South District, **Zone 4 = West District** Marina Court→Ordnance
  Wharf). Each zone mixes resident-permit, free, Pay&Display, disabled, loading,
  motorcycle bays. (`gibraltar.gov.gi/transport-traffic-and-technical-services/
  parking`; Chronicle "Zone 4 parking scheme".)
- ✅ **Pay-by-app/web is live:** **`https://parking.gibcarparks.com`** — web
  portal for Pay&Display payments (also QR-code-at-bay), run by Gibraltar Car
  Parks Ltd; a "Gibraltar Parking" mobile app for FPNs + monthly rentals was
  announced. ❓ Not probed for an open API this session (likely none).

### Feature concept — "Parking" card
- A static **zone map (1–4) + rules explainer** ("which zones need a permit, where
  visitors can Pay&Display") with a **deep-link/QR to `parking.gibcarparks.com`**
  to pay, and a note on the **airport parking** rates from §4. No live-availability
  feed exists, so the value is the **explainer + pay deep-link**, not live spaces.
- **Source/access:** static zone/rules data + deep-link to the official pay
  portal. **Effort:** S. **Value:** Medium (locals + day-drivers). **Caveat:**
  no live availability; "pay via official portal."

---

## Ranked shortlist — top 8

| # | Feature | Source (access model) | Effort | Value | Honesty caveat |
|---|---|---|---|---|---|
| 1 | **Cruise-day advisory + crowding meter** (feeds Home hero, Frontier `isCruiseDay`, Discover, Taxis) | Manual monthly JSON (honest MVP) → GPA scrape if deployment IP clears the bot-wall ⚠️❓ → AIS passenger-type confirm ✅ | S→M | ★★★★★ | "Scheduled, subject to change"; AIS confirms only what's actually berthed |
| 2 | **"One Road" live bus strip** — marker format now fully captured (`c<N>.png` overlays = bus at segment N) | `track.bus.gi/busTracker.php` ✅ (open e-gov endpoint) + timetable + community fallback | M | ★★★★ | HTML blob may change; often "unavailable"; Route 5 = community-only; "buses 1–4 free" badge |
| 3 | **Cable-car-closed → "get to the top instead"** decision card | Static status (closed→~2027) ✅ + links to taxi/e-bike/Med Steps | S | ★★★★ | "Reopening expected late 2027"; flip to live ticketing then |
| 4 | **Border & travel-status explainer** (EES does NOT hit the land frontier) | Gov.gi Technical Notice 748/2025 + 11-Jun-2025 treaty ✅ | S | ★★★★ | Static policy summary; "no routine controls for residents/ID holders" |
| 5 | **Bay radar (AIS) + marina directory** | aisstream.io free websocket (GitHub key, BETA) ✅; VesselFinder iframe fallback ⚠️; static marina contacts ✅ | M (radar)/S (marinas) | ★★★★★ (radar) | Beta, no SLA — cache last-known, stamp freshness |
| 6 | **Rock-tour & micromobility card** (taxi tap-to-call + regulated fares, e-bike, Med Steps + elevation/accessibility) | GTA/VisitGibraltar links ✅ + EBike-Gibraltar ✅ + Med Steps data + open elevation | S→M | ★★★★ | "Indicative/regulated fares"; trail times estimated; flag non-accessible trails |
| 7 | **Community fuel board + cross-border gap** | UGC (reuses reports infra) + Spanish Govt gasolineras API for the Spain delta ✅; no Gib feed ❌ | S→M | ★★★ | "Community-reported, not live"; show report age |
| 8 | **Parking card** (zones 1–4 explainer + pay-by-app deep-link + airport rates) | gibraltar.gov.gi parking page ✅ + `parking.gibcarparks.com` deep-link ✅ | S | ★★★ | No live availability; pay via official portal |

**Below the line:** Ferry "To Africa" card (S, Medium — sparse Gib service, deep-link
aggregators); airport route mini-card / parking tile (folded into #4/#8);
MarineTraffic/VesselFinder generic embed (fallback only).

### Implementation notes
1. **First action: re-probe `gibraltarport.com/cruise/schedules` from the
   deployment IP.** It is the only thing standing between the manual-JSON MVP and
   a fully automated cruise feed (top feature). Still **HTTP 202 + sgcaptcha**
   from datacenter IP this session.
2. The bus proxy is now **trivial** — fetch `busTracker.php?id=<route>`, regex the
   `c<N>.png` filenames, map N→stop index per route once by inspection. Cache
   5–10 s; treat `Error 12` as the degraded state.
3. Reuse the `server.js` fetch→parse→TTL→graceful-`{ok:false}` pattern; one
   server-side aisstream websocket fans out Bay snapshots over the same JSON proxy.
4. Honesty rule (per frontier.md, app-wide): every derived/scheduled/community
   value carries an "estimated/scheduled/community-reported" label + freshness
   stamp; attribution line ("Buses: Gibraltar Bus Company · Ships: AIS via
   aisstream.io · Cruise: scheduled").

### Source URLs (cited)
- GPA cruise (bot-walled): https://www.gibraltarport.com/cruise/schedules
- CruiseMapper: https://www.cruisemapper.com/ports/gibraltar-port-4030
- CruiseTimetables (©): https://www.cruisetimetables.com/gibraltar-uk-cruise-ship-schedule-2026.html
- FRS/ferries: https://www.ferryhopper.com/en/ferry-routes/direct/ferry-tanger-gibraltar · https://www.directferries.com/frs.htm
- Cable car: https://en.wikipedia.org/wiki/Gibraltar_Cable_Car · https://rockymonkey.gi/blog/gibraltar-cable-car-closed-2026-2027-guide · https://naturereserve.gi/experiences/cable-car/
- Airlines: https://www.gibraltarairport.gi/airlines-and-destinations/airlines-destinations · https://www.flightconnections.com/flights-from-gibraltar-gib
- EES/border: https://www.gibraltar.gov.gi/press-releases/technical-notice-schengen-entryexit-system-7482025-11319
- Airport parking: https://www.gibraltarairport.gi/at-the-airport/car-parking
- Bus tracker (probed live): https://track.bus.gi/busTracker.php?id=2 · https://track.bus.gi/displayRoute.php?id=2&sys=1
- Bus fares/free: https://www.gibraltar.gov.gi/transport-traffic-and-technical-services/bus-service · https://www.citibus.gi/tickets-and-fares (bot-walled)
- Taxis/tours: https://gtagibraltartours.com/ · https://www.visitgibraltar.gi/see-and-do/taxi-tours
- Micromobility/walking: https://ebike-gibraltar.com/ · https://www.takeyourbackpack.com/backpacking-in-gibraltar/hike-mediterranean-steps/
- AIS: https://aisstream.io/documentation · https://www.vesselfinder.com/embed · https://www.vesselfinder.com/terms
- Marinas: https://oceanvillage.gi/marinas/ · https://marinabay.gi/ · https://queenswayquay.com/ · https://www.gibraltarport.com/yachting/private-marinas
- Fuel: https://www.fuel-prices.eu/Spain/ · https://findcheapfuel.com/county/Gibraltar · https://gibraltarqueue.com/fuel-price-in-gibraltar/
- Parking: https://www.gibraltar.gov.gi/transport-traffic-and-technical-services/parking · https://parking.gibcarparks.com/
