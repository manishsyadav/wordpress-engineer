# SEO, Analytics & GTM — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is a title tag and what is the recommended formula for WordPress pages?**
**A:** The `<title>` tag is the primary on-page SEO signal and the clickable text in SERPs. Keep it under 60 characters using the pattern: Primary Keyword | Brand Name.
```html
<title>Buy Running Shoes Online | AcmeStore</title>
```

---

**Q2: What is a meta description and does it directly affect rankings?**
**A:** Meta descriptions do not directly influence rankings but improve click-through rate. Keep them under 160 characters and include a call to action.
```html
<meta name="description"
  content="Shop 200+ running shoe models. Free shipping over $50. Order today and run tomorrow.">
```

---

**Q3: What is the correct heading hierarchy for SEO?**
**A:** One `<h1>` per page (primary keyword), `<h2>` for main sections, `<h3>` for subsections. Headings signal content structure to crawlers and screen readers.
```html
<h1>Best Running Shoes for 2026</h1>
  <h2>Road Running Shoes</h2>
    <h3>Neutral Cushioning</h3>
  <h2>Trail Running Shoes</h2>
```

---

**Q4: What is a canonical URL and when do you use it?**
**A:** A canonical tag tells search engines which URL is the preferred version when duplicate or near-duplicate content exists across multiple URLs.
```html
<!-- On https://example.com/shoes?sort=price -->
<link rel="canonical" href="https://example.com/shoes">
```

---

**Q5: What is a `robots.txt` file and what can it control?**
**A:** `robots.txt` instructs crawlers which paths to exclude from crawling. It does not prevent indexing — use `noindex` for that.
```
User-agent: *
Disallow: /wp-admin/
Disallow: /wp-includes/
Allow: /wp-admin/admin-ajax.php
Sitemap: https://example.com/sitemap.xml
```

---

**Q6: What is an XML sitemap and why does it matter?**
**A:** An XML sitemap lists a site's important URLs to help search engines discover and prioritise content, especially for large or newly launched sites.
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/shoes/</loc>
    <lastmod>2026-03-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

**Q7: What is the difference between `noindex` and `nofollow`?**
**A:** `noindex` prevents the page from appearing in search results. `nofollow` tells crawlers not to pass link equity to linked pages. They are independent directives.
```html
<!-- Block page from index, but still follow its links -->
<meta name="robots" content="noindex, follow">

<!-- Follow page, but don't pass equity to outbound links -->
<meta name="robots" content="index, nofollow">
```

---

**Q8: What are Open Graph tags and why are they important?**
**A:** OG tags control how a page appears when shared on social media. `og:title`, `og:description`, and `og:image` are the most critical.
```html
<meta property="og:title" content="Best Running Shoes 2026">
<meta property="og:description" content="Expert picks for every runner.">
<meta property="og:image" content="https://example.com/og-shoes.jpg">
<meta property="og:url" content="https://example.com/running-shoes/">
```

---

**Q9: What are Core Web Vitals and what are their passing thresholds?**
**A:** Core Web Vitals are Google's UX metrics: LCP (Largest Contentful Paint) < 2.5s, CLS (Cumulative Layout Shift) < 0.1, INP (Interaction to Next Paint) < 200ms.
```
LCP  ≤ 2.5s  — Good   | 2.5–4.0s — Needs Improvement | > 4.0s — Poor
CLS  ≤ 0.1   — Good   | 0.1–0.25 — Needs Improvement  | > 0.25 — Poor
INP  ≤ 200ms — Good   | 200–500ms — Needs Improvement  | > 500ms — Poor
```

---

