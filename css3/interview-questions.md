# CSS3 — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is the CSS box model?**
**A:** Every element is a rectangular box with content, padding, border, and margin layers. By default (`content-box`) `width` applies to the content area only; with `border-box` it includes padding and border, making sizing more predictable.
```css
*, *::before, *::after {
  box-sizing: border-box; /* width includes padding + border */
}
.card {
  width: 300px;
  padding: 1rem;
  border: 2px solid #ccc;
}
```

**Q2: What is the difference between `display: none` and `visibility: hidden`?**
**A:** `display: none` removes the element from the layout flow entirely — it takes up no space. `visibility: hidden` hides the element visually but preserves its space in the layout.
```css
.removed   { display: none; }       /* no layout space */
.invisible { visibility: hidden; }  /* space preserved */
```

**Q3: What is the difference between `position: absolute` and `position: fixed`?**
**A:** `absolute` positions an element relative to its nearest positioned ancestor; it scrolls with the page. `fixed` positions it relative to the viewport; it stays put when the page scrolls.
```css
.tooltip     { position: absolute; top: 100%; left: 0; }    /* relative to parent */
.sticky-nav  { position: fixed;    top: 0;    width: 100%; } /* viewport-relative */
```

**Q4: What is `position: sticky` and how does it work?**
**A:** A sticky element acts like `relative` in normal flow until it crosses a threshold (e.g. `top: 0`), then it sticks like `fixed` within its scrolling container. The nearest scrolling ancestor must not have `overflow: hidden`.
```css
.section-header {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
}
```

**Q5: How does z-index and stacking context work?**
**A:** `z-index` only works on positioned or flex/grid children. A stacking context is a group whose children are painted together. Contexts are created by `position + z-index`, `opacity < 1`, `transform`, `will-change`, etc.
```css
.modal-overlay { position: fixed; z-index: 100; }
.modal-dialog  { position: relative; z-index: 101; }

/* transform creates a new stacking context */
.card { transform: translateZ(0); z-index: 1; }
```

**Q6: What are the core Flexbox properties?**
**A:** On the container: `display: flex`, `flex-direction`, `justify-content`, `align-items`, `flex-wrap`, `gap`. On children: `flex` (shorthand for `grow shrink basis`), `align-self`, `order`.
```css
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.item { flex: 1 1 200px; }
```

**Q7: What is the difference between `justify-content` and `align-items` in Flexbox?**
**A:** `justify-content` distributes items along the main axis (row direction for `flex-direction: row`). `align-items` aligns items along the cross axis (column direction for `flex-direction: row`).
```css
.flex-center {
  display: flex;
  justify-content: center; /* horizontal */
  align-items: center;     /* vertical */
  height: 100vh;
}
```

**Q8: What are the essential CSS Grid container properties?**
**A:** `display: grid`, `grid-template-columns`, `grid-template-rows`, `gap`, `grid-template-areas`, `justify-items`, and `align-items`. Children are placed with `grid-column`, `grid-row`, or `grid-area`.
```css
.layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
}
```

**Q9: How do CSS custom properties (`--var`) work?**
**A:** Custom properties (CSS variables) are defined with a `--name` syntax and accessed via `var(--name, fallback)`. They cascade and inherit like normal properties and can be updated via JavaScript or at-rules.
```css
:root {
  --color-primary: #0073aa;
  --spacing-md: 1rem;
}
.button {
  background: var(--color-primary);
  padding: var(--spacing-md) calc(var(--spacing-md) * 2);
}
```

**Q10: How is CSS specificity calculated?**
**A:** Specificity is a four-part score (inline, ID, class/attr/pseudo-class, element/pseudo-element). A higher score wins regardless of source order. `!important` overrides all scores.
```css
/* Specificity: 0-0-0-1 */  p { color: black; }
/* Specificity: 0-0-1-0 */  .text { color: blue; }
/* Specificity: 0-1-0-0 */  #title { color: red; }
/* Wins regardless */        p { color: green !important; }
```

**Q11: What is the difference between pseudo-classes and pseudo-elements?**
**A:** Pseudo-classes (`:hover`, `:focus`, `:nth-child`) select elements in a specific state. Pseudo-elements (`::before`, `::after`, `::first-line`) style a specific part of an element's content.
```css
a:hover         { color: blue; }          /* state-based */
p::first-line   { font-weight: bold; }    /* part of content */
.icon::before   { content: '★'; margin-right: .25em; }
```

