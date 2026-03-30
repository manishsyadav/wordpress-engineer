# SASS / SCSS — Scenario-Based Questions

## Scenario 1: Migrating Legacy CSS to SCSS

**Scenario:** A WordPress theme has a 3,000-line `style.css` with duplicated colors, inconsistent spacing, and media queries scattered everywhere. You need to migrate to SCSS without breaking the live site.

**Challenge:** Restructure to SCSS while maintaining the same compiled output.

**Solution:**
```
1. Extract colors and sizes into _variables.scss
2. Rename style.css → style.scss, @use variables
3. Find and replace hex colors with variables
4. Move repeated patterns into mixins
5. Use sass to compile: sass style.scss style.css --style=expanded --source-map
6. Diff old vs new CSS to verify no unintended changes
7. Gradually add nesting and structure
```
```scss
/* _variables.scss */
$color-primary:   #0d7377;
$color-secondary: #1e3a5f;
$font-base:       'Segoe UI', sans-serif;
$breakpoint-md:   768px;
$breakpoint-lg:   1024px;

/* _mixins.scss */
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin respond($bp) {
  @media (min-width: $bp) { @content; }
}

/* style.scss */
@use 'variables' as *;
@use 'mixins' as *;

.header {
  background: $color-primary;
  @include flex-center;
  padding: 1rem 2rem;

  @include respond($breakpoint-md) {
    padding: 1.5rem 3rem;
  }
}
```

---

## Scenario 2: Theme Variations for a Multi-Client WordPress Build

**Scenario:** You're building a WordPress theme to be white-labeled for 5 different clients, each with different brand colors, fonts, and border-radius styles.

**Challenge:** Implement a theme variation system in SCSS.

**Solution:**
```scss
/* _themes.scss — one map per client */
$themes: (
  'client-a': (
    primary: #e63946,
    secondary: #1d3557,
    font: 'Roboto',
    radius: 0px
  ),
  'client-b': (
    primary: #0d7377,
    secondary: #1e3a5f,
    font: 'Inter',
    radius: 8px
  ),
);

/* Generate CSS custom properties per theme */
@each $theme, $values in $themes {
  [data-theme="#{$theme}"] {
    --color-primary:   #{map-get($values, primary)};
    --color-secondary: #{map-get($values, secondary)};
    --font-family:     #{map-get($values, font)}, sans-serif;
    --border-radius:   #{map-get($values, radius)};
  }
}

/* Components use CSS variables — automatically themed */
.btn-primary {
  background: var(--color-primary);
  border-radius: var(--border-radius);
  font-family: var(--font-family);
}

/* In WordPress: add data-theme to <body> via body_class filter */
```

---

## Scenario 3: SCSS Build Performance

**Scenario:** A large WordPress theme takes 45 seconds to compile SCSS. The dev team is frustrated with slow feedback cycles.

**Challenge:** Speed up the SCSS compilation without changing the output.

**Solution:**
```
1. Audit @import chain — remove circular or redundant imports
2. Switch from @import to @use (Dart Sass compiles each @use file once)
3. Split into smaller partial files — Sass can cache unchanged partials
4. Use sass --watch with --no-source-map during development (source maps slow compilation)
5. Move vendor SCSS files (Bootstrap) to CSS and skip SCSS compilation
6. Use sass --load-path to avoid long relative import paths
```
```json
// package.json — optimized scripts
{
  "scripts": {
    "sass:dev":   "sass src/scss/style.scss dist/css/style.css --watch --no-source-map",
    "sass:build": "sass src/scss/style.scss dist/css/style.min.css --style=compressed --source-map",
    "sass:check": "sass src/scss/style.scss --dry-run"
  }
}
```

---

## Scenario 4: Migrating a Legacy Flat CSS Stylesheet to 7-1 SCSS Architecture

**Scenario:** A five-year-old WordPress theme has a single 4,500-line `style.css` with no naming conventions, duplicated media queries, hardcoded hex values everywhere, and no build process. A new team member cannot find anything. The site is live and must not break during the migration.

**Challenge:** Migrate to the 7-1 SCSS pattern incrementally while keeping the compiled output byte-for-byte identical during the transition.

**Solution:**
1. Set up the build toolchain first (Dart Sass + npm scripts) and confirm it compiles a trivial `style.scss` correctly before touching any existing CSS.

2. Create the 7-1 directory scaffold:

```
scss/
├── abstracts/
│   ├── _variables.scss
│   ├── _mixins.scss
│   └── _functions.scss
├── base/
│   ├── _reset.scss
│   └── _typography.scss
├── components/
│   ├── _buttons.scss
│   ├── _cards.scss
│   └── _forms.scss
├── layout/
│   ├── _header.scss
│   ├── _footer.scss
│   └── _sidebar.scss
├── pages/
│   ├── _home.scss
│   └── _single.scss
├── themes/
│   └── _woocommerce.scss
├── vendors/
│   └── _normalize.scss
└── style.scss        ← entry point, @forward all partials
```

