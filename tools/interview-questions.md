# Developer Tools — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is WP-CLI and how do you install it?**

**A:** WP-CLI is a command-line interface for managing WordPress without a browser. Download the Phar and make it executable.
```bash
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar && mv wp-cli.phar /usr/local/bin/wp
wp --info
```

**Q2: How do you create a post with WP-CLI?**

**A:** Use `wp post create` with flags for the post title, content, status, and post type.
```bash
wp post create \
  --post_title="Hello World" \
  --post_status=publish \
  --post_type=post
```

**Q3: How do you manage plugins with WP-CLI?**

**A:** Use `wp plugin install`, `activate`, `deactivate`, `update`, and `delete` subcommands. Add `--activate` to install and activate in one step.
```bash
wp plugin install woocommerce --activate
wp plugin update --all
wp plugin list --status=inactive
```

**Q4: How do you run a search-replace with WP-CLI?**

**A:** `wp search-replace` updates strings in the database and handles serialised data correctly. Use `--dry-run` to preview changes.
```bash
wp search-replace 'http://old-domain.com' 'https://new-domain.com' \
  --skip-columns=guid --dry-run
```

**Q5: What is a `wp-cli.yml` config file used for?**

**A:** `wp-cli.yml` sets default flags (URL, path, user) per project so you do not have to repeat them on every command.
```yaml
# wp-cli.yml
path: wp
url: https://mysite.local
user: admin
@production:
  ssh: deploy@myserver.com/var/www/html
```

**Q6: What does Composer do in a WordPress project?**

**A:** Composer manages PHP dependencies. You declare packages in `composer.json`, run `composer install` to install them, and autoload classes via PSR-4 or classmap.
```bash
composer require guzzlehttp/guzzle
composer require --dev phpunit/phpunit
composer install   # installs from composer.lock
composer update    # updates to newest allowed versions
```

**Q7: What is the difference between `composer install` and `composer update`?**

**A:** `composer install` reproduces the exact versions in `composer.lock`. `composer update` resolves the latest versions allowed by `composer.json` constraints and updates the lock file.
```bash
composer install    # use lock file (CI, production)
composer update     # resolve new versions (development)
```

**Q8: How does PSR-4 autoloading work in `composer.json`?**

**A:** Map a namespace prefix to a directory. Composer generates an autoloader that converts `\MyPlugin\Api\Route` to `src/Api/Route.php` automatically.
```json
{
  "autoload": {
    "psr-4": {
      "MyPlugin\\": "src/"
    }
  }
}
```

**Q9: What is `npm` and how do you run build scripts?**

**A:** npm is the Node package manager. Define scripts in `package.json` and run them with `npm run <name>`. Common scripts are `build`, `dev`, `lint`, and `test`.
```bash
npm install            # install dependencies
npm run build          # production build
npm run dev            # watch mode
npm run lint           # run ESLint / Stylelint
```

**Q10: What is `@wordpress/env` (`wp-env`) and how do you start it?**

**A:** `@wordpress/env` provides a zero-config Docker-based local WordPress environment. It auto-detects plugins and themes from `package.json`.
```bash
npm install --save-dev @wordpress/env
npx wp-env start     # start environment
npx wp-env stop      # stop containers
npx wp-env clean all # reset database
```

**Q11: What does a `.wp-env.json` config file control?**

**A:** `.wp-env.json` configures the WordPress core version, plugins, themes, mapped directories, and the HTTP port for the local environment.
```json
{
  "core": "WordPress/WordPress#6.5-branch",
  "plugins": ["."],
  "themes": ["../my-theme"],
  "mappings": { "wp-content/uploads": "./tests/assets" },
  "port": 8888
}
```

**Q12: What is Query Monitor used for?**

**A:** Query Monitor is a debugging plugin that shows database queries, hooks, HTTP API calls, slow queries, PHP errors, and conditional tags in an admin toolbar panel.
```php
// Identify slow queries — visible in the "Queries" panel
// No code needed; install the plugin and browse the site
```

