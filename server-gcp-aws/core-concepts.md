# Server / GCP / AWS — Core Concepts

> Cloud infrastructure essentials for hosting WordPress at scale.

---

## 1. EC2 / Compute Engine

**AWS EC2** and **GCP Compute Engine** are the foundational virtual machine services. For WordPress, the common instance types are:
- **AWS:** `t3.medium` (burstable, dev/staging), `m5.xlarge` (production)
- **GCP:** `e2-medium` (dev), `n2-standard-4` (production)

Key concepts: AMI/image selection (Amazon Linux 2023, Ubuntu), instance types, storage (EBS gp3 volumes), placement groups, spot/preemptible instances for cost savings, and user-data scripts for bootstrapping (installing Nginx, PHP-FPM, wp-cli).

```bash
# Launch an EC2 instance with user data to bootstrap WordPress dependencies
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name my-keypair \
  --security-group-ids sg-0abc123def456789 \
  --subnet-id subnet-0abc123def456789 \
  --user-data file://bootstrap-wordpress.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=wp-prod}]' \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]'
```

---

## 2. RDS / Cloud SQL

Managed relational databases eliminate the burden of patching, backups, and replication. For WordPress, use **MySQL 8.0** or **Aurora MySQL** (AWS) / **Cloud SQL for MySQL** (GCP).

Key settings for WordPress:
- `max_connections = 200` (match PHP-FPM pool size)
- `innodb_buffer_pool_size` = 70-80% of DB instance RAM
- Multi-AZ deployment for automatic failover
- Read replicas for analytics/reporting queries
- Automated daily snapshots with 7-day retention

```bash
# Create RDS MySQL 8.0 instance
aws rds create-db-instance \
  --db-instance-identifier wp-prod-db \
  --db-instance-class db.t3.medium \
  --engine mysql \
  --engine-version 8.0 \
  --master-username wpuser \
  --master-user-password "$DB_PASS" \
  --db-name wordpress \
  --allocated-storage 50 \
  --storage-type gp3 \
  --multi-az \
  --backup-retention-period 7 \
  --vpc-security-group-ids sg-db-only
```

---

## 3. S3 / Google Cloud Storage

Object storage is used to offload WordPress media (`wp-content/uploads/`) from web servers — essential for multi-server setups where the filesystem isn't shared. Plugins like **WP Offload Media** or **GCS Proxy** handle the integration.

Benefits: virtually unlimited storage, CDN integration, versioning, lifecycle policies (move old media to cheaper storage tiers), cross-region replication.

```bash
# Create an S3 bucket for WP media with correct public-read policy
aws s3api create-bucket \
  --bucket my-wp-media \
  --region us-east-1

# Sync uploads directory to S3
aws s3 sync /var/www/html/wp-content/uploads/ s3://my-wp-media/uploads/ \
  --acl public-read \
  --delete \
  --cache-control "max-age=31536000"

# Set bucket CORS for front-end font/media access
aws s3api put-bucket-cors --bucket my-wp-media --cors-configuration file://cors.json
```

---

## 4. CloudFront / Cloud CDN

A CDN caches static assets (images, CSS, JS) and optionally HTML at edge locations close to visitors, dramatically reducing origin server load and improving TTFB globally.

**CloudFront behaviours for WordPress:**
- `/wp-content/*` → S3 origin, long TTL (1 year)
- `/wp-admin/*` → EC2 origin, no cache (bypass)
- `/*` → EC2 origin, short TTL (5 min) or Lambda@Edge for smart caching

```bash
# Invalidate CloudFront cache after a new deploy
aws cloudfront create-invalidation \
  --distribution-id E1234ABCDEF \
  --paths "/wp-content/themes/my-theme/*" "/*.css" "/*.js"

# Check distribution status
aws cloudfront get-distribution \
  --id E1234ABCDEF \
  --query 'Distribution.Status'
```

---

## 5. IAM — Identity and Access Management

IAM controls **who** can do **what** on which **resources**. For WordPress on AWS:
- EC2 instances use **instance profiles** (IAM role attached to the instance) to access S3/Secrets Manager — no hardcoded credentials
- Application code uses the **principle of least privilege** — only the specific S3 bucket and KMS key the app needs
- Use **IAM conditions** to restrict access by VPC, MFA, source IP

```json
// IAM policy: EC2 instance can read from S3 media bucket and Secrets Manager
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::my-wp-media/*"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:wp/prod/*"
    }
  ]
}
```

---

## 6. Secrets Manager / Secret Manager (GCP)

Never store database passwords or API keys in `wp-config.php` as plaintext. **AWS Secrets Manager** and **GCP Secret Manager** store, rotate, and audit access to secrets. WordPress reads them at runtime via the AWS SDK or `gcloud` CLI.

