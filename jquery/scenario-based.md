# jQuery — Scenario-Based Questions

> Real-world WordPress scenarios with complete jQuery solutions.

---

## Scenario 1: WordPress AJAX with Nonce Security

**The situation:** A WordPress theme needs a "Quick Save" feature that lets editors save post meta directly from the front-end without a page reload. The feature must be secure (nonce-verified), handle concurrent saves gracefully, and provide visual feedback. The save button should be disabled while a request is in flight to prevent duplicate submissions.

**Solution:**

```php
<?php
// functions.php — Register AJAX handlers and enqueue script

function theme_enqueue_quick_save() {
    wp_enqueue_script(
        'quick-save',
        get_theme_file_uri('js/quick-save.js'),
        ['jquery'],
        '1.0.0',
        true
    );

    wp_localize_script('quick-save', 'QuickSave', [
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('quick_save_meta'),
        'i18n'    => [
            'saving'  => __('Saving…',         'my-theme'),
            'saved'   => __('Saved!',           'my-theme'),
            'error'   => __('Save failed.',     'my-theme'),
            'save'    => __('Quick Save',       'my-theme'),
        ],
    ]);
}
add_action('wp_enqueue_scripts', 'theme_enqueue_quick_save');

// AJAX handler for logged-in users
add_action('wp_ajax_quick_save_meta', function () {
    check_ajax_referer('quick_save_meta', 'nonce');

    if (! current_user_can('edit_posts')) {
        wp_send_json_error(['message' => 'Insufficient permissions.'], 403);
    }

    $post_id = absint($_POST['post_id']);
    $meta_key = sanitize_key($_POST['meta_key']);
    $meta_val = sanitize_textarea_field($_POST['meta_value']);

    if (! $post_id || get_post($post_id) === null) {
        wp_send_json_error(['message' => 'Invalid post ID.'], 400);
    }

    update_post_meta($post_id, $meta_key, $meta_val);

    wp_send_json_success([
        'message' => 'Saved successfully.',
        'post_id' => $post_id,
        'key'     => $meta_key,
    ]);
});
?>
```

```javascript
// quick-save.js
(function ($) {
  'use strict';

  // Track in-flight requests per field to prevent race conditions
  const inflightRequests = new Map();

  function quickSave($btn) {
    const $form   = $btn.closest('[data-quick-save-form]');
    const postId  = $form.data('post-id');
    const metaKey = $form.data('meta-key');
    const $field  = $form.find('[name="meta_value"]');
    const value   = $field.val();

    // Abort previous request for this field if still in flight
    if (inflightRequests.has(metaKey)) {
      inflightRequests.get(metaKey).abort();
    }

    $btn.prop('disabled', true)
        .text(QuickSave.i18n.saving)
        .removeClass('btn--success btn--error');

    const jqXHR = $.ajax({
      url:      QuickSave.ajaxurl,
      type:     'POST',
      dataType: 'json',
      data: {
        action:     'quick_save_meta',
        nonce:      QuickSave.nonce,
        post_id:    postId,
        meta_key:   metaKey,
        meta_value: value,
      },
    });

    inflightRequests.set(metaKey, jqXHR);

    jqXHR
      .done(function (res) {
        if (res.success) {
          $btn.text(QuickSave.i18n.saved).addClass('btn--success');
          $form.trigger('quickSave:success', [res.data]);
        } else {
          $btn.text(res.data?.message || QuickSave.i18n.error).addClass('btn--error');
        }
      })
      .fail(function (xhr, status) {
        if (status === 'abort') return; // user triggered a newer save — ignore
        $btn.text(QuickSave.i18n.error).addClass('btn--error');
        console.error('[QuickSave] Request failed:', xhr.responseText);
      })
      .always(function () {
        inflightRequests.delete(metaKey);
        // Re-enable button after brief feedback delay
        setTimeout(function () {
          $btn.prop('disabled', false)
              .text(QuickSave.i18n.save)
              .removeClass('btn--success btn--error');
        }, 2000);
      });
  }

  // Delegation — works for modals and dynamically added forms
  $(document).on('click', '[data-quick-save-btn]', function (e) {
    e.preventDefault();
    quickSave($(this));
  });

  // Auto-save on field blur (with debounce)
  let blurTimer = null;
  $(document).on('blur', '[data-quick-save-form] textarea, [data-quick-save-form] input', function () {
    const $form = $(this).closest('[data-quick-save-form]');
    clearTimeout(blurTimer);
    blurTimer = setTimeout(function () {
      quickSave($form.find('[data-quick-save-btn]'));
    }, 500);
  });

}(jQuery));
```

