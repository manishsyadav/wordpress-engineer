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
