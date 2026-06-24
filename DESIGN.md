# Couple Website — Design System

## 1. Atmosphere & Identity

A cozy pixel-art room that feels like a shared space — warm, nostalgic, and slightly retro. The signature is a side-view room built entirely with CSS: a wooden floor, softly lit wall, a window showing a night sky, and pixel-art furniture objects that invite clicking. Every object is a destination: click the lamp to toggle lights, click the TV for movies, click the bookshelf for the book tracker. The warmth comes from amber-gold lighting, wood tones, and the charm of 8-bit pixel art executed in pure CSS box-shadow.

## 2. Color

### Palette

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Wall/background | --wall | #2A1F1A | Room wall, main background |
| Floor | --floor | #5C3A2E | Room floor planks |
| Floor/dark | --floor-dark | #3D251C | Plank gaps, shadows |
| Window/sky | --window-sky | #1A1A3E | Night sky in window |
| Window/moon | --window-moon | #F5E6C8 | Moon glow in window |
| Accent/warm | --accent-warm | #E8A87C | Warm light, lamp glow |
| Accent/gold | --accent-gold | #F4C542 | Highlights, interactive hints |
| Object/primary | --object-primary | #8B6F5E | Default object base color |
| Object/dark | --object-dark | #5C4A3E | Object shadow/depth |
| Text/primary | --text-primary | #F0E6D8 | Main text on dark bg |
| Text/muted | --text-muted | #A09080 | Secondary text |
| Interactive/hover | --interactive-hover | #FFD700 | Border glow on hover |
| Interactive/visited | --interactive-visited | #C9A87C | Already clicked |

### Rules
- Warm tones only — no cool blues or grays except the night sky.
- The glow color (accent-warm) is used sparingly to draw attention to interactive objects.
- Interactive objects get a golden border on hover.

## 3. Typography

### Scale

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Page title | 24px | 700 | Page headings |
| Section | 18px | 600 | Sub-headings |
| Body | 14px | 400 | Feature descriptions |
| Caption | 12px | 400 | Object labels, tooltips |
| Object label | 11px | 500 | Labels under pixel art |

### Font Stack
- Primary: `'Courier New', 'Victor Mono', 'JetBrains Mono', monospace`
- Pixel-adjacent: `'Press Start 2P'` (Google Fonts) for decorative titles only
- Body: `system-ui, -apple-system, sans-serif` for readable text

### Rules
- Monospace for pixel-art-adjacent headings, sans-serif for body readability.
- Object labels use the smallest legible size — 11px.

## 4. Spacing & Layout

### Base Unit
All spacing derives from a base of **4px** (matching the pixel grid).

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Pixel-grid unit, object padding |
| --space-2 | 8px | Compact gaps |
| --space-3 | 12px | Room object spacing |
| --space-4 | 16px | Card padding |
| --space-6 | 24px | Section spacing |
| --space-8 | 32px | Room layout margins |

### Grid
- Room grid: 8-column CSS grid, each cell 48x48px
- Objects snap to 1x1, 2x1, or 2x2 grid cells
- Max content width: 800px

### Rules
- All spacing is multiples of 4px (pixel-perfect alignment).
- Room objects use absolute positioning within the CSS grid.

## 5. Components

### PixelArtObject
- **Structure**: `<div>` with CSS `box-shadow` pixel art + `<span>` label
- **Variants**: lamp, tv, bookshelf, music, whiteboard, dice, envelope, puzzle, controller, quiz, prediction, conversation, notebook, trivia, mystery-box
- **Spacing**: --space-2 between object and label
- **States**: default, hover (golden border glow), active (scale 0.95), visited (muted)
- **Accessibility**: `role="link"`, `tabindex="0"`, keyboard Enter to navigate
- **Motion**: hover glow transition 200ms ease

### Room
- **Structure**: Side-view room as CSS grid: wall background, floor at bottom, window on wall, objects placed on floor/wall
- **Variants**: single room (home page)
- **Spacing**: --space-6 between objects
- **States**: static (no interactive states for the room itself)
- **Motion**: Page enters with fade-in 300ms

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Hover glow | 200ms | ease-out | Object hover border |
| Click feedback | 100ms | ease-out | Object press (scale) |
| Page enter | 300ms | ease-out | Room fade-in |
| Light toggle | 400ms | ease-in-out | Warm glow animation |

### Rules
- Only animate `transform`, `opacity`, and `box-shadow`.
- Every interactive object has hover + active + focus states.
- Respect `prefers-reduced-motion` — disable all animation.

## 7. Depth & Surface

### Strategy
**Tonal-shift + glow**: Surfaces use warm-toned layers with no borders. Depth is created through:
- Wall: one solid warm tone
- Floor: alternating plank tones for wood texture
- Objects: CSS box-shadow pixel art creates its own depth through colored pixel layers
- Interactive glow: golden box-shadow appears on hover

No CSS shadows on surfaces — the pixel art IS the visual texture.
