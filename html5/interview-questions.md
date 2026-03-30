# HTML5 — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What does the `<!DOCTYPE html>` declaration do?**

**A:** It tells the browser to render the page in standards mode rather than quirks mode. Without it, browsers apply legacy rendering rules that can break modern CSS and layouts.
```html
<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8"><title>Page</title></head>
  <body></body>
</html>
```

**Q2: What is the difference between `<div>` and `<section>`?**

**A:** `<div>` is a generic non-semantic container. `<section>` is a semantic element that groups thematically related content and should have a heading, improving accessibility and SEO.
```html
<section>
  <h2>Latest Posts</h2>
  <article>...</article>
</section>
<div class="layout-wrapper"><!-- purely visual --></div>
```

**Q3: What is the difference between `<article>` and `<section>`?**

**A:** `<article>` represents a self-contained, independently distributable piece of content (post, comment, widget). `<section>` groups related content that is part of a larger whole.
```html
<article>
  <h2>Post Title</h2>
  <p>Post content that stands on its own.</p>
</article>
```

**Q4: What semantic elements define the outer structure of a page?**

**A:** `<header>`, `<nav>`, `<main>`, `<aside>`, and `<footer>` define the key regions. Browsers and assistive technologies use them to provide landmark navigation.
```html
<body>
  <header><nav>...</nav></header>
  <main>
    <aside>Sidebar</aside>
    <section>Content</section>
  </main>
  <footer>...</footer>
</body>
```

**Q5: What HTML5 input types improve mobile UX?**

**A:** `email`, `tel`, `url`, `number`, `date`, `range`, and `color` trigger the appropriate on-screen keyboard or picker on mobile and enable built-in browser validation.
```html
<input type="email"  name="email"  placeholder="you@example.com">
<input type="tel"    name="phone"  placeholder="+1 555 000 0000">
<input type="number" name="qty"    min="1" max="99">
<input type="date"   name="dob">
```

**Q6: What do the `required`, `pattern`, and `placeholder` attributes do?**

**A:** `required` prevents form submission when the field is empty. `pattern` validates the value against a regex. `placeholder` shows hint text that disappears on input — it is not a label replacement.
```html
<input type="text" name="postcode"
  required
  pattern="[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}"
  placeholder="SW1A 1AA">
```

**Q7: How do `<audio>` and `<video>` elements work?**

**A:** They embed media with native browser controls. Multiple `<source>` children list fallback formats; the browser picks the first it supports. The `controls` attribute renders the default playback UI.
```html
<video controls width="640" poster="thumb.jpg">
  <source src="video.webm" type="video/webm">
  <source src="video.mp4"  type="video/mp4">
  <p>Your browser does not support HTML5 video.</p>
</video>
```

**Q8: What are `data-*` attributes used for?**
**A:** `data-*` attributes store custom data on HTML elements without using non-standard attributes. JavaScript reads them via `dataset`, and they do not affect rendering or semantics.
```html
<button data-post-id="42" data-action="like">Like</button>
<script>
  document.querySelector('button').addEventListener('click', e => {
    console.log(e.target.dataset.postId); // "42"
  });
</script>
```

**Q9: What does the `meta viewport` tag do?**

**A:** It instructs the browser to set the viewport width to the device width and start at 1× zoom, preventing mobile browsers from scaling down a desktop layout into a tiny view.
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

**Q10: What are Open Graph tags and why are they important?**

**A:** Open Graph `<meta>` tags (prefixed `og:`) define how a page appears when shared on social platforms like Facebook and LinkedIn — controlling title, description, image, and URL.
```html
<meta property="og:title"       content="My Post Title">
<meta property="og:description" content="A short description.">
<meta property="og:image"       content="https://example.com/image.jpg">
<meta property="og:url"         content="https://example.com/post">
```

**Q11: What is schema.org JSON-LD and why use it?**

