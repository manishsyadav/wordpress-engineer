/**
 * JavaScript Practical Examples
 * WordPress Engineer Interview Prep
 *
 * 15+ well-commented examples covering closures, async patterns,
 * DOM manipulation, prototypes, and ES6+ features in WP contexts.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLOSURE — Private Counter
// ─────────────────────────────────────────────────────────────────────────────
function makeCounter(initial = 0) {
  let count = initial; // private via closure
  return {
    increment: (by = 1) => (count += by),
    decrement: (by = 1) => (count -= by),
    reset:     ()       => (count = initial),
    value:     ()       => count,
  };
}
const likes = makeCounter();
likes.increment(); // 1
likes.increment(4); // 5
console.log(likes.value()); // 5

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEBOUNCE — Live Search with Abort
// ─────────────────────────────────────────────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Usage:
// input.addEventListener('input', debounce(searchPosts, 300));

// ─────────────────────────────────────────────────────────────────────────────
// 3. THROTTLE — Scroll Handler
// ─────────────────────────────────────────────────────────────────────────────
function throttle(fn, limit = 200) {
  let lastRan = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastRan >= limit) {
      lastRan = now;
      return fn.apply(this, args);
    }
  };
}

window.addEventListener('scroll', throttle(() => {
  const progress = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  document.getElementById('read-progress')?.style.setProperty('width', `${progress}%`);
}, 100));

// ─────────────────────────────────────────────────────────────────────────────
// 4. ASYNC/AWAIT — WP REST API Fetch with Error Handling
// ─────────────────────────────────────────────────────────────────────────────
const wpNonce = document.querySelector('meta[name="wp-nonce"]')?.content ?? '';

async function wpFetch(path, options = {}) {
  const res = await fetch(`/wp-json/wp/v2${path}`, {
    headers: { 'X-WP-Nonce': wpNonce, 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw Object.assign(new Error(err.message), { status: res.status, code: err.code });
  }
  return res.json();
}

// Fetch with pagination
async function getAllPosts(params = {}) {
  const url = new URLSearchParams({ per_page: 100, ...params });
  const res = await fetch(`/wp-json/wp/v2/posts?${url}`, { headers: { 'X-WP-Nonce': wpNonce } });
  const posts = await res.json();
  const total = Number(res.headers.get('X-WP-Total'));
  return { posts, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROMISE.ALL — Concurrent Fetches
// ─────────────────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const [posts, pages, categories] = await Promise.all([
    wpFetch('/posts?per_page=5&_fields=id,title,date'),
    wpFetch('/pages?per_page=5&_fields=id,title,status'),
    wpFetch('/categories?per_page=20&_fields=id,name,count'),
  ]);
  return { posts, pages, categories };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PROTOTYPE CHAIN — Extending a Base Class
// ─────────────────────────────────────────────────────────────────────────────
class WPPost {
  constructor(data) {
    Object.assign(this, data);
  }
  getTitle() { return this.title?.rendered ?? 'Untitled'; }
  getExcerpt(maxLen = 120) {
    const plain = this.excerpt?.rendered.replace(/<[^>]+>/g, '') ?? '';
    return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain;
  }
}

class WPProduct extends WPPost {
  get price() { return this.meta?._price ?? 0; }
  get salePrice() { return this.meta?._sale_price ?? null; }
  isOnSale() { return this.salePrice !== null && this.salePrice < this.price; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DESTRUCTURING + SPREAD — Config Merging
// ─────────────────────────────────────────────────────────────────────────────
const defaults = { perPage: 10, orderby: 'date', order: 'desc', status: 'publish', _embed: true };

function buildQuery(userOptions = {}) {
  const { _embed, ...rest } = { ...defaults, ...userOptions };
  const params = new URLSearchParams(rest);
  if (_embed) params.set('_embed', '1');
  return params.toString();
}

console.log(buildQuery({ perPage: 5, orderby: 'title' }));
// _embed=1&perPage=5&orderby=title&order=desc&status=publish

// ─────────────────────────────────────────────────────────────────────────────
// 8. GENERATOR — Paginated Resource Fetcher
// ─────────────────────────────────────────────────────────────────────────────
async function* paginatedFetch(endpoint, perPage = 20) {
  let page = 1;
  let totalPages = Infinity;
  while (page <= totalPages) {
    const res = await fetch(`/wp-json/wp/v2/${endpoint}?page=${page}&per_page=${perPage}`, {
      headers: { 'X-WP-Nonce': wpNonce },
    });
    const data = await res.json();
    totalPages = Number(res.headers.get('X-WP-TotalPages'));
    yield data;
    page++;
  }
}

// Usage:
// for await (const batch of paginatedFetch('posts')) {
//   renderBatch(batch);
// }

// ─────────────────────────────────────────────────────────────────────────────
// 9. PROXY — Reactive Settings Object
// ─────────────────────────────────────────────────────────────────────────────
function createReactiveSettings(initial, onChange) {
  return new Proxy({ ...initial }, {
    set(target, key, value) {
      const old = target[key];
      Reflect.set(target, key, value);
      if (old !== value) onChange({ key, value, old });
      return true;
    },
  });
}

const settings = createReactiveSettings(
  { theme: 'light', perPage: 10 },
  ({ key, value }) => console.log(`Setting changed: ${key} = ${value}`)
);
settings.theme = 'dark'; // triggers onChange

// ─────────────────────────────────────────────────────────────────────────────
// 10. WEAKMAP — DOM Node Cache Without Memory Leaks
// ─────────────────────────────────────────────────────────────────────────────
const computedCache = new WeakMap();

function getComputedData(el) {
  if (computedCache.has(el)) return computedCache.get(el);
  const data = {
    boundingRect: el.getBoundingClientRect(),
    styles:       getComputedStyle(el),
    computed:     Date.now(), // placeholder for expensive computation
  };
  computedCache.set(el, data);
  return data; // GC'd automatically when el is removed from DOM
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. OPTIONAL CHAINING + NULLISH COALESCING — API Response Safety
// ─────────────────────────────────────────────────────────────────────────────
function normalisePost(raw) {
  return {
    id:          raw.id,
    title:       raw.title?.rendered ?? 'Untitled',
    excerpt:     raw.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim() ?? '',
    featuredImg: raw._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
    authorName:  raw._embedded?.author?.[0]?.name ?? 'Unknown',
    tags:        raw._embedded?.['wp:term']?.flat().filter(t => t.taxonomy === 'post_tag') ?? [],
    categories:  raw._embedded?.['wp:term']?.flat().filter(t => t.taxonomy === 'category') ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. EVENT DELEGATION — Dynamic Post List Actions
// ─────────────────────────────────────────────────────────────────────────────
document.querySelector('#posts-list')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const { action, postId } = btn.dataset;
  btn.disabled = true;

  try {
    switch (action) {
      case 'delete':
        await wpFetch(`/posts/${postId}`, { method: 'DELETE' });
        btn.closest('.post-item').remove();
        break;
      case 'trash':
        await wpFetch(`/posts/${postId}`, { method: 'DELETE', body: JSON.stringify({ force: false }) });
        btn.closest('.post-item').classList.add('trashed');
        break;
      case 'toggle-sticky': {
        const post  = await wpFetch(`/posts/${postId}?_fields=id,sticky`);
        const updated = await wpFetch(`/posts/${postId}`, {
          method: 'POST',
          body: JSON.stringify({ sticky: !post.sticky }),
        });
        btn.textContent = updated.sticky ? 'Unpin' : 'Pin';
        break;
      }
    }
  } catch (err) {
    alert(`Action failed: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. MODULE PATTERN — IIFE No-Conflict WP Plugin
// ─────────────────────────────────────────────────────────────────────────────
const MyPlugin = (function ($, wp) {
  // Private
  let isInitialised = false;
  const state = { posts: [], page: 1 };

  function fetchMore() {
    $.ajax({
      url: wp.ajax.settings.url,
      method: 'POST',
      data: { action: 'my_plugin_load_more', page: state.page++, nonce: MyPluginData.nonce },
      success(res) {
        if (res.success) {
          state.posts.push(...res.data.posts);
          render(res.data.posts);
        }
      },
    });
  }

  function render(posts) {
    const html = posts.map(p => `<article class="post"><h2>${p.title}</h2></article>`).join('');
    $('#my-plugin-container').append(html);
  }

  // Public API
  return {
    init() {
      if (isInitialised) return;
      isInitialised = true;
      $('#load-more-btn').on('click', fetchMore);
    },
  };
}(jQuery, window.wp || {}));

jQuery(MyPlugin.init.bind(MyPlugin));

// ─────────────────────────────────────────────────────────────────────────────
// 14. ERROR BOUNDARIES — Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('unhandledrejection', (event) => {
  const { reason } = event;
  console.error('[Unhandled Promise Rejection]', reason);

  // Report to WP admin error log endpoint
  if (typeof wpApiSettings !== 'undefined') {
    navigator.sendBeacon('/wp-admin/admin-ajax.php', JSON.stringify({
      action:  'log_js_error',
      nonce:   wpApiSettings.nonce,
      message: reason?.message ?? String(reason),
      stack:   reason?.stack ?? '',
      url:     location.href,
    }));
  }

  event.preventDefault(); // suppress default console warning (optional)
});

window.addEventListener('error', ({ message, filename, lineno, colno, error }) => {
  console.error('[Uncaught JS Error]', { message, filename, lineno, colno });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. INTERSECTION OBSERVER — Lazy Load Posts (Infinite Scroll)
// ─────────────────────────────────────────────────────────────────────────────
class InfiniteScroll {
  #page = 1;
  #loading = false;
  #exhausted = false;
  #sentinel;
  #observer;

  constructor({ container, endpoint, perPage = 10, renderFn }) {
    this.container  = document.querySelector(container);
    this.endpoint   = endpoint;
    this.perPage    = perPage;
    this.renderFn   = renderFn;

    this.#sentinel = document.createElement('div');
    this.#sentinel.className = 'scroll-sentinel';
    this.container.after(this.#sentinel);

    this.#observer = new IntersectionObserver(this.#onIntersect.bind(this), { threshold: 0.1 });
    this.#observer.observe(this.#sentinel);
  }

  async #onIntersect([entry]) {
    if (!entry.isIntersecting || this.#loading || this.#exhausted) return;
    this.#loading = true;

    try {
      const url = `/wp-json/wp/v2/${this.endpoint}?page=${this.#page}&per_page=${this.perPage}&_fields=id,title,link,excerpt`;
      const res  = await fetch(url, { headers: { 'X-WP-Nonce': wpNonce } });
      const data = await res.json();

      if (!data.length) { this.#exhausted = true; this.#observer.disconnect(); return; }
      this.renderFn(data, this.container);
      this.#page++;
    } catch (err) {
      console.error('Infinite scroll error:', err);
    } finally {
      this.#loading = false;
    }
  }

  destroy() { this.#observer.disconnect(); this.#sentinel.remove(); }
}

// Usage:
// new InfiniteScroll({
//   container: '#blog-feed',
//   endpoint:  'posts',
//   renderFn:  (posts, el) => el.insertAdjacentHTML('beforeend', posts.map(renderCard).join('')),
// });

// ─────────────────────────────────────────────────────────────────────────────
// 16. STRUCTURED CLONE + HISTORY API — SPA-style Post Navigation
// ─────────────────────────────────────────────────────────────────────────────
const postCache = new Map();

async function navigateToPost(postId) {
  if (!postCache.has(postId)) {
    const post = await wpFetch(`/posts/${postId}?_embed`);
    postCache.set(postId, structuredClone(post)); // deep-frozen copy in cache
  }
  const cached = postCache.get(postId);
  renderPost(cached);

  history.pushState({ postId }, cached.title.rendered, cached.link);
  document.title = `${cached.title.rendered} — ${document.querySelector('meta[property="og:site_name"]')?.content}`;
}

window.addEventListener('popstate', ({ state }) => {
  if (state?.postId) navigateToPost(state.postId);
});

function renderPost(post) {
  document.querySelector('.entry-title').innerHTML  = post.title.rendered;
  document.querySelector('.entry-content').innerHTML = post.content.rendered;
}
