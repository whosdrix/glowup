#!/usr/bin/env node

// src/cli.ts
import { existsSync as existsSync7 } from "fs";
import { parseArgs } from "util";

// src/commands/audit.ts
import { existsSync as existsSync2 } from "fs";
import { readFile, writeFile } from "fs/promises";
import { dirname, join as join3 } from "path";

// src/lib/browser.ts
import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { mkdir } from "fs/promises";
import { createRequire } from "module";
import { homedir } from "os";
import { join } from "path";

// src/lib/log.ts
var color = process.stderr.isTTY && !process.env.NO_COLOR;
var paint = (code, s) => color ? `\x1B[${code}m${s}\x1B[0m` : s;
var log = {
  step: (msg) => process.stderr.write(`${paint("36", "\u203A")} ${msg}
`),
  ok: (msg) => process.stderr.write(`${paint("32", "\u2713")} ${msg}
`),
  warn: (msg) => process.stderr.write(`${paint("33", "!")} ${msg}
`),
  fail: (msg) => process.stderr.write(`${paint("31", "\u2717")} ${msg}
`),
  dim: (s) => paint("2", s),
  bold: (s) => paint("1", s)
};

// src/lib/browser.ts
var PLAYWRIGHT_VERSION = "1.65.1";
var AXE_VERSION = "4.14.1";
function cacheDir() {
  return process.env.GLOWUP_CACHE ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "glowup");
}
function tryLoad(from) {
  try {
    const req = createRequire(from);
    const pw = req("playwright-core");
    const axePath = req.resolve("axe-core/axe.min.js");
    return {
      pw,
      cliPath: join(req.resolve("playwright-core/package.json"), "..", "cli.js"),
      axeSource: readFileSync(axePath, "utf8")
    };
  } catch {
    return null;
  }
}
var loaded = null;
async function loadRuntime() {
  if (loaded) return loaded;
  loaded = tryLoad(import.meta.url);
  if (loaded) return loaded;
  const runtime = join(cacheDir(), "runtime");
  const anchor = join(runtime, "package.json");
  loaded = existsSync(anchor) ? tryLoad(anchor) : null;
  if (loaded) return loaded;
  log.step(`First run: installing playwright-core and axe-core into ${runtime}`);
  await mkdir(runtime, { recursive: true });
  if (!existsSync(anchor)) {
    writeFileSync(anchor, '{"name":"glowup-runtime","private":true}\n');
  }
  execFileSync(
    "npm",
    [
      "install",
      `playwright-core@${PLAYWRIGHT_VERSION}`,
      `axe-core@${AXE_VERSION}`,
      "--no-audit",
      "--no-fund",
      "--silent"
    ],
    { cwd: runtime, stdio: ["ignore", "ignore", "inherit"] }
  );
  loaded = tryLoad(anchor);
  if (!loaded) throw new Error("Could not load playwright-core after installing it");
  return loaded;
}
async function attempt(label, fn) {
  try {
    return { browser: await fn(), label };
  } catch {
    return null;
  }
}
async function launchBrowser() {
  const { pw, cliPath } = await loadRuntime();
  const args = ["--hide-scrollbars", "--font-render-hinting=none"];
  const path = process.env.CHROMIUM_PATH;
  if (path) {
    return { browser: await pw.chromium.launch({ executablePath: path, args }), label: path };
  }
  const found = await attempt("playwright chromium", () => pw.chromium.launch({ args })) ?? await attempt("Google Chrome", () => pw.chromium.launch({ channel: "chrome", args })) ?? await attempt("Microsoft Edge", () => pw.chromium.launch({ channel: "msedge", args }));
  if (found) return found;
  log.step("No browser found. Downloading Chromium headless shell (one time, about 100 MB)");
  execFileSync(process.execPath, [cliPath, "install", "--only-shell", "chromium"], {
    stdio: ["ignore", "ignore", "inherit"]
  });
  return { browser: await pw.chromium.launch({ args }), label: "playwright chromium" };
}
var VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
};
async function newPage(browser, viewport) {
  const v = VIEWPORTS[viewport];
  const context = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.deviceScaleFactor,
    isMobile: v.isMobile,
    hasTouch: v.hasTouch,
    reducedMotion: "reduce",
    userAgent: viewport === "mobile" ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" : void 0
  });
  await context.addInitScript("globalThis.__name = globalThis.__name || ((f) => f)");
  const page = await context.newPage();
  return { context, page };
}
async function settle(page) {
  await page.waitForLoadState("load", { timeout: 3e4 }).catch(() => {
  });
  await page.waitForLoadState("networkidle", { timeout: 8e3 }).catch(() => {
  });
  await page.evaluate(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.body.scrollHeight && y < 2e4; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);
}

