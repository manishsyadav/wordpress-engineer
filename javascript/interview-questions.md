# JavaScript — Interview Questions

> **100 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What are the differences between `var`, `let`, and `const`?**
**A:** `var` is function-scoped and hoisted (initialized as `undefined`). `let` and `const` are block-scoped and hoisted but not initialized (temporal dead zone). `const` requires an initializer and cannot be reassigned.
```javascript
var x = 1;   // function-scoped, re-declarable
let y = 2;   // block-scoped, reassignable
const z = 3; // block-scoped, not reassignable
```

---

**Q2: What are primitive vs reference data types in JavaScript?**
**A:** Primitives (`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`) are stored by value. Reference types (`object`, `array`, `function`) are stored by reference, so two variables can point to the same object.
```javascript
let a = 5; let b = a; b = 10; // a is still 5
let obj1 = { x: 1 }; let obj2 = obj1;
obj2.x = 99; // obj1.x is also 99
```

---

**Q3: What does `typeof` return for different values?**
**A:** `typeof` returns a lowercase string describing the type. Notably, `typeof null` returns `"object"` (a historical bug) and `typeof function(){}` returns `"function"`.
```javascript
typeof 42          // "number"
typeof "hello"     // "string"
typeof null        // "object" (bug!)
typeof undefined   // "undefined"
typeof []          // "object"
typeof function(){} // "function"
```

---

**Q4: When should you use `instanceof` over `typeof`?**
**A:** Use `instanceof` to check if an object was created by a specific constructor or class. `typeof` only distinguishes primitives; `instanceof` works on the prototype chain for objects.
```javascript
[] instanceof Array       // true
[] instanceof Object      // true
"hi" instanceof String    // false (primitive)
typeof [] === "object"    // true (not specific)
```

---

**Q5: What common string methods should you know?**
**A:** Key methods include `trim()`, `split()`, `includes()`, `startsWith()`, `endsWith()`, `replace()`, `slice()`, and `toUpperCase()`/`toLowerCase()`. They all return new strings; strings are immutable.
```javascript
const s = "  Hello World  ";
s.trim()            // "Hello World"
s.trim().split(" ") // ["Hello", "World"]
s.includes("World") // true
s.replace("World", "JS") // "  Hello JS  "
```

---

**Q6: What is the difference between `slice` and `splice` on arrays?**
**A:** `slice(start, end)` returns a shallow copy of a portion without mutating. `splice(start, deleteCount, ...items)` mutates the original array by removing/inserting elements and returns the removed items.
```javascript
const a = [1, 2, 3, 4];
a.slice(1, 3)       // [2, 3], a unchanged
a.splice(1, 2)      // returns [2, 3], a is now [1, 4]
```

---

**Q7: What do `push`, `pop`, `shift`, and `unshift` do?**
**A:** `push` adds to the end, `pop` removes from the end. `unshift` adds to the start, `shift` removes from the start. All mutate the original array and return either the new length or the removed element.
```javascript
const a = [2, 3];
a.push(4);    // a = [2, 3, 4]
a.pop();      // returns 4, a = [2, 3]
a.unshift(1); // a = [1, 2, 3]
a.shift();    // returns 1, a = [2, 3]
```

---

**Q8: How do you create and access an object literal?**
**A:** Object literals use curly braces with key-value pairs. Properties are accessed via dot notation or bracket notation. Bracket notation is required for dynamic keys or keys with special characters.
```javascript
const user = { name: "Alice", age: 30 };
user.name        // "Alice"
user["age"]      // 30
const key = "name";
user[key]        // "Alice"
```

---

**Q9: What are template literals and when are they useful?**
**A:** Template literals use backticks and support embedded expressions via `${}` and multi-line strings without escape characters. They replace string concatenation for readability.
```javascript
const name = "World";
const msg = `Hello, ${name}!
This is line two.`;
const math = `2 + 2 = ${2 + 2}`;
```

---

**Q10: How do arrow functions differ from regular functions?**
**A:** Arrow functions have no own `this`, `arguments`, or `prototype`. They lexically inherit `this` from the enclosing scope, making them ideal for callbacks but unsuitable as constructors or object methods needing their own `this`.
```javascript
const obj = {
  val: 10,
  regular() { return this.val; },   // 10
  arrow: () => this.val             // undefined (lexical this)
};
```

---

**Q11: How do default parameters work?**
**A:** Default parameters are used when the argument is `undefined` (not passed or explicitly `undefined`). They can reference earlier parameters and support expressions.
```javascript
function greet(name = "Guest", msg = `Hi ${name}`) {
  return msg;
}
greet();             // "Hi Guest"
greet("Alice");      // "Hi Alice"
greet("Bob", "Hey") // "Hey"
```

---

**Q12: How does array destructuring work?**
**A:** Array destructuring unpacks values by position into variables. You can skip elements with commas, set defaults, and capture the remainder with rest syntax.
```javascript
const [a, , b, c = 99] = [1, 2, 3];
// a=1, b=3, c=99
const [first, ...rest] = [10, 20, 30];
// first=10, rest=[20, 30]
```

---

**Q13: How does object destructuring work?**
**A:** Object destructuring unpacks properties by name. You can rename variables, set defaults, and use nested destructuring. It is commonly used in function parameters.
```javascript
const { name, age = 25, address: { city } } =
  { name: "Alice", address: { city: "NYC" } };
// name="Alice", age=25, city="NYC"
```

---

**Q14: What is the spread operator and how is it used?**
**A:** The spread operator (`...`) expands an iterable into individual elements. It is used for array/object copying, merging, and passing array elements as function arguments.
```javascript
const a = [1, 2]; const b = [3, 4];
const merged = [...a, ...b]; // [1, 2, 3, 4]
const obj = { x: 1 }; const copy = { ...obj, y: 2 };
Math.max(...a); // 2
```

---

