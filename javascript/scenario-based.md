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
