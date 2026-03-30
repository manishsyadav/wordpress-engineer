# REST API — Scenario-Based Questions

---

## Scenario 1: Build a Secure Custom Endpoint for a Mobile App with Auth and Rate Limiting

**The situation:** A mobile app needs to authenticate WordPress users and fetch their private data (orders, saved items) via a custom REST endpoint. The endpoint must: require authentication, rate-limit requests per user, return structured JSON, and handle errors gracefully.

---

### Step 1 — Choose the Authentication Method

For mobile apps, **Application Passwords** (WordPress 5.6+) are the recommended approach — no plugin required, built into core, and revocable without changing the account password.

The mobile app flow:
1. User enters their WordPress username and an Application Password (generated in WP Admin > Users > Edit > Application Passwords).
2. App sends requests with `Authorization: Basic base64(username:app_password)` header.
3. WordPress authenticates the user via the built-in `BasicAuth` handler for Application Passwords.

For JWT (stateless token approach), use the `JWT Authentication for WP REST API` plugin or implement custom token issuance.

```javascript
// Mobile app: authenticate using Application Password
const credentials = btoa('johndoe:xxxx xxxx xxxx xxxx xxxx xxxx'); // Application Password format
const response = await fetch('https://example.com/wp-json/myapp/v1/profile', {
    method: 'GET',
    headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
    },
});
const data = await response.json();
```

---

### Step 2 — Register the Secure Custom Endpoint

```php
<?php
// plugin-name/includes/class-rest-controller.php

add_action( 'rest_api_init', 'myapp_register_routes' );

function myapp_register_routes(): void {
    // User profile endpoint
    register_rest_route( 'myapp/v1', '/profile', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'myapp_get_profile',
        'permission_callback' => 'myapp_auth_and_rate_limit',
        'schema'              => 'myapp_profile_schema',
    ] );

    // User's recent orders
    register_rest_route( 'myapp/v1', '/orders', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'myapp_get_orders',
        'permission_callback' => 'myapp_auth_and_rate_limit',
        'args'                => [
            'per_page' => [
                'type'              => 'integer',
                'default'           => 10,
                'minimum'           => 1,
                'maximum'           => 50,
                'sanitize_callback' => 'absint',
            ],
            'page' => [
                'type'              => 'integer',
                'default'           => 1,
                'minimum'           => 1,
                'sanitize_callback' => 'absint',
            ],
        ],
    ] );
}

/**
 * Combined authentication + rate limiting permission callback.
 * Returns WP_Error to deny, true to allow.
 */
function myapp_auth_and_rate_limit( WP_REST_Request $request ): bool|\WP_Error {
    // 1. Authentication check
    if ( ! is_user_logged_in() ) {
        return new \WP_Error(
            'rest_not_authenticated',
            'Authentication required. Use Application Password or JWT.',
            [ 'status' => 401 ]
        );
    }

    // 2. Rate limiting: 60 requests/minute per user
    $user_id    = get_current_user_id();
    $window     = 60;  // seconds
    $limit      = 60;  // requests per window
    $cache_key  = 'myapp_rl_user_' . $user_id . '_' . floor( time() / $window );
    $count      = (int) get_transient( $cache_key );

    if ( $count >= $limit ) {
        $retry_after = $window - ( time() % $window );
        return new \WP_Error(
            'rate_limit_exceeded',
            'Too many requests. Try again in ' . $retry_after . ' seconds.',
            [
                'status'      => 429,
                'retry_after' => $retry_after,
            ]
        );
    }

    // Increment counter; store with 2x window TTL to handle boundary cases
    set_transient( $cache_key, $count + 1, $window * 2 );

    return true;
}

/**
 * GET /myapp/v1/profile
 */
function myapp_get_profile( WP_REST_Request $request ): \WP_REST_Response {
    $user = wp_get_current_user();

    $data = [
        'id'           => $user->ID,
        'username'     => $user->user_login,
        'display_name' => $user->display_name,
        'email'        => $user->user_email,
        'avatar_url'   => get_avatar_url( $user->ID, [ 'size' => 96 ] ),
        'registered'   => $user->user_registered,
        'meta'         => [
            'phone'    => get_user_meta( $user->ID, 'phone', true ) ?: null,
            'location' => get_user_meta( $user->ID, 'location', true ) ?: null,
        ],
    ];

    $response = new \WP_REST_Response( $data, 200 );
    // Private — never cache at CDN level
    $response->header( 'Cache-Control', 'no-store, private' );
    $response->header( 'X-RateLimit-Limit', 60 );
    return $response;
}

/**
 * GET /myapp/v1/orders
 */
function myapp_get_orders( WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
    if ( ! function_exists( 'wc_get_orders' ) ) {
        return new \WP_Error( 'woocommerce_required', 'WooCommerce is not active.', [ 'status' => 500 ] );
    }

    $user_id  = get_current_user_id();
    $per_page = (int) $request->get_param( 'per_page' );
    $page     = (int) $request->get_param( 'page' );

    $orders = wc_get_orders( [
        'customer_id' => $user_id,
        'limit'       => $per_page,
        'offset'      => ( $page - 1 ) * $per_page,
        'orderby'     => 'date',
        'order'       => 'DESC',
    ] );

    $total_orders = wc_get_orders( [
        'customer_id' => $user_id,
        'limit'       => -1,
        'return'      => 'ids',
    ] );

    $data = array_map( function( \WC_Order $order ): array {
        return [
            'id'           => $order->get_id(),
            'status'       => $order->get_status(),
            'total'        => $order->get_total(),
            'currency'     => $order->get_currency(),
            'item_count'   => $order->get_item_count(),
            'date_created' => $order->get_date_created()?->format( 'c' ),
        ];
    }, $orders );

    $response = new \WP_REST_Response( $data, 200 );
    $response->header( 'X-WP-Total', count( $total_orders ) );
    $response->header( 'X-WP-TotalPages', (int) ceil( count( $total_orders ) / $per_page ) );
    $response->header( 'Cache-Control', 'no-store, private' );
    return $response;
}

/**
 * Profile endpoint schema (for documentation and validation).
 */
function myapp_profile_schema(): array {
    return [
        '$schema'    => 'http://json-schema.org/draft-04/schema#',
        'title'      => 'profile',
        'type'       => 'object',
        'properties' => [
            'id'           => [ 'type' => 'integer',           'readonly' => true ],
            'username'     => [ 'type' => 'string',            'readonly' => true ],
            'display_name' => [ 'type' => 'string' ],
            'email'        => [ 'type' => 'string', 'format' => 'email' ],
            'avatar_url'   => [ 'type' => 'string', 'format' => 'uri' ],
            'registered'   => [ 'type' => 'string', 'format' => 'date-time' ],
        ],
    ];
}
```