**Q10: What is JSON-LD Schema markup and what types are used for WordPress sites?**
**A:** JSON-LD is the recommended format for injecting structured data. Common types: `Article`, `Product`, `FAQPage`, `BreadcrumbList`, `WebSite`, `LocalBusiness`.
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Best Running Shoes 2026",
  "author": { "@type": "Person", "name": "Jane Doe" },
  "datePublished": "2026-01-15"
}
</script>
```

---

**Q11: What is hreflang and when do you use it?**
**A:** `hreflang` tells Google which language/region version of a page to serve to which audience. Use `x-default` for the fallback when no other tag matches.
```html
<link rel="alternate" hreflang="en" href="https://example.com/en/shoes/">
<link rel="alternate" hreflang="de" href="https://example.com/de/schuhe/">
<link rel="alternate" hreflang="x-default" href="https://example.com/shoes/">
```

---

**Q12: What is Google Analytics 4 (GA4) and how does it differ from Universal Analytics?**
**A:** GA4 is event-based — every interaction is an event with parameters. UA used a session/pageview-hit model. GA4 supports BigQuery export natively and has no sampling on raw data.
```javascript
// GA4 custom event via gtag.js
gtag('event', 'add_to_cart', {
  currency: 'USD',
  value: 49.99,
  items: [{ item_id: 'SKU123', item_name: 'Running Shoe' }]
});
```

---

**Q13: What is the `dataLayer` in Google Tag Manager?**
**A:** `dataLayer` is a JavaScript array used to pass data from the page to GTM. Tags read variables from it; you push objects to add new data.
```javascript
window.dataLayer = window.dataLayer || [];
dataLayer.push({
  event: 'form_submit',
  formName: 'contact',
  userId: '42'
});
```

---

**Q14: What is a GTM trigger and what are the common trigger types?**
**A:** A trigger tells GTM when to fire a tag. Common types: Page View, DOM Ready, Window Loaded, Click — All Elements, Click — Just Links, Custom Event (matched against `dataLayer.event`).
```
Trigger: Custom Event
Event Name: form_submit
→ Fires: GA4 Event Tag "generate_lead"
```

---

**Q15: What is Consent Mode v2 and why did Google introduce it?**
**A:** Consent Mode v2 lets sites signal user consent status to Google tags. Google uses behavioural modelling to fill measurement gaps when consent is denied, maintaining compliance with GDPR/DMA.
```javascript
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'denied',
  wait_for_update: 500
});
```

---

**Q16: How do you update Consent Mode after a user grants consent?**
**A:** Call `gtag('consent', 'update', {...})` with `'granted'` values after the user accepts in the CMP. GTM picks this up and retroactively fires pending tags.
```javascript
// Called by the CMP on user accept
gtag('consent', 'update', {
  ad_storage: 'granted',
  analytics_storage: 'granted'
});
dataLayer.push({ event: 'consent_update' });
```

---

**Q17: What is Google Search Console and what are its most useful reports?**
**A:** Search Console shows how Google crawls and indexes a site. Key reports: Performance (queries/clicks/CTR), Coverage (indexed vs excluded URLs), Core Web Vitals, Rich Results, and Manual Actions.
```
Coverage Report → check "Excluded" tab for:
  - Crawled - currently not indexed
  - Discovered - currently not indexed
  - Redirect error
  - Soft 404
