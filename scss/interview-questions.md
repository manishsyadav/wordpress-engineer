# SCSS / SASS — Interview Questions

> **50 questions** · Basic (20) · Mid (20) · Advanced (10)
>
> Each answer is 2–3 lines with an inline code snippet.

---

## Basic (Q1–Q20)

---

**Q1: What is the difference between SCSS and SASS syntax?**

**A:** SCSS uses CSS-compatible syntax with curly braces and semicolons — any valid CSS file is valid SCSS. SASS uses indentation-based syntax with no braces or semicolons, more concise but less familiar to CSS developers. SCSS is overwhelmingly preferred in WordPress development because it requires no relearning of CSS syntax.
```scss
// SCSS syntax (curly braces + semicolons — CSS-compatible)
.card { color: red; &:hover { color: blue; } }

// SASS syntax (indented — no braces or semicolons)
.card
  color: red
  &:hover
    color: blue
```

---

**Q2: How do you declare and use variables in SCSS?**

**A:** Variables are prefixed with `$` and can hold colors, sizes, font stacks, or any CSS value. They are resolved at compile time and become static values in the output CSS — they cannot change after compilation. Use them to centralise design tokens such as brand colors and spacing scales across a project.
```scss
$primary-color: #0d7377;
$font-size-base: 1rem;
$border-radius:  4px;

.button {
  background:    $primary-color;
  font-size:     $font-size-base;
  border-radius: $border-radius;
}
```

---

**Q3: How does selector nesting work in SCSS?**

**A:** Child selectors written inside a parent block compile to descendant CSS selectors. Nesting reduces repetition but should be kept to 3 levels or fewer to prevent specificity creep. The compiled output chains selectors just as if written by hand in plain CSS.
```scss
.nav {
  display: flex;

  .nav__item { padding: 0.5rem 1rem; }
  .nav__link { color: inherit; text-decoration: none; }
}
// Compiles to: .nav { } .nav .nav__item { } .nav .nav__link { }
```

---

**Q4: What is the `&` parent selector and when do you use it?**

**A:** `&` refers to the parent selector inside a nested block and compiles with no space between the parent and the suffix. Use it for pseudo-classes, pseudo-elements, BEM modifiers, and state classes. It eliminates repetition while keeping all related rules co-located in one block.
```scss
.btn {
  background: blue;

  &:hover    { background: darkblue; }
  &::after   { content: ''; display: block; }
  &--primary { background: green; }
  &.is-active { font-weight: bold; }
}
```

---

**Q5: What are SCSS partials and what naming convention do they follow?**

**A:** Partials are files prefixed with an underscore (`_variables.scss`). The underscore tells the Sass compiler not to output them as standalone CSS files. They are loaded via `@use` or `@forward` from a main entry point, allowing large stylesheets to be split into focused, maintainable modules.
```scss
// _variables.scss  ← partial, never compiled alone
$color-primary: #0d7377;

// main.scss  ← entry point that pulls in partials
@use 'variables';
@use 'components/buttons';
@use 'layout/header';
```

---

**Q6: How do you write and include a basic `@mixin`?**

**A:** A mixin is a reusable block of CSS declared with `@mixin` and invoked with `@include`. Mixins inline their declarations at every call site, so they work inside `@media` blocks. Use them for multi-property patterns such as flex centering or clearfix that are reused across many components.
```scss
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero    { @include flex-center; height: 100vh; }
.overlay { @include flex-center; position: absolute; inset: 0; }
```

---

**Q7: How do mixin arguments and default values work?**

**A:** Mixins accept positional or keyword arguments; default values make arguments optional. Callers can supply keyword arguments in any order, which improves readability when a mixin has several parameters. Omitting an argument falls back to its declared default value automatically.
```scss
@mixin button($bg: #0d7377, $color: #fff, $radius: 4px) {
  background:    $bg;
  color:         $color;
  border-radius: $radius;
  padding: 0.5rem 1rem;
}

.btn-primary { @include button(); }
.btn-danger  { @include button($bg: #e53e3e); }
.btn-pill    { @include button($bg: green, $radius: 999px); }
```

