<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let loading = true;
  let error = '';
  let pet = null;

  let interactionText = '';
  let interacting = false;
  let interactResponse = '';
  let levelUpBanner = '';

  let exploring = false;
  let discovery = null;

  let renaming = false;
  let renameText = '';

  onMount(async () => {
    await loadPet();
  });

  async function loadPet() {
    loading = true;
    error = '';
    try {
      const data = await api.get('/pet');
      pet = data.pet;
    } catch (e) {
      error = 'Failed to load pet';
    }
    loading = false;
  }

  async function handleInteract() {
    if (!interactionText.trim()) return;
    interacting = true;
    interactResponse = '';
    levelUpBanner = '';
    error = '';
    try {
      const data = await api.post('/pet/interact', { action: interactionText.trim() });
      interactResponse = data.response;
      if (data.pet) {
        pet = data.pet;
      }
      if (data.leveledUp) {
        levelUpBanner = data.newTrait
          ? `Level up! + ${data.newTrait}`
          : 'Level up!';
      }
      interactionText = '';
    } catch (e) {
      error = 'Failed to interact';
    }
    interacting = false;
  }

  async function handleExplore() {
    exploring = true;
    discovery = null;
    error = '';
    try {
      const data = await api.post('/pet/explore');
      discovery = data.discovery;
      if (data.pet) {
        pet = data.pet;
      }
    } catch (e) {
      error = 'Failed to explore';
    }
    exploring = false;
  }

  function startRename() {
    renameText = pet?.name || '';
    renaming = true;
  }

  async function handleRename() {
    if (!renameText.trim()) return;
    error = '';
    try {
      const data = await api.patch('/pet/rename', { name: renameText.trim() });
      pet = data.pet;
      renaming = false;
    } catch (e) {
      error = 'Failed to rename pet';
    }
  }

  function cancelRename() {
    renaming = false;
    renameText = '';
  }

  function dismissDiscovery() {
    discovery = null;
  }

  function dismissLevelUp() {
    levelUpBanner = '';
  }
</script>

