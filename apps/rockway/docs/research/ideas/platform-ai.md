# Novel Interaction + Platform Tech for Rockway

Research + ideation on what would make Rockway feel a generation ahead and boost retention, scoped to a **zero-build vanilla-JS PWA** (`window.RW` plugin registry, localStorage, small Node proxy). Solo founder, low budget.

Effort key: **S** = a day or less, **M** = a few days, **L** = a week+ or ongoing cost/ops.
Verification: each external claim tagged **VERIFIED** (with URL) or **UNCERTAIN**. Costs are 2026 figures unless noted.

Date of research: 2026-06-10.

---

## 1. "ASK THE ROCK" — natural-language local concierge

**The Rockway feature:** one search/chat box that answers Gibraltar-specific questions —
*"where do I renew my driving licence?"*, *"what's the frontier like + is it a Spanish holiday?"*, *"dog groomer free Saturday?"* — grounded in **our own app data** (Discover directory + slots, Events, Pharmacy, Holidays, Frontier reports, Weather, Fixtures) and live proxies, never on the model's training data.

The core insight: Rockway already has the hard part — structured local data and live feeds wired through the registry. The "AI" is mostly a thin natural-language layer over a retrieval step. Most queries can be answered **without an LLM at all**.

### Architecture options (cheapest-credible first)

**Option A — No-LLM structured intent matching (recommended to ship first). Effort: M. Cost: £0.**
A retrieval-only layer over the registry:
1. Normalize the query (lowercase, strip accents, Llanito/Spanish synonyms via a small hand-built lexicon — see §7).
2. Intent classification by keyword/regex against a table of intents (`renew_licence`, `frontier_status`, `is_holiday`, `find_business`, `duty_pharmacy`, `matchday`, `beach_weather`, …). Each intent maps to a registry query or proxy call already built.
3. For business/service lookups, run a client-side fuzzy search (e.g. a tiny trigram or token-overlap scorer, ~50 lines, no dep) over the Discover directory + a curated "government services" dataset you maintain as JSON (licence renewal → address/URL/hours).
4. Render a **structured answer card** (not prose): the answer, the source, a deep-link ("Book", "Open in Maps", "See holidays"). For "dog groomer free Saturday?" this composes the directory search **with** the existing slot-availability data — a genuinely differentiated answer no generic chatbot can give.

This is the highest-ROI build: deterministic, offline-capable, no per-query cost, no hallucination risk, and it doubles as a better global search. Honest framing for users: call it "Ask Rockway" / smart search, not "AI", until/unless you add the LLM layer.

**Option B — Hosted LLM for phrasing + fallback only (the credible "AI" upgrade). Effort: M. Cost: ~£0 at Rockway's scale.**
Keep Option A as the engine. Add an LLM in **two narrow roles**:
- *Query understanding*: when the regex intent matcher is low-confidence, ask the model to map the free-text query to one of your known intents + extract slots (it returns JSON, you execute the registry call). This is a classification task — cheap, small output.
- *Answer phrasing*: optionally turn the structured result into a friendly sentence in the user's language (EN/ES/Llanito).

Crucially the model **never invents facts** — it only routes and rewords data you retrieved. This is classic grounded RAG with a tiny context.

