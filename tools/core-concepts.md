# Tools — Core Concepts

## 1. WP-CLI

WP-CLI is the official command-line interface for WordPress. It lets you manage every aspect of a WordPress installation without using the admin UI.

Key command groups:

| Group | Purpose |
|---|---|
| `wp core` | Install, update, verify checksums |
| `wp plugin` | Install, activate, deactivate, update, delete plugins |
| `wp theme` | Install, activate, update themes |
| `wp user` | Create, update, delete, list users |
| `wp post` | Create, update, list, delete posts |
| `wp option` | Get/set WordPress options |
| `wp search-replace` | Safe database search and replace (handles serialized data) |
| `wp cron` | List, run, schedule cron events |
| `wp db` | Import/export SQL, run queries, optimize tables |
| `wp eval` | Run arbitrary PHP in WordPress context |
| `wp eval-file` | Run a PHP file in WordPress context |
| `wp package` | Install WP-CLI community packages |
| `wp scaffold` | Generate plugin/theme boilerplate, unit test stubs |
| `wp i18n` | Extract translatable strings, make .pot files |
| `wp cache` | Flush/warm object cache |

`search-replace` is especially important for site migrations — it replaces URLs in all database tables, correctly handling PHP serialized strings:

```bash
wp search-replace 'http://old-domain.com' 'https://new-domain.com' \
    --all-tables \
    --precise \
    --report-changed-only
```

---

## 2. Composer

Composer is the PHP dependency manager. WordPress plugins use it to manage PHP libraries and autoload classes.

Key concepts:

| Concept | Description |
|---|---|
| `composer.json` | Declares dependencies, autoload rules, scripts |
| `composer.lock` | Pins exact versions for reproducible installs |
| `vendor/` | Where packages are installed (gitignored) |
| `autoload` | PSR-4, PSR-0, classmap, or files strategies |

### PSR-4 Autoloading

Maps a namespace prefix to a directory. No `require` statements needed.

```json
{
    "autoload": {
        "psr-4": {
            "Acme\\Plugin\\": "src/"
        }
    }
}
```

After adding an autoload rule: `composer dump-autoload`

Usage in plugin bootstrap:

```php
require_once __DIR__ . '/vendor/autoload.php';
// Now Acme\Plugin\BlockRegistrar resolves to src/BlockRegistrar.php
$registrar = new \Acme\Plugin\BlockRegistrar();
```

---

## 3. npm / webpack / Vite

### npm

Node Package Manager. Used in WordPress development for managing JS dependencies and running build scripts defined in `package.json`.

`@wordpress/scripts` wraps webpack with a WordPress-optimized preset. Running `npx wp-scripts build` produces production assets in `build/`.

### webpack

Module bundler. Traces JS imports, bundles them, and applies loaders (Babel for JSX, CSS modules, etc.).

Key concepts:
- **Entry** — starting file(s).
- **Output** — where bundles are written.
- **Loaders** — transform non-JS files (CSS, images, JSX).
- **Plugins** — extend webpack (MiniCssExtractPlugin, etc.).
- **Tree shaking** — dead-code elimination (ES modules only).
- **Code splitting** — split output into chunks loaded on demand.

### Vite

Next-generation bundler using native ES modules in dev mode (instant HMR) and Rollup for production builds. Faster than webpack for large projects. Adopted by many modern WP block starters.

---

## 4. Docker + `@wordpress/env` (wp-env)

### Docker

Containerization platform. A container packages an app with its runtime environment (PHP, web server, MySQL). Docker Compose orchestrates multi-container setups.

### `@wordpress/env` (wp-env)

Zero-config local WordPress development environment built on Docker. Manages WordPress + MySQL + optionally Xdebug containers via a single JSON config file.

```bash
npm install --save-dev @wordpress/env
npx wp-env start    # starts the environment
npx wp-env stop
npx wp-env clean    # wipe database
npx wp-env run tests-cli wp eval 'echo phpversion();'  # run WP-CLI in test instance
```

Config file: `.wp-env.json`

```json
{
    "core": "WordPress/WordPress#trunk",
    "phpVersion": "8.2",
    "plugins": [ "." ],
    "themes": [ "./tests/fixtures/test-theme" ],
    "config": {
        "WP_DEBUG": true,
        "WP_DEBUG_LOG": true,
        "SCRIPT_DEBUG": true
    },
    "mappings": {
        "wp-content/uploads": "./tests/fixtures/uploads"
    }
}
```

