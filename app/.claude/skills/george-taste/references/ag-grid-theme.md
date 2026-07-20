# AG Grid theme

The house override for AG Grid Community – the advanced-interaction table tier in `react-components.md`. It maps the Quartz theme's CSS variables onto the semantic tokens, so the grid follows the token system in both themes with no AG Grid stock styling left visible.

Usage: apply the `ag-theme-quartz` class as normal and import this stylesheet after the token stylesheet (the `var()` references must resolve). Written against AG Grid's legacy CSS themes; if a project uses the v33+ Theming API instead, map the same variables through `themeQuartz.withParams()`.

## Provenance and alignment

Collected from a proven production override (worktionary, 2026-07-05) and aligned to the house tokens. The notable decisions:

| Source value | House value | Why |
| --- | --- | --- |
| `--color-blue-400` cell focus | `var(--primary)` | The source file's own comment said "black outline" – the blue literal was that project's leftover. Monochrome accent is the house register (`color-system.md`) |
| `oklch(…)` amber edited-cell pair + `.dark` block | `var(--category-yellow-bg)` | The category yellow pair is exactly a light/dark amber wash and flips with the theme, so the `.dark` overrides go away entirely |
| Header background `--background` | `var(--muted)` | `color-system.md` puts table headers on step 2 |
| 44px rows and headers | 36px | Data-surface spec: 36px rows, 8–12px cell padding (`react-components.md`, `density-layout.md`) |
| Header weight 400 | 12px weight 500 | Table headers are sentence case at 11–12px weight 500 (`typography.md`) |
| Row hover and selection both `--muted` | `var(--accent)` / `var(--active)` | The tokens distinguish the two states – steps 3 and 4 |
| Project-specific `.ag-theme-checkboxStyle-4` selector | dropped | Belonged to the source project, not the system |

Everything else – the square grid, hairline 0.5px borders, killed default focus, 2px editing border, checkbox centring – carries over as collected: it is the proven look.

## The override

