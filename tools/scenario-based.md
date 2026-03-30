# Tools — Scenario-Based Questions

---

## Scenario 1: Set Up a Complete Local WordPress Dev Environment with wp-env in Under 10 Minutes

**Prompt:** A new developer joins the team. They need a working WordPress environment with your custom plugin, WooCommerce, a specific WordPress version, Xdebug enabled, and a pre-loaded test dataset — all in under 10 minutes.

---

### Prerequisites

```bash
# Confirm Docker Desktop is running
docker info

# Confirm Node.js 20+ is installed
node -v    # v20.x.x or higher

# Confirm npm is available
npm -v
```

---

### Step 1 — Clone the repo and install dependencies

```bash
git clone https://github.com/acme/my-plugin.git
cd my-plugin
npm install
composer install
```

---

### Step 2 — Create `.wp-env.json`

```json
{
    "core": "WordPress/WordPress#6.5.0",
    "phpVersion": "8.2",
    "plugins": [
        ".",
        "https://downloads.wordpress.org/plugin/woocommerce.8.7.0.zip",
        "https://downloads.wordpress.org/plugin/query-monitor.3.16.1.zip"
    ],
    "themes": [
        "https://downloads.wordpress.org/theme/twentytwentyfour.1.1.zip"
    ],
    "config": {
        "WP_DEBUG":            true,
        "WP_DEBUG_LOG":        true,
        "WP_DEBUG_DISPLAY":    false,
        "SCRIPT_DEBUG":        true,
        "WP_ENVIRONMENT_TYPE": "local",
        "XDEBUG_MODE":         "debug,coverage"
    },
    "mappings": {
        "wp-content/uploads": "./tests/fixtures/uploads"
    }
}
```

---

### Step 3 — Start the environment

```bash
npx wp-env start
# WordPress runs at:  http://localhost:8888  (admin: admin / password)
# Test instance at:   http://localhost:8889  (used by PHPUnit)
```

---

### Step 4 — Load test data

```bash
# Import a WXR fixture file with sample posts, pages, and products
npx wp-env run cli wp import tests/fixtures/sample-data.xml \
    --authors=create \
    --allow-root

# Or use the Theme Unit Test data
npx wp-env run cli wp import \
    https://raw.githubusercontent.com/WPTT/theme-unit-test/master/themeunittestdata.wordpress.xml \
    --authors=create \
    --allow-root

# Set permalink structure
npx wp-env run cli wp rewrite structure '/%postname%/' --allow-root
npx wp-env run cli wp rewrite flush --allow-root

# Activate WooCommerce and run setup
npx wp-env run cli wp plugin activate woocommerce --allow-root
npx wp-env run cli wp wc tool run install_pages --user=admin --allow-root
```

---

### Step 5 — Configure VS Code Xdebug

```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Listen for Xdebug (wp-env)",
            "type": "php",
            "request": "launch",
            "port": 9003,
            "pathMappings": {
                "/var/www/html/wp-content/plugins/my-plugin": "${workspaceFolder}"
            },
            "ignore": [ "**/vendor/**/*.php", "**/node_modules/**" ]
        }
    ]
}
```

```bash
# Verify Xdebug is loaded
npx wp-env run cli php -m --allow-root | grep xdebug
# xdebug
```

---

### Step 6 — Run the build and verify

```bash
# Build JS assets
npm run start &   # watch mode

# Run PHPUnit tests against the test instance
npx wp-env run tests-cli vendor/bin/phpunit --allow-root

# Open the site
open http://localhost:8888
open http://localhost:8888/wp-admin   # admin / password
```

Total time: typically 5–8 minutes depending on Docker pull speed (first run pulls images; subsequent runs start in < 30 seconds).

---

### Teardown and Reset

```bash
npx wp-env stop                          # pause (data preserved)
npx wp-env destroy                       # wipe everything
npx wp-env clean all && npx wp-env start # fresh database, keep images
```

---

## Scenario 2: Automate WordPress Plugin Deployment to WP.org SVN via GitHub Actions

**Prompt:** Every time you push a new version tag (e.g. `v2.3.0`) to GitHub, the plugin should automatically be built, tested, and deployed to the WordPress.org plugin SVN repository without any manual SVN commands.

