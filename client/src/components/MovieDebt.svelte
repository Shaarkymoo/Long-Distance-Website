<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let debt = null;
  let loading = true;

  onMount(async () => {
    try {
      debt = await api.get('/movies/debt');
    } catch (e) {
      // silent
    }
    loading = false;
  });
</script>

<div class="debt-card">
  {#if loading}
    <p class="loading">Loading debt...</p>
  {:else if debt}
    {#if debt.settled}
      <p class="settled">Movie debt: settled! 🎉</p>
    {:else if debt.debtor && debt.creditor}
      <p class="owed">
        <strong>{debt.debtor.name}</strong> owes <strong>{debt.creditor.name}</strong>
        <span class="amount">{debt.amount} movie{debt.amount !== 1 ? 's' : ''}</span>
      </p>
    {/if}
    <div class="counts">
      {#each debt.counts as c}
        <span class="count">{c.name}: {c.watched} watched</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .debt-card {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    margin-bottom: 1.5rem;
  }
  .settled {
    font-size: 1.1rem;
    margin: 0;
    text-align: center;
  }
  .owed {
    font-size: 1rem;
    margin: 0 0 0.3rem 0;
    text-align: center;
  }
  .amount {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    margin-top: 0.3rem;
  }
  .counts {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    opacity: 0.9;
  }
  .loading {
    text-align: center;
    margin: 0;
    opacity: 0.8;
  }
</style>
