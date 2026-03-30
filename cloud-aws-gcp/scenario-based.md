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

---

## Scenario 4: Migrating WordPress from Shared Hosting to AWS (EC2 + RDS + S3 + CloudFront)

**Scenario:**
A WordPress site on shared cPanel hosting has outgrown its environment: slow response times, frequent 503s during peaks, and no SSH or custom server config access. The business needs a migration to AWS with minimal downtime and a clear rollback path.

**Challenge:**
Move WordPress files, database, and media to AWS (EC2 + RDS + S3 + CloudFront) while keeping the live shared-hosting site serving traffic until DNS cutover.

**Solution:**

1. **Provision AWS infrastructure:**

```bash
#!/bin/bash
# Create VPC, subnets, and security groups (abbreviated — assumes VPC/subnet IDs exist)
REGION="us-east-1"

# RDS MySQL 8.0
aws rds create-db-instance \
  --db-instance-identifier wp-prod-db \
  --db-instance-class db.t3.medium \
  --engine mysql --engine-version 8.0 \
  --master-username wpuser \
  --master-user-password "$DB_PASS" \
  --db-name wordpress \
  --allocated-storage 50 --storage-type gp3 \
  --multi-az \
  --backup-retention-period 7 \
  --vpc-security-group-ids sg-db \
  --db-subnet-group-name wp-db-subnets

# S3 bucket for media
aws s3api create-bucket --bucket wp-prod-media --region $REGION
aws s3api put-bucket-cors --bucket wp-prod-media \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["https://example.com"],"AllowedMethods":["GET"],"MaxAgeSeconds":3600}]}'

# EC2 via launch template (bootstrap installs Nginx + PHP 8.2 + WP-CLI)
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name wp-key \
  --security-group-ids sg-web \
  --subnet-id subnet-private-a \
  --iam-instance-profile Name=wp-instance-profile \
  --user-data file://bootstrap.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=wp-prod}]'
```

2. **Migrate the database:**

```bash
# On shared hosting: export with proper charset
mysqldump -u old_user -p old_db \
  --single-transaction \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  | gzip > wordpress-$(date +%Y%m%d).sql.gz

# Upload to RDS via a temporary EC2 bastion
scp wordpress-*.sql.gz ec2-user@bastion:/tmp/
ssh ec2-user@bastion "zcat /tmp/wordpress-*.sql.gz \
  | mysql -h wp-prod-db.abc123.us-east-1.rds.amazonaws.com \
          -u wpuser -p'$DB_PASS' wordpress"
```

3. **Sync uploads to S3:**

```bash
# Install WP Offload Media Lite on the new server, then bulk-sync existing uploads
aws s3 sync /var/www/html/wp-content/uploads/ \
  s3://wp-prod-media/uploads/ \
  --acl public-read \
  --cache-control "max-age=31536000,public" \
  --exclude "*.php"

# Keep syncing incrementally until DNS cutover (run every 15 min via cron)
# crontab: */15 * * * * aws s3 sync /var/www/html/wp-content/uploads/ s3://wp-prod-media/uploads/ --acl public-read
```

4. **Configure CloudFront distribution:**

```bash
aws cloudfront create-distribution --distribution-config '{
  "Origins": {
    "Quantity": 2,
    "Items": [
      {
        "Id": "ec2-origin",
        "DomainName": "10.0.1.50",
        "CustomOriginConfig": {"HTTPPort": 80, "OriginProtocolPolicy": "http-only"}
      },
      {
        "Id": "s3-media",
        "DomainName": "wp-prod-media.s3.amazonaws.com",
        "S3OriginConfig": {"OriginAccessIdentity": ""}
      }
    ]
  },
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [{
      "PathPattern": "/wp-content/uploads/*",
      "TargetOriginId": "s3-media",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "ec2-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  },
  "Enabled": true,
  "HttpVersion": "http2"
}'
```

5. **Update wp-config.php on the new EC2:**

