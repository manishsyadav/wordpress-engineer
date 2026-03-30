# Marketing / SEO / GTM / GA — Scenario-Based Questions

---

## Scenario 1: WordPress Site Traffic Dropped 40% After a Google Update — Diagnose and Fix

**The situation:** After Google's latest core algorithm update, a WordPress content site lost 40% of its organic search traffic over two weeks. Rankings for previously top-10 pages have dropped to positions 15–50.

---

### Step 1 — Confirm It Was an Algorithm Update

```bash
# External tools to correlate timing:
# - Google Search Console: Performance > Date comparison (before vs after)
# - Semrush Sensor / MozCast / Algoroo — show volatility scores
# - Google's official update announcements: https://status.search.google.com/

# Check when traffic dropped using GSC date filters
# GSC > Performance > Compare: last 28 days vs previous 28 days
# Filter by: Pages, Queries, Countries to isolate patterns
```

---

### Step 2 — Identify the Affected Pages and Queries

In Google Search Console:
1. **Performance > Pages** — sort by "Clicks Difference" to find pages that lost the most traffic.
2. **Performance > Queries** — find queries where impressions stayed high but CTR/position dropped.
3. **Coverage** — check for newly excluded pages or "Excluded: Crawled, not indexed" issues.
4. **Core Web Vitals** — check if LCP/CLS/INP scores degraded.

Look for patterns:
- Did a specific **content type** drop (all blog posts, all product pages, all guides)?
- Did a specific **content topic** drop (medical, financial, news)?
- Did traffic drop across the **entire site** or only certain sections?

---

### Step 3 — Audit for E-E-A-T Signals

Google's core updates heavily target E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).

**Author credibility:**
```php
// Add author schema markup to all single posts
add_action( 'wp_head', function(): void {
    if ( ! is_singular( 'post' ) ) {
        return;
    }

    $author_id   = get_the_author_meta( 'ID' );
    $author_name = get_the_author_meta( 'display_name' );
    $author_bio  = get_the_author_meta( 'description' );
    $author_url  = get_author_posts_url( $author_id );

    $schema = [
        '@context' => 'https://schema.org',
        '@type'    => 'Article',
        'headline' => get_the_title(),
        'datePublished' => get_the_date( 'c' ),
        'dateModified'  => get_the_modified_date( 'c' ),
        'author' => [
            '@type'  => 'Person',
            'name'   => $author_name,
            'url'    => $author_url,
            'description' => $author_bio,
        ],
        'publisher' => [
            '@type' => 'Organization',
            'name'  => get_bloginfo( 'name' ),
            'logo'  => [
                '@type' => 'ImageObject',
                'url'   => get_site_icon_url( 512 ),
            ],
        ],
    ];

    printf(
        '<script type="application/ld+json">%s</script>' . PHP_EOL,
        wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
    );
} );
```

**Checklist for E-E-A-T:**
- [ ] Author bio pages exist and link to LinkedIn/credentials
- [ ] "About" page establishes site expertise
- [ ] Content has clear publication and last-updated dates
- [ ] Sources are cited with outbound links to authoritative references
- [ ] No thin pages (< 300 words) ranking for competitive queries
- [ ] Medical/financial/legal content reviewed by certified professionals

---

### Step 4 — Audit Content Quality

```bash
# Identify thin/low-quality pages in Screaming Frog
# Filter: Response Codes = 200 AND Word Count < 300
# Export URLs for manual review or bulk update

# Check for duplicate content
# GSC > Enhancements > check for "Duplicate without user-selected canonical"
```

Common content issues after core updates:
1. **Thin content** — pages with < 500 words ranking for competitive head terms; improve depth.
2. **AI-generated content without review** — lacks experience signals; add first-person examples, expert quotes.
3. **Outdated articles** — posts from 2018–2021 with stale data; update statistics, add a "Last reviewed" date.
4. **Keyword stuffing** — unnatural keyword density; rewrite for user intent.
5. **Lack of unique value** — content identical to top-10 results; add original research, case studies, or proprietary data.

