# MySQL — Scenario-Based Questions

## Scenario 1: Slow WordPress Admin Dashboard

**Scenario:** A WooCommerce store with 500,000 orders is experiencing 30-second load times in WP Admin → Orders. Server CPU is low but MySQL slow query log shows repeated slow queries.

**Challenge:** Identify and fix the performance bottleneck without modifying WooCommerce core.

**Solution:**
```sql
-- Step 1: Check slow query log
-- /etc/mysql/conf.d/slow.cnf: slow_query_log=1, long_query_time=1

-- Step 2: EXPLAIN the slow query
EXPLAIN SELECT SQL_CALC_FOUND_ROWS wp_posts.*
FROM wp_posts
INNER JOIN wp_postmeta ON wp_posts.ID = wp_postmeta.post_id
WHERE wp_posts.post_type = 'shop_order'
  AND wp_posts.post_status IN ('wc-processing','wc-completed')
  AND wp_postmeta.meta_key = '_billing_email'
ORDER BY wp_posts.post_date DESC
LIMIT 20;
-- Result: type=ALL on postmeta, rows=2000000 — no index on meta_key

-- Step 3: Add composite index
ALTER TABLE wp_postmeta ADD INDEX meta_key_value (meta_key, meta_value(20));

-- Step 4: Consider WooCommerce HPOS (High-Performance Order Storage)
-- Moves orders to dedicated tables with proper indexes
```

---

## Scenario 2: Database Running Out of Disk Space

**Scenario:** Production WordPress database has grown to 40GB. `wp_options` is 2GB, `wp_postmeta` is 15GB. Site is running slow and disk is at 85%.

**Challenge:** Reduce database size without data loss.

**Solution:**
```sql
-- Find large tables
SELECT table_name, ROUND(data_length/1024/1024, 2) AS 'Data MB',
       ROUND(index_length/1024/1024, 2) AS 'Index MB'
FROM information_schema.tables
WHERE table_schema = 'wordpress'
ORDER BY data_length DESC;

-- Clean wp_options: remove autoloaded bloat
SELECT option_name, length(option_value) AS size
FROM wp_options WHERE autoload = 'yes'
ORDER BY size DESC LIMIT 20;

-- Delete transients (often thousands of stale rows)
DELETE FROM wp_options
WHERE option_name LIKE '_transient_%'
   OR option_name LIKE '_site_transient_%';

-- Clean orphaned postmeta
DELETE pm FROM wp_postmeta pm
LEFT JOIN wp_posts p ON pm.post_id = p.ID
WHERE p.ID IS NULL;

-- Reclaim space after deletes
OPTIMIZE TABLE wp_options, wp_postmeta;
```

---

## Scenario 3: Preventing Race Conditions in WooCommerce Stock

**Scenario:** A flash sale causes two customers to simultaneously purchase the last item in stock. Both orders succeed, resulting in negative stock.

**Challenge:** Implement atomic stock decrement to prevent overselling.

**Solution:**
```sql
-- Naive approach (WRONG — race condition):
-- 1. SELECT meta_value FROM wp_postmeta WHERE meta_key='_stock' AND post_id=123
-- 2. If stock > 0: UPDATE wp_postmeta SET meta_value = stock-1 ...
-- Two requests can both read stock=1 and both succeed.

-- Correct: atomic UPDATE with WHERE guard
UPDATE wp_postmeta
SET meta_value = meta_value - 1
WHERE post_id = 123
  AND meta_key = '_stock'
  AND CAST(meta_value AS SIGNED) > 0;
-- Check affected rows: 0 = out of stock (transaction should be rejected)

-- Or use SELECT ... FOR UPDATE inside a transaction
START TRANSACTION;
SELECT meta_value FROM wp_postmeta
WHERE post_id = 123 AND meta_key = '_stock'
FOR UPDATE;  -- row-level lock
-- check value in PHP, then:
UPDATE wp_postmeta SET meta_value = meta_value - 1
WHERE post_id = 123 AND meta_key = '_stock';
COMMIT;
```

---

## Scenario 4: Diagnosing and Fixing Slow Queries with EXPLAIN on a Large wp_postmeta Table

**Scenario:**
A real-estate site has 2 million posts, each with 40+ postmeta rows. A custom property search page runs a meta_query filtering by `_price`, `_bedrooms`, and `_city`. Page load regularly exceeds 15 seconds. The slow query log confirms the culprit query.

**Challenge:**
Use `EXPLAIN` to identify the execution plan problem, then apply targeted indexing and query restructuring without touching WordPress core files.

