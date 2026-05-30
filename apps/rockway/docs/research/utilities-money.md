# Gibraltar: Utilities, Telecoms, Banking & Money

Research for the Rockway "everything app." Compiled 2026-05-30. Facts verified against official providers (gea.gi, aquagib.gi, gibtele.com) and public sources; uncertainty is flagged.

## Electricity — Gibraltar Electricity Authority (GEA / GibElec)

- The **Gibraltar Electricity Authority** (branded **GEA**, also seen as **GibElec**) is the statutory electricity supplier. Websites: `gea.gi` and `gibelec.gi`.
- **Key quirk:** GEA does not do its own billing. **AquaGib Limited handles meter reading, billing and payment processing for electricity on GEA's behalf.** The electricity charge appears *inside the AquaGib bill format* — so for residents, water and electricity arrive on a combined/co-issued bill. Payments are settled at AquaGib's offices (Suite 10b, Leanse Place, 50 Town Range, Gibraltar GX11 1AA).
- **Payment methods:** cash, **Direct Debit** (mandate form, downloadable or completed online), **online** (via links on the paperless bill), and **telephone payment** with debit/credit card. Paperless billing is offered.
- Billing is account/meter-based (postpaid), not a prepaid top-up model for general residential supply. (No evidence of a widespread prepaid-key meter scheme for ordinary homes — *uncertain whether any prepay meters exist*.)
- Contact: +350 20075957.

## Water & wastewater — AquaGib

- **AquaGib Ltd** is Gibraltar's water utility. Ownership: ~two-thirds **Northumbrian Water Group**, one-third **HM Government of Gibraltar**. Website: `aquagib.gi`.
- **The salt-water / potable quirk (important and real):** Gibraltar runs **two separate public water systems**:
  - **Potable (drinking) water** — produced almost entirely by **desalination (reverse osmosis)**, stored in underground reservoirs inside the Rock. This supply **is metered and billed monthly**.
  - **Salt water** — a second mains network delivering seawater for **toilet flushing, firefighting, street cleaning and sanitary use**. This supply is **not metered**; it is paid for as part of general **"Rates"** rather than via a usage bill.
- **Wastewater/sewerage:** historically a combined sewer network discharging largely untreated to coastal waters. A modern treatment plant at **Europa Point** is in progress (pre-construction works began Oct 2025; targeted operation ~2026). *Timeline uncertain.*
- Because AquaGib also bills electricity, its bill is effectively the central "utilities" document for a Gibraltar household.

## Telecoms, internet & mobile