---

### Step 3 — HTTPS Enforcement

All mobile app API traffic must use HTTPS. Enforce at Nginx level:

```nginx
# Redirect all HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://example.com$request_uri;
}

# Reject requests to /wp-json/ over HTTP (belt-and-suspenders)
# Also add HSTS to lock in HTTPS for 1 year
server {
    listen 443 ssl http2;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /wp-json/ {
        # Nginx handles HTTPS; PHP knows via HTTPS = on fastcgi param
        fastcgi_param HTTPS on;
        # ... rest of PHP location config
    }
}
```

---

### Step 4 — Test with curl

```bash
# Generate Application Password in WP Admin > Users > Edit > Application Passwords
# Password format: "abcd efgh ijkl mnop qrst uvwx" (spaces are stripped by WordPress)

# Test authentication
curl -u "johndoe:abcd efgh ijkl mnop qrst uvwx" \
     -H "Accept: application/json" \
     https://example.com/wp-json/myapp/v1/profile

# Test rate limiting — send 65 requests
for i in $(seq 1 65); do
  curl -s -o /dev/null -w "%{http_code}\n" \
       -u "johndoe:apppassword" \
       https://example.com/wp-json/myapp/v1/profile
done
# First 60: 200; requests 61-65: 429
```

---

## Scenario 2: REST API Returns 401 for Gutenberg Saves — Diagnose Nonce Issue

**The situation:** After a WordPress update, editors report that saving posts in the Gutenberg block editor shows "Updating failed. Your changes may not have been saved." The browser console shows `POST /wp-json/wp/v2/posts/42` returning `401 Unauthorized` with `{"code":"rest_cookie_invalid_nonce","message":"Cookie nonce is invalid"}`.

---

### Understanding the Problem

WordPress uses nonces for REST API authentication from the browser. The nonce is generated when the page loads and is valid for 24 hours. The `X-WP-Nonce` header is automatically added to all `wp.apiFetch()` calls in Gutenberg. A 401 with `rest_cookie_invalid_nonce` means the nonce is either expired, invalid, or the session cookie is not being sent.

---

### Step 1 — Reproduce and Inspect

```javascript
// In browser DevTools > Network tab:
// 1. Open a post in Gutenberg
// 2. Save the post
// 3. Inspect the failing POST request

// Check headers sent:
// X-WP-Nonce: <value>     — should be present
// Cookie: wordpress_logged_in_XXXX=...   — must be present

// Check the response:
// { "code": "rest_cookie_invalid_nonce", "message": "Cookie nonce is invalid" }

// Check the nonce value from the page source:
// In browser console:
console.log(wpApiSettings.nonce);  // the nonce Gutenberg uses
```

---

### Step 2 — Identify Root Causes

**Cause 1: Caching plugin serving a cached (stale) page with an old nonce**

This is the most common cause. If a full-page caching plugin (WP Rocket, W3 Total Cache) or Nginx FastCGI cache serves a cached copy of the post edit page, the nonce embedded in the page is stale. The session cookie is valid but the nonce is from a previous user session.

```php
// Check if page caching is active for logged-in users
// In wp-admin: Settings > WP Rocket > Cache > Separate cache file for logged-in users
// should be ON; or in W3 Total Cache: Page Cache > Don't cache pages for logged in users

// Nginx FastCGI cache: verify skip_cache is set for logged-in users
// In nginx.conf, the cookie bypass should include:
// if ($http_cookie ~* "wordpress_logged_in") { set $skip_cache 1; }
```

**Cause 2: A security plugin or custom code is invalidating nonces early**

```php
// Check for code that hooks into nonce validation
// Search for these hooks in plugins and themes:
add_filter( 'nonce_life', ... );          // reduces nonce lifetime
add_filter( 'nonce_user_logged_out', ... ); // wrong user ID for nonce
add_filter( 'wp_verify_nonce_user', ... );  // modifies nonce user check
```

