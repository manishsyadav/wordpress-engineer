# PHP — Interview Questions

> **100 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is the difference between `echo` and `print` in PHP?**

**A:** Both output strings, but `echo` can take multiple comma-separated arguments and has no return value. `print` always returns `1`, making it usable in expressions. `echo` is marginally faster since it has no return overhead.

```php
echo "Hello", " ", "World"; // multiple args
$result = print("Hello");   // $result === 1
```

---

**Q2: What are PHP's scalar types?**

**A:** PHP has four scalar types: `int`, `float`, `string`, and `bool`. These are the building blocks for all other types. PHP is dynamically typed, so variables can change type at runtime unless strict mode is enabled.

```php
$i = 42;        // int
$f = 3.14;      // float
$s = "hello";   // string
$b = true;      // bool
var_dump($i, $f, $s, $b);
```

---

**Q3: How do you declare and access an indexed array?**

**A:** Indexed arrays use integer keys starting at 0 by default. Declare with `[]` or `array()`. Access elements by their numeric index. Use `count()` to get the length.

```php
$fruits = ['apple', 'banana', 'cherry'];
echo $fruits[0]; // apple
echo count($fruits); // 3
$fruits[] = 'date'; // append
```

---

**Q4: How do you declare and access an associative array?**

**A:** Associative arrays use named string keys instead of numeric indexes. They work like hash maps. Access values by key name using square brackets or `array_key_exists()` to check for a key.

```php
$user = [
    'name'  => 'Alice',
    'email' => 'alice@example.com',
    'age'   => 30,
];
echo $user['name']; // Alice
```

---

**Q5: How do you create and access a multidimensional array?**

**A:** Arrays can contain other arrays, forming nested structures. Access nested values by chaining bracket notation. Common in WordPress for things like menu structures or meta data.

```php
$posts = [
    ['id' => 1, 'title' => 'Hello'],
    ['id' => 2, 'title' => 'World'],
];
echo $posts[0]['title']; // Hello
```

---

**Q6: Name five common string functions in PHP.**

**A:** Key ones: `strlen()` for length, `strtolower()`/`strtoupper()` for case, `str_replace()` for substitution, `strpos()` for position, and `substr()` for extraction. These cover the majority of everyday string manipulation needs.

```php
$s = "Hello World";
echo strlen($s);               // 11
echo strtolower($s);           // hello world
echo str_replace('World', 'PHP', $s); // Hello PHP
echo substr($s, 6, 5);         // World
```

---

**Q7: Name five common array functions in PHP.**

**A:** `array_push()` adds to end, `array_pop()` removes from end, `in_array()` checks existence, `array_merge()` combines arrays, and `array_keys()` returns all keys. These are essential daily-use functions.

```php
$a = [1, 2, 3];
array_push($a, 4);
$last = array_pop($a);       // 4
$has = in_array(2, $a);      // true
$keys = array_keys(['a'=>1]); // ['a']
```

---

**Q8: How does `if/else/elseif` work in PHP?**

**A:** Standard conditional branching — `if` evaluates a condition, `elseif` provides additional conditions, and `else` is the fallback. PHP also supports an alternative syntax with colons useful in template files.

```php
$score = 75;
if ($score >= 90) {
    echo 'A';
} elseif ($score >= 75) {
    echo 'B'; // outputs B
} else {
    echo 'C';
}
```

---

**Q9: How does `switch` differ from `if/elseif`?**

**A:** `switch` uses loose comparison (`==`) against a single expression and falls through cases unless `break` is used. It is cleaner when comparing one variable against many values. PHP 8's `match` is a stricter modern replacement.

```php
$day = 'Mon';
switch ($day) {
    case 'Mon':
        echo 'Monday';
        break;
    default:
        echo 'Other';
}
```

---

**Q10: What are the loop types in PHP and when do you use each?**

**A:** `for` when the iteration count is known, `while` when condition-driven, `do-while` when the body must execute at least once, and `foreach` for iterating arrays/objects. In WordPress templates, `foreach` is most common.

```php
$items = ['a', 'b', 'c'];
foreach ($items as $key => $val) {
    echo "$key: $val\n";
}
```

---

**Q11: How do you define and call a function in PHP?**

**A:** Use the `function` keyword followed by a name and parameter list. PHP supports default parameter values and type hints. Functions can return a value with `return` or nothing (void).

```php
function greet(string $name = 'World'): string {
    return "Hello, $name!";
}
echo greet('Alice'); // Hello, Alice!
```

---

**Q12: What is the difference between `include`, `require`, `include_once`, and `require_once`?**

**A:** `include` emits a warning on failure and continues; `require` emits a fatal error. The `_once` variants prevent the file from being loaded more than once. In WordPress, `require_once` is standard for loading class files.

```php
require_once 'config.php';   // fatal if missing
include_once 'optional.php'; // warning if missing
```

---

**Q13: How do you define a class and create an object in PHP?**

**A:** Use the `class` keyword to define a blueprint, then `new ClassName()` to instantiate an object. Properties and methods can be `public`, `protected`, or `private`. Objects are passed by reference handle by default.

```php
class Dog {
    public string $name;
    public function bark(): string {
        return "Woof!";
    }
}
$d = new Dog();
$d->name = 'Rex';
echo $d->bark(); // Woof!
```

---

**Q14: What is `$this` in PHP?**

**A:** `$this` is a pseudo-variable inside a class method that refers to the current object instance. It lets you access instance properties and methods from within the class. It is unavailable in static methods.

```php
class Counter {
    private int $count = 0;
    public function increment(): void {
        $this->count++;
    }
    public function get(): int {
        return $this->count;
    }
}
```

---

**Q15: What is a constructor and how is it defined?**

**A:** A constructor is `__construct()` — a magic method called automatically when an object is instantiated. Use it to initialize properties or inject dependencies. PHP 8.0 added constructor property promotion to reduce boilerplate.