- **Dialling code: +350** (Gibraltar's international country code). Local numbers are 8 digits.
- **Gibtelecom** (`gibtele.com`) is the dominant, government-and-Telekom-owned incumbent — landline, mobile, **5G**, broadband and TV. Offers **all-in-one / Triple Play / Dual Play** bundles. Its fibre broadband is marketed as **GibFibre**.
- **u-mee** is the main alternative provider (broadband/TV/mobile), positioned as the competitor to Gibtelecom.
- **Mobile plans:** Pay Monthly, No Contract, and **Pay As You Go (prepaid)**. First SIM or **eSIM is free** with a plan; SIM-to-eSIM switch is a free one-off.
- **Prepaid top-up (PAYG):**
  - **£10 and £25 scratchcards** sold at Gibtelecom's Customer Service Centre and retail outlets.
  - Redeem by dialling shortcode **`*101*` + the scratchcard number**.
  - Online top-up: choose an amount and pay by **credit/debit card or PayPal**.
- Travellers can also use international travel eSIMs (Keepgo, Nomad, ByteSIM, etc.), but these roam on the Gibtelecom network.

## Currency & money

- Currency: the **Gibraltar pound** (symbol £; ISO code **GIP**), **pegged 1:1 (at par) to GBP** and freely exchangeable with it.
- **Local banknotes** have been issued since 1927 (own coins since 1988). Notes: **£5, £10, £20, £50, £100**; coins 1p–£5. A new, reduced-size note series (matching Bank of England dimensions) began rolling out in 2021 (£5 first).
- **GBP is used interchangeably:** Bank of England notes and UK coins circulate freely and are accepted everywhere. UK-issued cards generally incur **no FX fees** (same currency). Note: Gibraltar notes are *not* always accepted in mainland UK, so the flow is asymmetric.
- **Cards & contactless:** Visa/Mastercard and **contactless are widely accepted**, including small shops; **Apple Pay / Google Pay** common. Card/contactless prevalence is high.

## Banking & fintech

- **Retail banks:** NatWest International, Barclays, Jyske Bank, **Trusted Novus Bank**, **Gibraltar International Bank (Gibintbank, government-owned)**.
- **Fintech / crypto hub (real and notable):** Gibraltar was the **first jurisdiction worldwide to launch a Distributed Ledger Technology (DLT) regulatory framework (January 2018)**, supervised by the **Gibraltar Financial Services Commission (GFSC)**. ~13 firms have held DLT Provider licences (names cited include eToro, Xapo, LMAX, Bitso, Gnosis; *roster changes over time — treat specific names as historical*).
- No single dominant "local payment super-app" surfaced; banking apps and UK/EU fintechs (Revolut-style usage common given GBP peg) cover day-to-day digital payments. *Uncertain whether a Gibraltar-specific consumer payment app has meaningful share.*

## How residents typically pay bills

- **Utilities (water + electricity):** one consolidated **AquaGib** bill, paid by **Direct Debit** (most common for recurring), **online** via paperless-bill links, **by phone** (card), or **in person/cash** at AquaGib's offices.
- **Telecoms:** Pay Monthly via direct debit/card; PAYG via **scratchcards, `*101*` shortcode, or online card/PayPal top-up**.
- General retail: heavily **card and contactless**, with cash (GIP or GBP) still accepted.

---

## Design implications for Rockway

**Bills feature — use these accurate biller names:**
- **AquaGib** — single biller covering BOTH **Water** (potable, metered, monthly) and **Electricity** (GEA/GibElec charge billed *by AquaGib*). Model electricity as a line item on the AquaGib account rather than a separate payable, or label it "Electricity (GEA, billed via AquaGib)." Avoid implying GEA has its own consumer billing portal.
- Salt-water supply should NOT appear as a metered bill — it's covered under **"Rates."** A realistic touch: show it as a flat/Rates item, not a usage charge.
- **Gibtelecom** and **u-mee** as telecom billers (broadband = **GibFibre** for Gibtelecom; bundles: Triple/Dual Play).
- Support **Direct Debit** as the default recurring-payment method, plus card/online and an "in person/cash" status for realism.

**Top-up feature — accurate providers/mechanics:**
- Mobile PAYG top-up via **Gibtelecom** (and u-mee). Offer **£10 / £25** denominations to mirror the real scratchcards; mention the **`*101*` + code** redemption and **online card/PayPal** top-up.
- eSIM is first-class here (free first eSIM with a plan) — a "buy eSIM / data bundle" action is realistic.

**Money / wallet realism:**
- Default currency **GIP (£)**, **pegged 1:1 to GBP**; treat GBP and GIP as interchangeable in the wallet (accept both, no FX between them). Denominations £5/£10/£20/£50/£100.
- Lean into **contactless + Apple/Google Pay** as the norm; cash secondary.
- Fintech/crypto framing is authentic: a **DLT/crypto wallet** or "regulated under GFSC DLT framework" badge fits Gibraltar's real identity without being a stretch.
- Local banks to reference for account linking: NatWest International, Barclays, Trusted Novus Bank, Gibraltar International Bank.
- **+350** as the dialling code for any phone/number UI.

### Sources
- Gibraltar Electricity Authority — Bills to Pay / FAQs: https://www.gibelec.gi/customer-support/bills-to-pay , https://www.gea.gi/
- AquaGib — corporate info, your bill explained, FAQs: https://www.aquagib.gi/corporate-info/ , https://www.aquagib.gi/customer-service/your-bill-explained/
- Water supply & sanitation in Gibraltar — Wikipedia: https://en.wikipedia.org/wiki/Water_supply_and_sanitation_in_Gibraltar
- Gibtelecom — site & mobile/PAYG support: https://www.gibtele.com/ , https://www.gibtele.com/support/mobile
- Gibraltar pound — Wikipedia: https://en.wikipedia.org/wiki/Gibraltar_pound
- Gibraltar DLT/crypto framework — Gibraltar Finance & Global Legal Insights: https://www.gibraltarfinance.gi/technology/distributed-ledger-technology , https://www.globallegalinsights.com/practice-areas/blockchain-cryptocurrency-laws-and-regulations/gibraltar/