---

### Overview

1. Push a semver tag to GitHub.
2. GitHub Actions runs lint, unit tests, JS build.
3. The `10up/action-wordpress-plugin-deploy` action handles the SVN commit automatically.

---

### Prerequisites

```bash
# Store WP.org credentials as GitHub repository secrets:
# Settings → Secrets and variables → Actions
# WP_ORG_USERNAME  = your wp.org username
# WP_ORG_PASSWORD  = your wp.org password (or application password)
```

---

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to WordPress.org

on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'   # matches v1.0.0, v2.3.1, etc.

jobs:
  # ── 1. Quality gates must pass before deploying ───────────────────────
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: shivammathur/setup-php@v2
        with: { php-version: '8.2', tools: 'phpcs, composer' }

      - run: composer install --no-progress --prefer-dist

      - run: vendor/bin/phpcs --standard=WordPress src/ includes/

      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }

      - run: npm ci
      - run: npm run lint:js
      - run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: production-build
          path: build/
          retention-days: 1

  # ── 2. Deploy to WP.org SVN ──────────────────────────────────────────
  deploy:
    needs: quality
    runs-on: ubuntu-latest
    environment: wordpress-org   # optional: require manual approval in GitHub

    steps:
      - uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: production-build
          path: build/

      - name: Extract semantic version from tag
        id: version
        run: |
          VERSION="${GITHUB_REF#refs/tags/v}"
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "Deploying version $VERSION"

      - name: Update version in plugin header
        run: |
          sed -i "s/ \* Version:.*/ * Version: ${{ steps.version.outputs.version }}/" \
              my-plugin.php
          sed -i "s/define( 'MY_PLUGIN_VERSION'.*/define( 'MY_PLUGIN_VERSION', '${{ steps.version.outputs.version }}' );/" \
              my-plugin.php
          cat my-plugin.php | grep -E "Version|MY_PLUGIN_VERSION"

      - name: Deploy plugin to WordPress.org
        uses: 10up/action-wordpress-plugin-deploy@v2.2.2
        env:
          SVN_USERNAME: ${{ secrets.WP_ORG_USERNAME }}
          SVN_PASSWORD: ${{ secrets.WP_ORG_PASSWORD }}
          SLUG:         my-awesome-plugin
          VERSION:      ${{ steps.version.outputs.version }}
          # Files/dirs to EXCLUDE from the SVN commit (keep your repo clean)
          ASSETS_DIR:   .wordpress-org      # banner/icon images for the plugin page
          BUILD_DIR:    .                   # default: checkout root

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name:  ${{ github.ref_name }}
          name:      "Release ${{ github.ref_name }}"
          body_path: CHANGELOG.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Notify Slack on success
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"Deployed my-awesome-plugin ${{ steps.version.outputs.version }} to WP.org\"}"
```

---

### `.distignore` — Files excluded from SVN deploy

```
.github/
.wp-env.json
node_modules/
vendor/
src/
tests/
bin/
*.map
.eslintrc.json
.phpcs.xml.dist
composer.json
composer.lock
package.json
package-lock.json
phpunit.xml.dist
webpack.config.js
```

```bash
# Tag and push to trigger the workflow
git tag -a v2.3.0 -m "Version 2.3.0 — testimonial block improvements"
git push origin v2.3.0
# → GitHub Actions starts automatically
# → Watch the run: gh run watch
```

---

## Scenario 3: Debug a Production-Only PHP Error Using WP-CLI and Xdebug

**Prompt:** Users report a 500 error on the checkout page of a live WooCommerce site. The error doesn't reproduce locally. The server has WP-CLI installed but no interactive IDE. You need to diagnose and fix it without downtime.

---

### Step 1 — Enable debug logging safely (no display)

```bash
# Enable error logging without showing errors to visitors
wp config set WP_DEBUG true --raw
wp config set WP_DEBUG_LOG true --raw
wp config set WP_DEBUG_DISPLAY false --raw

# Verify
wp config get WP_DEBUG
wp config get WP_DEBUG_LOG
```

---

### Step 2 — Reproduce the error and capture the log

```bash
# Tail the debug log in real time (run this in a separate terminal)
tail -f wp-content/debug.log

