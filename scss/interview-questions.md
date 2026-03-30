# SCSS / SASS — Interview Questions

> **50 questions** · Basic (20) · Mid (20) · Advanced (10)
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is the difference between SCSS and SASS syntax?**
**A:** SCSS uses curly braces and semicolons — any valid CSS is valid SCSS. SASS uses indentation-based syntax with no braces/semicolons. SCSS is more widely adopted as it's easier to adopt from existing CSS.
```scss
// SCSS
.card { color: red; &:hover { color: blue; } }

// SASS
.card
  color: red
  &:hover
    color: blue
```

**Q2: How do you define and use variables in SCSS?**
**A:** Variables are prefixed with `$`. They're resolved at compile time — the output CSS has static values, not variable references.
```scss
$color-primary: #0d7377;
$font-size-base: 1rem;
$spacing: 1rem;

.btn { background: $color-primary; font-size: $font-size-base; padding: $spacing; }
```

**Q3: How does nesting work in SCSS?**
**A:** Write child selectors inside parent selectors. Use `&` to reference the parent selector for pseudo-classes, modifiers, and state classes. Avoid nesting deeper than 3 levels.
```scss
.nav {
  display: flex;
  &__item { padding: 0.5rem; }          // .nav__item
  &--dark { background: #1a1a2e; }       // .nav--dark
  &:hover { opacity: 0.9; }              // .nav:hover
  a { color: inherit; text-decoration: none; } // .nav a
}
```

**Q4: What are SCSS partials and how do you use them?**
**A:** Files prefixed with `_` (e.g., `_variables.scss`) are partials — not compiled to standalone CSS. Imported via `@use` or `@forward`. They split code into logical modules.
```
src/scss/
├── _variables.scss
├── _mixins.scss
├── _buttons.scss
└── style.scss       ← main file: @use 'variables'; @use 'mixins'; @use 'buttons';
```

**Q5: What is the difference between `@use` and `@import`?**
**A:** `@use` creates a namespace — variables/mixins accessed as `file.$var`. Each file loaded once. `@import` (deprecated) pollutes the global namespace and loads files multiple times, causing duplication.
```scss
// @use — namespaced
@use 'variables' as vars;
.btn { color: vars.$color-primary; }

// @import — deprecated (global namespace)
@import 'variables';
.btn { color: $color-primary; }
```

**Q6: How do you write a basic mixin?**
**A:** Mixins are reusable CSS blocks defined with `@mixin` and included with `@include`. They can accept parameters with optional default values.
```scss
@mixin flex-center($direction: row) {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: $direction;
}

.hero    { @include flex-center; }
.sidebar { @include flex-center(column); }
```

**Q7: What is string interpolation in SCSS?**
**A:** `#{}` injects a variable's value into a selector, property name, or string. Required when using variables in places where SCSS can't evaluate them directly.
```scss
$side: 'left';
$theme: 'dark';

.border-#{$side}    { border-left: 2px solid; }
[data-theme="#{$theme}"] { background: #1a1a2e; }

@each $size in sm, md, lg {
  .text-#{$size} { font-size: map-get($sizes, $size); }
}
```

**Q8: What is the SCSS `@extend` directive?**
**A:** `@extend` shares CSS rules between selectors — the output groups selectors instead of duplicating declarations. Use `%placeholder` selectors to avoid extending concrete classes.
```scss
%btn-base {
  display: inline-flex; padding: 0.5rem 1rem;
  border-radius: 4px; cursor: pointer;
}

.btn-primary { @extend %btn-base; background: #0d7377; color: #fff; }
.btn-outline  { @extend %btn-base; border: 2px solid #0d7377; }
// Output: .btn-primary, .btn-outline { display: inline-flex; ... }
```

