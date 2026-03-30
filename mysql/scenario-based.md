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
