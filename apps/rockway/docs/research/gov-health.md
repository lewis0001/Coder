# Gibraltar: Government Services + Healthcare

Research for the Rockway "everything app". Compiled 2026-05-30. Facts verified against official `gov.gi`, `gha.gi`, and Gibraltar press releases where possible; uncertain items are marked.

## 1. eGovernment — Gov.gi

Gibraltar's single eGovernment platform is **Gov.gi eServices**, reachable at `portal.egov.gi` (login at `citizen.egov.gi`). There is also a free **Gov.gi eServices mobile app** (Android on Google Play; iOS likely — *unverified*).

**Accounts.** Users create a free account and verify their identity to unlock services.
- **Personal account** — individual tasks: ID cards, GHA/health, passports, vehicle and tax matters.
- **Corporate account** — business tasks: corporate services, employment/vacancies, inviting other users to manage a business.

**Support.** Online chat on the portal, email queries, and a walk-in **Customer Care Hub**.

### Services available (by category)

- **Driving & Transport** — driving licences (standard/learner), international driving permits, CBT motorcycle training, driving & theory test bookings, vehicle roadworthiness (MOT) tests, address/ownership changes, PLET registration.
- **Health (GHA)** — primary care (GP) appointment booking, **Medical Healthcare Registration/Renewal (GHA card)**, sick-note requests, view calendar/appointments.
- **Tax** — income tax returns, tax code/allowance management, **S1 certificate** applications, P8 file uploads, and **pay income tax online**. (Tax also has a dedicated front-end at `tax.egov.gi`.) Returns are now electronic-only; paper returns are no longer accepted.
- **Immigration & Home Affairs** — certificate of residence, **ID / Civilian Registration Card** + permit of residence, passport applications, marriage/civil-partnership services.
- **Housing** — tenancy agreements, government accommodation, **pay rent online**, exchanges/modifications.
- **Other** — Property (Register of Property Occupation), Parliament & Elections, Office of Fair Trading, Lottery, Gazette, Freedom of Information, Frontier Workers, **Ultimate Beneficial Ownership** registers.

**Payments.** The portal explicitly supports online payment for **income tax** and **rent**. (Breadth of card-payment support across all services is *unverified*.)

### Civil Status & Registration Office (Dept. of Immigration & Home Affairs)
Located at Joshua Hassan House, 2–8 Secretary's Lane. Counters open **08:30–15:00, Mon–Fri** (uninterrupted).
- **Births** — register within **21 days**; certificate on request. (Registry tel. 200 78303 / 200 76945.)
- **Deaths** — register within **8 days** (or as a coroner directs); certificate on request.
- **Marriages / civil partnerships** — registered with the Central Registry; certificate produced **10–15 days** after. (Marriage section tel. 200 72289.)
- Also: passports (200 76945), immigration (200 76948), ID/Civilian Registration cards.

### ID card / digital identity
The **Gibraltar identity card** is the primary residency document for everyone aged **12+** resident in Gibraltar. An **electronic (eID) card** with a smart-card chip was introduced in **2015**, enabling secure authentication against central databases for e-government services. (Degree to which the eID chip is actively used as a login factor for Gov.gi today is *unverified* — most flows appear to use the Gov.gi account + identity verification.)

### Companies House, Income Tax Office, Customs
- **Companies House Gibraltar** — companies register here and are then automatically registered for **Corporate Tax**. Corporate tax returns due within **9 months** after the accounting-period month-end. (Standalone online filing portal — *partly unverified*; corporate services surface via the Gov.gi corporate account.)
- **Income Tax Office** — PAYE for employees and employers; tax eServices require a verified personal account registered for tax. Payments accepted online.
- **HM Customs (Gibraltar)** — customs sits in government but a consumer self-service flow on Gov.gi is *not clearly documented*; treat as low-priority for a citizen app.

## 2. Healthcare — Gibraltar Health Authority (GHA)

GHA (`gha.gi`) runs **St Bernard's Hospital** (acute/secondary care) and the **Primary Care Centre (PCC)** (general practice; ~20 GPs).

**Eligibility / registration.** Healthcare is funded via the contributory **Group Practice Medical Scheme (GPMS)**. Entitled persons = insured persons + dependants, and people "ordinarily resident" in Gibraltar; entitled persons get care **free at point of use**. To register you must prove identity, show social-security contributions are up to date, and be registered with the Civilian Registration/Status Office. Registration/renewal of the **GHA (medical) card** is done online via the Gov.gi **Register/Renew Medical Healthcare eService**, which pre-fills data from the Register of Property Occupation and the Gov.gi profile.

### GP appointments (Primary Care Centre)
Phone line **200 52441** (also bookable **online via the GHA portal**), staffed by ~5 people; can book up to **4 weeks ahead** with a preferred doctor. Time windows:
- **Same-day:** call **08:15–11:00**
- **Follow-ups** (bloods, driving medicals, dietician, etc.): **11:00–15:00**
- **Evening clinic:** **16:00–18:00** (some sources say 16:30–19:00 — *minor discrepancy*)
- **Weekends/public holidays (emergency GP):** ~**08:30–09:30** and **15:30–16:30**

### Prescriptions
Repeat prescriptions via the **repeat-prescription form** on the GHA website. (A GHA digital pharmacy initiative exists — extent of e-prescribing is *partly unverified*.)

