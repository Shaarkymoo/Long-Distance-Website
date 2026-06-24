<script>
  import api from '../lib/api.js';

  let currentChallenge = null;
  let message = '';
  let newText = '';
  let newCategory = 'fun';

  async function getChallenge() {
    try {
      const data = await api.get('/challenges/random');
      currentChallenge = data.challenge;
      message = data.message || '';
    } catch (e) {}
  }

  async function addChallenge() {
    if (!newText.trim()) return;
    try {
      await api.post('/challenges', { challengeText: newText, category: newCategory });
      newText = '';
    } catch (e) {}
  }

  async function resetChallenges() {
    try {
      await api.get('/challenges/reset');
      currentChallenge = null;
      message = 'All challenges have been reset!';
    } catch (e) {}
  }

  function catColor(cat) {
    const colors = { fun: '#4caf50', adventurous: '#ff9800', romantic: '#e94560', silly: '#9c27b0' };
    return colors[cat] || '#999';
  }
</script>

<div class="challenges-page">
  <h1>Couple Challenges</h1>
  <p class="subtitle">Try something new together</p>

  <button class="get-btn" on:click={getChallenge}>Get a Challenge</button>

  {#if currentChallenge}
    <div class="challenge-card" style="border-color: {catColor(currentChallenge.category)}">
      <span class="category-badge" style="background: {catColor(currentChallenge.category)}">
        {currentChallenge.category}
      </span>
      <p class="challenge-text">{currentChallenge.challengeText}</p>
    </div>
  {:else if message}
    <p class="message">{message}</p>
  {/if}

  <button class="reset-btn" on:click={resetChallenges}>Reset All Challenges</button>

  <div class="add-form">
    <h3>Add a Challenge</h3>
    <input bind:value={newText} placeholder="Challenge description..." />
    <select bind:value={newCategory}>
      <option value="fun">Fun</option>
      <option value="adventurous">Adventurous</option>
      <option value="romantic">Romantic</option>
      <option value="silly">Silly</option>
    </select>
    <button on:click={addChallenge} disabled={!newText.trim()}>Add</button>
  </div>
</div>

<style>
  .challenges-page { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1.5rem; }
  .get-btn, .reset-btn { padding: 0.7rem 1.5rem; margin-right: 0.5rem; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 1rem; }
  .get-btn:hover, .reset-btn:hover { background: var(--accent-hover); }
  .reset-btn { background: var(--bg-surface); }
  .reset-btn:hover { background: var(--bg-surface); }
  .challenge-card { background: var(--bg-card); padding: 1.5rem; border-radius: 10px; border-left: 5px solid; margin-bottom: 1rem; position: relative; }
  .category-badge { position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.2rem 0.6rem; border-radius: 10px; color: white; font-size: 0.75rem; text-transform: capitalize; }
  .challenge-text { font-size: 1.1rem; margin: 0.5rem 0 0 0; color: var(--text-primary); }
  .message { color: var(--accent); margin-bottom: 1rem; }
  .add-form { background: var(--bg-card); padding: 1rem; border-radius: 8px; margin-top: 1.5rem; }
  .add-form h3 { margin: 0 0 0.5rem 0; }
  .add-form input, .add-form select { width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 0.5rem; box-sizing: border-box; }
  .add-form button { padding: 0.5rem 1rem; background: var(--bg-surface); color: white; border: none; border-radius: 4px; cursor: pointer; }
  .add-form button:disabled { background: var(--text-secondary); }
</style>
