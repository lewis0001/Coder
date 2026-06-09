# Rockway — Code Quality Audit

Audited: 2026-06-09 · Scope: `index.html`, `server.js`, `test/smoke.js`, `src/styles.css`,
`src/core/*.js`, `src/features/*.js` (all read in full).

**Baseline:** `node test/smoke.js` → **PASS** (`✓ all checks passed · 13 features registered`,
14 routes + 5 actions). The smoke test is green but, as detailed below, **two real
user-facing bugs slip through it** because the test never renders the Activity tab
with data and the server is never exercised with a malformed URL.

Verification method: every non-trivial finding was reproduced with a headless harness
mirroring `test/smoke.js`, or against a live `node server.js` instance. Severity:
**S1** = broken feature / crash, **S2** = visible wrong behaviour, **S3** = polish /
maintainability, **S4** = doc/cosmetic.

---

## 1. Bugs

### 1.1 [S1] Activity / Bookings tab is broken — shows `No function filter() { [native code] } activity yet`
**`src/features/activity.js:68-71`** (and `:96`, `:101-104`).

`render(parts)` is the feature's render entrypoint. The router calls it as
`feature.render(parts.slice(1))` (`src/core/router.js:22`), i.e. it always passes an
**array**. The code then does:

```js
function render(parts) {
  parts = parts || {};
  if (parts.filter != null) currentFilter = parts.filter;   // <-- BUG
```

For an array, `parts.filter` is `Array.prototype.filter` (a function, never `null`),
so `currentFilter` is set to **the filter function**. Consequences:

- `visible = currentFilter === 'all' ? items : items.filter(i => !i.kind || i.kind === currentFilter)`
  → never matches → **every booking/reservation is hidden**.
- The empty-state message interpolates `esc(currentFilter)` →
  literally renders **"No function filter() { [native code] } activity yet."**
  (reproduced on fresh state *and* after creating a booking).
- The `activityFilter` action (`:137-140`) calls `render({filter})` then `RW.render()`;
  the subsequent `RW.render()` re-enters via the router with an array and clobbers
  `currentFilter` back to the function, so the filter chips do nothing.

The bug is masked in the smoke test only because its `#/activity` assertion checks for
`undefined|[object Object]|NaN`, and `[native code]` matches none of those (see §5.1).
Home's "Your Rockway" still shows recent bookings via its own `nowStack()`
(`home.js:29-41`), so bookings aren't *totally* invisible — but the dedicated tab is dead.

**Fix:** distinguish "router array" from "internal `{filter}` call". Simplest:

```js
function render(routeOrOpts) {
  if (routeOrOpts && !Array.isArray(routeOrOpts) && routeOrOpts.filter != null) {
    currentFilter = routeOrOpts.filter;
  }
  ...
```

and have the `activityFilter` action set the module var directly instead of calling
`render({filter})`:

```js
activityFilter: function (el) { currentFilter = el.dataset.v; RW.render(); }
```

---

### 1.2 [S1] Server crashes (process exits) on any malformed-percent URL
**`server.js:168`**

```js
var urlPath = decodeURIComponent(req.url.split('?')[0]);
```

`decodeURIComponent` throws `URIError: URI malformed` on inputs like `/%`, `/%zz`,
`/%e0%a4%a` — and the call is **outside any try/catch**, so the whole Node process
dies. Reproduced live: `curl http://localhost:PORT/%` returns `000` and the server log
shows the `URIError` stack with `Node.js v22 …` exit; subsequent requests get `000`
(process gone). A single crafted request (or a crawler) takes the site down.

**Fix:** wrap the decode and 400 on failure:

```js
var urlPath;
try { urlPath = decodeURIComponent(req.url.split('?')[0]); }
catch (e) { res.writeHead(400); res.end('Bad request'); return; }
```

(Consider a top-level `server.on('clientError', ...)` and wrapping the request handler
body in try/catch for defence-in-depth.)

---

### 1.3 [S1] Property detail pages are unreachable — `RW.navigate is not a function`
**`src/features/property.js:480-484`**

```js
propertyView: function (el) {
  var id = el.dataset.id;
  if (!id) return;
  RW.navigate('#/property/' + id);   // <-- RW.navigate does not exist
},
```

The router only defines `RW.go`, `RW.render`, `RW.bootRender`, `RW.getBuiltin`
(`src/core/router.js`) — there is **no `RW.navigate`** anywhere in the codebase
(grep confirms a single reference, here). Every "View details →" button on a property
card and every "View" button in the Saved list calls `propertyView`, which throws a
`TypeError` and silently does nothing (the click handler in `router.js:52` invokes the
handler with no error boundary, so the navigation just fails). Because no other element
links to `#/property/<id>` directly, **the property detail screen cannot be opened from
the UI at all.** The smoke test reaches it only by setting `location.hash` manually, so
it never catches this.