**Key takeaways:**
- `wp_create_nonce()` + `check_ajax_referer()` prevent CSRF attacks
- Store the jqXHR reference to abort stale requests if the user triggers a second save
- Namespaced events (`.myPlugin`) allow clean teardown
- `wp_localize_script()` safely passes PHP data to JavaScript

---

## Scenario 2: Infinite Scroll for a Blog Feed

**The situation:** A WordPress blog's `/blog/` page currently uses numbered pagination. The client wants infinite scroll — as the user scrolls toward the bottom, the next page of posts should load automatically and be appended. It must degrade gracefully (numbered pagination shown without JS), handle the "no more posts" state, and not double-load on fast scrolling.

**Solution:**

```javascript
// infinite-scroll.js
(function ($) {
  'use strict';

  if (!window.InfiniteScrollData) return; // bail if not a blog page

  const CONFIG = {
    container:   '#posts-grid',
    sentinel:    '#scroll-sentinel',
    nextPageUrl: window.InfiniteScrollData.nextPageUrl,
    totalPages:  window.InfiniteScrollData.totalPages,
  };

  let currentPage = 1;
  let isLoading   = false;
  let allLoaded   = currentPage >= CONFIG.totalPages;

  // Hide native pagination immediately
  $('.pagination').attr('aria-hidden', 'true').hide();

  // Ensure sentinel element exists
  if (!$(CONFIG.sentinel).length) {
    $(CONFIG.container).after('<div id="scroll-sentinel"></div>');
  }

  // Build next page URL from the template
  function getPageUrl(page) {
    // Handles both pretty permalinks (/blog/page/2/) and query strings (?paged=2)
    if (CONFIG.nextPageUrl.includes('?')) {
      return CONFIG.nextPageUrl.replace(/paged=\d+/, `paged=${page}`);
    }
    return CONFIG.nextPageUrl.replace(/\/page\/\d+\//, `/page/${page}/`);
  }

  function appendPosts(html) {
    const $posts = $(html).find('[data-post-id]');
    if (!$posts.length) { allLoaded = true; return; }

    $posts
      .css({ opacity: 0, transform: 'translateY(20px)' })
      .appendTo(CONFIG.container);

    // Staggered fade-in for each post card
    $posts.each(function (i) {
      const $post = $(this);
      setTimeout(function () {
        $post.animate({ opacity: 1 }, 300).css('transform', 'translateY(0)');
      }, i * 60);
    });

    // Update browser history to reflect current page for back-button support
    if (history.replaceState) {
      history.replaceState(null, '', getPageUrl(currentPage));
    }
  }

  function loadNextPage() {
    if (isLoading || allLoaded) return;
    isLoading = true;
    currentPage++;

    const $indicator = $('<div class="loading-indicator" aria-label="Loading posts…">')
      .appendTo('body')
      .fadeIn(200);

    $.get(getPageUrl(currentPage))
      .done(function (html) {
        appendPosts(html);
        if (currentPage >= CONFIG.totalPages) {
          allLoaded = true;
          $(CONFIG.sentinel).after('<p class="all-loaded">You\'ve reached the end!</p>');
        }
      })
      .fail(function () {
        currentPage--; // allow retry
        console.error('[InfiniteScroll] Failed to load page', currentPage + 1);
      })
      .always(function () {
        isLoading = false;
        $indicator.fadeOut(200, function () { $(this).remove(); });
      });
  }

  // IntersectionObserver for modern browsers
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !isLoading && !allLoaded) {
        loadNextPage();
      }
    }, { rootMargin: '300px' }); // pre-fetch when 300px above sentinel

    observer.observe(document.querySelector(CONFIG.sentinel));
  } else {
    // Fallback: scroll listener with throttle for older browsers
    $(window).on('scroll.infiniteScroll', function () {
      const scrollBottom = $(window).scrollTop() + $(window).height();
      const pageBottom   = $(document).height() - 200;
      if (scrollBottom >= pageBottom) loadNextPage();
    });
  }

}(jQuery));
```