```php
class User {
    public function __construct(
        private string $name,
        private string $email
    ) {}
    public function getName(): string { return $this->name; }
}
```

---

**Q16: How does inheritance work with `extends`?**

**A:** A child class inherits all public and protected methods and properties from the parent. Use `parent::method()` to call the parent implementation. A class can only extend one parent (single inheritance).

```php
class Animal {
    public function speak(): string { return '...'; }
}
class Cat extends Animal {
    public function speak(): string { return 'Meow'; }
}
echo (new Cat())->speak(); // Meow
```

---

**Q17: What is an interface in PHP?**

**A:** An interface defines a contract — a set of method signatures a class must implement. Interfaces have no implementation code. A class can implement multiple interfaces, which PHP uses to simulate multiple inheritance.

```php
interface Drawable {
    public function draw(): string;
}
class Circle implements Drawable {
    public function draw(): string { return 'Drawing circle'; }
}
```

---

**Q18: What are static methods and properties?**

**A:** Static members belong to the class itself, not to any instance. Access them with `ClassName::method()` or `self::method()` inside the class. They persist across calls and are useful for counters, registries, and utility functions.

```php
class MathHelper {
    public static function square(int $n): int {
        return $n * $n;
    }
}
echo MathHelper::square(5); // 25
```

---

**Q19: What is the null coalescing operator `??`?**

**A:** `??` returns the left operand if it exists and is not `null`; otherwise it returns the right operand. It short-circuits `isset()` checks. `??=` is the null coalescing assignment, useful for lazy initialization.

```php
$config = [];
$timeout = $config['timeout'] ?? 30; // 30
$config['timeout'] ??= 60;           // sets to 60
echo $config['timeout'];              // 60
```

---

**Q20: What is the ternary operator and when should you use it?**

**A:** `condition ? value_if_true : value_if_false` is a concise inline conditional. The short ternary `?:` returns the left side if truthy. Use for simple assignments; avoid nesting ternaries as they are hard to read.

```php
$age = 20;
$status = ($age >= 18) ? 'adult' : 'minor'; // adult
$name = $_GET['name'] ?? '';
$display = $name ?: 'Guest'; // Guest if empty
```

---

**Q21: What is heredoc and nowdoc syntax?**

**A:** Heredoc (`<<<LABEL`) works like a double-quoted string — variables are interpolated. Nowdoc (`<<<'LABEL'`) works like a single-quoted string — no interpolation. Both preserve newlines and are useful for multi-line strings.

```php
$name = "World";
$heredoc = <<<EOT
Hello $name
EOT;

$nowdoc = <<<'EOT'
Hello $name
EOT;
// $nowdoc contains the literal "$name"
```

---

**Q22: What is type juggling in PHP?**

**A:** PHP automatically converts types when operands of different types are used together. This can produce surprising results — `"5 apples" + 3 = 8`. PHP 8 tightened many of these rules. Always use strict comparisons to avoid juggling bugs.

```php
var_dump(0 == "foo");   // bool(false) in PHP 8
var_dump("1" + 1);      // int(2)
var_dump(true + true);  // int(2)
```

---

**Q23: How does type casting work in PHP?**

**A:** Cast with `(int)`, `(float)`, `(string)`, `(bool)`, `(array)`, `(object)`. Casting does not modify the original variable. Use `intval()`, `floatval()`, `strval()` as functional equivalents.

```php
$val = "42abc";
$int  = (int) $val;    // 42
$bool = (bool) $val;   // true
$arr  = (array) $val;  // ['42abc']
```

---

**Q24: How do `is_array()`, `is_string()`, `isset()`, and `empty()` differ?**

**A:** `is_array()`/`is_string()` check type. `isset()` returns `true` if a variable exists and is not `null`. `empty()` returns `true` for `""`, `0`, `"0"`, `null`, `false`, `[]`. Knowing what `empty()` catches is critical.

```php
$x = 0;
var_dump(isset($x));  // true  — x is set
var_dump(empty($x));  // true  — 0 is "empty"
var_dump(is_int($x)); // true
```

---

**Q25: How do you work with dates and times in PHP?**

**A:** Use `date()` for formatted output, `time()` for Unix timestamp, `strtotime()` to parse strings, and the `DateTime`/`DateTimeImmutable` classes for OOP-style manipulation. WordPress uses `current_time()` to respect site timezone.

```php
echo date('Y-m-d');                         // 2026-03-29
$dt = new DateTimeImmutable('2026-01-01');
$dt = $dt->modify('+30 days');
echo $dt->format('D, d M Y');
```

---

**Q26: How do `file_get_contents()` and `file_put_contents()` work?**

**A:** `file_get_contents()` reads a file (or URL) into a string. `file_put_contents()` writes a string to a file, creating it if needed. Pass `FILE_APPEND` as a flag to append instead of overwrite.

```php
$data = file_get_contents('/tmp/data.txt');
$data .= "\nNew line";
file_put_contents('/tmp/data.txt', $data);
```

---

**Q27: How do `json_encode()` and `json_decode()` work?**

**A:** `json_encode()` converts a PHP value to a JSON string. `json_decode()` parses JSON into a PHP `stdClass` by default; pass `true` as the second argument to get an associative array instead. Always check for `null` return on decode errors.

```php
$arr  = ['name' => 'Alice', 'age' => 30];
$json = json_encode($arr);    // {"name":"Alice","age":30}
$back = json_decode($json, true);
echo $back['name'];           // Alice
```

---

**Q28: How does `list()` / array destructuring work?**

**A:** `list()` or the shorthand `[]` unpacks array values into variables in one assignment. Works positionally for indexed arrays and by key for associative arrays (PHP 7.1+). Useful for unpacking function return values.

```php
[$first, $second] = ['Alice', 'Bob'];
echo $first; // Alice

['name' => $name, 'age' => $age] = ['name' => 'Eve', 'age' => 25];
echo $name; // Eve
```

---

**Q29: What is the `match` expression in PHP 8.0?**

