# Rockway — live build checklist

Status: ✅ done · 🔨 in progress · ⏳ queued · 🔬 needs research

## Foundation
- [x] Plugin/registry architecture (core/*)
- [x] Design system (styles.css)
- [x] Persistence + wallet ledger (store.js)
- [x] Headless smoke test (test/smoke.js) — keep green
- [x] Zero-dep server + file:// support
- [x] Scaffold docs (ROCKWAY.md, AGENTS.md, this file)
- [ ] 🔬 Gibraltar research dossier (docs/gibraltar-research.md)
- [ ] 🔨 Distinctive, non-generic shell redesign ("living Rock" identity)

## Features
### Core surfaces
- [x] Home · Activity · Account · Cart/Checkout/Order tracking

### Daily life
- [x] Eat (food delivery)
- [x] Shop (groceries/pharmacy/convenience)
- [x] Send (parcel courier)
- [x] Frontier (live border queue) — killer feature
- [x] Move (bus / cable car / ferry) — ⚠️ revise taxi to Gib Taxi Association reality
- [ ] ⏳ Parking (pay-by-zone, permits, runway-crossing aware)

### Money
- [x] Wallet (balance, txns, top-up, QR)
- [ ] ⏳ Pay (P2P send/request, split bills with contacts)
- [ ] ⏳ Bills (Electricity Authority, AquaGib water, GibFibre, council)
- [ ] ⏳ Top-up (mobile / eSIM / data)
- [ ] ⏳ Rewards (Rockway points → redeem)

### Services
- [x] Gov.gi (appointments + services)
- [ ] ⏳ Health (GHA / St Bernard's appts, prescriptions, pharmacy)
- [ ] ⏳ Jobs (local board)
- [ ] ⏳ Property (rentals & sales)
- [ ] ⏳ Marketplace (local classifieds buy/sell — user can post)

### Explore & connect
- [x] What's On (events & ticketing)
- [ ] ⏳ Explore (Rock tours, cable car, St Michael's Cave, dolphin watching, attraction tickets)
- [ ] ⏳ News (local headlines + community noticeboard)
- [ ] ⏳ Chat (messaging; order/courier threads)

## Cross-cutting upgrades (future)
- [ ] Dark "obsidian Rock" theme
- [ ] Live territory signals on Home (runway crossing, ships in bay, Levanter)
- [ ] Llanito copy pass across features
- [ ] PWA manifest + offline cache

## Notes for continuity
- Manifest in `src/core/boot.js` already lists every feature file above.
- After each feature: update this file + run `node test/smoke.js`.