**Cause 3: The LOGGED_IN_KEY or AUTH_KEY changed in wp-config.php**

Nonces are derived from `LOGGED_IN_KEY`, `AUTH_KEY`, and the user's session. If these constants changed (e.g., during a migration), all existing nonces become invalid.

**Cause 4: Proxy or CDN stripping the `Cookie` header or `X-WP-Nonce` header**

Some CDN configurations strip custom headers. Gutenberg sends `X-WP-Nonce` — if the CDN or a WAF strips it, the request arrives without a nonce.

**Cause 5: The `REST_COOKIE_CHECK_OAUTH` constant or custom auth hook**

```php
// Search for custom rest_authentication_errors filters that might interfere:
add_filter( 'rest_authentication_errors', ... );
```

---

### Step 3 — Diagnose Systematically

```bash
# 1. Check if the nonce from the page is valid server-side
# Get the nonce from the page HTML:
curl -s -b cookies.txt https://example.com/wp-admin/post.php?post=42 | grep -o 'nonce":"[^"]*"'

# 2. Test the nonce directly via the REST API
curl -s \
  -b cookies.txt \
  -H "X-WP-Nonce: <nonce_from_page>" \
  https://example.com/wp-json/wp/v2/users/me

# If 200: nonce is valid; something in the POST request flow is the issue
# If 401: nonce is genuinely invalid (stale cache or changed keys)

# 3. Check Nginx cache config for admin pages
grep -r "skip_cache" /etc/nginx/sites-available/

# 4. Check WP Rocket settings
# WP Admin > Settings > WP Rocket > Cache > Caching for logged-in users
```

---

### Step 4 — Fix for Each Cause

**Fix 1: Cache plugin caching logged-in edit pages**

```php
// functions.php — tell WP Rocket not to cache the post editor
add_filter( 'rocket_cache_reject_uri', function( array $urls ): array {
    $urls[] = '/wp-admin/post.php';
    $urls[] = '/wp-admin/post-new.php';
    return $urls;
} );
```

```nginx
# Nginx FastCGI cache — ensure admin pages are never cached
if ($request_uri ~* "/wp-admin/") {
    set $skip_cache 1;
}
if ($http_cookie ~* "wordpress_logged_in") {
    set $skip_cache 1;
}
```

**Fix 2: Force nonce refresh for long editing sessions**

Gutenberg has a built-in heartbeat mechanism that refreshes the nonce. Ensure the WordPress Heartbeat API is not disabled:

```php
// If someone disabled the Heartbeat API, Gutenberg nonces won't refresh
// Remove this from functions.php if it exists:
// add_filter('heartbeat_settings', function($settings) { $settings['interval'] = 60; return $settings; });

// Ensure the nonce refresh hook is working:
add_filter( 'heartbeat_received', function( array $response, array $data ): array {
    // Gutenberg automatically handles nonce refresh via heartbeat
    // This filter is for custom nonce refresh if needed
    return $response;
}, 10, 2 );
```

**Fix 3: Re-generate WordPress security keys**

```bash
# Generate new keys at: https://api.wordpress.org/secret-key/1.1/salt/
# Replace in wp-config.php:
# define('AUTH_KEY',         '...');
# define('SECURE_AUTH_KEY',  '...');
# define('LOGGED_IN_KEY',    '...');
# define('NONCE_KEY',        '...');
# WARNING: this logs out all users
```

**Fix 4: Verify CDN/proxy header pass-through**

```nginx
# Ensure Nginx passes the X-WP-Nonce header to PHP-FPM
location ~ \.php$ {
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
    # fastcgi_params includes HTTP_X_WP_NONCE forwarding automatically
    # Verify with: grep X_WP /etc/nginx/fastcgi_params
}
```

```bash
# Check if Cloudflare or another CDN is stripping headers
curl -v -H "X-WP-Nonce: test123" https://example.com/wp-json/wp/v2/posts/42 2>&1 | grep -i nonce
```

---

### Step 5 — Verify the Fix

```javascript
// After fix: open Gutenberg, open DevTools Network tab, save the post
// The POST to /wp-json/wp/v2/posts/42 should return 200, not 401

// You can also test nonce validity directly:
fetch('/wp-json/wp/v2/posts/42', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': wpApiSettings.nonce,
    },
    body: JSON.stringify({ status: 'publish' }),
})
.then(res => {
    console.log('Status:', res.status); // should be 200
    return res.json();
})
.then(data => console.log('Saved post ID:', data.id));
```

---

## Scenario 3: Cache REST API Responses at CDN Level

**The situation:** A high-traffic WordPress site has public REST API endpoints (`/wp-json/wp/v2/posts`, `/wp-json/myapp/v1/featured`) being hit thousands of times per minute. Each request goes all the way to PHP, causing high server load. The site uses Cloudflare as its CDN.

---

### Step 1 — Understand What Can and Cannot Be CDN-Cached

| Endpoint | CDN Cacheable | Reason |
|---|---|---|
| `GET /wp-json/wp/v2/posts` (public) | Yes | Read-only, same response for all users |
| `GET /wp-json/wp/v2/posts/42` (public) | Yes | Read-only, same response for all users |
| `POST /wp-json/wp/v2/posts` (write) | Never | Writes data; must reach origin |
| `GET /wp-json/wp/v2/posts` with nonce | Never | Authenticated, user-specific |
| `GET /wp-json/myapp/v1/profile` | Never | Authenticated, private |
| `GET /wp-json/myapp/v1/stats` (public) | Yes | Same for all users, read-only |

