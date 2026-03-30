# jQuery — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is `$(document).ready()` and why do you use it?**

**A:** Ensures the DOM is fully loaded before running jQuery code. Prevents errors from targeting elements that don't exist yet.
```javascript
$(function() {
  console.log('DOM ready');
});
```

---

**Q2: What is the difference between `$('#id')` and `$('.class')` selectors?**

**A:** `#id` selects a single unique element; `.class` selects all elements sharing that class name.
```javascript
$('#main-nav').hide();
$('.menu-item').addClass('active');
```

---

**Q3: How do you select all `<p>` elements inside a `<div>` using jQuery?**

**A:** Use a descendant selector string inside `$()`, exactly like CSS.
```javascript
$('div p').css('color', 'blue');
```

---

**Q4: How do you get and set the HTML content of an element?**

**A:** `.html()` with no argument gets inner HTML; passing a string sets it.
```javascript
var content = $('#box').html();
$('#box').html('<strong>New content</strong>');
```

---

**Q5: How do you get and set plain text content of an element?**

**A:** `.text()` reads or writes text, stripping HTML tags on read.
```javascript
var label = $('#title').text();
$('#title').text('Updated Title');
```

---

**Q6: How do you read or write the value of a form input?**

**A:** `.val()` reads or sets the `value` property of any form element.
```javascript
var email = $('input[name="email"]').val();
$('input[name="email"]').val('user@example.com');
```

---

**Q7: How do you read and write HTML attributes with jQuery?**

**A:** `.attr()` gets or sets any HTML attribute by name.
```javascript
var href = $('a.logo').attr('href');
$('img.hero').attr('alt', 'Hero banner');
```

---

**Q8: How do you store arbitrary data on a DOM element without polluting attributes?**

**A:** `.data()` stores key/value pairs in jQuery's internal cache, not in the HTML.
```javascript
$('#post').data('postId', 42);
var id = $('#post').data('postId'); // 42
```

---

**Q9: How do you add, remove, and toggle a CSS class?**

**A:** Use `.addClass()`, `.removeClass()`, and `.toggleClass()` respectively.
```javascript
$('#nav').addClass('open');
$('#nav').removeClass('open');
$('#nav').toggleClass('open');
```

---

**Q10: How do you apply inline CSS styles with jQuery?**

**A:** `.css()` reads or writes one or multiple inline style properties at once.
```javascript
$('#banner').css({ backgroundColor: '#333', color: '#fff' });
```

---

**Q11: How do you traverse to the parent of a selected element?**

**A:** `.parent()` returns the direct parent; `.parents()` returns all ancestors up to the root.
```javascript
$('.menu-item.active').parent().addClass('has-active');
```

---

**Q12: How do you find all child and descendant elements?**

**A:** `.children()` returns direct children only; `.find()` searches all descendants.
```javascript
$('#sidebar').children('ul').addClass('widget-list');
$('#content').find('img').addClass('responsive');
```

---

**Q13: How do you get sibling elements in jQuery?**

**A:** `.siblings()` returns all siblings; `.next()` and `.prev()` return adjacent ones.
```javascript
$('.active-tab').siblings().removeClass('active');
$('li.current').next().addClass('up-next');
```

---

**Q14: How do you fade an element in and out?**

**A:** `.fadeIn()` and `.fadeOut()` animate opacity; an optional callback fires when done.
```javascript
$('#overlay').fadeIn(300);
$('#overlay').fadeOut(300, function() { $(this).remove(); });
```

---

**Q15: How do you slide an element up and down?**

**A:** `.slideDown()` reveals an element and `.slideUp()` hides it by animating its height.
```javascript
$('.accordion-content').slideUp(200);
$('.accordion-content.active').slideDown(200);
```

---

**Q16: How does jQuery chaining work?**

**A:** Most jQuery methods return the same jQuery object, allowing multiple operations in a single expression.
```javascript
$('#alert')
  .addClass('visible')
  .text('Saved!')
  .fadeIn(200)
  .delay(2000)
  .fadeOut(400);
```

---

**Q17: How do you attach a click event handler in jQuery?**