**Q13: What is Xdebug and how do you enable step debugging?**

**A:** Xdebug is a PHP extension for breakpoint debugging, stack traces, and profiling. Set `xdebug.mode=debug` and `xdebug.start_with_request=yes` in `php.ini`.
```ini
; php.ini
xdebug.mode = debug
xdebug.start_with_request = yes
xdebug.client_host = host.docker.internal
xdebug.client_port = 9003
```

**Q14: What is PHPUnit used for in WordPress development?**

**A:** PHPUnit is the standard PHP unit testing framework. WordPress ships a test bootstrap that sets up a full WordPress environment for integration tests.
```bash
composer require --dev phpunit/phpunit
./vendor/bin/phpunit --testdox
```

**Q15: What is Postman used for in API development?**

**A:** Postman is a GUI tool for sending HTTP requests, organising them into Collections, using Environments for variable configuration, and writing test assertions.
```javascript
// Postman test assertion
pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has items", () => {
  const body = pm.response.json();
  pm.expect(body).to.be.an('array').with.length.above(0);
});
```

**Q16: How do you authenticate in Postman against the WordPress REST API?**

**A:** Select "Basic Auth" in the Authorization tab and enter the username and Application Password. Postman encodes them automatically.
```
Authorization: Basic base64(username:application-password)
```

**Q17: What is Local (by Flywheel)?**

**A:** Local is a GUI-based local WordPress development environment. It manages PHP/MySQL/Nginx per site, supports SSL, and integrates with WP Engine and Flywheel hosting.
```
New Site → Site name: myproject → PHP 8.2, MySQL 8, Nginx → Start Site
```

**Q18: What is Docker Compose and how does it relate to WordPress development?**

**A:** Docker Compose defines multi-container services in a YAML file. A typical WordPress stack has WordPress, MySQL, and optionally Redis or Mailhog containers.
```yaml
services:
  wordpress:
    image: wordpress:6.5
    ports: ["8080:80"]
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_NAME: wp
  db:
    image: mysql:8
    environment:
      MYSQL_DATABASE: wp
      MYSQL_ROOT_PASSWORD: root
```

**Q19: What is Newman and why is it useful?**

**A:** Newman is the CLI runner for Postman collections. Run API test suites in CI without opening the Postman GUI.
```bash
npm install -g newman
newman run my-collection.json \
  --environment staging.json \
  --reporters cli,junit \
  --reporter-junit-export results.xml
```

**Q20: What does `wp cache flush` do?**

**A:** It clears the WordPress object cache. If a persistent cache (Redis/Memcached) is active, it flushes that store; otherwise it clears the in-memory request cache.
```bash
wp cache flush
wp transient delete --all   # also clear transients in DB
```

---

## Mid

**Q21: How do you write a custom WP-CLI command?**

**A:** Create a class with a `__invoke` method (or named methods) and register it with `WP_CLI::add_command`. Annotate with `@when before_wp_load` if WordPress is not needed.
```php
class My_CLI_Command {
  /**
   * Greets a user.
   * @when after_wp_load
   */
  public function greet( $args ) {
    WP_CLI::success( 'Hello, ' . $args[0] );
  }
}
WP_CLI::add_command( 'my greet', 'My_CLI_Command' );
```

```bash
wp my greet world
```

**Q22: How do you configure webpack for a WordPress block plugin?**

**A:** Use `@wordpress/scripts` which provides a pre-configured webpack setup. Override with a custom `webpack.config.js` that extends the default.
```javascript
// webpack.config.js
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
module.exports = {
  ...defaultConfig,
  entry: { 'my-block': './src/index.js', 'editor': './src/editor.js' },
};
```

```bash
npx wp-scripts build   # production
npx wp-scripts start   # watch mode
```

**Q23: How does Vite differ from webpack for WordPress development?**

