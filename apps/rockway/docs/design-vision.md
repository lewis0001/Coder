# Rockway — Design Vision: "An instrument for the Rock"

> The brief: **do not look like a typical AI app.** No skeuomorphic phone-frame
> mockup, no purple gradients, no generic emoji-tile grid presented *as* the
> product, no rounded-card soup. Push the interaction model. Build for the
> future. Ground everything in real Gibraltar.

## The core idea
Most "super-apps" are a **launcher** — a wall of icons. Rockway is instead a
**living instrument for the territory you live in.** Gibraltar is tiny (6.7 km²,
~32k people, one Rock, one frontier, one runway you drive across). That scale
makes something impossible elsewhere possible here: an app that shows you the
**live state of the whole place** and lets you act on it.

So the home isn't a grid — it's **"The Rock, now."** A generative line-drawing of
the Rock that reflects real-time territory state, with the few things that
actually matter *right now* surfaced as living signals. The full catalogue of
services lives one gesture away in an **"Everything" sheet** (driven by the
feature registry), but it is not the first thing you see.

## Signature surfaces
1. **The Rock, now (home).** A hand-drawn SVG silhouette of Gibraltar that is
   *time-* and *state-aware*:
   - palette shifts with time of day (dawn → day → dusk → night),
   - a **Levanter** cloud rolls over the summit when the wind is easterly,
   - the **frontier** shows as a pulsing artery at the isthmus — beat rate and
     colour track the live queue,
   - the **runway** line flashes when Winston Churchill Ave is closed for an
     aircraft (a uniquely Gibraltar signal),
   - ships sit in the Bay; the cable car climbs; the lighthouse blinks at Europa.
   Below it, a short **"what matters now"** stack (your live order, next bus,
   frontier trend, today's event) — contextual, not a static menu.
2. **The Frontier dial.** A tactile radial gauge instead of a number in a box —
   the product's hero, befitting its real-world importance.
3. **The Everything sheet.** Swipe-up / tap launcher built from `RW.tiles()`,
   grouped by section — fast, searchable, secondary to the live home.

## Visual language — "Limestone & Key"
- **Material:** warm limestone "paper" (`#f3 efe4`), ink text, generous space,
  fine hairlines — editorial, not app-store-glossy.
- **Colour:** restrained. One confident **Gibraltar red `#d4112a`** used sparingly
  as a signal, **castle-key gold `#f3b21b`** as the single accent. Sea-blue only
  for water/frontier context. **No multi-stop gradients as decoration.**
- **Type:** strong typographic hierarchy with a distinctive display treatment
  (large, tight, confident headings) over a clean grotesque/Inter body. Numbers
  (wait times, money) get tabular, oversized treatment — this app is about live
  figures.
- **Line-art > emoji.** Custom inline SVG iconography and the Rock illustration
  carry the identity; emoji are a fallback, not the brand.
- **Motion:** physical and quiet. The Rock "breathes"; the frontier pulse beats;
  transitions are short and eased. Nothing bounces for the sake of it.
- **Dark mode = "Night Rock":** obsidian limestone, warm gold, the lit frontier.

## Authenticity rules (see docs/research/*)
- **No ride-hailing.** Taxis = the single-licensed **Gibraltar Taxi Association**;
  model booking/rock-tours accordingly, never an Uber clone.
- Real biller names (GEA, AquaGib, Gibtelecom), real gov offices, real places,
  real events (National Day 10 Sep), GHA for health, Llanito used tastefully.
- Currency: Gibraltar pound (£, 1:1 with GBP).

## Implementation notes (keep the architecture)
- The plugin/registry core stays. This is a **presentation-layer** evolution:
  rewrite `features/home.js` into the living surface; add an Everything sheet to
  the shell; evolve `styles.css` to the Limestone & Key system + time-of-day
  theming; add the Rock SVG as a component (e.g. `src/core/rock.js`).
- Keep `node test/smoke.js` green throughout.