```php
<?php
// functions.php — Localize the data for infinite scroll
add_action('wp_enqueue_scripts', function () {
    if (! is_home() && ! is_archive()) return;

    wp_enqueue_script('infinite-scroll', get_theme_file_uri('js/infinite-scroll.js'), ['jquery'], '1.0.0', true);

    global $wp_query;
    $next_page = get_next_posts_page_link(get_query_var('paged', 1) + 1);

    wp_localize_script('infinite-scroll', 'InfiniteScrollData', [
        'nextPageUrl' => $next_page ?: '',
        'totalPages'  => (int) $wp_query->max_num_pages,
    ]);
});
?>
```

**Key takeaways:**
- Graceful degradation: native pagination visible without JS, hidden by JS when active
- `isLoading` flag prevents concurrent requests; `allLoaded` flag prevents useless requests
- `history.replaceState` keeps the URL in sync for shareable links and back-button navigation
- IntersectionObserver with `rootMargin: '300px'` pre-fetches before the user hits the bottom

---

## Scenario 3: Front-End Form Validation with jQuery

**The situation:** A WordPress plugin provides a multi-step registration form. Step 1 collects name/email/password; Step 2 collects company details. The form submits to a custom REST endpoint. Requirements: validate on blur and on submit, show inline error messages, prevent navigation to Step 2 unless Step 1 is valid, show a progress indicator, and provide accessible error feedback.

**Solution:**

