# DESIGN.md — NPC Behavior Compiler & Simulation Workbench

> **Design System Specification** following the [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) 9-section standard.
> Designed for a high-density, professional developer workbench aesthetic inspired by **GitHub Copilot, VS Code Dark+, and Tactical Simulation HUDs**.

---

## 1. Visual Theme & Atmosphere

- **Mood & Personality**: Precision engineering, high-density compiler workbench, tactical simulation HUD. Clean, disciplined, focused, non-distracting.
- **Philosophy**: "The Compiler is the Star". High data density without visual clutter. Crisp monospaced code elements, distinct phase step indicators, sharp 1px borders, subtle status glows, and dark muted slate surfaces.
- **Strict Anti-Gradients Rule**: Zero colorful rainbow/consumer gradients, zero pastel fuzziness. All visual hierarchy is created through surface elevation, opacity steps, precise 1px high-contrast borders, and semantic status accents.

---

## 2. Color Palette & Roles

### Dark Base & Surface Scale (GitHub / Copilot Dark Palette)
- **Base Background**: `#0d1117` (`--color-bg-base`) — Main canvas backdrop.
- **Panel Surface**: `#161b22` (`--color-bg-panel`) — Toolbars, navigation sidebars, compiler phase frames.
- **Card / Editor Surface**: `#1b2028` (`--color-bg-subtle`) — Source code editor, inspector panels, modal overlays.
- **Active / Hover Surface**: `#252d38` (`--color-bg-hover`) — Button hovers, active tab indicators, table row hovers.

### Borders & Dividers
- **Border Default**: `#30363d` (`--color-border-default`) — Crisp 1px structural dividing lines.
- **Border Subtle**: `#21262d` (`--color-border-subtle`) — Inner grid lines, table row borders.
- **Border Focus / Active**: `#58a6ff` (`--color-border-focus`) — Focused inputs, active phase cards.

### Semantic Status & Token Colors
- **Copilot Accent Cyan**: `#58a6ff` (`--color-accent`) — Primary buttons, links, active compilation state.
- **Success / Valid Green**: `#3fb950` (`--color-success`) — Successful compilation, AST verified, NPC pass state.
- **Warning / Ambiguity Amber**: `#d29922` (`--color-warning`) — Duplicate rule warnings, fallbacks.
- **Error / Syntax Red**: `#f85149` (`--color-danger`) — Lexer errors, parse exceptions, invalid compatibility.
- **Keyword Purple**: `#bc8cff` (`--color-keyword`) — DSL keywords (`NPC`, `WHEN`).
- **Condition Cyan**: `#79c0ff` (`--color-condition`) — DSL environmental conditions (`WALL_AHEAD`, `PIT_AHEAD`).
- **Action Orange**: `#ffa657` (`--color-action`) — DSL motor actions (`MOVE_FORWARD`, `TURN_LEFT`).

### 2D Tactical Simulation Palette
- **Grid Background**: `#0d1117` with subtle `#1f242c` 1px coordinate lines.
- **NPC Unit**: `#58a6ff` (crisp chevron / directional core with subtle cyan directional cone).
- **Player Entity**: `#3fb950` (distinct tactical ring with pulse).
- **Wall / Obstacle**: `#8b949e` (solid high-contrast structural blocks with bevel).
- **Pit / Hazard**: `#f85149` (hatched cross pattern hazard zone).
- **Enemy Entity**: `#ff7b72` (diamond threat marker).
- **Treasure / Item**: `#e3b341` (radiant hexagonal crystal).

---

## 3. Typography Rules

