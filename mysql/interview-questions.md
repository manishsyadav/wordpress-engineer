# MySQL — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is the difference between `CHAR` and `VARCHAR`?**
**A:** `CHAR` is fixed-length and pads with spaces; `VARCHAR` stores only used bytes plus a 1–2 byte length prefix. Use `CHAR` for predictable-length values like country codes, `VARCHAR` for variable-length strings.
```sql
CREATE TABLE users (
  country_code CHAR(2)      NOT NULL,
  username     VARCHAR(100) NOT NULL
);
```

**Q2: When should you use `TEXT` instead of `VARCHAR`?**
**A:** Use `TEXT` for large string data you do not need to set a default on or index fully (up to 65,535 bytes). `VARCHAR` is better for shorter, indexed columns where defaults matter.
```sql
CREATE TABLE posts (
  title   VARCHAR(255) NOT NULL,
  content TEXT
);
```

**Q3: What is the difference between `INT` and `BIGINT`?**
**A:** `INT` is 4 bytes (±2.1 billion signed); `BIGINT` is 8 bytes (±9.2 quintillion). Use `BIGINT` for auto-increment IDs on high-volume tables to avoid overflow.
```sql
CREATE TABLE events (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_name VARCHAR(100)
);
```

**Q4: What does `AUTO_INCREMENT` do and how do you set its starting value?**
**A:** `AUTO_INCREMENT` automatically assigns the next integer on insert. Set the seed with `AUTO_INCREMENT = N` in `CREATE TABLE` or via `ALTER TABLE`.
```sql
CREATE TABLE orders (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  total DECIMAL(10,2)
) AUTO_INCREMENT = 1000;
```

**Q5: What is the difference between `NULL` and an empty string `''`?**
**A:** `NULL` means "no value / unknown" and must be tested with `IS NULL`. An empty string is a known zero-length value testable with `= ''`. They behave differently in aggregates and comparisons.
```sql
SELECT * FROM contacts WHERE phone IS NULL;   -- missing phone
SELECT * FROM contacts WHERE phone = '';      -- explicitly blank
```

**Q6: How do `PRIMARY KEY` and `UNIQUE` differ?**
**A:** A table has exactly one `PRIMARY KEY` (implicitly `NOT NULL`); it may have many `UNIQUE` constraints which permit a single `NULL`. Both create a B-tree index automatically.
```sql
CREATE TABLE products (
  id    INT          PRIMARY KEY,
  sku   VARCHAR(50)  UNIQUE,
  email VARCHAR(100) UNIQUE
);
```

**Q7: How do `WHERE`, `ORDER BY`, and `LIMIT`/`OFFSET` work together?**
**A:** `WHERE` filters rows, `ORDER BY` sorts the result, and `LIMIT`/`OFFSET` returns a page of rows. Always pair `ORDER BY` with `LIMIT` to get deterministic pages.
```sql
SELECT id, title, post_date
FROM   wp_posts
WHERE  post_status = 'publish'
ORDER  BY post_date DESC
LIMIT  10 OFFSET 20;
```

**Q8: What does `INSERT … ON DUPLICATE KEY UPDATE` do?**
**A:** It inserts a row; if a duplicate primary/unique key exists it updates the specified columns instead. This is an atomic upsert.
```sql
INSERT INTO wp_options (option_name, option_value, autoload)
VALUES ('my_key', 'my_val', 'yes')
ON DUPLICATE KEY UPDATE option_value = VALUES(option_value);
```

**Q9: How do you update multiple columns in one `UPDATE` statement?**
**A:** List comma-separated `col = value` pairs after `SET`. Always include a `WHERE` clause to avoid updating every row in the table.
```sql
UPDATE wp_posts
SET    post_status   = 'draft',
       post_modified = NOW()
WHERE  ID = 42;
```

