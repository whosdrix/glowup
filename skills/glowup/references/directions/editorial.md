# Editorial

Reads like a well-set magazine page. Serif headlines, thin rules, square corners, a lot of white paper. The writing and the photographs do the work.

## When it fits

- Businesses that sell judgement or a story: law firms, architects, consultants, financial advisers, private clinics, publishers, galleries, vineyards, restaurants with a history.
- Sites with real paragraphs of copy and at least a few good photographs.
- Brands whose colour is dark or muted (oxblood, navy, forest, charcoal).

Skip it when the site is mostly a price list and a phone number, when there is under 150 words of copy in total, or when the brand is loud and young.

## Palette

Paper, ink, and one colour.

1. `bg` is an off-white with a trace of warmth. Never pure white. `surface` is the same hue, 4 to 6 points darker.
2. `ink` is near-black with a slight cool or warm cast to match the brand colour.
3. `accent` is the brand colour. If it is lighter than about 45% lightness, darken it until white text on it reaches 4.5:1, keeping the hue.
4. The accent appears in very few places: the hero rule, link underlines, one button, the CTA band. The italic phrase in the hero takes it too; that is the one flourish.
5. Use `tone="ink"` once, for testimonials or the CTA band. Use `tone="accent"` once at most.

Example for an oxblood brand colour (`#8c1c2b`).

## Type

`npm install @fontsource-variable/newsreader @fontsource-variable/public-sans`, and remove the two default font packages.

Newsreader has an optical size axis, so the same family is sharp at 96px and steady at 20px. Public Sans is a quiet grotesque that stays out of its way.

```css
/* src/styles/fonts.css */
@import "@fontsource-variable/newsreader/opsz.css";
@import "@fontsource-variable/newsreader/opsz-italic.css";
@import "@fontsource-variable/public-sans/wght.css";
```

```ts
// src/lib/fonts.ts
import display from '@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2?url'
import displayItalic from '@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2?url'
import body from '@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2?url'

export const preloadFonts = [display, displayItalic, body]
```

## Tokens

Replace the matching declarations in `src/styles/tokens.css`. Anything not listed keeps the template value.

```css
@theme {
  --color-bg: #faf8f3;
  --color-surface: #f0ece3;
  --color-ink: #17181c;
  --color-ink-muted: #53565e;
  --color-accent: #8c1c2b;
  --color-accent-text: #8c1c2b;
  --color-accent-ink: #faf8f3;
  --color-line: #d6d0c3;

  --font-display: 'Newsreader Variable', 'Iowan Old Style', Georgia, serif;
  --font-body: 'Public Sans Variable', ui-sans-serif, system-ui, sans-serif;

  --text-4xl: clamp(2.625rem, 1.6rem + 4.4vw, 4.75rem);
  --text-4xl--line-height: 1;
  --text-5xl: clamp(2.875rem, 1.3rem + 6.6vw, 6.5rem);
  --text-5xl--line-height: 0.96;

  --container-measure: 32rem;

  --radius-sm: 0;
  --radius-md: 0;
  --radius-lg: 0;
}

:root {
  --display-weight: 400;
  --display-tracking: -0.02em;
  --display-em-style: italic;

  --eyebrow-weight: 600;
  --eyebrow-tracking: 0.12em;

  --button-radius: 0;
  --button-weight: 600;
  --image-radius: 0;
}

.tone-surface {
  --color-bg: #f0ece3;
  --color-surface: #faf8f3;
  --color-line: #ccc5b6;
}

.tone-ink {
  --color-bg: #17181c;
  --color-surface: #24262c;
  --color-ink: #faf8f3;
  --color-ink-muted: #b6b8bf;
  --color-accent: #eba4ad;
  --color-accent-text: #eba4ad;
  --color-accent-ink: #17181c;
  --color-line: #3b3e46;
}

.tone-accent {
  --color-bg: #8c1c2b;
  --color-surface: #781523;
  --color-ink: #faf8f3;
  --color-ink-muted: #faf8f3;
  --color-accent: #faf8f3;
  --color-accent-text: #faf8f3;
  --color-accent-ink: #17181c;
  --color-line: #b25c68;
}
```

## Layout

| Section      | Variant                                               | Note                                                      |
| ------------ | ----------------------------------------------------- | --------------------------------------------------------- |
| hero         | `stacked`, or `plain` if no photograph is good enough | Headline of 6 to 10 words with one italic phrase.         |
| about        | `text`                                                | Long copy in a column, heading in the margin.             |
| services     | `list`                                                | The numbered rows read as a contents page.                |
| gallery      | `grid`                                                | Captions on. A caption is what makes a picture editorial. |
| testimonials | `feature`, `tone="ink"`                               | One long quote, large.                                    |
| faq          | `open`                                                | Answers visible, like a Q&A column.                       |
| cta          | `split`                                               | Plain statement, one button.                              |

Order sections so text-heavy and image-heavy blocks alternate. Leave `stats` out unless the numbers are the story.

## Details that make it

- A figure caption under every large image, even a short one.
- Dates, places and names in the eyebrow lines ("Est. 1987, Brno"), taken from the source.
- Numerals in tables and prices use `tabular-nums` (already on).
- Headings are sentence case and end without a full stop, except a hero written as a sentence.
- Rules are 1px. If a section feels empty, add a rule and space, not a box.

## Avoid

- Rounded corners, pills, shadows, coloured section backgrounds beyond the one ink band.
- Centred headings. Everything hangs from the left edge.
- Serif body text at 16px on a phone. The serif is for display sizes; the sans carries the reading.
- Icons. This direction has none.
