# Cloud — AWS & GCP — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is an EC2 instance and how do instance families differ?**
**A:** EC2 is AWS's virtual machine service. Instance families are optimised for different workloads: `t3` (burstable general-purpose), `c5` (compute-optimised), `r5` (memory-optimised).
```bash
# Launch a t3.medium with an Amazon Linux 2 AMI
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.medium \
  --key-name my-key
```

---

**Q2: What is S3 and what are its main storage classes?**
**A:** S3 is AWS object storage. Classes trade cost vs retrieval speed: `STANDARD`, `STANDARD_IA`, `ONE_ZONE_IA`, `GLACIER`, `GLACIER_DEEP_ARCHIVE`, and `INTELLIGENT_TIERING`.
```bash
aws s3 cp ./backup.tar.gz s3://my-bucket/backups/ \
  --storage-class STANDARD_IA
```

---

**Q3: What is an IAM role and why use it instead of access keys?**
**A:** A role is an identity with attached policies that AWS services assume at runtime. It eliminates long-lived credentials stored in config files.
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::my-bucket/*"
}
```

---

**Q4: What is a VPC and why is it important?**
**A:** A Virtual Private Cloud is a logically isolated network in AWS. It lets you control IP ranges, subnets, route tables, and inbound/outbound traffic rules.
```bash
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-abc --cidr-block 10.0.1.0/24
```

---

**Q5: What is the difference between a Security Group and a Network ACL?**
**A:** Security Groups are stateful and attached to instances; NACLs are stateless and attached to subnets. NACLs process rules in order by number.
```bash
# Allow port 443 inbound on a security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-abc123 \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

---

**Q6: What is Amazon RDS and what is a Multi-AZ deployment?**
**A:** RDS is a managed relational database service. Multi-AZ maintains a synchronous standby replica in another Availability Zone for automatic failover.
```bash
aws rds create-db-instance \
  --db-instance-identifier my-db \
  --db-instance-class db.t3.medium \
  --engine mysql \
  --multi-az
```

---

**Q7: What is CloudFront and how does it work?**
**A:** CloudFront is AWS's CDN. It caches content at edge locations globally, reducing latency by serving assets from the node closest to the user.
```bash
aws cloudfront create-invalidation \
  --distribution-id EDFDVBD6EXAMPLE \
  --paths "/wp-content/*"
```

---

**Q8: What is AWS Lambda and what is a cold start?**
**A:** Lambda runs code without provisioning servers. A cold start is the initialisation delay when a new execution environment is spun up for the first time or after idle.
```bash
aws lambda invoke \
  --function-name my-function \
  --payload '{"key":"value"}' \
  output.json
```

---

**Q9: What is Route 53 and what record types does it support?**
**A:** Route 53 is AWS's DNS service. Common record types: `A` (IPv4), `AAAA` (IPv6), `CNAME` (alias to hostname), `ALIAS` (AWS-specific root-domain alias), `MX`, `TXT`.
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234 \
  --change-batch file://record.json
```

---

**Q10: What is an Auto Scaling Group?**
**A:** An ASG manages a fleet of EC2 instances, automatically adding or removing them based on scaling policies and health checks.
```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name my-asg \
  --launch-template LaunchTemplateId=lt-abc,Version='$Latest' \
  --min-size 2 --max-size 10 --desired-capacity 2
```

---

**Q11: What is AWS Secrets Manager and how does it differ from SSM Parameter Store?**
**A:** Both store secrets securely. Secrets Manager supports automatic rotation and costs more; Parameter Store is cheaper and uses `SecureString` for encrypted values.
```bash
aws secretsmanager get-secret-value \
  --secret-id prod/db/password \
  --query SecretString --output text
```

---

**Q12: What is a NAT Gateway and when do you need one?**
**A:** A NAT Gateway lets instances in private subnets initiate outbound internet traffic without being directly reachable from the internet.
```bash
aws ec2 create-nat-gateway \
  --subnet-id subnet-public-abc \
  --allocation-id eipalloc-12345
```

---

**Q13: What is GCP Compute Engine and how does it compare to EC2?**
**A:** Compute Engine is GCP's IaaS VM service, equivalent to EC2. It offers per-second billing, live migration, and custom machine types.
```bash
gcloud compute instances create my-vm \
  --machine-type=e2-medium \
  --zone=us-central1-a \
  --image-family=debian-11
```

---

**Q14: What is Google Cloud Storage (GCS)?**
**A:** GCS is GCP's object storage, equivalent to S3. It uses storage classes: `STANDARD`, `NEARLINE`, `COLDLINE`, and `ARCHIVE`.
```bash
gsutil cp ./backup.tar.gz gs://my-bucket/backups/
gsutil rewrite -s nearline gs://my-bucket/old/**
```

---

**Q15: What is Cloud SQL in GCP?**
**A:** Cloud SQL is GCP's fully managed relational database service, supporting MySQL, PostgreSQL, and SQL Server with automated backups and failover replicas.
```bash
gcloud sql instances create my-db \
  --database-version=MYSQL_8_0 \
  --tier=db-n1-standard-2 \
  --region=us-central1
```

---

**Q16: What is a presigned URL in S3?**
**A:** A presigned URL grants temporary, time-limited access to a private S3 object without requiring AWS credentials from the requester.
```bash
aws s3 presign s3://my-bucket/private-file.pdf \
  --expires-in 3600
```

---

**Q17: What are S3 lifecycle rules?**
**A:** Lifecycle rules automate transitioning objects to cheaper storage classes or expiring them after a set number of days.
```json
{
  "Rules": [{
    "Status": "Enabled",
    "Transitions": [{ "Days": 30, "StorageClass": "STANDARD_IA" }],
    "Expiration": { "Days": 365 }
  }]
}
```

---

**Q18: What is GCP Cloud Run?**
**A:** Cloud Run is a fully managed serverless platform that runs stateless containers, auto-scales to zero, and charges only for request processing time.
```bash
gcloud run deploy my-service \
  --image gcr.io/my-project/my-app:latest \
  --platform managed \
  --allow-unauthenticated
```

---

**Q19: What is an S3 bucket policy?**
**A:** A resource-based JSON policy attached to a bucket that controls access by AWS accounts, IAM principals, or the public — independently of IAM user policies.
```json
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-public-bucket/*"
}
```

---

**Q20: What is the difference between Reserved Instances and Spot Instances?**
**A:** Reserved Instances provide up to 72% discount in exchange for a 1- or 3-year commitment. Spot Instances use spare capacity at up to 90% discount but can be interrupted.
```bash
aws ec2 request-spot-instances \
  --instance-count 2 \
  --launch-specification file://spec.json
```

---

## Mid

**Q21: What is the difference between RDS Multi-AZ and a Read Replica?**
**A:** Multi-AZ is for high availability with synchronous replication and automatic failover. Read Replicas are for read scaling with asynchronous replication — they don't provide automatic failover.
```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier my-db-replica \
  --source-db-instance-identifier my-db
```

---

**Q22: How do you configure an RDS parameter group?**
**A:** A parameter group is a named collection of DB engine settings. Create a custom one to override defaults like `max_connections` or `slow_query_log`.
```bash
aws rds create-db-parameter-group \
  --db-parameter-group-name my-params \
  --db-parameter-group-family mysql8.0 \
  --description "Custom MySQL 8 params"
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-params \
  --parameters "ParameterName=slow_query_log,ParameterValue=1,ApplyMethod=immediate"
```

---

**Q23: How does CloudFront cache behaviour work?**
**A:** A cache behaviour maps a URL path pattern to an origin and defines TTL, query string forwarding, and allowed methods. Multiple behaviours are evaluated top-to-bottom.
```json
{
  "PathPattern": "/wp-content/*",
  "DefaultTTL": 86400,
  "ForwardedValues": { "QueryString": false }
}
```

---

**Q24: What is Lambda@Edge and when would you use it for WordPress?**
**A:** Lambda@Edge runs Node.js/Python functions at CloudFront edge nodes to modify requests/responses. Use it for A/B redirects, authentication headers, or path rewrites before hitting the origin.
```javascript
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  if (request.uri === '/old-page') request.uri = '/new-page';
  return request;
};
```

---

**Q25: How do you set up an Auto Scaling Group scaling policy?**
**A:** A target tracking policy adjusts instance count to keep a metric (e.g., CPU) near a target value, scaling out when above and in when below.
```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name my-asg \
  --policy-name cpu-target \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration \
    '{"PredefinedMetricSpecification":{"PredefinedMetricType":"ASGAverageCPUUtilization"},"TargetValue":60}'
```

---

**Q26: What is VPC peering and when do you use it?**
**A:** VPC peering connects two VPCs (same or different accounts/regions) so instances can communicate via private IPs without traversing the internet.
```bash
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-aaa --peer-vpc-id vpc-bbb
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-12345
```

---

**Q27: How do you enable S3 versioning and why is it useful?**
**A:** Versioning keeps all versions of an object, protecting against accidental deletion or overwrites. Required for cross-region replication.
```bash
aws s3api put-bucket-versioning \
  --bucket my-bucket \
  --versioning-configuration Status=Enabled
```

---

**Q28: How do you create a CloudWatch alarm for high CPU?**
**A:** A CloudWatch alarm monitors a metric and triggers an action (SNS, ASG policy) when the value crosses a threshold for a set number of evaluation periods.
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123:my-topic
```

---

**Q29: What is AWS ECS and when would you use it for WordPress?**
**A:** ECS (Elastic Container Service) runs Docker containers on either Fargate (serverless) or EC2. Use it when running WordPress as a container with separate RDS and EFS for persistent storage.
```bash
aws ecs create-cluster --cluster-name wordpress-cluster
aws ecs register-task-definition --cli-input-json file://task-def.json
```

---

**Q30: What is GCP Cloud Armor and what does it protect against?**
**A:** Cloud Armor is GCP's WAF and DDoS protection service, attached to a Cloud Load Balancer. It applies security policies with IP allow/deny rules and pre-configured WAF rule sets.
```bash
gcloud compute security-policies create my-policy
gcloud compute security-policies rules create 1000 \
  --security-policy my-policy \
  --expression "origin.region_code == 'CN'" \
  --action deny-403
```

---

**Q31: How do you configure IAM least-privilege for an EC2 instance accessing S3?**
**A:** Create an IAM role with a policy granting only the required S3 actions on the specific bucket, then attach it as an instance profile on the EC2.
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::wordpress-media/*"
}
```

---

**Q32: What is GCP Secret Manager and how do you retrieve a secret?**
**A:** Secret Manager stores sensitive configuration with versioning and audit logs. Access it via the `gcloud` CLI or client libraries using the service account's IAM binding.
```bash
gcloud secrets versions access latest \
  --secret="db-password" \
  --project="my-project"
```

---

**Q33: How does Route 53 health-check failover routing work?**
**A:** Failover routing associates primary and secondary records with health checks. Route 53 automatically serves the secondary record when the primary health check fails.
```bash
aws route53 create-health-check \
  --caller-reference abc123 \
  --health-check-config \
    '{"IPAddress":"1.2.3.4","Port":443,"Type":"HTTPS","ResourcePath":"/health"}'
```

---

**Q34: What is the AWS reference architecture for a highly available WordPress site?**
**A:** ALB + ASG (EC2 or ECS) → RDS Multi-AZ (MySQL) + ElastiCache (Redis for object cache) + S3 + CloudFront for media. Static assets and uploads offloaded to S3/CloudFront.
```
Internet → CloudFront → ALB → ASG (WP EC2)
                              ↓          ↓
                           RDS Multi-AZ  ElastiCache
                              ↓
                           S3 (media)
```

---

**Q35: How do you right-size an EC2 instance to reduce costs?**
**A:** Use CloudWatch metrics (CPU, network, memory via the agent) and AWS Compute Optimizer recommendations to identify over-provisioned instances and move to a smaller type.
```bash
aws compute-optimizer get-ec2-instance-recommendations \
  --instance-arns arn:aws:ec2:us-east-1:123:instance/i-abc
```

---

**Q36: How do you enable GCP Cloud CDN caching for a backend service?**
**A:** Attach Cloud CDN to a HTTPS load balancer backend service and set cache mode. Origin responses with `Cache-Control` headers are automatically cached.
```bash
gcloud compute backend-services update my-backend \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC \
  --global
```

---

**Q37: How do you retrieve an SSM Parameter Store value in a shell script?**
**A:** Use `aws ssm get-parameter` with `--with-decryption` for `SecureString` type parameters. Suitable for passing DB credentials to EC2 user-data scripts.
```bash
DB_PASS=$(aws ssm get-parameter \
  --name "/prod/wp/db_password" \
  --with-decryption \
  --query Parameter.Value \
  --output text)
```

---

**Q38: What is GCP Cloud Monitoring and how does it compare to CloudWatch?**
**A:** Cloud Monitoring collects metrics, logs, and traces from GCP and hybrid resources. Like CloudWatch it supports alerting policies, dashboards, and uptime checks.
```bash
gcloud monitoring policies create \
  --policy-from-file=alert-policy.yaml
```

---

**Q39: How do you enable S3 cross-origin access for WordPress media?**
**A:** Add a CORS configuration to the bucket allowing `GET` requests from your domain so browsers can load fonts, images, or scripts directly from S3.
```json
[{
  "AllowedOrigins": ["https://example.com"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}]
```

---

**Q40: What is EKS and when is it preferred over ECS for WordPress?**
**A:** EKS is AWS managed Kubernetes. Prefer it over ECS when you need cluster-agnostic tooling, Helm charts, multi-cloud portability, or more sophisticated pod scheduling for a large WordPress fleet.
```bash
eksctl create cluster \
  --name wordpress-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3
```

---

## Advanced

**Q41: How do you architect a zero-downtime WordPress deployment on AWS?**
**A:** Use a blue/green strategy: bring up a new ASG (green) behind the ALB, run smoke tests, then shift traffic via weighted target groups and terminate the old ASG (blue).
```bash
# Shift 10% to green, then 100%
aws elbv2 modify-rule \
  --rule-arn arn:aws:elasticloadbalancing:... \
  --actions '[
    {"Type":"forward","ForwardConfig":{"TargetGroups":[
      {"TargetGroupArn":"arn:...:blue","Weight":0},
      {"TargetGroupArn":"arn:...:green","Weight":100}
    ]}}]'
```

---

**Q42: How do you enforce least-privilege IAM across a multi-account AWS organisation?**
**A:** Use AWS Organisations Service Control Policies (SCPs) as guardrails at the OU level, combined with IAM permission boundaries on developer roles to cap their maximum effective permissions.
```json
{
  "Effect": "Deny",
  "Action": ["iam:CreateUser", "iam:AttachUserPolicy"],
  "Resource": "*"
}
```

---

**Q43: How do you implement cross-region S3 replication for WordPress disaster recovery?**
**A:** Enable versioning on source and destination buckets, then configure a replication rule with an IAM role. Combine with Route 53 failover to redirect traffic automatically.
```bash
aws s3api put-bucket-replication \
  --bucket source-bucket \
  --replication-configuration file://replication.json
# replication.json specifies destination bucket ARN and IAM role ARN
```

---

**Q44: How do you tune an RDS MySQL instance for a high-traffic WordPress site?**
**A:** Increase `max_connections` via a parameter group, enable `slow_query_log` for tuning, use `innodb_buffer_pool_size` at ~75% of RAM, and add read replicas to offload SELECT queries.
```bash
aws rds modify-db-parameter-group \
  --db-parameter-group-name prod-mysql \
  --parameters \
    "ParameterName=innodb_buffer_pool_size,ParameterValue={DBInstanceClassMemory*3/4},ApplyMethod=pending-reboot" \
    "ParameterName=slow_query_log,ParameterValue=1,ApplyMethod=immediate"
```

---

**Q45: How do you reduce Lambda cold start latency for PHP/Node functions proxying WordPress?**
**A:** Use Provisioned Concurrency to keep execution environments warm. Minimise deployment package size and move SDK initialisation outside the handler function.
```bash
aws lambda put-provisioned-concurrency-config \
  --function-name my-function \
  --qualifier prod \
  --provisioned-concurrent-executions 5
```

---

**Q46: How do you implement WAF rules on CloudFront to protect a WordPress admin?**
**A:** Create an AWS WAF WebACL with an IP set allow rule for `/wp-admin` and `/wp-login.php`, add AWS managed rule groups (Core, Known Bad Inputs), and associate it with the CloudFront distribution.
```bash
aws wafv2 create-web-acl \
  --name wordpress-waf \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --rules file://waf-rules.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=wordpress-waf
```

---

**Q47: How do you implement a multi-region active-passive failover for WordPress on AWS?**
**A:** Deploy identical stacks in two regions. Use Route 53 health-check failover routing pointing to each ALB. Replicate RDS with a cross-region read replica promoted on failover.
```bash
# Primary record
aws route53 change-resource-record-sets --hosted-zone-id Z1234 \
  --change-batch '{"Changes":[{"Action":"CREATE","ResourceRecordSet":{
    "Name":"example.com","Type":"A","Failover":"PRIMARY",
    "HealthCheckId":"hc-abc","AliasTarget":{"DNSName":"alb-us.amazonaws.com","EvaluateTargetHealth":true,"HostedZoneId":"Z35"}
  }}]}'
```

---

**Q48: How do you use GCP Cloud Spanner or AlloyDB for a global WordPress database layer?**
**A:** AlloyDB for PostgreSQL provides near-real-time replication with read pools in multiple zones. Use `pg4wp` to connect WordPress to PostgreSQL, then proxy via AlloyDB Connector.
```bash
gcloud alloydb clusters create my-cluster \
  --region=us-central1 \
  --password=secret
gcloud alloydb instances create primary-instance \
  --instance-type=PRIMARY \
  --cpu-count=4 \
  --cluster=my-cluster \
  --region=us-central1
```

---

**Q49: How do you implement cost optimisation for a WordPress fleet using Savings Plans and Spot?**
**A:** Cover baseline capacity with Compute Savings Plans (flexible across instance families). Use Spot Instances in the ASG's mixed instances policy for burstable/stateless web tier nodes.
```json
{
  "MixedInstancesPolicy": {
    "InstancesDistribution": {
      "OnDemandPercentageAboveBaseCapacity": 20,
      "SpotAllocationStrategy": "capacity-optimized"
    },
    "LaunchTemplate": {
      "Overrides": [
        {"InstanceType": "t3.large"},
        {"InstanceType": "t3a.large"},
        {"InstanceType": "m5.large"}
      ]
    }
  }
}
```

---

**Q50: How do you design an event-driven media processing pipeline for WordPress uploads on AWS?**
**A:** S3 PUT event triggers a Lambda via S3 Event Notification. Lambda calls MediaConvert or Sharp to resize images, writes back to S3, then publishes to SNS to update post metadata via another Lambda.
```
S3 Upload → S3 Event Notification → Lambda (resize)
                                         ↓
                              S3 (resized images) → SNS → Lambda (update WP meta via REST API)
```
```bash
aws s3api put-bucket-notification-configuration \
  --bucket uploads-bucket \
  --notification-configuration file://s3-notification.json
# s3-notification.json maps s3:ObjectCreated:* to Lambda function ARN
```

---
