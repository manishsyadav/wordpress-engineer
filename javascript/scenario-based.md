# JavaScript — Scenario-Based Questions

> Real-world problem-solving scenarios with full solutions.

---

## Scenario 1: Debounce for a Live Search Input

**The situation:** Your WordPress theme has a search input that calls the REST API on every keystroke. Users complain the page is sluggish; network tab shows hundreds of requests per second. You need to rate-limit the API calls to fire only after the user pauses typing for 300ms, and also cancel any in-flight request if a newer one arrives.

**Solution:**

```javascript
/**
 * Enhanced debounce with AbortController to cancel stale XHR/fetch requests.
 * Used in WordPress themes for live search via the REST API.
 */
function debounce(fn, delay = 300) {
  let timerId = null;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

class LiveSearch {
  #controller = null; // AbortController for in-flight requests

  constructor(inputSelector, resultsSelector) {
    this.input   = document.querySelector(inputSelector);
    this.results = document.querySelector(resultsSelector);
    this.#attachListeners();
  }

  #attachListeners() {
    this.input.addEventListener(
      'input',
      debounce(this.#search.bind(this), 300)
    );
  }

  async #search(e) {
    const query = e.target.value.trim();
    if (!query) { this.results.innerHTML = ''; return; }

    // Cancel any previous in-flight request
    this.#controller?.abort();
    this.#controller = new AbortController();

    this.results.innerHTML = '<li class="loading">Searching…</li>';

    try {
      const url = new URL('/wp-json/wp/v2/posts', window.location.origin);
      url.searchParams.set('search', query);
      url.searchParams.set('per_page', '8');
      url.searchParams.set('_fields', 'id,title,link');

      const res = await fetch(url, { signal: this.#controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const posts = await res.json();
      this.#render(posts, query);
    } catch (err) {
      if (err.name === 'AbortError') return; // Expected — ignore
      this.results.innerHTML = `<li class="error">Search failed: ${err.message}</li>`;
    }
  }

  #render(posts, query) {
    if (!posts.length) {
      this.results.innerHTML = `<li class="empty">No results for "${query}"</li>`;
      return;
    }
    const highlight = (str) =>
      str.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>');

    this.results.innerHTML = posts
      .map(p => `<li><a href="${p.link}">${highlight(p.title.rendered)}</a></li>`)
      .join('');
  }
}

// Usage
const search = new LiveSearch('#wp-live-search', '#search-results');
```

**Key takeaways:**
- Always abort stale requests — a slow network can return them out of order
- `debounce` reduces API calls dramatically; 300ms is a good UX threshold
- Private class fields (`#`) keep implementation details encapsulated

---

## Scenario 2: Promise Chaining for Sequential WP REST API Fetches

**The situation:** A plugin needs to: (1) fetch a post, (2) fetch its author details, (3) fetch the author's other posts, then (4) display a "More by this author" sidebar widget. Each step depends on data from the previous step. You also need to handle partial failures gracefully.

**Solution:**