// src/lib/content.ts
function contentMarkdown(name, pages, nav, footer) {
  const out = [`# ${name}`, ""];
  if (nav.length) {
    out.push("## Navigation", "", ...nav.map((l) => `- ${l.text} \u2192 ${l.href}`), "");
  }
  for (const page of pages) {
    out.push(`## Page: ${page.slug}`, "", `URL: ${page.url}`, `Title: ${page.title}`);
    if (page.description) out.push(`Description: ${page.description}`);
    out.push("");
    for (const b of page.blocks) {
      switch (b.kind) {
        case "heading":
          out.push(`${"#".repeat(Math.min(6, (b.level ?? 2) + 2))} ${b.text}`, "");
          break;
        case "paragraph":
          out.push(b.text ?? "", "");
          break;
        case "list":
          out.push(...(b.items ?? []).map((i) => `- ${i}`), "");
          break;
        case "quote":
          out.push(`> ${b.text}`, "");
          break;
        case "image":
          out.push(`![${b.alt ?? ""}](${b.src})`, "");
          break;
        case "cta":
          out.push(`[button: ${b.text}](${b.href ?? "#"})`, "");
          break;
        case "table":
          for (const [i, row] of (b.rows ?? []).entries()) {
            out.push(`| ${row.join(" | ")} |`);
            if (i === 0) out.push(`|${row.map(() => " --- ").join("|")}|`);
          }
          out.push("");
          break;
      }
    }
  }
  if (footer.length) out.push("## Footer", "", ...footer, "");
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}
`;
}
function pickSubpages(home, links, limit) {
  const origin = new URL(home);
  const out = [];
  for (const { href } of links) {
    let u;
    try {
      u = new URL(href);
    } catch {
      continue;
    }
    if (u.protocol !== origin.protocol || u.host !== origin.host) continue;
    if (/\.(pdf|jpe?g|png|gif|webp|zip|docx?|xlsx?|mp4|mp3)$/i.test(u.pathname)) continue;
    u.hash = "";
    u.search = "";
    const clean = u.href;
    const homeClean = new URL(home);
    homeClean.hash = "";
    homeClean.search = "";
    if (clean === homeClean.href || out.includes(clean)) continue;
    if (u.pathname.replace(/index\.html?$/, "") === homeClean.pathname.replace(/index\.html?$/, ""))
      continue;
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

// src/lib/inpage.ts
function extractPage() {
  const SKIP = /* @__PURE__ */ new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "SVG",
    "IFRAME",
    "OBJECT",
    "HEAD"
  ]);
  const INLINE = /* @__PURE__ */ new Set([
    "A",
    "ABBR",
    "B",
    "BR",
    "CITE",
    "CODE",
    "EM",
    "FONT",
    "I",
    "MARK",
    "Q",
    "S",
    "SMALL",
    "SPAN",
    "STRONG",
    "SUB",
    "SUP",
    "TIME",
    "U",
    "WBR",
    "BIG",
    "STRIKE",
    "TT",
    "LABEL"
  ]);
  const abs = (u) => {
    if (!u) return "";
    try {
      return new URL(u, location.href).href;
    } catch {
      return "";
    }
  };
  const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
  const textOf = (el) => clean(
    getComputedStyle(el).textTransform === "none" ? el.innerText : el.textContent
  );
  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0)
      return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const meta = (sel) => document.querySelector(sel)?.getAttribute("content") ?? null;
  const blocks = [];
  const images = [];
  const seenImages = /* @__PURE__ */ new Set();
  const isLogoish = (el) => /logo|brand/i.test(
    `${el.className} ${el.id} ${el.getAttribute("alt") ?? ""} ${el.getAttribute("src") ?? ""}`
  );
  let logo = null;
  const logoCandidate = document.querySelector(
    'header img, [class*="logo" i] img, img[class*="logo" i], img[id*="logo" i], img[alt*="logo" i], img[src*="logo" i]'
  ) ?? document.querySelector(
    `a[href="/"] img, a[href="${location.origin}/"] img, a[href="index.html"] img`
  );
  if (logoCandidate instanceof HTMLImageElement && visible(logoCandidate)) {
    logo = {
      src: abs(logoCandidate.currentSrc || logoCandidate.src),
      alt: logoCandidate.getAttribute("alt")
    };
  }
  const addImage = (img) => {
    const src = abs(img.currentSrc || img.src);
    if (!src || seenImages.has(src)) return;
    const r = img.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    seenImages.add(src);
    images.push({
      src,
      alt: img.getAttribute("alt"),
      width: Math.round(r.width),
      height: Math.round(r.height),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      original: src.split("/").pop()?.split("?")[0],
      role: isLogoish(img) || logo && logo.src === src ? "logo" : "content"
    });
    blocks.push({ kind: "image", src, alt: img.getAttribute("alt") });
  };
  const isButtonLike = (el) => {
    if (el.tagName === "BUTTON" || el.getAttribute("role") === "button") return true;
    if (el.tagName !== "A") return false;
    const s = getComputedStyle(el);
    const bg = s.backgroundColor;
    const hasBg = bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    const padded = Number.parseFloat(s.paddingLeft) >= 4 && Number.parseFloat(s.paddingTop) >= 2;
    return (hasBg || s.borderStyle !== "none") && padded && /block|flex|inline-block|grid/.test(s.display);
  };
  const allInline = (el) => {
    for (const child of Array.from(el.children)) {
      if (!INLINE.has(child.tagName) && child.tagName !== "IMG") return false;
      if (child.tagName === "IMG") return false;
      if (!allInline(child)) return false;
    }
    return true;
  };
  const isNav = (el) => el.tagName === "NAV" || el.getAttribute("role") === "navigation";
  const isFooter = (el) => el.tagName === "FOOTER" || el.getAttribute("role") === "contentinfo";
  const walk = (el) => {
    if (SKIP.has(el.tagName.toUpperCase())) return;
    if (isNav(el) || isFooter(el)) return;
    if (!visible(el)) {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") return;
    }
    const bgImage = getComputedStyle(el).backgroundImage;
    if (bgImage?.startsWith("url(")) {
      const m = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
      const src = abs(m?.[1]);
      const r = el.getBoundingClientRect();
      if (src && !seenImages.has(src) && r.width > 200 && r.height > 120) {
        seenImages.add(src);
        images.push({
          src,
          alt: null,
          width: Math.round(r.width),
          height: Math.round(r.height),
          role: "background"
        });
      }
    }
    const tag = el.tagName;
    if (/^H[1-6]$/.test(tag)) {
      const text2 = textOf(el);
      if (text2) blocks.push({ kind: "heading", level: Number(tag[1]), text: text2 });
      return;
    }
    if (tag === "IMG") {
      addImage(el);
      return;
    }
    if (tag === "PICTURE" || tag === "FIGURE") {
      for (const img of Array.from(el.querySelectorAll("img"))) addImage(img);
      const cap = el.querySelector("figcaption");
      if (cap) blocks.push({ kind: "paragraph", text: clean(cap.innerText) });
      return;
    }
    if (tag === "UL" || tag === "OL" || tag === "DL") {
      const items = Array.from(el.querySelectorAll(":scope > li, :scope > dt, :scope > dd")).map((li) => clean(li.innerText)).filter(Boolean);
      for (const img of Array.from(el.querySelectorAll("img"))) addImage(img);
      if (items.length) blocks.push({ kind: "list", items });
      return;
    }
    if (tag === "BLOCKQUOTE") {
      blocks.push({ kind: "quote", text: clean(el.innerText) });
      return;
    }
    if (tag === "TABLE" && el.querySelector(":scope > tr > th, :scope > thead > tr > th, :scope > tbody > tr > th")) {
      const rows = Array.from(el.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => clean(c.innerText))).filter((r) => r.some(Boolean));
      blocks.push({ kind: "table", rows });
      return;
    }
    if (tag === "FORM") {
      return;
    }
    if ((tag === "A" || tag === "BUTTON" || el.getAttribute("role") === "button") && isButtonLike(el)) {
      const text2 = clean(el.innerText);
      if (text2) blocks.push({ kind: "cta", text: text2, href: abs(el.getAttribute("href")) || void 0 });
      return;
    }
    if (tag === "P" || el.childElementCount === 0 && clean(el.textContent) || allInline(el)) {
      const text2 = clean(el.innerText);
      if (text2.length > 1) {
        const onlyLink = el.children.length === 1 && el.children[0]?.tagName === "A" && clean(el.children[0]?.textContent) === text2;
        const a = el.querySelector("a");
        const anchors = Array.from(el.querySelectorAll("a"));
        const linkText = anchors.reduce((n, x) => n + clean(x.textContent).length, 0);
        const navLike = anchors.length >= 3 && linkText / text2.length > 0.6;
        if (onlyLink && a && isButtonLike(a))
          blocks.push({ kind: "cta", text: text2, href: abs(a.getAttribute("href")) });
        else if (!navLike) blocks.push({ kind: "paragraph", text: text2 });
      }
      for (const img of Array.from(el.querySelectorAll("img"))) addImage(img);
      return;
    }
    walkMixed(el);
  };
  const walkMixed = (el) => {
    let buffer = "";
    let linkChars = 0;
    let links = 0;
    const flush = () => {
      const text2 = clean(buffer);
      const navLike = links >= 3 && linkChars / Math.max(1, text2.length) > 0.6;
      if (text2.length > 1 && !navLike) blocks.push({ kind: "paragraph", text: text2 });
      buffer = "";
      linkChars = 0;
      links = 0;
    };
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) {
        buffer += node.textContent ?? "";
        continue;
      }
      if (node.nodeType !== 1) continue;
      const child = node;
      if (child.tagName === "BR") {
        buffer += "\n";
        continue;
      }
      if (INLINE.has(child.tagName) && !child.querySelector("img") && !isButtonLike(child)) {
        if (!visible(child)) continue;
        const t = child.innerText ?? "";
        if (child.tagName === "A") {
          links++;
          linkChars += clean(t).length;
        }
        buffer += t;
        continue;
      }
      flush();
      walk(child);
    }
    flush();
  };
  walk(document.body);
  const navRoots = Array.from(document.querySelectorAll('nav, [role="navigation"]'));
  let navLinks = navRoots.flatMap((n) => Array.from(n.querySelectorAll("a")));
  if (navLinks.length < 2) {
    const groups = Array.from(document.querySelectorAll("ul, ol, table, div, td, p")).filter((g) => g.getBoundingClientRect().top < 500).map(
      (g) => Array.from(g.querySelectorAll("a")).filter(
        (a) => a.closest("ul, ol, table, div, td, p") === g || g.tagName === "UL" || g.tagName === "OL"
      )
    ).filter((links) => links.length >= 3);
    navLinks = groups[0] ?? navLinks;
  }
  const nav = navLinks.filter((a) => visible(a) || a.closest("nav")).map((a) => ({ text: clean(a.innerText || a.textContent), href: abs(a.getAttribute("href")) })).filter((l) => l.text && l.href).filter((l, i, arr) => arr.findIndex((x) => x.href === l.href && x.text === l.text) === i);
  const footerEl = document.querySelector('footer, [role="contentinfo"]');
  const footer = footerEl ? footerEl.innerText.split("\n").map(clean).filter(Boolean) : [];
  const colorSamples = [];
  const fontSamples = [];
  const vw = window.innerWidth;
  const all = Array.from(document.querySelectorAll("body, body *")).slice(0, 4e3);
  for (const el of all) {
    if (SKIP.has(el.tagName.toUpperCase())) continue;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (s.backgroundColor && s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent") {
      const area = Math.min(r.width, vw) * Math.min(r.height, 2e3);
      const pageSized = el === document.body || r.width >= vw * 0.9 && r.height >= Math.max(1200, document.body.scrollHeight * 0.6);
      colorSamples.push({
        color: s.backgroundColor,
        weight: area / 1e3,
        kind: pageSized ? "page" : "bg"
      });
    }
    let direct = 0;
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) direct += clean(node.textContent).length;
    }
    if (direct > 0) {
      const size = Number.parseFloat(s.fontSize);
      colorSamples.push({ color: s.color, weight: direct * size * size / 400, kind: "text" });
      fontSamples.push({ stack: s.fontFamily, chars: direct, heading: /^H[1-6]$/.test(el.tagName) });
    }
  }
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  if (bodyBg === "rgba(0, 0, 0, 0)" && htmlBg === "rgba(0, 0, 0, 0)") {
    colorSamples.push({ color: "rgb(255, 255, 255)", weight: vw * 2e3 / 1e3, kind: "page" });
  }
  const jsonld = [];
  for (const s of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      jsonld.push(JSON.parse(s.textContent ?? ""));
    } catch {
    }
  }
  const forms = Array.from(document.querySelectorAll("form")).map((f) => ({
    action: abs(f.getAttribute("action")),
    fields: Array.from(f.querySelectorAll("input, textarea, select")).filter(
      (i) => i.type !== "hidden" && i.type !== "submit"
    ).map((i) => {
      const id = i.getAttribute("id");
      const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : i.closest("label");
      return clean(label?.textContent) || i.getAttribute("placeholder") || i.getAttribute("name") || i.tagName.toLowerCase();
    })
  }));
  const text = document.body.innerText;
  const addressEl = document.querySelector('address, [itemprop="address"]');
  const favicon = document.querySelector('link[rel~="icon"]')?.getAttribute("href");
  return {
    url: location.href,
    title: clean(document.title),
    siteName: meta('meta[property="og:site_name"]'),
    description: meta('meta[name="description"]') ?? "",
    lang: document.documentElement.lang || "",
    ogImage: abs(meta('meta[property="og:image"]')) || null,
    themeColor: meta('meta[name="theme-color"]'),
    favicon: favicon ? abs(favicon) : null,
    nav,
    blocks: blocks.filter(
      (b, i) => !(b.kind === "paragraph" && blocks[i - 1]?.kind === "paragraph" && blocks[i - 1]?.text === b.text)
    ),
    footer,
    images,
    logo,
    hrefs: Array.from(document.querySelectorAll("a[href]")).map((a) => abs(a.getAttribute("href"))).filter(Boolean),
    text,
    lines: text.split("\n").map(clean).filter(Boolean),
    address: addressEl ? clean(addressEl.innerText) : null,
    jsonld,
    colorSamples,
    fontSamples,
    forms
  };
}
function measurePage() {
  const SKIP = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "svg", "SVG"]);
  const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const selectorFor = (el) => {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 4) {
      if (cur.id) {
        parts.unshift(`#${CSS.escape(cur.id)}`);
        break;
      }
      let part = cur.tagName.toLowerCase();
      const cls = Array.from(cur.classList).slice(0, 2);
      if (cls.length) part += `.${cls.map((c) => CSS.escape(c)).join(".")}`;
      const parent = cur.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter((c) => c.tagName === cur?.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(cur) + 1})`;
      }
      parts.unshift(part);
      cur = parent;
    }
    return parts.join(" > ");
  };
  let minFontSize = Number.POSITIVE_INFINITY;
  let smallChars = 0;
  let totalChars = 0;
  const families = /* @__PURE__ */ new Set();
  const colors = /* @__PURE__ */ new Set();
  const lineLengths = [];
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    if (SKIP.has(el.tagName)) continue;
    let direct = "";
    for (const n of Array.from(el.childNodes)) if (n.nodeType === 3) direct += n.textContent ?? "";
    const chars = clean(direct).length;
    if (chars < 2 || !visible(el)) continue;
    const s = getComputedStyle(el);
    const size = Number.parseFloat(s.fontSize);
    minFontSize = Math.min(minFontSize, size);
    totalChars += chars;
    if (size < 14) smallChars += chars;
    families.add((s.fontFamily.split(",")[0] ?? "").replace(/["']/g, "").trim().toLowerCase());
    colors.add(s.color);
  }
  for (const el of Array.from(document.querySelectorAll("p, li, dd, td, blockquote, div"))) {
    const text = clean(el.innerText);
    if (text.length < 160 || !visible(el)) continue;
    if (el.tagName === "DIV" || el.tagName === "TD") {
      if (el.querySelector("p, div, li, td, h1, h2, h3, ul, table")) continue;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = /* @__PURE__ */ new Set();
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width > 0) tops.add(Math.round(rect.top));
    }
    const lines = Math.max(1, tops.size);
    if (lines < 2) continue;
    lineLengths.push(Math.round(text.length / lines));
  }
  lineLengths.sort((a, b) => a - b);
  const p90 = lineLengths.length ? lineLengths[Math.floor((lineLengths.length - 1) * 0.9)] ?? 0 : 0;
  const targets = [];
  const interactive = document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [onclick]'
  );
  for (const el of Array.from(interactive)) {
    if (!visible(el)) continue;
    let r = el.getBoundingClientRect();
    for (const media of Array.from(el.querySelectorAll("img, svg, picture"))) {
      const m = media.getBoundingClientRect();
      if (m.width * m.height > r.width * r.height) r = m;
    }
    if (r.width >= 24 && r.height >= 24) continue;
    if (el.tagName === "A") {
      const parent = el.parentElement;
      const parentText = clean(parent?.textContent);
      const ownText = clean(el.textContent);
      if (parent && /^(P|LI|TD|DD|SPAN|BLOCKQUOTE|ADDRESS)$/.test(parent.tagName) && parentText.length > ownText.length + 10)
        continue;
    }
    targets.push({
      selector: selectorFor(el),
      width: Math.round(r.width),
      height: Math.round(r.height)
    });
  }
  const missingAlt = Array.from(document.querySelectorAll("img")).filter((img) => !img.hasAttribute("alt") && visible(img)).map((img) => ({ selector: selectorFor(img), src: img.currentSrc || img.src }));
  const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "";
  const shifts = window.__glowupShift ?? 0;
  return {
    minFontSize: Number.isFinite(minFontSize) ? Math.round(minFontSize * 10) / 10 : 16,
    smallTextShare: totalChars ? Math.round(smallChars / totalChars * 1e3) / 1e3 : 0,
    lineLength: p90,
    smallTapTargets: targets,
    horizontalOverflow: /width\s*=\s*device-width/.test(viewport) ? Math.max(document.documentElement.scrollWidth, window.innerWidth) > screen.width + 2 : document.documentElement.scrollWidth > window.innerWidth + 2,
    viewportMeta: /width\s*=\s*device-width/.test(viewport),
    fontFamilies: families.size,
    textColors: colors.size,
    h1Count: Array.from(document.querySelectorAll("h1")).filter(visible).length,
    missingAlt,
    layoutShift: Math.round(shifts * 1e3) / 1e3
  };
}
var LAYOUT_SHIFT_INIT = `
(() => {
  window.__glowupShift = 0;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__glowupShift += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
})();
`;

// src/lib/paths.ts
import { mkdir as mkdir2 } from "fs/promises";
import { join as join2, resolve } from "path";
function siteKey(input) {
  const url = new URL(input);
  if (url.protocol === "file:") {
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts.at(-1) === "index.html" ? parts.at(-2) : parts.at(-1);
    return (last ?? "local").replace(/\.html?$/, "");
  }
  const host = url.hostname.replace(/^www\./, "");
  return url.port ? `${host}_${url.port}` : host;
}
function normalizeUrl(input) {
  const trimmed = input.trim();
  if (/^[a-z]+:\/\//i.test(trimmed)) return new URL(trimmed).href;
  if (trimmed.startsWith("/") || trimmed.startsWith(".")) {
    return new URL(`file://${resolve(trimmed)}`).href;
  }
  return new URL(`https://${trimmed}`).href;
}
function workspace(root, key) {
  const base = resolve(root, key);
  return {
    base,
    capture: join2(base, "capture"),
    after: join2(base, "after"),
    site: join2(base, "site"),
    proof: join2(base, "proof"),
    audit: join2(base, "audit.json"),
    auditMd: join2(base, "audit.md"),
    auditAfter: join2(base, "audit-after.json"),
    auditAfterMd: join2(base, "audit-after.md"),
    direction: join2(base, "direction.md")
  };
}
async function ensureDir(dir) {
  await mkdir2(dir, { recursive: true });
  return dir;
}
function pageSlug(url, home) {
  const u = new URL(url);
  const h = new URL(home);
  if (u.pathname === h.pathname || u.pathname === "/" || u.pathname === "") return "home";
  return u.pathname.replace(/\/index\.html?$/, "").replace(/\.html?$/, "").split("/").filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60) || "page";
}