**A:** JSON-LD is Google's preferred method to embed structured data in a `<script type="application/ld+json">` block. It helps search engines understand content and can enable rich results (breadcrumbs, FAQs, etc.).
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Post Title",
  "author": {"@type": "Person", "name": "Jane Doe"},
  "datePublished": "2025-01-15"
}
</script>
```

**Q12: What is the `autocomplete` attribute and when should you disable it?**

**A:** `autocomplete` hints to the browser to prefill form fields from saved data. Use token values like `"email"` or `"current-password"` to help password managers; set `"off"` only for one-time security codes.
```html
<input type="email"    name="email"    autocomplete="email">
<input type="password" name="password" autocomplete="current-password">
<input type="text"     name="otp"      autocomplete="one-time-code">
```

**Q13: What is the difference between `localStorage` and `sessionStorage`?**

**A:** Both store string key-value pairs client-side. `localStorage` persists until explicitly cleared. `sessionStorage` is scoped to the browser tab and cleared when the tab closes.
```js
localStorage.setItem('theme', 'dark');
console.log(localStorage.getItem('theme')); // 'dark'

sessionStorage.setItem('draft', JSON.stringify({ title: 'Hello' }));
```

**Q14: How do `async` and `defer` script attributes differ?**

**A:** Both download the script in parallel without blocking HTML parsing. `async` executes immediately when downloaded (unpredictable order). `defer` executes in source order after the DOM is fully parsed.
```html
<!-- Third-party analytics: order does not matter -->
<script src="analytics.js" async></script>

<!-- App bundle: must run after DOM is ready, in order -->
<script src="app.js" defer></script>
```

**Q15: What is lazy loading and how do you enable it natively?**

**A:** Native lazy loading defers loading of off-screen images and iframes until they approach the viewport, reducing initial page weight. Add `loading="lazy"` to the element.
```html
<img src="photo.jpg"
     alt="Scenic landscape"
     width="800" height="600"
     loading="lazy">

<iframe src="map.html" loading="lazy" title="Location map"></iframe>
```

**Q16: What is the `<picture>` element and how does it differ from `srcset`?**

**A:** `<picture>` allows art-direction: serving completely different images per breakpoint via `<source media="…">`. `srcset` on `<img>` serves the same image at different resolutions/sizes without changing the crop.
```html
<picture>
  <source media="(max-width: 600px)" srcset="hero-mobile.webp" type="image/webp">
  <source srcset="hero-desktop.webp" type="image/webp">
  <img src="hero-desktop.jpg" alt="Hero image" width="1200" height="600">
</picture>
```

**Q17: What do `<link rel="preload">`, `rel="prefetch"`, and `rel="preconnect"` do?**

**A:** `preload` fetches a critical resource for the current page immediately. `prefetch` fetches a resource needed for a likely future navigation at low priority. `preconnect` establishes the TCP/TLS connection to a third-party origin early.
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload"    href="hero.webp" as="image">
<link rel="prefetch"   href="/next-page.html">
```

**Q18: What is the Critical Rendering Path?**

**A:** The CRP is the sequence of steps the browser takes to paint pixels: parse HTML → build DOM, parse CSS → build CSSOM, combine into render tree, layout, then paint. Blocking resources in `<head>` delay this path.
```html
<!-- Inline critical CSS to unblock rendering -->
<style>body{margin:0;font-family:sans-serif}</style>
<!-- Load non-critical CSS asynchronously -->
<link rel="stylesheet" href="non-critical.css" media="print"
      onload="this.media='all'">
```

**Q19: What is a Service Worker and how do you register one?**

**A:** A Service Worker is a JavaScript file that runs in a background thread, intercepts network requests, and enables offline caching, push notifications, and background sync.
```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then(reg => console.log('SW registered:', reg.scope))
    .catch(err => console.error('SW failed:', err));
}
```

**Q20: How does the `<canvas>` element work for 2D drawing?**