---

**Q8: What is `@content` inside a mixin?**

**A:** `@content` is a placeholder for a block of styles passed by the caller at the `@include` site. It lets mixins wrap arbitrary content — most commonly used to build `@media` query wrapper mixins. The caller supplies the block between `{` `}` after the `@include` statement.
```scss
@mixin respond-to($bp) {
  @media (min-width: $bp) {
    @content;
  }
}

.sidebar {
  width: 100%;
  @include respond-to(768px) { width: 33%; }
}
```

---

**Q9: How do you write a `@function` in SCSS?**

**A:** Functions are declared with `@function` and must return a value via `@return`. Unlike mixins they emit a single computed value rather than CSS declarations. Use functions for unit conversions, calculations, and map lookups — never for emitting CSS rules.
```scss
@use 'sass:math';

@function rem($px, $base: 16) {
  @return math.div($px, $base) * 1rem;
}

.heading { font-size: rem(24); }  // 1.5rem
.caption { font-size: rem(12); }  // 0.75rem
```

---

**Q10: What is `@extend` and what are `%placeholder` selectors?**

**A:** `@extend` shares a set of CSS rules between selectors by grouping them in the compiled output rather than duplicating declarations. `%placeholder` selectors (prefixed `%`) exist solely to be extended and never appear in compiled CSS on their own. Always extend placeholders, not concrete class selectors.
```scss
%visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.sr-only   { @extend %visually-hidden; }
.skip-link { @extend %visually-hidden; }
// Output: .sr-only, .skip-link { position: absolute; ... }
```

---

**Q11: How does `@if / @else if / @else` work in SCSS?**

**A:** SCSS control directives run at compile time. `@if` evaluates a SassScript expression and outputs its block when the result is truthy. `@else if` and `@else` provide fallback branches. They are most useful inside mixins and functions to adjust output based on arguments passed by the caller.
```scss
@mixin theme-colors($mode) {
  @if $mode == 'light' {
    background: #fff; color: #111;
  } @else if $mode == 'dark' {
    background: #1a202c; color: #f7fafc;
  } @else {
    @warn 'Unknown theme mode: #{$mode}';
  }
}
```

---

**Q12: How does `@each` iterate over lists and maps?**

**A:** `@each $item in $list` iterates over a space- or comma-separated list. For maps, destructure both key and value as `@each $key, $value in $map`. It is the primary tool for generating utility classes, theme variants, or component modifiers programmatically from a single data source.
```scss
// List iteration
@each $side in top, right, bottom, left {
  .border-#{$side} { border-#{$side}: 1px solid #eee; }
}

// Map iteration
$sizes: (sm: 0.5rem, md: 1rem, lg: 2rem);
@each $name, $val in $sizes { .gap-#{$name} { gap: $val; } }
```

---

**Q13: What is the difference between `@for from/through` and `@for from/to`?**

**A:** `@for $i from 1 through 5` includes both endpoints and runs 5 times (1, 2, 3, 4, 5). `@for $i from 1 to 5` excludes the end value and runs 4 times (1, 2, 3, 4). Use `through` when the last index must be included; use `to` when it should be excluded.
```scss
// through — inclusive end: generates .col-1 through .col-12
@for $i from 1 through 12 {
  .col-#{$i} { width: percentage($i / 12); }
}

// to — exclusive end: generates .offset-1 through .offset-11
@for $i from 1 to 12 {
  .offset-#{$i} { margin-left: percentage($i / 12); }
}
```

---

**Q14: How does `@while` work in SCSS?**

**A:** `@while` repeatedly executes its block as long as the condition is truthy. The loop variable must be updated inside the block to prevent infinite compilation. It is rarely needed in practice — `@for` and `@each` handle most iteration needs more expressively.
```scss
$i: 1;
@while $i <= 6 {
  .fw-#{$i * 100} { font-weight: $i * 100; }
  $i: $i + 1;
}
// Outputs: .fw-100 { font-weight: 100; } through .fw-600 { font-weight: 600; }
```

---

**Q15: How do you use SCSS maps and `map.get`?**