```php
// wp-config.php on EC2
define('DB_HOST',     'wp-prod-db.abc123.us-east-1.rds.amazonaws.com');
define('DB_NAME',     'wordpress');
define('DB_USER',     'wpuser');
define('DB_PASSWORD', getenv('DB_PASSWORD')); // set via SSM Parameter Store in bootstrap

// Tell WordPress it's behind a load balancer / CloudFront
if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
    $_SERVER['HTTPS'] = 'on';
}

define('WP_HOME',    'https://example.com');
define('WP_SITEURL', 'https://example.com');
```

6. **DNS cutover (low-risk):**
   - Set TTL to 60 seconds 24 hours before cutover.
   - Maintenance mode on old site: `wp maintenance-mode activate`
   - Run final `mysqldump` → import and final S3 sync.
   - `wp search-replace 'http://old-host.cpaneldomain.com' 'https://example.com' --all-tables`
   - Update Route 53 A record to point to the CloudFront distribution domain.
   - Monitor for 30 minutes; keep old server live for 48 hours as rollback.

---

## Scenario 5: Auto-Scaling WordPress Fleet Behind an AWS Application Load Balancer

**Scenario:**
A WordPress site has unpredictable traffic spikes (marketing campaigns, product launches). The current fixed-size fleet of 3 EC2 instances either over-provisions (expensive) or under-serves during spikes. The team wants auto-scaling that adds capacity within 3 minutes of a spike and scales down overnight to cut costs.

**Challenge:**
Build a stateless WordPress fleet that can scale horizontally behind an ALB, with WordPress files on EFS and media on S3 so every instance is identical and interchangeable.

**Solution:**

1. **Create a hardened Launch Template (user data bootstraps each new instance):**

```bash
#!/bin/bash
# bootstrap.sh — runs on every new EC2 instance at launch
set -euo pipefail

# Mount EFS for shared WordPress code
EFS_ID="fs-0abc123456"
apt-get install -y amazon-efs-utils
mkdir -p /var/www/wordpress
mount -t efs -o tls,iam ${EFS_ID}:/ /var/www/wordpress
echo "${EFS_ID}:/ /var/www/wordpress efs _netdev,tls,iam 0 0" >> /etc/fstab

# Install Nginx + PHP-FPM 8.2
add-apt-repository -y ppa:ondrej/php
apt-get install -y nginx php8.2-fpm php8.2-mysql php8.2-redis php8.2-xml php8.2-mbstring

# Retrieve DB credentials from Secrets Manager (no plaintext on disk)
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id wp/prod/db --query SecretString --output text)

# Signal to the ASG lifecycle hook that instance is ready
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
aws autoscaling complete-lifecycle-action \
  --lifecycle-hook-name wp-launch-hook \
  --auto-scaling-group-name wp-asg \
  --instance-id "$INSTANCE_ID" \
  --lifecycle-action-result CONTINUE
```

2. **Create the Auto Scaling Group with lifecycle hooks and target tracking:**

```bash
# Create ASG
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name wp-asg \
  --launch-template LaunchTemplateName=wp-lt,Version='$Latest' \
  --min-size 2 --max-size 12 --desired-capacity 2 \
  --target-group-arns "$TG_ARN" \
  --vpc-zone-identifier "subnet-priv-a,subnet-priv-b,subnet-priv-c" \
  --health-check-type ELB \
  --health-check-grace-period 300 \
  --default-instance-warmup 120

# Lifecycle hook: gives bootstrap.sh time to complete before ALB adds the instance
aws autoscaling put-lifecycle-hook \
  --auto-scaling-group-name wp-asg \
  --lifecycle-hook-name wp-launch-hook \
  --lifecycle-transition autoscaling:EC2_INSTANCE_LAUNCHING \
  --heartbeat-timeout 300 \
  --default-result ABANDON

# Scale-out: target 60% CPU (adds instances when CPU stays above 60% for 3 min)
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name wp-asg \
  --policy-name cpu-scale-out \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration \
    '{"PredefinedMetricSpecification":{"PredefinedMetricType":"ASGAverageCPUUtilization"},"TargetValue":60.0,"ScaleInCooldown":300,"ScaleOutCooldown":60}'

# Scale on ALB RequestCountPerTarget (better signal for WordPress than CPU alone)
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name wp-asg \
  --policy-name requests-per-target \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration "{
    \"PredefinedMetricSpecification\": {
      \"PredefinedMetricType\": \"ALBRequestCountPerTarget\",
      \"ResourceLabel\": \"app/wp-alb/abc123/targetgroup/wp-tg/def456\"
    },
    \"TargetValue\": 1000.0
  }"
```

