<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';
  import { currentUser } from '../lib/stores.js';

  let movies = [];
  let assignedByMe = [];
  let assignedToMe = [];
  let partner = null;
  let newTitle = '';
  let newLink = '';
  let newNotes = '';
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const data = await api.get('/movies');
      movies = data.movies || [];
      assignedByMe = data.assignedByMe || [];
      assignedToMe = data.assignedToMe || [];
      partner = data.partner;
    } catch (e) {
      console.error('[Movies] onMount failed:', e);
      error = 'Failed to load movies';
    }
    loading = false;
  });

  async function assignMovie() {
    if (!newTitle.trim()) return;
    try {
      const data = await api.post('/movies', {
        title: newTitle,
        link: newLink,
        notes: newNotes,
      });
      // Add to assignedByMe list (current user assigned it)
      assignedByMe = [data.movie, ...assignedByMe];
      newTitle = '';
      newLink = '';
      newNotes = '';
    } catch (e) {
      console.error('[Movies] assignMovie failed:', e);
      error = 'Failed to assign movie';
    }
  }

  async function toggleWatched(movie) {
    try {
      const data = await api.patch(`/movies/${movie._id}/mark-watched`);
      assignedToMe = assignedToMe.map(m => m._id === movie._id ? data.movie : m);
    } catch (e) {
      console.error('[Movies] toggleWatched failed:', e);
      error = e.message || 'Failed to update';
    }
  }
</script>

<div class="movies-page">
  <h1>Movie Assignments</h1>

  <div class="assign-form">
    <h3>Assign a movie for {partner?.displayName || 'your partner'} to watch</h3>
    <input bind:value={newTitle} placeholder="Movie title" />
    <input bind:value={newLink} placeholder="Link (optional)" />
    <input bind:value={newNotes} placeholder="Why should they watch it? (optional)" />
    <button on:click={assignMovie} disabled={!newTitle.trim()}>Assign</button>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if loading}
    <p class="loading">Loading...</p>
  {:else}
    <!-- Movies assigned to partner -->
    <div class="section">
      <h2>For {partner?.displayName || 'your partner'} from you</h2>
      {#if assignedByMe.length === 0}
        <p class="empty">You haven't assigned any movies yet.</p>
      {:else}
        {#each assignedByMe as movie}
          <div class="movie-card" class:watched={movie.watched}>
            <div class="movie-info">
              <strong>{movie.title}</strong>
              {#if movie.link}<a href={movie.link} target="_blank" rel="noopener">🔗</a>{/if}
              {#if movie.notes}<p class="notes">{movie.notes}</p>{/if}
            </div>
            <span class="status-badge" class:done={movie.watched}>
              {movie.watched ? '✓ Watched' : 'Pending'}
            </span>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Movies assigned to me -->
    <div class="section">
      <h2>For you from {partner?.displayName || 'your partner'}</h2>
      {#if assignedToMe.length === 0}
        <p class="empty">Nothing assigned to you yet.</p>
      {:else}
        {#each assignedToMe as movie}
          <div class="movie-card" class:watched={movie.watched}>
            <div class="movie-info">
              <strong>{movie.title}</strong>
              {#if movie.link}<a href={movie.link} target="_blank" rel="noopener">🔗</a>{/if}
              {#if movie.notes}<p class="notes">{movie.notes}</p>{/if}
            </div>
            {#if movie.watched}
              <span class="status-badge done">✓ Watched</span>
            {:else}
              <button class="watch-btn" on:click={() => toggleWatched(movie)}>Mark Watched</button>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .movies-page { max-width: 700px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); margin-bottom: 1rem; }

  .assign-form {
    background: var(--bg-card);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .assign-form h3 { margin: 0; font-size: 1rem; color: var(--text-primary); }
  .assign-form input { padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.9rem; background: var(--bg-surface); color: var(--text-primary); }
  .assign-form button {
    padding: 0.5rem 1rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    align-self: flex-start;
  }
  .assign-form button:disabled { opacity: 0.4; cursor: not-allowed; }

  .error { color: var(--accent); margin: 1rem 0; }
  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }

  .section { margin-bottom: 2rem; }
  .section h2 { font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 0.75rem; }

  .movie-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 1rem;
    background: var(--bg-card);
    border-radius: 6px;
    margin-bottom: 0.4rem;
    border-left: 3px solid var(--accent);
    gap: 1rem;
  }
  .movie-card.watched { border-left-color: #4caf50; opacity: 0.7; }

  .movie-info { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; flex: 1; }
  .movie-info strong { font-size: 0.95rem; color: var(--text-primary); }
  .notes { font-size: 0.8rem; color: var(--text-secondary); margin: 0; width: 100%; }

  .status-badge {
    font-size: 0.8rem;
    padding: 0.25rem 0.6rem;
    border-radius: 12px;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .status-badge.done {
    background: #4caf50;
    color: white;
  }

  .watch-btn {
    padding: 0.3rem 0.7rem;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    white-space: nowrap;
  }
  .watch-btn:hover { background: #43a047; }
</style>
