# Rockway — visual / UX audit

Date: 2026-06-09 · Method: Puppeteer at 430x920 @2x against `node server.js 4178`.
Every route screenshotted (`#/`, `#/discover`, `#/discover/biz-pc`, `#/business`,
`#/frontier`, `#/marketplace`, `#/jobs`, `#/property`, `#/events`, `#/explore`,
`#/news`, `#/chat`, `#/activity`, `#/account`) plus interaction states: full
booking flow, business onboarding + publish, chat thread + send, marketplace
post, frontier report, scrolled states. Console + pageerror captured throughout.

**JS console:** zero `pageerror` / render exceptions across all routes and flows.
The only console error is the Google Fonts stylesheet failing in the sandbox
(`ERR_CERT_AUTHORITY_INVALID`) — the system-font fallback looks fine, but note
the app has a hard external font dependency (see L-7).

Screenshots referenced below live in `/tmp/rwshot/*.png` (r_* = routes, f_* =
flows, z_* = hero close-ups).

---

## HIGH severity

### H-1 · Every screen · The app cannot scroll at all
`.phone` is `display:flex; flex-direction:column; overflow:hidden`, but all UI
renders inside the unstyled block `<div id="app">` between `.phone` and
`.screen`. The flex chain is broken: `.screen { flex:1; overflow-y:auto }` has
no height constraint, grows to its content (measured: `scrollHeight ===
clientHeight === 2464px` inside a 920px phone), and everything below the first
viewport is clipped by `.phone`'s `overflow:hidden` — unreachable by wheel,
touch or keyboard. The absolutely-positioned tab bar hides the cutoff, so each
screen *looks* fine while most of its content (Discover services below the
fold, the booking Confirm button on smaller screens, news feed, reviews,
"Publish listing", crossing tips...) is dead space. There is no `#app` rule
anywhere in `styles.css`.
**Fix (one line):** `#app { display: contents }`, or move the flex column onto
`#app` (`height:100%; display:flex; flex-direction:column; min-height:0`).
All "below the fold" issues in this audit were captured with a session-only CSS
patch; the shipped app never shows that content.

### H-2 · #/activity · Screen is permanently broken (stringified function in UI, bookings never shown)
`activity.js` `render(parts)` treats `parts` as an options object, but the
router passes an **array**. `parts.filter` therefore resolves to
`Array.prototype.filter`, a function, which is stored in `currentFilter` on
every router render. Consequences, all confirmed on screen:
- Every item with `kind:'bookings'` (all customer bookings and reservations) is
  filtered out forever — the feed can only ever show kind-less items
  (marketplace listings, business-side cards).
- The empty state stringifies the function: **"No function filter() { [native
  code] } activity yet."** renders verbatim (r_activity.png).
- The header contradicts the body: "1 item this week · 1 total" above an
  "empty" list (f_book_3_after_confirm.png).
- The All/Bookings chips never get an active state (they match neither value)
  and clicking one is clobbered by the next render — they look and behave dead.
**Fix:** read `parts[0]` (or ignore route parts entirely); have
`activityFilter` set `currentFilter = el.dataset.v` directly; guard that
`currentFilter` is always a string.

### H-3 · Booking flow end-to-end · Conversion loop dead-ends on the broken screen
The flow itself is pleasant (inline panel, day chips, slot chips, confirm label
updates to "Confirm booking · Thu, 11 Jun 10:00", toast on success) — but
`discConfirm` navigates to `#/activity`, which because of H-2 tells the user
they have **no activity** seconds after the toast said "Booking requested".
The single most important loop in the product ends on a screen that denies the
booking exists. Fixing H-2 fixes this; consider also a dedicated confirmation
state (ref number + "what happens next: the business accepts/declines") rather
than dumping into a generic feed.

### H-4 · #/chat thread · Message composer is invisible — users cannot type
The composer is rendered into the `sticky` slot with `class="checkout-bar"`
(`position:absolute; bottom:0; z-index:20`); the opaque tab bar occupies the
same spot with `z-index:40`. The input + Send button sit exactly behind the
tab bar (f_chat_thread.png — empty thread says "No messages yet — say hola!"
with no visible way to say hola). Sending only worked in this audit via
programmatic `.click()`.
**Fix:** position the sticky slot at `bottom: calc(var(--tab-h) +
env(safe-area-inset-bottom))`, or hide the tab bar inside a thread. Also the
Send button and sent bubbles are WhatsApp-green — off the Limestone & Key
palette (see M-9).

