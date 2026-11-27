# Contributing

The most useful contributions are new art directions, better audit checks, and bug reports with a public URL where capture or audit gets something wrong.

## Setup

```sh
git clone https://github.com/whosdrix/glowup
cd glowup
npm install
npx playwright-core install --only-shell chromium
npm test
```

Run the CLI from source with `npm run glowup -- capture https://example.com`. If you already have Chrome or Chromium, set `CHROMIUM_PATH` instead of downloading a browser.

The skill runs the bundled file in `skills/glowup/dist/`, not the TypeScript source. After changing anything in `src/`, run `npm run build` and commit the updated bundle. CI fails if the two are out of sync.

## Layout

| Path | What it is |
| --- | --- |
| `skills/glowup/SKILL.md` | The workflow the agent follows |
| `skills/glowup/references/` | Design rules, anti-patterns, the audit checklist and the direction recipes |
| `skills/glowup/templates/astro-base/` | The site the agent copies and restyles |
| `src/` | Source of the CLI: capture, audit, verify, compose |
| `tests/fixtures/sites/` | Small saved sites the tests run against |

## Adding an art direction

1. Copy one of the files in `skills/glowup/references/directions/` and keep the same headings.
2. Say which businesses it suits and which it does not. A direction that fits everything is not a direction.
3. Give real token values and font packages that exist on [Fontsource](https://fontsource.org).
4. Run a full redesign with it on at least two different sites and attach the `proof/before-after.png` images to the pull request.

## Changing the audit

Scores have to stay comparable between the before and after runs, so a new check needs a unit test in `tests/score.test.ts` and, if it reads the page, a case in the fixture sites. Keep each penalty capped so a single problem cannot sink a score on its own.

## Before opening a pull request

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`), because releases and the changelog are generated from them.
