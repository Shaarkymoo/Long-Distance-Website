<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let entries = [];
  let loading = true;
  let error = '';

  $: grouped = entries.reduce((acc, entry) => {
    (acc[entry.location] ??= []).push(entry);
    return acc;
  }, {});

  onMount(async () => {
    try {
      const data = await api.get('/pet/archive');
      entries = data.entries ?? [];
    } catch (e) {
      error = e.message || 'Failed to load archive';
    }
    loading = false;
  });
</script>

<div class="page">
  <h1 class="page-title">Archive</h1>
  <p class="page-subtitle">Discoveries our pet has made while exploring</p>

  {#if loading}
    <p class="status-msg">Loading discoveries...</p>
  {:else if error}
    <p class="error-msg">{error}</p>
  {:else if entries.length === 0}
    <div class="empty-state">
      <p>No discoveries yet.</p>
      <p>Explore with your pet!</p>
    </div>
  {:else}
    {#each Object.entries(grouped) as [location, items]}
      <section class="location-section">
        <h2 class="location-name">{location}</h2>
        <div class="entry-cards">
          {#each items as entry}
            <div class="entry-card">
              <div class="card-body">
                <h3 class="entry-name">{entry.name}</h3>
                <p class="entry-desc">{entry.description}</p>
              </div>
              <div class="card-footer">
                <span class="discovered-by">Discovered by {entry.discoveredBy?.displayName ?? 'Unknown'}</span>
                <span class="count-badge">Found {entry.discoveryCount} time{entry.discoveryCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>

<style>
  .page {
    padding: 40px 32px;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .page-title {
    margin: 0 0 4px;
    font-size: 1.8rem;
  }

  .page-subtitle {
    margin: 0 0 32px;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .status-msg {
    text-align: center;
    color: var(--text-secondary);
    padding: 48px;
  }

  .error-msg {
    text-align: center;
    color: var(--accent);
    padding: 24px;
  }

  .empty-state {
    text-align: center;
    color: var(--text-secondary);
    padding: 60px 20px;
  }

  .empty-state p {
    margin: 8px 0;
  }

  .location-section {
    margin-bottom: 36px;
  }

  .location-name {
    font-size: 1.25rem;
    margin: 0 0 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
  }

  .entry-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .entry-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 18px 20px;
    transition: border-color 150ms ease;
  }

  .entry-card:hover {
    border-color: var(--accent);
  }

  .card-body {
    margin-bottom: 12px;
  }

  .entry-name {
    margin: 0 0 6px;
    font-size: 1.05rem;
  }

  .entry-desc {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font-size: 0.82rem;
  }

  .discovered-by {
    color: var(--text-secondary);
  }

  .count-badge {
    background: var(--accent);
    color: white;
    padding: 3px 10px;
    border-radius: 99px;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
  }
</style>