```javascript
// multi-step-form.js
(function ($) {
  'use strict';

  const STEPS       = ['step-1', 'step-2'];
  let   currentStep = 0;

  // Validation rules — each returns true (pass) or an error string
  const RULES = {
    first_name:   [requiredRule, minLenRule(2)],
    last_name:    [requiredRule, minLenRule(2)],
    email:        [requiredRule, emailRule],
    password:     [requiredRule, minLenRule(8), passwordStrengthRule],
    company_name: [requiredRule, minLenRule(2)],
    website:      [optionalUrlRule],
  };

  function requiredRule(val) {
    return val.trim() !== '' || 'This field is required.';
  }
  function minLenRule(n) {
    return (val) => val.trim().length >= n || `Minimum ${n} characters.`;
  }
  function emailRule(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) || 'Enter a valid email address.';
  }
  function passwordStrengthRule(val) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(val)
      || 'Must contain uppercase, lowercase, and a number.';
  }
  function optionalUrlRule(val) {
    if (!val.trim()) return true; // optional
    try { new URL(val.trim()); return true; } catch { return 'Enter a valid URL.'; }
  }

  function validateField($field) {
    const name  = $field.attr('name');
    const value = $field.val();
    const $err  = $field.siblings('.field-error');

    for (const rule of (RULES[name] || [])) {
      const msg = rule(value);
      if (msg !== true) {
        $field
          .addClass('is-invalid')
          .attr('aria-invalid', 'true')
          .attr('aria-describedby', $err.attr('id'));
        $err.text(msg).attr('role', 'alert').show();
        return false;
      }
    }
    $field.removeClass('is-invalid').attr('aria-invalid', 'false');
    $err.text('').hide();
    return true;
  }

  function validateStep(stepIndex) {
    const $step  = $(`#${STEPS[stepIndex]}`);
    const fields = $step.find('input, select, textarea').toArray();
    return fields.map(el => validateField($(el))).every(Boolean);
  }

  function goToStep(index) {
    $(`#${STEPS[currentStep]}`).attr('aria-hidden', 'true').hide();
    currentStep = index;
    $(`#${STEPS[currentStep]}`).attr('aria-hidden', 'false').fadeIn(250);

    // Update progress bar
    const progress = ((currentStep + 1) / STEPS.length) * 100;
    $('#form-progress').css('width', `${progress}%`).attr('aria-valuenow', progress);
    $('[data-step-label]').text(`Step ${currentStep + 1} of ${STEPS.length}`);

    // Focus management for accessibility
    $(`#${STEPS[currentStep]}`).find('input:first').trigger('focus');
  }

  // Validate on blur
  $('#registration-form').on('blur', 'input, select, textarea', function () {
    validateField($(this));
  });

  // Next button
  $('#btn-next').on('click', function (e) {
    e.preventDefault();
    if (validateStep(currentStep)) goToStep(currentStep + 1);
  });

  // Back button
  $('#btn-back').on('click', function (e) {
    e.preventDefault();
    if (currentStep > 0) goToStep(currentStep - 1);
  });

  // Final submit
  $('#registration-form').on('submit', async function (e) {
    e.preventDefault();
    if (!validateStep(STEPS.length - 1)) return;

    const $btn = $('#btn-submit').prop('disabled', true).text('Creating account…');
    const data = {};
    $(this).serializeArray().forEach(({ name, value }) => { data[name] = value; });

    try {
      const res = await fetch('/wp-json/my-plugin/v1/register', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce':   MyPlugin.nonce,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);

      // Success
      $('#registration-form').fadeOut(300, function () {
        $(this).replaceWith(
          `<div role="status" class="success-msg">
            <h2>Account created!</h2>
            <p>Check your email at <strong>${data.email}</strong> to confirm your account.</p>
          </div>`
        );
      });
    } catch (err) {
      $('#form-global-error')
        .text(err.message)
        .attr('role', 'alert')
        .show();
      $btn.prop('disabled', false).text('Create Account');
    }
  });

  // Initialise — show only first step
  goToStep(0);

}(jQuery));
```

**Key takeaways:**
- Rule arrays make it trivial to add/remove validation constraints per field
- ARIA attributes (`aria-invalid`, `aria-describedby`, `role="alert"`) ensure screen-reader accessibility
- Focus management on step transitions is required for keyboard-only users
- Final `fetch()` call to the REST API replaces the traditional `$.ajax` for cleaner async/await code
- Server-side validation in the PHP REST callback is still required — client-side is UX only

---

## Scenario 4: Fixing jQuery Conflicts from Multiple Plugin Versions

**Scenario:**
A WordPress site has three plugins each bundling their own copy of jQuery (1.12, 2.x, and 3.x). The plugins deregister core jQuery and enqueue their own, causing `$ is not a function` errors and broken UI across the admin and front-end.

**Challenge:**
Force all plugins to share WordPress's bundled jQuery without editing plugin source files, and ensure the `$` alias works safely in all custom code.

**Solution:**

1. Identify which plugins are hijacking jQuery using Query Monitor or the browser console.

```bash
# In browser console — check which jQuery version is active and whether multiple copies loaded
jQuery.fn.jquery          // active version
window.jQuery === window.$  // true if aliases match
```

2. Deregister each offending plugin's jQuery and substitute WordPress core's version via a mu-plugin (this runs before regular plugins).

```php
<?php
// wp-content/mu-plugins/normalize-jquery.php

/**
 * Force all plugins to use WordPress's bundled jQuery.
 * Runs at priority 1 so it fires before most plugin enqueue callbacks.
 */
add_action( 'wp_enqueue_scripts', 'normalize_jquery', 1 );
add_action( 'admin_enqueue_scripts', 'normalize_jquery', 1 );