```javascript
/**
 * Sequential WP REST API data pipeline using async/await.
 * Fetches a post → author → author's other posts → renders widget.
 */
const API_BASE = '/wp-json/wp/v2';
const NONCE    = document.querySelector('meta[name="wp-nonce"]')?.content ?? '';

const apiFetch = async (path, signal) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-WP-Nonce': NONCE },
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || `HTTP ${res.status}`), { status: res.status });
  }
  return res.json();
};

async function loadAuthorWidget(postId, containerEl) {
  const controller = new AbortController();
  const { signal }  = controller;

  containerEl.classList.add('loading');

  try {
    // Step 1: fetch the current post
    const post = await apiFetch(`/posts/${postId}?_fields=id,title,author`, signal);

    // Step 2: fetch the author (depends on post.author)
    const author = await apiFetch(`/users/${post.author}?_fields=id,name,link,avatar_urls`, signal);

    // Step 3: fetch author's other posts concurrently with a fallback
    const otherPosts = await apiFetch(
      `/posts?author=${author.id}&per_page=4&exclude=${post.id}&_fields=id,title,link`,
      signal
    ).catch(() => []); // graceful fallback — widget still renders without related posts

    // Step 4: render
    renderWidget(containerEl, author, otherPosts);
  } catch (err) {
    if (err.name === 'AbortError') return;
    containerEl.innerHTML = `<p class="widget-error">Could not load author info.</p>`;
    console.error('[AuthorWidget]', err);
  } finally {
    containerEl.classList.remove('loading');
  }

  return () => controller.abort(); // cleanup function
}

function renderWidget(el, author, posts) {
  const avatarUrl = author.avatar_urls?.[96] ?? '/img/default-avatar.png';
  el.innerHTML = `
    <div class="author-widget">
      <img src="${avatarUrl}" alt="${author.name}" width="48" height="48">
      <h3><a href="${author.link}">${author.name}</a></h3>
      ${posts.length ? `
        <ul>
          ${posts.map(p => `<li><a href="${p.link}">${p.title.rendered}</a></li>`).join('')}
        </ul>` : '<p>No other posts.</p>'}
    </div>`;
}

// Usage — clean up if the widget is removed (e.g., SPA navigation)
const cleanup = await loadAuthorWidget(
  Number(document.body.dataset.postId),
  document.getElementById('author-widget')
);
// Later: cleanup?.();
```

**Key takeaways:**
- Each `await` in the chain only runs after the previous resolves, preserving dependency order
- Wrap independent parallel work in `Promise.all()`, but keep dependent steps sequential
- A `.catch(() => [])` fallback on non-critical steps prevents one failure from aborting the whole chain
- Always expose an abort/cleanup mechanism to avoid leaks in SPA contexts

---

## Scenario 3: Memory Leak in Event Listeners on a Dynamic WordPress Page

**The situation:** A WordPress page builder renders content blocks dynamically. A "tooltip" module attaches `mouseover`/`mouseout` listeners to every rendered element. After several page transitions or block re-renders, DevTools heap snapshots reveal that thousands of detached DOM nodes are kept alive — causing sluggishness and eventual crashes.

**Solution:**

```javascript
/**
 * Memory-safe tooltip system using event delegation + WeakMap cache.
 * Avoids per-element listeners that prevent garbage collection of removed nodes.
 */

// ---- PROBLEMATIC approach (causes leaks) ----
function attachTooltipsLEAKY(container) {
  container.querySelectorAll('[data-tooltip]').forEach(el => {
    // Each listener closes over `el` — if el is removed from DOM but the
    // listener reference survives somewhere, el can never be GC'd.
    el.addEventListener('mouseover', () => showTooltip(el));
    el.addEventListener('mouseout',  () => hideTooltip(el));
    // No cleanup mechanism — listeners accumulate on re-render
  });
}

// ---- SOLUTION 1: Event Delegation ----
// Attach ONE listener to a stable ancestor; let bubbling handle child elements.
class TooltipManager {
  #tooltipEl = null;
  #container = null;

  constructor(containerSelector = '#content') {
    this.#container = document.querySelector(containerSelector);
    this.#tooltipEl = this.#createTooltipEl();
    this.#attachDelegatedListeners();
  }

  #createTooltipEl() {
    const el = document.createElement('div');
    el.id = 'js-tooltip';
    el.setAttribute('role', 'tooltip');
    el.style.cssText = 'position:fixed;display:none;z-index:9999;padding:4px 8px;background:#000;color:#fff;border-radius:4px;font-size:12px;pointer-events:none';
    document.body.appendChild(el);
    return el;
  }

  #attachDelegatedListeners() {
    // Two listeners on the container — regardless of how many children are added/removed
    this.#container.addEventListener('mouseover', this.#onMouseOver.bind(this));
    this.#container.addEventListener('mouseout',  this.#onMouseOut.bind(this));
  }

  #onMouseOver(e) {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    const text = target.dataset.tooltip;
    this.#showTooltip(text, target);
  }

  #onMouseOut(e) {
    if (!e.target.closest('[data-tooltip]')) return;
    this.#hideTooltip();
  }

  #showTooltip(text, anchor) {
    const rect = anchor.getBoundingClientRect();
    this.#tooltipEl.textContent = text;
    this.#tooltipEl.style.display = 'block';
    this.#tooltipEl.style.top  = `${rect.bottom + 6}px`;
    this.#tooltipEl.style.left = `${rect.left}px`;
  }

  #hideTooltip() {
    this.#tooltipEl.style.display = 'none';
  }

  destroy() {
    this.#container.removeEventListener('mouseover', this.#onMouseOver);
    this.#container.removeEventListener('mouseout',  this.#onMouseOut);
    this.#tooltipEl.remove();
  }
}

// ---- SOLUTION 2: AbortController for bulk listener removal ----
function attachBlockListeners(blockEl) {
  const controller = new AbortController();
  const opts = { signal: controller.signal };

  blockEl.addEventListener('click',     handleBlockClick, opts);
  blockEl.addEventListener('keydown',   handleBlockKey,   opts);
  blockEl.addEventListener('focusin',   handleFocusIn,    opts);
  blockEl.addEventListener('focusout',  handleFocusOut,   opts);

  // Return teardown function — call when the block is removed from DOM
  return () => controller.abort(); // removes ALL four listeners at once
}

// ---- SOLUTION 3: WeakMap to store per-element state without leaking ----
const tooltipState = new WeakMap(); // keys GC'd with their elements

function initTooltip(el) {
  tooltipState.set(el, { visible: false, timer: null });
}

function handleHover(el) {
  const state = tooltipState.get(el);
  if (!state) return;
  state.timer = setTimeout(() => { state.visible = true; render(el, state); }, 300);
}

// --- Tying it together in a WP page-builder context ---
const tooltips = new TooltipManager('#page-content');

// When blocks are re-rendered (e.g., Elementor widget refresh):
document.addEventListener('elementor/frontend/widgets/init', () => {
  // No need to re-init — delegation on #page-content handles new nodes automatically
});

// On SPA navigation away:
window.addEventListener('beforeunload', () => tooltips.destroy());
```

