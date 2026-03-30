# WordPress — Interview Questions

---

## Basic

**Q: What is the WordPress Loop and how does it work?**

**A:** The Loop is the PHP code WordPress uses to display posts. It calls `have_posts()` to check if posts exist and `the_post()` to advance the internal pointer and populate global variables (`$post`, `$wp_query`). Template tags like `the_title()` and `the_content()` then read from those globals. The loop ends when `have_posts()` returns false.

---

**Q: What is the difference between `get_posts()` and `WP_Query`?**

**A:** Both use the same underlying query logic, but `WP_Query` creates a full query object with pagination support, sticky post handling, and `have_posts()`/`the_post()` methods. `get_posts()` is a convenience wrapper that returns a plain array of `WP_Post` objects, suppresses filters by default (`suppress_filters => true`), and does not modify global state. Use `WP_Query` when you need pagination or full loop functionality; use `get_posts()` for simple array results.

---

**Q: What is the difference between an action and a filter in WordPress?**

**A:** An action (`add_action` / `do_action`) executes code at a specific point in the execution flow and does not return a value — it is used for side effects. A filter (`add_filter` / `apply_filters`) passes data through a chain of callbacks, each of which must return the (possibly modified) value. Filters are used to transform data before it is used or displayed.

---

**Q: How do you properly enqueue scripts and styles in WordPress?**

**A:** Hook into `wp_enqueue_scripts` for the front end or `admin_enqueue_scripts` for the admin, then call `wp_enqueue_script()` and `wp_enqueue_style()`. Always specify a handle, URL, dependencies array, version string, and (for scripts) whether to load in the footer. Use `wp_register_*` to register without immediately loading, and `wp_enqueue_*` to mark for output. Never use `<script>` or `<link>` tags directly in templates.

---

**Q: What is a nonce in WordPress and why is it important?**

**A:** A nonce (number used once) is a short-lived token that verifies a request originated from the expected WordPress page/action. Generated with `wp_create_nonce( 'action-name' )` and verified with `wp_verify_nonce()` or `check_admin_referer()`. Nonces prevent CSRF attacks — an attacker cannot forge a valid nonce from a different origin. They expire after approximately 12–24 hours and are user-specific.

---

**Q: What is `wp_kses_post()` and when should you use it?**

**A:** `wp_kses_post()` (Keep Styles and Safe Markup) strips any HTML tags and attributes that are not in the allowed list for post content. It is used to sanitize HTML input — for example, when saving custom field data that may contain HTML. It preserves safe tags like `<p>`, `<a>`, `<strong>` but removes `<script>`, `<iframe>`, and dangerous attributes.

---

**Q: How does WordPress resolve which template file to use?**

**A:** WordPress uses a template hierarchy: it evaluates a prioritized list of filenames based on the current query (e.g., `single-post-slug.php` → `single-post.php` → `single.php` → `singular.php` → `index.php`). The `template_include` filter can override this at runtime. Child themes are checked first; if no file is found, the parent theme is checked.

---

**Q: What is the purpose of `functions.php` in a theme?**

**A:** `functions.php` acts as a plugin for the active theme. It is loaded on every page load and is used to register theme supports, enqueue assets, define template tags, register menus and sidebars, and add hooks. Because it is tied to the active theme, functionality that should persist across theme changes (like CPTs or critical shortcodes) should live in a plugin, not `functions.php`.

---

## Mid

**Q: How do you prevent a plugin's filter from running when you don't have access to the original `add_filter()` call?**

**A:** Use `remove_filter( $hook, $callback, $priority )`. The challenge is that if the callback was added by an object method, you need the same instance. For anonymous functions or closures, you cannot remove them directly — you must use the `$wp_filter` global to inspect and remove entries by iterating `$wp_filter[ $hook ][ $priority ]`. Some developers wrap closures in named functions or use a dedicated class property to hold the callback reference.

---

**Q: Explain `meta_query` and its performance implications.**

**A:** `meta_query` performs a JOIN on `wp_postmeta` for each meta clause, filtering posts by custom field values. It is flexible but expensive: `wp_postmeta.meta_key` and `wp_postmeta.meta_value` are not indexed by default on the value column. For performance, keep values short (they are stored as `longtext`), add a MySQL index if querying frequently, consider storing structured data in a custom table, or use a plugin like SearchWP/ElasticPress for complex filtering.