**Q9: How does `@each` work in SCSS?**
**A:** Iterates over a list or map to generate repeated CSS. Great for utilities, color variants, and spacing scales.
```scss
$colors: (primary: #0d7377, danger: #e53e3e, success: #38a169);

@each $name, $value in $colors {
  .text-#{$name}   { color: $value; }
  .bg-#{$name}     { background-color: $value; }
  .border-#{$name} { border-color: $value; }
}
```

**Q10: How does `@for` work in SCSS?**
**A:** Loops a numeric range. `through` includes the end value; `to` excludes it. Used for generating grid columns, spacing utilities, and z-index scales.
```scss
@for $i from 1 through 12 {
  .col-#{$i} { width: percentage($i / 12); }
}

@for $i from 1 through 5 {
  .mt-#{$i} { margin-top: #{$i * 0.25}rem; }
}
```

**Q11: What is a SCSS map and how do you access values?**
**A:** Maps are key-value data structures. Access with `map.get($map, key)` or the legacy `map-get($map, key)`. Iterate with `@each`.
```scss
@use 'sass:map';

$breakpoints: (sm: 576px, md: 768px, lg: 1024px, xl: 1280px);

.container {
  width: 100%;
  @media (min-width: map.get($breakpoints, md)) { max-width: 768px; }
  @media (min-width: map.get($breakpoints, lg)) { max-width: 1024px; }
}
```

**Q12: How do you define a SCSS function?**
**A:** Functions return computed values using `@function` and `@return`. Used for calculations, color manipulation, and unit conversions.
```scss
@use 'sass:math';

@function rem($px, $base: 16) {
  @return math.div($px, $base) * 1rem;
}

@function z($layer) {
  $layers: (base: 1, dropdown: 100, modal: 200, toast: 300);
  @return map-get($layers, $layer);
}

.modal { font-size: rem(14); z-index: z(modal); }
```

**Q13: What is the `@if` / `@else` directive?**
**A:** Conditional logic in SCSS — controls which CSS is output based on variable values. Useful inside mixins to handle variants.
```scss
@mixin theme-bg($theme) {
  @if $theme == 'dark' {
    background: #1a1a2e; color: #e2e8f0;
  } @else if $theme == 'light' {
    background: #ffffff; color: #2d3748;
  } @else {
    @warn "Unknown theme: #{$theme}";
  }
}

body.dark  { @include theme-bg('dark'); }
body.light { @include theme-bg('light'); }
```

**Q14: What are SCSS color functions?**
**A:** Built-in functions to manipulate colors: `darken/lighten` (adjust lightness), `mix` (blend two colors), `rgba` (add transparency), `adjust-color` (adjust any channel precisely).
```scss
@use 'sass:color';

$primary: #0d7377;

.btn {
  background: $primary;
  &:hover  { background: color.adjust($primary, $lightness: -10%); }
  &:active { background: color.mix($primary, black, 80%); }
  &.ghost  { color: $primary; background: rgba($primary, 0.1); }
}
```

**Q15: What does `@forward` do?**
**A:** Re-exports members (variables, mixins, functions) from a partial so consuming files get everything through a single entry point. Works with `@use`.
```scss
// _index.scss (barrel file)
@forward 'variables';
@forward 'mixins';
@forward 'functions';

// In another file — get everything at once
@use 'abstracts' as *;
.btn { background: $color-primary; @include flex-center; }
```

**Q16: What is the 7-1 SCSS architecture pattern?**
**A:** 7 folders + 1 main file. Organises SCSS into: `abstracts/` (variables/mixins/functions), `base/` (reset/typography), `layout/` (grid/header/footer), `components/` (buttons/cards), `pages/` (page-specific), `themes/` (dark/light), `vendors/` (third-party). `main.scss` imports all.
```
scss/
├── abstracts/ (_variables, _mixins, _functions)
├── base/      (_reset, _typography, _base)
├── layout/    (_grid, _header, _footer, _sidebar)
├── components/(_buttons, _cards, _forms, _nav)
├── pages/     (_home, _contact, _blog)
├── themes/    (_dark, _light)
├── vendors/   (_normalize)
└── main.scss  ← @use all partials
```

