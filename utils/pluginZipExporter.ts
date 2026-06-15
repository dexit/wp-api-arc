import JSZip from 'jszip';
import { ProjectState, FieldType, MetaField } from '../types';
import { generateOpenAPI, generatePackageJSON, generateComposerJSON, generatePlaygroundBlueprint } from '../services/wpGenerator';
import { generateSeederPHP } from '../services/dataGenerator';

/**
 * Helper to generate ACF-like meta schemas in standard array PHP formatting
 */
const generateMetaFieldSchemaPHP = (field: MetaField): string => {
  if (field.type === FieldType.REPEATER) {
    let schema = `array(\n`;
    schema += `\t\t\t\t\t'type' => 'array',\n`;
    schema += `\t\t\t\t\t'items' => array(\n`;
    schema += `\t\t\t\t\t\t'type' => 'object',\n`;
    schema += `\t\t\t\t\t\t'properties' => array(\n`;
    
    field.subFields?.forEach(sub => {
       const subType = sub.type === FieldType.INTEGER ? 'integer' : sub.type === FieldType.NUMBER ? 'number' : sub.type === FieldType.BOOLEAN ? 'boolean' : 'string';
       schema += `\t\t\t\t\t\t\t'${sub.key}' => array( 'type' => '${subType}' ),\n`;
    });

    schema += `\t\t\t\t\t\t),\n`;
    schema += `\t\t\t\t\t),\n`;
    schema += `\t\t\t\t)`;
    return schema;
  }
  
  const schemaType = field.type === FieldType.INTEGER || field.type === FieldType.RELATIONSHIP ? 'integer' : field.type === FieldType.NUMBER ? 'number' : field.type === FieldType.BOOLEAN ? 'boolean' : 'string';
  return `array( 'type' => '${schemaType}', 'description' => '${field.description.replace(/'/g, "\\'")}' )`;
};