3. Migrate incrementally — one partial at a time. Start by extracting variables from hardcoded values:

```scss
// abstracts/_variables.scss
$color-primary:    #0d7377;
$color-secondary:  #1e3a5f;
$color-text:       #2d3748;
$color-bg:         #ffffff;

$font-base:        'Inter', system-ui, sans-serif;
$font-heading:     'Playfair Display', serif;

$bp-sm:  480px;
$bp-md:  768px;
$bp-lg:  1024px;
$bp-xl:  1280px;

$spacing-xs:  0.25rem;
$spacing-sm:  0.5rem;
$spacing-md:  1rem;
$spacing-lg:  2rem;
$spacing-xl:  4rem;
```

4. After each partial extraction, compile and diff the output against the original CSS. Only proceed when the diff is clean:

```bash
sass scss/style.scss dist/style.css --style=expanded
diff original-style.css dist/style.css
```

5. Once all partials are extracted, introduce nesting and mixins in a second pass — keep this separate from the extraction pass to isolate any introduced differences.

---

## Scenario 5: Implementing a Design Token System Using SCSS Maps and Custom Properties

**Scenario:** A WordPress agency manages 12 client sites built on the same base theme. Design tokens (colors, spacing, typography scales) differ per client. Currently each client has a separate copy of the entire SCSS codebase, making shared bug fixes a maintenance nightmare. The team wants a single codebase where tokens are the only difference between clients.

**Challenge:** Build a design token system using SCSS maps that outputs CSS custom properties, allowing the theme core to remain shared while tokens are swapped per client.

**Solution:**
1. Define tokens as structured SCSS maps in one file per client:

```scss
// tokens/_client-acme.scss
$tokens: (
  'color': (
    'primary':    oklch(52% 0.19 240),
    'secondary':  oklch(35% 0.12 260),
    'accent':     oklch(70% 0.22 55),
    'surface':    oklch(99% 0 0),
    'on-surface': oklch(15% 0 0),
  ),
  'spacing': (
    'xs':  0.25rem,
    'sm':  0.5rem,
    'md':  1rem,
    'lg':  2rem,
    'xl':  4rem,
  ),
  'radius': (
    'sm':  2px,
    'md':  8px,
    'lg':  16px,
    'pill': 9999px,
  ),
);
```

2. Write a mixin that flattens the map into CSS custom properties with a consistent naming convention:

```scss
// abstracts/_token-emitter.scss
@mixin emit-tokens($map, $prefix: '') {
  @each $key, $value in $map {
    $full-key: if($prefix == '', $key, '#{$prefix}-#{$key}');

    @if type-of($value) == 'map' {
      @include emit-tokens($value, $full-key);
    } @else {
      --#{$full-key}: #{$value};
    }
  }
}
```

3. Emit all tokens onto `:root` in the theme entry point:

```scss
// style.scss
@use 'tokens/client-acme' as t;
@use 'abstracts/token-emitter' as *;

:root {
  @include emit-tokens(t.$tokens);
}
```

4. Every component uses only the generated custom properties — never the raw SCSS variables:

```scss
// components/_buttons.scss
.btn-primary {
  background:    var(--color-primary);
  color:         var(--color-on-surface);
  padding:       var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-family:   var(--font-body);
  transition:    background 200ms ease;

  &:hover {
    background: color-mix(in oklch, var(--color-primary) 85%, black);
  }
}
```

5. Switching a client is a single import change at the top of `style.scss`. CI compiles one stylesheet per client using a build matrix.

---

## Scenario 6: Debugging SCSS Compilation Errors After Upgrading Dart Sass from 1.x to 2.x

**Scenario:** A WordPress theme's CI pipeline fails after upgrading Dart Sass from 1.77 to 2.0. The compiler outputs dozens of errors and deprecation warnings. The primary errors are: `@import is not allowed`, `color.adjust() call with undefined channels`, and `math.div() expected, got /`. The local dev team has been ignoring `--silence-deprecation` warnings for months.

**Challenge:** Systematically fix all breaking changes introduced by Dart Sass 2.0 without rewriting business logic.

**Solution:**
1. Run the compiler with `--verbose` to get the full error list. Group errors by type before fixing anything:

```bash
sass scss/style.scss dist/style.css --verbose 2>&1 | grep "Error\|Deprecation" | sort | uniq -c | sort -rn
```