**Solution:**

1. Capture the exact query from the slow log and run `EXPLAIN`:

```sql
EXPLAIN SELECT DISTINCT p.ID, p.post_title
FROM wp_posts p
INNER JOIN wp_postmeta pm1 ON p.ID = pm1.post_id
INNER JOIN wp_postmeta pm2 ON p.ID = pm2.post_id
INNER JOIN wp_postmeta pm3 ON p.ID = pm3.post_id
WHERE p.post_type   = 'property'
  AND p.post_status = 'publish'
  AND pm1.meta_key  = '_price'    AND CAST(pm1.meta_value AS UNSIGNED) BETWEEN 200000 AND 500000
  AND pm2.meta_key  = '_bedrooms' AND pm2.meta_value = '3'
  AND pm3.meta_key  = '_city'     AND pm3.meta_value = 'Austin';
-- Result: type=ALL on pm1/pm2/pm3, rows~2,400,000 each — no usable index
```

2. Inspect existing indexes:

```sql
SHOW INDEX FROM wp_postmeta;
-- Default WP indexes: meta_id (PK), post_id, meta_key (prefix 191 chars only)
-- No composite index covering (meta_key, meta_value)
```

3. Add a composite covering index. Because `meta_value` is `longtext`, use a prefix:

```sql
ALTER TABLE wp_postmeta DROP INDEX meta_key;

ALTER TABLE wp_postmeta
    ADD INDEX idx_key_val_post (meta_key(32), meta_value(32), post_id);
```

4. Re-run `EXPLAIN` to confirm the improvement:

```sql
EXPLAIN SELECT DISTINCT p.ID, p.post_title ...;
-- type=ref on all three pm aliases, rows drops to ~800 each
-- Extra: Using index condition; Using where
```

5. For even greater gains, replace the triple-JOIN EAV pattern with a conditional aggregation subquery that touches `wp_postmeta` once:

```sql
SELECT p.ID, p.post_title
FROM wp_posts p
INNER JOIN (
    SELECT post_id
    FROM wp_postmeta
    WHERE meta_key IN ('_price', '_bedrooms', '_city')
    GROUP BY post_id
    HAVING
        MAX(CASE WHEN meta_key = '_price'     THEN CAST(meta_value AS UNSIGNED) END) BETWEEN 200000 AND 500000
    AND MAX(CASE WHEN meta_key = '_bedrooms'  THEN meta_value END) = '3'
    AND MAX(CASE WHEN meta_key = '_city'      THEN meta_value END) = 'Austin'
) AS filtered ON p.ID = filtered.post_id
WHERE p.post_type = 'property' AND p.post_status = 'publish';
```

6. Apply via a `posts_clauses` filter to avoid modifying core:

```php
add_filter( 'posts_clauses', function( array $clauses, WP_Query $q ): array {
    if ( ! $q->get( 'myplugin_property_search' ) ) {
        return $clauses;
    }
    global $wpdb;
    $price_min = (int) $q->get( 'price_min' );
    $price_max = (int) $q->get( 'price_max' );
    $bedrooms  = absint( $q->get( 'bedrooms' ) );
    $city      = sanitize_text_field( $q->get( 'city' ) );

    $clauses['join'] .= $wpdb->prepare(
        " INNER JOIN (
            SELECT post_id FROM {$wpdb->postmeta}
            WHERE meta_key IN ('_price','_bedrooms','_city')
            GROUP BY post_id
            HAVING
                MAX(CASE WHEN meta_key='_price'    THEN CAST(meta_value AS UNSIGNED) END) BETWEEN %d AND %d
            AND MAX(CASE WHEN meta_key='_bedrooms' THEN meta_value END) = %s
            AND MAX(CASE WHEN meta_key='_city'     THEN meta_value END) = %s
          ) AS prop_filter ON {$wpdb->posts}.ID = prop_filter.post_id",
        $price_min, $price_max, (string) $bedrooms, $city
    );
    return $clauses;
}, 10, 2 );
```

---

## Scenario 5: Handling a Corrupted InnoDB Table on a Live Production WordPress Site

**Scenario:**
After an unclean MySQL shutdown caused by the OOM killer, `wp_options` reports `Table './wordpress/wp_options' is marked as crashed`. WordPress returns a white screen. There is no recently-tested backup.

**Challenge:**
Recover the table with minimal downtime, verify data integrity, and prevent recurrence.

**Solution:**

1. Confirm the corruption and assess scope:

