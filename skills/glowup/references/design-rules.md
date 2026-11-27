# Design rules

Rules for building the new site from `templates/astro-base`. They are constraints, not suggestions. When a rule and a direction recipe disagree, the recipe wins on style (fonts, colours, radii) and this file wins on legibility and accessibility.

Where things live in the template:

| File                                       | What it controls                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `src/content/site.json`                    | All copy, images, section order and variants. Schema in `src/content/README.md`. |
| `src/styles/tokens.css`                    | Colour roles, type scale, spacing, radii, measure, style knobs, tones.           |
| `src/styles/fonts.css`, `src/lib/fonts.ts` | Font imports and the preload list.                                               |
| `src/components/sections/*.astro`          | Layout. Edit these only when a variant cannot do what the direction needs.       |

Change tokens and variants first. Reach into components last, and never write copy or colours into them.

## Type

- Two families: one for display, one for body. A monospace for eyebrow labels is the only allowed third. The audit penalises more than three.
- Body text is 16px or 17px. Nothing anywhere is under 14px: not captions, not footers, not legal lines. `--text-xs` is the floor; do not add a smaller step.
- The scale is modular. Ratio 1.2 for dense, technical directions; 1.25 as the default; up to 1.333 between the top steps for display-led directions. Use the nine steps in `tokens.css` and no arbitrary sizes in between.
- The top three steps are fluid with `clamp()`. The minimum has to fit a 390px phone: a hero headline must not exceed four lines there.
- Line height falls as size rises: 1.6 for body, 1.45 for lead paragraphs, 1.15 to 1.25 for mid headings, 0.95 to 1.05 for the hero.
- Tracking: display sizes are set slightly tight (-0.01em to -0.035em). Uppercase labels are set loose (0.05em to 0.2em). Body text is never tracked.
- Weight carries hierarchy before size does. Body 400, emphasis 600. Do not use 300 for body text; it fails on cheap screens.
- Headings are sentence case unless the direction says capitals. No full stop at the end of a heading unless it is a full sentence in the hero.
- Hero headline: 4 to 10 words. If the source headline is longer, the first clause is the headline and the rest becomes the lede. Do not rewrite its meaning.
- One emphasised phrase per page at most (`*asterisks*` in a heading).
- Numbers in tables, prices and hours use tabular figures. The components already do this.

## Measure

Paragraphs run 45 to 75 characters per line, 65 as the target. The audit fails pages above 80.

Do not set this with `65ch`. `1ch` is the width of the digit zero, and in most text faces zero is about 1.4 times as wide as an average letter. In the template's body font `65ch` produces lines of about 95 characters.

- `--container-measure` is set in `rem`. The right value is roughly `65 x 0.47 x body size`: about `31rem` at 17px, `30rem` at 16px.
- After changing the body font or size, build, run the audit and read `lineLength`. It averages in the short last line of each paragraph, so it reads a little low: aim for 55 to 70 and never above 75.
- Every paragraph, list item and FAQ answer sits inside `max-w-measure` or a narrower column. Lead paragraphs at `text-lg` use the same cap and come out shorter, which is correct.
- Never fix a long line by shrinking the text.

## Spacing

