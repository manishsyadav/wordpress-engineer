# Web Server — Scenario-Based Questions

> Real-world web server scenarios with complete Nginx solutions.

---

## Scenario 1: Diagnosing 502 Bad Gateway and 504 Gateway Timeout

**The situation:** Users report intermittent `502 Bad Gateway` and `504 Gateway Timeout` errors on a WordPress site. The site was working fine earlier in the day.

**What the status codes mean:**
- **502 Bad Gateway** — Nginx received an invalid response from PHP-FPM, or received no response at all (socket is unreachable or PHP-FPM is down).
- **504 Gateway Timeout** — Nginx connected to PHP-FPM successfully but PHP-FPM did not send a complete response within `fastcgi_read_timeout` seconds (script is too slow or pool is exhausted).

---

### Step 1 — Check Nginx Error Logs

```bash
# Stream the Nginx error log in real time
sudo tail -f /var/log/nginx/error.log

# Filter for upstream and FastCGI errors
sudo grep -E "(connect\(\) failed|upstream timed out|no live upstreams|recv\(\) failed)" \
    /var/log/nginx/error.log | tail -50

# Find errors in the last hour
sudo grep "$(date '+%Y/%m/%d %H')" /var/log/nginx/error.log | grep -E "502|504|upstream"
```

**Common error messages and root causes:**

| Error Message | Root Cause |
|---|---|
| `connect() failed (111: Connection refused)` | PHP-FPM is not running or the TCP port is wrong |
| `connect() failed (2: No such file or directory)` | Unix socket file does not exist; PHP-FPM crashed |
| `upstream timed out (110: Connection timed out)` | PHP script is too slow; FPM pool exhausted |
| `no live upstreams while connecting to upstream` | All backend servers are marked down (passive health check) |
| `recv() failed (104: Connection reset by peer)` | PHP-FPM process crashed mid-request (OOM or fatal error) |

---

### Step 2 — Check PHP-FPM Status

```bash
# Is PHP-FPM running?
sudo systemctl status php8.2-fpm

# Check PHP-FPM logs for fatal errors, warnings
sudo tail -100 /var/log/php8.2-fpm.log
sudo tail -100 /var/log/php/error.log

# Does the Unix socket file exist?
ls -la /run/php/php8.2-fpm.sock

# How many PHP-FPM processes are running vs configured max?
ps aux | grep php-fpm | grep -v grep | wc -l

# PHP-FPM status page (if pm.status_path is configured)
curl -s http://127.0.0.1/fpm-status?full 2>/dev/null | head -30

# Check PHP-FPM pool config
grep -E "pm\.|listen" /etc/php/8.2/fpm/pool.d/www.conf
```

---

### Step 3 — Check System Resources

```bash
# Memory and CPU overview
free -h
top -b -n1 | head -25

# Is the disk full? A full disk can crash PHP-FPM
df -h

# Check for OOM kills — kernel killing PHP-FPM to free memory
dmesg | grep -i "oom\|killed process" | tail -20
journalctl -k --since "1 hour ago" | grep -i oom

# Current open file descriptors (hitting limits causes connection errors)
ulimit -n                      # per-process limit
cat /proc/sys/fs/file-max      # system-wide max
lsof 2>/dev/null | wc -l       # currently open files
```

---

### Step 4 — Diagnose PHP-FPM Pool Exhaustion (Causes 504)

```bash
# Formula: pm.max_children = available_RAM / average_PHP_worker_memory
# Check average PHP-FPM worker memory
ps --no-headers -o "rss,cmd" -C php-fpm8.2 \
    | awk '{sum+=$1; count++} END {printf "Average: %.0f MB\n", sum/count/1024}'

# Check the slow request log for PHP scripts taking too long
sudo tail -50 /var/log/php-fpm/wordpress.slow.log

# Test config syntax before any changes
php-fpm8.2 -t
```

Pool settings to adjust in `/etc/php/8.2/fpm/pool.d/www.conf`:
```ini
pm = dynamic
pm.max_children      = 20    ; increase if pool exhaustion is the cause
pm.start_servers     = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests      = 500   ; restart workers after 500 requests (prevents memory leaks)

; Log requests slower than 5 seconds
slowlog                     = /var/log/php-fpm/wordpress.slow.log
request_slowlog_timeout     = 5s
request_terminate_timeout   = 120s  ; kill stuck requests after 2 minutes
```

---