**Q17: How do you generate CSS custom properties from a SCSS map?**
**A:** Use `@each` inside `:root` to output CSS variables from a map. Gives you SCSS-authored values available at runtime.
```scss
$tokens: (
  color-primary:   #0d7377,
  color-secondary: #1e3a5f,
  space-1: 0.25rem,
  space-2: 0.5rem,
  space-4: 1rem,
);

:root {
  @each $name, $value in $tokens {
    --#{$name}: #{$value};
  }
}
// Output: --color-primary: #0d7377; --space-1: 0.25rem; etc.
```

**Q18: How do you set up SCSS compilation with npm?**
**A:** Install the `sass` package and add scripts to `package.json`. For WordPress themes, compile to `style.css` in the theme root.
```json
{
  "devDependencies": { "sass": "^1.70.0" },
  "scripts": {
    "sass":       "sass src/scss/style.scss style.css --style=expanded --source-map",
    "sass:watch": "sass src/scss/style.scss style.css --watch --no-source-map",
    "sass:build": "sass src/scss/style.scss style.min.css --style=compressed"
  }
}
```

**Q19: What is a responsive mixin pattern in SCSS?**
**A:** Define breakpoints in a map and a mixin that generates `@media` queries. Mobile-first: use `min-width`. Consistent breakpoints across the codebase.
```scss
$breakpoints: (sm: 576px, md: 768px, lg: 1024px, xl: 1280px);

@mixin respond($bp) {
  @media (min-width: map-get($breakpoints, $bp)) { @content; }
}

.card {
  width: 100%;
  @include respond(md) { width: 50%; }
  @include respond(lg) { width: 33.333%; }
}
```

**Q20: What is SCSS `@warn` and `@error`?**
**A:** `@warn` outputs a warning during compilation without stopping it. `@error` stops compilation with an error message. Use them for defensive mixin/function validation.
```scss
@function get-color($name) {
  @if not map-has-key($colors, $name) {
    @error "Color '#{$name}' not found in $colors map.";
  }
  @return map-get($colors, $name);
}

@mixin deprecated($replacement) {
  @warn "This mixin is deprecated. Use #{$replacement} instead.";
  @content;
}
```

---

## Mid

**Q21: What is the difference between `@mixin` and `%placeholder` + `@extend`?**
**A:** Mixins duplicate CSS at each `@include` point (works inside `@media`). `%placeholder` + `@extend` groups selectors (no duplication, smaller output) but can't be used inside `@media` blocks. Use mixins for parametrized/responsive styles; `%placeholder` for shared static styles.
```scss
// Mixin: duplicated output, works anywhere
@mixin card-shadow { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.card  { @include card-shadow; }
.modal { @include card-shadow; }

// Placeholder: grouped output, no duplication
%card-shadow { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.card  { @extend %card-shadow; }
.modal { @extend %card-shadow; }
// Output: .card, .modal { box-shadow: ... }
```

**Q22: How do you implement dark mode with SCSS?**
**A:** Define light/dark color maps, generate CSS custom properties for each, and components consume variables. Toggle via `prefers-color-scheme` or a data attribute.
```scss
$themes: (
  light: (bg: #fff, text: #2d3748, border: #e2e8f0),
  dark:  (bg: #1a202c, text: #f7fafc, border: #4a5568),
);

@each $theme, $colors in $themes {
  [data-theme="#{$theme}"] {
    @each $prop, $val in $colors { --#{$prop}: #{$val}; }
  }
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #1a202c; --text: #f7fafc; }
}
```

