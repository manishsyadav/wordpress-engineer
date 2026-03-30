# SASS / SCSS — Interview Questions

## Basic

**Q: What is the difference between SCSS and SASS?**
**A:** Both are CSS preprocessors. SCSS uses CSS-compatible syntax (curly braces, semicolons) — any valid CSS is valid SCSS. SASS uses indentation-based syntax (no braces/semicolons), more concise but less familiar to CSS developers. SCSS is more popular in WordPress development. Both compile to CSS.

**Q: What are SCSS partials and why are they used?**
**A:** Files prefixed with `_` (e.g., `_variables.scss`, `_buttons.scss`). Not compiled to standalone CSS files — only included via `@use` or `@forward`. Allow splitting CSS into logical, maintainable modules: variables, typography, layout, components. Keeps each file small and focused.

**Q: What is the difference between `@mixin` and `@extend`?**
**A:** `@mixin` inlines the CSS at each include point — output has repeated declarations but works inside `@media`. `@extend` groups selectors in output (no duplication) but cannot be used inside `@media` blocks and can cause unexpected selector coupling. Use mixins for parametrized styles; `%placeholder` + `@extend` for shared static styles.

**Q: What is `$` vs `--` (CSS variable)?**
**A:** `$sass-variable` is compile-time — resolved to a static value in the output CSS, cannot change after compilation, not accessible to JavaScript. `--css-variable` is runtime — can be updated via JavaScript, changed in media queries, scoped to DOM elements. Modern approach: use SCSS variables to set CSS custom property values at build time.

**Q: How do you nest selectors in SCSS?**
**A:** Write child selectors inside parent: `.card { color: red; .title { font-weight: bold; } }` compiles to `.card { } .card .title { }`. Use `&` for parent reference: `.btn { &:hover { } &--primary { } &.is-active { } }`. Avoid nesting deeper than 3 levels to keep specificity low.

## Mid

**Q: How do you create a responsive mixin for breakpoints?**
**A:** Define breakpoints in a map, create a mixin that generates `@media` queries:
```scss
$breakpoints: (sm: 576px, md: 768px, lg: 1024px, xl: 1280px);

@mixin respond-to($bp) {
  @media (min-width: map-get($breakpoints, $bp)) { @content; }
}

// Usage:
.card { width: 100%; @include respond-to(md) { width: 50%; } }
```

**Q: What is the `@use` module system and how does it differ from `@import`?**
**A:** `@use 'path/file'` creates a namespace — variables/mixins accessed as `file.$var`, `file.mixin()`. Prevents global namespace pollution. Each file is only loaded once. `@import` (deprecated) pollutes global namespace — all variables/mixins available everywhere, loaded multiple times. Modern SCSS uses `@use` + `@forward` for module composition.

**Q: How do you generate utility classes with SCSS loops?**
**A:** Use `@each` over a map to generate classes programmatically:
```scss
$spacings: (1: 0.25rem, 2: 0.5rem, 3: 1rem, 4: 1.5rem, 5: 2rem);
@each $key, $value in $spacings {
  .mt-#{$key} { margin-top: $value; }
  .mb-#{$key} { margin-bottom: $value; }
  .p-#{$key}  { padding: $value; }
}
```

**Q: How do you handle dark mode in SCSS?**
**A:**
```scss
$colors: (
  light: (bg: #ffffff, text: #2d3748),
  dark:  (bg: #1a202c, text: #f7fafc),
);
@each $theme, $palette in $colors {
  [data-theme="#{$theme}"] {
    --color-bg:   #{map-get($palette, bg)};
    --color-text: #{map-get($palette, text)};
  }
}
// Or use prefers-color-scheme media query
@media (prefers-color-scheme: dark) { ... }
```

**Q: What is the 7-1 SCSS architecture pattern?**
**A:** 7 folders + 1 main file: `abstracts/` (variables, mixins, functions), `base/` (reset, typography), `layout/` (grid, header, footer), `components/` (buttons, cards, forms), `pages/` (page-specific styles), `themes/` (theme variations), `vendors/` (third-party overrides). `main.scss` imports all partials. Keeps code organized as projects grow.

## Advanced

**Q: How do you set up SCSS compilation in a WordPress theme?**
**A:** Use npm with sass package: `npm install -D sass`. Add npm scripts: `"sass": "sass src/scss:dist/css --style=compressed --watch"`. Or use gulp/webpack with `sass-loader`. In WordPress: enqueue the compiled CSS file, never the SCSS. Commit compiled CSS to repo or build in CI/CD pipeline. Source maps (`--source-map`) help debug in browser DevTools.

**Q: How do you use SCSS to implement a design token system?**
**A:** Define all tokens in `_tokens.scss`, output them as both SCSS variables AND CSS custom properties:
```scss
$colors: (primary: #0d7377, secondary: #1e3a5f);
:root {
  @each $name, $value in $colors {
    --color-#{$name}: #{$value};
  }
}
// SCSS variable for compile-time use:
$color-primary: map-get($colors, primary);
// CSS variable for runtime use:
// color: var(--color-primary);
```

**Q: How do you prevent SCSS from generating too much CSS?**
**A:** Avoid `@extend` with concrete classes (creates combinatorial selector explosion). Use `%placeholders` instead. Don't nest deeply. Use loops carefully — generating 100 utility classes for unused values. Audit with PurgeCSS or postcss-purgecss to remove unused selectors. Split CSS by route and load conditionally.
