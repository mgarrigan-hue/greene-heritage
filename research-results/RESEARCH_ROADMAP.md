# Greene Heritage — Research Roadmap

**Last updated:** 6 Jun 2026 (Phase 16 complete — John Donnelly death-notice sweep negative)
**Maintained by:** automated audit + manual curation
**Driving data:** `data/family.json`

This roadmap catalogues every open research thread referenced anywhere in the project so that any future Mark, agent, or collaborator can pick up the highest-value next thread without re-discovering it.

Threads are graded **P0 → P3**:
- **P0** — Blocks the family's understanding of a direct-line ancestor
- **P1** — Resolves a stated but unresolved hypothesis or chronology gap
- **P2** — Enriches a known person/place with primary-source detail
- **P3** — Speculative or low-yield archive sweeps

---

## 🔥 P0 — Direct-line gaps

### 1. William Greene — Imacrannagh vs. Shanderry
**Why it matters:** Confirmed (April 2026) as Thomas Christopher Greene's father from the 1922 marriage register. Two candidate identities still unresolved.
- **(A) William Greene of Imacrannagh** — farmer, "large family", geographically + generationally a strong fit
- **(B) William Greene of Shanderry** — labourer, census note "husband working in Dublin" (intriguing given Thomas's Dublin life)
**Next searches (IrishGenealogy.ie + parish registers):**
- Portarlington Catholic parish baptismal register for Thomas Christopher Greene (~July 1870) — names father at baptism
- William Greene marriages in Queen's Co. (now Co. Laois) c.1860-1875
- William Greene deaths in Queen's Co. / Co. Laois 1875-1920
- William Greene's own birth/baptism c.1820-1850 to identify HIS parents
**Citation:** `data/family.json:78-95`, `portarlington.html`

### 2. Patrick Clarke Snr — death between 1895/96 and 1901
**Why it matters:** Bridget Clarke (m. Thomas Greene)'s father. Death range already tightened (after 1895/96 per Agnes's birth, before 1901 Census per Catherine's widow status) but exact date unknown. Cause/burial unrecorded.
**Next searches:**
- IG.ie civil death register for Patrick Clarke, Co. Meath, 1896-1901
- Catholic parish burial register for Duleek/Mullaghfin parish, same window
- 1901 Census for Catherine Clarke (widow) — already used; sibling household composition gives Patrick's death = before April 1901
**Citation:** `data/family.json:601-660`

### 3. Bridget Clarke's father Patrick Snr's parents / origins
**Why it matters:** Pushes the Clarke line back another generation.
**Next searches:**
- Patrick Clarke marriages to Catherine Clinton, Co. Meath 1875-1885 (1875 marriage to "Catherine Kavanagh née McKenna" already established as a NEGATIVE — different couple)
- Patrick Clarke baptisms in Meath/Louth parishes c.1840-1855
**Citation:** `data/family.json:550-580` (negative-finding context)

---

## 🟠 P1 — Stated hypotheses awaiting resolution

### 4. Elizabeth "first wife" of Thomas Greene — maiden name + death record
**Why it matters:** Mother of step-children Patrick and Elizabeth Bessie (later Mrs Harris of Jersey/Biberach). Surname currently `(née unknown)`.
**Known:** ~1870 Co. Dublin; m. Thomas ~1899 (Dublin South, 1899, Vol 2, Page 593); d. between c.1912-1925 (Thomas remarried 1922)
**Next searches:**
- Pull image of 1899 marriage cert — names parents + maiden surname
- IG.ie deaths "Elizabeth Greene" / "Lizzie Greene" Dublin city 1912-1922 (filter by age 40-55, husband "Thomas")
**Citation:** `data/family.json:128-150`, event `family.json:1046`

### 5. Elizabeth Bessie Greene (Mrs Harris) — Arolsen / Jersey occupation records
**Why it matters:** Wartime internment at Biberach Ilag V-B confirmed via the 1945 Donaldson letter, but Arolsen Archives haven't yielded records yet despite searches for multiple name variants.
**Already searched (negative):** Arolsen for `Elizabeth Harris`, `Elizabeth Greene`, `Bessie Harris`, `Alfred Harris` — see `family.json:222`, `family.json:1179`
**Next searches:**
- Jersey Archive (jerseyheritage.org) on-island catalogue for occupation-era hospital staff lists
- International Tracing Service request for Ilag V-B Biberach personnel
- UK National Archives for British civilian internee lists Channel Islands 1942-1945
- St. Mary & St. Peter, Vauxhall (Jersey) parish records for the 1941 marriage
- Worcestershire register for Alfred Bower Harris's birth (Bretforton, ~1913)
**Citation:** `data/family.json:216-230`, `elizabeth.html`

### 6. Elizabeth Bessie's route Dublin → Jersey
**Why it matters:** Currently event says "exact year and route unknown".
**Next searches:**
- 1939 Register (England & Wales) — Alfred Harris in Jersey
- Channel Islands shipping passenger lists 1935-1940 (Jersey Archive)
- General Nursing Council Ireland register c.1930-1940 (nursing qualification)
**Citation:** event `family.json:1131`

---

## 🟡 P2 — Primary-source enrichment

### 7. Children of Ita Greene × John Donnelly — births
**Why it matters:** Ann, John Jr, Sheila, Ger Donnelly. Births likely 1959-1970 Dublin. Pinning Ann's birth (eldest) + location (Drimnagh vs Goldenbridge) helps date the move-back.
**Status:** In flight via Phase 12 research agent (`greene-ita-research`)

### 8. John Donnelly Snr (m. Ita) — birth, parents, profession, death
**Status:** Still open after Phase 16. RIP.ie + Irish Times death-notice sweep found Ita Donnelly’s 2025 notice confirming she was wife of the late John, but no John/Sean Donnelly notice matched the full family signature (wife Ita/Eithne + children Ann, John, Sheila, Ger; or Goldenbridge/Inchicore/Drimnagh). Tempting 2014 Lucan/Ringsend John (Sean) Donnelly notice was rejected: wife Eithne but children John, Sheila, Niamh, Barry.
**Next searches:**
- Ask family for approximate death year / funeral home / burial or cremation place.
- GRO Research Room death search for John Donnelly, Dublin, spouse Ita/Eithne, likely post-1975.
- Cemetery searches: Deansgrange, Glasnevin Trust, Newlands Cross, Mount Jerome if family can narrow burial/cremation.
**Citation:** `data/family.json:408-423`, `research-results/r8-rip-john-donnelly/phase-16-summary.json`

### 9. Patrick Greene (stepson, 1926 Census York Street age 23)
**Why it matters:** Direct evidence of him in 1926. Trace to first marriage (Elizabeth), his own marriage/children/death.
**Next searches:**
- Patrick Greene birth Dublin 1899-1905 (father Thomas, mother Elizabeth)
- Marriage records Dublin 1920-1950
- Death records — was he the "John Greene" registering Thomas's 1951 death? Likely no — that's a different son.
**Citation:** `data/family.json:307`

### 10. Mary Bridget Greene (b.1874 Portarlington, daughter of Joseph Greene)
**Why it matters:** Possible relation to Thomas line via the Joseph-William Greene hypothesis (siblings or cousins).
**Next searches:**
- Mary Bridget's marriage / death / descendants
- Joseph Greene's own death + parents (Imacrannagh / Shanderry / elsewhere)
**Citation:** `data/family.json:41-60`

---

## 🟢 P3 — Speculative / wide-net

### 11. Lucy Greene (widow, Kilmalogue 1901)
**Why it matters:** Possible connection to Joseph Greene's line per `family.json:41`.
**Next searches:** 1901 Census Kilmalogue; her husband's death pre-1901; children.

### 12. Family photographs — public outreach
**Why it matters:** Audit identified family photos as the biggest unrealised source. `contribute.html` is now live as the funnel.
**Next actions:**
- Set up `contribute@garrigan.me` mail routing (Cloudflare Email Routing) → forwards to Mark
- Share `https://greene.garrigan.me/contribute.html` with cousins on Donnelly side first (closest to Ita's recent passing)
- Consider posting in Irish genealogy Facebook groups for Portarlington / Inchicore / Drimnagh history

### 13. Military service of Thomas Greene
**Why it matters:** Underage Boer War enlistment c.1884 hypothesised. No confirming record yet.
**Next searches:**
- UK National Archives WO97 (soldier's documents pre-1913) for Thomas Greene, Leinster Regiment / Royal Canadians
- Forces War Records / Ancestry military collections for Boer War South Africa
**Citation:** `military.html`, `family.json:116`

---

## 📋 How to work this roadmap

1. Pick the highest-priority unblocked thread
2. Use `tools/research/maintained/ig-civil.mjs` for IrishGenealogy.ie or document the source type if outside IG
3. Save artefacts under `research-results/<slug>/` (screenshots, raw HTML, JSON, summary.md)
4. Update `data/family.json` with findings (preserve all existing data, add to `sources` array with confidence)
5. Bump `meta.lastUpdated` and add a `meta.changelog` entry
6. Update this roadmap: move resolved threads to the "✅ Resolved" log below, refine open ones
7. Commit + push as `Research: <thread-name> (Phase <N>)`

---

## ✅ Resolved (recent — last 90 days)

| Phase | Thread | Outcome | Date |
|---|---|---|---|
| 10 | Thomas's father identity | William Greene (Traveller) per 1922 marriage register | Apr 2026 |
| 10 | Catherine Clarke maiden name | Clinton (per 1891 birth register) | Apr 2026 |
| 10 | Patrick Clarke Snr existence + occupation | Labourer of Mullaghfin (per 1891 birth register) | Apr 2026 |
| 10b | Patrick × Catherine Clinton marriage | NOT in civil register (negative finding) — pre-1864 or church-only | Apr 2026 |
| 10 | Elizabeth Bessie Greene marriage to Alfred Harris | 13 Sep 1941, St Mary & St Peter (Vauxhall), Jersey | Apr 2026 |
| 10 | Bridget Clarke 1911 employer | Joseph Dollard JP household, Dublin | Apr 2026 |
| 11 | Site gallery — illustrations | 6 self-hosted + 7 alt-archive sources | Apr 2026 |
| 12 | Ita Greene × John Donnelly marriage | NEGATIVE on IG.ie — 18-query sweep null (IG.ie 75-year wall for marriages); needs grosearch.ie / parish | Jun 2026 |
| 13 | William Greene candidates (PARTIAL) | Agent terminated mid-flight. Captured: 2 Mountmellick 1868 marriages (× Catherine Costigan + × Eliza Woods, one day apart), candidate 1909 Mountmellick death age 66 (b.~1843), NLI Portarlington baptism pages 142-145 browsed but Thomas baptism not yet extracted. Synthesis pending — see `research-results/r5-william-greene-identity/` | Jun 2026 |
| 16 | John Donnelly Snr death notice | NEGATIVE — RIP.ie (55 captured Donnelly/John/Sean candidates + Ita notice), Irish Times notices, FamilySearch public search, and GRO access triage did not identify Ita Greene’s husband; death date remains open pending family/GRO/cemetery follow-up. | Jun 2026 |

---

## 🚧 Known research-tooling constraints

- **IG.ie moving wall (2026)**: births searchable to ~1925, marriages to ~1950, deaths to ~1975. Post-wall → grosearch.ie (paid scans ~€4) or Catholic parish registers (NLI / diocesan archives / parish email).
- **NLI registers** (parish records) are image-only, no name search. Browse the relevant parish + year manually.
- **Arolsen Archives**: tried multiple name variants for Elizabeth Bessie Greene/Harris — no online hits. Needs an ITS records request (postal).
- **GitHub Pages SSL with Cloudflare custom domain**: must keep proxy OFF (DNS only / grey cloud) — GitHub handles TLS via Let's Encrypt; orange-cloud proxying breaks the handshake.