**Q23: How do you build a BEM component in SCSS?**
**A:** Use `&` nesting to generate BEM class names. `__` for elements, `--` for modifiers. Keeps all related styles co-located while outputting flat BEM selectors.
```scss
.card {
  background: #fff; border-radius: 8px;
  &__header  { padding: 1rem; border-bottom: 1px solid #eee; }
  &__body    { padding: 1rem; }
  &__title   { font-size: 1.25rem; font-weight: 700; }
  &__footer  { padding: 0.75rem 1rem; background: #f7fafc; }
  &--featured { border-top: 4px solid var(--color-primary); }
  &--compact &__body { padding: 0.5rem; }
}
```

**Q24: How do you create a spacing scale utility with `@each` + map?**
**A:** Define a scale map, iterate to generate margin/padding utilities. Same pattern used by Tailwind and Bootstrap 5.
```scss
$spacing: (0: 0, 1: 0.25rem, 2: 0.5rem, 3: 0.75rem, 4: 1rem, 6: 1.5rem, 8: 2rem, 12: 3rem);

@each $key, $val in $spacing {
  .m-#{$key}  { margin: $val; }
  .mt-#{$key} { margin-top: $val; }
  .mb-#{$key} { margin-bottom: $val; }
  .mx-#{$key} { margin-left: $val; margin-right: $val; }
  .my-#{$key} { margin-top: $val; margin-bottom: $val; }
  .p-#{$key}  { padding: $val; }
  .px-#{$key} { padding-left: $val; padding-right: $val; }
  .py-#{$key} { padding-top: $val; padding-bottom: $val; }
}
```

**Q25: How do you handle multiple themes/client brands in SCSS?**
**A:** Store brand tokens in a map, generate CSS custom properties per brand class/data-attribute. Components use `var(--token)` — no SCSS changes needed per brand.
```scss
$brands: (
  brand-a: (primary: #e63946, font: 'Roboto', radius: 0px),
  brand-b: (primary: #0d7377, font: 'Inter',  radius: 8px),
);

@each $brand, $tokens in $brands {
  [data-brand="#{$brand}"] {
    --color-primary: #{map-get($tokens, primary)};
    --font-family:   #{map-get($tokens, font)}, sans-serif;
    --border-radius: #{map-get($tokens, radius)};
  }
}
```

**Q26: What is the SCSS `@use` namespace and how do you control it?**
**A:** By default `@use 'path/file'` creates a namespace from the filename. Override with `as newname` or use `as *` to merge into global scope (use sparingly — defeats namespace purpose).
```scss
@use 'abstracts/variables' as vars;
@use 'abstracts/mixins'    as mix;
@use 'sass:math';          // built-in module

.btn {
  color: vars.$color-primary;
  @include mix.flex-center;
  font-size: math.div(14px, 16px) * 1rem;
}

// as * — global (avoid in large projects)
@use 'abstracts/variables' as *;
.btn { color: $color-primary; } // no namespace needed
```

**Q27: How do you add sass-loader to Webpack for WordPress blocks?**
**A:** Install `sass-loader` and `sass`, configure in `webpack.config.js`. WordPress `@wordpress/scripts` supports SCSS out of the box with zero config.
```js
// webpack.config.js (manual setup)
module.exports = {
  module: {
    rules: [{
      test: /\.scss$/,
      use: ['style-loader', 'css-loader', {
        loader: 'sass-loader',
        options: { implementation: require('sass'), sourceMap: true }
      }]
    }]
  }
};

// Or with @wordpress/scripts — zero config:
// npm install --save-dev @wordpress/scripts
// package.json: "build": "wp-scripts build", "start": "wp-scripts start"
```

**Q28: How do you implement a visually-hidden mixin for accessibility?**
**A:** Used to hide content visually while keeping it accessible to screen readers. Common for skip links, icon labels, and screen-reader-only descriptions.
```scss
@mixin visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@mixin visually-hidden-focusable {
  @include visually-hidden;
  &:active, &:focus {
    position: static;
    width: auto; height: auto;
    overflow: visible;
    clip: auto; white-space: normal;
  }
}

.screen-reader-text { @include visually-hidden-focusable; }
```