**A:** `match` is a strict-comparison alternative to `switch`. It returns a value, requires no `break`, throws `UnhandledMatchError` if no arm matches, and uses `===` comparison. Multiple conditions can share an arm.

```php
$status = 2;
$label = match($status) {
    1       => 'Published',
    2, 3    => 'Draft',
    default => 'Unknown',
};
echo $label; // Draft
```

---

**Q30: What are named arguments in PHP 8.0?**

**A:** Named arguments let you pass values by parameter name, skipping optional parameters and improving readability. Order no longer matters when names are used. They work with built-in and user-defined functions.

```php
function makeTag(string $tag, string $content, string $class = ''): string {
    return "<$tag class=\"$class\">$content</$tag>";
}
echo makeTag(content: 'Hello', tag: 'p', class: 'intro');
```

---

**Q31: What is the difference between single-quoted and double-quoted strings?**

**A:** Single-quoted strings treat everything literally except `\\` and `\'`. Double-quoted strings interpolate variables and parse escape sequences like `\n` and `\t`. Single-quoted is marginally faster for plain strings.

```php
$name = 'World';
echo 'Hello $name';  // Hello $name (literal)
echo "Hello $name";  // Hello World (interpolated)
echo "Line1\nLine2"; // newline processed
```

---

**Q32: How does `foreach` work with references?**

**A:** By default `foreach` copies values. Prefix `&` to the variable to modify the original array elements in place. Always `unset()` the reference variable after the loop to avoid subtle bugs with the last element.

```php
$nums = [1, 2, 3];
foreach ($nums as &$n) {
    $n *= 2;
}
unset($n); // important!
print_r($nums); // [2, 4, 6]
```

---

**Q33: How do you handle errors with `try/catch` in PHP?**

**A:** Wrap risky code in `try`, catch specific exception types in `catch` blocks, and use `finally` for cleanup that runs regardless of success or failure. PHP 8 allows catching multiple types with `|`.

```php
try {
    $pdo = new PDO('mysql:host=bad', 'u', 'p');
} catch (PDOException $e) {
    echo 'DB error: ' . $e->getMessage();
} finally {
    echo 'Done';
}
```

---

**Q34: How do you define and use constants in PHP?**

**A:** `define()` creates a runtime constant; `const` creates a compile-time constant usable in classes. Class constants are accessed with `::`. Constants are global by scope and cannot be reassigned.

```php
define('MAX_RETRIES', 3);
const APP_VERSION = '2.0';

class Config {
    const TIMEOUT = 30;
}
echo Config::TIMEOUT; // 30
```

---

**Q35: What does the spread/splat operator `...` do in function calls?**

**A:** `...` unpacks an array into individual arguments in a function call (argument unpacking). It can also collect variadic arguments in function definitions. Available since PHP 5.6.

```php
function add(int $a, int $b, int $c): int {
    return $a + $b + $c;
}
$args = [1, 2, 3];
echo add(...$args); // 6
```

---

## Mid

**Q36: What is an abstract class and when do you use one?**

**A:** An abstract class cannot be instantiated and may contain abstract methods (no body) that subclasses must implement. Use it when you want to share code among related classes while enforcing a common interface.

```php
abstract class Shape {
    abstract public function area(): float;
    public function describe(): string {
        return 'Area: ' . $this->area();
    }
}
class Circle extends Shape {
    public function __construct(private float $r) {}
    public function area(): float { return M_PI * $this->r ** 2; }
}
```

---

**Q37: What are traits and how do they solve the single-inheritance limitation?**

**A:** Traits are reusable method bundles that can be mixed into any class with `use`. A class can use multiple traits, effectively enabling horizontal code reuse. Traits cannot be instantiated on their own.

```php
trait Loggable {
    public function log(string $msg): void {
        error_log(static::class . ': ' . $msg);
    }
}
class UserService {
    use Loggable;
    public function create(): void { $this->log('User created'); }
}
```

---

**Q38: What is the difference between an interface and an abstract class?**

**A:** Interfaces define a pure contract (no implementation, all methods public), and a class can implement many. Abstract classes can have implemented methods, any visibility, and only one can be extended. Use interfaces for type contracts, abstract classes for shared behavior.

```php
interface Cacheable { public function getCacheKey(): string; }
abstract class BaseModel {
    abstract public function save(): bool;
    public function validate(): bool { return true; }
}
```

---

**Q39: What are magic methods? Name and describe five.**

**A:** Magic methods are auto-called by PHP on special events. `__get`/`__set` intercept property access, `__call` intercepts undefined method calls, `__toString` defines string casting behavior, `__invoke` makes objects callable.

```php
class Magic {
    private array $data = [];
    public function __get(string $k): mixed { return $this->data[$k] ?? null; }
    public function __set(string $k, mixed $v): void { $this->data[$k] = $v; }
    public function __toString(): string { return json_encode($this->data); }
}
```

---

**Q40: What does `declare(strict_types=1)` do?**

**A:** It enables strict type checking for scalar type declarations in the file where it appears. Without it, PHP coerces `"5"` to `5` for an `int` parameter. Must appear on line 1. It is file-scoped and does not affect called files.

```php
<?php
declare(strict_types=1);

function double(int $n): int { return $n * 2; }
double(3);    // OK
double("3");  // TypeError in strict mode
```

---

**Q41: What are union types in PHP 8.0?**

**A:** Union types allow a parameter or return type to accept multiple types using `|`. This replaces PHPDoc `@param int|string`. PHP validates the declared union at runtime in strict mode.

```php
function formatId(int|string $id): string {
    return (string) $id;
}
echo formatId(42);     // "42"
echo formatId("abc");  // "abc"
```

---

**Q42: What are nullable types in PHP?**

**A:** Prefix a type with `?` to allow both that type and `null`. `?string` means the parameter or return can be a string or null. Equivalent to the union type `string|null` introduced later.

