# REST API — Core Concepts

> WordPress REST API essentials for Senior Engineer interviews.


---

## 1. REST Constraints

REST (Representational State Transfer) defines six architectural constraints:
1. **Client-Server**: Separation of concerns between UI and data storage
2. **Stateless**: Each request contains all information needed; no server-side session
3. **Cacheable**: Responses must define themselves as cacheable or non-cacheable
4. **Uniform Interface**: Consistent resource identification (URLs), manipulation via representations, self-descriptive messages, HATEOAS
5. **Layered System**: Client cannot tell if it's communicating directly with the server or a proxy
6. **Code on Demand** (optional): Servers can send executable code

WordPress's REST API (`/wp-json/wp/v2/`) follows REST conventions but is not strictly HATEOAS-compliant.

---

## 2. HTTP Methods

| Method | WP Usage | Safe | Idempotent |
|--------|----------|------|------------|
| GET | Retrieve posts, users, terms | Yes | Yes |
| POST | Create a new post | No | No |
| PUT | Replace entire post object | No | Yes |
| PATCH | Partial update | No | Yes |
| DELETE | Delete a post | No | Yes |

```php
// WordPress REST: POST creates, PUT/PATCH updates, DELETE removes
// GET /wp/v2/posts        → list posts
// POST /wp/v2/posts       → create post
// GET /wp/v2/posts/42     → get post 42
// PATCH /wp/v2/posts/42   → partial update of post 42
// DELETE /wp/v2/posts/42  → trash/delete post 42
```

---

## 3. WordPress REST Endpoints

WordPress ships with routes for core post types, taxonomies, users, and settings:

```
/wp-json/wp/v2/posts
/wp-json/wp/v2/pages
/wp-json/wp/v2/media
/wp-json/wp/v2/users
/wp-json/wp/v2/categories
/wp-json/wp/v2/tags
/wp-json/wp/v2/comments
/wp-json/wp/v2/settings   (requires auth)
/wp-json/wp/v2/types
/wp-json/wp/v2/statuses
/wp-json/wp/v2/taxonomies
/wp-json/wp/v2/blocks      (reusable blocks)
```

Query parameters: `?search=`, `?per_page=`, `?page=`, `?orderby=`, `?order=`, `?_embed`, `?_fields=`

---

## 4. Authentication

**Nonce (Cookie-based):** For same-origin requests in the WordPress admin. Generated via `wp_create_nonce('wp_rest')` or `wp_localize_script` with `nonce`. Pass as `X-WP-Nonce` header.

**Application Passwords:** For external applications. Generated in Users → Edit → Application Passwords. Use HTTP Basic Auth: `Authorization: Basic base64(username:app_password)`.

**JWT (via plugin):** Third-party plugins (WP REST API – JWT Authentication) issue tokens. Client sends `Authorization: Bearer <token>`.

```javascript
// Cookie/Nonce (admin context)
fetch('/wp-json/wp/v2/posts', {
  headers: { 'X-WP-Nonce': wpApiSettings.nonce }
});

// Application Password (external app)
const credentials = btoa('username:app_password_here');
fetch('https://site.com/wp-json/wp/v2/posts', {
  headers: { 'Authorization': `Basic ${credentials}` }
});
```

---

## 5. `register_rest_route`

The primary function for registering custom REST API endpoints. Arguments: namespace, route pattern, and an args array with method, callback, and permission callback.

```php
add_action('rest_api_init', function () {
    register_rest_route('myplugin/v1', '/featured-posts', [
        'methods'             => WP_REST_Server::READABLE,  // 'GET'
        'callback'            => 'myplugin_get_featured_posts',
        'permission_callback' => '__return_true', // public
        'args'                => [
            'count' => [
                'description'       => 'Number of posts to return.',
                'type'              => 'integer',
                'default'           => 5,
                'minimum'           => 1,
                'maximum'           => 20,
                'sanitize_callback' => 'absint',
            ],
        ],
    ]);
});

function myplugin_get_featured_posts(WP_REST_Request $request): WP_REST_Response {
    $posts = get_posts([
        'posts_per_page' => $request->get_param('count'),
        'meta_key'       => '_featured',
        'meta_value'     => '1',
    ]);
    return new WP_REST_Response(array_map('myplugin_format_post', $posts), 200);
}
```

---

## 6. WP_REST_Response and WP_Error