**Q29: What is ITCSS and how does it relate to SCSS architecture?**
**A:** ITCSS (Inverted Triangle CSS) orders styles from lowest to highest specificity: Settings → Tools → Generic → Elements → Objects → Components → Utilities. Prevents specificity conflicts. Maps well to 7-1 SCSS: abstracts = Settings+Tools, base = Generic+Elements, layout = Objects, components = Components, utilities = Utilities.
```
/* ITCSS layer order in main.scss */
@use 'settings/variables';   // $colors, $fonts — no CSS output
@use 'tools/mixins';         // mixins/functions — no CSS output
@use 'generic/reset';        // *, box-sizing — lowest specificity
@use 'elements/typography';  // h1, p, a — element selectors
@use 'objects/grid';         // .o-grid — layout patterns
@use 'components/card';      // .c-card — UI components
@use 'utilities/spacing';    // .u-mt-4 — !important overrides
```

**Q30: How do you lint SCSS with Stylelint?**
**A:** Stylelint with `stylelint-config-standard-scss` enforces SCSS best practices. Configure in `.stylelintrc.json` and add to npm scripts and pre-commit hooks.
```json
// .stylelintrc.json
{
  "extends": ["stylelint-config-standard-scss"],
  "rules": {
    "max-nesting-depth": 3,
    "scss/dollar-variable-pattern": "^[a-z][a-z0-9-]*$",
    "scss/at-mixin-pattern": "^[a-z][a-z0-9-]*$",
    "selector-class-pattern": "^[a-z][a-z0-9-_]*$"
  }
}
```
```json
// package.json scripts
{ "lint:scss": "stylelint 'src/scss/**/*.scss' --fix" }
```

**Q31: How do you write a button variant mixin?**
**A:** A mixin that generates all states (normal, hover, active, focus, disabled) for a button variant from a single background color argument.
```scss
@use 'sass:color';

@mixin button-variant($bg, $text: #fff) {
  background: $bg;
  color: $text;
  border: 2px solid $bg;

  &:hover  { background: color.adjust($bg, $lightness: -8%); border-color: color.adjust($bg, $lightness: -8%); }
  &:active { background: color.adjust($bg, $lightness: -15%); }
  &:focus-visible { outline: 3px solid rgba($bg, 0.4); outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
}

.btn-primary { @include button-variant(#0d7377); }
.btn-danger  { @include button-variant(#e53e3e); }
```

**Q32: How do you use `@each` with a nested map?**
**A:** Maps can be nested (map of maps). Use `map.get` inside `@each` to access nested values.
```scss
@use 'sass:map';

$type-scale: (
  sm:  (size: 0.875rem, weight: 400, line-height: 1.5),
  base:(size: 1rem,     weight: 400, line-height: 1.6),
  lg:  (size: 1.125rem, weight: 600, line-height: 1.4),
  xl:  (size: 1.5rem,   weight: 700, line-height: 1.3),
);

@each $name, $props in $type-scale {
  .text-#{$name} {
    font-size:   map.get($props, size);
    font-weight: map.get($props, weight);
    line-height: map.get($props, line-height);
  }
}
```

**Q33: How do you avoid `@extend` causing selector bloat?**
**A:** `@extend` with concrete classes creates combinatorial explosions — every selector extending `.base` is combined with every selector that `.base` matches. Use `%placeholder` instead — only extended selectors are output.
```scss
// BAD: extending a real class pollutes output
.btn { padding: 0.5rem 1rem; }
.submit { @extend .btn; background: blue; }
// Output: .btn, .submit { padding ... } — if .btn has media query contexts, multiplies

// GOOD: use %placeholder
%btn-base { padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
.btn-primary { @extend %btn-base; background: #0d7377; }
.btn-outline  { @extend %btn-base; border: 2px solid #0d7377; }
// Output: .btn-primary, .btn-outline { padding ... }
```

