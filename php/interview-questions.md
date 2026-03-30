# PHP — Interview Questions

---

## Basic

**Q: What is the difference between `==` and `===` in PHP?**

**A:** `==` performs loose comparison with type coercion — `"1" == 1` is true, `0 == "foo"` is true (in PHP < 8), `null == false` is true. `===` performs strict comparison — both value and type must match: `"1" === 1` is false. In PHP 8.0, the behavior of `0 == "foo"` changed to false, closing a major source of bugs. Always prefer `===` in security-sensitive contexts (nonce/token comparison) and use `hash_equals()` to prevent timing attacks.

---

**Q: What is the difference between `include`, `require`, `include_once`, and `require_once`?**

**A:** `include` and `require` both insert a file's contents at the call point. The difference: `require` triggers a fatal error (`E_COMPILE_ERROR`) if the file cannot be found; `include` only issues a warning and execution continues. The `_once` variants (`include_once`, `require_once`) check whether the file has already been included in the current request and skip it if so — useful for class definitions to prevent "class already declared" errors. Use `require_once` for autoloaded class files; use `include` for optional template partials.

---

**Q: What are PHP traits and when would you use one?**

**A:** A trait is a mechanism for code reuse in single-inheritance languages. It defines methods and properties that can be included in any class with `use`. Traits are useful when multiple unrelated classes share common behavior (e.g., logging, timestamping, soft-delete logic) that does not justify a shared base class. Conflicts between traits in the same class are resolved with `insteadof` and `as`. Traits cannot be instantiated directly and do not establish type relationships.

---

**Q: What is the difference between `static` and `self` in PHP?**

**A:** Inside a class method, `self::` always refers to the class in which the method was defined, regardless of inheritance. `static::` uses Late Static Binding (PHP 5.3+) and refers to the class on which the method was actually called at runtime. This matters for inherited static methods and factory patterns where you want `static::class` to resolve to the child class.

---

**Q: What is the purpose of `declare(strict_types=1)`?**

**A:** When placed at the top of a PHP file, it enables strict type mode for that file. Without it, PHP coerces arguments: passing `"5"` to a function expecting `int` silently converts it. With `strict_types=1`, passing `"5"` to `int` throws a `TypeError`. Strict mode applies only to the file where it is declared — it does not affect files that call functions defined in strict files. Using it consistently across a codebase eliminates an entire class of type-related bugs.

---

**Q: What is `null coalescing` and the `null coalescing assignment` operator?**

**A:** The null coalescing operator `??` returns its left operand if it exists and is not null; otherwise returns the right operand: `$name = $_GET['name'] ?? 'Guest'`. This replaces `isset($_GET['name']) ? $_GET['name'] : 'Guest'`. The null coalescing assignment operator `??=` (PHP 7.4) assigns the right-hand value only if the left side is null: `$config['debug'] ??= false` — equivalent to `$config['debug'] = $config['debug'] ?? false`.

---

**Q: How does PHP handle sessions and what are their security risks?**

**A:** PHP sessions store data server-side, identified by a session ID sent to the client as a cookie (`PHPSESSID`). Risks: (1) **Session hijacking** — an attacker steals the session ID. Mitigate with `session.cookie_httponly=1`, `session.cookie_secure=1` (HTTPS only), `session.cookie_samesite=Strict`. (2) **Session fixation** — attacker sets a known session ID before login. Mitigate with `session_regenerate_id(true)` after successful authentication. (3) **Session data exposure** — sessions stored in `/tmp` by default; use a database or Redis backend for shared hosting.

---

## Mid

**Q: Explain how PHP generators work and give a use case.**

**A:** A generator is a function that uses `yield` to pause and return a value to the caller while preserving its execution state. When the caller calls `next()` (or iterates with `foreach`), the generator resumes from the `yield` point. Generators are memory-efficient because they produce values on demand rather than building the entire result in memory. Use case: reading a 500 MB CSV file line by line — a generator yields each parsed row without loading the file into a single array, keeping memory usage constant at O(1) rather than O(n).

