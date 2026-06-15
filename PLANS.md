# PLANS.md - Developer Action Plans

This document catalogs all proposed implementation plans and historical plans for WP API Architect.

## Plan #1: WordPress Preview, Schema Import, and Relationship Diagnostics
1. **Develop Schema Import & Presets Module** in `ResourceEditor.tsx`: Add preset templates (SEO, ecom, real_estate, etc.) and direct smart JSON input parsing/validating.
2. **Develop Interactive WordPress Mock UI Preview**: Insert dual-tab switcher (Schema Designer / WP Admin Preview) in the left panel of `ResourceEditor`. Render authentic WordPress Gutenberg admin panel with customizable dynamic input form, plus deep-interactive repeaters with custom temporary client row additions.
3. **Build Relationship Diagnostic Panel** in sidebar: Check relationship connections against available CPT schemas, detect missing link targets and circular dependencies.
