import { ProjectState, CustomPostType, CustomEndpoint, GlobalHelper, MetaField } from '../types';

export interface AnalysisRecommendation {
  id: string;
  type: 'caching' | 'indexing' | 'security' | 'performance' | 'architecture';
  severity: 'high' | 'medium' | 'info';
  title: string;
  description: string;
  target: string;
  rationale: string;
  suggestedPhpOrSql: string;
  actionSnippet?: string;
  category: 'caching' | 'db_index' | 'query_tuning' | 'rest_guard';
}

export interface AnalysisReport {
  timestamp: string;
  totalEndpoints: number;
  totalPostTypes: number;
  totalMetaFields: number;
  healthScore: number; // 0 - 100
  summary: {
    cachingOpportunities: number;
    indexingRecommendations: number;
    securityNotices: number;
  };
  recommendations: AnalysisRecommendation[];
}

export const runStaticApiAnalysis = (project: ProjectState): AnalysisReport => {
  const recommendations: AnalysisRecommendation[] = [];
  const { postTypes = [], customEndpoints = [], globalHelpers = [] } = project;

  let scoreDeduction = 0;

  // -------------------------------------------------------------
  // 1. Caching Analysis on GET Endpoints & Heavy Routines
  // -------------------------------------------------------------
  customEndpoints.forEach(ep => {
    const isGet = ep.method === 'GET' || ep.method === 'READ';
    const callbackCode = ep.customLogic || '';
    const hasTransients = callbackCode.includes('get_transient') || callbackCode.includes('wp_cache_get');
    const hasDirectDb = callbackCode.includes('$wpdb->get_') || callbackCode.includes('WP_Query');

    if (isGet) {
      if (!hasTransients) {
        scoreDeduction += 5;
        const cacheKey = `api_cache_${ep.route.replace(/[^a-z0-9]/gi, '_')}`;
        recommendations.push({
          id: `cache_${ep.id}`,
          type: 'caching',
          severity: hasDirectDb ? 'high' : 'medium',
          title: `Enable Transient Response Caching for GET ${ep.route}`,
          description: `Endpoint performs ${hasDirectDb ? 'direct database queries' : 'read operations'} on every request without caching. Adding a 10-minute transient will reduce DB load by up to 90%.`,
          target: `${ep.method} ${ep.route}`,
          rationale: 'WordPress REST endpoints serving read traffic should leverage transients or wp_cache object caching to avoid executing queries on repeated identical requests.',
          suggestedPhpOrSql: `// 10-Minute Response Caching
$cache_key = '${cacheKey}_' . md5( serialize( $request->get_params() ) );
$cached_data = get_transient( $cache_key );

if ( false !== $cached_data ) {
    return rest_ensure_response( $cached_data );
}

// ... execute query & assemble $response_data ...

set_transient( $cache_key, $response_data, 10 * MINUTE_IN_SECONDS );
return rest_ensure_response( $response_data );`,
          actionSnippet: `// 10-Minute Response Caching
$cache_key = '${cacheKey}_' . md5( serialize( $request->get_params() ) );
$cached_data = get_transient( $cache_key );
if ( false !== $cached_data ) {
    return rest_ensure_response( $cached_data );
}
// ... execute query ...
set_transient( $cache_key, $response_data, 10 * MINUTE_IN_SECONDS );`,
          category: 'caching'
        });
      }
    }

    // Check for missing middleware / auth on write endpoints
    if (ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'DELETE' || ep.method === 'PATCH') {
      const middlewares = ep.middlewares || [];
      const hasAuth = middlewares.some(m => m.enabled && (m.type === 'auth' || m.type === 'permission'));
      if (!hasAuth && !callbackCode.includes('current_user_can') && !callbackCode.includes('is_user_logged_in') && !callbackCode.includes('wp_verify_nonce')) {
        scoreDeduction += 10;
        recommendations.push({
          id: `sec_write_${ep.id}`,
          type: 'security',
          severity: 'high',
          title: `Missing Authentication/Capability Guard on ${ep.method} ${ep.route}`,
          description: `Mutating endpoint ${ep.route} has no active permission guard or nonce verification middleware. Unauthenticated clients could trigger state changes.`,
          target: `${ep.method} ${ep.route}`,
          rationale: 'All REST API mutation endpoints should verify nonces or user capability (current_user_can) to prevent CSRF and unauthorized tampering.',
          suggestedPhpOrSql: `// Add authentication check
if ( ! current_user_can( 'edit_posts' ) ) {
    return new WP_Error( 'rest_forbidden', 'Insufficient user privileges.', array( 'status' => 403 ) );
}`,
          category: 'rest_guard'
        });
      }
    }
  });

  // -------------------------------------------------------------
  // 2. Database Indexing & Meta Query Optimization for CPTs
  // -------------------------------------------------------------
  postTypes.forEach(cpt => {
    const metaFields = cpt.metaFields || [];
    
    // High cardinality meta fields that are queried frequently
    const filterableMeta = metaFields.filter(f => 
      ['number', 'select', 'date', 'checkbox', 'relationship'].includes(f.type) ||
      f.key.toLowerCase().includes('status') ||
      f.key.toLowerCase().includes('type') ||
      f.key.toLowerCase().includes('price') ||
      f.key.toLowerCase().includes('category') ||
      f.key.toLowerCase().includes('date') ||
      f.key.toLowerCase().includes('user_id')
    );

    filterableMeta.forEach(field => {
      scoreDeduction += 3;
      recommendations.push({
        id: `idx_${cpt.id}_${field.key}`,
        type: 'indexing',
        severity: 'medium',
        title: `Index Recommendation: '${field.key}' on '${cpt.slug}' CPT`,
        description: `Field '${field.key}' (${field.type}) is frequently queried in WHERE or ORDER BY clauses. By default, wp_postmeta lacks composite indexes for specific keys on large databases.`,
        target: `${cpt.singularName} (${cpt.slug}) -> ${field.key}`,
        rationale: 'WordPress wp_postmeta table stores values as LONGTEXT. Repeated meta_query lookups on unindexed or uncast meta keys cause full-table table scans on sites with >50k posts.',
        suggestedPhpOrSql: `-- MySQL Composite Index for faster meta_query on ${field.key}
ALTER TABLE \`wp_postmeta\` 
ADD INDEX \`idx_cpt_${cpt.slug}_${field.key}\` (\`meta_key\`(32), \`meta_value\`(64));

-- Or in PHP Plugin Activation Hook:
global $wpdb;
$wpdb->query("ALTER TABLE {$wpdb->postmeta} ADD INDEX IF NOT EXISTS \`idx_meta_${field.key}\` (\`meta_key\`(32), \`meta_value\`(64))");`,
        category: 'db_index'
      });
    });

    // Check for heavy meta fields without autoload optimization
    if (metaFields.length > 8) {
      recommendations.push({
        id: `meta_cache_${cpt.id}`,
        type: 'performance',
        severity: 'info',
        title: `Single-Query Bulk Meta Preloading for '${cpt.slug}'`,
        description: `CPT has ${metaFields.length} meta fields. When fetching lists in REST callbacks, use update_postmeta_cache($post_ids) to prevent N+1 database queries.`,
        target: `${cpt.singularName} (${cpt.slug})`,
        rationale: 'Fetching post meta individually inside loops triggers separate SELECT queries for each post unless update_postmeta_cache is executed in batch.',
        suggestedPhpOrSql: `// Preload all meta keys in a single SQL query
$query = new WP_Query( array(
    'post_type'      => '${cpt.slug}',
    'posts_per_page' => 20,
    'update_post_meta_cache' => true, // Preloads all meta into memory
    'update_post_term_cache' => true,
) );`,
        category: 'query_tuning'
      });
    }
  });

  // -------------------------------------------------------------
  // 3. Global Logic Routine Diagnostics
  // -------------------------------------------------------------
  globalHelpers.forEach(gh => {
    const code = gh.phpCode || '';
    if (code.includes('SELECT * FROM') && !code.includes('LIMIT')) {
      scoreDeduction += 5;
      recommendations.push({
        id: `unbounded_sql_${gh.id}`,
        type: 'performance',
        severity: 'high',
        title: `Unbounded SQL Query in Routine '${gh.name}'`,
        description: `Raw SQL query in helper routine lacks a LIMIT clause. This can cause memory exhaustion on large database tables.`,
        target: `Helper: ${gh.name}()`,
        rationale: 'Always enforce pagination or a strict LIMIT ceiling on custom database queries in REST handlers.',
        suggestedPhpOrSql: `// Add LIMIT clause to protect server memory
$results = $wpdb->get_results( "SELECT ID, post_title FROM {$wpdb->posts} WHERE post_type = 'custom' LIMIT 100", ARRAY_A );`,
        category: 'query_tuning'
      });
    }

    if (code.includes('file_get_contents(') && (code.includes('http://') || code.includes('https://'))) {
      scoreDeduction += 8;
      recommendations.push({
        id: `remote_get_${gh.id}`,
        type: 'performance',
        severity: 'high',
        title: `Blocking Remote Request in '${gh.name}'`,
        description: `Direct file_get_contents on remote URLs blocks PHP thread. Replace with wp_remote_get() with a configured timeout.`,
        target: `Helper: ${gh.name}()`,
        rationale: 'wp_remote_get provides HTTP transport fallback (cURL, Streams), configurable timeouts, and WP_Error response wrappers.',
        suggestedPhpOrSql: `// Safe WordPress HTTP API with 5s timeout
$response = wp_remote_get( $api_url, array( 'timeout' => 5 ) );
if ( is_wp_error( $response ) ) {
    return false;
}
$body = wp_remote_retrieve_body( $response );`,
        category: 'performance'
      });
    }
  });

  const totalMetaFields = postTypes.reduce((acc, pt) => acc + (pt.metaFields?.length || 0), 0);
  const healthScore = Math.max(20, Math.min(100, 100 - scoreDeduction));

  return {
    timestamp: new Date().toISOString(),
    totalEndpoints: customEndpoints.length,
    totalPostTypes: postTypes.length,
    totalMetaFields,
    healthScore,
    summary: {
      cachingOpportunities: recommendations.filter(r => r.type === 'caching').length,
      indexingRecommendations: recommendations.filter(r => r.type === 'indexing').length,
      securityNotices: recommendations.filter(r => r.type === 'security').length,
    },
    recommendations
  };
};