**A:** Vite uses native ES modules during development for near-instant HMR, then bundles with Rollup for production. Webpack bundles on every change. Vite is faster in dev but requires more configuration for WordPress asset integration.
```javascript
// vite.config.js
import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    rollupOptions: {
      input: 'src/index.js',
      external: ['react', 'react-dom'],
      output: { globals: { react: 'React', 'react-dom': 'ReactDOM' } },
    },
  },
});
```

**Q24: How do you configure VS Code for Xdebug step debugging in a Docker environment?**

**A:** Add a `launch.json` config that listens on port 9003 and maps the container path to your local workspace with `pathMappings`.
```json
{
  "type": "php",
  "request": "launch",
  "name": "Listen for Xdebug",
  "port": 9003,
  "pathMappings": {
    "/var/www/html/wp-content/plugins/my-plugin": "${workspaceFolder}"
  }
}
```

**Q25: How do you use `WP_UnitTestCase` to test a WordPress function?**

**A:** Extend `WP_UnitTestCase`. Use the `factory` helper to create posts, users, or terms, then run assertions with `assertSame` / `assertEquals`.
```php
class Test_Reading_Time extends WP_UnitTestCase {
  public function test_reading_time_returns_integer() {
    $post_id = self::factory()->post->create(['post_content' => str_repeat('word ', 300)]);
    $result  = get_reading_time($post_id);
    $this->assertIsInt($result);
    $this->assertGreaterThan(0, $result);
  }
}
```

**Q26: How do you mock `wp_remote_get` in PHPUnit?**

**A:** Use the `pre_http_request` filter to intercept the request and return a fake response array before the real HTTP call is made.
```php
add_filter('pre_http_request', function ($pre, $args, $url) {
  if (str_contains($url, 'api.example.com')) {
    return ['body' => '{"status":"ok"}', 'response' => ['code' => 200]];
  }
  return $pre;
}, 10, 3);
```

**Q27: How do you run `wp-env` commands against the test instance?**

**A:** Use `npx wp-env run` with the container name and any WP-CLI or shell command. The test instance runs on port 8889 by default.
```bash
npx wp-env run tests-wordpress wp --allow-root plugin list
npx wp-env run tests-cli bash -c "cd /var/www/html && ./vendor/bin/phpunit"
```

**Q28: How do you write a Playwright test for a WordPress admin workflow?**

**A:** Use `page.goto` to navigate, `page.fill` for form inputs, `page.click` for buttons, and `expect(page.locator(...))` for assertions.
```javascript
import { test, expect } from '@playwright/test';

test('admin can publish a post', async ({ page }) => {
  await page.goto('/wp-admin');
  await page.fill('#user_login', 'admin');
  await page.fill('#user_pass', 'password');
  await page.click('#wp-submit');
  await expect(page).toHaveURL(/wp-admin\/index\.php/);
});
```

**Q29: How do you use Composer scripts to automate tasks?**

**A:** Define commands in the `scripts` key. Run them with `composer run <name>`. They support chaining other scripts with `@script-name`.
```json
{
  "scripts": {
    "test":   "phpunit --testdox",
    "lint":   "phpcs --standard=WordPress src/",
    "check":  ["@lint", "@test"],
    "post-install-cmd": "wp-cli/bin/wp cli info"
  }
}
```

```bash
composer run check
```

**Q30: How do you configure DDEV for a WordPress project?**

**A:** Run `ddev config` in the project root to generate `.ddev/config.yaml`, then `ddev start`. DDEV provides PHP, MySQL, and optional add-ons (Redis, MailHog).
```bash
ddev config --project-type=wordpress --docroot=. --project-name=mysite
ddev start
ddev wp plugin list       # WP-CLI via ddev
ddev exec composer install
```

**Q31: How do you use GitHub Actions to run PHPUnit on multiple PHP versions?**