**A:** Use `.on('click', handler)` — the preferred modern API over the deprecated `.click()` shorthand.
```javascript
$('#submit-btn').on('click', function(e) {
  e.preventDefault();
  console.log('Clicked');
});
```

---

**Q18: How do you serialize a form for AJAX submission?**

**A:** `.serialize()` returns a URL-encoded string; `.serializeArray()` returns an array of name/value objects.
```javascript
var data = $('#contact-form').serialize();
// "name=John&email=john%40example.com"
```

---

**Q19: How do you iterate over a jQuery collection?**

**A:** `.each()` loops through every matched element, providing index and the raw DOM node.
```javascript
$('li.item').each(function(i, el) {
  console.log(i, $(el).text());
});
```

---

**Q20: What does `$.extend()` do?**

**A:** Merges properties from source objects into a target. Pass `true` as the first argument for a deep (recursive) merge.
```javascript
var defaults = { color: 'blue', size: 12 };
var options  = $.extend({}, defaults, { color: 'red' });
// { color: 'red', size: 12 }
```

---

## Mid

**Q21: What is event delegation and why is it useful?**

**A:** Attach one listener to a stable ancestor and filter by selector. Works for dynamically added elements and reduces total listener count.
```javascript
$('#post-list').on('click', '.delete-btn', function() {
  $(this).closest('li').remove();
});
```

---

**Q22: How do you remove an event listener with jQuery?**

**A:** `.off()` removes handlers. Pass the event name and original handler (or a namespace) to remove only that specific listener.
```javascript
function handleClick(e) { console.log('clicked'); }
$('#btn').on('click', handleClick);
$('#btn').off('click', handleClick);
```

---

**Q23: What is the difference between `.trigger()` and `.triggerHandler()`?**

**A:** `.trigger()` fires the event, runs the default action, and bubbles. `.triggerHandler()` fires only the first element's handler, returns its value, and does not bubble.
```javascript
$('#form').triggerHandler('submit'); // no page reload
$('#form').trigger('submit');        // causes default submit
```

---

**Q24: How do you fire an event handler only once?**

**A:** `.one()` attaches a handler that automatically unbinds itself after its first execution.
```javascript
$('#modal-overlay').one('click', function() {
  $('#modal').hide();
});
```

---

**Q25: How do you make an AJAX GET request with jQuery?**

**A:** `$.get()` is a shorthand around `$.ajax()` for GET requests, accepting a URL, data, and success callback.
```javascript
$.get('/wp-json/wp/v2/posts', { per_page: 5 }, function(data) {
  console.log(data);
});
```

---

**Q26: How do you use `$.ajax()` for a POST request with JSON?**

**A:** Set `type: 'POST'` and `contentType: 'application/json'`, then `JSON.stringify` the data payload.
```javascript
$.ajax({
  url: '/api/save',
  type: 'POST',
  contentType: 'application/json',
  data: JSON.stringify({ title: 'Hello' }),
  success: function(res) { console.log(res); }
});
```

---

**Q27: How do you handle AJAX errors in jQuery?**

**A:** Chain `.fail()` on the returned jqXHR object, or use the `error` callback inside `$.ajax()`.
```javascript
$.get('/api/data')
  .done(function(data) { console.log(data); })
  .fail(function(xhr, status, err) { console.error(err); });
```

---

**Q28: How do you send a secure WordPress AJAX request with jQuery?**

**A:** POST to `ajaxurl` with the `action` and a `nonce`; verify server-side with `check_ajax_referer()`.
```javascript
$.post(ajaxurl, {
  action: 'my_action',
  nonce: myVars.nonce,
  post_id: 42
}, function(response) {
  console.log(response.data);
});
```

---

**Q29: What is `$.Deferred` and how do you use it?**

**A:** A Deferred lets you create and control a promise manually. Resolve or reject it to trigger `.done()` or `.fail()` callbacks.
```javascript
function loadData() {
  var dfd = $.Deferred();
  setTimeout(function() { dfd.resolve('done'); }, 500);
  return dfd.promise();
}
loadData().done(function(msg) { console.log(msg); });
```

---

**Q30: How does `$.when()` coordinate multiple AJAX calls?**

