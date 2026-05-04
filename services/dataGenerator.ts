import { ProjectState, CustomPostType, MetaField, FieldType } from '../types';

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomText = (label: string) => {
  const adjecties = ['Awesome', 'Rapid', 'Dynamic', 'Global', 'Smart', 'Sustainable', 'Innovative'];
  const nouns = ['Solution', 'Project', 'Initiative', 'Platform', 'System', 'Strategy'];
  return `${adjecties[getRandomInt(0, adjecties.length - 1)]} ${nouns[getRandomInt(0, nouns.length - 1)]} - ${label}`;
};

const generateMetaValue = (field: MetaField): string | number | boolean => {
  switch (field.type) {
    case FieldType.INTEGER:
    case FieldType.NUMBER:
      if (field.key.includes('price') || field.key.includes('cost')) return getRandomInt(10, 500);
      if (field.key.includes('rating')) return getRandomInt(1, 5);
      return getRandomInt(1, 100);
    case FieldType.BOOLEAN:
      return Math.random() > 0.5;
    case FieldType.RELATIONSHIP:
      // We return 1 as a placeholder ID, or random int to simulate connection
      return getRandomInt(1, 5);
    case FieldType.REPEATER:
      // Return a JSON encoded string for repeater
      const items = [];
      for(let i=0; i<2; i++) {
        const item: any = {};
        field.subFields?.forEach(sf => {
            item[sf.key] = generateMetaValue(sf);
        });
        items.push(item);
      }
      return JSON.stringify(items);
    case FieldType.STRING:
    default:
      if (field.key.includes('email')) return `user${getRandomInt(1,999)}@example.com`;
      if (field.key.includes('url') || field.key.includes('link')) return 'https://example.com';
      if (field.key.includes('date')) return new Date().toISOString().split('T')[0];
      return `Sample ${field.label}`;
  }
};

export const generateSeederBody = (project: ProjectState): string => {
    const { postTypes } = project;
    let php = `
    $user_id = get_current_user_id();
    if ( ! $user_id ) $user_id = 1;
`;

  postTypes.forEach(cpt => {
    php += `
    // ---------------------------------------------------
    // Seed ${cpt.pluralName} (${cpt.slug})
    // ---------------------------------------------------
    
    for ( $i = 1; $i <= 5; $i++ ) {
        $post_data = array(
            'post_title'    => '${cpt.singularName} ' . $i . ' - ' . wp_generate_password(6, false),
            'post_content'  => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Generated content for testing.',
            'post_status'   => 'publish',
            'post_type'     => '${cpt.slug}',
            'post_author'   => $user_id,
        );

        $post_id = wp_insert_post( $post_data );

        if ( ! is_wp_error( $post_id ) ) {
`;

    // Generate Meta
    cpt.metaFields.forEach(field => {
       const value = generateMetaValue(field);
       let phpValue = '';
       
       if (typeof value === 'string') {
           // Escape single quotes
           phpValue = `'${value.replace(/'/g, "\\'")}'`;
       } else if (typeof value === 'boolean') {
           phpValue = value ? 'true' : 'false';
       } else {
           phpValue = String(value);
       }
       
       php += `            update_post_meta( $post_id, '${field.key}', ${phpValue} );\n`;
    });

    // Handle Taxonomy Assignment (Random)
    cpt.taxonomies.forEach(taxSlug => {
        const tax = project.taxonomies.find(t => t.slug === taxSlug);
        if (tax) {
            php += `            
            // Assign random terms for ${tax.singularName}
            $term_name = '${tax.singularName} ' . rand(1, 3);
            $term = term_exists( $term_name, '${tax.slug}' );
            if ( ! $term ) {
                $term = wp_insert_term( $term_name, '${tax.slug}' );
            }
            if ( ! is_wp_error( $term ) ) {
                wp_set_object_terms( $post_id, (int) $term['term_id'], '${tax.slug}' );
            }
`;
        }
    });

    php += `        }\n    }\n`;
  });
  
  return php;
}

export const generateSeederPHP = (project: ProjectState): string => {
  const projectSlug = project.name.toLowerCase().replace(/\s+/g, '_');
  
  let php = `<?php
/**
 * Seeder Script for ${project.name}
 * 
 * Instructions:
 * 1. Place this file in your WordPress root or theme folder.
 * 2. Include it in your functions.php temporarily, or run via WP-CLI:
 *    wp eval-file seeder.php
 */

if ( ! defined( 'ABSPATH' ) ) {
    /** Load WordPress Bootstrap */
    require_once( 'wp-load.php' );
}

function ${projectSlug}_seed_data() {
    ${generateSeederBody(project)}
    echo "Seeding Complete!";
}

// Run the seeder
${projectSlug}_seed_data();
`;

  return php;
};
