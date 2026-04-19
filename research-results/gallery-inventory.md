# Phase 11 — Gallery Inventory (B1)

Companion to `gallery-inventory.json`. The JSON is the authoritative
catalogue; this file is the human-readable summary of what's in it and
what it tells us about the next steps for B2/B3/B4.

## What we have right now

### 7 pieces of primary evidence (in repo)
| ID | What | Where (in repo) |
|---|---|---|
| `ev-1922-marriage-register` | 1922 Holy Cross Dundrum marriage of Thomas Greene × Bridget Clarke | `research-results/r1-tg-bc-marriage-1922/` |
| `ev-1891-bridget-birth-register` | 1891 Mullaghfin birth of Bridget Clarke (the Catherine née CLINTON record) | `research-results/r2-bridget-birth-1891/` |
| `ev-1875-clarke-marriage-register-falselead` | 1875 Navan Clarke × McKenna marriage — archived as a worked-example of a ruled-out lead | `research-results/r3-pc-cm-marriage-1875/` |
| `ev-1901-census-clarke-mullaghfin` | 1901 Census Form A, House 3 Mullaghfin (Catherine + 6 Clarke children) | `research-results/clarke_duleek_1901.png` |
| `ev-1901-census-clarke-ded` | 1901 DED-level browse page, Mullaghfin | `research-results/clarke_duleek_ded_1901.png` |
| `ev-1911-census-clarke-mullaghfin` | 1911 Census, Catherine still at House 3 Mullaghfin | `research-results/clarke_duleek_1911.png` |
| `ev-1911-census-bridget-dollard` | 1911 Census, Bridget Clarke as Cook in the Dollard household, Dublin | `research-results/catherine_clarke_1911.png` ⚠️ misnamed |

### 7 illustrations now embedded (all self-hosted under `images/illustrations/`)
| Page | Image | Source |
|---|---|---|
| `elizabeth.html` | Biberach an der Riß (modern town) | Wikimedia Commons |
| `elizabeth.html` | Channel Islands liberation, May 1945 | IWM D24599 (PD-scan) via Wikimedia |
| `military.html` | Leinster Regiment cap badge | Dormskirk / Wikimedia (CC-BY-SA-3.0) |
| `portarlington.html` | **Emo Park c.1900** (replaces broken Main Street geograph) | NLI Eason Collection (PD) via Wikimedia |
| _(not yet embedded — B4)_ | Holy Cross Church, Dundrum | William Murphy / Wikimedia (CC-BY-SA-2.0) |
| _(not yet embedded — B4)_ | 1942 Jersey deportation Bekanntmachung | Man vyi / Wikimedia (PD) |

B2 fixed two **broken hot-links** that had been silently failing in
production: the IWM Channel Islands liberation file path on Wikimedia
had changed (`0/07/...` → `c/c3/...`), and the Leinster Regiment cap
badge similarly (`9/95/...` → `c/ce/...`). The Portarlington Main
Street geograph file has been **deleted** from Wikimedia Commons
entirely — replaced with the period-appropriate Emo Park c.1900 image.

All 7 illustrations are now self-hosted (no longer hot-linked), so
future Wikimedia URL changes will not break the live site.

### 12 hero backgrounds (all generic Unsplash mood imagery)
Acceptable for hero use, but most could be replaced in B2 with period-
appropriate Lawrence Collection views (Catherine → rural Meath, Dublin
→ Wellington Quay c.1910, Portarlington → Lawrence c.1900, etc.).

### Process artefacts (intentionally NOT inventoried)
~70 search-form / results / final-state PNGs and HTML files under
`research-results/a*/` and `research-results/probe*/`. These are
Playwright-driver process documentation. Almost all are gitignored.
They are not gallery material.

## The single biggest gap (P0)
**Zero family-personal photographs.** Every photograph on the site is
either Unsplash mood, public-domain place imagery, or a primary-source
document scan. There is no portrait of Thomas, Bridget, Catherine,
Patrick, Elizabeth, Joseph, or any Greene/Clarke individual.

The most realistic place to find personal photos:
- **Bridget Clarke** (b.1891 — definitely lived into the photographic era,
  almost certainly photographed in old age).
- **Elizabeth Harris** (b.~1900 — definitely photographed in adulthood).
- **The next generation down** (Mark's grandparents — high probability of
  multiple photos in family albums).

→ Action: ask Mark or Claire to scan any albums in their possession or
their sisters'/cousins' possession; OneDrive them to `.copilot-shared/`
under a `family-photos/` subfolder. This converts the P0 gap into a
specific actionable list.

## Next-priority gaps for B2 (period/place imagery)

**B2 progress (this commit): 3 of 9 P1 wishlist items filled.**

| # | Wishlist item | B2 status |
|---|---|---|
| 1 | Portarlington c.1900 — NLI Lawrence Collection | ✅ FILLED — Emo Park c.1900 (NLI Eason, PD) |
| 2 | Mullaghfin / Duleek c.1900 | ⏳ pending — try `Category:Duleek` browse + `Category:Geography of County Meath` |
| 3 | Wellington Quay c.1910 (Bridget's workplace context) | ⏳ pending — NLI Lawrence Dublin set has 165 hits, drill-in needed |
| 4 | Holy Cross Church, Dundrum (1922 wedding venue) | ✅ FILLED — William Murphy / Wikimedia (CC-BY-SA-2.0) |
| 5 | Drummartin House, Dundrum (Bridget's pre-marriage workplace) | ❌ unfilled — Drummartin Castle was demolished; building-of-Ireland may have alternative |
| 6 | Jersey under occupation 1940-45 | ✅ FILLED — 1942 deportation Bekanntmachung (PD), stronger than generic occupation photo |
| 7 | Ilag VB Biberach internment camp (period photos) | ❌ unfilled — no Wikimedia hit; try Arolsen Archives photo holdings (different from records) |
| 8 | Duleek Old Churchyard gravestone | 📷 pending — own photo on next visit (not a Wikimedia task) |
| 9 | Dollard's Printing House premises | ❌ unfilled — no Wikimedia image; building still stands at 2-5 Wellington Quay (1885-1890); try buildingsofireland.ie + archiseek.com |

Full priority list (14 items) is in `gallery-inventory.json` →
`wishlist[]`.

## File-rename recommendation
`research-results/catherine_clarke_1911.png` → rename to
`bridget_clarke_dollard_1911.png` in a future cleanup commit. The
current name is inaccurate — the file is in fact Bridget Clarke's 1911
census record as Cook in the Dollard household, NOT Catherine's.

## Schema used
See `gallery-inventory.json` → `schema.fields`. Stable kebab-case IDs
are used so HTML pages and the gallery page can cross-reference assets
by ID rather than path (B3 will need this for the lightbox).
