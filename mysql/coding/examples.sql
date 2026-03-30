-- ============================================================
-- WordPress MySQL — Practical Examples
-- ============================================================

-- 1. Get 10 most recent published posts with author name
SELECT p.ID, p.post_title, p.post_date, u.display_name AS author
FROM wp_posts p
INNER JOIN wp_users u ON p.post_author = u.ID
WHERE p.post_type = 'post'
  AND p.post_status = 'publish'
ORDER BY p.post_date DESC
LIMIT 10;

-- 2. Get all posts with a specific meta value
SELECT p.ID, p.post_title, pm.meta_value AS featured_image_id
FROM wp_posts p
INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'post'
  AND p.post_status = 'publish'
  AND pm.meta_key = '_thumbnail_id';

-- 3. Count posts per category
SELECT t.name AS category, COUNT(tr.object_id) AS post_count
FROM wp_terms t
INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
WHERE tt.taxonomy = 'category'
GROUP BY t.term_id
ORDER BY post_count DESC;

-- 4. Find posts with multiple meta conditions (avoid multiple JOINs)
SELECT p.ID, p.post_title
FROM wp_posts p
WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
  AND EXISTS (
    SELECT 1 FROM wp_postmeta
    WHERE post_id = p.ID AND meta_key = '_price' AND CAST(meta_value AS DECIMAL) > 50
  )
  AND EXISTS (
    SELECT 1 FROM wp_postmeta
    WHERE post_id = p.ID AND meta_key = '_stock_status' AND meta_value = 'instock'
  );

-- 5. Update option (useful for migration scripts)
INSERT INTO wp_options (option_name, option_value, autoload)
VALUES ('my_plugin_version', '2.0.0', 'yes')
ON DUPLICATE KEY UPDATE option_value = '2.0.0';

-- 6. Batch delete old post revisions (safely, 500 at a time)
DELETE FROM wp_posts
WHERE post_type = 'revision'
  AND post_date < DATE_SUB(NOW(), INTERVAL 30 DAY)
LIMIT 500;

-- 7. Search-replace URL (after migration) — do in batches
UPDATE wp_posts
SET post_content = REPLACE(post_content, 'http://old-domain.com', 'https://new-domain.com')
WHERE post_content LIKE '%http://old-domain.com%';

UPDATE wp_postmeta
SET meta_value = REPLACE(meta_value, 'http://old-domain.com', 'https://new-domain.com')
WHERE meta_value LIKE '%http://old-domain.com%';

-- 8. Add composite index for common WP_Query pattern
ALTER TABLE wp_posts
  ADD INDEX type_status_date (post_type, post_status, post_date);

ALTER TABLE wp_postmeta
  ADD INDEX meta_key_value (meta_key, meta_value(20));

-- 9. Check InnoDB buffer pool hit rate
SELECT
  ROUND((1 - (
    SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Innodb_buffer_pool_reads'
  ) / (
    SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Innodb_buffer_pool_read_requests'
  )) * 100, 2) AS buffer_pool_hit_rate_pct;

-- 10. Find slow queries from slow_log table (if enabled)
SELECT sql_text, query_time, rows_examined
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 10;