Cost with Claude (per the bundled pricing): **Haiku 4.5 at $1/$5 per 1M tokens** (in/out). A routing+phrasing call is ~1–2K input (intent list + retrieved data) + a few hundred output ≈ **~$0.002–0.004 per query**. At a generous 5,000 AI-routed queries/month that's **~$10–20/month**, and most queries never reach the LLM because Option A handles them. Use **prompt caching** on the static intent-list/system prefix (~0.1× read cost) to cut it further. VERIFIED pricing: bundled `claude-api` skill model table (Haiku 4.5 $1/$5; prompt caching ~90% on cached prefix). Anthropic models support tool use / structured outputs for the JSON routing step.
- *Where a server is needed:* the API key **must** live in the Node proxy, never the client. Add one `/ask` proxy endpoint that does retrieval server-side (or accepts the client's retrieved data) and calls the LLM. Rate-limit it (see §10).
- Provider-agnostic note: any small hosted model (Claude Haiku, or comparable cheap tiers from other vendors) fits; the architecture is identical. The bundled skill is Anthropic-specific so the verified numbers above are Anthropic's.

**Option C — On-device WebLLM (WebGPU). Effort: L. Cost: £0 inference, but heavy. NOT recommended now.**
WebLLM runs a quantized model fully in-browser via WebGPU, cached after first download. VERIFIED (github.com/mlc-ai/web-llm, webllm.mlc.ai): a small model (e.g. Phi-3.5-mini 3.8B int4) needs **~2GB VRAM** and a **multi-hundred-MB to ~2GB one-time download**. WebGPU is solid on Chrome/Edge, default-on in Firefox, "catching up" in Safari. For a 32k-population app where a large share of traffic is **iOS day-trippers and cruise visitors on mobile data**, a 1–2GB download and mobile VRAM limits make this a non-starter as the primary path. Revisit later as an *optional* offline mode for power users on desktop.

### Recommendation on "Ask the Rock"
**Build Option A now; design the `/ask` proxy so Option B can be slotted in later.** Rationale: the retrieval engine is the durable asset and costs nothing; it works offline; it can't hallucinate Gibraltar facts. The LLM is a cheap, optional polish layer you can switch on once you've seen real query logs (which also tell you which intents to add). Ship the no-LLM version, instrument the misses, and only add Haiku-tier routing when the unmatched-query rate justifies the ~£10–20/month. Do **not** build on-device WebLLM as the main concierge.

---

## 2. NOTIFICATIONS — Web Push (VAPID)

**The Rockway feature:** opt-in alerts — frontier-queue spike, bin day, matchday, booking confirmed/declined, duty-pharmacy-of-the-day, weather/Levanter warnings.

**Platform:** Web Push + the `web-push` Node library (VAPID). **Cost: £0, fully self-hosted** — VAPID needs no third-party push service or GCM key; browsers route to their own push services (FCM/APNs/Mozilla) for free. VERIFIED (github.com/web-push-libs/web-push; npm `web-push`): generate VAPID keys with `npx web-push generate-vapid-keys`, public key in the client subscription, private key on the server.

**iOS support:** VERIFIED — Web Push works on **iOS/iPadOS 16.4+ (March 2023)** but **only when the PWA is installed to the Home Screen** ("Add to Home Screen"), and `Notification.requestPermission()` must be called from a direct user gesture (a click handler). Requires a valid `manifest.json`. Android/Chrome desktop work without install. (Sources: webkit/Apple via search; MDN Push API.)

**What needs a server:** yes — the proxy must (1) store push subscriptions (a JSON blob per subscriber; SQLite/Supabase or even a flat file at this scale), and (2) run a scheduled job to fire pushes (cron-style). Triggers like "frontier spike" hook into the data your proxies already poll. Effort: **M** (subscription storage + send endpoint + one scheduler). Browser caveat: the user can revoke; handle `410 Gone` to prune dead subscriptions.

**Retention angle:** this is the single biggest retention lever — push is what turns a "checked it once" tool into a daily habit (bin day, duty pharmacy, matchday are perfect recurring hooks). Gate behind clear opt-in per category.

---

## 3. WALLET PASSES — Apple Wallet + Google Wallet

**The Rockway feature:** event tickets, booking confirmations, and loyalty/stamp cards as native wallet passes ("Add to Apple Wallet" / "Add to Google Wallet").

**Apple Wallet (.pkpass):** VERIFIED — requires an **Apple Developer Program membership at $99/year** and a Pass Type ID certificate (renewed annually); passes must be cryptographically signed. The `passkit-generator` Node library builds and signs `.pkpass` files server-side. (Sources: developer.apple.com Wallet docs; passkit-generator; help.passkit.com.) Effort: **M** (cert setup is fiddly; generation itself is straightforward). Server required (signing key must stay server-side).

**Google Wallet:** VERIFIED partial — sign up for a **Google Wallet API Issuer account** (free to start, begins in "demo mode" until publishing access is granted); generic/loyalty pass types supported; passes added via a signed JWT "Add to Google Wallet" link. (Source: developers.google.com/wallet.) Cost UNCERTAIN beyond "free to start" — no published per-pass fee found; treat as £0 for Rockway's volume but verify before relying on it. Effort: **M** (service-account JWT signing, server-side).

**Verdict:** medium-value, defer. The $99/yr Apple fee is the only hard cost and it's tolerable, but passes are a "feels premium" feature, not a retention driver. Best paired with Events (a ticket pass that updates if the event moves) and a loyalty stamp card for local businesses — that loyalty angle could become a paid "For Business" upsell later.

---

## 4. CALENDAR — .ics generation + subscribe-able feeds

**The Rockway feature:** "Add to calendar" on every booking/event/bin-day; subscribe-able feeds (`webcal://`) for events and fixtures so they auto-update in the user's calendar.

**Platform:** the iCalendar (.ics) format is a plain-text spec — **generate it in vanilla JS with zero dependencies** (assemble `VEVENT` blocks, serve as a data URI or via the proxy). "Add to calendar" links work across Apple/Google/Outlook universally. **Cost: £0. Effort: S** for one-shot .ics downloads.

**Subscribe-able feeds (`webcal:`/ICS feed URL):** the proxy serves a live `.ics` document per feed (all events, all fixtures, duty-pharmacy rota); the user's calendar app re-fetches it on its own schedule. **Cost: £0, server required** (one static-ish endpoint per feed). Effort: **M**. This is quietly excellent for retention — once someone subscribes to "Gibraltar events" or "Lions fixtures", Rockway content lives in their calendar permanently with no app opens needed, and the back-link drives returns. Strong, cheap, under-used.

---

## 5. DEVICE INTEGRATION

All of these are free and mostly client-side. Grouped by effort:

- **`tel:` / `mailto:` / Maps deep-links:** trivial. **S, £0.** Maps links (`https://maps.apple.com/?q=` and `https://maps.google.com/?q=` or `geo:`) on every business — pick by platform. No server.
- **Web Share API (`navigator.share`):** VERIFIED widely supported on mobile (iOS Safari + Android Chrome). Share a business/event/listing. **S, £0.** Feature-detect; fall back to copy-link.
- **Share Target (receive shares into the PWA):** manifest `share_target` — lets users share *into* Rockway (e.g. share a photo to a marketplace listing). Android/Chrome only, requires installed PWA. **M, £0.** Lower priority.
- **QR generation (offline, no dep):** a QR encoder is ~a few hundred lines of pure JS — bundle one or write to canvas; **no network, works offline.** Use for business listings, event tickets, "share this place". **S–M, £0.**
- **QR/barcode scanning (`BarcodeDetector`):** VERIFIED — **not supported in Safari or any iOS browser, nor Firefox**; Chrome/Edge on Android/desktop only (caniuse, MDN). Given the iOS-heavy audience, treat native scanning as a **progressive enhancement** with a WASM fallback (e.g. a jsQR/zxing-wasm library) for iOS. **M, £0** (the fallback adds weight). Don't make any core flow depend on scanning.
- **Geolocation ("nearest open business"):** `navigator.geolocation` + client-side distance sort over the directory, cross-referenced with opening hours you already store. **S–M, £0.** No server. Great with the concierge ("nearest open pharmacy now").
- **Add-to-Home-Screen prompts:** `beforeinstallprompt` on Android/Chrome (custom prompt); iOS has no API — show a one-time "tap Share → Add to Home Screen" hint. **S, £0.** Worth doing well because **iOS push depends on install** (§2).
- **App shortcuts:** manifest `shortcuts` array → long-press icon jump-list (Frontier, Today, Discover). **S, £0.** Android/desktop; iOS support limited.

**Verdict:** the cluster of tel/mailto/maps/share/QR-gen/geolocation is near-free, high-polish, and makes the app feel native. Do these early. Treat scanning + share-target as enhancements.

---

## 6. VOICE / ACCESSIBILITY

- **Web Speech API — SpeechRecognition (voice input):** VERIFIED — Chrome/Edge full support; Safari macOS 14.1+ and **iOS support is unreliable/contested** (WebKit limitations; many iOS browsers lack it). (caniuse speech-recognition, MDN.) Treat voice-to-text for the concierge as a **nice-to-have enhancement on Android/desktop**, never a required input. **S, £0** (browser-native, no server). Pairs naturally with "Ask the Rock".
- **SpeechSynthesis (text-to-speech):** much better supported, including iOS. Could read out the Today briefing. **S, £0.**
- **Screen-reader / ARIA, dynamic type, reduced-motion:** pure discipline, no cost. Use semantic HTML, ARIA labels on icon buttons, respect `prefers-reduced-motion` (you have Rock animations — gate them) and `prefers-color-scheme`. **S–M ongoing, £0.** Accessibility is also an SEO/quality signal and broadens the 32k addressable base (elderly residents, tourists).
- **Dark mode:** you already have a day/night Rock — wire it to `prefers-color-scheme` with a manual override stored in localStorage. **S, £0.**

**Verdict:** accessibility + dark-mode + reduced-motion are cheap table-stakes that make it feel a generation ahead; do them. Voice input is a fun concierge garnish, not core.

---

## 7. i18n — English / Español / Llanito

**The Rockway feature:** UI + concierge in EN / ES / **Llanito** (the local Andalusian-Spanish/English code-switching vernacular — a real differentiator and a trust/identity signal that no national or generic app will bother with).

**Lightweight approach (no framework):** a tiny `RW.i18n` registry plugin — JSON dictionaries `{ key: { en, es, yan } }`, a `t(key)` function, and a `data-i18n` attribute scan on render. **Auto-detect** via `navigator.languages`, store the user's choice in localStorage. **S–M, £0, no server.**

Llanito notes: it has no formal ISO code in common use (`yan` is sometimes used informally; not standardized — UNCERTAIN). Treat it as a custom locale string. It's mostly Spanish with English loanwords and switching — so the Llanito dictionary can start as a thin override layer on top of `es`, only diverging where the local phrasing differs ("la frontier", "el bus", etc.). This is also exactly the lexicon the **no-LLM concierge (§1)** needs for query normalization — build once, use twice.

**Verdict:** high identity/retention value, low cost. The Llanito layer is a signature "only Rockway" touch worth marketing. Ship EN/ES first, layer Llanito as an override.

---

## 8. DATA / PERFORMANCE

- **localStorage vs IndexedDB:** localStorage is ~5MB, synchronous, strings-only — fine for prefs, small caches, the i18n choice, push-subscription flags. For anything larger or structured (cached directory, offline queue, images) use **IndexedDB** (hundreds of MB+, async, structured). Wrap IndexedDB in a tiny promise helper (~50 lines) rather than pulling a library. **M, £0.** Migrate heavy caches off localStorage before they hit the cap.
- **Background Sync / offline queue:** Background Sync API is Chrome/Android-centric (not iOS). For posts/bookings made offline, the robust cross-platform pattern is an **IndexedDB outbox**: queue the write locally, flush on next load / `online` event / SW activation. Don't rely on the Background Sync API alone. **M, £0, server needed** for the eventual write. This matters for UGC reliability (Jobs/Property/Marketplace/Chat).
- **Image handling without a backend:** resize/compress client-side with `canvas` (`drawImage` → `toBlob` at reduced dimensions/quality) before upload — keeps the proxy thin and uploads fast on mobile data. For storage you'll still need somewhere to put them (Supabase Storage free tier, or an object store). **M, £0–low.**

**Verdict:** IndexedDB outbox + client-side image compression are the two that materially improve a UGC-heavy PWA on patchy frontier/cruise connectivity. Worth doing.

---

## 9. TRUST / SECURITY for a public app

- **Auth (magic link):** VERIFIED — **Supabase free tier includes 50,000 monthly active users**, magic-link + social login included; Pro is $25/mo (100k MAU); overage $0.00325/MAU. Free projects pause after 1 week inactivity (mitigate with a keep-alive ping). (supabase.com/pricing.) For a 32k-population app, **free tier is ample**. Magic link is the lowest-friction option (no passwords). **M, low/£0.**
- **Rate-limiting UGC + the `/ask` endpoint:** must be server-side in the proxy (per-IP and per-user token buckets; in-memory or Redis-free with a simple sliding-window in SQLite). Protects against spam and LLM cost-blowout. **M, £0.**
- **Spam / abuse / content reports:** a "report" button on every UGC item writing to a moderation queue you (solo) review; basic profanity/URL-spam heuristics client- and server-side; require auth to post (raises the bar significantly). **M, £0.** Honest constraint: as a solo founder, moderation is manual — design for low volume and easy takedown, not scale.
- **Honesty about data:** keep the existing principle — never present community/UGC reports (e.g. frontier queue) as official "live" data; label provenance clearly. This is a trust differentiator.

**Verdict:** Supabase magic-link auth gating UGC + server-side rate-limiting + report buttons is the minimum credible trust stack, and it's essentially free at this scale. Required before opening UGC widely.

---

## RANKED SHORTLIST (top 8)

Ranked by (retention impact × differentiation) ÷ (effort + cost):

1. **Web Push (VAPID), self-hosted** — §2. Biggest habit-forming lever (bin day, duty pharmacy, matchday, frontier spike). £0, M. iOS needs PWA install — pair with a great Add-to-Home-Screen flow.
2. **"Ask the Rock" — no-LLM Option A first** — §1. Signature feature, differentiated by *your own data* (e.g. "groomer free Saturday?"). £0, M. Slot in cheap Haiku routing later (~£10–20/mo) once query logs justify it.
3. **Calendar: subscribe-able webcal/.ics feeds** — §4. Permanent presence in the user's calendar, drives passive return. £0, M. Underrated.
4. **Device polish cluster (tel/mailto/Maps/Share/QR-gen/geolocation)** — §5. Cheap "feels native" wins; "nearest open business now" composes beautifully with the concierge. £0, mostly S.
5. **i18n incl. Llanito** — §7. Identity/trust differentiator no competitor will match; doubles as concierge query normalization. £0, S–M.
6. **Accessibility + dark mode + reduced-motion** — §6. Table-stakes "generation-ahead" feel; broadens the addressable base; wires to your existing day/night Rock. £0, S–M.
7. **Trust stack: Supabase magic-link auth + rate-limiting + reports** — §9. Required to safely scale UGC; free at this scale. low/£0, M. Prerequisite for #1's per-user push and the `/ask` rate limit.
8. **IndexedDB offline outbox + client-side image compression** — §8. Reliability for UGC on patchy frontier/cruise connectivity. £0, M.

**Below the line (defer):** Wallet passes (§3 — $99/yr Apple, "premium feel" not retention; revisit with loyalty cards as a Business upsell); BarcodeDetector scanning (§5 — no iOS support, enhancement only); on-device WebLLM (§1 Option C — download/VRAM cost wrong for a mobile/tourist audience); Background Sync API as a primary mechanism (§8 — non-iOS).

---

## Sources

- iOS Web Push / PWA install requirement: [MagicBell PWA iOS guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide), [OneSignal iOS web push](https://documentation.onesignal.com/docs/en/web-push-for-ios), [Apple Developer Forums](https://developer.apple.com/forums/thread/732594)
- web-push / VAPID self-hosted: [web-push-libs/web-push](https://github.com/web-push-libs/web-push), [web-push npm](https://www.npmjs.com/package/web-push), [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- BarcodeDetector support: [MDN Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API), [caniuse BarcodeDetector](https://caniuse.com/mdn-api_barcodedetector)
- Apple Wallet certs/cost: [Apple Developer Wallet identifiers/certs](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates/), [PassKit support: why an Apple Developer account](https://help.passkit.com/en/articles/2010098-why-do-i-need-an-apple-developer-account), [passkit-generator](https://github.com/alexandercerutti/passkit-generator)
- Google Wallet API: [Google Wallet generic FAQ](https://developers.google.com/wallet/generic/resources/faq), [Issuer onboarding](https://developers.google.com/wallet/generic/getting-started/issuer-onboarding)
- WebLLM / WebGPU: [mlc-ai/web-llm](https://github.com/mlc-ai/web-llm), [WebLLM home](https://webllm.mlc.ai/), [Running AI models locally in the browser](https://maddevs.io/writeups/running-ai-models-locally-in-the-browser/)
- Web Speech API support: [caniuse speech-recognition](https://caniuse.com/speech-recognition), [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- Supabase pricing: [Supabase Pricing](https://supabase.com/pricing), [Supabase MAU usage docs](https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users)
- Claude model pricing / prompt caching: bundled `claude-api` skill (model table: Haiku 4.5 $1/$5 per 1M tokens; prompt caching ~0.1× cached-read; structured outputs / tool use for JSON routing)
