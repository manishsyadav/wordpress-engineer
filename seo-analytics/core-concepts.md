# Marketing / SEO / GTM / GA — Core Concepts

## 1. Technical SEO Fundamentals

Technical SEO ensures search engines can crawl, index, and understand your site.

**Crawlability:**
- `robots.txt` — controls which paths crawlers can access. `Disallow: /wp-admin/` is standard; never disallow CSS/JS (renders poorly).
- XML sitemap (`/sitemap.xml`) — lists all indexable URLs with `<lastmod>`, `<changefreq>`, `<priority>`. WordPress generates via Yoast, RankMath, or the built-in core sitemap (WP 5.5+).
- Internal linking — PageRank flows through internal links; orphan pages (no inbound links) may not be crawled.

**Indexability:**
- `<meta name="robots" content="noindex">` — removes a page from search index.
- `X-Robots-Tag` HTTP header — same effect, works for non-HTML resources (PDFs).
- `rel="canonical"` — prevents duplicate content; tells Google which URL is the authoritative version.
- `rel="nofollow"` — tells crawlers not to follow a link or pass PageRank.

---

## 2. Core Web Vitals (CWV)

CWV are Google's page experience metrics, directly affecting Search ranking.

| Metric | Full Name | What it Measures | Good Threshold |
|--------|-----------|-----------------|----------------|
| LCP | Largest Contentful Paint | Loading performance | < 2.5s |
| INP | Interaction to Next Paint | Interactivity | < 200ms |
| CLS | Cumulative Layout Shift | Visual stability | < 0.1 |

**LCP** — the render time of the largest visible element (usually a hero image or heading). Improve by: preloading the LCP image (`<link rel="preload">`), using `fetchpriority="high"`, serving from CDN, using WebP, eliminating render-blocking resources.

**INP** — measures the delay between user interaction and the next visual update. Improve by: reducing JavaScript execution time, avoiding long tasks (> 50ms), using Web Workers for heavy computation, deferring non-critical scripts.

**CLS** — measures unexpected layout shifts. Improve by: always setting `width` and `height` on images, using CSS `aspect-ratio`, reserving space for ads/embeds, not injecting content above existing content.

---

## 3. Structured Data (Schema.org / JSON-LD)

Structured data helps search engines understand content and enables Rich Results (star ratings, FAQs, breadcrumbs, recipes, events, products).

```html
<!-- Article schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Speed Up WordPress",
  "datePublished": "2026-03-29T10:00:00Z",
  "dateModified": "2026-03-29T12:00:00Z",
  "author": { "@type": "Person", "name": "Jane Doe" },
  "publisher": {
    "@type": "Organization",
    "name": "WP Guide",
    "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" }
  },
  "image": "https://example.com/featured.jpg"
}
</script>
```

Google's preferred format is JSON-LD (separate from HTML). Key types for WordPress sites: `Article`, `BlogPosting`, `Product`, `FAQPage`, `BreadcrumbList`, `WebSite`, `LocalBusiness`, `Event`, `HowTo`.

---

## 4. Google Tag Manager (GTM) Architecture

GTM is a tag management system that lets marketers deploy tracking code without developer involvement.

**Core concepts:**
- **Container** — a snippet of JavaScript (`gtm.js`) placed on every page. One container per website (or mobile app).
- **Tags** — snippets of code that fire (e.g., Google Analytics 4 event, Meta Pixel, custom HTML).
- **Triggers** — conditions that cause tags to fire (page view, click, form submission, scroll depth, custom event).
- **Variables** — reusable values used in tags and triggers (page URL, click text, data layer variable, cookie).
- **Data Layer** — a JavaScript array (`window.dataLayer`) that acts as a communication channel between the website and GTM.

GTM in WordPress: use `wp_enqueue_script` to add the GTM snippet, or a plugin (GTMWP, MonsterInsights). Never hardcode GTM in themes — use functions.php with proper enqueueing.

---

## 5. Google Analytics 4 (GA4)

GA4 replaced Universal Analytics on July 1, 2023. It is event-based (no sessions/pageviews as first-class metrics — everything is an event).

**Key differences from UA:**
- Event-based model: `page_view`, `scroll`, `click`, `form_submit` are all events with parameters.
- Sessions are calculated from events, not the reverse.
- `user_id` for cross-device tracking.
- Explorations — ad-hoc analysis tool.
- BigQuery export — raw events to BigQuery for custom SQL analysis.
- Consent mode — adjust data collection based on user consent.

**Automatic events:** GA4 auto-tracks: `page_view`, `scroll` (90%), `click` (outbound links), `file_download`, `video_start/progress/complete`, `first_visit`, `session_start`.

**Recommended events:** `purchase`, `add_to_cart`, `begin_checkout`, `login`, `sign_up`, `search`, `share`.

---

## 6. The Data Layer

