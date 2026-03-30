<?php
/**
 * PHP Senior Engineer — Code Examples
 *
 * Covers: OOP, generics-style typing, design patterns, closures,
 *         generators, enums, readonly classes, and error handling.
 */

declare( strict_types=1 );

// =============================================================================
// 1. ENUMS (PHP 8.1)
// =============================================================================

enum PostStatus: string {
    case Draft     = 'draft';
    case Published = 'publish';
    case Private   = 'private';
    case Trash     = 'trash';

    public function label(): string {
        return match( $this ) {
            self::Draft     => 'Draft',
            self::Published => 'Published',
            self::Private   => 'Private',
            self::Trash     => 'Trash',
        };
    }

    public function isVisible(): bool {
        return $this === self::Published;
    }
}

// Usage
$status = PostStatus::Published;
echo $status->label();      // Published
echo $status->isVisible();  // true
$status = PostStatus::from( 'draft' ); // Cast from string

// =============================================================================
// 2. READONLY CLASS WITH CONSTRUCTOR PROMOTION (PHP 8.2)
// =============================================================================

readonly class Money {
    public function __construct(
        public readonly int    $amount,   // in cents
        public readonly string $currency
    ) {
        if ( $amount < 0 ) {
            throw new \InvalidArgumentException( 'Amount cannot be negative.' );
        }
    }

    public function add( Money $other ): self {
        if ( $this->currency !== $other->currency ) {
            throw new \DomainException( 'Cannot add different currencies.' );
        }
        return new self( $this->amount + $other->amount, $this->currency );
    }

    public function format(): string {
        return sprintf( '%s %.2f', $this->currency, $this->amount / 100 );
    }
}

$price = new Money( 1999, 'USD' );
$tax   = new Money( 200,  'USD' );
echo $price->add( $tax )->format(); // USD 21.99

// =============================================================================
// 3. INTERFACE + ABSTRACT CLASS + CONCRETE IMPLEMENTATION
// =============================================================================

interface Cacheable {
    public function getCacheKey(): string;
    public function getCacheTtl(): int;
}

interface Repository {
    public function find( int $id ): ?object;
    public function findAll(): array;
    public function save( object $entity ): bool;
    public function delete( int $id ): bool;
}

abstract class AbstractWordPressRepository implements Repository {
    protected \wpdb $db;

    public function __construct( \wpdb $db ) {
        $this->db = $db;
    }

    /**
     * Child classes must provide the table name (without prefix).
     */
    abstract protected function getTableName(): string;

    protected function table(): string {
        return $this->db->prefix . $this->getTableName();
    }
}

// Concrete implementation
class ProductRepository extends AbstractWordPressRepository {
    protected function getTableName(): string {
        return 'products';
    }

    public function find( int $id ): ?object {
        return $this->db->get_row(
            $this->db->prepare( "SELECT * FROM {$this->table()} WHERE id = %d", $id )
        );
    }

    public function findAll(): array {
        return $this->db->get_results( "SELECT * FROM {$this->table()}" ) ?: [];
    }

    public function save( object $entity ): bool {
        $result = $this->db->insert(
            $this->table(),
            [ 'name' => $entity->name, 'price' => $entity->price ],
            [ '%s', '%d' ]
        );
        return $result !== false;
    }

    public function delete( int $id ): bool {
        return (bool) $this->db->delete( $this->table(), [ 'id' => $id ], [ '%d' ] );
    }
}

// =============================================================================
// 4. GENERATOR — CHUNKED DATABASE PROCESSING
// =============================================================================

/**
 * Iterate over all WordPress posts in memory-efficient chunks.
 *
 * @param string $postType
 * @param int    $chunkSize
 * @return \Generator<\WP_Post>
 */
function post_generator( string $postType = 'post', int $chunkSize = 100 ): \Generator {
    $page = 1;

    do {
        $posts = get_posts( [
            'post_type'      => $postType,
            'post_status'    => 'publish',
            'posts_per_page' => $chunkSize,
            'paged'          => $page,
            'orderby'        => 'ID',
            'order'          => 'ASC',
            'no_found_rows'  => true,
        ] );

        foreach ( $posts as $post ) {
            yield $post;
        }

        unset( $posts );
        $page++;

    } while ( count( $posts ?? [] ) === $chunkSize );
}

// Usage: process 500k posts without OOM
foreach ( post_generator( 'product', 200 ) as $post ) {
    // Process each post — only 200 in memory at a time
    update_post_meta( $post->ID, '_processed', true );
}

// =============================================================================
// 5. CLOSURES, FIRST-CLASS CALLABLES, AND HIGHER-ORDER FUNCTIONS
// =============================================================================

/**
 * Pipeline — passes a value through a series of transformations.
 *
 * @param mixed    $value
 * @param callable ...$pipes
 * @return mixed
 */
function pipeline( mixed $value, callable ...$pipes ): mixed {
    return array_reduce( $pipes, fn( $carry, $pipe ) => $pipe( $carry ), $value );
}

// Compose functions
$sanitizeTitle = pipeline(
    '  Hello World! <script>  ',
    trim(...),
    strip_tags(...),
    fn( $s ) => strtolower( $s ),
    fn( $s ) => preg_replace( '/\s+/', '-', $s ),
);
// Result: "hello-world!"

