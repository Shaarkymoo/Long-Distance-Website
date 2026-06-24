<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';
  import staticGames from '../lib/gamesList.js';

  let userGames = [];
  let favorites = [];
  let loading = true;

  // Add form
  let showForm = false;
  let formName = '';
  let formLink = '';
  let formDesc = '';
  let formTag = '';
  let formPlayers = '';
  let formError = '';
  let adding = false;

  // Filters
  let search = '';
  let activeTag = 'all';

  onMount(async () => {
    try {
      const [favData, gameData] = await Promise.all([
        api.get('/games/favorites'),
        api.get('/games'),
      ]);
      favorites = favData.favorites || [];
      userGames = gameData.games || [];
    } catch (e) {}
    loading = false;
  });

  // Merge static + user games
  $: combined = [
    ...staticGames.map(g => ({ ...g, tag: g.category, isStatic: true })),
    ...userGames.map(g => ({ ...g, tag: g.tag || 'other', isStatic: false })),
  ];

  // All unique tags
  $: allTags = ['all', ...new Set(combined.map(g => g.tag).filter(Boolean))];

  // Filter by tag + search
  $: filtered = combined.filter(g => {
    if (activeTag !== 'all' && g.tag !== activeTag) return false;
    if (search) {
      const q = search.toLowerCase();
      return g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Count per tag
  $: tagCounts = {};
  $: { for (const g of combined) { tagCounts[g.tag] = (tagCounts[g.tag] || 0) + 1; } }

  // Favorites
  async function toggleFavorite(slug) {
    try {
      const data = await api.post('/games/favorites', { gameSlug: slug });
      if (data.favorited) {
        favorites = [...favorites, slug];
      } else {
        favorites = favorites.filter(f => f !== slug);
      }
    } catch (e) {}
  }

  function openLink(link) {
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  // Add game
  async function addGame() {
    if (!formName.trim() || !formLink.trim()) return;
    adding = true;
    formError = '';
    try {
      const data = await api.post('/games', {
        name: formName.trim(),
        link: formLink.trim(),
        description: formDesc.trim(),
        tag: formTag.trim() || 'other',
        players: formPlayers.trim() || '2+',
      });
      userGames = [data.game, ...userGames];
      showForm = false;
      formName = ''; formLink = ''; formDesc = ''; formTag = ''; formPlayers = '';
    } catch (e) {
      formError = e.message || 'Failed to add game';
    }
    adding = false;
  }

  // Delete user-added game
  async function deleteGame(slug) {
    if (!confirm('Remove this game from the collection?')) return;
    try {
      await api.del(`/games/${slug}`);
      userGames = userGames.filter(g => g.slug !== slug);
    } catch (e) {}
  }
</script>

<div class="games-page">
  <h1>Games Hub</h1>
  <p class="subtitle">Games to play together — click to open in a new tab</p>

  <!-- Search + Add -->
  <div class="toolbar">
    <input
      type="text"
      class="search-bar"
      placeholder="Search games..."
      bind:value={search}
    />
    <button class="add-btn" on:click={() => { showForm = !showForm; formError = ''; }}>
      {showForm ? '✕ Cancel' : '+ Add Game'}
    </button>
  </div>

  <!-- Add form -->
  {#if showForm}
    <div class="add-form">
      <input bind:value={formName} placeholder="Game name *" />
      <input bind:value={formLink} placeholder="Link / URL *" />
      <input bind:value={formDesc} placeholder="Short description" />
      <div class="form-row">
        <input bind:value={formTag} placeholder="Tag (e.g. puzzle, strategy)" />
        <input bind:value={formPlayers} placeholder="Players (e.g. 2, 2-8)" />
      </div>
      {#if formError}
        <p class="form-error">{formError}</p>
      {/if}
      <button class="save-btn" on:click={addGame} disabled={!formName.trim() || !formLink.trim() || adding}>
        {adding ? 'Adding...' : 'Add to Collection'}
      </button>
    </div>
  {/if}

  <!-- Tag filters -->
  <div class="filters">
    {#each allTags as tag}
      <button class="filter-btn" class:active={activeTag === tag}
        on:click={() => activeTag = tag}>
        {tag.charAt(0).toUpperCase() + tag.slice(1)}
        {#if tag !== 'all'}({tagCounts[tag] || 0}){/if}
      </button>
    {/each}
  </div>

  <!-- Game grid -->
  {#if loading}
    <p class="loading">Loading...</p>
  {:else if filtered.length === 0}
    <p class="empty">No games found.</p>
  {:else}
    <div class="games-grid">
      {#each filtered as game (game.slug || game._id)}
        <div class="game-card" class:favorited={favorites.includes(game.slug)}>
          <div class="game-body">
            <div class="game-header">
              <h3>{game.name}</h3>
              <div class="header-actions">
                <button class="fav-btn" on:click={() => toggleFavorite(game.slug)}
                  title={favorites.includes(game.slug) ? 'Remove from favorites' : 'Add to favorites'}>
                  {favorites.includes(game.slug) ? '★' : '☆'}
                </button>
                {#if !game.isStatic}
                  <button class="del-btn" on:click={() => deleteGame(game.slug)} title="Remove game">✕</button>
                {/if}
              </div>
            </div>
            <p class="game-desc">{game.description}</p>
            <div class="game-meta">
              <span class="badge">{game.tag}</span>
              <span class="players">👥 {game.players}</span>
            </div>
          </div>
          <button class="play-btn" on:click={() => openLink(game.link)}>
            Play →
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .games-page { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1rem; }
  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }

  /* ---- Toolbar ---- */
  .toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .search-bar {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: inherit;
  }

  .search-bar:focus {
    outline: none;
    border-color: var(--text-primary);
  }

  .add-btn {
    padding: 8px 16px;
    background: var(--bg-surface);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
    white-space: nowrap;
  }

  .add-btn:hover {
    background: var(--bg-elevated);
  }

  /* ---- Add form ---- */
  .add-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--bg-card);
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 12px;
    border: 1px solid var(--border-color);
  }

  .add-form input {
    padding: 8px 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.9rem;
    font-family: inherit;
  }

  .add-form input:focus {
    outline: none;
    border-color: var(--text-primary);
  }

  .form-row {
    display: flex;
    gap: 8px;
  }

  .form-row input {
    flex: 1;
  }

  .form-error {
    color: var(--accent);
    margin: 0;
    font-size: 0.85rem;
  }

  .save-btn {
    align-self: flex-end;
    padding: 8px 20px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
  }

  .save-btn:hover:not(:disabled) {
    background: #43a047;
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* ---- Filters ---- */
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .filter-btn {
    padding: 0.3rem 0.7rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-family: inherit;
  }

  .filter-btn.active {
    background: var(--bg-surface);
    color: white;
    border-color: var(--bg-surface);
  }

  .filter-btn:hover {
    border-color: var(--text-secondary);
  }

  /* ---- Grid ---- */
  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.8rem;
  }

  .game-card {
    background: var(--bg-card);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
  }

  .game-card.favorited {
    border-color: #ffd700;
    box-shadow: 0 0 0 1px #ffd700;
  }

  .game-body {
    padding: 0.8rem;
    flex: 1;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .game-header h3 {
    margin: 0 0 0.3rem 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .header-actions {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-shrink: 0;
  }

  .fav-btn {
    background: none;
    border: none;
    font-size: 1.4rem;
    cursor: pointer;
    color: #ffd700;
    padding: 0;
    line-height: 1;
  }

  .fav-btn:hover {
    transform: scale(1.2);
  }

  .del-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.8rem;
    padding: 2px 4px;
    border-radius: 3px;
    line-height: 1;
  }

  .del-btn:hover {
    color: var(--accent);
    background: #fef0f0;
  }

  .game-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
  }

  .game-meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .badge {
    background: var(--bg-elevated);
    padding: 0.15rem 0.5rem;
    border-radius: 8px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: capitalize;
  }

  .players {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .play-btn {
    width: 100%;
    padding: 0.5rem;
    background: var(--accent);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .play-btn:hover {
    background: var(--accent-hover);
  }
</style>
