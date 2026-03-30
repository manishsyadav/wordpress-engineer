/**
 * jQuery Practical Examples
 * WordPress Engineer Interview Prep
 *
 * Patterns covering WP admin nonce, wp.ajax, event delegation,
 * infinite scroll, form handling, and plugin authoring.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. SAFE DOCUMENT READY — No-Conflict IIFE Pattern
// ─────────────────────────────────────────────────────────────────────────────
(function ($) {
  'use strict';

  $(function () {
    // All jQuery code here is safe. $ = jQuery inside this closure.
    console.log('WordPress theme ready.');
  });

}(jQuery));

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN AJAX — With Nonce and Error Handling
// ─────────────────────────────────────────────────────────────────────────────
(function ($) {
  // wp_localize_script passes: { ajaxurl, nonce } as MyTheme
  function wpAjaxPost(action, data = {}) {
    return $.ajax({
      url:      MyTheme.ajaxurl,
      type:     'POST',
      dataType: 'json',
      data: {
        action,
        nonce: MyTheme.nonce,
        ...data,
      },
    });
  }

  // Usage example — star-rating widget
  $(document).on('click', '.star-rating .star', function () {
    const $star  = $(this);
    const postId = $star.closest('[data-post-id]').data('post-id');
    const rating = $star.data('value');

    wpAjaxPost('save_post_rating', { post_id: postId, rating })
      .done(res => {
        if (res.success) {
          $star.closest('.star-rating').find('.star')
            .removeClass('active')
            .filter(function () { return $(this).data('value') <= rating; })
            .addClass('active');
        }
      })
      .fail(xhr => console.error('Rating save failed', xhr.responseText));
  });

}(jQuery));

// ─────────────────────────────────────────────────────────────────────────────
// 3. WP ADMIN — wp.ajax.post() (Built-In Nonce Handling)
// ─────────────────────────────────────────────────────────────────────────────
// wp.ajax is available in wp-admin; it automatically adds the _ajax_nonce header
// when you use wp_localize_script with '_nonce' suffix conventions.
(function ($, wp) {
  if (!wp || !wp.ajax) return;

  $('#bulk-delete-btn').on('click', function () {
    const ids = $('.post-checkbox:checked').map(function () {
      return $(this).val();
    }).get();

    if (!ids.length) { alert('Select at least one post.'); return; }

    wp.ajax.post('bulk_delete_posts', { post_ids: ids })
      .done(function (data) {
        ids.forEach(id => $(`[data-post-id="${id}"]`).fadeOut(300, function () { $(this).remove(); }));
        console.log(`Deleted ${data.deleted} posts.`);
      })
      .fail(function (err) {
        console.error('Bulk delete failed:', err);
      });
  });

}(jQuery, window.wp));

// ─────────────────────────────────────────────────────────────────────────────
// 4. EVENT DELEGATION — Dynamic Post Actions
// ─────────────────────────────────────────────────────────────────────────────
(function ($) {
  // One listener handles all dynamic content — AJAX-loaded posts, infinite scroll items
  $('#content-area').on('click', '[data-action]', function (e) {
    e.preventDefault();
    const $el     = $(this);
    const action  = $el.data('action');
    const postId  = $el.closest('[data-post-id]').data('post-id');

    const actions = {
      'like-post':     () => likePost(postId, $el),
      'bookmark-post': () => bookmarkPost(postId, $el),
      'share-post':    () => sharePost(postId, $el),
    };

    if (actions[action]) actions[action]();
  });

  function likePost(id, $btn) {
    $btn.prop('disabled', true);
    $.post(MyTheme.ajaxurl, { action: 'like_post', nonce: MyTheme.nonce, id })
      .done(res => {
        if (res.success) {
          $btn.toggleClass('liked').find('.count').text(res.data.likes);
        }
      })
      .always(() => $btn.prop('disabled', false));
  }

  function bookmarkPost(id, $btn) {
    const isBookmarked = $btn.hasClass('bookmarked');
    const ajaxAction   = isBookmarked ? 'remove_bookmark' : 'add_bookmark';

    $.post(MyTheme.ajaxurl, { action: ajaxAction, nonce: MyTheme.nonce, post_id: id })
      .done(res => {
        if (res.success) $btn.toggleClass('bookmarked').attr('aria-pressed', !isBookmarked);
      });
  }

  function sharePost(id, $btn) {
    const url = $btn.data('url') || window.location.href;
    if (navigator.share) {
      navigator.share({ title: $btn.data('title'), url });
    } else {
      $(`<input type="text" value="${url}" class="visually-hidden">`).appendTo('body')
        .select();
      document.execCommand('copy');
      $btn.text('Link copied!');
      setTimeout(() => $btn.text('Share'), 2000);
    }
  }

}(jQuery));

// ─────────────────────────────────────────────────────────────────────────────
// 5. DEFERRED / PROMISE CHAINING
// ─────────────────────────────────────────────────────────────────────────────
(function ($) {

  // Parallel requests with $.when
  function loadSidebar() {
    const dfd = $.Deferred();

    $.when(
      $.getJSON('/wp-json/wp/v2/posts?per_page=3&_fields=id,title,link'),
      $.getJSON('/wp-json/wp/v2/categories?per_page=10&_fields=id,name,count')
    )
      .done(function ([recentPosts], [categories]) {
        dfd.resolve({ recentPosts, categories });
      })
      .fail(function (xhr) {
        dfd.reject(new Error(`${xhr.status}: ${xhr.statusText}`));
      });

    return dfd.promise();
  }

  loadSidebar()
    .done(function ({ recentPosts, categories }) {
      renderRecentPosts(recentPosts);
      renderCategories(categories);
    })
    .fail(function (err) {
      console.error('Sidebar load failed:', err.message);
    });

  // Converting jqXHR to native Promise for async/await
  async function getPost(id) {
    return Promise.resolve(
      $.getJSON(`/wp-json/wp/v2/posts/${id}?_embed`)
    );
  }

}(jQuery));

// ─────────────────────────────────────────────────────────────────────────────
// 6. METHOD CHAINING — Complex Form Manipulation
// ─────────────────────────────────────────────────────────────────────────────
(function ($) {
  function resetForm($form) {
    $form
      .find('.form-field')
        .removeClass('is-valid is-invalid')
        .val('')
      .end()
      .find('.field-error')
        .text('')
        .hide()
      .end()
      .find('[type="submit"]')
        .prop('disabled', false)
        .text('Submit')
      .end()
      .removeClass('form-submitted form-error')
      .trigger('form:reset');
  }

  // Usage
  $('#contact-form .reset-btn').on('click', function () {
    resetForm($(this).closest('form'));
  });

}(jQuery));

// ─────────────────────────────────────────────────────────────────────────────
// 7. CUSTOM JQUERY PLUGIN — Dismissible Notices
// ─────────────────────────────────────────────────────────────────────────────
(function ($) {
  $.fn.wpDismissibleNotice = function (options) {
    const opts = $.extend({
      storageKey: 'wp_dismissed_notices',
      speed: 300,
      onDismiss: $.noop,
    }, options);

    return this.each(function () {
      const $notice = $(this);
      const noticeId = $notice.data('notice-id');

      // Skip if already dismissed
      const dismissed = JSON.parse(localStorage.getItem(opts.storageKey) || '[]');
      if (noticeId && dismissed.includes(noticeId)) {
        $notice.remove();
        return;
      }

      // Create dismiss button
      const $btn = $('<button>', {
        type:         'button',
        class:        'notice-dismiss',
        'aria-label': 'Dismiss notice',
        html:         '<span aria-hidden="true">&times;</span>',
      });

      $notice.append($btn);

      $btn.on('click.dismissibleNotice', function () {
        $notice.slideUp(opts.speed, function () {
          $(this).remove();
          opts.onDismiss.call($notice[0], noticeId);
        });

        if (noticeId) {
          const list = JSON.parse(localStorage.getItem(opts.storageKey) || '[]');
          list.push(noticeId);
          localStorage.setItem(opts.storageKey, JSON.stringify(list));
        }
      });
    });
  };

  // Init on all notices
  $(function () {
    $('[data-notice-id]').wpDismissibleNotice({
      onDismiss: (id) => console.log(`Notice ${id} dismissed.`),
    });
  });

}(jQuery));

// ─────────────────────────────────────────────────────────────────────────────
// 8. INFINITE SCROLL — Load More Posts
// ─────────────────────────────────────────────────────────────────────────────
(function ($) {
  let page      = 2;
  let loading   = false;
  let exhausted = false;

  function loadMorePosts() {
    if (loading || exhausted) return;
    loading = true;

    $('#load-more-spinner').show();

    $.post(MyTheme.ajaxurl, {
      action: 'my_theme_load_more',
      nonce:  MyTheme.nonce,
      page,
      category: $('body').data('category-id') || 0,
    })
      .done(function (res) {
        if (!res.success || !res.data.posts_html) {
          exhausted = true;
          $('#load-more-btn').text('No more posts').prop('disabled', true);
          return;
        }
        const $posts = $(res.data.posts_html).hide();
        $('#posts-grid').append($posts);
        $posts.fadeIn(400);
        page++;
        if (res.data.is_last_page) {
          exhausted = true;
          $('#load-more-btn').hide();
        }
      })
      .fail(function () { console.error('Load more failed.'); })
      .always(function () {
        loading = false;
        $('#load-more-spinner').hide();
      });
  }

  // Button trigger
  $(document).on('click', '#load-more-btn', loadMorePosts);

  // Auto-trigger when sentinel visible
  $(window).on('scroll.infiniteScroll', $.throttle ? $.throttle(200, function () {
    const scrolledTo = $(window).scrollTop() + $(window).height();
    const threshold  = $(document).height() - 300;
    if (scrolledTo >= threshold) loadMorePosts();
  }) : function () {
    // Fallback without throttle plugin
    const scrolledTo = $(window).scrollTop() + $(window).height();
    if (scrolledTo >= $(document).height() - 300) loadMorePosts();
  });

}(jQuery));

// ─────────────────────────────────────────────────────────────────────────────
// 9. FORM VALIDATION — Inline Errors with WP REST Submission
// ─────────────────────────────────────────────────────────────────────────────
(function ($) {
  const validators = {
    required: v  => v.trim() ? null : 'This field is required.',
    email:    v  => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Enter a valid email.',
    minLen:   n  => v => v.trim().length >= n ? null : `Minimum ${n} characters.`,
    phone:    v  => /^\+?[\d\s\-().]{7,}$/.test(v.trim()) ? null : 'Enter a valid phone number.',
  };

  const FIELD_RULES = {
    name:    [validators.required, validators.minLen(2)],
    email:   [validators.required, validators.email],
    phone:   [validators.phone],
    message: [validators.required, validators.minLen(10)],
  };

  function validate($field) {
    const name  = $field.attr('name');
    const value = $field.val();
    const rules = FIELD_RULES[name] || [];
    for (const rule of rules) {
      const err = rule(value);
      if (err) {
        $field.addClass('is-invalid').next('.error').text(err).show();
        return false;
      }
    }
    $field.removeClass('is-invalid').next('.error').hide();
    return true;
  }

  $('#contact-form')
    .on('blur', 'input, textarea', function () { validate($(this)); })
    .on('submit', function (e) {
      e.preventDefault();
      const $form = $(this);

      const valid = $form.find('input[name], textarea[name]')
        .toArray().map(el => validate($(el))).every(Boolean);

      if (!valid) return;

      const $btn = $form.find('[type="submit"]').prop('disabled', true).text('Sending…');
      const data = Object.fromEntries(
        $form.serializeArray().map(({ name, value }) => [name, value])
      );

      $.ajax({
        url:         '/wp-json/my-plugin/v1/contact',
        type:        'POST',
        contentType: 'application/json',
        headers:     { 'X-WP-Nonce': MyTheme.nonce },
        data:        JSON.stringify(data),
      })
        .done(() => $form.replaceWith('<p class="success-msg">Thank you! We\'ll be in touch.</p>'))
        .fail(xhr => {
          const msg = xhr.responseJSON?.message || 'Submission failed. Please try again.';
          $form.prepend($('<p>', { class: 'form-error', role: 'alert', text: msg }));
          $btn.prop('disabled', false).text('Send');
        });
    });

}(jQuery));

// ─────────────────────────────────────────────────────────────────────────────
// 10. TABS WIDGET — Accessible, Keyboard-Navigable
// ─────────────────────────────────────────────────────────────────────────────
(function ($) {
  $.fn.accessibleTabs = function () {
    return this.each(function () {
      const $widget = $(this);
      const $tabs   = $widget.find('[role="tab"]');
      const $panels = $widget.find('[role="tabpanel"]');

      function activateTab($tab) {
        $tabs.attr({ 'aria-selected': 'false', tabindex: '-1' }).removeClass('is-active');
        $panels.attr('hidden', true);

        const panelId = $tab.attr('aria-controls');
        $tab.attr({ 'aria-selected': 'true', tabindex: '0' }).addClass('is-active');
        $(`#${panelId}`).removeAttr('hidden');
      }

      $tabs.on('click.tabs', function () { activateTab($(this)); })
        .on('keydown.tabs', function (e) {
          const idx = $tabs.index(this);
          if      (e.key === 'ArrowRight') activateTab($tabs.eq((idx + 1) % $tabs.length));
          else if (e.key === 'ArrowLeft')  activateTab($tabs.eq((idx - 1 + $tabs.length) % $tabs.length));
          else if (e.key === 'Home')       activateTab($tabs.first());
          else if (e.key === 'End')        activateTab($tabs.last());
        });

      activateTab($tabs.first()); // init
    });
  };

  $(function () { $('[data-tabs]').accessibleTabs(); });

}(jQuery));
