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
```