```css
/* AG Grid Community – Quartz variables mapped onto the design-studio tokens.
   Import after the token stylesheet. */

.ag-theme-quartz .ag-cell {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.ag-theme-quartz {
  /* Backgrounds */
  --ag-background-color: var(--background);
  --ag-header-background-color: var(--muted);
  --ag-odd-row-background-color: var(--background);
  --ag-row-hover-color: var(--accent);
  --ag-selected-row-background-color: var(--active);

  /* Text */
  --ag-foreground-color: var(--foreground);
  --ag-header-foreground-color: var(--foreground);
  --ag-secondary-foreground-color: var(--muted-foreground);

  /* Borders */
  --ag-border-color: var(--border);
  --ag-header-column-separator-color: var(--border);
  --ag-row-border-color: var(--border);
  --ag-cell-horizontal-border-color: var(--border);
  --ag-header-column-separator-display: block;

  /* Cell editing - disable default focus styles */
  --ag-input-focus-border-color: var(--border);
  --ag-input-focus-box-shadow: none;

  /* Square grid - no rounded corners, no stock borders */
  --ag-border-radius: 0;
  --ag-card-radius: 0;
  --ag-input-border-radius: 0;
  --ag-wrapper-border-radius: 0;
  --ag-borders: none;

  /* Type */
  --ag-font-family: var(--font-sans);
  --ag-font-size: 14px;

  /* Density - data-surface rows */
  --ag-cell-horizontal-padding: 8px;
  --ag-row-height: 36px;
  --ag-header-height: 36px;

  /* Focus - all defaults off; the outline is set below */
  --ag-focus-shadow: none;
  --ag-input-focus-border: none;

  /* Resize handle */
  --ag-header-column-resize-handle-width: 0px;
  --ag-header-column-resize-handle-height: 24px;
}

/* Outer frame: hairline top and bottom only */
.ag-theme-quartz .ag-root-wrapper {
  border-top-width: 0.5px;
  border-left-width: 0;
  border-bottom-width: 0.5px;
  border-right-width: 0;
  border-radius: 0;
}

/* Headers: sentence case, 12px, weight 500 - never bold, never uppercase */
.ag-theme-quartz .ag-header-cell-label {
  font-size: 12px;
  font-weight: 500;
}

/* No rounded corners on cells or popups */
.ag-theme-quartz .ag-cell,
.ag-theme-quartz .ag-popup,
.ag-theme-quartz .ag-menu {
  border-radius: 0;
}

/* Inputs during editing */
.ag-theme-quartz .ag-text-field-input,
.ag-theme-quartz .ag-large-text-input {
  border-radius: 0;
  border-color: var(--border);
}

.ag-theme-quartz .ag-text-field-input:focus,
.ag-theme-quartz .ag-large-text-input:focus {
  border-color: var(--border);
  outline: none;
}

/* Checkboxes */
.ag-theme-quartz .ag-checkbox-input-wrapper {
  --ag-checkbox-checked-color: var(--primary);
  --ag-checkbox-unchecked-color: var(--muted-foreground);
}

.ag-theme-quartz .ag-checkbox-input-wrapper.ag-checked {
  background-color: var(--primary);
}

/* Focus: single hairline accent outline on the focused cell */
.ag-theme-quartz .ag-cell-focus {
  outline: 1px solid var(--primary) !important;
  outline-offset: -1px;
  box-shadow: none !important;
  border-color: var(--primary) !important;
  border-width: 0;
}

/* No focus treatment on checkbox cells (pinned left) */
.ag-theme-quartz .ag-pinned-left-cols-container .ag-cell,
.ag-theme-quartz .ag-pinned-left-cols-container .ag-cell-focus,
.ag-theme-quartz .ag-pinned-left-cols-container .ag-cell.ag-cell-focus,
.ag-theme-quartz .ag-cell:has(.ag-selection-checkbox),
.ag-theme-quartz .ag-cell:has(.ag-selection-checkbox).ag-cell-focus {
  outline: none !important;
  box-shadow: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
}

/* No focus treatment on action cells (pinned right) */
.ag-theme-quartz .ag-pinned-right-cols-container .ag-cell,
.ag-theme-quartz .ag-pinned-right-cols-container .ag-cell-focus,
.ag-theme-quartz .ag-pinned-right-cols-container .ag-cell.ag-cell-focus {
  outline: none !important;
  box-shadow: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-right: none !important;
}

/* No focus outline while editing - only the input border shows */
.ag-theme-quartz .ag-cell-focus.ag-cell-inline-editing,
.ag-theme-quartz .ag-cell-inline-editing,
.ag-theme-quartz .ag-cell.ag-cell-inline-editing,
.ag-theme-quartz .ag-row .ag-cell-inline-editing {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

/* No focus on the header select-all */
.ag-theme-quartz .ag-header-cell:has(.ag-header-select-all),
.ag-theme-quartz .ag-header-cell:has(.ag-header-select-all):focus,
.ag-theme-quartz .ag-header-cell:has(.ag-header-select-all):focus-within {
  outline: none !important;
  box-shadow: none !important;
}

.ag-theme-quartz .ag-checkbox-input:focus {
  outline: none !important;
  box-shadow: none !important;
}

/* Pinned column separators */
.ag-theme-quartz .ag-pinned-left-header .ag-header-cell,
.ag-theme-quartz .ag-pinned-left-cols-container .ag-cell {
  border-right: 0.5px solid var(--border) !important;
}

.ag-theme-quartz .ag-pinned-right-header,
.ag-theme-quartz .ag-pinned-right-header .ag-header-cell,
.ag-theme-quartz .ag-pinned-right-cols-container .ag-cell {
  border-left: 0.5px solid var(--border) !important;
}

/* Checkbox centring */
.ag-theme-quartz .ag-selection-checkbox {
  margin-right: 0;
}

.ag-theme-quartz .ag-cell-wrapper:has(.ag-selection-checkbox) {
  justify-content: center;
}

.ag-theme-quartz .ag-cell-wrapper:has(.ag-selection-checkbox) .ag-cell-value {
  display: none;
}

.ag-theme-quartz .ag-header-cell:has(.ag-header-select-all) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.ag-theme-quartz .ag-header-cell:has(.ag-header-select-all) .ag-header-cell-comp-wrapper {
  display: none !important;
}

/* Large-text editor popup */
.ag-theme-quartz .ag-large-text {
  border-radius: 0;
  border: 2px solid var(--border);
  background-color: var(--card);
  padding: 0;
}

.ag-theme-quartz .ag-text-area-input-wrapper,
.ag-theme-quartz .ag-large-text-input {
  padding: 0;
}

.ag-theme-quartz .ag-text-area-input {
  padding-top: 8px;
}

/* Row and cell hairlines */
.ag-theme-quartz .ag-row {
  border-width: 0 0 0.5px 0;
}

.ag-theme-quartz .ag-cell {
  border-right: 0.5px solid var(--border);
}

.ag-theme-quartz .ag-header-cell {
  border-right: 0.5px solid var(--border);
}

.ag-theme-quartz .ag-header {
  border-bottom: 0.5px solid var(--border);
}

/* Cell content vertically centred */
.ag-theme-quartz .ag-cell-wrapper {
  height: 100%;
  align-items: center;
}

.ag-theme-quartz .ag-cell-value {
  display: flex;
  align-items: center;
  height: 100%;
}

/* Sort and menu icons */
.ag-theme-quartz :where(.ag-icon)::before {
  color: var(--muted-foreground);
}

/* Inline editing: the input carries the affordance, the cell stays quiet */
.ag-theme-quartz .ag-cell-inline-editing {
  padding: 0;
  height: 100%;
  border: none;
  background: transparent;
  outline: none !important;
  box-shadow: none !important;
}

.ag-theme-quartz .ag-cell-inline-editing input {
  height: 100%;
  padding: 0 var(--ag-cell-horizontal-padding);
  border: 2px solid var(--border);
  background: var(--background);
}

/* Loading overlay */
.ag-theme-quartz .ag-overlay-loading-wrapper {
  background-color: oklch(from var(--background) l c h / 0.8);
}

/* Pagination */
.ag-theme-quartz .ag-paging-panel {
  border-top: 0.5px solid var(--border);
  padding: 8px 12px;
}

/* Unsaved edits - the app applies .ag-cell-edited to dirty cells.
   The category pair flips with the theme; no .dark override needed. */
.ag-theme-quartz .ag-cell-edited {
  background-color: var(--category-yellow-bg);
}
```

Cell content rendered inside the grid follows the cell-renderer convention in `react-components.md` – standalone components adapted at the call site, never written against `ICellRendererParams`.