```php
function findUser(?int $id): ?string {
    if ($id === null) return null;
    return "User $id";
}
echo findUser(null); // null
echo findUser(5);    // User 5
```

---

**Q43: What are arrow functions in PHP 7.4?**

**A:** Arrow functions (`fn() =>`) are a short syntax for closures that automatically capture outer variables by value (no `use` keyword needed). They are single-expression and return the expression result implicitly.

```php
$multiplier = 3;
$fn = fn(int $n): int => $n * $multiplier;
echo $fn(5); // 15

$doubled = array_map(fn($x) => $x * 2, [1, 2, 3]);
```

---

**Q44: What are generators and the `yield` keyword?**

**A:** A generator function uses `yield` to produce values one at a time, pausing execution between yields. This avoids loading large datasets into memory. The function returns a `Generator` object implementing `Iterator`.

```php
function rangeGen(int $start, int $end): Generator {
    for ($i = $start; $i <= $end; $i++) {
        yield $i;
    }
}
foreach (rangeGen(1, 1000000) as $n) {
    // processes one at a time — memory efficient
}
```

---

**Q45: How do closures work in PHP?**

**A:** Closures are anonymous functions created with `function() {}`. They can capture outer scope variables with the `use` keyword. Closures are instances of the `Closure` class and can be passed as callbacks.

```php
$message = 'Hello';
$greet = function(string $name) use ($message): string {
    return "$message, $name!";
};
echo $greet('Alice'); // Hello, Alice!
```

---

**Q46: How do `array_map()`, `array_filter()`, and `array_reduce()` work?**

**A:** `array_map()` applies a callback to each element. `array_filter()` removes elements where the callback returns false. `array_reduce()` collapses an array to a single value using a callback and an initial carry value.

```php
$nums = [1, 2, 3, 4, 5];
$doubled  = array_map(fn($n) => $n * 2, $nums);
$evens    = array_filter($nums, fn($n) => $n % 2 === 0);
$sum      = array_reduce($nums, fn($carry, $n) => $carry + $n, 0);
```

---

**Q47: How does `usort()` work?**

**A:** `usort()` sorts an array using a user-supplied comparison function. The callback receives two elements and returns negative, zero, or positive. The spaceship operator `<=>` simplifies writing comparison callbacks.

```php
$people = [
    ['name' => 'Bob', 'age' => 30],
    ['name' => 'Alice', 'age' => 25],
];
usort($people, fn($a, $b) => $a['age'] <=> $b['age']);
echo $people[0]['name']; // Alice
```

---

**Q48: What is the splat operator `...` in function definitions?**

**A:** In a function signature, `...$args` collects all extra arguments into an array (variadic parameter). Combine with type hints for typed variadic functions. Only one variadic parameter is allowed and it must be last.

```php
function sumAll(int ...$nums): int {
    return array_sum($nums);
}
echo sumAll(1, 2, 3, 4); // 10
```

---

**Q49: How does spreading work inside array literals?**

**A:** Since PHP 7.4, you can spread an array into another array with `...`. PHP 8.1 added support for string-keyed arrays. This is useful for merging defaults with overrides.

```php
$defaults = ['color' => 'red', 'size' => 'M'];
$overrides = ['size' => 'L', 'weight' => '200g'];
$merged = [...$defaults, ...$overrides];
// ['color'=>'red','size'=>'L','weight'=>'200g']
```

---

**Q50: What is late static binding (`static::`) in PHP?**

**A:** `self::` always refers to the class where the method is defined. `static::` refers to the class that was actually called at runtime, enabling correct behavior in inheritance hierarchies — essential for implementing active-record-style patterns.

```php
class ParentClass {
    public static function create(): static {
        return new static(); // creates the child class
    }
}
class ChildClass extends ParentClass {}
$obj = ChildClass::create(); // instanceof ChildClass
```

---

**Q51: What are namespaces and how does PSR-4 autoloading work?**

**A:** Namespaces prevent naming conflicts by providing a hierarchical naming scheme. PSR-4 maps namespace prefixes to directory paths. Composer generates an autoloader that requires the correct file based on the fully-qualified class name.

```php
<?php
namespace App\Services;

class UserService {
    // File lives at src/Services/UserService.php
    // composer.json: "App\\" => "src/"
}
```

---

**Q52: How does Composer work and what are its key files?**

**A:** Composer is PHP's dependency manager. `composer.json` declares dependencies and autoload rules. `composer.lock` pins exact versions. `vendor/autoload.php` is the generated autoloader. `composer install` respects the lockfile; `composer update` resolves new versions.

```php
// composer.json excerpt
{
    "require": { "monolog/monolog": "^3.0" },
    "autoload": { "psr-4": { "App\\": "src/" } }
}
// In code:
require 'vendor/autoload.php';
```

---

**Q53: How do custom exceptions work in PHP?**

**A:** Extend `\Exception` or `\RuntimeException` to create domain-specific exceptions. This allows catching specific exception types and carrying custom data. `finally` always runs regardless of whether an exception was thrown or caught.

```php
class ValidationException extends \RuntimeException {
    public function __construct(private array $errors) {
        parent::__construct('Validation failed', 422);
    }
    public function getErrors(): array { return $this->errors; }
}
```

---

**Q54: What are PHP sessions and how do they work?**

**A:** Sessions store data server-side across requests, identified by a session ID cookie sent to the browser. `session_start()` initializes the session. `$_SESSION` is the superglobal for reading/writing session data. Always regenerate the ID after login to prevent fixation.

```php
session_start();
$_SESSION['user_id'] = 42;
session_regenerate_id(true); // prevent fixation

// Later request:
session_start();
echo $_SESSION['user_id']; // 42
```

---

**Q55: What are PHP superglobals?**

**A:** Superglobals are built-in arrays accessible everywhere without `global`. Key ones: `$_GET` (URL query params), `$_POST` (form data), `$_SERVER` (server/env info), `$_SESSION`, `$_COOKIE`, `$_FILES`, `$_ENV`. Always sanitize/validate before use.