# In another terminal, simulate a WooCommerce checkout request
wp eval '
    WC()->cart->add_to_cart(1, 1);
    $order = wc_create_order();
    $order->set_billing_email("test@test.com");
    $result = $order->save();
    error_log("Order save result: " . print_r($result, true));
'
```

---

### Step 3 — Check error log and recent changes

```bash
# Show last 100 lines of the debug log
wp eval 'echo file_get_contents(WP_CONTENT_DIR . "/debug.log");' | tail -100

# Identify which plugin was last updated
wp plugin list --fields=name,version,update --format=table

# Check recent file modifications (potential culprit)
find wp-content/plugins/ -name "*.php" -newer wp-includes/version.php -type f | head -20
```

---

### Step 4 — Isolate with WP-CLI eval

```bash
# Test the specific function that appears in the error trace
wp eval '
    try {
        $handler = new WC_Checkout();
        $data = [
            "billing_email"     => "test@test.com",
            "billing_first_name"=> "Jane",
            "payment_method"    => "stripe",
        ];
        $order_id = $handler->create_order($data);
        WP_CLI::success("Order created: " . $order_id);
    } catch (Exception $e) {
        WP_CLI::error($e->getMessage() . "\n" . $e->getTraceAsString());
    }
'
```

---

### Step 5 — Remote Xdebug tunnel (production)

For step-through debugging on production (use with extreme caution, on a staging clone when possible):

```bash
# On local machine — open an SSH tunnel so the server can reach your Xdebug port
ssh -R 9003:localhost:9003 user@production-server.com

# On the server — set XDEBUG_TRIGGER via a custom request header in PHP
# (start_with_request=trigger means Xdebug only activates when the header is present)
wp eval '
    $_SERVER["HTTP_X_XDEBUG_TRIGGER"] = "1";
    xdebug_break();   // programmatic breakpoint
    do_action("woocommerce_checkout_process");
'
```

---

### Step 6 — Binary-eliminate plugins

```bash
# Deactivate all plugins except WooCommerce and core
wp plugin deactivate --all
wp plugin activate woocommerce my-plugin

# Test again
wp eval 'echo WC()->cart->get_cart_contents_count();'

# Re-enable plugins one by one until the error reappears
wp plugin activate suspicious-plugin
# → error reappears → suspicious-plugin is the culprit
```

---

### Step 7 — Check for database issues

```bash
# Check for missing or corrupted tables
wp db check

# Show slow or failed queries using Query Monitor (write to log)
wp eval 'do_action("admin_init"); echo \QueryMonitor\QM_Collectors::get("db_queries")->get_data()["total_time"];'

# Check option autoloads (large autoloaded data can cause memory exhaustion)
wp eval '
    global $wpdb;
    $results = $wpdb->get_results(
        "SELECT option_name, LENGTH(option_value) AS size
         FROM $wpdb->options
         WHERE autoload = \"yes\"
         ORDER BY size DESC LIMIT 10"
    );
    foreach ($results as $r) {
        WP_CLI::log($r->option_name . ": " . number_format($r->size) . " bytes");
    }
'
```

---

### Step 8 — Fix and verify

```bash
# Apply the fix (e.g. update the plugin)
wp plugin update suspicious-plugin

# Or roll back to a previous version
wp plugin install suspicious-plugin --version=1.4.2 --force

# Verify the error is gone
wp eval 'WC()->cart->add_to_cart(1); echo "Cart OK";'

# Disable debug logging for production
wp config set WP_DEBUG false --raw
wp config set WP_DEBUG_LOG false --raw

# Clear all caches
wp cache flush
wp transient delete --all
wp rewrite flush
```

---

### Post-Mortem Checklist

```bash
# Document what was found
wp eval 'echo get_bloginfo("version");'                    # WP version
wp php-info | grep "PHP Version"                           # PHP version
wp plugin get suspicious-plugin --format=json              # Plugin details
git -C wp-content/plugins/my-plugin log --oneline -5      # Recent commits (if git-tracked)
```

---

## Scenario 4: Complete Local WordPress Environment with Docker and WP-CLI

**Prompt:** A senior developer needs a fully reproducible local environment that does not depend on wp-env or any Node.js tooling. The setup must include a specific PHP version, SSL, WP-CLI, persistent volumes, and a Mailhog SMTP trap — all defined in a single `docker-compose.yml` that any developer can spin up with one command.

---

### `docker-compose.yml`

```yaml
version: '3.9'

