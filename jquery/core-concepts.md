# jQuery — Core Concepts

> Essential jQuery knowledge for WordPress development interviews.

---

## 1. Document Ready

`$(document).ready()` (or the shorthand `$(fn)`) delays execution until the DOM is fully parsed — but before images and stylesheets are loaded. This is the standard entry point for all jQuery in WordPress themes and plugins. WordPress enqueues jQuery in `noConflict` mode, so `$` is not available; use the `jQuery` variable or wrap code in an IIFE that receives `$` as a parameter.

```javascript
// WordPress-safe pattern
(function ($) {
  $(function () {              // shorthand for $(document).ready(fn)
    console.log('DOM ready'); // $ is safe inside here
  });
}(jQuery));
```

---

## 2. Selectors

jQuery extends CSS selectors with its own pseudo-selectors (`:eq()`, `:first`, `:last`, `:visible`, `:hidden`, `:has()`). Prefer native CSS selectors where possible — jQuery passes them straight to `querySelectorAll`, which is heavily optimised. Avoid over-specificity and chained universal selectors which force a full DOM scan.

```javascript
// Standard CSS selectors (fast — use querySelectorAll under the hood)
$('.entry-content p a[href^="http"]')
$('#main-nav > li.current-menu-item')

// jQuery-specific (slower — jQuery does extra filtering)
$('li:even')           // even-indexed list items
$('input:not(:disabled):visible')
$('[data-post-id]')    // attribute presence

// Performance tip: cache selectors
const $list = $('#posts-list'); // one DOM query
$list.find('.post-title').css('color', 'red');
$list.find('.post-date').hide();
```

---

## 3. Event Delegation

Attaching listeners to dynamically created elements (AJAX-loaded posts, infinite scroll items) requires delegation — attaching the listener to a stable ancestor and using `.on(event, selector, handler)`. This is more memory-efficient than per-element binding and survives DOM replacements.

```javascript
// Static binding — misses dynamically added elements
$('.delete-btn').on('click', deletePost); // BAD for dynamic content

// Delegated binding — works for elements added later
$(document).on('click', '.delete-btn', function () {
  const postId = $(this).data('post-id');
  deletePost(postId);
});

// Prefer a closer ancestor for better performance
$('#posts-container').on('click', '.delete-btn', function (e) {
  e.preventDefault();
  const $row = $(this).closest('.post-row');
  $row.fadeOut(300, function () { $row.remove(); });
});
```

---

## 4. AJAX — `$.ajax` and `$.post` / `$.get`

WordPress uses `admin-ajax.php` as its AJAX endpoint for non-REST requests. Always pass a **nonce** for security. jQuery's `$.ajax` wraps `XMLHttpRequest` with a Deferred-based API. WordPress also provides `wp.ajax.post()` in the admin which handles nonces automatically.

```javascript
(function ($) {
  function loadMorePosts(page) {
    return $.ajax({
      url:    ajaxurl,                       // wp_localize_script provides this
      method: 'POST',
      data: {
        action: 'load_more_posts',
        page,
        nonce:  MyTheme.nonce,               // wp_create_nonce('load_more_posts')
      },
      beforeSend() { $('#spinner').show(); },
    }).always(function () {
      $('#spinner').hide();
    });
  }

  loadMorePosts(2)
    .done(function (res) {
      if (res.success) $('#feed').append(res.data.html);
    })
    .fail(function (jqXHR) {
      console.error('AJAX error:', jqXHR.status, jqXHR.responseText);
    });
}(jQuery));
```

---

## 5. Deferred & Promise

`$.Deferred` is jQuery's implementation of the Promise pattern, predating native Promises. A Deferred object has `.resolve()`, `.reject()`, and `.notify()` methods; `.promise()` returns a read-only view. jQuery `$.ajax()` returns a jqXHR object that implements the Deferred interface. You can interop with native Promises via `Promise.resolve(jqXHR)`.

```javascript
// Creating a custom Deferred
function loadTemplate(name) {
  const dfd = $.Deferred();
  $.get(`/wp-content/themes/my-theme/templates/${name}.html`)
    .done(html  => dfd.resolve(html))
    .fail(err   => dfd.reject(err));
  return dfd.promise(); // expose read-only promise
}

// Combining multiple Deferreds
$.when(
  $.get('/wp-json/wp/v2/posts?per_page=5'),
  $.get('/wp-json/wp/v2/categories')
).done(function ([posts], [categories]) {
  render(posts, categories);
}).fail(function () {
  console.error('One or more requests failed');
});

// Interop with native Promise (jQuery 3+)
Promise.resolve($.get('/wp-json/wp/v2/posts'))
  .then(posts => console.log(posts));
```

---

## 6. Method Chaining

jQuery's fluent interface allows chaining multiple operations on the same jQuery object. Each chainable method returns `this` (the jQuery collection). `.end()` reverts to the previous collection in the chain, and `.filter()` / `.find()` narrow it.

```javascript
$('#post-form')
  .find('input, textarea')
    .not('[type="hidden"]')
    .addClass('form-field')
    .prop('disabled', false)
  .end()                        // back to #post-form
  .find('.error-msg')
    .text('')
    .hide()
  .end()
  .show()
  .find('[autofocus]')
    .trigger('focus');
```

---

## 7. Plugin Authoring

jQuery plugins extend `$.fn` (alias for `jQuery.prototype`). Best practices: always return `this` for chainability, accept an `options` object merged with defaults, support multiple elements via `.each()`, and namespace events to allow clean teardown.

```javascript
(function ($) {
  $.fn.wpAccordion = function (userOptions) {
    const opts = $.extend({
      speed:     300,
      activeClass: 'is-open',
      onOpen:    $.noop,
    }, userOptions);

    return this.each(function () {            // chainable
      const $accordion = $(this);
      const $headers   = $accordion.find('.accordion-header');

      $headers.on('click.wpAccordion', function () {
        const $header  = $(this);
        const $content = $header.next('.accordion-body');
        const isOpen   = $header.hasClass(opts.activeClass);

        // Close all
        $headers.removeClass(opts.activeClass)
          .next('.accordion-body').slideUp(opts.speed);

        // Open clicked if it was closed
        if (!isOpen) {
          $header.addClass(opts.activeClass);
          $content.slideDown(opts.speed);
          opts.onOpen.call(this, $header, $content);
        }
      });

      // Teardown namespace
      $accordion.on('destroy.wpAccordion', function () {
        $headers.off('.wpAccordion');
      });
    });
  };
}(jQuery));

// Usage:
// $('.faq-list').wpAccordion({ onOpen: () => console.log('opened') });
```

---

## 8. No-Conflict Mode

WordPress loads jQuery with `jQuery.noConflict()` called automatically — `$` is released back to any other library (Prototype, MooTools). This means `$` is `undefined` in the global scope. The standard pattern is to wrap all plugin/theme code in an IIFE that receives `jQuery` as `$`.

```javascript
// Pattern 1: IIFE wrapper (most common in themes/plugins)
(function ($) {
  // $ is safely aliased to jQuery here
  $(function () { /* DOM ready */ });
}(jQuery));

// Pattern 2: Named function passed to jQuery()
jQuery(function ($) {
  // $ is safe inside here too
});

// Pattern 3: Manual reassignment (acceptable for simple scripts)
const $ = jQuery;

// Anti-pattern: This will error if Prototype.js also loaded
// $.ready(function() { ... }); // ReferenceError: $ is not defined
```
