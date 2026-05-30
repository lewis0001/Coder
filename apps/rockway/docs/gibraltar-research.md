# Gibraltar facts that drive the build (canonical)

Distilled from `docs/research/*.md` (six researched domains). **Build features
against THIS.** Where a generic super-app feature clashes with Gibraltar reality,
the reality wins. Fast-changing figures are illustrative — label live data as
"estimated".

## Hard corrections (don't get these wrong)
- **No ride-hailing.** Taxis = **Gibraltar Taxi Association (GTA)** only — single
  licensed operator, no Uber/Bolt. You use **ranks** (Casemates Sq, Cathedral Sq,
  airport, frontier) or phone. Rock tours priced by driver (~£22–25pp shared).
  Fares government-regulated/metered.
- **Cable Car is CLOSED** for full refurbishment, reopening ~**2027**. Model it as
  closed with a "reopening 2027" note. (When open: macaques/restaurant at Top.)
- **Runway crossing no longer stops cars.** Since the **Kingsway tunnel** (Mar
  2023) road traffic uses the tunnel; the at-grade airport crossing now mainly
  affects **pedestrians, cyclists, mobility scooters**. So "runway status" is a
  pedestrian/cyclist signal, not a driving one.
- **Ferries are volatile.** No dependable scheduled Gibraltar↔Algeciras passenger
  ferry (cross-border is by road/bus). **Gibraltar↔Tangier Med (FRS)** runs
  sporadically (~1–2×/week, often Fridays). Label "confirm live".
- **Electricity is billed by AquaGib**, not a standalone GEA portal — the GEA
  charge is a line item on the **AquaGib** bill. Salt-water mains = unmetered,
  paid via **Rates**, not a meter.