---

### Step 2 — Set Correct Cache-Control Headers in WordPress

By default, WordPress sends `Cache-Control: no-cache` on REST responses. Override this for public read endpoints:

```php
<?php
add_action( 'rest_api_init', 'myapp_register_cacheable_routes' );

function myapp_register_cacheable_routes(): void {
    register_rest_route( 'myapp/v1', '/featured-posts', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'myapp_get_featured_posts',
        'permission_callback' => '__return_true',  // public — no auth
        'args'                => [
            'category' => [
                'type'              => 'integer',
                'sanitize_callback' => 'absint',
            ],
        ],
    ] );
}

function myapp_get_featured_posts( WP_REST_Request $request ): \WP_REST_Response {
    $category  = (int) $request->get_param( 'category' );
    $cache_key = 'featured_posts_cat_' . $category;

    // Layer 1: WordPress transient cache (PHP-level)
    $data = get_transient( $cache_key );

    if ( false === $data ) {
        $posts = get_posts( [
            'posts_per_page' => 10,
            'cat'            => $category ?: 0,
            'meta_key'       => '_featured',
            'meta_value'     => '1',
            'post_status'    => 'publish',
        ] );

        $data = array_map( function( \WP_Post $post ): array {
            return [
                'id'        => $post->ID,
                'title'     => $post->post_title,
                'excerpt'   => wp_trim_words( $post->post_content, 30 ),
                'link'      => get_permalink( $post->ID ),
                'thumbnail' => get_the_post_thumbnail_url( $post->ID, 'medium' ),
                'date'      => $post->post_date_gmt,
            ];
        }, $posts );

        // Store in transient for 5 minutes (fallback if CDN bypasses)
        set_transient( $cache_key, $data, 5 * MINUTE_IN_SECONDS );
    }

    $response = new \WP_REST_Response( $data, 200 );

    // Layer 2: CDN caching headers
    // public: CDN can cache
    // max-age: how long the browser caches (300s = 5 min)
    // s-maxage: how long the CDN caches (1800s = 30 min; overrides max-age for CDNs)
    // stale-while-revalidate: CDN serves stale while fetching fresh (no cache miss penalty)
    $response->header( 'Cache-Control', 'public, max-age=300, s-maxage=1800, stale-while-revalidate=60' );

    // Vary: Accept-Encoding ensures gzip and non-gzip get separate cache entries
    $response->header( 'Vary', 'Accept-Encoding' );

    // ETag for conditional requests (reduces bandwidth on cache validation)
    $etag = md5( wp_json_encode( $data ) );
    $response->header( 'ETag', '"' . $etag . '"' );

    return $response;
}

// Invalidate transient cache when posts are saved
add_action( 'save_post', 'myapp_invalidate_featured_cache' );
add_action( 'deleted_post', 'myapp_invalidate_featured_cache' );

function myapp_invalidate_featured_cache(): void {
    // Clear all category variants
    global $wpdb;
    $wpdb->query(
        "DELETE FROM {$wpdb->options}
         WHERE option_name LIKE '_transient_featured_posts_cat_%'
            OR option_name LIKE '_transient_timeout_featured_posts_cat_%'"
    );
}
```

---

### Step 3 — Nginx Configuration for REST API Caching

```nginx
# http context — define cache zone for REST API
fastcgi_cache_path /var/cache/nginx/rest_api
    levels=1:2
    keys_zone=REST_API:50m
    max_size=500m
    inactive=30m
    use_temp_path=off;

# Cache key includes the full URI with query string
# Different /wp-json/wp/v2/posts?page=1 and ?page=2 get separate cache entries

server {
    set $rest_skip_cache 0;

    # Never cache authenticated REST requests
    if ($http_authorization != "")           { set $rest_skip_cache 1; }
    if ($http_cookie ~* "wordpress_logged_in") { set $rest_skip_cache 1; }
    if ($request_method !~ ^(GET|HEAD)$)     { set $rest_skip_cache 1; }

    location /wp-json/ {
        fastcgi_cache             REST_API;
        fastcgi_cache_key         "$scheme$request_method$host$request_uri";
        fastcgi_cache_valid        200 30m;    # cache 200 responses for 30 minutes
        fastcgi_cache_valid        404 1m;     # cache 404s briefly
        fastcgi_cache_bypass      $rest_skip_cache;
        fastcgi_no_cache          $rest_skip_cache;
        fastcgi_cache_use_stale   error timeout updating http_500;
        fastcgi_cache_background_update on;
        fastcgi_cache_lock        on;

        add_header X-REST-Cache-Status $upstream_cache_status;

        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

---

### Step 4 — Cloudflare CDN Configuration

In Cloudflare Dashboard:

1. **Cache Rules** (Rules > Cache Rules):
   - Rule: `URI Path starts with /wp-json/myapp/v1/featured`
   - Cache eligibility: Eligible for cache
   - Edge TTL: Respect origin Cache-Control headers
   - Browser TTL: Respect origin Cache-Control headers

2. **Bypass authenticated requests** (already handled by `Cache-Control: private` on auth endpoints, but add a rule):
   - Rule: `URI Path starts with /wp-json/ AND Cookie contains "wordpress_logged_in"`
   - Cache eligibility: Bypass cache

3. **Cache purge on content update** (via Cloudflare API):

```php
// Purge Cloudflare cache when WordPress posts are saved
add_action( 'save_post', 'myapp_purge_cloudflare_cache', 10, 1 );

