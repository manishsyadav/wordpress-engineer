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

---

## Scenario 4: Auditing and Fixing WCAG 2.1 AA Accessibility Issues in a WordPress Theme

**Scenario:** A government agency client requires WCAG 2.1 AA compliance. An automated audit using axe DevTools returns 47 violations. The most critical are: missing landmark regions, form inputs without labels, insufficient color contrast, missing alt text on informational images, and an icon-only navigation that conveys no text to screen readers.

**Challenge:** Systematically fix each class of violation across the theme templates without breaking the visual design.

**Solution:**
1. Fix landmark regions — every page must have exactly one `<main>`, a `<header>`, a `<footer>`, and labeled `<nav>` elements:

```html
<body>
  <!-- Skip link must be the first focusable element -->
  <a class="skip-link" href="#main">Skip to main content</a>

  <header role="banner">
    <nav aria-label="Primary">...</nav>
    <nav aria-label="Utility">...</nav>
  </header>

  <main id="main" tabindex="-1">
    <aside aria-label="Sidebar">...</aside>
  </main>

  <footer role="contentinfo">...</footer>
</body>
```

2. Fix form labels — every input must have a programmatically associated label. Never use `placeholder` as a substitute:

```html
<!-- Before: inaccessible -->
<input type="text" placeholder="Search">

<!-- After: explicit label (or aria-label for search) -->
<label for="site-search" class="visually-hidden">Search this site</label>
<input type="search" id="site-search" name="s"
  aria-describedby="search-hint">
<span id="search-hint" class="visually-hidden">Press Enter to submit</span>
```

3. Fix icon-only buttons — every interactive control must have an accessible name:

```html
<!-- Before: inaccessible -->
<button class="hamburger"><svg>...</svg></button>

<!-- After: visually hidden label -->
<button class="hamburger" aria-expanded="false" aria-controls="primary-nav">
  <svg aria-hidden="true" focusable="false">...</svg>
  <span class="visually-hidden">Open navigation menu</span>
</button>
```

4. Fix color contrast — identify all text/background combinations below 4.5:1 (normal text) or 3:1 (large text ≥18pt). Update CSS custom property values in `theme.json` or `style.css`:

```html
<!-- Contrast check in DevTools: Accessibility > Color contrast -->
<!-- Before: #767676 on #fff = 4.48:1 (FAILS for normal text) -->
<!-- After: #595959 on #fff = 7.0:1 (PASSES AA and AAA) -->
```

5. Fix decorative vs informational images — decorative images must have `alt=""`, informational images must have descriptive alt text:

```html
<!-- Decorative: empty alt, role="presentation" prevents SR announcement -->
<img src="divider.svg" alt="" role="presentation">

<!-- Informational: describes the image content meaningfully -->
<img src="ceo-headshot.jpg"
  alt="Jane Smith, Chief Executive Officer, standing in front of company logo"
  width="300" height="300">

<!-- Functional (linked): alt describes the destination, not the image -->
<a href="/home"><img src="logo.png" alt="Acme Corp — return to homepage"></a>
```

---

## Scenario 5: Implementing Structured Data (Schema.org JSON-LD) for a WooCommerce Product Page

**Scenario:** A WooCommerce store's product pages are not showing rich results (star ratings, price, availability) in Google Search. Google Search Console shows "Product not eligible for rich results" and the Rich Results Test reports missing required properties: `offers`, `aggregateRating`, and `name`.

**Challenge:** Add complete, valid Schema.org `Product` JSON-LD markup to WooCommerce product pages that satisfies Google's rich result requirements.

**Solution:**
1. Add the JSON-LD block to the `<head>` via `wp_head`. Fetch live WooCommerce data so the markup is always current:

```php
// functions.php
add_action( 'wp_head', function() {
    if ( ! is_product() ) return;

    global $post;
    $product = wc_get_product( $post->ID );
    if ( ! $product ) return;

    $rating_count = $product->get_rating_count();
    $avg_rating   = $product->get_average_rating();

    $schema = [
        '@context'    => 'https://schema.org',
        '@type'       => 'Product',
        'name'        => $product->get_name(),
        'description' => wp_strip_all_tags( $product->get_short_description() ),
        'sku'         => $product->get_sku(),
        'image'       => wp_get_attachment_image_url( $product->get_image_id(), 'full' ),
        'brand'       => [
            '@type' => 'Brand',
            'name'  => get_bloginfo( 'name' ),
        ],
        'offers' => [
            '@type'         => 'Offer',
            'url'           => get_permalink(),
            'priceCurrency' => get_woocommerce_currency(),
            'price'         => $product->get_price(),
            'availability'  => $product->is_in_stock()
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            'itemCondition' => 'https://schema.org/NewCondition',
            'seller'        => [
                '@type' => 'Organization',
                'name'  => get_bloginfo( 'name' ),
            ],
        ],
    ];

    if ( $rating_count > 0 ) {
        $schema['aggregateRating'] = [
            '@type'       => 'AggregateRating',
            'ratingValue' => $avg_rating,
            'reviewCount' => $rating_count,
            'bestRating'  => '5',
            'worstRating' => '1',
        ];
    }

    echo '<script type="application/ld+json">'
        . wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
        . '</script>' . "\n";
} );
```

2. The rendered output in `<head>` will look like this:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Premium Leather Wallet",
  "description": "Full-grain leather, RFID-blocking, 8 card slots.",
  "sku": "WALLET-BLK-001",
  "image": "https://example.com/wp-content/uploads/wallet.jpg",
  "brand": { "@type": "Brand", "name": "Acme Store" },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/product/wallet/",
    "priceCurrency": "USD",
    "price": "49.99",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition",
    "seller": { "@type": "Organization", "name": "Acme Store" }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "83",
    "bestRating": "5",
    "worstRating": "1"
  }
}
</script>
```

3. Validate with Google's Rich Results Test (`https://search.google.com/test/rich-results`) and fix any warnings. Common fixes: ensure `price` is a string (not integer), `image` is an absolute URL, and `priceCurrency` is a valid ISO 4217 code.

---

## Scenario 6: Fixing Invalid HTML That Causes Layout Breaks Across Browsers in a WordPress Theme

**Scenario:** A WordPress theme looks correct in Chrome but breaks in Safari and Firefox. The sidebar collapses, a dropdown menu appears underneath content, and a WooCommerce product gallery loses its grid layout. Running the page through the W3C Validator reveals 23 errors including: block elements nested inside `<p>`, a `<div>` inside a `<ul>`, duplicate `id` attributes, and unclosed tags.

**Challenge:** Fix each category of invalid HTML that is causing the cross-browser layout failures.

**Solution:**
1. Fix block-in-inline nesting — browsers apply divergent error recovery when block elements appear inside `<p>`, causing the paragraph to be auto-closed in different places:

```html
<!-- Before: invalid — <div> inside <p> causes implicit close in some browsers -->
<p>Read the full guide: <div class="cta-box">Download Now</div></p>

<!-- After: use a block element as the wrapper -->
<div class="text-with-cta">
  <p>Read the full guide:</p>
  <div class="cta-box">Download Now</div>
</div>
```

2. Fix invalid list structure — only `<li>` is a valid direct child of `<ul>` and `<ol>`:

```html
<!-- Before: invalid — <div> directly inside <ul> -->
<ul class="product-list">
  <div class="product-list__inner">
    <li>Product A</li>
    <li>Product B</li>
  </div>
</ul>

<!-- After: remove the wrapper div, apply class to <ul> -->
<ul class="product-list">
  <li>Product A</li>
  <li>Product B</li>
</ul>
```

3. Fix duplicate `id` attributes — IDs must be unique per page. Duplicate IDs cause `getElementById()`, anchor navigation, and `aria-labelledby` to fail unpredictably:

```html
<!-- Before: duplicate id="read-more" on every post card -->
<article>
  <a id="read-more" href="/post-1/">Read More</a>
</article>
<article>
  <a id="read-more" href="/post-2/">Read More</a>
</article>

<!-- After: use class, not id, for repeated elements -->
<article>
  <a class="read-more-link" href="/post-1/" aria-label="Read more about Post Title 1">Read More</a>
</article>
<article>
  <a class="read-more-link" href="/post-2/" aria-label="Read more about Post Title 2">Read More</a>
</article>
```

4. Fix unclosed tags that cause the parser to swallow subsequent sibling elements — common in PHP templates where conditional blocks are not properly closed:

```php
<?php // Before: unclosed <div> when condition is false ?>
<?php if ( $show_banner ) : ?>
  <div class="promo-banner">
    <p><?php echo $banner_text; ?></p>
<?php endif; ?>

<?php // After: always close the tag inside the same conditional block ?>
<?php if ( $show_banner ) : ?>
  <div class="promo-banner">
    <p><?php echo esc_html( $banner_text ); ?></p>
  </div>
<?php endif; ?>
```

