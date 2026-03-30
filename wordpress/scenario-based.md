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

---

## Scenario 5: Migrating a Large WordPress Site to a New Domain/Server with Zero Downtime

**Scenario:**
A high-traffic WordPress e-commerce site (WooCommerce, 300 GB database, 50 GB media) must be migrated from a legacy shared host to a new dedicated server with a different domain. The business cannot tolerate more than 30 seconds of downtime during the cutover.

**Challenge:**
Transfer all data, rewrite URLs, and flip DNS with minimal customer impact — while keeping orders flowing throughout.

**Solution:**

1. **Provision the new server in parallel** — set up Nginx, PHP-FPM, MySQL, and Redis on the new host before touching the live site. Configure an identical PHP version and extensions.

2. **Rsync files incrementally** — run multiple passes before cutover so the final sync is a diff-only transfer:
   ```bash
   # Pass 1: full sync (run days before)
   rsync -avz --progress -e "ssh -p 22" \
     /var/www/html/ newserver:/var/www/html/

   # Pass 2 (hours before): sync only changed files
   rsync -avz --checksum -e "ssh -p 22" \
     /var/www/html/ newserver:/var/www/html/
   ```

3. **Export and import the database** — use WP-CLI to avoid character set issues:
   ```bash
   # On old server
   wp db export --add-drop-table production.sql

   # On new server
   wp db import production.sql
   ```

4. **Search-replace URLs** with WP-CLI (handles serialized data safely):
   ```bash
   wp search-replace 'https://old-domain.com' 'https://new-domain.com' \
     --all-tables --report-changed-only
   ```

5. **Enable maintenance mode on old server** — prevents new orders writing to the old database during the final cutover window:
   ```bash
   # On old server — triggers WP maintenance mode
   touch /var/www/html/.maintenance
   ```

6. **Final incremental sync** — with maintenance mode active, rsync one more time and re-import any new DB rows written since Pass 2:
   ```bash
   wp db export --tables=wp_posts,wp_postmeta,wp_woocommerce_order_items \
     cutover-delta.sql
   # Import on new server, then run search-replace again
   ```

7. **Test via `/etc/hosts` override** — before flipping DNS, add the new server IP to your local hosts file and verify checkout, login, and media loading all work.

8. **Flip DNS TTL ahead of time** — 24–48 hours before cutover, lower the A-record TTL to 60 seconds so propagation is near-instant when you make the switch.

9. **Remove maintenance mode** after DNS has propagated and the new server is confirmed live. Monitor error logs and WooCommerce orders for 30 minutes post-cutover.

---

## Scenario 6: Building a Custom Gutenberg Block with Dynamic Server-Side Rendering

**Scenario:**
A client needs a "Latest Events" block that displays upcoming events from a custom post type. The events must always reflect live database data, so the block cannot use a static `save()` output — it needs PHP server-side rendering.

**Challenge:**
Build a Gutenberg block where attributes are controlled in the editor but the front-end output is rendered by PHP at request time.

**Solution:**

1. **Register the block in PHP** with a `render_callback`:
   ```php
   // In your plugin's init callback:
   register_block_type( 'myplugin/latest-events', [
       'attributes'      => [
           'count'    => [ 'type' => 'integer', 'default' => 3 ],
           'category' => [ 'type' => 'string',  'default' => '' ],
       ],
       'render_callback' => 'myplugin_render_latest_events',
       'editor_script'   => 'myplugin-latest-events-editor',
   ] );
   ```

2. **Write the PHP render callback**:
   ```php
   function myplugin_render_latest_events( array $attrs ): string {
       $query = new WP_Query( [
           'post_type'      => 'event',
           'posts_per_page' => absint( $attrs['count'] ),
           'post_status'    => 'publish',
           'meta_key'       => '_event_date',
           'orderby'        => 'meta_value',
           'order'          => 'ASC',
           'meta_query'     => [ [
               'key'     => '_event_date',
               'value'   => date( 'Y-m-d' ),
               'compare' => '>=',
               'type'    => 'DATE',
           ] ],
           'tax_query' => $attrs['category'] ? [ [
               'taxonomy' => 'event_category',
               'field'    => 'slug',
               'terms'    => sanitize_key( $attrs['category'] ),
           ] ] : [],
       ] );

       if ( ! $query->have_posts() ) {
           return '<p class="no-events">' . esc_html__( 'No upcoming events.', 'myplugin' ) . '</p>';
       }

       ob_start();
       while ( $query->have_posts() ) {
           $query->the_post();
           $date = get_post_meta( get_the_ID(), '_event_date', true );
           printf(
               '<article class="event-item"><h3>%s</h3><time datetime="%s">%s</time></article>',
               esc_html( get_the_title() ),
               esc_attr( $date ),
               esc_html( date( 'F j, Y', strtotime( $date ) ) )
           );
       }
       wp_reset_postdata();

       return '<div class="latest-events">' . ob_get_clean() . '</div>';
   }
   ```

