<?php
/**
 * WordPress Senior Engineer — Code Examples
 *
 * Covers: WP_Query, hooks, CPT registration, REST API, meta,
 *         transients, security, and Gutenberg dynamic blocks.
 */

// =============================================================================
// 1. REGISTERING A CUSTOM POST TYPE WITH FULL REST API SUPPORT
// =============================================================================

add_action( 'init', 'se_register_project_post_type' );

function se_register_project_post_type(): void {
    $labels = [
        'name'               => __( 'Projects', 'se-plugin' ),
        'singular_name'      => __( 'Project', 'se-plugin' ),
        'add_new_item'       => __( 'Add New Project', 'se-plugin' ),
        'edit_item'          => __( 'Edit Project', 'se-plugin' ),
        'all_items'          => __( 'All Projects', 'se-plugin' ),
        'not_found'          => __( 'No projects found.', 'se-plugin' ),
    ];

    register_post_type( 'project', [
        'labels'              => $labels,
        'public'              => true,
        'has_archive'         => true,
        'supports'            => [ 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields', 'revisions' ],
        'rewrite'             => [ 'slug' => 'projects', 'with_front' => false ],
        'show_in_rest'        => true,   // Required for Gutenberg
        'rest_base'           => 'projects',
        'menu_icon'           => 'dashicons-portfolio',
        'capability_type'     => 'post',
        'map_meta_cap'        => true,
    ] );
}

// =============================================================================
// 2. REGISTERING A CUSTOM TAXONOMY
// =============================================================================

add_action( 'init', 'se_register_project_category' );

function se_register_project_category(): void {
    register_taxonomy( 'project_category', 'project', [
        'label'        => __( 'Project Categories', 'se-plugin' ),
        'hierarchical' => true,
        'show_in_rest' => true,
        'rewrite'      => [ 'slug' => 'project-category' ],
    ] );
}

// =============================================================================
// 3. ADVANCED WP_QUERY WITH META AND TAX QUERY
// =============================================================================

function se_get_featured_projects( int $count = 6 ): array {
    $cache_key = 'se_featured_projects_' . $count;
    $projects  = wp_cache_get( $cache_key, 'se_plugin' );

    if ( false === $projects ) {
        $query = new WP_Query( [
            'post_type'      => 'project',
            'post_status'    => 'publish',
            'posts_per_page' => $count,
            'orderby'        => 'meta_value_num',
            'meta_key'       => '_se_project_order',
            'order'          => 'ASC',
            'meta_query'     => [
                'relation' => 'AND',
                [
                    'key'     => '_se_project_featured',
                    'value'   => '1',
                    'compare' => '=',
                ],
                [
                    'key'     => '_se_project_order',
                    'type'    => 'NUMERIC',
                    'compare' => 'EXISTS',
                ],
            ],
            'tax_query'      => [
                [
                    'taxonomy' => 'project_category',
                    'field'    => 'slug',
                    'terms'    => [ 'case-studies' ],
                    'operator' => 'NOT IN',
                ],
            ],
            'no_found_rows'  => true, // Skip COUNT(*) — no pagination needed
        ] );

        $projects = $query->posts;
        wp_cache_set( $cache_key, $projects, 'se_plugin', HOUR_IN_SECONDS );
    }

    return $projects;
}

// =============================================================================
// 4. PRE_GET_POSTS — MODIFY MAIN QUERY EFFICIENTLY
// =============================================================================

add_action( 'pre_get_posts', 'se_modify_project_archive' );

function se_modify_project_archive( WP_Query $query ): void {
    // Only affect the main front-end query for the project archive
    if ( ! is_admin() && $query->is_main_query() && $query->is_post_type_archive( 'project' ) ) {
        $query->set( 'posts_per_page', 12 );
        $query->set( 'orderby', 'title' );
        $query->set( 'order', 'ASC' );
    }
}

// =============================================================================
// 5. REGISTERING A CUSTOM REST API ENDPOINT (SECURED)
// =============================================================================

add_action( 'rest_api_init', 'se_register_api_routes' );

function se_register_api_routes(): void {
    register_rest_route( 'se/v1', '/projects/(?P<id>\d+)/stats', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'se_get_project_stats',
        'permission_callback' => function( WP_REST_Request $request ): bool {
            return current_user_can( 'read' );
        },
        'args'                => [
            'id' => [
                'validate_callback' => fn( $val ) => is_numeric( $val ) && $val > 0,
                'sanitize_callback' => 'absint',
                'required'          => true,
            ],
        ],
    ] );
}

