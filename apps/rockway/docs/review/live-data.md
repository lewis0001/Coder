# Live Data for Rockway — verified sources + novel displays

Research date: **2026-06-09/10** (probes run ~00:30–01:00 Gibraltar time).
Method: every endpoint below was hit directly with `curl` from this machine (a
**US datacenter IP**) and/or WebFetch; page sources were inspected for the real
underlying endpoints. Marks used:

- ✅ **VERIFIED** — responded with usable data during this research session.
- ⚠️ **CAVEAT** — works, but with a condition worth respecting (ToS, bot-walls, key signup).
- ❌ **NOT VIABLE** — checked and ruled out (with evidence).
- ❓ **UNCERTAIN** — could not be fully confirmed from here; verify from the deployment IP.

**Big environmental caveat:** several Gibraltar sites sit behind **SiteGround
"sgcaptcha" bot protection** or e-gov F5 BigIP and reject *datacenter* IPs
(`gibraltarport.com`, `gbc.gi`, `citibus.gi` all returned the same
`/.well-known/sgcaptcha/` challenge; `gha.gi` returned 403). They typically work
fine from a residential/browser context. Anything Rockway proxies server-side
must be re-tested **from the actual deployment IP** — a cheap home box or a
residential-ish host may outperform a cloud VM for these specific sources.

The existing `/api/news` Chronicle proxy in `server.js` (fetch → parse → 5-min
cache → JSON) is the template for everything below.

---

## 1. Bus tracker — track.bus.gi

### Verified facts
- ✅ `https://track.bus.gi/` is **live** (HTTP 200). It is **not a vendor product**:
  it's an in-house jQuery Mobile 1.4.5 webapp credited to the Gibraltar Bus
  Company's own IT dept ("IT&LD" logo), hosted on Gibraltar e-gov infrastructure
  (F5 BigIP cookie `BIGipServer~part_egov~kingpin.bus.gi_external...`).
- ✅ Route list (from `selectBRoute.html`): **1, 2, 3, 4, 7, 8, 9, N1, N8E, N8S**
  via `displayRoute.php?id=<route>&sys=1`.
- ✅ **The underlying endpoint exists and is open:**
  `POST https://track.bus.gi/busTracker.php?id=<route>` — the page polls it every
  **4 seconds** (`setInterval(..., 4000)` in the page source). It returns an
  **HTML fragment, not JSON**: a per-route schematic map image
  (`R2/cbackground.png` etc.) plus — when tracking is live — positioned bus
  marker elements layered over it. At test time (~00:40 local, no buses
  running) every route returned
  `"Bus Location is Currently Unavailable..."` + the background image, so the
  exact live marker markup (likely absolutely-positioned `<img>`s with inline
  `top/left` percentages) still needs one daytime capture to pin down. ❓
- ✅ Help page confirms the source: **dedicated GPS units on each bus**,
  transmitted over cellular to their tracking server; buses that go off-route
  vanish from the display.
- ❌ **No GTFS / GTFS-RT anywhere.** Mobility Database, Transitland and general
  search have no Gibraltar feed for Gibraltar Bus Company or Calypso Transport.
- ⚠️ `https://www.gibraltarbuscompany.gi/` is reachable (200) for timetables;
  `https://www.citibus.gi/` (which Google now lists for "Bus Routes Gibraltar")
  is **sgcaptcha bot-walled** from datacenter IPs (202 + challenge).
- Nothing covers **Calypso Route 5** (frontier shuttle) on track.bus.gi's route
  list — only GBC routes + night routes are present. Route 5 has **no live data**.

### Honest options
1. **Proxy + parse `busTracker.php`** per route, cache 5–10 s. It's an official
   public endpoint with no auth (same legal posture as the Chronicle RSS proxy:
   unprotected public data, low volume, attribute it). The schematic-map
   percentages can be re-projected onto Rockway's own stylised line. Effort: M.
   Risk: format is an HTML blob that could change silently; tracking is
   frequently "unavailable" (maintenance notices appear in their page comments).