- **UI & Controls Font**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`
- **Code, Tokens, AST & IR Font**: `"JetBrains Mono"`, `"Fira Code"`, `"SF Mono"`, `Menlo`, `Consolas`, `monospace`
- **Scale Hierarchy**:
  - `Header Title`: `15px` / `Font-weight: 600` / `Letter-spacing: -0.01em`
  - `Section Header`: `12px` / `Font-weight: 600` / `Uppercase` / `Letter-spacing: 0.05em` (`text-muted`)
  - `Body / Labels`: `13px` / `Font-weight: 400`
  - `Code / Editor / Logs`: `13px` / `Font-weight: 400` / `Line-height: 1.5`
  - `Badges / Chips`: `11px` / `Font-weight: 500` / `Letter-spacing: 0.02em`

---

## 4. Component Stylings

### Buttons
- **Primary (Compile & Run)**:
  - Background: `#238636` (GitHub Commit Green) | Hover: `#2ea043` | Active: `#1f7f34`
  - Text: `#ffffff` | Font-weight: 500 | Border: `1px solid rgba(240, 246, 252, 0.1)`
  - Shadow: `0 1px 0 rgba(27, 31, 36, 0.1)`
- **Secondary (Step, Reset, Map Select)**:
  - Background: `#21262d` | Hover: `#30363d` | Text: `#c9d1d9`
  - Border: `1px solid #30363d`

### Phase Pipeline Breadcrumbs
- Pill / step breadcrumb bar with active step highlights:
  - Default: `bg-[#161b22] text-[#8b949e] border border-[#30363d]`
  - Completed: `text-[#3fb950] border-[#238636]` with `✓` checkmark
  - Active: `text-[#58a6ff] border-[#58a6ff] bg-[#58a6ff]/10`
  - Failed: `text-[#f85149] border-[#da3633] bg-[#f85149]/10` with `✕` mark

### Tabs & Panels
- VS Code / GitHub styled tabs:
  - Inactive: `text-[#8b949e] border-b-2 border-transparent hover:text-[#c9d1d9]`
  - Active: `text-[#f0f6fc] border-b-2 border-[#58a6ff] font-medium`

---

## 5. Layout Principles

- **Split-Screen Workbench**:
  - **Left Pane (50%)**: DSL Code Editor (top) + Compiler Phase Inspector Tabs (bottom).
  - **Right Pane (50%)**: 2D Tactical Simulation Canvas (top) + Real-Time Sensor & Rule Match HUD (bottom).
- **Header Bar (48px)**: Compact workbench branding, Preset selector (`Guard`, `Collector`, `Patrol`), Compile action, and Status badge.
- **High Information Density**: Compact margins (`p-3`, `gap-3`), clear 1px borders, zero wasted empty padding.

---

## 6. Depth & Elevation

- **Level 0 (Base)**: `#0d1117` — Viewport backdrop.
- **Level 1 (Panels)**: `#161b22` with `1px solid #30363d` — Container cards.
- **Level 2 (Active Elements / Inputs)**: `#0d1117` inset box with `1px solid #30363d`.
- **Level 3 (Popovers / Dropdowns)**: `#161b22` with `1px solid #58a6ff` and `box-shadow: 0 8px 24px rgba(0,0,0,0.5)`.

---

## 7. Do's and Don'ts

### DO:
- ✅ Keep canvas entities clean, vector-rendered, with clear directional indicators.
- ✅ Highlight the currently evaluating AST node / IR rule in the live simulation HUD.
- ✅ Render compiler error line/col pointers with monospaced caret alignment.
- ✅ Keep color accents purposeful and semantic (Cyan for info, Green for success, Red for syntax error, Amber for warning).

### DON'T:
- ❌ Do NOT use purple-to-pink gradient backgrounds or blurry glow blobs.
- ❌ Do NOT make oversized cartoonish graphics that obscure tactical grid coordinates.
- ❌ Do NOT hide compiler errors in console logs — display them in the dedicated diagnostic terminal.

---

## 8. Responsive Behavior

- Minimum supported resolution: `1024x600` (Tablet / Laptop).
- Desktop layout: 2-column split (Code/Compiler vs. Simulation/HUD).
- Mobile / narrow layout: Vertical stacked layout with sticky tab bar.

---

## 9. Agent Prompt Guide

When implementing new UI components or simulation elements:
- Apply dark surface tokens (`#0d1117`, `#161b22`, `#21262d`).
- Use crisp 1px borders (`#30363d`).
- Keep buttons and controls compact and aligned with GitHub's Primer / Copilot design patterns.
- Ensure all interactive code snippets use monospaced fonts with explicit syntax highlighting classes.
