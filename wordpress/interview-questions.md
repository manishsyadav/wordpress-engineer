# WordPress — Interview Questions

> **100 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is a custom post type and how do you register one?**

**A:** A custom post type (CPT) is a content type beyond posts/pages. Register it on `init` with `register_post_type()`. Always use a prefix to avoid collisions, and set `public => true` to expose it on the front end.
```php
add_action( 'init', function() {
    register_post_type( 'book', [
        'label'    => 'Books',
        'public'   => true,
        'supports' => [ 'title', 'editor', 'thumbnail' ],
        'has_archive' => true,
    ]);
});
```

**Q2: How do you register a custom taxonomy?**

**A:** Use `register_taxonomy()` on `init`, passing the taxonomy slug, the post type(s) it attaches to, and an args array. Set `hierarchical => true` for category-like behaviour, `false` for tag-like.
```php
add_action( 'init', function() {
    register_taxonomy( 'genre', 'book', [
        'label'        => 'Genres',
        'hierarchical' => true,
        'rewrite'      => [ 'slug' => 'genre' ],
    ]);
});
```

**Q3: What is the difference between an action and a filter?**

**A:** An action (`do_action` / `add_action`) fires a hook so you can run code at that point — no return value expected. A filter (`apply_filters` / `add_filter`) passes a value through your callback and expects the (possibly modified) value back.
```php
// Action — no return
add_action( 'save_post', function( $post_id ) { /* do work */ });

// Filter — must return
add_filter( 'the_title', function( $title ) {
    return strtoupper( $title );
});
```

**Q4: Explain the WordPress template hierarchy.**

**A:** WordPress picks the most specific template file that exists in the theme. For a single post it tries `single-{post-type}-{slug}.php` → `single-{post-type}.php` → `single.php` → `singular.php` → `index.php`. The hierarchy is documented at developer.wordpress.org/themes/basics/template-hierarchy/.
```php
// Force a specific template for a CPT
add_filter( 'single_template', function( $t ) {
    if ( get_post_type() === 'book' ) {
        $t = get_template_directory() . '/single-book.php';
    }
    return $t;
});
```

**Q5: How do you run a basic WP_Query?**

**A:** Instantiate `WP_Query` with an args array, loop over results, then call `wp_reset_postdata()` to restore the global `$post`. Forgetting `wp_reset_postdata()` breaks later template tags.
```php
$q = new WP_Query([ 'post_type' => 'book', 'posts_per_page' => 5 ]);
while ( $q->have_posts() ) {
    $q->the_post();
    the_title( '<h2>', '</h2>' );
}
wp_reset_postdata();
```

**Q6: What is The Loop and what global does it rely on?**

**A:** The Loop is the block of PHP (`have_posts()` / `the_post()`) that iterates over the main query stored in the global `$wp_query`. `the_post()` calls `setup_postdata()`, which populates `$post` and enables template tags.
```php
if ( have_posts() ) :
    while ( have_posts() ) : the_post();
        the_title( '<h2>', '</h2>' );
    endwhile;
endif;
```

**Q7: How do you add and retrieve post meta?**

**A:** `add_post_meta()` inserts a new row; `update_post_meta()` upserts. Retrieve with `get_post_meta( $id, $key, $single )`. Always sanitize on save and escape on output.
```php
update_post_meta( $post_id, '_reading_time', absint( $minutes ) );
$time = get_post_meta( $post_id, '_reading_time', true );
echo esc_html( $time );
```

**Q8: What is wp_options and how do you use it?**

**A:** `wp_options` is a key-value store for plugin/theme settings. `add_option()` inserts; `update_option()` upserts; `get_option( $key, $default )` retrieves. Large serialised data slows autoload — set `autoload => 'no'` for big values.
```php
update_option( 'my_plugin_settings', [ 'enabled' => true ] );
$settings = get_option( 'my_plugin_settings', [] );
```

**Q9: What is a wp_nonce and why is it needed?**

**A:** A nonce (number used once) is a time-limited token that verifies a request came from your form/link, preventing CSRF attacks. Generate with `wp_nonce_field()` or `wp_create_nonce()`, verify with `check_admin_referer()` or `wp_verify_nonce()`.
```php
// In form
wp_nonce_field( 'save_book_meta', 'book_nonce' );

// On save
if ( ! wp_verify_nonce( $_POST['book_nonce'], 'save_book_meta' ) ) {
    wp_die( 'Security check failed.' );
}
```

**Q10: Name five common conditional tags.**

**A:** `is_single()`, `is_page()`, `is_archive()`, `is_home()`, `is_user_logged_in()`. They return bool and help you target specific contexts in templates or hooks. Most accept an ID, slug, or array to narrow the match.
```php
if ( is_single() && is_user_logged_in() ) {
    echo '<p>Thanks for reading, ' . esc_html( wp_get_current_user()->display_name ) . '!</p>';
}
```

**Q11: How do you correctly enqueue scripts and styles?**

**A:** Hook into `wp_enqueue_scripts` (front end) or `admin_enqueue_scripts` (admin). Pass a handle, URL, dependencies, version, and for scripts a position flag. Never use `<script>` tags directly in templates.
```php
add_action( 'wp_enqueue_scripts', function() {
    wp_enqueue_style( 'my-theme', get_stylesheet_uri(), [], '1.0.0' );
    wp_enqueue_script( 'my-app', get_template_directory_uri() . '/js/app.js',
        [ 'jquery' ], '1.0.0', true );
});
```

**Q12: What are key wp-config.php constants for a development environment?**

**A:** `WP_DEBUG`, `WP_DEBUG_LOG`, `WP_DEBUG_DISPLAY`, `SAVEQUERIES`, and `SCRIPT_DEBUG`. On production all debug constants should be `false`. `SAVEQUERIES` stores every DB query for profiling.
```php
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );
define( 'SAVEQUERIES', true );
```

**Q13: What hooks fire when a plugin is activated/deactivated?**

**A:** `register_activation_hook( __FILE__, $cb )` and `register_deactivation_hook( __FILE__, $cb )`. Use activation to create DB tables or set default options; use deactivation to flush rewrite rules or clear cron. For uninstall use `register_uninstall_hook()`.
```php
register_activation_hook( __FILE__, function() {
    add_option( 'my_plugin_version', '1.0.0' );
    flush_rewrite_rules();
});
```

