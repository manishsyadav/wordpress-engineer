# SASS / SCSS — Core Concepts

## 1. SCSS vs SASS Syntax
SCSS (Sassy CSS) uses CSS-compatible syntax with curly braces and semicolons. SASS uses indentation-based syntax (no braces/semicolons). SCSS is more widely used as it's a superset of CSS — any valid CSS is valid SCSS. WordPress theme development predominantly uses SCSS.

## 2. Variables
`$variable-name: value` — compile-time constants. Scoped to block by default. Global with `!global` flag. Less powerful than CSS custom properties (can't change at runtime) but useful for build-time values: breakpoints, z-index scales, font stacks. Best practice: define all variables in a `_variables.scss` partial.

## 3. Nesting
Nest selectors to mirror HTML structure. Reduces repetition. `&` refers to parent selector — used for BEM modifiers (`&__element`, `&--modifier`), pseudo-classes (`&:hover`), and state classes (`&.is-active`). Avoid deep nesting (>3 levels) — increases specificity and reduces readability.

## 4. Partials & @use / @import
Partials are SCSS files prefixed with `_` (e.g., `_variables.scss`). `@use 'variables'` imports a partial — creates a namespace (`variables.$color-primary`). `@forward` re-exports partials. Modern: `@use`/`@forward` replace deprecated `@import` (which caused global namespace pollution).

## 5. Mixins
`@mixin name($args) { ... }` — reusable blocks of CSS. Called with `@include name(args)`. Accept default argument values. Used for: vendor prefixes, responsive breakpoints, button variants, flex/grid patterns. Mixins output repeated CSS — use `%placeholder` + `@extend` for shared properties without duplication.

## 6. Functions
`@function name($args) { @return value; }` — return computed values for use in properties. Built-in functions: `darken()`, `lighten()`, `mix()`, `rgba()`, `map-get()`, `list-nth()`. Custom functions are good for spacing scales, color manipulation, and unit conversion.

## 7. @extend & Placeholders
`%placeholder` defines CSS that's only output when extended. `@extend %placeholder` merges selectors in output. More DRY than mixins for shared property groups. Limitation: can't extend inside `@media`. Use placeholders over class extending to avoid unintended selector coupling.

## 8. Control Flow (@if, @each, @for, @while)
`@if/$else` — conditional styles based on variable values. `@each $item in $list` — iterate over lists/maps. `@for $i from 1 through 10` — numeric loops. Used for generating utility classes, color variations, grid columns, spacing utilities. Enables programmatic CSS generation.

## 9. Maps
`$map: (key: value, key2: value2)`. Access with `map-get($map, key)` or `map.get($map, key)` (modern). Iterate with `@each $key, $value in $map`. Great for color palettes, breakpoints, spacing scales, z-index layers. Central configuration that can be looped to generate utility classes.

## 10. Architecture (7-1 Pattern / ITCSS)
7-1 Pattern: 7 folders (abstracts, base, components, layout, pages, themes, vendors), 1 main file importing all. ITCSS (Inverted Triangle): specificity increases from settings → tools → generic → elements → objects → components → utilities. WordPress themes often use a simplified version: abstracts, base, layout, components, pages.