```sql
CHECK TABLE wp_options;
-- Output: wp_options | check | error | Found row where the auto_increment column value is less than the maximum used value

SHOW ENGINE INNODB STATUS\G
-- Look for: FILE I/O errors, "corruption" keyword, incomplete transactions
```

2. For InnoDB, `REPAIR TABLE` is not supported. Force a rebuild with `ALTER TABLE`:

```sql
-- Rewrites the entire .ibd file using redo log recovery
-- Run during maintenance window or after enabling maintenance mode
ALTER TABLE wp_options ENGINE=InnoDB;
```

3. If MySQL won't start due to severe corruption, use `innodb_force_recovery`:

```ini
# /etc/mysql/conf.d/recovery.cnf
[mysqld]
innodb_force_recovery = 1
# Increment from 1 to 6 if MySQL still won't start
# Level 1: ignore corrupt pages | Level 6: skip incomplete transactions
```

```bash
# Start MySQL in recovery mode, then dump salvageable data
mysqldump -u root -p --single-transaction wordpress wp_options > wp_options_recovered.sql

# Restore to a fresh table
mysql -u root -p wordpress < wp_options_recovered.sql

# Remove innodb_force_recovery and restart normally
```

4. Run a full integrity check after recovery:

```sql
CHECK TABLE wp_posts, wp_postmeta, wp_options, wp_users, wp_usermeta;
-- All should report: OK
```

5. Harden `my.cnf` to prevent recurrence:

```ini
[mysqld]
innodb_flush_log_at_trx_commit = 1   # full ACID durability
innodb_doublewrite             = ON  # protects against partial page writes
innodb_checksums               = ON  # detects corrupt pages early
log_error                      = /var/log/mysql/error.log
```

6. Set up automated backups with binary log retention for point-in-time recovery:

```bash
mysqldump --single-transaction --flush-logs --master-data=2 \
  -u root -p wordpress | gzip > /backups/wordpress_$(date +%F).sql.gz

# In my.cnf:
# log_bin          = /var/log/mysql/mysql-bin.log
# expire_logs_days = 7
```

---

## Scenario 6: Optimizing a WooCommerce Database with Millions of Orders

**Scenario:**
A WooCommerce store has accumulated 4 million orders over 5 years. `wp_posts` has 12 million rows (orders, revisions, meta). Admin order queries take 20+ seconds, nightly cron jobs time out, and the database is 80 GB.

**Challenge:**
Archive old orders, apply targeted indexes, and migrate to WooCommerce HPOS — all without data loss or storefront downtime.

**Solution:**

1. Identify the bloat:

```sql
SELECT post_type, post_status, COUNT(*) AS cnt
FROM wp_posts
GROUP BY post_type, post_status
ORDER BY cnt DESC;
-- Likely: shop_order/wc-completed ~3.8M, revision ~2M

SELECT COUNT(*) FROM wp_postmeta pm
LEFT JOIN wp_posts p ON pm.post_id = p.ID
WHERE p.ID IS NULL;
-- May reveal millions of orphaned postmeta rows
```

2. Clean revisions and orphaned meta immediately:

```sql
DELETE FROM wp_posts WHERE post_type = 'revision';

DELETE pm FROM wp_postmeta pm
LEFT JOIN wp_posts p ON pm.post_id = p.ID
WHERE p.ID IS NULL;

OPTIMIZE TABLE wp_posts, wp_postmeta;
```

3. Archive completed orders older than 2 years:

```sql
CREATE TABLE wp_posts_order_archive LIKE wp_posts;
ALTER TABLE wp_posts_order_archive ADD INDEX idx_post_date (post_date);

INSERT INTO wp_posts_order_archive
SELECT * FROM wp_posts
WHERE post_type   = 'shop_order'
  AND post_status IN ('wc-completed', 'wc-refunded')
  AND post_date   < DATE_SUB(NOW(), INTERVAL 2 YEAR);

CREATE TABLE wp_postmeta_order_archive LIKE wp_postmeta;
INSERT INTO wp_postmeta_order_archive
SELECT pm.* FROM wp_postmeta pm
INNER JOIN wp_posts_order_archive a ON pm.post_id = a.ID;

-- Verify counts match before deleting from live tables
DELETE p FROM wp_posts p
INNER JOIN wp_posts_order_archive a ON p.ID = a.ID;

DELETE pm FROM wp_postmeta pm
INNER JOIN wp_postmeta_order_archive a ON pm.post_id = a.post_id AND pm.meta_key = a.meta_key;
```

4. Add composite indexes for the most common WooCommerce admin queries:

```sql
-- Customer search by billing email
ALTER TABLE wp_postmeta
    ADD INDEX idx_order_billing_email (meta_key(32), meta_value(100));

-- Order list view: filter by status and sort by date
ALTER TABLE wp_posts
    ADD INDEX idx_order_status_date (post_type, post_status, post_date);
```

5. Enable WooCommerce High-Performance Order Storage (HPOS) to escape the EAV bottleneck:

```php
// In a must-use plugin — enable the HPOS feature flag
add_filter( 'woocommerce_feature_hpos_enabled', '__return_true' );
```

Navigate to WooCommerce > Settings > Advanced > Features and run the built-in migration tool. HPOS stores orders in `wc_orders`, `wc_order_addresses`, `wc_order_operational_data`, and `wc_order_meta` with proper relational indexes.

6. Monitor table sizes post-migration:

```sql
SELECT table_name,
       ROUND((data_length + index_length) / 1024 / 1024, 1) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'wordpress'
  AND table_name LIKE 'wc_order%'
ORDER BY size_mb DESC;
```

---

## Scenario 7: Setting Up MySQL Primary/Replica Replication for WordPress High Availability

**Scenario:**
A high-traffic WordPress site runs on a single MySQL server. Any MySQL downtime takes the entire site offline. The team wants a read replica to distribute SELECT load and a manual failover path.

**Challenge:**
Configure async primary/replica replication, route WordPress reads to the replica via HyperDB, and document the failover procedure.

**Solution:**

1. Configure the primary (`my.cnf` on primary):

```ini
[mysqld]
server-id          = 1
log_bin            = /var/log/mysql/mysql-bin.log
binlog_format      = ROW
expire_logs_days   = 7
binlog_do_db       = wordpress
sync_binlog        = 1
```

2. Create a replication user on the primary:

```sql
CREATE USER 'replicator'@'<replica-ip>' IDENTIFIED BY 'strong_password_here';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'<replica-ip>';
FLUSH PRIVILEGES;

FLUSH TABLES WITH READ LOCK;
SHOW MASTER STATUS;
-- Note File and Position values (e.g. mysql-bin.000042, 891204)
UNLOCK TABLES;
```

3. Snapshot the primary and restore on the replica:

```bash
# On primary
mysqldump -u root -p \
  --single-transaction --flush-logs --master-data=2 \
  wordpress > wordpress_snapshot.sql

scp wordpress_snapshot.sql replica:/tmp/

# On replica
mysql -u root -p wordpress < /tmp/wordpress_snapshot.sql
```

4. Configure the replica (`my.cnf` on replica):

```ini
[mysqld]
server-id       = 2
relay_log       = /var/log/mysql/mysql-relay-bin.log
read_only       = ON
super_read_only = ON
```

5. Start replication on the replica:

```sql
CHANGE MASTER TO
    MASTER_HOST     = '<primary-ip>',
    MASTER_USER     = 'replicator',
    MASTER_PASSWORD = 'strong_password_here',
    MASTER_LOG_FILE = 'mysql-bin.000042',
    MASTER_LOG_POS  = 891204;

START SLAVE;
SHOW SLAVE STATUS\G
-- Confirm: Slave_IO_Running: Yes, Slave_SQL_Running: Yes, Seconds_Behind_Master: 0
```

6. Route WordPress reads to the replica using HyperDB (`db-config.php` in ABSPATH):

```php
<?php
// Primary: writes + fallback reads
$wpdb->add_database([
    'host'     => 'primary.db.internal',
    'user'     => DB_USER,
    'password' => DB_PASSWORD,
    'name'     => DB_NAME,
    'write'    => 1,
    'read'     => 1,
    'dataset'  => 'global',
    'timeout'  => 0.2,
]);

// Replica: reads only
$wpdb->add_database([
    'host'     => 'replica.db.internal',
    'user'     => DB_USER,
    'password' => DB_PASSWORD,
    'name'     => DB_NAME,
    'write'    => 0,
    'read'     => 1,
    'dataset'  => 'global',
    'timeout'  => 0.2,
]);
```

7. Monitor replication lag and document the manual failover procedure:

```sql
-- Run on the replica every 30 seconds via monitoring script
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master should stay below 5
```

```bash
# Manual failover: promote replica to primary
# On replica:
mysql -u root -p -e "
    STOP SLAVE;
    RESET SLAVE ALL;
    SET GLOBAL read_only = OFF;
    SET GLOBAL super_read_only = OFF;
"
# Then update DB_HOST in wp-config.php or flip the DNS alias
# pointing 'primary.db.internal' at the promoted replica
```

---