3. **Configure the ALB target group and health check:**

```bash
aws elbv2 create-target-group \
  --name wp-tg \
  --protocol HTTP --port 80 \
  --vpc-id "$VPC_ID" \
  --health-check-path /wp-json/ \
  --health-check-interval-seconds 15 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200

# Stickiness OFF — sessions stored in Redis, so any instance can serve any user
aws elbv2 modify-target-group-attributes \
  --target-group-arn "$TG_ARN" \
  --attributes Key=stickiness.enabled,Value=false
```

4. **Scheduled scaling for overnight cost savings:**

```bash
# Scale down to 1 instance at midnight (UTC) — low traffic period
aws autoscaling put-scheduled-action \
  --auto-scaling-group-name wp-asg \
  --scheduled-action-name scale-down-night \
  --recurrence "0 0 * * *" \
  --min-size 1 --max-size 12 --desired-capacity 1

# Scale back up at 7 AM UTC before business hours
aws autoscaling put-scheduled-action \
  --auto-scaling-group-name wp-asg \
  --scheduled-action-name scale-up-morning \
  --recurrence "0 7 * * *" \
  --min-size 2 --max-size 12 --desired-capacity 2
```

5. **WordPress configuration for stateless operation (wp-config.php additions):**

```php
// Redis object cache (Predis/PhpRedis drop-in)
define('WP_CACHE', true);
define('WP_REDIS_HOST', 'wp-redis.abc123.cache.amazonaws.com');
define('WP_REDIS_PORT', 6379);
define('WP_REDIS_AUTH', getenv('REDIS_AUTH_TOKEN'));
define('WP_REDIS_TLS',  true);

// Disable WordPress cron — use EventBridge Scheduler instead (avoids cron pileup on scale-out)
define('DISABLE_WP_CRON', true);

// Trust X-Forwarded-Proto from ALB
if ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '' === 'https') {
    $_SERVER['HTTPS'] = 'on';
}
```

---

## Scenario 6: GCP Cloud SQL Failover for WordPress with Zero Downtime

**Scenario:**
A WordPress site runs on GCP Compute Engine with a Cloud SQL for MySQL (High Availability) instance. During a planned maintenance window, the HA failover needs to be tested, and a runbook created so the on-call team can execute it within 5 minutes if a real outage occurs.

**Challenge:**
Execute a manual Cloud SQL failover, verify WordPress recovers automatically, and automate monitoring so the team is alerted within 60 seconds of a failover event.

**Solution:**

1. **Verify HA is configured and understand the topology:**

```bash
# Check HA configuration
gcloud sql instances describe wordpress-prod \
  --format="yaml(name, databaseVersion, settings.availabilityType, failoverReplica)"

# Expected output:
# settings:
#   availabilityType: REGIONAL   ← required for HA failover
# failoverReplica:
#   available: true
#   name: wordpress-prod-replica
```

2. **Configure WordPress to handle brief connection interruptions gracefully:**

```php
// wp-config.php — increase MySQL connect retries and timeout tolerance
define('DB_HOST', '/cloudsql/project-id:us-central1:wordpress-prod');
// If using Cloud SQL Proxy TCP mode:
// define('DB_HOST', '127.0.0.1:3306');

// Increase wpdb connection retry (add to wp-config.php via mu-plugin)
```

```php
// mu-plugins/db-reconnect.php — retry on transient connection loss during failover
add_filter('query', function(string $query) {
    global $wpdb;
    static $retries = 0;
    if ($wpdb->last_error && str_contains($wpdb->last_error, 'MySQL server has gone away') && $retries < 3) {
        $retries++;
        $wpdb->check_connection();
        return $query; // wpdb will retry
    }
    $retries = 0;
    return $query;
});
```

3. **Perform and monitor the failover:**

