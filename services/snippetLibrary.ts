export interface CodeSnippet {
  id: string;
  category: 'sanitize' | 'auth_security' | 'db_queries' | 'response_format' | 'validation' | 'http_external' | 'wordpress_core';
  title: string;
  description: string;
  targetScope?: 'callback' | 'middleware' | 'all';
  code: string;
}

export const SNIPPET_CATEGORIES: { id: CodeSnippet['category']; label: string; icon: string }[] = [
  { id: 'sanitize', label: 'Sanitize & Escape', icon: 'ShieldAlert' },
  { id: 'auth_security', label: 'Security & Nonce', icon: 'ShieldCheck' },
  { id: 'validation', label: 'Validation & Checks', icon: 'CheckCircle' },
  { id: 'response_format', label: 'REST Responses & Errors', icon: 'Send' },
  { id: 'db_queries', label: 'Database & WP_Query', icon: 'Database' },
  { id: 'http_external', label: 'HTTP & Remote APIs', icon: 'Globe' },
  { id: 'wordpress_core', label: 'WP Core & Hooks', icon: 'Layers' }
];

export const CODE_SNIPPETS_LIBRARY: CodeSnippet[] = [
  // 1. Sanitize & Escape
  {
    id: 'sanitize_user_inputs',
    category: 'sanitize',
    title: 'Sanitize All Request Params',
    description: 'Clean text fields, email addresses, and integers safely from incoming REST request',
    targetScope: 'all',
    code: `// Sanitize incoming input parameters
$clean_title   = sanitize_text_field( $request->get_param('title') ?? '' );
$clean_email   = sanitize_email( $request->get_param('email') ?? '' );
$clean_content = wp_kses_post( $request->get_param('content') ?? '' );
$clean_id      = absint( $request->get_param('id') ?? 0 );
$clean_slug    = sanitize_title( $request->get_param('slug') ?? '' );`
  },
  {
    id: 'sanitize_array_inputs',
    category: 'sanitize',
    title: 'Sanitize Array / Nested Meta',
    description: 'Recursively map sanitization over complex array or repeater payloads',
    targetScope: 'all',
    code: `// Sanitize nested array/list inputs
$raw_items = $request->get_param('items') ?: array();
$clean_items = array();

if ( is_array( $raw_items ) ) {
    foreach ( $raw_items as $item ) {
        $clean_items[] = array(
            'label' => sanitize_text_field( $item['label'] ?? '' ),
            'value' => sanitize_text_field( $item['value'] ?? '' ),
            'count' => intval( $item['count'] ?? 0 ),
        );
    }
}`
  },
  {
    id: 'sanitize_sql_like',
    category: 'sanitize',
    title: 'Escape $wpdb LIKE Query',
    description: 'Protect against wildcard injection in SQL queries using $wpdb->esc_like',
    targetScope: 'callback',
    code: `// Safe wildcard search with $wpdb
global $wpdb;
$search_term = sanitize_text_field( $request->get_param('query') ?? '' );
$wildcard    = '%' . $wpdb->esc_like( $search_term ) . '%';

$query = $wpdb->prepare(
    "SELECT ID, post_title FROM {$wpdb->posts} WHERE post_title LIKE %s AND post_status = 'publish' LIMIT 20",
    $wildcard
);
$results = $wpdb->get_results( $query, ARRAY_A );`
  },

  // 2. Security & Nonce
  {
    id: 'validate_nonce_header',
    category: 'auth_security',
    title: 'Validate Nonce Header (X-WP-Nonce)',
    description: 'Verify the CSRF security nonce provided in HTTP header or param',
    targetScope: 'all',
    code: `// Validate REST Nonce Header
$nonce = $request->get_header( 'x_wp_nonce' ) ?: $request->get_param( '_wpnonce' );

if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
    return new WP_Error(
        'rest_invalid_nonce',
        'Security check failed: Invalid or missing CSRF nonce.',
        array( 'status' => 403 )
    );
}`
  },
  {
    id: 'bearer_token_guard',
    category: 'auth_security',
    title: 'Bearer Token Authorization Guard',
    description: 'Extract and validate custom Bearer JWT or API secret token from headers',
    targetScope: 'all',
    code: `// Bearer Token Validation
$auth_header = $request->get_header( 'authorization' );

if ( empty( $auth_header ) || ! preg_match( '/Bearer\\s+(.*)$/i', $auth_header, $matches ) ) {
    return new WP_Error( 'rest_unauthorized', 'Missing or malformed Bearer authorization token.', array( 'status' => 401 ) );
}

$token = trim( $matches[1] );
$expected_secret = defined('MY_API_SECRET') ? MY_API_SECRET : get_option('my_api_secret_key');

if ( ! hash_equals( (string)$expected_secret, $token ) ) {
    return new WP_Error( 'rest_forbidden', 'Invalid API access token.', array( 'status' => 403 ) );
}`
  },
  {
    id: 'user_capability_check',
    category: 'auth_security',
    title: 'Capability Check (current_user_can)',
    description: 'Ensure the requesting authenticated user has adequate permissions',
    targetScope: 'all',
    code: `// Check User Capability & Authentication
if ( ! is_user_logged_in() ) {
    return new WP_Error( 'rest_not_logged_in', 'Authentication required.', array( 'status' => 401 ) );
}

if ( ! current_user_can( 'edit_posts' ) ) {
    return new WP_Error( 'rest_forbidden', 'Insufficient capability: edit_posts required.', array( 'status' => 403 ) );
}`
  },
  {
    id: 'ip_rate_limiting',
    category: 'auth_security',
    title: 'IP Rate Limiting with Transients',
    description: 'Throttle abuse by limiting requests per IP address per timeframe',
    targetScope: 'all',
    code: `// Transient-based Rate Limiter (60 requests / 60 seconds)
$client_ip = ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) : ( $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1' );
$rate_key  = 'api_ratelimit_' . md5( $client_ip );
$requests  = (int) get_transient( $rate_key );

if ( $requests >= 60 ) {
    return new WP_Error(
        'rest_rate_limit_exceeded',
        'Too many requests. Rate limit of 60 req/min reached.',
        array( 'status' => 429 )
    );
}

set_transient( $rate_key, $requests + 1, MINUTE_IN_SECONDS );`
  },

  // 3. Validation & Checks
  {
    id: 'validate_required_params',
    category: 'validation',
    title: 'Validate Required Fields & Formats',
    description: 'Confirm mandatory parameters exist and check email / UUID formatting',
    targetScope: 'all',
    code: `// Parameter Validation & Integrity Checks
$required = array( 'email', 'title', 'amount' );
$missing  = array();

foreach ( $required as $field ) {
    $val = $request->get_param( $field );
    if ( null === $val || '' === trim( (string)$val ) ) {
        $missing[] = $field;
    }
}

if ( ! empty( $missing ) ) {
    return new WP_Error(
        'rest_missing_fields',
        'Missing required parameters: ' . implode( ', ', $missing ),
        array( 'status' => 400, 'fields' => $missing )
    );
}

// Format check
$email = $request->get_param( 'email' );
if ( ! is_email( $email ) ) {
    return new WP_Error( 'rest_invalid_email', 'The provided email address is invalid.', array( 'status' => 400 ) );
}`
  },
  {
    id: 'validate_post_exists',
    category: 'validation',
    title: 'Verify Target Post Exists & Status',
    description: 'Ensure post ID exists in database, is of expected post_type, and published',
    targetScope: 'all',
    code: `// Validate Target Post Existence
$target_post_id = absint( $request->get_param('post_id') );
$target_post    = get_post( $target_post_id );

if ( ! $target_post || 'trash' === $target_post->post_status ) {
    return new WP_Error( 'rest_post_invalid_id', 'Target resource post not found or deleted.', array( 'status' => 404 ) );
}`
  },

  // 4. REST Responses & Errors
  {
    id: 'standardized_json_response',
    category: 'response_format',
    title: 'Standardized Envelope Response',
    description: 'Return a clean, consistent JSON payload with status code, message, and metadata',
    targetScope: 'callback',
    code: `// Formatted REST API Envelope Response
$payload = array(
    'success'   => true,
    'status'    => 200,
    'message'   => 'Operation completed successfully.',
    'data'      => $results,
    'timestamp' => current_time( 'timestamp' ),
);

$response = new WP_REST_Response( $payload, 200 );
$response->header( 'Cache-Control', 'no-cache, must-revalidate' );
return $response;`
  },
  {
    id: 'paginated_collection_response',
    category: 'response_format',
    title: 'Paginated REST Response with Headers',
    description: 'Add X-WP-Total and X-WP-TotalPages pagination headers to response',
    targetScope: 'callback',
    code: `// Paginated Collection Response
$page     = max( 1, absint( $request->get_param('page') ?: 1 ) );
$per_page = min( 100, max( 1, absint( $request->get_param('per_page') ?: 10 ) ) );

$query = new WP_Query( array(
    'post_type'      => 'post',
    'post_status'    => 'publish',
    'paged'          => $page,
    'posts_per_page' => $per_page,
) );

$items = array();
foreach ( $query->posts as $p ) {
    $items[] = array(
        'id'        => $p->ID,
        'title'     => get_the_title( $p ),
        'date'      => $p->post_date,
        'permalink' => get_permalink( $p ),
    );
}

$response = new WP_REST_Response( $items, 200 );
$response->header( 'X-WP-Total', (int) $query->found_posts );
$response->header( 'X-WP-TotalPages', (int) $query->max_num_pages );
return $response;`
  },
  {
    id: 'wp_error_abort',
    category: 'response_format',
    title: 'WP_Error Exception Helper',
    description: 'Instantiate and return standard WordPress error envelope',
    targetScope: 'all',
    code: `// Abort with WP_Error
return new WP_Error(
    'rest_operation_failed',
    __( 'Could not execute the requested action due to a processing error.', 'text-domain' ),
    array( 'status' => 500, 'details' => 'Database lock or constraint exception' )
);`
  },

  // 5. Database & WP_Query
  {
    id: 'wp_insert_post_routine',
    category: 'db_queries',
    title: 'Create / Update Post Programmatically',
    description: 'Safely execute wp_insert_post or wp_update_post with error handling',
    targetScope: 'callback',
    code: `// Create / Insert Post Programmatically
$post_args = array(
    'post_title'   => sanitize_text_field( $request->get_param('title') ),
    'post_content' => wp_kses_post( $request->get_param('content') ),
    'post_status'  => 'publish',
    'post_type'    => 'post', // or custom post type slug
    'post_author'  => get_current_user_id() ?: 1,
);

$post_id = wp_insert_post( $post_args, true );

if ( is_wp_error( $post_id ) ) {
    return new WP_Error( 'post_creation_failed', $post_id->get_error_message(), array( 'status' => 500 ) );
}

// Save post meta
update_post_meta( $post_id, '_custom_api_source', 'rest_builder' );`
  },
  {
    id: 'wpdb_prepared_transaction',
    category: 'db_queries',
    title: 'WPDB SQL Transaction & Safe Query',
    description: 'Run raw queries with prepare statement inside MySQL transaction block',
    targetScope: 'callback',
    code: `// SQL Query with $wpdb transaction
global $wpdb;
$table_name = $wpdb->prefix . 'my_custom_table';

$wpdb->query( 'START TRANSACTION' );
try {
    $inserted = $wpdb->insert(
        $table_name,
        array(
            'user_id'    => get_current_user_id(),
            'event_type' => sanitize_text_field( $request->get_param('event') ),
            'created_at' => current_time( 'mysql' )
        ),
        array( '%d', '%s', '%s' )
    );

    if ( false === $inserted ) {
        throw new Exception( $wpdb->last_error ?: 'SQL Insertion Error' );
    }

    $wpdb->query( 'COMMIT' );
} catch ( Exception $e ) {
    $wpdb->query( 'ROLLBACK' );
    return new WP_Error( 'db_error', $e->getMessage(), array( 'status' => 500 ) );
}`
  },

  // 6. HTTP & Remote APIs
  {
    id: 'wp_remote_post_json',
    category: 'http_external',
    title: 'Outgoing wp_remote_post JSON Webhook',
    description: 'Dispatch external HTTP POST request with JSON body and timeout guard',
    targetScope: 'callback',
    code: `// Dispatch Outgoing Webhook with wp_remote_post
$webhook_url = 'https://api.example.com/v1/webhook';
$payload_data = array(
    'event'     => 'order_created',
    'timestamp' => time(),
    'payload'   => $request->get_params(),
);

$response = wp_remote_post( $webhook_url, array(
    'method'      => 'POST',
    'timeout'     => 15,
    'redirection' => 5,
    'headers'     => array(
        'Content-Type'  => 'application/json; charset=utf-8',
        'Authorization' => 'Bearer YOUR_SECRET_KEY',
    ),
    'body'        => wp_json_encode( $payload_data ),
) );

if ( is_wp_error( $response ) ) {
    return new WP_Error( 'http_outbound_failed', $response->get_error_message(), array( 'status' => 502 ) );
}

$http_code = wp_remote_retrieve_response_code( $response );
$body      = json_decode( wp_remote_retrieve_body( $response ), true );`
  },

  // 7. WP Core & Hooks
  {
    id: 'fire_custom_action_hook',
    category: 'wordpress_core',
    title: 'Trigger do_action with Context',
    description: 'Emit WordPress lifecycle hook for theme or 3rd party plugin integration',
    targetScope: 'all',
    code: `// Fire WordPress Action Hook for developers
do_action( 'wp_api_architect_endpoint_executed', $request, $post_id ?? null, get_current_user_id() );`
  },
  {
    id: 'wp_cache_helper',
    category: 'wordpress_core',
    title: 'WP Object Cache (Get / Set / Invalidate)',
    description: 'Speed up expensive lookups using wp_cache_get and wp_cache_set',
    targetScope: 'callback',
    code: `// High-Performance WP Object Cache
$cache_key   = 'custom_api_res_' . md5( serialize( $request->get_params() ) );
$cache_group = 'wp_api_architect';
$cached_data = wp_cache_get( $cache_key, $cache_group );

if ( false !== $cached_data ) {
    return rest_ensure_response( $cached_data );
}

// Compute expensive data...
$fresh_data = array( 'computed_at' => current_time('mysql'), 'items' => array() );

wp_cache_set( $cache_key, $fresh_data, $cache_group, 300 ); // 5 minutes
return rest_ensure_response( $fresh_data );`
  }
];
