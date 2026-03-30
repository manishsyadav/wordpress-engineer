# CSS3 — Scenario-Based Questions

## Scenario 1: Gutenberg Block Styling Conflict

**Scenario:** A custom Gutenberg block looks correct in the editor but wrong on the front end. The block's button has a different color and the layout breaks on mobile.

**Challenge:** Diagnose and fix CSS scoping issues between editor and front-end.

**Solution:**
```css
/* Editor styles load inside .editor-styles-wrapper — prefix required */
/* editor-style.css */
.editor-styles-wrapper .wp-block-my-plugin-cta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* Front-end style.css — same component, no wrapper needed */
.wp-block-my-plugin-cta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* Shared via block.json style property — single file for both */
/* In block.json: "style": "file:./style.css", "editorStyle": "file:./editor.css" */

/* Fix: use CSS custom properties for theme colors — works in both */
.wp-block-my-plugin-cta .cta-button {
  background-color: var(--wp--preset--color--primary, #0d7377);
  color: var(--wp--preset--color--base, #ffffff);
  padding: var(--wp--preset--spacing--30, 0.75rem 1.5rem);
  border-radius: 4px;
}

/* Mobile breakpoint */
@media (max-width: 600px) {
  .wp-block-my-plugin-cta {
    flex-direction: column;
    align-items: stretch;
  }
}
```

---

## Scenario 2: Layout Shift (CLS) from Dynamic Content

**Scenario:** A news site has CLS of 0.35 (poor). Browser DevTools shows layout shifts caused by ads loading late and images without dimensions.

**Challenge:** Fix CLS using CSS techniques.

**Solution:**
```css
/* Fix 1: Reserve space for ad slots with aspect-ratio */
.ad-container {
  aspect-ratio: 970 / 250;   /* leaderboard dimensions */
  width: 100%;
  background: #f0f0f0;       /* placeholder color */
  overflow: hidden;
}

/* Fix 2: Image containers with known aspect ratio */
.post-thumbnail {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
}
.post-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Fix 3: Prevent font CLS with font-display */
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2') format('woff2');
  font-display: optional;   /* no layout shift — uses fallback if not cached */
  /* or: font-display: swap + size-adjust to match fallback metrics */
}

/* Fix 4: Skeleton loading placeholders */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Scenario 3: CSS Performance on a Large WordPress Theme

**Scenario:** A WordPress theme loads 800KB of CSS. DevTools Coverage shows 85% is unused. Theme uses Bootstrap + custom SCSS.

**Challenge:** Reduce CSS payload without breaking the design.

**Solution:**
```css
/* Strategy 1: Split CSS by page template */
/* Only load what each template needs */
/* functions.php: wp_enqueue_style conditionally */

/* Strategy 2: Use CSS @layer for override management */
@layer reset, base, components, utilities;

@layer base {
  body { font-family: system-ui, sans-serif; }
}

@layer components {
  .card { border-radius: 8px; padding: 1rem; }
}

@layer utilities {
  .text-center { text-align: center; }
  .mt-4 { margin-top: 1rem; }
}
/* Utilities always win without !important — layer order controls cascade */

/* Strategy 3: Use CSS custom properties instead of utility classes */
:root {
  --color-primary: #0d7377;
  --color-text: #2d3748;
  --spacing-base: 1rem;
  --radius: 4px;
}

/* Strategy 4: Container queries replace breakpoint utilities */
.card-grid { container-type: inline-size; }

