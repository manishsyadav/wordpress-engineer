# PHP — Scenario-Based Problems

---

## Scenario 1: Refactoring Procedural Legacy Code to OOP

**Scenario:**
You inherit a WordPress plugin with 3,000 lines in a single `plugin.php` file. All logic is in global functions, state is stored in global variables, database queries are directly constructed with string interpolation, and there are zero tests.

**Challenge:**
Modernize the codebase incrementally without breaking the live site, and make it testable.

**Solution:**

**Phase 1 — Stabilize (no new features):**
1. Add error logging: enable `WP_DEBUG_LOG` and fix all PHP warnings and notices.
2. Fix all raw SQL to use `$wpdb->prepare()` — the most critical security step.
3. Add PHPUnit and WP test bootstrap without changing any logic yet.
4. Write characterization tests: record the current behavior (even if wrong) so you know when you've broken something.

**Phase 2 — Introduce structure:**
```php
// Before:
function myplugin_get_orders( $user_id ) {
    global $wpdb;
    $sql = "SELECT * FROM wp_orders WHERE user_id = $user_id"; // SQL injection
    return $wpdb->get_results( $sql );
}

// After — Repository pattern:
class OrderRepository {
    public function __construct( private \wpdb $db ) {}

    public function findByUserId( int $userId ): array {
        return $this->db->get_results(
            $this->db->prepare(
                "SELECT * FROM {$this->db->prefix}orders WHERE user_id = %d",
                $userId
            )
        );
    }
}
```

**Phase 3 — Dependency injection:**
```php
class MyPlugin {
    private static ?self $instance = null;
    private OrderRepository $orderRepo;

    private function __construct() {
        global $wpdb;
        $this->orderRepo = new OrderRepository( $wpdb );
        $this->registerHooks();
    }

    public static function getInstance(): self {
        return self::$instance ??= new self();
    }

    private function registerHooks(): void {
        add_action( 'init', [ $this, 'init' ] );
    }
}

add_action( 'plugins_loaded', [ MyPlugin::class, 'getInstance' ] );
```

**Phase 4 — Composer and PSR-4:**
- Add `composer.json` with PSR-4 autoloading.
- Move classes to `src/` directory.
- Replace all `require_once` with the Composer autoloader.
- Add PHPCS with WordPress coding standards and fix all violations.

**Result:** Codebase becomes testable, injectable, and safe. Each phase is a deployable unit with no breaking changes.

---

## Scenario 2: Memory Exhaustion on a Data Export

**Scenario:**
A plugin exports all WooCommerce orders (200,000 rows) to a CSV. On the server, it runs out of memory and crashes. The current code uses `wc_get_orders()` which returns all 200,000 WC_Order objects at once.

**Challenge:**
Rewrite the export to run within a 128 MB memory limit.

**Solution:**

```php
/**
 * Stream a CSV export of all orders without loading them all into memory.
 * Uses a generator for chunked iteration.
 */
function export_orders_csv(): void {
    // Stream headers — no buffering
    header( 'Content-Type: text/csv' );
    header( 'Content-Disposition: attachment; filename="orders-' . date('Y-m-d') . '.csv"' );

    $output = fopen( 'php://output', 'w' );
    fputcsv( $output, [ 'Order ID', 'Date', 'Status', 'Total', 'Email' ] );

    foreach ( order_generator( 200 ) as $order ) {
        fputcsv( $output, [
            $order->get_id(),
            $order->get_date_created()->date( 'Y-m-d H:i:s' ),
            $order->get_status(),
            $order->get_total(),
            $order->get_billing_email(),
        ] );
    }

    fclose( $output );
}

/**
 * Generator: yields WC_Order objects in chunks to keep memory constant.
 *
 * @param int $chunkSize Number of orders per database fetch.
 * @return Generator<WC_Order>
 */
function order_generator( int $chunkSize = 200 ): Generator {
    $page = 1;

    do {
        $orders = wc_get_orders( [
            'limit'  => $chunkSize,
            'page'   => $page,
            'status' => 'any',
            'return' => 'objects',
            'orderby' => 'ID',
            'order'   => 'ASC',
        ] );

        foreach ( $orders as $order ) {
            yield $order;
        }

        // Release chunk from memory
        unset( $orders );
        $page++;

    } while ( count( $orders ?? [] ) === $chunkSize );
}
```

