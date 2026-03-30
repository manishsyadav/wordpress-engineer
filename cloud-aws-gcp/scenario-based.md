# Server / GCP / AWS — Scenario-Based Questions

> Real-world cloud infrastructure scenarios with complete solutions.

---

## Scenario 1: WordPress on AWS with High Availability

**The situation:** A WordPress e-commerce site currently runs on a single EC2 instance. During a flash sale, the server crashes under load. You are asked to redesign the architecture for high availability, horizontal scaling, and zero single points of failure.

**Architecture overview:**
```
Internet → Route 53 → CloudFront → ALB → ASG (EC2 × 2-10)
                                      ↓
                              ElastiCache Redis (Multi-AZ)
                              RDS Aurora MySQL (Multi-AZ)
                              S3 (media) ← wp-content/uploads
```

**Solution:**

```bash
#!/bin/bash
# WordPress HA Infrastructure Setup

set -euo pipefail
REGION="us-east-1"
VPC_ID="vpc-0abc123"

# 1. Security Groups (layered perimeter)
ALB_SG=$(aws ec2 create-security-group \
  --group-name wp-alb-sg --description "WordPress ALB" \
  --vpc-id $VPC_ID --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $ALB_SG \
  --ip-permissions '[{"IpProtocol":"tcp","FromPort":443,"ToPort":443,"IpRanges":[{"CidrIp":"0.0.0.0/0"}]},{"IpProtocol":"tcp","FromPort":80,"ToPort":80,"IpRanges":[{"CidrIp":"0.0.0.0/0"}]}]'

WEB_SG=$(aws ec2 create-security-group \
  --group-name wp-web-sg --description "WordPress web servers" \
  --vpc-id $VPC_ID --query 'GroupId' --output text)
# Accept traffic from ALB only
aws ec2 authorize-security-group-ingress --group-id $WEB_SG \
  --ip-permissions "[{\"IpProtocol\":\"tcp\",\"FromPort\":80,\"ToPort\":80,\"UserIdGroupPairs\":[{\"GroupId\":\"$ALB_SG\"}]}]"

# 2. RDS Aurora MySQL Multi-AZ
aws rds create-db-cluster \
  --db-cluster-identifier wp-aurora-cluster \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.02.0 \
  --master-username wpuser \
  --master-user-password "$DB_PASS" \
  --database-name wordpress \
  --db-subnet-group-name wp-db-subnets \
  --vpc-security-group-ids $WEB_SG \
  --backup-retention-period 7 \
  --storage-encrypted \
  --deletion-protection

# 3. ElastiCache Redis Multi-AZ
aws elasticache create-replication-group \
  --replication-group-id wp-redis \
  --description "WordPress object cache and sessions" \
  --num-cache-clusters 2 \
  --cache-node-type cache.t3.small \
  --engine redis --engine-version 7.0 \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "$REDIS_AUTH" \
  --multi-az-enabled \
  --automatic-failover-enabled

# 4. Auto Scaling Group with target tracking
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name wp-asg \
  --launch-template LaunchTemplateName=wp-lt,Version='$Latest' \
  --min-size 2 --max-size 10 --desired-capacity 2 \
  --target-group-arns "$TG_ARN" \
  --vpc-zone-identifier "subnet-priv-a,subnet-priv-b" \
  --health-check-type ELB \
  --health-check-grace-period 300

aws autoscaling put-scaling-policy \
  --auto-scaling-group-name wp-asg \
  --policy-name cpu-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration \
    '{"PredefinedMetricSpecification":{"PredefinedMetricType":"ASGAverageCPUUtilization"},"TargetValue":60.0}'
```

**Key takeaways:**
- Security groups create a layered network perimeter: internet → ALB → EC2 → RDS
- Aurora Multi-AZ provides automatic failover with under 30 seconds downtime
- ElastiCache Redis Multi-AZ ensures cache availability survives an AZ failure
- S3 offloading is the prerequisite for horizontal web-tier scaling

---

## Scenario 2: Disaster Recovery with RTO < 15 Minutes