**A:** `<canvas>` is a bitmap drawing surface. You obtain a 2D context via `getContext('2d')` and use its imperative API to draw shapes, text, and images programmatically.
```html
<canvas id="myCanvas" width="300" height="150"></canvas>
<script>
  const ctx = document.getElementById('myCanvas').getContext('2d');
  ctx.fillStyle = '#3498db';
  ctx.fillRect(20, 20, 100, 50);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('Hello Canvas', 30, 50);
</script>
```

---

## Mid

**Q21: What are ARIA roles and when should you use them?**

**A:** ARIA roles (`role="..."`) provide semantic meaning to elements that lack native HTML semantics. Use them as a last resort — prefer native elements (`<button>`, `<nav>`) since they include built-in accessibility for free.
```html
<!-- Prefer native -->
<nav aria-label="Main navigation">...</nav>

<!-- ARIA when native is unavailable -->
<div role="tablist">
  <div role="tab" aria-selected="true" tabindex="0">Tab 1</div>
  <div role="tab" aria-selected="false" tabindex="-1">Tab 2</div>
</div>
```

**Q22: What are `aria-label`, `aria-labelledby`, and `aria-describedby`?**

**A:** `aria-label` provides an accessible name directly. `aria-labelledby` references another element's text as the name. `aria-describedby` links to supplementary description text.
```html
<button aria-label="Close dialog">✕</button>

<h2 id="dlg-title">Confirm Delete</h2>
<dialog aria-labelledby="dlg-title" aria-describedby="dlg-desc">
  <p id="dlg-desc">This action cannot be undone.</p>
</dialog>
```

**Q23: What are ARIA live regions?**

**A:** Live regions announce dynamic content changes to screen readers without requiring focus to move. `aria-live="polite"` waits for the user to finish; `"assertive"` interrupts immediately.
```html
<div role="status" aria-live="polite" aria-atomic="true">
  <!-- Injecting text here triggers a screen reader announcement -->
  Form saved successfully.
</div>
<div role="alert" aria-live="assertive">
  Error: Please enter a valid email.
</div>
```

**Q24: What is IndexedDB and how does it differ from localStorage?**

**A:** IndexedDB is a transactional, key-value database in the browser that stores structured objects, supports indexes, and handles large amounts of data asynchronously. `localStorage` is synchronous and limited to strings and ~5 MB.
```js
const req = indexedDB.open('myDB', 1);
req.onupgradeneeded = e => {
  e.target.result.createObjectStore('posts', { keyPath: 'id' });
};
req.onsuccess = e => {
  const db = e.target.result;
  const tx = db.transaction('posts', 'readwrite');
  tx.objectStore('posts').put({ id: 1, title: 'Hello IDB' });
};
```

**Q25: How does the Intersection Observer API enable lazy loading?**

**A:** `IntersectionObserver` fires a callback when a target element enters or exits the viewport. It is far more efficient than scroll event listeners for triggering lazy loads or animations.
```js
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.src = entry.target.dataset.src;
      observer.unobserve(entry.target);
    }
  });
}, { rootMargin: '200px' });

document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
```

**Q26: How does the Drag and Drop API work?**

**A:** Make an element draggable with `draggable="true"`, store data in `dragstart` via `dataTransfer.setData`, prevent default on `dragover`, then retrieve data in `drop`.
```html
<div draggable="true" id="card">Drag me</div>
<div id="drop-zone">Drop here</div>
<script>
  document.getElementById('card').addEventListener('dragstart', e =>
    e.dataTransfer.setData('text/plain', 'card'));
  const zone = document.getElementById('drop-zone');
  zone.addEventListener('dragover', e => e.preventDefault());
  zone.addEventListener('drop', e => { e.preventDefault();
    zone.textContent = 'Dropped: ' + e.dataTransfer.getData('text/plain'); });
</script>
```

**Q27: How does the Geolocation API work?**