**A:** Maps are key-value collections declared with `()`. Use `map.get($map, $key)` after `@use 'sass:map'` to retrieve a value by key. They centralise configuration data — breakpoints, colors, spacing scales — that loops and functions can consume without hardcoding values in multiple places.
```scss
@use 'sass:map';

$breakpoints: (sm: 576px, md: 768px, lg: 1024px, xl: 1280px);

.container {
  max-width: map.get($breakpoints, lg); // 1024px
}
```

---

**Q16: What are the main SCSS color functions?**

**A:** The `sass:color` module provides `color.adjust()` to shift individual color channels (lightness, saturation, hue) and `color.mix()` to blend two colors by a percentage weight. The legacy global functions `lighten()` and `darken()` are deprecated in Dart Sass — prefer the module equivalents in all new code.
```scss
@use 'sass:color';

$brand: #0d7377;

.btn {
  background: $brand;
  &:hover  { background: color.adjust($brand, $lightness:  10%); }
  &:active { background: color.adjust($brand, $lightness: -10%); }
}
$muted: color.mix($brand, #fff, 40%); // 60% white blended in
```

---

**Q17: What is string interpolation `#{}` used for in SCSS?**

**A:** Interpolation evaluates a Sass expression and embeds its string value into a selector, property name, or string context. It is required in selectors and property names because Sass cannot resolve variables in those positions directly. Inside CSS property values, plain variable references are usually sufficient without interpolation.
```scss
$prop:  'margin';
$side:  'top';
$theme: 'dark';

.theme-#{$theme} {
  #{$prop}-#{$side}: 1rem;          // margin-top: 1rem
  background: var(--bg-#{$theme});  // var(--bg-dark)
}
```

---

**Q18: What is the `@import` deprecation and what replaces it?**

**A:** `@import` is deprecated in Dart Sass because it pollutes the global namespace, allows the same file to be parsed multiple times, and makes dependency graphs opaque. `@use` (loads with a namespace, parsed once) and `@forward` (re-exports for composition) are its direct replacements in modern SCSS.
```scss
// Deprecated — avoid in all new code
@import 'variables';
@import 'mixins';

// Modern replacements
@use 'abstracts/variables' as v;
@use 'abstracts/mixins'   as mx;

.card { color: v.$primary; @include mx.flex-center; }
```

---

**Q19: How does `@warn` differ from `@error` in SCSS?**

**A:** `@warn` prints a message to the terminal during compilation but allows the build to continue — appropriate for deprecation notices or soft validation where a fallback is possible. `@error` halts compilation immediately with a message — use it for invalid arguments or states that would produce broken CSS output.
```scss
@function get-color($name) {
  @if not map-has-key($palette, $name) {
    @error "Color '#{$name}' not found in $palette map.";
  }
  @return map-get($palette, $name);
}

@mixin legacy-mixin($args...) {
  @warn "legacy-mixin is deprecated. Use flex-center instead.";
  @content;
}
```

---

**Q20: What is the difference between a SCSS variable `$var` and a CSS custom property `--var`?**

**A:** A SCSS variable is compile-time only — resolved to a static value in the output CSS, it cannot change after compilation and is invisible to JavaScript. A CSS custom property exists in the output at runtime — it can be read and updated by JavaScript, changed inside media queries, and inherited through the DOM cascade.
```scss
$brand: #0d7377; // compile-time only — resolved away in output

:root {
  --color-brand: #{$brand}; // runtime custom property set from SCSS value
}

.btn {
  background: var(--color-brand); // runtime — JS can override this
  border-radius: $border-radius;  // compile-time only
}
```

---

## Mid-Level (Q21–Q40)

---

**Q21: How do you write a responsive breakpoint mixin pattern?**

**A:** Store breakpoints in a map, then write a mixin that looks up the value and wraps `@content` in a `min-width` media query. This centralises breakpoint values in one place and produces consistent, readable call sites across every component file. A guard warns on unknown breakpoint names.
```scss
@use 'sass:map';

$breakpoints: (sm: 576px, md: 768px, lg: 1024px, xl: 1280px);

@mixin respond-to($bp) {
  $val: map.get($breakpoints, $bp);
  @if not $val { @warn 'Unknown breakpoint: #{$bp}'; }
  @else { @media (min-width: $val) { @content; } }
}

.card { width: 100%; @include respond-to(md) { width: 50%; } }
```