- Everything sits on a 4px grid (Tailwind's spacing scale).
- Three named gaps make the vertical rhythm, and sections use only these:
  - `section`: padding above and below a full section.
  - `block`: between a section's heading and its content, and the padding of thin bands (stats, CTA).
  - `gutter`: page side padding.
- Inside a group, space is small; between groups, clearly larger. Heading to its paragraph: 16 to 24px. Paragraph to the next block: 40px or more. If two gaps look the same, the grouping is unclear.
- Do not hand-tune padding per section. If a section feels cramped, the fix is less content in it.
- The content container is 80rem wide at most. Text never touches the screen edge: the gutter is at least 20px.

## Colour

Components use eight roles and nothing else:

| Role          | Use                                    | Contrast needed                                                  |
| ------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `bg`          | Page background                        |                                                                  |
| `surface`     | Cards, panels, alternate bands         |                                                                  |
| `ink`         | Text                                   | 7:1 on `bg` and `surface` (4.5:1 is enough inside `tone-accent`) |
| `ink-muted`   | Secondary text, captions               | 4.5:1 on `bg` and `surface`                                      |
| `accent`      | Button fills, underlines, the CTA band | 3:1 on `bg`, unless buttons are outlined                         |
| `accent-text` | Accent-coloured text and small marks   | 4.5:1 on `bg` and `surface`                                      |
| `accent-ink`  | Text on `accent`                       | 4.5:1 on `accent`                                                |
| `line`        | Rules and borders                      | visible on `bg`; about 1.3:1 or more                             |

Limits:

- One accent hue. Neutrals are tinted, never pure grey unless the direction is black and white.
- No gradients between hues. No opacity tricks for text colour: muted text is its own solid colour, checked for contrast.
- A page ends up with five to seven distinct text colours across all tones. The audit penalises more than ten.
- Tones (`surface`, `ink`, `accent`) recolour a whole section by remapping the same roles. Each tone in `tokens.css` must meet the same contrast table on its own. Do not set colours on individual elements.

### Deriving the palette from the brand

Start from `capture/` (logo, colour samples, theme colour). The examples in the direction files are examples; compute the real values.

1. **Find the brand colour.** It is the most saturated colour in the logo, or the colour the old site used for buttons and links. If the logo has two, take the one covering more area as the accent and drop the other. If the brand is black and white only, take a restrained colour from the business's own photographs (their door, their van, their product) and say so in the direction brief.
2. **Keep its hue.** Never swap a brand hue for one you like better. If the brand is purple, the accent is purple, used flat.
3. **Fix its contrast by moving lightness only.** Convert to OKLCH or HSL. For `accent`, test `accent-ink` (white or the page background colour) on it. If the ratio is under 4.5:1, lower lightness in steps of 2 points until it passes. If you would have to darken it beyond recognition (yellow, lime, sky blue, pale pink), stop: keep the brand colour as the fill and make `accent-ink` near-black instead.
4. **Derive `accent-text`.** Same hue, darkened until it reaches 4.5:1 on both `bg` and `surface`. For light brand colours this is far darker than the accent; if it no longer reads as the same colour, set `accent-text` to `ink` and let the accent appear as fills and underlines only.
5. **Build the neutrals from the same family.** `bg` and `surface` take a trace of the brand hue or its warm or cool neighbour, as the direction recipe says. `ink` is a very dark tint, not `#000`.
6. **Build the tones.** `tone-ink` uses the ink colour as background and a lightened accent (about 75% lightness) so it passes on dark. `tone-accent` uses the accent as background with whichever text colour passed in step 3.
7. **Check every pair in the table above, in every tone.** Write the ratios into `direction.md`. Then let the audit confirm.

## Hierarchy

- One `h1` per page. The template guarantees it if pages go through `site.json`; do not add headings by hand.
- Heading levels go in order: `h1`, then `h2` per section, `h3` inside. Do not pick a level for its size.
- One primary button per screen. A second action is a text link. Three buttons in a row means nothing is primary.
- Three levels of text are enough: heading, body, muted. If you need a fourth, the content needs restructuring.
- Squint at the screenshot. The first thing you see should be the headline, the second the primary action or the main photograph. If it is a decoration, remove the decoration.
- The first screen answers: who is this, what do they do, where, and how do I contact them.

## Layout

- A 12-column grid. Prefer uneven splits: 7/5, 8/4, 5/7. Avoid 6/6 and 4/4/4 as the page's default.
- Text aligns left. Centred text is allowed in one place per page: a short stacked CTA.
- No two neighbouring sections share the same structure. Alternate: split with image, list, band, grid, quote.
- No two neighbouring sections share the same tone, and `ink` and `accent` tones are used once or twice per page each.
- Five to nine sections on the home page. Cut a section before shrinking all of them.
- Cards are for things that are actually separate objects (a service you can book, a product). Do not wrap ordinary paragraphs in cards.

## Imagery

Use the client's own photographs from `capture/`. They are the only thing on the page nobody else has.

- Never add stock photographs or generated images, and never use an image the capture did not find on the client's site.
- Rank the captured images: sharp, well lit, shows the real place, people or product. Use the best three to eight. Leave out the rest, including sliders full of near-duplicates, clip art and old banner graphics with text baked in.
- Do not upscale. An image is shown no wider than its pixel width. Under 800px wide: half a column at most. Under 400px: do not use it, except a logo.
- Put files in `src/assets/images/` so the build resizes them, converts them to WebP and writes width and height.
- Crops the template applies: hero `split` 4:5 (square on phones), hero `stacked` 21:9 (4:3 on phones), about 4:5, gallery `grid` 4:5, gallery `mosaic` cells of mixed shape, service card 4:3. Pick the image for the slot: a wide landscape in a 4:5 slot loses two thirds of itself.
- Set `focus` in `site.json` whenever a crop cuts a face, a sign or the product. Look at every crop at both screen sizes.
- No text on top of photographs, no colour overlays, no blur. The direction may ask for greyscale; nothing else.
- Logos: use the SVG if the site has one, otherwise the largest raster. Do not recolour, redraw or crop a logo. If it only works on a light background, do not place it on a dark tone. Without a usable logo, the business name is set in the display face.
- Every image has alt text that says what is in it. Keep the client's alt text if it is real; write it if it is missing or says "image1".
- No usable photographs at all: use hero `plain`, drop the gallery, and let type carry the page. Do not fill the gap.

## Mobile

Design the 390px view on purpose; do not just let the grid collapse.

- No horizontal scroll at 390px. Usual causes: a long word or email address in a heading, a table, a fixed-width image, negative margins.
- Tap targets: 44px tall for buttons, navigation links, phone and email links, FAQ rows and footer links. 24px is the absolute minimum for anything, and the audit counts every target below it. Links inside a sentence are exempt.
- Body text stays 16px or more. Headings scale down through `clamp()`; check the hero is at most four lines.
- Stacking order follows meaning: headline, lede, action, then image. Contact details come before a decorative photograph.
- The phone number is a `tel:` link and the first screen has a way to call or find the address.
- Tables with more than two columns scroll inside their own container or become stacked rows.
- The menu button works by keyboard and the navigation works with JavaScript off (the template's does).

## Motion

Default: almost none.

- Allowed: colour and underline transitions on hover and focus (120 to 200ms), the FAQ open mark, a small arrow nudge on links.
- Not allowed: scroll-triggered reveals, parallax, autoplaying carousels, animated counters, typewriter text, cursor effects, page-load animations, smooth-scroll hijacking.
- If the brief truly calls for one entrance effect, animate opacity and transform only, under 400ms, once, and the content must be fully visible with JavaScript off and before the animation runs. Screenshots and the audit must not catch a half-faded page.
- `prefers-reduced-motion` is honoured globally in `global.css`. Keep it.

## Content

- Only captured content. See `anti-patterns.md` for the list of things that must never be invented.
- Edit for length and order, not for meaning. Cutting a rambling paragraph to its two factual sentences is fine. Adding a claim is not.
- Keep the site's language. Set `meta.lang`, translate `labels`, and use that language's punctuation and number formats.
- Keep every page the old site had that carries real information, including legal pages. Use `prose` sections for them.

## What the verify step measures

| Check                               | Pass                               |
| ----------------------------------- | ---------------------------------- |
| Contrast (axe, WCAG AA)             | 0 failures                         |
| Other axe rules (WCAG 2.1 A and AA) | 0 failures                         |
| Images without alt                  | 0                                  |
| Smallest text on mobile             | 14px or more                       |
| Line length                         | 80 characters or fewer; aim for 65 |
| Tap targets under 24px              | 0                                  |
| Horizontal overflow at 390px        | none                               |
| Viewport meta                       | present                            |
| Layout shift                        | under 0.1                          |
| Page weight                         | under 1.5 MB per page              |
| Font families                       | 3 or fewer                         |
| Text colours                        | 10 or fewer                        |
| h1 count                            | exactly 1                          |

The template passes all of these as shipped. If a number gets worse after your changes, the change is wrong, not the audit.