**A:** `navigator.geolocation.getCurrentPosition()` prompts the user for permission and then asynchronously returns coordinates. Handle both success and error callbacks.
```js
navigator.geolocation.getCurrentPosition(
  pos => {
    const { latitude, longitude } = pos.coords;
    console.log(`Lat: ${latitude}, Lng: ${longitude}`);
  },
  err => console.error('Geolocation error:', err.message),
  { enableHighAccuracy: true, timeout: 5000 }
);
```

**Q28: What are Web Components and what are their three core technologies?**

**A:** Web Components are a set of native browser APIs for creating reusable custom elements. The three pillars are: Custom Elements (define new HTML tags), Shadow DOM (encapsulated DOM/CSS), and HTML Templates (`<template>`/`<slot>`).
```js
class MyCard extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>:host { display: block; border: 1px solid #ccc; padding: 1rem; }</style>
      <slot></slot>`;
  }
}
customElements.define('my-card', MyCard);
```

**Q29: What is Shadow DOM and what problem does it solve?**

**A:** Shadow DOM attaches an encapsulated DOM tree to an element; styles defined inside do not leak out and external styles cannot bleed in. It solves CSS collisions in reusable components.
```js
const host = document.getElementById('widget');
const shadow = host.attachShadow({ mode: 'open' });
shadow.innerHTML = `
  <style>p { color: red; }</style>
  <p>This red style is scoped to the shadow root only.</p>`;
```

**Q30: What is the `srcset` attribute and when do you use the `sizes` attribute with it?**

**A:** `srcset` lists candidate image URLs with width descriptors. `sizes` tells the browser how wide the image will be rendered at each breakpoint so it can pick the optimal candidate before layout completes.
```html
<img
  src="photo-800.jpg"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px"
  alt="A landscape photo"
  width="800" height="600">
```

**Q31: What is WCAG 2.1 AA and what are its four core principles?**

**A:** WCAG 2.1 AA is the accessibility conformance level required by most regulations. Its four principles (POUR): Perceivable, Operable, Understandable, and Robust. Key AA requirements include 4.5:1 text contrast and full keyboard operability.
```html
<!-- AA: minimum 4.5:1 contrast ratio -->
<p style="color:#595959; background:#fff;">
  This dark grey on white meets AA contrast.
</p>
<!-- AA: visible focus indicator required -->
<a href="#main" class="skip-link">Skip to main content</a>
```

**Q32: What is a skip link and why is it important for accessibility?**

**A:** A skip link is a visually hidden anchor at the top of the page that jumps keyboard users past the navigation directly to the main content, preventing them from tabbing through every nav item on every page.
```html
<a class="skip-link" href="#main-content">Skip to main content</a>
<style>
  .skip-link { position:absolute; left:-999px; }
  .skip-link:focus { left:0; top:0; z-index:9999; }
</style>
<main id="main-content">...</main>
```

**Q33: How does focus management work in single-page applications?**

**A:** After a route change or modal open, programmatically move focus to a meaningful element (page heading or dialog) so keyboard and screen reader users know where they are. Use `element.focus()` after the DOM updates.
```js
// After route change, move focus to the new page heading
router.afterEach(() => {
  nextTick(() => {
    const heading = document.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  });
});
```

**Q34: What is WebRTC and what are its core components?**

**A:** WebRTC enables peer-to-peer audio, video, and data communication directly between browsers. Core components: `RTCPeerConnection` (media/data transport), `RTCDataChannel` (arbitrary data), and `getUserMedia` (camera/mic access).
```js
const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => stream.getTracks().forEach(t => pc.addTrack(t, stream)));
pc.createOffer().then(offer => pc.setLocalDescription(offer));
```

**Q35: How do you register and use an HTML `<template>`?**

**A:** A `<template>` element holds inert HTML that is not rendered. Clone its content with `importNode` or `cloneNode` to stamp out instances efficiently without re-parsing HTML strings.
```html
<template id="card-tpl">
  <article class="card">
    <h2 class="card__title"></h2>
    <p class="card__body"></p>
  </article>
