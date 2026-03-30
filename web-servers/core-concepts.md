# Web Server — Core Concepts

> Nginx and Apache essentials for production WordPress hosting.

---

## 1. Nginx vs Apache

Both are battle-tested HTTP servers with fundamental architectural differences:

| Feature | Nginx | Apache |
|---------|-------|--------|
| Architecture | Event-driven, async, non-blocking | Process/thread per connection |
| Static files | Extremely fast (kernel sendfile) | Slower (goes through module chain) |
| Dynamic PHP | Passes to PHP-FPM via FastCGI | mod_php or FastCGI/FPM |
| `.htaccess` | Not supported (use `try_files`) | Supported (re-read on every request) |
| Memory | Very low (~2 MB per worker) | Higher per-process overhead |

WordPress on Nginx requires a `try_files` rule for pretty permalinks:

```nginx
location / {
    try_files $uri $uri/ /index.php?$args;
}
```

---

## 2. Virtual Hosts / Server Blocks

Allow multiple websites to share one server, distinguished by domain name or IP.

```nginx
# Nginx server block
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    root /var/www/example.com/public;
    index index.php;
}
```

```apache
# Apache virtual host
<VirtualHost *:443>
    ServerName example.com
    DocumentRoot /var/www/example.com/public
</VirtualHost>
```

---

## 3. SSL/TLS

TLS encrypts traffic between browser and server. Key settings for WordPress production:
- **Certificate**: Let's Encrypt (free, auto-renew via Certbot)
- **Protocol**: TLS 1.2 + TLS 1.3 only (disable 1.0 and 1.1)
- **HSTS**: force HTTPS for future visits via `Strict-Transport-Security` header
- **OCSP Stapling**: server pre-fetches revocation status, eliminating a round-trip

```nginx
ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
ssl_protocols       TLSv1.2 TLSv1.3;
ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache   shared:SSL:10m;
ssl_stapling        on;
ssl_stapling_verify on;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

---

## 4. PHP-FPM

PHP-FPM (FastCGI Process Manager) runs PHP as a separate process pool. Nginx communicates via Unix socket using FastCGI. Key pool settings:

- `pm = dynamic` — scales workers based on demand
- `pm.max_children` — set to `available_RAM ÷ avg_php_memory` (WP uses ~30-60 MB/worker)
- `request_terminate_timeout = 120` — kill stuck PHP processes
- Unix sockets are faster than TCP sockets for local communication

```nginx
location ~ \.php$ {
    try_files          $uri =404;
    fastcgi_pass       unix:/run/php/php8.2-fpm.sock;
    fastcgi_index      index.php;
    fastcgi_param      SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include            fastcgi_params;
    fastcgi_read_timeout 120;
    fastcgi_buffers    16 16k;
    fastcgi_buffer_size 32k;
}
```

---

## 5. Reverse Proxy

Nginx proxies requests to backend servers (PHP-FPM, Node.js, Varnish). `proxy_pass` with an `upstream` block enables load balancing and keepalive connections.

```nginx
upstream wp_backend {
    server 127.0.0.1:8080;
    server 10.0.0.2:8080;
    keepalive 16;
}

location / {
    proxy_pass         http://wp_backend;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header   Connection "";
}
```

---

## 6. Caching Headers

HTTP caching headers control how long browsers and CDNs cache responses:
- **Static assets** (`/wp-content/`): `Cache-Control: public, max-age=31536000, immutable`
- **Dynamic pages**: `Cache-Control: no-cache` or short `s-maxage` for CDN only
- **REST API (public)**: short TTL with `Vary: Accept, Accept-Encoding`

```nginx
# Static assets — 1 year cache
location ~* \.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
}

# HTML pages
location / {
    add_header Cache-Control "no-cache, s-maxage=300";
    try_files $uri $uri/ /index.php?$args;
}
```

---

## 7. Rate Limiting

Nginx's `limit_req` module uses a leaky bucket algorithm to protect against brute-force attacks on `wp-login.php` and REST API abuse.

```nginx
# Define zones in http{} block
limit_req_zone $binary_remote_addr zone=wp_login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m       rate=30r/s;