```

---

**Q18: What is E-E-A-T and how does it relate to Google's ranking signals?**
**A:** E-E-A-T stands for Experience, Expertise, Authoritativeness, and Trustworthiness. It is a quality rater guideline framework that informs how Google algorithms assess content quality, especially for YMYL topics.
```
Signals that support E-E-A-T:
- Author bylines with credentials
- Cited sources and external links
- Schema markup (Person, Organization)
- Positive reviews and mentions
- Secure site (HTTPS), clear About/Contact pages
```

---

**Q19: How do you add Yoast SEO meta tags via WordPress hooks?**
**A:** Yoast fires `wpseo_title` and `wpseo_metadesc` filters to let you programmatically override titles and descriptions.
```php
add_filter('wpseo_title', function($title) {
  if (is_product()) {
    $title = get_the_title() . ' | Shop | ' . get_bloginfo('name');
  }
  return $title;
});
```

---

**Q20: What is crawl budget and how do you optimise it for large WordPress sites?**
**A:** Crawl budget is the number of pages Googlebot crawls in a given timeframe. Conserve it by noindexing low-value pages (tags, author archives, search results) and keeping the sitemap clean.
```php
// Noindex tag and author archives via Yoast or custom meta
add_action('wp_head', function() {
  if (is_tag() || is_author()) {
    echo '<meta name="robots" content="noindex, follow">';
  }
});
```

---

## Mid

**Q21: How do you implement FAQ Schema markup in WordPress with JSON-LD?**
**A:** Inject a `FAQPage` JSON-LD block in `wp_head`. Each question/answer pair goes in the `mainEntity` array.
```php
add_action('wp_head', function() {
  if (!is_singular('post')) return;
  echo '<script type="application/ld+json">' . json_encode([
    '@context' => 'https://schema.org',
    '@type'    => 'FAQPage',
    'mainEntity' => [[
      '@type'          => 'Question',
      'name'           => 'What size should I order?',
      'acceptedAnswer' => ['@type' => 'Answer', 'text' => 'Order your normal size.']
    ]]
  ], JSON_UNESCAPED_SLASHES) . '</script>';
});
```

---

**Q22: How do you track WooCommerce purchase events in GA4 via GTM?**
**A:** Push an `ecommerce` object to `dataLayer` on the order confirmation page using the `woocommerce_thankyou` hook, then fire a GA4 Purchase tag in GTM on the `purchase` custom event.
```php
add_action('woocommerce_thankyou', function($order_id) {
  $order = wc_get_order($order_id);
  echo "<script>
    dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: '{$order->get_order_number()}',
        value: {$order->get_total()},
        currency: '" . get_woocommerce_currency() . "'
      }
    });
  </script>";
});
```

---

**Q23: How do you configure a GTM Custom HTML tag to fire only on DOM Ready?**
**A:** Select the "DOM Ready" trigger type in GTM. This ensures the tag fires after the DOM is parsed but before all resources load, making DOM queries reliable.
```javascript
// Custom HTML tag body — safe to query DOM elements
(function() {
  var btn = document.querySelector('#cta-button');
  if (btn) {
    btn.addEventListener('click', function() {
      dataLayer.push({ event: 'cta_click', label: btn.innerText });
    });
  }
})();
```

---

**Q24: How do you set up GA4 conversion events?**
**A:** In GA4, mark any existing event as a conversion in Admin → Events → toggle "Mark as conversion". For custom events, ensure they are sending data before marking them.
```javascript
// Ensure this event fires before marking it as conversion
gtag('event', 'generate_lead', {
  currency: 'USD',
  value: 25.0
});
```

---

**Q25: How do you use GTM's Preview mode for debugging?**
**A:** Click "Preview" in GTM to open Tag Assistant. It shows which tags fired, which triggers matched, and the full dataLayer state at each event, without publishing changes to production.
```
Tag Assistant summary view:
  Page View ✓
    → GA4 Config tag fired (trigger: All Pages)
  form_submit event ✓
    → GA4 Event "generate_lead" fired (trigger: Custom Event: form_submit)
  add_to_cart event — NOT fired
    → Trigger condition not met: Page Path does not contain /shop/
```

---

**Q26: How do you implement BreadcrumbList Schema in WordPress?**
**A:** Build the `itemListElement` array from the current page's breadcrumb trail (taxonomy + post type + title) and output JSON-LD in `wp_head`.
```php
add_action('wp_head', function() {
  if (!is_singular()) return;
  $items = [
    ['@type' => 'ListItem', 'position' => 1,
     'name' => 'Home', 'item' => home_url('/')],
    ['@type' => 'ListItem', 'position' => 2,
     'name' => get_the_title(), 'item' => get_permalink()]
  ];
  echo '<script type="application/ld+json">' . json_encode([
    '@context' => 'https://schema.org',
    '@type'    => 'BreadcrumbList',
    'itemListElement' => $items
  ], JSON_UNESCAPED_SLASHES) . '</script>';
});
```

---

**Q27: How do you use Google Search Console to diagnose a Core Web Vitals failure?**
**A:** The CWV report groups URLs by status (Poor/Needs Improvement/Good) and metric. Click a group to see example URLs, then use the CrUX data alongside PageSpeed Insights for element-level diagnosis.
```
Search Console → Core Web Vitals → Mobile
  Poor URLs (LCP): 47
  Example URL: /product/running-shoe-x/
  → Open in PageSpeed Insights
  → Render-blocking resource: /wp-content/plugins/slider/slider.css (delay: 1.3s)
```

---

**Q28: How do you improve LCP on a WordPress site?**
**A:** Preload the LCP image, serve it in WebP, use a CDN, and eliminate render-blocking resources above the fold.
```html
<!-- Preload hero image in <head> -->
<link rel="preload" as="image"
  href="/wp-content/uploads/hero.webp"
  imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w"
  imagesizes="100vw">
```

---

**Q29: How do you prevent CLS caused by images on a WordPress site?**
**A:** Always specify `width` and `height` attributes on `<img>` tags. Modern browsers use these to reserve space before the image loads, preventing layout shifts.
```html
<!-- Explicit dimensions prevent layout shift -->
<img src="product.webp" alt="Running Shoe"
  width="800" height="600" loading="lazy">
