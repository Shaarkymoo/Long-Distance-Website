# Page Help Dialogs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dismissible mini help dialog to the top-right of each page explaining what the page does.

**Architecture:** A reusable `<PageHelp>` component that reads text from a `helpTexts.js` map, placed in App.svelte's content area. Component auto-shows on mount per page; close button dismisses it for the current visit.

**Tech Stack:** Svelte 5 (runes), Vite

**Spec:** `docs/superpowers/specs/2026-06-27-page-help-dialogs-design.md`

## Global Constraints
- Use existing CSS custom properties (`--bg-surface`, `--border-color`, `--text-secondary`, `--accent`, etc.)
- No new npm dependencies
- No localStorage/sessionStorage — dialog shows fresh every page navigation
- Component positioned absolute within the content area, top-right

---

### Task 1: Create help text module

**Files:**
- Create: `client/src/lib/helpTexts.js`

**Interfaces:**
- Produces: `helpTexts` — an object mapping page keys (strings) to help text strings

- [ ] **Step 1: Create file**

```js
// client/src/lib/helpTexts.js
// Help text shown in the PageHelp dialog for each page

const helpTexts = {
  home: "Welcome! Choose an activity from the grid to get started.",
  movies: "Suggest movies for you both to watch. Add a title, link, and notes.",
  music: "Share songs and build a shared playlist together.",
  books: "Track books you're reading or want to read together.",
  games: "Play fun browser games together.",
  conversations: "Browse conversation starters and prompts for deeper talks.",
  predictions: "Make predictions about your relationship and see who was right.",
  quizzes: "Create and take quizzes about each other.",
  guess: "Play a guessing game — describe something and see if they can guess it.",
  puzzles: "Daily puzzles and brain teasers to solve together.",
  light: "Control a smart LED light (WLED) from here.",
  'ai-adventures': "Go on AI-powered interactive story adventures together.",
  whiteboard: "Draw together on a shared whiteboard in real time.",
  messages: "Send each other messages throughout the day.",
  notebook: "Write shared notes and journal entries.",
  trivia: "Create and answer trivia questions to test your knowledge of each other.",
};

export default helpTexts;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/helpTexts.js
git commit -m "feat: add help text module for page help dialogs"
```

### Task 2: Create PageHelp component

**Files:**
- Create: `client/src/components/PageHelp.svelte`

**Interfaces:**
- Consumes: `helpTexts` map (from Task 1)
- Props: `page` (string) — current page key to look up text
- Produces: `<PageHelp page={currentPage} />` — renders the dialog
- Behavior: auto-visible on mount; close button hides it; re-visible on page change

- [ ] **Step 1: Create component**

```svelte
<script>
  import helpTexts from '../lib/helpTexts.js';
  export let page = '';

  let visible = true;

  // Reset visibility whenever page changes
  $: {
    visible = true;
  }

  function close() {
    visible = false;
  }

  $: text = helpTexts[page] || '';
</script>

{#if visible && text}
  <div class="help-dialog">
    <button class="close-btn" on:click={close}>×</button>
    <p class="help-text">{text}</p>
  </div>
{/if}

<style>
  .help-dialog {
    position: absolute;
    top: 12px;
    right: 16px;
    width: 220px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 32px 10px 12px;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .help-text {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--text-secondary);
  }

  .close-btn {
    position: absolute;
    top: 4px;
    right: 6px;
    background: none;
    border: none;
    color: var(--accent);
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .close-btn:hover {
    opacity: 0.8;
  }
</style>
```

- [ ] **Step 2: Manually verify component style matches design spec**
  - Dialog uses `--bg-surface` background
  - Close button uses `--accent` color
  - Text in `--text-secondary`
  - 8px border-radius

- [ ] **Step 3: Commit**

```bash
git add client/src/components/PageHelp.svelte
git commit -m "feat: add PageHelp component with dismissible dialog"
```

### Task 3: Integrate PageHelp into App.svelte

**Files:**
- Modify: `client/src/App.svelte`

**Interfaces:**
- Consumes: `<PageHelp>` component (Task 2)
- Integration: place inside `<main class="content">` wrapper so it sits above page content

- [ ] **Step 1: Add import and rendering**

Add import at top of script block:
```svelte
<script>
  // ... existing imports
  import PageHelp from './components/PageHelp.svelte';
  // ... rest of script
```

Add `PageHelp` inside the content wrapper, before the dynamic page component:
```svelte
    <main class="content" style="position: relative;">
      <PageHelp page={currentPage} />
      <svelte:component this={pageMap[currentPage]} />
    </main>
```

Note: Ensure `<main class="content">` has `position: relative;` for the absolute positioning of PageHelp.

- [ ] **Step 2: Verify the app compiles**

Run: `npm run build` (from `client/`)
Expected: Build succeeds with 74 modules transformed

- [ ] **Step 3: Commit**

```bash
git add client/src/App.svelte
git commit -m "feat: integrate PageHelp dialog into app shell"
```

### Task 4: Push and deploy

- [ ] **Step 1: Push to GitHub**

```bash
git push
```

- [ ] **Step 2: Verify Cloud Build succeeds**
  - Check Cloud Build console for the triggered build
  - Expected: 74 modules, build succeeds, deploys new revision