# Apply in server block
location = /wp-login.php {
    limit_req zone=wp_login burst=3 nodelay;
    limit_req_status 429;
    # ... fastcgi
}

location /wp-json/ {
    limit_req zone=api burst=10 nodelay;
    try_files $uri $uri/ /index.php?$args;
}
```

---

## 8. HTTP/2 and HTTP/3

**HTTP/2** multiplexes requests over a single TCP connection (no head-of-line blocking at the HTTP layer) and compresses headers (HPACK). Enable by adding `http2` to the `listen` directive.

**HTTP/3** uses QUIC (UDP) for even lower latency, especially on lossy connections. Supported in Nginx 1.25+.

```nginx
# HTTP/2
listen 443 ssl http2;

# HTTP/3 (Nginx >= 1.25)
listen 443 quic reuseport;
listen 443 ssl http2;
add_header Alt-Svc 'h3=":443"; ma=86400' always;

# HTTP/2 push (deprecated in Chrome, but useful for reverse proxy push)
# http2_push /wp-content/themes/my-theme/style.css;
```

---

## 9. Gzip and Brotli Compression

Compressing text responses reduces bandwidth by 60-80%. Brotli achieves 15-25% better ratios than gzip.

```nginx
# Gzip (built-in)
gzip            on;
gzip_vary       on;
gzip_comp_level 6;
gzip_min_length 256;
gzip_types
    text/plain text/css application/javascript application/json
    application/xml image/svg+xml font/truetype;

# Brotli (requires ngx_brotli module)
brotli            on;
brotli_comp_level 6;
brotli_types      text/plain text/css application/javascript application/json image/svg+xml;
```

---

## 10. Security Headers

Security headers mitigate XSS, clickjacking, MIME-sniffing, and other attacks. WordPress requires care with CSP because of inline scripts and styles in core/plugins.

```nginx
add_header X-Frame-Options        "SAMEORIGIN"                          always;
add_header X-Content-Type-Options "nosniff"                             always;
add_header Referrer-Policy        "strict-origin-when-cross-origin"     always;
add_header Permissions-Policy     "camera=(), microphone=(), geolocation=()" always;

# Start in report-only mode to discover violations before enforcing
add_header Content-Security-Policy-Report-Only
    "default-src 'self';
     script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
     img-src 'self' data: https:;
     font-src 'self' https://fonts.gstatic.com;
     report-uri /csp-report" always;

server_tokens off; # hide Nginx version

## Nginx vs Apache

| Feature | Nginx | Apache |
|---|---|---|
| Architecture | Event-driven, async, non-blocking | Process/thread-based (prefork, worker, event MPM) |
| Static files | Extremely fast; served from OS cache | Slower; each request spawns or reuses a process |
| Dynamic content | Passes to PHP-FPM via fastcgi | mod_php runs PHP inside the Apache process |
| Config | Server blocks compiled at startup | Virtual hosts + .htaccess per-directory (disk read per request) |
| Memory | Low baseline (~2–5 MB/worker) | Higher; scales with active connections |
| .htaccess support | Not supported | Supported (useful for shared hosting; has a perf cost) |
| Best use case | High-concurrency, reverse proxy, static serving | Legacy apps needing .htaccess, shared hosting |

**Nginx** uses a fixed number of worker processes (typically one per CPU core). Each worker runs a non-blocking event loop (epoll on Linux) that multiplexes thousands of connections. This solves the C10K problem — Apache's prefork MPM spawns one process per connection, running out of memory around 1,000–2,000 concurrent connections.

**Apache** with the `event` MPM is competitive in performance, but `.htaccess` files require a disk read for every request in every directory up the path — expensive at scale. In Nginx, all config is parsed at startup into memory.

---

## Virtual Hosts (Apache) and Server Blocks (Nginx)