**Q14: How do you register a shortcode?**

**A:** Call `add_shortcode( 'tag', $callback )` where `$callback` receives `$atts`, `$content`, and `$tag`. Always return output — never echo inside a shortcode callback.
```php
add_shortcode( 'highlight', function( $atts, $content = '' ) {
    $atts = shortcode_atts( [ 'color' => 'yellow' ], $atts, 'highlight' );
    return '<mark style="background:' . esc_attr( $atts['color'] ) . '">'
           . esc_html( $content ) . '</mark>';
});
```

**Q15: How do you create a classic widget?**

**A:** Extend `WP_Widget`, implement `widget()` (front-end output), `form()` (admin form), and `update()` (sanitise saved data). Register via `widgets_init`.
```php
class My_Widget extends WP_Widget {
    public function __construct() {
        parent::__construct( 'my_widget', 'My Widget' );
    }
    public function widget( $args, $instance ) {
        echo $args['before_widget'] . esc_html( $instance['title'] ) . $args['after_widget'];
    }
    public function update( $new, $old ) { return [ 'title' => sanitize_text_field( $new['title'] ) ]; }
    public function form( $instance ) { /* render input */ }
}
add_action( 'widgets_init', fn() => register_widget( 'My_Widget' ) );
```

**Q16: How do you register a navigation menu?**

**A:** Call `register_nav_menus()` in `after_setup_theme`, then render with `wp_nav_menu()` in the template. WordPress stores menu assignments per location in theme_mods.
```php
add_action( 'after_setup_theme', function() {
    register_nav_menus([ 'primary' => 'Primary Navigation' ]);
});
// In template:
wp_nav_menu([ 'theme_location' => 'primary', 'container' => 'nav' ]);
```

**Q17: What are WordPress user roles and capabilities?**

**A:** Roles (Subscriber, Contributor, Author, Editor, Administrator) are named groups of capabilities (e.g. `edit_posts`, `manage_options`). Check with `current_user_can( 'cap' )`. Add custom caps with `add_cap()` on the user object.
```php
if ( ! current_user_can( 'edit_posts' ) ) {
    wp_die( esc_html__( 'You do not have permission.', 'textdomain' ) );
}
```

**Q18: How do you send email from WordPress?**

**A:** Use `wp_mail( $to, $subject, $message, $headers, $attachments )`. It wraps PHPMailer. Set `Content-Type: text/html` in headers for HTML email. Avoid direct `mail()` calls.
```php
wp_mail(
    'user@example.com',
    'Welcome!',
    '<p>Thanks for signing up.</p>',
    [ 'Content-Type: text/html; charset=UTF-8' ]
);
```

**Q19: How does wp_redirect work?**

**A:** `wp_redirect( $url, $status )` sends a `Location` header. Always follow it with `exit` or the script continues executing. Use `wp_safe_redirect()` to restrict redirects to allowed hosts.
```php
if ( $submitted ) {
    wp_safe_redirect( home_url( '/thank-you/' ) );
    exit;
}
```

**Q20: Name the key sanitization functions.**

**A:** `sanitize_text_field()`, `sanitize_email()`, `sanitize_url()`, `absint()`, `intval()`, `wp_kses_post()` (allowed HTML), and `sanitize_key()`. Use the most restrictive one that fits the data type.
```php
$name  = sanitize_text_field( $_POST['name'] );
$email = sanitize_email( $_POST['email'] );
$id    = absint( $_POST['post_id'] );
```

**Q21: Name the key escaping functions.**

**A:** `esc_html()`, `esc_attr()`, `esc_url()`, `esc_js()`, `esc_textarea()`, and `wp_kses()`. Escape as late as possible, right at the point of output, using the context-specific function.
```php
echo '<a href="' . esc_url( $url ) . '" title="' . esc_attr( $title ) . '">'
     . esc_html( $label ) . '</a>';
```

**Q22: What does get_template_part() do?**

**A:** It loads a reusable template file from the theme, similar to `include`, but it uses the child-theme-first lookup and triggers `get_template_part_{slug}` action. In WP 5.5+ you can pass context data as the third argument.
```php
// Loads template-parts/card-book.php or template-parts/card.php
get_template_part( 'template-parts/card', 'book', [ 'post_id' => get_the_ID() ] );
```

**Q23: How does a child theme work?**

**A:** A child theme lives in its own folder with a `style.css` declaring `Template: parent-theme-slug`. WordPress loads parent-theme templates as fallback, so you only override what you change. Enqueue both stylesheets properly in `functions.php`.
```php
add_action( 'wp_enqueue_scripts', function() {
    wp_enqueue_style( 'parent', get_template_directory_uri() . '/style.css' );
    wp_enqueue_style( 'child',  get_stylesheet_uri(), [ 'parent' ] );
});
```

**Q24: What is WP-Cron and how do you schedule an event?**

**A:** WP-Cron is a pseudo-cron triggered by page visits, not the system. Schedule with `wp_schedule_event()` on activation, hook your callback, and clear on deactivation with `wp_clear_scheduled_hook()`.
```php
register_activation_hook( __FILE__, function() {
    if ( ! wp_next_scheduled( 'my_daily_task' ) )
        wp_schedule_event( time(), 'daily', 'my_daily_task' );
});
add_action( 'my_daily_task', function() { /* run task */ });
```

**Q25: What are transients and when should you use them?**

**A:** Transients are temporary cached values stored via `set_transient( $key, $value, $expiry )` and retrieved with `get_transient()`. Use them to cache expensive queries or remote API calls for a defined TTL. On object-cache enabled sites they use the external cache automatically.
```php
$data = get_transient( 'my_api_data' );
if ( false === $data ) {
    $data = expensive_api_call();
    set_transient( 'my_api_data', $data, HOUR_IN_SECONDS );
}
```

**Q26: What is the WordPress object cache?**

**A:** The built-in non-persistent cache (`wp_cache_set/get`) stores values in memory for the current request. With a persistent backend (Redis, Memcached) via a drop-in, it survives across requests — dramatically reducing DB queries.
```php
wp_cache_set( 'my_key', $value, 'my_group', 300 );
$cached = wp_cache_get( 'my_key', 'my_group' );
```

**Q27: How do you retrieve an attachment URL and its metadata?**

