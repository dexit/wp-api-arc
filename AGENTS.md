# AGENTS.md - Developer Conventions

This guide is designed for developers and AI agents maintaining the WP API Architect project.

## Code Conventions
- **Types First**: Keep all state and variable declarations typed in `/types.ts`.
- **Modularity**: Do not consolidate all screens into `App.tsx`. Extract interactive views to components inside `/components/*`.
- **Pure CSS**: Use modern Tailwind CSS classes entirely. Never hardcode absolute pixel styles in inline attributes unless tracking viewport coordinates.
- **Icons**: Favor `lucide-react` for all visual icons. No custom inline SVGs.