function se_get_project_stats( WP_REST_Request $request ): WP_REST_Response|WP_Error {
    $post_id = $request->get_param( 'id' );
    $post    = get_post( $post_id );

    if ( ! $post || 'project' !== $post->post_type ) {
        return new WP_Error( 'not_found', __( 'Project not found.', 'se-plugin' ), [ 'status' => 404 ] );
    }

    $stats = [
        'views'      => (int) get_post_meta( $post_id, '_se_view_count', true ),
        'likes'      => (int) get_post_meta( $post_id, '_se_like_count', true ),
        'updated_at' => get_the_modified_date( 'c', $post_id ),
    ];

    $response = new WP_REST_Response( $stats );
    $response->header( 'Cache-Control', 'max-age=300, public' );

    return $response;
}

// =============================================================================
// 6. TRANSIENT CACHING PATTERN WITH CACHE INVALIDATION
// =============================================================================

/**
 * Retrieve the total project count, cached for 1 hour.
 */
function se_get_project_count( string $category_slug = '' ): int {
    $cache_key = 'se_project_count_' . md5( $category_slug );
    $count     = get_transient( $cache_key );

    if ( false === $count ) {
        $args = [
            'post_type'      => 'project',
            'post_status'    => 'publish',
            'posts_per_page' => 1,
            'fields'         => 'ids',
        ];

        if ( $category_slug ) {
            $args['tax_query'] = [ [
                'taxonomy' => 'project_category',
                'field'    => 'slug',
                'terms'    => $category_slug,
            ] ];
        }

        $query = new WP_Query( $args );
        $count = $query->found_posts;

        set_transient( $cache_key, $count, HOUR_IN_SECONDS );
    }

    return (int) $count;
}

// Invalidate count cache when a project is saved or deleted
add_action( 'save_post_project', 'se_invalidate_project_count_cache' );
add_action( 'delete_post',       'se_invalidate_project_count_cache' );

function se_invalidate_project_count_cache(): void {
    // A simple approach: delete a named transient; for groups use cache versioning
    delete_transient( 'se_project_count_' . md5( '' ) );
}

// =============================================================================
// 7. SECURITY — NONCE VERIFICATION AND SANITIZATION EXAMPLE
// =============================================================================

/**
 * Handle a front-end form submission securely.
 */
add_action( 'admin_post_se_submit_project_inquiry', 'se_handle_project_inquiry' );
add_action( 'admin_post_nopriv_se_submit_project_inquiry', 'se_handle_project_inquiry' );

function se_handle_project_inquiry(): void {
    // 1. Verify nonce
    if ( ! isset( $_POST['se_inquiry_nonce'] ) ||
         ! wp_verify_nonce( sanitize_key( $_POST['se_inquiry_nonce'] ), 'se_project_inquiry' ) ) {
        wp_die( esc_html__( 'Security check failed.', 'se-plugin' ), 403 );
    }

    // 2. Sanitize all inputs
    $name    = sanitize_text_field( $_POST['name'] ?? '' );
    $email   = sanitize_email( $_POST['email'] ?? '' );
    $message = wp_kses_post( $_POST['message'] ?? '' );

    // 3. Validate
    if ( ! $name || ! is_email( $email ) || ! $message ) {
        wp_safe_redirect( add_query_arg( 'inquiry', 'invalid', wp_get_referer() ) );
        exit;
    }

    // 4. Process (example: insert a CPT record)
    $post_id = wp_insert_post( [
        'post_type'   => 'project_inquiry',
        'post_status' => 'private',
        'post_title'  => sprintf( 'Inquiry from %s', $name ),
    ] );

    if ( ! is_wp_error( $post_id ) ) {
        update_post_meta( $post_id, '_se_inquiry_email',   $email );
        update_post_meta( $post_id, '_se_inquiry_message', $message );
    }

    wp_safe_redirect( add_query_arg( 'inquiry', 'success', wp_get_referer() ) );
    exit;
}