@container (min-width: 600px) {
  .card { display: flex; gap: 1rem; }
}
```

---

## Scenario 4: z-index Stacking Context Nightmare in a WordPress Theme

**Scenario:** A heavily layered WordPress theme has a sticky header (z-index: 999), a mega-menu dropdown (z-index: 9999), a cookie banner (z-index: 99999), and a WooCommerce mini-cart flyout (z-index: 1000). The mega-menu is invisible behind the cookie banner, the mini-cart clips under a hero section that has `transform: translateZ(0)` applied for a parallax effect, and `!important` z-index overrides have proliferated throughout the codebase.

**Challenge:** Untangle the stacking contexts, establish a sane z-index scale, and prevent regressions without rewriting every component.

**Solution:**
1. Audit all stacking context triggers with DevTools Layers panel. Any element with `transform`, `opacity < 1`, `filter`, `will-change`, or `isolation` creates a new context — children cannot escape it regardless of z-index value.
2. Remove `transform: translateZ(0)` from the hero section and replace the parallax with `will-change: transform` applied only during scroll (added/removed via JS), so the stacking context is transient.
3. Define a z-index token scale in one place and reference it everywhere:

```css
/* _z-index.css — single source of truth */
:root {
  --z-base:        1;
  --z-dropdown:   10;
  --z-sticky:     20;
  --z-overlay:    30;
  --z-modal:      40;
  --z-toast:      50;
}
```

4. Apply `isolation: isolate` to self-contained components (cards, hero, post blocks) so their internal z-index values never compete with the global stack:

```css
.wp-block-cover,
.entry-card {
  isolation: isolate; /* internal stacking is private */
}
```

5. Assign components their correct layer values:

```css
.site-header       { position: sticky; top: 0; z-index: var(--z-sticky); }
.mega-menu         { position: absolute; z-index: var(--z-dropdown); }
.wc-mini-cart      { position: fixed; z-index: var(--z-overlay); }
.cookie-banner     { position: fixed; z-index: var(--z-toast); }
```

6. Add a regression test by listing every stacking layer in a comment block at the top of the z-index file — review it on every PR that touches positioning.

---

## Scenario 5: Fully Responsive Accessible Mega-Menu Using CSS Only

**Scenario:** A WordPress theme client requires a multi-column mega-menu for a site with 60+ top-level pages. The previous implementation relied on a jQuery plugin that broke on mobile and was completely inaccessible by keyboard. The new requirement is CSS-only (no JavaScript), fully keyboard navigable, and WCAG 2.1 AA compliant.

**Challenge:** Implement a CSS-only mega-menu that opens on both hover and keyboard focus, collapses to a hamburger on mobile, and does not trap keyboard users.

**Solution:**
1. Use the `:focus-within` pseudo-class so the submenu stays visible while any child element holds focus — no JS needed:

```css
/* Base: hide submenus */
.mega-menu__panel {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  padding: 2rem;
  background: #fff;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
  /* Hidden state */
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px);
  transition: opacity 200ms ease, transform 200ms ease;
}

/* Reveal on hover OR keyboard focus anywhere inside */
.mega-menu__item:hover .mega-menu__panel,
.mega-menu__item:focus-within .mega-menu__panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
```

2. Ensure the trigger link has `aria-expanded` managed via a lightweight CSS custom property toggle (or accept that CSS-only cannot update ARIA — recommend progressive enhancement with a small JS enhancement for ARIA state only):

```css
/* Visually indicate expanded state without JS */
.mega-menu__trigger::after {
  content: '▾';
  margin-inline-start: 0.25rem;
  display: inline-block;
  transition: transform 200ms ease;
}
.mega-menu__item:focus-within .mega-menu__trigger::after,
.mega-menu__item:hover .mega-menu__trigger::after {
  transform: rotate(180deg);
}
```

3. Collapse to a checkbox-hack-free mobile drawer using `@media` + hidden `<details>`/`<summary>` for native disclosure:

```css
@media (max-width: 1023px) {
  .mega-menu__panel {
    position: static;
    opacity: 1;
    pointer-events: auto;
    transform: none;
    display: none; /* toggled by details[open] */
    box-shadow: none;
    padding: 0.5rem 0 0.5rem 1rem;
  }

  details.mega-menu__item[open] .mega-menu__panel {
    display: grid;
    grid-template-columns: 1fr;
  }
}
```

4. Ensure sufficient color contrast on all menu links (minimum 4.5:1 ratio) and add `:focus-visible` outlines:

```css
.mega-menu a:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}
```

---

## Scenario 6: Debugging CSS Specificity Conflicts Between Parent and Child Theme

**Scenario:** A WordPress child theme overrides the parent theme's button styles but the parent's styles keep winning. The developer has added `!important` to the child theme as a workaround, causing a cascade of override issues throughout the codebase. DevTools shows the child theme rules are being crossed out.

**Challenge:** Identify why the parent theme wins, fix specificity at the source, and remove all `!important` declarations from the child theme.

**Solution:**
1. In DevTools, inspect the struck-through rule and check the specificity scores shown in the Styles panel. A common cause is the parent using an ID selector or a long compound selector while the child uses a single class.

2. Identify the conflicting selectors:

```css
/* Parent theme — high specificity compound selector: 0,1,2,1 */
#page .site-content .wp-block-button__link { background: #333; }