```php
$method = $_SERVER['REQUEST_METHOD'];     // GET, POST…
$page   = (int) ($_GET['page'] ?? 1);    // sanitized
$name   = htmlspecialchars($_POST['name'] ?? '');
```

---

**Q56: How do you use prepared statements with PDO?**

**A:** Prepared statements separate SQL structure from data, preventing SQL injection. Use `?` or `:name` placeholders and `bindParam()`/`bindValue()` or pass an array to `execute()`. Always use PDO in `ERRMODE_EXCEPTION`.

```php
$pdo = new PDO('mysql:host=localhost;dbname=db', 'u', 'p', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
$stmt->execute([':id' => $userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
```

---

**Q57: How do `password_hash()` and `password_verify()` work?**

**A:** `password_hash()` creates a bcrypt (or argon2) hash with a built-in salt. `password_verify()` checks a plaintext password against the hash. Use `password_needs_rehash()` to upgrade old hashes. Never use `md5` or `sha1` for passwords.

```php
$hash = password_hash('secret123', PASSWORD_BCRYPT);
if (password_verify('secret123', $hash)) {
    echo 'Valid!';
}
```

---

**Q58: How does `filter_var()` work for validation?**

**A:** `filter_var()` validates and sanitizes data using predefined filter constants. Use `FILTER_VALIDATE_EMAIL`, `FILTER_VALIDATE_INT`, `FILTER_VALIDATE_URL`, and `FILTER_SANITIZE_*` variants. More reliable than manual regex for common formats.

```php
$email = 'user@example.com';
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    throw new \InvalidArgumentException('Bad email');
}
$int = filter_var('42abc', FILTER_VALIDATE_INT); // false
```

---

**Q59: How do `preg_match()` and `preg_replace()` work?**

**A:** `preg_match()` tests a PCRE pattern against a string, returning `1` on match and populating a `$matches` array. `preg_replace()` replaces all matches with a replacement string. Use delimiters (e.g., `/`) and flags like `i` for case-insensitive.

```php
$phone = '+1 (555) 123-4567';
if (preg_match('/^\+[\d\s\(\)-]{7,}$/', $phone)) {
    echo 'Valid phone';
}
$slug = preg_replace('/[^a-z0-9]+/', '-', strtolower('Hello World!')); // hello-world-
```

---

**Q60: What is output buffering (`ob_start()`) and when is it useful?**

**A:** Output buffering captures all output in a buffer instead of sending it directly to the browser. Use `ob_start()` to begin, `ob_get_clean()` to retrieve and clear. Essential for sending headers after output has started, or building strings from template includes.

```php
ob_start();
echo '<p>Hello</p>';
$html = ob_get_clean(); // captured, nothing sent yet
// now you can modify $html or send custom headers
```

---

**Q61: What are SPL data structures in PHP?**

**A:** SPL provides specialized data structures: `SplStack`, `SplQueue`, `SplMinHeap`/`SplMaxHeap`, `SplDoublyLinkedList`, `SplFixedArray`. They offer better performance than plain arrays for specific operations like priority queues.

```php
$queue = new SplQueue();
$queue->enqueue('first');
$queue->enqueue('second');
echo $queue->dequeue(); // first (FIFO)
```

---

**Q62: What is the Reflection API in PHP?**

**A:** The Reflection API inspects classes, methods, and properties at runtime without instantiating objects. Used extensively by DI containers, ORMs, and testing frameworks to read annotations/attributes and inject dependencies automatically.

```php
$ref = new ReflectionClass(UserService::class);
foreach ($ref->getConstructor()->getParameters() as $param) {
    echo $param->getName() . ': ' . $param->getType() . "\n";
}
```

---

**Q63: What is PHP OPcache and how does it improve performance?**

**A:** OPcache compiles PHP scripts to bytecode on first request and caches the result in shared memory, skipping the parse/compile step on subsequent requests. This dramatically reduces CPU and response time. Enable with `opcache.enable=1`.

```ini
; php.ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0  ; prod: disable for speed
```

---

**Q64: What is PHP-FPM and how does it differ from mod_php?**

**A:** PHP-FPM (FastCGI Process Manager) runs PHP as a separate process pool that communicates with web servers via FastCGI. Unlike mod_php (embedded in Apache), it allows per-pool config, independent restarts, and serves Nginx well. It is the standard for modern WordPress hosting.

```ini
; www.conf pool
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
```

---

**Q65: How do you use `abstract` with constructor injection?**

**A:** An abstract class can define a constructor that subclasses call via `parent::__construct()`. Combined with type-hinted parameters, this enforces that all subclasses receive required dependencies while sharing initialization logic.

```php
abstract class BaseRepository {
    public function __construct(protected PDO $pdo) {}
    abstract public function findById(int $id): ?array;
}
class UserRepository extends BaseRepository {
    public function findById(int $id): ?array {
        $s = $this->pdo->prepare('SELECT * FROM users WHERE id=?');
        $s->execute([$id]);
        return $s->fetch() ?: null;
    }
}
```

---

**Q66: How does `__invoke()` make an object callable?**

**A:** Defining `__invoke()` lets an object be called like a function. This is used in middleware pipelines, command handlers, and strategy patterns. Check with `is_callable($obj)` or `$obj instanceof Closure`.

```php
class Multiplier {
    public function __construct(private int $factor) {}
    public function __invoke(int $n): int {
        return $n * $this->factor;
    }
}
$triple = new Multiplier(3);
echo $triple(7); // 21
```

---

**Q67: How does `__toString()` work and when is it triggered?**

**A:** `__toString()` is called when an object is cast to string or used in a string context (e.g., `echo $obj`, string concatenation). It must return a string. PHP 8 allows throwing exceptions from it.

```php
class Money {
    public function __construct(
        private int $amount,
        private string $currency
    ) {}
    public function __toString(): string {
        return number_format($this->amount / 100, 2) . ' ' . $this->currency;
    }
}
echo new Money(1050, 'USD'); // 10.50 USD
```