2. **Fallback that always works:** static timetable + headway model
   ("Route 5 every ~15 min Mon–Sat") + **community "I'm on the bus / bus just
   passed X" reports** — identical UX pattern to the existing frontier reports.
3. Politely email the Bus Company for a blessed feed — it's a 21-bus operation;
   a solo founder asking nicely is plausible in Gibraltar's small ecosystem.

### Novel display — "One Road" strip
Gibraltar is functionally one corridor (frontier → town → Europa Point). Render
**a single vertical stylised line** (like a tube line, or the spine of the Rock
SVG) with stops as ticks and **live bus dots sliding along it** — no map tiles at
all. Route picker = coloured pills. When tracking is unavailable, dots degrade
to **ghost dots at timetable-predicted positions** plus community confirmations.
- Source: `busTracker.php` proxy (live) + hardcoded timetable (fallback)
- Update: poll proxy every 5–10 s
- Effort: **M** (parser + one daytime format capture; the strip itself is easy SVG)
- Wow: **High** — nobody renders Gibraltar transit as the one-road instrument it is.

---

## 2. Flights & the runway — Gibraltar Airport (GIB / LXGB)

### Verified facts
- ✅ `https://www.gibraltarairport.gi/` (200) **server-renders today's arrivals
  and departures in plain HTML** on the homepage (`#todays-flights-arrivals` /
  `-departures`): columns **From/To · Flight · Sched · Status**.
- ✅ `https://www.gibraltarairport.gi/airlines-and-destinations/live-flight-information`
  (200, ~88 KB) carries **16 tables = arrivals + departures for 8 days**
  (verified day headings "Wednesday 10 June" … "Wednesday 17 June"), with an
  extra **Expected** column (live estimate) and Status. No XHR/JSON behind it —
  it is server-rendered, so a proxy just scrapes these tables. No `robots.txt`
  exists (the URL 404s), so no declared crawl restrictions. ⚠️ Unofficial
  scrape; keep the cache long (the schedule changes rarely) and attribute.
- ✅ The schedule is **tiny** — sample day verified: arrivals EZY2267 (Manchester)
  10:10 · BA490 (LHR) 11:10 · BA492 (LHR) 14:55 · EZY8793 (LGW) 20:30, plus 4
  matching departures. ~6–10 movements/day total. This is what makes the runway
  feature computable.