**Q15: What is the rest operator and how does it differ from spread?**
**A:** The rest operator (`...`) collects remaining elements into an array. It is used in function parameters and destructuring — spread expands, rest collects.
```javascript
function sum(...nums) {
  return nums.reduce((acc, n) => acc + n, 0);
}
sum(1, 2, 3, 4); // 10
const [head, ...tail] = [1, 2, 3]; // tail=[2,3]
```

---

**Q16: What is the difference between `for...of` and `for...in`?**
**A:** `for...of` iterates over the values of any iterable (array, string, Map, Set). `for...in` iterates over enumerable property keys of an object, including inherited ones — avoid it on arrays.
```javascript
for (const v of [1, 2, 3]) console.log(v); // 1 2 3
const obj = { a: 1, b: 2 };
for (const k in obj) console.log(k); // "a" "b"
```

---

**Q17: How does `forEach` differ from `map`?**
**A:** `forEach` iterates for side effects and returns `undefined`. `map` iterates and returns a new array of transformed values. Use `map` when you need the result array; use `forEach` for side effects only.
```javascript
[1, 2, 3].forEach(n => console.log(n)); // undefined
const doubled = [1, 2, 3].map(n => n * 2); // [2, 4, 6]
```

---

**Q18: How do `filter` and `reduce` work?**
**A:** `filter` returns a new array of elements passing a predicate. `reduce` accumulates elements into a single value using a callback and an optional initial value.
```javascript
const evens = [1,2,3,4].filter(n => n % 2 === 0); // [2,4]
const sum = [1,2,3,4].reduce((acc, n) => acc + n, 0); // 10
```

---

**Q19: How does the ternary operator work?**
**A:** The ternary operator is a concise if-else expression: `condition ? valueIfTrue : valueIfFalse`. It is an expression (returns a value), unlike an `if` statement.
```javascript
const age = 20;
const status = age >= 18 ? "adult" : "minor"; // "adult"
const label = isLoggedIn ? "Logout" : "Login";
```

---

**Q20: What is the nullish coalescing operator (`??`)?**
**A:** `??` returns the right-hand side only when the left-hand side is `null` or `undefined` — unlike `||`, which also triggers for `0`, `""`, and `false`. Use it for safe defaults.
```javascript
const val = null ?? "default";   // "default"
const zero = 0 ?? "default";     // 0 (not "default"!)
const name = user.name ?? "Guest";
```

---

**Q21: What is optional chaining (`?.`) and why is it useful?**
**A:** `?.` short-circuits and returns `undefined` if the reference before it is `null` or `undefined`, preventing TypeErrors when accessing nested properties of potentially missing objects.
```javascript
const user = { profile: { city: "NYC" } };
user?.profile?.city     // "NYC"
user?.address?.street   // undefined (no error)
user?.greet?.()         // undefined if method missing
```

---

**Q22: How do you select DOM elements?**
**A:** `getElementById` selects a single element by ID. `querySelector` selects the first element matching a CSS selector. `querySelectorAll` returns a static NodeList of all matches.
```javascript
document.getElementById("main");
document.querySelector(".post-title");
document.querySelectorAll("ul > li");
```

---

**Q23: What is the difference between `innerHTML` and `textContent`?**
**A:** `innerHTML` parses and renders HTML markup — powerful but an XSS vector if used with untrusted data. `textContent` sets/gets raw text without parsing HTML, making it safer for user-supplied content.
```javascript
el.innerHTML = "<strong>Bold</strong>"; // renders HTML
el.textContent = "<strong>Bold</strong>"; // shows literal text
// NEVER: el.innerHTML = userInput; // XSS risk
```

---

**Q24: How do you manipulate CSS classes with `classList`?**
**A:** `classList` provides `add`, `remove`, `toggle`, and `contains` methods for managing classes without overwriting the entire `className` string.
```javascript
const el = document.querySelector(".card");
el.classList.add("active");
el.classList.remove("hidden");
el.classList.toggle("open");
el.classList.contains("active"); // true/false
```

---

**Q25: How does `addEventListener` work?**
**A:** `addEventListener(event, handler, options)` attaches a listener to an element. Multiple listeners can be added for the same event. The optional third argument can be a boolean (`useCapture`) or an options object (`{ once, passive, capture }`).
```javascript
btn.addEventListener("click", (e) => {
  console.log(e.target);
}, { once: true });
```

---

**Q26: What is the difference between `preventDefault` and `stopPropagation`?**
**A:** `preventDefault()` cancels the browser's default action (e.g., form submit, link navigation). `stopPropagation()` stops the event from bubbling up (or capturing down) the DOM tree. They are independent and can be used together.
```javascript
form.addEventListener("submit", (e) => {
  e.preventDefault();    // no page reload
  e.stopPropagation();   // don't bubble to parent
});
```

---

**Q27: How do you make a basic `fetch` request?**
**A:** `fetch` returns a Promise resolving to a `Response` object. You call `.json()` (or `.text()`) to parse the body, which also returns a Promise. Always check `response.ok` before processing.
```javascript
fetch("/wp-json/wp/v2/posts")
  .then(res => {
    if (!res.ok) throw new Error(res.status);
    return res.json();
  })
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

---

**Q28: How do `JSON.parse` and `JSON.stringify` work?**
**A:** `JSON.stringify` serializes a JavaScript value to a JSON string. `JSON.parse` deserializes a JSON string back to a value. Functions, `undefined`, and `Symbol` are omitted or converted during stringification.
```javascript
const obj = { name: "Alice", age: 30 };
const json = JSON.stringify(obj); // '{"name":"Alice","age":30}'
const parsed = JSON.parse(json);  // back to object
JSON.stringify(obj, null, 2);     // pretty-print
```

---

**Q29: What is the difference between `localStorage` and `sessionStorage`?**
**A:** Both are key-value stores on the client. `localStorage` persists across browser sessions (until explicitly cleared). `sessionStorage` is cleared when the tab is closed. Both are limited to ~5 MB and same-origin only.
```javascript
localStorage.setItem("theme", "dark");
localStorage.getItem("theme"); // "dark"
sessionStorage.setItem("token", "abc");
localStorage.removeItem("theme");
```

---

**Q30: How do `setTimeout` and `setInterval` work?**
**A:** `setTimeout(fn, ms)` executes `fn` once after at least `ms` milliseconds. `setInterval(fn, ms)` executes `fn` repeatedly every `ms` milliseconds. Both return an ID for cancellation via `clearTimeout`/`clearInterval`.
```javascript
const id = setTimeout(() => console.log("done"), 1000);
clearTimeout(id); // cancel before it fires
const tick = setInterval(() => console.log("tick"), 500);
clearInterval(tick); // stop repeating
```

---

**Q31: How do ES modules (`import`/`export`) work?**
**A:** ES modules use `export` to expose values and `import` to consume them. Named exports require matching names; default exports can be imported with any name. Modules are static, async-loaded, and have their own scope.
```javascript
// utils.js
export const PI = 3.14;
export default function add(a, b) { return a + b; }