services:
  db:
    image: mariadb:10.11
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE:      wordpress
      MYSQL_USER:          wp
      MYSQL_PASSWORD:      wp
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  wordpress:
    build: .docker/php          # custom Dockerfile with Xdebug + WP-CLI
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      WORDPRESS_DB_HOST:     db:3306
      WORDPRESS_DB_USER:     wp
      WORDPRESS_DB_PASSWORD: wp
      WORDPRESS_DB_NAME:     wordpress
      WORDPRESS_DEBUG:       "1"
      XDEBUG_MODE:           debug
      XDEBUG_CONFIG:         "client_host=host.docker.internal client_port=9003"
    volumes:
      - ./:/var/www/html/wp-content/plugins/my-plugin:cached
      - wp_core:/var/www/html
    ports:
      - "80:80"
      - "443:443"

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI

  phpmyadmin:
    image: phpmyadmin/phpmyadmin:latest
    depends_on: [db]
    environment:
      PMA_HOST: db
      PMA_USER: root
      PMA_PASSWORD: root
    ports:
      - "8080:80"

volumes:
  db_data:
  wp_core:
```

---

### `.docker/php/Dockerfile`

```dockerfile
FROM wordpress:php8.2-apache

# Install WP-CLI
RUN curl -o /usr/local/bin/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x /usr/local/bin/wp

# Install Xdebug
RUN pecl install xdebug \
    && docker-php-ext-enable xdebug

# Xdebug config
RUN echo "xdebug.mode=debug" >> /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.client_host=host.docker.internal" >> /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.client_port=9003" >> /usr/local/etc/php/conf.d/xdebug.ini

# Self-signed SSL for local HTTPS
RUN apt-get update && apt-get install -y openssl \
    && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
       -keyout /etc/ssl/private/localhost.key \
       -out /etc/ssl/certs/localhost.crt \
       -subj "/CN=localhost" \
    && a2enmod ssl && a2ensite default-ssl

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

---

### `.docker/php/entrypoint.sh` — WP-CLI bootstrap on first start

```bash
#!/bin/bash
set -e

# Wait for WordPress core files to be present
until [ -f /var/www/html/wp-config.php ]; do sleep 1; done

# Install WordPress if not already installed
wp core is-installed --allow-root 2>/dev/null || \
  wp core install \
    --url="https://localhost" \
    --title="Local Dev" \
    --admin_user="admin" \
    --admin_password="password" \
    --admin_email="dev@localhost.local" \
    --skip-email \
    --allow-root

# Activate development plugins
wp plugin activate query-monitor --allow-root 2>/dev/null || true
wp plugin activate my-plugin --allow-root 2>/dev/null || true

# Point SMTP to Mailhog
wp eval '
    update_option("admin_email", "dev@localhost.local");
' --allow-root

# Flush rewrite rules
wp rewrite structure "/%postname%/" --allow-root
wp rewrite flush --allow-root

exec apache2-foreground
```

---

### Start, stop, and useful WP-CLI one-liners

```bash
# First start (builds images, installs WP, ~2 minutes)
docker compose up -d --build

# Subsequent starts (< 10 seconds)
docker compose up -d

# Run WP-CLI commands
docker compose exec wordpress wp plugin list --allow-root
docker compose exec wordpress wp db export /tmp/backup.sql --allow-root

# Import sample data
docker compose exec wordpress wp import /var/www/html/wp-content/plugins/my-plugin/tests/fixtures/sample.xml \
    --authors=create --allow-root

# Reset the database to a clean state
docker compose exec wordpress wp db reset --yes --allow-root
docker compose exec -T wordpress /usr/local/bin/entrypoint.sh

# Stop without losing data
docker compose stop

# Full teardown (removes volumes)
docker compose down -v
```

---

## Scenario 5: Step-by-Step Debugging with Xdebug and VS Code