---

**Q: What is the difference between `wp_safe_redirect()` and `wp_redirect()`?**

**A:** Both send a Location header, but `wp_safe_redirect()` validates that the destination URL is on the same host or in the allowed hosts list (filtered by `allowed_redirect_hosts`). It prevents open redirect vulnerabilities where user-supplied URLs could redirect to malicious sites. Always use `wp_safe_redirect()` when the URL comes from user input.

---

**Q: How do you make a custom post type compatible with the REST API / Gutenberg?**

**A:** Set `show_in_rest => true` in the `register_post_type()` arguments. Optionally specify `rest_base` and `rest_controller_class`. For custom meta fields to appear in the REST API, register them with `register_post_meta()` and set `show_in_rest => true`. Without this, Gutenberg cannot load or save the post using its default block-editor interface.

---

**Q: Describe the WordPress cron system and its limitations.**

**A:** WP-Cron is a pseudo-cron triggered by page loads. When a page is requested, WordPress checks if any scheduled events are due and runs them in a non-blocking HTTP request to `wp-cron.php`. Limitations: it only runs when traffic exists (unreliable on low-traffic sites), events pile up if a site has no traffic for a period, and it adds overhead to every page request. Best practice: define `DISABLE_WP_CRON = true` in `wp-config.php` and run `wp-cron.php` via a real server cron job every 1–5 minutes.

---

**Q: How does WordPress handle database queries with `$wpdb`?**

**A:** `$wpdb` is the global database abstraction class (extending `wpdb`). It provides methods like `get_results()`, `get_row()`, `get_var()`, `insert()`, `update()`, `delete()`, and `query()`. Always use `$wpdb->prepare()` to parameterize queries against SQL injection. It connects to the database specified in `wp-config.php` and can target any table via `$wpdb->prefix` + table name. For multisite, `switch_to_blog()` changes `$wpdb`'s table prefix.

---

**Q: What are autoloaded options and why do they matter for performance?**

**A:** When WordPress loads, it runs a single query to fetch all options where `autoload = 'yes'` into memory. If plugins store large serialized arrays in autoloaded options, every page load carries that payload even if the data is not needed. This can easily balloon to several megabytes. Best practice: mark large or infrequently needed options as non-autoloaded (`update_option( $key, $value, false )`), and audit `wp_options` with `SELECT option_name, LENGTH(option_value) FROM wp_options WHERE autoload='yes' ORDER BY 2 DESC`.

---

**Q: Explain the difference between `add_image_size()` and editing an image in the Media Library.**

**A:** `add_image_size( $name, $width, $height, $crop )` registers a named size that WordPress generates automatically when an image is uploaded. These sub-sizes are stored as additional files (e.g., `image-300x200.jpg`) and referenced via `wp_get_attachment_image_src()`. Existing images are not retroactively resized — you must run the "Regenerate Thumbnails" tool or WP-CLI (`wp media regenerate`). Editing an image in the Media Library modifies the original file and regenerates registered sizes from the edited copy.

---

## Advanced

**Q: How would you architect a high-traffic WordPress site to handle 100k concurrent users?**

**A:** A robust architecture involves multiple layers: (1) **Edge/CDN** — CloudFront or Cloudflare caches static assets and full-page HTML at edge nodes globally. (2) **Full-page cache** — Varnish or Nginx FastCGI cache serves cached HTML to anonymous users, bypassing PHP entirely. (3) **Load balancer** — distributes traffic across multiple PHP-FPM/Nginx application servers. (4) **Shared stateless application tier** — all uploads on shared NFS/S3; `wp-config.php` symlinked; sessions stored in Redis. (5) **Object cache** — Redis with WP Redis drop-in caches queries, transients, and object data across all app servers. (6) **Database** — Primary–replica MySQL setup; reads routed to replicas via HyperDB or ProxySQL; RDS Multi-AZ for failover. (7) **Autoscaling** — cloud-native ASG (AWS) or MIG (GCP) scales the app tier based on CPU/request metrics.

