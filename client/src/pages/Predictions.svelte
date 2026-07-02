<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';
  import { currentUser } from '../lib/stores.js';

  let bets = [];
  let scores = [];
  let settings = { firstTo: 5, prize: 'bragging rights' };
  let winner = null;

  let newGoal = '';
  let newPoints = 1;
  let loading = true;
  let error = '';

  let showSettings = false;
  let editFirstTo = 5;
  let editPrize = '';

  onMount(async () => {
    try {
      const data = await api.get('/predictions');
      bets = data.bets || [];
      scores = data.scores || [];
      settings = data.settings || { firstTo: 5, prize: 'bragging rights' };
      winner = data.winner;
      editFirstTo = settings.firstTo;
      editPrize = settings.prize;
    } catch (e) {
      console.error('[Predictions] Failed to load bets:', e);
      error = 'Failed to load bets';
    }
    loading = false;
  });

  async function createBet() {
    if (!newGoal.trim()) return;
    try {
      const data = await api.post('/predictions', { goal: newGoal, points: newPoints });
      bets = [data.bet, ...bets];
      newGoal = '';
      newPoints = 1;
    } catch (e) {
      console.error('[Predictions] Failed to create bet:', e);
      error = 'Failed to create bet';
    }
  }

  async function resolveBet(id, winnerSide) {
    try {
      const data = await api.patch(`/predictions/${id}/resolve`, { winner: winnerSide });
      bets = bets.map(b => b._id === id ? data.bet : b);
      // Refresh scoreboard
      const refreshed = await api.get('/predictions');
      scores = refreshed.scores || [];
      winner = refreshed.winner;
    } catch (e) {
      console.error('[Predictions] Failed to resolve bet:', e);
      error = e.message || 'Failed to resolve';
    }
  }

  async function saveSettings() {
    try {
      const data = await api.patch('/predictions/settings', { firstTo: editFirstTo, prize: editPrize });
      settings = data.settings;
      showSettings = false;
      // Refresh to update winner status
      const refreshed = await api.get('/predictions');
      winner = refreshed.winner;
    } catch (e) {
      console.error('[Predictions] Failed to save settings:', e);
      error = 'Failed to save settings';
    }
  }

  $: active = bets.filter(b => !b.winner);
  $: resolved = bets.filter(b => b.winner);

  function formatName(user) {
    return user?.displayName || user?.username || 'Unknown';
  }

  function isMe(id) {
    return id === $currentUser?.id;
  }
</script>

