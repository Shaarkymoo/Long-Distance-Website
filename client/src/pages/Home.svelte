<script>
  import { currentUser } from '../lib/stores.js';

  const items = [
    { page: 'movies', label: 'Movies', icon: '🎬' },
    { page: 'music', label: 'Music', icon: '🎵' },
    { page: 'books', label: 'Books', icon: '📚' },
    { page: 'games', label: 'Games', icon: '🎮' },
    { page: 'conversations', label: 'Conversations', icon: '🎯' },
    { page: 'predictions', label: 'Predictions', icon: '🔮' },
    { page: 'quizzes', label: 'Quizzes', icon: '📋' },
    { page: 'guess', label: 'Guess', icon: '🔍' },
    { page: 'puzzles', label: 'Puzzles', icon: '🧩' },
    { page: 'light', label: 'Light', icon: '💡' },
    { page: 'ai-adventures', label: 'AI Adventures', icon: '🤖' },
    { page: 'whiteboard', label: 'Whiteboard', icon: '🖍️' },
  ];

  function navigate(page) {
    history.pushState({}, '', '/' + page);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
</script>

<div class="home">
  <header class="hero">
    <h1>Our Website</h1>
    {#if $currentUser?.displayName}
      <p class="greeting">Welcome back, {$currentUser.displayName}</p>
    {/if}
  </header>

  <div class="grid">
    {#each items as item}
      <button class="card" on:click={() => navigate(item.page)}>
        <span class="card-icon">{item.icon}</span>
        <span class="card-label">{item.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .home {
    min-height: 100%;
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--bg-elevated);
  }

  .hero {
    text-align: center;
    margin-bottom: 48px;
  }

  .hero h1 {
    font-size: 2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  .greeting {
    color: var(--text-secondary);
    font-size: 1.05rem;
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    width: 100%;
    max-width: 720px;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    cursor: pointer;
    transition: all 150ms ease;
    font-family: inherit;
    color: var(--text-primary);
  }

  .card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }

  .card:active {
    transform: scale(0.97);
  }

  .card-icon {
    font-size: 1.6rem;
  }

  .card-label {
    font-size: 0.85rem;
    font-weight: 500;
  }
</style>
