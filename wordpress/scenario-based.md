# WordPress — Scenario-Based Problems

---

## Scenario 1: High Memory Usage Crashing the Site

**Scenario:**
A WordPress e-commerce site running WooCommerce starts throwing "Allowed memory size exhausted" fatal errors under moderate traffic. The server has 2 GB of RAM. Memory usage per PHP-FPM worker climbs to 300–400 MB.

**Challenge:**
Identify the root cause and reduce per-request memory consumption without compromising functionality.

**Solution:**

1. **Profile with Query Monitor or Xdebug** — install Query Monitor to inspect per-request database queries and hook timing. Use Xdebug's memory profiler (`xdebug.profiler_enable`) or Blackfire.io to generate a callgraph.

2. **Audit autoloaded options** — run:
   ```sql
   SELECT option_name, LENGTH(option_value) AS size
   FROM wp_options WHERE autoload = 'yes'
   ORDER BY size DESC LIMIT 20;
   ```
   Mark large, infrequently needed options as non-autoloaded:
   ```php
   update_option( 'large_option_key', $value, false );
   ```

3. **Find N+1 queries** — Query Monitor will show repeated queries in the loop. Fix by pre-fetching with `update_post_meta_cache` or `update_post_thumbnail_cache` via `WP_Query` arguments, or by using a single `get_post_meta()` call per post rather than per field.

4. **Limit WooCommerce product loading** — avoid calling `wc_get_product()` in loops without caching; WooCommerce's product object is heavy. Use `wc_get_products()` with `return => 'ids'` and lazy-load objects only when needed.

5. **Increase OPcache** — ensure OPcache is configured (`opcache.memory_consumption=256`, `opcache.max_accelerated_files=10000`). Without OPcache, PHP re-parses every file on every request.

6. **PHP-FPM tuning** — reduce `pm.max_children` to prevent RAM exhaustion; use `pm = dynamic` with conservative limits. Pair with Nginx FastCGI caching so cached pages do not spawn PHP workers at all.

7. **Result** — after moving 4 large plugin option keys off autoload and fixing 3 N+1 query loops, per-request memory dropped from ~350 MB to ~80 MB.

---

## Scenario 2: Slow Admin Dashboard for an Editorial Team

**Scenario:**
A news site with 500,000 posts has an editorial team of 50 users. The WP admin post list (`/wp-admin/edit.php?post_type=article`) takes 30+ seconds to load. The site uses 10+ custom meta fields and 5 custom taxonomies per article.

**Challenge:**
Make the post list load in under 2 seconds for editors.

**Solution:**

1. **Disable unnecessary columns** — hook `manage_posts_columns` to remove heavy meta-based columns. Each custom column that calls `get_post_meta()` inside the `manage_posts_custom_column` action fires one query per visible post.

2. **Pre-fetch meta** — WordPress does not pre-fetch meta for admin list views. Add an `admin_init` hook that calls `update_post_meta_cache( $post_ids )` after the main query fires, using `the_posts` filter to grab IDs first.

3. **Add database indexes** — for frequently filtered or sorted meta keys:
   ```sql
   ALTER TABLE wp_postmeta ADD INDEX meta_key_value (meta_key(32), meta_value(32));
   ```

4. **Remove slow meta_query from admin filters** — if a plugin adds `meta_query` to the admin list query, it forces full table scans. Use `posts_join` and `posts_where` filters for custom indexed JOINs instead.

5. **Restrict default count query** — WordPress runs a `SELECT COUNT(*)` for each post status. Filter `wp_count_posts` to return cached counts:
   ```php
   add_filter( 'wp_count_posts', function( $counts, $type ) {
       $cached = get_transient( 'post_count_' . $type );
       return $cached ?: $counts;
   }, 10, 2 );
   ```

6. **Paginate aggressively** — set `WP_POSTS_PER_PAGE` via screen options to 20, not 100.

7. **Result** — admin list load time dropped from 32s to 1.4s after adding indexes, pre-fetching meta, and removing column-level queries.

---

## Scenario 3: Plugin Update Breaks the Site in Production

**Scenario:**
An automatic update to a core WooCommerce extension breaks checkout on a live production site during business hours. The `fatal error` is logged but the site is still showing a white screen on the checkout page.

**Challenge:**
Restore service immediately, diagnose the root cause, and implement safeguards to prevent recurrence.

**Solution:**

**Immediate recovery:**
1. Connect via SSH or SFTP.
2. Rename the broken plugin directory to disable it instantly:
   ```bash
   mv wp-content/plugins/wc-extension wp-content/plugins/wc-extension-DISABLED
   ```
3. Verify checkout works; communicate to team.

**Root cause analysis:**
1. Check PHP error log (`/var/log/php-fpm/error.log` or `WP_DEBUG_LOG`).
2. Identify the breaking change — typically a renamed class, changed method signature, or removed hook.
3. Check the plugin's changelog on WordPress.org or GitHub for breaking changes in the new version.

**Longer-term safeguards:**
1. **Staging environment** — use WP Migrate DB Pro or a snapshot to keep staging in sync; test all plugin updates on staging first.
2. **Disable auto-updates** — in `wp-config.php`:
   ```php
   add_filter( 'auto_update_plugin', '__return_false' );
   ```
   Or use a managed update workflow with WP-CLI:
   ```bash
   wp plugin update --all --dry-run
   ```
3. **Visual regression testing** — integrate Percy or BackstopJS into a CI pipeline to screenshot key pages before/after updates.
4. **Database backups** — UpdraftPlus or WP-CLI (`wp db export`) scheduled before any update window.
5. **Rollback plan** — keep the previous plugin version in a private S3 bucket; document the rollback procedure.
6. **Canary deployments** — for high-traffic sites, route 5% of traffic to a new version; monitor error rates before full rollout.

---

## Scenario 4: REST API Endpoint Causing Unauthenticated Data Exposure

**Scenario:**
A security audit reveals that a custom REST API endpoint (`/wp-json/myapp/v1/orders`) is returning sensitive order data without authentication checks. The endpoint was built by a previous developer and has been live for six months.

**Challenge:**
Secure the endpoint immediately and audit all custom REST routes for similar issues.

**Solution:**

**Immediate fix:**
```php
register_rest_route( 'myapp/v1', '/orders', [
    'methods'             => WP_REST_Server::READABLE,
    'callback'            => 'myapp_get_orders',
    'permission_callback' => function( WP_REST_Request $request ) {
        // Require login and the correct capability
        return is_user_logged_in() && current_user_can( 'manage_woocommerce' );
    },
] );
```

**Audit all custom routes:**
```php
// List all registered REST routes
$routes = rest_get_server()->get_routes();
foreach ( $routes as $route => $handlers ) {
    foreach ( $handlers as $handler ) {
        if ( isset( $handler['permission_callback'] ) && $handler['permission_callback'] === '__return_true' ) {
            error_log( 'Open route: ' . $route );
        }
    }
}
```

**Additional hardening:**
1. Add rate limiting via Nginx `limit_req_zone` on the `/wp-json/` path.
2. Log all REST API access to a SIEM (Splunk, CloudWatch Logs).
3. Implement API key authentication for machine-to-machine requests using Application Passwords (WordPress 5.6+) or a JWT plugin.
4. Add an `X-Content-Type-Options: nosniff` header to REST API responses.
5. Conduct a full code review of all custom routes and document their expected authentication requirements.
