// Fonts to preload, so the first paint already has them and the text does not
// reflow when they arrive. List the files the top of the page needs: the
// display face (and its italic, if headings use emphasis) and the body face.
// Keep this in step with src/styles/fonts.css. For languages that need it
// (Czech, Polish, Turkish, Vietnamese...), preload the latin-ext files as well.
import displayItalic from '@fontsource-variable/fraunces/files/fraunces-latin-opsz-italic.woff2?url'
import display from '@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2?url'
import body from '@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url'

export const preloadFonts = [display, displayItalic, body]
