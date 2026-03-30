# jQuery — Core Concepts

## 1. jQuery in WordPress — `noConflict` Mode

WordPress loads jQuery in `noConflict` mode, releasing the `$` alias to prevent conflicts with other libraries. Always use `jQuery` for global references, or wrap code in an IIFE to safely use `$` inside the closure.

```javascript
// Pattern 1 — IIFE wrapper (most common in WP plugins)
(function($) {
    $(document).ready(function() {
        $('.my-element').hide();
    });
})(jQuery);

// Pattern 2 — document-ready shorthand
jQuery(function($) {
    // $ is safely aliased here
    $('.button').on('click', handler);
});
```

---

## 2. DOM Selection and Traversal

jQuery wraps DOM nodes in a jQuery object providing a fluent, chainable API.

**Selecting:**
- `$('#id')` — by ID
- `$('.class')` — by class (returns all matches)
- `$('div > p')` — any valid CSS selector
- `$('[data-post-id]')` — attribute presence
- `$(existingNode)` — wrap a raw DOM element

**Traversal:**
- `.find(selector)` — search within descendants
- `.closest(selector)` — walk up ancestors to first match
- `.parent()` / `.parents(selector)` — direct parent / all ancestors
- `.children(selector)` — direct children only
- `.siblings()` / `.next()` / `.prev()` — sibling navigation
- `.filter(selector)` — narrow the set
- `.not(selector)` — exclude elements

---

## 3. Event Handling and Delegation

```javascript
(function($) {
    // Direct binding — only for elements present at bind time
    $('.like-btn').on('click', function() {
        likePost($(this).data('post-id'));
    });

    // Event delegation — handles dynamically added elements
    // Delegate from closest static ancestor (more efficient than 'document')
    $('#post-list').on('click', '.like-btn', function(e) {
        e.preventDefault();
        const postId = $(this).data('post-id');
        $(this).addClass('liked').prop('disabled', true);
    });

    // Namespaced events — targeted removal without affecting other handlers
    $(window).on('resize.myPlugin scroll.myPlugin', handleViewportChange);
    $(window).off('.myPlugin'); // remove all myPlugin handlers at once

    // One-time handler
    $('.dismiss-notice').one('click', function() {
        $(this).closest('.notice').slideUp(200, function() { $(this).remove(); });
    });
})(jQuery);
```

---

## 4. AJAX with `$.ajax` and WordPress `wp_ajax`

```javascript
(function($) {
    function loadMorePosts(page) {
        return $.ajax({
            url:    wp_ajax_obj.ajax_url, // localized via wp_localize_script
            method: 'POST',
            data: {
                action: 'my_plugin_load_posts',
                nonce:  wp_ajax_obj.nonce,
                page:   page,
            },
        });
    }

    $('#load-more-btn').on('click', function() {
        const $btn = $(this).prop('disabled', true).text('Loading…');
        const page = $btn.data('page') || 1;

        loadMorePosts(page)
            .done(function(response) {
                if (response.success) {
                    $('#posts-container').append(response.data.html);
                    $btn.data('page', page + 1);
                } else {
                    alert(response.data.message);
                }
            })
            .fail(function(xhr) {
                console.error('AJAX error:', xhr.statusText);
            })
            .always(function() {
                $btn.prop('disabled', false).text('Load More');
            });
    });
})(jQuery);
```

PHP handler:
```php
add_action('wp_ajax_my_plugin_load_posts',        'my_plugin_ajax_posts');
add_action('wp_ajax_nopriv_my_plugin_load_posts', 'my_plugin_ajax_posts');

function my_plugin_ajax_posts(): void {
    check_ajax_referer('my_plugin_nonce', 'nonce');
    $page  = absint($_POST['page'] ?? 1);
    $posts = get_posts(['posts_per_page' => 10, 'paged' => $page]);
    ob_start();
    foreach ($posts as $post) { /* template */ }
    $html = ob_get_clean();
    wp_send_json_success(['html' => $html]);
}
```

---

## 5. jQuery Deferred Objects (Pre-ES6 Promises)

```javascript
(function($) {
    // $.when — parallel like Promise.all
    $.when(
        $.getJSON('/wp-json/wp/v2/posts?per_page=5'),
        $.getJSON('/wp-json/wp/v2/categories')
    ).done(function(postsResult, catsResult) {
        const posts      = postsResult[0];
        const categories = catsResult[0];
        renderDashboard(posts, categories);
    }).fail(function(xhr) {
        console.error('Request failed:', xhr.statusText);
    });

    // Manual Deferred for wrapping callbacks as promises
    function waitForElement(selector, timeout = 3000) {
        const dfd   = $.Deferred();
        const start = Date.now();
        const check = () => {
            const $el = $(selector);
            if ($el.length) return dfd.resolve($el);
            if (Date.now() - start > timeout) return dfd.reject('Timeout');
            setTimeout(check, 50);
        };
        check();
        return dfd.promise();
    }

    waitForElement('#dynamic-widget')
        .done($el  => $el.fadeIn())
        .fail(msg  => console.warn(msg));
})(jQuery);
```

---

## 6. DOM Manipulation

```javascript
(function($) {
    // Reading
    const title  = $('#post-title').text();
    const markup = $('#post-content').html();
    const val    = $('#search').val();
    const id     = $('.card').eq(0).data('post-id'); // reads data-post-id

    // Writing
    $('#post-title').text('Updated Title');           // safe — no XSS
    $('#post-excerpt').html('<em>New excerpt</em>');  // renders HTML
    $('#count').val('42');

    // Creating
    const $card = $('<div>', { class: 'post-card', 'data-id': 42 })
        .append($('<h2>').text('Card Title'))
        .append($('<p>').text('Excerpt…'));
    $('#grid').append($card);

    // Removing
    $('.expired').remove();   // removes element + its data and event listeners
    $('#modal').detach();     // removes but keeps data/events (for later re-insertion)

    // Cloning
    const $tpl = $('#post-template').clone(true); // true = deep clone with events
    $tpl.find('.title').text('New Post');
    $('#post-list').append($tpl.show());
})(jQuery);
```

