# Server / GCP / AWS — Scenario-Based Problems

---

## Scenario 1: WordPress Site Goes Down Under Traffic Spike

**Scenario:**
A WordPress e-commerce site running on a single EC2 `t3.medium` instance (2 vCPU, 4 GB RAM) goes down during a product launch that drives 50x normal traffic. The server becomes unresponsive; SSH is unreachable.

**Challenge:**
Restore service immediately and architect the infrastructure to handle future spikes without downtime.

**Solution:**

**Immediate recovery (Phase 1):**
1. From AWS Console, stop and start the instance (does not lose data; assigns new IP if not Elastic IP).
2. If completely stuck, create a snapshot of the EBS volume, restore to a new instance.
3. Alternatively, use EC2 Instance Connect from the console if SSH is blocked.
4. Once accessible: `sudo service nginx restart; sudo service php8.2-fpm restart`
5. Enable full-page caching immediately:
   - Install WP Super Cache and serve cached HTML to anonymous users.
   - Or configure Nginx FastCGI cache to bypass PHP entirely for cached pages.

**Architecture redesign (Phase 2 — over the next sprint):**

```
[Route 53] → [CloudFront] → [ALB] → [ASG: 2-10x EC2 t3.large]
                                         ↓
                                    [Elasticache Redis]
                                    [RDS MySQL Multi-AZ]
                                    [S3 ← media uploads via WP Offload Media]
```

Implementation steps:
1. **Snapshot → AMI** — create an AMI from the current instance.
2. **Launch Template** — define instance type, IAM role, user data script (installs PHP-FPM, Nginx, mounts EFS).
3. **Auto Scaling Group** — min 2, max 10; target tracking: CPU < 60%.
4. **Application Load Balancer** — health check: `GET /wp-login.php` returns 200.
5. **ElastiCache Redis** — configure WordPress Redis Object Cache drop-in.
6. **RDS Multi-AZ** — move MySQL off EC2; configure read replica for SELECT queries.
7. **S3 + WP Offload Media** — move uploads directory to S3; serve via CloudFront.
8. **CloudFront** — cache everything; bypass for logged-in users (`Cookie: wordpress_logged_in_*`).
9. **WordPress config** — set `WP_HOME`/`WP_SITEURL`, configure SSL termination at ALB, fix `HTTP_X_FORWARDED_PROTO`.

**Result:** Site handles 100x traffic spike with 0 downtime; autoscaling adds instances in ~3 minutes during demand surge.

---

## Scenario 2: Database Backup and Disaster Recovery on GCP

**Scenario:**
A client's WordPress site on GCP has no formal backup strategy. A developer accidentally runs `DROP TABLE wp_posts` in production. The site is down; the client is losing revenue.

**Challenge:**
Restore the database as quickly as possible and implement a proper backup and DR strategy.

**Solution:**

**Immediate recovery:**
```bash
# Check if Cloud SQL automated backups exist (if enabled)
gcloud sql backups list --instance=wordpress-db

# List available backups
gcloud sql backups list --instance=wordpress-db --filter="status=SUCCESSFUL" \
  --sort-by="~startTime" --limit=5

# Restore to a new Cloud SQL instance (to avoid overwriting current data)
gcloud sql instances create wordpress-db-restore \
  --database-version=MYSQL_8_0 \
  --tier=db-n1-standard-2 \
  --region=us-central1

gcloud sql backups restore BACKUP_ID \
  --restore-instance=wordpress-db-restore \
  --backup-instance=wordpress-db

# Export missing table from restored instance
gcloud sql export sql wordpress-db-restore gs://my-backups/wp-posts-recovery.sql \
  --database=wordpress \
  --table=wp_posts

# Import to production
gcloud sql import sql wordpress-db gs://my-backups/wp-posts-recovery.sql \
  --database=wordpress
```

