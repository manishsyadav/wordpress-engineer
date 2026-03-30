# Web Server — Interview Questions

> 15 questions: 5 Basic · 5 Mid · 5 Advanced. Every answer includes an inline Nginx config snippet.

---

## Basic

### Q1. What is the fundamental architectural difference between Nginx and Apache?

Nginx is **event-driven and asynchronous**: a small number of worker processes each handle thousands of concurrent connections in a non-blocking event loop. Apache is **process/thread-based**: by default it forks a process (prefork MPM) or spawns a thread (worker/event MPM) per connection, which consumes more RAM under high concurrency.

For WordPress, Nginx excels at serving static assets (images, CSS, JS) via the kernel's `sendfile()` and passes PHP exclusively to PHP-FPM — there is no `mod_php` equivalent.

```nginx
# Nginx worker tuning — typically one worker per CPU core
worker_processes  auto;
events {
    worker_connections 1024;  # simultaneous connections per worker
    use epoll;                 # Linux kernel event notification
}
```

---

### Q2. What are the main HTTP methods and when are they used in WordPress?

| Method | Purpose | WordPress example |
|--------|---------|-------------------|
| `GET` | Retrieve a resource | Load a post, REST `GET /wp-json/wp/v2/posts` |
| `POST` | Create / submit data | Submit a comment, REST `POST /wp-json/wp/v2/posts` |
| `PUT` | Replace a resource | REST `PUT /wp-json/wp/v2/posts/42` |
| `PATCH` | Partial update | REST `PATCH /wp-json/wp/v2/posts/42` |
| `DELETE` | Remove a resource | REST `DELETE /wp-json/wp/v2/posts/42` |
| `OPTIONS` | CORS preflight | Browser checks allowed methods before cross-origin request |
| `HEAD` | Headers only (no body) | Cache freshness checks |

Nginx passes all methods to PHP-FPM unchanged; you can restrict unwanted methods at the server level:

```nginx
# Block xmlrpc.php (brute-force target)
location = /xmlrpc.php {
    deny all;
    return 444;
}

# Allow only GET/POST/HEAD on the frontend
location / {
    limit_except GET POST HEAD { deny all; }
    try_files $uri $uri/ /index.php?$args;
}
```

---

### Q3. What do common HTTP status codes mean and how does Nginx return them?

| Code | Meaning | Common WordPress cause |
|------|---------|------------------------|
| `200` | OK | Normal response |
| `301` | Permanent redirect | HTTP → HTTPS, old slug → new slug |
| `302` | Temporary redirect | WooCommerce checkout redirects |
| `304` | Not Modified | Browser cache still valid (ETag/Last-Modified) |
| `400` | Bad Request | Malformed REST request body |
| `401` | Unauthorized | Missing/invalid nonce or Application Password |
| `403` | Forbidden | `deny all` rule; file permission issue |
| `404` | Not Found | Permalink not resolved; missing `try_files` |
| `429` | Too Many Requests | Rate limit triggered |
| `500` | Internal Server Error | PHP fatal error |
| `502` | Bad Gateway | PHP-FPM is down or socket path wrong |
| `504` | Gateway Timeout | PHP-FPM took too long; `fastcgi_read_timeout` exceeded |

```nginx
# Custom error pages
error_page 404 /404.php;
error_page 500 502 503 504 /50x.html;

location = /50x.html {
    root /var/www/html;
    internal;
}
```

---

### Q4. What is a virtual host (server block in Nginx) and why is it needed?

A **server block** lets one physical server host multiple websites, distinguished by hostname (`server_name`). Nginx reads the incoming `Host` header and routes the request to the matching block.

Selection order: exact `server_name` match → leading wildcard → trailing wildcard → regex → `default_server`. If nothing matches, Nginx uses the first block or the one marked `default_server`.

```nginx
# Site A
server {
    listen 443 ssl http2;
    server_name site-a.com www.site-a.com;
    root /var/www/site-a/public;
    index index.php;
    # ... SSL and PHP-FPM config
}

# Site B — default_server catches unknown Host headers
server {
    listen 443 ssl http2 default_server;
    server_name site-b.com;
    root /var/www/site-b/public;
}
```

---

### Q5. How does Nginx serve static files efficiently, and what directive is required for WordPress pretty permalinks?

Nginx serves static files using the OS kernel's **`sendfile()`** syscall, which transfers data directly from disk cache to the network socket without copying through user space — far faster than Apache's module chain.

WordPress pretty permalinks (e.g. `/blog/my-post/`) are not real filesystem paths; Nginx must fall back to `index.php` when the file/directory does not exist:

```nginx
server {
    root /var/www/example.com/public;
    index index.php;

    # Static files — served directly, no PHP
    location ~* \.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
        try_files $uri =404;
    }

    # WordPress permalinks — try file, directory, then hand to WP
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
}
```

Without `try_files $uri $uri/ /index.php?$args`, all pretty-permalink URLs return 404.

---

## Mid

### Q6. How do you configure Nginx to pass PHP requests to PHP-FPM, and what pool settings matter most?