**Q12: How do CSS transitions work?**
**A:** `transition` animates a property change over a duration when triggered by a state change (e.g. `:hover`). Specify property, duration, timing function, and optional delay.
```css
.btn {
  background: #0073aa;
  transition: background 0.3s ease, transform 0.2s ease;
}
.btn:hover {
  background: #005177;
  transform: translateY(-2px);
}
```

**Q13: How do `@keyframes` animations work?**
**A:** `@keyframes` defines an animation sequence with named waypoints (percentages or `from`/`to`). Apply with `animation` shorthand specifying name, duration, timing, iteration, and fill mode.
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.card {
  animation: fadeInUp 0.4s ease forwards;
}
```

**Q14: How do CSS `transform` functions work?**
**A:** `transform` applies 2D/3D geometric operations without affecting layout. Common functions: `translate(x, y)`, `scale(n)`, `rotate(deg)`, `skew(x, y)`. Combine multiple transforms in a single `transform` property.
```css
.card:hover {
  transform: translateY(-4px) scale(1.02) rotate(1deg);
  transition: transform 0.3s ease;
}
```

**Q15: How do media queries enable responsive design?**
**A:** Media queries apply CSS rules only when conditions match (viewport width, orientation, resolution). Use `min-width` for mobile-first, `max-width` for desktop-first breakpoints.
```css
/* Mobile-first base */
.grid { display: block; }

/* Tablet and up */
@media (min-width: 768px)  { .grid { display: grid; grid-template-columns: 1fr 1fr; } }

/* Desktop */
@media (min-width: 1200px) { .grid { grid-template-columns: repeat(3, 1fr); } }
```

**Q16: What is the `gap` property in Flexbox and Grid?**
**A:** `gap` (previously `grid-gap`) sets the gutter between flex items or grid cells. It only creates space between items, not on the outer edges. Use `row-gap` or `column-gap` for independent control.
```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem 1rem; /* row-gap column-gap */
}
.flex { display: flex; gap: 1rem; }
```

**Q17: What is the `aspect-ratio` property?**
**A:** `aspect-ratio` maintains a width-to-height ratio as the element resizes, replacing the classic padding-hack for responsive embeds. Set one dimension to `auto` to let the ratio drive it.
```css
.video-embed {
  width: 100%;
  aspect-ratio: 16 / 9;
}
.avatar {
  width: 60px;
  aspect-ratio: 1;
  border-radius: 50%;
}
```

**Q18: What are CSS logical properties?**
**A:** Logical properties use start/end/inline/block axes instead of physical left/right/top/bottom, making layouts automatically adapt to right-to-left scripts and vertical writing modes.
```css
.card {
  margin-inline: auto;          /* margin-left + margin-right */
  padding-block: 1rem;          /* padding-top + padding-bottom */
  border-inline-start: 4px solid var(--color-primary);
  text-align: start;            /* left in LTR, right in RTL */
}
```

**Q19: What is BEM methodology?**
**A:** BEM (Block__Element--Modifier) is a CSS naming convention that creates self-documenting, collision-free class names. Blocks are standalone components, Elements are children, Modifiers are variants.
```css
/* Block */       .card { }
/* Element */     .card__title { }
/* Element */     .card__body  { }
/* Modifier */    .card--featured { border: 2px solid gold; }
/* Elem + Mod */  .card__title--large { font-size: 1.5rem; }
```

**Q20: What is the `will-change` property and when should you use it?**
**A:** `will-change` hints to the browser to promote an element to its own compositor layer before an animation starts, avoiding a janky first frame. Use sparingly — overuse wastes GPU memory.
```css
.drawer {
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  will-change: transform; /* promote to GPU layer */
}
.drawer.open { transform: translateX(0); }
```

---

## Mid

**Q21: What is the difference between Flexbox and CSS Grid?**
**A:** Flexbox is one-dimensional — it lays items out in a single row or column and lets content size drive the layout. Grid is two-dimensional — you define explicit tracks for both axes, making it ideal for full-page layouts.
```css
/* Flexbox: nav items in a row */
.nav { display: flex; gap: 1rem; align-items: center; }

/* Grid: two-column page layout */
.page { display: grid; grid-template-columns: 250px 1fr; gap: 2rem; }
```

**Q22: How does `grid-template-areas` work?**
**A:** It assigns string names to grid regions; children reference a name with `grid-area`. The ASCII-art syntax makes the layout visually obvious in source code.
```css
.layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-areas: "header header" "sidebar main" "footer footer";
}
.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

