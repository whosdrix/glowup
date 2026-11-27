# site.json

Every word and image on the site comes from `site.json`. Components hold layout only.
Fill this file from the captured content, then pick section variants. Do not write copy into components.

The example describes a fictional pottery so the template builds and looks finished. Replace all of it.

## Top level

| Field | Type | Notes |
| --- | --- | --- |
| `meta` | object | Document head. |
| `business` | object | Name and logo. |
| `nav` | `{label, href}[]` | Main navigation, also listed in the footer. Keep it to five items or fewer. |
| `cta` | `{label, href}` | Optional. The one button in the header. |
| `contact` | object | Phone, email, address. Used by Contact, Footer and the JSON-LD block. |
| `hours` | `{label, value}[]` | Opening hours as free text rows, e.g. `{"label": "Monday to Friday", "value": "9:00 to 17:00"}`. Empty array if the site lists none. |
| `hoursNote` | string | Optional line under the hours table. |
| `socials` | `{label, href}[]` | Shown as text links in the footer. |
| `images` | object | Image registry. Sections refer to images by key. |
| `home` | `{sections}` | Sections of the home page, top to bottom. |
| `pages` | object[] | Extra pages, one per entry, served at `/<slug>/`. |
| `footer` | object | `blurb`, `links` (`{label, href}[]`, e.g. privacy), `note` (short line after the copyright). |
| `labels` | object | Every fixed interface word. Translate these when the site is not in English. |

### meta

| Field | Notes |
| --- | --- |
| `lang` | BCP 47 tag for `<html lang>`, e.g. `en-GB`, `cs`. |
| `url` | Production origin with no trailing slash. Used for canonical and og:image URLs. |
| `title` | Home page `<title>`. Other pages use `<page title> | <business name>`. |
| `description` | Home page meta description, 120 to 160 characters. |
| `ogImage` | Optional image key. Cropped to 1200x630 for sharing. |
| `themeColor` | Optional. Usually the `bg` token. |

### business

| Field | Notes |
| --- | --- |
| `name` | Shown as a wordmark in the header and footer when there is no logo. |
| `tagline` | Optional. Not rendered by default; kept for the agent's reference. |
| `logo` | Optional `{src, alt, width, height}`. `src` is a path under `public/`, e.g. `/logo.svg`. |

### contact

| Field | Notes |
| --- | --- |
| `phone` | As the business writes it. The `tel:` link is derived from it. |
| `email` | Rendered as a `mailto:` link. |
| `address` | Array of lines. |
| `mapUrl` | Optional link to a map. The site embeds no map. |
| `note` | Optional practical note: parking, access, how to find the door. |

### images

```json
"images": {
  "workshop": { "src": "workshop.jpg", "alt": "Two mechanics at a bench", "caption": "The bench", "focus": "50% 30%" }
}
```

| Field | Notes |
| --- | --- |
| `src` | A file name in `src/assets/images/`. These are resized and converted at build time and get their width and height automatically. A value starting with `/` or `http` is used untouched and then needs `width` and `height`. |
| `alt` | Required. Describe what is in the picture. Use `""` only for pure decoration. |
| `caption` | Optional. Shown by the `grid` gallery. |
| `focus` | Optional CSS `object-position`, default `50% 50%`. Set it when a crop cuts off a face or the subject. |
| `width`, `height` | Only for images that are not in `src/assets/images/`. |

### pages

| Field | Notes |
| --- | --- |
| `slug` | URL segment, lower case, no slashes. |
| `title` | The page's h1 and `<title>`. May mark one phrase with `*asterisks*` for emphasis. |
| `description` | Meta description. |
| `eyebrow`, `intro` | Optional. Shown in the page header. |
| `sections` | Same shapes as `home.sections`. |

A page that opens with a `hero` section takes its h1 from the hero. Any other page gets a page header with the h1. Either way there is exactly one h1.

### labels

`skip`, `menu`, `home`, `breadcrumb`, `footerNav`, `contact`, `details`, `phone`, `email`, `address`, `hours`, `directions`, `send`, `notFound`.

## Sections

Each entry in a `sections` array has a `type` and its own fields. These fields work on every type:

| Field | Notes |
| --- | --- |
| `type` | One of the types below. |
| `variant` | Layout variant. The first one listed is the default. |
| `tone` | Optional: `surface`, `ink` or `accent`. Recolours the whole section from `tokens.css`. Do not put two sections of the same tone next to each other. |
| `id` | Optional anchor id. |
| `eyebrow`, `heading`, `intro` | Optional small label, h2 and lead paragraph. |

Headings may mark one phrase with `*asterisks*`; it is set in italic accent. Use it once per page at most.

| Type | Variants | Fields |
| --- | --- | --- |
| `hero` | `split`, `stacked`, `plain` | `heading` (required), `lede`, `image` (key), `caption`, `actions`, `facts` (`{label, value, href?}[]`, three at most) |
| `services` | `list`, `cards` | `items` (`{title, text?, meta?, detail?, href?, image?}[]`), `link` (`{label, href}`). In `cards`, an image on the first item makes that card two columns wide, so use 5 or 8 items to fill the three-column rows. |
| `about` | `image-left`, `image-right`, `text` | `body` (string[], one per paragraph), `image`, `imageSecondary`, `points` (`{title, text}[]`), `signoff`, `link` |
| `gallery` | `mosaic`, `grid` | `images` (keys). `mosaic` reads best with 3 or 5 images. |
| `testimonials` | `feature`, `columns` | `items` (`{quote, name, detail?}[]`) |
| `stats` | none | `items` (`{value, label}[]`, two to four) |
| `hours` | none | `image`. Rows come from the top-level `hours`. |
| `contact` | `split`, `simple` | `image`, `showHours` (boolean), `form` (`{action, fields: {name, label, type?, required?}[]}`). Details come from the top-level `contact`. |
| `faq` | `accordion`, `open` | `items` (`{q, a}[]`) |
| `cta` | `split`, `stacked` | `heading` (required), `text`, `actions`. Defaults to the `accent` tone. |
| `prose` | none | `blocks`: `{kind, text?, level?, items?, rows?, image?}[]` where `kind` is `heading`, `paragraph`, `list`, `quote`, `image` or `table`. For legal pages and long copy. |

`actions` is `{label, href, style?}[]`. `style` is `primary`, `secondary` or `link`. Without it the first action is a primary button and the rest are text links. Two actions at most.

The header and footer are not sections. They are on every page and read `business`, `nav`, `cta`, `contact`, `hours`, `socials` and `footer`.

## Rules for content

- Only what the source site says. No invented prices, reviews, statistics, team members or opening hours. If the capture has no testimonials, there is no testimonials section.
- `meta` and `detail` on a service are for facts the source states (a price, a duration). Leave them out otherwise.
- A contact form is rendered only when `form.action` points at a real endpoint. Without one, phone and email links do the job.
- Every image needs alt text. If the source had none, write it from what the picture shows.