// Memoize expensive calculations
function memoize( callable $fn ): \Closure {
    $cache = [];
    return function() use ( $fn, &$cache ) {
        $key = serialize( func_get_args() );
        return $cache[ $key ] ??= $fn( ...func_get_args() );
    };
}

$expensiveQuery = memoize( function( int $userId ): array {
    return get_posts( [ 'author' => $userId, 'posts_per_page' => -1 ] );
} );

// =============================================================================
// 6. MATCH EXPRESSION AND NAMED ARGUMENTS (PHP 8.0)
// =============================================================================

function get_http_status_message( int $code ): string {
    return match( true ) {
        $code >= 500 => 'Server Error',
        $code >= 400 => 'Client Error',
        $code >= 300 => 'Redirection',
        $code >= 200 => 'Success',
        default      => 'Informational',
    };
}

// Named arguments — readable, order-independent
$result = array_slice(
    array: [ 'a', 'b', 'c', 'd', 'e' ],
    offset: 1,
    length: 3,
    preserve_keys: true
);

// =============================================================================
// 7. CUSTOM EXCEPTION HIERARCHY
// =============================================================================

class PluginException extends \RuntimeException {}
class ValidationException extends PluginException {
    private array $errors;

    public function __construct( array $errors, string $message = '', int $code = 0 ) {
        $this->errors = $errors;
        parent::__construct( $message ?: implode( ', ', $errors ), $code );
    }

    public function getErrors(): array {
        return $this->errors;
    }
}
class DatabaseException extends PluginException {}
class AuthException extends PluginException {}

// Usage with granular catch blocks
function process_form( array $data ): void {
    try {
        validate( $data );
        save_to_db( $data );
    } catch ( ValidationException $e ) {
        // Show field-level errors to the user
        foreach ( $e->getErrors() as $field => $message ) {
            add_settings_error( $field, 'invalid', $message );
        }
    } catch ( DatabaseException $e ) {
        // Log and show generic error
        error_log( $e->getMessage() );
        wp_die( 'A database error occurred. Please try again.' );
    }
}

// =============================================================================
// 8. TRAIT WITH ABSTRACT METHOD REQUIREMENT
// =============================================================================

trait HasTimestamps {
    abstract protected function getMetaPrefix(): string;

    public function getCreatedAt(): ?\DateTimeImmutable {
        $value = get_post_meta( $this->getId(), $this->getMetaPrefix() . '_created_at', true );
        return $value ? new \DateTimeImmutable( $value ) : null;
    }

    public function touch(): void {
        update_post_meta( $this->getId(), $this->getMetaPrefix() . '_updated_at', gmdate( 'c' ) );
    }

    abstract public function getId(): int;
}

class Project {
    use HasTimestamps;

    public function __construct( private int $id ) {}

    public function getId(): int {
        return $this->id;
    }

    protected function getMetaPrefix(): string {
        return '_project';
    }
}

// =============================================================================
// 9. RETRY WITH EXPONENTIAL BACKOFF
// =============================================================================

/**
 * Retry a callable with exponential backoff and jitter.
 *
 * @param callable $fn           The operation to retry.
 * @param int      $maxAttempts  Maximum number of attempts.
 * @param int      $baseDelayMs  Base delay in milliseconds.
 * @return mixed The return value of $fn on success.
 * @throws \Throwable The last exception after all retries are exhausted.
 */
function retry( callable $fn, int $maxAttempts = 3, int $baseDelayMs = 100 ): mixed {
    $attempt = 0;

    while ( true ) {
        try {
            return $fn( $attempt );
        } catch ( \Throwable $e ) {
            $attempt++;

            if ( $attempt >= $maxAttempts ) {
                throw $e;
            }

            // Exponential backoff: 100ms, 200ms, 400ms … + random jitter
            $delayMs = ( $baseDelayMs * ( 2 ** $attempt ) ) + random_int( 0, 50 );
            usleep( $delayMs * 1000 );
        }
    }
}

// Usage: retry a remote API call up to 3 times
$data = retry( function( int $attempt ) use ( $apiUrl ): array {
    $response = wp_remote_get( $apiUrl, [ 'timeout' => 10 ] );

    if ( is_wp_error( $response ) ) {
        throw new \RuntimeException( $response->get_error_message() );
    }

    $code = wp_remote_retrieve_response_code( $response );
    if ( $code >= 500 ) {
        throw new \RuntimeException( "Server error: {$code}" );
    }

    return json_decode( wp_remote_retrieve_body( $response ), true ) ?? [];
}, maxAttempts: 4, baseDelayMs: 150 );

// =============================================================================
// 10. VALUE OBJECT PATTERN
// =============================================================================

final class Email {
    private string $value;

    public function __construct( string $email ) {
        if ( ! filter_var( $email, FILTER_VALIDATE_EMAIL ) ) {
            throw new \InvalidArgumentException( "Invalid email address: {$email}" );
        }
        $this->value = strtolower( trim( $email ) );
    }

    public function toString(): string {
        return $this->value;
    }

    public function equals( self $other ): bool {
        return $this->value === $other->value;
    }

    public function getDomain(): string {
        return substr( $this->value, strpos( $this->value, '@' ) + 1 );
    }

    public function __toString(): string {
        return $this->value;
    }
}

$email = new Email( '  User@Example.COM  ' );
echo $email->getDomain(); // example.com