---

### Step 5 — Fix Technical Issues Found During Audit

```php
// Update post modified date when content is refreshed (without changing published date)
function update_post_with_new_modified_date( int $post_id, string $new_content ): void {
    wp_update_post( [
        'ID'           => $post_id,
        'post_content' => $new_content,
        'post_modified' => current_time( 'mysql' ),
        'post_modified_gmt' => current_time( 'mysql', true ),
    ] );
}
```

```nginx
# Ensure all canonical redirects are permanent (not 302)
# www → non-www
server {
    listen 80;
    server_name www.example.com;
    return 301 https://example.com$request_uri;
}

# Trailing slash consistency (WordPress uses trailing slashes)
rewrite ^([^.]*[^/])$ $1/ permanent;
```

---

### Step 6 — Monitor Recovery

```bash
# Track ranking recovery after fixes (typically 4–12 weeks for core updates)

# Tools to monitor:
# - GSC: Performance > Compare dates weekly
# - Semrush / Ahrefs: position tracking for affected keywords
# - Google Analytics: Organic search sessions trend

# Submit updated pages for re-crawling via GSC URL Inspection > Request Indexing
# Submit updated sitemap: GSC > Sitemaps > Resubmit
```

---

### Recovery Timeline Expectations

| Fix Type | Time to See Recovery |
|---|---|
| Technical fixes (canonicals, indexing) | 1–4 weeks |
| Content quality improvements | 4–12 weeks |
| E-E-A-T signal improvements | 8–16 weeks |
| Core update recovery (Google re-evaluation) | Up to 6 months (next core update cycle) |

---

## Scenario 2: Implement GDPR-Compliant GA4 Tracking with Consent Mode v2

**The situation:** A WordPress site with EU visitors needs GDPR-compliant GA4 tracking. Users must be able to accept or decline cookies, and the tracking must respect their choice. Google's Consent Mode v2 is required for all Google advertising products in the EEA.

---

### Step 1 — Architecture Overview

```
Browser                    CMP Banner        GTM           GA4 / Google Ads
  |                            |               |                  |
  | Page Load                  |               |                  |
  |--- gtag consent 'default' denied -------> |                  |
  |--- GTM snippet loads ----> |               |                  |
  |                            |               |                  |
  | User clicks "Accept All"   |               |                  |
  |--- gtag consent 'update' granted -------> |                  |
  |                            |               |--- GA4 events -->|
  |                            |               |--- Ads ping ---->|
```

---

### Step 2 — WordPress Implementation

```php
// functions.php — add consent initialization BEFORE the GTM snippet
add_action( 'wp_head', 'initialize_consent_mode', 1 ); // priority 1 = very first

function initialize_consent_mode(): void {
    // Check if consent cookie already exists from a previous visit
    $existing_consent = isset( $_COOKIE['user_consent'] )
        ? json_decode( stripslashes( $_COOKIE['user_consent'] ), true )
        : null;
    ?>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }

    // Default: deny all (GDPR-safe starting state)
    gtag('consent', 'default', {
        analytics_storage:   'denied',
        ad_storage:          'denied',
        ad_user_data:        'denied',
        ad_personalization:  'denied',
        wait_for_update:     500,
    });

    <?php if ( $existing_consent && isset( $existing_consent['analytics'] ) ): ?>
    // Restore consent from previous visit (stored in cookie)
    gtag('consent', 'update', {
        analytics_storage:  <?= $existing_consent['analytics'] ? "'granted'" : "'denied'" ?>,
        ad_storage:         <?= $existing_consent['marketing'] ? "'granted'" : "'denied'" ?>,
        ad_user_data:       <?= $existing_consent['marketing'] ? "'granted'" : "'denied'" ?>,
        ad_personalization: <?= $existing_consent['marketing'] ? "'granted'" : "'denied'" ?>,
    });
    <?php endif; ?>
    </script>
    <?php
}

// Add GTM snippet (must come AFTER consent initialization above)
add_action( 'wp_head', 'add_gtm_snippet', 2 ); // priority 2

function add_gtm_snippet(): void {
    $gtm_id = 'GTM-XXXXXXX'; // replace with your container ID
    ?>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','<?= esc_js( $gtm_id ) ?>');</script>
    <!-- End Google Tag Manager -->
    <?php
}
```