---

**Q68: What is `__call()` and `__callStatic()` used for?**

**A:** `__call()` intercepts calls to inaccessible or undefined instance methods. `__callStatic()` does the same for static calls. They are used in proxy/decorator patterns and magic method delegation in ORMs and test mocking libraries.

```php
class Proxy {
    public function __construct(private object $target) {}
    public function __call(string $method, array $args): mixed {
        error_log("Calling $method");
        return $this->target->$method(...$args);
    }
}
```

---

**Q69: How do you implement PSR-4 autoloading without Composer?**

**A:** Register a custom autoload function with `spl_autoload_register()` that converts namespace separators to directory separators and appends `.php`. Composer does this automatically, but knowing the mechanism is useful for debugging.

```php
spl_autoload_register(function (string $class): void {
    $base = __DIR__ . '/src/';
    $file = $base . str_replace('\\', '/', $class) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});
```

---

**Q70: What is the difference between `array_map()` with `null` callback and `array_combine()`?**

**A:** `array_map(null, ...$arrays)` transposes/zips multiple arrays into an array of arrays. `array_combine($keys, $values)` creates an associative array from two equal-length arrays. Both are useful for restructuring data.

```php
$keys   = ['a', 'b', 'c'];
$vals   = [1, 2, 3];
$assoc  = array_combine($keys, $vals); // ['a'=>1,'b'=>2,'c'=>3]

$zipped = array_map(null, [1,2,3], ['a','b','c']);
// [[1,'a'],[2,'b'],[3,'c']]
```

---

**Q71: How do cookies work in PHP?**

**A:** `setcookie()` sends a Set-Cookie header. Cookies are available on the next request via `$_COOKIE`. Always use `HttpOnly` and `Secure` flags in production. WordPress uses cookies for auth; never store sensitive data in plaintext cookies.

```php
setcookie('user_pref', 'dark', [
    'expires'  => time() + 86400 * 30,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
```

---

**Q72: How does PHP handle type declarations for return types?**

**A:** Return type declarations appear after the `:` in the function signature. PHP 7.1 added `void`, PHP 8.0 added `mixed` and `static`, PHP 8.1 added `never` (function always throws or exits). Strict types enforce these at the call boundary.

```php
function redirect(string $url): never {
    header("Location: $url");
    exit;
}

function process(mixed $data): static {
    return $this; // method chaining
}
```

---

**Q73: What is the difference between `array_key_exists()` and `isset()` on arrays?**

**A:** `isset($arr['key'])` returns `false` if the key does not exist OR if its value is `null`. `array_key_exists('key', $arr)` returns `true` even when the value is `null`. This distinction matters when `null` is a valid array value.

```php
$arr = ['key' => null];
var_dump(isset($arr['key']));           // false — null
var_dump(array_key_exists('key', $arr)); // true  — key exists
```

---

**Q74: How does `compact()` and `extract()` work?**

**A:** `compact()` creates an associative array from variable names. `extract()` does the reverse — imports array keys as variables. Both can be convenient but `extract()` is a security risk if used on untrusted data as it can overwrite variables.

```php
$name = 'Alice';
$age  = 30;
$data = compact('name', 'age'); // ['name'=>'Alice','age'=>30]

extract(['color' => 'red', 'size' => 'L']);
echo $color; // red
```

---

**Q75: What does `array_walk()` do and how does it differ from `array_map()`?**

**A:** `array_walk()` modifies an array in place by reference, passing both key and value to the callback. `array_map()` returns a new array without keys by default. `array_walk()` preserves keys and is better for mutations.

```php
$prices = ['apple' => 1.00, 'banana' => 0.50];
array_walk($prices, function (&$price, $item): void {
    $price = "$item costs \${$price}";
});
```

---

## Advanced

**Q76: What are PHP 8.1 Enums and how do you use them?**

**A:** Enums define a fixed set of named values. Pure (unit) enums have no backing type. Backed enums have string or int values accessible via `->value`. Enums can implement interfaces and have methods.

```php
enum Status: string {
    case Published = 'published';
    case Draft     = 'draft';
    case Trash     = 'trash';

    public function label(): string {
        return ucfirst($this->value);
    }
}
echo Status::Draft->label(); // Draft
```

---

**Q77: What are readonly properties in PHP 8.1?**

**A:** `readonly` properties can only be assigned once — at initialization time. They prevent mutation after construction, making value objects naturally immutable. PHP 8.2 added readonly classes which marks all properties readonly automatically.

```php
class Coordinate {
    public function __construct(
        public readonly float $lat,
        public readonly float $lng,
    ) {}
}
$c = new Coordinate(51.5, -0.1);
$c->lat = 52.0; // Error: Cannot modify readonly property
```

---

**Q78: What are PHP 8.1 Fibers?**

**A:** Fibers are lightweight cooperative coroutines. A `Fiber` can be suspended with `Fiber::suspend()` and resumed from outside. Unlike generators, Fibers can be suspended from any call depth. They are the foundation for async PHP frameworks like ReactPHP and Revolt.

```php
$fiber = new Fiber(function (): void {
    $val = Fiber::suspend('first');
    echo "Got: $val\n";
});
$yielded = $fiber->start();       // 'first'
$fiber->resume('hello');          // Got: hello
```

---

**Q79: What are intersection types in PHP 8.1?**

**A:** Intersection types (`A&B`) require a value to satisfy multiple type constraints simultaneously — useful when a parameter must implement two interfaces. Distinct from union types (`A|B`) which require satisfying just one.

```php
interface Countable {}
interface Serializable {}

function process(Countable&Serializable $obj): void {
    // $obj must implement both interfaces
}
```

---

**Q80: What is first-class callable syntax in PHP 8.1?**

**A:** `Closure::fromCallable()` had a long-form; PHP 8.1 allows `SomeClass::method(...)` to create a `Closure` directly. This is cleaner than string callables and works with static analysis tools since the reference is type-checked at parse time.