---

**Q: What is the `pre_get_posts` action and when is it preferable to WP_Query?**

**A:** `pre_get_posts` fires before the main query executes and provides a reference to the `WP_Query` object. Modifying the query object here alters the main loop without running a second query, which is more efficient. It is the correct place to modify archive, search, or feed queries (e.g., change `posts_per_page`, add `tax_query`, exclude categories). Avoid modifying the admin query unintentionally — always check `! $query->is_admin()` and `$query->is_main_query()`. Use a separate `WP_Query` when you need an additional, secondary loop that should not affect pagination.

---

**Q: How do WordPress multisite tables differ from single-site, and how do you query across sites?**

**A:** In multisite, each site gets its own set of tables prefixed with `wp_{blog_id}_` (e.g., `wp_2_posts`). Global tables (`wp_users`, `wp_usermeta`, `wp_blogs`, `wp_site`, `wp_sitemeta`) are shared. To query data from a specific site, call `switch_to_blog( $blog_id )` which updates `$wpdb->prefix` to the correct site prefix. For cross-site queries without switching context (more efficient), directly reference the prefixed table names: `$wpdb->get_results( "SELECT * FROM {$wpdb->base_prefix}2_posts WHERE..." )`. Always restore context with `restore_current_blog()`.

---

**Q: Explain how you would build a plugin that is extensible by other developers (a plugin API).**

**A:** Design the plugin with deliberate hook points: add `do_action` and `apply_filters` calls at every meaningful data transformation or execution point. Expose a public API class with documented methods. Use `apply_filters( 'myplugin/config', $defaults )` so developers can change settings. Expose `do_action( 'myplugin/after_save', $post_id, $data )` so third parties can react to events. Document all hooks in a changelog. Use semantic versioning and mark hooks as deprecated with `_deprecated_hook()` before removing them. Provide a developer-mode constant that logs all hook calls.

---

**Q: What are the security implications of `unserialize()` in WordPress and how do you mitigate them?**

**A:** PHP's `unserialize()` can trigger object instantiation and magic methods (`__wakeup`, `__destruct`) on attacker-controlled classes already in memory (PHP Object Injection / POP chain exploitation). WordPress serializes option values and post meta. Mitigations: (1) Never `unserialize()` untrusted user input — validate source first. (2) Use `maybe_unserialize()` only on data that was serialized by `maybe_serialize()` in the same application. (3) Prefer JSON (`wp_json_encode` / `json_decode`) for structured data that users might influence. (4) Pass an `allowed_classes` array (PHP 7+) to `unserialize()` to restrict instantiatable classes. (5) Keep PHP and all plugins updated to minimize the POP chain attack surface.

---

**Q: How do you implement a custom Gutenberg block with dynamic server-side rendering?**

**A:** Register the block in PHP using `register_block_type()` with a `render_callback` function. The callback receives `$attributes` and `$content` and returns the HTML string. In JavaScript, register the block with `registerBlockType()`, providing `edit` (interactive editor UI) and `save` returning `null` (telling Gutenberg to use the PHP render). Store data in block attributes (`attributes` schema in `block.json`). This approach means the rendered HTML is always generated fresh from PHP on page load, making it ideal for dynamic content (e.g., latest posts, user-specific data). The block's `save()` returning `null` means no static HTML is stored in `post_content`.

---

**Q: Describe the WordPress object cache and how you would implement cache invalidation for a complex plugin.**

**A:** The object cache stores key-value pairs in memory during a request (`wp_cache_set/get`). With a persistent cache drop-in (Redis/Memcached), data persists across requests. Cache invalidation strategies: (1) **TTL-based** — set an expiration time; stale data serves until expiry. (2) **Event-based** — hook into `save_post`, `delete_post`, `edited_term`, etc., and delete or update specific cache keys. (3) **Cache groups** — store related keys under a group; use `wp_cache_incr()` on a group "version" key and include the version in all group-member cache keys. Incrementing the version key instantly invalidates the entire logical group without iterating keys. (4) **Cache versioning at the site level** — store a site-wide version in options; include it in all cache keys; bump the version on significant data changes.