---

## 5. Xdebug

PHP extension for step-by-step debugging. Instead of `var_dump`, you can pause execution at any line, inspect variables, and step through code.

Modes:
- `debug` — step debugging with a DAP-compatible IDE (VS Code, PhpStorm).
- `profile` — generate cachegrind files for performance analysis.
- `coverage` — collect code coverage for PHPUnit.
- `trace` — log every function call to a file.

Configure in `php.ini`:

```ini
zend_extension=xdebug
xdebug.mode=debug
xdebug.client_host=host.docker.internal
xdebug.client_port=9003
xdebug.start_with_request=yes
```

VS Code `launch.json`:

```json
{
    "name": "Listen for Xdebug",
    "type": "php",
    "request": "launch",
    "port": 9003,
    "pathMappings": {
        "/var/www/html/wp-content/plugins/my-plugin": "${workspaceFolder}"
    }
}
```

---

## 6. Query Monitor

Free WordPress plugin that adds a developer panel to the admin bar showing:
- All SQL queries (with caller, execution time, duplicates).
- PHP warnings and notices.
- WordPress hooks fired on the current request.
- HTTP API calls and their response times.
- Block editor metadata (in the block editor context).
- Current user capabilities.

Install: `wp plugin install query-monitor --activate`

Query Monitor is invaluable for spotting N+1 query problems introduced by custom blocks or plugins.

---

## 7. PHPUnit + `WP_UnitTestCase`

PHPUnit is the de-facto PHP testing framework. WordPress provides a test library (`wordpress-develop`) that includes `WP_UnitTestCase`, which extends `PHPUnit\Framework\TestCase` with helpers:

- `self::factory()->post->create()` — create test posts.
- `self::factory()->user->create()` — create test users.
- `$this->go_to( '/sample-page/' )` — simulate a front-end request.
- Automatic DB rollback after each test (transactions or restores).

```php
class Test_My_Block extends WP_UnitTestCase {

    public function test_render_callback_returns_posts(): void {
        // Arrange
        self::factory()->post->create_many( 3, [ 'post_status' => 'publish' ] );

        // Act
        $html = myplugin_render_latest_posts_block( [ 'numberOfPosts' => 3 ] );

        // Assert
        $this->assertStringContainsString( '<ul', $html );
        $this->assertSame( 3, substr_count( $html, '<li' ) );
    }
}
```

---

## 8. Playwright / Cypress — E2E Testing

End-to-end tests control a real browser to verify full user flows.

**Playwright** (preferred by @wordpress/e2e-test-utils-playwright):
- Multi-browser (Chromium, Firefox, WebKit).
- Auto-waits for elements to be actionable.
- Works well with GitHub Actions.

**Cypress** (popular alternative):
- Great developer experience, built-in time-travel debugger.
- Chromium-based only (multi-browser support in paid tier).

Both tools interact with WordPress by visiting URLs, filling forms, and asserting on page content.

---

## 9. Postman — REST API Testing

Postman is a GUI tool for making and inspecting HTTP requests. Useful for testing the WordPress REST API:

- Create collections of requests (list posts, create post, authenticate).
- Set environment variables (`base_url`, `auth_token`) to switch between dev/staging/prod.
- Write test scripts in JavaScript to assert response codes and body structure.
- Generate API documentation from collections.

Authentication options for WP REST API: Application Passwords (WP 5.6+), JWT, OAuth 1.0a.

---

## 10. CI/CD Pipeline

### GitHub Actions

YAML-based automation built into GitHub. Triggered by push, pull request, schedule, or manual dispatch. Used for: linting, testing, building, deploying.

### Bitbucket Pipelines

Similar to GitHub Actions but for Bitbucket repos. Uses `bitbucket-pipelines.yml`. Supports Docker-based steps.

### Typical WordPress Plugin Pipeline

```
PR opened
    │
    ├── PHP lint (PHPCS)
    ├── JS lint (ESLint)
    ├── PHP unit tests (PHPUnit)
    ├── JS unit tests (Jest)
    └── E2E tests (Playwright)

Tag v*.*.* pushed
    │
    ├── All of the above
    ├── npm run build (production assets)
    ├── Deploy to WordPress.org SVN
    └── Create GitHub Release
```

Secrets (WP.org SVN credentials, Codecov token) are stored in the repo's **Settings → Secrets** and referenced as `${{ secrets.NAME }}` in workflows.