```

---

**Q30: What is the difference between subdomain, subdirectory, and ccTLD for international SEO?**
**A:** Subdirectory (`example.com/de/`) inherits domain authority and is easiest to manage. Subdomain (`de.example.com`) is treated as a separate site by some signals. ccTLD (`example.de`) sends the strongest geo signal but requires separate authority building.
```
example.com/de/   — recommended for most sites (inherits authority)
de.example.com    — acceptable; some shared signals
example.de        — strongest geo signal; separate authority needed
```

---

**Q31: How do you implement hreflang in WordPress without a plugin?**
**A:** Hook into `wp_head` and output `<link rel="alternate" hreflang="...">` tags for each language version, building URLs from a static map or a multilingual plugin's API.
```php
add_action('wp_head', function() {
  $langs = ['en' => 'https://example.com/en/', 'de' => 'https://example.com/de/'];
  foreach ($langs as $lang => $url) {
    echo "<link rel=\"alternate\" hreflang=\"{$lang}\" href=\"{$url}\">\n";
  }
  echo "<link rel=\"alternate\" hreflang=\"x-default\" href=\"https://example.com/en/\">\n";
});
```

---

**Q32: How do you export GA4 raw data to BigQuery?**
**A:** Link GA4 to a GCP project in Admin → BigQuery Links. GA4 exports a daily events table (`events_YYYYMMDD`) and an intraday table to the specified BigQuery dataset.
```sql
-- Count purchases in the last 7 days from BigQuery export
SELECT
  COUNT(*) AS purchases,
  SUM((SELECT value.double_value FROM UNNEST(event_params)
       WHERE key = 'value')) AS revenue
FROM `my_project.analytics_123.events_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
  AND event_name = 'purchase';
```

---

**Q33: How do you use GTM to implement scroll-depth tracking?**
**A:** Use GTM's built-in Scroll Depth trigger, configure percentage thresholds, and fire a GA4 event tag with `scroll_depth_threshold` as a parameter.
```
GTM Trigger: Scroll Depth
  Depths: 25, 50, 75, 100 (percent)
  Fire on: All Pages

GTM Tag: GA4 Event
  Event: scroll
  Parameters:
    percent_scrolled: {{Scroll Depth Threshold}}
```

---

**Q34: What are `nofollow`, `sponsored`, and `ugc` link attributes?**
**A:** All three tell Google not to pass PageRank. `rel="sponsored"` is for paid links; `rel="ugc"` is for user-generated content (comments, forums). Use `nofollow` as a generic fallback.
```html
<!-- Paid partnership link -->
<a href="https://partner.com" rel="sponsored noopener">Partner Site</a>

<!-- User comment link -->
<a href="https://user-site.com" rel="ugc nofollow">User's site</a>
```

---

**Q35: How do you set up GTM to track outbound link clicks?**
**A:** Use a Click — Just Links trigger with a condition that the Click URL does not contain your domain. Fire a GA4 event tag with the URL as a parameter.
```
GTM Trigger: Click — Just Links
  Condition: Click URL does not contain "example.com"

GTM Tag: GA4 Event
  Event: outbound_click
  Parameters:
    link_url: {{Click URL}}
    link_domain: {{Click URL}} (with regex group)
```

---

**Q36: How do you use RankMath's `rank_math/head` filter to inject custom meta?**
**A:** Hook into `rank_math/head` (fires inside `<head>` alongside RankMath output) to output custom structured data or meta tags.
```php
add_action('rank_math/head', function() {
  if (!is_singular('product')) return;
  $sku = get_post_meta(get_the_ID(), '_sku', true);
  echo '<meta name="product:sku" content="' . esc_attr($sku) . '">';
});
```

---

**Q37: How do you handle paginated content for SEO in WordPress?**
**A:** Use `rel="next"` and `rel="prev"` link tags for paginated archives. Ensure each page has a unique title and description. Avoid noindexing paginated pages that have unique content.
```php
// Output rel=next/prev in wp_head for paginated archives
add_action('wp_head', function() {
  global $paged, $wp_query;
  $max = $wp_query->max_num_pages;
  if ($paged > 1)    echo '<link rel="prev" href="' . get_pagenum_link($paged - 1) . '">';
  if ($paged < $max) echo '<link rel="next" href="' . get_pagenum_link($paged + 1) . '">';
});
```

---

