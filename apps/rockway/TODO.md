# Rockway — live build checklist

Status: ✅ done · 🔨 in progress · ⏳ queued · 🔬 needs research

## Foundation
- [x] Plugin/registry architecture (core/*)
- [x] Design system (styles.css) + "Limestone & Key" + Rock hero
- [x] Persistence + wallet ledger (store.js) + per-feature state slots
- [x] Headless smoke test (test/smoke.js) — **green, 24+ features**
- [x] Zero-dep server + file:// support
- [x] Scaffold docs (ROCKWAY.md, AGENTS.md, this file, design-vision.md)
- [x] 🔬 Gibraltar research dossier (docs/research/* + gibraltar-research.md)
- [x] Distinctive, non-generic shell ("The Rock, now" living home + Rock SVG)

## Features
### Core surfaces
- [x] Home (living Rock) · Activity (extensible feed) · Account · Cart/Checkout/Order tracking

### Daily life
- [x] Eat · Shop · Send · Frontier (live border) · Move (Gib-accurate transit) · Parking

### Money
- [x] Wallet · Pay (P2P/split) · Bills (AquaGib/Rates/Gibtelecom) · Top-up (mobile/eSIM) · Rewards (Keys)

### Services
- [x] Gov.gi · Health (GHA/PCC) · Jobs · Property · Marketplace

### Explore & connect
- [x] What's On (events) · Explore (attractions/tours) · Chat (Llanito threads)
- [ ] 🔨 News (local headlines + noticeboard) — agent finishing

## Cross-cutting upgrades (next)
- [ ] "Everything" launcher sheet (search across features)
- [ ] Dark "Night Rock" theme + time-of-day palette already in Rock SVG
- [ ] Live territory signals on Home (runway crossing for pedestrians, ships)
- [ ] Llanito copy pass across all features
- [ ] PWA manifest + offline cache
- [ ] Per-feature polish review pass (consistency, empty states)

## Notes for continuity
- Manifest in `src/core/boot.js` lists every feature file.
- After each change: run `node test/smoke.js` (must stay green) + update this file.
- New persisted state must be added to `defaults()` in `src/core/store.js`.