```javascript
// Initialize data layer before GTM snippet loads
window.dataLayer = window.dataLayer || [];

// Push events to data layer (GTM reads from here)
window.dataLayer.push({
    event: 'post_view',
    post: {
        id:       42,
        title:    'WordPress Performance Guide',
        category: 'Performance',
        author:   'Jane Doe',
        tags:     ['wordpress', 'speed', 'optimization'],
    },
    user: {
        isLoggedIn: true,
        role:       'subscriber',
    },
});
```

In WordPress, populate the data layer server-side via `wp_localize_script` or inline script in `wp_head` (before GTM loads):

```php
add_action('wp_head', function() {
    global $post;
    if (! is_singular()) return;

    $data_layer = [
        'event'    => 'page_view',
        'pageType' => get_post_type(),
        'postId'   => get_the_ID(),
        'postTitle' => get_the_title(),
        'categories' => wp_list_pluck(get_the_category(), 'name'),
    ];

    printf(
        '<script>window.dataLayer = window.dataLayer || []; window.dataLayer.push(%s);</script>',
        wp_json_encode($data_layer)
    );
}, 1); // priority 1 — before GTM
```

---

## 7. Conversion Tracking

**GA4 conversions** — mark events as conversions in GA4 UI. Common: `purchase`, `generate_lead`, `sign_up`.

**Google Ads conversion tracking** — install via GTM or direct code. Requires a conversion action created in Google Ads and a trigger in GTM based on a `purchase` or `thank_you` page event.

**Meta Pixel** — Facebook's equivalent of GTM for Meta advertising. Tracks: `PageView`, `ViewContent`, `AddToCart`, `Purchase`. Install via GTM for easier management.

**Server-side tracking** — GA4 Measurement Protocol / Conversions API — send events directly from the server, bypassing browser ad blockers. Critical for accurate e-commerce conversion tracking (especially post iOS 14.5).

---

## 8. SEO Plugins and WordPress Integration

**Yoast SEO** — the most popular; adds meta titles, descriptions, XML sitemap, breadcrumbs, canonical tags, Open Graph, and structured data. Provides a readability/keyword analysis interface.

**RankMath** — feature-rich alternative; includes schema builder, analytics dashboard, and redirection manager.

**Key filters:**
```php
// Customize Yoast SEO meta title
add_filter('wpseo_title', function($title) {
    if (is_post_type_archive('product')) {
        return 'All Products | ' . get_bloginfo('name');
    }
    return $title;
});

// Add custom Open Graph tags
add_filter('wpseo_opengraph_type', function() {
    if (is_singular('product')) return 'product';
    return 'article';
});
```

---

## 9. Consent Management and Privacy

**GDPR and CCPA** require user consent before non-essential cookies (analytics, advertising) are set.

**Consent Mode v2 (Google):**
```javascript
// Initialize with default denied state (before user consent)
gtag('consent', 'default', {
    'analytics_storage':        'denied',
    'ad_storage':               'denied',
    'ad_user_data':             'denied',
    'ad_personalization':       'denied',
    'wait_for_update':          500,  // wait 500ms for CMP signal
});

// After user grants consent:
gtag('consent', 'update', {
    'analytics_storage':        'granted',
    'ad_storage':               'granted',
});
```

WordPress consent plugins: CookieYes, Complianz, Borlabs Cookie. They integrate with GTM Consent Mode automatically.

---

## 10. Redirects and URL Structure

**301 vs 302:** 301 (permanent) — passes ~85% PageRank; crawlers update their index. 302 (temporary) — no PageRank transfer; crawlers keep the original URL.

**Common redirect scenarios in WordPress:**
```php
// Add redirect in functions.php (runs on every request — use plugins for large lists)
add_action('template_redirect', function() {
    if (is_page('old-about')) {
        wp_redirect(home_url('/about-us/'), 301);
        exit;
    }
});

// Yoast SEO / RankMath handle redirects via database
// For large redirect lists: use Nginx rules (fastest):
// rewrite ^/old-path$ /new-path permanent;
```

URL structure best practices: short, descriptive, lowercase, hyphen-separated, keyword-relevant slugs. Use `/%postname%/` permalink structure (no dates for evergreen content).

---

## 11. Site Speed and SEO

Page speed is a confirmed Google ranking factor (since 2010 for desktop, 2018 for mobile via "Speed Update," and 2021 via the Page Experience update using Core Web Vitals).

WordPress speed checklist for SEO:
1. Use a lightweight theme (GeneratePress, Kadence, Blocksy).
2. Minify CSS/JS (Autoptimize, WP Rocket).
3. Serve WebP images (ShortPixel, Imagify).
4. Enable GZIP/Brotli compression at Nginx level.
5. Use a CDN (Cloudflare, BunnyCDN).
6. Implement full-page caching (WP Rocket, W3 Total Cache).
7. Use Redis object caching.
8. Defer/async non-critical JavaScript.
9. Remove unused plugins (each adds database queries and/or CSS/JS).
10. Monitor CWV monthly via Google Search Console > Experience > Core Web Vitals.