**A:** `wp_get_attachment_url( $id )` returns the full URL. `wp_get_attachment_image_src( $id, $size )` returns `[url, w, h]`. `wp_get_attachment_metadata( $id )` returns all generated sizes.
```php
$url  = wp_get_attachment_url( $attachment_id );
$src  = wp_get_attachment_image_src( $attachment_id, 'thumbnail' );
echo '<img src="' . esc_url( $src[0] ) . '" width="' . absint( $src[1] ) . '">';
```

**Q28: How do you query and display comments?**

**A:** Use `get_comments( $args )` or rely on `comments_template()` in the theme. Output the comment list with `wp_list_comments()` and the form with `comment_form()`.
```php
$comments = get_comments([ 'post_id' => get_the_ID(), 'status' => 'approve' ]);
wp_list_comments( [ 'style' => 'ol' ], $comments );
```

**Q29: How do you add pagination to a custom query?**

**A:** Set `paged` arg from `get_query_var( 'paged' )`, pass `max_num_pages` to `paginate_links()`, and echo the result. For the main query use `the_posts_pagination()`.
```php
$q = new WP_Query([ 'paged' => max(1, get_query_var('paged')), 'posts_per_page' => 10 ]);
// After loop:
echo paginate_links([ 'total' => $q->max_num_pages ]);
```

**Q30: How do you add a custom rewrite rule?**

**A:** Use `add_rewrite_rule( $regex, $redirect, $position )` on `init`, and `flush_rewrite_rules()` once on activation. Expose custom query vars with the `query_vars` filter.
```php
add_action( 'init', function() {
    add_rewrite_rule( '^books/([^/]+)/?$', 'index.php?book_slug=$matches[1]', 'top' );
});
add_filter( 'query_vars', fn($v) => array_merge($v, ['book_slug']) );
```

**Q31: What is the Settings API?**

**A:** A framework for adding settings pages. Register settings with `register_setting()`, add sections with `add_settings_section()`, and add fields with `add_settings_field()`. WordPress handles sanitisation callbacks and nonces automatically.
```php
register_setting( 'my_options_group', 'my_option', 'sanitize_text_field' );
add_settings_section( 'main', 'Main Settings', '__return_false', 'my-settings' );
add_settings_field( 'my_field', 'API Key', 'my_field_cb', 'my-settings', 'main' );
```

**Q32: How do you add a Customizer setting?**

**A:** Hook into `customize_register`, get the `WP_Customize_Manager` object, and call `add_setting()` then `add_control()`. Retrieve saved values with `get_theme_mod()`.
```php
add_action( 'customize_register', function( $wp_customize ) {
    $wp_customize->add_setting( 'header_color', [ 'default' => '#ffffff' ] );
    $wp_customize->add_control( new WP_Customize_Color_Control(
        $wp_customize, 'header_color', [ 'label' => 'Header Color', 'section' => 'colors' ]
    ));
});
```

**Q33: What is the REST API and how do you fetch posts with it?**

**A:** The WordPress REST API exposes JSON endpoints under `/wp-json/wp/v2/`. Core post endpoint: `GET /wp-json/wp/v2/posts`. Responses include pagination headers. Authenticate with cookies + nonce, Application Passwords, or OAuth.
```php
// Server-side fetch
$response = wp_remote_get( home_url( '/wp-json/wp/v2/posts?per_page=5' ) );
$posts    = json_decode( wp_remote_retrieve_body( $response ) );
```

**Q34: What is a Gutenberg block at its simplest?**

**A:** A block is a JavaScript/PHP pair. JS defines `edit` (editor UI) and `save` (static markup). Register on the PHP side with `register_block_type()` pointing to a `block.json` manifest. `save` output is stored in post_content.
```php
// block.json excerpt + PHP registration
register_block_type( __DIR__ . '/build/blocks/my-block' );
```

**Q35: What is WordPress Multisite?**

**A:** Multisite lets one WordPress install run multiple sites sharing core files but with separate DB tables (prefixed `{n}_`). Enable via `wp-config.php` constants. Network admin manages all sites; `switch_to_blog( $id )` lets plugins query another site's data.
```php
switch_to_blog( 2 );
$posts = get_posts([ 'numberposts' => 5 ]);
restore_current_blog();
```

---

## Mid

**Q36: How do you use meta_query in WP_Query?**

**A:** Pass a `meta_query` array of clauses. Each clause needs `key`, `value`, `compare`, and `type`. Multiple clauses are combined with the top-level `relation` ('AND'/'OR'). Use `NUMERIC` type for correct comparison.
```php
$q = new WP_Query([
    'post_type'  => 'book',
    'meta_query' => [
        'relation' => 'AND',
        [ 'key' => '_rating', 'value' => 4, 'compare' => '>=', 'type' => 'NUMERIC' ],
        [ 'key' => '_in_stock', 'value' => '1', 'compare' => '=' ],
    ],
]);
```

**Q37: How do you use tax_query in WP_Query?**

**A:** Add a `tax_query` array of clause arrays. Each clause needs `taxonomy`, `field` (`term_id`, `slug`, or `name`), and `terms`. Combine multiple taxonomies with `relation`.
```php
$q = new WP_Query([
    'post_type' => 'book',
    'tax_query' => [[
        'taxonomy' => 'genre',
        'field'    => 'slug',
        'terms'    => [ 'fiction', 'thriller' ],
        'operator' => 'IN',
    ]],
]);
```

**Q38: How do you use date_query in WP_Query?**

**A:** Add a `date_query` array of clauses supporting `year`, `month`, `day`, `after`, `before`, and `inclusive`. Great for filtering by relative date ranges without raw SQL.
```php
$q = new WP_Query([
    'date_query' => [[
        'after'     => [ 'year' => 2024, 'month' => 1, 'day' => 1 ],
        'before'    => 'today',
        'inclusive' => true,
    ]],
]);
```

**Q39: What are the most important register_post_type() args?**

**A:** `public`, `has_archive`, `rewrite`, `supports`, `show_in_rest` (enables Gutenberg and REST), `capability_type`, `menu_icon`, and `labels`. `show_in_rest => true` is required for block editor support.
```php
register_post_type( 'product', [
    'public'       => true,
    'show_in_rest' => true,
    'has_archive'  => true,
    'rewrite'      => [ 'slug' => 'products' ],
    'supports'     => [ 'title', 'editor', 'thumbnail', 'custom-fields' ],
]);
```

