# Audit checklist: what to check by eye

The automated audit measures contrast, sizes, tap targets, overflow and weight. It cannot tell whether the page is true, clear or good-looking. After it passes, open the new screenshots at 1440x900 and 390x844 for every page, next to the captures of the old site, and go through this list. Fix what fails, rebuild, and run the audit again.

## 1. Is it true

Compare against `capture/`, not against memory.

- [ ] Business name spelled and capitalised exactly as on the old site.
- [ ] Phone number, email, street address and postcode match character for character, everywhere they appear (hero facts, contact, footer).
- [ ] Opening hours match, including closed days and notes about holidays.
- [ ] Every price, duration and number matches. None was added.
- [ ] Every testimonial is word for word from the source, with the same attribution.
- [ ] Names of people and their roles match.
- [ ] Nothing on the page is a claim the old site did not make.
- [ ] Nothing important was dropped: each old page with real information has a place in the new site, including legal pages, and each old navigation item leads somewhere.
- [ ] The language is the same as the source. `<html lang>` is right, interface labels are translated, quotation marks and number formats follow the language.

## 2. First screen

Look only at the top 900px on desktop and the top 844px on mobile.

- [ ] It says who this is, what they do and where.
- [ ] There is one obvious next step, and it is something the business supports.
- [ ] On mobile, the headline and the primary action are visible without scrolling, or at most one short scroll.
- [ ] The hero headline is four lines or fewer on mobile and does not end with a single short word on its own line.
- [ ] The first screen is clearly better than the old site's first screen. If someone would not notice the difference in two seconds, the proof image will not convince anyone.

## 3. Hierarchy and rhythm

- [ ] Squint: the headline is the first thing visible, then the photograph or the action. No decoration outranks content.
- [ ] One primary button per screen.
- [ ] No two neighbouring sections have the same layout or the same tone.
- [ ] Section spacing looks even down the page. No section is nearly empty, none is crammed.
- [ ] The page does not feel longer than the content justifies. Remove sections that repeat each other (hours shown three times, the same CTA twice in a row).
- [ ] Left edges line up. Scan down the left side of the container: headings, paragraphs, images and rules start on the same line.

## 4. Type

- [ ] No heading breaks a word in half or leaves one word alone on the last line (rewrap by adjusting the column or use the `*emphasis*` break differently; do not change the wording).
- [ ] Email addresses and phone numbers do not wrap mid-word. If an email breaks, reduce its size, not its meaning.
- [ ] Paragraphs look comfortable: not a wall, not a ribbon of four words per line.
- [ ] Uppercase is used only where the direction asks for it, and never on email addresses, long sentences or body copy.
- [ ] Accented and non-English characters render in the chosen fonts, not in a fallback (look at č, ř, ž, ł, ß, ñ in headings). If they fall back, the font or its subset is wrong.
- [ ] Numerals line up in the hours and price columns.

## 5. Images

- [ ] Every crop keeps its subject: no cut-off heads, signs or products. Set `focus` where needed, on both screen sizes.
- [ ] No image is blurry or pixelated from being shown larger than its file.
- [ ] No image is stretched or squashed.
- [ ] The best photograph is in the hero. The weakest ones are not used.
- [ ] No near-duplicate photographs next to each other in the gallery.
- [ ] The logo is sharp, uncropped and legible on its background. It was not recoloured.
- [ ] Alt text describes each picture. Read them all once; none says "image" or repeats the file name.
- [ ] The favicon and `themeColor` belong to this business, not to the template.

## 6. Colour

- [ ] The accent is recognisably the brand's colour. Hold the old screenshot next to the new one.
- [ ] The accent appears in a few places, not everywhere.
- [ ] Dark and accent bands are readable, including muted text and links inside them.
- [ ] Nothing is purple, gradient or glowing unless the brand itself is.

## 7. Mobile

- [ ] Open the menu: links are large, in a sensible order, and the menu closes.
- [ ] Scroll the whole page at 390px: nothing overflows sideways, no text touches the screen edge.
- [ ] Phone and email are tappable and comfortably sized.
- [ ] The order of stacked content makes sense when read top to bottom.
- [ ] Tables fit or scroll inside their own box.

## 8. Interaction

- [ ] Press Tab from the top: the skip link appears, focus is always visible, and the order follows the page.
- [ ] Every navigation and footer link goes to a real page or anchor. No `#`, no dead routes.
- [ ] `tel:` and `mailto:` links carry the right number and address.
- [ ] External links (map, social profiles, booking) are the ones from the old site.
- [ ] The FAQ opens and closes; the first answer is not the only one that can be read.

## 9. Does it match the brief

- [ ] It still looks like the direction the user chose. Fonts, corner radius, tone and density match `direction.md`.
- [ ] It does not look like the template's example pottery with the words swapped. The palette, photographs and section order are this business's.
- [ ] Run the final test in `anti-patterns.md`: with the name covered, could this be anyone's site?

## 10. Consistency across pages

- [ ] Header, footer and contact details are identical on every page.
- [ ] Every page has one h1 and a title and description of its own.
- [ ] Inner pages are as finished as the home page. Check the last page you built as carefully as the first.

Write what you fixed, and anything you could not carry over from the old site, into the report for the user.