// src/lib/score.ts
var MB = 1024 * 1024;
function capped(per, count, cap) {
  return Math.min(cap, per * count);
}
function scorePage(m) {
  const p = [];
  const add = (metric, points, reason) => {
    if (points > 0) p.push({ metric, points: Math.round(points * 10) / 10, reason });
  };
  add(
    "contrastErrors",
    capped(2, m.contrastErrors, 20),
    `${m.contrastErrors} text elements fail WCAG AA contrast`
  );
  const other = m.a11yViolations.filter(
    (v) => v.rule !== "color-contrast" && v.rule !== "image-alt"
  );
  const a11yPoints = other.reduce(
    (sum, v) => sum + (v.impact === "critical" || v.impact === "serious" ? 3 : 1),
    0
  );
  add("a11yViolations", Math.min(15, a11yPoints), `${other.length} other accessibility rules fail`);
  add("missingAlt", capped(1, m.missingAlt, 8), `${m.missingAlt} images have no alt text`);
  if (m.minFontSize < 12) add("minFontSize", 6, `smallest text is ${m.minFontSize}px on mobile`);
  else if (m.minFontSize < 14)
    add("minFontSize", 2, `smallest text is ${m.minFontSize}px on mobile`);
  if (m.smallTextShare > 0.25)
    add("smallTextShare", 6, `${pct(m.smallTextShare)} of mobile text is under 14px`);
  else if (m.smallTextShare > 0.1)
    add("smallTextShare", 3, `${pct(m.smallTextShare)} of mobile text is under 14px`);
  if (m.lineLength > 95) add("lineLength", 6, `paragraphs run ${m.lineLength} characters per line`);
  else if (m.lineLength > 80)
    add("lineLength", 3, `paragraphs run ${m.lineLength} characters per line`);
  add(
    "smallTapTargets",
    capped(1, m.smallTapTargets, 10),
    `${m.smallTapTargets} tap targets are smaller than 24px`
  );
  if (m.horizontalOverflow) add("horizontalOverflow", 10, "the page scrolls sideways on a phone");
  if (!m.viewportMeta) add("viewportMeta", 10, "no responsive viewport meta tag");
  if (m.layoutShift > 0.25) add("layoutShift", 8, `layout shift score ${m.layoutShift}`);
  else if (m.layoutShift > 0.1) add("layoutShift", 4, `layout shift score ${m.layoutShift}`);
  if (m.pageWeight > 5 * MB) add("pageWeight", 8, `page weighs ${mb(m.pageWeight)}`);
  else if (m.pageWeight > 2.5 * MB) add("pageWeight", 4, `page weighs ${mb(m.pageWeight)}`);
  else if (m.pageWeight > 1.5 * MB) add("pageWeight", 2, `page weighs ${mb(m.pageWeight)}`);
  if (m.fontFamilies > 3) add("fontFamilies", 3, `${m.fontFamilies} font families in use`);
  if (m.textColors > 10) add("textColors", 3, `${m.textColors} different text colours`);
  if (m.h1Count !== 1) add("h1Count", 2, `${m.h1Count} h1 headings (expected one)`);
  const lost = p.reduce((sum, x) => sum + x.points, 0);
  return { score: Math.max(0, Math.round(100 - lost)), penalties: p };
}
function siteScore(pages) {
  if (pages.length === 0) return 0;
  const [home, ...rest] = pages;
  if (!home) return 0;
  if (rest.length === 0) return home.score;
  const restAvg = rest.reduce((s, x) => s + x.score, 0) / rest.length;
  return Math.round(home.score * 0.5 + restAvg * 0.5);
}
function totals(pages) {
  const sum = (f) => pages.reduce((s, m) => s + f(m), 0);
  return {
    contrastErrors: sum((m) => m.contrastErrors),
    a11yViolations: sum((m) => m.a11yViolations.filter((v) => v.rule !== "color-contrast").length),
    missingAlt: sum((m) => m.missingAlt),
    minFontSize: pages.length ? Math.min(...pages.map((m) => m.minFontSize)) : 0,
    lineLength: pages.length ? Math.max(...pages.map((m) => m.lineLength)) : 0,
    smallTapTargets: sum((m) => m.smallTapTargets),
    horizontalOverflow: sum((m) => m.horizontalOverflow ? 1 : 0),
    layoutShift: pages.length ? Math.max(...pages.map((m) => m.layoutShift)) : 0,
    pageWeight: sum((m) => m.pageWeight)
  };
}
var BETTER = {
  contrastErrors: "lower",
  a11yViolations: "lower",
  missingAlt: "lower",
  minFontSize: "higher",
  lineLength: "lower",
  smallTapTargets: "lower",
  horizontalOverflow: "lower",
  layoutShift: "lower",
  pageWeight: "lower"
};
var LABELS = {
  contrastErrors: "Contrast errors",
  a11yViolations: "Accessibility issues",
  missingAlt: "Images without alt",
  minFontSize: "Smallest text (px)",
  lineLength: "Longest line (chars)",
  smallTapTargets: "Tiny tap targets",
  horizontalOverflow: "Pages that scroll sideways",
  layoutShift: "Layout shift",
  pageWeight: "Page weight"
};
function pct(n) {
  return `${Math.round(n * 100)}%`;
}
function mb(bytes) {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
function formatTotal(key, value) {
  if (key === "pageWeight") return mb(value);
  if (key === "layoutShift") return value.toFixed(2);
  return String(value);
}

// src/lib/report.ts
function grade(score) {
  if (score >= 90) return "good";
  if (score >= 70) return "needs work";
  if (score >= 50) return "poor";
  return "bad";
}
function auditMarkdown(r) {
  const out = [
    `# Audit: ${r.name}`,
    "",
    `**Score ${r.score}/100** (${grade(r.score)}) \xB7 ${r.pages.length} pages \xB7 ${r.url}`,
    "",
    "| Check | Result |",
    "| --- | --- |"
  ];
  for (const key of Object.keys(LABELS)) {
    out.push(`| ${LABELS[key]} | ${formatTotal(key, r.totals[key])} |`);
  }
  out.push("");
  for (const page of r.pages) {
    const m = page.metrics;
    out.push(`## ${m.slug} \xB7 ${page.score.score}/100`, "", m.url, "");
    if (page.score.penalties.length === 0) {
      out.push("No deductions.", "");
      continue;
    }
    for (const p of [...page.score.penalties].sort((a, b) => b.points - a.points)) {
      out.push(`- **\u2212${p.points}** ${p.reason}`);
    }
    out.push("");
    const serious = m.a11yViolations.filter((v) => v.count > 0);
    if (serious.length) {
      out.push("<details><summary>Accessibility rules that fail</summary>", "");
      for (const v of serious) {
        out.push(`- \`${v.rule}\` (${v.impact}, ${v.count}\xD7): ${v.help}`);
        for (const t of v.targets.slice(0, 3)) out.push(`  - \`${t}\``);
      }
      out.push("", "</details>", "");
    }
    if (page.details.smallTapTargets.length) {
      out.push("<details><summary>Small tap targets (mobile)</summary>", "");
      for (const t of page.details.smallTapTargets.slice(0, 8)) {
        out.push(`- \`${t.selector}\` ${t.width}\xD7${t.height}px`);
      }
      out.push("", "</details>", "");
    }
  }
  return `${out.join("\n").trim()}
`;
}
function deltaRows(before, after) {
  return Object.keys(LABELS).map((key) => {
    const b = before[key];
    const a = after[key];
    const lowerIsBetter = BETTER[key] === "lower";
    const tolerance = key === "pageWeight" ? b * 0.05 : key === "layoutShift" ? 0.01 : 0;
    return {
      key,
      label: LABELS[key],
      before: formatTotal(key, b),
      after: formatTotal(key, a),
      better: lowerIsBetter ? a < b : a > b,
      worse: lowerIsBetter ? a > b + tolerance : a < b - tolerance
    };
  });
}
function deltaMarkdown(before, after) {
  const rows = deltaRows(before.totals, after.totals);
  const out = [
    `# ${before.name}: before and after`,
    "",
    `**Score ${before.score} \u2192 ${after.score}**`,
    "",
    "| Check | Before | After |",
    "| --- | --- | --- |",
    ...rows.map(
      (r) => `| ${r.label} | ${r.before} | ${r.after}${r.better ? " \u2713" : r.worse ? " \u2717" : ""} |`
    ),
    ""
  ];
  return out.join("\n");
}

// src/lib/session.ts
async function browserSession(fn) {
  const { browser } = await launchBrowser();
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

// src/commands/audit.ts
async function auditOne(browser, url, home, axeSource) {
  const desktop = await newPage(browser, "desktop");
  await desktop.context.addInitScript(LAYOUT_SHIFT_INIT);
  let weight = 0;
  let requests = 0;
  const pending = [];
  desktop.page.on("requestfinished", (req) => {
    requests++;
    pending.push(
      req.sizes().then((s) => {
        weight += s.responseBodySize + s.responseHeadersSize;
      }).catch(() => {
      })
    );
  });
  await desktop.page.goto(url, { waitUntil: "domcontentloaded", timeout: 45e3 });
  await settle(desktop.page);
  await Promise.all(pending);
  if (url.startsWith("file:")) {
    weight = await desktop.page.evaluate(
      () => performance.getEntriesByType("resource").concat(performance.getEntriesByType("navigation")).reduce((s, e) => s + (e.decodedBodySize || 0), 0)
    );
  }
  await desktop.page.addScriptTag({ content: axeSource });
  const violations = await desktop.page.evaluate(async () => {
    const axe = window.axe;
    const result = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      resultTypes: ["violations"]
    });
    return result.violations;
  });
  const desk = await desktop.page.evaluate(measurePage);
  await desktop.context.close();
  const mobile = await newPage(browser, "mobile");
  await mobile.page.goto(url, { waitUntil: "domcontentloaded", timeout: 45e3 });
  await settle(mobile.page);
  const mob = await mobile.page.evaluate(measurePage);
  await mobile.context.close();
  const findings = violations.map((v) => ({
    rule: v.id,
    impact: v.impact ?? "moderate",
    count: v.nodes.length,
    help: v.help,
    targets: v.nodes.slice(0, 5).map((n) => n.target.join(" "))
  }));
  const metrics = {
    url,
    slug: pageSlug(url, home),
    contrastErrors: findings.find((f) => f.rule === "color-contrast")?.count ?? 0,
    a11yViolations: findings,
    missingAlt: desk.missingAlt.length,
    minFontSize: mob.minFontSize,
    smallTextShare: mob.smallTextShare,
    lineLength: desk.lineLength,
    smallTapTargets: mob.smallTapTargets.length,
    horizontalOverflow: mob.horizontalOverflow,
    viewportMeta: mob.viewportMeta,
    layoutShift: desk.layoutShift,
    pageWeight: weight,
    requests,
    fontFamilies: desk.fontFamilies,
    textColors: desk.textColors,
    h1Count: desk.h1Count
  };
  return {
    metrics,
    score: scorePage(metrics),
    details: {
      smallTapTargets: mob.smallTapTargets.slice(0, 20),
      missingAlt: desk.missingAlt.slice(0, 20)
    }
  };
}
async function auditUrls(browser, urls, name) {
  const { axeSource } = await loadRuntime();
  const home = urls[0];
  const pages = [];
  for (const url of urls) {
    const result = await auditOne(browser, url, home, axeSource);
    log.ok(`${result.metrics.slug}: ${result.score.score}/100`);
    pages.push(result);
  }
  return {
    url: home,
    name,
    auditedAt: (/* @__PURE__ */ new Date()).toISOString(),
    score: siteScore(pages.map((p) => p.score)),
    totals: totals(pages.map((p) => p.metrics)),
    pages
  };
}
async function resolvePages(browser, url, captureDir, limit) {
  const contentFile = join3(captureDir, "content.json");
  if (existsSync2(contentFile)) {
    const content = JSON.parse(await readFile(contentFile, "utf8"));
    if (content.pages[0] && new URL(content.pages[0].url).host === new URL(url).host) {
      return { urls: content.pages.map((p) => p.url), name: content.name };
    }
  }
  const { page, context } = await newPage(browser, "desktop");
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45e3 });
  await settle(page);
  const raw = await page.evaluate(extractPage);
  await context.close();
  const extra = pickSubpages(
    raw.url,
    [...raw.nav, ...raw.hrefs.map((href) => ({ href }))],
    limit - 1
  );
  return { urls: [raw.url, ...extra], name: raw.title || new URL(url).host };
}
async function audit(opts) {
  const url = normalizeUrl(opts.url);
  const ws = workspace(opts.root, siteKey(url));
  log.step(`Auditing ${url}`);
  return browserSession(async (browser) => {
    const { urls, name } = await resolvePages(browser, url, ws.capture, opts.pages);
    const report = await auditUrls(browser, urls, name);
    const jsonPath = opts.out ?? ws.audit;
    await ensureDir(dirname(jsonPath));
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}
`);
    await writeFile(jsonPath.replace(/\.json$/, ".md"), auditMarkdown(report));
    log.ok(`score ${report.score}/100, written to ${jsonPath}`);
    return report;
  });
}

// src/commands/capture.ts
import { createHash } from "crypto";
import { writeFile as writeFile2 } from "fs/promises";
import { extname, join as join4, relative } from "path";

// src/lib/colors.ts
var NAMED = {
  white: "#ffffff",
  black: "#000000",
  transparent: "#00000000"
};
function parseColor(input) {
  const value = input.trim().toLowerCase();
  const named = NAMED[value];
  if (named) return parseColor(named);
  const hex = value.match(/^#([0-9a-f]{3,8})$/);
  if (hex?.[1]) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = [...h].map((c) => c + c).join("");
    }
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1
    };
  }
  const fn = value.match(/^rgba?\(([^)]+)\)$/);
  if (fn?.[1]) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const channel = (p) => p.endsWith("%") ? Number.parseFloat(p) / 100 * 255 : Number.parseFloat(p);
    const alpha = parts[3];
    const a = alpha === void 0 ? 1 : alpha.endsWith("%") ? Number.parseFloat(alpha) / 100 : Number.parseFloat(alpha);
    const [r, g, b] = parts.slice(0, 3).map(channel);
    if ([r, g, b, a].some(Number.isNaN)) return null;
    return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a };
  }
  return null;
}
function clamp255(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function toHex({ r, g, b }) {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
function toHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: Math.round(h * 60), s, l };
}
function isNeutral(c) {
  const { s, l } = toHsl(c);
  return s < 0.12 || l < 0.08 || l > 0.96;
}
function distance(a, b) {
  const rm = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}
function buildPalette(samples, { threshold = 40, limit = 8 } = {}) {
  const buckets = [];
  for (const sample of samples) {
    const rgb = parseColor(sample.color);
    if (!rgb || rgb.a < 0.5 || sample.weight <= 0) continue;
    const opaque = { ...rgb, a: 1 };
    const near = buckets.find((bucket) => distance(bucket.rgb, opaque) < threshold);
    if (near) {
      if (sample.weight > near.weight) near.rgb = opaque;
      near.weight += sample.weight;
    } else {
      buckets.push({ rgb: opaque, weight: sample.weight });
    }
  }
  const total = buckets.reduce((sum, b) => sum + b.weight, 0) || 1;
  return buckets.sort((a, b) => b.weight - a.weight).slice(0, limit).map((b) => ({
    hex: toHex(b.rgb),
    weight: Math.round(b.weight),
    share: Math.round(b.weight / total * 1e3) / 1e3,
    neutral: isNeutral(b.rgb)
  }));
}
function pickAccent(palette) {
  const scored = palette.map((s) => {
    const hsl = toHsl(parseColor(s.hex));
    return { hex: s.hex, hsl, score: Math.sqrt(s.weight) * hsl.s };
  }).filter((s) => s.hsl.s >= 0.25 && s.hsl.l >= 0.12 && s.hsl.l <= 0.88).sort((a, b) => b.score - a.score);
  return scored[0]?.hex ?? null;
}

// src/lib/contact.ts
var EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
var PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g;
var NETWORKS = [
  ["facebook", /facebook\.com\//i],
  ["instagram", /instagram\.com\//i],
  ["linkedin", /linkedin\.com\//i],
  ["x", /(?:twitter|x)\.com\//i],
  ["youtube", /youtube\.com\/|youtu\.be\//i],
  ["tiktok", /tiktok\.com\//i],
  ["pinterest", /pinterest\.[a-z]+\//i]
];
var DAY = /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|po|út|st|čt|pá|so|ne|pondělí|úterý|středa|čtvrtek|pátek|sobota|neděle)\b/i;
var TIME = /\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\s?(?:am|pm)\b/i;
var CLOSED = /\b(closed|zavřeno|zavreno|geschlossen|fermé|by appointment|po domluvě)\b/i;
var POSTCODE = [
  /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/,
  new RegExp("\\b\\d{3}\\s?\\d{2}\\s+\\p{Lu}\\p{Ll}+", "u"),
  /\b[A-Z]{2}\s\d{5}(?:-\d{4})?\b/,
  new RegExp("\\b\\d{5}\\s+\\p{Lu}\\p{Ll}+", "u")
];
var STREET = new RegExp("\\p{L}{3,}.*\\s\\d+[a-z]?\\b|\\b\\d+[a-z]?\\s+\\p{L}{3,}", "u");
function unique(items) {
  return [...new Set(items)];
}
function findEmails(text, hrefs = []) {
  const fromLinks = hrefs.filter((h) => h.toLowerCase().startsWith("mailto:")).map((h) => decodeURIComponent(h.slice(7).split("?")[0] ?? "").toLowerCase());
  const fromText = (text.match(EMAIL) ?? []).map((e) => e.toLowerCase());
  return unique([...fromLinks, ...fromText]).filter((e) => !/\.(png|jpe?g|gif|svg|webp)$/.test(e));
}
function findPhones(text, hrefs = []) {
  const fromLinks = hrefs.filter((h) => h.toLowerCase().startsWith("tel:")).map((h) => decodeURIComponent(h.slice(4)).trim());
  const fromText = (text.match(PHONE) ?? []).map((p) => p.trim()).filter((p) => {
    const digits = p.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) return false;
    if (/^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$/.test(p)) return false;
    return /[\s.+()-]/.test(p) || p.startsWith("+");
  });
  const seen = /* @__PURE__ */ new Set();
  return [...fromLinks, ...fromText].filter((p) => {
    const key = p.replace(/\D/g, "").slice(-9);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function findSocials(hrefs) {
  const out = [];
  for (const href of unique(hrefs)) {
    const match = NETWORKS.find(([, re]) => re.test(href));
    if (match && !out.some((o) => o.network === match[0])) {
      if (/sharer|share\?|intent\/tweet/i.test(href)) continue;
      out.push({ network: match[0], url: href });
    }
  }
  return out;
}
function findHours(lines) {
  return unique(
    lines.map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length < 120 && DAY.test(l) && (TIME.test(l) || CLOSED.test(l)))
  ).slice(0, 14);
}
function looksLikeStreet(s) {
  const rest = POSTCODE.reduce((acc, re) => acc.replace(re, ""), s);
  return STREET.test(rest);
}
function findAddress(lines) {
  for (const [i, raw] of lines.entries()) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length > 140 || !POSTCODE.some((re) => re.test(line))) continue;
    const parts = line.split(/\s[·|•]\s/).map((p) => p.trim());
    const k = parts.findIndex((p) => POSTCODE.some((re) => re.test(p)));
    const hit = parts[k] ?? line;
    if (looksLikeStreet(hit)) return hit;
    const before = k > 0 ? parts[k - 1] : lines[i - 1]?.trim();
    if (before && before.length < 60 && looksLikeStreet(before)) return `${before}, ${hit}`;
    return hit;
  }
  return null;
}
function extractContact(input) {
  return {
    emails: findEmails(input.text, input.hrefs),
    phones: findPhones(input.text, input.hrefs),
    socials: findSocials(input.hrefs),
    address: input.address?.replace(/\s+/g, " ").trim() || findAddress(input.lines),
    hours: findHours(input.lines)
  };
}

// src/lib/fonts.ts
var GENERIC = /* @__PURE__ */ new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "emoji",
  "math"
]);
function primaryFamily(stack) {
  const families = stack.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  return families.find((f) => !GENERIC.has(f.toLowerCase())) ?? families[0] ?? "serif";
}
function rankFonts(samples) {
  const totals2 = /* @__PURE__ */ new Map();
  let all = 0;
  for (const { stack, chars } of samples) {
    const family = primaryFamily(stack);
    totals2.set(family, (totals2.get(family) ?? 0) + chars);
    all += chars;
  }
  return [...totals2.entries()].sort((a, b) => b[1] - a[1]).map(([family, chars]) => ({ family, share: Math.round(chars / (all || 1) * 1e3) / 1e3 }));
}
var SYSTEM_DEFAULTS = /* @__PURE__ */ new Set([
  "times new roman",
  "times",
  "arial",
  "helvetica",
  "verdana",
  "tahoma",
  "georgia",
  "comic sans ms",
  "trebuchet ms"
]);
function isSystemDefault(family) {
  return SYSTEM_DEFAULTS.has(family.toLowerCase());
}

// src/lib/brand.ts
var BUSINESS_TYPES = /LocalBusiness|Organization|Restaurant|Store|Dentist|Bakery|Cafe|Hotel|Salon|Clinic|Physician|Plumber|Electrician|AutoRepair|LegalService|ProfessionalService|SportsActivityLocation|Corporation/i;
function flattenLd(items) {
  const out = [];
  const visit = (v) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      const o = v;
      out.push(o);
      if (o["@graph"]) visit(o["@graph"]);
    }
  };
  items.forEach(visit);
  return out;
}
function findBusiness(pages) {
  for (const page of pages) {
    for (const item of flattenLd(page.jsonld)) {
      const type = item["@type"];
      const types = Array.isArray(type) ? type.join(" ") : String(type ?? "");
      if (BUSINESS_TYPES.test(types)) return item;
    }
  }
  return null;
}
var GENERIC_TITLE = /^(welcome|home|homepage|index|main page|úvod|domů|vítejte|úvodní stránka|startseite|accueil|inicio)\b/i;
function guessName(home, business) {
  if (business && typeof business.name === "string") return business.name;
  if (home.siteName) return home.siteName;
  const parts = home.title.split(/\s[|\-–—:·]\s/).map((s) => s.trim()).filter((s) => s && !GENERIC_TITLE.test(s));
  const copyright = home.lines.find((l) => /©|\(c\)|copyright/i.test(l)) ?? "";
  const inCopyright = parts.find((p) => copyright.toLowerCase().includes(p.toLowerCase()));
  if (inCopyright) return inCopyright;
  const logoAlt = home.logo?.alt?.replace(/\s*logo\s*/i, "").trim();
  if (logoAlt && logoAlt.length < 60) {
    const match = parts.find((p) => p.toLowerCase().includes(logoAlt.toLowerCase()));
    return match ?? logoAlt;
  }
  return parts[0] ?? home.title ?? new URL(home.url).hostname;
}
function ldAddress(business) {
  const a = business?.address;
  if (!a) return null;
  if (typeof a === "string") return a;
  if (typeof a === "object") {
    const o = a;
    return ["streetAddress", "postalCode", "addressLocality", "addressCountry"].map((k) => o[k]).filter((v) => typeof v === "string").join(", ");
  }
  return null;
}
function buildBrand(pages, logoPath, faviconPath) {
  const home = pages[0];
  const samples = pages.flatMap((p) => p.colorSamples);
  const palette = buildPalette(samples, { limit: 12 });
  const business = findBusiness(pages);
  const headingSamples = pages.flatMap((p) => p.fontSamples.filter((f) => f.heading));
  const bodySamples = pages.flatMap((p) => p.fontSamples.filter((f) => !f.heading));
  const body = rankFonts(bodySamples).slice(0, 4);
  const heading = rankFonts(headingSamples).slice(0, 3);
  const contact = extractContact({
    text: pages.map((p) => p.text).join("\n"),
    lines: pages.flatMap((p) => p.lines),
    hrefs: pages.flatMap((p) => p.hrefs),
    address: home.address ?? pages.find((p) => p.address)?.address ?? ldAddress(business)
  });
  if (business) {
    const tel = business.telephone;
    if (typeof tel === "string" && !contact.phones.includes(tel)) contact.phones.unshift(tel);
    const email = business.email;
    if (typeof email === "string" && !contact.emails.includes(email)) contact.emails.unshift(email);
    const hours = business.openingHours;
    if (contact.hours.length === 0 && hours) {
      contact.hours = (Array.isArray(hours) ? hours : [hours]).map(String);
    }
  }
  return {
    name: guessName(home, business),
    accent: pickAccent(
      buildPalette(
        samples.filter((s) => s.kind !== "page"),
        { limit: 12 }
      )
    ) ?? pickAccent(palette),
    themeColor: home.themeColor,
    palette,
    backgrounds: buildPalette(
      samples.filter((s) => s.kind !== "text"),
      { limit: 6 }
    ),
    textColors: buildPalette(
      samples.filter((s) => s.kind === "text"),
      { limit: 6 }
    ),
    fonts: {
      heading,
      body,
      systemDefaultsOnly: [...heading, ...body].every((f) => isSystemDefault(f.family))
    },
    logo: logoPath,
    favicon: faviconPath,
    contact,
    business
  };
}

// src/commands/capture.ts
var MAX_SHOT_HEIGHT = 8e3;
var EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico"
};
async function shoot(page, dir, viewport) {
  await page.screenshot({ path: join4(dir, `${viewport}.png`) });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const width = page.viewportSize()?.width ?? 1440;
  await page.screenshot({
    path: join4(dir, `${viewport}-full.png`),
    fullPage: true,
    clip: { x: 0, y: 0, width, height: Math.min(height, MAX_SHOT_HEIGHT) }
  });
}
async function capturePages(browser, urls, dir, opts) {
  const images = /* @__PURE__ */ new Map();
  const raw = [];
  const home = opts.home ?? urls[0] ?? "";
  const queue = [...urls];
  const desktop = await newPage(browser, "desktop");
  desktop.page.on("response", async (res) => {
    const type = (res.headers()["content-type"] ?? "").split(";")[0]?.trim() ?? "";
    if (!type.startsWith("image/") && res.request().resourceType() !== "image") return;
    try {
      const body = await res.body();
      if (body.length > 100) images.set(res.url(), { body, type });
    } catch {
    }
  });
  for (let i = 0; i < queue.length; i++) {
    const url = queue[i];
    const slug = pageSlug(url, home);
    const pageDir = await ensureDir(join4(dir, "pages", slug));
    const res = await desktop.page.goto(url, { waitUntil: "domcontentloaded", timeout: 45e3 });
    if (res && res.status() >= 400) log.warn(`${url} returned ${res.status()}`);
    await settle(desktop.page);
    await shoot(desktop.page, pageDir, "desktop");
    if (opts.extract) {
      const data = await desktop.page.evaluate(extractPage);
      raw.push(data);
      if (i === 0 && opts.followNav) {
        const extra = pickSubpages(
          data.url,
          [...data.nav, ...data.hrefs.map((href) => ({ href }))],
          opts.followNav
        );
        queue.push(...extra);
      }
    }
    if (!opts.quiet) log.ok(`desktop ${slug}`);
  }
  await desktop.context.close();
  const mobile = await newPage(browser, "mobile");
  for (const url of queue) {
    const slug = pageSlug(url, home);
    await mobile.page.goto(url, { waitUntil: "domcontentloaded", timeout: 45e3 });
    await settle(mobile.page);
    await shoot(mobile.page, join4(dir, "pages", slug), "mobile");
    if (!opts.quiet) log.ok(`mobile ${slug}`);
  }
  await mobile.context.close();
  return { raw, images, urls: queue };
}
async function saveImage(src, images, assets, saved) {
  if (saved.has(src)) return saved.get(src) ?? null;
  const hit = images.get(src);
  if (!hit) return null;
  const urlExt = extname(new URL(src).pathname).toLowerCase();
  const ext = EXT[hit.type] ?? (urlExt && urlExt.length <= 5 ? urlExt : ".bin");
  const name = `${createHash("sha1").update(src).digest("hex").slice(0, 10)}${ext}`;
  const file = join4(assets, name);
  await writeFile2(file, hit.body);
  saved.set(src, file);
  return file;
}
async function capture(opts) {
  const url = normalizeUrl(opts.url);
  const ws = workspace(opts.root, siteKey(url));
  const dir = await ensureDir(opts.outDir ?? ws.capture);
  const assets = await ensureDir(join4(dir, "assets"));
  log.step(`Capturing ${url}`);
  return browserSession(async (browser) => {
    const { raw, images } = await capturePages(browser, [url], dir, {
      extract: true,
      followNav: Math.max(0, opts.pages - 1),
      quiet: opts.quiet
    });
    const home = raw[0];
    if (!home) throw new Error(`Nothing captured from ${url}`);
    const saved = /* @__PURE__ */ new Map();
    const rel = (file) => file ? relative(dir, file) : null;
    for (const page of raw) {
      for (const img of page.images) {
        const file = await saveImage(img.src, images, assets, saved);
        if (file) img.src = rel(file) ?? img.src;
      }
      for (const block of page.blocks) {
        if (block.kind === "image" && block.src) {
          const file = await saveImage(block.src, images, assets, saved);
          if (file) block.src = rel(file) ?? block.src;
        }
      }
    }
    const logoFile = home.logo ? await saveImage(home.logo.src, images, assets, saved) : null;
    const faviconFile = home.favicon ? await saveImage(home.favicon, images, assets, saved) : null;
    const ogFile = home.ogImage ? await saveImage(home.ogImage, images, assets, saved) : null;
    const brand = buildBrand(raw, rel(logoFile), rel(faviconFile));
    const pages = raw.map((p) => ({
      slug: pageSlug(p.url, url),
      url: p.url,
      title: p.title,
      description: p.description,
      blocks: p.blocks
    }));
    const content = {
      url,
      capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
      name: brand.name,
      lang: home.lang,
      ogImage: rel(ogFile) ?? home.ogImage,
      nav: home.nav,
      footer: home.footer,
      forms: raw.flatMap((p) => p.forms.map((f) => ({ page: pageSlug(p.url, url), ...f }))),
      pages,
      images: raw.flatMap((p) => p.images).filter((img, i, arr) => arr.findIndex((x) => x.src === img.src) === i)
    };
    await writeFile2(join4(dir, "content.json"), `${JSON.stringify(content, null, 2)}
`);
    await writeFile2(join4(dir, "brand.json"), `${JSON.stringify(brand, null, 2)}
`);
    await writeFile2(
      join4(dir, "content.md"),
      contentMarkdown(brand.name, pages, home.nav, home.footer)
    );
    log.ok(`${pages.length} pages, ${saved.size} images, brand "${brand.name}"`);
    log.ok(
      `accent ${brand.accent ?? "none"}, fonts ${brand.fonts.body.map((f) => f.family).join(", ") || "unknown"}`
    );
    const c = brand.contact;
    log.ok(
      `contact: ${c.emails.length} email, ${c.phones.length} phone, ${c.socials.length} social, ${c.hours.length} hours lines`
    );
    log.ok(`saved to ${dir}`);
    return { dir, pages: pages.map((p) => ({ slug: p.slug, url: p.url })), brandName: brand.name };
  });
}

// src/commands/compose.ts
import { existsSync as existsSync3 } from "fs";
import { readFile as readFile2 } from "fs/promises";
import { join as join5 } from "path";
var PRIORITY = [
  "contrastErrors",
  "a11yViolations",
  "smallTapTargets",
  "horizontalOverflow",
  "missingAlt",
  "minFontSize",
  "lineLength",
  "pageWeight",
  "layoutShift"
];
function headlineDeltas(rows, limit = 4) {
  return PRIORITY.map((k) => rows.find((r) => r.key === k)).filter((r) => Boolean(r?.better)).slice(0, limit);
}
function esc(s) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c
  );
}
async function dataUri(file) {
  return `data:image/png;base64,${(await readFile2(file)).toString("base64")}`;
}
function composeHtml(input) {
  const panel = (label, side, after) => `
    <section class="panel${after ? " is-after" : ""}">
      <div class="head">
        <span class="pill">${label}</span>
        <span class="score"><b>${side.score}</b><i>/100</i></span>
      </div>
      <div class="stage">
        <div class="browser">
          <div class="bar"><i></i><i></i><i></i><span></span></div>
          <div class="shot"><img src="${side.desktop}" alt=""></div>
        </div>
        <div class="phone"><img src="${side.mobile}" alt=""></div>
      </div>
    </section>`;
  const deltas = input.deltas.map(
    (d) => `<div class="delta"><span>${esc(d.label)}</span><b>${esc(d.before)}<em>\u2192</em>${esc(d.after)}</b></div>`
  ).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { position: relative; width: 1600px; height: 1000px; overflow: hidden; padding: 52px 64px 60px;
    display: flex; flex-direction: column; color: #f2f5ff;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(1100px 620px at 88% -8%, rgba(91,140,255,.22), transparent 62%),
      radial-gradient(900px 600px at 0% 100%, rgba(91,140,255,.08), transparent 60%),
      linear-gradient(155deg, #101a3c 0%, #0a1026 55%, #070b1a 100%); }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 48px; }
  .title { min-width: 0; }
  .eyebrow { font-size: 19px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #5b8cff; }
  .eyebrow span { color: #6f7ba3; font-weight: 600; }
  h1 { margin-top: 10px; font-size: 50px; line-height: 1.1; font-weight: 800; letter-spacing: -.03em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .host { margin-top: 6px; font-size: 24px; color: #8f9bc2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .total { flex: none; text-align: right; }
  .total small { display: block; font-size: 19px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #6f7ba3; }
  .total p { margin-top: 2px; font-size: 76px; line-height: 1; font-weight: 800; letter-spacing: -.04em;
    font-variant-numeric: tabular-nums; }
  .total s { text-decoration: none; color: #8f9bc2; }
  .total em { font-style: normal; color: #5b8cff; margin: 0 16px; font-weight: 600; }
  main { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; margin-top: 34px; }
  .panel { display: flex; flex-direction: column; min-height: 0; }
  .head { display: flex; justify-content: space-between; align-items: center; height: 44px; }
  .pill { font-size: 19px; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; padding: 8px 18px;
    border-radius: 999px; background: rgba(255,255,255,.07); color: #aeb9dc; box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
  .is-after .pill { background: #5b8cff; color: #fff; box-shadow: none; }
  .score { font-variant-numeric: tabular-nums; color: #8f9bc2; }
  .score b { font-size: 36px; font-weight: 800; letter-spacing: -.03em; }
  .score i { font-style: normal; font-size: 22px; color: #6f7ba3; margin-left: 2px; }
  .is-after .score b { color: #fff; }
  .stage { position: relative; flex: 1; min-height: 0; margin-top: 18px; }
  .browser { position: absolute; left: 0; top: 0; right: 84px; border-radius: 14px; overflow: hidden; background: #fff;
    box-shadow: 0 36px 70px -24px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.1); }
  .is-after .browser { box-shadow: 0 36px 70px -24px rgba(0,0,0,.75), 0 0 0 2px #5b8cff; }
  .bar { height: 34px; background: #e7eaf1; display: flex; align-items: center; gap: 8px; padding: 0 14px; }
  .bar i { width: 12px; height: 12px; border-radius: 50%; background: #c3c8d4; }
  .bar span { flex: 1; height: 16px; margin-left: 14px; border-radius: 8px; background: #f6f7fa; }
  .shot { aspect-ratio: 1440 / 900; background: #fff; }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
  .phone { position: absolute; right: 0; bottom: 0; width: 196px; border-radius: 30px; padding: 8px; background: #0c0f1a;
    box-shadow: 0 28px 56px -14px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.16); }
  .is-after .phone { box-shadow: 0 28px 56px -14px rgba(0,0,0,.8), 0 0 0 2px #5b8cff; }
  .phone img { width: 100%; aspect-ratio: 390 / 844; object-fit: cover; object-position: top; border-radius: 22px;
    display: block; background: #fff; }
  footer { display: grid; grid-template-columns: repeat(${Math.max(1, input.deltas.length)}, 1fr); gap: 18px; margin-top: 30px; }
  .delta { background: rgba(255,255,255,.045); box-shadow: inset 0 0 0 1px rgba(255,255,255,.09); border-radius: 14px;
    padding: 16px 22px 18px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .delta span { color: #9aa6cc; font-size: 20px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .delta b { font-size: 38px; line-height: 1; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums;
    white-space: nowrap; }
  .delta em { font-style: normal; font-weight: 600; color: #5b8cff; margin: 0 12px; }
  .accent-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: #5b8cff; }
</style></head><body>
  <header>
    <div class="title">
      <p class="eyebrow">glowup <span>\xB7 before / after</span></p>
      <h1>${esc(input.name)}</h1>
      <p class="host">${esc(input.host)}</p>
    </div>
    <div class="total"><small>Audit score</small><p><s>${input.before.score}</s><em>\u2192</em>${input.after.score}</p></div>
  </header>
  <main>${panel("Before", input.before, false)}${panel("After", input.after, true)}</main>
  ${deltas ? `<footer>${deltas}</footer>` : ""}
  <div class="accent-bar"></div>
</body></html>`;
}
async function composeProof(browser, ws, slug = "home", label) {
  const before = JSON.parse(await readFile2(ws.audit, "utf8"));
  const after = JSON.parse(await readFile2(ws.auditAfter, "utf8"));
  const shots = (dir) => ({
    desktop: join5(dir, "pages", slug, "desktop-full.png"),
    mobile: join5(dir, "pages", slug, "mobile.png")
  });
  const b = shots(ws.capture);
  const a = shots(ws.after);
  for (const f of [b.desktop, b.mobile, a.desktop, a.mobile]) {
    if (!existsSync3(f)) throw new Error(`Missing screenshot ${f}. Run capture and verify first.`);
  }
  const html = composeHtml({
    name: before.name,
    host: label ?? (new URL(before.url).host || before.name),
    before: {
      desktop: await dataUri(b.desktop),
      mobile: await dataUri(b.mobile),
      score: before.score
    },
    after: {
      desktop: await dataUri(a.desktop),
      mobile: await dataUri(a.mobile),
      score: after.score
    },
    deltas: headlineDeltas(deltaRows(before.totals, after.totals))
  });
  await ensureDir(ws.proof);
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1e3 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: "load" });
  const out = join5(ws.proof, slug === "home" ? "before-after.png" : `before-after-${slug}.png`);
  await page.screenshot({ path: out });
  await context.close();
  return out;
}
async function compose(opts) {
  const ws = workspace(opts.root, siteKey(normalizeUrl(opts.url)));
  return browserSession(async (browser) => {
    const out = await composeProof(browser, ws, "home", opts.label);
    log.ok(`proof image written to ${out}`);
    return out;
  });
}