**Q40: How do you create a custom database table with dbDelta?**

**A:** Build a `CREATE TABLE` SQL string with two spaces after column names (dbDelta requirement), then call `dbDelta( $sql )` from `dbDelta()` loaded via `upgrade.php`. Run this on activation and on version bump.
```php
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
global $wpdb;
$sql = "CREATE TABLE {$wpdb->prefix}my_table (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  data text NOT NULL,
  PRIMARY KEY  (id)
) " . $wpdb->get_charset_collate() . ";";
dbDelta( $sql );
```

**Q41: How does AJAX work in WordPress?**

**A:** Register handlers via `wp_ajax_{action}` (logged-in) and `wp_ajax_nopriv_{action}` (logged-out). The JS posts to `admin-ajax.php` with `action` and a nonce. Always verify nonce and capability, then call `wp_send_json_success/error()`.
```php
add_action( 'wp_ajax_my_action', function() {
    check_ajax_referer( 'my_nonce', 'nonce' );
    wp_send_json_success([ 'msg' => 'OK' ]);
});
```

**Q42: How do you register a custom REST API endpoint?**

**A:** Call `register_rest_route()` inside a `rest_api_init` callback. Define namespace, route pattern, method, callback, and permission callback. Return data as an array — WordPress serialises it to JSON.
```php
add_action( 'rest_api_init', function() {
    register_rest_route( 'my-plugin/v1', '/books/(?P<id>\d+)', [
        'methods'             => 'GET',
        'callback'            => fn($r) => get_post( $r['id'] ),
        'permission_callback' => '__return_true',
    ]);
});
```

**Q43: How do you register a Gutenberg block in PHP?**

**A:** Use `register_block_type()` with either a path to a `block.json` directory or an explicit args array. The `block.json` approach is preferred — it auto-generates asset handles and supports server-side rendering via `render_callback`.
```php
add_action( 'init', function() {
    register_block_type( __DIR__ . '/build', [
        'render_callback' => function( $atts ) {
            return '<div class="my-block">' . esc_html( $atts['message'] ) . '</div>';
        },
    ]);
});
```

**Q44: How do you read and update block editor store data with @wordpress/data?**

**A:** Use `wp.data.select( 'core/editor' )` to read (e.g. `getCurrentPost()`) and `wp.data.dispatch( 'core/editor' )` to write (e.g. `editPost()`). This is the Flux-like state management layer in Gutenberg.
```php
// JS side (ES module)
const { select, dispatch } = wp.data;
const title = select('core/editor').getEditedPostAttribute('title');
dispatch('core/editor').editPost({ title: 'New Title' });
```

**Q45: What is the difference between transients and the object cache?**

**A:** Transients are stored in `wp_options` (or object cache if available) and have an explicit TTL — they persist across requests. The object cache's in-memory store is request-scoped unless a persistent backend is installed. Transients are the safe default when persistence is uncertain.
```php
// Transient — survives requests
set_transient( 'my_data', $value, DAY_IN_SECONDS );

// Object cache — in-memory, request-scoped without persistent backend
wp_cache_set( 'my_data', $value, '', 300 );
```

**Q46: How do you query users with WP_User_Query?**

**A:** Instantiate with an args array supporting `role`, `meta_query`, `search`, `orderby`, and `number`. Call `get_results()` for user objects or `get_total()` for count.
```php
$uq = new WP_User_Query([
    'role'       => 'author',
    'number'     => 20,
    'meta_query' => [[ 'key' => 'verified', 'value' => '1' ]],
]);
$users = $uq->get_results();
```

**Q47: How do you run a safe custom SQL query with wpdb?**

**A:** Always use `$wpdb->prepare()` to parameterise queries — never concatenate user input into SQL. Use `%s`, `%d`, `%f` placeholders. Then pass to `$wpdb->get_results()`, `get_var()`, or `query()`.
```php
global $wpdb;
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_author = %d AND post_status = %s",
        $user_id, 'publish'
    )
);
```

**Q48: How do you run a dbDelta migration on plugin update?**

**A:** Store a version in `wp_options`. On `plugins_loaded` compare against the constant. If outdated, run the migration and update the stored version. This prevents running migrations on every request.
```php
add_action( 'plugins_loaded', function() {
    $stored = get_option( 'my_plugin_db_version', '0' );
    if ( version_compare( $stored, MY_PLUGIN_DB_VERSION, '<' ) ) {
        my_plugin_run_migrations();
        update_option( 'my_plugin_db_version', MY_PLUGIN_DB_VERSION );
    }
});
```

**Q49: How do you implement the Settings API end-to-end?**

**A:** Register settings group + options in `admin_init`, add a menu page, render a `<form>` pointing to `options.php`, and call `settings_fields()` + `do_settings_sections()` inside it. WordPress handles save, nonce, and redirect.
```php
add_action( 'admin_init', function() {
    register_setting( 'my_group', 'my_api_key', 'sanitize_text_field' );
    add_settings_section( 's1', 'API', '__return_false', 'my-page' );
    add_settings_field( 'api_key', 'Key', function() {
        echo '<input name="my_api_key" value="' . esc_attr( get_option('my_api_key') ) . '">';
    }, 'my-page', 's1' );
});
```

**Q50: How do you display an admin notice?**

**A:** Hook into `admin_notices` and echo a `<div class="notice notice-{type} is-dismissible">` wrapper. For user-specific one-time notices, store a transient and delete it after display.
```php
add_action( 'admin_notices', function() {
    if ( get_transient( 'my_plugin_notice' ) ) :
        delete_transient( 'my_plugin_notice' ); ?>
        <div class="notice notice-success is-dismissible">
            <p><?php esc_html_e( 'Settings saved!', 'my-plugin' ); ?></p>
        </div>
    <?php endif;
});
```

**Q51: How do you add a custom meta box?**

**A:** Register with `add_meta_box()` on `add_meta_boxes`. Render your fields in the callback, including a nonce field. Save via `save_post`, verifying nonce and capabilities before updating meta.
```php
add_action( 'add_meta_boxes', function() {
    add_meta_box( 'book_details', 'Book Details', 'render_book_meta_box', 'book' );
});
function render_book_meta_box( $post ) {
    wp_nonce_field( 'book_meta', 'book_meta_nonce' );
    $val = get_post_meta( $post->ID, '_isbn', true );
    echo '<input name="_isbn" value="' . esc_attr( $val ) . '">';
}
```

