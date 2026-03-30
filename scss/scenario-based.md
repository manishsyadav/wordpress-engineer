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