// src/commands/status.ts
import { existsSync as existsSync4 } from "fs";
import { readFile as readFile3 } from "fs/promises";
import { join as join6 } from "path";
async function status(opts) {
  const ws = workspace(opts.root, siteKey(normalizeUrl(opts.url)));
  const score = async (file) => {
    if (!existsSync4(file)) return null;
    return JSON.parse(await readFile3(file, "utf8")).score;
  };
  const before = await score(ws.audit);
  const after = await score(ws.auditAfter);
  const steps = [
    ["capture", existsSync4(join6(ws.capture, "content.json")), ws.capture],
    ["audit", before !== null, before !== null ? `${before}/100` : ws.audit],
    ["direction", existsSync4(ws.direction), ws.direction],
    ["build", existsSync4(join6(ws.site, "dist", "index.html")), join6(ws.site, "dist")],
    ["verify", after !== null, after !== null ? `${after}/100` : ws.auditAfter],
    ["proof", existsSync4(join6(ws.proof, "before-after.png")), join6(ws.proof, "before-after.png")]
  ];
  const next = steps.find(([, done]) => !done)?.[0] ?? "done";
  return `${[
    `${ws.base}`,
    ...steps.map(([name, done, detail]) => `  ${done ? "\u2713" : "\xB7"} ${name.padEnd(10)} ${detail}`),
    `  next: ${next}`
  ].join("\n")}
`;
}

