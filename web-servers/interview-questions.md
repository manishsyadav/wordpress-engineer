# Web Servers — Nginx & Apache — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is the key architectural difference between Nginx and Apache?**
**A:** Nginx uses an event-driven, non-blocking model and handles many connections with few threads. Apache uses a process/thread-per-connection model, which consumes more memory under high concurrency.
```bash
# Check Nginx worker process count
ps aux | grep nginx
# nginx: master process and worker processes (one per CPU core by default)
```

---

**Q2: How does `.htaccess` differ between Apache and Nginx?**
**A:** Apache processes `.htaccess` files per directory at request time. Nginx does not support `.htaccess`; all configuration lives in server or location blocks, which is faster.
```nginx
# Nginx equivalent of Apache's WordPress .htaccess rewrite
location / {
    try_files $uri $uri/ /index.php?$args;
}
```

---

**Q3: What is a server block in Nginx?**
**A:** A server block defines a virtual host, binding to a port and domain name. It contains `listen`, `server_name`, `root`, and `index` directives at minimum.
```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    root /var/www/html;
    index index.php index.html;
}
```

---

**Q4: What is PHP-FPM and why is it used with Nginx?**
**A:** PHP-FPM (FastCGI Process Manager) runs PHP as a separate service. Nginx passes `.php` requests to it over a socket, decoupling the web server from PHP and enabling independent scaling.
```nginx
location ~ \.php$ {
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

---

**Q5: How do you enable HTTPS with a Let's Encrypt certificate in Nginx?**
**A:** Use `certbot --nginx` to automatically obtain a certificate and update the server block. Certbot adds the `ssl_certificate` and `ssl_certificate_key` directives.
```bash
certbot --nginx -d example.com -d www.example.com
# Adds ssl_certificate and ssl_certificate_key to the server block
```

---

**Q6: What SSL protocols and ciphers should you specify for modern TLS?**
**A:** Support only TLSv1.2 and TLSv1.3. Use a strong cipher list from Mozilla's modern profile and disable weak algorithms like RC4 and 3DES.
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
```

---

**Q7: What is HSTS and how do you enable it in Nginx?**
**A:** HTTP Strict Transport Security tells browsers to always use HTTPS for a domain. Set the `Strict-Transport-Security` header with a long `max-age` and optionally `includeSubDomains`.
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

**Q8: How do you serve static files efficiently in Nginx?**
**A:** Use `expires` or `Cache-Control` headers to instruct browsers to cache static assets. Combine with `sendfile on` and `tcp_nopush on` for efficient kernel-level file transfers.
```nginx
location ~* \.(js|css|png|jpg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

---

**Q9: How do you enable gzip compression in Nginx?**
**A:** Enable `gzip on` and list the MIME types to compress. Setting `gzip_comp_level 5` balances CPU usage and compression ratio.
```nginx
gzip on;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
gzip_comp_level 5;
gzip_min_length 256;
```

---

**Q10: What is a reverse proxy and how do you configure one in Nginx?**
**A:** A reverse proxy forwards client requests to a backend service. Use `proxy_pass` and set forwarding headers so the backend knows the real client IP.
```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

---

**Q11: How do you configure rate limiting in Nginx?**
**A:** Define a shared memory zone with `limit_req_zone`, then apply `limit_req` inside a location block. `burst` allows short spikes; `nodelay` processes burst requests immediately.
```nginx
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

location /wp-login.php {
    limit_req zone=login burst=3 nodelay;
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    include fastcgi_params;
}
```

---

**Q12: What security headers should you add to Nginx for a WordPress site?**
**A:** Add `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and a `Content-Security-Policy` to reduce clickjacking and XSS exposure.
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=()" always;
```

---

**Q13: What is the WordPress `.htaccess` rewrite rule for Apache?**
**A:** The standard WordPress rule passes all requests through `index.php` if the file or directory doesn't exist, enabling pretty permalinks.
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.php$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.php [L]
</IfModule>
```

---

**Q14: What is HTTP/2 and how do you enable it in Nginx?**
**A:** HTTP/2 multiplexes multiple requests over one connection, compresses headers, and enables server push. Add `http2` to the `listen` directive (requires HTTPS).
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    # ssl_certificate and ssl_certificate_key directives here
}
```

