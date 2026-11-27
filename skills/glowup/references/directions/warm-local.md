# Warm local

The shop you walk past and want to go into. Soft serif headlines, cream paper, an earthy accent, rounded photographs, plain friendly sentences. This is the direction the template ships in.

## When it fits

- Places people visit in person: cafés, bakeries, florists, bookshops, potteries, yoga studios, vets, family dentists, guesthouses, farm shops, hairdressers, independent garages with a loyal clientele.
- Sites where opening hours, address and a phone number matter as much as anything else.
- Brands with a natural or food-like colour: terracotta, olive, mustard, sage, plum-brown, sea blue.

Skip it for firms selling to other businesses, for anything clinical or technical, and for brands whose colour is neon or pure primary.

## Palette

Cream, a dark green-black or brown-black, and one earthy colour.

1. `bg` is a warm cream. Take the brand hue, drop saturation to about 30%, raise lightness to about 93%. `surface` is one step darker and a little more saturated.
2. `ink` is never neutral black. Tint it toward the complement of the accent (a rust accent gets a green-black ink).
3. `accent` is the brand colour. Earth colours usually pass with cream text; if the brand is a light sage or mustard, darken it to about 40% lightness for `accent` and keep the lighter original for nothing at all. Do not introduce it as a second colour.
4. `accent-text` is the accent one notch darker, for the numbered labels and the italic phrase.
5. The ink tone is a deep version of the ink hue, not black.
6. Rhythm of tones down the page: plain, plain, `surface`, plain, plain, `ink`, plain, `surface`, `accent`, then the footer.

Example for a rust brand colour (`#b5462a`). These are the values already in `tokens.css`.

## Type

`npm install @fontsource-variable/fraunces @fontsource-variable/instrument-sans` (already in the template).

Fraunces at a light weight is soft without being cute, and its italic is the best thing about it. Instrument Sans is warm and slightly narrow, good for hours tables and addresses.

```css
/* src/styles/fonts.css */
@import "@fontsource-variable/fraunces/opsz.css";
@import "@fontsource-variable/fraunces/opsz-italic.css";
@import "@fontsource-variable/instrument-sans/wght.css";
```

```ts
// src/lib/fonts.ts
import display from '@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2?url'
import displayItalic from '@fontsource-variable/fraunces/files/fraunces-latin-opsz-italic.woff2?url'
import body from '@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url'

export const preloadFonts = [display, displayItalic, body]
```

## Tokens

```css
@theme {
  --color-bg: #f5efe6;
  --color-surface: #ebe2d3;
  --color-ink: #1d2624;
  --color-ink-muted: #505a56;
  --color-accent: #b5462a;
  --color-accent-text: #a23c22;
  --color-accent-ink: #f5efe6;
  --color-line: #d3c7b3;

  --font-display: 'Fraunces Variable', 'Iowan Old Style', Georgia, serif;
  --font-body: 'Instrument Sans Variable', ui-sans-serif, system-ui, sans-serif;

  --container-measure: 31rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1.25rem;
}

:root {
  --display-weight: 380;
  --display-tracking: -0.022em;
  --display-em-style: italic;

  --eyebrow-weight: 600;
  --eyebrow-tracking: 0.09em;

  --button-radius: var(--radius-full);
  --button-weight: 600;
  --image-radius: var(--radius-lg);
}

.tone-surface {
  --color-bg: #ebe2d3;
  --color-surface: #f5efe6;
  --color-line: #cdbfa8;
}

.tone-ink {
  --color-bg: #1d2b28;
  --color-surface: #283935;
  --color-ink: #f5efe6;
  --color-ink-muted: #b7c2bb;
  --color-accent: #eba888;
  --color-accent-text: #eba888;
  --color-accent-ink: #1d2624;
  --color-line: #40524c;
}

.tone-accent {
  --color-bg: #b5462a;
  --color-surface: #a23c22;
  --color-ink: #f5efe6;
  --color-ink-muted: #f5efe6;
  --color-accent: #f5efe6;
  --color-accent-text: #f5efe6;
  --color-accent-ink: #1d2624;
  --color-line: #cf7a62;
}
```

## Layout

| Section      | Variant                                      | Note                                                                                       |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| hero         | `split`                                      | Use `facts` for hours, street and phone. A local visitor wants those before anything else. |
| services     | `list`                                       | With prices if the source gives them.                                                      |
| about        | `image-left`, `tone="surface"`               | With `imageSecondary` if there is a good detail shot. Sign off with the owner's name.      |
| gallery      | `mosaic`                                     | Five photographs.                                                                          |
| testimonials | `feature`, `tone="ink"`                      |                                                                                            |
| faq          | `accordion`                                  |                                                                                            |
| contact      | `split`, `showHours: true`, `tone="surface"` | Put the access or parking note in `contact.note`.                                          |
| cta          | `split`, `tone="accent"`                     |                                                                                            |

## Details that make it

- The eyebrow above the hero says where the business is, in the business's own words ("On Quay Lane since 2011").
- One italic phrase in the hero, in the accent. Usually the place or the thing made.
- Names. "Nell opened the studio in 2011" is warmer than any adjective. Use the people the source site names.
- The hours table is real content here. Check it against the capture twice.
- Photographs keep their natural colour. No filters, no overlays.

## Avoid

- Handwriting or script fonts, kraft-paper textures, hand-drawn doodles, leaf icons. The warmth comes from colour, type and plain words.
- More than one earthy colour. Terracotta plus sage plus mustard is a mood board, not a palette.
- "Welcome to" as a headline, and "family" or "passion" unless the source says so.
- Turning every block into a rounded card. Rounded corners are for photographs and the hours panel.