5. Fix `<table>` without required structure — missing `<tbody>` causes Firefox to render table rows outside the table flow:

```html
<!-- Before: implicit tbody; Firefox renders differently -->
<table>
  <tr><th>Name</th><th>Price</th></tr>
  <tr><td>Widget</td><td>$9.99</td></tr>
</table>

<!-- After: explicit thead, tbody, th scope -->
<table>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Widget</td>
      <td>$9.99</td>
    </tr>
  </tbody>
</table>
```

---

## Scenario 7: Optimizing HTML Output for Core Web Vitals in a WordPress Site

**Scenario:** A WordPress news site scores 38 on PageSpeed Insights (mobile). LCP is 7.1s caused by a hero image discovered late in the waterfall. CLS is 0.41 from an injected ad banner that shifts all content down 250px after load. INP is 380ms from a nav menu that runs expensive DOM queries on every keypress in a search field. All issues are attributable to HTML structure decisions, not JavaScript logic.

**Challenge:** Fix LCP, CLS, and INP through targeted HTML changes in WordPress theme templates.

**Solution:**
1. Fix LCP — the hero image is discovered only after the browser parses `<body>`. Add a `<link rel="preload">` in `<head>` and mark the image with `fetchpriority="high"`. Remove `loading="lazy"` from the LCP image:

```html
<!-- In <head> — add via wp_head with priority 1 -->
<link rel="preload" as="image"
  href="/wp-content/uploads/2025/hero-1200.webp"
  imagesrcset="
    /wp-content/uploads/2025/hero-400.webp 400w,
    /wp-content/uploads/2025/hero-800.webp 800w,
    /wp-content/uploads/2025/hero-1200.webp 1200w"
  imagesizes="100vw"
  crossorigin>

<!-- In the template — fetchpriority="high", NO loading="lazy" -->
<img
  src="/wp-content/uploads/2025/hero-1200.webp"
  srcset="
    /wp-content/uploads/2025/hero-400.webp 400w,
    /wp-content/uploads/2025/hero-800.webp 800w,
    /wp-content/uploads/2025/hero-1200.webp 1200w"
  sizes="100vw"
  width="1200"
  height="630"
  fetchpriority="high"
  decoding="async"
  alt="Breaking: Council votes on city budget">
```

2. Fix CLS from the ad banner — reserve the exact space the ad will occupy before it loads using explicit dimensions or `aspect-ratio`. Never inject ads that push content down:

```html
<!-- Reserve ad space in the HTML before the ad script fires -->
<div class="ad-slot ad-slot--leaderboard"
  style="width:100%; aspect-ratio: 728/90; min-height:90px; background:#f5f5f5;"
  aria-hidden="true"
  data-ad-unit="homepage-top">
  <!-- Ad fills this container — no layout shift -->
</div>
```

3. For mobile ads with a different size, use `contain-intrinsic-size` so the reserved space matches the actual rendered size:

```html
<div class="ad-slot ad-slot--mobile"
  style="content-visibility:auto; contain-intrinsic-size: 0 250px;">
</div>
```

4. Fix INP from the search field — the expensive DOM query runs synchronously on `input`. Move it to a `<datalist>` for native browser-handled autocomplete, eliminating the JS overhead entirely:

```html
<!-- Replace JS autocomplete with native datalist -->
<label for="site-search" class="visually-hidden">Search</label>
<input type="search" id="site-search" name="s"
  list="search-suggestions"
  autocomplete="off"
  aria-autocomplete="list"
  aria-controls="search-suggestions">

<datalist id="search-suggestions">
  <!-- Populated server-side or via a single lightweight fetch -->
  <?php foreach ( $suggestions as $s ) : ?>
    <option value="<?php echo esc_attr( $s ); ?>">
  <?php endforeach; ?>
</datalist>
```

5. Eliminate render-blocking `<script>` tags in `<head>` by moving all non-critical scripts to the closing `</body>` tag or adding `defer`/`async`. In WordPress, set the `in_footer` parameter to `true` on all non-critical `wp_enqueue_script()` calls:

```html
<!-- Before: render-blocking -->
<head>
  <script src="navigation.js"></script>
</head>

<!-- After: deferred — parsed after HTML, executed after DOMContentLoaded -->
<script src="navigation.js" defer></script>
```