---

**Q15: What are PHP-FPM pool `pm` directives and why do they matter?**
**A:** `pm.max_children` caps concurrent PHP processes, preventing OOM. `pm.process_idle_timeout` governs how long idle workers survive under `pm = dynamic`.
```ini
pm = dynamic
pm.max_children = 20
pm.start_servers = 5
pm.min_spare_servers = 3
pm.max_spare_servers = 8
pm.process_idle_timeout = 10s
```

---

**Q16: What is the difference between a Unix socket and a TCP socket for PHP-FPM?**
**A:** A Unix socket uses the filesystem and avoids network overhead, making it faster when Nginx and PHP-FPM are on the same server. TCP sockets are needed for remote PHP-FPM.
```nginx
# Unix socket (same server — faster)
fastcgi_pass unix:/run/php/php8.2-fpm.sock;

# TCP socket (remote PHP-FPM)
fastcgi_pass 10.0.0.5:9000;
```

---

**Q17: How do you monitor PHP-FPM pool status?**
**A:** Enable `pm.status_path` in the pool config and expose a restricted Nginx location. Query it with `curl` or connect to a monitoring agent.
```nginx
location /fpm-status {
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
    allow 127.0.0.1;
    deny all;
}
```

---

**Q18: What connection timeout directives matter for WordPress + Nginx + PHP-FPM?**
**A:** `keepalive_timeout` keeps idle client connections open; `fastcgi_read_timeout` prevents Nginx from closing before PHP finishes a slow WP Cron or import request.
```nginx
keepalive_timeout 65;
send_timeout 30;
fastcgi_read_timeout 120;
fastcgi_connect_timeout 10;
```

---

**Q19: How do you set up logrotate for Nginx access and error logs?**
**A:** Create a logrotate config that rotates daily, keeps 14 days, compresses old logs, and sends `USR1` to Nginx to reopen log files without downtime.
```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    sharedscripts
    postrotate
        nginx -s reopen
    endscript
}
```

---

**Q20: What is Varnish Cache and how does it sit in front of Nginx?**
**A:** Varnish is an HTTP accelerator that caches full-page responses in RAM. It listens on port 80, passes cache misses to Nginx on port 8080, and serves cache hits in microseconds.
```
Client → Varnish :80 → (miss) → Nginx :8080 → PHP-FPM → WordPress
                    → (hit)  → cached response
```

---

## Mid

**Q21: How do you configure Nginx upstream load balancing for multiple PHP-FPM or app servers?**
**A:** Define an `upstream` block with backend addresses. The default strategy is round-robin; use `least_conn` for uneven request times, `ip_hash` for session stickiness.
```nginx
upstream php_backend {
    least_conn;
    server 10.0.0.1:9000 weight=3;
    server 10.0.0.2:9000 weight=1;
    keepalive 32;
}
```

---

**Q22: How do you configure OCSP stapling in Nginx?**
**A:** OCSP stapling caches the certificate revocation response on the server, saving the browser a round-trip to the CA's OCSP responder.
```nginx
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 1.1.1.1 valid=300s;
ssl_trusted_certificate /etc/ssl/chain.pem;
```

---

**Q23: How do you enable Brotli compression in Nginx?**
**A:** Install the `ngx_brotli` dynamic module, then configure it similarly to gzip. Brotli typically achieves better ratios than gzip for text assets.
```nginx
load_module modules/ngx_http_brotli_filter_module.so;

brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;
```

---

**Q24: How do you configure Nginx proxy caching?**
**A:** Define a `proxy_cache_path` and a cache zone, then enable `proxy_cache` in the location block. Set `proxy_cache_valid` to control TTL per response code.
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=wp_cache:10m inactive=60m;