---

**Q22: How do you generate utility classes with `@each`?**

**A:** Iterate over a spacing or color map with `@each` and use `#{}` interpolation to build class names dynamically. One loop produces dozens of utility classes from a single data source, keeping the system DRY and easily extensible by adding entries to the map alone.
```scss
$spacings: (1: 0.25rem, 2: 0.5rem, 3: 1rem, 4: 1.5rem, 5: 2rem);

@each $key, $value in $spacings {
  .mt-#{$key} { margin-top:     $value; }
  .mb-#{$key} { margin-bottom:  $value; }
  .pt-#{$key} { padding-top:    $value; }
  .pb-#{$key} { padding-bottom: $value; }
}
```

---

**Q23: How do you implement dark mode with SCSS color maps?**

**A:** Store both themes in a nested map and loop to emit scoped CSS custom properties per `[data-theme]` attribute selector. Components reference only `var()` tokens, so switching themes at runtime requires a single attribute change on the root element — no SCSS recompilation needed at any point.
```scss
$themes: (
  light: (bg: #ffffff, text: #1a202c, surface: #f7fafc),
  dark:  (bg: #1a202c, text: #f7fafc, surface: #2d3748),
);

@each $theme, $palette in $themes {
  [data-theme='#{$theme}'] {
    @each $token, $value in $palette {
      --color-#{$token}: #{$value};
    }
  }
}
```

---

**Q24: What is the 7-1 SCSS architecture pattern?**

**A:** Seven thematic folders feed one `main.scss` entry file: `abstracts/` (variables, mixins, functions), `base/` (reset, typography), `layout/` (grid, header, footer), `components/` (buttons, cards), `pages/` (page-specific overrides), `themes/` (dark/light), `vendors/` (third-party overrides). All folders contain underscore-prefixed partials.
```scss
// main.scss — one @use per partial group
@use 'abstracts';
@use 'base/reset';
@use 'base/typography';
@use 'layout/grid';
@use 'layout/header';
@use 'components/button';
@use 'components/card';
@use 'pages/home';
```

---

**Q25: What is ITCSS and how does it inform SCSS file ordering?**

**A:** Inverted Triangle CSS orders layers from generic to specific: Settings → Tools → Generic → Elements → Objects → Components → Utilities. Specificity grows with each layer so rules never need to override each other by fighting the cascade. In SCSS, each layer maps to a folder of partials imported in strict order.
```scss
@use '01-settings/tokens';    // $variables only — no CSS output
@use '02-tools/mixins';       // mixins/functions — no CSS output
@use '03-generic/reset';      // box-sizing, margin resets
@use '04-elements/headings';  // bare h1–h6 styles
@use '05-objects/wrapper';    // layout abstractions
@use '06-components/card';    // UI component styles
@use '07-utilities/spacing';  // single-purpose !important helpers
```

---

**Q26: How do you apply BEM naming with SCSS nesting?**

**A:** BEM Block__Element--Modifier maps cleanly to SCSS `&` chaining. The block is the top-level selector; elements and modifiers are nested using `&__` and `&--`. All related styles stay co-located in one block without producing deep descendant selectors in the compiled CSS output.
```scss
.card {
  background: #fff; border-radius: 8px;

  &__header  { padding: 1rem; border-bottom: 1px solid #eee; }
  &__body    { padding: 1rem; }
  &__footer  { padding: 0.5rem 1rem; text-align: right; }

  &--featured { border: 2px solid #0d7377; }
  &--compact  { .card__body { padding: 0.5rem; } }
}
```

---

**Q27: How do you output CSS custom properties from an SCSS map?**