**Prompt:** A complex WooCommerce extension is throwing an unexpected `null` return from a method deep in the call stack. `var_dump` and `error_log` debugging is not giving enough context. You need to set breakpoints, inspect variable state at each frame, and step through the execution path inside VS Code without modifying the plugin source.

---

### Step 1 — Install the PHP Debug extension

```
VS Code Extension: PHP Debug (xdebug.php-debug) by Xdebug
Install ID: xdebug.php-debug
```

---

### Step 2 — `launch.json` configuration

```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Listen for Xdebug",
            "type": "php",
            "request": "launch",
            "port": 9003,
            "pathMappings": {
                "/var/www/html": "${workspaceFolder}/vendor/wordpress",
                "/var/www/html/wp-content/plugins/my-extension": "${workspaceFolder}"
            },
            "ignore": [
                "**/vendor/**/*.php",
                "**/wp-includes/**/*.php",
                "**/wp-admin/**/*.php"
            ],
            "log": false,
            "xdebugSettings": {
                "max_data":     2048,
                "max_depth":    5,
                "max_children": 64
            }
        },
        {
            "name": "Xdebug: WP-CLI command",
            "type": "php",
            "request": "launch",
            "port": 9003,
            "pathMappings": {
                "/var/www/html": "${workspaceFolder}/vendor/wordpress"
            }
        }
    ]
}
```

---

### Step 3 — Verify Xdebug is active in the container

```bash
docker compose exec wordpress php -i | grep -A5 xdebug.mode
# xdebug.mode => debug => debug
# xdebug.client_host => host.docker.internal => host.docker.internal
# xdebug.client_port => 9003 => 9003
```

---

### Step 4 — Set a conditional breakpoint instead of stepping through hundreds of loop iterations

In VS Code, right-click a breakpoint gutter dot → **Edit Breakpoint** → **Expression**:

```php
// Break only when the order total exceeds £1000 and payment method is 'stripe'
$order->get_total() > 1000 && $order->get_payment_method() === 'stripe'
```

---

### Step 5 — Debug a specific WP-CLI command (no browser required)

```bash
# In the container, set XDEBUG_SESSION to trigger debugging on CLI
docker compose exec wordpress bash -c \
  "XDEBUG_SESSION=1 wp eval '
      \$order = wc_get_order(42);
      \$result = \$order->calculate_totals();
      var_dump(\$result);
  ' --allow-root"
# VS Code will pause at your breakpoint — inspect \$order, step into calculate_totals()
```

---

### Step 6 — Use the Debug Console to evaluate expressions mid-execution

While paused at a breakpoint, open the VS Code Debug Console and type:

```php
// Inspect the full order data without var_dump in code
$order->get_data()

// Check a specific meta value
get_post_meta($order->get_id(), '_payment_method', true)

// Call a method to test its return value in context
$order->get_billing_email()
```

---

### Step 7 — Trace the call stack to find the null origin

When paused at the unexpected `null` return:

1. Open the **Call Stack** panel in VS Code.
2. Click each frame to inspect local variables at that point in the stack.
3. Use **Step Into** (F11) to descend into the method that returns `null`.
4. Use **Step Out** (Shift+F11) to return to the caller after confirming a frame is clean.

```bash
# If you find the null comes from a missing DB row, verify with WP-CLI
docker compose exec wordpress wp db query \
  "SELECT * FROM wp_postmeta WHERE post_id = 42 AND meta_key = '_my_extension_data'" \
  --allow-root
```

---

## Scenario 6: Webpack Build Pipeline for a WordPress Theme

**Prompt:** A WordPress theme currently concatenates JS files with a Gulp script and has no SCSS compilation. A new developer wants to replace it with a modern Webpack pipeline that supports ES modules, SCSS with PostCSS, asset hashing, source maps in development, and a production build with tree-shaking and minification. The output must integrate cleanly with `wp_enqueue_scripts`.

---

### Project structure

```
theme/
├── src/
│   ├── js/
│   │   ├── index.js          ← main entry (imports modules)
│   │   ├── modules/
│   │   │   ├── navigation.js
│   │   │   ├── accordion.js
│   │   │   └── lazy-load.js
│   │   └── admin.js          ← separate entry for admin screens
│   └── scss/
│       ├── style.scss        ← main stylesheet entry
│       └── admin.scss
├── build/                    ← output (git-ignored)
├── webpack.config.js
├── postcss.config.js
├── package.json
└── functions.php
```