**Q10: How do you safely delete rows?**
**A:** Use a `WHERE` clause (and optionally `LIMIT`) to scope the delete. Run the equivalent `SELECT` first to preview which rows will be removed.
```sql
DELETE FROM wp_postmeta
WHERE  post_id  = 42
  AND  meta_key = '_thumbnail_id'
LIMIT  1;
```

**Q11: What is the difference between `DATETIME` and `TIMESTAMP`?**
**A:** `DATETIME` stores the literal date/time with no timezone awareness (range 1000–9999). `TIMESTAMP` stores UTC, auto-converts to the session timezone, and has a narrower range (1970–2038 on 32-bit systems).
```sql
CREATE TABLE sessions (
  created_at DATETIME,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Q12: How does `GROUP BY` work with aggregate functions?**
**A:** `GROUP BY` collapses rows sharing the same column value into one group row. Aggregate functions (`COUNT`, `SUM`, `AVG`, `MAX`, `MIN`) then compute per group.
```sql
SELECT   post_type, COUNT(*) AS total
FROM     wp_posts
WHERE    post_status = 'publish'
GROUP BY post_type
ORDER BY total DESC;
```

**Q13: What is the difference between `WHERE` and `HAVING`?**
**A:** `WHERE` filters rows before aggregation; `HAVING` filters groups after aggregation. Aggregate functions cannot appear inside `WHERE`.
```sql
SELECT   post_author, COUNT(*) AS cnt
FROM     wp_posts
GROUP BY post_author
HAVING   cnt > 10;
```

**Q14: What does `INNER JOIN` return?**
**A:** Only rows that have a matching value in both tables. Rows with no counterpart in either side are excluded from the result.
```sql
SELECT p.ID, p.post_title, u.user_login
FROM   wp_posts  p
JOIN   wp_users  u ON u.ID = p.post_author
WHERE  p.post_status = 'publish';
```

**Q15: How does `LEFT JOIN` differ from `INNER JOIN`?**
**A:** `LEFT JOIN` returns all rows from the left table; unmatched right-side columns are `NULL`. Use it when the related row may not exist, e.g. optional post meta.
```sql
SELECT p.ID, pm.meta_value AS thumbnail
FROM   wp_posts    p
LEFT   JOIN wp_postmeta pm
         ON pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id'
WHERE  p.post_status = 'publish';
```

**Q16: What is a subquery and when would you use one?**
**A:** A subquery is a `SELECT` nested inside another SQL statement. Use it for intermediate results, though a `JOIN` is often more efficient on large tables.
```sql
SELECT post_title
FROM   wp_posts
WHERE  ID IN (
  SELECT post_id FROM wp_postmeta
  WHERE  meta_key = 'featured' AND meta_value = '1'
);
```

**Q17: What does `EXPLAIN` show you?**
**A:** `EXPLAIN` displays MySQL's execution plan: table access type, indexes used, estimated rows scanned, and extra operations like filesort. It is the first diagnostic tool for slow queries.
```sql
EXPLAIN
SELECT * FROM wp_posts
WHERE  post_status = 'publish'
ORDER  BY post_date DESC
LIMIT  10;
```

**Q18: What is a `FULLTEXT` index used for?**
**A:** `FULLTEXT` indexes enable natural-language and boolean keyword search via `MATCH … AGAINST`, far faster than a `LIKE '%keyword%'` scan.
```sql
ALTER TABLE wp_posts
  ADD FULLTEXT INDEX ft_content (post_title, post_content);

SELECT ID, post_title
FROM   wp_posts
WHERE  MATCH(post_title, post_content) AGAINST ('WordPress' IN BOOLEAN MODE);
```

**Q19: What does `DISTINCT` do and when should you use it?**
**A:** `DISTINCT` removes duplicate rows from the result. It adds a deduplication cost; only use it when duplicates are genuinely possible, not as a substitute for a proper `JOIN`.
```sql
SELECT DISTINCT post_status
FROM   wp_posts
ORDER  BY post_status;
```

**Q20: How do you add an index to an existing table?**
**A:** Use `ALTER TABLE … ADD INDEX` or `CREATE INDEX`. For composite indexes, list the most-filtered column first so MySQL can use a left-prefix efficiently.
```sql
ALTER TABLE wp_postmeta
  ADD INDEX idx_key_value (meta_key, meta_value(20));