**Fix:** `RW.go('#/property/' + id);` (matches every other feature).

---

### 1.4 [S2] News "All" chip is ambiguous across two filter rows — can't reset one axis
**`src/features/news.js:575-589`**, with both rows emitting the same action+values
(`:449-457`).

The feed renders two chip rows, **Source** and **Category**, both via
`RW.ui.chips(..., 'newsFilter', ...)`. `RW.ui.chips` emits `data-v="<value>"` only —
there is no row identifier. The handler then guesses which axis to update by membership:

```js
if (SOURCES.indexOf(v) !== -1)        { f.source = v; }
else if (CATEGORIES.indexOf(v) !== -1) { f.category = v; }
```

`'All'` is the first entry of **both** `SOURCES` and `CATEGORIES`. So tapping **"All"
in the Category row sets `f.source = 'All'`** (Source wins the `indexOf` race) and leaves
the category filter stuck. Reproduced: after selecting category `Sport`, tapping the
Category-row "All" leaves `{source:'All', category:'Sport'}` unchanged — the user cannot
clear a category via its own All chip. (Likewise any future label shared by both lists
would collide.)

**Fix options:** (a) give each row a distinct action (`newsFilterSrc` / `newsFilterCat`);
or (b) extend `RW.ui.chips` to accept/emit an extra `data-*` key (e.g. a `group`) and
branch on that. Option (a) is least invasive and needs no core change.

---