**Q23: What is the `fr` unit in CSS Grid?**
**A:** `fr` is a fractional unit representing a share of available space after fixed and auto tracks are resolved. `1fr` takes one share; `2fr` takes two shares of the remaining space.
```css
.grid {
  display: grid;
  /* fixed 200px, then remaining split 1:2 */
  grid-template-columns: 200px 1fr 2fr;
  gap: 1rem;
}
```

**Q24: How does `clamp()` enable fluid typography?**
**A:** `clamp(min, preferred, max)` returns the preferred value clamped between min and max. Using `vw` as the preferred value creates type that scales with the viewport within safe bounds.
```css
:root {
  --font-size-body:    clamp(1rem,    2vw, 1.25rem);
  --font-size-heading: clamp(1.75rem, 5vw, 3.5rem);
}
h1 { font-size: var(--font-size-heading); }
p  { font-size: var(--font-size-body); }
```

**Q25: What are container queries (`@container`) and how do they differ from media queries?**
**A:** Container queries apply styles based on the size of a parent container rather than the viewport. They enable truly component-scoped responsiveness when the same component appears in different layout contexts.
```css
.card-wrapper { container-type: inline-size; container-name: card; }

@container card (min-width: 400px) {
  .card { display: flex; gap: 1rem; }
  .card__image { width: 150px; flex-shrink: 0; }
}
```

**Q26: What are `@layer` cascade layers and why are they useful?**
**A:** `@layer` lets you explicitly define the cascade order of style groups, making it easy to manage specificity conflicts between resets, third-party styles, and custom code without resorting to `!important`.
```css
@layer reset, base, components, utilities;

@layer reset    { *, *::before, *::after { box-sizing: border-box; } }
@layer base     { body { font-family: sans-serif; } }
@layer components { .btn { padding: .5em 1em; border-radius: .25em; } }
@layer utilities  { .mt-auto { margin-top: auto !important; } }
```

**Q27: How does the `:has()` selector work?**
**A:** `:has()` is a relational pseudo-class that selects a parent based on whether it contains a matching child — effectively a "parent selector". It enables powerful context-dependent styling without JavaScript.
```css
/* Card that contains an image gets a different layout */
.card:has(img) { display: grid; grid-template-columns: 1fr 2fr; }

/* Label that precedes a required input */
label:has(+ input:required)::after { content: ' *'; color: red; }
```

**Q28: What are GPU-composited properties and why do they matter for performance?**
**A:** `transform` and `opacity` are composited by the GPU without triggering layout or paint — they produce the smoothest animations. Avoid animating `width`, `height`, `margin`, `top`/`left` as they trigger expensive reflows.
```css
/* BAD: triggers layout reflow on every frame */
.bad  { transition: width 0.3s, margin-top 0.3s; }

/* GOOD: GPU-composited, no layout/paint */
.good { transition: transform 0.3s, opacity 0.3s; }
.good:hover { transform: translateY(-4px); opacity: 0.9; }
```

**Q29: How does the `contain` property improve rendering performance?**
**A:** `contain` tells the browser that an element's subtree is independent, allowing it to skip layout, paint, or style recalculation of the containing element when only its children change.
```css
.feed-item {
  contain: layout paint; /* changes inside won't affect outside layout */
}
.widget {
  contain: strict; /* layout + paint + size + style isolation */
}
```

**Q30: What are CSS `scroll-snap` properties and how do you use them?**
**A:** `scroll-snap-type` on the container defines the snap axis and strictness. `scroll-snap-align` on children defines their snap point. Together they create smooth, predictable scroll carousels without JavaScript.
```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
}
.slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
}
```

**Q31: What is `overscroll-behavior` and when would you use it?**
**A:** `overscroll-behavior` controls what happens when scrolling reaches the edge of a container. Set `contain` to prevent the page from scrolling when a modal or sidebar scroll area reaches its boundary.
```css
.modal-body {
  overflow-y: auto;
  overscroll-behavior: contain; /* prevents scroll chaining to page */
  max-height: 60vh;
}
```

**Q32: What is CSS Houdini and what APIs does it expose?**
**A:** Houdini is a set of low-level CSS APIs that let JavaScript plug into the browser's rendering pipeline. Key APIs: Paint Worklet (custom `background`/`border` rendering), Layout Worklet, Typed OM, and Properties & Values API.
```js
// Register a typed custom property (Properties & Values API)
CSS.registerProperty({
  name: '--highlight-color',
  syntax: '<color>',
  inherits: false,
  initialValue: 'transparent',
});
// Now transitions on --highlight-color work!
```

