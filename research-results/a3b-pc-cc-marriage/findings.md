# a3b-pc-cc-marriage — IrishGenealogy.ie civil marriage search

## Query
- Type: marriage (civil records)
- Groom: Patrick Clarke
- Bride (spouse field): Catherine Clinton
- Years: 1880–1893
- Location: Co. Meath
- Final URL: `https://www.irishgenealogy.ie/search/?church-or-civil=civil&firstname=Patrick&lastname=Clarke&location=Co.+Meath&yearStart=1880&yearEnd=1893&event-marriage=1&relation-0=spouse&relation-first-0=Catherine&relation-last-0=Clinton`

## Result
**0 hits** — server returned: *"No results found. Please try a different search."*

## Notes
- First two attempts hit a transient `Database Error` (HTTP 500) at irishgenealogy.ie; succeeded after a 5-min cool-off.
- Driver fix `c7bc55a` + `94fc61f` + `2a6f55a` applied so the spouse option is force-enabled and the `relation-0` value is force-set via JS before submit (the disabled→editable race could no longer be solved by Playwright's `fill()` alone — it had to be done via DOM mutation + change event).
- See `02-filled-form.png` for the populated form, `03-results.html` for the empty-result page.
