<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let activeTab = 'active';
  let allExpeditions = [];
  let activeExpeditions = [];
  let loading = true;
  let error = '';

  let newTitle = '';
  let creating = false;
  let createdExpedition = null;

  onMount(() => {
    loadActive();
  });

  async function loadActive() {
    loading = true;
    error = '';
    try {
      const data = await api.get('/expeditions/active');
      activeExpeditions = data.expeditions || [];
    } catch (e) {
      error = 'Failed to load active expeditions';
    }
    loading = false;
  }

  async function loadAll() {
    loading = true;
    error = '';
    try {
      const data = await api.get('/expeditions');
      allExpeditions = data.expeditions || [];
    } catch (e) {
      error = 'Failed to load expeditions';
    }
    loading = false;
  }

  function switchTab(tab) {
    activeTab = tab;
    createdExpedition = null;
    if (tab === 'active') loadActive();
    else loadAll();
  }

  async function createExpedition() {
    if (!newTitle.trim() || creating) return;
    creating = true;
    try {
      const data = await api.post('/expeditions', { title: newTitle.trim() });
      createdExpedition = data.expedition || data;
      newTitle = '';
    } catch (e) {
      error = 'Failed to create expedition';
    }
    creating = false;
  }

  async function castVote(id, vote) {
    try {
      await api.post(`/expeditions/${id}/vote`, { vote });
      if (activeTab === 'active') await loadActive();
      else await loadAll();
    } catch (e) {}
  }

  async function markReady(id) {
    try {
      await api.post(`/expeditions/${id}/ready`);
      await loadActive();
    } catch (e) {}
  }

  function statusClass(status) {
    const map = { pending: 'status-pending', active: 'status-active', completed: 'status-completed', expired: 'status-expired' };
    return map[status] || '';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  }

  function voteCount(exp, type) {
    return (exp.votes || []).filter(v => v.vote === type).length;
  }

  function whatsappLink(title) {
    return `https://wa.me/?text=Our+expedition:+${encodeURIComponent(title)}`;
  }

  function hasVoted(exp) {
    return (exp.votes || []).length > 0;
  }
</script>

