---
name: glowup
description: Redesign an existing website from its URL. Captures the live site (screenshots, content, brand colours, fonts, contact details), audits it with a score out of 100, proposes three art directions, rebuilds it as an Astro + Tailwind static site using only the real content, verifies the new site scores better on every check, and outputs a before/after proof image. Use when the user says "glowup", "redesign this site", "rebuild this website", "modernise this page" or gives a URL and asks for a better-looking version.
---

# glowup

You turn a live website into a redesigned static site, with numbers that show it got better. The scripts do the mechanical work so results are repeatable. You do the taste.

`SKILL_DIR` below means the directory this file is in. The CLI is `node SKILL_DIR/dist/glowup.mjs`. It needs Node 22 or newer. On first use it installs playwright-core and axe-core into `~/.cache/glowup` and finds a browser (installed Chrome is fine). If that fails, run `node SKILL_DIR/dist/glowup.mjs doctor` and show the user the error.

Everything for one site lives in `./glowup/<domain>/`. If that folder already exists, run `glowup status <url>` first and continue from the step it names instead of starting over.

## 1. Capture

```sh
node SKILL_DIR/dist/glowup.mjs capture <url>
```

Writes `capture/` with desktop and mobile screenshots of the home page and up to four linked pages, `content.md` (all text in reading order), `content.json`, `brand.json` (palette, accent, fonts, logo, contact details, opening hours, schema.org data) and `assets/` (the site's own images).

Read `content.md` and `brand.json`. Look at `capture/pages/home/desktop.png` and `mobile.png`. Do not read every full-page screenshot unless you need to.

## 2. Audit

```sh
node SKILL_DIR/dist/glowup.mjs audit <url>
```

Writes `audit.json` and `audit.md`: a score out of 100 and the exact problems (contrast failures with selectors, smallest text, line length, tap targets, missing alt text, sideways scrolling, layout shift, page weight). Then read `references/audit-checklist.md` and note what the script cannot see: weak hierarchy, cluttered sections, a buried call to action, outdated photos.

Tell the user the score and the three or four problems that matter most, in plain words.

## 3. Directions (stop and ask)

Read `references/design-rules.md`, `references/anti-patterns.md` and `references/directions/README.md`. Pick the three recipes in `references/directions/` that fit this business best and write a short brief for each, in the format the README describes. Keep the brand recognisable: start from the captured accent colour and logo, and fix them only where contrast or legibility demands it.

Present the three briefs and ask the user to pick one, mix two, or say "surprise me" (then choose the one you think fits best and say why in one sentence). Save the chosen brief to `glowup/<domain>/direction.md`.

Skip the question only when the user already said which direction they want or asked you not to stop.

## 4. Build

```sh
cp -R SKILL_DIR/templates/astro-base glowup/<domain>/site
cd glowup/<domain>/site && npm install
```

1. Fill `src/content/site.json` from `content.md` and `brand.json`, replacing the example business completely. The schema is in `src/content/README.md`. Copy the photos you use from `capture/assets/` into `src/assets/images/` (they are optimised at build), delete the example images, and give every image a real alt text. The logo goes in `public/`.
2. Apply the direction as `references/directions/README.md` describes: the recipe's blocks go into `src/styles/tokens.css`, `src/styles/fonts.css` and `src/lib/fonts.ts`, and its font packages get installed. Keep the font preloads, or font swap shows up as layout shift in verify.
3. Choose section types and variants in `site.json` so the page follows the direction's layout notes. Edit the section components only when the direction needs something they cannot do. Rewrite structure, not facts.

Rules that are not negotiable:

- Use only the site's real content. Tighten wording, fix typos, shorten rambling paragraphs and turn walls of text into lists, but never invent services, prices, numbers, reviews, awards, team members or history. If a section would need invented content, leave it out.
- Keep the language of the original site.
- No lorem ipsum, no placeholder images, no stock photos. If the site has no usable photos, design without them.
- Follow `references/anti-patterns.md`. The result must not look like a generic AI-built landing page.

Then `npm run build`.

## 5. Verify

```sh
node SKILL_DIR/dist/glowup.mjs verify <url>
```

Serves `site/dist`, screenshots it, runs the same audit and compares. It fails if the score is under 90, if anything got worse than the original, or if there are any contrast errors, images without alt, tap targets under 24px, sideways scrolling, missing viewport meta, more or fewer than one h1, or lines over 80 characters. Each failure names the page and selector.

Fix every failure in the site, rebuild, and run verify again until it passes. Then look at `after/pages/home/desktop.png` and `mobile.png` yourself and check them against the direction and `references/audit-checklist.md`. Passing the numbers is the minimum, not the goal.

## 6. Proof

Verify writes `proof/before-after.png` (desktop and mobile, old and new, with the score and the biggest improvements) and `proof/delta.md`. To re-render the image without auditing again, run `glowup compose <url>`.

Finish with a short summary for the user:

- the score change and the three biggest fixes, from `proof/delta.md`
- the path to `proof/before-after.png`
- how to preview the site: `cd glowup/<domain>/site && npm run dev`
- anything you left out on purpose and why (for example a section that needed invented content)

## Options

- `--pages <n>` captures and audits up to n pages, home included (default 5, max 10)
- `--root <dir>` changes where site folders live (default `./glowup`)
- `--min-score <n>` changes the score verify requires (default 90)
- `--dist <dir>` verifies a site built somewhere else