## Identity & language (use as garnish, not default voice)
- Demonym **Gibraltarian** (colloquial **Llanito/Yanito**). Language **Llanito** =
  Andalusian Spanish + English code-switching (declining — sprinkle, don't drown).
- Safe phrases: **"la focona"** (the frontier/border), **"¿Qué tal, mate?"**,
  **"te llamo p'atrá"** (I'll call you back), **"no me des la lata"** (don't
  nag/bother me), **"liqueribá"** (liquorice). Greeting energy: warm, bilingual.
- Symbols: the **Rock**; **Barbary macaques** ("apes" — legend: while they remain,
  Gibraltar stays British — folklore, note as such; never treat as pets); the
  **flag** white-over-red, three-towered red **castle** + gold **key**; "**Key to
  the Mediterranean**"; **National Day 10 Sep** (red & white, 1967 referendum).
- Currency **Gibraltar pound (£, GIP) = GBP 1:1**, contactless ubiquitous.
  Timezone **CET/CEST** (same as Spain, +1 vs UK). Dialling **+350**. Fintech/DLT
  hub (GFSC DLT framework, 2018).
- Tone: don't do generic British-seaside or Med-resort clichés; respect
  sovereignty sensitivity; keep it local, dry, practical.

## Per-feature source-of-truth

### Frontier ("la focona")
- ~12–15k commuters cross each way daily. Car peaks **07:30–09:00 & 17:00–18:30**;
  **Friday afternoons** brutal for pedestrians. **Spanish exit checks** are the
  bottleneck (leaving Gib), not entering. Walking usually beats driving at peak.
- Worse on **Spanish public holidays**, **cruise-ship days**, and during
  **intensified Spanish checks** (3hr+ possible). Gibraltar outside Schengen → ID
  checks both ways.
- Live truth = **camera feed** (frontierqueue.gi / gibraltarborder.gi), phone
  **+350 200 42777**, estimates on gogogibraltar.com. **No official API** — all
  minute figures are estimates. 2026: **EES biometric** scanners rolling out
  (longer queues for non-residents; residents on dedicated lanes); June-2025
  treaty aims to remove land checks (dual checks move to airport/port).

### Move (transport)
- **Buses:** Gibraltar Bus Company routes **1–4, 7–9** + **Calypso Route 5**
  (the frontier/airport shuttle, red double-deckers, ~every 15 min). Single
  **£1.80**, day pass **£2.50**; **residents/commuters/military travel FREE**.
  Live tracker **track.bus.gi**.
- **Taxi:** GTA — show rank locations + "call GTA" + rock-tour booking. No live car.
- **Cable car:** CLOSED (reopening ~2027).
- **Ferry:** FRS Tangier Med, sporadic — "confirm live".
- **Runway crossing:** pedestrian/cyclist barrier status (tunnel for cars).

### Parking (its own feature)
- Scarce. Residential Parking Scheme **Zones 1–4**, per-household permits escalate
  (£5/£10/£20/month, doubling thereafter); pay-and-display bays. Existing app
  **Gibraltar Car Parks (gibcarparks.com)** does purchase/top-up/expiry alerts —
  emulate: buy session by zone, top up, expiry reminder, permit status.

### Eat / Shop
- Dining districts: Main St, Casemates Sq, Irish Town, Ocean Village, Marina Bay,
  Queensway Quay, Catalan Bay (La Caleta). National dish **Calentita** (baked
  chickpea farinata); also rosto, panissa, rolitos, fish & chips.
- Delivery in Gib = local apps (**Hungry Monkey, NomNoms, Rock Hero**) — Rockway
  plays this role. (Our restaurant names are plausible local-style; fine for demo.)
- Grocery anchors: **Morrisons** (Queensway Rd — the only hypermarket; café +
  pharmacy + petrol), **Eroski City** (stocks Waitrose; does delivery), **Coviran**
  (2 branches). Prices ~10–20% above Spain.

### Money (Wallet / Pay / Bills / Top-up)
- **Bills:** biller list = **AquaGib** (water **+ electricity (GEA)** combined),
  **Rates** (incl. salt water), **Gibtelecom / GibFibre**, **u-mee**, council/Govt
  rent (pay rent online via egov). Electricity nested in AquaGib — model as such.
- **Top-up:** mobile PAYG **£10/£25** (Gibtelecom/u-mee), redeem `*101*<code>#`;
  **eSIM/data** bundles; first eSIM free.
- **Pay (P2P):** send/request/split with contacts from the wallet. GIP/GBP 1:1.

### Gov.gi
- Single eGov platform **portal.egov.gi** (citizen.egov.gi) + app; **personal vs
  corporate** accounts; **eID smart card** (since 2015). Real eServices: Driving &
  Transport (licences, MOT, test bookings), **Tax** (electronic returns, pay
  income tax online — tax.egov.gi), Immigration (**ID/Civilian Registration card**,
  passports, residence), Housing (**pay rent online**), GHA card. **Civil Status &
  Registration Office** (Joshua Hassan House): births (21-day), deaths (8-day),
  marriages. Where in-app txns aren't real, "open on egov.gi".

### Health (GHA)
- **GHA**, funded via contributory **GPMS** (free at point of use for entitled);
  **GHA card** register/renew on egov. GP booking at **Primary Care Centre** via
  **200 52441**/online, **time-windowed** slots (same-day 08:15–11:00; follow-ups
  11:00–15:00; evening 16:00–18:00; weekend emergency), up to 4 weeks ahead.
  Repeat prescriptions via GHA form. **GHA 111** out-of-hours advice. **Duty
  Pharmacy** rota (Main St pharmacies after hours). **Emergency 999** (unified
  since Mar 2024; 112 also works). Triage: 111 vs 999.

### Jobs / Property / Marketplace
- **Jobs:** Gov.gi vacancies (civil service/GHA), **RecruitGibraltar**, Indeed.
  Big sectors: **online gaming, finance, insurance, shipping/bunkering**, tourism.
- **Property:** agents **Chestertons, BMI, Seekers, BFA**; portal Property
  Gibraltar. Compact, expensive (areas: Ocean Village, Marina, Town, Upper Town,
  South District, Catalan Bay). Rentals + sales.
- **Marketplace:** culture is **Facebook Marketplace / "Gibraltar Buy & Sell"** +
  **GiBoard**. Rockway plays local classifieds: user can **post** a listing,
  browse categories, message seller (ties to Chat).

### Explore (tourism)
- Upper Rock Nature Reserve, **St Michael's Cave**, **Europa Point** (lighthouse,
  view of Africa), Catalan Bay/Sandy Bay, **Casemates**, Main St, Ocean Village,
  **Moorish Castle**/Tower of Homage, **Great Siege Tunnels**, **Skywalk**, Windsor
  Suspension Bridge, **dolphin watching** in the Bay, WWII Tunnels, Apes' Den.
  Sell **attraction tickets** (Nature Reserve combo, dolphin trips, tours).

### Events / News
- **Events:** National Day (10 Sep), **Calentita** Food Festival (June), Gibraltar
  **Music Festival** (Sep), **Literary Festival** (Nov). Venues: Casemates, **John
  Mackintosh Square**, **Victoria Stadium**, Tercentenary Hall.
- **News:** **GBC** (broadcaster), **Gibraltar Chronicle** (daily since 1801),
  **Panorama** (weekly), **YGTV**. Plus a community noticeboard.
