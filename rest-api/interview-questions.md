# REST API — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What does "stateless" mean in REST?**
**A:** Each request must contain all information needed to process it. The server stores no session state between requests.
```http
GET /wp-json/wp/v2/posts HTTP/1.1
Authorization: Basic dXNlcjpwYXNz
```

**Q2: What is the difference between GET and POST?**
**A:** GET retrieves data and is idempotent; POST creates a resource and is not idempotent. GET carries no request body.
```http
POST /wp-json/wp/v2/posts HTTP/1.1
Content-Type: application/json

{"title":"Hello","status":"publish"}
```

**Q3: What does idempotent mean?**
**A:** Repeated identical calls produce the same server state. GET, PUT, and DELETE are idempotent; POST and PATCH are not.
```http
PUT /wp-json/wp/v2/posts/1
{"title":"Same Title Every Time"}
```

**Q4: What is the difference between PUT and PATCH?**
**A:** PUT replaces the entire resource with the supplied representation. PATCH applies only the supplied fields as a partial update.
```http
PATCH /wp-json/wp/v2/posts/1
{"status":"draft"}
```

**Q5: What HTTP status code means "resource created successfully"?**
**A:** `201 Created` is returned after a successful POST. The response usually includes the new resource and a `Location` header.
```http
HTTP/1.1 201 Created
Location: /wp-json/wp/v2/posts/42
```

**Q6: What does a 204 response mean?**
**A:** `204 No Content` means the request succeeded but there is no body to return. Commonly used for DELETE and some PATCH calls.
```http
DELETE /wp-json/wp/v2/posts/1?force=true
HTTP/1.1 204 No Content
```