Nginx communicates with PHP-FPM over a **Unix socket** (faster than TCP for local processes) using the FastCGI protocol.

Critical PHP-FPM pool settings (`/etc/php/8.2/fpm/pool.d/www.conf`):

| Setting | Recommended value | Why |
|---------|------------------|-----|
| `pm` | `dynamic` | Scales workers with load |
| `pm.max_children` | `RAM ÷ 50 MB` | WP uses ~30–60 MB/worker |
| `pm.start_servers` | 5 | Initial pool size |
| `request_terminate_timeout` | `120s` | Kill stuck PHP processes |
| `listen` | Unix socket path | Lower latency than TCP |

```nginx
location ~ \.php$ {
    try_files          $uri =404;                           # prevent arbitrary file execution
    fastcgi_pass       unix:/run/php/php8.2-fpm.sock;
    fastcgi_index      index.php;
    fastcgi_param      SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include            fastcgi_params;
    fastcgi_read_timeout 120;
    fastcgi_buffers    16 16k;
    fastcgi_buffer_size 32k;
}
```

`try_files $uri =404` prevents Nginx from passing non-existent paths to PHP-FPM, which would otherwise allow remote code execution via uploaded file paths.

---

### Q7. How do you set up HTTPS with Let's Encrypt on an Nginx WordPress server?

1. Install Certbot: `sudo apt install certbot python3-certbot-nginx`
2. Obtain certificate: `sudo certbot --nginx -d example.com -d www.example.com`
3. Certbot edits your server block automatically; for manual control:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache   shared:SSL:10m;
    ssl_stapling        on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    root /var/www/example.com/public;
    index index.php;
    # ... PHP-FPM and try_files config
}
```

Auto-renewal: Certbot installs a systemd timer (`certbot.timer`) that runs `certbot renew` twice daily. Verify with `systemctl status certbot.timer`. Nginx reloads automatically via the `--deploy-hook "nginx -s reload"` flag.

---

### Q8. How does gzip compression work in Nginx and what types should be compressed for WordPress?

Nginx compresses responses on the fly before sending them to the browser. The browser advertises support via `Accept-Encoding: gzip`. `gzip_vary on` adds a `Vary: Accept-Encoding` header so CDNs cache compressed and uncompressed versions separately.

**Do not compress** already-compressed formats (JPEG, PNG, WebP, WOFF2) — they won't shrink and you waste CPU.

```nginx
http {
    gzip              on;
    gzip_vary         on;
    gzip_comp_level   6;          # 1 (fastest) – 9 (best ratio); 6 is the sweet spot
    gzip_min_length   256;        # don't compress tiny responses
    gzip_proxied      any;        # compress for proxied requests too
    gzip_types
        text/plain
        text/css
        application/javascript
        application/json
        application/xml
        image/svg+xml
        font/truetype
        application/vnd.ms-fontobject
        text/javascript;
    # Note: text/html is always compressed when gzip is on
}
```

Brotli (15–25% better ratio) requires the `ngx_brotli` module and serves `br` encoding when the browser supports it.

---

### Q9. What is a reverse proxy and how does Nginx proxy requests to a backend in WordPress hosting?

A **reverse proxy** sits in front of one or more backend servers, forwarding client requests and returning the backend's response. In WordPress stacks, Nginx often proxies to PHP-FPM (FastCGI), a Node.js API, Varnish Cache, or another Nginx instance.

The `proxy_set_header` directives preserve the original client IP and protocol so WordPress's `$_SERVER['REMOTE_ADDR']` and `is_ssl()` work correctly.

```nginx
upstream wp_backend {
    server 127.0.0.1:8080;
    server 10.0.0.2:8080 backup;   # failover
    keepalive 16;                   # reuse connections to backend
}

server {
    listen 443 ssl http2;
    server_name example.com;

    location / {
        proxy_pass         http://wp_backend;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Connection "";    # enable keepalive to upstream
        proxy_connect_timeout 10s;
        proxy_read_timeout    120s;
    }
}
```

---

### Q10. How do you rate-limit `wp-login.php` with Nginx to defend against brute-force attacks?

Nginx's `limit_req` module uses a **leaky bucket** algorithm. Requests that arrive faster than the defined rate are either delayed (burst queue) or rejected (nodelay). Define zones in the `http {}` block, apply them in `location {}` blocks.

```nginx
http {
    # Zone for login page: 10 MB shared memory, 5 requests/minute per IP
    limit_req_zone $binary_remote_addr zone=wp_login:10m rate=5r/m;

    # Zone for REST API: 30 requests/second per IP
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
}