---

### Step 3 — Consent Banner JavaScript (CMP Integration)

```javascript
// This function is called by your CMP (CookieYes, Complianz, custom banner)
// after the user makes a consent choice

function applyConsentChoice(categories) {
    // categories = { analytics: true/false, marketing: true/false, functional: true/false }

    const consentState = {
        analytics_storage:  categories.analytics  ? 'granted' : 'denied',
        ad_storage:         categories.marketing  ? 'granted' : 'denied',
        ad_user_data:       categories.marketing  ? 'granted' : 'denied',
        ad_personalization: categories.marketing  ? 'granted' : 'denied',
    };

    // Update Google consent state
    gtag('consent', 'update', consentState);

    // Push consent event to dataLayer for GTM triggers
    window.dataLayer.push({
        event: 'consent_update',
        consent_analytics: categories.analytics,
        consent_marketing: categories.marketing,
    });

    // Persist consent for 1 year in a first-party cookie
    const cookieValue = JSON.stringify({
        analytics: categories.analytics,
        marketing: categories.marketing,
        timestamp: new Date().toISOString(),
    });

    document.cookie = [
        'user_consent=' + encodeURIComponent(cookieValue),
        'max-age=31536000',
        'path=/',
        'SameSite=Lax',
        'Secure',
    ].join('; ');
}

// Accept all button handler
document.getElementById('consent-accept-all')?.addEventListener('click', function() {
    applyConsentChoice({ analytics: true, marketing: true, functional: true });
    hideBanner();
});

// Reject all button handler
document.getElementById('consent-reject-all')?.addEventListener('click', function() {
    applyConsentChoice({ analytics: false, marketing: false, functional: false });
    hideBanner();
});

function hideBanner() {
    const banner = document.getElementById('consent-banner');
    if (banner) banner.style.display = 'none';
}
```

---

### Step 4 — GTM Container Configuration

In GTM Admin > Container Settings:
1. Enable **Consent Overview** (shows consent requirements on each tag).
2. For each GA4 tag: set Consent Requirements to `analytics_storage`.
3. For each Google Ads tag: set Consent Requirements to `ad_storage` + `ad_user_data`.

```javascript
// In GTM, create a Custom Event trigger: Event Name = "consent_update"
// Create a GA4 Event tag: Event Name = "consent_update"
// Parameters:
//   consent_analytics = {{DLV - consent_analytics}}
//   consent_marketing = {{DLV - consent_marketing}}
// Fire on: consent_update trigger
// This lets you see consent rates in GA4

// Verify with Google Tag Assistant:
// 1. Open GTM Preview on your site
// 2. Look for "Consent Initialization" in the tag firing order
// 3. Confirm GA4 shows "Consent: analytics_storage: denied" before banner interaction
// 4. Accept cookies, confirm "Consent: analytics_storage: granted"
```

---

### Step 5 — Verify Compliance

```javascript
// Test in browser console: check current consent state
// (Google's internal consent state object)
Object.fromEntries(
    document.cookie.split('; ')
        .filter(c => c.startsWith('user_consent='))
        .map(c => ['consent', JSON.parse(decodeURIComponent(c.split('=')[1]))])
);

// Check Network tab: GA4 requests should include consent_mode parameters
// Look for: &gcs= parameter in analytics.google.com requests
// G100 = analytics_storage granted
// G110 = analytics_storage denied, ad_storage granted
// G111 = all denied
```

---

## Scenario 3: Set Up GTM to Track WooCommerce Checkout Funnel

