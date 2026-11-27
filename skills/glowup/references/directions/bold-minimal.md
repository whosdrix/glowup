# Bold minimal

A poster. Heavy condensed capitals, black and white, one loud colour, hard edges. Few elements, each one big.

## When it fits

- Businesses with energy or muscle: gyms, climbing walls, barbers, tattoo studios, bike and car workshops, builders, scaffolders, removals, event venues, breweries, streetwear.
- Sites with short copy. This direction is at its best with ten-word headlines and two-line paragraphs.
- Brands with one saturated colour (red, orange, yellow, electric blue, green).

Skip it for anything that needs to feel gentle or discreet (care homes, therapists, funeral directors, nurseries), and for sites whose headings are long sentences: thirty words in heavy capitals is unreadable.

## Palette

White, black, one colour at full strength.

1. `bg` is pure white. `surface` is a neutral light grey with no tint. `ink` is near-black.
2. `accent` is the brand colour, as saturated as the brand uses it. Check white on it. If that fails 4.5:1, set `accent-ink` to near-black instead of weakening the colour.
3. `accent-text` is the accent darkened until it passes 4.5:1 on white and on `surface`. For yellow and lime brands this will be far from the accent; in that case set `accent-text` to `ink` and let the accent appear only as fills.
4. `line` is the ink colour. Rules are black, not grey.
5. Alternate white sections with one `tone="ink"` block and one `tone="accent"` block. No `tone="surface"`: grey bands soften the contrast this direction lives on.

Example for a signal red brand colour (`#d92211`).

## Type

`npm install @fontsource-variable/archivo`, and remove the two default font packages.

One family. Archivo has a width axis: the display style squeezes it to 75% and sets it at weight 800 in capitals; body copy uses the normal width at 400.

```css
/* src/styles/fonts.css */
@import '@fontsource-variable/archivo/standard.css';
```

```ts
// src/lib/fonts.ts
import archivo from '@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2?url'

export const preloadFonts = [archivo]
```

## Tokens

Replace the matching declarations in `src/styles/tokens.css`. Anything not listed keeps the template value.

```css
@theme {
  --color-bg: #ffffff;
  --color-surface: #f0f0ed;
  --color-ink: #0b0b0b;
  --color-ink-muted: #4f4f4a;
  --color-accent: #d92211;
  --color-accent-text: #c41d0e;
  --color-accent-ink: #ffffff;
  --color-line: #0b0b0b;

  --font-display: 'Archivo Variable', 'Arial Narrow', Impact, sans-serif;
  --font-body: 'Archivo Variable', ui-sans-serif, system-ui, sans-serif;

  --text-xl: 1.75rem;
  --text-xl--line-height: 1.1;
  --text-2xl: clamp(2rem, 1.6rem + 1.8vw, 2.75rem);
  --text-2xl--line-height: 1.02;
  --text-3xl: clamp(2.25rem, 1.5rem + 3.2vw, 3.75rem);
  --text-3xl--line-height: 0.95;
  --text-4xl: clamp(3rem, 1.4rem + 6.8vw, 6.5rem);
  --text-4xl--line-height: 0.92;
  --text-5xl: clamp(3.5rem, 0.9rem + 11vw, 9.5rem);
  --text-5xl--line-height: 0.88;

  --container-measure: 31rem;

  --radius-sm: 0;
  --radius-md: 0;
  --radius-lg: 0;
}

:root {
  --display-weight: 800;
  --display-stretch: 75%;
  --display-tracking: -0.01em;
  --display-transform: uppercase;
  --display-em-style: normal;

  --eyebrow-weight: 700;
  --eyebrow-tracking: 0.08em;

  --button-radius: 0;
  --button-weight: 700;
  --button-tracking: 0.06em;
  --button-transform: uppercase;
  --image-radius: 0;
  --rule-weight: 2px;
}

.tone-surface {
  --color-bg: #f0f0ed;
  --color-surface: #ffffff;
}

.tone-ink {
  --color-bg: #0b0b0b;
  --color-surface: #1c1c1c;
  --color-ink: #ffffff;
  --color-ink-muted: #b9b9b2;
  --color-accent: #ff5a47;
  --color-accent-text: #ff6a58;
  --color-accent-ink: #0b0b0b;
  --color-line: #ffffff;
}

.tone-accent {
  --color-bg: #d92211;
  --color-surface: #b81b0c;
  --color-ink: #ffffff;
  --color-ink-muted: #ffffff;
  --color-accent: #ffffff;
  --color-accent-text: #ffffff;
  --color-accent-ink: #0b0b0b;
  --color-line: #ffffff;
}
```

## Layout

| Section | Variant | Note |
| --- | --- | --- |
| hero | `plain`, or `stacked` with one strong wide photograph | Headline of 3 to 7 words. Cut the source headline down if it is longer; move the rest to the lede. |
| stats | directly under the hero, if the source has real numbers | The big numerals are the point of this direction. |
| services | `list` | Capitals on the titles, prices hard right. |
| gallery | `mosaic` | Square corners, 4px gaps would also suit: set `gap-1` if the photographs are strong. |
| testimonials | `columns`, `tone="ink"` | |
| faq | `accordion` | |
| cta | `stacked`, `tone="accent"` | The one place centring is right: a short shout and a button. |

Five or six sections on the home page. If there are more, something is not earning its place.

## Details that make it

- Mark one word in the hero with `*asterisks*`: it turns the accent colour, upright. One word, not a phrase.
- Black 1px rules the full width of the container between rows. They are the only decoration.
- Photographs: high contrast, cropped tight. Consider converting weak colour photographs to greyscale with `filter: grayscale(1) contrast(1.1)` on the `Picture` wrapper so the accent stays the only colour on the page.
- Phone numbers and prices in the display style, large.
- Eyebrows are short labels: "SERVICES", "FIND US". No sentences.

## Avoid

- Capitals on anything longer than a heading. Body copy and FAQ answers stay sentence case at normal width.
- A second colour, tints of the accent, gradients, shadows, rounded anything.
- Condensed type below 20px. The 75% width is for display sizes only.
- Long hero headlines. If it wraps past four lines on a phone, it is too long.