**Key takeaways:**
- **Event delegation** is the most scalable pattern: N elements → 1 listener
- `AbortController` enables clean bulk removal without storing individual listener references
- `WeakMap` stores per-element state; entries are automatically released when the element is GC'd
- Always test for leaks using Chrome DevTools: Performance Monitor (JS heap), Memory → Heap Snapshot, compare snapshots after re-rendering cycles

---

## Scenario 5: Fixing a Race Condition in Async WordPress AJAX Handlers

**Scenario:**
A WordPress admin page lets users reorder a list of items via drag-and-drop. Each drop fires an AJAX request to update the sort order in the database. Under fast dragging, multiple in-flight requests arrive at the server out of order, leaving the database in an inconsistent state.

**Challenge:**
Ensure that only the most recent drag-and-drop state is persisted, and that intermediate requests cannot overwrite a newer final order.

**Solution:**

```javascript
/**
 * Serialized AJAX queue: only the latest pending request is dispatched.
 * Previous in-flight requests are aborted before the next one fires.
 */
class SerializedAjaxQueue {
  #controller = null;
  #pending    = null; // stores { payload, resolve, reject } for the queued item
  #inflight   = false;

  enqueue( payload ) {
    return new Promise( ( resolve, reject ) => {
      // Replace any previously queued-but-not-yet-sent item
      this.#pending = { payload, resolve, reject };

      if ( ! this.#inflight ) {
        this.#flush();
      }
    } );
  }

  async #flush() {
    if ( ! this.#pending ) return;

    const { payload, resolve, reject } = this.#pending;
    this.#pending  = null;
    this.#inflight = true;

    // Abort any still-running request from the previous flush
    this.#controller?.abort();
    this.#controller = new AbortController();

    try {
      const response = await fetch( ajaxurl, {
        method:  'POST',
        signal:  this.#controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams( {
          action:   'update_sort_order',
          order:    JSON.stringify( payload.order ),
          _wpnonce: payload.nonce,
        } ),
      } );

      if ( ! response.ok ) throw new Error( `HTTP ${ response.status }` );
      const data = await response.json();
      if ( ! data.success ) throw new Error( data.data?.message ?? 'Unknown error' );

      resolve( data );
    } catch ( err ) {
      if ( err.name === 'AbortError' ) {
        // Silently discard superseded requests
      } else {
        reject( err );
      }
    } finally {
      this.#inflight = false;
      // If another item was queued while this one was in-flight, send it now
      this.#flush();
    }
  }
}

// Usage
const orderQueue = new SerializedAjaxQueue();
const nonce      = document.querySelector( '#sort-nonce' ).value;

sortableList.addEventListener( 'sortupdate', ( e ) => {
  const order = [ ...e.detail.destination.items ].map( el => el.dataset.id );

  orderQueue.enqueue( { order, nonce } )
    .then( () => showToast( 'Order saved.' ) )
    .catch( err => showToast( `Save failed: ${ err.message }`, 'error' ) );
} );
```

