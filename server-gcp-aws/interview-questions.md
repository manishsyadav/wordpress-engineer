# Server / GCP / AWS — Interview Questions

---

## Basic

**Q: What is the difference between vertical scaling and horizontal scaling?**

**A:** Vertical scaling (scale up) increases resources (CPU, RAM, disk) on a single server. It is simpler but has a hard ceiling (largest available instance size) and creates a single point of failure. Horizontal scaling (scale out) adds more servers and distributes traffic across them. It is more complex (requires a load balancer, shared storage, stateless application design) but provides near-unlimited capacity and high availability. For WordPress at scale, horizontal scaling is the goal: stateless PHP-FPM instances behind a load balancer, shared uploads on S3/NFS, sessions in Redis.

---

**Q: What is an SSH key and how do you connect to a server with one?**

**A:** An SSH key pair consists of a private key (kept secret on your machine) and a public key (placed on the server in `~/.ssh/authorized_keys`). When you connect, the server sends a challenge encrypted with your public key; your client decrypts it with the private key to prove identity — no password transmitted. Generate with `ssh-keygen -t ed25519 -C "comment"`. Connect with `ssh -i ~/.ssh/my_key user@server-ip`. On GCP, use `gcloud compute ssh instance-name`; on AWS, specify the key pair at EC2 launch and connect with `ssh -i key.pem ec2-user@instance-ip`.

---

**Q: What is a CDN and how does it improve WordPress performance?**

**A:** A Content Delivery Network is a globally distributed network of edge servers. When a user requests a resource, the CDN serves it from the nearest edge node rather than the origin server. Benefits: (1) Reduced latency — physical proximity to user. (2) Reduced origin load — static assets (images, CSS, JS) are served by CDN, not your WordPress server. (3) DDoS protection — edge absorbs volumetric attacks. (4) Full-page caching — Cloudflare, CloudFront, and Fastly can cache entire WordPress pages for anonymous users. WordPress integration: configure `WP_CONTENT_URL` to point to CDN, use a plugin like W3 Total Cache or WP Rocket, or manage via Nginx rewrite rules.

---

**Q: What is the difference between a dedicated server, VPS, and managed WordPress hosting?**

**A:** A dedicated server gives you an entire physical machine — maximum performance, full control, highest cost. A VPS (Virtual Private Server) is a virtual machine on shared hardware — dedicated resources (RAM, CPU), good control, moderate cost. Managed WordPress hosting (WP Engine, Kinsta, Flywheel) is a PaaS layer on top of cloud infrastructure — automated backups, staging environments, WordPress-specific caching, security hardening — minimal ops overhead at premium cost. For enterprise WordPress, GCP/AWS gives maximum flexibility; managed hosting reduces devops burden for agencies.

---

**Q: What is an environment variable and why should sensitive values be stored there instead of in code?**

**A:** An environment variable is a named value available to processes in an operating system environment. Storing database credentials, API keys, and secrets as environment variables (rather than hardcoding in `wp-config.php` or committing to Git) prevents accidental secret exposure in version control, logs, or error messages. In WordPress: `define('DB_PASSWORD', getenv('WP_DB_PASSWORD'))` in `wp-config.php`. On GCP, inject via Secret Manager; on AWS, via Secrets Manager or SSM Parameter Store; on servers, set in `/etc/environment` or PHP-FPM pool config.

---

**Q: What is S3 and how is it used with WordPress?**

**A:** Amazon S3 (Simple Storage Service) is object storage — files stored as objects with a URL, highly durable (11 nines), and globally accessible. WordPress use cases: (1) Media offloading — upload images to S3 instead of local disk (WP Offload Media plugin). (2) Static asset hosting — serve CSS/JS from S3 + CloudFront CDN. (3) Backup storage — automated database and file backups to S3. (4) WP-CLI scripts — download/upload files for migrations. GCP equivalent: Google Cloud Storage (GCS). Both support lifecycle rules, versioning, access policies, and signed URLs for private content.

---

**Q: What is a load balancer and what WordPress-specific considerations exist when using one?**

