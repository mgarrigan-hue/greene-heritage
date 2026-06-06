# Greene Family Heritage

Personal family heritage site for the Greene line: Portarlington → Dublin → Channel Islands → New Zealand and beyond.

## 🌐 Live site
- **URL:** https://greene.garrigan.me/
- Hosted with **GitHub Pages** from this repository.

## 📊 Current data snapshot
- **People:** 38
- **Couples:** 12
- **Parent-child links:** 40
- **Timeline events:** 26
- **Last data update:** 2026-04-19

## 🧱 Architecture
- Static HTML/CSS/JavaScript — no build step required.
- Single source of truth: `data/family.json`.
- Pages render people, relationships, timeline entries, sources, and search from that data file.

## 🧪 Local workflow
- Preview locally: `npm run serve`
- Validate data: `npm run validate:data`
- Check external links: `npm run check:links`
- Smoke-test pages: `npm run check:pages`

## 🔎 Research workflow
- Maintained research automation lives under `tools/research/`.
- Workflow notes: `tools/research/README.md`.
- Keep raw/transient captures out of the main site unless they support a cited source.

## 🗓️ Phase changelog
- **Phase 1:** Site foundation, family-history framing, GitHub Pages setup.
- **Phase 2:** Core people directory, timeline, and tree views.
- **Phase 3:** Portarlington and Dublin place narratives.
- **Phase 4:** Elizabeth Harris / Biberach internment story.
- **Phase 5:** Sources, gallery, and research evidence pages.
- **Phase 6:** Data-driven rendering from `data/family.json`.
- **Phase 7:** Visual polish, theme/search/nav improvements.
- **Phase 8:** Playwright-assisted research tooling.
- **Phase 9:** 1926 Census and Dublin homes refresh.
- **Phase 10:** April 2026 record integrations: Thomas × Bridget, Bridget Clarke birth, Dollard household, Clarke siblings.
- **Phase 11:** Hardening pass: SEO files, 404 page, validation scripts, repo hygiene, and audit follow-ups.

## 🚀 Deployment
- GitHub Pages serves the site at `https://greene.garrigan.me/`.
- The repository should not need a build workflow; Pages can publish the static files directly.
- To re-add a custom domain later:
  1. Add a root `CNAME` file containing the domain.
  2. Configure the same domain in GitHub Pages settings.
  3. Add/verify DNS records with the domain provider.
  4. Update canonical/OG/sitemap URLs from the GitHub Pages URL to the custom domain.

## 📄 License
Personal family history project. Content is shared for family research and educational use.