**A:** `$.when()` accepts multiple promises and resolves only when all resolve, or rejects immediately if any one fails.
```javascript
$.when(
  $.get('/api/users'),
  $.get('/api/posts')
).done(function(users, posts) {
  console.log(users[0], posts[0]);
});
```

---

**Q31: How do you write a jQuery plugin?**

**A:** Extend `$.fn` with your plugin name and always return `this` to preserve chaining.
```javascript
$.fn.highlight = function(color) {
  return this.css('background', color || 'yellow');
};
$('p.note').highlight('#ffe066');
```

---

**Q32: What is jQuery no-conflict mode and when is it needed?**

**A:** `$.noConflict()` releases the `$` alias for other libraries. WordPress loads jQuery in no-conflict mode by default, so plugins must use `jQuery` or a wrapper.
```javascript
var jq = $.noConflict();
jq(function() {
  jq('#logo').fadeIn();
});
```

---

**Q33: How does `.closest()` differ from `.parents()`?**

**A:** `.closest()` starts from the element itself and stops at the first match; `.parents()` returns all matching ancestors without stopping.
```javascript
$('.delete-btn').on('click', function() {
  $(this).closest('.card').remove();
});
```

---

**Q34: How do custom event namespaces work in jQuery?**

**A:** Append `.namespace` to event names so you can remove or trigger only namespaced handlers without affecting others.
```javascript
$('#menu').on('click.nav', 'a', handleNav);
// Remove only nav-related click handlers:
$('#menu').off('click.nav');
```

---

**Q35: What is the difference between `.detach()` and `.remove()`?**

**A:** Both remove elements from the DOM, but `.detach()` keeps jQuery event handlers and data intact so the element can be re-appended later.
```javascript
var $el = $('#widget').detach(); // events preserved
$('#new-container').append($el);
```

---

**Q36: How do you clone an element including its event handlers?**

**A:** Pass `true` to `.clone()` to deep-copy both the element and all attached jQuery events and data.
```javascript
var $copy = $('#template-item').clone(true);
$('#list').append($copy);
```

---

**Q37: How do you fix `this` context inside a jQuery event handler?**

**A:** Use `$.proxy(fn, context)` to bind a specific `this`, similar to native `.bind()`.
```javascript
var obj = { name: 'Widget' };
$('#btn').on('click', $.proxy(function() {
  console.log(this.name); // 'Widget'
}, obj));
```

---

**Q38: How do you cache jQuery selectors for better performance?**

**A:** Store the jQuery object in a variable to avoid repeated DOM queries inside loops or event handlers.
```javascript
// Slow: queries DOM every iteration
$('.items').each(function() { $('.counter').text(++n); });

// Fast: query once
var $counter = $('.counter');
$('.items').each(function() { $counter.text(++n); });
```

---

**Q39: How does `$.isFunction()` help with flexible plugin options?**

**A:** It lets a plugin accept either a static value or a callback, calling it only when it is a function.
```javascript
$.fn.greet = function(msg) {
  var text = $.isFunction(msg) ? msg() : msg;
  return this.text(text);
};
```

---

**Q40: How do you create custom animations with `.animate()`?**

**A:** `.animate()` tweens any numeric CSS property over a duration, with optional easing and a completion callback.
```javascript
$('#panel').animate({
  width: '300px',
  opacity: 0.8
}, 400, 'swing', function() {
  console.log('animation complete');
});
```

---

## Advanced

**Q41: How do you implement a secure WordPress AJAX handler end-to-end?**

**A:** Use `wp_localize_script` to pass `ajaxurl` and a nonce to JS; verify with `check_ajax_referer()` in PHP before processing.
```javascript
// JS
$.post(myAjax.url, {
  action: 'fetch_posts',
  nonce: myAjax.nonce
}, function(r) { if (r.success) renderPosts(r.data); });
```
```php
// PHP
add_action('wp_ajax_fetch_posts', function() {
  check_ajax_referer('fetch_posts_nonce', 'nonce');
  wp_send_json_success(get_posts());
});
```

---

**Q42: How do you build a reusable `$.ajax()` wrapper for the WP REST API?**