3. **Register the editor script** (JS side — edit view only, `save` returns `null`):
   ```javascript
   import { registerBlockType } from '@wordpress/blocks';
   import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
   import { PanelBody, RangeControl, TextControl } from '@wordpress/components';
   import { useSelect } from '@wordpress/data';
   import ServerSideRender from '@wordpress/server-side-render';

   registerBlockType( 'myplugin/latest-events', {
       edit( { attributes, setAttributes } ) {
           const blockProps = useBlockProps();
           return (
               <>
                   <InspectorControls>
                       <PanelBody title="Settings">
                           <RangeControl
                               label="Number of events"
                               value={ attributes.count }
                               onChange={ ( count ) => setAttributes( { count } ) }
                               min={ 1 } max={ 12 }
                           />
                           <TextControl
                               label="Category slug"
                               value={ attributes.category }
                               onChange={ ( category ) => setAttributes( { category } ) }
                           />
                       </PanelBody>
                   </InspectorControls>
                   <div { ...blockProps }>
                       <ServerSideRender
                           block="myplugin/latest-events"
                           attributes={ attributes }
                       />
                   </div>
               </>
           );
       },
       save: () => null, // dynamic block — PHP renders the front end
   } );
   ```

4. **Avoid caching pitfalls** — wrap the `WP_Query` inside a transient keyed on the block attributes if the event list is expensive; invalidate on `save_post` for the `event` post type.

---

## Scenario 7: Implementing a Custom User Role with Granular Capability Management

**Scenario:**
A membership site needs an "Event Manager" role that can create and edit events (a custom post type) and moderate comments, but cannot access user management, plugin settings, or publish posts without review.

**Challenge:**
Define the role with exactly the right capabilities, ensure it survives plugin deactivation/reactivation cycles, and allow fine-grained overrides per user.

**Solution:**

1. **Register the role on plugin activation** — never on every request:
   ```php
   register_activation_hook( __FILE__, 'myplugin_add_roles' );

   function myplugin_add_roles(): void {
       add_role( 'event_manager', 'Event Manager', [
           // Core WP caps
           'read'                   => true,
           'moderate_comments'      => true,
           'edit_posts'             => false, // overridden by CPT caps below
           'delete_posts'           => false,
           'publish_posts'          => false,
           // Custom CPT mapped caps (requires capability_type in register_post_type)
           'edit_events'            => true,
           'edit_others_events'     => false,
           'publish_events'         => false, // must go to review
           'read_private_events'    => false,
           'delete_events'          => true,
           'delete_others_events'   => false,
       ] );
   }
   ```

2. **Map capabilities in `register_post_type()`**:
   ```php
   register_post_type( 'event', [
       'capability_type' => 'event',
       'map_meta_cap'    => true,  // lets WP handle edit/delete/read per-post checks
       'capabilities'    => [
           'edit_post'          => 'edit_event',
           'read_post'          => 'read_event',
           'delete_post'        => 'delete_event',
           'edit_posts'         => 'edit_events',
           'edit_others_posts'  => 'edit_others_events',
           'publish_posts'      => 'publish_events',
           'read_private_posts' => 'read_private_events',
       ],
       // … other args
   ] );
   ```

3. **Remove the role cleanly on uninstall** (not deactivation):
   ```php
   // uninstall.php
   remove_role( 'event_manager' );
   ```

4. **Grant or revoke caps per-user** without changing the role:
   ```php
   $user = get_user_by( 'id', $user_id );
   $user->add_cap( 'publish_events' );    // promote a trusted manager
   $user->remove_cap( 'delete_events' );  // restrict a specific user
   ```