**Q34: How do you set up a WordPress theme with SCSS?**
**A:** Use `@wordpress/scripts` for block themes, or standalone `sass` CLI for classic themes. Compile to `style.css` (required by WordPress). Use `wp_enqueue_style` to load.
```json
// package.json — classic theme
{
  "scripts": {
    "build": "sass src/scss/style.scss:style.css --style=compressed",
    "watch": "sass src/scss/style.scss:style.css --watch"
  }
}
```
```scss
// style.scss — WordPress theme header comment required
/*!
Theme Name: My Theme
Version: 1.0.0
*/
@use 'abstracts/variables' as *;
@use 'abstracts/mixins' as *;
@use 'base/reset';
@use 'components/buttons';
```

**Q35: How do you use `@while` in SCSS?**
**A:** Loops while a condition is true. Less common than `@for` or `@each` — use when you need conditional iteration. Always ensure the condition eventually becomes false.
```scss
$i: 1;
$max-cols: 12;

@while $i <= $max-cols {
  .col-#{$i} {
    width: percentage($i / $max-cols);
    float: left;
    padding: 0 0.5rem;
  }
  $i: $i + 1;
}
```

---

## Advanced

**Q36: How do you implement a design token system with SCSS + CSS custom properties?**
**A:** Define all tokens as SCSS maps (single source of truth), output them as CSS custom properties in `:root`, and have both SCSS variables (compile-time) and CSS variables (runtime) available.
```scss
$design-tokens: (
  'color-primary':   #0d7377,
  'color-surface':   #ffffff,
  'space-unit':      0.25rem,
  'font-size-base':  1rem,
  'radius-md':       8px,
);

// Output CSS custom properties
:root {
  @each $token, $value in $design-tokens {
    --#{$token}: #{$value};
  }
}

// SCSS variable aliases for compile-time use
$color-primary: map-get($design-tokens, 'color-primary');

// Component uses CSS variable (runtime themeable)
.btn { background: var(--color-primary); }
```

**Q37: How do you write SCSS for a full-site-editable WordPress theme?**
**A:** WordPress FSE themes use `theme.json` for design tokens — SCSS should output classes that match the generated CSS custom property names (`--wp--preset--color--primary`). Avoid hardcoding values that `theme.json` controls.
```scss
// Use WP-generated CSS custom properties in SCSS
.my-block {
  background: var(--wp--preset--color--primary);
  font-size: var(--wp--preset--font-size--medium);
  padding: var(--wp--preset--spacing--50);
  border-radius: var(--wp--custom--border-radius);
}

// Only add styles that theme.json can't provide
.my-block--featured {
  border-left: 4px solid var(--wp--preset--color--accent);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}
```

**Q38: What causes SCSS compile performance issues and how do you fix them?**
**A:** Large `@import` chains, deeply nested selectors, `@extend` with complex selectors, and huge utility class `@each` loops. Migrate from `@import` to `@use` (each file compiled once), split large files, and use `--no-source-map` during development.
```json
{
  "scripts": {
    "sass:dev":   "sass src:dist --watch --no-source-map --style=expanded",
    "sass:build": "sass src/main.scss dist/style.css --style=compressed --source-map",
    "sass:stats": "sass src/main.scss /dev/null --load-path=src 2>&1 | grep 'Compiled'"
  }
}
```

**Q39: How do you use `sass:math` module for precise calculations?**
**A:** The `sass:math` module provides `math.div()` for division (replacing the deprecated `/` operator), `math.floor/ceil/round`, `math.percentage`, and trigonometric functions.
```scss
@use 'sass:math';

// Division — use math.div, not /
.container { width: math.percentage(math.div(10, 12)); } // 83.333%

// Fluid font size without clamp()
@function fluid-type($min, $max, $min-vw: 320px, $max-vw: 1280px) {
  $slope: math.div($max - $min, $max-vw - $min-vw);
  $intercept: $min - $slope * $min-vw;
  @return clamp(#{$min}, #{$slope * 100}vw + #{$intercept}, #{$max});
}

h1 { font-size: fluid-type(1.5rem, 3rem); }
```