function myapp_purge_cloudflare_cache( int $post_id ): void {
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
        return;
    }

    $cf_zone_id  = get_option( 'myapp_cf_zone_id' );
    $cf_api_token = get_option( 'myapp_cf_api_token' );

    if ( ! $cf_zone_id || ! $cf_api_token ) {
        return;
    }

    // Purge specific REST API URLs related to this post
    $urls_to_purge = [
        rest_url( 'wp/v2/posts/' . $post_id ),
        rest_url( 'wp/v2/posts' ),
        rest_url( 'myapp/v1/featured-posts' ),
    ];

    wp_remote_post(
        "https://api.cloudflare.com/client/v4/zones/{$cf_zone_id}/purge_cache",
        [
            'headers' => [
                'Authorization' => 'Bearer ' . $cf_api_token,
                'Content-Type'  => 'application/json',
            ],
            'body'    => wp_json_encode( [ 'files' => $urls_to_purge ] ),
            'timeout' => 10,
        ]
    );
}
```

---

### Step 5 — Verify Caching

```bash
# Check response headers — look for cache HIT/MISS
curl -s -I https://example.com/wp-json/myapp/v1/featured-posts

# Expected headers on first request (MISS):
# Cache-Control: public, max-age=300, s-maxage=1800
# X-REST-Cache-Status: MISS
# CF-Cache-Status: MISS

# On second request (HIT):
# X-REST-Cache-Status: HIT
# CF-Cache-Status: HIT
# Age: 45   (seconds since cached)

# Confirm authenticated requests are NOT cached
curl -s -I \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
  https://example.com/wp-json/myapp/v1/profile
# Should show: Cache-Control: no-store, private
# CF-Cache-Status: DYNAMIC (not cached)
```

---

## Scenario 4: Building a Versioned, Backward-Compatible Custom REST API for a Headless WordPress Setup

**Scenario:**
A media company runs a headless WordPress backend with a React front end consuming a custom REST API at `mysite/v1`. After a year in production, a breaking change is needed (renaming a field, restructuring a nested object). The v1 mobile app cannot be updated immediately, so both versions must coexist.

**Challenge:**
Introduce `v2` without breaking `v1` clients, share business logic between versions, and document the deprecation path.

**Solution:**

1. Structure the plugin to share a controller base class:

```php
<?php
// plugin/includes/class-articles-controller-base.php

abstract class MyApp_Articles_Controller_Base extends WP_REST_Controller {

    protected function get_article_data( WP_Post $post ): array {
        return [
            'id'      => $post->ID,
            'title'   => $post->post_title,
            'content' => apply_filters( 'the_content', $post->post_content ),
            'date'    => $post->post_date_gmt,
            'author'  => get_the_author_meta( 'display_name', $post->post_author ),
        ];
    }
}
```

2. Register v1 — preserves the original field structure:

```php
// plugin/includes/class-articles-controller-v1.php

class MyApp_Articles_Controller_V1 extends MyApp_Articles_Controller_Base {

    protected $namespace = 'mysite/v1';
    protected $rest_base = 'articles';

    public function register_routes(): void {
        register_rest_route( $this->namespace, '/' . $this->rest_base, [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_items' ],
            'permission_callback' => '__return_true',
        ] );
    }

    public function get_items( WP_REST_Request $request ): WP_REST_Response {
        $posts = get_posts( [ 'post_type' => 'post', 'posts_per_page' => 10 ] );
        $data  = array_map( [ $this, 'get_article_data' ], $posts );

        // v1 returns flat author string — legacy format
        $response = new WP_REST_Response( $data, 200 );
        $response->header( 'Deprecation', 'true' );
        $response->header( 'Sunset', gmdate( 'D, d M Y', strtotime( '+12 months' ) ) . ' 00:00:00 GMT' );
        $response->header( 'Link', '<https://example.com/wp-json/mysite/v2/articles>; rel="successor-version"' );
        return $response;
    }
}
```

3. Register v2 — breaking changes isolated here:

```php
// plugin/includes/class-articles-controller-v2.php

class MyApp_Articles_Controller_V2 extends MyApp_Articles_Controller_Base {

    protected $namespace = 'mysite/v2';
    protected $rest_base = 'articles';

    public function register_routes(): void {
        register_rest_route( $this->namespace, '/' . $this->rest_base, [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_items' ],
            'permission_callback' => '__return_true',
            'args'                => [
                'per_page' => [ 'type' => 'integer', 'default' => 10, 'minimum' => 1, 'maximum' => 100 ],
                'page'     => [ 'type' => 'integer', 'default' => 1,  'minimum' => 1 ],
            ],
        ] );
    }

