# A3b summary — Patrick Clarke × Catherine Clinton marriage search

After Bridget Clarke's 1891 birth register (Duleek RD, Mullaghfin, entry 107)
was re-read and confirmed the mother's maiden name as **Clinton** (not McKenna),
three corrected IrishGenealogy.ie civil-marriage searches were run.

| Slug | Query | Years | Loc | Hits |
|---|---|---|---|---|
| `a3b-pc-cc-marriage` | Patrick Clarke + spouse Catherine Clinton | 1880–1893 | Co. Meath | **0** |
| `a3b-pc-cc-marriage-loose` | Patrick Clarke + spouse Catherine Clinton | 1875–1895 | (any) | **0** |
| `a3b-cc-pc-marriage` | Catherine Clinton + spouse Patrick Clarke | 1880–1893 | Co. Meath | **0** |

## Conclusion
**No civil marriage record found** for Patrick Clarke × Catherine Clinton in the
GRO civil index, even with the broadest reasonable filter (no location, 21-year
window, searched from both sides). All three queries returned the IG site's
literal *"No results found. Please try a different search."* response.

## What this means

The marriage is genuinely not in the civil-records index that IG publishes.
Possible explanations (not investigated in this task — flagged for later):

1. **Marriage occurred before 1880** — Bridget was born late 1891 (per her own
   reading); a marriage 5–15 years prior would put it 1876–1886. The loose
   search covered 1875–1895 nationally, so this should have caught it if civil-
   registered. Worth widening to 1864–1900 in a follow-up.
2. **Marriage was a Catholic church marriage that wasn't civilly registered** —
   civil registration of non-Anglican marriages began in 1864 and was patchy in
   rural parishes for years afterward. NLI parish registers (Duleek RC parish,
   Mullaghfin area: parish of Duleek/Bellewstown) would be the next stop.
3. **Spelling variant** — Clinton ↔ Clenton ↔ Clenan ↔ Glynton; or Patrick
   recorded with second name (Patrick Joseph, etc.). A wildcard
   `lastname=Clinto*` is possible via the IG `*` pattern.
4. **Catherine's surname mis-transcribed in index** — the indexer may have
   matched the maiden name "Clinton" against a different spelling on the page.

## No top hit to flag
There is **no record_id** to drill into for register-page lookup. The next
research step (out of scope here) is to broaden the year window and/or move to
NLI Catholic parish registers for Duleek/Bellewstown, RC Diocese of Meath.

## Driver fixes committed during this task
- `45c39bd` — initial wait-for-editable on `#relation-first-0` (didn't work,
  state name invalid)
- `c7bc55a` — wait for spouse option to become enabled, dispatch change event
- `94fc61f` — directly set relation-first/last via JS (bypass Playwright's
  visibility check on the not-quite-enabled inputs)
- `2a6f55a` — also force-set `relation-0` value via JS so it persists at submit
  (selectOption alone wasn't sticking when the option had been disabled at page
  load)
