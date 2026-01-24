# UI Rules (Theme-Safe + Preferences-Aware)

This project uses a custom preferences + theme preset system.

See also: `BOILERPLATE.md` for the full boilerplate map (existing components/hooks/pages).

Your job when creating new pages/components is to make UI that automatically stays consistent across:
- Theme preset changes (`data-theme-preset`)
- Theme mode (light/dark/system; `.dark` on `<html>`)
- Layout preferences (`data-content-layout`, `data-navbar-style`, `data-sidebar-*`, `data-font`)

If you break these rules, the UI will look wrong when the user switches presets/mode/layout.


## 1) The Source of Truth

- CSS variables + token mapping live in `src/app/globals.css`.
- Theme presets live in `src/styles/presets/*.css` and are activated via `html[data-theme-preset=...]`.
- Preferences are applied before hydration via `src/scripts/theme-boot.tsx`.
- Client state is in Zustand via `src/stores/preferences/*`.
- Preference persistence is configured in `src/lib/preferences/preferences-config.ts` and written via `src/lib/preferences/preferences-storage.ts`.


## 2) Always Use Theme Tokens (Never Hardcode Colors)

Do:
- `bg-background text-foreground`
- `bg-card text-card-foreground`
- `bg-popover text-popover-foreground`
- `bg-primary text-primary-foreground`
- `bg-secondary text-secondary-foreground`
- `bg-muted text-muted-foreground`
- `bg-accent text-accent-foreground`
- `border-border`
- focus/ring via: `focus-visible:ring-ring/50`, `focus-visible:border-ring`, `outline-ring/50`

Avoid (unless you explicitly want fixed, non-themeable UI):
- `bg-white`, `text-black`
- `text-zinc-*`, `bg-slate-*`, `border-gray-*`
- any hardcoded hex/rgb/hsl values for general surfaces/text

Why:
- Presets swap CSS variables like `--background`, `--foreground`, `--primary`, etc. Hardcoded colors will not follow.


## 3) Prefer Existing shadcn/ui Components

Use components in `src/components/ui/*` as your primitives (Button, Card, Input, Dialog, Select, Tabs, etc.).
They already encode theme-safe styling.

When composing custom UI, keep the same conventions:
- Use `cn(...)` from `src/lib/utils.ts` for class merging.
- Keep typography and spacing consistent with existing pages in `src/app/(main)/dashboard/*`.


## 4) Never Manually Toggle `.dark` or Reimplement Theme Switching

Do not add logic that toggles the `dark` class yourself.

Theme mode and preset are handled by:
- Pre-hydration boot script: `src/scripts/theme-boot.tsx`
- Helpers: `src/lib/preferences/theme-utils.ts`
- Store: `src/stores/preferences/preferences-store.ts`

If you need the current mode/preset in a client component:
- `usePreferencesStore((s) => s.themeMode)`
- `usePreferencesStore((s) => s.resolvedThemeMode)`
- `usePreferencesStore((s) => s.themePreset)`


## 5) Layout Preferences: Use `html[data-*]` Selectors

Some preferences affect layout and are expressed as attributes on `<html>`:
- `data-content-layout` (centered/full-width)
- `data-navbar-style` (sticky/scroll)
- `data-sidebar-variant`, `data-sidebar-collapsible`
- `data-font`

To make layout react to preferences, use attribute selectors like:
- `[html[data-content-layout=centered]_&]:mx-auto`
- `[html[data-content-layout=centered]_&]:max-w-screen-2xl`
- `[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0`

Avoid hardcoding layout widths that conflict with the centered/full-width preference.


## 6) SSR vs Client: Read Preferences from the Correct Place

Layout-critical prefs (must be consistent on SSR) are documented in:
- `src/lib/preferences/preferences-config.ts` (`LAYOUT_CRITICAL_KEYS`)

If a server component/layout needs a preference value:
- Use `getPreference()` from `src/server/server-actions.ts`.

If only the client needs it:
- Use `usePreferencesStore(...)`.


## 7) Charts: Use Theme Chart Variables

Presets define chart colors via variables like `--chart-1` to `--chart-5`.
When creating charts (e.g., Recharts), use:
- `var(--chart-1)` / `var(--chart-2)` ...

Do not hardcode chart palettes.


## 8) Fonts: Do Not Set `font-family` in Components

Fonts are controlled by `html[data-font=...]` (see `src/app/globals.css` and `src/lib/fonts/registry.ts`).

Do:
- Use Tailwind typography utilities (`text-sm`, `font-medium`, etc.)

Avoid:
- Inline `fontFamily` or custom CSS that overrides the global font.


## 9) Where New Pages Should Live

For dashboard features that should inherit the admin shell (sidebar/header/padding):
- Create routes under `src/app/(main)/dashboard/<feature>/page.tsx`.

Use the existing page patterns, e.g.:
- `src/app/(main)/dashboard/default/page.tsx`


## 10) When Adding/Editing Presets

1) Add a new CSS file in `src/styles/presets/<name>.css`.
2) Include header comments:
   - `label: <Human Name>`
   - `value: <preset-key>`
3) Define both:
   - `:root[data-theme-preset="<preset-key>"] { ... }`
   - `.dark:root[data-theme-preset="<preset-key>"] { ... }`
4) Ensure it is imported in `src/app/globals.css`.
5) Run `pnpm generate:presets` to update `src/lib/preferences/theme.ts`.


## 11) Quick Pre-Flight Checklist

Before finishing any UI task:
- No hardcoded surface/text colors.
- Borders use `border-border`.
- Surfaces use `background/card/popover` tokens.
- Accents use `primary/secondary/muted/accent` tokens.
- If layout varies: use `[html[data-...]]` selectors or read preferences from the store.
