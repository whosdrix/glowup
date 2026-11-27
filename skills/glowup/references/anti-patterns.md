# Anti-patterns

The look of a site nobody designed. Before showing the build to the user, go down this list against the screenshots. Each item has the fix.

## Never invent

This comes first because it is the one mistake that harms the client.

- [ ] **No invented facts.** Prices, opening hours, addresses, phone numbers, years in business, team names, qualifications, awards, service areas, guarantees: only what the capture contains, character for character.
- [ ] **No invented testimonials or reviews.** No "Sarah M., happy customer". If the source has no quotes, there is no testimonials section. Do not paraphrase a real review into something punchier.
- [ ] **No invented numbers.** No "500+ clients", "98% satisfaction", "24/7". A stats section exists only if the source states the numbers. Do not round up.
- [ ] **No invented offers or calls to action.** No "Free consultation", "Book online", "Get a quote in 60 seconds" unless the source offers exactly that. The action is what the business really supports: call, email, visit, or its real booking link.
- [ ] **No lorem ipsum, no placeholders.** No "Your tagline here", "Service one", `example.com`, `#` links. A missing piece of content means the section is removed.
- [ ] **No stock or generated images.** Only the client's own images from the capture.
- [ ] **No fake logos.** No "As seen in" or partner logo rows unless those logos were on the source site.
- [ ] **No form that goes nowhere.** A contact form needs a real endpoint. Otherwise use phone and email links.

When in doubt, leave it out and list it under "Not carried over" in the report.

## Colour and effects

- [ ] **Purple or indigo gradient as the default look.** Fix: derive the palette from the brand colour (`design-rules.md`). If the brand really is purple, use it flat with warm neutrals.
- [ ] **Any gradient between two hues** on backgrounds, buttons or text. Fix: one solid colour.
- [ ] **Gradient text.** Fix: solid `ink` or `accent-text`.
- [ ] **Giant blurred colour blobs** behind the hero. Fix: delete. Empty space is fine.
- [ ] **Glass cards**: translucent panels, backdrop blur, white borders at 10% opacity. Fix: solid `surface`, or a 1px `line` border.
- [ ] **Glow and neon shadows.** Fix: no shadow, or none at all in most directions.
- [ ] **Soft drop shadow on every card.** Fix: separate with space, a rule or a tone change.
- [ ] **Dark mode with neon accent as the default** for a business that is not a nightclub. Fix: light page, one dark band.
- [ ] **Grey text that is too light.** Fix: `ink-muted` at 4.5:1 or better. Never lower opacity to mute text.
- [ ] **Five accent colours**, one per card or icon. Fix: one accent.

## Layout

- [ ] **Everything centred.** Centred headline, centred paragraph, centred buttons, section after section. Fix: left-align on the grid; centring is for one short CTA.
- [ ] **Three identical cards in a row as the only idea**: icon, two-word title, one sentence, three times. Fix: use `services: list`, or make the cards carry different content (one with a photograph, real prices, real detail).
- [ ] **The same section structure repeated** down the page. Fix: alternate list, split, band, grid, quote.
- [ ] **A hero that says nothing**: huge vague headline, vague subline, two buttons, no image, no facts. Fix: say what the business does and where, show a real photograph, give the phone or hours.
- [ ] **Everything in a rounded card.** Fix: cards only for separate objects.
- [ ] **Uniform 50/50 splits.** Fix: 7/5 or 8/4.
- [ ] **A floating pill navbar** with blur. Fix: a plain header bar.
- [ ] **Sections padded so heavily** that each screen holds one sentence. Fix: use the `section` token as is; if a section is nearly empty, merge or remove it.
- [ ] **Wavy or slanted section dividers.** Fix: a straight edge or a rule.
- [ ] **Bento grid for content that is a list.** Fix: a list.

## Type

- [ ] **Inter (or the system font) for everything at one weight.** Fix: the direction's pairing, with a real display face.
- [ ] **Bold everywhere.** Fix: 400 for reading, 600 for emphasis, display weight for headings only.
- [ ] **Tiny all-caps grey labels above every heading** that repeat the heading ("ABOUT US" above "About us"). Fix: an eyebrow adds information (place, date, category) or is left out.
- [ ] **Text under 14px**, especially in footers and captions. Fix: `text-xs` is 14px and is the floor.
- [ ] **Paragraphs 100 characters wide.** Fix: `max-w-measure`.
- [ ] **Centred paragraphs longer than two lines.** Fix: left-align.
- [ ] **Title Case On Every Heading.** Fix: sentence case.

## Copy

- [ ] **Generic slogans**: "Unlock your potential", "Elevate your experience", "Where quality meets passion", "Your trusted partner", "Solutions tailored to your needs", "Welcome to our website". Fix: use the business's own words. If its own headline is weak, state the plain fact: what, for whom, where ("Bicycle repairs in Jesenice since 1998").
- [ ] **Empty adjectives**: seamless, cutting-edge, world-class, innovative, bespoke, passionate, premium. Fix: delete, or replace with the fact behind it.
- [ ] **Three-word feature triplets**: "Fast. Reliable. Affordable." Fix: delete unless the source says it.
- [ ] **Emoji as bullets, icons or decoration.** Fix: none. Lists use rules or numbers.
- [ ] **Exclamation marks** in headings and buttons. Fix: remove.
- [ ] **Buttons that say "Learn more", "Get started", "Discover"** and lead nowhere specific. Fix: name the destination ("See prices", "Call 01632 960417", "Opening hours").
- [ ] **Sparkle, rocket and lightning icons.** Fix: no icon. The template uses one arrow.
- [ ] **A decorative icon on every list item.** Fix: numbers or nothing.

## Fake life

- [ ] **Star ratings with no source.** Fix: only a rating the source site shows, with where it comes from.
- [ ] **Avatar circles with initials** for reviewers. Fix: name and context as text.
- [ ] **Animated counters, marquee logo strips, floating badges.** Fix: static text, or nothing.
- [ ] **Scroll-reveal on every element.** Fix: no entrance animation.
- [ ] **A newsletter signup** the business never had. Fix: remove.
- [ ] **Cookie banner for a site with no cookies.** Fix: none.

## Final test

Cover the logo and the business name on the screenshot. Could this page belong to any other business in the same trade? If yes, it is still generic: add the specific place, the real photographs, the owner's name, the actual prices, the real opening hours.
