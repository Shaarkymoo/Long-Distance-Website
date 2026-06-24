<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';
  let content = '';
  let saved = false;

  onMount(async () => {
    try {
      const data = await api.get('/notebook');
      content = data.content || '';
    } catch {}
  });

  async function handleSave() {
    await api.put('/notebook', { content });
    saved = true;
    setTimeout(() => saved = false, 2000);
  }
</script>

<div class="notebook">
  <h1>Shared Notebook</h1>
  <textarea bind:value={content} placeholder="Write something..."></textarea>
  <button on:click={handleSave}>Save</button>
  {#if saved}<span class="saved">Saved!</span>{/if}
</div>

<style>
  .notebook { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
  textarea { width: 100%; height: 400px; padding: 1rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 1rem; resize: vertical; }
  button { margin-top: 1rem; padding: 0.6rem 1.5rem; background: var(--bg-surface); color: white; border: none; border-radius: 6px; cursor: pointer; }
  .saved { margin-left: 1rem; color: #4caf50; font-size: 0.9rem; }
</style>