server {
    # Protect login page
    location = /wp-login.php {
        limit_req        zone=wp_login burst=3 nodelay;
        limit_req_status 429;
        try_files        $uri =404;
        fastcgi_pass     unix:/run/php/php8.2-fpm.sock;
        fastcgi_param    SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include          fastcgi_params;
    }

    # Protect REST API
    location /wp-json/ {
        limit_req        zone=api burst=10 nodelay;
        limit_req_status 429;
        try_files        $uri $uri/ /index.php?$args;
    }
}
```

`burst=3` allows a short burst before throttling kicks in. `nodelay` rejects excess requests immediately rather than queuing them.

---

## Advanced

### Q11. What is HTTP/2 Server Push and how do Early Hints (103) replace it for WordPress?

**HTTP/2 Server Push** proactively sends assets (CSS, fonts) before the browser parses HTML and requests them. In practice it caused over-pushing (sending assets already in cache) and was removed from Chrome in 2022.

**103 Early Hints** is the modern replacement: the server sends a `103` informational response with `Link` preload headers while still generating the full page. The browser starts fetching critical assets immediately.

```nginx
# HTTP/2 — enable on listen directive
listen 443 ssl http2;

# Early Hints via Link header (Nginx >= 1.13.9)
location = / {
    add_header Link "</wp-content/themes/mytheme/style.css>; rel=preload; as=style" always;
    add_header Link "</wp-content/themes/mytheme/fonts/inter.woff2>; rel=preload; as=font; crossorigin" always;
    try_files $uri $uri/ /index.php?$args;
}

# HTTP/3 (QUIC) — Nginx >= 1.25
listen 443 quic reuseport;
add_header Alt-Svc 'h3=":443"; ma=86400' always;
```

---

### Q12. How do you perform a zero-downtime Nginx config reload and deploy WordPress without dropping requests?

Nginx's master process supports **graceful reload**: `nginx -s reload` (or `kill -HUP <master_pid>`). The master spawns new workers with the updated config; old workers finish in-flight requests then exit. No connections are dropped.

```nginx
# Blue-green upstream swap pattern
upstream wp_backend {
    server 127.0.0.1:9001;        # blue (currently live)
    server 127.0.0.1:9002 down;   # green (idle)
    keepalive 8;
}

# Nginx root uses a symlink for atomic file-based deployments
root /var/www/example.com/current/public;
# ln -sfn /var/www/example.com/releases/20260329 /var/www/example.com/current
# nginx -t && nginx -s reload
```

Deploy steps: (1) deploy code to green, (2) smoke-test green directly, (3) swap upstream weights in config, (4) `nginx -t && nginx -s reload`, (5) old blue workers drain without dropping connections.

---

### Q13. How do you implement a Content Security Policy for WordPress without breaking plugins?

CSP is the most impactful XSS mitigation but WordPress core and most plugins use **inline scripts and styles**, which a strict CSP would block. Start in **report-only** mode, analyse violations, then tighten.

```nginx
# Phase 1 — Report-Only (safe to deploy immediately)
add_header Content-Security-Policy-Report-Only
    "default-src 'self';
     script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
     font-src 'self' https://fonts.gstatic.com data:;
     img-src * data: blob:;
     connect-src 'self' https://www.google-analytics.com;
     frame-src 'self' https://www.youtube.com;
     report-uri /csp-report-endpoint"
    always;

# WordPress-specific: allow wp-admin iframes
location /wp-admin/ {
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-src 'self';" always;
}
```

Use `'nonce-<random>'` instead of `'unsafe-inline'` for the tightest policy — WordPress 6.3+ supports CSP nonces via the `wp_scripts_get_suffixes` filter.

---

### Q14. How do you configure Nginx load balancing across multiple WordPress app servers?

Nginx supports round-robin (default), `least_conn`, `ip_hash`, and consistent hash. For WordPress with sticky sessions (when not using shared Redis object cache):

```nginx
upstream wordpress_pool {
    least_conn;                          # send to least-busy backend

    server 10.0.1.10:80 weight=3;        # primary (more capacity)
    server 10.0.1.11:80 weight=1;
    server 10.0.1.12:80 backup;          # only used if others are down

    keepalive 32;                        # persistent connections to backends
}

server {
    listen 443 ssl http2;
    server_name example.com;

    location / {
        proxy_pass       http://wordpress_pool;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

Shared object cache (Redis/Memcached) and a shared filesystem (EFS/NFS for uploads) are required for true stateless horizontal scaling of WordPress.

---

### Q15. How do you integrate Varnish Cache in front of Nginx for a high-traffic WordPress site?

Varnish sits on port 80/443 (or behind a TLS-terminating Nginx), caches full-page HTML, and serves cached pages without hitting PHP at all. A second Nginx instance on port 8080 handles PHP-FPM.

```nginx
# === Frontend Nginx (TLS termination, port 443) ===
server {
    listen 443 ssl http2;
    server_name example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:6081;  # Varnish port
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Connection "";
    }
}

# === Backend Nginx (serves WordPress, port 8080) ===
server {
    listen 8080;
    server_name example.com;
    root /var/www/example.com/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        try_files      $uri =404;
        fastcgi_pass   unix:/run/php/php8.2-fpm.sock;
        fastcgi_param  SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include        fastcgi_params;
    }
}
```

In Varnish VCL, bypass cache for logged-in users (cookies `wordpress_logged_in_*`) and for `wp-admin/`. Use the W3 Total Cache or WP Rocket "Varnish" purge integration to invalidate cache on post publish/update.