---

### `package.json` dependencies

```json
{
  "scripts": {
    "start":   "webpack --mode=development --watch",
    "build":   "webpack --mode=production",
    "analyze": "ANALYZE=true webpack --mode=production"
  },
  "devDependencies": {
    "@babel/core":                  "^7.24.0",
    "@babel/preset-env":            "^7.24.0",
    "babel-loader":                 "^9.1.3",
    "css-loader":                   "^7.1.1",
    "css-minimizer-webpack-plugin": "^7.0.0",
    "mini-css-extract-plugin":      "^2.9.0",
    "postcss-loader":               "^8.1.1",
    "postcss-preset-env":           "^9.5.4",
    "sass":                         "^1.75.0",
    "sass-loader":                  "^14.2.1",
    "terser-webpack-plugin":        "^5.3.10",
    "webpack":                      "^5.91.0",
    "webpack-bundle-analyzer":      "^4.10.2",
    "webpack-cli":                  "^5.1.4",
    "webpack-manifest-plugin":      "^5.0.0"
  }
}
```

---

### `webpack.config.js`

```javascript
const path                  = require('path');
const MiniCssExtractPlugin  = require('mini-css-extract-plugin');
const CssMinimizerPlugin    = require('css-minimizer-webpack-plugin');
const TerserPlugin          = require('terser-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const { BundleAnalyzerPlugin }  = require('webpack-bundle-analyzer');

const isDev     = process.env.NODE_ENV !== 'production';
const doAnalyze = process.env.ANALYZE === 'true';

module.exports = {
    mode:  isDev ? 'development' : 'production',
    entry: {
        theme: './src/js/index.js',
        admin: './src/js/admin.js',
        style: './src/scss/style.scss',
    },
    output: {
        path:          path.resolve(__dirname, 'build'),
        filename:      isDev ? '[name].js' : '[name].[contenthash:8].js',
        clean:         true,
    },
    devtool: isDev ? 'source-map' : false,
    externals: {
        // Tell Webpack that jQuery comes from WordPress's global — don't bundle it
        jquery: 'jQuery',
    },
    module: {
        rules: [
            {
                test:    /\.js$/,
                exclude: /node_modules/,
                use:     'babel-loader',
            },
            {
                test: /\.(sa|sc|c)ss$/,
                use:  [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'postcss-loader',
                    'sass-loader',
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: isDev ? '[name].css' : '[name].[contenthash:8].css',
        }),
        // Emit a manifest.json mapping entry names to hashed filenames
        new WebpackManifestPlugin({ fileName: 'manifest.json' }),
        ...(doAnalyze ? [new BundleAnalyzerPlugin()] : []),
    ],
    optimization: {
        minimizer: [
            new TerserPlugin({ extractComments: false }),
            new CssMinimizerPlugin(),
        ],
        splitChunks: {
            chunks: 'all',
            name:   'vendor',
        },
    },
};
```

---

### `postcss.config.js`

```javascript
module.exports = {
    plugins: [
        require('postcss-preset-env')({
            stage: 2,
            autoprefixer: { grid: true },
        }),
    ],
};
```

---

### `functions.php` — enqueue using the manifest for cache-busting