**Key takeaways:**
- Only the latest drag state matters — intermediate states can be safely discarded
- `AbortController` cancels in-flight superseded requests, freeing browser connections
- The serial queue guarantees that if two saves do complete, they complete in logical order
- On the PHP side, add an `updated_at` timestamp column and reject writes older than the current row to add a server-side safety net

---

## Scenario 6: Optimizing a Heavy Gutenberg Editor with React Performance Profiling

**Scenario:**
An editorial plugin adds a custom sidebar panel to the Gutenberg editor. Editors report that the editor feels laggy — keystrokes in the post title feel delayed by ~200ms and the sidebar re-renders on every keystroke even when its data has not changed.

**Challenge:**
Profile the React component tree, identify unnecessary re-renders, and apply targeted optimizations without restructuring the entire plugin.

**Solution:**

1. **Profile first with React DevTools Profiler** — in Chrome with the React DevTools extension, open the Profiler tab, record a typing session, and identify which components render on each keystroke.

2. **Isolate the source of re-renders** — look for components subscribed to frequently-changing store slices:
   ```javascript
   // BEFORE: subscribes to the entire post object — re-renders on every title keystroke
   const { post } = useSelect( select => ({
     post: select( 'core/editor' ).getCurrentPost(),
   }) );
   ```

3. **Select only the data the component needs** — narrow selectors prevent spurious re-renders:
   ```javascript
   // AFTER: only re-renders when these specific fields change
   const { postId, postStatus, postMeta } = useSelect( select => {
     const editor = select( 'core/editor' );
     return {
       postId:     editor.getCurrentPostId(),
       postStatus: editor.getEditedPostAttribute( 'status' ),
       postMeta:   editor.getEditedPostAttribute( 'meta' ),
     };
   } );
   ```

4. **Memoize expensive child components** with `React.memo` and stable callback refs:
   ```javascript
   import { memo, useCallback } from '@wordpress/element';

   // Wrap a pure display component so it only re-renders when its own props change
   const EventMetaPanel = memo( function EventMetaPanel( { meta, onUpdate } ) {
     return (
       <PanelBody title="Event Details">
         <TextControl
           label="Venue"
           value={ meta._event_venue ?? '' }
           onChange={ ( val ) => onUpdate( { _event_venue: val } ) }
         />
       </PanelBody>
     );
   } );

   // In the parent — useCallback prevents a new function reference on every render
   function PluginSidebar() {
     const { postMeta } = useSelect( /* narrow selector above */ );
     const { editPost } = useDispatch( 'core/editor' );

     const handleMetaUpdate = useCallback( ( updatedMeta ) => {
       editPost( { meta: updatedMeta } );
     }, [ editPost ] );

     return <EventMetaPanel meta={ postMeta } onUpdate={ handleMetaUpdate } />;
   }
   ```

5. **Debounce meta writes** — writing to the Redux store on every keystroke triggers a re-render cycle across all subscribed components:
   ```javascript
   import { useDebouncedCallback } from 'use-debounce'; // or implement manually

   const debouncedUpdate = useDebouncedCallback( ( meta ) => {
     editPost( { meta } );
   }, 300 );
   ```

