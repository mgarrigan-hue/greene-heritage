# A1 — Thomas Greene × Bridget Clarke marriage

**Final query (succeeded after 1 DB-error retry):** type=marriage, firstname=Thomas, lastname=Greene, year 1915-1925, location "Co. Dublin"  *(--rel-* dropped — see notes)*
**Result:** 8 hits.

## 🎯 Top match — direct hit

**Marriage of BRIDGET CLARKE and THOMAS GREENE on 20 June 1922**
- District/Reg Area: **Rathdown** (south Co. Dublin)
- Group registration ID: **1271568SR**
- Drill-in: https://www.irishgenealogy.ie/view?record_id=cima-1271568

This is overwhelmingly likely the target marriage record. The register page should name BOTH fathers — including Bridget Clarke's father, the prize datum for the Greene Heritage tree.

## Other 7 results (for completeness; can be ignored)
| # | Record | Date | RD |
|---|--------|------|-----|
| 2 | Thomas Greene × Bridget McDonald | 1918-10-03 | Dublin South |
| 3 | Thomas Greene × Emily Conroy | 1917-03-10 | Dublin South |
| 4 | Thomas Kiernan × Margaret Greene | 1916-02-27 | Dublin South |
| 5 | Thomas Kilbride × Julia Greene | 1918-10-09 | Rathdown |
| 6 | Thomas O'Loughlin × Cecilia Greene | 1917-11-28 | Rathdown |
| 7 | Thomas **Green** × Mary Farrell | 1917-02-18 | Dublin North |
| 8 | Thomas **Green** × Emily Livingston | 1916-10-02 | Rathdown |

## Run notes
- Attempt 1 (with `--rel-type spouse --rel-first Bridget --rel-last Clarke`): **failed** — driver bug. The IG `#relation-first-0`/`#relation-last-0` inputs stay `disabled` until JS reacts to the event-checkbox + `#relation-0` selectOption combination. The driver does `selectOption({ label: "spouse" })` but the option's actual *label* is "Spouse (Marriage records only)" — only the *value* is "spouse". The driver does fall through to `selectOption("spouse")` (by value) but fills `#relation-first-0` immediately afterwards before the page's `change` handler removes the `disabled` attribute. **Driver fix needed:** wait for `await page.locator('#relation-first-0').waitFor({ state: 'editable' })` after selectOption.
- Attempt 2 (no `--rel-*`, plain Co. Dublin): **DB Error** — page title `<title>Database Error</title>`.
- Attempt 3 (after 180s backoff, same query): **success, 8 hits**.
