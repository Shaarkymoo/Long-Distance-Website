<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';
  import { currentUser } from '../lib/stores.js';
  import MovieDebt from '../components/MovieDebt.svelte';

  let movies = [];
  let newTitle = '';
  let newLink = '';
  let newNotes = '';
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const data = await api.get('/movies');
      movies = data.movies || [];
    } catch (e) {
      error = 'Failed to load movies';
    }
    loading = false;
  });

  async function suggestMovie() {
    if (!newTitle.trim()) return;
    try {
      const data = await api.post('/movies', {
        title: newTitle,
        link: newLink,
        notes: newNotes
      });
      movies = [data.movie, ...movies];
      newTitle = '';
      newLink = '';
      newNotes = '';
    } catch (e) {
      error = 'Failed to suggest movie';
    }
  }

  async function toggleWatched(movie) {
    try {
      const data = await api.patch(`/movies/${movie._id}/mark-watched`);
      movies = movies.map(m => m._id === movie._id ? data.movie : m);
    } catch (e) {
      error = 'Failed to update';
    }
  }

  $: unwatched = movies.filter(m => !m.watchedBy || m.watchedBy.length === 0);
  $: partiallyWatched = movies.filter(m => m.watchedBy && m.watchedBy.length === 1);
  $: watchedBoth = movies.filter(m => m.watchedBy && m.watchedBy.length >= 2);
</script>

<div class="movies-page">
  <h1>Movie Splitwise</h1>
  <MovieDebt />

  <div class="suggest-form">
    <h3>Suggest a Movie</h3>
    <input bind:value={newTitle} placeholder="Movie title" />
    <input bind:value={newLink} placeholder="Link (optional)" />
    <input bind:value={newNotes} placeholder="Notes (optional)" />
    <button on:click={suggestMovie} disabled={!newTitle.trim()}>Suggest</button>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if movies.length === 0}
    <p class="empty">No movies yet. Suggest one above!</p>
  {:else}
    <div class="movie-sections">
      {#if unwatched.length > 0}
        <div class="section">
          <h3>Unwatched ({unwatched.length})</h3>
          {#each unwatched as movie}
            <div class="movie-card">
              <div class="movie-info">
                <strong>{movie.title}</strong>
                {#if movie.link}<a href={movie.link} target="_blank" rel="noopener">🔗</a>{/if}
                <span class="suggested-by">by {movie.suggestedBy?.displayName || movie.suggestedBy?.username}</span>
                {#if movie.notes}<p class="notes">{movie.notes}</p>{/if}
              </div>
              <button class="watch-btn" on:click={() => toggleWatched(movie)}>Mark Watched</button>
            </div>
          {/each}
        </div>
      {/if}

      {#if partiallyWatched.length > 0}
        <div class="section">
          <h3>Partially Watched ({partiallyWatched.length})</h3>
          {#each partiallyWatched as movie}
            <div class="movie-card">
              <div class="movie-info">
                <strong>{movie.title}</strong>
                {#if movie.link}<a href={movie.link} target="_blank" rel="noopener">🔗</a>{/if}
                <span class="suggested-by">by {movie.suggestedBy?.displayName || movie.suggestedBy?.username}</span>
              </div>
              <button class="watch-btn" on:click={() => toggleWatched(movie)}>Mark Watched</button>
            </div>
          {/each}
        </div>
      {/if}

      {#if watchedBoth.length > 0}
        <div class="section">
          <h3>Watched by Both ({watchedBoth.length}) ✓</h3>
          {#each watchedBoth as movie}
            <div class="movie-card resolved">
              <div class="movie-info">
                <strong>{movie.title}</strong>
                {#if movie.link}<a href={movie.link} target="_blank" rel="noopener">🔗</a>{/if}
                <span class="suggested-by">by {movie.suggestedBy?.displayName || movie.suggestedBy?.username}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .movies-page { max-width: 700px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); margin-bottom: 1rem; }
  .suggest-form {
    background: var(--bg-card);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .suggest-form h3 { margin: 0; font-size: 1rem; }
  .suggest-form input { padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.9rem; }
  .suggest-form button {
    padding: 0.5rem 1rem;
    background: var(--bg-surface);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .suggest-form button:disabled { background: #ccc; cursor: not-allowed; }
  .error { color: var(--accent); }
  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }
  .section { margin-bottom: 1.5rem; }
  .section h3 { font-size: 1rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
  .movie-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 1rem;
    background: var(--bg-card);
    border-radius: 6px;
    margin-bottom: 0.4rem;
    border-left: 3px solid var(--accent);
  }
  .movie-card.resolved { border-left-color: #4caf50; opacity: 0.8; }
  .movie-info { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .movie-info strong { font-size: 0.95rem; }
  .suggested-by { font-size: 0.8rem; color: var(--text-secondary); }
  .notes { font-size: 0.8rem; color: var(--text-secondary); margin: 0; width: 100%; }
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