<div class="expeditions-page">
  <h1>Expeditions</h1>
  <p class="subtitle">AI-generated challenges for you and your partner</p>

  <div class="tabs">
    <button class="tab" class:active={activeTab === 'active'} on:click={() => switchTab('active')}>Active</button>
    <button class="tab" class:active={activeTab === 'all'} on:click={() => switchTab('all')}>All</button>
  </div>

  <div class="create-form">
    <input bind:value={newTitle} placeholder="New expedition title..." disabled={creating} />
    <button on:click={createExpedition} disabled={!newTitle.trim() || creating}>
      {creating ? 'Creating...' : 'Create'}
    </button>
  </div>

  {#if createdExpedition}
    <div class="created-card">
      <h3>{createdExpedition.title}</h3>
      <p class="challenge-text"><em>{createdExpedition.challenge}</em></p>
      <p class="created-by">Created by {createdExpedition.createdBy?.displayName}</p>
      <p class="created-hint">Vote now in the Active tab!</p>
    </div>
  {/if}

  {#if loading}
    <p class="status-msg">Loading...</p>
  {:else if error}
    <p class="error-msg">{error}</p>
  {:else}
    {#if activeTab === 'active'}
      {#if activeExpeditions.length === 0}
        <div class="empty-state">
          <p>No active expeditions.</p>
          <p>Create one above to get started!</p>
        </div>
      {:else}
        <div class="expedition-list">
          {#each activeExpeditions as exp}
            <div class="expedition-card {statusClass(exp.status)}">
              <div class="card-header">
                <h3>{exp.title}</h3>
                <span class="status-badge {statusClass(exp.status)}">{exp.status}</span>
              </div>

              <p class="challenge-text"><em>{exp.challenge}</em></p>

              <div class="card-meta">
                <span>by {exp.createdBy?.displayName}</span>
                {#if exp.expiresAt}
                  <span>Expires {formatDate(exp.expiresAt)}</span>
                {/if}
              </div>

              {#if exp.status === 'pending'}
                <div class="vote-section">
                  <div class="vote-buttons">
                    <button class="vote-btn go" on:click={() => castVote(exp._id, 'go')}>
                      Go ({voteCount(exp, 'go')})
                    </button>
                    <button class="vote-btn no-go" on:click={() => castVote(exp._id, 'no-go')}>
                      No-go ({voteCount(exp, 'no-go')})
                    </button>
                  </div>
                  {#if hasVoted(exp)}
                    <div class="voters">
                      {#each exp.votes as v}
                        <span class="voter">{v.userId?.displayName}: {v.vote}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}

              {#if exp.status === 'active'}
                <div class="ready-section">
                  <p class="ready-count">Ready: {exp.readyCount || 0}/2</p>
                  <button class="ready-btn" on:click={() => markReady(exp._id)}>
                    Mark Ready
                  </button>
                </div>
                <a class="whatsapp-link" href={whatsappLink(exp.title)} target="_blank" rel="noopener">
                  Share on WhatsApp
                </a>
              {/if}

              {#if exp.status === 'completed'}
                <div class="completed-info">
                  <span class="completed-badge">Completed!</span>
                  <span class="score">+{exp.scoreAwarded} points</span>
                  <span class="completed-date">{formatDate(exp.completedAt)}</span>
                </div>
                <a class="whatsapp-link" href={whatsappLink(exp.title)} target="_blank" rel="noopener">
                  Share on WhatsApp
                </a>
              {/if}

              {#if exp.status === 'expired'}
                <p class="expired-note">This expedition has expired.</p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      {#if allExpeditions.length === 0}
        <div class="empty-state">
          <p>No expeditions yet.</p>
        </div>
      {:else}
        <div class="expedition-list">
          {#each allExpeditions as exp}
            <div class="expedition-card {statusClass(exp.status)}">
              <div class="card-header">
                <h3>{exp.title}</h3>
                <span class="status-badge {statusClass(exp.status)}">{exp.status}</span>
              </div>

              <p class="challenge-text"><em>{exp.challenge}</em></p>

              <div class="card-meta">
                <span>by {exp.createdBy?.displayName}</span>
                {#if exp.expiresAt}
                  <span>Expires {formatDate(exp.expiresAt)}</span>
                {/if}
              </div>

              {#if exp.status === 'pending'}
                <div class="vote-section">
                  <div class="vote-buttons">
                    <button class="vote-btn go" on:click={() => castVote(exp._id, 'go')}>
                      Go ({voteCount(exp, 'go')})
                    </button>
                    <button class="vote-btn no-go" on:click={() => castVote(exp._id, 'no-go')}>
                      No-go ({voteCount(exp, 'no-go')})
                    </button>
                  </div>
                  {#if hasVoted(exp)}
                    <div class="voters">
                      {#each exp.votes as v}
                        <span class="voter">{v.userId?.displayName}: {v.vote}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}

              {#if exp.status === 'active'}
                <a class="whatsapp-link" href={whatsappLink(exp.title)} target="_blank" rel="noopener">
                  Share on WhatsApp
                </a>
              {/if}

              {#if exp.status === 'completed'}
                <div class="completed-info">
                  <span class="completed-badge">Completed!</span>
                  <span class="score">+{exp.scoreAwarded} points</span>
                  <span class="completed-date">{formatDate(exp.completedAt)}</span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .expeditions-page { max-width: 700px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); margin: 0 0 0; }
  .subtitle { color: var(--text-secondary); margin-top: 0.2rem; margin-bottom: 1.5rem; }

  .tabs { display: flex; gap: 0; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); }
  .tab { padding: 0.6rem 1.5rem; background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.95rem; font-family: inherit; border-bottom: 2px solid transparent; transition: all 150ms ease; }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab:hover { color: var(--text-primary); }

  .create-form { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
  .create-form input { flex: 1; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit; font-size: 0.92rem; background: var(--bg-card); color: var(--text-primary); }
  .create-form input::placeholder { color: var(--text-secondary); }
  .create-form button { padding: 0.6rem 1.2rem; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.92rem; white-space: nowrap; }
  .create-form button:hover { background: var(--accent-hover); }
  .create-form button:disabled { background: var(--text-secondary); cursor: not-allowed; }
  .create-form input:disabled { opacity: 0.6; }

  .created-card { background: var(--bg-card); padding: 1.2rem; border-radius: 10px; margin-bottom: 1.5rem; border-left: 4px solid #4caf50; }
  .created-card h3 { margin: 0 0 0.5rem; font-size: 1.1rem; }
  .created-card .challenge-text { color: var(--text-primary); margin: 0 0 0.5rem; font-size: 0.95rem; line-height: 1.5; }
  .created-by { font-size: 0.82rem; color: var(--text-secondary); margin: 0 0 0.3rem; }
  .created-hint { font-size: 0.82rem; color: var(--accent); margin: 0; }

  .status-msg { text-align: center; color: var(--text-secondary); padding: 48px; }
  .error-msg { text-align: center; color: var(--accent); padding: 24px; }

  .empty-state { text-align: center; color: var(--text-secondary); padding: 60px 20px; }
  .empty-state p { margin: 8px 0; }

  .expedition-list { display: flex; flex-direction: column; gap: 12px; }

  .expedition-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.2rem; border-left: 4px solid var(--border-color); }
  .expedition-card.status-pending { border-left-color: #ff9800; }
  .expedition-card.status-active { border-left-color: #58D68D; }
  .expedition-card.status-completed { border-left-color: #4caf50; opacity: 0.85; }
  .expedition-card.status-expired { border-left-color: var(--text-secondary); opacity: 0.6; }

  .card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; }
  .card-header h3 { margin: 0; font-size: 1.05rem; }

  .status-badge { padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.75rem; text-transform: capitalize; white-space: nowrap; background: var(--bg-elevated); color: var(--text-secondary); }
  .status-badge.status-pending { background: #fff3e0; color: #e65100; }
  .status-badge.status-active { background: #e8f5e9; color: #2e7d32; }
  .status-badge.status-completed { background: #e8f5e9; color: #2e7d32; }
  .status-badge.status-expired { background: var(--bg-elevated); color: var(--text-secondary); }

  .challenge-text { color: var(--text-primary); margin: 0 0 0.8rem; font-size: 0.92rem; line-height: 1.5; }

  .card-meta { display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem; }

  .vote-section { border-top: 1px solid var(--border-color); padding-top: 0.8rem; }
  .vote-buttons { display: flex; gap: 0.5rem; }
  .vote-btn { padding: 0.4rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-family: inherit; }
  .vote-btn.go { background: #4caf50; color: white; }
  .vote-btn.go:hover { background: #43a047; }
  .vote-btn.no-go { background: var(--accent); color: white; }
  .vote-btn.no-go:hover { background: #d63851; }
  .voters { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
  .voter { font-size: 0.78rem; color: var(--text-secondary); background: var(--bg-elevated); padding: 0.15rem 0.5rem; border-radius: 4px; }

  .ready-section { border-top: 1px solid var(--border-color); padding-top: 0.8rem; display: flex; justify-content: space-between; align-items: center; }
  .ready-count { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
  .ready-btn { padding: 0.4rem 1rem; background: #58D68D; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-family: inherit; }
  .ready-btn:hover { background: #4caf50; }

  .completed-info { border-top: 1px solid var(--border-color); padding-top: 0.8rem; display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap; }
  .completed-badge { font-weight: 600; color: #4caf50; font-size: 0.85rem; }
  .score { color: var(--accent); font-weight: 600; font-size: 0.85rem; }
  .completed-date { font-size: 0.8rem; color: var(--text-secondary); }

  .expired-note { font-size: 0.82rem; color: var(--text-secondary); font-style: italic; margin: 0.5rem 0 0; }

  .whatsapp-link { display: inline-block; margin-top: 0.6rem; font-size: 0.82rem; color: #25D366; text-decoration: none; font-weight: 500; }
  .whatsapp-link:hover { text-decoration: underline; }
</style>