**A:** Loop over a tokens map inside `:root` and interpolate the key as the custom property name. The compiled CSS exposes runtime-accessible custom properties while the SCSS map remains the single source of truth. JavaScript can read or override them at runtime via `getPropertyValue` and `setProperty`.
```scss
$design-tokens: (
  'color-primary':   #0d7377,
  'color-secondary': #1e3a5f,
  'space-base':      1rem,
  'radius-default':  4px,
);

:root {
  @each $name, $value in $design-tokens {
    --#{$name}: #{$value};
  }
}
```

---

**Q28: How do you configure `sass-loader` in webpack?**

**A:** Install `sass-loader`, `sass`, and `css-loader`. Add a rule targeting `.scss` files in `webpack.config.js`. The loader chain runs right-to-left: `sass-loader` compiles SCSS, `css-loader` resolves `@import` and `url()`, then `style-loader` or `MiniCssExtractPlugin` handles injection or extraction.
```js
// webpack.config.js
module.exports = {
  module: {
    rules: [{
      test: /\.scss$/,
      use: [
        'style-loader',
        'css-loader',
        {
          loader: 'sass-loader',
          options: { sassOptions: { outputStyle: 'compressed' } },
        },
      ],
    }],
  },
};
```

---

**Q29: What are the key Sass CLI compilation flags?**

**A:** `--style` controls output format (`expanded` for dev, `compressed` for prod). `--source-map` and `--no-source-map` toggle browser DevTools mapping. `--watch` triggers recompilation on every file save. `--load-path` adds additional directories to the import resolution search path for node_modules imports.
```bash
# Dev: human-readable output + source maps + auto-recompile
sass src/scss:dist/css --style=expanded --source-map --watch

# Production: compressed, no source maps
sass src/scss/main.scss dist/css/main.css --style=compressed --no-source-map

# Add node_modules to the load path for package imports
sass src/scss:dist/css --load-path=node_modules
```

---

**Q30: How do you integrate PostCSS + Autoprefixer with an SCSS build?**

**A:** SCSS compiles first, then PostCSS processes the resulting CSS to add vendor prefixes and apply transforms. In webpack, `postcss-loader` sits between `css-loader` and `sass-loader`. A `postcss.config.js` declares the plugins, and Autoprefixer reads the project's `browserslist` config to determine which prefixes to inject.
```js
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),
    require('postcss-custom-properties'), // optional runtime polyfill
  ],
};
// webpack loader order (right-to-left): sass-loader → postcss-loader → css-loader
```

---

**Q31: How do you configure stylelint for SCSS?**

**A:** Install `stylelint` and `stylelint-config-standard-scss`, create a `.stylelintrc.json` with project-specific rules, and add a `lint:css` npm script. Run it in CI to block merges with style violations. The official VS Code extension surfaces lint errors inline as you type during development.
```json
{
  "extends": ["stylelint-config-standard-scss"],
  "rules": {
    "scss/dollar-variable-pattern": "^[a-z][a-z0-9-]*$",
    "max-nesting-depth": 3,
    "selector-class-pattern": "^[a-z][a-z0-9-_]*$"
  }
}
```

---

**Q32: How do CSS Modules differ from global SCSS?**

**A:** CSS Modules scope class names locally by default — the build tool transforms `.card` to a unique hash like `.card_xk3f9` so styles never bleed across components. Global SCSS applies document-wide. Files named `.module.scss` receive Module scoping automatically in Next.js and Create React App.
```scss
// Button.module.scss — locally scoped by build tool
.button {
  background: var(--color-primary);
  &:hover { opacity: 0.9; }
}
// JS: import styles from './Button.module.scss'
// <button className={styles.button}> → hashed class in HTML output
```

---

**Q33: How do `@use` namespaces solve problems caused by `@import`?**

**A:** With `@import`, all variables and mixins land in the global namespace — naming collisions are silent and the same file can be compiled multiple times. `@use` sandboxes each file behind its namespace, loads each file only once, and makes every dependency explicitly visible at the top of the consuming file.
```scss
// @import (deprecated) — pollutes global namespace
@import 'variables';
$primary; // works, but which file defined it? collision risk

// @use — explicit namespace, loaded once, no collisions
@use 'abstracts/variables' as v;
v.$primary; // clear origin, impossible to accidentally collide
```

