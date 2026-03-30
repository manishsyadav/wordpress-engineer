# jQuery — Interview Questions

> Basic and Mid-Level Q&A with inline code examples relevant to WordPress development.

---

## Basic Questions

**Q1: Why does WordPress use `jQuery.noConflict()` and how do you write jQuery safely in a WordPress context?**

**A:** WordPress loads `jQuery.noConflict()` during bootstrapping so that `$` can remain available to other libraries (Prototype, MooTools) that use it. This means `$` is `undefined` in the global scope for your code. The safe patterns are: wrapping your code in an IIFE that receives `jQuery` as `$`, or passing a function to `jQuery()` directly. Both ensure `$` works without conflicting with other scripts on the page.

```javascript
// Recommended IIFE pattern for themes and plugins
(function ($) {
  'use strict';

  $(function () {
    // DOM ready — $ is safely aliased to jQuery
    $('.wp-block-button__link').on('click', function (e) {
      console.log('Button clicked:', $(this).text());
    });
  });

}(jQuery));

// Alternative: pass a function to jQuery()
jQuery(function ($) {
  $('body').addClass('js-loaded');
});
```

---

**Q2: What is the difference between `.on()`, `.bind()`, `.live()`, and `.delegate()`?**

**A:** `.bind()` and `.live()` are deprecated since jQuery 1.7 and removed in 3.0. `.delegate()` was the precursor to `.on()` with delegation. Today, `.on()` is the single unified event API — it handles both direct binding and event delegation depending on whether a selector argument is provided. Always use `.on()` and `.off()` in modern WordPress development.

```javascript
// Direct binding — only works on elements that exist NOW
$('#save-post').on('click', handleSave);

// Delegated binding — works for elements added later (AJAX content, Gutenberg previews)
$('#posts-container').on('click', '.edit-link', function (e) {
  e.preventDefault();
  openEditor($(this).data('post-id'));
});

// Removing a listener (must match selector and handler reference)
$('#posts-container').off('click', '.edit-link', handleEditClick);

// Namespace your events to easily remove all plugin listeners
$('body')
  .on('click.myPlugin mouseover.myPlugin', '.hotspot', showTooltip);

// Remove all .myPlugin listeners without affecting others
$('body').off('.myPlugin');
```

---

**Q3: What does `$(document).ready()` do and how does it differ from `window.onload`?**

**A:** `$(document).ready()` fires as soon as the HTML is fully parsed (DOM tree built), but before images, stylesheets, and iframes have finished loading. `window.onload` fires after **everything** on the page has loaded, which can be several seconds later on image-heavy pages. For most DOM manipulation, `$(document).ready()` is preferred because it makes the page interactive sooner. Only use `window.onload` (or the `load` event) when you genuinely need image dimensions or other external resource data.

```javascript
// $(document).ready() — fires when DOM is parsed
$(function () {
  // Good: init navigation, bind events, hide elements, set up tooltips
  initNavigation();
  bindFormHandlers();
});

// window.onload equivalent in jQuery — fires after all resources load
$(window).on('load', function () {
  // Required: calculating image dimensions, initialising lightboxes
  // that depend on natural image sizes
  initMasonryLayout();
  const imgHeight = $('img.hero').height(); // accurate now
});

// Practical timing difference test
$(function ()         { console.log('DOM ready');       }); // fires first
$(window).on('load',  function () { console.log('Page fully loaded'); }); // fires last
```

---

**Q4: How does jQuery's AJAX `.done()`, `.fail()`, `.always()` work, and how does it relate to native Promises?**

**A:** jQuery's `$.ajax()` returns a **jqXHR** object that implements the Deferred interface. `.done()` runs on success, `.fail()` on failure, `.always()` on both. These are jQuery's version of `.then()`, `.catch()`, `.finally()`. In jQuery 3+, jqXHR also implements the native Promises/A+ interface, so you can use `.then()` or wrap it in `Promise.resolve()` to use `async/await`.

```javascript
// Traditional jQuery Deferred style
$.ajax({
  url:    ajaxurl,
  method: 'POST',
  data:   { action: 'get_featured_posts', nonce: MyTheme.nonce },
})
  .done(function (response) {
    if (response.success) renderPosts(response.data);
  })
  .fail(function (jqXHR, textStatus) {
    console.error('Request failed:', textStatus, jqXHR.responseText);
  })
  .always(function () {
    $('#spinner').fadeOut();
  });

// Modern: wrap jqXHR in native Promise for async/await
async function fetchPosts() {
  try {
    const data = await Promise.resolve(
      $.ajax({ url: ajaxurl, method: 'POST', data: { action: 'get_posts', nonce: MyTheme.nonce } })
    );
    return data;
  } catch (jqXHR) {
    throw new Error(`${jqXHR.status}: ${jqXHR.responseText}`);
  }
}
```

