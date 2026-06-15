# GEMINI_CACHE.md - WordPress API Architect Plugin Builder Cache State

This file tracks the completed items, planned steps, and cached details of features developed by the agent.

## Cache Status Checkpoint
- **Last Updated**: June 2026
- **Mode**: smart-caveman-full (CLI SuperSubAgent)

---

## 1. COMPLETED WORK

### A. Modular Zip Exporter (`/utils/pluginZipExporter.ts`)
- Configured dynamic compilation for:
  - WP plugin header configuration triggers.
  - Custom Post Types (`cpt`) activator rules.
  - Taxonomy registry definitions.
  - Custom REST API endpoints router blocks.
  - Seeder generation templates block structures.
  - Workspace `package.json`, `composer.json`, and dynamic markdown readme.
- Beautiful, highly-usable download prompt hooks wrapped inside the core toolbar in `/components/CodePreview.tsx`.

### B. WordPress Sandbox Live UI Preview Pane (`/components/ResourceEditor.tsx`)
- Tabbed selector header options added: "Schema Designer" vs "WordPress Mock UI Preview".
- Responsive custom screen matching actual WP admin dashboards:
  - Admin bar with visit/update shortcuts.
  - Sidebar indexing matching available taxonomies.
  - Gutenberg Title block and interactive blocks writer.
  - Interactive Repeater rows controller. Users can dynamically:
    - Press "+ Add Row Element" to add cells.
    - Test form inputs dynamically inside the preview frame.
    - Press the Trash icon to remove row state segments on the fly.

### C. Schemas Import System (`/components/ResourceEditor.tsx`)
- Added inline interactive card overlay for JSON imports.
- Contains 5 preset industry field configurations:
  1. SEO Pack
  2. E-Commerce Specs
  3. Estate Property Specs
  4. ACF Carousel (Repeater)
  5. Customer Review Cards (Repeater)
- Custom validator with parsing checks and detailed red error boundaries.

### D. Relationships Diagnostics & Scanner Warnings Widget (`/components/ResourceEditor.tsx`)
- Added live connections panel evaluating active relationship targets.
- Features:
  - Validates target Custom Post Type availability. Warning triggers if target misses.
  - Evaluates recursive / loops patterns. Warns user about circular dependency hazards.

### E. Visual Highlights & Endpoint Connection Diagnostics (`/components/FlowDesigner.tsx`)
- Added state variables tracking active hovers (`hoveredEndpointId`, `hoveredCptId`).
- Rendered pink glowing visual overlays and increased line weights for links active during a hover state.
- Plumbed parameters to meta fields mapping validations inside nodes.
- Integrated direct highlighting within CPT nodes:
  - Displays `"REQ ENDPOINT"` glowing animation badges when a meta field is required by a hovered, connected endpoint mapping.
  - Displays a static `"REQ"` validation warning when a meta field is required by any other active endpoints.
  - Integrated `LinkIcon` indicators inside parameters indicating established WordPress field bindings.

---

## 2. METADATA PROFILE

```json
{
  "name": "WordPress API Architect",
  "description": "Enterprise WordPress CPT, API, and Schema Builder with Live Mock UI Previews and exports."
}
```