6. **Use `useMemo` for derived data** that is expensive to compute:
   ```javascript
   const sortedAttendees = useMemo(
     () => [ ...rawAttendees ].sort( ( a, b ) => a.name.localeCompare( b.name ) ),
     [ rawAttendees ]
   );
   ```

7. **Verify improvements** — record another Profiler session and compare render counts and flame chart durations. Target: sidebar should not appear in the flame chart during title keystrokes at all.

---

## Scenario 7: Building a Real-Time Admin Notification System Using the REST API + Polling

**Scenario:**
A large WooCommerce store needs an admin dashboard widget that shows new orders in real time without requiring a page reload. WebSockets are not available on the shared hosting environment. The solution must work within WordPress's existing stack.

**Challenge:**
Implement a reliable, efficient polling mechanism that shows new orders as they arrive, handles network failures gracefully, and does not hammer the server under load.

**Solution:**

```javascript
/**
 * Adaptive REST API poller for real-time WooCommerce order notifications.
 * Backs off on failure; resumes normal cadence on recovery.
 */
class OrderNotificationPoller {
  #intervalId    = null;
  #lastOrderId   = 0;
  #failCount     = 0;
  #baseInterval  = 15_000; // 15 seconds — respectful to the server
  #maxInterval   = 120_000;
  #currentInterval;

  constructor( private readonly nonce, private readonly onNewOrders ) {
    this.#currentInterval = this.#baseInterval;
  }

  start() {
    this.#poll(); // immediate first fetch
    this.#schedule();
    // Pause polling when tab is hidden to reduce server load
    document.addEventListener( 'visibilitychange', this.#onVisibilityChange.bind( this ) );
  }

  stop() {
    clearTimeout( this.#intervalId );
    document.removeEventListener( 'visibilitychange', this.#onVisibilityChange.bind( this ) );
  }

  #onVisibilityChange() {
    if ( document.hidden ) {
      clearTimeout( this.#intervalId );
    } else {
      this.#poll();
      this.#schedule();
    }
  }

  #schedule() {
    this.#intervalId = setTimeout( async () => {
      await this.#poll();
      this.#schedule();
    }, this.#currentInterval );
  }

  async #poll() {
    try {
      const url = new URL( wpApiSettings.root + 'wc/v3/orders' );
      url.searchParams.set( 'per_page', '10' );
      url.searchParams.set( 'orderby', 'id' );
      url.searchParams.set( 'order', 'desc' );
      url.searchParams.set( 'after', new Date( Date.now() - 5 * 60_000 ).toISOString() );

      const res = await fetch( url, {
        headers: { 'X-WP-Nonce': this.nonce },
      } );

      if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );

      const orders = await res.json();
      const newOrders = orders.filter( o => o.id > this.#lastOrderId );

      if ( newOrders.length ) {
        this.#lastOrderId = newOrders[ 0 ].id;
        this.onNewOrders( newOrders );
      }

      // Reset backoff on success
      this.#failCount = 0;
      this.#currentInterval = this.#baseInterval;
    } catch ( err ) {
      this.#failCount++;
      // Exponential backoff: 15s → 30s → 60s → 120s cap
      this.#currentInterval = Math.min(
        this.#baseInterval * ( 2 ** this.#failCount ),
        this.#maxInterval
      );
      console.warn( `[OrderPoller] Error (${ this.#failCount }), retrying in ${ this.#currentInterval / 1000 }s`, err );
    }
  }
}

// Render a notification toast for each new order
function renderOrderToast( order ) {
  const toast = document.createElement( 'div' );
  toast.className = 'order-toast';
  toast.innerHTML = `
    <strong>New Order #${ order.id }</strong>
    <span>${ order.billing.first_name } ${ order.billing.last_name } — $${ order.total }</span>
    <a href="${ order._links.collection[ 0 ].href }">View</a>
  `;
  document.getElementById( 'order-notifications' ).prepend( toast );
  setTimeout( () => toast.remove(), 8_000 );
}