```php
// wp-config.php — fetch DB credentials from AWS Secrets Manager at runtime
if (! defined('ABSPATH')) {
    $secret = shell_exec("aws secretsmanager get-secret-value --secret-id wp/prod/db --query SecretString --output text 2>/dev/null");
    $creds  = json_decode($secret, true);
    define('DB_NAME',     $creds['dbname']);
    define('DB_USER',     $creds['username']);
    define('DB_PASSWORD', $creds['password']);
    define('DB_HOST',     $creds['host']);
}
```

```bash
# Store a secret
aws secretsmanager create-secret \
  --name wp/prod/db \
  --secret-string '{"username":"wpuser","password":"s3cr3t","dbname":"wordpress","host":"rds.endpoint.rds.amazonaws.com"}'

# Rotate automatically every 30 days
aws secretsmanager rotate-secret \
  --secret-id wp/prod/db \
  --rotation-rules AutomaticallyAfterDays=30
```

---

## 7. Auto Scaling

Auto Scaling Groups (ASG) on AWS and Managed Instance Groups (MIG) on GCP automatically add or remove instances based on load. For WordPress, the application tier is stateless (uploads on S3, sessions in Redis/Memcached), enabling horizontal scaling.

Key concepts: **launch templates**, **scaling policies** (target tracking — keep average CPU at 60%), **lifecycle hooks** (run deploy scripts on launch before adding to LB), **warm pools** (pre-warmed instances for faster scale-out).

```bash
# Create an Auto Scaling Group targeting 60% CPU
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name wp-asg \
  --launch-template LaunchTemplateName=wp-template,Version='$Latest' \
  --min-size 2 --max-size 10 --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:... \
  --vpc-zone-identifier "subnet-aaa,subnet-bbb"

aws autoscaling put-scaling-policy \
  --auto-scaling-group-name wp-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{"PredefinedMetricSpecification":{"PredefinedMetricType":"ASGAverageCPUUtilization"},"TargetValue":60.0}'
```

---

## 8. VPC — Virtual Private Cloud

A VPC is an isolated network within the cloud provider. WordPress architecture typically uses:
- **Public subnets:** ALB/NAT Gateway
- **Private subnets:** EC2 web servers (no public IP), RDS, ElastiCache
- **Security groups:** stateful firewall rules (web servers allow 80/443 from ALB only; DB allows 3306 from web servers only)
- **NACLs:** stateless subnet-level firewall for additional layered defence

```bash
# Security group: allow web traffic from ALB only
aws ec2 create-security-group \
  --group-name wp-web-sg \
  --description "WordPress web servers — allow from ALB only" \
  --vpc-id vpc-0abc123

aws ec2 authorize-security-group-ingress \
  --group-id sg-web \
  --protocol tcp --port 80 \
  --source-group sg-alb  # ALB security group, not 0.0.0.0/0
```

---

## 9. Lambda / Cloud Functions

Serverless functions run code without managing servers. Useful in WordPress architectures for:
- **Lambda@Edge:** modify CloudFront requests/responses (A/B testing, auth, redirects)
- **Image resizing:** resize uploaded images on-the-fly triggered by S3 events
- **Webhooks:** lightweight endpoint to trigger WP cron, Slack notifications, or cache purges
- **Scheduled tasks:** replace WP-Cron for reliable background jobs

```javascript
// Lambda: resize image on S3 upload trigger (Node.js)
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

exports.handler = async (event) => {
  const s3 = new S3Client({});
  const bucket = event.Records[0].s3.bucket.name;
  const key    = decodeURIComponent(event.Records[0].s3.object.key);

  const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const resized = await sharp(await Body.transformToByteArray())
    .resize(800, null, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key:    key.replace(/\.[^.]+$/, '-800w.webp'),
    Body:   resized,
    ContentType: 'image/webp',
    CacheControl: 'max-age=31536000',
  }));
};
```

---

## 10. Monitoring — CloudWatch / Cloud Monitoring + Alerting

Observability includes **metrics** (CPU, memory, request rate, error rate), **logs** (Nginx access/error, PHP-FPM, MySQL slow query), and **traces** (X-Ray / Cloud Trace). Set alarms for:
- CPU > 80% for 5 minutes → scale out or alert
- 5xx error rate > 1% → page on-call
- RDS free storage < 20% → auto-extend or alert
- ALB latency p99 > 2s → investigate

```bash
# CloudWatch alarm: 5xx errors > 10 in 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name wp-5xx-errors \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:on-call-pager \
  --dimensions Name=LoadBalancer,Value=app/wp-alb/abc123

# Stream PHP-FPM logs to CloudWatch Logs
aws logs create-log-group --log-group-name /wordpress/php-fpm
# Then configure the CloudWatch agent on EC2 to tail /var/log/php-fpm/www.log
```