- ✅ **OpenSky Network REST API** responds anonymously:
  `https://opensky-network.org/api/states/all?lamin=36.05&lomin=-5.45&lamax=36.25&lomax=-5.25`
  returned valid JSON (`states: null` at 00:38 local — nothing flying; correct).
  Documented quotas (verified in docs): **Anonymous 400 credits/day, Standard
  user 4,000/day, Active feeder 8,000/day**, per endpoint bucket
  (https://openskynetwork.github.io/opensky-api/rest.html). A small bbox
  `/states/all` call costs 1–2 credits → polling every ~3 min on a free
  registered account is comfortably inside quota.
  ❌ `/api/flights/arrival?airport=LXGB` anonymously returns
  "You cannot access historical flights" — needs a registered account.
- ✅ **Community ADS-B APIs all respond, no key:**
  - `https://opendata.adsb.fi/api/v2/lat/36.15/lon/-5.35/dist/25` → valid JSON
  - `https://api.airplanes.live/v2/point/36.15/-5.35/25` → valid JSON
  - `https://api.adsb.lol/v2/lat/36.15/lon/-5.35/dist/25` → valid JSON
  All free for reasonable/non-commercial use (adsb.lol is fully open). Good for
  the "plane is actually on final" trigger at ~1 req/s allowed rates.
- ⚠️ **AeroDataBox** (backup for schedules/FIDS): free/cheap tier ≈ **300–600
  calls/month** via RapidAPI/API.market, then $5/mo for 3,000
  (https://aerodatabox.com/pricing/). Viable but unnecessary while the airport
  page scrape works.
- Context (from docs/research/transport.md): since the Kingsway tunnel (2023),
  runway closures only gate **pedestrians/cyclists** at the level crossing —
  frame the feature for them.

### Novel display — "Runway countdown strip" (the signature feature)
GIB's day = ~8 movements. Each arrival/departure closes the pedestrian level
crossing for a short window (model ~10–15 min around the movement; tune from
observation). So the whole day is computable from the scraped schedule:
a horizontal **24-h strip with thin red "closed" bands**, a now-cursor, and a
headline: **"Crossing open · next closure ~14:40 — BA492 arriving from London
Heathrow."** Upgrade with live ADS-B: when the inbound aircraft is within ~40 km
and descending, flip to "closing in ~6 min — EZY2267 on approach" and animate a
tiny plane onto the Rock SVG's runway.
- Source: airport-site proxy (schedule + Expected, cache 15–30 min) + adsb.fi/airplanes.live or OpenSky for the live trigger (poll 30–60 s only around scheduled windows — near-zero quota cost)
- Update: schedule 2×/h; live positions only inside ±20 min of movements
- Effort: **M** (scraper S, closure model + strip M)
- Wow: **Very high** — directly useful (it gates the walk to Spain), unique to Gibraltar, and honest (label closure windows as estimates).

---

## 3. Ships in the Bay

### Verified facts
- ✅ **aisstream.io** — free live AIS **websocket**:
  `wss://stream.aisstream.io/v0/stream`; sign in **via GitHub** to mint an API
  key; subscribe with a JSON message containing the key + **bounding boxes**
  (e.g. `[[36.0,-5.50],[36.25,-5.20]]` for the Bay+Strait edge); message-type
  filters supported. Service is **BETA, no SLA**; docs state no explicit
  commercial restriction (https://aisstream.io/documentation). ⚠️ Treat as
  best-effort and build a "last known positions" cache. The Bay is one of the
  busiest bunkering anchorages in Europe — coverage there is excellent.
- ❌ **AISHub** — API access is for **members who contribute their own AIS
  receiver feed** (https://www.aishub.net/api). Not viable without hardware
  (though a ~£100 RTL-SDR on a Gibraltar balcony *would* earn both AISHub access
  and OpenSky/ADS-B feeder perks — a fun future hack, not an MVP step).
- ⚠️ **MarineTraffic embed** — a free basic iframe embed exists and is offered
  ("provided at no cost" for personal sites; customisation paid):
  https://www.marinetraffic.com/en/p/embed-map. Branded, not stylable, ToS-grey
  for a commercial app. Link-out or last-resort embed only.
- ✅ **VesselFinder embed** — explicitly offered free at
  https://www.vesselfinder.com/embed, configured by JS vars (their own example
  is `latitude="36.00", longitude="-5.40"` — the Strait): width/height, zoom,
  names, single-ship by IMO/MMSI. Good zero-effort fallback, but it's their
  branded map, not Rockway's aesthetic.
- ⚠️ **Gibraltar Port Authority cruise schedule** — the page **exists**:
  `https://www.gibraltarport.com/cruise/schedules` (confirmed via search index),
  but the whole domain is **sgcaptcha bot-walled from datacenter IPs** (202 +
  challenge on every variant tried; WebFetch also blocked). ❓ Likely fine from
  a residential IP / real browser — verify from deployment. Third-party
  aggregators (cruisetimetables.com, cruisemapper.com, crew-center.com) were
  also bot-blocked or empty from this IP, and scraping them is ToS-risky anyway.
  **Honest fallback:** cruise calls are a small dataset (~200/yr, published far
  in advance) → a monthly 10-minute manual import into a JSON file, or ask the
  GPA for the list by email.

### Novel display — "Bay radar" on the Rock hero
The home screen's state-aware Rock SVG gains the Bay as negative space at its
foot: **ships as slow-moving dots** (cargo/bunker = gold, cruise = white & big,
fast ferry = red dash), positioned by simple lat/lon→SVG affine transform from
the aisstream websocket, with a soft radar sweep. Tap a dot → name, type,
destination from the AIS voyage message. **Cruise-ship-day logic:** any vessel
with `ShipType` passenger + the (manual/scraped) cruise calendar feeds a
**"Cruise day — Main St & frontier busier ~10:00–16:00"** advisory chip on both
the Home hero and the Frontier feature (which frontier.md already models as
`isCruiseDay`).
- Source: aisstream.io websocket (server holds one connection, fans out snapshots via the proxy; cache last-known 60 s) + cruise calendar JSON
- Update: continuous (throttle UI to ~5 s ticks)
- Effort: **M** (websocket relay + dot layer; VesselFinder iframe version is **S** but generic-looking)
- Wow: **Very high** — the Bay is genuinely full of ships; the hero becomes alive at a glance.

---

## 4. Weather, sea & the Levanter

### Verified facts (all live-tested for 36.14, −5.35)
- ✅ **Open-Meteo forecast** (no key):
  `https://api.open-meteo.com/v1/forecast?latitude=36.14&longitude=-5.35&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=...,uv_index&daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min&timezone=Europe%2FGibraltar`
  → 200 with all variables. **Delicious live proof:** at test time it returned
  `wind_direction_10m: 83°` (easterly), `relative_humidity_2m: 94%`,
  `weather_code: 45` (fog) — **a textbook Levanter signature, happening live.**
- ✅ **Open-Meteo marine API** (no key):
  `https://marine-api.open-meteo.com/v1/marine?latitude=36.14&longitude=-5.35&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature,sea_level_height_msl&timezone=Europe%2FGibraltar`
  → 200. `sea_level_height_msl` returned a clean **semidiurnal tide curve**
  (verified oscillation, ~0.55 m range — correct for Gibraltar): lows ~05:00 &
  ~17:00, highs ~12:00 & ~23:00. High/low **times** fall out of finding local
  extrema. Label as **model-derived tide, not official predictions**.
- ✅ UV: `uv_index` hourly + `uv_index_max` daily in the same forecast call.
- ✅ Sunrise/sunset come free in `daily=` → drives the Rock SVG day/night state
  with zero extra calls (or compute locally with a suncalc port).
- Tides, official alternatives:
  - ❌ **UKHO ADMIRALTY Tidal API free "Discovery" tier** — free 1-yr key but
    covers **607 UK stations only** (British & Irish waters); Gibraltar is not
    included (https://www.api.gov.uk/ukho/uk-tidal-api-discovery/). EasyTide's
    website shows Gibraltar but scraping it is ToS-risky. ❌ for free use.
  - ⚠️ **WorldTides** (https://www.worldtides.info/developer) — prepaid credits,
    1 credit/call, **$1–5 per 1000 credits-ish, free credits on signup**; ~£5/yr
    at daily-cache rates. Fine *cheap* upgrade if official-grade tides ever
    matter; not needed for MVP.
- Levanter detection model (all inputs verified above): easterly wind
  (~60°–120°) + high RH (>80%) + cloud/fog code while surroundings are clear →
  "Levanter likely; banner cloud on the Rock". Westerly = Poniente. This is a
  *heuristic*, copy should say "conditions typical of the Levanter", and the
  MeteoGib webcam (below) is the visual confirmation link.

### Novel displays
1. **Levanter meter** — a dial that is really the Rock SVG itself: when easterly
   + humid, draw the **banner cloud streaming west off the summit** on the hero,
   with a one-line explainer ("Levanter in — humid easterly, cloud cap on the
   Rock"). Source: forecast call · Update: 15 min cache · Effort: **S** ·
   Wow: **Very high** (it's *the* local weather signature, and tourists don't
   understand why the sky is grey on top of the Rock only).
2. **Tide ribbon** — small SVG sine-ish curve for today with a now-dot, next
   high/low chips, SST for swimmers (Eastern Beach / Catalan Bay context).
   Source: marine call · Update: hourly · Effort: **S** · Wow: Medium.
3. **Sea-state chip for the Strait** — wave height/period as a 3-state badge
   (flat / chop / swell) feeding the dolphin-trip & ferry context in Explore.
   Effort: **S** · Wow: Medium.

---

## 5. Webcams

| Cam | URL | Status | Embed? |
|---|---|---|---|
| Official frontier queue cams (GBCA) | https://frontierqueue.gi/ | ✅ live; Angular app, streams served via **Angelcam** (`v.angelcam.com/js_sdk`), only API found is `GET /api/setting/unavailableDescription` (returns outage text; no wait-time API — confirms frontier.md) | ❌ **Link-out only.** ToS on the page, verbatim: "The Stream may not be used or re-streamed in any way or form." No X-Frame-Options header was present, so an iframe *works technically*, but it's against the spirit of the ToS — deep-link it instead |
| GBCA frontier info | https://www.gibraltarborder.gi/ | ❓ returned **503** on every variant at test time (site down or blocking) | re-check from deployment |
| **MeteoGib cam** (rotating: Rock / airport / Bay, from the World Trade Center) | https://www.meteogib.com/weather-webcam | ✅ 200; the cam itself is a **camsecure.uk iframe**: `https://camsecure.uk/httpswebcam/meteogib/meteogib.html` (MeteoGib embeds it at 100%×470) | ⚠️ Technically an open iframe URL; courteous move is to email MeteoGib (a friendly local weather outfit) for a yes — high chance of a partnership |
| Camsecure Gibraltar page (provider of the above) | https://www.camsecure.co.uk/gibraltar_webcam.html | ✅ 200 | link-out fine |
| EarthTV "Gibraltar Bay / cable car top" | https://www.earthtv.com/en/webcam/gibraltar-bay-cable-car | ❓ exists per search; EarthTV is commercial, embeds are paid | link-out only |
| Windy Webcams API | https://api.windy.com/webcams (docs: https://api.windy.com/webcams/docs → 200) | ✅ API live; needs **free key** (`x-windy-api-key`; 403 without, verified). Free tier verified on page: link/embed with link-back to windy.com, image URLs valid 24 h, listing offset ≤1000 | ⚠️ Embeddable **with attribution/link-back**; inventory near 36.14,−5.35 unknown until keyed — likely includes La Línea/Strait cams |
| SkylineWebcams Gibraltar | https://www.skylinewebcams.com/en/webcam/gibraltar/gibraltar.html | ❌ page is an **empty directory** (no actual Gibraltar cams listed; the old La Línea cam URL 404s) | — |
| Third-party queue-cam mirrors (gibraltarqueue.com etc.) | various | exist but are themselves re-streams of the GBCA feed | ❌ don't build on someone else's ToS breach |

**Net:** webcams are a **link-out gallery + (with permission) the MeteoGib
iframe**. The official queue cam stays a prominent deep link inside Frontier —
exactly what frontier.md already concluded.

---

## 6. Other automatable signals

- ✅ **Gibraltar public holidays — Nager.Date** (free JSON, no key):
  `https://date.nager.at/api/v3/PublicHolidays/2026/GI` → verified full 2026
  list incl. Commonwealth Day (2026-03-09). Cache yearly.
- ✅ **Spanish holidays for frontier risk** — same API, `/2026/ES` with regional
  `counties`: verified **12 holidays apply to Andalucía (ES-AN)** in 2026.
  Spanish holidays = heavier frontier traffic (already a flag in frontier.md's
  model: `isSpanishHoliday`).
- ✅ **Duty pharmacy** — two sources:
  - `https://www.dutypharmacy.gi/` → **200, server-rendered Next.js**, today's
    duty pharmacy fully parseable from HTML (verified live: "Ocean Spa Pharmacy,
    Unit 12B Glacis Road, tel 225 02152" + rota hours "Mon–Fri 7–9 pm, weekends
    & public holidays…"). ⚠️ Community-run site, unknown operator — scrape
    gently (cache 12 h) and/or ask; tiny payload.
  - Official GHA page `https://www.gha.gi/duty-pharmacy/` → **403 from this
    datacenter IP**; ❓ likely fine from deployment; treat as the authoritative
    cross-check.
- ✅ **News feeds:**
  - Gibraltar Chronicle `https://www.chronicle.gi/feed/` — ✅ valid RSS (already
    proxied by the app).
  - GBC `gbc.gi` — ❌ **sgcaptcha bot-wall** from datacenter IPs (202 challenge
    on /feed, /rss, /news). ❓ retry from deployment IP before ruling out.
  - YGTV `yourgibraltartv.com` — Joomla; `/feed` 404, `?format=feed&type=rss`
    errors, no `<link rel=alternate>` on the homepage → ❌ no feed found.
  - Panorama `gibraltarpanorama.gi/feed` — empty response → ❓/❌.
- ✅ **Gov.gi press releases** — `https://www.gibraltar.gov.gi/press-releases`
  → **200, 87 KB plain HTML from curl** (no bot-wall!), no RSS offered → easy
  scrape with the existing proxy pattern. Official notices (road closures,
  events, frontier advisories) are *the* civic signal in Gibraltar.
- ✅ **Football** — **TheSportsDB free API** (test key `123`):
  - `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=Gibraltar`
    → national team `idTeam=136464` (UEFA Nations League etc.).
  - `.../eventsnext.php?id=136464` → verified real fixture: **"Gibraltar vs
    Andorra", 2026-09-27, UEFA Nations League**.
  - Lincoln Red Imps `idTeam=140040`, league listed as "Gibraltarian National
    League". ⚠️ Free tier: shared key, be gentle (cache daily); domestic-league
    depth is patchy — national team + Europe is the reliable layer.
- ❌ **Fuel prices** — no official feed; only aggregators (findcheapfuel.com,
  Numbeo) with stale/ToS-grey data. Skip (or make it a community-reported price
  like frontier reports — fuel is a real cross-border topic).
- ⚠️ **La Línea events** — `https://www.lalinea.es/` and `/agenda/` both 200;
  municipal WordPress, Spanish-language, scrapeable but low-structure. Effort M,
  value niche → backlog.
- ✅ **Sun/moon/day-night** for the Rock hero — already covered by Open-Meteo
  `daily=sunrise,sunset` (verified) or computed locally; zero-cost state input.

---

## Novel display concepts — summary sheet

| Concept | What it looks like | Source(s) | Refresh | Effort | Wow |
|---|---|---|---|---|---|
| **Runway countdown strip** | 24-h strip of red closure bands + "next closure ~14:40 — BA492 arriving LHR"; live "on approach" via ADS-B; plane animates onto the Rock SVG runway | gibraltarairport.gi scrape + adsb.fi/airplanes.live/OpenSky | sched 30 min; live 30–60 s in windows | **M** | ★★★★★ |
| **Bay radar on the hero** | AIS ships as typed dots drifting across the Bay at the foot of the Rock SVG; tap for name/destination; radar sweep | aisstream.io websocket relay | ~5 s UI ticks | **M** | ★★★★★ |
| **Levanter meter** | The hero Rock grows its real banner cloud when easterly+humid; dial shows Levanter/Poniente state | Open-Meteo forecast | 15 min | **S** | ★★★★★ |
| **One Road bus strip** | Single stylised vertical line; live bus dots; ghost dots from timetable + community confirms when feed is down | track.bus.gi busTracker.php proxy + timetable | 5–10 s | **M** | ★★★★ |
| **Cruise-day advisory** | "MSC Meraviglia in port — Main St busy 10:00–16:00" chip on Home + Frontier (`isCruiseDay`) | manual/monthly cruise calendar (+ AIS passenger-type confirm) | daily | **S** | ★★★★ |
| **Tide ribbon + sea chip** | Mini tide curve w/ now-dot, next high/low, SST, wave-state badge | Open-Meteo marine | 1 h | **S** | ★★★ |
| **"Today on the Rock" morning briefing** | One composed card at 07:30: holiday?, duty pharmacy, flights today (closure count), cruise day?, Levanter?, frontier pattern for the weekday, top Chronicle headline | all of the above, already cached | daily compose | **S** (once sources exist) | ★★★★★ |
| **Duty pharmacy tile** | "Tonight 7–9 pm: Ocean Spa Pharmacy, Glacis Rd" + map link | dutypharmacy.gi scrape (GHA cross-check) | 12 h | **S** | ★★★ |
| **Matchday ribbon** | Next national-team/Red Imps fixture, countdown, result next morning | TheSportsDB | daily | **S** | ★★★ |
| **Civic notices feed** | gov.gi press releases as a "official" lane inside News | gov.gi scrape proxy | 1 h | **S** | ★★★ |
| **Webcam wall** | Link-out gallery: official queue cams, MeteoGib rotator (iframe w/ permission), Windy cams | frontierqueue.gi (link), camsecure iframe, Windy API | live | **S** | ★★ |

---

## Final priority table

| # | Feature | Source (verified) | Novelty | Effort | Notes |
|---|---|---|---|---|---|
| 1 | **Levanter meter + day/night hero state** | Open-Meteo forecast (no key) ✅ | Very high | **S** | Zero-risk, zero-cost, instant identity win; verified live with an actual Levanter signature during research |
| 2 | **Runway countdown strip** | gibraltarairport.gi HTML (today + 7 days, Sched/Expected/Status) ✅ + free ADS-B APIs ✅ | Very high (unique to GIB) | **M** | Label as estimate; pedestrians/cyclists framing per transport.md |
| 3 | **"Today on the Rock" briefing** | composition of 1,2,4,5,6 | High | **S** | Ship after any 3 sources exist; the retention feature |
| 4 | **Bay radar** | aisstream.io websocket (free key via GitHub) ✅; VesselFinder iframe as S-effort fallback ✅ | Very high | **M** | Beta service — design for stale-data grace |
| 5 | **Tide ribbon + sea state + UV** | Open-Meteo marine ✅ | Medium | **S** | Mark tides "model-derived"; WorldTides (~$/yr) if official-grade later |
| 6 | **One Road bus strip** | track.bus.gi busTracker.php ✅ (HTML fragments; live format needs one daytime capture ❓) + timetable & community fallback | High | **M** | No GTFS exists ❌; Calypso Route 5 has no live source — community reports only |
| 7 | **Duty pharmacy tile** | dutypharmacy.gi ✅ (GHA 403 from DC IP ❓) | Medium | **S** | Real daily utility for locals |
| 8 | **Public-holiday + Spanish-holiday flags** | Nager.Date GI & ES ✅ | Medium (feeds Frontier model) | **S** | Cache yearly; frontier.md already wants `isSpanishHoliday` |
| 9 | **Cruise-day warnings** | GPA page exists but bot-walled from DC IPs ⚠️❓ → monthly manual JSON import is the honest MVP | High | **S** (manual) / M (scrape from deployment IP) | ~200 calls/yr, published well ahead |
| 10 | **Civic notices lane** | gov.gi press-releases scrape ✅ (no bot-wall, no RSS) | Medium | **S** | Same proxy pattern as Chronicle |
| 11 | **Matchday ribbon** | TheSportsDB free key ✅ (fixture verified) | Medium | **S** | National team reliable; domestic league patchy |
| 12 | **Webcam wall** | frontierqueue.gi **link-out only** (ToS: no re-stream) ✅; MeteoGib/camsecure iframe ⚠️ ask; Windy API key ⚠️ | Low–Med | **S** | Queue cam stays a deep link inside Frontier |
| — | Fuel prices | none ❌ (or community-reported) | — | — | No official feed exists |
| — | La Línea events | lalinea.es ✅ reachable, unstructured | Low | M | Backlog |

### Implementation notes (for whoever builds this)
1. Reuse the `server.js` proxy pattern per source: fetch → parse → JSON →
   in-memory TTL cache → graceful `{ok:false}` fallback (the app already
   degrades to seeds). One aisstream websocket lives server-side and serves
   snapshots over the same pattern.
2. **Re-test the sgcaptcha-walled sources (gibraltarport.com, gbc.gi, gha.gi,
   citibus.gi) from the real deployment IP** before deciding they're dead —
   the block observed here is datacenter-IP-shaped.
3. Be a good citizen: generous caches (nothing above needs sub-5 s except bus
   dots and Bay ships), a named User-Agent with contact email, attribution
   lines in the UI ("Schedule: Gibraltar Airport · Ships: AIS via aisstream.io ·
   Weather: Open-Meteo").
4. Everything user-facing that is derived (closure windows, Levanter call,
   tide times, queue estimates) carries an "estimated" label + freshness stamp —
   the honesty rule from frontier.md applies app-wide.