---

**Q: What is the difference between `abstract` class and `interface`?**

**A:** An `interface` defines a pure contract — method signatures only (no implementation), all methods are implicitly public. A class can implement multiple interfaces. An `abstract class` can have both abstract (signature-only) and concrete (implemented) methods, any visibility, and properties. A class can extend only one abstract class. Use an interface when you need to define a capability that unrelated classes can share (e.g., `Serializable`, `Countable`). Use an abstract class when you have shared implementation logic and want to enforce a common base structure.

---

**Q: How does PHP's SPL (Standard PHP Library) help with data structures?**

**A:** SPL provides efficient data structure implementations: `SplStack` (LIFO), `SplQueue` (FIFO), `SplDoublyLinkedList`, `SplPriorityQueue`, `SplHeap`/`SplMinHeap`/`SplMaxHeap`, `SplFixedArray` (faster than arrays for fixed-size numeric-indexed data). SPL also provides iterator interfaces (`IteratorAggregate`, `RecursiveIterator`), file handling (`SplFileObject`), and autoloading support. For most WordPress development, plain arrays suffice, but SPL structures shine for algorithm-heavy plugins (e.g., priority queues for scheduling).

---

**Q: What is Dependency Injection and why is it important in PHP?**

**A:** Dependency Injection (DI) is passing dependencies to an object rather than having the object create them internally. A class declares its dependencies in the constructor (or via setters/method injection), and a DI container resolves and injects them. Benefits: (1) Testability — dependencies can be replaced with mocks. (2) Loose coupling — classes depend on interfaces, not concrete implementations. (3) Single Responsibility — classes do not manage the lifecycle of their dependencies. WordPress does not ship a DI container, but plugins can include one (e.g., PHP-DI, League Container).

---

**Q: Explain `array_map`, `array_filter`, and `array_reduce` — when do you use each?**

**A:** `array_map( callable, array )` — transforms each element and returns a new array of the same length. `array_filter( array, callable )` — returns a new array containing only elements for which the callable returns true; keys are preserved. `array_reduce( array, callable, initial )` — reduces an array to a single value by accumulating through a callback. Use `array_map` for data transformation (sanitizing values), `array_filter` for removing unwanted elements (unpublished posts), `array_reduce` for aggregation (summing totals, building associative structures).

---

**Q: What is the difference between pass-by-value and pass-by-reference in PHP?**

**A:** PHP passes scalars (int, string, float, bool) and arrays by value by default — the function receives a copy. Objects are passed by "handle" — both caller and callee reference the same object instance (mutations are visible to the caller), but reassigning the variable inside the function does not affect the original. True pass-by-reference uses `&`: `function increment( &$val ) { $val++; }`. Arrays are copy-on-write — the copy is deferred until a write occurs, so passing a large array is cheap unless the function modifies it.

---

**Q: How does PHP's OPcache work and how should it be configured for production?**

**A:** OPcache compiles PHP source files to bytecode and stores the bytecode in shared memory. Subsequent requests execute the cached bytecode directly, skipping parsing and compilation (typically 3–5x speedup). Key production settings: `opcache.enable=1`, `opcache.memory_consumption=256` (MB), `opcache.max_accelerated_files=10000`, `opcache.validate_timestamps=0` (do not check file mtimes — requires cache invalidation on deploy via `opcache_reset()`), `opcache.revalidate_freq=0`, `opcache.save_comments=1` (required for annotations/Doctrine). On deploy, either restart PHP-FPM or call `opcache_reset()` via a secured endpoint.

---

## Advanced

**Q: Explain Late Static Binding and a practical use case.**