**Key techniques:**
- `php://output` streams directly to the browser — no intermediate string buffer.
- Generator fetches one chunk at a time, releasing previous chunks.
- `unset( $orders )` forces garbage collection between chunks.
- For background exports (no browser), use WP-CLI + write to a temp file on S3.
- Add a progress transient so the admin UI can poll for completion status.

---

## Scenario 3: Concurrency Issue — Race Condition in Meta Updates

**Scenario:**
A voting plugin increments a `_vote_count` meta value on posts when users click "Like." Under load testing, the count is consistently lower than expected — concurrent requests read the same value, both increment by 1, and write the same result (two votes recorded as one).

**Challenge:**
Implement an atomic increment that is safe under concurrent load.

**Solution:**

**Option A — SQL atomic increment (preferred):**
```php
function atomic_increment_vote( int $post_id ): void {
    global $wpdb;

    // Atomically increment without a read-modify-write cycle
    $wpdb->query(
        $wpdb->prepare(
            "INSERT INTO {$wpdb->postmeta} (post_id, meta_key, meta_value)
             VALUES (%d, '_vote_count', 1)
             ON DUPLICATE KEY UPDATE meta_value = CAST(meta_value AS UNSIGNED) + 1",
            $post_id
        )
    );

    // Invalidate cache
    wp_cache_delete( $post_id, 'post_meta' );
}
```

**Option B — Redis INCR (for sites with Redis object cache):**
```php
function redis_increment_vote( int $post_id ): int {
    // Requires PhpRedis or Predis client
    $redis = wp_cache_get_last_changed( 'post_meta' ); // Or get Redis client directly
    $key   = "vote_count:post:{$post_id}";

    // INCR is atomic in Redis
    $new_count = $redis->incr( $key );

    // Periodically sync to MySQL (e.g., via cron)
    return $new_count;
}
```

**Option C — MySQL advisory lock:**
```php
function locked_increment_vote( int $post_id ): void {
    global $wpdb;
    $lock_name = "vote_lock_{$post_id}";

    $wpdb->query( $wpdb->prepare( "SELECT GET_LOCK( %s, 5 )", $lock_name ) );

    $current = (int) get_post_meta( $post_id, '_vote_count', true );
    update_post_meta( $post_id, '_vote_count', $current + 1 );

    $wpdb->query( $wpdb->prepare( "SELECT RELEASE_LOCK( %s )", $lock_name ) );
}
```

**Recommendation:** Option A (SQL `ON DUPLICATE KEY UPDATE`) is the simplest, most portable, and most reliable solution. No external dependencies, no timeouts, and no distributed lock management needed.

---

## Scenario 5: Refactoring a Procedural Plugin into a PSR-4 OOP Architecture

**Scenario:**
You inherit a 2,000-line `plugin.php` full of namespaced global functions, string-interpolated SQL, and `require_once` chains scattered across the file. The plugin powers a custom affiliate tracking system for a high-traffic WooCommerce store.

**Challenge:**
Migrate to PSR-4 autoloading and a clean OOP structure without breaking the live site, and set up Composer for dependency management.

**Solution:**

1. **Add Composer and configure PSR-4 autoloading** without deleting any existing code:
   ```json
   {
     "name": "mycompany/affiliate-tracker",
     "autoload": {
       "psr-4": { "MyCompany\\Affiliate\\": "src/" }
     },
     "require": {
       "php": "^8.1"
     }
   }
   ```
   ```bash
   composer install
   ```

2. **Bootstrap Composer in the plugin entry point** and keep all legacy functions intact during transition:
   ```php
   <?php
   // affiliate-tracker.php (plugin header stays here)
   require_once __DIR__ . '/vendor/autoload.php';

   // Legacy shim — old function calls delegate to the new class
   function affiliate_track_click( int $affiliate_id ): void {
       MyCompany\Affiliate\Tracking\ClickTracker::getInstance()->track( $affiliate_id );
   }

   add_action( 'plugins_loaded', [ MyCompany\Affiliate\Plugin::class, 'boot' ] );
   ```