**The situation:** The site has had two incidents where the primary RDS instance was unavailable for 45 minutes. Management requires RTO of 15 minutes and RPO of 5 minutes. You need to design and implement a DR strategy across AWS regions.

**Solution:**

```bash
#!/bin/bash
# Disaster Recovery Setup and Failover Runbook

PRIMARY_REGION="us-east-1"
DR_REGION="us-west-2"

echo "=== SETUP: Aurora Global Database (< 1s replication lag) ==="
aws rds create-global-cluster \
  --global-cluster-identifier wp-global-cluster \
  --source-db-cluster-identifier \
    arn:aws:rds:${PRIMARY_REGION}:123456789:cluster:wp-aurora-cluster \
  --region $PRIMARY_REGION

# Add DR region as a secondary cluster
aws rds create-db-cluster \
  --db-cluster-identifier wp-dr-cluster \
  --global-cluster-identifier wp-global-cluster \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.02.0 \
  --db-subnet-group-name wp-db-subnets-dr \
  --region $DR_REGION

echo "=== SETUP: S3 Cross-Region Replication for media ==="
aws s3api put-bucket-replication \
  --bucket wp-media-prod \
  --replication-configuration '{
    "Role": "arn:aws:iam::123456789:role/s3-replication-role",
    "Rules": [{
      "Status": "Enabled",
      "Destination": {
        "Bucket": "arn:aws:s3:::wp-media-dr",
        "ReplicationTime": {"Status": "Enabled", "Time": {"Minutes": 15}}
      }
    }]
  }'

echo "=== SETUP: Route 53 Failover DNS ==="
# Primary health check (10s interval, 3 failures = 30s to failover)
PRIMARY_HC_ID=$(aws route53 create-health-check \
  --caller-reference "primary-$(date +%s)" \
  --health-check-config '{
    "Port": 443, "Type": "HTTPS",
    "ResourcePath": "/",
    "FullyQualifiedDomainName": "mysite.com",
    "RequestInterval": 10,
    "FailureThreshold": 3
  }' \
  --query 'HealthCheck.Id' --output text)

echo ""
echo "=== FAILOVER RUNBOOK (execute during incident) ==="

# Step 1: Promote DR cluster to standalone writable
echo "Step 1: Promoting DR cluster..."
aws rds remove-from-global-cluster \
  --db-cluster-identifier arn:aws:rds:${DR_REGION}:123456789:cluster:wp-dr-cluster \
  --global-cluster-identifier wp-global-cluster \
  --region $DR_REGION

aws rds wait db-cluster-available \
  --db-cluster-identifier wp-dr-cluster \
  --region $DR_REGION

# Step 2: Get new endpoint
DR_ENDPOINT=$(aws rds describe-db-clusters \
  --db-cluster-identifier wp-dr-cluster \
  --region $DR_REGION \
  --query 'DBClusters[0].Endpoint' --output text)
echo "Step 2: New DB endpoint: $DR_ENDPOINT"

# Step 3: Scale DR ASG to full capacity
echo "Step 3: Scaling up DR web tier..."
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name wp-asg-dr \
  --desired-capacity 4 \
  --region $DR_REGION

# Step 4: Route 53 auto-fails over. Monitor:
echo "Step 4: Monitoring DNS propagation..."
watch -n 5 'dig +short mysite.com'

echo "Failover complete. Estimated elapsed time: 8-12 minutes."
```

**Key takeaways:**
- Aurora Global Database replicates with under 1 second lag — far better than 5-minute RPO
- Route 53 health checks with 10-second intervals and 3 failure threshold = ~30 second DNS failover
- A warm standby ASG at minimum capacity eliminates instance boot time from RTO
- Document and drill the runbook quarterly — the RTO clock starts at detection, not declaration

---

## Scenario 3: Secrets Management Migration

**The situation:** You inherit a site where DB credentials, API keys, and SMTP passwords are stored in `wp-config.php` as plaintext, committed to Git. You need to migrate to AWS Secrets Manager with zero downtime, prevent future leakage, and set up automatic rotation.

**Solution:**