**A:** Late Static Binding (LSB, PHP 5.3+) — `static::` resolves to the class on which a static method was called at runtime, rather than the class in which the method was defined (`self::`). Practical use: a generic Active Record base class. When `User::find(1)` calls a parent `find()` method, using `static::class` creates an instance of `User`, not the parent class. Similarly, `static::TABLE` accesses the child class's TABLE constant override. Without LSB, a parent class would instantiate itself instead of the subclass, breaking the pattern.

---

**Q: How would you implement a memoization function in PHP?**

**A:** Memoization caches the return value of a pure function keyed on its arguments, avoiding redundant computation:
```php
function memoize( callable $fn ): Closure {
    $cache = [];
    return function() use ( $fn, &$cache ) {
        $key = serialize( func_get_args() );
        if ( ! array_key_exists( $key, $cache ) ) {
            $cache[ $key ] = $fn( ...func_get_args() );
        }
        return $cache[ $key ];
    };
}
```
The cache is stored in the closure's scope. Caveat: `serialize()` is slow for large objects — use a hash or a custom key strategy. For WordPress, transients provide cross-request memoization with TTL.

---

**Q: What are PHP Fibers (8.1) and how do they differ from coroutines and threads?**

**A:** Fibers are first-class coroutines — they can suspend and resume execution. A `Fiber` is started with `start()`, paused inside via `Fiber::suspend( $value )`, and resumed by the caller with `resume( $value )`. Unlike threads: Fibers run in a single thread (no parallelism, no shared memory hazards), and switching is cooperative (explicit `suspend` calls). Unlike generators: Fibers can suspend from deeply nested call stacks — not just at the generator function level. ReactPHP and Amp use Fibers to implement async I/O with synchronous-looking code.

---

**Q: Explain how you would write a PHP script that processes 10 million database rows without running out of memory.**

**A:** Key techniques: (1) **Unbuffered query** — use `mysqli_use_result()` or PDO with `MYSQL_ATTR_USE_BUFFERED_QUERY => false` to stream rows rather than loading them all into PHP memory. (2) **Generator-based iteration** — `yield` each row so only one row is in memory at a time. (3) **Chunk processing** — `SELECT ... LIMIT 1000 OFFSET $offset` in a loop; combine with `unset()` after each chunk. (4) **WP-CLI batching** — use `WP_CLI\Utils\make_progress_bar` and `--batch-size` arguments for command-line processing. (5) **MySQL cursor** — for stored procedures, use a server-side cursor. The generator approach with unbuffered queries is the most memory-efficient.

---

**Q: What is the PHP object cloning mechanism and what pitfalls exist with deep vs. shallow clone?**

**A:** `clone $obj` creates a shallow copy — scalar properties are copied by value, but object properties still point to the same instances (shared references). The `__clone()` magic method runs after cloning, allowing you to deep-clone nested objects: `$this->address = clone $this->address`. Pitfalls: (1) Forgetting to clone nested objects leads to two instances sharing state — mutations in one affect the other. (2) Resources (file handles, DB connections) cannot be meaningfully cloned. (3) Circular references require careful handling to avoid infinite loops in `__clone()`.

---

**Q: How do you implement a robust retry mechanism with exponential backoff in PHP?**

**A:**
```php
function retry( callable $fn, int $maxAttempts = 3, int $baseDelayMs = 100 ): mixed {
    $attempt = 0;
    while ( true ) {
        try {
            return $fn();
        } catch ( \Throwable $e ) {
            $attempt++;
            if ( $attempt >= $maxAttempts ) {
                throw $e; // re-throw after exhausting retries
            }
            // Exponential backoff with jitter
            $delayMs = $baseDelayMs * (2 ** $attempt) + random_int( 0, 50 );
            usleep( $delayMs * 1000 );
        }
    }
}
```
Key considerations: only retry idempotent operations (GET, not POST-with-side-effects), distinguish retryable errors (network timeouts, 429, 503) from terminal ones (400, 401), add jitter to prevent thundering-herd, set a maximum total timeout, and log each retry attempt.