export const exportProjectToZip = async (project: ProjectState) => {
  const zip = new JSZip();
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const projectSlugUnderscore = slug.replace(/-/g, '_');
  const classPrefix = project.name.replace(/[^a-zA-Z0-9]+/g, '_').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('_');

  // Root folder structure
  const rootFolder = zip.folder(slug);
  if (!rootFolder) return;

  // 1. Entry File: slug.php
  const mainClassFilename = `${slug}.php`;
  const mainPluginPHP = `<?php
/**
 * Plugin Name: ${project.name}
 * Description: Auto-generated advanced plugin with custom schemas, REST Endpoints, and Logic hook integrations.
 * Version: 1.0.0
 * Author: WP API Architect
 * Text Domain: ${slug}
 */

if ( ! defined( 'ABSPATH' ) ) {
\texit; // Exit if accessed directly.
}

// Global Class Constants
define( '${projectSlugUnderscore.toUpperCase()}_VERSION', '1.0.0' );
define( '${projectSlugUnderscore.toUpperCase()}_PATH', plugin_dir_path( __FILE__ ) );
define( '${projectSlugUnderscore.toUpperCase()}_URL', plugin_dir_url( __FILE__ ) );

// 1. Register Auto Activation / Deactivation Controllers
require_once ${projectSlugUnderscore.toUpperCase()}_PATH . 'includes/class-activator.php';

register_activation_hook( __FILE__, array( '${classPrefix}_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( '${classPrefix}_Activator', 'deactivate' ) );

// 2. Load Core Dependencies
require_once ${projectSlugUnderscore.toUpperCase()}_PATH . 'includes/class-global-helpers.php';
require_once ${projectSlugUnderscore.toUpperCase()}_PATH . 'includes/class-content-registry.php';
require_once ${projectSlugUnderscore.toUpperCase()}_PATH . 'includes/class-api-endpoints.php';

// 3. Kickstart Services on WordPress Initialization
add_action( 'plugins_loaded', function() {
\t${classPrefix}_Content_Registry::init();
\t${classPrefix}_API_Endpoints::init();
} );
`;

  rootFolder.file(mainClassFilename, mainPluginPHP);

  // 2. Activation Hooks Module: includes/class-activator.php
  const includesFolder = rootFolder.folder('includes');
  if (includesFolder) {
    const activatorPHP = `<?php
/**
 * Handle activation and deactivation hooks.
 */
class ${classPrefix}_Activator {

\t/**
\t * Fired during plugin activation.
\t * Registers custom objects and flushes rewrite rules to prevent 404 errors.
\t */
\tpublic static function activate() {
\t\t// Flush rewrite rules
\t\trequire_once ${projectSlugUnderscore.toUpperCase()}_PATH . 'includes/class-content-registry.php';
\t\t${classPrefix}_Content_Registry::register_collections();
\t\tflush_rewrite_rules();
\t}

\t/**
\t * Fired during deactivation.
\t */
\tpublic static function deactivate() {
\t\tflush_rewrite_rules();
\t}
}
`;
    includesFolder.file('class-activator.php', activatorPHP);

    // 3. Content Registry CPT & Taxonomies Module: includes/class-content-registry.php
    let registryPHP = `<?php
/**
 * Register post types, taxonomies, and metadata fields.
 */
class ${classPrefix}_Content_Registry {

\tpublic static function init() {
\t\tadd_action( 'init', array( __CLASS__, 'register_collections' ) );
\t\tadd_action( 'init', array( __CLASS__, 'register_custom_metas' ) );
\t}

\tpublic static function register_collections() {
`;

    // Taxonomies registration inside content registry
    project.taxonomies.forEach((tax) => {
      registryPHP += `
\t\t// Taxonomy: ${tax.pluralName}
\t\tregister_taxonomy( '${tax.slug}', ${JSON.stringify(tax.connectedPostTypes)}, array(
\t\t\t'labels' => array(
\t\t\t\t'name' => '${tax.pluralName}',
\t\t\t\t'singular_name' => '${tax.singularName}',
\t\t\t),
\t\t\t'hierarchical' => ${tax.hierarchical ? 'true' : 'false'},
\t\t\t'show_in_rest' => ${tax.showInRest ? 'true' : 'false'},
\t\t) );
`;
    });

    // Custom Post Types registration inside content registry
    project.postTypes.forEach((cpt) => {
      registryPHP += `
\t\t// Post Type: ${cpt.pluralName}
\t\tregister_post_type( '${cpt.slug}', array(
\t\t\t'labels' => array(
\t\t\t\t'name' => '${cpt.pluralName}',
\t\t\t\t'singular_name' => '${cpt.singularName}',
\t\t\t),
\t\t\t'public' => true,
\t\t\t'has_archive' => true,
\t\t\t'menu_icon' => 'dashicons-${cpt.icon}',
\t\t\t'supports' => array( ${cpt.supports.map((s) => `'${s}'`).join(', ')} ),
\t\t\t'show_in_rest' => ${cpt.showInRest ? 'true' : 'false'},
\t\t\t'rest_base' => '${cpt.restBase}',
\t\t) );
`;
    });

    registryPHP += `\t}\n\n`;

    // Meta Fields register inside registry
    registryPHP += `\tpublic static function register_custom_metas() {\n`;
    project.postTypes.forEach((cpt) => {
      cpt.metaFields.forEach((field) => {
        if (field.showInRest) {
          const type = field.type === FieldType.REPEATER ? 'array' : field.type === FieldType.INTEGER || field.type === FieldType.RELATIONSHIP ? 'integer' : field.type === FieldType.NUMBER ? 'number' : field.type === FieldType.BOOLEAN ? 'boolean' : 'string';
          registryPHP += `
\t\tregister_post_meta( '${cpt.slug}', '${field.key}', array(
\t\t\t'show_in_rest' => array(
\t\t\t\t'schema' => ${generateMetaFieldSchemaPHP(field)}
\t\t\t),
\t\t\t'single' => true,
\t\t\t'type' => '${type}',
\t\t) );
`;
        }
      });
    });
    registryPHP += `\t}\n}\n`;

    includesFolder.file('class-content-registry.php', registryPHP);

    // 4. REST API Endpoint Router Module: includes/class-api-endpoints.php
    let endpointsPHP = `<?php
/**
 * Register REST routes and route controller callbacks.
 */
class ${classPrefix}_API_Endpoints {

\tpublic static function init() {
\t\tadd_action( 'rest_api_init', array( __CLASS__, 'register_rest_endpoints' ) );
\t}

\tpublic static function register_rest_endpoints() {
`;

    project.customEndpoints.forEach(endpoint => {
      const cleanRoute = endpoint.route.startsWith('/') ? endpoint.route : '/' + endpoint.route;
      endpointsPHP += `
\t\tregister_rest_route( '${project.namespace}', '${cleanRoute}', array(
\t\t\t'methods' => '${endpoint.method}',
\t\t\t'callback' => array( __CLASS__, '${endpoint.callbackFunction}' ),
\t\t\t'permission_callback' => '__return_true', 
\t\t\t'args' => array(
${endpoint.parameters.map(param => `\t\t\t\t'${param.key}' => array(
\t\t\t\t\t'required' => ${param.required ? 'true' : 'false'},
\t\t\t\t\t'type' => '${param.type}',
\t\t\t\t\t'description' => '${param.description.replace(/'/g, "\\'")}',
\t\t\t\t),`).join('\n')}
\t\t\t),
\t\t) );
`;
    });

    endpointsPHP += `\t}\n\n`;

    // Dynamic Callbacks on Endpoints API class
    project.customEndpoints.forEach(endpoint => {
      endpointsPHP += `\t/**\n\t * Handler for ${endpoint.method} ${endpoint.route}\n\t */\n`;
      endpointsPHP += `\tpublic static function ${endpoint.callbackFunction}( $request ) {\n`;
      endpointsPHP += `\t\t// 1. Parse Parameters\n`;
      endpoint.parameters.forEach(param => {
        endpointsPHP += `\t\t$${param.key} = $request->get_param( '${param.key}' );\n`;
      });

      if (endpoint.storage?.enabled && endpoint.method !== 'GET') {
        endpointsPHP += `\n\t\t// 2. Storage Automator (${endpoint.storage.targetCptSlug})\n`;
        endpointsPHP += `\t\t$post_data = array(\n`;
        endpointsPHP += `\t\t\t'post_type'   => '${endpoint.storage.targetCptSlug}',\n`;
        endpointsPHP += `\t\t\t'post_status' => 'publish',\n`;
        
        Object.entries(endpoint.storage.fieldMapping).forEach(([paramKey, metaKey]) => {
           if (metaKey === 'post_title') {
             endpointsPHP += `\t\t\t'post_title'  => $${paramKey},\n`;
           }
           if (metaKey === 'post_content') {
             endpointsPHP += `\t\t\t'post_content'  => $${paramKey},\n`;
           }
        });
        endpointsPHP += `\t\t);\n\n`;
        endpointsPHP += `\t\t$post_id = wp_insert_post( $post_data );\n\n`;
        
        endpointsPHP += `\t\tif ( ! is_wp_error( $post_id ) ) {\n`;
        Object.entries(endpoint.storage.fieldMapping).forEach(([paramKey, metaKey]) => {
           if (metaKey !== 'post_title' && metaKey !== 'post_content') {
             endpointsPHP += `\t\t\tupdate_post_meta( $post_id, '${metaKey}', $${paramKey} );\n`;
           }
        });
        endpointsPHP += `\t\t}\n`;
      }

      if (endpoint.customPhp) {
        endpointsPHP += `\n\t\t// 3. Custom Logic\n`;
        endpointsPHP += `\t\t${endpoint.customPhp.split('\n').join('\n\t\t')}\n`;
      }

      if (endpoint.hookName) {
        const actionArgs = endpoint.storage?.enabled ? `array( 'request' => $request, 'post_id' => $post_id )` : `$request`;
        endpointsPHP += `\n\t\t// 4. Hook Fire\n`;
        endpointsPHP += `\t\tdo_action( '${endpoint.hookName}', ${actionArgs} );\n`;
      }

      endpointsPHP += `\n\t\treturn new WP_REST_Response( array(\n\t\t\t'success' => true,\n\t\t\t'message' => 'Processed ${endpoint.route}',\n`;
      if (endpoint.storage?.enabled) {
         endpointsPHP += `\t\t\t'resource_id' => $post_id\n`;
      }
      endpointsPHP += `\t\t), 200 );\n`;
      endpointsPHP += `\t}\n\n`;
    });

    endpointsPHP += `}\n`;
    includesFolder.file('class-api-endpoints.php', endpointsPHP);

    // 5. Global Helpers Module: includes/class-global-helpers.php
    let helpersPHP = `<?php
/**
 * Global functional triggers and custom logic engines.
 */
`;
    if (project.globalHelpers && project.globalHelpers.length > 0) {
      project.globalHelpers.forEach(helper => {
         helpersPHP += `\n/**\n * ${helper.description || helper.name}\n */\n`;
         helpersPHP += `if ( ! function_exists( '${helper.name}' ) ) {\n`;
         helpersPHP += `\tfunction ${helper.name}( ${helper.parameters} ) {\n`;
         helpersPHP += helper.phpCode.split('\n').map(line => `\t\t${line.trimLeft()}`).join('\n') + '\n';
         helpersPHP += `\t}\n}\n`;
      });
    } else {
      helpersPHP += `\n// No global helpers custom declared.\n`;
    }

    includesFolder.file('class-global-helpers.php', helpersPHP);
  }

  // 6. Manifest / Build Configuration Files
  rootFolder.file('package.json', generatePackageJSON(project));
  rootFolder.file('composer.json', generateComposerJSON(project));
  rootFolder.file('seeder.php', generateSeederPHP(project));
  rootFolder.file('openapi.json', generateOpenAPI(project));
  rootFolder.file('blueprint.json', generatePlaygroundBlueprint(project));

  // 7. Dynamic Documentation Readme
  const readmeContent = `# ${project.name} WP Plugin

This WordPress plugin was fully generated using **WP API Architect**.

## Directory Layout
- \`includes/class-activator.php\`: Handles activation hook declarations and rewrite rules flushes.
- \`includes/class-content-registry.php\`: Registers defined Custom Post Types, associated taxonomies, and registers post metadata schemas.
- \`includes/class-api-endpoints.php\`: Powers custom REST Endpoints under the \`${project.namespace}\` namespace.
- \`includes/class-global-helpers.php\`: Custom utility functions.
- \`blueprint.json\`: Ready-to-go WP Playground bootstrapping config.
- \`seeder.php\`: PHP script to mock 5 database records per post-type via WP-CLI \`wp eval-file seeder.php\`.

## Registered Post-Types
${project.postTypes.map(cpt => `- **${cpt.singularName}** (\`${cpt.slug}\`): Supports [${cpt.supports.join(', ')}].`).join('\n')}

## Custom REST API Endpoints
${project.customEndpoints.map(ep => `- \`${ep.method} /wp-json/${project.namespace}${ep.route.startsWith('/') ? ep.route : '/' + ep.route}\`: ${ep.description}`).join('\n')}

## Installation
Compress this folder into a \`${slug}.zip\` file and upload it directly inside the WordPress Plugins Dashboard.
`;
  rootFolder.file('README.md', readmeContent);

  // Generate ZIP blob and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-wordpress-plugin.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
