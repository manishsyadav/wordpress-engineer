# JavaScript — Interview Questions

> Basic / Mid-Level / Advanced Q&A with inline code examples.

---

## Basic Questions

**Q1: What is the difference between `var`, `let`, and `const`?**

**A:** `var` is function-scoped and hoisted (initialised to `undefined`). `let` and `const` are block-scoped and live in the Temporal Dead Zone until their declaration. `const` additionally prevents reassignment of the binding (the value itself may still mutate if it is an object). In modern WordPress development, `var` is avoided in favour of `let`/`const`.

```javascript
function example() {
  if (true) {
    var x = 1;   // function-scoped — accessible outside the block
    let y = 2;   // block-scoped — not accessible outside
    const z = 3; // block-scoped + non-reassignable
  }
  console.log(x); // 1
  console.log(y); // ReferenceError
}

const arr = [1, 2, 3];
arr.push(4);    // allowed — mutation, not reassignment
// arr = [];   // TypeError — reassignment not allowed
```

---

**Q2: What is `===` vs `==` in JavaScript?**

**A:** `==` performs **type coercion** before comparison, producing surprising results. `===` (strict equality) compares both value and type with no coercion. Always use `===` in production code unless you intentionally need coercion (rare).

```javascript
0 == false    // true  (coercion: false → 0)
0 === false   // false (number vs boolean)
'' == false   // true
'' === false  // false
null == undefined  // true  (special rule)
null === undefined // false

// Common gotcha in WP AJAX callbacks
if (response.data == 0) { /* triggered for '', false, null too */ }
if (response.data === 0) { /* only actual zero */                  }
```

---

**Q3: Explain how `this` works in JavaScript.**

**A:** `this` refers to the execution context. In a regular function it is determined by the call site; in arrow functions it is lexically inherited from the enclosing scope. In strict mode, `this` inside a plain function call is `undefined` rather than the global object. `.call()`, `.apply()`, and `.bind()` explicitly set `this`.

```javascript
const obj = {
  name: 'Widget',
  regularFn: function() { return this.name; }, // 'Widget'
  arrowFn:   () => this?.name,                 // undefined (lexical — outer this)
  delayedRegular() {
    setTimeout(function()      { console.log(this.name); }, 100); // undefined/global
    setTimeout(() =>           { console.log(this.name); }, 100); // 'Widget' ✓
    setTimeout(function()      { console.log(this.name); }.bind(this), 100); // 'Widget' ✓
  },
};
```

---

**Q4: What are the falsy values in JavaScript?**

**A:** There are exactly six falsy values: `false`, `0`, `-0`, `0n` (BigInt zero), `''` (empty string), `null`, `undefined`, and `NaN`. Everything else is truthy — including `'0'`, `[]`, and `{}`. This matters when guarding WordPress API responses.

```javascript
const falsyValues = [false, 0, -0, 0n, '', null, undefined, NaN];
falsyValues.every(v => !v); // true

// Practical WP guard
const title = post.title?.rendered || 'Untitled'; // '' → 'Untitled'
const count = post.meta?.views  ?? 0;             // null/undefined → 0, but 0 stays 0
```

---

**Q5: What is event bubbling and how do you stop it?**

**A:** When an event fires on a DOM element, it first triggers listeners on that element, then propagates ("bubbles") up through ancestors. `event.stopPropagation()` halts bubbling; `event.preventDefault()` cancels the default browser action. Event delegation exploits bubbling by attaching a single listener to a parent.

```javascript
document.querySelector('#parent').addEventListener('click', (e) => {
  // Delegation: handle clicks on dynamically added children
  if (e.target.matches('.delete-post')) {
    e.stopPropagation(); // prevent parent handlers from firing
    e.preventDefault();  // prevent default anchor navigation
    deletePost(e.target.dataset.id);
  }
});
```

---

## Mid-Level Questions

**Q6: Explain the difference between `call`, `apply`, and `bind`.**

**A:** All three set the `this` context for a function. `call` invokes immediately with arguments listed individually. `apply` invokes immediately with arguments as an array. `bind` returns a *new* function with `this` permanently bound (and optionally partially applied arguments) — it does not invoke immediately. `bind` is commonly used in React class components and event handler setup.

```javascript
function formatPost(separator, suffix) {
  return `${this.title}${separator}${this.author}${suffix}`;
}
const post = { title: 'Hello World', author: 'Jane' };

formatPost.call(post,  ' | ', ' [end]');              // immediate, spread args
formatPost.apply(post, [' | ', ' [end]']);             // immediate, array args
const boundFormat = formatPost.bind(post, ' — ');      // new fn, partial application
boundFormat('.');                                       // "Hello World — Jane."
```