**A:** Use a matrix strategy to define PHP versions. The `shivammathur/setup-php` action installs the specified version.
```yaml
strategy:
  matrix:
    php: ['8.1', '8.2', '8.3']
steps:
  - uses: shivammathur/setup-php@v2
    with:
      php-version: ${{ matrix.php }}
      extensions: xdebug
  - run: composer install && ./vendor/bin/phpunit
```

**Q32: How do you use Xdebug in profiling mode?**

**A:** Set `xdebug.mode=profile` and `xdebug.output_dir` in `php.ini`. Xdebug writes a cachegrind file; open it in KCacheGrind or Webgrind.
```ini
xdebug.mode = profile
xdebug.output_dir = /tmp/xdebug
xdebug.profiler_output_name = cachegrind.out.%p
```

```bash
# Trigger via query param
curl "https://mysite.local/?XDEBUG_PROFILE=1"
```

**Q33: How do you evaluate a PHP file with WP-CLI?**

**A:** Use `wp eval-file` to execute a PHP script within the full WordPress context. Useful for one-off migrations or data fixes.
```bash
wp eval-file migrate-meta.php
```

```php
<?php // migrate-meta.php
$posts = get_posts(['post_type' => 'product', 'numberposts' => -1]);
foreach ($posts as $post) {
  $old = get_post_meta($post->ID, 'price', true);
  update_post_meta($post->ID, '_price', $old);
}
WP_CLI::success('Migration complete.');
```

**Q34: How do you use the Query Monitor hooks panel?**

**A:** Open the QM toolbar → "Hooks & Actions" panel. Filter by hook name to see which callbacks fired, in what order, and how long each took.
```php
// Use QM's data API to log custom data
do_action('qm/debug', 'My value: ' . $value);
do_action('qm/error', 'Something went wrong');
```

**Q35: What is `wp cron event run` used for?**

**A:** It manually triggers a scheduled WP-Cron event by name. Useful for testing cron jobs locally without waiting for the schedule.
```bash
wp cron event list
wp cron event run my_hourly_cleanup
wp cron schedule list   # show registered schedules
```

**Q36: How do you add a Composer repository for a private GitHub package?**

**A:** Add a `vcs` repository entry pointing to the GitHub URL. Composer uses the `COMPOSER_AUTH` env var or `~/.composer/auth.json` for the token.
```json
{
  "repositories": [{
    "type": "vcs",
    "url":  "https://github.com/myorg/private-lib"
  }],
  "require": { "myorg/private-lib": "^2.0" }
}
```

**Q37: How do you write a WooCommerce checkout test with Playwright?**

**A:** Navigate to a product, add it to the cart, proceed to checkout, fill in billing details, and assert the order confirmation page.
```javascript
test('guest checkout', async ({ page }) => {
  await page.goto('/product/sample/');
  await page.click('.single_add_to_cart_button');
  await page.goto('/checkout/');
  await page.fill('#billing_first_name', 'Jane');
  await page.fill('#billing_email', 'jane@test.com');
  await page.click('#place_order');
  await expect(page.locator('.woocommerce-order-received')).toBeVisible();
});
```

**Q38: How do you use `wp db export` and `wp db import`?**

**A:** `wp db export` dumps the database to a SQL file. `wp db import` loads it back. Combine with `search-replace` after import.
```bash
wp db export backup-$(date +%F).sql
# On a new environment:
wp db import backup-2025-01-01.sql
wp search-replace 'https://old.com' 'https://new.local' --skip-columns=guid
```

**Q39: How does `wp option` help manage WordPress settings via CLI?**

**A:** `wp option get/update/delete/add` reads and writes the `wp_options` table directly. Useful for scripted configuration changes.
```bash
wp option get siteurl
wp option update blogname "My New Blog"
wp option delete my_plugin_cache_key
```

**Q40: How do you lint PHP code against WordPress coding standards?**