---

**Q34: How do you use `map.merge` and `map.keys`?**

**A:** `map.merge($a, $b)` returns a new combined map with `$b` values winning on duplicate keys — useful for extending a base config with overrides. `map.keys($map)` returns a list of all keys — useful for validation guards and error messages. Both require `@use 'sass:map'`.
```scss
@use 'sass:map';

$base:     (sm: 576px, md: 768px);
$extended: map.merge($base, (lg: 1024px, xl: 1280px));

@mixin respond-to($bp) {
  @if not map.has-key($extended, $bp) {
    @error 'Unknown bp: #{$bp}. Valid: #{map.keys($extended)}';
  }
  @media (min-width: map.get($extended, $bp)) { @content; }
}
```

---

**Q35: How do you use `@use` with namespace aliases?**

**A:** `as alias` assigns a custom short name to a module's namespace, improving readability in files that reference many imported symbols. `as *` merges all members into the local scope without a prefix — only appropriate in forwarding index files where transparent re-export is the goal.
```scss
@use 'sass:math'         as math;
@use 'abstracts/tokens'  as t;
@use 'abstracts/mixins'  as mx;

.grid__col-4 {
  width: math.percentage(math.div(4, 12)); // 33.33%
  color: t.$color-text;
  @include mx.respond-to(md) { font-size: 1.125rem; }
}
```

---

**Q36: How do you implement a design token system with SCSS?**

**A:** Define raw primitive tokens in one partial and semantic tokens (referencing primitives by name) in another. Output both as CSS custom properties at build time. Components consume only `var()` semantic tokens, so a single map edit propagates everywhere at runtime without recompilation.
```scss
@use 'sass:map';

$raw:      (blue-500: #3b82f6, blue-700: #1d4ed8, space-4: 1rem);
$semantic: (
  color-action:       map.get($raw, blue-500),
  color-action-hover: map.get($raw, blue-700),
  space-component:    map.get($raw, space-4),
);

:root { @each $n, $v in $semantic { --#{$n}: #{$v}; } }
```

---

**Q37: How do you avoid the `@extend` specificity explosion problem?**

**A:** Extending a concrete class clones every selector that already contains it, creating combinatorial selector chains that can produce thousands of combined rules. Always extend `%placeholder` selectors, which have no prior references. For unrelated DOM elements, use a mixin — CSS is duplicated but remains predictable and scoped.
```scss
// BAD — extending a real class clones all its selector contexts
.icon-btn { @extend .btn; }

// GOOD — extend a placeholder: only .btn and .icon-btn are grouped
%button-base { display: inline-flex; padding: 0.5rem 1rem; }
.btn      { @extend %button-base; }
.icon-btn { @extend %button-base; }
```

---

**Q38: How do you set up SCSS compilation for a WordPress theme with npm scripts?**

**A:** Add `sass` as a dev dependency and define `dev` and `build` scripts in `package.json`. The build script produces a compressed stylesheet without source maps for production. The dev script watches for changes and outputs source maps for DevTools debugging. Enqueue the compiled CSS in `functions.php` via `wp_enqueue_style`.
```json
{
  "devDependencies": { "sass": "^1.70.0" },
  "scripts": {
    "dev":   "sass src/scss:assets/css --watch --source-map",
    "build": "sass src/scss/main.scss assets/css/main.css --style=compressed --no-source-map"
  }
}
```

---

**Q39: How do you optimise SCSS compile time on large projects?**

**A:** Use `@forward` index files so each component needs only one `@use` instead of many individual imports. Avoid deep `@extend` chains which force expensive selector-grouping work. Split the output into per-page entry points loaded conditionally to reduce both compile scope per run and browser download size.
```scss
// abstracts/_index.scss — single aggregation point via @forward
@forward 'variables';
@forward 'mixins';
@forward 'functions';

// Component file: one @use instead of three separate imports
@use '../abstracts' as a; // faster compile, single dependency
.card { color: a.$primary; @include a.flex-center; }
```

---

**Q40: How do you use `@use 'sass:math'` for safe division?**

