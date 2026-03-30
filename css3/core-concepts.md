# CSS3 — Core Concepts

## 1. Box Model
Every element is a rectangular box: content → padding → border → margin. `box-sizing: border-box` includes padding and border in the element's width (modern standard). `box-sizing: content-box` (default) adds padding/border outside the width. WordPress themes set `*, *::before, *::after { box-sizing: border-box }`.

## 2. Flexbox
One-dimensional layout (row or column). Key properties: `display: flex`, `flex-direction`, `justify-content` (main axis alignment), `align-items` (cross axis alignment), `flex-wrap`, `gap`. Child properties: `flex-grow`, `flex-shrink`, `flex-basis`, `order`, `align-self`. Best for navigation bars, card rows, centering.

## 3. CSS Grid
Two-dimensional layout (rows and columns simultaneously). `display: grid`, `grid-template-columns`, `grid-template-rows`, `gap`, `grid-area`. `fr` unit distributes free space. `repeat()`, `minmax()`, `auto-fill`/`auto-fit` for responsive grids. Gutenberg's block editor uses Grid for layout.

## 4. Custom Properties (CSS Variables)
`--variable-name: value` defined on `:root` (or any element). Used with `var(--variable-name, fallback)`. Can be updated with JavaScript. Scoped to DOM tree. WordPress Full Site Editing uses CSS variables extensively for theme colors, spacing, and typography. Better than Sass variables as they work at runtime.

## 5. Specificity & Cascade
Specificity order: inline styles (1,0,0,0) > id (0,1,0,0) > class/attribute/pseudo-class (0,0,1,0) > element/pseudo-element (0,0,0,1). `!important` overrides all. Cascade also considers origin (author > user > browser) and order (later rules win on equal specificity).

## 6. Pseudo-classes & Pseudo-elements
Pseudo-classes target element states: `:hover`, `:focus`, `:active`, `:visited`, `:nth-child()`, `:first-child`, `:not()`, `:is()`, `:where()`, `:has()`. Pseudo-elements create virtual elements: `::before`, `::after`, `::placeholder`, `::selection`, `::first-line`, `::first-letter`.

## 7. Transitions & Animations
`transition: property duration timing-function delay` — smooth change between two states. `animation: name duration timing iteration direction` with `@keyframes` — multi-step, repeating animations. Use `transform` and `opacity` for performant animations (GPU-composited, no layout reflow). Avoid animating `width`, `height`, `margin`.

## 8. Responsive Design & Media Queries
`@media (min-width: 768px) { }` — mobile-first breakpoints. Modern: `@container` queries — respond to parent container size, not viewport. `clamp(min, preferred, max)` for fluid typography. `aspect-ratio` for responsive embeds. WordPress block themes use `@media` in `theme.json` generated CSS.

## 9. CSS Specificity & BEM
BEM (Block__Element--Modifier) naming convention keeps specificity flat (all single-class selectors): `.card`, `.card__title`, `.card--featured`. Avoids deep nesting and specificity wars. Used in WordPress themes (Twenty Twenty themes use BEM-like naming).

## 10. Modern CSS Features
Container queries (`@container`), `:has()` selector, `@layer` cascade layers, `color-mix()`, `accent-color`, `aspect-ratio`, `gap` in flexbox, logical properties (`margin-inline`, `padding-block`), `subgrid`. WordPress 6.x leverages many of these in block editor styles.
