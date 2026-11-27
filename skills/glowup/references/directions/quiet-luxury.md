# Quiet luxury

Expensive because of what is left out. A fine high-contrast serif at large sizes, ivory paper, generous empty space, small widely spaced capitals, square photographs with nothing on top of them.

## When it fits

- Businesses selling a high-price, high-trust experience: hair and beauty salons, spas, aesthetic clinics, jewellers, tailors, florists for weddings, interior designers, boutique hotels, fine dining, estate agents at the top of the market, private practices.
- Sites with strong photography. This direction has almost no decoration, so weak pictures have nowhere to hide.
- Brands with a deep or muted colour: bronze, forest, navy, burgundy, taupe, black.

Skip it when the photographs are poor, when the offer is about price or speed, and for trades.

## Palette

Ivory, warm black, one deep colour used sparingly.

1. `bg` is ivory or stone, warm, around 95% lightness. `surface` is a slightly deeper stone.
2. `ink` is a warm black. `ink-muted` is a warm grey-brown; check it on `surface`, it fails easily.
3. `accent` is the brand colour deepened until it is nearly as dark as the ink: at least 6:1 on `bg`. A bright brand gold becomes bronze; a bright pink becomes a deep rose-brown. Buttons should look calm, not highlighted.
4. No `tone="accent"` bands. Use `tone="surface"` for gentle shifts and `tone="ink"` once.
5. Metallic colours are flat. No gold gradients, no foil effects.

Example for a bronze brand colour (`#9a7b4f`, deepened to `#6b5433`).

## Type

`npm install @fontsource-variable/cormorant-garamond @fontsource-variable/hanken-grotesk`, and remove the two default font packages.

Cormorant Garamond is drawn for display sizes: delicate, tall, sharp. It runs small, so the scale below is larger than the template's. Hanken Grotesk is a plain, even sans for everything under 24px.

```css
/* src/styles/fonts.css */
@import "@fontsource-variable/cormorant-garamond/wght.css";
@import "@fontsource-variable/cormorant-garamond/wght-italic.css";
@import "@fontsource-variable/hanken-grotesk/wght.css";
```

```ts
// src/lib/fonts.ts
import display from '@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2?url'
import displayItalic from '@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-italic.woff2?url'
import body from '@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2?url'

export const preloadFonts = [display, displayItalic, body]
```

## Tokens

Replace the matching declarations in `src/styles/tokens.css`. Anything not listed keeps the template value.

```css
@theme {
  --color-bg: #f6f2ea;
  --color-surface: #ece6da;
  --color-ink: #24211d;
  --color-ink-muted: #5c554b;
  --color-accent: #6b5433;
  --color-accent-text: #6b5433;
  --color-accent-ink: #f6f2ea;
  --color-line: #d4cbbb;

  --font-display: 'Cormorant Garamond Variable', 'Cormorant Garamond', Garamond, Georgia, serif;
  --font-body: 'Hanken Grotesk Variable', ui-sans-serif, system-ui, sans-serif;

  --text-xl: 1.875rem;
  --text-xl--line-height: 1.2;
  --text-2xl: clamp(2rem, 1.7rem + 1.4vw, 2.5rem);
  --text-2xl--line-height: 1.12;
  --text-3xl: clamp(2.5rem, 1.8rem + 2.9vw, 4rem);
  --text-3xl--line-height: 1.04;
  --text-4xl: clamp(3rem, 1.9rem + 4.6vw, 5.5rem);
  --text-4xl--line-height: 1;
  --text-5xl: clamp(3.25rem, 1.5rem + 7.4vw, 7.5rem);
  --text-5xl--line-height: 0.95;

  --spacing-section: clamp(5.5rem, 12vw, 11rem);
  --spacing-block: clamp(3rem, 6vw, 5.5rem);

  --container-measure: 31rem;

  --radius-sm: 0;
  --radius-md: 0;
  --radius-lg: 0;
}

:root {
  --display-weight: 400;
  --display-tracking: -0.012em;
  --display-em-style: italic;

  --eyebrow-weight: 500;
  --eyebrow-tracking: 0.22em;

  --button-radius: 0;
  --button-weight: 500;
  --button-tracking: 0.14em;
  --button-transform: uppercase;
  --image-radius: 0;
}

.tone-surface {
  --color-bg: #ece6da;
  --color-surface: #f6f2ea;
  --color-line: #c9bfad;
}

.tone-ink {
  --color-bg: #24211d;
  --color-surface: #322e28;
  --color-ink: #f6f2ea;
  --color-ink-muted: #bcb4a6;
  --color-accent: #d3b98f;
  --color-accent-text: #d3b98f;
  --color-accent-ink: #24211d;
  --color-line: #4b453c;
}

.tone-accent {
  --color-bg: #6b5433;
  --color-surface: #5c482b;
  --color-ink: #f6f2ea;
  --color-ink-muted: #f6f2ea;
  --color-accent: #f6f2ea;
  --color-accent-text: #f6f2ea;
  --color-accent-ink: #24211d;
  --color-line: #94805f;
}
```

## Layout

| Section      | Variant                     | Note                                                                                             |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------ |
| hero         | `stacked`                   | A short headline, then the best photograph at full width. No `facts` strip; it is too busy here. |
| about        | `image-right`               | One paragraph and a sign-off. Cut `points`.                                                      |
| services     | `list`                      | Names and prices only where the source lists them. A menu, not a pitch.                          |
| gallery      | `grid`                      | Six photographs, portrait crops, captions optional.                                              |
| testimonials | `feature`, `tone="ink"`     | One quote.                                                                                       |
| contact      | `split` with a photograph   |                                                                                                  |
| cta          | `stacked`, `tone="surface"` | Centred, short, one button.                                                                      |

Leave out `stats` and `faq` on the home page; put FAQs on their own page if the source has them. Fewer sections, more space.

## Details that make it

- Headings are short. Three to six words, sentence case, one italic word at most.
- Eyebrows are tiny wide-spaced capitals: "TREATMENTS", "THE SALON". They need the 0.22em tracking to work.
- Buttons are small capitals in a square box. Prefer `style: "secondary"` (outlined) for everything except the one booking action.
- Photographs are never rounded, tinted or overlapped. Give them room: a wide image should be the only thing on screen.
- Prices as plain numerals with the currency, right-aligned. No "from only".

## Avoid

- Gold gradients, marble textures, script fonts, drop caps, ornaments, sparkle icons.
- Cormorant below 24px or in bold. It turns spindly small and clumsy heavy.
- Filling the space. If the page feels empty, that is the direction working; do not add a section.
- Exclamation marks, "luxury", "exclusive", "bespoke" unless the source uses them, and then once.