```

---

## Mid

**Q21: How do transactions work (`START TRANSACTION`, `COMMIT`, `ROLLBACK`)?**
**A:** Transactions group statements into an atomic unit. `COMMIT` persists all changes; `ROLLBACK` undoes every change since `START TRANSACTION`. InnoDB supports transactions; MyISAM does not.
```sql
START TRANSACTION;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- On error: ROLLBACK;
```

**Q22: What are the main differences between InnoDB and MyISAM?**
**A:** InnoDB supports ACID transactions, row-level locking, foreign keys, and crash recovery. MyISAM uses table-level locking and lacks transactions. InnoDB is the default and recommended engine for all general use.
```sql
CREATE TABLE log_entries (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
```

**Q23: What is a covering index?**
**A:** A covering index includes every column needed by a query so MySQL can answer it entirely from the index without reading the actual table rows, eliminating a costly row-lookup step.
```sql
-- Query needs post_status, post_date, post_title — all in the index
ALTER TABLE wp_posts
  ADD INDEX idx_cover (post_status, post_date, post_title);

SELECT post_date, post_title FROM wp_posts WHERE post_status = 'publish';
```

**Q24: What is a composite index and how should you order its columns?**
**A:** A composite index spans multiple columns. Order the most-frequently-filtered column first; MySQL can use any left-prefix of the index but cannot skip columns.
```sql
ALTER TABLE wp_posts
  ADD INDEX idx_author_status_date (post_author, post_status, post_date);
-- Usable for: (author), (author + status), (author + status + date)
```

**Q25: How does `wpdb->prepare()` prevent SQL injection?**
**A:** It uses `sprintf`-style placeholders (`%d`, `%s`, `%f`) that WordPress properly escapes and quotes before sending the query, ensuring user input cannot be interpreted as SQL.
```php
global $wpdb;
$rows = $wpdb->get_results(
  $wpdb->prepare(
    "SELECT * FROM {$wpdb->posts} WHERE post_author = %d AND post_status = %s",
    $user_id,
    'publish'
  )
);
```

**Q26: What does `dbDelta()` do in WordPress?**
**A:** `dbDelta()` compares a `CREATE TABLE` statement against the live schema and applies only the differences (adds missing columns/indexes). It never drops columns, making it safe to call on plugin upgrades.
```php
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
$sql = "CREATE TABLE {$wpdb->prefix}my_table (
  id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  data TEXT NOT NULL
) {$wpdb->get_charset_collate()};";
dbDelta( $sql );
```

**Q27: How does `WP_Query` translate to SQL?**
**A:** `WP_Query` builds a `SELECT` against `wp_posts` and joins related tables (`wp_postmeta`, `wp_term_relationships`, etc.) as needed. Inspect the raw SQL via `$query->request` after execution.
```php
$q = new WP_Query([
  'post_type'      => 'post',
  'meta_key'       => 'featured',
  'meta_value'     => '1',
  'posts_per_page' => 5,
]);
echo $q->request; // prints the generated SQL
```

**Q28: What is the `wp_options` table and what does the `autoload` column do?**
**A:** `wp_options` stores key-value site settings. Rows where `autoload = 'yes'` are loaded on every request into the object cache in one query. Storing large data with autoload enabled bloats that initial query.
```sql
SELECT option_name, LENGTH(option_value) AS size_bytes
FROM   wp_options
WHERE  autoload = 'yes'
ORDER  BY size_bytes DESC
LIMIT  10;
```

**Q29: How do you identify and fix a slow query?**
**A:** Enable the slow query log to capture long-running queries, then `EXPLAIN` them. Common fixes: add an index on the filtered/sorted column, rewrite to avoid full-table scans, or reduce the result set.
```sql
SET GLOBAL slow_query_log      = 'ON';
SET GLOBAL long_query_time     = 1;      -- seconds
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