**Q38: How do you disavow toxic backlinks in Google Search Console?**
**A:** Export the links report, compile toxic domains into a disavow file, and submit it via the Search Console Disavow Tool. Use this only after manual outreach has failed.
```
# disavow.txt format
# Disavow specific URLs with "https://"
https://spammy-site.com/bad-page

# Disavow entire domains with "domain:"
domain:toxic-links.net
domain:link-farm-example.com
```

---

**Q39: How do you measure the impact of an SEO change using Search Console data?**
**A:** Use the Performance report's date comparison feature. Filter by the affected URL or query set and compare clicks, impressions, CTR, and position before vs after the change date.
```
Search Console → Performance → Compare dates
  Date range 1: 30 days before change
  Date range 2: 30 days after change
  Filter: Page contains /target-url/
  Metrics: Clicks ▲, Impressions ▲, Position ▼ (lower is better)
```

---

**Q40: What is a Google Core Update and how should you respond to a traffic drop?**
**A:** Core updates are broad algorithm changes assessing overall content quality. Respond by auditing E-E-A-T signals — author credentials, content depth, sourcing, UX — rather than looking for a specific technical fix.
```
Post-core-update audit checklist:
  □ Pages that lost traffic — is content thin or outdated?
  □ Author bios present and credible?
  □ Sources cited for factual claims?
  □ No misleading ads or aggressive interstitials?
  □ Core Web Vitals passing in Search Console?
  □ Internal linking to authoritative related content?
```

---

## Advanced

**Q41: How do you implement server-side tagging with GTM to preserve measurement under ITP/ad blocking?**
**A:** Deploy a GTM server container on a first-party subdomain. Route GA4 and ad pixel requests through it, allowing the server to set `HttpOnly` first-party cookies that bypass browser ITP restrictions.
```nginx
# Route /gtm/ to your GTM server container
location /gtm/ {
    proxy_pass https://gtm.yourdomain.com/;
    proxy_set_header Host gtm.yourdomain.com;
}
```
```javascript
// Point GA4 to server-side endpoint
gtag('config', 'G-XXXXXXXX', {
  server_container_url: 'https://collect.example.com'
});
```

---

**Q42: How do you build a custom GA4 funnel report using BigQuery and Looker Studio?**
**A:** Query the `events_*` table for sequential events per `user_pseudo_id`, use window functions to detect funnel step completion, then connect the result to Looker Studio.
```sql
WITH funnel AS (
  SELECT user_pseudo_id,
    COUNTIF(event_name = 'view_item')    > 0 AS step1,
    COUNTIF(event_name = 'add_to_cart')  > 0 AS step2,
    COUNTIF(event_name = 'purchase')     > 0 AS step3
  FROM `project.analytics_id.events_*`
  WHERE _TABLE_SUFFIX >= '20260101'
  GROUP BY 1
)
SELECT
  COUNTIF(step1) AS viewed,
  COUNTIF(step2) AS added,
  COUNTIF(step3) AS purchased
FROM funnel;
```

---

**Q43: How do you implement dynamic Product Schema for WooCommerce using `wp_head`?**
**A:** On single product pages, build a `Product` JSON-LD object from WooCommerce product data including `offers`, `aggregateRating`, and availability.
```php
add_action('wp_head', function() {
  if (!is_product()) return;
  global $product;
  $schema = [
    '@context' => 'https://schema.org',
    '@type'    => 'Product',
    'name'     => $product->get_name(),
    'sku'      => $product->get_sku(),
    'offers'   => [
      '@type'         => 'Offer',
      'price'         => $product->get_price(),
      'priceCurrency' => get_woocommerce_currency(),
      'availability'  => $product->is_in_stock()
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock'
    ]
  ];
  echo '<script type="application/ld+json">'
     . json_encode($schema, JSON_UNESCAPED_SLASHES)
     . '</script>';
});
```

---

**Q44: How do you build a first-party data strategy for WordPress using Consent Mode v2 and GA4?**
**A:** Implement Consent Mode v2 defaults as `denied`, integrate your CMP to call `gtag('consent','update')` on accept, and use GA4 enhanced conversions to send hashed first-party data (email) server-side.
```javascript
// On page load — default denied
gtag('consent', 'default', {
  ad_storage: 'denied', analytics_storage: 'denied',
  ad_user_data: 'denied', ad_personalization: 'denied'
});

// On CMP accept
gtag('consent', 'update', {
  ad_storage: 'granted', analytics_storage: 'granted',
  ad_user_data: 'granted', ad_personalization: 'granted'
});

// Enhanced conversions — send hashed email
gtag('set', 'user_data', {
  email: sha256(userEmail) // hashed client-side
});
```