3. **Introduce a service container / DI pattern** for the main plugin class:
   ```php
   namespace MyCompany\Affiliate;

   final class Plugin {
       private static ?self $instance = null;

       private function __construct(
           private readonly Tracking\ClickTracker  $clickTracker,
           private readonly Reporting\ReportService $reportService,
       ) {}

       public static function boot(): void {
           global $wpdb;
           self::$instance = new self(
               new Tracking\ClickTracker( new Repository\ClickRepository( $wpdb ) ),
               new Reporting\ReportService( new Repository\ConversionRepository( $wpdb ) ),
           );
           self::$instance->registerHooks();
       }

       private function registerHooks(): void {
           add_action( 'template_redirect', [ $this->clickTracker, 'handleRequest' ] );
           add_action( 'woocommerce_order_status_completed', [ $this->reportService, 'recordConversion' ] );
       }
   }
   ```

4. **Migrate SQL to prepared statements in a repository layer**:
   ```php
   namespace MyCompany\Affiliate\Repository;

   final class ClickRepository {
       public function __construct( private readonly \wpdb $db ) {}

       public function insertClick( int $affiliateId, string $ip, string $url ): int {
           $this->db->insert(
               $this->db->prefix . 'affiliate_clicks',
               [
                   'affiliate_id' => $affiliateId,
                   'ip_address'   => $ip,
                   'landing_url'  => $url,
                   'clicked_at'   => current_time( 'mysql' ),
               ],
               [ '%d', '%s', '%s', '%s' ]
           );
           return (int) $this->db->insert_id;
       }

       public function getClickCountByAffiliate( int $affiliateId, string $since ): int {
           return (int) $this->db->get_var(
               $this->db->prepare(
                   "SELECT COUNT(*) FROM {$this->db->prefix}affiliate_clicks
                    WHERE affiliate_id = %d AND clicked_at >= %s",
                   $affiliateId,
                   $since
               )
           );
       }
   }
   ```

5. **Delete legacy functions one by one** once every call site is covered by the new OOP equivalent. Add PHPUnit tests before deleting each function to verify parity.

---

## Scenario 6: Implementing a Rate-Limited External API Integration with Retry Logic

**Scenario:**
A plugin fetches product data from a third-party REST API that enforces a 100 requests/minute rate limit and occasionally returns 429 or 503 responses. The current implementation crashes the site when the API is slow or returns errors.

**Challenge:**
Build a resilient API client with exponential backoff retry logic, rate limiting, and a transient-backed cache layer.

**Solution:**

1. **Create a robust API client class**:
   ```php
   namespace MyCompany\Plugin\Api;

   use MyCompany\Plugin\Exception\ApiRateLimitException;
   use MyCompany\Plugin\Exception\ApiException;

   final class ProductApiClient {
       private const CACHE_GROUP   = 'product_api';
       private const MAX_RETRIES   = 3;
       private const BASE_DELAY_MS = 500; // milliseconds

       public function __construct(
           private readonly string $apiKey,
           private readonly string $baseUrl,
       ) {}

       public function getProduct( int $productId ): array {
           $cacheKey = "product_{$productId}";
           $cached   = wp_cache_get( $cacheKey, self::CACHE_GROUP );

           if ( $cached !== false ) {
               return $cached;
           }

           $data = $this->request( "GET", "/products/{$productId}" );
           wp_cache_set( $cacheKey, $data, self::CACHE_GROUP, 5 * MINUTE_IN_SECONDS );

           return $data;
       }

       private function request( string $method, string $path, int $attempt = 1 ): array {
           $response = wp_remote_request( $this->baseUrl . $path, [
               'method'  => $method,
               'timeout' => 8,
               'headers' => [
                   'Authorization' => 'Bearer ' . $this->apiKey,
                   'Accept'        => 'application/json',
               ],
           ] );

           if ( is_wp_error( $response ) ) {
               throw new ApiException( $response->get_error_message() );
           }

           $code = wp_remote_retrieve_response_code( $response );

           if ( $code === 429 || $code === 503 ) {
               if ( $attempt >= self::MAX_RETRIES ) {
                   throw new ApiRateLimitException( "Rate limited after {$attempt} attempts." );
               }
               // Exponential backoff: 500ms, 1000ms, 2000ms
               $delay = self::BASE_DELAY_MS * ( 2 ** ( $attempt - 1 ) );

               // Respect Retry-After header if present
               $retryAfter = (int) wp_remote_retrieve_header( $response, 'retry-after' );
               if ( $retryAfter > 0 ) {
                   $delay = $retryAfter * 1000;
               }

               usleep( $delay * 1000 ); // convert ms to microseconds
               return $this->request( $method, $path, $attempt + 1 );
           }

           if ( $code < 200 || $code >= 300 ) {
               throw new ApiException( "Unexpected status: {$code}" );
           }

           return json_decode( wp_remote_retrieve_body( $response ), true ) ?? [];
       }
   }
   ```