// main.js
import add, { PI } from "./utils.js";
```

---

**Q32: What is a Promise and what states can it be in?**
**A:** A Promise represents an asynchronous operation's eventual result. It can be in one of three states: `pending` (initial), `fulfilled` (resolved with a value), or `rejected` (failed with a reason). State transitions are irreversible.
```javascript
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve("done"), 500);
});
p.then(val => console.log(val))
 .catch(err => console.error(err));
```

---

**Q33: How does Promise chaining work?**
**A:** `.then()` returns a new Promise, allowing chaining. The return value of each `.then` callback becomes the resolved value of the next. Errors propagate to the nearest `.catch()` in the chain.
```javascript
fetch("/api/user")
  .then(res => res.json())
  .then(user => fetch(`/api/posts?author=${user.id}`))
  .then(res => res.json())
  .then(posts => console.log(posts))
  .catch(err => console.error(err));
```

---

**Q34: How do you use `import` dynamically?**
**A:** Dynamic `import()` is a function-like expression that returns a Promise. It enables on-demand loading of modules, which is useful for code splitting in WordPress block plugins and React-based frontends.
```javascript
async function loadChart() {
  const { Chart } = await import("./chart.js");
  new Chart(ctx, config);
}
button.addEventListener("click", loadChart);
```

---

**Q35: How do you convert a NodeList to an array?**
**A:** `querySelectorAll` returns a static NodeList, which lacks array methods. Convert it with `Array.from()`, the spread operator `[...nodeList]`, or `Array.prototype.slice.call()`.
```javascript
const nodes = document.querySelectorAll(".item");
const arr = Array.from(nodes);
const arr2 = [...nodes];
arr.filter(el => el.classList.contains("active"));
```

---

## Mid

**Q36: What is a closure and why is it useful?**
**A:** A closure is a function that retains access to its outer scope's variables even after the outer function has returned. Closures enable data encapsulation, factory functions, and stateful callbacks.
```javascript
function counter() {
  let count = 0;
  return {
    inc: () => ++count,
    get: () => count
  };
}
const c = counter();
c.inc(); c.inc(); c.get(); // 2
```

---

**Q37: How does hoisting work for `var` vs `let`/`const`?**
**A:** `var` declarations are hoisted and initialized to `undefined` before execution. `let` and `const` are hoisted but remain uninitialized in the temporal dead zone (TDZ) — accessing them before declaration throws a `ReferenceError`.
```javascript
console.log(a); // undefined (hoisted)
var a = 1;
console.log(b); // ReferenceError
let b = 2;
```

---

**Q38: What is an IIFE and when would you use one?**
**A:** An Immediately Invoked Function Expression executes as soon as it is defined. It creates a private scope, preventing variable pollution of the global scope — historically important in WordPress theme and plugin scripts.
```javascript
(function($) {
  // $ safely refers to jQuery here
  $(".menu").hide();
})(jQuery);
```

---

**Q39: What is the difference between `call`, `apply`, and `bind`?**
**A:** All three set the `this` context. `call` invokes immediately with individual arguments. `apply` invokes immediately with an array of arguments. `bind` returns a new function with `this` permanently set.
```javascript
function greet(greeting) {
  return `${greeting}, ${this.name}`;
}
greet.call({ name: "Alice" }, "Hi");     // "Hi, Alice"
greet.apply({ name: "Bob" }, ["Hello"]); // "Hello, Bob"
const hi = greet.bind({ name: "Eve" });
hi("Hey"); // "Hey, Eve"
```

---

**Q40: How does `this` behave in different contexts?**
**A:** In a method, `this` is the object. In a regular function (non-strict), `this` is `window`; in strict mode it is `undefined`. Arrow functions inherit `this` lexically. Event handlers set `this` to the element.
```javascript
const obj = {
  name: "obj",
  regular() { return this.name; }, // "obj"
  arrow: () => this.name           // undefined/window.name
};
function strict() { "use strict"; return this; } // undefined
```

---

**Q41: What is the prototype chain?**
**A:** Every JavaScript object has an internal `[[Prototype]]` link. When a property is not found on an object, JS walks up the prototype chain until it finds it or reaches `null`. This is the basis of JavaScript inheritance.
```javascript
function Animal(name) { this.name = name; }
Animal.prototype.speak = function() {
  return `${this.name} makes a sound`;
};
const dog = new Animal("Rex");
dog.speak(); // found on prototype
```

---

**Q42: How does the `class` syntax work (constructor, extends, super)?**
**A:** `class` is syntactic sugar over prototype-based inheritance. `constructor` initializes instances. `extends` sets up the prototype chain. `super()` must be called in a derived constructor before accessing `this`.
```javascript
class Shape {
  constructor(color) { this.color = color; }
  describe() { return `A ${this.color} shape`; }
}
class Circle extends Shape {
  constructor(color, r) {
    super(color);
    this.radius = r;
  }
}
```

---

**Q43: What are static methods and properties?**
**A:** Static members belong to the class itself, not instances. They are defined with the `static` keyword and called on the class directly. Useful for utility/factory functions.
```javascript
class MathUtils {
  static add(a, b) { return a + b; }
  static PI = 3.14159;
}
MathUtils.add(2, 3); // 5
MathUtils.PI;        // 3.14159
```

---

**Q44: How do getters and setters work in classes?**
**A:** `get` and `set` accessors intercept property reads and writes. They look like property accesses but execute logic — useful for validation, computed properties, or lazy initialization.
```javascript
class Temperature {
  #celsius;
  constructor(c) { this.#celsius = c; }
  get fahrenheit() { return this.#celsius * 9/5 + 32; }
  set fahrenheit(f) { this.#celsius = (f - 32) * 5/9; }
}
```

---

**Q45: What is `Symbol` and why use it?**
**A:** `Symbol` creates a unique, non-enumerable primitive value. Symbols as object keys avoid name collisions with string keys and are not iterated by `for...in` or `Object.keys`. Well-known symbols like `Symbol.iterator` customize object behavior.
```javascript
const ID = Symbol("id");
const user = { [ID]: 123, name: "Alice" };
user[ID];            // 123
Object.keys(user);   // ["name"] — Symbol hidden
```

---

**Q46: What are `WeakMap` and `WeakSet`?**
**A:** `WeakMap` and `WeakSet` hold weak references to object keys/values, allowing garbage collection when no other references exist. They are not enumerable and have no `size`. Ideal for storing metadata without causing memory leaks.
```javascript
const cache = new WeakMap();
function process(obj) {
  if (!cache.has(obj)) cache.set(obj, compute(obj));
  return cache.get(obj);
}
// obj garbage-collected when out of scope
```

---

**Q47: What are generator functions and how do they work?**
**A:** Generators (`function*`) return an iterator. Execution pauses at each `yield` and resumes when `.next()` is called. They enable lazy sequences, infinite iterators, and cooperative async control flow.
```javascript
function* range(start, end) {
  for (let i = start; i <= end; i++) yield i;
}
const gen = range(1, 3);
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 2, done: false }
```

---

**Q48: How does `async`/`await` work with error handling?**
**A:** `async` functions always return a Promise. `await` pauses execution until the Promise settles. Wrap `await` calls in `try/catch` to handle rejections; without it, unhandled rejections crash silently in some environments.
```javascript
async function loadPost(id) {
  try {
    const res = await fetch(`/wp-json/wp/v2/posts/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed:", err);
  }
}
```

---

**Q49: What is the difference between `Promise.all`, `Promise.race`, `Promise.allSettled`, and `Promise.any`?**
**A:** `all` resolves when all settle (rejects on first failure). `race` settles with the first settled Promise. `allSettled` always resolves with all results and statuses. `any` resolves with the first fulfilled (rejects only if all reject).
```javascript
await Promise.all([p1, p2]);         // fail-fast
await Promise.race([p1, p2]);        // first settled
await Promise.allSettled([p1, p2]);  // all results
await Promise.any([p1, p2]);         // first fulfilled
```

---

**Q50: How does the JavaScript event loop and microtask queue work?**
**A:** The event loop processes the call stack, then drains the microtask queue (Promises, `queueMicrotask`) before moving to the next macrotask (setTimeout, I/O). Microtasks always run before the next macrotask.
```javascript
console.log("1");
setTimeout(() => console.log("3"), 0); // macrotask
Promise.resolve().then(() => console.log("2")); // microtask
// Output: 1, 2, 3
```

---

**Q51: What are debounce and throttle, and when do you use each?**
**A:** Debounce delays execution until after a quiet period — ideal for search inputs. Throttle ensures execution at most once per interval — ideal for scroll/resize handlers. Both improve performance by limiting call frequency.
```javascript
function debounce(fn, ms) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}
const onSearch = debounce(fetchResults, 300);
```

---

**Q52: What is event delegation and why is it useful?**
**A:** Event delegation attaches a single listener to a parent element instead of many listeners on children. It works because events bubble up. It is efficient for dynamic lists and reduces memory usage — common in WordPress menu handling.
```javascript
document.querySelector("#post-list")
  .addEventListener("click", (e) => {
    if (e.target.matches(".read-more")) {
      loadPost(e.target.dataset.id);
    }
  });
```

---

**Q53: What is `MutationObserver` and when would you use it?**
**A:** `MutationObserver` watches the DOM for changes (child additions, attribute changes, text changes) asynchronously. It is useful for reacting to third-party DOM changes or tracking dynamic content in WordPress page builders.
```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach(m => console.log(m.type));
});
observer.observe(document.body, {
  childList: true, subtree: true
});
```

---

**Q54: What is `IntersectionObserver` and what is it used for?**
**A:** `IntersectionObserver` asynchronously reports when a target element enters or leaves a viewport (or ancestor). It is used for lazy loading images, infinite scroll, and triggering animations — more performant than scroll event listeners.
```javascript
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) loadImage(e.target);
  });
}, { threshold: 0.1 });
io.observe(document.querySelector(".lazy-img"));
```

---

**Q55: What are Web Workers and when should you use them?**
**A:** Web Workers run scripts in background threads, offloading CPU-intensive tasks (parsing, encryption, image processing) from the main thread. They communicate via `postMessage`/`onmessage` and cannot access the DOM.
```javascript
// main.js
const worker = new Worker("worker.js");
worker.postMessage({ data: largeArray });
worker.onmessage = (e) => console.log(e.data);
// worker.js
self.onmessage = (e) => {
  self.postMessage(process(e.data));
};
```

---

**Q56: What are `Proxy` and `Reflect` and how do they work together?**
**A:** `Proxy` wraps an object and intercepts operations (get, set, delete) via handler traps. `Reflect` provides default implementations of those operations, making it easy to forward with modified behavior. Used for validation, logging, and reactive data.
```javascript
const handler = {
  set(target, key, val) {
    if (typeof val !== "number") throw TypeError("Numbers only");
    return Reflect.set(target, key, val);
  }
};
const obj = new Proxy({}, handler);
obj.x = 5;   // ok
obj.x = "a"; // TypeError
```

---

**Q57: How do dynamic imports enable code splitting?**
**A:** Dynamic `import()` returns a Promise, allowing modules to be loaded on demand. Bundlers like Webpack and Vite split these into separate chunks automatically, reducing initial load time for WordPress block plugins.
```javascript
async function initEditor() {
  const { RichText } = await import(
    /* webpackChunkName: "editor" */
    "@wordpress/block-editor"
  );
  // chunk only loaded when needed
}
```

---

**Q58: What are the common JavaScript module patterns?**
**A:** Common patterns include the Module pattern (IIFE with returned API), Revealing Module pattern (exposes selected private vars), UMD (universal browser + Node support), and ES Modules (native, static). WordPress historically uses the Revealing Module via IIFEs.
```javascript
const PostModule = (function() {
  let _private = [];
  function add(post) { _private.push(post); }
  function getAll() { return [..._private]; }
  return { add, getAll };
})();
```

---

**Q59: What is CORS and how do you send credentials with `fetch`?**
**A:** CORS (Cross-Origin Resource Sharing) restricts cross-origin HTTP requests. To send cookies/credentials, set `credentials: "include"` in `fetch` options. The server must respond with `Access-Control-Allow-Credentials: true` and a non-wildcard origin.
```javascript
fetch("https://api.example.com/data", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "val" })
});
```

---

**Q60: How do you use the `FormData` API?**
**A:** `FormData` serializes form fields (including file inputs) into a multipart body for `fetch` or XHR. Do not set `Content-Type` manually — `fetch` sets it with the correct boundary automatically.
```javascript
const form = document.querySelector("#upload-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  fd.append("action", "my_action");
  await fetch(ajaxurl, { method: "POST", body: fd });
});
```

---

**Q61: How do you create and dispatch custom events?**
**A:** `CustomEvent` creates events with custom data in `detail`. Dispatch with `dispatchEvent` on any DOM element. Other parts of the page can listen with `addEventListener`. Useful for decoupled WordPress plugin communication.
```javascript
const event = new CustomEvent("cartUpdated", {
  detail: { itemCount: 3 },
  bubbles: true
});
document.dispatchEvent(event);
document.addEventListener("cartUpdated", (e) => {
  console.log(e.detail.itemCount);
});
```

---

**Q62: What is `AbortController` and how do you use it to cancel fetch requests?**
**A:** `AbortController` provides an `AbortSignal` that can cancel fetch requests or other async operations. When `abort()` is called, the fetch Promise rejects with an `AbortError`. Essential for cancelling stale requests in search UIs.
```javascript
const controller = new AbortController();
fetch("/api/search", { signal: controller.signal })
  .catch(e => {
    if (e.name === "AbortError") console.log("Cancelled");
  });
controller.abort(); // cancel the request
```

---

**Q63: What are service workers and what can they do?**
**A:** Service workers are background scripts that intercept network requests, enabling offline caching (Cache API), push notifications, and background sync. They run on a separate thread and have no DOM access. Registered via `navigator.serviceWorker.register()`.
```javascript
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(reg => {
    console.log("SW registered", reg.scope);
  });
}
// In sw.js: listen to install, activate, fetch events
```

---

**Q64: What is IndexedDB and when would you use it over localStorage?**
**A:** IndexedDB is an async, transactional, key-object database in the browser supporting large data, complex queries, and binary data. Use it when `localStorage`'s 5 MB limit or synchronous API is insufficient — e.g., offline WordPress data sync.
```javascript
const req = indexedDB.open("myDB", 1);
req.onupgradeneeded = (e) => {
  e.target.result.createObjectStore("posts", { keyPath: "id" });
};
req.onsuccess = (e) => {
  const db = e.target.result;
};
```

---

**Q65: How do you use the History API to create a single-page navigation?**
**A:** `history.pushState(state, title, url)` changes the URL without a page reload. `popstate` fires on back/forward navigation. Used in WordPress themes to implement SPA-like routing without full reloads.
```javascript
function navigate(url, state) {
  history.pushState(state, "", url);
  renderPage(url);
}
window.addEventListener("popstate", (e) => {
  renderPage(location.pathname);
});
```

---

**Q66: How do you make AJAX requests with a WordPress nonce using jQuery?**
**A:** WordPress passes the nonce to JS via `wp_localize_script`. Include it in the `data` object sent to `admin-ajax.php`. The server verifies it with `check_ajax_referer()` to prevent CSRF attacks.
```javascript
jQuery.ajax({
  url: myPlugin.ajaxUrl,
  type: "POST",
  data: {
    action: "my_action",
    nonce: myPlugin.nonce,
    postId: 42
  },
  success: (res) => console.log(res)
});
```

---

**Q67: How do you use `wp.apiFetch` from `@wordpress/api-fetch`?**
**A:** `apiFetch` wraps `fetch` with automatic nonce handling, root URL detection, and middleware support. It is the standard way to call the WordPress REST API from block editor scripts.
```javascript
import apiFetch from "@wordpress/api-fetch";

async function getPosts() {
  const posts = await apiFetch({ path: "/wp/v2/posts?per_page=5" });
  return posts;
}
await apiFetch({
  path: "/wp/v2/posts/1",
  method: "POST",
  data: { title: "Updated" }
});
```

---

**Q68: How does `wp.ajax` work for admin AJAX in WordPress?**
**A:** `wp.ajax.post` sends a POST request to `admin-ajax.php`. It returns a Deferred (jQuery Promise). The `action` value routes to the registered PHP handler. It automatically handles nonces if set via `wp_add_inline_script`.
```javascript
wp.ajax.post("save_post_meta", {
  postId: postId,
  metaKey: "_featured",
  metaValue: true,
  nonce: wpData.nonce
}).done((res) => {
  console.log("Saved:", res);
}).fail((err) => console.error(err));
```

---

**Q69: How do closures cause memory leaks and how do you prevent them?**
**A:** A closure holding a reference to a large DOM element or dataset prevents garbage collection. Common patterns: event listeners referencing detached DOM nodes, timers capturing large objects. Fix by nullifying references or removing listeners.
```javascript
function attachHandler(el) {
  const bigData = new Array(1e6).fill("x");
  el.addEventListener("click", () => console.log(bigData));
  // bigData lives as long as el is referenced
}
// Fix: remove listener when done
el.removeEventListener("click", handler);
```

---

**Q70: What is the purpose of `Symbol.iterator` and how do you implement it?**
**A:** `Symbol.iterator` defines how an object is iterated by `for...of`, spread, and destructuring. Implementing it makes any object iterable by returning an iterator object with a `next()` method.
```javascript
const range = {
  from: 1, to: 3,
  [Symbol.iterator]() {
    let cur = this.from;
    return { next: () =>
      cur <= this.to
        ? { value: cur++, done: false }
        : { done: true }
    };
  }
};
[...range]; // [1, 2, 3]
```

---

**Q71: What are private class fields and why use them?**
**A:** Private class fields (prefixed with `#`) are truly private — inaccessible outside the class at the language level. Unlike conventions like `_private`, they enforce encapsulation and throw a `SyntaxError` on external access.
```javascript
class BankAccount {
  #balance = 0;
  deposit(amount) { this.#balance += amount; }
  get balance() { return this.#balance; }
}
const acc = new BankAccount();
acc.#balance; // SyntaxError
```

---

**Q72: How does `Promise.allSettled` differ from `Promise.all` in practice?**
**A:** `Promise.all` rejects immediately when any Promise rejects, discarding other results. `Promise.allSettled` always resolves with an array of `{ status, value/reason }` objects. Use it when you need all results regardless of individual failures.
```javascript
const results = await Promise.allSettled([
  fetch("/api/a"),
  fetch("/api/b") // may fail
]);
results.forEach(r => {
  if (r.status === "fulfilled") process(r.value);
  else logError(r.reason);
});
```

---

**Q73: How do you use `async` generators?**
**A:** Async generators combine `async function*` with `yield` to produce asynchronous sequences. Consume them with `for await...of`. Useful for paginated API calls and streaming data.
```javascript
async function* paginate(url) {
  let page = 1;
  while (true) {
    const res = await fetch(`${url}?page=${page++}`);
    const data = await res.json();
    if (!data.length) return;
    yield data;
  }
}
for await (const posts of paginate("/wp-json/wp/v2/posts")) {
  render(posts);
}
```

---

**Q74: What is `structuredClone` and when should you use it?**
**A:** `structuredClone` creates a deep clone of an object using the structured clone algorithm. It handles circular references and more types than `JSON.parse(JSON.stringify(...))`, but does not clone functions or DOM nodes.
```javascript
const original = { a: 1, nested: { b: [1, 2] } };
const clone = structuredClone(original);
clone.nested.b.push(3);
original.nested.b; // still [1, 2]
```

---

**Q75: How does the `Intl` API help with internationalization in WordPress JS?**
**A:** The `Intl` API provides locale-aware formatting for numbers, dates, currencies, and list formatting. In WordPress, combine it with `@wordpress/i18n` for translatable strings and `Intl` for locale-specific formatting.
```javascript
const price = new Intl.NumberFormat("de-DE", {
  style: "currency", currency: "EUR"
}).format(1234.56);
// "1.234,56 €"
const date = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long"
}).format(new Date());
```

---

## Advanced

**Q76: How does V8's JIT compilation and hidden classes affect performance?**
**A:** V8 uses JIT to compile hot functions to machine code. It creates "hidden classes" (shapes) to optimize property access. Adding properties in inconsistent order creates different hidden classes, causing deoptimization — so always initialize object shapes consistently.
```javascript
// BAD: two different hidden classes
function makePt(x, y) { this.x = x; this.y = y; }
const a = new makePt(1, 2);
a.z = 3; // new hidden class — deoptimized

// GOOD: consistent shape
function makePt(x, y, z) { this.x=x; this.y=y; this.z=z; }
```

---

**Q77: What is inline caching in V8?**
**A:** Inline caching (IC) optimizes property lookups by remembering the hidden class and offset for a call site. Monomorphic ICs (one shape) are fastest. Polymorphic (2-4 shapes) are slower. Megamorphic (5+) fall back to hash table lookup.
```javascript
// Monomorphic — V8 optimizes heavily
function getX(pt) { return pt.x; }
getX({ x: 1, y: 2 }); // always same shape = fast IC

// Megamorphic — many shapes, no IC benefit
function read(obj) { return obj.val; }
read({ val: 1 }); read({ x: 1, val: 2 }); // etc.
```

---

**Q78: How does mark-and-sweep garbage collection work and what causes memory leaks?**
**A:** V8's GC marks all objects reachable from GC roots, then sweeps unmarked objects. Memory leaks occur when references are accidentally held: detached DOM nodes, forgotten timers, accumulating event listeners, and closures over large data.
```javascript
// Leak: detached DOM node still referenced
let el = document.createElement("div");
document.body.appendChild(el);
const data = { node: el };
document.body.removeChild(el);
// el is still in `data` — not GC'd
data.node = null; // fix
```

---

**Q79: How do you use Chrome DevTools to profile JavaScript performance?**
**A:** Open the Performance panel, record a user interaction, then inspect the flame chart. Look for long tasks (>50 ms), forced reflows, and scripting time. The Bottom-Up and Call Tree tabs identify hot functions consuming the most self or total time.
```javascript
// Mark custom timings in the flame chart
performance.mark("start-render");
renderPosts(posts);
performance.mark("end-render");
performance.measure("render", "start-render", "end-render");
```

---

**Q80: How does `requestAnimationFrame` produce smooth animations?**
**A:** `requestAnimationFrame` (rAF) schedules a callback before the next browser paint, synchronized to the display refresh rate (typically 60 fps). Batching DOM writes inside rAF avoids layout thrashing and produces smooth 60 fps animations.
```javascript
function animate(timestamp) {
  const progress = (timestamp - start) / duration;
  el.style.transform = `translateX(${progress * 300}px)`;
  if (progress < 1) requestAnimationFrame(animate);
}
const start = performance.now();
requestAnimationFrame(animate);
```

---

**Q81: What is the virtual DOM and how does reconciliation work?**
**A:** The virtual DOM is an in-memory JS representation of the real DOM. On state change, a new vDOM tree is diffed against the previous one (reconciliation). Only the minimal set of real DOM mutations is applied, reducing expensive reflows.
```javascript
// Conceptual diff:
// prev: <ul><li>A</li><li>B</li></ul>
// next: <ul><li>A</li><li>B</li><li>C</li></ul>
// React only appends <li>C</li> — no full re-render
// Keys help React identify stable nodes across re-renders
```

---

**Q82: What are the rules of React Hooks?**
**A:** Only call hooks at the top level (not inside conditionals, loops, or nested functions). Only call hooks from React function components or custom hooks. These rules ensure hook call order is consistent across renders.
```javascript
// WRONG:
if (condition) { const [x, setX] = useState(0); }

// RIGHT:
const [x, setX] = useState(0);
useEffect(() => {
  if (condition) doSomething();
}, [condition]);
```

---

**Q83: How does `useEffect` work internally and what causes infinite loops?**
**A:** After each render, React compares the dependency array. If any value changed (by `Object.is` comparison), the effect runs. An infinite loop occurs when the effect updates state that is itself a dependency, or when an object/function dependency is recreated each render.
```javascript
// Infinite loop: posts updated in effect, posts in deps
useEffect(() => { setPosts([...posts, newPost]); }, [posts]);

// Fix: use functional update form
useEffect(() => {
  setPosts(prev => [...prev, newPost]);
}, []); // no dependency on posts
```

---

**Q84: What is the difference between `useMemo` and `useCallback`?**
**A:** `useMemo` memoizes a computed value, re-computing only when dependencies change. `useCallback` memoizes a function reference. Both optimize child re-renders and expensive computations, but overuse adds overhead — profile first.
```javascript
const sorted = useMemo(
  () => [...items].sort((a, b) => a.price - b.price),
  [items]
);
const handleClick = useCallback(
  (id) => dispatch({ type: "SELECT", id }),
  [dispatch]
);
```

---

**Q85: What is code splitting and how is it implemented in WordPress block plugins?**
**A:** Code splitting divides a bundle into chunks loaded on demand. In Webpack (used by `@wordpress/scripts`), use dynamic `import()`. Vite splits automatically. For block plugins, split editor-only code from front-end code to reduce theme payload.
```javascript
// webpack.config.js (via @wordpress/scripts)
// Separate entry points = separate chunks
module.exports = {
  entry: {
    index: "./src/index.js",     // editor
    frontend: "./src/frontend.js" // front-end
  }
};
```

---

**Q86: What is tree shaking and how does it work?**
**A:** Tree shaking is dead-code elimination based on ES module static analysis. Bundlers (Webpack, Rollup, Vite) trace `import`/`export` graphs and drop unused exports. Requires ES modules (not CommonJS) and `"sideEffects": false` in `package.json`.
```javascript
// utils.js — exports two functions
export const add = (a, b) => a + b;
export const multiply = (a, b) => a * b;

// main.js — only uses add
import { add } from "./utils.js";
// multiply is tree-shaken from the bundle
```

---

**Q87: How do you measure Web Vitals in JavaScript?**
**A:** Use the `web-vitals` library or the `PerformanceObserver` API. LCP, FID/INP, CLS, FCP, and TTFB are the Core Web Vitals. Measuring them in production helps identify WordPress theme performance regressions.
```javascript
import { onLCP, onINP, onCLS } from "web-vitals";
onLCP(({ value }) => sendToAnalytics("LCP", value));
onINP(({ value }) => sendToAnalytics("INP", value));
onCLS(({ value }) => sendToAnalytics("CLS", value));
```

---

**Q88: How does JavaScript impact the Critical Rendering Path?**
**A:** Parser-blocking scripts (`<script>` in `<head>`) halt HTML parsing until downloaded and executed. Defer non-critical scripts with `defer` (executes after parse) or `async` (executes as soon as loaded). WordPress uses `wp_enqueue_script` with `$in_footer = true` or `defer` strategy.
```javascript
// Measure script execution impact
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    if (entry.initiatorType === "script")
      console.log(entry.name, entry.duration);
  });
});
observer.observe({ entryTypes: ["resource"] });
```

---

**Q89: How do you prevent XSS vulnerabilities when using JavaScript in WordPress?**
**A:** Never insert untrusted data via `innerHTML`. Use `textContent` or DOM methods. Validate on the server. Use a CSP with nonces (`wp_scripts()->get_inline_script_tag`). For rich content, use a sanitizer like `DOMPurify`.
```javascript
// UNSAFE:
el.innerHTML = userData; // XSS

// SAFE:
el.textContent = userData;

// Safe HTML rendering:
import DOMPurify from "dompurify";
el.innerHTML = DOMPurify.sanitize(userData);
```

---

**Q90: What are TypeScript generics and how do they improve WordPress block development?**
**A:** Generics allow writing reusable, type-safe functions and components. In WordPress block development with TypeScript, generics ensure attribute types and API response shapes are enforced at compile time, catching errors early.
```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
}
async function fetchPosts(): Promise<ApiResponse<WPPost[]>> {
  const res = await apiFetch({ path: "/wp/v2/posts" });
  return res as ApiResponse<WPPost[]>;
}
```

---

**Q91: What is Module Federation and what problem does it solve?**
**A:** Module Federation (Webpack 5+) allows separate builds to share code at runtime without bundling together. Applications can expose and consume modules across deployment boundaries — enabling micro-frontend architectures in large WordPress multisite builds.
```javascript
// webpack.config.js — host app
new ModuleFederationPlugin({
  remotes: {
    widgets: "widgets@https://cdn.example.com/remoteEntry.js"
  }
});
// Consume in host:
const Button = React.lazy(() => import("widgets/Button"));
```

---

**Q92: When would you use WebSockets vs Server-Sent Events (SSE)?**
**A:** WebSockets provide full-duplex bidirectional communication — use for chat, collaborative editing, or live auctions. SSE is unidirectional (server to client), simpler, works over HTTP/2, and auto-reconnects — ideal for live feeds, notifications, and order status updates in WooCommerce.
```javascript
// SSE (simpler, HTTP, auto-reconnect)
const es = new EventSource("/wp-json/myapi/v1/live-feed");
es.onmessage = (e) => updateFeed(JSON.parse(e.data));

// WebSocket (full duplex)
const ws = new WebSocket("wss://example.com/chat");
ws.send(JSON.stringify({ msg: "hello" }));
```

---

**Q93: How do you draw on a Canvas 2D context?**
**A:** Get the 2D rendering context from a `<canvas>` element, then use drawing methods like `fillRect`, `strokeText`, `drawImage`, and `arc`. Canvas renders imperatively — you manage every frame manually, unlike SVG's declarative model.
```javascript
const ctx = document.querySelector("canvas").getContext("2d");
ctx.fillStyle = "#0073aa"; // WordPress blue
ctx.fillRect(10, 10, 150, 80);
ctx.font = "20px sans-serif";
ctx.fillStyle = "#fff";
ctx.fillText("WordPress", 30, 55);
```

---

**Q94: What are WebAssembly use cases in WordPress front-end development?**
**A:** WebAssembly (Wasm) runs compiled C/C++/Rust code at near-native speed in the browser. Use cases: image/video processing (e.g., resizing uploads client-side), running PHP via WordPress Playground, heavy cryptography, and real-time audio/video codecs without server round-trips.
```javascript
const { instance } = await WebAssembly.instantiateStreaming(
  fetch("image-processor.wasm")
);
const result = instance.exports.processImage(ptr, len);
// WordPress Playground itself runs PHP via Wasm
```

---

**Q95: What is the Big-O complexity of common JavaScript array operations?**
**A:** `push`/`pop` are O(1). `shift`/`unshift` are O(n) (re-index). `indexOf`/`find` are O(n). `sort` is O(n log n). `Map`/`Set` lookup is O(1). For large lists in WordPress admin tables, prefer `Map` over array `find` for repeated lookups.
```javascript
// O(n) repeated lookups — bad for large sets
const found = posts.find(p => p.id === id);

// O(1) lookup after O(n) build — better
const postMap = new Map(posts.map(p => [p.id, p]));
postMap.get(id); // O(1)
```

---

**Q96: What is memoization and how do you implement it?**
**A:** Memoization caches the return value of a pure function keyed by its inputs. Subsequent calls with the same arguments return the cached result instantly. It trades memory for speed — useful for expensive WordPress block attribute computations.
```javascript
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}
const expensiveCalc = memoize((n) => fibonacci(n));
```

---

**Q97: What is currying and how is it useful in functional JavaScript?**
**A:** Currying transforms a function taking multiple arguments into a sequence of single-argument functions. It enables partial application — creating specialized functions from general ones without class-based abstractions.
```javascript
const curry = (fn) =>
  function curried(...args) {
    return args.length >= fn.length
      ? fn(...args)
      : (...more) => curried(...args, ...more);
  };
const add = curry((a, b, c) => a + b + c);
const add5 = add(5);
add5(3)(2); // 10
```

---

**Q98: What are pure functions and why do they matter in React/WordPress block development?**
**A:** A pure function returns the same output for the same input and has no side effects. React components should be pure (same props = same output). Pure functions are predictable, testable, and composable — the foundation of reliable block `save` functions.
```javascript
// Impure — reads external state
function getLabel() { return `${globalCounter} items`; }

// Pure — depends only on arguments
const getLabel = (count) => `${count} items`;

// React save() must be pure — no API calls, no Date.now()
```

---

**Q99: What is function composition and how do you implement it?**
**A:** Composition combines two or more functions so the output of one becomes the input of the next. `compose` applies right-to-left; `pipe` applies left-to-right. Enables building complex data transformations from simple, reusable pieces.
```javascript
const compose = (...fns) =>
  (x) => fns.reduceRight((acc, fn) => fn(acc), x);

const pipe = (...fns) =>
  (x) => fns.reduce((acc, fn) => fn(acc), x);

const process = pipe(
  (s) => s.trim(),
  (s) => s.toLowerCase(),
  (s) => s.replace(/\s+/g, "-")
);
process("  Hello World  "); // "hello-world"
```

---

**Q100: What is tail-call optimization (TCO) and does JavaScript support it?**
**A:** TCO allows a recursive function whose last action is calling itself to reuse the current stack frame, preventing stack overflow. ES6 specifies TCO in strict mode, but only Safari implements it. Use trampolines or iterative rewrites for reliable deep recursion in production.
```javascript
"use strict";
// Tail-recursive (only Safari optimizes)
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc); // tail call
}
// Trampoline for non-TCO engines:
const trampoline = (fn) => (...args) => {
  let res = fn(...args);
  while (typeof res === "function") res = res();
  return res;
};
```