**Q52: How do you add a custom column to a post list table?**

**A:** Use `manage_{post_type}_posts_columns` to add the column header, and `manage_{post_type}_posts_custom_column` to output the cell value. Both filters receive the post type in the hook name.
```php
add_filter( 'manage_book_posts_columns', function( $cols ) {
    $cols['isbn'] = 'ISBN'; return $cols;
});
add_action( 'manage_book_posts_custom_column', function( $col, $id ) {
    if ( $col === 'isbn' ) echo esc_html( get_post_meta( $id, '_isbn', true ) );
}, 10, 2 );
```

**Q53: How do you add a custom bulk action in the admin?**

**A:** Filter `bulk_actions-edit-{post_type}` to add the option, then handle it on `handle_bulk_actions-edit-{post_type}`. Return the redirect URL with updated query vars to show a notice.
```php
add_filter( 'bulk_actions-edit-book', function( $a ) {
    $a['mark_featured'] = 'Mark Featured'; return $a;
});
add_filter( 'handle_bulk_actions-edit-book', function( $url, $action, $ids ) {
    if ( $action === 'mark_featured' )
        foreach ( $ids as $id ) update_post_meta( $id, '_featured', '1' );
    return $url;
}, 10, 3 );
```

**Q54: How do you add a top-level admin menu page?**

**A:** Use `add_menu_page()` in `admin_menu`. Provide label, capability, slug, callback, icon, and position. Use `add_submenu_page()` for children, or `add_options_page()` / `add_management_page()` shortcuts.
```php
add_action( 'admin_menu', function() {
    add_menu_page(
        'My Plugin', 'My Plugin', 'manage_options',
        'my-plugin', 'my_plugin_page_cb', 'dashicons-book', 25
    );
});
```

**Q55: How do you conditionally enqueue a script only on a specific page?**

**A:** Inside `admin_enqueue_scripts` check the `$hook` parameter, or on the front end use conditional tags inside the `wp_enqueue_scripts` callback.
```php
add_action( 'admin_enqueue_scripts', function( $hook ) {
    if ( 'post.php' !== $hook && 'post-new.php' !== $hook ) return;
    wp_enqueue_script( 'my-editor', plugin_dir_url(__FILE__) . 'js/editor.js', ['jquery'], null, true );
});
```

**Q56: What does wp_localize_script do?**

**A:** It prints a JS object into the page attached to a registered script handle, allowing you to pass PHP data (URLs, nonces, settings) to client-side code. Must be called after `wp_enqueue_script()`.
```php
wp_enqueue_script( 'my-app', plugin_dir_url(__FILE__) . 'js/app.js', [], null, true );
wp_localize_script( 'my-app', 'MyApp', [
    'ajaxUrl' => admin_url( 'admin-ajax.php' ),
    'nonce'   => wp_create_nonce( 'my_action' ),
]);
```

**Q57: How do you make an HTTP request from PHP in WordPress?**

**A:** Use `wp_remote_get()` or `wp_remote_post()` from the HTTP API. Check for `WP_Error`, then read the body with `wp_remote_retrieve_body()` and status with `wp_remote_retrieve_response_code()`.
```php
$resp = wp_remote_get( 'https://api.example.com/data', [ 'timeout' => 10 ] );
if ( is_wp_error( $resp ) ) { error_log( $resp->get_error_message() ); return; }
$body = json_decode( wp_remote_retrieve_body( $resp ), true );
```

**Q58: What is the Filesystem API and when do you use it?**

**A:** The Filesystem API (`WP_Filesystem`) abstracts file operations so they work via FTP, SSH, or direct access depending on server config. Use it whenever a plugin writes files to avoid permission errors on locked-down hosts.
```php
if ( ! WP_Filesystem() ) { return; }
global $wp_filesystem;
$wp_filesystem->put_contents( WP_CONTENT_DIR . '/uploads/my.txt', 'data', FS_CHMOD_FILE );
```

**Q59: How do you register a custom image size?**

**A:** Call `add_image_size( $name, $w, $h, $crop )` in `after_setup_theme`. Use `get_the_post_thumbnail( $id, $name )` or `wp_get_attachment_image( $id, $name )` to output. Run "Regenerate Thumbnails" after adding new sizes to existing media.
```php
add_action( 'after_setup_theme', function() {
    add_image_size( 'card-thumb', 400, 300, true ); // hard crop
});
```

**Q60: How do you handle media upload programmatically?**

**A:** Use `media_handle_upload()` for `$_FILES` uploads, or `media_sideload_image()` for remote URLs. Both return the attachment ID. Always check for `WP_Error`.
```php
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$attachment_id = media_sideload_image( $url, $post_id, null, 'id' );
```

**Q61: How do you schedule a recurring event with wp_schedule_event?**

**A:** Call it once (on activation). Pass a timestamp, interval slug (`hourly`, `twicedaily`, `daily`, or custom via `cron_schedules` filter), and the action hook name. Clear on deactivation.
```php
register_activation_hook( __FILE__, function() {
    wp_schedule_event( time(), 'hourly', 'my_hourly_sync' );
});
add_action( 'my_hourly_sync', 'do_sync_function' );
register_deactivation_hook( __FILE__, fn() => wp_clear_scheduled_hook('my_hourly_sync') );
```

**Q62: What is the Heartbeat API?**

**A:** A polling mechanism (default 15–60s) using `admin-ajax.php` to keep the user session alive and enable post locking. Filter `heartbeat_received` on the server; use `wp.heartbeat.on('tick', fn)` in JS. Can be throttled with `heartbeat_settings`.
```php
add_filter( 'heartbeat_received', function( $response, $data ) {
    if ( isset( $data['my_check'] ) )
        $response['my_result'] = 'pong';
    return $response;
}, 10, 2 );
```

**Q63: What are the core WP-CLI commands every WordPress developer should know?**

**A:** `wp core update`, `wp plugin install/activate/update`, `wp theme activate`, `wp post list`, `wp user create`, `wp db export/import`, `wp cache flush`, `wp cron event run`, and `wp eval`. WP-CLI is essential for scripted deployments.
```bash
wp plugin install woocommerce --activate
wp post list --post_type=book --posts_per_page=5
wp db export backup.sql
```

