# Page Help Dialogs — Design Spec

## Goal
Add a dismissible mini dialog box to the top-right of each page that explains what the page does.

## Architecture

### New Files
- `client/src/components/PageHelp.svelte` — reusable dialog component
- `client/src/lib/helpTexts.js` — map of page keys to help text strings

### Modified Files
- `client/src/App.svelte` — import and render `<PageHelp>`

### Component: PageHelp.svelte
- Positioned `absolute` in the content area, `top: 12px; right: 16px;`
- Auto-shown on page mount (visible when `currentPage` changes)
- Close button (`×`) in top-right of the dialog bubble — hides it for the current page visit
- Reappears on next page navigation (each visit shows it)
- Props: `page` (string key) — looks up help text from the module
- Styled in the app's dark theme (carbon-black bg, subtle border, accent close button)
- Small footprint: roughly 220px wide, auto-height text bubble

### Help Text Module: helpTexts.js
```
exports a Map/object:
{
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
  "ai-adventures": "Go on AI-powered interactive story adventures together.",
  whiteboard: "Draw together on a shared whiteboard in real time.",
  messages: "Send each other messages throughout the day.",
  notebook: "Write shared notes and journal entries.",
  trivia: "Create and answer trivia questions to test your knowledge of each other."
}
```

### Integration
- In `App.svelte`, import `<PageHelp>` and `helpTexts`
- Place `<PageHelp page={currentPage} />` inside the `<main class="content">` wrapper
- Pass `currentPage` as the `page` prop — helps text auto-switches on navigation

## Behavior
- **On page mount/switch**: dialog visible with the page's help text
- **On close (×)**: dialog hidden for this page visit
- **On navigate to another page**: dialog reappears with new page's text
- **Not persisted**: no localStorage/sessionStorage — fresh every session

## Visual Style
- Dark theme: `background: var(--bg-surface)`, `border: 1px solid var(--border-color)`
- Title "About this page" or heading matching the page
- Body text in `var(--text-secondary)` color
- Close button in `var(--accent)` color
- Border-radius: 8px to match app
- Small arrow/tail pointing up toward the trigger area (optional)
