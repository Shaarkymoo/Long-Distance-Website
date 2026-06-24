<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let predictions = [];
  let newTitle = '';
  let loading = true;

  onMount(async () => {
    try {
      const data = await api.get('/predictions');
      predictions = data.predictions || [];
    } catch (e) {}
    loading = false;
  });

  async function addPrediction() {
    if (!newTitle.trim()) return;
    try {
      const data = await api.post('/predictions', { title: newTitle });
      predictions = [data.prediction, ...predictions];
      newTitle = '';
    } catch (e) {}
  }

  async function resolvePrediction(id, result) {
    try {
      const data = await api.patch(`/predictions/${id}/resolve`, { result });
      predictions = predictions.map(p => p._id === id ? data.prediction : p);
    } catch (e) {}
  }

  $: active = predictions.filter(p => p.result === 'pending');
  $: resolved = predictions.filter(p => p.result !== 'pending');

  function stats(userId) {
    const userPreds = predictions.filter(p => p.predictedBy?._id === userId);
    const correct = userPreds.filter(p => p.result === 'correct').length;
    const wrong = userPreds.filter(p => p.result === 'wrong').length;
    return { correct, wrong };
  }

  let userStats = {};
  $: if (predictions.length) {
    const userIds = [...new Set(predictions.map(p => p.predictedBy?._id).filter(Boolean))];
    userStats = Object.fromEntries(userIds.map(id => [id, stats(id)]));
  }
</script>

<div class="predictions-page">
  <h1>Prediction Tracker</h1>
  <p class="subtitle">Make predictions and see who's right</p>

  <div class="add-form">
    <input bind:value={newTitle} placeholder="Make a prediction..." />
    <button on:click={addPrediction} disabled={!newTitle.trim()}>Predict</button>
  </div>

  {#if loading}
    <p class="loading">Loading...</p>
  {:else}
    {#if active.length > 0}
      <div class="section">
        <h3>Active Predictions ({active.length})</h3>
        {#each active as p}
          <div class="prediction-card">
            <div class="pred-info">
              <strong>{p.title}</strong>
              <span class="by">by {p.predictedBy?.displayName || p.predictedBy?.username}</span>
            </div>
            <div class="resolve-btns">
              <button class="correct-btn" on:click={() => resolvePrediction(p._id, 'correct')}>✓ Correct</button>
              <button class="wrong-btn" on:click={() => resolvePrediction(p._id, 'wrong')}>✗ Wrong</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if resolved.length > 0}
      <div class="section">
        <h3>Resolved ({resolved.length})</h3>
        {#each resolved as p}
          <div class="prediction-card resolved">
            <div class="pred-info">
              <strong>{p.title}</strong>
              <span class="by">by {p.predictedBy?.displayName || p.predictedBy?.username}</span>
              <span class="result" class:correct={p.result === 'correct'} class:wrong={p.result === 'wrong'}>
                {p.result === 'correct' ? '✓ Correct' : '✗ Wrong'}
              </span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="stats">
      <h3>Stats</h3>
      {#each Object.entries(userStats) as [userId, s]}
        <p>{predictions.find(p => p.predictedBy?._id === userId)?.predictedBy?.displayName || 'User'}:
          {s.correct} correct, {s.wrong} wrong</p>
      {/each}
    </div>
  {/if}
</div>

<style>
  .predictions-page { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1.5rem; }
  .add-form { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
  .add-form input { flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; }
  .add-form button { padding: 0.5rem 1rem; background: var(--bg-surface); color: white; border: none; border-radius: 4px; cursor: pointer; }
  .add-form button:disabled { background: var(--text-secondary); }
  .loading { color: var(--text-secondary); text-align: center; }
  .section { margin-bottom: 1.5rem; }
  .section h3 { font-size: 1rem; color: var(--text-secondary); }
  .prediction-card { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 0.7rem 1rem; border-radius: 6px; margin-bottom: 0.4rem; }
  .prediction-card.resolved { opacity: 0.7; }
  .pred-info { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .by { font-size: 0.8rem; color: var(--text-secondary); }
  .result { font-size: 0.8rem; font-weight: 600; }
  .result.correct { color: #4caf50; }
  .result.wrong { color: var(--accent); }
  .resolve-btns { display: flex; gap: 0.3rem; }
  .correct-btn, .wrong-btn { padding: 0.3rem 0.6rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
  .correct-btn { background: #4caf50; color: white; }
  .wrong-btn { background: var(--accent); color: white; }
  .stats { background: var(--bg-card); padding: 1rem; border-radius: 8px; margin-top: 1rem; }
  .stats h3 { margin: 0 0 0.5rem 0; font-size: 1rem; }
  .stats p { margin: 0.2rem 0; font-size: 0.9rem; color: var(--text-secondary); }
</style>