---

**Q7: What is a Promise and how does error handling work in async/await?**

**A:** A Promise is a proxy for a value that is not yet known. It can be `pending`, `fulfilled`, or `rejected`. With `async/await`, use `try/catch` to handle rejections synchronously. Unhandled rejections should be caught at the top level or via `window.addEventListener('unhandledrejection', ...)`. `finally` runs regardless of outcome, useful for cleanup (hiding spinners, etc.).

```javascript
async function savePost(postData) {
  const spinner = document.getElementById('spinner');
  spinner.hidden = false;
  try {
    const res = await fetch('/wp-json/wp/v2/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpApiSettings.nonce },
      body: JSON.stringify(postData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Save failed:', err.message);
    throw err; // re-throw so callers can react
  } finally {
    spinner.hidden = true; // always runs
  }
}
```

---

**Q8: What is the difference between shallow copy and deep copy?**

**A:** A shallow copy duplicates the top-level properties but nested objects/arrays still share the same reference. A deep copy recursively duplicates everything. `Object.assign({}, obj)` and `{...obj}` are shallow. `structuredClone()` (modern) and `JSON.parse(JSON.stringify())` (limited — loses functions, Dates become strings) produce deep copies.

```javascript
const original = { title: 'Post', meta: { views: 10, tags: ['wp'] } };

// Shallow — meta still shared
const shallow = { ...original };
shallow.meta.views = 99; // also mutates original.meta.views!

// Deep copy (modern)
const deep = structuredClone(original);
deep.meta.views = 99; // original unchanged

// JSON deep copy caveat
const withDate = { date: new Date(), fn: () => {} };
const jsonCopy = JSON.parse(JSON.stringify(withDate));
// jsonCopy.date is a string; jsonCopy.fn is undefined
```

---

**Q9: How does debouncing differ from throttling, and when do you use each?**

**A:** **Debouncing** delays execution until a pause in events (fires once after the last event). **Throttling** limits how often a function fires (fires at most once per interval). Use debounce for search inputs (wait for user to stop typing), use throttle for scroll/resize handlers (limit repaints).

```javascript
// Debounce — executes AFTER the user stops typing for 300ms
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Throttle — executes at most every 200ms
function throttle(fn, limit) {
  let lastRun = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastRun >= limit) {
      lastRun = now;
      return fn.apply(this, args);
    }
  };
}

const searchInput = document.getElementById('wp-search');
searchInput.addEventListener('input', debounce(async (e) => {
  const posts = await fetch(`/wp-json/wp/v2/posts?search=${encodeURIComponent(e.target.value)}`);
  renderResults(await posts.json());
}, 300));
```

---

**Q10: What is the module pattern and how does it relate to IIFE?**

**A:** The **IIFE** (Immediately Invoked Function Expression) creates a private scope, preventing variable pollution of the global namespace — critical in WordPress where dozens of scripts share `window`. The **Module Pattern** uses an IIFE that returns a public API while keeping private state enclosed.

```javascript
// Classic WP no-conflict module pattern
const WPSlider = (function($) {
  // Private state
  let currentSlide = 0;
  const slides = [];

  // Private function
  function updateDOM() {
    slides.forEach((s, i) => s.toggleClass('active', i === currentSlide));
  }

  // Public API
  return {
    init(selector) {
      $(selector).each(function() { slides.push($(this)); });
      updateDOM();
    },
    next() { currentSlide = (currentSlide + 1) % slides.length; updateDOM(); },
    prev() { currentSlide = (currentSlide - 1 + slides.length) % slides.length; updateDOM(); },
  };
}(jQuery));

WPSlider.init('.slide');
WPSlider.next();
```

---

## Advanced Questions

**Q11: Explain microtasks vs macrotasks and the implications for UI rendering.**

**A:** Microtasks (Promise callbacks, `queueMicrotask`, MutationObserver) run after every macrotask and before the browser paints. An unbroken chain of microtasks can starve the render pipeline — the browser never gets a chance to paint. Macrotasks (setTimeout, setInterval, I/O events, message-channel posts) yield to the renderer between them. Understanding this is crucial when batching DOM updates in Gutenberg's React reconciliation cycle.

```javascript
// Scheduling expensive work to not block rendering
function processInChunks(items, processOne, chunkSize = 50) {
  let index = 0;
  function processChunk() {
    const end = Math.min(index + chunkSize, items.length);
    for (; index < end; index++) processOne(items[index]);
    if (index < items.length) {
      // Yield to renderer between chunks via macrotask
      setTimeout(processChunk, 0);
    }
  }
  processChunk();
}

// MutationObserver fires as microtask — immediate after DOM change
const observer = new MutationObserver((mutations) => {
  // Runs before next paint
  for (const m of mutations) console.log(m.type);
});
observer.observe(document.body, { childList: true, subtree: true });
```

