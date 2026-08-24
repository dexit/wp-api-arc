import { ProjectState, CustomPostType, FieldType, MetaField } from '../types';

/**
 * Generates clean SQLite DDL schema and initial seed queries for the project
 */
export const generateSQLiteDDL = (project: ProjectState): string => {
  const timestamp = new Date().toISOString();
  let sql = `-- =========================================================================\n`;
  sql += `-- SQLite Database Dump / DDL Schema\n`;
  sql += `-- Project: ${project.name}\n`;
  sql += `-- Namespace: ${project.namespace}/${project.apiVersion || 'v1'}\n`;
  sql += `-- Generated: ${timestamp}\n`;
  sql += `-- =========================================================================\n\n`;

  // 1. Core Post Types Tables
  project.postTypes.forEach((cpt) => {
    const tableName = `wp_${cpt.slug.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    
    sql += `-- Table structure for Post Type: ${cpt.pluralName} (${cpt.slug})\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n`;
    sql += `  \`id\` INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
    sql += `  \`post_title\` TEXT NOT NULL,\n`;
    sql += `  \`post_content\` TEXT,\n`;
    sql += `  \`post_excerpt\` TEXT,\n`;
    sql += `  \`post_status\` TEXT DEFAULT 'publish',\n`;
    sql += `  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP`;

    // Map Meta Fields as Columns
    cpt.metaFields.forEach((meta) => {
      const colType = meta.type === FieldType.INTEGER || meta.type === FieldType.RELATIONSHIP ? 'INTEGER' :
                      meta.type === FieldType.NUMBER ? 'REAL' :
                      meta.type === FieldType.BOOLEAN ? 'INTEGER' : 'TEXT';
      const isReq = meta.required ? ' NOT NULL' : '';
      sql += `,\n  \`${meta.key}\` ${colType}${isReq}`;
    });

    sql += `\n);\n\n`;

    // Sample Insert Statement
    sql += `-- Sample seed data for ${tableName}\n`;
    sql += `INSERT INTO \`${tableName}\` (\`post_title\`, \`post_content\``;
    cpt.metaFields.forEach((meta) => {
      sql += `, \`${meta.key}\``;
    });
    sql += `) VALUES (\n`;
    sql += `  'Sample ${cpt.singularName} #1', 'This is a sample description for ${cpt.singularName}.'`;

    cpt.metaFields.forEach((meta) => {
      if (meta.type === FieldType.INTEGER || meta.type === FieldType.RELATIONSHIP) {
        sql += `, 1`;
      } else if (meta.type === FieldType.NUMBER) {
        sql += `, 99.99`;
      } else if (meta.type === FieldType.BOOLEAN) {
        sql += `, 1`;
      } else {
        sql += `, 'Sample ${meta.label}'`;
      }
    });

    sql += `\n);\n\n`;
  });

  // 2. Taxonomies Tables
  project.taxonomies.forEach((tax) => {
    const taxTable = `wp_tax_${tax.slug.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    sql += `-- Taxonomy Table: ${tax.pluralName} (${tax.slug})\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`${taxTable}\` (\n`;
    sql += `  \`term_id\` INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
    sql += `  \`name\` TEXT NOT NULL,\n`;
    sql += `  \`slug\` TEXT NOT NULL UNIQUE,\n`;
    sql += `  \`parent_id\` INTEGER DEFAULT 0\n`;
    sql += `);\n\n`;
  });

  return sql;
};

/**
 * Parses SQLite CREATE TABLE statements into CPT models and Meta Fields
 */
export const parseSQLiteDDLToProject = (sqlText: string): { postTypes: CustomPostType[] } => {
  const postTypes: CustomPostType[] = [];
  const createTableRegex = /CREATE\ TABLE\ (?:IF\ NOT\ EXISTS\ )?`?([a-zA-Z0-9_]+)`?\ \(([\s\S]*?)\);/gi;

  let match;
  while ((match = createTableRegex.exec(sqlText)) !== null) {
    const origTableName = match[1];
    const columnsBlock = match[2];

    // Ignore WP tax tables
    if (origTableName.startsWith('wp_tax_')) continue;

    const slug = origTableName.replace(/^wp_/, '');
    const singular = slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const plural = singular + 's';

    const metaFields: MetaField[] = [];
    const colLines = columnsBlock.split(',').map(l => l.trim());

    colLines.forEach((line, idx) => {
      const colMatch = line.match(/^`?([a-zA-Z0-9_]+)`?\s+([a-zA-Z]+)/i);
      if (!colMatch) return;

      const colName = colMatch[1];
      const dataType = colMatch[2].toUpperCase();

      // Skip standard WP columns
      if (['id', 'post_title', 'post_content', 'post_excerpt', 'post_status', 'created_at', 'updated_at', 'term_id', 'parent_id'].includes(colName.toLowerCase())) {
        return;
      }

      let fType = FieldType.STRING;
      if (dataType === 'INTEGER' || dataType === 'INT') fType = FieldType.INTEGER;
      else if (dataType === 'REAL' || dataType === 'FLOAT' || dataType === 'DOUBLE') fType = FieldType.NUMBER;
      else if (dataType === 'BOOLEAN' || dataType === 'BOOL') fType = FieldType.BOOLEAN;

      metaFields.push({
        id: `field_${Date.now()}_${idx}`,
        key: colName,
        label: colName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        type: fType,
        description: `Imported column from SQLite table ${origTableName}`,
        required: line.toUpperCase().includes('NOT NULL'),
        showInRest: true
      });
    });

    postTypes.push({
      id: `cpt_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
      slug: slug,
      singularName: singular,
      pluralName: plural,
      description: `Imported model from SQLite table ${origTableName}`,
      icon: 'database',
      supports: ['title', 'editor'],
      taxonomies: [],
      showInRest: true,
      restBase: slug,
      metaFields
    });
  }

  return { postTypes };
};