**Q30: What is the InnoDB buffer pool and how do you tune it?**
**A:** The buffer pool caches data pages and indexes in memory. Set `innodb_buffer_pool_size` to 70–80 % of available RAM on a dedicated DB server to maximize cache hits and minimize disk I/O.
```ini
# /etc/mysql/my.cnf
[mysqld]
innodb_buffer_pool_size      = 4G
innodb_buffer_pool_instances = 4
```

**Q31: What is MySQL replication and why use it?**
**A:** The primary writes a binary log; replicas read and replay it asynchronously. Replicas serve read queries, offload reports, and provide a warm standby for failover without impacting the primary.
```sql
-- On primary
SHOW MASTER STATUS;

-- On replica
CHANGE MASTER TO MASTER_HOST='primary_ip',
  MASTER_LOG_FILE='mysql-bin.000001', MASTER_LOG_POS=154;
START SLAVE;
```

**Q32: What is `pt-online-schema-change` and why is it used?**
**A:** It alters large tables with no long-lived lock: it creates a shadow table, copies rows in batches, uses triggers to sync live writes, then atomically renames the table. Essential for zero-downtime schema changes.
```bash
pt-online-schema-change \
  --alter "ADD COLUMN views INT UNSIGNED DEFAULT 0" \
  --execute \
  D=wordpress,t=wp_posts
```

**Q33: How do you store and query JSON data in MySQL 8?**
**A:** The `JSON` column type validates syntax and stores data in an optimised binary format. Use `->` for path extraction (quoted) or `->>` (unquoted string), and generated columns to index JSON fields.
```sql
ALTER TABLE wp_posts ADD COLUMN meta_json JSON;

SELECT ID, meta_json->>'$.color' AS color
FROM   wp_posts
WHERE  meta_json->>'$.featured' = 'true';
```

**Q34: What are window functions and how does `ROW_NUMBER()` work?**
**A:** Window functions compute a value across rows related to the current row without collapsing them like `GROUP BY`. `ROW_NUMBER()` assigns a sequential integer per partition ordered by the specified column.
```sql
SELECT ID, post_author, post_date,
  ROW_NUMBER() OVER (PARTITION BY post_author ORDER BY post_date DESC) AS rn
FROM wp_posts
WHERE post_status = 'publish';
```

**Q35: What is the difference between `RANK()` and `DENSE_RANK()`?**
**A:** `RANK()` leaves gaps after ties (1, 2, 2, 4); `DENSE_RANK()` does not (1, 2, 2, 3). Use `DENSE_RANK()` when you need consecutive rankings regardless of ties.
```sql
SELECT post_author, COUNT(*) AS posts,
  RANK()       OVER (ORDER BY COUNT(*) DESC) AS rnk,
  DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS dense_rnk
FROM   wp_posts
GROUP  BY post_author;
```

**Q36: What is MVCC (Multi-Version Concurrency Control)?**
**A:** InnoDB keeps old row versions in the undo log so readers see a consistent snapshot without blocking writers. Each transaction reads data as it existed at its start time.
```sql
-- Session A opens a repeatable-read transaction
START TRANSACTION;
SELECT * FROM wp_posts WHERE ID = 1; -- sees snapshot at this moment

-- Session B updates concurrently — Session A still sees old version
UPDATE wp_posts SET post_title = 'Updated' WHERE ID = 1;
```

**Q37: How do stored procedures work in MySQL?**
**A:** Stored procedures are named, compiled SQL routines saved in the database. They reduce network round-trips and centralise logic, but complicate version control and are harder to test than application code.
```sql
DELIMITER $$
CREATE PROCEDURE get_published(IN author_id BIGINT)
BEGIN
  SELECT ID, post_title FROM wp_posts
  WHERE  post_author = author_id AND post_status = 'publish';
END$$
DELIMITER ;

CALL get_published(1);
```