**Q64: How do you use Composer in a WordPress plugin?**

**A:** Add a `composer.json`, define your PSR-4 namespace map, run `composer install`, and `require_once __DIR__ . '/vendor/autoload.php'` at the top of your main plugin file. Never commit `vendor/` to version control.
```json
{
    "autoload": {
        "psr-4": { "MyPlugin\\": "src/" }
    }
}
```

**Q65: How do you set up PSR-4 autoloading for a plugin?**

**A:** Declare the namespace-to-directory mapping in `composer.json` under `autoload.psr-4`. After `composer dump-autoload`, require the autoloader. Class `MyPlugin\Admin\Settings` maps to `src/Admin/Settings.php`.
```php
// In plugin bootstrap
require_once __DIR__ . '/vendor/autoload.php';

// Class automatically found at src/Admin/Settings.php
$settings = new \MyPlugin\Admin\Settings();
```

**Q66: How do you write a unit test using WP_UnitTestCase?**

**A:** Extend `WP_UnitTestCase` (from the `wordpress-develop` test suite or Brain Monkey for isolated tests). Use factory helpers (`$this->factory->post->create()`) and standard PHPUnit assertions. Run via `phpunit` in the plugin directory.
```php
class My_Test extends WP_UnitTestCase {
    public function test_meta_saved() {
        $id = $this->factory->post->create();
        update_post_meta( $id, '_isbn', '12345' );
        $this->assertSame( '12345', get_post_meta( $id, '_isbn', true ) );
    }
}
```

**Q67: How do you debug with WP_DEBUG?**

**A:** Set `WP_DEBUG true`, `WP_DEBUG_LOG true` (writes to `wp-content/debug.log`), and `WP_DEBUG_DISPLAY false` (hide from screen) in `wp-config.php`. Also use `error_log()` or `var_dump()` wrapped in `WP_DEBUG` checks.
```php
if ( defined('WP_DEBUG') && WP_DEBUG ) {
    error_log( 'My value: ' . print_r( $data, true ) );
}
```

**Q68: How do you add a custom interval to WP-Cron?**

**A:** Filter `cron_schedules` and append an array with `interval` (seconds) and `display` label. Then use your slug as the interval in `wp_schedule_event()`.
```php
add_filter( 'cron_schedules', function( $schedules ) {
    $schedules['every_five_minutes'] = [
        'interval' => 300,
        'display'  => 'Every 5 Minutes',
    ];
    return $schedules;
});
```

**Q69: How do you add custom fields to the REST API response?**

**A:** Use `register_rest_field()` to attach a new property to an existing resource. Provide `get_callback`, optional `update_callback`, and `schema`. This is cleaner than filtering `rest_prepare_{post_type}`.
```php
register_rest_field( 'book', 'isbn', [
    'get_callback'    => fn($p) => get_post_meta( $p['id'], '_isbn', true ),
    'update_callback' => fn($v,$obj) => update_post_meta( $obj->ID, '_isbn', sanitize_text_field($v) ),
    'schema'          => [ 'type' => 'string' ],
]);
```

**Q70: What is wp_remote_post and when is it used?**

**A:** `wp_remote_post()` sends an HTTP POST request. Use it to hit webhooks, submit to third-party APIs, or interact with headless frontends. Pass `body` (array or string) and `headers` in the args array.
```php
wp_remote_post( 'https://hooks.example.com/notify', [
    'headers' => [ 'Content-Type' => 'application/json' ],
    'body'    => wp_json_encode([ 'event' => 'new_post', 'id' => $post_id ]),
    'timeout' => 15,
]);
```

**Q71: How do you register a block variation?**

**A:** Call `wp.blocks.registerBlockVariation()` in a JS file enqueued on `enqueue_block_editor_assets`. Variations are preset configurations of an existing block — no new block type required.
```php
// PHP enqueue
add_action( 'enqueue_block_editor_assets', function() {
    wp_enqueue_script( 'my-variations', plugin_dir_url(__FILE__).'js/variations.js', ['wp-blocks'], null );
});
// JS: wp.blocks.registerBlockVariation('core/group', { name:'hero', title:'Hero', ... });
```

**Q72: How do you use the Options API to store arrays?**

**A:** `update_option()` serialises arrays automatically. `get_option()` deserialises on retrieval. Prefer a single option holding an array over many individual option rows to minimise DB queries.
```php
$defaults = [ 'color' => 'blue', 'count' => 10 ];
$options  = wp_parse_args( get_option( 'my_opts', [] ), $defaults );
$options['color'] = sanitize_hex_color( $_POST['color'] ?? '' );
update_option( 'my_opts', $options );
```

**Q73: How do you create a network-activated plugin setting in Multisite?**

**A:** Use `get_site_option()` / `update_site_option()` instead of `get_option()`. These read/write to the `wp_sitemeta` table, which is shared across all sites in the network.
```php
// Store network-wide
update_site_option( 'my_network_setting', 'value' );

// Retrieve from any site
$setting = get_site_option( 'my_network_setting' );
```

**Q74: How do you add a Gutenberg sidebar panel with InspectorControls?**

**A:** Import `InspectorControls` from `@wordpress/block-editor` and wrap `PanelBody` + controls inside it within the `edit` function. Values are stored as block attributes.
```php
// JS (JSX)
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
// Inside edit():
<InspectorControls>
  <PanelBody title="Settings">
    <ToggleControl label="Featured" checked={attributes.featured}
      onChange={v => setAttributes({featured: v})} />
  </PanelBody>
</InspectorControls>
```

**Q75: What is wp_cache_delete and when do you call it?**

**A:** `wp_cache_delete( $key, $group )` removes a specific cache entry. Call it whenever you update the underlying data so stale values are not served. For transients use `delete_transient()`.
```php
update_post_meta( $post_id, '_isbn', $new_isbn );
wp_cache_delete( "book_{$post_id}_meta", 'my_plugin' );
// Next request re-populates the cache
```

---

## Advanced

**Q76: How do you optimise WordPress performance at the application layer?**

**A:** Eliminate N+1 queries by fetching related meta/terms in bulk with `update_post_meta_cache` and `update_term_meta_cache` args. Use persistent object caching (Redis/Memcached), avoid `query_posts()`, and keep `posts_per_page` bounded. Profile with `SAVEQUERIES`.
```php
$q = new WP_Query([
    'post_type'              => 'book',
    'update_post_meta_cache' => true,
    'update_term_cache'      => true,
    'no_found_rows'          => true, // skip COUNT query if pagination not needed
]);
```

