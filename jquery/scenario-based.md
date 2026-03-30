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