**Q33: How do you create a custom scrollbar with CSS?**
**A:** Use `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, and `::-webkit-scrollbar-thumb` for Chrome/Safari. Use `scrollbar-width` and `scrollbar-color` for Firefox (the standard approach).
```css
/* Standard (Firefox) */
.scroll-area { scrollbar-width: thin; scrollbar-color: #888 #f1f1f1; }

/* WebKit (Chrome/Safari) */
.scroll-area::-webkit-scrollbar       { width: 6px; }
.scroll-area::-webkit-scrollbar-track { background: #f1f1f1; }
.scroll-area::-webkit-scrollbar-thumb { background: #888; border-radius: 3px; }
```

**Q34: What are print styles and how do you write them?**
**A:** Print styles in a `@media print` block or a `<link media="print">` stylesheet hide navigation, adjust colors, ensure links show their URLs, and force page breaks at logical points.
```css
@media print {
  .nav, .sidebar, .ads { display: none !important; }
  body { color: #000; background: #fff; font-size: 12pt; }
  a[href]::after { content: ' (' attr(href) ')'; }
  h2, h3 { page-break-after: avoid; }
  .page-break { page-break-before: always; }
}
```

**Q35: How do `color-mix()` and `oklch()` improve color management?**
**A:** `oklch()` uses a perceptually uniform color space so equal lightness changes look equal visually — ideal for generating color scales. `color-mix()` blends two colors in any color space without JavaScript.
```css
:root {
  --brand: oklch(55% 0.18 230);         /* perceptually uniform */
  --brand-light: oklch(75% 0.14 230);
  --brand-mixed: color-mix(in oklch, var(--brand) 70%, white);
}
.button { background: var(--brand); }
.button:hover { background: var(--brand-mixed); }
```

**Q36: What is CSS subgrid and when do you use it?**
**A:** `subgrid` lets a grid item adopt its parent's track definitions for its own children, enabling columns/rows to align across nested elements without duplicating track definitions.
```css
.parent {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.child {
  grid-column: span 3;
  display: grid;
  grid-template-columns: subgrid; /* uses parent's 3-column tracks */
}
```

**Q37: How do CSS Modules work conceptually?**
**A:** CSS Modules scope class names locally by default: the build tool generates unique hashed names, preventing collisions. You import the class map in JavaScript and reference names as object properties.
```css
/* Button.module.css */
.button { padding: .5em 1em; border-radius: .25em; }
.button--primary { background: var(--color-primary); color: #fff; }
```
```js
import styles from './Button.module.css';
element.className = styles['button--primary']; // becomes e.g. "button--primary_a3f2"
```

**Q38: How do you implement dark mode with CSS custom properties?**
**A:** Define colour tokens in `:root`, then override them inside a `prefers-color-scheme: dark` media query or a `[data-theme="dark"]` attribute. Components reference the tokens and update automatically.
```css
:root { --bg: #fff; --text: #111; --surface: #f5f5f5; }

@media (prefers-color-scheme: dark) {
  :root { --bg: #111; --text: #f0f0f0; --surface: #1e1e1e; }
}
body { background: var(--bg); color: var(--text); }
```

**Q39: What is the cascade and how does it determine which rule wins?**
**A:** The cascade resolves conflicts in this order: origin + importance (user-agent → user → author, `!important` reverses) → specificity → source order. `@layer` adds a pre-specificity ordering step.
```css
/* Source order: last rule wins for equal specificity */
.btn { color: blue; }
.btn { color: red; } /* wins — same specificity, later in source */

/* @layer: utilities layer wins regardless of order in source */
@layer base       { .btn { color: blue; } }
@layer utilities  { .btn { color: red;  } } /* wins — higher layer */
```

**Q40: How do CSS logical properties help with RTL internationalization?**
**A:** Replacing physical properties (`left`, `right`, `margin-left`) with logical equivalents (`inline-start`, `inline-end`, `margin-inline-start`) means the layout flips automatically for RTL languages without extra CSS.
```css
.breadcrumb-separator::after {
  content: '›';
  margin-inline: 0.5rem; /* flips to right side in RTL */
}
.input {
  padding-inline-start: 2.5rem; /* icon space, adapts to RTL */
  border-inline-start: 2px solid var(--color-primary);
}
```

---

## Advanced

**Q41: How do you build a fully responsive layout using CSS Grid `minmax()` and `auto-fill`?**
**A:** Combine `repeat(auto-fill, minmax(min, 1fr))` to create a grid that automatically adds or removes columns based on available space without any media queries — a truly intrinsic layout.
```css
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 1.5rem;
}
/* Cards reflow from 1 column on mobile to N columns on wide screens */
```

**Q42: How do you animate with `@keyframes` using the `animation-timeline` and scroll-driven animations?**
**A:** CSS Scroll-Driven Animations (Chrome 115+) link an animation's progress to scroll position via `animation-timeline: scroll()` or `view()`, enabling parallax and reveal effects with zero JavaScript.
```css
@keyframes reveal {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
.reveal-on-scroll {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 40%;
}
```

**Q43: How do you implement a performant sticky sidebar with CSS only?**
**A:** Use `position: sticky` on the sidebar with `top` offset and `align-self: start` on the grid child so it sticks to the top of its column without overflowing the parent grid row.
```css
.layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
  align-items: start;
}
.sidebar {
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}
```

**Q44: How do you use the CSS Paint API (Houdini) to create a custom border effect?**
**A:** Register a Paint Worklet that draws to a canvas-like context; use it as a `background` or `border-image`. This moves the rendering to the GPU thread and keeps the effect fully CSS-driven.
```js
// paint-worklet.js
registerPaint('dotted-border', class {
  paint(ctx, size) {
    ctx.strokeStyle = '#0073aa';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(0, 0, size.width, size.height);
  }
});
```
```css
.box { background: paint(dotted-border); }
```

**Q45: How do you handle CSS specificity conflicts in a large design system using `@layer`?**
**A:** Declare layers in ascending priority order at the top of your stylesheet. Lower-layer styles never override higher-layer styles regardless of specificity, making `!important` unnecessary in component code.
```css
@layer tokens, reset, base, components, patterns, utilities;

@layer tokens     { :root { --color-primary: #0073aa; } }
@layer reset      { * { margin: 0; padding: 0; box-sizing: border-box; } }
@layer components { .btn { background: var(--color-primary); } }
@layer utilities  { .hidden { display: none; } } /* always wins */
```

**Q46: How do you create a fluid type scale using `clamp()` and CSS custom properties?**
**A:** Define a scale of custom properties using `clamp()` with viewport units for the preferred value. Each step grows proportionally, giving harmonious type that is responsive across all viewport sizes.
```css
:root {
  --step-0: clamp(1rem,    0.96rem + 0.22vw, 1.125rem);
  --step-1: clamp(1.25rem, 1.19rem + 0.33vw, 1.5rem);
  --step-2: clamp(1.56rem, 1.46rem + 0.52vw, 2rem);
  --step-3: clamp(1.95rem, 1.80rem + 0.78vw, 2.66rem);
}
h1 { font-size: var(--step-3); }
h2 { font-size: var(--step-2); }
```

**Q47: How do you implement CSS-only dark/light mode with a toggle?**
**A:** Store the preference in a `data-theme` attribute on `<html>` and override custom property tokens inside `[data-theme="dark"]`. Toggle the attribute via JavaScript; CSS handles all visual changes.
```css
:root        { --bg: #fff; --text: #111; }
[data-theme="dark"] { --bg: #111; --text: #f0f0f0; }
body { background: var(--bg); color: var(--text); transition: background .3s, color .3s; }
```
```js
const root = document.documentElement;
document.getElementById('toggle').addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
});
```

**Q48: How does the `content-visibility: auto` property improve rendering performance?**
**A:** `content-visibility: auto` skips rendering (layout + paint) of off-screen sections entirely. The browser still reserves space via `contain-intrinsic-size` to prevent scrollbar jumps, dramatically reducing initial page render time.
```css
.article-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* estimated height for scrollbar accuracy */
}
```

**Q49: How do you use CSS Grid for a masonry-like layout today?**
**A:** True CSS masonry is behind a flag (`masonry` value for `grid-template-rows`). As a fallback, use CSS columns or a JavaScript approach. For native, use `grid-template-rows: masonry` where supported.
```css
/* Native masonry (Chrome Origin Trial / Firefox flag) */
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-template-rows: masonry;
  gap: 1rem;
}

/* Fallback using CSS columns */
.masonry-fallback { columns: 3 250px; gap: 1rem; }
.masonry-fallback > * { break-inside: avoid; margin-bottom: 1rem; }
```

**Q50: How do you use `@property` to animate CSS custom properties?**
**A:** By default custom properties cannot be transitioned because the browser treats them as opaque strings. `@property` registers a typed property with a syntax, enabling the browser to interpolate its value during transitions.
```css
@property --progress {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}
.progress-ring {
  --progress: 0;
  background: conic-gradient(#0073aa calc(var(--progress) * 1%), #eee 0%);
  transition: --progress 0.6s ease;
}
.progress-ring.loaded { --progress: 75; }
```