```php
<?php
/**
 * Read the Webpack manifest and enqueue assets with their hashed filenames.
 */
function theme_enqueue_assets(): void {
    $manifest_path = get_theme_file_path( 'build/manifest.json' );

    if ( ! file_exists( $manifest_path ) ) {
        // Fallback to non-hashed filenames in local dev before first build
        wp_enqueue_script( 'theme', get_theme_file_uri( 'build/theme.js' ), [ 'jquery' ], null, true );
        wp_enqueue_style( 'theme', get_theme_file_uri( 'build/style.css' ), [], null );
        return;
    }

    $manifest = json_decode( file_get_contents( $manifest_path ), true );

    $theme_js  = $manifest['theme.js']  ?? 'theme.js';
    $vendor_js = $manifest['vendor.js'] ?? null;
    $theme_css = $manifest['style.css'] ?? 'style.css';

    // Enqueue vendor chunk first if it was emitted
    if ( $vendor_js ) {
        wp_enqueue_script( 'theme-vendor', get_theme_file_uri( "build/{$vendor_js}" ), [ 'jquery' ], null, true );
    }

    wp_enqueue_script(
        'theme',
        get_theme_file_uri( "build/{$theme_js}" ),
        $vendor_js ? [ 'jquery', 'theme-vendor' ] : [ 'jquery' ],
        null,
        true
    );

    wp_enqueue_style( 'theme', get_theme_file_uri( "build/{$theme_css}" ), [], null );
}
add_action( 'wp_enqueue_scripts', 'theme_enqueue_assets' );

/**
 * Admin assets
 */
function theme_enqueue_admin_assets( string $hook ): void {
    if ( ! in_array( $hook, [ 'post.php', 'post-new.php' ], true ) ) return;

    $manifest = json_decode( file_get_contents( get_theme_file_path( 'build/manifest.json' ) ), true );
    $admin_js  = $manifest['admin.js']  ?? 'admin.js';
    $admin_css = $manifest['admin.css'] ?? null;

    wp_enqueue_script( 'theme-admin', get_theme_file_uri( "build/{$admin_js}" ), [ 'jquery', 'wp-blocks' ], null, true );

    if ( $admin_css ) {
        wp_enqueue_style( 'theme-admin', get_theme_file_uri( "build/{$admin_css}" ), [], null );
    }
}
add_action( 'admin_enqueue_scripts', 'theme_enqueue_admin_assets' );
```

---

### Development and build commands

```bash
# Install dependencies
npm install

# Start watch mode (fast incremental builds, source maps enabled)
npm run start

# Production build (minified, hashed filenames, tree-shaken)
npm run build
ls -lh build/
# theme.a1b2c3d4.js   22 KB
# style.e5f6a7b8.css  14 KB
# vendor.c9d0e1f2.js  18 KB
# manifest.json

# Analyse bundle composition
npm run analyze
# Opens browser with interactive treemap of bundle contents
```

---

## Scenario 7: Profiling Slow WordPress Page Loads with Query Monitor and Blackfire

**Prompt:** A WordPress site that aggregates data from multiple CPTs takes 4.8 seconds to render the homepage on production. The hosting plan is adequate. You need to identify whether the bottleneck is PHP, database queries, or slow external HTTP calls, then fix the highest-impact issues.

---

### Step 1 — Install and configure Query Monitor

```bash
# Install via WP-CLI (staging clone of production)
wp plugin install query-monitor --activate

# Ensure debug logging is on so QM data appears even for non-admin requests
wp config set WP_DEBUG true --raw
wp config set SAVEQUERIES true --raw
```

---

### Step 2 — Identify N+1 queries with Query Monitor

Load the page as an admin. In the QM toolbar:

- **Queries** panel → sort by **Caller** → look for the same query repeated dozens of times.
- **Query Overview** → check **Duplicates** count.

```php
<?php
// Common N+1 pattern — each post triggers a separate meta query
foreach ( $posts as $post ) {
    $price = get_post_meta( $post->ID, '_price', true ); // ← individual query per post
    echo $price;
}

// Fix — prime the meta cache in bulk before the loop
$post_ids = wp_list_pluck( $posts, 'ID' );
update_meta_cache( 'post', $post_ids );   // single query fetches all meta at once

foreach ( $posts as $post ) {
    $price = get_post_meta( $post->ID, '_price', true ); // ← now served from cache
    echo $price;
}
```

---

### Step 3 — Identify slow custom queries

In QM → **Queries** → sort by **Time** descending. For any query taking > 50 ms:

```sql
-- Copy the slow query from QM and run EXPLAIN in a MySQL client
EXPLAIN SELECT p.ID, p.post_title, pm.meta_value
FROM wp_posts p
JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
  AND pm.meta_key = '_price'
ORDER BY pm.meta_value + 0 ASC
LIMIT 20;
-- Look for: type = ALL (full table scan), key = NULL (no index used)
```