</template>
<script>
  const tpl = document.getElementById('card-tpl').content;
  const clone = document.importNode(tpl, true);
  clone.querySelector('.card__title').textContent = 'Hello';
  document.body.appendChild(clone);
</script>
```

**Q36: What is the `<dialog>` element and how do you control it?**

**A:** `<dialog>` is a native modal/non-modal dialog element. Call `.showModal()` for a modal (with backdrop and focus trap) or `.show()` for non-modal. It emits a `close` event when dismissed.
```html
<dialog id="myDialog">
  <p>Are you sure?</p>
  <button id="closeBtn">Close</button>
</dialog>
<button onclick="document.getElementById('myDialog').showModal()">Open</button>
<script>
  document.getElementById('closeBtn').addEventListener('click', () =>
    document.getElementById('myDialog').close());
</script>
```

**Q37: What is the `<details>` and `<summary>` element combination?**

**A:** `<details>` creates a native disclosure widget; `<summary>` provides its visible heading. When the user clicks the summary, the rest of the details content toggles open/closed without JavaScript.
```html
<details>
  <summary>What is WordPress?</summary>
  <p>WordPress is an open-source CMS powering over 40 % of the web.</p>
</details>
```

**Q38: How does the `<form>` `novalidate` attribute interact with custom validation?**

**A:** `novalidate` disables browser's built-in constraint validation UI so you can implement custom validation messages via the Constraint Validation API (`setCustomValidity`, `reportValidity`) with full control over styling and messaging.
```html
<form id="myForm" novalidate>
  <input type="email" id="email" required>
  <button type="submit">Submit</button>
</form>
<script>
  document.getElementById('myForm').addEventListener('submit', e => {
    const el = document.getElementById('email');
    if (!el.validity.valid) { e.preventDefault();
      el.setCustomValidity('Please enter a valid email.'); el.reportValidity(); }
  });
</script>
```

**Q39: What does `tabindex` do and what are its valid values?**

**A:** `tabindex="0"` adds an element to the natural tab order. `tabindex="-1"` removes it from tab order but allows programmatic focus. Positive values force a specific order — avoid them as they disrupt natural flow.
```html
<div role="button" tabindex="0"
     onkeydown="if(event.key==='Enter')this.click()">
  Custom Button
</div>
<!-- Removed from tab order but focusable via script -->
<div id="tooltip" tabindex="-1" role="tooltip">Helpful hint</div>
```

**Q40: What is the `rel="noopener noreferrer"` attribute on links?**

**A:** `noopener` prevents the opened page from accessing the opener's `window` object (prevents tab-napping attacks). `noreferrer` additionally suppresses the `Referer` header. Both should be used on `target="_blank"` links.
```html
<a href="https://external.com"
   target="_blank"
   rel="noopener noreferrer">
  External Link