```bash
#!/bin/bash
# Migrate plaintext secrets in wp-config.php to AWS Secrets Manager

echo "=== 1. Store secrets in Secrets Manager ==="

aws secretsmanager create-secret \
  --name "wp/prod/database" \
  --secret-string '{
    "DB_NAME":     "wordpress_prod",
    "DB_USER":     "wp_db_user",
    "DB_PASSWORD": "CurrentP@ssword123",
    "DB_HOST":     "wp-prod.cluster-abc.us-east-1.rds.amazonaws.com"
  }'

aws secretsmanager create-secret \
  --name "wp/prod/stripe" \
  --secret-string '{
    "STRIPE_SECRET_KEY":     "sk_live_xxxx",
    "STRIPE_WEBHOOK_SECRET": "whsec_xxxx"
  }'

echo "=== 2. IAM policy for EC2 instance profile ==="
aws iam put-role-policy \
  --role-name wp-instance-role \
  --policy-name wp-secrets-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:wp/prod/*"
    }]
  }'

echo "=== 3. Enable auto-rotation for DB secret ==="
aws secretsmanager rotate-secret \
  --secret-id "wp/prod/database" \
  --rotation-lambda-arn \
    "arn:aws:lambda:us-east-1:123:function:SecretsManagerRDSMySQLRotationSingleUser" \
  --rotation-rules '{"AutomaticallyAfterDays": 30}'
```

```php
<?php
// wp-config.php — no plaintext secrets, reads from Secrets Manager at runtime

function wp_get_secret(string $secretId): array {
    static $cache = [];
    if (isset($cache[$secretId])) return $cache[$secretId];

    $output = shell_exec(
        "aws secretsmanager get-secret-value --secret-id {$secretId} --query SecretString --output text 2>/dev/null"
    );
    if (! $output) {
        error_log("wp_get_secret: failed to retrieve {$secretId}");
        return [];
    }
    return $cache[$secretId] = json_decode($output, true) ?? [];
}

$db = wp_get_secret('wp/prod/database');
define('DB_NAME',     $db['DB_NAME']     ?? '');
define('DB_USER',     $db['DB_USER']     ?? '');
define('DB_PASSWORD', $db['DB_PASSWORD'] ?? '');
define('DB_HOST',     $db['DB_HOST']     ?? 'localhost');
define('DB_CHARSET', 'utf8mb4');

$stripe = wp_get_secret('wp/prod/stripe');
define('STRIPE_SECRET_KEY',     $stripe['STRIPE_SECRET_KEY']     ?? '');
define('STRIPE_WEBHOOK_SECRET', $stripe['STRIPE_WEBHOOK_SECRET'] ?? '');

$table_prefix = 'wp_';
define('WP_DEBUG', false);
if (! defined('ABSPATH')) define('ABSPATH', __DIR__ . '/');
require_once ABSPATH . 'wp-settings.php';
```

```bash
# Pre-commit hook to block future secret commits
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
PATTERNS=("DB_PASSWORD\s*=" "sk_live_" "AKIA[A-Z0-9]{16}" "-----BEGIN.*PRIVATE KEY")
for file in $(git diff --cached --name-only --diff-filter=ACM); do
  for pat in "${PATTERNS[@]}"; do
    if git show ":$file" 2>/dev/null | grep -qP "$pat"; then
      echo "BLOCKED: Potential secret in $file ($pat)"
      exit 1
    fi
  done
done
EOF
chmod +x .git/hooks/pre-commit

# Rewrite Git history to remove old credentials (run ONCE after migration)
# java -jar bfg.jar --replace-text secrets.txt .git
# git reflog expire --expire=now --all && git gc --prune=now --aggressive
# git push --force
echo "IMPORTANT: Use BFG Repo Cleaner to rewrite history — adding to .gitignore is not enough."
```

**Key takeaways:**
- IAM instance profiles eliminate the need for any credentials on the filesystem
- Static caching in `wp_get_secret()` ensures a single AWS API call per secret per PHP process
- The pre-commit hook prevents future leaks; install it org-wide via a Git template directory
- After migrating, rewrite Git history with BFG Repo Cleaner to invalidate any leaked credentials already in the repository history

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