location / {
    proxy_pass http://backend;
    proxy_cache wp_cache;
    proxy_cache_valid 200 10m;
    proxy_cache_bypass $cookie_wordpress_logged_in_%;
}
```

---

**Q25: How do you write a basic Varnish VCL to bypass cache for logged-in WordPress users?**
**A:** In `vcl_recv`, check for WordPress session cookies and call `return(pass)` to forward the request directly to the backend without caching.
```vcl
sub vcl_recv {
    if (req.http.Cookie ~ "wordpress_logged_in") {
        return(pass);
    }
    unset req.http.Cookie;
}
```

---

**Q26: How do you configure fail2ban to block Nginx brute-force attacks?**
**A:** Create a custom filter matching repeated `403`/`404` patterns in Nginx access logs, then define a jail to ban the offending IP via `iptables`.
```ini
# /etc/fail2ban/filter.d/nginx-limit-req.conf
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>

# /etc/fail2ban/jail.local
[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 5
bantime  = 3600
```

---

**Q27: How do you use `ssl_session_cache` to improve TLS performance?**
**A:** A shared SSL session cache stores negotiated session parameters, allowing clients to resume sessions without a full TLS handshake and reducing latency on repeat visits.
```nginx
ssl_session_cache shared:SSL:50m;
ssl_session_timeout 1d;
ssl_session_tickets off;
```

---

**Q28: How do you configure a Content Security Policy (CSP) header in Nginx?**
**A:** Add a `Content-Security-Policy` header listing trusted sources for scripts, styles, images, and fonts. Start in report-only mode during testing.
```nginx
add_header Content-Security-Policy
  "default-src 'self'; script-src 'self' https://cdn.example.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;"
always;
```

---

**Q29: How do you configure a custom Nginx access log format?**
**A:** Define a `log_format` in the `http` block with the fields you need, then reference it with `access_log`. A JSON format integrates well with log aggregators.
```nginx
log_format json_combined escape=json
  '{"time":"$time_iso8601","ip":"$remote_addr","status":$status,'
  '"method":"$request_method","uri":"$request_uri","rt":"$request_time"}';

access_log /var/log/nginx/access.log json_combined;
```

---

**Q30: How do you force HTTPS redirects in Nginx?**
**A:** Use a separate `server` block on port 80 with a `301` redirect to the HTTPS equivalent, keeping the `$host` and `$request_uri` intact.
```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}
```

---

**Q31: How do you protect `wp-login.php` from brute-force attacks in Nginx?**
**A:** Combine rate limiting with an IP allow-list or HTTP basic auth so that only known IPs or authenticated users can reach the login page.
```nginx
location = /wp-login.php {
    limit_req zone=login burst=3 nodelay;
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    include fastcgi_params;
}
```

---

**Q32: How do you configure Nginx upstream health checks (passive)?**
**A:** Use `max_fails` and `fail_timeout` in the upstream server definition. Nginx marks a backend as unavailable after `max_fails` consecutive failures within `fail_timeout` seconds.
```nginx
upstream php_backend {
    server 10.0.0.1:9000 max_fails=3 fail_timeout=30s;
    server 10.0.0.2:9000 max_fails=3 fail_timeout=30s backup;
}
```

---

**Q33: How do you enable HTTP/2 server push in Nginx?**
**A:** Use the `http2_push` directive or a `Link` preload header. Nginx converts `Link: </style.css>; rel=preload` response headers into HTTP/2 PUSH_PROMISE frames.
```nginx
location = /index.php {
    http2_push /wp-content/themes/my-theme/style.css;
    http2_push /wp-content/themes/my-theme/app.js;
}
```

---

**Q34: How do you serve different PHP-FPM pools for WordPress multisite?**
**A:** Create a separate FPM pool per site with its own Unix socket and `www-data`-compatible user. Map each Nginx `server` block to its pool's socket.
```ini
# /etc/php/8.2/fpm/pool.d/site2.conf
[site2]
user = site2
listen = /run/php/site2-fpm.sock
pm = dynamic
pm.max_children = 10
```

---

**Q35: How do you block common WordPress vulnerability scan paths in Nginx?**
**A:** Use a `location` block to `deny all` for paths like `xmlrpc.php`, readme files, and sensitive directories that scanners probe.
```nginx
location ~* ^/(xmlrpc\.php|readme\.html|license\.txt|wp-config\.php) {
    deny all;
    return 444;
}
location ~ /\. {
    deny all;
}
```

---

**Q36: How do you configure Nginx microcaching for WordPress to handle traffic spikes?**
**A:** Cache PHP responses for 1–5 seconds with `proxy_cache_valid`. Even a 1-second cache eliminates most repeated requests during a traffic spike while remaining fresh enough for most content.
```nginx
proxy_cache_valid 200 1s;
proxy_cache_key "$scheme$host$request_uri$is_args$args";
add_header X-Cache-Status $upstream_cache_status;
```

---

**Q37: How do you configure Nginx to work behind an AWS ALB (terminating SSL)?**
**A:** Set `real_ip_header` to trust the `X-Forwarded-For` header added by the ALB. Use `set_real_ip_from` to specify the ALB's CIDR range.
```nginx
set_real_ip_from 10.0.0.0/8;
real_ip_header X-Forwarded-For;
real_ip_recursive on;