### 1.5 [S3] Double-escaping: pre-escaped strings passed to `RW.ui.screen({title})` / `row({name})`
`RW.ui.screen` → `topbar` escapes `opts.title` (`ui.js:24`); `RW.ui.hero` escapes
`opts.title` (`ui.js:81`); `RW.ui.row` escapes `name`/`sub` (`ui.js:56-57`); `RW.ui.empty`
does **not** escape `text` (it's treated as trusted HTML). Several callers escape *again*
before handing the value over, producing `&amp;amp;` for any `&`:

- **`src/features/chat.js:328`** — `const title = esc(thread.emoji) + ' ' + esc(thread.name);`
  then `RW.ui.screen({ title })`. Reproduced: thread title renders
  `🐩 Paws &amp;amp; Claws Grooming`.
- **`src/features/marketplace.js:236-238`** — `RW.ui.hero({ title: 'Gibraltar Buy &amp; Sell', ... })`
  → renders `Gibraltar Buy &amp;amp; Sell` (reproduced). The pre-baked entity `&amp;`
  is itself wrong for a hero that escapes; should be a literal `&`.
- **`src/features/property.js:316`, `:340`** — `name: esc(l.title)`, `sub: esc(...) + ...`
  inside `RW.ui.row({...})`; titles with `&` would double-escape (none in current seed,
  so latent).
- **`src/features/marketplace.js:254`**, **`jobs.js:199`**, **`discover.js:407`** etc.
  pass `esc(filter)`/`esc(activeCategory)` into `RW.ui.sectionTitle(...)` which escapes
  again (`ui.js:62`). Current values are safe ASCII so no visible effect, but it's the
  same anti-pattern.

**Fix:** pass raw strings to UI helpers that escape internally (`screen/hero/row/
sectionTitle`). Audit each `esc(...)` that is immediately consumed by one of these.
Note the asymmetry that causes these mistakes: `empty()` takes **HTML**, but
`screen/hero/row/sectionTitle` take **text** — worth a one-line doc comment on each.

---

### 1.6 [S3] `discConfirm` stores a pre-escaped `when`, then it's escaped again on render
**`src/features/discover.js:690`** stores
`when: esc(dayLabel) + ' · ' + esc(slot)`. This string is then re-escaped by
`activity.js:25` (`esc(b.when)`) and `home.js:36` (`esc(b.when)`). Day labels are
day-names/`Today`/`Tomorrow` and slots are `HH:MM`, so no special characters exist today
and nothing visibly breaks — but the value is double-handled and would garble if labels
ever localise to contain `&`/quotes. **Fix:** store the raw `dayLabel + ' · ' + slot`.

---

### 1.7 [S3] `localStorage` quota / serialisation failures are silently swallowed
**`src/core/store.js:55`** `function save() { try { localStorage.setItem(...) } catch (e) {} }`.
Verified that a throwing `setItem` is swallowed with no signal. For an MVP this is the
safe default (won't crash), but the user gets **no indication their data didn't persist**
(e.g. private-mode Safari, quota full). The JSON-parse guard on load (`:52-53`) correctly
falls back to defaults — good. **Fix (optional):** on catch, `RW.toast('Couldn\'t save —
storage full')` so silent data-loss is at least visible.

### 1.8 [S4] `<meta name="description">` still advertises removed features
**`index.html:8`** — "food, shopping, parcels, wallet … transport, government services".
None of these exist post-pivot. Also `<title>` (`:7`) and the master docs still say
"Gibraltar's everything app" — see §2.1. **Fix:** rewrite to the marketplace pitch.

---

## 2. Stale pivot residue (wallet/payments/cart removed)

The runtime app is clean of *functional* wallet/cart code — there is **no**
`RW.store.debit/credit`, no `RW.S.wallet/points/txns/orders/parcels/cart`, no
`registerCatalog`, and no nav targets to `#/eat|#/wallet|#/cart|#/order/...` (grep over
`src/` confirms). `money()` is used only as a **display** formatter (events ticket prices
"on the door", property rent `/mo`) — never to charge. Remaining residue is dead
code / stale docs:

### 2.1 [S4] Docs & inline comments still describe the wallet world
- **`ROCKWAY.md`**: the architecture tree (`:67`, `:73-79`) lists `store (save/debit/
  credit/cart)`, `cart catalog`, and feature files `cart`, `wallet, pay, bills, topup,
  rewards`, `gov, health` that **do not exist**; design principle #1 (`:32`) says
  "integrates with the wallet where money moves". These contradict the pivot section
  three paragraphs up. (Out of audit-edit scope, but flag for the owner.)
- **`src/core/registry.js:11,26`** — the FEATURE MODULE CONTRACT block uses `id:'eat'`
  as the example and says "Move money only via `RW.store.debit/credit`" — directly
  contradicts the no-wallet rule. Misleads any agent reading core.

### 2.2 [S3] `RW.ICON.wallet` — defined, never used
**`src/core/util.js:32`.** The tabbar uses `home/grid/activity/user`; `pin/back` are used
elsewhere. `wallet` has **0 references** in `src/`. Dead. **Fix:** delete.

### 2.3 [S3] `RW.ui.cartFab` — deprecated no-op kept on the namespace
**`src/core/ui.js:95-97`.** `cartFab()` returns `''` and has **0 callers** (only its own
definition/export). The comment admits it's a tombstone. **Fix:** remove the function and
drop it from the `RW.ui` export.

### 2.4 [S3] `RW.util.sum` — defined, never used
**`src/core/util.js:9,27`.** `sum` has **0 call sites** in `src/` (was a cart/total
helper). Dead. **Fix:** delete.

### 2.5 [S4] Chat "Courier" thread + parcel replies are pivot-flavoured but harmless
**`src/features/chat.js:15,40-46,363`.** A pinned "Courier" thread with
"your parcel is on the way" canned replies — leftover from the delivery concept (Send/
Move were removed). It still *works* (it's just a demo chat), but "parcel/courier" is off
-message for a booking marketplace with no delivery. Also `activity.js:1,102` header/empty
copy still says "orders, parcels & bookings". **Fix (product call):** retheme Courier to a
real booking contact, and drop "orders, parcels" from Activity copy.

---

## 3. Dead CSS (removed-feature stylesheets)

These classes are **defined in `src/styles.css` but have 0 `class="…"` usages anywhere in
`src/` JS** (verified by grep). All are residue of Eat/Shop/Wallet/Send/Move/Cart:

| Class | styles.css | Origin |
|---|---|---|
| `.balance-card` (+`.lbl/.amt/::after`) | `:223-229` | Wallet |
| `.cart-fab` (+`.badge`) | `:203-209` | Cart |
| `.track-step` (+`.ico/.ball/.line/.txt`, `@keyframes pulse`) | `:246-255` | Parcel/Send tracking |
| `.frontier-banner` (+`.big`) | `:135-140` | Old frontier banner (Frontier now uses cards) |
| `.weather-card` (+`.t`) | `:145-146` | Old weather card |
| `.qty` (+ buttons) | `:193-195` | Cart quantity stepper |
| `.venue`/`.venue-head`/`.venue-emoji`/`.rate`/`.meta-line` | `:172-176` | Eat/Shop venue cards |
| `.wordmark`/`.rk-key` | `:102-107` | Old branded top bar (home hero replaced it) |
| `.btn.dark` | `:188` | unused button variant |
| `.divider` | `:266` | unused |

`.checkout-bar` (`:198-202`) is the **one exception** — it is reused by Chat's composer
(`chat.js:308`), so keep it (though the name is misleading; see §4.3). `.dot.green/.amber/
.red` (`:142`) are also unused now (home builds the dot inline with a hex bg) — minor.

**Fix:** delete the dead blocks. ~50 lines of CSS removable with zero behavioural change
(smoke test only checks rendered HTML length, which is unaffected).

---

## 4. Consistency

### 4.1 [S3] Persisted state written but missing from `defaults()` — violates the contract
`AGENTS.md`/`ROCKWAY.md` require every persisted field to live in `defaults()` (forward-
compat merge). These are saved via `RW.store.save()` but are **absent from
`store.js` `defaults()`** (`store.js:16-49`):

- `RW.S.evtCat`, `RW.S.evtMon` — `events.js:451,458` (persisted filter)
- `RW.S._exploreFilter`, `RW.S._cableCarNotify` — `explore.js:325,350`

Reads are guarded (`|| ''` / `=== true`), so nothing throws, but the documented contract
is broken and these keys silently accrue in the saved blob without being reset-aware in
the schema. (`_bizDraftCat`/`_bizEditing` in `business.js` are *also* written to `RW.S`
but only transiently — they're cleared on publish/cancel and arguably shouldn't be on the
persisted object at all; better as module-scope vars like `discover.js` does with
`openBookingKey`.) `RW._mktFilter` (`marketplace.js:113`) is correctly kept **off** `RW.S`
(session-only) — that's the right pattern.

**Fix:** add `evtCat:'', evtMon:'', _exploreFilter:'all', _cableCarNotify:false` to
`defaults()` (or move the underscore-prefixed UI state to module vars).

### 4.2 [S3] Inconsistent filter-state storage across features
Filter state is implemented four different ways: module var (`discover` `activeCategory`,
`jobs` `activeSector`), `RW.<x>` non-persisted (`marketplace._mktFilter`), `RW.S.<x>`
persisted (`events.evtCat`, `explore._exploreFilter`), and `RW.S.newsFilter` object.
Functionally fine, but a reader has to re-learn the pattern per file. Low priority;
pick one convention (module var for ephemeral UI filters is cleanest and needs no schema).

### 4.3 [S4] `.checkout-bar` reused as the chat composer
**`chat.js:308`** reuses `.checkout-bar` for the message input bar and even comments on
the naming mismatch (`:298-299`). It works, but the class name is a pivot leftover. Minor:
rename to `.composer-bar` (update both sites) for clarity.

### 4.4 [S3] Frontier `cameras()` and Explore link-outs use `<a>` inside the click-delegated DOM
Fine functionally (real `<a target="_blank">`), just noting the app mixes `data-act="nav"`
routing with raw anchors — acceptable for external links (`frontier.js:51`, `explore`/
`property` agent URLs are plain text, `news` live items use `<a>`). No action needed.

---

## 5. Test gaps (`test/smoke.js`)

The test renders all routes and exercises only `frontierLevel/frontierReport/setLang`
plus a feed-emptiness sweep. Cheap, high-value additions it currently misses — several of
which would have caught S1 bugs above:

### 5.1 Activity rendering *with data* (would have caught §1.1)
After a booking, assert `#/activity` HTML **contains the business name** and does **not**
contain `native code` / `function filter`. The existing `undefined|NaN|[object Object]`
regex deliberately doesn't catch a stringified function — add `native code` to that regex
globally.

### 5.2 Full Discover booking flow (actions exist, never exercised)
`discBook → discPickDay → discPickSlot → discConfirm` is the product's core path and is
**untested**. Drive it on `biz-pc` and assert `RW.S.bookings.length === 1` and the booking
`when` is well-formed. (I ran exactly this by hand — it works, modulo the §1.6 double-esc.)

### 5.3 Business publish flow
Shim `getElementById(...).value` for the `biz-*`/`svc1-*` fields, fire `bizPublish`,
assert `RW.S.myBusiness` is set and `RW.S.bizBookings.length === 3`, then `bizAccept`/
`bizDecline` flip a status. Also assert `#/business` now renders the dashboard, not the
onboarding form.

### 5.4 Marketplace post, Chat send, News bookmark, Events/Explore reserve
- `mktPost` (shim title/price/category/desc) → `RW.S.listings.length === 1`.
- `chatSend` on `c1` (shim the input value) → thread gets 2 messages (`me` + canned).
- `newsBookmark` then assert `RW.S.newsBookmarks` contains the id; `newsPostNotice`.
- `evtReserve` / `exploreReserve` → `RW.S.reservations` grows; then re-render Activity
  and assert the reservation surfaces (this also re-checks §1.1).

### 5.5 Reset flow
`account.resetDemo` path: call `RW.store.reset()` and assert `RW.S` deep-equals
`defaults()` (this would also flag §4.1 — fields not in defaults survive a "reset"
mentally even if not literally, and the assertion documents the schema).

### 5.6 Server tests (would have caught §1.2)
The smoke test never touches `server.js`. Add a tiny check (or a separate
`test/server.js`): boot the server, `GET /%` and assert the process is still up and
returns a 4xx, and `GET /api/news` returns JSON with `ok` boolean. Even a smoke-level
"server doesn't crash on `/%`" guard is cheap.

---

## 6. Server (`server.js`)

- **§1.2 crash on malformed percent-encoding** — the one blocking issue. See above.
- **Path traversal: safe.** `path.join(ROOT, path.normalize(urlPath))` + the
  `if (!filePath.startsWith(ROOT))` guard correctly rejects `/../../etc/passwd` and
  `%2e%2e/` (verified live: both → 404/403). One subtlety: `startsWith(ROOT)` would allow
  a *sibling* dir whose path is a string-prefix of `ROOT` (e.g. `/home/user/Coder/apps/
  rockway-secret`) — only relevant if such a sibling exists; tighten to
  `filePath === ROOT || filePath.startsWith(ROOT + path.sep)` for correctness.
- **`/api/news` proxy: works and is robust.** Verified it returns **real current
  Chronicle headlines** live (`{"ok":true,"items":[…]}`), with a single-redirect follow,
  6 s timeouts, a `done` guard against double-callback, CDATA/tag/entity cleanup, a 5-min
  cache, and a graceful `{ok:false,items:[]}` on any error/empty parse. The client
  (`news.js:237-252`) only swaps in live data when `ok && items.length`, else keeps seed —
  good. Minor: a parse exception inside `parseRSS` is caught and returns `ok:false` (fine),
  but a malformed-but-non-throwing feed that yields 0 items also returns `ok:false` and is
  **not cached**, so every request re-hits the origin until it recovers — acceptable.
- **Deployability:** zero-dependency, `PORT` from argv/env, `file://` fallback documented.
  Nothing else blocks a simple host **once §1.2 is fixed** (an unhandled `URIError` will
  hard-crash most bare `node server.js` deployments without a process supervisor).
- `Cache-Control: no-cache` on all static responses is fine for a demo (no stale assets);
  no compression, but out of scope.

---

## Fix-first — ranked top 10

1. **§1.2 — `server.js:168` malformed-URL crash.** Wrap `decodeURIComponent` in try/catch,
   return 400. One request currently kills the whole site. *(S1, ~3 lines)*
2. **§1.1 — `activity.js:68-71` Activity tab broken** (renders "function filter() {
   [native code] }", hides all bookings). Guard against the router's array arg. *(S1)*
3. **§1.3 — `property.js:483` `RW.navigate` undefined** → property detail pages
   unreachable. Change to `RW.go(...)`. *(S1, 1 line)*
4. **§5.1/§5.6 — close the test blind spots** that let #1–#3 ship: add `native code` to the
   leakage regex, render Activity with a booking, and a "server survives `/%`" check.
5. **§1.4 — `news.js` "All" chip collision** across Source/Category rows; split the action
   or tag the row so a category can be cleared. *(S2)*
6. **§1.5 — kill double-escaping** at `chat.js:328` and `marketplace.js:236-238` (visible
   `&amp;amp;`), then sweep other `esc()`-into-`screen/hero/row/sectionTitle` callers. *(S3)*
7. **§4.1 — add `evtCat/evtMon/_exploreFilter/_cableCarNotify` to `defaults()`** (or move to
   module vars) to honour the persistence contract. *(S3)*
8. **§3 — delete dead CSS** (`.balance-card/.cart-fab/.track-step/.frontier-banner/
   .weather-card/.qty/.venue*/.wordmark/.rk-key/.btn.dark/.divider`, ~50 lines). *(S3)*
9. **§2.2–2.4 — delete dead JS members** `ICON.wallet`, `RW.ui.cartFab`, `RW.util.sum`. *(S3)*
10. **§2.1/§1.8 — fix stale wallet docs/copy**: `registry.js:11,26` contract block,
    `index.html:7-8` title/description, ROCKWAY.md architecture tree. Misleads agents &
    users about a feature set that no longer exists. *(S4)*

**Also worth doing (just below the cut):** §1.6 raw-`when` store, §1.7 toast on save
failure, §2.5 retheme Courier/"orders, parcels" copy, §5.2-5.5 booking/publish/post/chat/
reset test coverage, §6 `startsWith(ROOT + sep)` traversal tightening.
