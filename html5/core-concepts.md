# HTML5 — Core Concepts

## 1. Semantic Elements
HTML5 introduced elements that convey meaning: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`, `<figure>`, `<figcaption>`, `<time>`, `<mark>`. Semantic HTML improves SEO (search engines understand structure), accessibility (screen readers use landmarks), and maintainability.

## 2. Document Outline
HTML5 defines a document outline algorithm based on sectioning elements. Each `<article>`, `<section>`, `<aside>`, `<nav>` starts a new outline section. `<h1>`–`<h6>` headings within sections create hierarchical outlines that assistive technologies navigate.

## 3. Forms & Input Types
New input types: `email`, `tel`, `url`, `number`, `range`, `date`, `datetime-local`, `color`, `search`. New attributes: `placeholder`, `required`, `pattern`, `autofocus`, `autocomplete`, `min`, `max`, `step`, `multiple`. Native browser validation reduces JavaScript needed.

## 4. Audio & Video
`<video>` and `<audio>` elements with native browser controls. Multiple `<source>` elements for format fallbacks (MP4/WebM for video, MP3/OGG for audio). `<track>` element for WebVTT subtitles/captions. Attributes: `autoplay`, `loop`, `muted`, `preload`, `poster`, `controls`.

## 5. Canvas API
`<canvas>` provides a 2D/WebGL drawing surface via JavaScript. Used for data visualization, games, image manipulation, and custom UI. `getContext('2d')` returns the 2D rendering context with methods for drawing paths, shapes, text, images, and gradients.

## 6. Web Storage
`localStorage` — persistent key-value store per origin, survives browser close (5–10MB). `sessionStorage` — same API but cleared when tab closes. Both are synchronous and store strings only. Useful for caching UI state, user preferences, and offline data. Not suitable for sensitive data.

## 7. Data Attributes
`data-*` attributes store custom data on HTML elements without non-standard attributes. Access via `element.dataset.myValue` (camelCase). WordPress uses `data-block`, `data-id`, etc. in Gutenberg. Useful for passing server-rendered data to JavaScript without inline scripts.

## 8. Accessibility (ARIA)
ARIA (Accessible Rich Internet Applications) attributes supplement semantic HTML for complex widgets. Key attributes: `role` (landmark, button, dialog), `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-hidden`, `aria-expanded`, `aria-live` (for dynamic content announcements). Rule: use native HTML elements first, ARIA only when needed.

## 9. Meta Tags & SEO
`<meta charset="UTF-8">` — character encoding. `<meta name="viewport">` — mobile scaling. `<meta name="description">` — search snippet. `<meta property="og:*">` — Open Graph for social sharing. `<link rel="canonical">` — canonical URL. `<link rel="alternate" hreflang>` — multilingual sites.

## 10. Progressive Enhancement
Build a functional baseline in plain HTML (works everywhere), then layer CSS for presentation, then JavaScript for enhancement. Core content is accessible without CSS/JS. WordPress follows this principle — content is readable even with JavaScript disabled.
