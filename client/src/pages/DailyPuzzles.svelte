<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let puzzlesByDate = {};
  let dates = [];
  let loading = true;

  // Create form
  let showCreate = false;
  let newTitle = '';
  let newLink = '';
  let newType = 'puzzle';
  let newDate = today();

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  $: currentUser = null;
  import { currentUser as userStore } from '../lib/stores.js';
  $: currentUser = $userStore;

  onMount(async () => {
    await loadPuzzles();
  });

  async function loadPuzzles() {
    loading = true;
    try {
      const data = await api.get('/dailypuzzles');
      puzzlesByDate = data.puzzles || {};
      dates = Object.keys(puzzlesByDate).sort().reverse();
    } catch (e) {}
    loading = false;
  }

  async function addPuzzle() {
    if (!newTitle.trim() || !newLink.trim()) return;
    try {
      await api.post('/dailypuzzles', {
        title: newTitle.trim(),
        link: newLink.trim(),
        puzzleType: newType,
        date: newDate || today()
      });
      newTitle = ''; newLink = ''; newType = 'puzzle';
      newDate = today();
      showCreate = false;
      await loadPuzzles();
    } catch (e) {}
  }

  async function toggleComplete(puzzleId) {
    try {
      await api.patch(`/dailypuzzles/${puzzleId}/complete`);
      await loadPuzzles();
    } catch (e) {}
  }

  function isCompletedByMe(puzzle) {
    return puzzle.completedBy?.includes(currentUser?.id) || false;
  }

  function isCompletedByOther(puzzle) {
    if (!currentUser) return false;
    return puzzle.completedBy?.some(id => id !== currentUser.id) || false;
  }

  function openLink(link) {
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  const typeEmojis = {
    crossword: '🧩',
    sudoku: '🔢',
    wordle: '🟩',
    puzzle: '🧩',
    other: '🎮'
  };
</script>

<div class="puzzles-page">
  <h1>Daily Puzzles</h1>
  <p class="subtitle">Track your daily puzzle completions</p>

  <button class="create-btn" on:click={() => { showCreate = !showCreate; }}>
    {showCreate ? 'Cancel' : '+ Add Puzzle Link'}
  </button>

  {#if showCreate}
    <div class="create-form">
      <h3>Add a Puzzle</h3>
      <input bind:value={newTitle} placeholder="Puzzle name..." />
      <input bind:value={newLink} placeholder="URL..." />
      <div class="form-row">
        <select bind:value={newType}>
          <option value="puzzle">Puzzle</option>
          <option value="crossword">Crossword</option>
          <option value="sudoku">Sudoku</option>
          <option value="wordle">Wordle</option>
          <option value="other">Other</option>
        </select>
        <input type="date" bind:value={newDate} />
      </div>
      <button class="save-btn" on:click={addPuzzle} disabled={!newTitle.trim() || !newLink.trim()}>Add</button>
    </div>
  {/if}

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if dates.length === 0}
    <p class="empty">No puzzles yet. Add one to start tracking!</p>
  {:else}
    {#each dates as date}
      <div class="date-section">
        <h3 class="date-header">{date === today() ? '📅 Today' : date}</h3>
        <div class="puzzle-list">
          {#each puzzlesByDate[date] as puzzle}
            <div class="puzzle-card">
              <div class="puzzle-info">
                <span class="puzzle-type">{typeEmojis[puzzle.puzzleType] || '🎮'}</span>
                <div>
                  <strong>{puzzle.title}</strong>
                  <span class="puzzle-type-label">{puzzle.puzzleType}</span>
                </div>
              </div>
              <div class="puzzle-actions">
                <button class="link-btn" on:click={() => openLink(puzzle.link)}>Open</button>
                <label class="checkbox-label">
                  <input type="checkbox" checked={isCompletedByMe(puzzle)} on:change={() => toggleComplete(puzzle._id)} />
                  Me
                </label>
                {#if isCompletedByOther(puzzle)}
                  <span class="other-done">✅ Partner</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .puzzles-page { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1rem; }
  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }
  .create-btn { padding: 0.5rem 1rem; background: var(--bg-surface); color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 1rem; }

  .create-form { background: var(--bg-card); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .create-form h3 { margin: 0; }
  .create-form input { padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; }
  .form-row { display: flex; gap: 0.5rem; }
  .form-row select, .form-row input { flex: 1; padding: 0.4rem; border: 1px solid var(--border-color); border-radius: 4px; }
  .save-btn { padding: 0.4rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; align-self: flex-end; }
  .save-btn:disabled { background: #ccc; }

  .date-section { margin-bottom: 1rem; }
  .date-header { font-size: 1rem; color: var(--text-primary); margin: 0 0 0.5rem 0; }

  .puzzle-list { display: flex; flex-direction: column; gap: 0.4rem; }
  .puzzle-card { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 0.6rem 0.8rem; border-radius: 6px; }
  .puzzle-info { display: flex; align-items: center; gap: 0.5rem; }
  .puzzle-type { font-size: 1.3rem; }
  .puzzle-type-label { font-size: 0.75rem; color: var(--text-secondary); text-transform: capitalize; display: block; }
  .puzzle-actions { display: flex; align-items: center; gap: 0.5rem; }
  .link-btn { padding: 0.3rem 0.6rem; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
  .checkbox-label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer; }
  .checkbox-label input { cursor: pointer; }
  .other-done { font-size: 0.8rem; color: #4caf50; }
</style>
