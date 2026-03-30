# WordPress — Core Concepts

## 1. The WordPress Loop

The Loop is the core mechanism WordPress uses to display posts. It queries the database, iterates over results, and renders each post using template tags.

```php
if ( have_posts() ) {
    while ( have_posts() ) {
        the_post(); // sets up global $post
        the_title();
        the_content();
    }
}
```

Understanding `have_posts()` vs `WP_Query::have_posts()` is critical — the former modifies the global query object while the latter is scoped to a custom instance.

---

## 2. WP_Query and query_posts vs get_posts

- **WP_Query** — the preferred class for custom queries. Instantiates a new query object without affecting the main loop.
- **get_posts()** — a wrapper around WP_Query with sensible defaults; returns an array of WP_Post objects. Does not modify global state.
- **query_posts()** — modifies the main loop query. Strongly discouraged in production because it breaks pagination and resets global state.

Key arguments: `post_type`, `post_status`, `meta_query`, `tax_query`, `orderby`, `posts_per_page`, `paged`, `fields`.

---

## 3. Hooks: Actions and Filters

WordPress's event-driven architecture is built entirely on hooks.

- **add_action( $hook, $callback, $priority, $accepted_args )** — executes code at a named point in the execution flow without returning a value.
- **add_filter( $hook, $callback, $priority, $accepted_args )** — transforms data passing through a named point; the callback must return a value.
- **do_action()** / **apply_filters()** — the trigger calls.
- **remove_action()** / **remove_filter()** — removes a previously registered callback. Requires the exact same priority and, for object methods, the same instance.

Hook priority defaults to 10. Lower numbers run earlier.

---

## 4. Custom Post Types and Taxonomies

Registered via `register_post_type()` and `register_taxonomy()`, typically on the `init` hook.

Key CPT arguments: `labels`, `public`, `has_archive`, `supports` (title, editor, thumbnail, excerpt, custom-fields, revisions, page-attributes), `rewrite`, `show_in_rest` (required for Gutenberg compatibility), `capability_type`.

Custom taxonomies can be hierarchical (like categories) or flat (like tags). Always flush rewrite rules after registering: activate/deactivate plugin hooks call `flush_rewrite_rules()`.

---

## 5. The WordPress REST API

Introduced in WordPress 4.7. Exposes posts, pages, media, users, taxonomies, and settings via JSON endpoints at `/wp-json/wp/v2/`.

Key concepts:
- **register_rest_route()** — registers custom endpoints.
- **WP_REST_Request / WP_REST_Response** — request/response abstraction.
- **permission_callback** — always required; validates authentication and capability checks.
- **Nonces** — `wp_rest_request_before_callbacks` and the `X-WP-Nonce` header authenticate logged-in users.
- **Authentication** — cookie (same-origin), Application Passwords (WordPress 5.6+), JWT/OAuth via plugins.

---

## 6. Gutenberg and the Block Editor

Gutenberg uses React and a block paradigm. Blocks are registered in both JavaScript (client-side edit/save) and optionally PHP (server-side render via `render_callback`).

Key APIs:
- `registerBlockType()` — registers a block with attributes, edit, and save functions.
- `InnerBlocks` — allows nested block content.
- `useBlockProps()` — React hook that returns required props for block wrapper elements.
- Block attributes are stored as JSON in HTML comments in `post_content`.
- **Dynamic blocks** use a PHP `render_callback` and ignore the JS `save()` output.

Full-site editing (FSE) extends this with block themes, `theme.json`, and template-part blocks.

---

## 7. WordPress Multisite

Activated via `wp-config.php` (`MULTISITE`, `SUBDOMAIN_INSTALL`, `DOMAIN_CURRENT_SITE`). Creates a network of sites sharing a single WordPress installation.

Key differences:
- Separate tables per site (`wp_2_posts`, `wp_2_options`, …).
- `switch_to_blog( $blog_id )` / `restore_current_blog()` — switches database context.
- Network-activated plugins run across all sites.
- `wpmu_new_blog` / `wp_initialize_site` hooks fire on site creation.
- Super Admins have access across the entire network.

---

## 8. Transients and Object Caching

- **Transients** (`set_transient`, `get_transient`, `delete_transient`) — store arbitrary data with an expiration time. Backed by the options table by default; backed by an in-memory store (Redis/Memcached) when a persistent object cache drop-in is active.
- **Object Cache** (`wp_cache_set`, `wp_cache_get`, `wp_cache_delete`) — in-memory, per-request cache. With a persistent cache drop-in, survives across requests.
- **Cache groups and keys** — organize cache entries; clearing a group invalidates all entries within it.
- Always cache expensive remote API calls, complex WP_Query results, and aggregated metadata.

---

## 9. Security Fundamentals

- **Nonces** — `wp_create_nonce()` / `wp_verify_nonce()` / `check_admin_referer()` — prevent CSRF.
- **Sanitization** — `sanitize_text_field()`, `sanitize_email()`, `sanitize_url()`, `wp_kses_post()`, `absint()` — clean input before use.
- **Validation** — verify data meets expected format/range before processing.
- **Escaping** — `esc_html()`, `esc_attr()`, `esc_url()`, `esc_js()`, `wp_json_encode()` — escape output for context.
- **Capability checks** — `current_user_can()` before any privileged operation.
- **SQL injection prevention** — always use `$wpdb->prepare()` for dynamic queries.
- **File upload security** — validate MIME types; never trust user-supplied filenames.

---

## 10. Performance Optimization

- **Database** — avoid `meta_query` on unindexed meta keys; use `posts_clauses` filter for custom JOINs; keep `posts_per_page` bounded.
- **Caching layers** — page cache (Varnish/Nginx FastCGI), object cache (Redis), opcode cache (OPcache), browser cache (Cache-Control headers).
- **Assets** — `wp_enqueue_scripts` with proper dependencies; defer/async non-critical JS; lazy-load images; serve WebP via `add_image_size` + `srcset`.
- **Autoloaded options** — keep the `wp_options` autoload payload small (< 800 KB); use `update_option( $key, $value, false )` to mark large options as non-autoloaded.
- **Heartbeat API** — throttle or disable in admin contexts that don't need it.
- **WP-Cron** — disable built-in WP-Cron (`DISABLE_WP_CRON`); drive it from a real server cron (`*/5 * * * * curl https://example.com/wp-cron.php`).

---

## 11. Plugin Architecture and Best Practices

- Use a main plugin class loaded via the `plugins_loaded` hook.
- Namespace everything (classes, functions, hooks) with a unique prefix.
- Follow PSR-4 autoloading via Composer.
- Separate concerns: data layer, business logic, presentation.
- Provide activation, deactivation, and uninstall hooks (`register_activation_hook`, `register_deactivation_hook`, `register_uninstall_hook`).
- Use `plugin_action_links` to add Settings links in the plugin list.
- Write unit tests with WP-CLI scaffold and PHPUnit.

---

## 12. Theme Development and Template Hierarchy

WordPress resolves templates using a strict hierarchy (e.g., `single-{post-type}-{slug}.php` → `single-{post-type}.php` → `single.php` → `index.php`).

- **Child themes** — override parent theme files without modification; enqueue parent stylesheet via `get_template_directory_uri()`.
- **`get_template_part()`** — modular, reusable template snippets.
- **`locate_template()`** — allows plugins to include theme-aware templates.
- **Block themes** — use `theme.json` for global styles/settings, HTML template files, and template parts; no `functions.php` required for layout.
- **`add_theme_support()`** — declares features: post-thumbnails, title-tag, html5, custom-logo, woocommerce, editor-styles.