**A:** The `/` operator is deprecated as a division operator in Dart Sass because it is syntactically ambiguous with the CSS `calc()` slash separator. Use `math.div($a, $b)` from the `sass:math` module instead. The module also provides `math.percentage()`, `math.round()`, `math.floor()`, `math.ceil()`, and the constant `math.$pi`.
```scss
@use 'sass:math';

$columns: 12;

@for $i from 1 through $columns {
  .col-#{$i} {
    // math.div replaces the deprecated: $i / $columns
    width: math.percentage(math.div($i, $columns));
  }
}
```

---

## Advanced (Q41–Q50)

---

**Q41: How do you build a recursive SCSS function for deep map lookups?**

**A:** Dart Sass's `map.get` retrieves only one level at a time. A recursive `@function` accepting a variadic key list calls `map.get` at each depth level and short-circuits on `null`. This produces a clean lookup API for deeply nested token structures like `token($tokens, colors, primary, base)`.
```scss
@use 'sass:map';

@function token($map, $keys...) {
  $current: $map;
  @each $key in $keys {
    $current: map.get($current, $key);
    @if $current == null { @return null; }
  }
  @return $current;
}

$tokens: (colors: (primary: (base: #0d7377, light: #14a085)));
.btn { color: token($tokens, colors, primary, base); } // #0d7377
```

---

**Q42: How do you generate a multi-breakpoint responsive grid with `@for` and `@each`?**

**A:** Double-loop over a column count and a breakpoints map: the outer `@each` creates a `@media` context, the inner `@for` generates column-width classes within it. This mirrors Bootstrap's grid approach but gives complete control over naming conventions, column count, and gap values.
```scss
@use 'sass:math';

$columns:     12;
$breakpoints: (sm: 576px, md: 768px, lg: 1024px);

@each $bp, $width in $breakpoints {
  @media (min-width: $width) {
    @for $i from 1 through $columns {
      .col-#{$bp}-#{$i} {
        width: math.percentage(math.div($i, $columns));
      }
    }
  }
}
```

---

**Q43: How do you build a multi-brand theming system with SCSS maps?**

**A:** Store each brand's token overrides in a nested map and loop to emit scoped `--custom-property` blocks under a `[data-brand]` attribute selector. All components reference only `var()` tokens, so switching brands at runtime is a single attribute mutation on the root element — no SCSS recompilation required.
```scss
$brands: (
  brand-a: (primary: #0d7377, font: 'Inter',   radius: 4px),
  brand-b: (primary: #c0392b, font: 'Georgia', radius: 0px),
);

@each $brand, $tokens in $brands {
  [data-brand='#{$brand}'] {
    @each $token, $value in $tokens {
      --#{$token}: #{$value};
    }
  }
}
```

---

**Q44: Why can't `@extend` be used inside `@media` blocks and what is the workaround?**

**A:** Sass raises a compile error when `@extend` targets a selector defined outside the current `@media` context because it cannot merge selectors across different media boundaries in the output. The correct workaround is a `@mixin` with `@content` or a static mixin — CSS is duplicated at each site but is fully scoped and always error-free.
```scss
// ERROR — cannot @extend across @media context boundaries
@media (min-width: 768px) {
  .card { @extend %panel; } // CompileError!
}

// CORRECT — use a mixin; CSS is inlined, no cross-boundary merging
@mixin panel-styles { padding: 1rem; border: 1px solid #eee; }
@media (min-width: 768px) {
  .card { @include panel-styles; }
}
```

---

**Q45: What are `@debug`, `@warn`, and `@error` used for?**

**A:** `@debug` prints any value to the terminal during compilation — useful for inspecting intermediate variable contents. `@warn` emits a non-fatal warning and lets compilation continue — appropriate for deprecation notices. `@error` halts compilation immediately — appropriate for invalid arguments that would produce broken or meaningless CSS output.
```scss
@use 'sass:map';

$palette: (primary: #0d7377, danger: #e53e3e);

@mixin text-color($name) {
  @debug 'text-color called with: #{$name}';
  @if not map.has-key($palette, $name) {
    @error 'Invalid color "#{$name}". Valid keys: #{map.keys($palette)}';
  }
  color: map.get($palette, $name);
}
```