**Q77: What are WordPress VIP coding standards and how do you enforce them?**

**A:** VIP Go standards extend WordPress Coding Standards (WPCS) with stricter rules: no direct DB queries without `$wpdb->prepare()`, no uncached functions in loops, banned functions (`file_get_contents`, `shell_exec`). Enforce via PHPCS with the `WordPress-VIP-Go` ruleset in CI.
```bash
./vendor/bin/phpcs --standard=WordPress-VIP-Go src/
```

**Q78: How do you harden a plugin against security vulnerabilities?**

**A:** Apply the trinity: validate input (nonces + capability checks), sanitize on save (type-appropriate functions), escape on output (context-aware escaping). Never trust `$_POST/$_GET` directly, and always use `$wpdb->prepare()` for SQL.
```php
if ( ! current_user_can( 'edit_post', $post_id ) ) wp_die('Forbidden');
check_admin_referer( 'update_book_' . $post_id );
$isbn = sanitize_text_field( $_POST['isbn'] ?? '' );
update_post_meta( $post_id, '_isbn', $isbn );
```

**Q79: How does switch_to_blog work in Multisite and what are the gotchas?**

**A:** `switch_to_blog( $id )` changes the global DB table prefix and several globals. Always call `restore_current_blog()` in a `finally` block. Avoid deeply nested switches — they are expensive and can cause global state pollution.
```php
switch_to_blog( $blog_id );
try {
    $posts = get_posts([ 'numberposts' => 5 ]);
} finally {
    restore_current_blog();
}
```

**Q80: What does a scalable large plugin architecture look like?**

**A:** Use a service-container / dependency injection pattern. Bootstrap a main plugin class that lazy-loads feature modules. Separate concerns into `src/` (PSR-4), keep hooks in thin loader classes, and use interfaces so implementations are swappable.
```php
final class My_Plugin {
    public static function boot(): void {
        $container = new Container();
        $container->register( new Admin_Service_Provider() );
        $container->register( new Rest_Service_Provider() );
        $container->boot();
    }
}
add_action( 'plugins_loaded', [ My_Plugin::class, 'boot' ] );
```

**Q81: What authentication methods does the WordPress REST API support?**

**A:** Cookie + nonce (same-origin JS), Application Passwords (WP 5.6+, HTTP Basic), OAuth 1.0a (via plugin), and JWT (via plugin). For headless setups, Application Passwords are the easiest built-in option; OAuth is required for third-party apps.
```php
// Application Password via wp_remote_get
wp_remote_get( rest_url('wp/v2/posts'), [
    'headers' => [
        'Authorization' => 'Basic ' . base64_encode("admin:xxxx xxxx xxxx xxxx xxxx xxxx"),
    ],
]);
```

**Q82: How do you add RichText to a custom Gutenberg block?**

**A:** Import `RichText` from `@wordpress/block-editor`. Use `<RichText value={} onChange={} tagName="" />` in `edit`, and `<RichText.Content tagName="" value={} />` in `save` to output stored HTML.
```php
// JS (JSX)
import { RichText } from '@wordpress/block-editor';
// edit:
<RichText tagName="p" value={attributes.body}
  onChange={v => setAttributes({body: v})} placeholder="Write…" />
// save:
<RichText.Content tagName="p" value={attributes.body} />
```

**Q83: What is Full Site Editing (FSE) and what is theme.json?**

**A:** FSE allows the entire site (header, footer, templates) to be edited in the block editor. `theme.json` is a declarative config file defining color palettes, typography scales, spacing, and block-level defaults — replacing a large chunk of `add_theme_support()` calls.
```json
{
    "version": 2,
    "settings": {
        "color": { "palette": [{ "slug": "primary", "color": "#0073aa", "name": "Primary" }] },
        "typography": { "fontSizes": [{ "slug": "lg", "size": "1.5rem", "name": "Large" }] }
    }
}
```

**Q84: When should you replace WP-Cron with a real server cron?**

**A:** WP-Cron fires only on page visits, so on low-traffic sites events may run late. For time-sensitive jobs (billing, email queues) disable WP-Cron (`DISABLE_WP_CRON true`), then add a real cron entry that hits `wp-cron.php` every minute.
```bash
# /etc/cron.d/wordpress
* * * * * www-data php /var/www/html/wp-cron.php > /dev/null 2>&1
```

**Q85: How do you run WordPress behind a load balancer?**

**A:** Share sessions via a persistent object cache (Redis). Use a centralised NFS or S3-backed uploads directory (or Nginx rewrite to the primary node for media). Store no local state. Set `FORCE_SSL_ADMIN` and trust proxy headers (`HTTP_X_FORWARDED_PROTO`) if needed.
```php
define( 'FORCE_SSL_ADMIN', true );
// In wp-config.php to trust load balancer SSL header:
if ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && 'https' === $_SERVER['HTTP_X_FORWARDED_PROTO'] )
    $_SERVER['HTTPS'] = 'on';
```

**Q86: How does Redis object caching integrate with WordPress?**

**A:** Install a Redis server and the `redis-cache` plugin (or drop a custom `wp-content/object-cache.php` drop-in). It implements `WP_Object_Cache` methods using the Redis client. All `wp_cache_*` calls are then persistent across requests.
```php
// wp-config.php
define( 'WP_REDIS_HOST', '127.0.0.1' );
define( 'WP_REDIS_PORT', 6379 );
define( 'WP_REDIS_DATABASE', 0 );
```

**Q87: How does Varnish work with WordPress?**

**A:** Varnish caches full-page HTML in front of WordPress. The challenge is cache invalidation — on post publish, send a `BAN` or `PURGE` request to Varnish for affected URLs. Use plugins like Proxy Cache Purge. Logged-in users and pages with cookies must bypass Varnish (`pass` action in VCL).
```vcl
sub vcl_recv {
    if ( req.http.Cookie ~ "wordpress_logged_in" ) { return(pass); }
}
```

**Q88: How do you integrate a CDN with WordPress?**

