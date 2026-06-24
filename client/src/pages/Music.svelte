<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let musicList = [];
  let loading = true;

  // Add form
  let showAdd = false;
  let newTitle = '';
  let newUrl = '';

  onMount(async () => {
    await loadMusic();
  });

  async function loadMusic() {
    loading = true;
    try {
      const data = await api.get('/music');
      musicList = data.music || [];
    } catch (e) {}
    loading = false;
  }

  async function addSong() {
    if (!newTitle.trim() || !newUrl.trim()) return;
    try {
      await api.post('/music', { title: newTitle.trim(), url: newUrl.trim() });
      newTitle = ''; newUrl = '';
      showAdd = false;
      await loadMusic();
    } catch (e) {}
  }

  async function deleteSong(id) {
    try {
      await api.del(`/music/${id}`);
      await loadMusic();
    } catch (e) {}
  }

  function embedUrl(item) {
    if (item.embedType === 'youtube') {
      return `https://www.youtube-nocookie.com/embed/${extractId(item.url, 'youtube')}`;
    }
    if (item.embedType === 'spotify') {
      const id = extractId(item.url, 'spotify');
      if (id.includes('/')) {
        // playlist or album
        return `https://open.spotify.com/embed/${id}`;
      }
      return `https://open.spotify.com/embed/track/${id}`;
    }
    return '';
  }

  function extractId(url, type) {
    if (type === 'youtube') {
      const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : '';
    }
    if (type === 'spotify') {
      const m = url.match(/open\.spotify\.com\/(?:track|playlist|album)\/([a-zA-Z0-9]+)/);
      return m ? m[1] : '';
    }
    return '';
  }

  function embedHeight(item) {
    if (item.embedType === 'youtube') return 180;
    if (item.embedType === 'spotify') return 80;
    return 80;
  }
</script>

<div class="music-page">
  <h1>Music</h1>
  <p class="subtitle">Saved songs and playlists</p>

  <button class="add-btn" on:click={() => { showAdd = !showAdd; }}>
    {showAdd ? 'Cancel' : '+ Add Song'}
  </button>

  {#if showAdd}
    <div class="add-form">
      <input bind:value={newTitle} placeholder="Song title..." />
      <input bind:value={newUrl} placeholder="YouTube or Spotify URL..." />
      <p class="hint">Supports YouTube videos and Spotify tracks/playlists</p>
      <button class="save-btn" on:click={addSong} disabled={!newTitle.trim() || !newUrl.trim()}>Add</button>
    </div>
  {/if}

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if musicList.length === 0}
    <p class="empty">No music added yet. Add a song to get started!</p>
  {:else}
    <div class="music-grid">
      {#each musicList as item}
        <div class="music-card">
          <div class="music-header">
            <h3>{item.title}</h3>
            <button class="delete-btn" on:click={() => deleteSong(item._id)}>✕</button>
          </div>
          <div class="embed-container" style="height: {embedHeight(item)}px">
            {#if item.embedType === 'youtube'}
              <iframe
                src={embedUrl(item)}
                title={item.title}
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            {:else if item.embedType === 'spotify'}
              <iframe
                src={embedUrl(item)}
                title={item.title}
                frameborder="0"
                allow="encrypted-media"
                style="border-radius: 8px;"
              ></iframe>
            {:else}
              <p class="unsupported">Unsupported format</p>
            {/if}
          </div>
          <div class="music-footer">
            <span class="added-by">Added by {item.addedBy?.displayName || item.addedBy?.username}</span>
            <span class="type-badge">{item.embedType}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .music-page { max-width: 700px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1rem; }

  .add-btn { padding: 0.5rem 1rem; background: var(--bg-surface); color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 1rem; }

  .add-form { background: var(--bg-card); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .add-form input { padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; }
  .hint { font-size: 0.8rem; color: var(--text-secondary); margin: 0; }
  .save-btn { padding: 0.4rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; align-self: flex-end; }
  .save-btn:disabled { background: #ccc; }
  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }

  .music-grid { display: grid; gap: 1rem; }

  .music-card { background: var(--bg-card); border-radius: 8px; overflow: hidden; }
  .music-header { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1rem 0 1rem; }
  .music-header h3 { margin: 0; font-size: 1rem; }
  .delete-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 1.1rem; padding: 0; }
  .delete-btn:hover { color: #c62840; }

  .embed-container { margin: 0.5rem 1rem; }
  .embed-container iframe { width: 100%; height: 100%; }
  .unsupported { color: var(--text-secondary); font-size: 0.85rem; }

  .music-footer { display: flex; justify-content: space-between; padding: 0.5rem 1rem 0.8rem 1rem; }
  .added-by { font-size: 0.8rem; color: var(--text-secondary); }
  .type-badge { font-size: 0.75rem; background: var(--bg-elevated); padding: 0.15rem 0.5rem; border-radius: 8px; text-transform: capitalize; }
</style>