**The situation:** A WooCommerce store wants to track the full checkout funnel in GA4: cart view, checkout start, payment info entered, and purchase complete. The marketing team needs funnel visualizations in GA4 Explorations to identify drop-off points.

---

### Step 1 — Data Layer Architecture

GA4 uses a standardized e-commerce data layer spec. Push the correct event at each funnel step:

```javascript
// STEP 1: Cart page — view_cart
window.dataLayer.push({ ecommerce: null });
window.dataLayer.push({
    event: 'view_cart',
    ecommerce: {
        currency: 'USD',
        value: 79.00,
        items: [
            {
                item_id:       'COURSE-101',
                item_name:     'Advanced WordPress Development',
                item_category: 'Courses',
                price:         79.00,
                quantity:      1,
            }
        ]
    }
});

// STEP 2: Checkout page — begin_checkout
window.dataLayer.push({ ecommerce: null });
window.dataLayer.push({
    event: 'begin_checkout',
    ecommerce: {
        currency: 'USD',
        value:    79.00,
        coupon:   '',
        items: [
            {
                item_id:       'COURSE-101',
                item_name:     'Advanced WordPress Development',
                item_category: 'Courses',
                price:         79.00,
                quantity:      1,
            }
        ]
    }
});

// STEP 3: Payment section visible — add_payment_info
window.dataLayer.push({ ecommerce: null });
window.dataLayer.push({
    event: 'add_payment_info',
    ecommerce: {
        currency:     'USD',
        value:        79.00,
        payment_type: 'credit_card',
        items: [
            {
                item_id:  'COURSE-101',
                item_name: 'Advanced WordPress Development',
                price:    79.00,
                quantity: 1,
            }
        ]
    }
});

// STEP 4: Purchase complete — purchase (on thank-you page)
window.dataLayer.push({ ecommerce: null });
window.dataLayer.push({
    event: 'purchase',
    ecommerce: {
        transaction_id: 'WC-54321',
        value:          79.00,
        tax:            0,
        shipping:       0,
        currency:       'USD',
        coupon:         'SAVE10',
        items: [
            {
                item_id:       'COURSE-101',
                item_name:     'Advanced WordPress Development',
                item_category: 'Courses',
                price:         79.00,
                quantity:      1,
            }
        ]
    }
});
```

---

### Step 2 — PHP Implementation via WooCommerce Hooks