### Step 5 — Test PHP-FPM Directly

```bash
# Test FastCGI connection bypassing Nginx entirely
# Requires: apt install libfcgi-bin
SCRIPT_NAME=/index.php \
SCRIPT_FILENAME=/var/www/wordpress/index.php \
REQUEST_METHOD=GET \
cgi-fcgi -bind -connect /run/php/php8.2-fpm.sock

# Ping the socket to confirm connectivity
echo "" | nc -U /run/php/php8.2-fpm.sock; echo "exit: $?"
```

---

### Step 6 — Nginx FastCGI Timeout Configuration

Adjust in the `location ~ \.php$` block:

```nginx
location ~ \.php$ {
    try_files $uri =404;

    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;

    fastcgi_connect_timeout 10s;    # time to establish the connection to FPM
    fastcgi_send_timeout    300s;   # time to send the full request to FPM
    fastcgi_read_timeout    300s;   # time to wait for FPM's complete response

    fastcgi_buffers         16 16k;
    fastcgi_buffer_size     32k;

    # Prevent multiple requests from hitting PHP simultaneously on cache miss
    fastcgi_cache_lock on;
    fastcgi_cache_use_stale error timeout updating http_500 http_503;
    fastcgi_cache_background_update on;
}
```

---

### Step 7 — Resolution Matrix

| Symptom | Command to Confirm | Fix |
|---|---|---|
| PHP-FPM stopped | `systemctl status php8.2-fpm` | `systemctl restart php8.2-fpm` |
| Socket missing | `ls /run/php/*.sock` | Fix pool `listen` path; restart FPM |
| Pool exhausted (max_children hit) | `pm.max_children` vs `ps` count | Increase `max_children` or add RAM |
| Scripts timing out | `request_slowlog_timeout` log | Profile slow queries; increase `fastcgi_read_timeout` |
| OOM kill | `dmesg | grep oom` | Add swap; reduce `max_children`; fix memory leaks |
| Disk full | `df -h` | Free space; rotate logs; clean upload duplicates |

---

## Scenario 2: Setting Up HTTPS with Let's Encrypt and Auto-Renewal

**The situation:** A WordPress site is running on HTTP. The client wants HTTPS with a free certificate that renews automatically and never expires.

---

### Step 1 — Prerequisites

```bash
# Install Certbot with Nginx plugin
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Ensure ports 80 and 443 are open in the firewall
sudo ufw allow 'Nginx Full'
sudo ufw status

# For AWS/GCP: also verify inbound rules in the security group / firewall rules allow 80 + 443

# Verify Nginx config is valid before proceeding
sudo nginx -t
```

---

### Step 2 — Obtain the Certificate

```bash
# Certbot automatically modifies Nginx config and reloads
sudo certbot --nginx \
    -d example.com \
    -d www.example.com \
    --email admin@example.com \
    --agree-tos \
    --non-interactive

# Dry run first to test without hitting rate limits (5 certs/domain/week)
sudo certbot --nginx --dry-run -d example.com -d www.example.com

# Webroot mode (Nginx keeps serving; no downtime; more explicit)
sudo certbot certonly --webroot \
    -w /var/www/wordpress \
    -d example.com -d www.example.com
```

Certbot creates the following files:
- `/etc/letsencrypt/live/example.com/fullchain.pem` — certificate + intermediate CA chain
- `/etc/letsencrypt/live/example.com/privkey.pem` — private key
- `/etc/letsencrypt/live/example.com/chain.pem` — intermediate chain only (for OCSP stapling)

---

### Step 3 — Final Nginx Configuration

```nginx
# HTTP — redirect to HTTPS + serve Let's Encrypt ACME challenges
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    # Let's Encrypt domain validation (must be accessible before redirect)
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type text/plain;
    }

    location / {
        return 301 https://example.com$request_uri;
    }
}

# HTTPS — main WordPress site
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;
    root /var/www/wordpress;

    # Certificate paths
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Protocol: TLS 1.2 and 1.3 only (1.0 and 1.1 are insecure and deprecated)
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Session resumption — avoids full TLS handshake on reconnect
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP stapling — server pre-fetches certificate revocation status
    ssl_stapling        on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;
    resolver            1.1.1.1 8.8.8.8 valid=300s;

    # HSTS — tell browsers to always use HTTPS for 1 year
    # WARNING: set this ONLY after confirming HTTPS works; hard to undo
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

---

### Step 4 — Configure Automatic Renewal

Let's Encrypt certificates expire after 90 days. Certbot installs a systemd timer automatically.

```bash
# Check if the timer is installed and active
sudo systemctl status certbot.timer
sudo systemctl list-timers | grep certbot

