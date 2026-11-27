# Playful

Friendly and a bit loud. Chunky rounded grotesque headlines, a sunny tinted background, a bright accent with dark text on it, fat outlines, big radii. Confident, not childish.

## When it fits

- Businesses for children, families, pets and treats: nurseries, soft play, swim schools, dog groomers, ice cream and doughnut shops, toy and game shops, party venues, trampoline parks, indie cafés, craft workshops, youth clubs, community groups.
- Sites with short, upbeat copy and colourful photographs.
- Brands with a bright colour: yellow, coral, orange, sky blue, grass green, pink.

Skip it for anything involving money, health, law or grief, and for any brand whose customers are other businesses.

## Palette

A tinted background, a deep ink, and a bright accent that carries dark text.

1. `bg` is a pale tint of a warm hue (cream, peach, pale yellow), never white. `surface` is the same hue, clearly stronger.
2. `ink` is a deep saturated dark (bottle green, navy, aubergine-brown), not black.
3. `accent` is the brand colour at full brightness. Do not darken it to take white text. Set `accent-ink` to a near-black instead: dark text on a bright button is the look.
4. `accent-text` is the accent darkened until it passes 4.5:1 on `bg` and `surface`. It will be noticeably deeper than the accent; that is expected.
5. A second bright colour is allowed in one place only: as the `accent` inside `tone-ink`. A coral brand gets yellow buttons on the dark band.
6. `tone="accent"` uses dark ink on the bright accent, not white.

Example for a coral brand colour (`#ff6b4a`).

## Type

`npm install @fontsource-variable/bricolage-grotesque @fontsource-variable/dm-sans`, and remove the two default font packages.

Bricolage Grotesque at heavy weights has odd, lively shapes that read as hand-made without being a novelty font. DM Sans is round and easy for body copy.

```css
/* src/styles/fonts.css */
@import "@fontsource-variable/bricolage-grotesque/wght.css";
@import "@fontsource-variable/dm-sans/wght.css";
```

```ts
// src/lib/fonts.ts
import display from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url'
import body from '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url'

export const preloadFonts = [display, body]
```

## Tokens

Replace the matching declarations in `src/styles/tokens.css`. Anything not listed keeps the template value.

```css
@theme {
  --color-bg: #fff6e8;
  --color-surface: #ffe6c2;
  --color-ink: #12302e;
  --color-ink-muted: #3f5957;
  --color-accent: #ff6b4a;
  --color-accent-text: #b5361a;
  --color-accent-ink: #1f120d;
  --color-line: #e6c99b;

  --font-display: 'Bricolage Grotesque Variable', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'DM Sans Variable', ui-sans-serif, system-ui, sans-serif;

  --text-3xl: clamp(2.125rem, 1.5rem + 2.6vw, 3.5rem);
  --text-3xl--line-height: 1.04;
  --text-4xl: clamp(2.5rem, 1.5rem + 4.4vw, 4.75rem);
  --text-4xl--line-height: 1;
  --text-5xl: clamp(2.75rem, 1.3rem + 6.2vw, 6rem);
  --text-5xl--line-height: 0.96;

  --container-measure: 31rem;

  --radius-sm: 0.5rem;
  --radius-md: 1rem;
  --radius-lg: 2rem;
}

:root {
  --display-weight: 750;
  --display-tracking: -0.035em;
  --display-em-style: normal;

  --eyebrow-weight: 700;
  --eyebrow-tracking: 0.05em;

  --button-radius: var(--radius-full);
  --button-weight: 700;
  --button-border: currentColor;
  --button-shadow: 0 4px 0;
  --image-radius: var(--radius-lg);
  --rule-weight: 2px;
}

.tone-surface {
  --color-bg: #ffe6c2;
  --color-surface: #fff6e8;
  --color-line: #dcb980;
}

.tone-ink {
  --color-bg: #12302e;
  --color-surface: #1d4441;
  --color-ink: #fff6e8;
  --color-ink-muted: #bcd2c9;
  --color-accent: #ffc94d;
  --color-accent-text: #ffc94d;
  --color-accent-ink: #12302e;
  --color-line: #33605b;
}

.tone-accent {
  --color-bg: #ff6b4a;
  --color-surface: #ff8a6e;
  --color-ink: #1f120d;
  --color-ink-muted: #1f120d;
  --color-accent: #1f120d;
  --color-accent-text: #1f120d;
  --color-accent-ink: #fff6e8;
  --color-line: #b5361a;
}
```

`--button-shadow: 0 4px 0` has no colour on purpose: it takes the button's text colour, which gives the hard offset edge.

## Layout

| Section      | Variant                         | Note                                                                         |
| ------------ | ------------------------------- | ---------------------------------------------------------------------------- |
| hero         | `split`                         | The photograph gets the 2rem radius. Use `facts` for opening days and phone. |
| services     | `cards`                         | First card with a photograph. Prices in `meta` if the source has them.       |
| gallery      | `mosaic`                        | Bright photographs, five of them.                                            |
| about        | `image-right`, `tone="surface"` |                                                                              |
| testimonials | `columns`, `tone="ink"`         | Parents and customers in their own words, from the source.                   |
| faq          | `accordion`                     |                                                                              |
| cta          | `stacked`, `tone="accent"`      | Dark text on the bright band.                                                |

## Details that make it

- Mark one word of the hero with `*asterisks*`: it takes the deeper accent, upright.
- The primary button has a 2px outline and a hard 4px shadow below it. It is the one "sticker" element; do not add the effect to cards.
- Photographs with big rounded corners. If the source has cut-out or illustrated artwork (a mascot, a logo character), use it once, large.
- Copy stays plain. The typeface is already cheerful; the words do not need to be.
- Alternate `plain` and `surface` sections so the page has stripes of colour.

## Avoid

- Emoji, confetti, random floating shapes, wavy section dividers, rotated cards, Comic-style fonts.
- More than two bright colours. Coral, yellow, blue and green together is a toy catalogue.
- White text on the bright accent. It fails contrast for coral, orange and yellow every time.
- Exclamation marks in every heading. One on the page, if any.
- Baby talk. Parents are the readers.
