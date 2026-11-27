# Crisp tech

Precise and calm. A neutral sans set tight, cool white, a single confident blue or green, small radii, monospace labels. It should look engineered, not decorated.

## When it fits

- Businesses selling expertise or software: IT support, managed services, web and app studios, accountants and bookkeepers, engineering and surveying firms, labs, logistics, B2B suppliers, modern clinics and opticians.
- Sites with feature lists, process steps, specifications, FAQs.
- Brands with a clean primary: blue, teal, green, or a neutral brand with one signal colour.

Skip it for hospitality, crafts, beauty and anything that sells atmosphere.

## Palette

Cool neutrals and one colour.

1. `bg` is white with a trace of the brand hue (1 to 2% saturation). `surface` is a light cool grey. `line` is a visible but quiet grey-blue.
2. `ink` is a very dark navy or green-black taken from the brand hue, not `#000`.
3. `accent` is the brand colour. It must take white text at 4.5:1. Typical tech blues need darkening by 5 to 10 points of lightness to get there.
4. If the brand colour is purple or indigo, keep it, but use it flat. No gradient, no glow, no violet-to-pink anything. Pair it with a warm grey `surface` so the page does not go lilac.
5. The ink tone is the dark navy, used for the footer and at most one band.

Example for a blue brand colour (`#1257e0`).

## Type

`npm install @fontsource-variable/geist @fontsource-variable/geist-mono`, and remove the two default font packages.

Geist for everything, with Geist Mono for eyebrows only. The mono labels are the texture; do not use mono anywhere else.

```css
/* src/styles/fonts.css */
@import "@fontsource-variable/geist/wght.css";
@import "@fontsource-variable/geist-mono/wght.css";
```

```ts
// src/lib/fonts.ts
import geist from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url'
import mono from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url'

export const preloadFonts = [geist, mono]
```

## Tokens

Replace the matching declarations in `src/styles/tokens.css`. Anything not listed keeps the template value.

```css
@theme {
  --color-bg: #fbfcfe;
  --color-surface: #f0f3f8;
  --color-ink: #0d1626;
  --color-ink-muted: #4a586e;
  --color-accent: #1257e0;
  --color-accent-text: #1151d1;
  --color-accent-ink: #ffffff;
  --color-line: #d3dbe7;

  --font-display: 'Geist Variable', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'Geist Variable', ui-sans-serif, system-ui, sans-serif;

  --text-base: 1rem;
  --text-base--line-height: 1.65;
  --text-lg: 1.1875rem;
  --text-lg--line-height: 1.5;
  --text-xl: 1.4375rem;
  --text-xl--line-height: 1.25;
  --text-2xl: clamp(1.625rem, 1.45rem + 0.8vw, 1.875rem);
  --text-2xl--line-height: 1.15;
  --text-3xl: clamp(1.875rem, 1.5rem + 1.7vw, 2.75rem);
  --text-3xl--line-height: 1.08;
  --text-4xl: clamp(2.25rem, 1.6rem + 2.8vw, 3.5rem);
  --text-4xl--line-height: 1.04;
  --text-5xl: clamp(2.5rem, 1.5rem + 4.4vw, 4.75rem);
  --text-5xl--line-height: 1;

  --container-measure: 32rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}

:root {
  --display-weight: 600;
  --display-tracking: -0.035em;
  --display-em-style: normal;

  --eyebrow-font: 'Geist Mono Variable', ui-monospace, monospace;
  --eyebrow-weight: 500;
  --eyebrow-tracking: 0.04em;

  --button-radius: var(--radius-md);
  --button-weight: 550;
  --image-radius: var(--radius-lg);
}

.tone-surface {
  --color-bg: #f0f3f8;
  --color-surface: #fbfcfe;
  --color-line: #c8d2e0;
}

.tone-ink {
  --color-bg: #0d1626;
  --color-surface: #18243a;
  --color-ink: #f3f6fb;
  --color-ink-muted: #a9b6ca;
  --color-accent: #8ab4ff;
  --color-accent-text: #8ab4ff;
  --color-accent-ink: #0d1626;
  --color-line: #2d3b56;
}

.tone-accent {
  --color-bg: #1257e0;
  --color-surface: #0f4bc4;
  --color-ink: #ffffff;
  --color-ink-muted: #ffffff;
  --color-accent: #ffffff;
  --color-accent-text: #ffffff;
  --color-accent-ink: #0d1626;
  --color-line: #6593f2;
}
```

Body text is 16px here, so the eyebrow floor of 14px is close to it. Keep eyebrows short.

## Layout

| Section      | Variant                                                                              | Note                                                                                          |
| ------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| hero         | `split` with a real screenshot or photograph, else `plain`                           | Say what the firm does and for whom in one sentence.                                          |
| stats        | under the hero, `tone="surface"`                                                     | Only measured numbers from the source: years, clients, response time.                         |
| services     | `cards`                                                                              | Vary the content, not just the title: give the first card an image, the others a `meta` line. |
| about        | `image-right`                                                                        |                                                                                               |
| testimonials | `columns`                                                                            | Name, role and company exactly as the source gives them.                                      |
| faq          | `accordion`                                                                          |                                                                                               |
| contact      | `split` with `form` if the source site had a working form endpoint, else `showHours` |                                                                                               |
| cta          | `split`, `tone="ink"`                                                                | The dark band, not the blue one, keeps the page from turning into a banner.                   |

## Details that make it

- Eyebrows in mono, uppercase, with a number where order matters: "01 / SERVICES".
- A 1px `line` border on cards instead of a fill: add `border border-line bg-bg` in place of `bg-surface` on the card when the page has a lot of grey already.
- Align everything to the 12-column grid. In this direction a 6px misalignment shows.
- Mark one word of the hero with `*asterisks*`: it takes the accent colour, upright.
- Real screenshots, diagrams or team photographs from the source. If the source only has stock handshake photographs, use `hero: plain` and no images.

## Avoid

- Purple-to-blue gradients, glowing blobs, glass panels, grid-dot backgrounds, floating browser mock-ups you made up.
- Three identical cards with an icon, a two-word title and a sentence. If the services have nothing to distinguish them, use `services: list`.
- "Solutions", "seamless", "empower", "next-generation". Say what is actually done.
- Dark mode as the default. One dark band is enough.