```php
// In functions.php or a custom plugin

// CART PAGE — view_cart
add_action( 'woocommerce_after_cart', 'push_view_cart_datalayer' );

function push_view_cart_datalayer(): void {
    $cart    = WC()->cart;
    $items   = [];
    $total   = (float) $cart->get_cart_contents_total();
    $currency = get_woocommerce_currency();

    foreach ( $cart->get_cart() as $cart_item ) {
        $product = $cart_item['data'];
        $items[] = [
            'item_id'       => $product->get_sku() ?: (string) $product->get_id(),
            'item_name'     => $product->get_name(),
            'item_category' => implode( ', ', wp_list_pluck(
                get_the_terms( $product->get_id(), 'product_cat' ) ?: [], 'name'
            ) ),
            'price'         => (float) $product->get_price(),
            'quantity'      => $cart_item['quantity'],
        ];
    }

    $event = [
        'event'     => 'view_cart',
        'ecommerce' => [
            'currency' => $currency,
            'value'    => $total,
            'items'    => $items,
        ],
    ];

    printf(
        '<script>window.dataLayer = window.dataLayer || []; window.dataLayer.push({ecommerce:null}); window.dataLayer.push(%s);</script>',
        wp_json_encode( $event )
    );
}

// CHECKOUT PAGE — begin_checkout
add_action( 'woocommerce_before_checkout_form', 'push_begin_checkout_datalayer' );

function push_begin_checkout_datalayer(): void {
    $cart  = WC()->cart;
    $items = [];

    foreach ( $cart->get_cart() as $cart_item ) {
        $product = $cart_item['data'];
        $items[] = [
            'item_id'   => $product->get_sku() ?: (string) $product->get_id(),
            'item_name' => $product->get_name(),
            'price'     => (float) $product->get_price(),
            'quantity'  => $cart_item['quantity'],
        ];
    }

    $event = [
        'event'     => 'begin_checkout',
        'ecommerce' => [
            'currency' => get_woocommerce_currency(),
            'value'    => (float) $cart->get_cart_contents_total(),
            'coupon'   => implode( ',', $cart->get_applied_coupons() ),
            'items'    => $items,
        ],
    ];

    printf(
        '<script>window.dataLayer = window.dataLayer || []; window.dataLayer.push({ecommerce:null}); window.dataLayer.push(%s);</script>',
        wp_json_encode( $event )
    );
}

// THANK YOU PAGE — purchase
add_action( 'woocommerce_thankyou', 'push_purchase_datalayer', 10, 1 );

function push_purchase_datalayer( int $order_id ): void {
    // Prevent duplicate fire on page refresh
    $meta_key = '_ga4_purchase_pushed';
    if ( get_post_meta( $order_id, $meta_key, true ) ) {
        return;
    }

    $order    = wc_get_order( $order_id );
    if ( ! $order ) {
        return;
    }

    $items = [];
    foreach ( $order->get_items() as $item ) {
        $product = $item->get_product();
        $items[] = [
            'item_id'       => $product ? ( $product->get_sku() ?: (string) $item->get_product_id() ) : '',
            'item_name'     => $item->get_name(),
            'item_category' => implode( ', ', wp_list_pluck(
                get_the_terms( $item->get_product_id(), 'product_cat' ) ?: [], 'name'
            ) ),
            'price'         => (float) ( $item->get_total() / max( $item->get_quantity(), 1 ) ),
            'quantity'      => $item->get_quantity(),
        ];
    }

    $event = [
        'event'     => 'purchase',
        'ecommerce' => [
            'transaction_id' => (string) $order->get_order_number(),
            'value'          => (float) $order->get_total(),
            'tax'            => (float) $order->get_total_tax(),
            'shipping'       => (float) $order->get_shipping_total(),
            'currency'       => $order->get_currency(),
            'coupon'         => implode( ',', $order->get_coupon_codes() ),
            'items'          => $items,
        ],
    ];

    printf(
        '<script>window.dataLayer = window.dataLayer || []; window.dataLayer.push({ecommerce:null}); window.dataLayer.push(%s);</script>',
        wp_json_encode( $event )
    );

    // Mark as pushed to prevent duplicate tracking
    update_post_meta( $order_id, $meta_key, true );
}
```

---

### Step 3 — GTM Configuration

For each funnel step:

| GTM Tag | Trigger | GA4 Event Name | E-commerce Source |
|---|---|---|---|
| GA4 - View Cart | Custom Event: `view_cart` | `view_cart` | Data Layer |
| GA4 - Begin Checkout | Custom Event: `begin_checkout` | `begin_checkout` | Data Layer |
| GA4 - Add Payment Info | Custom Event: `add_payment_info` | `add_payment_info` | Data Layer |
| GA4 - Purchase | Custom Event: `purchase` | `purchase` | Data Layer |

In each GA4 Event tag: enable the **E-commerce** section, select **Data Layer** as the data source. This automatically reads the nested `ecommerce` object.

---

### Step 4 — Build the Funnel in GA4

In GA4 > Explore > Create new Exploration > Funnel Exploration:

1. Steps:
   - Step 1: Event Name = `view_cart`
   - Step 2: Event Name = `begin_checkout`
   - Step 3: Event Name = `add_payment_info`
   - Step 4: Event Name = `purchase`
2. Enable **Open Funnel** to see users who entered at any step.
3. Add breakdown dimension: `device_category` or `traffic source / medium`.
4. Set date range to at least 28 days for statistical significance.

The funnel visualization shows percentage drop-off between each step, letting the team prioritize checkout optimizations (e.g., if 60% drop between `begin_checkout` and `add_payment_info`, the payment form has friction).