---

**Q12: How does JavaScript garbage collection work and what causes memory leaks?**

**A:** V8 uses a generational GC (minor/major GC). Objects unreachable from GC roots are collected. Common leak sources in WordPress JS: forgotten event listeners on removed DOM nodes, closures holding references to large data, global variables, timers never cleared, and WeakMap alternatives (regular Maps) holding DOM keys. Use Chrome DevTools Heap Snapshots and the Memory panel to diagnose.

```javascript
// LEAK: listener added but never removed
function attachSearch() {
  const data = new Array(10000).fill({ title: 'post' }); // large closure
  document.getElementById('search').addEventListener('input', function handler() {
    console.log(data.length); // keeps `data` alive as long as listener exists
  });
  // BUG: element removed later but listener (and `data`) never GC'd
}

// FIX: use AbortController for cleanup
function attachSearch() {
  const controller = new AbortController();
  const data = new Array(10000).fill({ title: 'post' });
  document.getElementById('search').addEventListener('input', () => {
    console.log(data.length);
  }, { signal: controller.signal });
  return () => controller.abort(); // call this to clean up
}
```

---

**Q13: What are JavaScript Proxies and how can they be used for reactivity?**

**A:** A `Proxy` intercepts and customises fundamental operations on an object via trap functions. Vue 3's reactivity system is built on `Proxy` — setting a property triggers subscribers. Compared to `Object.defineProperty` (Vue 2), `Proxy` handles dynamic property additions, array index mutations, and `delete` natively.

```javascript
function reactive(data, onChange) {
  return new Proxy(data, {
    set(target, key, value) {
      const old = target[key];
      const result = Reflect.set(target, key, value);
      if (old !== value) onChange(key, value, old);
      return result;
    },
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key);
      onChange(key, undefined, target[key]);
      return result;
    },
  });
}

const state = reactive({ count: 0, title: '' }, (key, newVal) => {
  document.querySelector(`[data-bind="${key}"]`)
    ?.forEach(el => { el.textContent = newVal; });
});

state.count = 5; // triggers onChange, updates DOM
```

---

**Q14: Explain `Symbol` and its use cases in JavaScript.**

**A:** A `Symbol` is a guaranteed-unique primitive value. They are non-enumerable by default (not in `for...in` loops or `JSON.stringify`), making them ideal for "hidden" properties and meta-programming. Well-known Symbols (`Symbol.iterator`, `Symbol.toPrimitive`, `Symbol.hasInstance`) allow custom hook-ins to built-in JS operations.

```javascript
// Unique property keys — no collision risk with other libraries
const INTERNAL_STATE = Symbol('internalState');
class BlockEditor {
  constructor() {
    this[INTERNAL_STATE] = { dirty: false };
  }
  markDirty() { this[INTERNAL_STATE].dirty = true; }
}

// Custom iterator via Symbol.iterator
const postCollection = {
  posts: [{ id: 1 }, { id: 2 }, { id: 3 }],
  [Symbol.iterator]() {
    let i = 0;
    return {
      next: () => i < this.posts.length
        ? { value: this.posts[i++], done: false }
        : { done: true },
    };
  },
};
for (const post of postCollection) { console.log(post.id); } // 1, 2, 3
```

---

**Q15: How does `async`/`await` interact with `Promise.all` and what are the concurrency implications?**

**A:** Sequential `await` calls execute one after another — the total time is the sum of all durations. `Promise.all()` fires all promises concurrently — total time is the duration of the longest promise. `Promise.allSettled()` is preferred when you need all results regardless of individual failures. Avoid unnecessary sequential awaits in WordPress plugin initialisation or REST API batching.

```javascript
// BAD: sequential — 300ms + 200ms + 250ms = 750ms total
async function loadDashboardSlow() {
  const posts    = await fetchPosts();    // 300ms
  const users    = await fetchUsers();    // 200ms
  const comments = await fetchComments(); // 250ms
  return { posts, users, comments };
}

// GOOD: concurrent — max(300, 200, 250) = 300ms total
async function loadDashboardFast() {
  const [posts, users, comments] = await Promise.all([
    fetchPosts(), fetchUsers(), fetchComments(),
  ]);
  return { posts, users, comments };
}

// Resilient — partial failures don't block the rest
async function loadDashboardResilient() {
  const results = await Promise.allSettled([
    fetchPosts(), fetchUsers(), fetchComments(),
  ]);
  return results.map(r => r.status === 'fulfilled' ? r.value : null);
}
```