</a>
```

---

## Advanced

**Q41: How do you implement a complete Service Worker caching strategy?**

**A:** A cache-first strategy serves from cache instantly; a network-first strategy ensures freshness. Most apps combine both: cache-first for assets, network-first for API calls, with a stale-while-revalidate pattern for HTML.
```js
// sw.js
const CACHE = 'v1';
self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(['/','/ app.css','/app.js']))
));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(cached =>
    cached ?? fetch(e.request).then(res => {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    })
  )
));
```

**Q42: How do you build a performant custom element with lifecycle callbacks?**

**A:** Custom elements have four lifecycle callbacks: `connectedCallback`, `disconnectedCallback`, `adoptedCallback`, and `attributeChangedCallback`. Use `observedAttributes` to react to attribute changes without polling.
```js
class CounterEl extends HTMLElement {
  static observedAttributes = ['value'];
  connectedCallback() { this.render(); }
  attributeChangedCallback(name, _, val) { this.render(); }
  render() {
    this.textContent = `Count: ${this.getAttribute('value') ?? 0}`;
  }
}
customElements.define('my-counter', CounterEl);
```

**Q43: How does the `PerformanceObserver` API help measure real-user metrics?**

**A:** `PerformanceObserver` subscribes to performance entries (LCP, CLS, FID, FCP) emitted by the browser at runtime, enabling you to capture Core Web Vitals in real user sessions and send them to analytics.
```js
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.entryType}: ${entry.startTime.toFixed(0)} ms`);
    // sendToAnalytics({ metric: entry.entryType, value: entry.startTime });
  }
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

**Q44: How do you use the `Content-Security-Policy` meta tag to prevent XSS?**

**A:** CSP restricts which sources can execute scripts, load styles, or embed frames. A strict policy using nonces or hashes for inline scripts eliminates the most common XSS vectors.
```html
<!-- Prefer HTTP header, but meta works for static pages -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self' 'nonce-abc123';
           style-src  'self' https://fonts.googleapis.com;
           img-src    'self' data: https:;">
<script nonce="abc123">console.log('allowed inline script');</script>
```

**Q45: How do you implement accessible keyboard navigation for a custom dropdown?**

**A:** Follow the ARIA Authoring Practices for `combobox`/`listbox`: trap Tab focus inside, use arrow keys to move between options, Enter/Space to select, Escape to close, and announce changes via `aria-activedescendant`.
```html
<div role="combobox" aria-expanded="true" aria-haspopup="listbox">
  <input aria-autocomplete="list" aria-controls="listbox1">
</div>
<ul id="listbox1" role="listbox">
  <li role="option" id="opt1" aria-selected="true">Option 1</li>
  <li role="option" id="opt2" aria-selected="false">Option 2</li>
</ul>
```

**Q46: How do you use the `ResizeObserver` API for responsive components?**

**A:** `ResizeObserver` fires whenever an element's size changes, enabling true component-level responsiveness without relying on window resize events or media queries at the page level.
```js
const ro = new ResizeObserver(entries => {
  for (const entry of entries) {
    const { width } = entry.contentRect;
    entry.target.classList.toggle('compact', width < 400);
  }
});

document.querySelectorAll('.card').forEach(el => ro.observe(el));
```

**Q47: How does `<input type="range">` integrate with `<output>` for accessible value display?**

**A:** Link the `<input>` to an `<output>` element via the `for` attribute. Update the output's value on `input` events. This is semantically correct and assistive technologies announce the current value.
```html
<label for="vol">Volume</label>
<input type="range" id="vol" name="vol"
       min="0" max="100" value="50"
       oninput="volOutput.value = this.value">
<output id="volOutput" for="vol">50</output>
```

**Q48: How do you implement a manifest and home-screen icon for a Progressive Web App?**

**A:** Create a `manifest.json` with app name, icons, start URL, and display mode, then link it from `<head>`. The browser uses it when the user installs the app to the home screen.
```json
{
  "name": "My App",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0073aa",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Q49: How does the `MutationObserver` API work?**

**A:** `MutationObserver` watches for DOM changes (child nodes, attributes, subtree) and fires a callback with a list of `MutationRecord` objects. It replaces deprecated mutation events and is far more performant.
```js
const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    if (m.type === 'childList') {
      console.log('Children changed:', m.addedNodes, m.removedNodes);
    }
  }
});
observer.observe(document.getElementById('feed'), {
  childList: true, subtree: true
});
```

**Q50: How do you use `<link rel="modulepreload">` for ES module performance?**

**A:** `modulepreload` fetches, parses, and compiles an ES module (and its dependencies) early without executing it, front-loading the compilation cost so the module is instantly available when imported.
```html
<link rel="modulepreload" href="/js/utils.js">
<link rel="modulepreload" href="/js/app.js">
<script type="module" src="/js/app.js"></script>
<!-- utils.js is already parsed when app.js imports it -->
```