**Q7: What is the difference between 401 and 403?**
**A:** `401 Unauthorized` means authentication is missing or invalid. `403 Forbidden` means authenticated but not permitted.
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="WordPress"
```

**Q8: What does a 429 status code mean?**
**A:** `429 Too Many Requests` signals the client has exceeded a rate limit. A `Retry-After` header may indicate when to retry.
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

**Q9: What is the WordPress REST API base URL?**
**A:** The base URL is `/wp-json/wp/v2/`. It exposes built-in endpoints for posts, pages, users, media, categories, and tags.
```bash
curl https://example.com/wp-json/wp/v2/posts
```

**Q10: How do you fetch a single post via the REST API?**
**A:** Append the post ID to the posts endpoint. The response is a single JSON post object.
```bash
curl https://example.com/wp-json/wp/v2/posts/42
```

**Q11: How do you authenticate REST API requests using a nonce?**
**A:** Generate a nonce with `wp_create_nonce('wp_rest')` and send it as the `X-WP-Nonce` header. This works alongside cookie auth in the browser.
```javascript
fetch('/wp-json/wp/v2/posts', {
  headers: { 'X-WP-Nonce': wpApiSettings.nonce }
});
```

**Q12: What are Application Passwords?**
**A:** Application Passwords let external apps authenticate via HTTP Basic Auth without using the account's main password. Generated in the user profile screen.
```bash
curl -u "admin:abcd efgh ijkl" https://example.com/wp-json/wp/v2/posts
```

**Q13: How do you expose a custom post type in the REST API?**
**A:** Set `show_in_rest => true` when registering the post type. Use `rest_base` to customise the endpoint slug.
```php
register_post_type('book', [
  'show_in_rest' => true,
  'rest_base'    => 'books',
]);
```

**Q14: What function registers a custom REST route?**
**A:** `register_rest_route()` hooked into `rest_api_init`. You provide a namespace, route pattern, and a handler array.
```php
add_action('rest_api_init', function () {
  register_rest_route('myplugin/v1', '/hello', [
    'methods'             => 'GET',
    'callback'            => 'my_hello_handler',
    'permission_callback' => '__return_true',
  ]);
});
```

**Q15: What does `permission_callback` do?**
**A:** It gates access to the endpoint. Return `true` for public access, or a `WP_Error`/`false` to block. It is required since WP 5.5.
```php
'permission_callback' => function () {
  return current_user_can('edit_posts');
},
```

**Q16: How do you read a query parameter from a REST request?**
**A:** Use `$request->get_param('key')` for a single value or `$request->get_params()` for the full array.
```php
function my_callback( WP_REST_Request $request ) {
  $status = $request->get_param('status');
}
```

**Q17: How do you paginate REST API results?**
**A:** Use `page` and `per_page` query params. The response headers `X-WP-Total` and `X-WP-TotalPages` expose total counts.
```bash
curl "https://example.com/wp-json/wp/v2/posts?per_page=5&page=2"
```

**Q18: What is the `?_fields` parameter?**
**A:** `_fields` limits the response to the listed fields, reducing payload size and improving performance.
```bash
curl "https://example.com/wp-json/wp/v2/posts?_fields=id,title,slug"
```

**Q19: What does `?_embed` do?**
**A:** `_embed` tells the API to inline linked resources such as featured media, author, and terms instead of returning only `_links`.
```bash
curl "https://example.com/wp-json/wp/v2/posts?_embed=author,wp:featuredmedia"
```

**Q20: What HTTP status code indicates a validation error?**
**A:** `400 Bad Request` is returned when data is malformed or fails argument validation. WordPress returns a JSON `WP_Error` body.
```json
{
  "code": "rest_invalid_param",
  "message": "Invalid parameter(s): status",
  "data": { "status": 400 }
}
```

---

## Mid

**Q21: How do you register a custom REST field for posts?**
**A:** Use `register_rest_field()` inside `rest_api_init`. Supply `get_callback` to read and `update_callback` to write the extra field.
```php
register_rest_field('post', 'reading_time', [
  'get_callback'    => fn($post) => (int) get_post_meta($post['id'], 'reading_time', true),
  'update_callback' => fn($val, $post) => update_post_meta($post->ID, 'reading_time', (int) $val),
  'schema'          => ['type' => 'integer'],
]);
```

**Q22: How do you define and validate args in `register_rest_route()`?**
**A:** Add an `args` array to the route definition. Each key can carry `type`, `required`, `enum`, `minimum`, `maximum`, `sanitize_callback`, and `validate_callback`.
```php
'args' => [
  'status' => [
    'type'     => 'string',
    'required' => true,
    'enum'     => ['publish', 'draft', 'private'],
  ],
],
```

**Q23: How do you return a `WP_Error` from a REST callback?**
**A:** Return `new WP_Error()` with a code, message, and a `data` array that includes a `status` key for the HTTP code.
```php
return new WP_Error(
  'not_found',
  'Post not found.',
  ['status' => 404]
);
```

**Q24: How do you build a `WP_REST_Response` with custom headers and a status code?**
**A:** Instantiate `WP_REST_Response`, call `set_status()`, and add headers with `header()` before returning.
```php
$response = new WP_REST_Response(['message' => 'Created']);
$response->set_status(201);
$response->header('X-Resource-ID', '42');
return $response;
```

**Q25: How do you implement rate limiting for a REST endpoint?**
**A:** Store a hit counter in a transient keyed to the client IP. Return `429` when the limit is exceeded.
```php
$key  = 'rate_' . md5($_SERVER['REMOTE_ADDR']);
$hits = (int) get_transient($key);
if ($hits >= 60) {
  return new WP_Error('rate_limit', 'Too many requests.', ['status' => 429]);
}
set_transient($key, $hits + 1, MINUTE_IN_SECONDS);
```

**Q26: How do you version a custom REST API namespace?**
**A:** Use a versioned namespace such as `myplugin/v1`. When introducing breaking changes, register `myplugin/v2` while keeping v1 alive.
```php
register_rest_route('myplugin/v2', '/items', [
  'methods'             => 'GET',
  'callback'            => 'my_v2_items_handler',
  'permission_callback' => '__return_true',
]);
```

**Q27: How do you add deprecation headers to an old API version?**
**A:** Hook `rest_post_dispatch` and inject `Deprecation`, `Sunset`, and `Link` headers when the route matches the old namespace.
```php
add_filter('rest_post_dispatch', function ($response, $server, $request) {
  if (str_starts_with($request->get_route(), '/myplugin/v1')) {
    $response->header('Deprecation', 'true');
    $response->header('Sunset', 'Sat, 31 Dec 2025 00:00:00 GMT');
    $response->header('Link', '</myplugin/v2/items>; rel="successor-version"');
  }
  return $response;
}, 10, 3);
```

**Q28: How do you cache a REST response using transients?**
**A:** Check for a cached transient first. On miss, fetch fresh data, store it, and return. On hit, return the cached value immediately.
```php
$cache = get_transient('my_items_cache');
if (false !== $cache) {
  return new WP_REST_Response($cache);
}
$data = my_expensive_query();
set_transient('my_items_cache', $data, HOUR_IN_SECONDS);
return new WP_REST_Response($data);
```

**Q29: How do you add a `Cache-Control` header to a REST response?**
**A:** Call `$response->header('Cache-Control', '...')` on the `WP_REST_Response` object before returning it from your callback.
```php
$response = new WP_REST_Response($data);
$response->header('Cache-Control', 'public, max-age=300, s-maxage=600');
return $response;
```

**Q30: How do you handle CORS for the WordPress REST API?**
**A:** Use the `rest_pre_serve_request` filter to emit `Access-Control-Allow-*` headers before the response body is sent.
```php
add_filter('rest_pre_serve_request', function ($served) {
  header('Access-Control-Allow-Origin: https://app.example.com');
  header('Access-Control-Allow-Headers: X-WP-Nonce, Content-Type, Authorization');
  return $served;
});
```

**Q31: How do you restrict the REST API to authenticated users only?**
**A:** Return a `WP_Error` from the `rest_authentication_errors` filter when no user is authenticated and no prior error exists.
```php
add_filter('rest_authentication_errors', function ($result) {
  if ($result) return $result;
  if (!is_user_logged_in()) {
    return new WP_Error('rest_not_logged_in', 'Authentication required.', ['status' => 401]);
  }
  return $result;
});
```

**Q32: How do you hide the `/users` endpoint from unauthenticated requests?**
**A:** Remove the endpoint from the `rest_endpoints` filter when the request is not from an authenticated user.
```php
add_filter('rest_endpoints', function ($endpoints) {
  if (!is_user_logged_in()) {
    unset($endpoints['/wp/v2/users']);
    unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
  }
  return $endpoints;
});
```

**Q33: How do you use JWT authentication with the REST API?**
**A:** Install a JWT plugin, exchange credentials for a token at `/wp-json/jwt-auth/v1/token`, then send it as a `Bearer` header on subsequent requests.
```bash
# Get token
curl -X POST https://example.com/wp-json/jwt-auth/v1/token \
  -d '{"username":"admin","password":"pass"}' -H "Content-Type: application/json"

