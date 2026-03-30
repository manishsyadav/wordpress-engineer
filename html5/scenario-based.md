# HTML5 — Scenario-Based Questions

## Scenario 1: Poor Core Web Vitals Score

**Scenario:** A WordPress site scores 45 on PageSpeed Insights. LCP is 6.2s, CLS is 0.28, FID/INP is high.

**Challenge:** Improve all three Core Web Vitals using HTML changes alone (no plugins).

**Solution:**
```html
<!-- Fix LCP: preload hero image + fetchpriority -->
<link rel="preload" as="image"
  href="/wp-content/uploads/hero.webp"
  imagesrcset="/wp-content/uploads/hero-400.webp 400w, /wp-content/uploads/hero-800.webp 800w"
  imagesizes="100vw">

<img src="/wp-content/uploads/hero.webp"
  srcset="/wp-content/uploads/hero-400.webp 400w, /wp-content/uploads/hero-800.webp 800w"
  sizes="100vw"
  width="1200" height="600"
  fetchpriority="high"
  alt="Hero banner">

<!-- Fix CLS: always set width + height on images -->
<img src="photo.jpg" width="800" height="600" loading="lazy" alt="...">

<!-- Fix CLS: reserve space for ads/embeds -->
<div style="aspect-ratio: 16/9; width: 100%;">
  <iframe src="..." loading="lazy" width="100%" height="100%"></iframe>
</div>

<!-- Fix FID/INP: defer non-critical scripts -->
<script src="analytics.js" defer></script>
<script src="chat-widget.js" defer></script>

<!-- Preconnect to third-party origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

---

## Scenario 2: Inaccessible WordPress Theme

**Scenario:** A client's custom theme fails WCAG 2.1 AA audit. Navigation is keyboard-inaccessible, forms have no labels, and modals trap focus incorrectly.

**Challenge:** Fix accessibility issues in the HTML structure.

**Solution:**
```html
<!-- Navigation: add skip link -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Navigation: proper ARIA landmark + keyboard support -->
<nav aria-label="Main navigation">
  <button aria-expanded="false" aria-controls="nav-menu" id="nav-toggle">
    <span aria-hidden="true">☰</span> Menu
  </button>
  <ul id="nav-menu" role="list">
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<main id="main-content" tabindex="-1">...</main>

<!-- Forms: labels + error messages -->
<form>
  <div>
    <label for="email">Email address <span aria-hidden="true">*</span></label>
    <input type="email" id="email" name="email" required
      aria-required="true"
      aria-describedby="email-error">
    <span id="email-error" role="alert" aria-live="polite"></span>
  </div>
</form>

<!-- Modal: focus trap + aria -->
<dialog id="modal" aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Confirm Action</h2>
  <p>Are you sure?</p>
  <button autofocus>Confirm</button>
  <button onclick="document.getElementById('modal').close()">Cancel</button>
</dialog>
```

---

## Scenario 3: Social Sharing Not Working

**Scenario:** When sharing a WordPress post on LinkedIn/Twitter, the preview shows wrong title, no image, and the site name instead of the article name.

**Challenge:** Add correct Open Graph and Twitter Card meta tags.

**Solution:**
```html
<!-- In <head> — WordPress: add via wp_head hook or Yoast/RankMath -->
<!-- Open Graph (Facebook, LinkedIn, WhatsApp) -->
<meta property="og:type" content="article">
<meta property="og:title" content="How to Speed Up WordPress — 10 Proven Tips">
<meta property="og:description" content="Learn the exact techniques used on enterprise WordPress sites to achieve sub-2s load times.">
<meta property="og:image" content="https://example.com/wp-content/uploads/speed-guide.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://example.com/speed-up-wordpress/">
<meta property="og:site_name" content="WP Performance Blog">
<meta property="article:published_time" content="2024-01-15T09:00:00+00:00">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@wpblog">
<meta name="twitter:title" content="How to Speed Up WordPress — 10 Proven Tips">
<meta name="twitter:description" content="Learn the exact techniques used on enterprise WordPress sites.">
<meta name="twitter:image" content="https://example.com/wp-content/uploads/speed-guide.jpg">
```