---

**Q45: How do you diagnose and fix a manual action penalty in Google Search Console?**
**A:** Read the manual action notice, fix the issue (remove spammy links, thin content, cloaking), submit a reconsideration request with evidence of remediation via Search Console.
```
Search Console → Security & Manual Actions → Manual Actions
  Issue: Unnatural links to your site
  Steps:
    1. Export backlinks from GSC + Ahrefs
    2. Contact webmasters to remove links (document outreach)
    3. Submit disavow file for remaining toxic links
    4. Click "Request Review" — explain actions taken
    5. Wait 1–4 weeks for Google review
```

---

**Q46: How do you implement a programmatic internal linking strategy for large WordPress sites?**
**A:** Use a custom `the_content` filter to detect target keywords and insert contextual links to pillar pages, drawing from a prebuilt keyword-to-URL mapping stored in options or a custom table.
```php
add_filter('the_content', function($content) {
  $links = [
    'running shoes' => 'https://example.com/running-shoes/',
    'trail running' => 'https://example.com/trail-running/',
  ];
  foreach ($links as $keyword => $url) {
    if (stripos($content, $keyword) !== false && get_the_permalink() !== $url) {
      $content = preg_replace(
        '/(?<!["\'>])(' . preg_quote($keyword, '/') . ')/i',
        '<a href="' . esc_url($url) . '">$1</a>',
        $content, 1
      );
    }
  }
  return $content;
});
```

---

**Q47: How do you use GTM Custom JavaScript variables to compute derived dimensions?**
**A:** Define a Custom JavaScript variable that reads from other GTM variables or the DOM and returns a computed value, which can then be passed as an event parameter.
```javascript
// GTM Custom JavaScript Variable: "Cart Value Tier"
function() {
  var val = parseFloat({{DL - cart_value}}) || 0;
  if (val >= 200) return 'high';
  if (val >= 50)  return 'medium';
  return 'low';
}
```

---

**Q48: How do you automate Search Console rank tracking with the Google Search Console API?**
**A:** Use the Search Analytics `query` method via OAuth2 to pull clicks, impressions, position, and CTR for a date range, grouped by query or page.
```python
from googleapiclient.discovery import build

service = build('searchconsole', 'v1', credentials=creds)
response = service.searchanalytics().query(
    siteUrl='https://example.com/',
    body={
        'startDate': '2026-03-01',
        'endDate':   '2026-03-29',
        'dimensions': ['query'],
        'rowLimit': 100
    }
).execute()
for row in response.get('rows', []):
    print(row['keys'][0], row['position'], row['clicks'])
```

---

**Q49: How do you implement a structured data testing and CI pipeline for WordPress?**
**A:** Validate JSON-LD output with Google's Rich Results Test API in a CI step. Scrape rendered page HTML in staging, extract `<script type="application/ld+json">` blocks, and assert required fields.
```bash
#!/bin/bash
# Extract and validate JSON-LD from staging
PAGE_HTML=$(curl -s https://staging.example.com/product/shoe/)
SCHEMA=$(echo "$PAGE_HTML" | python3 -c "
import sys, re, json
html = sys.stdin.read()
blocks = re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', html, re.DOTALL)
for b in blocks:
    data = json.loads(b)
    assert '@type' in data, 'Missing @type'
    if data['@type'] == 'Product':
        assert 'offers' in data, 'Product missing offers'
print('Schema validation passed')
")
echo "$SCHEMA"
```

---

**Q50: How do you architect a scalable tag management strategy for a WordPress network with 50+ sites?**
**A:** Use one GTM container per brand with environment-specific variables (Lookup Table mapping hostname → GA4 Measurement ID). Share triggers and tags across environments using GTM environments and a shared `_ga` cross-domain linker config.
```javascript
// GTM Lookup Table Variable: "GA4 Measurement ID"
// Input variable: {{Page Hostname}}
// Lookup table:
//   site1.com  → G-AAA111
//   site2.com  → G-BBB222
//   default    → G-FALLBACK

// GTM GA4 Config Tag — uses the lookup variable
// Measurement ID: {{GA4 Measurement ID}}
gtag('config', '{{GA4 Measurement ID}}', {
  linker: {
    domains: ['site1.com', 'site2.com']
  }
});
```

---