Both allow one IP address to host multiple websites by inspecting the `Host` HTTP header.

**Apache** uses `<VirtualHost *:80>` blocks with `ServerName` and `ServerAlias` directives.

**Nginx** uses `server { }` blocks with `server_name` directives.

Nginx server block selection priority:
1. Exact `server_name` match (e.g., `example.com`)
2. Leading wildcard (`*.example.com`)
3. Trailing wildcard (`example.*`)
4. Regex match (`~^(www\.)?example\.`)
5. `default_server` flag on the listen directive

If no `server_name` matches, Nginx falls through to the `default_server` block (or the first block defined for that port).

---

## PHP-FPM Socket

PHP-FPM (FastCGI Process Manager) runs PHP in a separate pool of processes, decoupled from Nginx. Nginx and PHP-FPM communicate via FastCGI protocol over either:

- **Unix domain socket** (`unix:/run/php/php8.2-fpm.sock`) — faster because there is no TCP overhead; both processes share the same kernel. Preferred when Nginx and PHP-FPM are on the same host.
- **TCP socket** (`127.0.0.1:9000`) — required when PHP-FPM runs in a separate container or remote server.

The `fastcgi_pass` Nginx directive specifies which socket to use. `fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name` is the critical param that tells PHP-FPM the absolute filesystem path of the script to execute — without it PHP-FPM returns a blank response.

`include fastcgi_params;` loads a standard file of FastCGI variables (query string, request method, content type, etc.) that WordPress and PHP rely on.

---

## SSL/TLS Termination

TLS termination is the process of decrypting an HTTPS connection at a specific point in the request path:

- **Nginx edge termination:** Nginx decrypts traffic from clients, then forwards plain HTTP to PHP-FPM or upstream app servers on a trusted internal network. Reduces CPU load on app servers. Requires `proxy_set_header X-Forwarded-Proto $scheme` so the app knows the original request was HTTPS.
- **End-to-end encryption (TLS passthrough):** Nginx proxies raw TCP without decryption. The backend handles TLS. Used when compliance rules require encrypted traffic on the internal network.
- **Re-encryption:** Nginx terminates TLS from the client, then re-encrypts the connection to the upstream over HTTPS. Maximum security; more CPU overhead.

Key Nginx SSL directives: `ssl_certificate`, `ssl_certificate_key`, `ssl_protocols TLSv1.2 TLSv1.3`, `ssl_ciphers`, `ssl_prefer_server_ciphers off`, `ssl_session_cache shared:SSL:10m`, `ssl_stapling on`.

**OCSP stapling** (`ssl_stapling on; ssl_stapling_verify on;`) caches the certificate revocation status at the server, so the browser does not need to contact the CA on every handshake — faster connections and better privacy.

---

## HTTP/2 and HTTP/3

### HTTP/2
- Multiplexing: multiple request/response streams over a single TCP connection — eliminates HTTP/1.1 head-of-line blocking at the application layer.
- Binary framing instead of plain text — more efficient parsing.
- Header compression (HPACK) — reduces overhead for repeated headers.
- Server Push — server can proactively send assets before the client requests them (deprecated in practice; CDNs handle this better via preload hints).
- Requires HTTPS in all major browsers.
- Enable in Nginx: `listen 443 ssl http2;`

### HTTP/3
- Uses QUIC (UDP-based transport) instead of TCP — eliminates TCP-level head-of-line blocking entirely.
- Faster connection setup: 0-RTT on reconnect (no TCP + TLS handshake round trips).
- Better performance on lossy/high-latency networks (mobile).
- Nginx 1.25+ supports HTTP/3: `listen 443 quic reuseport;` plus `add_header Alt-Svc 'h3=":443"; ma=86400';` to advertise support.
- Widely available via CDNs (Cloudflare, CloudFront) even without server-level support.

---

## Reverse Proxy

Nginx forwards client requests to one or more upstream servers (PHP-FPM, Node.js, Python, another Nginx) and returns the response to the client. The client only ever sees Nginx.