### H-5 · #/ (home) · Day-phase Rock hero text is illegible
The hero overlay is hardcoded white (`.hero-top { color:#fff }` with a faint
text-shadow; weather pill is white-on-white-at-20%). At night it is handsome,
but in the day phase (08:00–18:00, i.e. most usage) the greeting, the
"Gibraltar · time · Levanter" line and the temperature pill are white on a
pale `#bfe1f2 → #eaf5fb` sky — effectively invisible (z_hero_day.png). Only
the footer has a scrim.
**Fix:** add a top scrim (mirror of `.hero-foot`'s gradient) or switch overlay
ink per phase (e.g. `--ink` for dawn/day with a soft light scrim), and give the
weather pill a dark translucent background in light phases.

### H-6 · #/marketplace · Double-escaped entities render as literal "&amp;"
The hero title shows **"Gibraltar Buy &amp; Sell"**, the subtitle
"...electronics &amp; more — across the Rock", and the feed section title "Buy
&amp; Sell" (r_marketplace.png). `marketplace.js` passes pre-escaped strings
(`'Gibraltar Buy &amp; Sell'`) into `RW.ui.hero`/`sectionTitle`, which escape
again. Flagship screen, looks unmistakably broken.
**Fix:** pass raw `&` and let the builders escape. Same latent pattern exists
in `discover.js` `discConfirm` (stores `esc(dayLabel)` into `b.when`, which
`activity.js` escapes again on render) — harmless today, fix while there.

### H-7 · All non-tab screens + Discover detail · Tab bar active state is wrong
`RW.ui.screen()` defaults `tab:'home'`, so the Home tab is lit on Discover
**detail** (`#/discover/biz-pc` — clearly a Discover context), Business,
Frontier, Marketplace, Jobs, Property, Events, Explore, News and Chat
(r_discover_detail.png, r_business.png, etc.). Only Discover list, Activity and
Account set it correctly. Users always appear to be "on Home".
**Fix:** pass `tab:'discover'` from `renderDetail`, and map secondary surfaces
to their nearest hub (or support `tab:null` to light nothing). Cheap, high
trust win.

### H-8 · #/business dashboard · Fake stats and fabricated bookings for a real owner
Publishing a brand-new listing instantly shows **"190 Profile views", "3 Total
bookings"** and three seeded incoming bookings (Lucia G., Marco A., Deborah S.)
(f_biz_dashboard.png). These also leak into the owner's own Activity feed as
"Booking request" cards. This is the screen a real Gibraltar business owner
would judge the platform by, and it violates the stated "honest data only"
principle; the seeded request times are also nonsense ("Classic lash set ·
Thu 11 Jun · 10:41pm").
**Fix:** start at 0 views / 0 bookings (empty state: "Share your listing —
bookings land here"), or clearly badge demo content ("Sample booking — demo").

### H-9 · #/news + home Top Story · Fabricated seed stories presented as live news
Seed articles are stamped `Date.now() - 2h/4h/...`, so invented stories render
as "GBC · 2h ago" indistinguishable from journalism. When the real Chronicle
RSS loads, the "Live · Gibraltar Chronicle" section appears **above** the seed
"Latest" feed — real and fabricated news interleaved on one screen with no
"sample" labelling (r_news.png vs r_news_bottom.png). The home "Top Story" card
always uses seed `ARTICLES[0]`, so the home screen headlines a fake story even
when live data is available. Same pattern on the Community Noticeboard ("Lost:
grey tabby cat ... 3h ago, Posted by Maria R.").
**Fix:** when live items exist, make them "Latest" and drop or clearly badge
seeds ("Sample story — demo data"); point the home Top Story at the live feed
first; pin seed timestamps to fixed past dates rather than rolling "2h ago".

---

## MEDIUM severity

### M-1 · #/frontier · 30s tick re-render wipes the report composer
`frontier` registers `tick:30000`; the router re-renders the whole screen and
resets `scrollTop`. A user halfway through typing an "Optional note" loses
their text and their scroll position every 30 seconds. Same mechanism will bite
any future ticking screen (chat input survives only because chat has no tick).
**Fix:** preserve/restore input value + scroll across tick renders, or patch
only the dynamic cards instead of full re-render.

### M-2 · #/ hero (night) · Levanter cloud reads as a glitch; invalid colour kills the cable line
The bright-white levanter ellipses (opacity .92) over a near-black rock read as
a rendering artifact at night (z_hero_night.png, r_home.png). Separately,
`rock.js` has a literal bug: night cable-car stroke is `'#3a5group'` — not a
colour — so the cable line vanishes at night (string "group" concatenated into
the hex). **Fix:** dim/tint the cloud at night (e.g. opacity .25, blue-grey
fill) and correct the hex (presumably `#3a5a78`).

### M-3 · #/ hero · "Buenas, evening" greeting is a half-translated mashup
`'Buenas, ' + dayPart()` yields "Buenas, morning/afternoon/evening" — reads
like a template bug rather than Llanito flavour. **Fix:** full pairs ("Buenas
tardes" / "Good evening", rotate EN/Llanito), and drop the comma.

### M-4 · #/account · Four dead settings rows
Notifications, Saved addresses, Help & support, About Rockway are chevroned
rows with **no handlers** — they look tappable and do nothing. Help & support
("Chat · FAQ") doesn't even link to the existing `#/chat` support thread.
**Fix:** wire Help & support to `#/chat/support`, About to a small sheet, and
either implement or remove the other two (an MVP is better with fewer, honest
rows).

### M-5 · #/account · Language switcher only changes one paragraph
EN / Español / Llanito persists `RW.S.lang` and toasts "Language updated", but
nothing in the app translates — only the blurb under the switcher changes.
ROCKWAY.md sells a "Llanito option". **Fix:** either translate the high-traffic
chrome (tab labels, greetings, CTA strings) or relabel the control honestly
("Llanito flavour: greetings & phrases").

### M-6 · #/chat · "Courier" pinned thread is pre-pivot debris
A Courier contact with parcel canned replies ("your parcel is on the way")
contradicts the pivot (Send/delivery removed). The thread list also shows six
identical "Tap to start chatting" rows — no previews/timestamps, feels
inert. **Fix:** remove Courier; seed the support thread with one real welcome
message; show last-message preview + time.

### M-7 · index.html · Pre-pivot title/meta
Browser tab, SEO and share cards say "Rockway — Gibraltar's everything app ...
food, shopping, parcels, wallet, transport, government services". The product
is a local-business booking marketplace. Activity's empty copy ("Your orders,
parcels &amp; bookings appear here") has the same problem. **Fix:** rewrite
title/description and the Activity empty copy to marketplace language.

### M-8 · Discover booking panel · Slots ignore time and business hours
"Today" offers 09:00–16:30 even at 22:40 (a booking in the past is one tap
away); every business gets the same 9–17 grid regardless of its stated hours,
and Sunday is offered for "Mon–Sat" businesses. Per-business availability is on
the TODO, but the past-slot case undermines trust now. **Fix (quick):** filter
out past slots when day === today; grey out days the business is closed.

### M-9 · Cross-screen · The palette drifts from "Limestone & Key" to generic red+blue+green
The brand promise is warm limestone, one red, gold accent — but the booking
spine's primary actions are sea-blue (Book, Message, Confirm booking, View
details, Preview in Discover), chat sends are WhatsApp-green, and gold barely
appears outside the bell icon and footer key. Identical actions change colour
across screens: Message is blue on Discover, red on Marketplace; active filter
chips are red on Discover/News/Frontier but navy on Business categories.
**Fix:** one rule — red for primary commit actions, ink/ghost for secondary,
gold for highlights/ratings; reserve blue for informational pills only; make
`chip.on` brand-red everywhere.

### M-10 · #/events · Past events listed first as reservable; CTA copy wobbles
On 9 Jun the first cards are "31 MAY Mediterranean Sunset Yoga" and "5 JUN
Trafalgar Cemetery Heritage Walk", both offering "Reserve — RSVP free"; the
"This month" stat counts them. One card says "RSVP — free" while the rest say
"Reserve — RSVP free". **Fix:** filter or grey past dates ("Happened — see
photos"), unify the CTA string.

### M-11 · #/events · Wrong-concept emoji
"St. Michael's Cave Concert" uses the **blood-drop** emoji (U+1FA78) — reads as
a blood drive (f_events_true_bottom.png); the Trafalgar Cemetery walk's
headstone emoji (U+1FAA6) renders as a grey box on several platforms
(r_events.png). **Fix:** violin/candle for the cave concert; a laurel or
monument glyph for the cemetery walk.

### M-12 · #/property · Price formatting and meaning
"£2200.00/mo" + "per month" double-labels the period and the ".00" is noise —
should be "£2,200/mo". Worse, price colour is the **agent's** accent
(Chestertons red, BMI green, ...), so a green price beside a red one reads as
"good deal vs expensive" when it means nothing of the sort
(f_property_bottom.png vs r_property.png). **Fix:** one ink/brand colour for
all prices; keep agent accents to the small agent chip.

### M-13 · #/marketplace + #/explore · Page order buries the main content
Marketplace opens with the full "Post an Item" form before any listings; Explore
opens with an empty "Your list" section before the attractions. Browsing is the
90% case. **Fix:** feed first; "Post an item" as a compact button/FAB that
expands the form; personal list sections collapse when empty or move below.

---

## LOW severity

- **L-1 · #/marketplace:** stat pluralisation "1 Free items"; naming drift
  "Market" (top bar) vs "Marketplace" (tile) vs "Buy & Sell" (hero) vs "Your
  Listings" / "Your adverts" (Account). Pick one name and one plural helper.
- **L-2 · Top bars:** hub screens are red with a back chevron (Discover, News,
  Jobs...) while Activity/Account are plain white — two header systems with no
  rule; back chevrons on bottom-tab destinations are unusual, and back walks
  the entire hash history. Consider: tabs get no back button; only true detail
  screens do. (Back behaviour itself is correct: detail → its list, verified.)
- **L-3 · #/discover detail:** title duplicated (top bar + hero band, both "Paws
  & Claws Grooming"); the topbar could stay plain on detail screens.
- **L-4 · Save affordances differ everywhere:** ghost "Save" button (Discover),
  corner heart (Property), small "Save" pill (Marketplace), "Add to my list"
  (Explore). One heart pattern would read as one product.
- **L-5 · #/frontier:** camera rows show both an external-link arrow in the sub
  and a "›" trailing chevron (double affordance); the typical-by-hour "now" bar
  is sea-blue among traffic-light bars; the share-report toast's raised-hands
  emoji is nearly invisible on the dark toast.
- **L-6 · #/ home grid:** "Daily life" section contains a single tile
  (Frontier) — an orphan row that makes the grid feel half-built; merge into
  one "Explore Gibraltar" grid. The emoji-tile grid is also the most
  "generic AI app" moment in an otherwise distinctive product — tinted SVG
  glyphs (matching the tab bar's stroke icons) would lift it.
- **L-7 · index.html:** hard dependency on fonts.googleapis.com; self-host
  Inter (or accept system stack) for offline/file:// parity with the zero-build
  story.
- **L-8 · Home weather pill:** `RW.api.weather()` is fabricated but presented
  as live ("21°C") — same honesty bar as news/frontier; TODO already lists
  Open-Meteo. Until then consider "typical 21°" phrasing.
- **L-9 · Business form:** services rows show prefilled-looking "25"/"30"
  beside a placeholder name — ambiguous whether they are values or examples;
  category active chip is navy while every customer-facing active chip is red.
- **L-10 · Seed reviews read AI-generic** ("Solid service. Would use again
  without hesitation.") — a couple of Gibraltar-flavoured details (Llanito
  phrases, street names) would sell the directory better until real reviews
  land (review write-back is already on TODO).

---

## What already looks strong (keep)

- **Honest Frontier framing** — community reports + official cameras, "no
  official wait-time feed" disclaimer, typical-by-hour clearly labelled "not a
  live measurement". The report flow works and updates the status card
  instantly.
- **Explore content quality** — Cable Car marked Closed until 2027 with a
  "Notify me" CTA; GTA Rock Tour with real operator pricing; researched copy
  throughout. This is the anti-generic differentiator.
- **Live Chronicle RSS** genuinely works through the proxy (real, current
  headlines render in the Live section).
- **Business onboarding → publish → dashboard → Account "Manage"** state chain
  works and feels coherent (minus H-8's fake numbers).
- The night-phase Rock hero, lighthouse blink, ship bob and pulse dot are a
  distinctive signature surface worth the polish investment of H-5/M-2.

---

## Top 10 highest-impact polish items (ranked)

1. **Restore scrolling app-wide** — `#app { display: contents }` (H-1). Nothing
   else matters until content is reachable.
2. **Fix `activity.js` array/object bug** so bookings appear and the
   stringified-function empty state disappears (H-2, unblocks H-3).
3. **Lift the chat composer above the tab bar** so messaging is usable (H-4).
4. **Add a day-phase scrim / adaptive ink to the Rock hero** — the brand
   surface is unreadable for most of the day (H-5).
5. **Correct tab-bar active states** (Discover detail → Discover; secondary
   surfaces → nearest hub or none) (H-7).
6. **Fix marketplace `&amp;` double-escapes** on the hero, subtitle and section
   title (H-6).
7. **Remove or "demo"-label fake business stats/bookings and seed news
   freshness** — align the two flagship surfaces with the honest-data
   principle (H-8, H-9).
8. **Hide past time slots ("Today" at 22:40 offers 09:00) and past events**
   (M-8, M-10).
9. **Unify the action palette** — red commit buttons, one active-chip style,
   one Message/Save treatment; retire WhatsApp-green and most sea-blue CTAs
   (M-9, M-12, L-4).
10. **Sweep pre-pivot debris** — index.html "everything app" meta, Courier
    thread, "orders & parcels" copy, "Buenas, evening" greeting, dead Account
    rows (M-3, M-4, M-6, M-7).
