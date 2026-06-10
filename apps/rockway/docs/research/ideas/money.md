# ROCKWAY — Money, Payments & Fintech (Gibraltar)

Research date: 2026-06-10. Scope: how a **solo founder with no employees** can (a) take ROCKWAY's *own* revenue
(featured listings, job posts) and (b) add *money-adjacent* features for local businesses **without becoming
a regulated payment institution**. The golden rule throughout: **moving other people's money = a licence; taking
our own revenue = just a merchant account.**

Status legend: **VERIFIED** (confirmed against a primary/official source), **UNCERTAIN** (plausible but source
is dated/third-party/ambiguous), **NOT VIABLE** (blocked or requires a licence we can't realistically get).

---

## 0. The core licensing distinction (read first)

| Activity | Who it is | Licence? |
|---|---|---|
| ROCKWAY charges a business £X for a featured listing / job post | We are the merchant, it's our turnover | **No licence** — just a merchant account |
| ROCKWAY takes a buyer's £100, holds it, pays £95 to a seller | We are a payment/e-money institution | **Licence** (GFSC / FCA) — avoid |
| ROCKWAY shows a "Donate" / "Pay this business" button that sends the user to a **third-party** regulated rail | We are a referrer / link-out | **No licence** |
| ROCKWAY issues gift cards/credit redeemable at many businesses | Likely e-money issuance | **Licence** under E-Money Regs — avoid |

Gibraltar transposed PSD2 via the Financial Services (Payment Services) Regulations 2018, and has the GFSC DLT
framework for crypto — so the *regulated* options exist locally, but they are **not** something a solo founder
should pursue. Everything recommended below keeps us firmly in the "no licence" lane.
Source (PSD2 in Gibraltar): https://www.mondaq.com/gibraltar/financial-services/663974/the-second-payment-services-directive-psd2-takes-effect-in-gibraltar — VERIFIED.

---

## 1. Payment acceptance for OUR OWN revenue

### Stripe — DOES support Gibraltar businesses. **VERIFIED.**
- Gibraltar is explicitly on Stripe's official global availability list, with a direct registration link
  `dashboard.stripe.com/register?country=GI`. Source: https://stripe.com/global — VERIFIED (fetched 2026-06-10).
- There is a **dedicated Gibraltar pricing page** in GBP/pence:
  - Domestic (Gibraltar) cards: **1.5% + 20p** (standard) / 1.9% + 20p (premium/commercial)
  - EEA cards: **2.5% + 20p**; non-EEA international: **3.25% + 20p**; +2% if currency conversion needed
  - Source: https://stripe.com/en-gi/pricing — VERIFIED.
- Stripe Terminal works in Gibraltar but **Tap to Pay only** (currency GIP). Source: stripe.com/global, support.stripe.com — VERIFIED. Not needed for an online app, but good to know.
- **Caveat / why some guides say otherwise:** older third-party articles (e.g. mobiletransaction.org) still claim
  "Stripe does not support British Overseas Territories." Stripe's *own* current site contradicts this — Gibraltar
  was added. Trust Stripe's live page over dated third-party lists. (Conflict noted, primary source wins.)
- **Product fit:** Stripe **Payment Links** (no code; create a link/QR per featured-listing or job-post SKU) and
  **Stripe Checkout** (hosted page) are ideal for a solo founder — no PCI burden, no custom payment UI. This matches
  the "payment links" monetisation idea in the brief almost exactly.

### Alternatives that also serve Gibraltar
| Provider | Gibraltar? | Model | Rough fees | Solo-founder verdict |
|---|---|---|---|---|
| **PayPal** | Yes (PayPal Here historically Gibraltar; PayPal accounts 200+ countries) — UNCERTAIN on current business-account terms | Gateway + payment links ("PayPal.Me", invoices) | ~2.9% + fixed (UK ~1.2%+ for domestic commercial) | Universally trusted by users; good as a *secondary* button. Verify current Gibraltar business onboarding. |
| **Paddle** | MoR — sells *on your behalf*, your location matters less | **Merchant of Record** | ~5% + 50¢ | Handles **all VAT/sales-tax** worldwide. Heavy for selling £5 listings; built for SaaS/digital. |
| **Lemon Squeezy** (now Stripe-owned) | MoR | **Merchant of Record** | ~5% + 50¢ | Same MoR benefit (it remits VAT). Overkill + pricey per-tx for cheap local SKUs. |
| **Square** | **No** — UK/IE/US/CA/AU/JP only, not Gibraltar | — | — | NOT VIABLE for a Gibraltar entity. |
| **SumUp** | **Yes** — explicitly lists Gibraltar | Card reader + online links | ~1.69% in-person typical | In-person only really; fine if you ever do physical. Source below. |
| **myPOS** | **Yes** — can open account in Gibraltar | Reader + gateway | varies | Local option, less developer-friendly. |
| **Revolut Business** | **UNCERTAIN** — coverage usually "EEA + UK"; Gibraltar status unclear | Merchant acquiring | ~1%+ | Verify directly; not confirmed for GI entity. |
| **Worldpay** | Enterprise; possible but heavy onboarding | Acquirer | negotiated | NOT VIABLE for a solo founder (overkill). |

Sources: Stripe alternatives list https://dodopayments.com/blogs/stripe-supported-countries-alternatives — UNCERTAIN (third-party);
MoR tax handling — Paddle https://www.paddle.com/help/sell/tax/which-countries-does-paddle-charge-sales-tax-or-vat-for and
Lemon Squeezy https://docs.lemonsqueezy.com/help/payments/sales-tax-vat — VERIFIED (vendor docs);
SumUp/PayPal/myPOS Gibraltar https://www.mobiletransaction.org/payment-solutions-isle-of-man-channel-islands-british-overseas-territories/ — UNCERTAIN (dated but Gibraltar-specific quotes).

**Merchant-of-record, who handles VAT/tax?** With Paddle/Lemon Squeezy *they* are the legal seller — they collect
and remit EU VAT, UK VAT, US sales tax etc. and pay you the net. With Stripe/PayPal/SumUp **you** are the seller and
are responsible for your own VAT/tax (Gibraltar has **no VAT**, which materially simplifies this for a Gibraltar entity
selling to local businesses — a point in favour of *not* needing an MoR).

**Is a UK Ltd the simplest route?** Not necessary. Because **Stripe directly supports a Gibraltar-registered business
in GBP/GIP**, a Gibraltar company (or even sole-trader, if Stripe accepts) is the simplest, most honest route — no
need to incorporate a UK Ltd purely for payments. A UK Ltd would only help if you specifically wanted Square/Revolut
or UK-banking rails; it adds UK VAT exposure you'd otherwise avoid. **Recommendation: stay Gibraltar + Stripe.**

---

## 2. Open Banking / Pay-by-Bank (PISP/AISP)

- Gibraltar **has** PSD2 in law (2018 regs), so PISP/AISP is *legally* a thing here. Source: mondaq (above) — VERIFIED.
- **But the major providers don't list Gibraltar as a live country.** TrueLayer's live markets are UK + ~12 EU
  states; **Gibraltar is not listed**. Source: https://support.truelayer.com/hc/en-us/articles/10973416170769 — VERIFIED (Gibraltar absent).
- GoCardless supports GBP/EUR collections but its merchant country list doesn't include Gibraltar. Source: https://gocardless.com/faq/merchants/international-payments — UNCERTAIN (Gibraltar not confirmed).
- Plaid is primarily US/Canada/EU/UK for open banking; no Gibraltar coverage found. — NOT VIABLE for now.
- **Reality check:** even where these work, using a PISP to *route money to other businesses* would make ROCKWAY look
  like a payment facilitator. For taking *our own* revenue, "pay by bank" via these tools is a nice-to-have but
  **Gibraltar coverage is the blocker.** Stripe also offers "Pay by Bank"/open-banking as a payment method inside
  Checkout in supported regions — let Stripe own that complexity rather than integrating a PISP ourselves.

**Verdict: Open Banking pay-by-bank is NOT VIABLE as a near-term standalone feature for a Gibraltar entity** (no
provider coverage). Revisit only via Stripe's own bundled bank-payment methods. Effort if pursued: **L** + licensing
risk. Skip.

---

## 3. DLT / crypto "pay with stablecoin"

- Gibraltar's GFSC **DLT framework** (in force since 2018) regulates any firm "using DLT for storing or transmitting
  value belonging to others, in or from Gibraltar." Source: https://www.fsc.gi/FSC/distributed-ledger-technology-providers
  and GFSC scope guidance https://www.fsc.gi/uploads/Guidance%20Notes/Final%20-%20GFSC%20DLT%20Scope%20Guidance%20Note.pdf — VERIFIED.
- **If ROCKWAY held/transmitted crypto on behalf of others → DLT licence required. Not realistic for a solo founder.**
- **The legal, no-licence path:** use a **regulated third-party crypto processor** as the merchant rail for *our own*
  revenue. The customer pays the processor in crypto/stablecoin; the processor settles **fiat to us**. We never custody
  crypto, so we're an ordinary merchant. Options:
  - **Coinbase Commerce** — accept USDC etc., auto-convert. Source: https://www.coinbase.com/commerce (vendor) — UNCERTAIN on Gibraltar onboarding.
  - **NOWPayments** — non-custodial, 0.5%–1% fees, 300+ coins, auto-convert. Source: https://stablecoininsider.org/7-top-stablecoin-payment-processors/ — UNCERTAIN (third-party).
- **Honest take:** Gibraltar is a crypto hub so this is *culturally* on-brand and *legally clean if we use a licensed
  processor and never touch the coins*. But for a 32k-population local marketplace selling £5–£20 listings, crypto
  demand is near-zero and it adds support burden. **Defer.** Effort **M**; value low at launch.

**Verdict: Realistic & legal ONLY via a regulated processor that settles fiat to us; do NOT custody. Low priority.**

---

## 4. Local loyalty WITHOUT a wallet (no licence)

This is the strongest "money-adjacent, zero-licence" opportunity — **loyalty stamps/points are not money**, they're
marketing collateral. No e-money issue as long as points aren't redeemable for cash across businesses.

- **Pattern:** digital stamp card ("10th coffee free"), per-business, redeemed in-store by the merchant.
- **Tooling:**
  - **Self-hosted, free:** generate Apple Wallet `.pkpass` with open-source Node libs — `passkit-generator`
    (https://github.com/alexandercerutti/passkit-generator) or `@walletpass/pass-js`
    (https://github.com/tinovyatkin/pass-js, MIT). Google's open-source **Pass Converter** bridges to Google Wallet
    (https://developers.googleblog.com/en/open-source-pass-converter-for-mobile-wallets/). **VERIFIED, free** (you only
    need a free-tier Apple Developer "Pass Type ID" cert; Google Wallet API is free). Effort **M** (cert setup + a
    pass-update web service for dynamic stamp counts).
  - **Managed:** **PassKit.com** — usage-based; platform fee ~US$39.50/mo per username, loyalty passes ~0.5¢/yr,
    coupons/tickets <1¢ at scale. Source: https://passkit.com/pricing — VERIFIED. Faster but a recurring cost.
- **No-Wallet fallback (cheapest):** stamp count stored in ROCKWAY's own DB, merchant taps "+1 stamp" in the For-Business
  view, user shows a QR. Zero third-party cost, **effort S**. Wallet passes are the upgrade.

**Verdict: VIABLE, no licence. Build the in-app stamp/points first (S), add `.pkpass`/Google Wallet via open-source libs later (M).**

---

## 5. Gift cards / vouchers, split-the-bill, tipping

### Gift cards / vouchers — careful
- A **multi-business** voucher ROCKWAY issues and holds float for = **e-money** (FCA E-Money Regs 2011 analogue;
  e.g. One4all is issued by an FCA-authorised EMI). Source: https://globallawexperts.com/essential-guidelines-for-businesses-complying-with-uk-law-for-b2c-gift-cards/ — VERIFIED. **NOT VIABLE** for us to issue.
- **Single-merchant** gift cards sold/redeemed by **that merchant** are generally exempt (limited-network). Safe path:
  let each business sell its **own** gift card via **its own** Stripe/Square, and ROCKWAY just *lists/links* it.
  Or use a per-merchant tool like Giftpro/Square Gift Cards (the merchant's account, not ours). Effort **S** (link-out).

### Split-the-bill & tipping — the licence line
- **Needs a licence:** if ROCKWAY collects everyone's share / the tip and pays it onward → payment service. **Avoid.**
- **No licence (recommended):** ROCKWAY **generates a payment request / QR** that resolves to a **third-party** rail the
  user already trusts — e.g. a PayPal.Me link, a bank "request to pay", a Monzo/Revolut request link, or the merchant's
  own Stripe link. ROCKWAY computes the split amounts and renders QR codes; **the money moves entirely off-platform**
  between user and merchant/payee. Sources: cashless-tipping via QR https://www.paypal.com/uk/money-hub/article/cashless-tipping
  and EasyTip https://www.easytip.net/ — VERIFIED (these are the regulated rails; we just point at them).
- For tipping specifically, the cleanest is to **link out to a dedicated tipping app (EasyTip etc.)** or the venue's own
  Stripe — ROCKWAY never touches the tip. Effort **S**.

**Verdict: Gift cards = link to single-merchant cards only (S, no licence). Split/tip = compute-and-QR, settle off-platform (S, no licence). Never hold the money.**

---

## 6. Currency & FX

- Gibraltar pound (GIP) is pegged 1:1 to GBP and circulates alongside it — so for local pricing just use **GBP/GIP, no
  conversion**. Stripe/SumUp settle in GBP. Source: stripe.com/en-gi/pricing (GBP/pence) — VERIFIED.
- For **cross-border shoppers / cruise day-trippers** wanting to see prices in EUR/USD, use a **free FX API to display
  indicative conversions** (display only — actual charge stays GBP; charging foreign currency would trigger Stripe's +2%):
  - **Frankfurter** — free, **no API key**, no quotas, ECB reference rates, 30+ currencies (GBP/EUR/USD), self-hostable.
    Source: https://frankfurter.dev/ and https://github.com/lineofflight/frankfurter — VERIFIED, free.
  - **ExchangeRate-API** free open-access tier (no key). Source: https://www.exchangerate-api.com/docs/free — VERIFIED.
- **Verdict: Add an indicative EUR/USD price toggle via Frankfurter (free, no key). Effort S. Display-only, no licence.**

---

## 7. Donations to local charities — link-out only

- **JustGiving**: free to set up a page, **no platform fee**; "Giving Checkout" passes 100% to the charity (donor pays
  optional voluntary tip). Source: https://www.justgiving.com/about/fees — VERIFIED.
- **PayPal Giving Fund**: PayPal covers transaction fees, 100% reaches the cause; but donation goes via PGF (donor data
  not shared with charity). Source: https://www.paypal.com/us/cshelp/article/...faq4082 — VERIFIED.
- **Model for ROCKWAY:** a "Support local charities" section that **links out** to each charity's existing JustGiving/
  PayPal Giving page. ROCKWAY never receives the donation → **no licence, no liability.** Effort **S**.

---

## Effort summary

| Feature | Rail / tool | Access & rough cost | Effort | Licence? |
|---|---|---|---|---|
| Take our revenue (listings/jobs) | **Stripe Payment Links / Checkout** | Gibraltar acct, 1.5%+20p domestic | **S** | None (our revenue) |
| Secondary "Pay with PayPal" button | PayPal | verify GI business acct | S | None |
| MoR (only if going global SaaS) | Paddle / Lemon Squeezy | ~5%+50¢, they remit VAT | M | None |
| Pay-by-bank (open banking) | TrueLayer/GoCardless | **No Gibraltar coverage** | L | risk → skip |
| Pay with crypto/stablecoin | Coinbase Commerce / NOWPayments (settle fiat) | 0.5–1% | M | None *if* processor custodies, not us |
| Digital stamp/loyalty (in-app) | ROCKWAY DB + QR | free | S | None |
| Wallet loyalty passes | passkit-generator / pass-js (free) or PassKit (~$40/mo) | free–$40/mo | M | None |
| Single-merchant gift cards | link to merchant's own Stripe/Giftpro | free to us | S | None |
| Split-bill / tipping | compute + QR → PayPal.Me / EasyTip / merchant Stripe | free | S | None (money off-platform) |
| FX display toggle | Frankfurter API | free, no key | S | None |
| Charity donations | link out to JustGiving / PayPal Giving | free | S | None |

---

## (a) RECOMMENDATION — how the solo founder should take payment at launch

**Use Stripe, on a Gibraltar-registered business, with Payment Links / Checkout, settling in GBP.** Rationale:
1. **Stripe officially supports Gibraltar** (VERIFIED on stripe.com/global + a dedicated GBP pricing page) — so no need
   to incorporate a UK Ltd just for payments. Stay Gibraltar; Gibraltar has **no VAT**, which removes the main reason a
   solo founder would otherwise want a merchant-of-record.
2. **Payment Links/Checkout = zero payment-UI code, no PCI scope** — create one link/QR per featured-listing tier and per
   job-post product. This is exactly the brief's "payment links" monetisation plan, and it's all *our own revenue* so
   there is **no licensing requirement whatsoever**.
3. Fees are low (1.5% + 20p domestic). Add a **PayPal** button as a trusted secondary option (verify GI onboarding).
4. **Do not** build anything that holds or forwards a third party's money (escrow, multi-merchant gift cards, collected
   tips/splits) — that crosses into PSD2/e-money licensing. Keep all peer/merchant money **off-platform**.
5. Skip MoR (Paddle/Lemon Squeezy) unless/until you sell digital products globally and want VAT outsourced.

## (b) Ranked shortlist — money features that need NO licence

1. **Stripe Payment Links/Checkout for our own listing & job-post revenue** — core monetisation, S, our revenue.
2. **In-app digital loyalty stamp/points cards** ("10th coffee free"), per-merchant — S, pure marketing, big local appeal.
3. **Apple/Google Wallet loyalty + event-ticket passes** via free open-source `.pkpass` libs — M, free, premium feel.
4. **Charity donation link-outs** to JustGiving / PayPal Giving — S, zero liability, community goodwill.
5. **Split-the-bill / tipping by computed QR** that settles off-platform (PayPal.Me / EasyTip / merchant Stripe) — S.
6. **Indicative multi-currency price display** (EUR/USD) via free Frankfurter API for cruise/day-trippers — S.
7. **Single-merchant gift-card link-outs** (merchant's own Stripe/Giftpro) — S; never issue cross-merchant vouchers ourselves.
8. **Pay-with-crypto via a regulated processor** that settles fiat to us — M, defer (low local demand, on-brand for GI).

## Explicitly AVOID (licence / risk)
- Holding buyers' funds / escrow / marketplace payouts to sellers → payment institution licence.
- Issuing multi-business gift cards/credit or a ROCKWAY wallet → e-money licence (E-Money Regs).
- Custodying crypto or routing others' crypto → GFSC DLT licence.
- Self-operated PISP "pay by bank" → no Gibraltar provider coverage + facilitator risk.
