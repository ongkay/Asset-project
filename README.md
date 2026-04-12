# Next Shadcn Admin Dashboard Boilerplate
Admin dashboard boilerplate for Next.js App Router, built to serve as a production starting point.

## Quick Start
```bash
pnpm i
pnpm dev
```

The app runs at `http://localhost:3000`.

Main scripts:
```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
pnpm check
pnpm check:fix
pnpm markdown:check
pnpm markdown:fix
pnpm generate:presets
```

Husky pre-commit runs `pnpm generate:presets` and `lint-staged`.

## Stack
- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui
- Zustand
- React Hook Form + Zod
- TanStack Table
- Recharts
- ESLint, Prettier, Husky, lint-staged

## What This Repo Gives You
- Dashboard shell with sidebar, settings, auth, unauthorized, and not-found flows
- Theme/preset/layout/font preference system with SSR-safe persistence
- Feature-local forms, tables, charts, and reusable UI primitives
- Sample dashboard pages you can copy into real product modules

## Project Structure
- `src/app/*`: routes and layouts
- `src/components/ui/*`: shared UI primitives and internal components
- `src/components/*`: small shared leaf components
- `src/app/(main)/dashboard/*/_components/*`: dashboard blocks, charts, and tables
- `src/app/(main)/auth/_components/*`: shared auth forms and social auth UI
- `src/config/*`: app metadata and config values
- `src/hooks/*`: reusable hooks
- `src/lib/*`: utilities, fonts, and preference helpers
- `src/stores/preferences/*`: preference store/provider
- `src/navigation/sidebar/*`: sidebar config
- `src/styles/presets/*`: theme preset CSS
- `src/scripts/*`: theme boot, preset generation, markdown utilities
- `src/server/*`: server actions for cookies and SSR preference reads
- `src/data/*`: sample data

## Routing
- `/` redirects to `/dashboard/default`
- `/dashboard` redirects to `/dashboard/default`
- Dashboard examples: `default`, `crm`, `finance`, `analytics`, `settings`, `coming-soon`
- Auth examples: `v1/login`, `v1/register`, `v2/login`, `v2/register`
- Other routes: `unauthorized`, dashboard-local not-found, global not-found

## Theme And Preferences
The app stores preferences on `<html>` via these attributes:
- `data-theme-mode`: `light | dark | system`
- `data-theme-preset`: `default | brutalist | soft-pop | tangerine`
- `data-content-layout`: `centered | full-width`
- `data-navbar-style`: `sticky | scroll`
- `data-sidebar-variant`: `sidebar | inset | floating`
- `data-sidebar-collapsible`: `icon | offcanvas`
- `data-font`: see `src/lib/fonts/registry.ts`

Key files:
- `src/app/globals.css`: base tokens and default theme
- `src/styles/presets/*.css`: preset overrides
- `src/lib/preferences/preferences-config.ts`: defaults and persistence rules
- `src/lib/preferences/theme-utils.ts`: apply theme mode/preset
- `src/lib/preferences/layout-utils.ts`: apply layout/font preferences
- `src/scripts/theme-boot.tsx`: pre-hydration DOM sync
- `src/stores/preferences/preferences-provider.tsx`: client store sync + system theme updates
- `src/scripts/generate-theme-presets.ts`: regenerates `src/lib/preferences/theme.ts`

## Mandatory UI Rules
### Colors
- Use semantic tokens for app surfaces and text.
- Avoid hardcoded colors in product UI unless there is a clear local reason.
- Avoid `bg-white`, `text-black`, `text-zinc-*`, `bg-slate-*`, and `border-gray-*` in product screens.
- Exceptions: `src/components/ui/*` internals, status/data-viz accents, and isolated debug/demo blocks.

### Components
- Prefer `src/components/ui/*` before adding new UI.
- Use `cn(...)` from `src/lib/utils.ts` to merge classes.

### Theme Switching
- Do not toggle `.dark` manually.
- Do not introduce a separate theme system.
- Read `themeMode`, `resolvedThemeMode`, and `themePreset` from the preference store in client code.

### Layout-Aware Styling
- Use `html[data-*]` selectors for layout-dependent UI.
- Example: `[html[data-content-layout=centered]_&]:mx-auto`.

### SSR Vs Client
- Read layout-critical preferences on the server with `getPreference(...)`.
- Use the preference store only for client interaction.

### Charts And Fonts
- Prefer `var(--chart-1)` through `var(--chart-5)` for chart palettes.
- Use `var(--primary)` only when a chart is intentionally branded to the primary color.
- Do not set `font-family` directly in components.

## Build Patterns
### New Dashboard Page
- Add `src/app/(main)/dashboard/<feature>/page.tsx`.
- Keep local blocks in `src/app/(main)/dashboard/<feature>/_components/*`.
- A good page wrapper is `@container/main flex flex-col gap-4 md:gap-6`.

### Sidebar Item
1. Add the route page.
2. Update `src/navigation/sidebar/sidebar-items.ts`.
3. Use `subItems` for nested menus.

### Table
- Use `useReactTable` inside the feature-local table component.
- Pair it with `src/components/ui/table.tsx`.
- Always set `getRowId`.

### Form
- Use Zod + React Hook Form.
- Build inputs with `field`, `input`, `select`, and `checkbox` primitives.

### Chart
- Use `ChartContainer` and the chart components from `src/components/ui/chart.tsx`.

### Preferences UI
- Apply changes through the theme/layout helpers.
- Update the Zustand store.
- Persist with `persistPreference(...)`.

### New Preset
1. Add `src/styles/presets/<preset>.css`.
2. Add `label:` and `value:` comments.
3. Define both `:root[...]` and `.dark:root[...]` selectors.
4. Define `--primary` in both selectors.
5. Import the preset in `src/app/globals.css`.
6. Run `pnpm generate:presets`.

## Conventions
- PNPM is the standard package manager.
- `src/components/ui` is excluded from the project-specific ESLint rule enforcement.
- Husky pre-commit runs `pnpm generate:presets` and `lint-staged`.
- Keep feature code colocated next to the page in `_components`.

## Before Shipping
- Run `pnpm check` and `pnpm build`.
- Make sure routes and sidebar stay in sync.
- Keep colors theme-safe and forms clear.
- Reuse existing patterns before adding new abstractions.