Key directives:
| Directive | Purpose |
|---|---|
| `proxy_pass http://upstream` | Forward to upstream URL or upstream group |
| `proxy_set_header Host $host` | Preserve the original Host header |
| `proxy_set_header X-Real-IP $remote_addr` | Pass actual client IP |
| `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` | Append to the forwarded-for chain |
| `proxy_set_header X-Forwarded-Proto $scheme` | Tell app whether original request was HTTP or HTTPS |
| `proxy_buffering on` | Buffer upstream response in Nginx memory before sending to client |
| `proxy_connect_timeout 5s` | Timeout for establishing connection to upstream |
| `proxy_read_timeout 60s` | Timeout waiting for upstream to send a response |

The `upstream` block defines a pool of backend servers with load balancing: round-robin (default), `least_conn`, `ip_hash`, or `hash $request_uri`. `keepalive 32` maintains persistent connections to upstreams, avoiding TCP handshake overhead on every request.

---

## Caching Headers

### Cache-Control
HTTP/1.1 directive sent by the server instructing browsers and intermediate caches (CDNs, proxies) how to cache a response:
- `public` — cacheable by any cache (browser + CDN)
- `private` — browser cache only (not CDNs); used for authenticated/personal content
- `no-cache` — cached copy is stored but must be revalidated with the server (via ETag or Last-Modified) before use
- `no-store` — never cache; sensitive data (bank statements, medical records)
- `max-age=N` — seconds until the response is stale (browser)
- `s-maxage=N` — overrides `max-age` for shared caches (CDNs) only
- `immutable` — browser will not revalidate during the `max-age` period; safe only for versioned/hashed filenames

### ETag
A unique identifier (hash or opaque token) representing a specific version of a resource. The browser caches the ETag and sends `If-None-Match: <etag>` on subsequent requests. If the resource has not changed, the server returns `304 Not Modified` with no body — saving bandwidth. Nginx generates ETags automatically for static files.

### Expires
HTTP/1.0 header with an absolute expiry date (`Expires: Thu, 31 Dec 2026 23:59:59 GMT`). Superseded by `Cache-Control: max-age` in HTTP/1.1, but still used for backward compatibility with old proxies.

### Last-Modified / If-Modified-Since
Timestamp-based conditional request mechanism. Less precise than ETag (1-second granularity) but useful for static files.

---

## Rate Limiting

Nginx uses the `ngx_http_limit_req_module` to throttle requests using a leaky-bucket algorithm.

```
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
```
- `$binary_remote_addr` — key (rate limit per IP; alternatives: `$http_x_forwarded_for`, cookie value)
- `zone=login:10m` — shared memory zone named "login", 10 MB (stores ~160,000 IP states)
- `rate=5r/m` — allow 5 requests per minute

```
limit_req zone=login burst=3 nodelay;
```
- `burst=3` — allow a queue of up to 3 additional requests above the rate before returning 429
- `nodelay` — process burst requests immediately rather than artificially spacing them; requests beyond burst are rejected with 429 immediately

Return 429 instead of the default 503: `limit_req_status 429;`

Common use cases: protecting `wp-login.php`, `xmlrpc.php`, REST API endpoints, contact form handlers from brute force and credential stuffing.

---

## Security Headers

### Content-Security-Policy (CSP)
Restricts the origins from which the browser may load scripts, styles, images, fonts, frames, etc. The strongest defense against XSS. Start with `default-src 'self'` and add exceptions per resource type. Use `Content-Security-Policy-Report-Only` with a `report-uri` to audit before enforcing. Nonces (`'nonce-{RANDOM}'`) allow inline scripts without `unsafe-inline`.