```php
function double(int $n): int { return $n * 2; }

$fn = double(...);                         // Closure
$result = array_map(double(...), [1,2,3]); // [2,4,6]
$strlen = strlen(...);
echo $strlen('hello'); // 5
```

---

**Q81: Describe the Singleton design pattern in PHP.**

**A:** Singleton ensures only one instance of a class exists. Use a private constructor, a static `$instance` property, and a static `getInstance()` method. In WordPress context, this is common but often replaced by DI containers which are more testable.

```php
class Registry {
    private static ?self $instance = null;
    private function __construct() {}
    public static function getInstance(): static {
        return static::$instance ??= new static();
    }
}
```

---

**Q82: Describe the Factory design pattern in PHP.**

**A:** A Factory creates objects without specifying the exact class. The Factory Method pattern defines a creation interface; the concrete factory decides the subclass. Useful for creating different payment gateways, cache adapters, or logger instances based on config.

```php
interface Logger { public function log(string $msg): void; }
class FileLogger implements Logger { public function log(string $msg): void { file_put_contents('/tmp/app.log', $msg, FILE_APPEND); } }
class LoggerFactory {
    public static function make(string $type): Logger {
        return match($type) { 'file' => new FileLogger(), default => throw new \InvalidArgumentException };
    }
}
```

---

**Q83: How does the Observer/Hooks pattern work in PHP and WordPress?**

**A:** The Observer pattern notifies subscribed objects of events. WordPress implements it via `add_action()`/`do_action()` (no return) and `add_filter()`/`apply_filters()` (with return). Internally, WordPress stores callbacks in `$wp_filter` keyed by hook name and priority.

```php
// WordPress hooks as Observer pattern
add_filter('the_title', function(string $title): string {
    return strtoupper($title);
}, 10, 1);

// Custom implementation:
class EventEmitter {
    private array $listeners = [];
    public function on(string $event, callable $cb): void { $this->listeners[$event][] = $cb; }
    public function emit(string $event, mixed $data): void { foreach ($this->listeners[$event] ?? [] as $cb) $cb($data); }
}
```

---

**Q84: What is the Repository pattern and why use it in WordPress?**

**A:** The Repository pattern abstracts data access behind an interface, decoupling business logic from the database. In WordPress this means wrapping `WP_Query`, `get_posts()`, or `$wpdb` calls so you can swap implementations or mock them in tests.

```php
interface PostRepository {
    public function findById(int $id): ?WP_Post;
    public function findBySlug(string $slug): ?WP_Post;
}
class WpPostRepository implements PostRepository {
    public function findById(int $id): ?WP_Post {
        return get_post($id) ?: null;
    }
    public function findBySlug(string $slug): ?WP_Post {
        $posts = get_posts(['name' => $slug, 'numberposts' => 1]);
        return $posts[0] ?? null;
    }
}
```

---

**Q85: What is Dependency Injection and how do DI containers work?**

**A:** DI passes dependencies to a class rather than the class creating them, improving testability and decoupling. A DI container autowires dependencies by inspecting constructor type hints via the Reflection API and resolving them from its registry.

```php
class UserController {
    public function __construct(
        private UserRepository $repo,
        private Mailer $mailer
    ) {}
}
// Container resolves UserRepository and Mailer automatically:
$controller = $container->make(UserController::class);
```

---

**Q86: How does PHP manage memory and what is reference counting?**

**A:** PHP uses reference counting — each value has an internal refcount. When refcount drops to 0, memory is freed immediately. `xdebug_debug_zval()` shows refcounts. The `&` operator increments refcount by sharing the same zval between variables.

```php
$a = 'hello';   // refcount: 1
$b = $a;        // refcount: 2 (copy-on-write)
$b .= ' world'; // refcount: 1 for each (COW triggered)
unset($a);      // $a freed
```

---

**Q87: How does PHP handle circular references in garbage collection?**

**A:** Reference counting alone cannot free circular references. PHP's cycle collector (triggered periodically or by `gc_collect_cycles()`) identifies reference cycles and frees them. Use `WeakReference` to break cycles without preventing garbage collection.

```php
class Node {
    public ?Node $next = null;
}
$a = new Node();
$b = new Node();
$a->next = $b;
$b->next = $a; // circular — needs cycle GC
unset($a, $b);
gc_collect_cycles(); // frees the cycle
```

---

**Q88: What is `WeakReference` in PHP 8.0 and when do you use it?**

**A:** A `WeakReference` holds a reference to an object without incrementing its refcount, so the object can still be garbage-collected. Use in caches and event listeners to avoid memory leaks from holding stale objects alive.

```php
$obj = new stdClass();
$obj->name = 'temp';
$ref = WeakReference::create($obj);

echo $ref->get()->name; // temp
unset($obj);
var_dump($ref->get()); // NULL — object was collected
```

---

**Q89: How do you prevent SQL injection in PHP/WordPress?**

**A:** Use PDO/mysqli prepared statements for raw PHP. In WordPress, use `$wpdb->prepare()` with `%d`/`%s`/`%f` placeholders for all dynamic values. Never interpolate user input directly into SQL strings.

```php
global $wpdb;
$user_id = 5;
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_author = %d AND post_status = %s",
        $user_id,
        'publish'
    )
);
```

---

**Q90: How do you prevent XSS in PHP and WordPress?**

**A:** Escape output at the point of rendering — never trust data from the database or user input. WordPress provides context-specific escapers: `esc_html()`, `esc_attr()`, `esc_url()`, `esc_js()`, and `wp_kses()` for controlled HTML.

```php
$title   = get_the_title();
$url     = get_permalink();
$attr    = get_post_meta(get_the_ID(), 'data', true);

echo '<a href="' . esc_url($url) . '" title="' . esc_attr($attr) . '">'
   . esc_html($title) . '</a>';
```

---

**Q91: How do WordPress nonces prevent CSRF?**