function normalize_jquery() {
    // Slugs known to ship their own jQuery
    $offending_handles = [
        'plugin-a-jquery',
        'plugin-b-jquery',
        'slider-lib-jquery',
    ];

    foreach ( $offending_handles as $handle ) {
        wp_deregister_script( $handle );
        // Re-register under the same handle, pointing to WP core's jQuery
        wp_register_script( $handle, false, [ 'jquery' ], null, false );
    }
}
```

3. Wrap all custom JavaScript in the no-conflict wrapper so `$` is always safe regardless of load order.

```javascript
// my-theme.js — always use this pattern in WordPress
(function ($) {
    'use strict';

    // $ is guaranteed to be jQuery here, regardless of other libraries
    $(document).ready(function () {
        $('.my-component').on('click', function () {
            $(this).toggleClass('is-active');
        });
    });

}(jQuery));
```

4. If a plugin uses `$` in inline scripts outside any wrapper, patch it with `wp_add_inline_script`.

```php
<?php
// Prepend a noConflict reset before the offending plugin's inline code
add_action( 'wp_enqueue_scripts', function () {
    wp_add_inline_script( 'plugin-a-scripts', 'var $ = jQuery;', 'before' );
}, 20 );
```

5. Verify the fix: open browser devtools Network tab, filter by `jquery`, and confirm only one jQuery file loads.

```javascript
// Console verification
console.log('jQuery version:', jQuery.fn.jquery);
console.log('Single instance:', jQuery === window.jQuery); // must be true
```

---

## Scenario 5: Migrating WordPress AJAX Calls to the REST API with fetch()

**Scenario:**
A WordPress theme has dozens of `$.ajax({ url: ajaxurl, action: '...' })` calls hitting `admin-ajax.php`. Every request goes through the full WordPress admin bootstrap (~180 ms overhead), and the code is difficult to test. The team wants to migrate to the WP REST API using the native `fetch()` API.

**Challenge:**
Replace `admin-ajax.php` handlers with properly registered REST endpoints, update all JavaScript callers, and handle authentication/nonce differences between the two approaches.

**Solution:**

1. Register a namespaced REST route to replace the old AJAX action.

```php
<?php
// Before: admin-ajax.php handler
add_action( 'wp_ajax_get_related_posts', 'ajax_get_related_posts' );
function ajax_get_related_posts() {
    check_ajax_referer( 'related_posts', 'nonce' );
    $posts = get_related_posts( absint( $_POST['post_id'] ) );
    wp_send_json_success( $posts );
}

// After: REST endpoint (register in your plugin bootstrap)
add_action( 'rest_api_init', function () {
    register_rest_route( 'my-theme/v1', '/related-posts/(?P<id>\d+)', [
        'methods'             => 'GET',
        'callback'            => 'rest_get_related_posts',
        'permission_callback' => '__return_true', // public; add auth check if needed
        'args'                => [
            'id' => [
                'validate_callback' => fn( $v ) => is_numeric( $v ),
                'sanitize_callback' => 'absint',
            ],
        ],
    ] );
} );

