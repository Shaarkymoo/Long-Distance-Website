<script>
  import { onMount } from 'svelte';
  import { currentUser } from '../lib/stores.js';
  import api from '../lib/api.js';

  let currentPrompt = null;
  let myThoughts = '';
  let saving = false;
  let fetching = false;
  let error = '';
  let couple = [];
  let counterpart = null;

  $: myId = $currentUser?.id;
  $: counterpart = couple.find(u => u.id !== myId) || null;
  $: myThoughtEntry = currentPrompt?.thoughts?.[myId] || null;
  $: counterpartThoughtEntry = currentPrompt?.thoughts?.[counterpart?.id] || null;

  onMount(async () => {
    try {
      const data = await api.get('/conversations/current');
      currentPrompt = data.prompt;
      couple = data.couple || [];
      if (currentPrompt && myId && currentPrompt.thoughts?.[myId]) {
        myThoughts = currentPrompt.thoughts[myId].text;
      }
    } catch (e) {
      error = 'Failed to load current topic';
    }
  });

  async function getNewPrompt() {
    fetching = true;
    error = '';
    myThoughts = '';
    try {
      const data = await api.get('/conversations/random');
      currentPrompt = data.prompt;
      couple = data.couple || [];
      if (!data.prompt) {
        error = data.message || 'No more prompts available!';
      }
    } catch (e) {
      error = 'Failed to fetch a new prompt';
    }
    fetching = false;
  }

  async function saveThoughts() {
    if (!myThoughts.trim()) return;
    saving = true;
    error = '';
    try {
      const data = await api.post('/conversations/thoughts', { text: myThoughts });
      currentPrompt = data.prompt;
      couple = data.couple || [];
    } catch (e) {
      error = 'Failed to save your thoughts';
    }
    saving = false;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="conversations-page">
  <h1>Conversations</h1>
  <p class="subtitle">Deepen your connection with thought-provoking topics</p>

  {#if !currentPrompt}
    <div class="empty-state">
      <p class="empty-text">No active topic yet. Get a conversation starter to begin.</p>
      <button class="get-btn" on:click={getNewPrompt} disabled={fetching}>
        {fetching ? 'Getting...' : 'Get a Conversation Prompt'}
      </button>
    </div>
  {:else}
    <div class="topic-card">
      <p class="topic-text">{currentPrompt.promptText}</p>
      <button class="get-btn new-btn" on:click={getNewPrompt} disabled={fetching}>
        {fetching ? 'Getting...' : 'Get a New Prompt'}
      </button>
    </div>

    <div class="thoughts-section">
      <!-- My thoughts -->
      <div class="thought-block mine">
        <h3>Your Thoughts</h3>
        {#if myThoughtEntry}
          <p class="thought-text">{myThoughtEntry.text}</p>
          <p class="thought-time">Saved {formatDate(myThoughtEntry.updatedAt)}</p>
        {:else}
          <textarea
            bind:value={myThoughts}
            placeholder="Write your thoughts here..."
            rows="4"
          ></textarea>
          <button
            class="save-btn"
            on:click={saveThoughts}
            disabled={saving || !myThoughts.trim()}
          >
            {saving ? 'Saving...' : 'Save Thoughts'}
          </button>
        {/if}
      </div>

      <!-- Counterpart's thoughts -->
      <div class="thought-block theirs">
        <h3>{counterpart?.displayName || 'Your Partner'}'s Thoughts</h3>
        {#if counterpartThoughtEntry}
          <p class="thought-text">{counterpartThoughtEntry.text}</p>
          <p class="thought-time">Saved {formatDate(counterpartThoughtEntry.updatedAt)}</p>
        {:else}
          <p class="thought-empty">{counterpart?.displayName || 'Your partner'} has not yet thought about this.</p>
        {/if}
      </div>
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}
</div>

<style>
  .conversations-page {
    max-width: 680px;
    margin: 0 auto;
    padding: 40px 24px;
  }

  h1 {
    font-size: 1.8rem;
    margin: 0 0 4px;
  }

  .subtitle {
    color: var(--text-secondary);
    margin: 0 0 2rem;
    font-size: 0.95rem;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
  }

  .empty-text {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    font-size: 1.05rem;
  }

  .get-btn {
    padding: 0.8rem 2rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    font-family: inherit;
  }

  .get-btn:hover { background: var(--accent-hover); }
  .get-btn:disabled { background: var(--text-secondary); cursor: not-allowed; }

  .new-btn {
    margin-top: 1.25rem;
  }

  .topic-card {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    text-align: center;
  }

  .topic-text {
    font-size: 1.2rem;
    margin: 0;
    line-height: 1.5;
  }

  .thoughts-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .thought-block {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1.25rem;
  }

  .thought-block h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-secondary);
    margin: 0 0 0.75rem;
  }

  .thought-text {
    font-size: 1rem;
    line-height: 1.5;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
    white-space: pre-wrap;
  }

  .thought-time {
    font-size: 0.78rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .thought-empty {
    color: var(--text-secondary);
    font-style: italic;
    margin: 0;
  }

  .mine textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.95rem;
    resize: vertical;
    box-sizing: border-box;
    margin-bottom: 0.75rem;
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .mine textarea::placeholder {
    color: var(--text-secondary);
  }

  .save-btn {
    padding: 0.6rem 1.5rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    font-family: inherit;
  }

  .save-btn:hover { background: var(--accent-hover); }
  .save-btn:disabled { background: var(--text-secondary); cursor: not-allowed; }

  .error {
    text-align: center;
    color: var(--accent);
    margin-top: 1rem;
    font-size: 0.9rem;
  }
</style>
