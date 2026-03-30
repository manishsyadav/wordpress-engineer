# HTML5 — Interview Questions

## Basic

**Q: What is the difference between `<div>` and `<section>`?**
**A:** `<div>` is a generic container with no semantic meaning — purely for grouping/styling. `<section>` is a semantic element representing a thematic grouping of content, typically with a heading. Use `<section>` when the content would appear in a document outline; use `<div>` for styling hooks or JS targets only.

**Q: What does `<!DOCTYPE html>` do?**
**A:** Tells the browser to render the page in standards mode (not quirks mode). HTML5 doctype is intentionally short — older doctypes required long DTD URLs. Without it, browsers use quirks mode and may render CSS/layout differently across browsers.

**Q: What is the difference between `id` and `class`?**
**A:** `id` must be unique per page — used for unique elements, anchor links (`#section`), and JavaScript targeting. `class` can be reused on multiple elements — used for styling and grouping. CSS specificity: `id` (0,1,0,0) is higher than `class` (0,0,1,0).

**Q: What are `<meta name="viewport">` settings for mobile?**
**A:** `<meta name="viewport" content="width=device-width, initial-scale=1">` — sets viewport width to device width and initial zoom to 100%. Without this, mobile browsers render at 980px and scale down, making text tiny. Essential for responsive design.

**Q: What is the difference between `<strong>` and `<b>`, `<em>` and `<i>`?**
**A:** `<strong>` means strong importance (semantic) — screen readers may change tone. `<b>` is visually bold with no semantic weight. `<em>` means emphasis (semantic) — screen readers stress the word. `<i>` is visually italic — used for technical terms, foreign phrases, thoughts.

## Mid

**Q: Explain the difference between `async` and `defer` on `<script>` tags.**
**A:** Both allow non-blocking HTML parsing. `async`: script downloads in parallel, executes immediately when downloaded (pauses HTML parsing). Order not guaranteed. Best for independent scripts (analytics). `defer`: script downloads in parallel, executes after HTML is fully parsed, in document order. Best for scripts that depend on DOM or each other. WordPress uses `defer` for non-critical scripts.

**Q: How do you implement lazy loading for images in HTML5?**
**A:** Add `loading="lazy"` attribute: `<img src="photo.jpg" loading="lazy" alt="...">`. Browser only loads the image when it's near the viewport. WordPress 5.5+ adds this automatically. Also add `width` and `height` attributes to prevent CLS. For the LCP image, use `loading="eager"` and `fetchpriority="high"`.

**Q: What is the `<picture>` element used for?**
**A:** Provides multiple image sources for art direction and format selection. `<source>` elements specify conditions (media queries, MIME types); browser picks the first matching source; `<img>` is the fallback. Used to serve WebP to supporting browsers with JPEG fallback, or serve different crops at different breakpoints.

**Q: What are Web Workers and how do they help performance?**
**A:** Web Workers run JavaScript in a background thread, separate from the main UI thread. They cannot access the DOM but can do heavy computation (image processing, large data sorting) without blocking rendering. Communication via `postMessage`. Useful for client-side search, encryption, or large data processing in WordPress themes.

**Q: How do you make a form accessible?**
**A:** Every input needs a `<label>` associated via `for`/`id` or wrapping. Use `fieldset`/`legend` for grouped inputs (radio/checkbox). Add `aria-describedby` for error messages. Set `autocomplete` attributes for browser autofill. Ensure `required` fields have visual + programmatic indicators. Test with keyboard-only navigation.

## Advanced

**Q: What is the Critical Rendering Path and how do you optimize it?**
**A:** Browser parses HTML → builds DOM, downloads CSS → builds CSSOM, combines → Render Tree, Layout, Paint. Optimize by: inlining critical CSS (above-the-fold), deferring non-critical CSS with `<link media="print" onload="this.media='all'"`, using `async`/`defer` on scripts, preloading key resources with `<link rel="preload">`, and minimizing render-blocking resources.

**Q: What are `<link rel="preload">`, `<link rel="prefetch">`, and `<link rel="preconnect">`?**
**A:** `preload`: high-priority fetch of resources needed for current page (fonts, LCP image, critical JS). `prefetch`: low-priority fetch for resources likely needed on next navigation. `preconnect`: establish TCP+TLS connection early to a domain (CDN, Google Fonts, Analytics). Improves Core Web Vitals — especially LCP (preload hero image) and FCP (preconnect to font CDN).

**Q: How do you implement structured data in HTML?**
**A:** Use JSON-LD `<script type="application/ld+json">` with Schema.org types (Article, Product, FAQ, BreadcrumbList, WebSite). JSON-LD is preferred over Microdata — easier to manage, doesn't pollute HTML attributes. WordPress plugins (Yoast, RankMath) generate this automatically. Enables rich results in Google Search (star ratings, FAQ dropdowns, breadcrumbs).