---

**Q46: How do you integrate PurgeCSS with a SCSS/WordPress build pipeline?**

**A:** PurgeCSS scans PHP template files and JavaScript for class names actually used in the project, then strips every unused selector from the compiled CSS. Configure it as a PostCSS plugin in production mode only and include a `safelist` regex for dynamic WordPress classes like `wp-*`, `is-*`, and `has-*` that PurgeCSS cannot detect statically.
```js
// postcss.config.js
const isProd = process.env.NODE_ENV === 'production';
module.exports = {
  plugins: [
    require('autoprefixer'),
    isProd && require('@fullhuman/postcss-purgecss')({
      content:  ['**/*.php', 'src/**/*.js'],
      safelist: [/^wp-/, /^is-/, /^has-/, /^block-/],
    }),
  ].filter(Boolean),
};
```

---

**Q47: How do you enforce SCSS code quality in a CI/CD pipeline for a WordPress project?**

**A:** Add `stylelint` and `stylelint-config-standard-scss` as dev dependencies, define a `.stylelintrc.json` with project-specific rules, and add a `lint:css` npm script. In GitHub Actions, run the script as a required status check so pull requests with style violations are automatically blocked from merging to the main branch.
```yaml
# .github/workflows/lint.yml
name: Lint SCSS
on: [push, pull_request]
jobs:
  scss-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx stylelint "src/scss/**/*.scss" --formatter=compact
```

---

**Q48: How do you migrate a legacy `@import`-based SCSS project to `@use`/`@forward`?**

**A:** Run the official `sass-migrator module --migrate-deps scss/main.scss` to auto-generate `@use` statements and add namespaces to every variable and mixin reference throughout the dependency graph. After migration, audit for lingering global calls, replace deprecated color functions with `sass:color` module equivalents, and diff the compiled output to catch regressions.
```bash
# Install the official Sass migrator tool
npm install -g sass-migrator

# Auto-migrate the entire dependency graph starting from the entry file
sass-migrator module --migrate-deps src/scss/main.scss

# Before: @import 'variables'  →  $primary-color (global)
# After:  @use 'variables' as v  →  v.$primary-color (namespaced)
```

---

**Q49: How do you build a design token pipeline from SCSS through to JavaScript?**

**A:** Define all tokens in an SCSS map, compile them to CSS custom properties in `:root`, and separately generate a JSON file via a Node.js build script. JavaScript imports the JSON for programmatic use in canvas rendering, animation values, or theming logic. One SCSS map is the authoritative source for all environments and outputs.
```scss
// _tokens.scss → CSS custom properties compiled to stylesheet
$color-tokens: ('primary': #0d7377, 'secondary': #1e3a5f);
:root { @each $n, $v in $color-tokens { --color-#{$n}: #{$v}; } }

// build-tokens.mjs (Node.js — run as part of the build pipeline)
// const tokens = { primary: '#0d7377', secondary: '#1e3a5f' };
// await fs.writeFile('src/tokens.json', JSON.stringify(tokens, null, 2));
```

---

**Q50: How do you architect an enterprise WordPress theme SCSS setup end-to-end?**

**A:** Combine `sass` for compilation, `postcss-cli` with autoprefixer for vendor prefixes, `stylelint` for linting, and separate dev/prod npm scripts wired into a top-level `build` command. Source maps are enabled only in dev mode. The compiled CSS is enqueued via `wp_enqueue_style` in `functions.php` — SCSS source files are never exposed to or loaded by WordPress directly.
```json
{
  "scripts": {
    "lint:css":     "stylelint 'src/scss/**/*.scss'",
    "compile:dev":  "sass src/scss/main.scss:assets/css/main.css --source-map --watch",
    "compile:prod": "sass src/scss/main.scss assets/css/main.css --style=compressed --no-source-map",
    "postcss":      "postcss assets/css/main.css -o assets/css/main.css",
    "build":        "npm run lint:css && npm run compile:prod && npm run postcss",
    "dev":          "npm run compile:dev"
  }
}
```