5. **Audit capabilities in code** — use a filter to log capability checks during development:
   ```php
   add_filter( 'user_has_cap', function( $caps, $cap, $args ) {
       if ( str_starts_with( $cap[0] ?? '', 'event' ) ) {
           error_log( sprintf( 'Cap check: %s for user %d', $cap[0], $args[1] ) );
       }
       return $caps;
   }, 10, 3 );
   ```

6. **Protect admin menus** — always pair capability checks with `current_user_can()` on menu registration, REST endpoints, and any admin-ajax handlers that mutate data.

---

## Scenario 8: Debugging Intermittent 504 Gateway Timeout Errors Under High Traffic

**Scenario:**
A WooCommerce site serving ~5,000 concurrent users starts showing 504 errors on checkout during peak hours. The errors are intermittent — they disappear after a few minutes and are not reproducible locally. The stack is Nginx → PHP-FPM → MySQL.

**Challenge:**
Identify whether the bottleneck is PHP-FPM worker exhaustion, MySQL query latency, or an external API call — and resolve it without a full rewrite.

**Solution:**

1. **Check Nginx and PHP-FPM logs first**:
   ```bash
   # Nginx upstream timeout errors
   grep '504\|upstream timed out' /var/log/nginx/error.log | tail -50

   # PHP-FPM pool status — is the pool saturating?
   curl http://127.0.0.1/fpm-status?full 2>/dev/null | grep -E 'active|idle|queue'
   ```

2. **Enable PHP-FPM slow log** to catch long-running processes:
   ```ini
   ; /etc/php/8.2/fpm/pool.d/www.conf
   slowlog = /var/log/php-fpm/slow.log
   request_slowlog_timeout = 5s
   ```
   Then inspect the slow log for repeated stack traces pointing at specific functions.

3. **Profile MySQL slow queries**:
   ```sql
   -- Enable slow query log
   SET GLOBAL slow_query_log = 'ON';
   SET GLOBAL long_query_time = 2;
   SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';

   -- Find the worst offenders
   SELECT query_time, sql_text
   FROM mysql.slow_log
   ORDER BY query_time DESC
   LIMIT 20;
   ```

4. **Check for external API bottleneck** — a common cause in WooCommerce is a payment gateway or shipping rate API timing out. Add a short timeout and cache the result:
   ```php
   $response = wp_remote_get( 'https://api.shipping-provider.com/rates', [
       'timeout' => 3, // fail fast rather than holding a PHP worker for 30s
       'headers' => [ 'Authorization' => 'Bearer ' . SHIPPING_API_KEY ],
   ] );

   if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
       // Fall back to cached rates
       return get_transient( 'shipping_rates_fallback' ) ?: [];
   }

   $rates = json_decode( wp_remote_retrieve_body( $response ), true );
   set_transient( 'shipping_rates_fallback', $rates, 5 * MINUTE_IN_SECONDS );
   return $rates;
   ```

5. **Tune PHP-FPM pool size** based on available RAM:
   ```ini
   ; Calculation: max_children = (Total RAM - OS overhead) / avg worker RAM
   ; e.g. (8192 MB - 1024 MB) / 80 MB per worker ≈ 90
   pm = dynamic
   pm.max_children      = 90
   pm.start_servers     = 20
   pm.min_spare_servers = 10
   pm.max_spare_servers = 30
   pm.max_requests      = 500   ; recycle workers to prevent memory leaks
   ```

6. **Add Nginx FastCGI caching** for non-checkout pages — keeps PHP workers free for actual dynamic requests:
   ```nginx
   fastcgi_cache_path /var/cache/nginx levels=1:2 keys_zone=WP:100m inactive=60m;
   fastcgi_cache_key "$scheme$request_method$host$request_uri";

   # Skip cache for logged-in users and cart/checkout
   fastcgi_cache_bypass $cookie_woocommerce_items_in_cart $cookie_wordpress_logged_in;
   fastcgi_no_cache     $cookie_woocommerce_items_in_cart $cookie_wordpress_logged_in;
   ```

7. **Set up real-time monitoring** — deploy New Relic or Datadog APM with PHP agent to get per-transaction traces. Correlate 504 spikes with transaction throughput graphs to pinpoint the exact bottleneck layer during the next peak.
