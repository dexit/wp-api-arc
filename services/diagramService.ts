import { ProjectState } from '../types';

export const generateMermaidDiagram = (project: ProjectState): string => {
  let mermaid = 'classDiagram\n';
  mermaid += '    direction LR\n';

  // Taxonomies
  project.taxonomies.forEach(tax => {
    const className = `Tax_${tax.slug.replace(/[^a-zA-Z0-9]/g, '_')}`;
    mermaid += `    class ${className} {\n`;
    mermaid += `        <<Taxonomy>>\n`;
    mermaid += `        +slug: ${tax.slug}\n`;
    mermaid += `        +hierarchical: ${tax.hierarchical}\n`;
    mermaid += `    }\n`;
  });

  // Post Types
  project.postTypes.forEach(cpt => {
    const className = `CPT_${cpt.slug.replace(/[^a-zA-Z0-9]/g, '_')}`;
    mermaid += `    class ${className} {\n`;
    mermaid += `        <<PostType>>\n`;
    mermaid += `        +slug: ${cpt.slug}\n`;
    mermaid += `        +rest_base: ${cpt.restBase}\n`;
    cpt.metaFields.forEach(field => {
       mermaid += `        +${field.type} ${field.key}\n`;
    });
    mermaid += `    }\n`;

    // Connections to Taxonomies
    cpt.taxonomies.forEach(taxSlug => {
      const tax = project.taxonomies.find(t => t.slug === taxSlug);
      if (tax) {
        const taxClassName = `Tax_${tax.slug.replace(/[^a-zA-Z0-9]/g, '_')}`;
        mermaid += `    ${className} ..> ${taxClassName} : classified by\n`;
      }
    });
  });

  // Endpoints
  const apiClass = `API_${project.namespace.replace(/[^a-zA-Z0-9]/g, '_')}`;
  mermaid += `    class ${apiClass} {\n`;
  mermaid += `        <<REST API>>\n`;
  mermaid += `        namespace: ${project.namespace}\n`;
  project.customEndpoints.forEach(ep => {
      // Escape route for display
      const routeClean = ep.route.replace(/"/g, "'");
      mermaid += `        +${ep.method} ${routeClean}()\n`;
  });
  mermaid += `    }\n`;
  
  // Connect Endpoints to CPTs if storage is mapped
  project.customEndpoints.forEach(ep => {
      if (ep.storage?.enabled && ep.storage.targetCptSlug) {
          const target = project.postTypes.find(pt => pt.slug === ep.storage?.targetCptSlug);
          if (target) {
              const targetClass = `CPT_${target.slug.replace(/[^a-zA-Z0-9]/g, '_')}`;
              mermaid += `    ${apiClass} --> ${targetClass} : creates\n`;
          }
      }
  });

  return mermaid;
};