<div class="pet-page">
  <h1>Evolution Pet</h1>
  <p class="subtitle">Your shared companion grows with your relationship</p>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Summoning your pet...</p>
    </div>
  {:else if error && !pet}
    <div class="error-state">
      <p class="error">{error}</p>
      <button class="btn" on:click={loadPet}>Retry</button>
    </div>
  {:else if pet}
    {#if levelUpBanner}
      <div class="level-up-banner" role="alert">
        <span class="level-up-icon">&#9733;</span>
        <span>{levelUpBanner}</span>
        <button class="dismiss-btn" on:click={dismissLevelUp}>&times;</button>
      </div>
    {/if}

    {#if discovery}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div class="discovery-overlay" on:click={dismissDiscovery} on:keydown={(e) => e.key === 'Escape' && dismissDiscovery()}>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="discovery-popup" on:click|stopPropagation>
          <h3>Discovery!</h3>
          <p class="discovery-name">{discovery.name}</p>
          <p class="discovery-desc">{discovery.description}</p>
          <button class="btn" on:click={dismissDiscovery}>Nice!</button>
        </div>
      </div>
    {/if}

    <div class="pet-card">
      <div class="pet-header">
        {#if renaming}
          <div class="rename-group">
            <input
              bind:value={renameText}
              placeholder="Enter new name"
              on:keydown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') cancelRename(); }}
            />
            <button class="btn-sm" on:click={handleRename} disabled={!renameText.trim()}>Save</button>
            <button class="btn-sm btn-cancel" on:click={cancelRename}>Cancel</button>
          </div>
        {:else}
          <h2 class="pet-name">{pet.name}</h2>
          <button class="rename-btn" on:click={startRename} title="Rename">&#9998;</button>
        {/if}
      </div>

      <div class="pet-level">
        <span>Level {pet.level}</span>
      </div>

      <div class="ep-bar">
        <div class="ep-bar-track">
          <div
            class="ep-bar-fill"
            style="width: {Math.min(100, (pet.ep / pet.epToNextLevel) * 100)}%"
          ></div>
        </div>
        <span class="ep-label">{pet.ep} / {pet.epToNextLevel} EP</span>
      </div>

      <div class="pet-traits">
        {#each pet.traits as trait}
          <span class="trait-badge">{trait}</span>
        {/each}
      </div>

      <p class="pet-personality">&ldquo;{pet.personality}&rdquo;</p>

      <div class="pet-details">
        <div class="detail-row">
          <span class="detail-label">Location</span>
          <span class="detail-value">{pet.currentLocation}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Life Summary</span>
          <span class="detail-value">{pet.lifeSummary}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>Interact</h3>
      <div class="interact-form">
        <input
          bind:value={interactionText}
          placeholder="What will you do together?"
          on:keydown={(e) => { if (e.key === 'Enter') handleInteract(); }}
        />
        <button class="btn" on:click={handleInteract} disabled={interacting || !interactionText.trim()}>
          {interacting ? '...' : 'Go'}
        </button>
      </div>
      {#if interactResponse}
        <p class="interact-response">{interactResponse}</p>
      {/if}
    </div>

    <div class="section actions">
      <button class="btn explore-btn" on:click={handleExplore} disabled={exploring}>
        {exploring ? 'Exploring...' : 'Explore'}
      </button>
    </div>

    {#if pet.recentInteractions?.length}
      <div class="section">
        <h3>Recent Interactions</h3>
        <div class="interactions-list">
          {#each pet.recentInteractions as interaction}
            <div class="interaction-item">
              <p class="interaction-action"><strong>You:</strong> {interaction.action}</p>
              <p class="interaction-response"><strong>Pet:</strong> {interaction.response}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if error}
      <p class="error">{error}</p>
    {/if}
  {/if}
</div>

<style>
  .pet-page {
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

  .loading-state {
    text-align: center;
    padding: 80px 20px;
    color: var(--text-secondary);
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--border-color);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state {
    text-align: center;
    padding: 80px 20px;
  }

  .error {
    color: var(--accent);
    margin: 0 0 1rem;
    font-size: 0.9rem;
  }

  .btn {
    padding: 0.7rem 1.5rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    cursor: pointer;
    font-family: inherit;
  }

  .btn:hover { background: var(--accent-hover); }
  .btn:disabled { background: var(--text-secondary); cursor: not-allowed; }

  .btn-sm {
    padding: 0.4rem 1rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    font-family: inherit;
  }

  .btn-sm:hover { background: var(--accent-hover); }
  .btn-sm:disabled { background: var(--text-secondary); cursor: not-allowed; }
  .btn-cancel { background: var(--bg-surface); }
  .btn-cancel:hover { background: var(--bg-elevated); }

  .level-up-banner {
    background: linear-gradient(135deg, #f7971e, #ffd200);
    color: #1a1a2e;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    text-align: center;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    position: relative;
  }

  .level-up-icon {
    margin-right: 0.4rem;
    font-size: 1.1rem;
  }

  .dismiss-btn {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #1a1a2e;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.7;
  }

  .dismiss-btn:hover { opacity: 1; }

  .discovery-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .discovery-popup {
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 2rem;
    max-width: 380px;
    width: 90%;
    text-align: center;
  }

  .discovery-popup h3 {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
    color: #ffd200;
  }

  .discovery-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: var(--text-primary);
  }

  .discovery-desc {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }

  .pet-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .pet-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .pet-name {
    font-size: 1.5rem;
    margin: 0;
  }

  .rename-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1rem;
    cursor: pointer;
    padding: 2px;
    line-height: 1;
    border-radius: 3px;
  }

  .rename-btn:hover {
    color: var(--text-primary);
    background: var(--bg-elevated);
  }

  .rename-group {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .rename-group input {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.9rem;
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-family: inherit;
  }

  .rename-group input::placeholder {
    color: var(--text-secondary);
  }

  .pet-level {
    font-size: 0.9rem;
    color: var(--accent);
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .ep-bar {
    margin-bottom: 1rem;
  }

  .ep-bar-track {
    width: 100%;
    height: 8px;
    background: var(--bg-elevated);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.3rem;
  }

  .ep-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), #ff6b6b);
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  .ep-label {
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  .pet-traits {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }

  .trait-badge {
    background: var(--bg-elevated);
    color: var(--accent);
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    border-radius: 10px;
    border: 1px solid var(--border-color);
  }

  .pet-personality {
    font-style: italic;
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0 0 1rem;
    line-height: 1.4;
  }

  .pet-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .detail-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-secondary);
  }

  .detail-value {
    font-size: 0.9rem;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .section {
    margin-bottom: 1.5rem;
  }

  .section h3 {
    font-size: 1rem;
    margin: 0 0 0.75rem;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
  }

  .explore-btn {
    background: linear-gradient(135deg, #667eea, #764ba2);
  }

  .explore-btn:hover { opacity: 0.9; }

  .interact-form {
    display: flex;
    gap: 0.5rem;
  }

  .interact-form input {
    flex: 1;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.9rem;
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-family: inherit;
  }

  .interact-form input::placeholder {
    color: var(--text-secondary);
  }

  .interact-response {
    margin: 0.75rem 0 0;
    color: var(--text-primary);
    font-size: 0.9rem;
    line-height: 1.5;
    font-style: italic;
    background: var(--bg-elevated);
    padding: 0.75rem;
    border-radius: 6px;
  }

  .interactions-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .interaction-item {
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.75rem;
  }

  .interaction-action {
    margin: 0 0 0.25rem;
    font-size: 0.88rem;
    color: var(--text-primary);
  }

  .interaction-response {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-style: italic;
  }
</style>