**A:** A load balancer distributes incoming HTTP(S) traffic across multiple backend servers. WordPress-specific considerations: (1) **Sticky sessions vs. stateless** — if user sessions are stored in PHP files, users routed to different servers lose sessions. Fix: store sessions in Redis/Memcached. (2) **File uploads** — if a user uploads to server A, server B won't have the file. Fix: use S3/GCS for uploads. (3) **wp-cron** — if multiple servers all run WP-Cron, events run multiple times. Fix: disable WP-Cron, use server cron on one instance. (4) **SSL termination** — the load balancer handles HTTPS; backend servers see HTTP. WordPress may detect `HTTPS` incorrectly — add `$_SERVER['HTTPS'] = 'on'` when `HTTP_X_FORWARDED_PROTO` is https.

---

## Mid

**Q: What is Docker and how would you use it for local WordPress development?**

**A:** Docker is a containerization platform. A container packages an application with all its dependencies into a portable, isolated unit. For WordPress development, `docker-compose.yml` defines services: `wordpress` (PHP-FPM + WordPress), `mysql` (database), `nginx` (web server), optionally `redis` (object cache). Benefits: consistent environment across all developers' machines; easy reproduction of production configuration; isolated from system PHP/MySQL. Tools: WP-CLI's `wp-env` uses Docker internally; DDEV, Lando, and Local by Flywheel are Docker-based WordPress development environments.

---

**Q: What is GCP Cloud SQL and how do you connect a WordPress site to it securely?**

**A:** Cloud SQL is Google Cloud's managed relational database service (MySQL, PostgreSQL, SQL Server). Secure connection options: (1) **Cloud SQL Auth Proxy** — a local sidecar process that authenticates via IAM and creates an encrypted tunnel; your application connects to `127.0.0.1:3306` and the proxy routes to Cloud SQL. Best practice for VM-based WordPress. (2) **Private IP** — Cloud SQL instance on the same VPC as the WordPress VM; no public IP needed. (3) **SSL certificates** — client certificate + server CA certificate for encrypted connections over public IP. In `wp-config.php`, set `DB_HOST` to `127.0.0.1` when using the proxy.

---

**Q: What is a GCP Managed Instance Group (MIG) and how does it provide auto-scaling for WordPress?**

**A:** A MIG is a group of identical VM instances managed as a unit. A GCP autoscaler watches metrics (CPU utilization, HTTP load balancing capacity, custom Cloud Monitoring metrics) and adds/removes instances automatically. For WordPress: (1) Create a custom VM image with WordPress, PHP-FPM, and Nginx pre-configured. (2) Define an instance template referencing the image. (3) Create a MIG from the template with min/max instance counts. (4) Attach the MIG to an HTTP(S) load balancer backend service. (5) Set autoscaling policy: add instance when CPU > 60%; remove when CPU < 30% for 5 minutes. Health checks restart unhealthy instances automatically.

---

**Q: How would you set up a WordPress staging environment that mirrors production on AWS?**

**A:** Approach: (1) Create a separate VPC or use the same VPC with different subnets. (2) Launch an EC2 instance with the same instance type and AMI as production. (3) Restore an RDS snapshot from production to a staging RDS instance. (4) Copy S3 media bucket contents (or sync a subset). (5) Deploy the same codebase (branch `staging`) via your CI/CD pipeline. (6) Use WP-CLI search-replace to update domain: `wp search-replace 'https://example.com' 'https://staging.example.com'`. (7) Set `define('WP_ENV', 'staging')` in `wp-config.php`; use this constant to disable email sending, third-party integrations, and payment gateways. (8) Restrict access via security group (whitelist IP) or HTTP Basic Auth.

---

**Q: Explain the difference between `nohup`, `screen`, `tmux`, and `systemd` for running background processes on Linux.**