function rest_get_related_posts( WP_REST_Request $request ) {
    $posts = get_related_posts( $request->get_param( 'id' ) );
    if ( empty( $posts ) ) {
        return new WP_Error( 'no_posts', 'No related posts found.', [ 'status' => 404 ] );
    }
    return rest_ensure_response( $posts );
}
```

2. Pass the REST nonce (not the AJAX nonce) to JavaScript via `wp_localize_script`.

```php
<?php
wp_localize_script( 'my-theme', 'ThemeAPI', [
    'root'  => esc_url_raw( rest_url() ),       // e.g. https://example.com/wp-json/
    'nonce' => wp_create_nonce( 'wp_rest' ),    // WP REST nonce — different from AJAX nonces
] );
```

3. Replace every `$.ajax` call with `fetch()` using a shared helper to keep callers clean.

```javascript
// api.js — centralised REST client
const API = {
    /**
     * @param {string} path    e.g. 'my-theme/v1/related-posts/42'
     * @param {object} options fetch init overrides
     */
    async get(path, options = {}) {
        const res = await fetch(`${ThemeAPI.root}${path}`, {
            method: 'GET',
            headers: {
                'X-WP-Nonce': ThemeAPI.nonce,
                'Content-Type': 'application/json',
            },
            ...options,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
            throw new Error(err.message || `Request failed: ${res.status}`);
        }

        return res.json();
    },

    async post(path, body, options = {}) {
        return this.get(path, {
            method: 'POST',
            body: JSON.stringify(body),
            ...options,
        });
    },
};

// Before (jQuery AJAX):
// $.ajax({ url: ajaxurl, type: 'POST', data: { action: 'get_related_posts', post_id: 42 } })

// After (fetch via helper):
(async function () {
    try {
        const posts = await API.get('my-theme/v1/related-posts/42');
        renderRelatedPosts(posts);
    } catch (err) {
        console.error('[RelatedPosts]', err.message);
    }
}());
```

4. For any REST route that needs authentication (logged-in users only), use `wp_get_current_user()` inside the permission callback rather than the old `is_user_logged_in()` AJAX check.

```php
<?php
'permission_callback' => function () {
    return current_user_can( 'edit_posts' );
},
```

5. Verify the migration with browser devtools: REST responses arrive at `/wp-json/…` with proper HTTP status codes, rather than always returning `200` from `admin-ajax.php`.

---

## Scenario 6: Debugging Event Delegation Issues in Dynamic Admin Content

**Scenario:**
A WordPress plugin adds a custom meta box. JavaScript inside the meta box uses direct event binding (`$('.my-btn').on('click', ...)`). After the admin loads additional meta boxes via Gutenberg's SlotFill or a custom AJAX tab loader, the buttons in newly injected content are completely unresponsive.

**Challenge:**
Identify why the handlers are not firing on dynamically added elements and refactor the event binding to work reliably with any content injected at any time.

**Solution:**

1. Understand the root cause: direct binding attaches the listener only to elements that exist in the DOM at bind time. Elements added later never get the handler.

```javascript
// BROKEN — only binds to .my-btn elements present at DOMContentLoaded
$('.my-btn').on('click', function () {
    handleClick($(this));
});

// Also broken when called after an AJAX load but before the new HTML is in the DOM
$(document).ready(function () {
    $.ajax({ url: ajaxurl, ... }).done(function (html) {
        $('#meta-container').html(html);
        // At this point the new .my-btn elements exist, but if this pattern
        // is called elsewhere without re-binding, they won't respond.
    });
});
```

2. Switch to delegated binding: attach the listener to a stable ancestor and pass the selector as the second argument.

```javascript
// FIXED — delegate from a stable ancestor
// '#postbox-container' is always in the DOM; '.my-btn' can be anywhere inside it
$('#postbox-container').on('click', '.my-btn', function (e) {
    e.preventDefault();
    handleClick($(this));
});

// For front-end or unknown ancestors, delegate from document as a last resort
$(document).on('click', '.my-btn', function (e) {
    e.preventDefault();
    handleClick($(this));
});
```

3. Choose the narrowest stable ancestor to avoid event bubbling through the entire document tree — this matters for performance in complex admin screens.

```javascript
(function ($) {
    'use strict';

    // Stable wrapper provided by our meta box — always present after page load
    const $root = $('#my-plugin-meta-box');

    // Delegate all interactions from a single attach point
    $root
        .on('click',  '.js-save-row',   onSaveRow)
        .on('click',  '.js-delete-row', onDeleteRow)
        .on('change', '.js-toggle',     onToggle);

    function onSaveRow(e) {
        e.preventDefault();
        const $row = $(this).closest('.data-row');
        // $(this) correctly refers to the clicked element, even if injected after init
        saveRow($row.data('id'), $row.find('.js-value').val());
    }

    function onDeleteRow(e) {
        e.preventDefault();
        const $row = $(this).closest('.data-row');
        $row.fadeOut(200, function () { $(this).remove(); });
    }

    function onToggle() {
        const $row = $(this).closest('.data-row');
        $row.toggleClass('is-enabled', $(this).is(':checked'));
    }

    // When AJAX injects new rows, no re-binding needed — delegation handles it
    function loadRows() {
        $.get(ajaxurl, { action: 'my_plugin_get_rows' }).done(function (html) {
            $root.find('.rows-container').html(html);
            // Events just work — nothing to wire up
        });
    }

    loadRows();

}(jQuery));
```

4. Debug delegation issues using the browser console to verify event bubbling and confirm the selector matches.

```javascript
// Temporarily log every click bubbling through the stable ancestor
$('#my-plugin-meta-box').on('click', function (e) {
    console.log('clicked element:', e.target, 'matches .js-save-row:', $(e.target).is('.js-save-row'));
});

// jQuery's internal event data — useful to confirm handlers are registered
$._data($('#my-plugin-meta-box')[0], 'events');
```

---

## Scenario 7: Optimizing a jQuery-Heavy Theme for Performance

**Scenario:**
A WordPress theme scores 42/100 on PageSpeed Insights for mobile. The audit flags render-blocking jQuery, a 38 KB custom script file executing on every page, and a scroll handler firing hundreds of times per second. The site uses jQuery for a sticky header, a counter animation, lazy-load images, and a tab component.

**Challenge:**
Reduce JavaScript execution time, eliminate render-blocking scripts, and smooth out scroll and resize handlers without a full framework rewrite.

**Solution:**

1. Move jQuery and all dependent scripts to the footer and add `defer` where applicable.

```php
<?php
// functions.php
add_action( 'wp_enqueue_scripts', function () {
    // Re-register jQuery to load in the footer
    wp_deregister_script( 'jquery' );
    wp_register_script(
        'jquery',
        includes_url( '/js/jquery/jquery.min.js' ),
        [],
        '3.7.1',
        [ 'strategy' => 'defer', 'in_footer' => true ]   // WP 6.3+ loading strategy
    );
    wp_enqueue_script( 'jquery' );

    wp_enqueue_script(
        'my-theme',
        get_theme_file_uri( 'js/theme.min.js' ),
        [ 'jquery' ],
        THEME_VERSION,
        [ 'strategy' => 'defer', 'in_footer' => true ]
    );
}, 20 );
```

2. Split the monolithic script into page-specific modules and conditionally load them.

```php
<?php
add_action( 'wp_enqueue_scripts', function () {
    // Core script always loaded
    wp_enqueue_script( 'theme-core', get_theme_file_uri( 'js/core.min.js' ), ['jquery'], THEME_VERSION, true );

    // Only load the counter animation on pages that have the counter block
    if ( has_block( 'my-theme/counter' ) || is_page_template( 'about.php' ) ) {
        wp_enqueue_script( 'theme-counter', get_theme_file_uri( 'js/counter.min.js' ), ['jquery'], THEME_VERSION, true );
    }

    // Tabs only on pages that need them
    if ( is_singular() && has_shortcode( get_post()->post_content, 'tabs' ) ) {
        wp_enqueue_script( 'theme-tabs', get_theme_file_uri( 'js/tabs.min.js' ), ['jquery'], THEME_VERSION, true );
    }
} );
```

3. Throttle the scroll handler with `requestAnimationFrame` instead of a naive jQuery `.on('scroll')` call.

```javascript
// BEFORE — fires every scroll event (~hundreds/sec)
$(window).on('scroll', function () {
    if ($(window).scrollTop() > 80) {
        $('header').addClass('is-sticky');
    } else {
        $('header').removeClass('is-sticky');
    }
});

// AFTER — throttled via rAF (fires at most once per animation frame, ~60/sec)
(function ($) {
    'use strict';

    let rafPending  = false;
    let lastScrollY = 0;
    const $header   = $('header');
    const THRESHOLD = 80;

    function updateHeader() {
        $header.toggleClass('is-sticky', lastScrollY > THRESHOLD);
        rafPending = false;
    }

    $(window).on('scroll.stickyHeader', function () {
        lastScrollY = window.scrollY;
        if (!rafPending) {
            rafPending = true;
            window.requestAnimationFrame(updateHeader);
        }
    });

}(jQuery));
```

4. Debounce the resize handler to avoid layout thrashing on window resize.

```javascript
(function ($) {
    'use strict';

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    const onResize = debounce(function () {
        // Expensive layout recalculation — runs only 150 ms after resizing stops
        recalculateMasonryLayout();
    }, 150);

    $(window).on('resize.masonry', onResize);

}(jQuery));
```

5. Use `IntersectionObserver` (not a scroll listener) to trigger counter animations and lazy loading.

```javascript
(function ($) {
    'use strict';

    if (!('IntersectionObserver' in window)) return; // bail for very old browsers

    const counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;

            const $el    = $(entry.target);
            const target = parseInt($el.data('count-to'), 10);

            $({ count: 0 }).animate({ count: target }, {
                duration: 1500,
                easing:   'swing',
                step:     function () { $el.text(Math.floor(this.count).toLocaleString()); },
                complete: function () { $el.text(target.toLocaleString()); },
            });

            counterObserver.unobserve(entry.target); // animate once only
        });
    }, { threshold: 0.3 });

    $('[data-count-to]').each(function () {
        counterObserver.observe(this);
    });

}(jQuery));
```

6. Measure the improvement with Chrome DevTools Performance tab before and after: target < 50 ms Total Blocking Time and no long tasks from scroll handlers.

---