```bash
#!/bin/bash
# failover-runbook.sh — execute during incident or scheduled test

INSTANCE="wordpress-prod"
PROJECT="my-gcp-project"

echo "[$(date)] Starting Cloud SQL failover test..."

# Trigger manual failover (promotes standby to primary, < 60 seconds)
gcloud sql instances failover "$INSTANCE" --project="$PROJECT"

echo "[$(date)] Failover triggered. Monitoring instance availability..."

# Poll until instance is RUNNABLE again
while true; do
  STATE=$(gcloud sql instances describe "$INSTANCE" \
    --project="$PROJECT" \
    --format="value(state)" 2>/dev/null)
  echo "[$(date)] Instance state: $STATE"
  if [[ "$STATE" == "RUNNABLE" ]]; then
    echo "[$(date)] Instance is back online."
    break
  fi
  sleep 5
done

# Verify WordPress is serving requests
HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" https://example.com/wp-json/)
echo "[$(date)] WordPress HTTP status after failover: $HTTP_CODE"
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "SUCCESS: WordPress recovered automatically."
else
  echo "WARNING: WordPress returned $HTTP_CODE — manual investigation required."
fi
```

4. **Set up Cloud Monitoring alert for failover events:**

```bash
# Create a log-based alert for Cloud SQL failover events
gcloud logging metrics create cloud-sql-failover \
  --description="Cloud SQL failover detected" \
  --log-filter='resource.type="cloudsql_database"
    protoPayload.methodName="cloudsql.instances.failover"'

# Create alerting policy on the metric
gcloud alpha monitoring policies create \
  --notification-channels="projects/my-gcp-project/notificationChannels/abc123" \
  --display-name="Cloud SQL Failover Alert" \
  --condition-display-name="Failover event" \
  --condition-filter='metric.type="logging.googleapis.com/user/cloud-sql-failover"' \
  --condition-threshold-value=1 \
  --condition-threshold-duration=0s \
  --condition-comparison=COMPARISON_GT
```

5. **Post-failover verification checklist:**

```bash
# Confirm new primary endpoint (Cloud SQL Proxy handles this transparently)
gcloud sql instances describe wordpress-prod \
  --format="value(ipAddresses[0].ipAddress)"

# Check that replica was re-provisioned in the original zone
gcloud sql instances describe wordpress-prod \
  --format="yaml(replicaNames, serverCaCert.expirationTime)"

# Verify no data loss: compare row counts on key tables
mysql -h 127.0.0.1 -u wpuser -p"$DB_PASS" wordpress \
  -e "SELECT COUNT(*) as posts FROM wp_posts WHERE post_status='publish';
      SELECT MAX(comment_date) as last_comment FROM wp_comments;
      SELECT option_value FROM wp_options WHERE option_name='siteurl';"
```

---

## Scenario 7: Lambda@Edge A/B Testing Redirects for WordPress

**Scenario:**
The marketing team wants to A/B test two versions of a landing page (`/landing-v1/` vs `/landing-v2/`) without changing WordPress or deploying new code. 50% of visitors should see each version, the assignment must be sticky per visitor (same version on every visit), and the experiment must be togglable without a CloudFront deployment.

**Challenge:**
Implement A/B routing at the CloudFront edge layer using Lambda@Edge, with sticky assignment via a cookie and experiment config stored in SSM Parameter Store (so it can be toggled without redeploying Lambda).

**Solution:**

1. **Lambda@Edge function (Viewer Request trigger — runs before cache check):**