**A:** `nohup command &` — runs a command immune to HUP signals (survives SSH disconnect); output redirected to `nohup.out`. Simple but no session management. `screen` / `tmux` — terminal multiplexers that maintain persistent sessions you can detach from and reattach to; useful for interactive debugging. `systemd` — the production-grade service manager on modern Linux. Define a `.service` unit file in `/etc/systemd/system/`, enable with `systemctl enable`, start/stop with `systemctl start/stop`, view logs with `journalctl -u service-name`. Use `systemd` for PHP-FPM, Nginx, Redis, and custom WP-CLI worker scripts that must survive reboots and be monitored.

---

**Q: What is Cloud CDN on GCP and how does it differ from Cloudflare?**

**A:** GCP Cloud CDN sits in front of Cloud Load Balancing and caches responses at Google's edge nodes. It uses signed URLs for private content and Cache-Control headers for cache lifetime control. Tightly integrated with GCP networking. Cloudflare is a third-party CDN/security platform: DNS is proxied through Cloudflare, providing DDoS protection, WAF, bot management, and CDN in one service. Cloudflare is easier to set up for any hosting provider; Cloud CDN requires GCP infrastructure. For GCP-hosted WordPress: Cloud CDN is natural; for sites on any hosting, Cloudflare is provider-agnostic.

---

## Advanced

**Q: How would you architect a zero-downtime deployment pipeline for a high-traffic WordPress site on AWS?**

**A:** (1) **Version control** — all changes in Git; `main` branch = production. (2) **CI pipeline** (GitHub Actions/CodePipeline) — run PHP/JS tests, PHPCS linting, build assets. (3) **Artifact** — build a deployable archive or Docker image. (4) **Blue-Green deployment** — maintain two identical environments (Blue = live, Green = standby). Deploy to Green, run smoke tests, shift traffic from Blue to Green via load balancer (target group swap takes seconds, no downtime). If issues arise, switch back to Blue in seconds. (5) **Database migrations** — use the Expand-Contract pattern: deploy backward-compatible schema changes first, then remove old columns after new code is live. (6) **WP-CLI deploy hook** — run `wp cache flush`, `wp rewrite flush`, `wp cron event list` after deploy. (7) **CloudWatch alarms** — alert on error rate spikes; trigger automatic rollback.

---

**Q: How do you secure an AWS EC2 WordPress instance against common attacks?**

**A:** Multi-layer defense: (1) **Network** — Security Groups: allow port 80/443 only from CloudFront IP ranges; allow SSH only from bastion host or VPN IP. (2) **OS hardening** — disable root SSH login, use key-based auth only, enable `fail2ban`, keep packages updated via `unattended-upgrades`. (3) **WAF** — AWS WAF in front of CloudFront/ALB with WordPress ruleset (OWASP Top 10, bad bot rules). (4) **Application** — file system permissions: WordPress files owned by the deploy user, PHP-FPM runs as `www-data`; `wp-config.php` permissions `640`; uploads directory not PHP-executable (`php_flag engine off` in Nginx). (5) **Secrets** — credentials in AWS Secrets Manager, not `wp-config.php`. (6) **Backup** — encrypted RDS automated backups, S3 versioning. (7) **Monitoring** — CloudWatch Logs for PHP errors; AWS GuardDuty for threat detection.

---

**Q: Explain GCP's IAM model and how you would apply the principle of least privilege to a WordPress application.**

**A:** GCP IAM grants permissions through roles assigned to identities (users, service accounts, groups) on resources (projects, buckets, instances). Principle of least privilege: (1) **Service Account for WordPress VM** — create a dedicated service account with only the roles it needs: `roles/cloudsql.client` (connect to Cloud SQL), `roles/storage.objectAdmin` (on the specific GCS media bucket only), `roles/secretmanager.secretAccessor` (on specific secrets). No `roles/editor` or `roles/owner`. (2) **Workload Identity** — if using GKE, use Workload Identity to map Kubernetes service accounts to GCP service accounts without key files. (3) **VPC Service Controls** — restrict Cloud SQL and GCS access to specific VPC. (4) **Audit logging** — enable Data Access audit logs to track every API call. (5) **CI/CD service account** — separate SA for deployment with only deployment-specific permissions.