2. **Track rate limit consumption** using a transient counter to avoid hitting the limit at all:
   ```php
   function check_api_rate_limit( int $limit = 100, int $window = 60 ): bool {
       $key   = 'api_rate_limit_' . floor( time() / $window );
       $count = (int) get_transient( $key );

       if ( $count >= $limit ) {
           return false; // caller should queue or abort
       }

       set_transient( $key, $count + 1, $window );
       return true;
   }
   ```

3. **Queue overflow requests** using WP-Cron for background retry:
   ```php
   if ( ! check_api_rate_limit() ) {
       wp_schedule_single_event( time() + 65, 'myplugin_retry_product_sync', [ $product_id ] );
       return;
   }
   ```

---

## Scenario 7: Debugging a PHP 8.x Deprecation Causing White Screen After Upgrade

**Scenario:**
After upgrading a server from PHP 7.4 to PHP 8.2, a production WordPress site returns a white screen. `WP_DEBUG` was not enabled on the live server. Error logs are sparse. The site has 40+ active plugins.

**Challenge:**
Identify the breaking plugin or theme without enabling full debug output on production, then fix the root deprecation.

**Solution:**

1. **Read the raw PHP error log** — this is always step one:
   ```bash
   tail -100 /var/log/php8.2-fpm/error.log
   # or
   tail -100 /var/log/nginx/error.log
   ```
   Look for `Fatal error`, `Deprecated`, `TypeError`, or `Warning` lines with file paths.

2. **Enable debug logging safely** (write to file, not screen):
   ```php
   // wp-config.php — safe for production
   define( 'WP_DEBUG',         true );
   define( 'WP_DEBUG_LOG',     true );  // writes to wp-content/debug.log
   define( 'WP_DEBUG_DISPLAY', false ); // never show errors on screen
   define( 'SCRIPT_DEBUG',     false );
   ```
   Then: `tail -f wp-content/debug.log`

3. **Binary-search the culprit plugin** — disable half the plugins via WP-CLI:
   ```bash
   # List all active plugins
   wp plugin list --status=active --field=name

   # Deactivate suspected plugins in bulk
   wp plugin deactivate woocommerce-extension-a woocommerce-extension-b

   # Re-test, then narrow down
   ```

4. **Common PHP 8.x breaking changes to check**:

   | Change | PHP 7.4 | PHP 8.x |
   |--------|---------|---------|
   | `$var->method()` on null | Silent warning | `TypeError` / fatal |
   | Passing wrong type to typed param | Coerced | `TypeError` |
   | `preg_replace` with invalid regex | Warning + null | Fatal error |
   | `strlen(null)` | `0` | Deprecated (8.1), TypeError (9.0) |
   | `array_map(null, ...)` | No-op | Deprecated in 8.2 |

5. **Fix a common pattern — passing null to a string function**:
   ```php
   // PHP 7.4 — silently returned 0
   $len = strlen( get_post_meta( $id, 'field', true ) );

   // PHP 8.1+ — deprecated / fatal if meta is null
   // Fix: coerce to string explicitly
   $len = strlen( (string) get_post_meta( $id, 'field', true ) );
   ```

6. **Run PHPCompatibility PHPCS sniffs** to catch all deprecations before deploying:
   ```bash
   composer require --dev phpcompatibility/phpcompatibility-wp
   ./vendor/bin/phpcs --standard=PHPCompatibilityWP \
     --runtime-set testVersion 8.2 \
     wp-content/plugins/my-plugin/
   ```

---