**Backup strategy implementation:**
```bash
# 1. Enable Cloud SQL automated backups with 30-day retention
gcloud sql instances patch wordpress-db \
  --backup-start-time=02:00 \
  --retained-backups-count=30 \
  --retained-transaction-log-days=7  # enables point-in-time recovery

# 2. Scheduled WP-CLI backup via Cloud Scheduler + Cloud Run
# Creates a daily mysqldump and uploads to GCS
cat > backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BUCKET="gs://my-wp-backups/database"

# Use Cloud SQL Auth Proxy
mysqldump -h 127.0.0.1 -u wp_user -p"${DB_PASSWORD}" wordpress \
  | gzip \
  | gsutil cp - "${BUCKET}/wordpress-${TIMESTAMP}.sql.gz"

# Keep only last 60 days
gsutil ls "${BUCKET}/" | sort | head -n -60 | xargs -r gsutil rm
EOF

# 3. Enable GCS versioning on media bucket
gsutil versioning set on gs://my-wp-uploads

# 4. Cross-region backup replication
gsutil rewrite -r gs://my-wp-backups/** gs://my-wp-backups-dr-region/
```

**Point-in-time recovery (PITR) — if available:**
```bash
# Restore to exact moment before the DROP TABLE (requires binary log enabled)
gcloud sql instances clone wordpress-db wordpress-db-pitr \
  --point-in-time=2026-03-29T14:22:00.000Z  # 1 minute before the incident
```

**Result:** Recovery time reduced from "potentially never" to < 30 minutes with proper backups.

---

## Scenario 3: Moving WordPress from Shared Hosting to GCP (Migration)

**Scenario:**
A business is moving their WordPress site from shared cPanel hosting to GCP Compute Engine. The site has 50 GB of uploads, 2 GB MySQL database, and 1 million monthly visitors.

**Challenge:**
Execute a zero-downtime migration with a tested rollback plan.

**Solution:**

**Phase 1 — Set up GCP infrastructure:**
```bash
# Create a GCP project and enable APIs
gcloud services enable compute.googleapis.com sqladmin.googleapis.com storage.googleapis.com

# Create Cloud SQL instance
gcloud sql instances create wordpress-prod \
  --database-version=MYSQL_8_0 \
  --tier=db-n1-standard-4 \
  --region=us-central1 \
  --availability-type=REGIONAL \  # high availability
  --storage-size=100GB \
  --storage-auto-increase

# Create database and user
gcloud sql databases create wordpress --instance=wordpress-prod
gcloud sql users create wp_user --host=% --instance=wordpress-prod \
  --password=$(openssl rand -base64 32)

# Create GCS bucket for uploads
gsutil mb -l us-central1 gs://my-wp-uploads
gsutil iam ch allUsers:objectViewer gs://my-wp-uploads  # public read
```

**Phase 2 — Sync data (while old site is still live):**
```bash
# Export MySQL from shared hosting (via SSH or phpMyAdmin)
mysqldump -u old_user -p old_db | gzip > wordpress-backup.sql.gz

# Upload and import to Cloud SQL
gsutil cp wordpress-backup.sql.gz gs://my-migration-staging/

gcloud sql import sql wordpress-prod gs://my-migration-staging/wordpress-backup.sql.gz \
  --database=wordpress

# Sync uploads directory (run repeatedly to keep in sync until cutover)
rsync -avz --delete \
  user@old-host.com:/home/user/public_html/wp-content/uploads/ \
  /tmp/uploads/

gsutil -m rsync -r -d /tmp/uploads/ gs://my-wp-uploads/
```

**Phase 3 — Configure WordPress on GCP:**
```bash
# Deploy WordPress code
git clone https://github.com/myorg/wordpress-site.git /var/www/wordpress
cd /var/www/wordpress

# wp-config.php — use Cloud SQL Auth Proxy
wp config set DB_HOST "127.0.0.1"
wp config set DB_NAME "wordpress"
wp config set DB_USER "wp_user"
wp config set DB_PASSWORD "$(gcloud secrets versions access latest --secret=wp-db-password)"

# Update URLs (do this during final cutover after DNS switch)
wp search-replace 'http://old-domain.com' 'https://new-domain.com' --all-tables
wp cache flush
```

**Phase 4 — Cutover with minimal downtime:**
1. Set DNS TTL to 60 seconds, 24 hours before cutover.
2. Put old site in maintenance mode at 2 AM.
3. Run final `rsync` for uploads and final `mysqldump` → import for database.
4. Run `wp search-replace` for the new domain.
5. Verify site works on GCP using `/etc/hosts` override.
6. Update DNS A record to GCP load balancer IP.
7. Monitor traffic shifting (60-second TTL means full cutover in ~2 minutes).
8. Keep old server available for 48 hours as rollback option.

**Rollback plan:**
- Update DNS back to old server IP (60-second TTL propagates quickly).
- Restore any writes that happened after cutover via binary log.
