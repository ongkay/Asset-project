# README Rewrite Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `README.md` into a standalone Indonesian guide for using this template in real projects.

**Architecture:** Replace the current mixed README with a clearer document organized around onboarding, architecture, reusable building blocks, implementation recipes, and workflow. The new README must stand on its own so `BOILERPLATE.md` and `rulesUI.md` can be removed later without losing essential guidance.

**Tech Stack:** Markdown, Next.js 16, React 19, TypeScript, Zustand, Tailwind CSS v4, ESLint, Prettier, Husky

---

### Task 1: Audit Current Sources
**Files:**
- Read: `README.md`
- Read: `package.json`
- Read: `src/app/layout.tsx`
- Read: `src/app/(main)/dashboard/layout.tsx`
- Read: `src/lib/preferences/preferences-config.ts`
- Read: `src/stores/preferences/preferences-provider.tsx`
- Read: `src/navigation/sidebar/sidebar-items.ts`

- [ ] **Step 1: Read the current README and list sections that are outdated**

Capture these buckets while reading:

```text
- outdated tooling references
- file paths that no longer exist
- guidance that depends on BOILERPLATE.md or rulesUI.md
- sections worth preserving in the rewrite
```

- [ ] **Step 2: Read the current repo entry points and architecture files**

Read the files listed above and note:

```text
- how layout and routing are structured now
- how preferences/theme state flows from SSR to client
- what reusable building blocks still exist
- which recipe examples are still valid
```

- [ ] **Step 3: Verify the repository commands and tooling**

Run:

```bash
pnpm lint
pnpm check
```

Expected: commands exist and reflect the current ESLint + Prettier workflow.

### Task 2: Rewrite README Content
**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the README structure with the approved outline**

The new top-level sections must be:

```md
# <project title>

## Gambaran Umum

## Quick Start

## Tech Stack

## Struktur Project

## Panduan Arsitektur

## Sistem Theme dan Preferences

## Reusable Building Blocks

## Recipe Implementasi

## Tooling dan Workflow

## Hal yang Perlu Dihindari
```

- [ ] **Step 2: Write the introduction and quick start in natural Indonesian**

The quick start section must include commands like:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm check
pnpm generate:presets
```

And it must explain what `generate:presets` and Husky pre-commit actually do.
- [ ] **Step 3: Rewrite the architecture and preferences sections using current file paths**

The rewrite must explicitly cover:

```text
- App Router structure
- root layout and dashboard layout responsibilities
- SSR/client preference flow
- ThemeBootScript role
- preference persistence and preset generation flow
```

- [ ] **Step 4: Rewrite reusable building blocks and recipes**

Include concrete references to current files, and remove any references to deleted or obsolete files. Recipes must cover at least:

```text
- adding a new dashboard page
- adding a sidebar item
- adding or editing a settings control
- adding a new theme preset
- using existing chart/table/ui building blocks safely
```

- [ ] **Step 5: Add tooling guidance that matches the current repo**

This section must document:

```text
- ESLint + Prettier roles
- Husky pre-commit behavior
- src/components/ui exclusion from project-specific linting and Prettier formatting
- why developers should reuse existing primitives instead of rebuilding them
```

### Task 3: Review and Verify The Rewrite
**Files:**
- Modify: `README.md`

- [ ] **Step 1: Review README for independence from BOILERPLATE.md and rulesUI.md**

Check manually that the README does not tell readers to consult those files for essential guidance.
- [ ] **Step 2: Run formatting and verification**

Run:

```bash
pnpm format
pnpm check
```

Expected: README formatting is clean and repository checks pass.
- [ ] **Step 3: Confirm the rewrite still matches the current codebase**

Run:

```bash
git diff -- README.md
```

Then skim the diff and verify that every file path and workflow mentioned still exists in the repository.
