# Greene Heritage Research Tools

Playwright-based scripts that automate searches against IrishGenealogy.ie civil registers and the Arolsen WWII archives, producing screenshots, raw HTML, parsed JSON, and human-readable summaries under `research-results/`.

## Setup

- Run from the repository root in PowerShell.
- Install dependencies with `npm install`.
- Requires Microsoft Edge. `maintained/lib.mjs` launches Playwright Chromium with `channel: 'msedge'`.
- If Edge is not available to Playwright yet, run `npx playwright install msedge` once.
- These scripts use live third-party sites. Be polite with repeat runs and avoid high-volume scraping.

## Folder structure

- `maintained/` — actively used scripts: `ig-civil.mjs`, `ig-register.mjs`, `arolsen.mjs`, `lib.mjs`.
- `probes/` — exploratory one-shots used to discover selectors/API behavior.
- `archive/` — preserved one-time scripts. `integrate-phase10-2026-04.mjs` is audit history only.
- Root shims: `ig-civil.mjs` and `arolsen.mjs` preserve package-script compatibility and import the maintained implementations.

## Legal and usage notes

IrishGenealogy.ie gates civil register searches/images behind a Section 61 declaration. The maintained IG scripts fail closed unless you pass `--your-firstname=...` and `--your-surname=...`; use the legal name of the person running the search. Do not automate those fields with defaults or someone else's identity.

## Maintained scripts

### `maintained/ig-civil.mjs`

- Purpose: search IrishGenealogy.ie civil/church search forms and capture result lists.
- Prerequisites: setup above, Microsoft Edge, Playwright, network access to IrishGenealogy.ie.
- Command:

```powershell
node tools\research\maintained\ig-civil.mjs --slug=r2-bridget-birth-1891 --type=birth --firstname=Bridget --lastname=Clarke --year-from=1888 --year-to=1893 --location=Meath --your-firstname=YOUR_FIRST_NAME --your-surname=YOUR_SURNAME --headed=false
```

- Args: `--slug`, `--type` (`birth|marriage|death|baptism|burial`), `--firstname`, `--lastname`, `--year-from`, `--year-to`, `--location`, optional relation args (`--rel-type`, `--rel-first`, `--rel-last`), required Section 61 args, `--headed`, `--hold`.
- Output path: `research-results/<slug>/` with `01-search-form.*`, `02-filled-form.*`, `03-results.*`, `results.json`, optional `results.tsv`, and optional `04-final-state.*`.
- Known fragilities: IrishGenealogy.ie selectors, cookie banner IDs, AJAX result timing, CAPTCHA/manual checks, and relation fields can change.
- Legal/usage notes: Section 61 name args are mandatory and must identify the real declarant.

### `maintained/ig-register.mjs`

- Purpose: open a specific IrishGenealogy.ie record detail page, pass the Section 61 gate, and capture metadata/register images.
- Prerequisites: setup above, a valid `record_id`, Microsoft Edge, Playwright.
- Command:

```powershell
node tools\research\maintained\ig-register.mjs --record-id=cima-1271568 --slug=r1-tg-bc-marriage-1922 --your-firstname=YOUR_FIRST_NAME --your-surname=YOUR_SURNAME --headed=false
```

- Args: `--record-id`, `--slug`, required Section 61 args, `--headed`, `--hold`.
- Output path: `research-results/<slug>/` with detail HTML/PNG, `metadata.json`, `summary.md`, register screenshot HTML/PNG, and best-effort `register.pdf`, `register.jpg`, or `register.tif`.
- Known fragilities: record ID prefixes vary, image links can be PDF/JPG/TIF, image viewer pages may open in a new tab, and the Section 61 form can appear more than once.
- Legal/usage notes: Section 61 name args are mandatory and must identify the real declarant.

### `maintained/arolsen.mjs`

- Purpose: search Arolsen Archives online collections, capture API responses, scrape rendered results, and summarize filtered candidates.
- Prerequisites: setup above, Microsoft Edge, Playwright, network access to Arolsen.
- Command:

```powershell
node tools\research\maintained\arolsen.mjs --slug=a4-harris-elizabeth --surname=Harris --forename=Elizabeth --keyword=Biberach --headed=false --hold=0
```

- Args: `--slug`, `--surname`, `--forename`, `--keyword`, optional `--year-from`, `--year-to`, `--headed`, `--hold`.
- Output path: `research-results/<slug>/` with page screenshots/HTML, `results.json`, and `findings.md`.
- Known fragilities: Angular Material DOM, column-filter overlays, slow API responses, pagination, and freetext search behavior may change.
- Legal/usage notes: respect Arolsen terms/disclaimer; no Section 61 declaration is involved.

### `maintained/lib.mjs`

- Purpose: shared Playwright launch, output-directory, page-save, text-save, timestamp, and logging helpers.
- Prerequisites: Playwright and Microsoft Edge.
- Command: not run directly.
- Args: helper functions accept slug/label/page values from callers.
- Output path: centralizes writes under `research-results/<slug>/`.
- Known fragilities: assumes `channel: 'msedge'` and repo-relative layout from `tools\research\maintained\`.
- Legal/usage notes: none by itself; callers own site-specific legal gates.

## Probes and archive

### `probes/arolsen-run-all.mjs`

- Purpose: one-shot batch runner for five historical Arolsen searches.
- Command: `node tools\research\probes\arolsen-run-all.mjs`
- Args: hard-coded query set; no CLI query args.
- Output path: each query writes to `research-results/<slug>/`.
- Known fragilities: specific to old Phase A4 searches and live Arolsen behavior.
- Legal/usage notes: exploratory; review before reuse.

### `probes/probe-arolsen.mjs`, `probes/probe-arolsen-filter.mjs`, `probes/probe-ig.mjs`, `probes/probe-network.mjs`

- Purpose: selector/API discovery probes for Arolsen and IrishGenealogy.ie.
- Command: `node tools\research\probes\SCRIPT_NAME.mjs`
- Args: mostly hard-coded; edit a copy if exploring a new target.
- Output path: probe folders such as `research-results/probe-arolsen/` or `research-results/probe/`.
- Known fragilities: intentionally brittle because they document site behavior at the time of discovery.
- Legal/usage notes: use sparingly; IG probes may still encounter Section 61/cookie gates.

### `archive/integrate-phase10-2026-04.mjs`

- Purpose: preserved one-time Phase 10 integration script for audit history.
- Command: do not run as a maintained tool.
- Args: none supported safely.
- Output path: originally mutated `data/family.json` directly.
- Known fragilities: not idempotent, no dry-run, no backup mode, and may duplicate data if reused.
- Legal/usage notes: copy forward only after manual review and add dry-run/backup safeguards first.

## Sample successful output

Existing example: `research-results/r1-tg-bc-marriage-1922/`.

- `metadata.json` — 710 bytes; extracted key/value record metadata.
- `register-p1.png` — 1,607,931 bytes; captured register image page.
- `register.pdf` — 250,104 bytes; downloaded register scan.
- `summary.md` — 766 bytes; human-readable record summary.

Current maintained scripts may also create `01-detail.html`, `01-detail.png`, `02-register-image.html`, `02-register-image.png`, `results.json`, `results.tsv`, or `findings.md` depending on the workflow.

## Reproducibility notes

These tools depend on live third-party DOMs and private API responses. Selectors, cookie banners, form IDs, result timing, and legal gates may need updates when source sites change. Treat screenshots, raw HTML, and JSON as evidence artefacts and keep the command/args in notes when making research claims.

## Output contract and data integration

All research artefacts should land under `research-results/<slug>/`. Use stable, descriptive slugs such as `r1-tg-bc-marriage-1922`; page captures use numbered labels like `01-search-form`, `02-filled-form`, and `03-results`, while parsed outputs use `results.json`, `metadata.json`, `summary.md`, or `findings.md`. Do not edit `data/family.json` directly from raw scrape output. Manually review artefacts first, then use a dedicated integration script that supports `--dry-run` and `--backup` before writing family data.