**Q40: How do you migrate a large legacy CSS codebase to SCSS without breaking production?**
**A:** Incremental migration: (1) rename `style.css` → `style.scss` (all CSS is valid SCSS), (2) run sass compilation in CI and diff output vs original, (3) gradually extract variables/mixins, (4) introduce nesting conservatively, (5) migrate imports to `@use`, (6) enforce stylelint from day one.
```bash
# Step 1: verify compiled output matches original
sass style.scss compiled.css --style=expanded
diff style.css compiled.css  # should be empty diff

# Step 2: CI check — fail if output changes unexpectedly
sass src/style.scss /tmp/built.css
diff dist/style.css /tmp/built.css || exit 1

# Step 3: Gradually extract partials
# Create _variables.scss, replace hex values, verify diff still clean
```

**Q41: How do you use SCSS to generate a CSS grid system?**
**A:** Use `@for` loops with `fr` units and `@each` for responsive breakpoints to generate a complete grid system.
```scss
$grid-columns: 12;
$breakpoints: (sm: 576px, md: 768px, lg: 1024px);

.grid { display: grid; gap: 1rem; }

@for $i from 1 through $grid-columns {
  .col-#{$i} { grid-column: span $i; }
}

@each $bp, $width in $breakpoints {
  @media (min-width: $width) {
    @for $i from 1 through $grid-columns {
      .col-#{$bp}-#{$i} { grid-column: span $i; }
    }
  }
}
// Generates: .col-1 ... .col-12, .col-sm-1 ... .col-lg-12
```

**Q42: How do you handle PostCSS + autoprefixer with SCSS in a WordPress build?**
**A:** Use PostCSS after SCSS compilation to add vendor prefixes and apply modern CSS transforms. Configure via `postcss.config.js`.
```js
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),         // adds -webkit- etc.
    require('postcss-preset-env')({ stage: 2 }), // modern CSS polyfills
    require('cssnano')({ preset: 'default' }),    // minification
  ]
};
```
```json
// package.json pipeline
{
  "scripts": {
    "build": "sass src/scss/style.scss temp.css && postcss temp.css -o style.min.css"
  }
}
```

**Q43: What are the differences between CSS Modules and SCSS for WordPress block development?**
**A:** CSS Modules scope class names locally via hashing (`.btn` → `.btn_abc123`) — zero specificity conflicts, works with `@wordpress/scripts`. SCSS is global by default, relies on BEM naming conventions for isolation. CSS Modules are better for React-heavy Gutenberg blocks; SCSS better for theme styles.
```js
// CSS Modules in a block (with @wordpress/scripts)
import styles from './style.module.scss';
// <div className={styles.card}> → <div class="card_a1b2c3">

// Regular SCSS (global, BEM naming for isolation)
// style.scss: .wp-block-my-plugin-card { ... }
// Relies on unique block class prefix — no scoping
```

**Q44: How do you implement a print stylesheet with SCSS?**
**A:** Use a `@media print` block or a separate `print.scss` partial. Hide navigation, sidebars, ads. Set font sizes in pt. Expand link URLs.
```scss
// _print.scss
@media print {
  nav, .sidebar, .ads, .cookie-banner, .btn { display: none !important; }

  body { font-size: 12pt; color: #000; background: #fff; }
  h1   { font-size: 18pt; }
  h2   { font-size: 14pt; }

  a { color: #000; text-decoration: underline; }
  a[href]::after { content: " (" attr(href) ")"; font-size: 10pt; }

  .wp-block-image img { max-width: 100%; page-break-inside: avoid; }
  @page { margin: 2cm; size: A4; }
}
```

