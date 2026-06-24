<script>
  import { onMount } from 'svelte';
  import { currentUser } from '../lib/stores.js';
  import api from '../lib/api.js';

  let messages = [];
  let newContent = '';
  let loading = true;

  onMount(async () => {
    try {
      const data = await api.get('/messages');
      messages = data.messages || [];
    } catch (e) {}
    loading = false;
  });

  async function postMessage() {
    if (!newContent.trim()) return;
    try {
      const data = await api.post('/messages', { content: newContent });
      messages = [data.message, ...messages];
      newContent = '';
    } catch (e) {}
  }

  function timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function isMine(msg) {
    return msg.author?._id === $currentUser?.id;
  }
</script>

<div class="messages-page">
  <h1>Message Board</h1>
  <p class="subtitle">Leave notes for each other</p>

  <div class="post-form">
    <textarea bind:value={newContent} placeholder="Write a message..." rows="3"></textarea>
    <button on:click={postMessage} disabled={!newContent.trim()}>Post</button>
  </div>

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if messages.length === 0}
    <p class="empty">No messages yet. Write something!</p>
  {:else}
    <div class="message-list">
      {#each messages as msg}
        <div class="message-card" class:mine={isMine(msg)}>
          <div class="message-content">{msg.content}</div>
          <div class="message-meta">
            <span class="author">{msg.author?.displayName || msg.author?.username}</span>
            <span class="time">{timeAgo(msg.createdAt)}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .messages-page { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1.5rem; }
  .post-form { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
  .post-form textarea { padding: 0.7rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.95rem; resize: vertical; }
  .post-form button {
    align-self: flex-end; padding: 0.5rem 1.2rem; background: var(--bg-surface); color: white;
    border: none; border-radius: 4px; cursor: pointer;
  }
  .post-form button:disabled { background: #ccc; }
  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }
  .message-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .message-card {
    background: var(--bg-card); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--accent);
    margin-right: auto; max-width: 85%;
  }
  .message-card.mine {
    border-left-color: #2196f3;
    margin-right: 0; margin-left: auto;
    background: var(--bg-elevated);
  }
  .message-content { font-size: 0.95rem; margin-bottom: 0.5rem; color: var(--text-primary); }
  .message-meta { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); }
</style>