**A:** A nonce (number used once) is a time-limited token tied to a user, action, and session. Include it in forms/AJAX requests with `wp_nonce_field()` or `wp_create_nonce()`, then verify with `check_admin_referer()` or `wp_verify_nonce()` server-side.

```php
// Output form with nonce
wp_nonce_field('save_user_settings', '_wpnonce_settings');

// Verify on submission
if (! check_admin_referer('save_user_settings', '_wpnonce_settings')) {
    wp_die('Security check failed');
}
```

---

**Q92: How do you validate file uploads securely in PHP?**

**A:** Never trust `$_FILES['type']` — it is client-supplied. Use `finfo_file()` to detect real MIME type, check file extension against an allowlist, and store outside the web root or in a non-executable directory. In WordPress use `wp_check_filetype_and_ext()`.

```php
$allowed = ['image/jpeg', 'image/png', 'image/webp'];
$finfo    = new finfo(FILEINFO_MIME_TYPE);
$mime     = $finfo->file($_FILES['upload']['tmp_name']);
if (! in_array($mime, $allowed, true)) {
    wp_die('Invalid file type');
}
```

---

**Q93: How do you tune PHP-FPM pool settings for high-traffic WordPress?**

**A:** Key settings: `pm.max_children` caps total workers (set based on RAM ÷ PHP memory per process). `pm.max_requests` recycles workers after N requests to prevent memory leaks. Use `pm = dynamic` for variable traffic or `pm = ondemand` for low-memory VPS.

```ini
pm = dynamic
pm.max_children = 40       ; (4GB RAM / ~100MB per process)
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500      ; recycle to prevent memory leaks
```

---

**Q94: How do you tune OPcache for production WordPress?**

**A:** Disable `validate_timestamps` so OPcache never hits disk to check file mtimes — deploy by clearing OPcache via `opcache_reset()`. Increase `memory_consumption` and `max_accelerated_files` to cache all WP files.

```ini
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.save_comments=1   ; needed by annotations/attributes
```

---

**Q95: What is `SplFixedArray` and when is it faster than a plain array?**

**A:** `SplFixedArray` stores integers in a fixed-size, contiguous C array. It uses less memory than a PHP array (which is a hash table) for integer-indexed numeric data. Ideal for large static numeric datasets; not suitable for dynamic resizing.

```php
$fixed = new SplFixedArray(1000000);
for ($i = 0; $i < 1000000; $i++) {
    $fixed[$i] = $i * 2;
}
// Uses ~50% less memory than a regular PHP array
```

---

**Q96: How do you profile PHP performance with Xdebug or Blackfire?**

**A:** Xdebug's profiler writes cachegrind files readable by KCacheGrind/Webgrind — enable with `xdebug.mode=profile`. Blackfire is a production-safe SaaS profiler with call graph and timeline views. Both pinpoint slow functions, N+1 queries, and memory hotspots.

```php
// Trigger Xdebug profile for a single request:
// XDEBUG_PROFILE=1 as GET param or cookie
// php.ini:
// xdebug.mode = profile
// xdebug.output_dir = /tmp/xdebug

// Blackfire: wrap code under test
$probe = \Blackfire\Client::createProbe();
// ... code to profile ...
$probe->end();
```

---

**Q97: How does PHPCS / PHPStan improve code quality?**

**A:** PHP_CodeSniffer (PHPCS) enforces coding standards (PSR-12, WordPress Coding Standards) by checking style. PHPStan performs static analysis for type errors, undefined variables, and dead code — catching bugs before runtime. Run both in CI pipelines.

```bash
# Install
composer require --dev squizlabs/php_codesniffer phpstan/phpstan

# Run PHPCS against WordPress standard
./vendor/bin/phpcs --standard=WordPress src/

# Run PHPStan at level 8 (strictest)
./vendor/bin/phpstan analyse src/ --level=8
```

---

**Q98: How do you write a PHPUnit test with a Mockery mock?**

**A:** PHPUnit structures tests in classes extending `TestCase`. Mockery creates test doubles for dependencies. Use `Mockery::mock(ClassName::class)` to define expectations, then inject the mock. Call `Mockery::close()` in `tearDown()` to verify expectations.

```php
class UserServiceTest extends \PHPUnit\Framework\TestCase {
    protected function tearDown(): void { \Mockery::close(); }
    public function testCreate(): void {
        $repo = \Mockery::mock(UserRepository::class);
        $repo->shouldReceive('save')->once()->andReturn(true);
        $service = new UserService($repo);
        $this->assertTrue($service->create(['name' => 'Alice']));
    }
}
```

---

**Q99: What is the Decorator design pattern and how does it relate to WordPress filters?**

**A:** The Decorator pattern wraps an object to add behavior without modifying the original class. WordPress filters implement the same concept: each `add_filter()` callback wraps the value with additional logic. Pure PHP decorators use shared interfaces.

```php
interface Renderer { public function render(string $content): string; }
class HtmlRenderer implements Renderer {
    public function render(string $content): string { return "<p>$content</p>"; }
}
class CachedRenderer implements Renderer {
    public function __construct(private Renderer $inner, private array &$cache) {}
    public function render(string $content): string {
        return $this->cache[$content] ??= $this->inner->render($content);
    }
}
```

---

**Q100: What are WordPress-specific PHP patterns for late escaping, capability checks, and nonces?**

**A:** "Escape late, escape often" — escape immediately before output, not at input. Always pair capability checks (`current_user_can()`) with nonce verification before processing sensitive actions. These three patterns together prevent XSS, CSRF, and privilege escalation.

```php
// Capability + nonce check before any action
if (! current_user_can('edit_posts')) {
    wp_die(__('Insufficient permissions', 'textdomain'));
}
check_admin_referer('update_post_' . $post_id);

// Late escaping at output
echo '<input value="' . esc_attr(get_option('my_option')) . '">';
echo esc_url(get_permalink($post_id));
```