// Bootstrap
const poller = new OrderNotificationPoller(
  wpApiSettings.nonce,
  orders => orders.forEach( renderOrderToast )
);
poller.start();
```

**Key takeaways:**
- Pause polling when the tab is hidden (`visibilitychange`) — saves ~50% of requests for background tabs
- Exponential backoff prevents hammering a struggling server during outages
- Track `lastOrderId` rather than timestamps to avoid timezone and clock-skew bugs
- For higher scale, replace polling with a server-sent events (SSE) endpoint via a lightweight Node.js proxy or a managed service like Pusher

---

## Scenario 8: Migrating jQuery-Dependent Theme Code to Vanilla ES6+

**Scenario:**
A WordPress theme built in 2016 relies heavily on jQuery for DOM manipulation, AJAX, event handling, and animation. WordPress 6.x still ships jQuery but the team wants to move toward a jQuery-free build to reduce bundle size (~85 KB minified+gzipped) and improve performance scores.

**Challenge:**
Systematically replace jQuery patterns with native ES6+ equivalents, maintain backwards compatibility during the transition, and verify nothing breaks on older browsers still in the site's analytics.

**Solution:**

1. **Audit jQuery usage first**:
   ```bash
   # Count all jQuery usages in theme JS files
   grep -rn '\$(\|jQuery(' wp-content/themes/my-theme/js/ | wc -l

   # List the distinct jQuery methods used
   grep -ohP '\.\K(ajax|get|post|on|off|click|ready|each|find|closest|attr|data|val|css|addClass|removeClass|toggle|animate|hide|show)\b' \
     wp-content/themes/my-theme/js/*.js | sort | uniq -c | sort -rn
   ```

2. **Replace the most common patterns**:

   ```javascript
   // DOM ready
   // jQuery:   $( document ).ready( fn )
   // ES6+:
   document.addEventListener( 'DOMContentLoaded', fn );

   // Selector
   // jQuery:   $( '.card' )
   // ES6+:
   const cards = document.querySelectorAll( '.card' );

   // Each loop
   // jQuery:   $( '.card' ).each( function() { $(this).addClass('active'); } )
   // ES6+:
   document.querySelectorAll( '.card' )
     .forEach( el => el.classList.add( 'active' ) );

   // Event delegation
   // jQuery:   $( document ).on( 'click', '.accordion-header', handler )
   // ES6+:
   document.addEventListener( 'click', e => {
     if ( e.target.closest( '.accordion-header' ) ) handler( e );
   } );

   // AJAX (WordPress)
   // jQuery:   $.ajax({ url: ajaxurl, type: 'POST', data: { action: 'my_action' } })
   // ES6+:
   const res = await fetch( ajaxurl, {
     method: 'POST',
     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     body: new URLSearchParams( { action: 'my_action', _wpnonce: nonce } ),
   } );

   // CSS classes
   // jQuery:   $( el ).toggleClass( 'open', isOpen )
   // ES6+:
   el.classList.toggle( 'open', isOpen );

   // Data attributes
   // jQuery:   $( el ).data( 'post-id' )
   // ES6+:
   el.dataset.postId  // camelCased automatically

   // Animation (fade out)
   // jQuery:   $( el ).fadeOut( 300 )
   // ES6+ (CSS transition + JS):
   el.style.transition = 'opacity 300ms';
   el.style.opacity = '0';
   el.addEventListener( 'transitionend', () => el.remove(), { once: true } );
   ```

3. **Dequeue jQuery from the theme** only after all code is migrated:
   ```php
   add_action( 'wp_enqueue_scripts', function() {
       // Only dequeue on the front end — admin still needs jQuery
       if ( ! is_admin() ) {
           wp_dequeue_script( 'jquery' );
           wp_deregister_script( 'jquery' );
       }
   }, 100 );
   ```

4. **Handle plugins that still depend on jQuery** — check `wp_scripts()->registered` to see which enqueued scripts list `jquery` as a dependency before deregistering.

5. **Set up Babel + browserslist** to ensure ES6+ transpiles to the target browser range:
   ```json
   // .browserslistrc
   > 0.5%
   last 2 Chrome versions
   last 2 Firefox versions
   last 2 Safari versions
   not dead
   ```

6. **Test with Chrome DevTools coverage tab** — confirm jQuery is no longer loaded, and measure the JS byte savings in the Lighthouse performance audit.