```sql
-- Add a composite index to speed up meta lookups
ALTER TABLE wp_postmeta ADD INDEX idx_key_value (meta_key, meta_value(20));

-- Or use WP_Query with meta_query — WordPress will use the index automatically
```

---

### Step 4 — Install Blackfire for profiling PHP call stacks

```bash
# Install Blackfire agent and PHP probe on the server (Ubuntu example)
curl -s https://packages.blackfire.io/gpg.key | sudo apt-key add -
echo "deb http://packages.blackfire.io/debian any main" | sudo tee /etc/apt/sources.list.d/blackfire.list
sudo apt-get update && sudo apt-get install blackfire-agent blackfire-php

# Configure with your Blackfire credentials
sudo blackfire-agent --register
# Enter Server ID and Server Token from app.blackfire.io

sudo systemctl start blackfire-agent
sudo systemctl restart php8.2-fpm
```

---

### Step 5 — Profile the slow page with the Blackfire CLI

```bash
# Profile a single HTTP request — generates a call graph
blackfire curl https://staging.example.com/

# Profile with 10 samples for stable averages
blackfire --samples=10 curl https://staging.example.com/

# Output summary
# Wall Time: 2.34s   I/O Wait: 0.12s   CPU: 2.22s
# Memory: 38.4 MB   Network: 3 requests (0.8s)
# → Blackfire prints a URL to the full interactive call graph
```

---

### Step 6 — Interpret the Blackfire call graph

In the Blackfire UI, enable the **Hotspots** view and look for:

- Functions consuming > 5% of wall time.
- High **exclusive time** in a single function (indicates the function itself is slow, not its callees).
- HTTP calls inside the critical path (`wp_remote_get`, `WP_HTTP`).

```php
<?php
// Example finding: WP_HTTP::request() takes 1.2s on every page load
// because a theme is calling an external API synchronously on init

// Fix: cache the API response as a transient
function get_exchange_rates(): array {
    $cached = get_transient( 'exchange_rates' );
    if ( $cached !== false ) {
        return $cached;
    }

    $response = wp_remote_get( 'https://api.exchangerate.host/latest?base=GBP' );
    if ( is_wp_error( $response ) ) {
        return [];
    }

    $data = json_decode( wp_remote_retrieve_body( $response ), true );
    set_transient( 'exchange_rates', $data['rates'] ?? [], HOUR_IN_SECONDS );
    return $data['rates'] ?? [];
}
```

---

### Step 7 — Add object caching to eliminate redundant DB hits

```bash
# Install Redis Object Cache (requires Redis on the server)
wp plugin install redis-cache --activate
wp redis enable

# Verify object cache is active
wp redis status
# Status:    Connected
# Client:    PhpRedis 5.3.7
# Hits:      1,432
# Misses:    87
```

```php
<?php
// Wrap expensive queries in wp_cache_get/wp_cache_set
function get_featured_products( int $limit = 12 ): array {
    $cache_key = "featured_products_{$limit}";
    $cached    = wp_cache_get( $cache_key, 'my_theme' );

    if ( $cached !== false ) {
        return $cached;
    }

    $products = ( new WP_Query( [
        'post_type'      => 'product',
        'posts_per_page' => $limit,
        'meta_key'       => '_featured',
        'meta_value'     => 'yes',
        'no_found_rows'  => true,   // skip COUNT(*) query — we don't need pagination
        'fields'         => 'ids',  // return IDs only, fetch full data lazily
    ] ) )->posts;

    wp_cache_set( $cache_key, $products, 'my_theme', 5 * MINUTE_IN_SECONDS );
    return $products;
}
```

---

### Step 8 — Re-profile after fixes and document improvements

```bash
# Compare before and after with Blackfire's comparison feature
blackfire curl --reference https://staging.example.com/
# Apply fixes, then:
blackfire curl https://staging.example.com/
# Blackfire generates a diff URL showing % improvement per function

# Final QM check — confirm query count and total time are within budget
# Target: < 50 queries, < 100 ms total query time, < 1 s TTFB
wp eval '
    global $wpdb;
    echo "Total queries: " . get_num_queries() . "\n";
    echo "Total query time: " . timer_stop() . "s\n";
'
```

---