---

## 7. CSS and Animations

```javascript
(function($) {
    // Class manipulation
    $('body').toggleClass('dark-mode');
    $('.card').addClass('is-visible').removeClass('is-loading');

    // Inline styles (prefer CSS classes when possible)
    $('.progress').css('width', '75%');
    $('.alert').css({ backgroundColor: '#d63638', color: '#fff' });

    // Built-in effects
    $('.notification')
        .fadeIn(300)
        .delay(4000)
        .fadeOut(300, function() { $(this).remove(); });

    $('.panel').slideToggle(200);

    // Scroll to element with animation
    $('html, body').animate({
        scrollTop: $('#section-target').offset().top - 80
    }, 500);

    // Stop animation queue before starting new one (prevents buildup on hover)
    $('.btn').hover(
        function() { $(this).stop(true, true).animate({ paddingLeft: '20px' }, 100); },
        function() { $(this).stop(true, true).animate({ paddingLeft: '10px' }, 100); }
    );
})(jQuery);
```

---

## 8. Plugin Authoring Pattern

```javascript
(function($) {
    /**
     * $.fn.readingProgress — tracks scroll reading progress for long-form content.
     * Usage: $('article').readingProgress({ target: '#progress-bar' });
     */
    $.fn.readingProgress = function(options) {
        const settings = $.extend({
            target:     '#reading-progress',
            activeClass: 'is-active',
        }, options);

        return this.each(function() {
            const $article = $(this);
            const $bar     = $(settings.target);
            if (!$bar.length) return;

            function update() {
                const articleTop    = $article.offset().top;
                const articleBottom = articleTop + $article.outerHeight();
                const viewBottom    = $(window).scrollTop() + $(window).height();
                const progress      = Math.max(0, Math.min(100,
                    ((viewBottom - articleTop) / (articleBottom - articleTop)) * 100
                ));
                $bar.css('width', progress + '%');
                $bar.toggleClass(settings.activeClass, progress > 0 && progress < 100);
            }

            // Throttle scroll handler
            let ticking = false;
            $(window).on('scroll.readingProgress resize.readingProgress', function() {
                if (!ticking) {
                    requestAnimationFrame(function() { update(); ticking = false; });
                    ticking = true;
                }
            });

            update(); // initial call
        });
    };
})(jQuery);

// Usage
jQuery('article.post-content').readingProgress({ target: '#reading-progress-bar' });
```

---

## 9. Form Handling and Validation

```javascript
(function($) {
    $('#contact-form').on('submit', function(e) {
        e.preventDefault();
        const $form = $(this);
        let   valid = true;

        // Clear previous errors
        $form.find('.field-error').remove();
        $form.find('.has-error').removeClass('has-error');

        // Validate name
        const name = $.trim($('#name').val());
        if (!name || name.length < 2) {
            showError('#name', 'Please enter your name (at least 2 characters).');
            valid = false;
        }

        // Validate email
        const email = $.trim($('#email').val());
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('#email', 'Please enter a valid email address.');
            valid = false;
        }

        if (!valid) return;

        // Submit via AJAX
        const $btn = $form.find('[type="submit"]')
            .prop('disabled', true)
            .text('Sending…');

        $.post(wp_ajax_obj.ajax_url, {
            action:  'contact_form_submit',
            nonce:   wp_ajax_obj.nonce,
            name:    name,
            email:   email,
            message: $('#message').val(),
        })
        .done(function(res) {
            if (res.success) {
                $form.replaceWith('<p class="success-msg">Message sent! We\'ll be in touch.</p>');
            }
        })
        .fail(function() {
            showError(null, 'Something went wrong. Please try again.');
        })
        .always(function() {
            $btn.prop('disabled', false).text('Send Message');
        });
    });

    function showError(selector, message) {
        const $error = $('<span>', { class: 'field-error', text: message });
        if (selector) {
            $(selector).addClass('has-error').after($error);
        } else {
            $('#contact-form').prepend($error);
        }
    }
})(jQuery);
```

---

## 10. Migration from jQuery to Vanilla JS

For modern WordPress development (Gutenberg blocks, new themes), vanilla JS is preferred. Know the equivalents:

| jQuery | Vanilla JS |
|--------|-----------|
| `$('#id')` | `document.getElementById('id')` |
| `$('.cls')` | `document.querySelectorAll('.cls')` |
| `$(el).on('click', fn)` | `el.addEventListener('click', fn)` |
| `$(el).addClass('x')` | `el.classList.add('x')` |
| `$(el).toggleClass('x')` | `el.classList.toggle('x')` |
| `$(el).attr('href')` | `el.getAttribute('href')` |
| `$(el).data('id')` | `el.dataset.id` |
| `$(el).html(str)` | `el.innerHTML = str` |
| `$(el).text(str)` | `el.textContent = str` |
| `$.ajax({ url })` | `fetch(url)` |
| `$.when(a, b)` | `Promise.all([a, b])` |
| `$(el).closest('.x')` | `el.closest('.x')` |
| `$(el).find('.x')` | `el.querySelectorAll('.x')` |
| `$(el).css('color','red')` | `el.style.color = 'red'` |
| `$(document).ready(fn)` | `document.addEventListener('DOMContentLoaded', fn)` |

Strategy for existing WP sites: keep jQuery (it's loaded anyway), replace new feature code with vanilla JS. For Gutenberg blocks, use React/vanilla JS exclusively.