---

**Q5: What is jQuery method chaining and what does `.end()` do?**

**A:** Every jQuery method that traverses or filters the collection returns a new jQuery object but preserves the previous one on an internal stack. Chaining calls on the returned object keeps operations compact and readable. `.end()` pops the stack, reverting to the previous matched set. This lets you branch to different subsets of elements within a single chain without re-querying the DOM.

```javascript
// Without chaining — multiple DOM queries
const $form = $('#contact-form');
$form.find('input').addClass('validated');
$form.find('.error').remove();
$form.submit();

// With chaining and .end() — single DOM query for #contact-form
$('#contact-form')
  .find('input')
    .removeClass('error')
    .addClass('validated')
  .end()                          // back to #contact-form
  .find('.error-message')
    .slideUp(200)
  .end()                          // back to #contact-form
  .addClass('form-submitted')
  .submit();
```

---

## Mid-Level Questions

**Q6: How do you perform WordPress AJAX requests with jQuery, including nonce verification?**

**A:** WordPress AJAX runs through `admin-ajax.php`. You must pass an `action` (matches `wp_ajax_{action}` or `wp_ajax_nopriv_{action}` hooks) and a nonce created with `wp_create_nonce()`. Use `wp_localize_script()` to safely pass the nonce and `ajaxurl` to your JavaScript. On the PHP side, call `check_ajax_referer()` before processing the request.

```javascript
// PHP side (functions.php or plugin file):
// wp_localize_script('my-script', 'MyAjax', [
//   'url'   => admin_url('admin-ajax.php'),
//   'nonce' => wp_create_nonce('my_ajax_nonce'),
// ]);

// JS side:
(function ($) {
  function saveUserPreference(key, value) {
    return $.ajax({
      url:      MyAjax.url,
      type:     'POST',
      dataType: 'json',
      data: {
        action: 'save_user_preference',  // matches wp_ajax_save_user_preference
        nonce:  MyAjax.nonce,
        key,
        value,
      },
    });
  }

  $('#theme-toggle').on('change', function () {
    const isDark = $(this).is(':checked');
    saveUserPreference('color_scheme', isDark ? 'dark' : 'light')
      .done(res => {
        if (!res.success) alert('Could not save preference: ' + res.data);
      });
  });
}(jQuery));

// PHP handler:
// add_action('wp_ajax_save_user_preference', function() {
//   check_ajax_referer('my_ajax_nonce', 'nonce');
//   $key   = sanitize_key($_POST['key']);
//   $value = sanitize_text_field($_POST['value']);
//   update_user_meta(get_current_user_id(), $key, $value);
//   wp_send_json_success();
// });
```

---

**Q7: How do you implement infinite scroll in WordPress using jQuery?**

**A:** Infinite scroll intercepts the "load more" trigger (a button click or scroll sentinel), fires an AJAX request to `admin-ajax.php` with the next page number, and appends the returned HTML to the existing container. Track whether all posts have been loaded to prevent extra requests. A debounce or IntersectionObserver prevents firing multiple requests during fast scrolling.

```javascript
(function ($) {
  let page      = 2;
  let loading   = false;
  let exhausted = false;

  function loadMorePosts() {
    if (loading || exhausted) return;
    loading = true;
    $('#load-more-btn').text('Loading…').prop('disabled', true);

    $.post(MyTheme.ajaxurl, {
      action:    'load_more_posts',
      nonce:     MyTheme.nonce,
      page,
      category:  MyTheme.currentCategory,
    })
      .done(function (res) {
        if (!res.success || !res.data.html) {
          exhausted = true;
          $('#load-more-btn').text('No more posts').prop('disabled', true);
          return;
        }
        const $newPosts = $(res.data.html);
        $('#posts-grid').append($newPosts);
        $newPosts.hide().fadeIn(400); // subtle appearance animation
        page++;
        if (res.data.is_last_page) {
          exhausted = true;
          $('#load-more-btn').hide();
        }
      })
      .fail(function () {
        alert('Failed to load posts. Please try again.');
      })
      .always(function () {
        loading = false;
        $('#load-more-btn').text('Load More').prop('disabled', false);
      });
  }

  $('#load-more-btn').on('click', loadMorePosts);

  // Optional: auto-trigger when sentinel enters viewport
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMorePosts();
    });
    observer.observe(document.getElementById('scroll-sentinel'));
  }
}(jQuery));
```

---

**Q8: How do you handle jQuery form validation before submitting to the WP REST API?**

**A:** Use `.on('submit')` to intercept the form, `.serialize()` or manual collection to gather data, validate each field, display error messages, and only fire the AJAX/REST request when all fields pass. Provide visual feedback for each field state (error/success) and re-enable the submit button after the request completes.