**A:** Rewrite upload and asset URLs to the CDN origin with `WP_CONTENT_URL` override, or use a CDN plugin that filters `upload_dir` and enqueue URLs. Set long `Cache-Control` headers for static assets and purge on media delete.
```php
// Rewrite uploads to CDN
add_filter( 'wp_get_attachment_url', function( $url ) {
    return str_replace( home_url(), 'https://cdn.example.com', $url );
});
```

**Q89: How does the WordPress hooks system work internally?**

**A:** `$wp_filter` is a global array of `WP_Hook` objects keyed by hook name. `add_action/filter` appends callbacks to the priority bucket. `do_action/apply_filters` iterates buckets in ascending priority order (default 10), calling each callback. Lower number = earlier execution.
```php
// Priority 5 fires before default 10
add_filter( 'the_content', 'my_early_filter', 5 );
add_filter( 'the_content', 'my_late_filter', 20 );
```

**Q90: What is late escaping and why does it matter?**

**A:** Late escaping means escaping at the point of output, not at the point of storage or in a variable. It guarantees the context-correct function is used at output time and prevents double-escaping issues when data passes through multiple functions before display.
```php
// Wrong — escaped too early, may double-encode later
$title = esc_html( get_the_title() );
echo "<h1>$title</h1>";

// Right — escape at the last moment
echo '<h1>' . esc_html( get_the_title() ) . '</h1>';
```

**Q91: How do you set up PHPCS with WordPress coding standards?**

**A:** Require `squizlabs/php_codesniffer` and `wp-coding-standards/wpcs` via Composer, register the WPCS path with PHPCS, then create a `phpcs.xml` config referencing the `WordPress` ruleset. Run in CI on every PR.
```xml
<!-- phpcs.xml -->
<ruleset name="MyPlugin">
    <rule ref="WordPress"/>
    <file>src/</file>
    <arg name="extensions" value="php"/>
</ruleset>
```

**Q92: How do you set up a CI/CD pipeline for WordPress with GitHub Actions?**

**A:** Create a workflow YAML that installs Composer/Node dependencies, runs PHPCS and PHPUnit, then deploys to the server via SSH or rsync (or pushes to WP.org SVN). Secrets store SSH keys and credentials.
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: composer install
      - run: ./vendor/bin/phpcs
      - run: ./vendor/bin/phpunit
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: rsync -avz --exclude='.git' ./ user@host:/var/www/plugin/
```

**Q93: How do you release a plugin to the WordPress.org repository?**

**A:** Submit via the Plugin Review form. Once approved you get SVN access. Commit code to `trunk/` and tag stable releases under `tags/1.0.0/`. Update `readme.txt` (with `Stable tag`) and `plugin header` to match. Assets (banners, icons) go in `assets/`.
```bash
svn co https://plugins.svn.wordpress.org/my-plugin/
svn cp trunk tags/1.0.0
svn ci -m "Tagging version 1.0.0"
```

**Q94: How do you use wp-env for local Docker-based development?**

**A:** Install `@wordpress/env` globally or as a dev dependency. Add a `.wp-env.json` with paths to plugins/themes. Run `wp-env start` — it spins up WordPress + MySQL containers. Run `wp-env run cli wp ...` for WP-CLI commands.
```json
{
    "plugins": [ "." ],
    "themes": [ "../../themes/my-theme" ],
    "config": { "WP_DEBUG": true }
}
```

**Q95: How do you profile slow queries with SAVEQUERIES?**

**A:** Set `define('SAVEQUERIES', true)` in `wp-config.php`. After page load, `$wpdb->queries` is an array of `[sql, time, caller_trace]`. Sort by time to find slow queries. Never leave this on in production — it increases memory usage.
```php
define( 'SAVEQUERIES', true );
// After output:
if ( current_user_can('administrator') ) {
    $slow = array_filter( $GLOBALS['wpdb']->queries, fn($q) => $q[1] > 0.05 );
    error_log( print_r( $slow, true ) );
}
```

**Q96: How do you manage WordPress core updates safely at scale?**

**A:** Pin the core version in Composer (`roots/wordpress`). Test updates on staging first. Use `automatic_updater_disabled` or `auto_update_core` filter to control automatic updates. Deploy via CI after passing tests, never through the WP admin on production.
```php
// Disable all automatic updates — handled by CI
add_filter( 'automatic_updater_disabled', '__return_true' );
```

**Q97: How do you maintain backward compatibility in a plugin?**

**A:** Use `version_compare( get_bloginfo('version'), '6.0', '>=' )` guards for new API usage. Provide deprecated wrappers with `_deprecated_function()`. Avoid removing filters/actions — add alternatives and keep old hooks firing for at least two major versions.
```php
function my_old_function() {
    _deprecated_function( __FUNCTION__, '2.0.0', 'my_new_function' );
    return my_new_function();
}
```

**Q98: How do you enforce WordPress coding standards in a team?**

**A:** Commit a `phpcs.xml` with the `WordPress` ruleset. Add a pre-commit hook (via Husky or a bash script) that runs PHPCS. Run the same check in GitHub Actions so PRs fail on violations. Optionally add `phpcbf` as an auto-fixer step.
```bash
#!/bin/sh
# .git/hooks/pre-commit
./vendor/bin/phpcs --standard=phpcs.xml $(git diff --cached --name-only --diff-filter=ACM | grep '\.php$')
```

**Q99: How does WordPress multisite network admin differ from single-site admin?**

**A:** Network Admin (`/wp-admin/network/`) manages all sites, users, themes, and plugins across the network. Network-activated plugins run on all sites. Use `is_multisite()`, `is_super_admin()`, and `is_network_admin()` guards. Super admins can override per-site restrictions.
```php
if ( is_multisite() && is_super_admin() ) {
    $blogs = get_sites([ 'number' => 100 ]);
    foreach ( $blogs as $blog ) {
        switch_to_blog( $blog->blog_id );
        // per-site operation
        restore_current_blog();
    }
}
```

**Q100: What is the difference between do_action and apply_filters and when do you use each?**

**A:** `do_action` is a notification: callbacks run as side effects and no value is returned to the caller. `apply_filters` is a transformation: the value passes through each callback and the final modified value is returned. Misusing them (e.g. returning from an action callback) is a common bug.
```php
// Action — broadcast an event, no return expected
do_action( 'my_plugin_after_import', $import_id );

// Filter — transform a value and return it
$price = apply_filters( 'my_plugin_price', 9.99, $product_id );
```