# Trust X-Forwarded-Proto for redirect logic
map $http_x_forwarded_proto $redirect_https {
    default 0; https 0; http 1;
}
```

---

**Q38: How does `fastcgi_cache` differ from `proxy_cache` in Nginx?**
**A:** `fastcgi_cache` caches responses directly from a FastCGI backend (PHP-FPM), skipping proxy overhead. `proxy_cache` caches responses from upstream HTTP backends. Both use the same cache storage mechanism.
```nginx
fastcgi_cache_path /var/cache/fastcgi levels=1:2 keys_zone=wp:100m inactive=60m;

location ~ \.php$ {
    fastcgi_cache wp;
    fastcgi_cache_valid 200 10m;
    fastcgi_cache_bypass $cookie_wordpress_logged_in_;
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    include fastcgi_params;
}
```

---

**Q39: How do you integrate WP-CLI with web server maintenance tasks?**
**A:** Use WP-CLI from the command line to flush caches, update plugins, or run database operations without touching the web server. Combine with a deployment script.
```bash
# Flush all WordPress caches after deployment
wp cache flush --path=/var/www/html
wp rewrite flush --path=/var/www/html
# Reload PHP-FPM to pick up new code (no downtime)
systemctl reload php8.2-fpm
```

---

**Q40: How do you configure Nginx `keepalive` connections to upstream PHP-FPM?**
**A:** Add a `keepalive` directive to the upstream block to maintain a pool of persistent connections to PHP-FPM, reducing TCP handshake overhead on high-traffic sites.
```nginx
upstream php_fpm {
    server unix:/run/php/php8.2-fpm.sock;
    keepalive 16;
}

location ~ \.php$ {
    fastcgi_keep_conn on;
    fastcgi_pass php_fpm;
    include fastcgi_params;
}
```

---

## Advanced

**Q41: How do you architect a multi-layer caching stack for a high-traffic WordPress site?**
**A:** Layer caches from outermost to innermost: CloudFront (CDN) → Varnish (full-page) → Nginx fastcgi_cache (per-server) → Redis object cache (WP object cache API). Bypass all layers for logged-in users.
```
Browser → CloudFront → Varnish → Nginx fastcgi_cache → PHP-FPM → WP → Redis → MySQL
```

---

**Q42: How do you implement zero-downtime PHP-FPM reloads during deployments?**
**A:** Reload PHP-FPM with `systemctl reload` (sends `USR2`), which gracefully replaces worker processes. Old workers finish in-flight requests while new workers use the updated code.
```bash
# Deploy new code
rsync -a --delete /deploy/release/ /var/www/html/
# Reload without dropping connections
systemctl reload php8.2-fpm
# Verify new workers are running
php-fpm8.2 -t && systemctl status php8.2-fpm
```

---

**Q43: How do you tune Nginx worker settings for a high-concurrency WordPress server?**
**A:** Set `worker_processes auto` to match CPU cores. Increase `worker_connections` and use `epoll` (Linux) event model. Raise `worker_rlimit_nofile` to handle file-descriptor limits.
```nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}
```

---

**Q44: How do you configure dynamic TLS certificate serving for WordPress multisite with many domains?**
**A:** Use Nginx `ssl_certificate_by_lua_block` (OpenResty) or the `ssl_preread` module combined with a wildcard/SAN certificate. For arbitrary domains, Let's Encrypt with `certbot-auto` or `acme.sh` in DNS-01 mode automates issuance.
```bash
# Wildcard cert via DNS-01 challenge (works for *.example.com)
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.example.com" -d "example.com"
```

---

**Q45: How do you implement a Canary deployment using Nginx `split_clients`?**
**A:** `split_clients` maps a consistent hash of a request variable (e.g., IP) to a percentage split, routing a fraction of traffic to a new backend for gradual rollout.
```nginx
split_clients "${remote_addr}AAA" $upstream_pool {
    10%     canary_backend;
    *       stable_backend;
}