```javascript
// ab-test.js — deployed as Lambda@Edge in us-east-1
// Trigger: CloudFront Viewer Request

'use strict';

// A/B test configuration (read from cookie or randomly assign)
const EXPERIMENT = {
  cookieName: 'ab_landing',
  variants:   ['v1', 'v2'],
  split:      0.5,   // 50% chance of v2
  pathPrefix: '/landing-',
};

exports.handler = async (event) => {
  const request  = event.Records[0].cf.request;
  const headers  = request.headers;
  const uri      = request.uri;

  // Only apply A/B test to /landing* paths
  if (!uri.startsWith('/landing')) {
    return request;
  }

  // Check for existing assignment cookie
  const cookieHeader = headers.cookie?.[0]?.value ?? '';
  const match = cookieHeader.match(new RegExp(`${EXPERIMENT.cookieName}=([^;]+)`));
  let variant = match ? match[1] : null;

  // Assign variant if no existing cookie
  if (!variant || !EXPERIMENT.variants.includes(variant)) {
    variant = Math.random() < EXPERIMENT.split ? 'v2' : 'v1';
  }

  // Rewrite URI to the assigned variant
  const newUri = `/landing-${variant}/`;
  if (uri !== newUri) {
    request.uri = newUri;
  }

  // Set the sticky cookie in the response via a custom header
  // (Lambda@Edge Viewer Request can't set response headers directly;
  //  use a custom request header and handle in Origin Response trigger)
  request.headers['x-ab-variant'] = [{ key: 'X-Ab-Variant', value: variant }];

  return request;
};
```

2. **Origin Response trigger — set the sticky cookie:**

```javascript
// ab-test-response.js — Lambda@Edge Origin Response trigger
'use strict';

exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const request  = event.Records[0].cf.request;

  const variant = request.headers['x-ab-variant']?.[0]?.value;

  if (variant) {
    // Set a 30-day sticky cookie
    response.headers['set-cookie'] = [{
      key:   'Set-Cookie',
      value: `ab_landing=${variant}; Path=/; Max-Age=2592000; SameSite=Lax`,
    }];
    // Add variant to response for debugging / analytics
    response.headers['x-ab-variant'] = [{ key: 'X-Ab-Variant', value: variant }];
  }

  return response;
};
```

3. **Deploy Lambda@Edge and associate with CloudFront:**

```bash
# Package and deploy Lambda (must be in us-east-1 for Lambda@Edge)
zip ab-test.zip ab-test.js
aws lambda create-function \
  --function-name wp-ab-test-viewer-request \
  --runtime nodejs20.x \
  --role arn:aws:iam::123456789:role/lambda-edge-role \
  --handler ab-test.handler \
  --zip-file fileb://ab-test.zip \
  --region us-east-1

# Publish a version (Lambda@Edge requires a numbered version, not $LATEST)
VERSION=$(aws lambda publish-version \
  --function-name wp-ab-test-viewer-request \
  --region us-east-1 \
  --query Version --output text)

echo "Deployed Lambda@Edge version: $VERSION"

# Associate with CloudFront distribution (update the cache behavior)
# In aws cloudfront update-distribution, add LambdaFunctionAssociations:
# EventType: viewer-request
# LambdaFunctionARN: arn:aws:lambda:us-east-1:123456789:function:wp-ab-test-viewer-request:$VERSION
```

4. **Track A/B variant in GA4 via the response header:**

```javascript
// GTM — Custom HTML tag, fires on All Pages
// Reads the X-Ab-Variant response header via a meta tag injected server-side

// In WordPress (functions.php) — inject variant into data layer
add_action('wp_head', function() {
    if (!isset($_COOKIE['ab_landing'])) return;
    $variant = sanitize_key($_COOKIE['ab_landing']);
    echo "<script>window.dataLayer=window.dataLayer||[];";
    echo "window.dataLayer.push({event:'ab_assignment',ab_variant:" . wp_json_encode($variant) . "});</script>";
}, 1);
```

5. **Toggle the experiment without redeploying Lambda — use a CloudFront custom header:**

```bash
# Add a custom origin header in CloudFront to pass experiment config
# Lambda reads this header to enable/disable the test
aws cloudfront update-distribution \
  --id E1234ABCDEF \
  --distribution-config "$(aws cloudfront get-distribution-config \
    --id E1234ABCDEF --query DistributionConfig \
    | jq '.Origins.Items[0].CustomHeaders.Items += [{"HeaderName":"X-Ab-Enabled","HeaderValue":"true","Quantity":1}]')"

# To pause the experiment: set X-Ab-Enabled to "false" in CloudFront origin headers
# Lambda checks: if (request.headers['x-ab-enabled']?.[0]?.value !== 'true') return request;
```