### Out-of-hours
When the PCC is closed, call **GHA 111** to reach a **Clinical Advisor** for assessment/advice. Genuine emergencies → **999/112** or A&E at St Bernard's.

### Pharmacies (Main Street and the duty rota)
Community pharmacies are concentrated on/around **Main Street** (e.g. Mill Pharmacy, plus others). A **Duty Pharmacy** rota covers out-of-hours; the current duty chemist + map is published on **`gha.gi/duty-pharmacy`**. Typical duty hours:
- **Mon–Fri:** 19:00–21:00
- **Weekends/public holidays:** 11:00–13:00 and 18:00–20:00

## 3. Emergency & non-emergency numbers

- **999** — unified emergency number (Police, Ambulance, Fire) since **18 March 2024**; an automated menu routes the caller.
- **112** — also works (GSM international emergency).
- **190** — legacy direct line for Fire & Ambulance (still active).
- **GHA 111** — non-emergency medical advice / out-of-hours Clinical Advisor.
- Non-emergency: **Royal Gibraltar Police** 200 72500; **Fire** 200 79507; **Ambulance** 200 77390.

> Note: Gibraltar landline numbers are 8 digits beginning `200…`; the same numbers are often quoted as 5-digit short forms (e.g. `52441`) locally.

---

## Design implications for Rockway

**Gov.gi feature — service tiles to ship (map 1:1 to real eServices):**
1. **My ID & Documents** — Gibraltar ID / Civilian Registration card apply & renew; passport application; certificate of residence.
2. **Civil Status** — request birth / death / marriage certificates; register a birth (21-day clock) or death (8-day clock); book a marriage/civil-partnership slot. Surface the deadlines as reminders.
3. **Driving & Vehicle** — driving licence (standard/learner) & international permit; book theory/driving test & CBT; MOT booking; vehicle ownership/address change.
4. **Tax & PAYE** — view tax code/allowances, file the (now mandatory electronic) tax return, upload P8, **pay income tax online**, request S1 certificate. Deep-link to `tax.egov.gi`.
5. **Business** — Companies House registration, corporate tax/UBO, employment vacancies (gated behind a "corporate" profile mode mirroring Gov.gi's account split).
6. **Housing** — tenancy and **pay rent online**.

Treat Gov.gi as the source of truth: where Rockway can't transact natively, deep-link to `portal.egov.gi` / `tax.egov.gi` rather than fake a flow. Reuse Gov.gi's **personal vs corporate** profile split. Show a single **Payments** surface (income tax, rent) and label other services as "external" honestly.

**Health feature:**
1. **GHA card** — register/renew via the Healthcare eService; show entitlement status and renewal date.
2. **Book a GP** — replicate the PCC windows as smart, time-gated CTAs: *Same-day (08:15–11:00)*, *Follow-up (11:00–15:00)*, *Evening (16:00–18:00)*, *Weekend emergency*. Tap-to-call **200 52441** and/or deep-link to the GHA online booking; allow up to 4 weeks ahead with preferred-doctor selection. Outside windows, show the next open window + a countdown.
3. **Repeat prescriptions** — link/embed the GHA repeat-prescription form; track which meds are on repeat.
4. **Sick notes** — Gov.gi sick-note request.
5. **Out-of-hours card** — one-tap **GHA 111** (advice) vs **999/112** (emergency), with a clear "is this an emergency?" triage prompt.
6. **Duty pharmacy** — live tile reading the `gha.gi/duty-pharmacy` rota: tonight's/this-weekend's open pharmacy, hours, and map pin; default to Main Street pharmacies during normal hours.

**Emergency widget (global):** persistent quick-dial for **999** (with the routing-menu note), **112**, **GHA 111**, and non-emergency Police/Fire/Ambulance lines. Make 999 the prominent action.

**Caveats to honour in build:** verify live phone numbers, exact appointment windows, and which services truly transact in-app before launch (several are deep-links, not native). The eID chip's role as a login factor is unconfirmed — design Gov.gi auth around a verified account first, with eID as a possible enhancement.

### Sources
- Gov.gi eServices portal & service list — https://portal.egov.gi/ , https://portal.egov.gi/services
- Income Tax eServices — https://tax.egov.gi/ ; Income Tax Office — https://www.gibraltar.gov.gi/income-tax-office
- GHA Primary Care Centre — https://www.gha.gi/primary-care-services/primary-care-centre/ ; Registration — https://www.gha.gi/registration/ ; Duty Pharmacy — https://www.gha.gi/duty-pharmacy/
- GHA Healthcare Register/Renew eService upgrade (505/2023) — https://www.gibraltar.gov.gi/press-releases/gha-registrationrenewal-eservice-upgrade-5052023-9086
- Civil Status & Registration Office — https://www.cab.gi/immigration/civil-status-and-registration-office ; ID cards — https://www.gibraltar.gov.gi/department-of-inmigration-and-home-affairs/id-cards-civilian-registration-cards
- New 999 emergency number — https://www.police.gi/news/new-999-emergency-number-1251 ; https://www.chronicle.gi/999-will-be-the-new-emergency-number-for-police-ambulance-and-fire-service/
- Healthcare eligibility (GPMS) — https://www.angloinfo.com/how-to/gibraltar/healthcare/health-system/healthcare-registration