**Q38: Why was the MySQL query cache removed in MySQL 8?**
**A:** The query cache stored full result sets keyed by exact SQL and invalidated the entire table cache on any write. Under concurrent writes it became a serialization bottleneck. Application-level caching (Redis/Memcached) is preferred.
```sql
-- MySQL 5.7 only
SHOW STATUS LIKE 'Qcache%';
-- MySQL 8: use application caching or ProxySQL query mirroring instead
```

**Q39: How do you prevent deadlocks in MySQL?**
**A:** Access tables and rows in a consistent order across all transactions, keep transactions short, use `SELECT … FOR UPDATE` only when necessary, and add indexes so locks target the fewest possible rows.
```sql
-- Consistent lock ordering prevents circular waits
START TRANSACTION;
  SELECT id FROM accounts WHERE id = 1 FOR UPDATE;
  SELECT id FROM accounts WHERE id = 2 FOR UPDATE;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

**Q40: What are the key differences between MySQL 8 and MariaDB?**
**A:** MySQL 8 added window functions, CTEs, invisible indexes, and moved the data dictionary into InnoDB. MariaDB has its own optimizer improvements, Galera Cluster, and differs in replication internals. They are no longer fully wire-compatible.
```sql
-- CTE — works in MySQL 8 and MariaDB 10.2+
WITH ranked AS (
  SELECT ID, post_title,
    ROW_NUMBER() OVER (ORDER BY post_date DESC) AS rn
  FROM wp_posts WHERE post_status = 'publish'
)
SELECT * FROM ranked WHERE rn <= 5;
```

---

## Advanced

**Q41: How does `EXPLAIN ANALYZE` (MySQL 8) differ from plain `EXPLAIN`?**
**A:** `EXPLAIN ANALYZE` actually executes the query and returns real row counts and timing alongside the estimated plan, revealing where the optimizer's estimates diverge from reality for targeted tuning.
```sql
EXPLAIN ANALYZE
SELECT p.ID, pm.meta_value
FROM   wp_posts p
JOIN   wp_postmeta pm ON pm.post_id = p.ID AND pm.meta_key = '_price'
WHERE  p.post_status = 'publish'
ORDER  BY CAST(pm.meta_value AS DECIMAL) DESC
LIMIT  20;
```

**Q42: When would you choose a hash index over a B-tree index?**
**A:** B-tree indexes support range queries, prefix searches, and ordering — they are the default. Hash indexes (Memory engine) offer O(1) exact-equality lookups but cannot serve range or sort operations.
```sql
-- B-tree (default): supports =, <, >, BETWEEN, LIKE 'prefix%'
CREATE INDEX idx_status ON wp_posts (post_status);

-- Hash: equality-only, Memory tables
CREATE TABLE cache_map (k VARCHAR(64), v TEXT,
  INDEX USING HASH (k)
) ENGINE = MEMORY;
```

**Q43: How do recursive CTEs traverse hierarchical data?**
**A:** A recursive CTE has an anchor `SELECT` (base case) and a recursive `SELECT` joined by `UNION ALL`. It is ideal for parent-child hierarchies such as nested WordPress categories.
```sql
WITH RECURSIVE tree AS (
  SELECT term_id, name, parent, 0 AS depth
  FROM   wp_terms t JOIN wp_term_taxonomy tt USING (term_id)
  WHERE  tt.parent = 0
  UNION ALL
  SELECT t2.term_id, t2.name, tt2.parent, tr.depth + 1
  FROM   wp_terms t2
  JOIN   wp_term_taxonomy tt2 USING (term_id)
  JOIN   tree tr ON tr.term_id = tt2.parent
)
SELECT * FROM tree ORDER BY depth, name;
```

**Q44: What are InnoDB gap locks and when do they occur?**
**A:** A gap lock blocks inserts into a range between two index values to prevent phantom reads under `REPEATABLE READ`. Switching to `READ COMMITTED` eliminates gap locks when phantom reads are acceptable.
```sql
-- REPEATABLE READ: gap lock prevents any insert with ID 5–9
SELECT * FROM wp_posts WHERE ID BETWEEN 5 AND 9 FOR UPDATE;

