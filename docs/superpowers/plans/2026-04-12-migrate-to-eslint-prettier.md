# Migrate To ESLint Prettier Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Biome with ESLint and Prettier while keeping repository behavior and code style close to the current setup.

**Architecture:** ESLint will own linting and code-quality rules, while Prettier will own formatting. Existing package scripts, lint-staged hooks, docs, and the theme preset generation script will be updated so the repo no longer depends on Biome.

**Tech Stack:** Next.js, TypeScript, ESLint flat config, typescript-eslint, Prettier, Husky, lint-staged

---

### Task 1: Replace Tooling Configuration
**Files:**
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Modify: `package.json`
- Delete: `biome.json`

- [ ] Inspect current package scripts and Biome config to map required behavior.
- [ ] Add ESLint flat config with Next.js, TypeScript, and repo-specific rule overrides.
- [ ] Add Prettier config that matches the repo's current formatting conventions as closely as practical.
- [ ] Replace package scripts and lint-staged entries to use ESLint and Prettier.
- [ ] Remove the Biome dependency and delete `biome.json`.

### Task 2: Remove Biome-Specific Usage
**Files:**
- Modify: `src/scripts/generate-theme-presets.ts`
- Modify: `src/scripts/theme-boot.tsx`
- Modify: `README.md`
- Modify: `BOILERPLATE.md`

- [ ] Replace Biome binary usage in the theme preset generator with Prettier or a simpler formatting path.
- [ ] Replace or remove `biome-ignore` comments that would become invalid after migration.
- [ ] Update repository documentation to reference ESLint and Prettier instead of Biome.

### Task 3: Verify And Stabilize
**Files:**
- Modify: any files required by ESLint/Prettier autofix

- [ ] Install updated dependencies and regenerate `pnpm-lock.yaml`.
- [ ] Run lint and format commands, then apply only necessary fixes.
- [ ] Run `pnpm build` and resolve any migration regressions.
- [ ] Confirm there are no remaining Biome references in active repo config and scripts.
