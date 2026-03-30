# MySQL — Interview Questions

## Basic

**Q: What is the difference between `CHAR` and `VARCHAR`?**
**A:** `CHAR(n)` is fixed-length — always allocates n bytes. Fast for fixed-size data (e.g., country codes). `VARCHAR(n)` is variable-length — stores only actual characters + 1–2 byte length prefix. Better for variable text. WordPress uses `VARCHAR` for post titles, slugs, and meta values.

**Q: What is a PRIMARY KEY vs UNIQUE KEY?**
**A:** `PRIMARY KEY` uniquely identifies each row, cannot be NULL, one per table. `UNIQUE KEY` also enforces uniqueness but allows one NULL value and multiple per table. WordPress `wp_posts` uses `ID` as PRIMARY KEY and `post_name` has a UNIQUE index.

**Q: What does `INDEX` do?**
**A:** An index creates a separate data structure (B-tree by default) that allows MySQL to find rows matching a WHERE condition without scanning every row. Speeds up reads but slightly slows writes (index must be updated). WordPress adds indexes on `post_status`, `post_type`, `post_date`.

**Q: What is `AUTO_INCREMENT`?**
**A:** Automatically generates a unique integer for each new row. Used for primary keys. MySQL keeps a counter per table — each INSERT gets the next value. In WordPress, `wp_posts.ID`, `wp_users.ID`, etc. use `AUTO_INCREMENT BIGINT(20) UNSIGNED`.

**Q: What is `NULL` vs empty string in MySQL?**
**A:** `NULL` means "no value / unknown" — not zero, not empty string. Comparisons must use `IS NULL` / `IS NOT NULL` not `= NULL`. Empty string `''` is a real value. WordPress post meta stores `''` for empty values; `NULL` means the meta key doesn't exist.

**Q: What are the main MySQL storage engines?**
**A:** `InnoDB` — default, supports transactions, foreign keys, row-level locking. Best for WordPress. `MyISAM` — no transactions, table-level locking, faster full-text search (legacy). `MEMORY` — in-RAM table, lost on restart, used for temp tables.

## Mid

**Q: What is a database transaction and why does WordPress use them?**
**A:** A transaction groups multiple SQL statements into an atomic unit — all succeed or all roll back. WordPress uses `$wpdb->query('START TRANSACTION')` / `COMMIT` / `ROLLBACK` for operations like order creation in WooCommerce where partial saves would corrupt data.

**Q: Explain JOINs — INNER, LEFT, RIGHT.**
**A:** `INNER JOIN` returns rows where both tables have a match. `LEFT JOIN` returns all rows from the left table + matching rows from right (NULL if no match). `RIGHT JOIN` is the reverse. WordPress uses `LEFT JOIN` extensively — e.g., joining `wp_posts` with `wp_postmeta` to include posts even without a specific meta key.

**Q: What is the N+1 query problem and how do you fix it?**
**A:** N+1 occurs when you run 1 query to get N posts, then N more queries to get each post's meta. Total: N+1 queries. Fix: use `update_post_meta_cache` or `WP_Query` with `update_post_meta_cache => true` (default). This bulk-loads all meta in 1 query, stored in the object cache.

**Q: What is `EXPLAIN` and how do you use it?**
**A:** `EXPLAIN SELECT ...` shows MySQL's query execution plan — which indexes are used, estimated rows scanned, join type. Key columns: `type` (ALL = full scan = bad), `key` (which index used), `rows` (estimated rows). Use to diagnose slow queries and verify indexes are being hit.

**Q: What are WordPress database table relationships?**
**A:** Posts → PostMeta (1:many via post_id). Posts → Terms (many:many via term_relationships + term_taxonomy). Users → UserMeta (1:many via user_id). Comments → Posts (many:1 via comment_post_ID). Options table is key-value with no relationships.

## Advanced

**Q: How do you optimize a slow WordPress MySQL query?**
**A:** 1) Enable slow query log (`slow_query_log=1`, `long_query_time=1`). 2) Run `EXPLAIN` on the slow query. 3) Check if indexes exist on WHERE/ORDER BY/JOIN columns. 4) Add composite index if filtering on multiple columns. 5) Use `SQL_CALC_FOUND_ROWS` only when needed — it prevents optimization. 6) For large meta queries, consider denormalization or Elasticsearch.

**Q: What is InnoDB buffer pool and how do you tune it?**
**A:** The buffer pool caches frequently accessed data and index pages in RAM — the most critical InnoDB performance setting. Set `innodb_buffer_pool_size` to 70–80% of available RAM. Monitor hit rate via `SHOW STATUS LIKE 'Innodb_buffer_pool_read%'`. Hit rate below 99% = pool too small.

**Q: How do you handle database migrations safely on a live WordPress site?**
**A:** Use the Expand-Contract pattern: Phase 1 add new column (nullable), deploy code writing to both columns. Phase 2 backfill old data in batches (500 rows, sleep 10ms between batches to avoid lock contention). Phase 3 remove old column. Use `dbDelta()` for table creation. Always backup before migration and use `pt-online-schema-change` for large tables.

**Q: What is connection pooling and why does it matter for WordPress?**
**A:** Each PHP-FPM worker opens a new MySQL connection. Under high load (50+ workers), MySQL can hit `max_connections`. Solutions: ProxySQL or PgBouncer sits between PHP and MySQL, reusing connections. AWS RDS Proxy does this as a managed service. Reduces connection overhead and prevents "Too many connections" errors.

**Q: How do read replicas work with WordPress?**
**A:** Primary handles writes (INSERT/UPDATE/DELETE). Replicas receive binary log replication from primary and handle SELECT queries. HyperDB plugin routes reads to replicas and writes to primary. Replication lag means replicas may be slightly behind — avoid sending users to replica immediately after a write they triggered.