```javascript
(function ($) {
  const validators = {
    required: val => val.trim() !== '' || 'This field is required',
    email:    val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Please enter a valid email',
    minLen:   (n) => (val) => val.trim().length >= n || `Minimum ${n} characters`,
  };

  const rules = {
    name:    [validators.required, validators.minLen(2)],
    email:   [validators.required, validators.email],
    message: [validators.required, validators.minLen(10)],
  };

  function validateField($field) {
    const name  = $field.attr('name');
    const value = $field.val();
    for (const rule of (rules[name] || [])) {
      const result = rule(value);
      if (result !== true) {
        $field.addClass('is-invalid').next('.field-error').text(result).show();
        return false;
      }
    }
    $field.removeClass('is-invalid').next('.field-error').hide();
    return true;
  }

  $('#contact-form')
    .on('blur', 'input, textarea', function () { validateField($(this)); })
    .on('submit', function (e) {
      e.preventDefault();
      const $form   = $(this);
      const isValid = $form.find('input, textarea').toArray()
        .map(el => validateField($(el)))
        .every(Boolean);

      if (!isValid) return;

      const $btn = $form.find('[type="submit"]').prop('disabled', true).text('Sending…');

      $.ajax({
        url:         '/wp-json/contact/v1/submit',
        method:      'POST',
        contentType: 'application/json',
        headers:     { 'X-WP-Nonce': MyTheme.nonce },
        data:        JSON.stringify({
          name:    $form.find('[name="name"]').val().trim(),
          email:   $form.find('[name="email"]').val().trim(),
          message: $form.find('[name="message"]').val().trim(),
        }),
      })
        .done(() => $form.replaceWith('<p class="success">Message sent!</p>'))
        .fail(xhr  => $form.prepend(`<p class="form-error">${xhr.responseJSON?.message ?? 'Submission failed.'}</p>`))
        .always(() => $btn.prop('disabled', false).text('Send Message'));
    });
}(jQuery));
```

---

**Q9: What is the difference between `.prop()`, `.attr()`, and `.data()` in jQuery?**

**A:** `.attr()` reads/writes HTML attributes (the static value in the markup). `.prop()` reads/writes DOM properties (the live runtime value). For `checked`, `disabled`, and `selected`, always use `.prop()` — `.attr()` returns the initial HTML attribute, not the current state. `.data()` reads `data-*` attributes on first access and then uses jQuery's internal cache, meaning changes via `.data()` do not update the DOM attribute.

```javascript
// attr vs prop for checkbox state
const $checkbox = $('#subscribe');

$checkbox.attr('checked');   // "checked" if initially checked, undefined otherwise — static
$checkbox.prop('checked');   // true or false — reflects current user interaction ✓

// Setting disabled state
$('input').prop('disabled', true);  // correct — sets the DOM property
$('input').attr('disabled', 'disabled'); // also works but less idiomatic

// data-* — jQuery caches after first read
const $post = $('[data-post-id="42"]');
$post.data('postId');                      // reads data-post-id, converts to camelCase, caches
$post.data('meta', { views: 100 });        // stored in jQuery cache only — NOT written to DOM
$post.attr('data-post-id');                // still reads from DOM attribute

// To update the DOM attribute too, use .attr()
$post.attr('data-status', 'published');    // reflected in HTML; queryable via CSS [data-status]
```

---

**Q10: How do you avoid memory leaks when using jQuery in a long-lived WordPress admin page?**

**A:** The main sources of leaks in jQuery-heavy admin pages are event listeners on removed DOM nodes, jQuery `.data()` cache entries never cleared, and Deferred callbacks holding closure references. Always call `.off()` before removing elements, use `.remove()` (which cleans jQuery data/events) instead of native `removeChild`, and `.empty()` over `.html('')`. For modals or repeated DOM insertions, keep a reference and call `.remove()` on teardown.

```javascript
(function ($) {
  // BAD: removes DOM but leaves jQuery data/event cache intact
  document.getElementById('old-widget').remove();    // native — jQuery unaware

  // GOOD: jQuery's .remove() cleans events and data
  $('#old-widget').remove();

  // GOOD: .empty() clears children + their jQuery data
  $('#widget-container').empty().append(newContent);

  // GOOD: Namespaced events make bulk removal easy
  $(document).on('click.adminPanel', '.tab-btn', switchTab);
  // On teardown:
  $(document).off('.adminPanel');

  // GOOD: Modal with full lifecycle management
  class AdminModal {
    constructor(templateId) {
      this.$el = $(document.getElementById(templateId).content.cloneNode(true).firstElementChild);
      $('body').append(this.$el);
      this.$el.on('click.modal', '[data-dismiss]', () => this.destroy());
    }
    open()    { this.$el.fadeIn(200); }
    destroy() { this.$el.off('.modal').remove(); } // removes events + element + jQuery cache
  }
}(jQuery));
```
