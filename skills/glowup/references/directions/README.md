# Directions

Six art direction recipes. Each is a complete, distinct look: a palette recipe, a type pairing, token values, section variants and a list of things to avoid.

| File              | In a sentence                                                     | Typical fit                                                 |
| ----------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `editorial.md`    | Serif headlines, thin rules, square corners, white paper.         | Professional services, architects, restaurants with a story |
| `bold-minimal.md` | Heavy condensed capitals, black and white, one loud colour.       | Gyms, barbers, workshops, trades, venues                    |
| `warm-local.md`   | Soft serif, cream, earthy accent, rounded photographs.            | Cafés, shops, studios, family practices                     |
| `crisp-tech.md`   | Tight neutral sans, cool white, mono labels, small radii.         | IT, B2B, accountants, engineering, modern clinics           |
| `quiet-luxury.md` | Fine display serif, ivory, wide spacing, small tracked capitals.  | Salons, spas, jewellers, boutique hotels, fine dining       |
| `playful.md`      | Chunky grotesque, tinted background, bright accent, fat outlines. | Children, pets, treats, family leisure, community           |

Read only the files for the directions you are going to pitch.

## Choosing three

After capture and audit you know the kind of business, its brand colour, how much copy it has and how good its photographs are. Pick three directions that could each honestly work, and that differ from each other.

- One is the safe fit: the direction whose "When it fits" list names this kind of business.
- One is a stretch in a useful way: it changes the register (a plumber shown as `editorial`, a dentist as `warm-local`).
- The third differs from both in type and density. Never pitch two serif directions with the same mood, or two sans directions.
- Rule out any direction whose "Skip it" conditions apply. Poor photographs rule out `quiet-luxury`. Long headlines rule out `bold-minimal`. Almost no copy rules out `editorial`.
- Do not blend directions. Mixing the fonts of one with the corners of another gives the generic result this skill exists to avoid.

Common sets:

| Business                            | Pitch                                |
| ----------------------------------- | ------------------------------------ |
| Café, bakery, florist, craft shop   | warm-local, editorial, playful       |
| Restaurant, winery, guesthouse      | editorial, warm-local, quiet-luxury  |
| Salon, spa, clinic for aesthetics   | quiet-luxury, warm-local, editorial  |
| Trades, garage, builder             | bold-minimal, warm-local, crisp-tech |
| Gym, barber, studio, venue          | bold-minimal, playful, editorial     |
| IT, agency, accountant, engineering | crisp-tech, editorial, bold-minimal  |
| Lawyer, architect, consultant       | editorial, crisp-tech, quiet-luxury  |
| Nursery, pets, family leisure       | playful, warm-local, bold-minimal    |
| Dentist, optician, physiotherapist  | warm-local, crisp-tech, editorial    |

## The brief

Write each direction as a short brief the user can judge without seeing a mock-up. Use the real brand colour and real content from the capture, not the example values from the recipe. Keep each under 120 words.

```markdown
### B. Bold minimal

**Feel:** A gig poster for a bike workshop. Black, white and your orange.
**Palette:** white `#ffffff`, ink `#0b0b0b`, your orange `#f26a1b` for buttons and one word in the headline (with black text on it, since white fails contrast).
**Type:** Archivo, condensed and heavy for headlines, regular for text.
**Layout:** Type-only opening with "REPAIRS, SERVICING, CUSTOM BUILDS", your three numbers underneath, then the price list as full-width rows.
**Uses from your site:** the workshop photo as a wide band, the price table, the two Google reviews.
**Trade-off:** Loud. Your longer "about" text gets cut to a few lines.
```

Rules for the pitch:

- Label them A, B, C. Put your recommendation first and say in one sentence why.
- State the palette as hex values derived from this brand, with the contrast fix if one was needed.
- "Layout" names what the first screen shows, using the client's own words and pictures.
- "Trade-off" is honest: what this direction costs or leaves out.
- No adjectives doing the selling. Describe what the user will see.
- Then stop and ask the user to pick A, B or C, or "surprise me". On "surprise me", build the recommended one.

Save the chosen brief, the final token values and their contrast ratios to `direction.md` in the site's folder.

## Applying a direction

Work in the copied template (`./glowup/<domain>/site`).

1. **Fonts.** Run the recipe's `npm install` line and uninstall the default font packages if they are no longer used. Replace `src/styles/fonts.css` and `src/lib/fonts.ts` with the recipe's blocks. If the site's language needs characters beyond basic Latin, add the matching `latin-ext` file to the preload list.
2. **Colours.** Do not paste the example hex values. Follow the recipe's palette steps and "Deriving the palette from the brand" in `design-rules.md`, starting from this brand's colour. Write the eight roles into `@theme` in `src/styles/tokens.css`, then the three tone blocks.
3. **Other tokens.** Replace the remaining declarations the recipe lists: font families, scale steps, spacing, measure, radii, and the knobs in `:root`. Leave everything the recipe does not mention.
4. **Check contrast** for every pair in every tone before building anything else.
5. **Content and variants.** Fill `src/content/site.json` from the capture. Choose section variants and tones from the recipe's layout table, leaving out sections the content cannot support.
6. **Details.** Go through the recipe's "Details that make it" and apply each one that the content allows. Then read its "Avoid" list against the result.
7. **Identity.** Replace `public/favicon.svg` with the client's favicon or a mark in the accent colour, and set `meta.themeColor`.
8. **Build and verify.** `npm install && npm run build`, then the verify step. Re-measure line length after any font change and adjust `--container-measure`.

Changing components is allowed when a recipe detail needs it (a border instead of a fill, a different gap). Keep such edits small, keep using the role colours, and never hard-code a colour, a font size or copy in a component.

## Adding a direction

A new recipe needs the same parts as the existing six, and it must be different in kind from all of them: a different type classification or a different relationship between colour and space, not a recolour. Build the template with its tokens and run the audit before proposing it.