# Use token
curl -H "Authorization: Bearer eyJ0eX..." https://example.com/wp-json/wp/v2/posts
```

**Q34: How do you add a custom API key authentication scheme?**
**A:** Hook `determine_current_user`, read a custom header, look up the key in your data store, and return the matching user ID.
```php
add_filter('determine_current_user', function ($user_id) {
  $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
  if (!$key) return $user_id;
  $keys = get_option('my_api_keys', []);
  return $keys[$key] ?? $user_id;
}, 20);
```

**Q35: How do you use `wp.apiFetch` in the block editor?**
**A:** Import `@wordpress/api-fetch`. It automatically attaches the nonce header; just pass a path or options object.
```javascript
import apiFetch from '@wordpress/api-fetch';

apiFetch({ path: '/wp/v2/posts?per_page=5' })
  .then(posts => console.log(posts));
```

**Q36: What are the `X-WP-Total` and `X-WP-TotalPages` headers?**
**A:** They are returned on collection endpoints to expose the total record count and page count, enabling client-side pagination UI.
```javascript
apiFetch({ path: '/wp/v2/posts', parse: false }).then(res => {
  const total = res.headers.get('X-WP-Total');
  const pages = res.headers.get('X-WP-TotalPages');
});
```

**Q37: What is the `409 Conflict` status code used for?**
**A:** `409 Conflict` signals that the request conflicts with the current resource state, such as a duplicate slug or a stale edit conflict.
```json
{
  "code": "term_exists",
  "message": "A term with that name already exists.",
  "data": { "status": 409, "term_id": 7 }
}
```

**Q38: What is the "uniform interface" REST constraint?**
**A:** All resources share a consistent interface: standard HTTP methods, URI identification, and hypermedia links. This decouples clients from server internals.
```http
GET    /wp-json/wp/v2/posts
POST   /wp-json/wp/v2/posts
PUT    /wp-json/wp/v2/posts/1
DELETE /wp-json/wp/v2/posts/1
```

**Q39: What is the "layered system" REST constraint?**
**A:** Clients cannot tell whether they talk directly to the origin server or an intermediary (CDN, proxy, load balancer). Enables transparent scalability.
```
Client → CDN (caches GETs) → Load Balancer → WordPress origin
```

**Q40: How do you read a request header inside a REST callback?**
**A:** Use `$request->get_header('header-name')`. WordPress normalises header names to lowercase with hyphens.
```php
function my_callback( WP_REST_Request $request ) {
  $token = $request->get_header('x-api-token');
  $body  = $request->get_body();
}
```

---

## Advanced

**Q41: How does WPGraphQL differ from the REST API regarding over-fetching and under-fetching?**
**A:** REST can over-fetch (returns unused fields) or under-fetch (requires multiple requests). GraphQL lets the client declare exactly the fields it needs in one query. The N+1 problem requires a dataloader to batch resolvers.
```graphql
query {
  posts {
    nodes {
      title
      featuredImage { node { sourceUrl } }
      author { node { name } }
    }
  }
}
```

**Q42: How do you solve the N+1 problem in a custom REST endpoint?**
**A:** Collect all IDs from the primary result set, then fetch related records in a single bulk query rather than one query per item.
```php
$post_ids   = wp_list_pluck($posts, 'ID');
$meta_rows  = $wpdb->get_results(
  "SELECT post_id, meta_value FROM $wpdb->postmeta
   WHERE meta_key = 'reading_time'
   AND post_id IN (" . implode(',', array_map('intval', $post_ids)) . ")"
);
```

**Q43: How do you implement conditional requests (ETag / If-None-Match)?**
**A:** Hash the response data to produce an ETag. On subsequent requests compare `If-None-Match`; return `304 Not Modified` when it matches.
```php
$etag = '"' . md5(serialize($data)) . '"';
if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
  status_header(304);
  exit;
}
$response->header('ETag', $etag);
$response->header('Cache-Control', 'must-revalidate');
```

**Q44: How do you write an integration test for a custom REST endpoint?**
**A:** Extend `WP_Test_REST_TestCase`, dispatch a `WP_REST_Request` through `rest_get_server()`, and assert on status code and response data.
```php
class Test_My_Endpoint extends WP_Test_REST_TestCase {
  public function test_returns_200() {
    $request  = new WP_REST_Request('GET', '/myplugin/v1/items');
    $response = rest_get_server()->dispatch($request);
    $this->assertSame(200, $response->get_status());
    $this->assertArrayHasKey('items', $response->get_data());
  }
}
```

**Q45: How do you validate a nested object argument in `register_rest_route()`?**
**A:** Set the arg `type` to `object` and provide a `properties` schema map. WordPress recursively validates each nested key against its own schema.
```php
'args' => [
  'config' => [
    'type'       => 'object',
    'required'   => true,
    'properties' => [
      'color' => ['type' => 'string'],
      'size'  => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100],
    ],
  ],
],
```

**Q46: How do you implement cursor-based pagination to avoid expensive SQL offsets?**
**A:** Accept a `cursor` param (the last seen ID), then filter `posts_where` so the query fetches only records after that ID.
```php
add_filter('posts_where', function ($where) use ($after_id) {
  global $wpdb;
  return $where . $wpdb->prepare(' AND {$wpdb->posts}.ID > %d', $after_id);
});
```

**Q47: How do you modify a REST response using `rest_prepare_{post_type}`?**
**A:** Hook `rest_prepare_post` (or the CPT-specific variant) to add, remove, or transform fields on the response object before it is sent.
```php
add_filter('rest_prepare_post', function (WP_REST_Response $response, WP_Post $post) {
  $response->data['word_count'] = str_word_count(
    wp_strip_all_tags($post->post_content)
  );
  return $response;
}, 10, 2);
```

**Q48: How do you implement multi-level authentication fallback (nonce → App Password → API key)?**
**A:** Chain checks in `determine_current_user` at a late priority. Return early if a previous auth method already resolved a user ID.
```php
add_filter('determine_current_user', function ($user_id) {
  if ($user_id) return $user_id; // cookie/nonce already resolved

  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (str_starts_with($auth, 'Bearer ')) {
    return validate_jwt_token(substr($auth, 7)) ?: $user_id;
  }

  $api_key = $_SERVER['HTTP_X_API_KEY'] ?? '';
  if ($api_key) {
    $keys = get_option('my_api_keys', []);
    return $keys[$api_key] ?? $user_id;
  }

  return $user_id;
}, 20);
```

**Q49: How do you batch multiple REST requests in one HTTP call?**
**A:** Use the built-in `/wp/v2/batch/v1` endpoint (WordPress 5.6+). POST a `requests` array; each entry is an independent sub-request object.
```javascript
apiFetch({
  path: '/batch/v1',
  method: 'POST',
  data: {
    requests: [
      { path: '/wp/v2/posts/1', method: 'POST', body: { title: 'Post A' } },
      { path: '/wp/v2/posts/2', method: 'POST', body: { title: 'Post B' } },
    ],
  },
}).then(({ responses }) => console.log(responses));
```

**Q50: How do you use `X-Cache` headers to signal cache hits and misses?**
**A:** Set `X-Cache: HIT` when returning a transient-cached response and `X-Cache: MISS` after a fresh fetch. Helps debug CDN and proxy behaviour.
```php
$cache = get_transient('my_cache_key');
if (false !== $cache) {
  $r = new WP_REST_Response($cache);
  $r->header('X-Cache', 'HIT');
  return $r;
}
$data = fetch_fresh_data();
set_transient('my_cache_key', $data, HOUR_IN_SECONDS);
$r = new WP_REST_Response($data);
$r->header('X-Cache', 'MISS');
return $r;
```