**A:** Install `wp-coding-standards/wpcs` via Composer and configure PHP_CodeSniffer to use the WordPress ruleset.
```bash
composer require --dev wp-coding-standards/wpcs squizlabs/php_codesniffer
./vendor/bin/phpcs --config-set installed_paths vendor/wp-coding-standards/wpcs
./vendor/bin/phpcs --standard=WordPress src/
./vendor/bin/phpcbf --standard=WordPress src/  # auto-fix
```

---

## Advanced

**Q41: How do you build a full GitHub Actions CI/CD pipeline that lints, tests, and deploys a WordPress plugin to WordPress.org SVN?**

**A:** Use separate jobs: lint PHP, run PHPUnit, and on tag push, deploy to SVN using the 10up deploy action. Pass SVN credentials as secrets.
```yaml
on:
  push:
    tags: ['v*']
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: '8.2' }
      - run: composer install && ./vendor/bin/phpcs --standard=WordPress src/
  test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: '8.2' }
      - run: composer install && ./vendor/bin/phpunit
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: 10up/action-wordpress-plugin-deploy@stable
        env:
          SVN_USERNAME: ${{ secrets.SVN_USERNAME }}
          SVN_PASSWORD: ${{ secrets.SVN_PASSWORD }}
          SLUG: my-plugin
```

**Q42: How do you write a WP-CLI command with sub-commands, argument validation, and progress output?**

**A:** Use a class with a public method per sub-command. Call `WP_CLI\Utils\make_progress_bar` for long operations and `WP_CLI::error` for validation failures.
```php
class My_Import_Command {
  /**
   * Import products from a CSV.
   * ## OPTIONS
   * <file>
   * : Path to CSV file.
   * @when after_wp_load
   */
  public function csv( $args ) {
    [ $file ] = $args;
    if (!file_exists($file)) {
      WP_CLI::error("File not found: $file");
    }
    $rows     = array_slice(file($file), 1); // skip header
    $progress = \WP_CLI\Utils\make_progress_bar('Importing', count($rows));
    foreach ($rows as $row) {
      import_product_row($row);
      $progress->tick();
    }
    $progress->finish();
    WP_CLI::success('Import complete.');
  }
}
WP_CLI::add_command('my import', 'My_Import_Command');
```

**Q43: How do you set up a full Docker Compose stack for WordPress with Redis object caching and MailHog?**

**A:** Define four services: WordPress, MySQL, Redis, and MailHog. Install the Redis Object Cache plugin and configure `wp-config.php` to use Redis.
```yaml
services:
  wordpress:
    image: wordpress:6.5
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_CONFIG_EXTRA: |
        define('WP_REDIS_HOST', 'redis');
        define('SMTP_HOST', 'mailhog');
    ports: ["8080:80"]
  db:
    image: mysql:8
    environment: { MYSQL_DATABASE: wp, MYSQL_ROOT_PASSWORD: root }
  redis:
    image: redis:7-alpine
  mailhog:
    image: mailhog/mailhog
    ports: ["8025:8025"]
```

**Q44: How do you configure PHPUnit with code coverage using Xdebug and a coverage threshold?**

**A:** Set `xdebug.mode=coverage` in `php.ini`, configure the coverage report in `phpunit.xml`, and fail the suite below a minimum percentage.
```xml
<!-- phpunit.xml -->
<coverage processUncoveredFiles="true">
  <include>
    <directory suffix=".php">src/</directory>
  </include>
  <report>
    <clover outputFile="coverage.xml"/>
    <html outputDirectory="coverage-html"/>
  </report>
</coverage>
```

```bash
XDEBUG_MODE=coverage ./vendor/bin/phpunit --coverage-text
```

**Q45: How do you use Playwright's page object model (POM) for reusable WordPress test helpers?**