// src/commands/verify.ts
import { existsSync as existsSync6 } from "fs";
import { readFile as readFile4, writeFile as writeFile3 } from "fs/promises";
import { join as join8 } from "path";

// src/lib/server.ts
import { createReadStream, existsSync as existsSync5, statSync } from "fs";
import { createServer } from "http";
import { extname as extname2, join as join7, normalize, resolve as resolve2 } from "path";
var TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml"
};
function resolveFile(root, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0] ?? "/")).replace(
    /^(\.\.[/\\])+/,
    ""
  );
  const base = join7(root, clean);
  if (!base.startsWith(root)) return null;
  const candidates = [base, join7(base, "index.html"), `${base}.html`];
  return candidates.find((c) => existsSync5(c) && statSync(c).isFile()) ?? null;
}
async function serveStatic(dir) {
  const root = resolve2(dir);
  const server = createServer((req, res) => {
    const file = resolveFile(root, req.url ?? "/");
    if (!file) {
      const notFound = join7(root, "404.html");
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      if (existsSync5(notFound)) createReadStream(notFound).pipe(res);
      else res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[extname2(file).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-store"
    });
    createReadStream(file).pipe(res);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((ok) => server.close(() => ok()))
  };
}

// src/commands/verify.ts
var DEFAULT_BUDGET = { minScore: 90, maxLineLength: 80 };
function checkBudget(before, after, budget = DEFAULT_BUDGET) {
  const failures = [];
  const t = after.totals;
  if (after.score < before.score)
    failures.push(`score dropped from ${before.score} to ${after.score}`);
  if (after.score < budget.minScore)
    failures.push(`score ${after.score} is below ${budget.minScore}`);
  if (t.contrastErrors > 0) failures.push(`${t.contrastErrors} contrast errors`);
  if (t.missingAlt > 0) failures.push(`${t.missingAlt} images without alt text`);
  if (t.horizontalOverflow > 0)
    failures.push(`${t.horizontalOverflow} pages scroll sideways on mobile`);
  if (t.smallTapTargets > 0) failures.push(`${t.smallTapTargets} tap targets under 24px`);
  if (t.lineLength > budget.maxLineLength)
    failures.push(`lines run ${t.lineLength} characters (max ${budget.maxLineLength})`);
  for (const row of deltaRows(before.totals, after.totals)) {
    if (row.worse && row.key !== "pageWeight")
      failures.push(`${row.label} got worse: ${row.before} \u2192 ${row.after}`);
  }
  for (const page of after.pages) {
    if (!page.metrics.viewportMeta) failures.push(`${page.metrics.slug}: missing viewport meta`);
    if (page.metrics.h1Count !== 1)
      failures.push(`${page.metrics.slug}: ${page.metrics.h1Count} h1 headings`);
    for (const v of page.metrics.a11yViolations) {
      failures.push(
        `${page.metrics.slug}: ${v.rule} (${v.count}\xD7) ${v.targets.slice(0, 2).join(", ")}`
      );
    }
    for (const t2 of page.details.smallTapTargets.slice(0, 3)) {
      failures.push(`${page.metrics.slug}: small tap target ${t2.selector} (${t2.width}\xD7${t2.height})`);
    }
  }
  return [...new Set(failures)];
}
async function verify(opts) {
  const original = normalizeUrl(opts.url);
  const ws = workspace(opts.root, siteKey(original));
  const dist = opts.dist ?? join8(ws.site, "dist");
  if (!existsSync6(join8(dist, "index.html"))) {
    throw new Error(`No built site at ${dist}. Run "npm run build" in ${ws.site} first.`);
  }
  if (!existsSync6(ws.audit)) {
    throw new Error(`No baseline audit at ${ws.audit}. Run "glowup audit ${opts.url}" first.`);
  }
  const before = JSON.parse(await readFile4(ws.audit, "utf8"));
  const server = await serveStatic(dist);
  log.step(`Verifying the new site at ${server.url}`);
  try {
    return await browserSession(async (browser) => {
      const { page, context } = await newPage(browser, "desktop");
      await page.goto(server.url);
      await settle(page);
      const raw = await page.evaluate(extractPage);
      await context.close();
      const pageCount = Math.max(1, before.pages.length);
      const urls = [
        server.url,
        ...pickSubpages(
          server.url,
          [...raw.nav, ...raw.hrefs.map((href) => ({ href }))],
          pageCount - 1
        )
      ];
      await capturePages(browser, urls, ws.after, { extract: false, home: server.url, quiet: true });
      const report = await auditUrls(browser, urls, before.name);
      const after = { ...report, url: before.url, name: before.name };
      await writeFile3(ws.auditAfter, `${JSON.stringify(after, null, 2)}
`);
      await writeFile3(ws.auditAfterMd, auditMarkdown(after));
      const failures = checkBudget(before, after, opts.budget);
      let proof = null;
      proof = await composeProof(browser, ws);
      await writeFile3(join8(ws.proof, "delta.md"), deltaMarkdown(before, after));
      for (const row of deltaRows(before.totals, after.totals)) {
        const mark = row.better ? "\u2713" : row.worse ? row.key === "pageWeight" ? "!" : "\u2717" : " ";
        process.stderr.write(
          `  ${mark} ${row.label.padEnd(28)} ${row.before.padStart(8)} \u2192 ${row.after}
`
        );
      }
      process.stderr.write(`
  Score ${before.score} \u2192 ${after.score}

`);
      if (deltaRows(before.totals, after.totals).some((r) => r.key === "pageWeight" && r.worse)) {
        log.warn(
          "The new site is heavier than the original. Check image sizes; this does not fail verify."
        );
      }
      if (failures.length) {
        log.fail(`${failures.length} problems to fix:`);
        for (const f of failures) process.stderr.write(`  - ${f}
`);
      } else {
        log.ok("All checks pass");
      }
      log.ok(`proof: ${proof}`);
      return { passed: failures.length === 0, failures, before, after, proof };
    });
  } finally {
    await server.close();
  }
}

// src/cli.ts
var HELP = `glowup: capture, audit and verify website redesigns

Usage
  glowup capture <url>   screenshots, content, brand colours and fonts
  glowup audit <url>     score the site out of 100 and list what is wrong
  glowup verify <url>    audit the rebuilt site in site/dist against the original
  glowup compose <url>   render the before/after proof image again
  glowup status <url>    show which steps are done for a site
  glowup doctor          check that a browser can be found

Options
  --root <dir>    where site folders live (default ./glowup)
  --pages <n>     pages to capture and audit, home included (default 5)
  --dist <dir>    built site to verify (default <root>/<site>/site/dist)
  --min-score <n> score the rebuilt site must reach (default 90)
  --label <text>  host shown on the proof image (compose only)
  -h, --help
`;
async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      root: { type: "string", default: "glowup" },
      pages: { type: "string", default: "5" },
      dist: { type: "string" },
      "min-score": { type: "string", default: "90" },
      label: { type: "string" },
      help: { type: "boolean", short: "h" }
    }
  });
  const [command, url] = positionals;
  if (values.help || !command) {
    process.stdout.write(HELP);
    return 0;
  }
  const pages = Math.max(1, Math.min(10, Number.parseInt(values.pages ?? "5", 10) || 5));
  const root = values.root ?? "glowup";
  const needUrl = () => {
    if (!url) throw new Error(`"glowup ${command}" needs a URL`);
    return url;
  };
  switch (command) {
    case "capture":
      await capture({ url: needUrl(), root, pages });
      return 0;
    case "audit":
      await audit({ url: needUrl(), root, pages });
      return 0;
    case "verify": {
      const minScore = Number.parseInt(values["min-score"] ?? "90", 10);
      const result = await verify({
        url: needUrl(),
        root,
        dist: values.dist,
        budget: { minScore, maxLineLength: 80 }
      });
      return result.passed ? 0 : 1;
    }
    case "compose":
      await compose({ url: needUrl(), root, label: values.label });
      return 0;
    case "status":
      process.stdout.write(await status({ url: needUrl(), root }));
      return 0;
    case "doctor": {
      const { browser, label } = await launchBrowser();
      log.ok(`browser: ${label} ${browser.version()}`);
      await browser.close();
      log.ok(`node ${process.version}`);
      log.ok(
        existsSync7(root) ? `workspace ${root} exists` : `workspace ${root} will be created on first capture`
      );
      return 0;
    }
    default:
      process.stdout.write(HELP);
      return 1;
  }
}
main().then(
  (code) => process.exit(code),
  (err) => {
    log.fail(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
);