upstream canary_backend { server 10.0.1.2:8080; }
upstream stable_backend { server 10.0.1.1:8080; }

location / {
    proxy_pass http://$upstream_pool;
}
```

---

**Q46: How do you use Nginx `geo` and `map` modules to implement country-based access control?**
**A:** The `geo` block assigns a variable based on client IP. `map` can then translate that to an allow/deny flag, used in location blocks with a conditional `return`.
```nginx
geo $allowed_country {
    default         0;
    192.168.0.0/16  1;   # internal
    103.0.0.0/8     1;   # AU range
}

location /wp-admin/ {
    if ($allowed_country = 0) { return 403; }
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    include fastcgi_params;
}
```

---

**Q47: How do you configure Nginx as an API gateway for a headless WordPress + REST API setup?**
**A:** Route `/wp-json/` to the WordPress origin, serve pre-rendered Next.js pages from a Node upstream, and apply rate limiting and CORS headers centrally at Nginx.
```nginx
location /wp-json/ {
    proxy_pass http://wordpress_backend;
    add_header Access-Control-Allow-Origin "https://frontend.example.com" always;
    limit_req zone=api burst=20 nodelay;
}

location / {
    proxy_pass http://nextjs_backend;
}
```

---

**Q48: How do you set up Nginx with Let's Encrypt auto-renewal and reload in a Docker container?**
**A:** Mount the `certbot` webroot into Nginx's `well-known` directory for HTTP-01 challenge validation. Run `certbot renew` in a cron job and follow it with `nginx -s reload`.
```dockerfile
# In docker-compose.yml: share /var/www/certbot between certbot and nginx
# Nginx config fragment:
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
}

# Host cron entry:
0 3 * * * certbot renew --quiet && docker exec nginx nginx -s reload
```

---

**Q49: How do you debug a 502 Bad Gateway between Nginx and PHP-FPM?**
**A:** A 502 means Nginx cannot connect to or timed out waiting for PHP-FPM. Check the FPM socket path, pool `max_children` exhaustion, and `fastcgi_read_timeout`. Review both logs.
```bash
# Check PHP-FPM is running and socket exists
systemctl status php8.2-fpm
ls -la /run/php/php8.2-fpm.sock

# Tail both error logs simultaneously
tail -f /var/log/nginx/error.log /var/log/php8.2-fpm.log

# Check FPM pool status for queue depth
curl http://127.0.0.1/fpm-status
```

---

**Q50: How do you implement automated Nginx config testing and rolling reload in a CI/CD pipeline?**
**A:** Run `nginx -t` to syntax-check the new config before applying it. On success, use `nginx -s reload` for a graceful reload. Fail the pipeline if the test fails to prevent breaking production.
```bash
#!/bin/bash
set -e
# Copy new config
cp /deploy/nginx/site.conf /etc/nginx/sites-available/site.conf
ln -sf /etc/nginx/sites-available/site.conf /etc/nginx/sites-enabled/site.conf

# Test syntax — pipeline fails here on error
nginx -t

# Graceful reload — zero dropped connections
nginx -s reload
echo "Nginx config applied successfully"
```

---