`WP_REST_Response` wraps the response body, HTTP status code, and headers. `WP_Error` returned from a callback is automatically converted to a JSON error response.

```php
function myplugin_create_item(WP_REST_Request $request): WP_REST_Response|WP_Error {
    $title = sanitize_text_field($request->get_param('title'));

    if (empty($title)) {
        return new WP_Error(
            'missing_title',
            __('Title is required.', 'myplugin'),
            ['status' => 400]
        );
    }

    $post_id = wp_insert_post(['post_title' => $title, 'post_status' => 'draft'], true);

    if (is_wp_error($post_id)) {
        return new WP_Error('insert_failed', $post_id->get_error_message(), ['status' => 500]);
    }

    $response = new WP_REST_Response(['id' => $post_id, 'title' => $title], 201);
    $response->header('Location', rest_url("myplugin/v1/items/{$post_id}"));
    return $response;
}
```

---

## 7. Schema and Validation

Define a `schema` key in `register_rest_route` for automatic documentation and validation. Use `validate_callback` for custom rules. Schema follows JSON Schema Draft 4.

```php
register_rest_route('myplugin/v1', '/posts', [
    'methods'             => 'POST',
    'callback'            => 'myplugin_create_post',
    'permission_callback' => fn() => current_user_can('publish_posts'),
    'args'                => [
        'title' => [
            'type'              => 'string',
            'required'          => true,
            'minLength'         => 1,
            'maxLength'         => 200,
            'sanitize_callback' => 'sanitize_text_field',
        ],
        'status' => [
            'type'              => 'string',
            'enum'              => ['publish', 'draft', 'pending'],
            'default'           => 'draft',
        ],
        'category_ids' => [
            'type'              => 'array',
            'items'             => ['type' => 'integer'],
            'validate_callback' => function($ids) {
                return array_reduce($ids, fn($carry, $id) => $carry && term_exists($id, 'category'), true);
            },
        ],
    ],
]);
```

---

## 8. Rate Limiting

WordPress does not include built-in REST API rate limiting. Implement it via:
- **Transients:** per-user request count stored as a transient, checked in `permission_callback`
- **Nginx `limit_req`:** at the web server level (simplest, no PHP overhead)
- **Redis:** atomic increment with TTL for distributed rate limiting

```php
function myplugin_check_rate_limit(WP_REST_Request $request): bool|WP_Error {
    $ip    = $_SERVER['REMOTE_ADDR'];
    $key   = 'rate_limit_' . md5($ip . date('H')); // reset each hour
    $count = (int) get_transient($key);

    if ($count >= 100) {
        return new WP_Error('rate_limit_exceeded', 'Too many requests.', ['status' => 429]);
    }

    set_transient($key, $count + 1, HOUR_IN_SECONDS);
    return current_user_can('read');
}
```

---

## 9. Versioning

Namespace your REST routes with a version number (`v1`, `v2`) so breaking changes can be introduced in new versions without breaking existing clients.

```php
// v1 endpoint (legacy — maintain for existing clients)
register_rest_route('myplugin/v1', '/posts', [...]);

// v2 endpoint (new format — e.g., different field names or added fields)
register_rest_route('myplugin/v2', '/posts', [...]);

// Version in URL: /wp-json/myplugin/v1/posts
// Version in Accept header (alternative, less common in WP):
// Accept: application/vnd.myplugin.v2+json
```

---

## 10. Caching REST API Responses

By default, WordPress REST API responses include `Cache-Control: no-cache` for authenticated requests. For public endpoints, add caching headers and use transients for expensive queries.

```php
add_action('rest_api_init', function () {
    register_rest_route('myplugin/v1', '/stats', [
        'methods'             => 'GET',
        'callback'            => 'myplugin_get_stats',
        'permission_callback' => '__return_true',
    ]);
});

function myplugin_get_stats(): WP_REST_Response {
    $cache_key = 'myplugin_stats_v1';
    $data      = get_transient($cache_key);

    if (false === $data) {
        $data = [
            'total_posts' => wp_count_posts('post')->publish,
            'total_users' => count_users()['total_users'],
            'generated'   => current_time('c'),
        ];
        set_transient($cache_key, $data, 5 * MINUTE_IN_SECONDS);
    }

    $response = new WP_REST_Response($data, 200);
    $response->header('Cache-Control', 'public, max-age=300');
    $response->header('Vary', 'Accept-Encoding');
    return $response;
}
```