**A:** Encapsulate common flows (login, create post) in a class. Tests instantiate the page object instead of repeating selector logic.
```javascript
// helpers/wp-admin.js
export class WPAdmin {
  constructor(page) { this.page = page; }
  async login(user = 'admin', pass = 'password') {
    await this.page.goto('/wp-login.php');
    await this.page.fill('#user_login', user);
    await this.page.fill('#user_pass', pass);
    await this.page.click('#wp-submit');
    await this.page.waitForURL('**/wp-admin/**');
  }
}
// test.spec.js
test('admin sees dashboard', async ({ page }) => {
  const wp = new WPAdmin(page);
  await wp.login();
  await expect(page.locator('#wpadminbar')).toBeVisible();
});
```

**Q46: How do you implement a Composer classmap for a legacy WordPress plugin that does not follow PSR-4?**

**A:** Use `classmap` autoloading. Composer scans the listed directories and builds a class-to-file map at `composer dump-autoload` time.
```json
{
  "autoload": {
    "classmap": ["includes/", "admin/", "public/"],
    "files": ["includes/functions.php"]
  }
}
```

```bash
composer dump-autoload --optimize   # generates optimised classmap
```

**Q47: How do you integrate ESLint and Stylelint into an npm-based WordPress block build pipeline?**

**A:** Extend `@wordpress/eslint-plugin` and `@wordpress/stylelint-config`. Add `lint` and `lint:fix` scripts to `package.json` and hook them into CI.
```json
{
  "scripts": {
    "lint:js":    "eslint src/**/*.js",
    "lint:css":   "stylelint 'src/**/*.css'",
    "lint":       "npm run lint:js && npm run lint:css",
    "lint:fix":   "eslint src/**/*.js --fix && stylelint 'src/**/*.css' --fix"
  },
  "eslintConfig": { "extends": ["plugin:@wordpress/eslint-plugin/recommended"] },
  "stylelint":    { "extends": ["@wordpress/stylelint-config"] }
}
```

**Q48: How do you use `wp-env` mappings to test a plugin against multiple themes simultaneously?**

**A:** Define multiple theme paths under `mappings` in `.wp-env.json` and switch active themes via WP-CLI in your test setup or CI matrix.
```json
{
  "plugins": ["."],
  "mappings": {
    "wp-content/themes/twentytwentyfour": "../twentytwentyfour",
    "wp-content/themes/my-theme":         "../my-theme"
  }
}
```

```bash
npx wp-env run wordpress wp --allow-root theme activate my-theme
npx wp-env run tests-cli bash -c "./vendor/bin/phpunit"
```

**Q49: How do you profile a slow WordPress page load with Query Monitor and Xdebug together?**

**A:** Enable Xdebug in profiling mode to capture a cachegrind file for function-level timing. Cross-reference with Query Monitor's DB panel to isolate whether the bottleneck is PHP logic or database queries.
```ini
; php.ini
xdebug.mode = profile
xdebug.output_dir = /tmp/profiles
xdebug.profiler_output_name = cachegrind.out.%p.%r
```

```bash
# Request a specific page with profiling enabled
curl "https://mysite.local/slow-page/?XDEBUG_PROFILE=1"
# Open /tmp/profiles/cachegrind.out.* in KCacheGrind or Webgrind
```

**Q50: How do you build a zero-downtime deployment pipeline for a WordPress plugin using GitHub Actions, Composer, and WP-CLI on a remote server?**

**A:** SSH into the server, pull the new code, run Composer with `--no-dev`, flush the object cache, and optionally run database migrations via `wp eval-file`. Use atomic symlink swaps for true zero-downtime.
```yaml
- name: Deploy
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.SSH_HOST }}
    username: deploy
    key: ${{ secrets.SSH_KEY }}
    script: |
      set -e
      cd /var/www/releases && mkdir ${{ github.sha }}
      rsync -az $GITHUB_WORKSPACE/ /var/www/releases/${{ github.sha }}/
      cd /var/www/releases/${{ github.sha }}
      composer install --no-dev --optimize-autoloader
      ln -sfn /var/www/releases/${{ github.sha }} /var/www/current
      wp --path=/var/www/current cache flush
      wp --path=/var/www/current eval-file scripts/migrate.php
```
