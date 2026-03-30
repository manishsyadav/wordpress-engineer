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