    public function get_items( WP_REST_Request $request ): WP_REST_Response {
        $per_page = (int) $request->get_param( 'per_page' );
        $page     = (int) $request->get_param( 'page' );

        $query = new WP_Query( [
            'post_type'      => 'post',
            'posts_per_page' => $per_page,
            'paged'          => $page,
            'post_status'    => 'publish',
        ] );

        $data = array_map( function( WP_Post $post ): array {
            $base = $this->get_article_data( $post );
            // v2: author is now an object, not a flat string
            $base['author'] = [
                'id'           => (int) $post->post_author,
                'display_name' => get_the_author_meta( 'display_name', $post->post_author ),
                'avatar'       => get_avatar_url( (int) $post->post_author ),
            ];
            // v2: new thumbnail field
            $base['thumbnail'] = get_the_post_thumbnail_url( $post->ID, 'medium' ) ?: null;
            return $base;
        }, $query->posts );

        $response = new WP_REST_Response( $data, 200 );
        $response->header( 'X-WP-Total',      (int) $query->found_posts );
        $response->header( 'X-WP-TotalPages', (int) $query->max_num_pages );
        return $response;
    }
}
```

4. Boot both controllers from the plugin:

```php
add_action( 'rest_api_init', function () {
    ( new MyApp_Articles_Controller_V1() )->register_routes();
    ( new MyApp_Articles_Controller_V2() )->register_routes();
} );
```

5. Test both versions coexist:

```bash
# v1 still returns flat author string
curl -s https://example.com/wp-json/mysite/v1/articles | jq '.[0].author'
# "Jane Smith"

# v2 returns author object
curl -s https://example.com/wp-json/mysite/v2/articles | jq '.[0].author'
# { "id": 3, "display_name": "Jane Smith", "avatar": "https://..." }

# v1 response includes deprecation headers
curl -sI https://example.com/wp-json/mysite/v1/articles | grep -i 'deprecation\|sunset'
# Deprecation: true
# Sunset: Mon, 30 Mar 2027 00:00:00 GMT
```

---

## Scenario 5: Implementing OAuth2-Style Token Authentication for a Mobile App Consuming the WP REST API

**Scenario:**
A native mobile app needs stateless, short-lived token authentication against WordPress. Application Passwords are not ideal because they never expire. The team wants access tokens (15-minute TTL) and refresh tokens (30-day TTL) without a third-party plugin dependency.

**Challenge:**
Implement a token issuance endpoint, a token refresh endpoint, and a per-request validation middleware — all in a custom plugin using only WordPress core.

**Solution:**

1. Issue tokens on login (`POST /myapp/v1/auth/token`):

```php
add_action( 'rest_api_init', function () {
    register_rest_route( 'myapp/v1', '/auth/token', [
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'myapp_issue_token',
        'permission_callback' => '__return_true',
        'args'                => [
            'username' => [ 'type' => 'string', 'required' => true, 'sanitize_callback' => 'sanitize_user' ],
            'password' => [ 'type' => 'string', 'required' => true ],
        ],
    ] );

    register_rest_route( 'myapp/v1', '/auth/refresh', [
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'myapp_refresh_token',
        'permission_callback' => '__return_true',
        'args'                => [
            'refresh_token' => [ 'type' => 'string', 'required' => true ],
        ],
    ] );
} );

function myapp_issue_token( WP_REST_Request $request ): WP_REST_Response|WP_Error {
    $user = wp_authenticate(
        $request->get_param( 'username' ),
        $request->get_param( 'password' )
    );

    if ( is_wp_error( $user ) ) {
        return new WP_Error( 'invalid_credentials', 'Invalid username or password.', [ 'status' => 401 ] );
    }

    return new WP_REST_Response( myapp_generate_tokens( $user->ID ), 200 );
}

function myapp_generate_tokens( int $user_id ): array {
    $access_token  = wp_generate_password( 64, false );
    $refresh_token = wp_generate_password( 64, false );
    $now           = time();

    // Store hashed tokens — never store plaintext
    set_transient( 'myapp_at_' . hash( 'sha256', $access_token ),  $user_id, 15 * MINUTE_IN_SECONDS );
    set_transient( 'myapp_rt_' . hash( 'sha256', $refresh_token ), $user_id, 30 * DAY_IN_SECONDS );

    return [
        'access_token'  => $access_token,
        'token_type'    => 'Bearer',
        'expires_in'    => 900,
        'refresh_token' => $refresh_token,
    ];
}

function myapp_refresh_token( WP_REST_Request $request ): WP_REST_Response|WP_Error {
    $rt      = $request->get_param( 'refresh_token' );
    $hash    = hash( 'sha256', $rt );
    $user_id = (int) get_transient( 'myapp_rt_' . $hash );

    if ( ! $user_id ) {
        return new WP_Error( 'invalid_refresh_token', 'Refresh token is invalid or expired.', [ 'status' => 401 ] );
    }

    // Rotate refresh token (one-time use)
    delete_transient( 'myapp_rt_' . $hash );

    return new WP_REST_Response( myapp_generate_tokens( $user_id ), 200 );
}
```

2. Validate the access token on protected requests via `rest_authentication_errors`:

```php
add_filter( 'rest_authentication_errors', function( $result ) {
    // Don't override if another authentication method already ran
    if ( null !== $result ) {
        return $result;
    }

    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if ( ! str_starts_with( $auth_header, 'Bearer ' ) ) {
        return $result; // not a Bearer request; let WP handle it
    }

    $token   = substr( $auth_header, 7 );
    $hash    = hash( 'sha256', $token );
    $user_id = (int) get_transient( 'myapp_at_' . $hash );

    if ( ! $user_id ) {
        return new WP_Error( 'token_invalid', 'Access token is invalid or expired.', [ 'status' => 401 ] );
    }

    wp_set_current_user( $user_id );
    return true;
} );
```

3. Example mobile client flow:

```javascript
// 1. Obtain tokens
const { access_token, refresh_token, expires_in } = await fetch(
    'https://example.com/wp-json/myapp/v1/auth/token',
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'johndoe', password: 'secret' }),
    }
).then( r => r.json() );