2. Replace all `@import` with `@use` / `@forward`. `@import` is removed in Sass 2.0. The key behavioral difference: `@use` creates a namespace, so references must be updated:

```scss
// Before (Sass 1.x)
@import 'variables';
.btn { color: $color-primary; }

// After (Sass 2.x)
@use 'variables' as v;
.btn { color: v.$color-primary; }

// Or use wildcard namespace (use sparingly — pollutes scope)
@use 'variables' as *;
.btn { color: $color-primary; }
```

3. Fix division — the `/` operator for division is removed; use `math.div()`:

```scss
// Before
.grid { width: 100% / 3; }

// After
@use 'sass:math';
.grid { width: math.div(100%, 3); }
```

4. Fix color functions — `darken()`, `lighten()`, `adjust-color()` are removed; use `color.adjust()` or `color.scale()` from the `sass:color` module:

```scss
// Before
.btn:hover { background: darken($color-primary, 10%); }

// After
@use 'sass:color';
.btn:hover { background: color.scale($color-primary, $lightness: -15%); }
```

5. Fix `@content` with arguments — syntax changed for `@mixin` / `@include` content blocks:

```scss
// Before
@mixin respond($bp) {
  @media (min-width: $bp) { @content; }
}

// After — no change needed for basic usage; only complex @content($args) syntax changed
// Audit mixins that use @content($arg) and update callers accordingly
```

6. Add a `.sass-version` CI check to the pipeline to fail fast if the wrong Sass version is installed, preventing silent regressions.

---

## Scenario 7: Building a Reusable SCSS Mixin Library for a WordPress Theme Framework

**Scenario:** A WordPress theme framework is shared across an agency's 20+ client projects. Every project re-implements the same patterns: responsive typography, accessible focus rings, CSS Grid scaffolding, button variants, and visually-hidden utility. Inconsistencies have crept in across projects. The team wants a versioned, published SCSS mixin library (internal npm package) that all themes consume.

**Challenge:** Design a mixin library that is composable, has no side effects when `@use`d, and covers the most commonly duplicated patterns.

**Solution:**
1. Structure the library as a collection of namespaced partials with a single barrel index:

```
@agency/scss-toolkit/
├── _layout.scss
├── _typography.scss
├── _accessibility.scss
├── _interaction.scss
└── index.scss   ← @forward all partials
```

2. Layout mixins — zero side effects, purely generative:

```scss
// _layout.scss
@use 'sass:math';

/// Responsive CSS Grid with auto-fit columns
/// @param {Length} $min-col — minimum column width
/// @param {Length} $gap — grid gap
@mixin auto-grid($min-col: 280px, $gap: 1.5rem) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(#{$min-col}, 100%), 1fr));
  gap: $gap;
}

/// Centered content column with max-width and inline padding
/// @param {Length} $max-width
/// @param {Length} $padding
@mixin content-column($max-width: 75rem, $padding: 1.5rem) {
  max-width: $max-width;
  margin-inline: auto;
  padding-inline: $padding;
}
```

3. Accessibility mixins:

```scss
// _accessibility.scss

/// Visually hidden but available to screen readers
@mixin visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/// Accessible focus ring using outline (not box-shadow)
/// @param {Color} $color — ring color
/// @param {Length} $offset — outline offset
@mixin focus-ring($color: var(--color-primary), $offset: 3px) {
  &:focus-visible {
    outline: 3px solid $color;
    outline-offset: $offset;
    border-radius: 2px;
  }
}
```

4. Typography mixin for fluid type:

```scss
// _typography.scss
@use 'sass:math';

/// Fluid font-size using clamp()
/// @param {Length} $min — minimum font size (rem)
/// @param {Length} $max — maximum font size (rem)
/// @param {Length} $min-vw — viewport at which scaling starts (px)
/// @param {Length} $max-vw — viewport at which scaling ends (px)
@mixin fluid-type($min, $max, $min-vw: 375px, $max-vw: 1440px) {
  $slope: math.div($max - $min, $max-vw - $min-vw);
  $intercept: $min - ($slope * $min-vw);
  font-size: clamp(#{$min}, #{$intercept} + #{$slope * 100}vw, #{$max});
}
```

5. Consuming the library in a WordPress theme:

```scss
// theme/style.scss
@use '@agency/scss-toolkit' as tk;

.wp-block-group.is-layout-constrained {
  @include tk.content-column($max-width: 72rem);
}

.post-grid {
  @include tk.auto-grid($min-col: 300px, $gap: 2rem);
}

.wp-block-button__link {
  @include tk.focus-ring(var(--wp--preset--color--primary));
}

h1 { @include tk.fluid-type(1.75rem, 3.5rem); }
h2 { @include tk.fluid-type(1.375rem, 2.5rem); }
```