// =============================================================================
// 8. REGISTERING A DYNAMIC GUTENBERG BLOCK (PHP SIDE)
// =============================================================================

add_action( 'init', 'se_register_blocks' );

function se_register_blocks(): void {
    register_block_type( __DIR__ . '/blocks/project-list', [
        'render_callback' => 'se_render_project_list_block',
    ] );
}

/**
 * Server-side render callback for the Project List block.
 *
 * @param array  $attributes Block attributes from the editor.
 * @param string $content    Inner block content (unused for dynamic blocks).
 * @return string Rendered HTML.
 */
function se_render_project_list_block( array $attributes, string $content ): string {
    $count    = absint( $attributes['count'] ?? 3 );
    $projects = se_get_featured_projects( $count );

    if ( empty( $projects ) ) {
        return '<p class="se-no-projects">' . esc_html__( 'No projects found.', 'se-plugin' ) . '</p>';
    }

    $output = '<ul class="se-project-list">';

    foreach ( $projects as $project ) {
        $output .= sprintf(
            '<li class="se-project-item"><a href="%s">%s</a></li>',
            esc_url( get_permalink( $project ) ),
            esc_html( get_the_title( $project ) )
        );
    }

    $output .= '</ul>';

    return $output;
}

// =============================================================================
// 9. USING $wpdb SAFELY (PREPARED STATEMENTS)
// =============================================================================

/**
 * Fetch projects with a minimum view count using a direct DB query.
 * Uses prepare() to prevent SQL injection.
 *
 * @param int $min_views Minimum view count threshold.
 * @return array Array of stdClass rows.
 */
function se_get_popular_projects( int $min_views ): array {
    global $wpdb;

    $cache_key = 'se_popular_projects_' . $min_views;
    $results   = wp_cache_get( $cache_key, 'se_plugin' );

    if ( false === $results ) {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery
        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT p.ID, p.post_title, pm.meta_value AS view_count
                 FROM {$wpdb->posts} p
                 INNER JOIN {$wpdb->postmeta} pm
                     ON p.ID = pm.post_id AND pm.meta_key = %s
                 WHERE p.post_type   = %s
                   AND p.post_status = %s
                   AND CAST(pm.meta_value AS UNSIGNED) >= %d
                 ORDER BY CAST(pm.meta_value AS UNSIGNED) DESC
                 LIMIT 20",
                '_se_view_count',
                'project',
                'publish',
                $min_views
            )
        );

        wp_cache_set( $cache_key, $results, 'se_plugin', 15 * MINUTE_IN_SECONDS );
    }

    return $results ?: [];
}

// =============================================================================
// 10. PLUGIN ACTIVATION / DEACTIVATION HOOKS
// =============================================================================

register_activation_hook( __FILE__, 'se_plugin_activate' );

function se_plugin_activate(): void {
    // Register CPT so rewrite rules can be flushed correctly
    se_register_project_post_type();
    flush_rewrite_rules();

    // Create default options (non-autoloaded where possible)
    if ( ! get_option( 'se_plugin_version' ) ) {
        update_option( 'se_plugin_version', '1.0.0', false );
    }
}

register_deactivation_hook( __FILE__, 'se_plugin_deactivate' );

function se_plugin_deactivate(): void {
    flush_rewrite_rules();
    wp_clear_scheduled_hook( 'se_daily_cleanup' );
}