// Persist tokens securely (iOS Keychain / Android Keystore)
storeSecurely( 'access_token', access_token );
storeSecurely( 'refresh_token', refresh_token );

// 2. Use access token for API calls
const profile = await fetch( 'https://example.com/wp-json/myapp/v1/profile', {
    headers: { 'Authorization': `Bearer ${access_token}` },
} ).then( r => r.json() );

// 3. Refresh when the access token expires (check expires_in or catch 401)
async function refreshAccessToken() {
    const rt = retrieveSecurely( 'refresh_token' );
    const tokens = await fetch( 'https://example.com/wp-json/myapp/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
    } ).then( r => r.json() );
    storeSecurely( 'access_token', tokens.access_token );
    storeSecurely( 'refresh_token', tokens.refresh_token ); // rotated
}
```

---

## Scenario 6: Debugging a CORS Issue Blocking a React Frontend from a WP REST API on a Different Domain

**Scenario:**
A React SPA at `https://app.example.com` fetches from a WordPress REST API at `https://cms.example.com/wp-json/`. The browser blocks the request with: `Access to fetch at 'https://cms.example.com/wp-json/wp/v2/posts' from origin 'https://app.example.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present`.

**Challenge:**
Diagnose where in the stack CORS headers are missing and apply the fix at the right layer — not just in PHP, but also at Nginx and the CDN.

**Solution:**

1. Reproduce and inspect the preflight:

```bash
# Simulate a browser CORS preflight
curl -s -I \
  -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-WP-Nonce, Content-Type" \
  https://cms.example.com/wp-json/wp/v2/posts

# A correct response must include:
# Access-Control-Allow-Origin: https://app.example.com
# Access-Control-Allow-Methods: GET, POST, OPTIONS
# Access-Control-Allow-Headers: X-WP-Nonce, Content-Type, Authorization
```

2. Add CORS headers in WordPress via the `rest_api_init` action — this handles PHP-level responses:

```php
add_action( 'rest_api_init', function () {
    remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );

    add_filter( 'rest_pre_serve_request', function( $value ) {
        $allowed_origins = [
            'https://app.example.com',
            'https://staging.example.com',
        ];

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if ( in_array( $origin, $allowed_origins, true ) ) {
            header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
            header( 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS' );
            header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce' );
            header( 'Access-Control-Allow-Credentials: true' );
            header( 'Vary: Origin' );
        }

        // Handle preflight
        if ( 'OPTIONS' === $_SERVER['REQUEST_METHOD'] ) {
            header( 'HTTP/1.1 204 No Content' );
            exit;
        }

        return $value;
    } );
}, 15 );
```

3. Handle CORS at Nginx for OPTIONS preflights that may not reach PHP:

```nginx
server {
    location /wp-json/ {
        # Handle OPTIONS preflight before passing to PHP
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin  "https://app.example.com" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-WP-Nonce" always;
            add_header Access-Control-Max-Age       3600 always;
            add_header Content-Length 0;
            return 204;
        }

        add_header Access-Control-Allow-Origin "https://app.example.com" always;
        add_header Vary Origin always;

        try_files $uri $uri/ /index.php?$args;
    }
}
```

4. If using Cloudflare, ensure CORS headers are not being stripped by a Transform Rule. Verify with:

```bash
# Check whether Cloudflare is caching the preflight response without CORS headers
curl -s -I \
  -X OPTIONS \
  -H "Origin: https://app.example.com" \
  https://cms.example.com/wp-json/wp/v2/posts | grep -i 'cf-cache\|access-control'
```

5. Common mistakes to check:

```javascript
// Mistake 1: fetch with credentials but server returns wildcard origin
// fetch with credentials: 'include' requires a specific origin, not '*'
fetch( url, { credentials: 'include' } );
// Server MUST return: Access-Control-Allow-Origin: https://app.example.com (not *)
// AND:                Access-Control-Allow-Credentials: true

// Mistake 2: missing Vary: Origin header causes CDN to serve cached response
// without CORS headers to a different allowed origin
// Always include: Vary: Origin in the response

// Mistake 3: nonce-based auth from a cross-origin context
// Nonces are session-bound — Application Passwords or custom tokens are the
// correct auth mechanism for cross-origin requests
```

---

## Scenario 7: Caching REST API Responses at the Endpoint Level to Reduce Database Load

**Scenario:**
A news site has a public `GET /wp-json/mysite/v1/trending` endpoint that runs an expensive `WP_Query` with three meta queries and a `GROUP BY`. The endpoint is called 50,000 times per hour from a React front end. Trending data only needs to update every 5 minutes.

**Challenge:**
Implement a multi-layer caching strategy: PHP transient (object cache), HTTP cache headers, and selective cache invalidation on publish — without serving stale content after a new article is published.

**Solution:**

1. Register the endpoint with a cache-aware callback:

```php
add_action( 'rest_api_init', function () {
    register_rest_route( 'mysite/v1', '/trending', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'mysite_get_trending',
        'permission_callback' => '__return_true',
        'args'                => [
            'limit' => [
                'type'              => 'integer',
                'default'           => 10,
                'minimum'           => 1,
                'maximum'           => 50,
                'sanitize_callback' => 'absint',
            ],
        ],
    ] );
} );

function mysite_get_trending( WP_REST_Request $request ): WP_REST_Response {
    $limit     = (int) $request->get_param( 'limit' );
    $cache_key = 'mysite_trending_limit_' . $limit;

    // Layer 1: object cache (Redis/Memcached via WP object cache drop-in)
    $data = wp_cache_get( $cache_key, 'mysite_rest' );

    if ( false === $data ) {
        // Expensive query — runs only on cache miss
        $data = mysite_fetch_trending_posts( $limit );

        // Cache for 5 minutes in object cache
        wp_cache_set( $cache_key, $data, 'mysite_rest', 5 * MINUTE_IN_SECONDS );

        // Also write a transient as fallback when Redis is unavailable
        set_transient( $cache_key, $data, 5 * MINUTE_IN_SECONDS );
    }

    // Generate ETag from data hash for conditional GET support
    $etag = '"' . md5( wp_json_encode( $data ) ) . '"';

    // Return 304 Not Modified if client's ETag matches
    if ( isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag ) {
        return new WP_REST_Response( null, 304 );
    }

    $response = new WP_REST_Response( $data, 200 );
    // public: CDNs can cache  |  s-maxage: CDN TTL  |  stale-while-revalidate: serve stale while refreshing
    $response->header( 'Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=30' );
    $response->header( 'ETag', $etag );
    $response->header( 'Vary', 'Accept-Encoding' );
    $response->header( 'X-Cache-Hit', 'MISS' ); // override to HIT in production after confirming caching
    return $response;
}

function mysite_fetch_trending_posts( int $limit ): array {
    global $wpdb;

    // Raw query is faster than WP_Query for aggregation
    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT p.ID, p.post_title, p.post_date,
                CAST(pm_views.meta_value AS UNSIGNED) AS view_count
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm_views ON p.ID = pm_views.post_id AND pm_views.meta_key = '_view_count'
         WHERE p.post_type   = 'post'
           AND p.post_status = 'publish'
           AND p.post_date   > DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY view_count DESC
         LIMIT %d",
        $limit
    ) );

    return array_map( fn( $row ) => [
        'id'          => (int) $row->ID,
        'title'       => $row->post_title,
        'link'        => get_permalink( (int) $row->ID ),
        'date'        => $row->post_date,
        'view_count'  => (int) $row->view_count,
        'thumbnail'   => get_the_post_thumbnail_url( (int) $row->ID, 'medium' ) ?: null,
    ], $rows );
}
```

2. Invalidate the cache when a post is published or updated:

```php
add_action( 'transition_post_status', function( string $new_status, string $old_status, WP_Post $post ): void {
    if ( 'post' !== $post->post_type ) {
        return;
    }
    if ( 'publish' === $new_status || 'publish' === $old_status ) {
        mysite_purge_trending_cache();
    }
}, 10, 3 );

function mysite_purge_trending_cache(): void {
    global $wpdb;

    // Purge all limit variants from object cache
    foreach ( [ 5, 10, 20, 50 ] as $limit ) {
        wp_cache_delete( 'mysite_trending_limit_' . $limit, 'mysite_rest' );
    }

    // Purge transients
    $wpdb->query(
        "DELETE FROM {$wpdb->options}
         WHERE option_name LIKE '_transient_mysite_trending_%'
            OR option_name LIKE '_transient_timeout_mysite_trending_%'"
    );

    // Purge Cloudflare cache for the endpoint URL
    $cf_token   = defined( 'CF_API_TOKEN' )  ? CF_API_TOKEN  : get_option( 'mysite_cf_token' );
    $cf_zone_id = defined( 'CF_ZONE_ID' )    ? CF_ZONE_ID    : get_option( 'mysite_cf_zone_id' );

    if ( $cf_token && $cf_zone_id ) {
        wp_remote_post(
            "https://api.cloudflare.com/client/v4/zones/{$cf_zone_id}/purge_cache",
            [
                'headers' => [
                    'Authorization' => 'Bearer ' . $cf_token,
                    'Content-Type'  => 'application/json',
                ],
                'body'    => wp_json_encode( [
                    'files' => [
                        rest_url( 'mysite/v1/trending' ),
                        rest_url( 'mysite/v1/trending?limit=5' ),
                        rest_url( 'mysite/v1/trending?limit=20' ),
                    ],
                ] ),
                'timeout' => 5,
            ]
        );
    }
}
```

3. Verify the caching layers are working:

```bash
# First request — MISS
curl -sI https://cms.example.com/wp-json/mysite/v1/trending
# Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=30
# ETag: "a1b2c3d4..."
# CF-Cache-Status: MISS

# Second request — HIT at CDN
curl -sI https://cms.example.com/wp-json/mysite/v1/trending
# CF-Cache-Status: HIT
# Age: 12

# Conditional GET — should return 304 if ETag matches
curl -sI -H 'If-None-Match: "a1b2c3d4..."' https://cms.example.com/wp-json/mysite/v1/trending
# HTTP/2 304
```

---