# The timer runs twice daily; Certbot only renews certs within 30 days of expiry
# Test renewal without actually renewing (always run this after setup)
sudo certbot renew --dry-run

# Force renewal (ignores 30-day window — for testing only)
sudo certbot renew --force-renewal
```

---

### Step 5 — Add a Deploy Hook to Reload Nginx After Renewal

```bash
# Create the hook script
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null << 'EOF'
#!/bin/bash
# Reload Nginx after successful certificate renewal
nginx -t && systemctl reload nginx
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Hooks in /etc/letsencrypt/renewal-hooks/deploy/ run after each successful renewal
# They receive the domain name as the environment variable $RENEWED_DOMAINS
```

---

### Step 6 — Monitor Certificate Expiry

```bash
# Check current certificate status
sudo certbot certificates

# Check expiry from outside (replace with your domain)
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \
    | openssl x509 -noout -dates

# Quick days-remaining check
DOMAIN="example.com"
EXPIRY=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null \
    | openssl x509 -noout -enddate | cut -d= -f2)
echo "Expires: $EXPIRY"

# Test SSL rating (external): https://www.ssllabs.com/ssltest/
```

---

## Scenario 3: Hardening a WordPress Nginx Config Against Common Attacks

**The situation:** A WordPress site is under attack: automated brute force attempts on the login page, directory scanning, and attempts to execute PHP files uploaded to the media library. The site needs a hardened Nginx configuration.

---

### Attack 1 — Brute Force on wp-login.php

```nginx
# http context — define rate limit zone
limit_req_zone $binary_remote_addr zone=wp_login:10m rate=5r/m;