**A:** Wrap `$.ajax()` in a factory that injects the nonce header and base URL, returning the jqXHR promise for chaining.
```javascript
function apiFetch(endpoint, method, payload) {
  return $.ajax({
    url: wpApiSettings.root + endpoint,
    type: method || 'GET',
    data: payload,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
    }
  });
}
apiFetch('wp/v2/posts').done(function(posts) { console.log(posts); });
```

---

**Q43: How do you prevent memory leaks when destroying jQuery-enhanced widgets?**

**A:** Unbind events with `.off()`, clear data with `.removeData()`, then remove the element. `.remove()` handles all three for jQuery-tracked bindings.
```javascript
function destroyWidget($el) {
  $el.off();        // unbind all jQuery events
  $el.removeData(); // clear $.data cache
  $el.remove();     // detach from DOM
}
```

---

**Q44: How do you write a jQuery plugin that supports overridable defaults?**

**A:** Merge user options with `$.extend()` and expose defaults on `$.fn.pluginName.defaults` for global overrides.
```javascript
$.fn.tooltip = function(options) {
  var opts = $.extend({}, $.fn.tooltip.defaults, options);
  return this.each(function() {
    $(this).attr('title', opts.prefix + $(this).data('tip'));
  });
};
$.fn.tooltip.defaults = { prefix: 'Tip: ' };
```

---

**Q45: How do you debounce a jQuery scroll or resize handler?**

**A:** jQuery has no built-in debounce; implement one manually and pass the returned function to `.on()` to throttle execution.
```javascript
function debounce(fn, delay) {
  var timer;
  return function() {
    clearTimeout(timer);
    timer = setTimeout(fn.bind(this), delay);
  };
}
$(window).on('resize.myPlugin', debounce(function() {
  recalculateLayout();
}, 200));
```

---

**Q46: How do you lazily initialize a jQuery plugin when its target enters the viewport?**

**A:** Use the native Intersection Observer inside `.each()` to defer initialization, then `unobserve` after first trigger.
```javascript
$.fn.lazyInit = function(initFn) {
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        initFn.call(entry.target);
        io.unobserve(entry.target);
      }
    });
  });
  return this.each(function() { io.observe(this); });
};
$('.chart').lazyInit(function() { renderChart(this); });
```

---

**Q47: How do you chain sequential async operations with jQuery Deferred?**

**A:** Return a new promise from a `.then()` callback; jQuery waits for it to resolve before advancing the chain.
```javascript
$.get('/api/step1')
  .then(function(data) {
    return $.post('/api/step2', { id: data.id });
  })
  .then(function(result) {
    return $.get('/api/step3?ref=' + result.ref);
  })
  .done(function(final) { console.log(final); })
  .fail(function(err)   { console.error(err); });
```

---

**Q48: How do you hook into the WordPress Heartbeat API with jQuery?**

**A:** Listen for `heartbeat-send` to add data and `heartbeat-tick` to receive the server response, piggybacking on the existing XHR.
```javascript
$(document).on('heartbeat-send', function(e, data) {
  data.my_check = { post_id: postId };
});
$(document).on('heartbeat-tick', function(e, data) {
  if (data.my_check_response) updateUI(data.my_check_response);
});
```

---

**Q49: How do you implement a publish/subscribe pattern using jQuery custom events?**

**A:** Use a shared detached jQuery object as an event bus; publishers trigger events on it and subscribers listen with `.on()`.
```javascript
var bus = $({});

// Publisher
bus.trigger('cart:updated', [{ count: 3 }]);

// Subscriber
bus.on('cart:updated', function(e, payload) {
  $('#cart-count').text(payload.count);
});
```

---

**Q50: How do you incrementally migrate a jQuery-heavy WordPress theme to vanilla JS?**

**A:** Replace jQuery utilities one at a time with native equivalents (`querySelector`, `fetch`, `classList`). Enqueue jQuery conditionally per page to reduce payload during the transition.
```javascript
// jQuery
$('.nav-toggle').on('click', function() {
  $('#nav').toggleClass('open');
});

// Vanilla replacement
document.querySelector('.nav-toggle')
  .addEventListener('click', function() {
    document.getElementById('nav').classList.toggle('open');
  });
```

---