/* Child theme — single class: 0,0,1,0 — LOSES */
.wp-block-button__link { background: var(--color-primary); }
```

3. Match or exceed specificity in the child theme without `!important` by replicating enough of the parent's selector structure:

```css
/* Child theme — matches parent specificity: 0,0,2,1 — WINS via source order */
.site-content .wp-block-button__link {
  background: var(--color-primary);
  color: var(--color-button-text, #fff);
}
```

4. A cleaner long-term fix is to use `@layer` — child theme styles placed in a later layer always win regardless of specificity:

```css
/* In child theme style.css — declare layers so child layer wins */
@layer parent, child;

@layer child {
  .wp-block-button__link {
    background: var(--color-primary);
    color: #fff;
    border-radius: var(--wp--custom--button--border--radius, 4px);
  }
}
```

5. Audit and remove all `!important` from the child theme. Search for the pattern and replace each one with a properly scoped selector or a layer-based override. Run a diff of compiled CSS before and after to confirm visual parity.

---

## Scenario 7: Optimizing CSS Delivery for a WordPress Site

**Scenario:** A WordPress site has a 220KB render-blocking stylesheet loaded in `<head>`. PageSpeed Insights flags "Eliminate render-blocking resources" and "Reduce unused CSS." The theme enqueues one monolithic CSS file covering all page templates, WooCommerce, and the blog archive.

**Challenge:** Implement critical CSS inlining, split non-critical CSS into async loads, and remove unused CSS — all without breaking the WordPress enqueue system.

**Solution:**
1. Generate critical CSS for the above-the-fold content of key templates (home, single, archive) using a tool such as `critical` (npm) or Penthouse. Inline the result directly in `<head>` via `wp_head`:

```php
// functions.php
add_action( 'wp_head', function() {
    if ( is_front_page() ) {
        $critical = file_get_contents( get_template_directory() . '/assets/css/critical-home.css' );
        echo '<style id="critical-css">' . $critical . '</style>';
    }
}, 1 );
```

2. Load the full stylesheet asynchronously to avoid render-blocking — use the `media="print"` trick which is widely supported:

```html
<!-- Non-critical stylesheet — loads async, applied after paint -->
<link rel="stylesheet" href="style.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="style.css"></noscript>
```

3. In WordPress, apply the async loading attribute via the `style_loader_tag` filter:

```php
add_filter( 'style_loader_tag', function( $html, $handle ) {
    $async_handles = [ 'my-theme-main', 'woocommerce-general' ];
    if ( in_array( $handle, $async_handles, true ) ) {
        $html = str_replace(
            "media='all'",
            "media='print' onload=\"this.media='all'\"",
            $html
        );
    }
    return $html;
}, 10, 2 );
```

4. Split the monolithic stylesheet by template. Conditionally enqueue only what each page type needs:

```php
// Enqueue WooCommerce CSS only on shop pages
add_action( 'wp_enqueue_scripts', function() {
    if ( ! is_woocommerce() && ! is_cart() && ! is_checkout() ) {
        wp_dequeue_style( 'woocommerce-general' );
        wp_dequeue_style( 'woocommerce-smallscreen' );
    }
} );
```

5. Run PurgeCSS (via PostCSS or Webpack) against all PHP template files and JS files to remove unused rules from the compiled stylesheet. Configure safelist patterns for dynamically added WordPress classes:

```js
// purgecss.config.js
module.exports = {
  content: ['./**/*.php', './**/*.js'],
  safelist: [
    /^wp-/, /^has-/, /^is-/, /^alignwide/, /^alignfull/,
    /^woocommerce/, /^onsale/
  ],
};
```