-- Inspect active locks (MySQL 8)
SELECT * FROM performance_schema.data_locks\G
```

**Q45: How does table partitioning work and what are its trade-offs?**
**A:** Partitioning splits a table into physical segments by a key (RANGE, LIST, HASH). It enables partition pruning and fast partition drops for archiving, but restricts foreign keys and complicates index design.
```sql
CREATE TABLE post_archive (
  ID        BIGINT UNSIGNED NOT NULL,
  post_date DATETIME        NOT NULL,
  PRIMARY KEY (ID, post_date)
)
PARTITION BY RANGE (YEAR(post_date)) (
  PARTITION p2022 VALUES LESS THAN (2023),
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION pmax  VALUES LESS THAN MAXVALUE
);
```

**Q46: How do you pivot multiple `wp_postmeta` keys in a single efficient query?**
**A:** Use conditional aggregation to pivot multiple meta keys in one pass over `wp_postmeta`, avoiding multiple self-joins. The existing composite index on `(post_id, meta_key)` makes the scan efficient.
```sql
SELECT p.ID, p.post_title,
  MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) AS price,
  MAX(CASE WHEN pm.meta_key = '_sku'   THEN pm.meta_value END) AS sku,
  MAX(CASE WHEN pm.meta_key = '_stock' THEN pm.meta_value END) AS stock
FROM wp_posts p
JOIN wp_postmeta pm ON pm.post_id = p.ID
  AND pm.meta_key IN ('_price','_sku','_stock')
WHERE p.post_type = 'product' AND p.post_status = 'publish'
GROUP BY p.ID, p.post_title;
```

**Q47: What is semi-synchronous replication and how does it improve durability?**
**A:** Semi-sync requires at least one replica to acknowledge receipt of a binary log event before the primary returns the commit to the client. No committed transaction can be lost on a primary crash, at the cost of slightly higher write latency.
```sql
-- Install and enable on primary
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_master_timeout = 1000; -- ms before async fallback
```

**Q48: How do you index a JSON field using a generated column?**
**A:** Create a virtual generated column that extracts the JSON path value, then add a regular index on that column. The optimizer uses it for queries that filter on the JSON value.
```sql
ALTER TABLE wp_posts
  ADD COLUMN price_idx DECIMAL(10,2)
    AS (meta_json->>'$.price') VIRTUAL,
  ADD INDEX idx_price (price_idx);

SELECT ID, price_idx FROM wp_posts WHERE price_idx > 100;
```

**Q49: How does `innodb_flush_log_at_trx_commit` affect durability vs performance?**
**A:** `1` (default) flushes the redo log on every commit — fully durable. `2` writes to OS cache per commit and flushes per second — survives MySQL crash, not OS crash. `0` flushes every second — fastest but loses up to 1 second of data on any crash.
```ini
[mysqld]
innodb_flush_log_at_trx_commit = 1  # ACID-safe default
sync_binlog                    = 1  # also flush binlog per commit
# Set to 2 only if you can tolerate losing commits on OS crash
```

**Q50: How do you use `pt-query-digest` to find the worst queries in the slow log?**
**A:** `pt-query-digest` aggregates queries by fingerprint, ranks them by total execution time, and reports call counts and average latency so you focus optimisation effort where it has the greatest impact.
```bash
pt-query-digest \
  --limit    10 \
  --order-by Query_time:sum \
  /var/log/mysql/slow.log \
  > /tmp/digest.txt

cat /tmp/digest.txt
```