<div class="bets-page">
  <h1>Bet Tracker</h1>

  <!-- Scoreboard -->
  <div class="scoreboard">
    <div class="score-row">
      {#each scores as s, i}
        <div class="score-player" class:leading={winner && s.userId === winner.userId}>
          <span class="score-name">{s.displayName}</span>
          <span class="score-value">{s.score}</span>
        </div>
        {#if i < scores.length - 1}
          <span class="score-vs">-</span>
        {/if}
      {/each}
    </div>
    <div class="win-condition">
      First to {settings.firstTo} wins {settings.prize}
      <button class="settings-btn" on:click={() => { editFirstTo = settings.firstTo; editPrize = settings.prize; showSettings = !showSettings; }}>
        ⚙
      </button>
    </div>
  </div>

  <!-- Winner announcement -->
  {#if winner}
    <div class="winner-banner">
      🏆 <strong>{winner.displayName}</strong> wins! First to {settings.firstTo} — {settings.prize} earned!
    </div>
  {/if}

  <!-- Settings panel -->
  {#if showSettings}
    <div class="settings-panel">
      <h3>Bet Settings</h3>
      <label>
        First to
        <input type="number" bind:value={editFirstTo} min="1" />
      </label>
      <label>
        Prize
        <input bind:value={editPrize} placeholder="bragging rights" />
      </label>
      <div class="settings-actions">
        <button class="save-btn" on:click={saveSettings}>Save</button>
        <button class="cancel-btn" on:click={() => { showSettings = false; }}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <!-- Create bet form -->
  <div class="bet-form">
    <h3>Make a Bet</h3>
    <p class="form-desc">Bet your partner you can do something. If you win, you get the points!</p>
    <input bind:value={newGoal} placeholder="e.g. I can run 5km without stopping" />
    <div class="form-row">
      <label>
        Points:
        <input type="number" bind:value={newPoints} min="1" max="99" />
      </label>
      <button on:click={createBet} disabled={!newGoal.trim()}>Bet!</button>
    </div>
  </div>

  {#if loading}
    <p class="loading">Loading...</p>
  {:else}
    <!-- Active bets -->
    {#if active.length > 0}
      <div class="section">
        <h2>Active Bets ({active.length})</h2>
        {#each active as bet}
          <div class="bet-card">
            <div class="bet-info">
              <strong>{bet.goal}</strong>
              <span class="meta">
                {formatName(bet.challenger)} challenged {formatName(bet.challenged)}
                — {bet.points} point{bet.points > 1 ? 's' : ''}
              </span>
            </div>
            <div class="resolve-btns">
              <button class="win-btn" on:click={() => resolveBet(bet._id, 'challenger')}>
                {formatName(bet.challenger)} Won
              </button>
              <button class="lose-btn" on:click={() => resolveBet(bet._id, 'challenged')}>
                {formatName(bet.challenged)} Won
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Resolved bets -->
    {#if resolved.length > 0}
      <div class="section">
        <h2>Resolved ({resolved.length})</h2>
        {#each resolved as bet}
          <div class="bet-card resolved">
            <div class="bet-info">
              <strong>{bet.goal}</strong>
              <span class="meta">
                {formatName(bet.challenger)} vs {formatName(bet.challenged)}
                — {bet.points} point{bet.points > 1 ? 's' : ''}
              </span>
              <span class="winner-label">
                🏆 {formatName(bet.winner)} won
              </span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if bets.length === 0}
      <p class="empty">No bets yet. Challenge your partner!</p>
    {/if}
  {/if}
</div>

<style>
  .bets-page { max-width: 650px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); margin-bottom: 1rem; }

  .scoreboard {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 1.2rem 1.5rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    text-align: center;
  }
  .score-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 0.3rem;
  }
  .score-player {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .score-player.leading .score-value {
    box-shadow: 0 0 0 2px gold;
  }
  .score-name { font-size: 1rem; font-weight: 500; }
  .score-value {
    font-size: 2rem;
    font-weight: 700;
    background: rgba(255,255,255,0.15);
    padding: 0.2rem 0.7rem;
    border-radius: 8px;
    min-width: 2.2rem;
  }
  .score-vs { font-size: 1.5rem; font-weight: 300; opacity: 0.7; }
  .win-condition {
    font-size: 0.85rem;
    opacity: 0.9;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .settings-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.7;
    padding: 0;
  }
  .settings-btn:hover { opacity: 1; }

  .winner-banner {
    background: linear-gradient(135deg, #f9d423, #f7971e);
    color: #333;
    font-size: 1.1rem;
    padding: 0.8rem 1.2rem;
    border-radius: 10px;
    text-align: center;
    margin-bottom: 1rem;
    font-weight: 500;
  }

  .settings-panel {
    background: var(--bg-card);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .settings-panel h3 { margin: 0; font-size: 1rem; color: var(--text-primary); }
  .settings-panel label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-secondary); }
  .settings-panel input { padding: 0.4rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.9rem; background: var(--bg-surface); color: var(--text-primary); width: 200px; }
  .settings-panel input[type="number"] { width: 80px; }
  .settings-actions { display: flex; gap: 0.5rem; }
  .save-btn, .cancel-btn { padding: 0.4rem 0.8rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
  .save-btn { background: var(--accent); color: white; }
  .cancel-btn { background: var(--bg-elevated); color: var(--text-primary); }

  .error { color: var(--accent); margin: 0.5rem 0; }

  .bet-form {
    background: var(--bg-card);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .bet-form h3 { margin: 0; font-size: 1rem; color: var(--text-primary); }
  .form-desc { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
  .bet-form input { padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.9rem; background: var(--bg-surface); color: var(--text-primary); }
  .bet-form input[type="number"] { width: 70px; }
  .form-row { display: flex; align-items: center; gap: 0.75rem; }
  .form-row label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.9rem; color: var(--text-secondary); }
  .bet-form button {
    padding: 0.5rem 1.2rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    margin-left: auto;
  }
  .bet-form button:disabled { opacity: 0.4; cursor: not-allowed; }

  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }

  .section { margin-bottom: 1.5rem; }
  .section h2 { font-size: 1rem; color: var(--text-secondary); margin-bottom: 0.5rem; }

  .bet-card {
    background: var(--bg-card);
    padding: 0.7rem 1rem;
    border-radius: 6px;
    margin-bottom: 0.4rem;
    border-left: 3px solid var(--accent);
  }
  .bet-card.resolved { border-left-color: #4caf50; opacity: 0.7; }

  .bet-info { display: flex; flex-direction: column; gap: 0.2rem; }
  .bet-info strong { font-size: 0.95rem; color: var(--text-primary); }
  .meta { font-size: 0.8rem; color: var(--text-secondary); }
  .winner-label { font-size: 0.85rem; font-weight: 600; color: #4caf50; margin-top: 0.2rem; }

  .resolve-btns { display: flex; gap: 0.4rem; margin-top: 0.5rem; }
  .win-btn, .lose-btn {
    padding: 0.35rem 0.7rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
  }
  .win-btn { background: #4caf50; color: white; }
  .lose-btn { background: var(--accent); color: white; }
  .win-btn:hover { background: #43a047; }
  .lose-btn:hover { opacity: 0.85; }
</style>
