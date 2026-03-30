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