**Q45: How do you test SCSS output with True (Sass unit testing framework)?**
**A:** True is a Sass unit testing library — test that mixins and functions produce expected CSS output. Run with `jest-runner-sass` or the `true` CLI.
```scss
// test/_button.scss
@use 'true' as *;
@use '../src/mixins' as mix;

@include describe('button-variant mixin') {
  @include it('outputs correct background color') {
    @include assert {
      @include output { @include mix.button-variant(#0d7377); }
      @include expect { background: #0d7377; color: #fff; }
    }
  }
}
```
```bash
npx true-cli tests/test.scss
# ✔ button-variant mixin: outputs correct background color
```


**Q46: How do you use SCSS `@warn` and `@error` for safer mixins?**
**A:** `@warn` prints a message to stderr at compile time; `@error` halts compilation. Use them to guide correct mixin usage.
```scss
@mixin font-size($size) {
  @if type-of($size) != 'number' {
    @error "font-size expects a number, got #{$size}";
  }
  @if unit($size) == '' {
    @warn "font-size: unitless value #{$size} — assuming rem";
    $size: $size * 1rem;
  }
  font-size: $size;
}
.text { @include font-size(1.2rem); }  // OK
.bad  { @include font-size(1.2);    }  // Warn: unitless
```

**Q47: How do you generate utility classes with `@each` over a SCSS map?**
**A:** Loop over a map to produce systematic classes without repetition — ideal for spacing, color, and typography utilities.
```scss
$spacings: ('0': 0, '1': 0.25rem, '2': 0.5rem, '3': 1rem, '4': 2rem);

@each $key, $val in $spacings {
  .m-#{$key}  { margin: $val; }
  .mt-#{$key} { margin-top: $val; }
  .mb-#{$key} { margin-bottom: $val; }
  .p-#{$key}  { padding: $val; }
}
// Output: .m-0 { margin: 0 } .m-1 { margin: 0.25rem } …
```

**Q48: What is `@use 'sass:math'` and why replace division `/` with `math.div()`?**
**A:** In Dart Sass, `/` for division is deprecated. Import the built-in `sass:math` module and use `math.div()` to avoid future breakage.
```scss
@use 'sass:math';

.column {
  // Old (deprecated): width: 100% / 3;
  width: math.div(100%, 3); // 33.3333%
}

@mixin grid($cols: 12) {
  @for $i from 1 through $cols {
    .col-#{$i} { width: math.div(100%, $cols) * $i; }
  }
}
@include grid();
```

**Q49: How do you scope SCSS variables per-component using `@use` namespaces?**
**A:** Each `@use` creates a namespace, preventing variable collisions. Use `as *` sparingly — prefer explicit namespaces in large codebases.
```scss
// tokens/_colors.scss
$brand: #0d7377;
$accent: #ffd700;

// components/_card.scss
@use '../tokens/colors' as colors;
@use '../tokens/spacing' as sp;

.card {
  border-left: 4px solid colors.$brand;
  padding: sp.$md;
  &:hover { border-color: colors.$accent; }
}
```

**Q50: How do you build a fluid typography scale with SCSS and `clamp()`?**
**A:** Combine SCSS math with CSS `clamp()` to create viewport-responsive font sizes without media queries.
```scss
@use 'sass:math';

// fluid($min-size, $max-size, $min-vw: 320px, $max-vw: 1200px)
@function fluid($min, $max, $min-vw: 320px, $max-vw: 1200px) {
  $slope: math.div($max - $min, $max-vw - $min-vw);
  $intercept: $min - $slope * $min-vw;
  @return clamp(#{$min}, #{$slope * 100vw + $intercept}, #{$max});
}

h1 { font-size: fluid(1.75rem, 3.5rem); }
h2 { font-size: fluid(1.5rem,  2.5rem); }
p  { font-size: fluid(1rem,    1.25rem); }
// → clamp(1.75rem, 2.24vw + 1rem, 3.5rem)
```