## Scenario 8: Building a Type-Safe Data Transfer Object (DTO) Layer for Plugin Data

**Scenario:**
A plugin passes raw associative arrays between its service classes, REST API handlers, and templates. Arrays have no enforced shape, so a missing key causes `Undefined index` errors that are hard to trace. You need a DTO layer that is type-safe, immutable, and easy to construct from WP_Post or REST API payloads.

**Challenge:**
Design a DTO pattern using PHP 8.1+ features (`readonly`, named arguments, enums) that eliminates array-of-unknown-shape bugs and integrates cleanly with WordPress data sources.

**Solution:**

1. **Define the DTO using `readonly` properties** (PHP 8.1+):
   ```php
   namespace MyCompany\Plugin\DTO;

   final readonly class EventDTO {
       public function __construct(
           public int        $id,
           public string     $title,
           public string     $slug,
           public \DateTimeImmutable $startDate,
           public EventStatus $status,
           public ?string    $venue,
           public int        $maxAttendees,
       ) {}
   }
   ```

2. **Define a backed enum for status** — eliminates magic string bugs:
   ```php
   namespace MyCompany\Plugin\DTO;

   enum EventStatus: string {
       case Draft     = 'draft';
       case Published = 'publish';
       case Cancelled = 'cancelled';

       public function label(): string {
           return match( $this ) {
               self::Draft     => 'Draft',
               self::Published => 'Published',
               self::Cancelled => 'Cancelled',
           };
       }
   }
   ```

3. **Create a factory to hydrate DTOs from WP_Post**:
   ```php
   namespace MyCompany\Plugin\Factory;

   use MyCompany\Plugin\DTO\{EventDTO, EventStatus};

   final class EventDTOFactory {
       public static function fromPost( \WP_Post $post ): EventDTO {
           $rawDate = get_post_meta( $post->ID, '_event_start_date', true );

           return new EventDTO(
               id:           $post->ID,
               title:        $post->post_title,
               slug:         $post->post_name,
               startDate:    new \DateTimeImmutable( $rawDate ?: 'now' ),
               status:       EventStatus::from( $post->post_status ),
               venue:        get_post_meta( $post->ID, '_event_venue', true ) ?: null,
               maxAttendees: (int) get_post_meta( $post->ID, '_max_attendees', true ),
           );
       }

       public static function fromRestRequest( \WP_REST_Request $request ): EventDTO {
           return new EventDTO(
               id:           0, // not yet persisted
               title:        sanitize_text_field( $request->get_param( 'title' ) ),
               slug:         sanitize_title( $request->get_param( 'title' ) ),
               startDate:    new \DateTimeImmutable( $request->get_param( 'start_date' ) ),
               status:       EventStatus::Draft,
               venue:        sanitize_text_field( $request->get_param( 'venue' ) ) ?: null,
               maxAttendees: absint( $request->get_param( 'max_attendees' ) ),
           );
       }
   }
   ```

4. **Use the DTO throughout the service layer** — no more raw arrays:
   ```php
   final class EventService {
       public function getUpcoming( int $limit ): array {
           $posts = get_posts( [
               'post_type'      => 'event',
               'posts_per_page' => $limit,
               'post_status'    => 'publish',
               'meta_key'       => '_event_start_date',
               'orderby'        => 'meta_value',
               'order'          => 'ASC',
           ] );

           return array_map( EventDTOFactory::fromPost( ... ), $posts );
           // Returns EventDTO[] — fully typed, IDE-autocompleted, no missing-key risk
       }
   }
   ```

5. **Serialize back to array for REST responses** with a dedicated presenter:
   ```php
   final class EventPresenter {
       public static function toArray( EventDTO $event ): array {
           return [
               'id'            => $event->id,
               'title'         => $event->title,
               'slug'          => $event->slug,
               'start_date'    => $event->startDate->format( 'c' ),
               'status'        => $event->status->value,
               'status_label'  => $event->status->label(),
               'venue'         => $event->venue,
               'max_attendees' => $event->maxAttendees,
           ];
       }
   }
   ```

This pattern eliminates `Undefined index`, makes IDE autocomplete work everywhere, and ensures any shape mismatch is a constructor `TypeError` caught immediately in testing rather than a silent runtime bug.
