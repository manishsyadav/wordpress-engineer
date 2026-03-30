# MySQL — Core Concepts

## 1. Relational Database Design and Normalization

Normalization organizes tables to reduce data redundancy and improve integrity.

- **1NF** — each column holds atomic values; no repeating groups.
- **2NF** — no partial dependencies (non-key columns depend on the whole primary key).
- **3NF** — no transitive dependencies (non-key columns depend only on the primary key, not on other non-key columns).
- **BCNF** — every determinant is a candidate key (stricter form of 3NF).
- **Denormalization** — intentionally introduces redundancy for read performance (materialized views, summary tables).

WordPress's schema is partially denormalized (e.g., `wp_postmeta` is an EAV pattern — flexible but expensive to query).

---

## 2. Indexing Strategies

Indexes speed up reads at the cost of write overhead and storage.

- **B-Tree index** — the default. Supports equality, range, `ORDER BY`, `GROUP BY`. Columns in composite indexes must match the leftmost prefix of the query.
- **FULLTEXT index** — for `MATCH() AGAINST()` full-text search. More efficient than `LIKE '%term%'` but only for InnoDB/MyISAM.
- **Unique index** — enforces column uniqueness; doubles as a regular index.
- **Covering index** — an index that satisfies the entire query without touching the main table (all `SELECT` columns are in the index). Eliminates a table lookup.
- **Prefix index** — indexes only the first N characters of a VARCHAR/TEXT column. Reduces size but cannot be covering.
- **Index selectivity** — high selectivity (few duplicate values) = more useful index. Avoid indexing boolean or low-cardinality columns alone.

---

## 3. EXPLAIN and Query Optimization

`EXPLAIN SELECT ...` returns the execution plan. Key columns:

- **type** — access method: `system` > `const` > `eq_ref` > `ref` > `range` > `index` > `ALL`. Anything `index` or `ALL` on large tables is a red flag.
- **possible_keys** — indexes the optimizer considered.
- **key** — the index actually used.
- **rows** — estimated rows examined. Lower is better.
- **Extra** — `Using index` (covering), `Using filesort` (needs `ORDER BY` optimization), `Using temporary` (memory/disk temp table).

`EXPLAIN ANALYZE` (MySQL 8.0+) executes the query and returns actual row counts and timing.

---

## 4. JOINs

- **INNER JOIN** — returns rows where the join condition is true in both tables.
- **LEFT JOIN** — returns all rows from the left table; NULL-fills right table for non-matches.
- **RIGHT JOIN** — mirror of LEFT JOIN.
- **CROSS JOIN** — Cartesian product (every combination). Rarely useful; dangerous on large tables.
- **Self-join** — joining a table to itself; common for hierarchical data (category tree).
- WordPress uses `wp_posts` LEFT JOIN `wp_postmeta` for meta queries; each additional meta clause adds another JOIN.

---

## 5. Transactions and ACID Properties

- **Atomicity** — all operations in a transaction succeed or all fail.
- **Consistency** — the database transitions between valid states.
- **Isolation** — concurrent transactions do not interfere (controlled by isolation level).
- **Durability** — committed transactions survive crashes (InnoDB uses the redo log).

Isolation levels (strictest to most permissive): `SERIALIZABLE`, `REPEATABLE READ` (MySQL default), `READ COMMITTED`, `READ UNCOMMITTED`. Lower isolation levels have better concurrency but risk dirty reads and phantom reads.

```sql
START TRANSACTION;
UPDATE wp_posts SET post_status = 'publish' WHERE ID = 42;
INSERT INTO wp_postmeta (post_id, meta_key, meta_value) VALUES (42, '_published_at', NOW());
COMMIT; -- or ROLLBACK on error
```

---

## 6. The WordPress Database Schema

Key tables:

| Table | Purpose |
|-------|---------|
| `wp_posts` | Posts, pages, attachments, revisions, CPTs |
| `wp_postmeta` | Key-value metadata for posts (EAV pattern) |
| `wp_users` | User accounts |
| `wp_usermeta` | Key-value metadata for users |
| `wp_terms` | Taxonomy term names |
| `wp_term_taxonomy` | Associates terms to taxonomies |
| `wp_term_relationships` | Links posts to taxonomy terms |
| `wp_options` | Site configuration, plugin settings |
| `wp_comments` | Comments |
| `wp_commentmeta` | Comment metadata |

In multisite: each site has its own set of `wp_{n}_*` tables. Global tables (`wp_users`, `wp_usermeta`, `wp_blogs`, `wp_site`, `wp_sitemeta`) are shared.

---

## 7. Stored Procedures, Functions, and Views

- **Stored procedures** — reusable SQL blocks called with `CALL`. Accept IN/OUT parameters. Useful for complex multi-step operations requiring server-side logic. WordPress does not use them natively.
- **Stored functions** — like stored procedures but return a single value; can be used in SQL expressions.
- **Views** — named SELECT queries treated as virtual tables. Useful for hiding complexity (joining wp_posts + wp_postmeta into a product_view). Not cacheable by default.
- **Triggers** — fire on INSERT/UPDATE/DELETE. Useful for audit logging or denormalized counter updates.

---

## 8. Replication and High Availability

- **Binary log (binlog)** — MySQL logs every data-changing statement/row event. Used for replication and point-in-time recovery.
- **Primary–replica replication** — the primary writes; replicas apply events asynchronously. Reads can be distributed across replicas. WordPress's HyperDB and ProxySQL route read queries to replicas.
- **GTID replication** (Global Transaction Identifiers) — each transaction has a unique global ID; simplifies failover.
- **Semi-synchronous replication** — the primary waits for at least one replica to confirm receipt before committing. Reduces data loss risk at the cost of slightly higher write latency.
- **Group Replication / InnoDB Cluster** — MySQL's built-in multi-primary high-availability solution.

---

## 9. Performance Tuning

Key `my.cnf` parameters for WordPress workloads:

- `innodb_buffer_pool_size` — the most important setting. Set to 70–80% of available RAM on a dedicated database server. Caches data and indexes.
- `innodb_log_file_size` — larger log files reduce checkpoint frequency; 1–2 GB is typical.
- `query_cache_size` — deprecated in MySQL 8.0; removed. Do not use (causes global mutex contention).
- `max_connections` — match to expected concurrent PHP-FPM workers plus headroom.
- `slow_query_log` / `long_query_time` — log queries exceeding the threshold; essential for identifying bottlenecks.
- `innodb_flush_log_at_trx_commit=2` — trades slight durability for significantly faster writes (acceptable for most WordPress sites; use `1` for financial data).

---

## 10. Custom Tables for WordPress Plugins

When to use a custom table instead of `wp_postmeta`:
- High-volume writes (analytics events, form submissions).
- Complex relational queries (multi-column filtering, aggregations).
- Data that doesn't need the WP admin post list.

Best practices:
- Create the table in the activation hook using `dbDelta()`.
- Always use `$wpdb->prefix` for the table name.
- Add appropriate indexes at creation time.
- Store the schema version in `wp_options` and run `dbDelta()` on version mismatch to handle upgrades.

```sql
CREATE TABLE wp_custom_events (
    id           BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      BIGINT(20) UNSIGNED NOT NULL,
    event_type   VARCHAR(50)         NOT NULL,
    object_id    BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
    created_at   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (id),
    KEY          idx_user_event (user_id, event_type),
    KEY          idx_created    (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