server {
    # Rate limit: 5 login attempts/minute per IP, burst of 3
    location = /wp-login.php {
        limit_req        zone=wp_login burst=3 nodelay;
        limit_req_status 429;
        limit_req_log_level warn;

        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

---

### Attack 2 — XML-RPC Abuse (credential stuffing via multicall)

```nginx
# Block xmlrpc.php entirely unless JetPack or mobile publishing is required
location = /xmlrpc.php {
    deny all;
    return 403;
    access_log off;
}
```

---

### Attack 3 — PHP Execution in Uploads Directory

A common attack: upload a PHP file disguised as an image, then request it to execute arbitrary code.

```nginx
# Block PHP execution anywhere in wp-content/uploads
location ~* /wp-content/uploads/.*\.(php|php3|php4|php5|php7|phtml|phar)$ {
    deny all;
    return 403;
    access_log off;
}
```

---

### Attack 4 — Direct Access to Sensitive Files

```nginx
# Block hidden files (.git, .env, .htaccess, .DS_Store)
location ~ /\. {
    deny all;
    return 404;
    access_log off;
    log_not_found off;
}

# Block WordPress config and readme files
location ~* ^/(wp-config\.php|wp-config-sample\.php|readme\.html|license\.txt)$ {
    deny all;
    return 404;
}

# Block direct access to PHP files in plugin/theme directories
# (only index.php and explicitly loaded files should be executable)
location ~* ^/wp-content/(?:plugins|themes)/.*\.php$ {
    # Allow legitimate plugin requests (most plugins load via WordPress, not directly)
    # Uncomment to lock down — test thoroughly first:
    # deny all;
    # return 403;
}
```

---

### Attack 5 — Bad Bots and Scanners

```nginx
# http context
map $http_user_agent $block_ua {
    default                                  0;
    ""                                       1;  # empty User-Agent
    ~*(sqlmap|nikto|nmap|masscan|zgrab)      1;  # known vulnerability scanners
    ~*(wpscan|wpscanner|wp-scan)             1;  # WordPress scanners
    ~*(harvester|httrack|scrapy|wget/1\.[0-4]) 1;
    ~*libwww-perl                            1;
}

server {
    # Block bad user agents immediately
    if ($block_ua) {
        return 403;
    }
}
```

---

### Attack 6 — Restrict wp-admin to Known IPs

```nginx
location /wp-admin/ {
    # Allow only your office/VPN IP range
    allow 203.0.113.0/24;  # replace with your actual IP
    allow 198.51.100.5;
    deny all;

    try_files $uri $uri/ /index.php?$args;
}

# wp-admin/admin-ajax.php must remain open for front-end AJAX (search, cart, etc.)
location = /wp-admin/admin-ajax.php {
    allow all;
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

---

### Attack 7 — Security Headers

```nginx
server {
    server_tokens off;  # hide Nginx version from Server header

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options           "SAMEORIGIN" always;
    add_header X-Content-Type-Options    "nosniff" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy        "geolocation=(), microphone=(), camera=()" always;

    # Restrict request size to prevent large payload attacks
    client_max_body_size  64m;
    client_body_timeout   30s;
    client_header_timeout 10s;
    send_timeout          30s;
}
```

---

### Fully Hardened Server Block

```nginx
# http context
limit_req_zone $binary_remote_addr zone=wp_login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=wp_api:10m   rate=60r/m;

map $http_user_agent $block_ua {
    default 0;
    ""      1;
    ~*(sqlmap|nikto|wpscan|masscan|libwww-perl) 1;
}

server {
    listen 443 ssl http2;
    server_name example.com;
    root /var/www/wordpress;

    server_tokens off;
    client_max_body_size 64m;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options           "SAMEORIGIN" always;
    add_header X-Content-Type-Options    "nosniff" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;

    if ($block_ua) { return 403; }

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location = /wp-login.php {
        limit_req        zone=wp_login burst=3 nodelay;
        limit_req_status 429;
        fastcgi_pass     unix:/run/php/php8.2-fpm.sock;
        fastcgi_param    SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include          fastcgi_params;
    }

    location = /xmlrpc.php {
        deny all;
        return 403;
    }

    location /wp-json/ {
        limit_req zone=wp_api burst=20 nodelay;
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ /\.                                         { deny all; return 404; }
    location ~* ^/(wp-config\.php|readme\.html)$           { deny all; return 404; }
    location ~* /wp-content/uploads/.*\.(php.*)$           { deny all; return 403; }

    location ~ \.php$ {
        try_files    $uri =404;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include       fastcgi_params;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|webp|ico|svg|woff2)$ {
        expires    30d;
        add_header Cache-Control "public";
        access_log off;
    }
}

---

## Scenario 4: Configuring Nginx FastCGI Caching for a High-Traffic WordPress Site

**Scenario:**
A WordPress site peaks at 5,000 concurrent visitors. PHP-FPM pool is saturating at 30 workers and response times spike above 4 seconds. The site has 95% anonymous (non-logged-in) traffic. A full-page reverse proxy cache at the Nginx layer will serve cached HTML without touching PHP-FPM for the majority of requests.

**Challenge:**
Implement Nginx FastCGI caching that caches full-page HTML for anonymous users, bypasses the cache for logged-in users and WooCommerce cart/checkout pages, and provides an instant cache-purge mechanism on WordPress publish.

**Solution:**

1. **Add the FastCGI cache zone to `nginx.conf` (http context):**

```nginx
# /etc/nginx/nginx.conf — http{} block
fastcgi_cache_path /var/cache/nginx/wordpress
    levels=1:2
    keys_zone=WP_CACHE:100m
    inactive=60m
    max_size=2g;

fastcgi_cache_key "$scheme$request_method$host$request_uri";
```

2. **Create cache-bypass logic (map block in http context):**

```nginx
# Bypass cache for logged-in users, WooCommerce sessions, and POST requests
map $http_cookie $skip_cache {
    default           0;
    "~wordpress_logged_in" 1;
    "~wp-postpass_"   1;
    "~woocommerce_items_in_cart" 1;
    "~comment_author_" 1;
}

map $request_method $skip_cache_method {
    default 0;
    POST    1;
}
```

3. **Configure the server block with FastCGI caching:**

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    root /var/www/wordpress;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Cache status header — useful for debugging (HIT/MISS/BYPASS/EXPIRED)
    add_header X-Cache-Status $upstream_cache_status always;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # Bypass cache for wp-admin and specific WooCommerce paths
    location ~* ^/(wp-admin|wp-login\.php|cart|checkout|my-account) {
        fastcgi_cache_bypass 1;
        fastcgi_no_cache     1;
        fastcgi_pass         unix:/run/php/php8.2-fpm.sock;
        fastcgi_param        SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include              fastcgi_params;
    }

    location ~ \.php$ {
        try_files $uri =404;

        fastcgi_pass  unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include       fastcgi_params;

        # Cache configuration
        fastcgi_cache          WP_CACHE;
        fastcgi_cache_valid     200 301 302 10m;
        fastcgi_cache_valid     404 1m;
        fastcgi_cache_bypass    $skip_cache $skip_cache_method;
        fastcgi_no_cache        $skip_cache $skip_cache_method;
        fastcgi_cache_use_stale error timeout updating http_500 http_503;
        fastcgi_cache_lock      on;                    # collapse simultaneous cache-miss requests
        fastcgi_cache_background_update on;            # serve stale while refreshing in background
        fastcgi_cache_min_uses  1;

        fastcgi_buffers     16 16k;
        fastcgi_buffer_size 32k;
        fastcgi_read_timeout 120s;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2)$ {
        expires    1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

4. **Instant cache purge on WordPress publish (nginx-cache-purge helper):**

```bash
# Install the nginx helper plugin (WP admin), or use this shell purge script
# triggered from WordPress via a webhook action

# /usr/local/bin/purge-nginx-cache.sh
#!/bin/bash
# Called by WordPress publish hook via WP-CLI or a REST endpoint
CACHE_DIR="/var/cache/nginx/wordpress"
find "$CACHE_DIR" -type f -delete
echo "Nginx FastCGI cache purged at $(date)"
```

```php
// functions.php — purge cache when a post is published or updated
add_action('save_post', function(int $post_id, \WP_Post $post): void {
    if ($post->post_status !== 'publish') return;
    // Shell out to purge script (ensure www-data can run this via sudoers)
    shell_exec('sudo /usr/local/bin/purge-nginx-cache.sh 2>&1');
}, 10, 2);
```

5. **Verify caching is working:**

```bash
# First request — should be MISS
curl -sI https://example.com/ | grep -i "x-cache-status"
# X-Cache-Status: MISS

# Second request — should be HIT
curl -sI https://example.com/ | grep -i "x-cache-status"
# X-Cache-Status: HIT

# Logged-in user — should be BYPASS
curl -sI https://example.com/ \
  -H "Cookie: wordpress_logged_in_abc123=test" | grep -i "x-cache"
# X-Cache-Status: BYPASS

# Monitor cache hit rate in real time
tail -f /var/log/nginx/access.log | grep -o 'HIT\|MISS\|BYPASS\|EXPIRED' | sort | uniq -c
```

---

## Scenario 5: Debugging a 502 Bad Gateway Between Nginx and PHP-FPM Under Load

**Scenario:**
During a traffic spike, a WordPress site returns `502 Bad Gateway` errors intermittently. The errors appear in bursts lasting 10–30 seconds, then resolve. The server has 8 GB RAM and PHP-FPM is configured with `pm.max_children = 10`. Nginx logs show `connect() failed (11: Resource temporarily unavailable)`.

**Challenge:**
Diagnose the root cause of pool exhaustion, tune PHP-FPM for the available RAM, implement a slow-log to identify slow requests, and add Nginx upstream fallback behavior to reduce user-visible errors during future spikes.

**Solution:**

1. **Diagnose the immediate cause:**

```bash
# Error 11 (EAGAIN) on Unix socket = FPM socket backlog is full (all workers busy)
sudo grep "Resource temporarily unavailable" /var/log/nginx/error.log | tail -20

# How many PHP-FPM workers are currently running vs the max?
ps --no-headers -o pid,rss,cmd -C php-fpm8.2 | wc -l
# Compare against pm.max_children in /etc/php/8.2/fpm/pool.d/www.conf

# Real-time FPM pool stats (requires pm.status_path = /fpm-status in pool config)
curl -s "http://127.0.0.1/fpm-status" 2>/dev/null
# Look for: "active processes" approaching "max children"

# Check if "max children reached" has been logged by FPM
sudo grep "max_children" /var/log/php8.2-fpm.log | tail -10
# Output: WARNING: [pool www] server reached pm.max_children setting (10)
```

2. **Calculate the correct `pm.max_children` for 8 GB RAM:**

```bash
# Measure actual average PHP-FPM worker memory usage
ps --no-headers -o rss -C php-fpm8.2 \
  | awk '{sum+=$1; n++} END {printf "Average RSS: %.0f MB (n=%d)\n", sum/n/1024, n}'
# Example output: Average RSS: 48 MB (n=10)

# Formula:
# Available RAM for PHP-FPM = Total RAM - OS - Nginx - MySQL - Redis
# 8192 MB - 512 MB (OS) - 100 MB (Nginx) - 512 MB (MySQL local) - 256 MB (Redis) = ~6812 MB
# max_children = 6812 / 48 = ~141  (use 80% of theoretical max for headroom = 112)
echo "Recommended pm.max_children: $(echo '6812 / 48 * 8 / 10' | bc)"
```

3. **Updated PHP-FPM pool configuration:**

```ini
; /etc/php/8.2/fpm/pool.d/www.conf

[www]
user  = www-data
group = www-data
listen = /run/php/php8.2-fpm.sock
listen.backlog = 512          ; increase socket backlog (default 511, matches kernel somaxconn)

pm                   = dynamic
pm.max_children      = 50     ; increased from 10
pm.start_servers     = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests      = 500    ; recycle workers to prevent PHP memory leaks

; Slow log — captures stack trace of requests taking > 3 seconds
slowlog                   = /var/log/php-fpm/wordpress-slow.log
request_slowlog_timeout   = 3s
request_terminate_timeout = 120s

; Status and ping endpoints for monitoring
pm.status_path = /fpm-status
ping.path      = /fpm-ping
ping.response  = pong

; PHP settings for WordPress
php_admin_value[error_log]        = /var/log/php/wordpress-error.log
php_admin_flag[log_errors]        = on
php_value[opcache.enable]         = 1
php_value[opcache.memory_consumption] = 256
php_value[opcache.max_accelerated_files] = 20000
php_value[realpath_cache_size]    = 4096k
php_value[realpath_cache_ttl]     = 600
```

4. **Nginx upstream configuration with error handling:**

```nginx
# Increase the socket backlog on the upstream to match FPM's listen.backlog
upstream php_fpm {
    server unix:/run/php/php8.2-fpm.sock;
    keepalive 8;
}

location ~ \.php$ {
    try_files $uri =404;

    fastcgi_pass              php_fpm;
    fastcgi_param             SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include                   fastcgi_params;

    fastcgi_connect_timeout   5s;
    fastcgi_send_timeout      120s;
    fastcgi_read_timeout      120s;

    # Serve a stale cached response instead of a 502 if FPM is overloaded
    fastcgi_cache             WP_CACHE;
    fastcgi_cache_use_stale   error timeout updating http_500 http_502 http_503;
    fastcgi_cache_background_update on;

    fastcgi_buffers           32 16k;
    fastcgi_buffer_size       64k;
    fastcgi_busy_buffers_size 128k;
}
```

5. **Apply changes and verify:**

```bash
# Test FPM config before reloading
php-fpm8.2 -t

# Graceful reload (no dropped connections)
sudo systemctl reload php8.2-fpm

# Increase kernel socket backlog to match FPM's listen.backlog
echo 'net.core.somaxconn = 1024' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 1024' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Load test to verify fix (requires apache bench or wrk)
wrk -t4 -c200 -d30s https://example.com/
# Target: 0% non-2xx/3xx responses with new config

# Monitor FPM pool in real time
watch -n 2 'curl -s http://127.0.0.1/fpm-status | grep -E "active|idle|max children reached"'
```

---

## Scenario 6: HTTP/2 and SSL Termination with Let's Encrypt on Nginx for WordPress

**Scenario:**
A WordPress site is serving HTTP only via a legacy Nginx configuration. The client needs HTTPS with a valid certificate, HTTP/2 enabled, automatic renewal, HSTS, and an SSL Labs A+ rating — all without any downtime during the migration.

**Challenge:**
Obtain a Let's Encrypt certificate, configure a production-grade SSL setup on Nginx with HTTP/2, OCSP stapling, and HSTS, and implement automatic certificate renewal with a deploy hook.

**Solution:**

1. **Install Certbot and obtain the certificate without downtime:**

```bash
# Install Certbot (Nginx plugin modifies config automatically)
sudo apt update && sudo apt install -y certbot python3-certbot-nginx

# Verify current Nginx config is valid
sudo nginx -t

# Obtain cert — Certbot temporarily uses port 80 for ACME challenge
# The --nginx flag auto-modifies the server block
sudo certbot --nginx \
  -d example.com \
  -d www.example.com \
  --email ops@example.com \
  --agree-tos \
  --non-interactive \
  --redirect           # auto-add HTTP→HTTPS redirect

# Dry run to verify renewal works before the 90-day deadline
sudo certbot renew --dry-run
```

2. **Full production Nginx SSL configuration:**

```nginx
# /etc/nginx/sites-available/example.com

# HTTP → HTTPS redirect + ACME challenge passthrough
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    location ^~ /.well-known/acme-challenge/ {
        root    /var/www/certbot;
        default_type text/plain;
        allow all;
    }

    location / {
        return 301 https://example.com$request_uri;
    }
}

# www → apex redirect
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    return 301 https://example.com$request_uri;
}

# Main HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com;
    root        /var/www/wordpress;
    index       index.php;

    # Certificate
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Protocols and ciphers (Mozilla Intermediate compatibility)
    ssl_protocols             TLSv1.2 TLSv1.3;
    ssl_ciphers               ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;

    # Session resumption (avoids full handshake on reconnect)
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;    # disable for perfect forward secrecy

    # OCSP stapling (server pre-fetches revocation status)
    ssl_stapling        on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;
    resolver            1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout    5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options           "SAMEORIGIN" always;
    add_header X-Content-Type-Options    "nosniff" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    server_tokens off;

    # DH params for older TLS 1.2 key exchange (generate once)
    # openssl dhparam -out /etc/nginx/dhparam.pem 2048
    ssl_dhparam /etc/nginx/dhparam.pem;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        try_files    $uri =404;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include      fastcgi_params;
        fastcgi_read_timeout 120s;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2)$ {
        expires    1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

3. **Generate DH parameters and validate configuration:**

```bash
# Generate 2048-bit DH params (run once; takes a few minutes)
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048

# Test Nginx configuration
sudo nginx -t

# Reload (zero-downtime)
sudo systemctl reload nginx

# Verify HTTPS is working
curl -sI https://example.com/ | grep -E "HTTP/|Strict-Transport"

# Check OCSP stapling
echo | openssl s_client -connect example.com:443 -status 2>/dev/null \
  | grep -A 10 "OCSP Response"

# Check SSL Labs score (or use command-line equivalent)
curl -s "https://api.ssllabs.com/api/v3/analyze?host=example.com&publish=off&all=done" \
  | python3 -m json.tool | grep -E '"grade"|"hasWarnings"'
```

4. **Automated renewal with Nginx reload hook:**

```bash
# Deploy hook — Nginx reloads automatically after each successful renewal
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null << 'EOF'
#!/bin/bash
set -e
nginx -t && systemctl reload nginx
logger "Let's Encrypt certificate renewed and Nginx reloaded for: $RENEWED_DOMAINS"
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Verify the systemd timer is active (Certbot installs this automatically)
sudo systemctl status certbot.timer
# Check next renewal run time:
sudo systemctl list-timers certbot.timer

# Test the full renewal flow without actually renewing
sudo certbot renew --dry-run --deploy-hook /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

5. **WordPress — fix mixed content after HTTPS migration:**

```bash
# Update site URLs in the database
wp search-replace 'http://example.com' 'https://example.com' --all-tables

# Update wp-config.php to recognize HTTPS behind ALB/CloudFront
# (already handled by Nginx — but add this as a safety net)
wp config set WP_HOME 'https://example.com'
wp config set WP_SITEURL 'https://example.com'

# Flush caches
wp cache flush
wp rewrite flush
```

---

## Scenario 7: Nginx Rate Limiting to Protect WordPress Login from Brute Force

**Scenario:**
A WordPress site's `wp-login.php` is being targeted by a credential-stuffing botnet. Server logs show 2,000–5,000 POST requests per minute from hundreds of distributed IPs. PHP-FPM is saturating processing login attempts. The site has no WAF and needs a pure Nginx solution deployed immediately.

**Challenge:**
Implement multi-layer Nginx rate limiting that throttles login attempts per IP, returns proper 429 responses, blocks known bad user agents, and does not disrupt legitimate users or the REST API.

**Solution:**

1. **Define rate limit zones in the http context (`nginx.conf`):**

```nginx
# /etc/nginx/nginx.conf — inside http{} block

# Login rate limit: 5 attempts per minute per IP (very restrictive)
limit_req_zone  $binary_remote_addr zone=wp_login:20m    rate=5r/m;

# REST API rate limit: 60 requests per minute per IP
limit_req_zone  $binary_remote_addr zone=wp_api:20m      rate=60r/m;

# General WordPress requests: 300 per minute per IP
limit_req_zone  $binary_remote_addr zone=wp_general:20m  rate=300r/m;

# Connection limit per IP (prevents slowloris and connection flooding)
limit_conn_zone $binary_remote_addr zone=wp_conn:20m;

# Return 429 Too Many Requests instead of Nginx's default 503
limit_req_status  429;
limit_conn_status 429;

# Block known bad user agents (map is evaluated once per request at http level)
map $http_user_agent $is_bad_ua {
    default                                      0;
    ""                                           1;   # no user agent
    ~*(sqlmap|nikto|nmap|masscan|zgrab)          1;   # vulnerability scanners
    ~*(wpscan|wp-scan|wpscanner)                 1;   # WordPress scanners
    ~*(python-requests|go-http-client|libwww)    1;   # scripted clients
    ~*curl/[0-7]\.                               1;   # old curl (scrapers)
}
```

2. **Apply rate limits in the server block:**

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    root /var/www/wordpress;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Block bad user agents site-wide before anything else
    if ($is_bad_ua) {
        return 403;
    }

    # Connection limit: max 20 simultaneous connections per IP
    limit_conn wp_conn 20;

    # --- WordPress login (strictest rate limit) ---
    location = /wp-login.php {
        # 5 r/m base rate, allow burst of 3 but process immediately (nodelay)
        limit_req        zone=wp_login burst=3 nodelay;
        limit_req_log_level warn;

        # Additional: block if request body is suspiciously large (not a login form)
        client_max_body_size 1m;

        fastcgi_pass  unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include       fastcgi_params;
    }

    # --- XML-RPC: common credential stuffing vector ---
    location = /xmlrpc.php {
        # Block entirely — if you need Jetpack, whitelist Jetpack IPs instead
        deny all;
        return 403;
        access_log off;
        log_not_found off;
    }

    # --- REST API ---
    location /wp-json/ {
        limit_req zone=wp_api burst=20 nodelay;
        try_files $uri $uri/ /index.php?$args;
    }

    # --- General WordPress ---
    location / {
        limit_req zone=wp_general burst=50 nodelay;
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        try_files    $uri =404;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include      fastcgi_params;
    }
}
```

3. **Custom 429 error page to avoid Nginx default:**

```nginx
# In server block
error_page 429 /429.html;
location = /429.html {
    root  /var/www/error-pages;
    internal;
    add_header Retry-After 60 always;
    add_header Content-Type "text/html" always;
}
```

```bash
# Create the error page
sudo mkdir -p /var/www/error-pages
sudo tee /var/www/error-pages/429.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html><head><title>Too Many Requests</title></head>
<body><h1>Too Many Requests</h1>
<p>You have exceeded the login rate limit. Please wait 60 seconds and try again.</p>
</body></html>
EOF
```

4. **Monitor rate limiting in real time:**

```bash
# Count 429 responses per minute from the access log
tail -f /var/log/nginx/access.log \
  | awk '$9 == 429 {count++} NR%100==0 {print "429s last 100 lines:", count; count=0}'

# Find the top IPs being rate-limited
grep " 429 " /var/log/nginx/access.log \
  | awk '{print $1}' \
  | sort | uniq -c | sort -rn | head -20

# View rate-limit log entries specifically
grep "limiting requests" /var/log/nginx/error.log | tail -30

# If a single IP is generating the bulk of attacks, ban it immediately
iptables -I INPUT -s 203.0.113.45 -j DROP
# Or use a more permanent approach with fail2ban
```

5. **Integrate fail2ban for persistent IP blocking:**

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create WordPress login jail
sudo tee /etc/fail2ban/jail.d/wordpress.conf > /dev/null << 'EOF'
[nginx-wp-login]
enabled   = true
port      = http,https
filter    = nginx-wp-login
logpath   = /var/log/nginx/access.log
maxretry  = 10
findtime  = 60
bantime   = 3600   ; ban for 1 hour
action    = iptables-multiport[name=WPLogin, port="http,https", protocol=tcp]
EOF

# Create the filter for 429 responses to wp-login.php
sudo tee /etc/fail2ban/filter.d/nginx-wp-login.conf > /dev/null << 'EOF'
[Definition]
failregex = ^<HOST> .* "POST /wp-login\.php HTTP/.*" 429
ignoreregex =
EOF

sudo systemctl restart fail2ban
sudo fail2ban-client status nginx-wp-login
```
```