### HTTP Strict Transport Security (HSTS)
`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
Tells browsers to only connect to this domain over HTTPS for the specified duration. `includeSubDomains` covers all subdomains. `preload` enables submission to browser vendor HSTS preload lists (Chrome, Firefox, Safari) — hardcodes HTTPS-only in the browser binary. Irreversible until max-age expires and the domain is removed from the list.

### X-Frame-Options
`DENY` or `SAMEORIGIN` — prevents the page from being loaded in an iframe. Mitigates clickjacking attacks. Superseded by CSP `frame-ancestors` directive but still needed for legacy browsers.

### X-Content-Type-Options
`nosniff` — prevents browsers from MIME-sniffing a response away from the declared `Content-Type`. Stops certain XSS vectors where an attacker uploads a polyglot file (e.g., a JPEG that is also valid JavaScript).

### Referrer-Policy
Controls how much referrer information is sent with requests. `strict-origin-when-cross-origin` is the recommended default: sends full URL for same-origin, only the origin for cross-origin HTTPS→HTTPS, and nothing for HTTPS→HTTP.

### Permissions-Policy
Restricts access to browser APIs (camera, microphone, geolocation, payment, fullscreen) per page or per iframe. Successor to Feature-Policy.

---

## Gzip and Brotli Compression

### Gzip
Built into Nginx (`ngx_http_gzip_module`). Compresses responses on the fly before sending to the client.
- `gzip on` — enable
- `gzip_types text/html text/css application/javascript application/json image/svg+xml` — apply to text-based content only; never compress already-compressed formats (JPEG, PNG, WebP, MP4, ZIP)
- `gzip_min_length 1000` — skip files smaller than 1 KB (overhead not worth it)
- `gzip_comp_level 6` — compression level 1–9; 5–6 balances CPU and ratio well
- `gzip_vary on` — adds `Vary: Accept-Encoding` header so CDNs cache both compressed and uncompressed variants
- `gzip_static on` — serve pre-compressed `.gz` files if they exist on disk (no runtime CPU cost)

### Brotli
Google's compression algorithm; typically 15–25% better compression than gzip for text content. Requires the `ngx_brotli` third-party module (not in mainline Nginx; available via OpenResty, custom builds, or some distro packages).
- `brotli on; brotli_types ...; brotli_comp_level 6; brotli_static on;`
- Only available over HTTPS (browsers refuse Brotli over HTTP)

CDNs (Cloudflare, Fastly) can apply Brotli even if the origin server only sends gzip.

---

## Log Formats

Nginx's built-in `combined` format:
```
$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
```

Custom JSON format (easier to ingest into ELK Stack, Grafana Loki, Datadog):
```nginx
log_format json_combined escape=json
  '{'
    '"time":"$time_iso8601",'
    '"remote_addr":"$remote_addr",'
    '"method":"$request_method",'
    '"uri":"$request_uri",'
    '"status":$status,'
    '"bytes_sent":$body_bytes_sent,'
    '"request_time":$request_time,'
    '"upstream_response_time":"$upstream_response_time",'
    '"cache_status":"$upstream_cache_status",'
    '"referer":"$http_referer",'
    '"user_agent":"$http_user_agent",'
    '"ssl_protocol":"$ssl_protocol"'
  '}';
```

Key variables:
| Variable | Meaning |
|---|---|
| `$request_time` | Total time from first byte received to last byte sent (seconds, milliseconds precision) |
| `$upstream_response_time` | Time waiting for PHP-FPM or upstream to respond |
| `$upstream_cache_status` | `HIT`, `MISS`, `BYPASS`, `EXPIRED`, `STALE` — for FastCGI/proxy cache debugging |
| `$ssl_protocol` / `$ssl_cipher` | TLS version and cipher suite — useful for deprecating TLS 1.0/1.1 |
| `$body_bytes_sent` | Response body size (excludes headers) |

Performance tip: `access_log off;` (or route to `/dev/null`) for static asset locations (`location ~* \.(css|js|png|jpg|woff2)$`) to reduce disk I/O on high-traffic sites. Error log levels: `error_log /var/log/nginx/error.log warn;` — use `warn` in production, `debug` only when diagnosing issues (extremely verbose).
