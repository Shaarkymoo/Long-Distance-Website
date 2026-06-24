<script>
  import { onMount } from 'svelte';
  import { currentUser, isLoggedIn } from './lib/stores.js';
  import api from './lib/api.js';
  import Login from './pages/Login.svelte';
  import Home from './pages/Home.svelte';
  import Notebook from './pages/Notebook.svelte';

  import Light from './pages/Light.svelte';
  import Movies from './pages/Movies.svelte';
  import Messages from './pages/Messages.svelte';
  import Conversations from './pages/Conversations.svelte';
  import Challenges from './pages/Challenges.svelte';
  import Predictions from './pages/Predictions.svelte';
  import Quizzes from './pages/Quizzes.svelte';
  import Games from './pages/Games.svelte';
  import Trivia from './pages/Trivia.svelte';
  import GuessObject from './pages/GuessObject.svelte';
  import DailyPuzzles from './pages/DailyPuzzles.svelte';
  import Music from './pages/Music.svelte';
  import Books from './pages/Books.svelte';
  import AiAdventures from './pages/AiAdventures.svelte';
  import Whiteboard from './pages/Whiteboard.svelte';

  let currentPage = 'home';
  const pageMap = { home: Home, notebook: Notebook, light: Light, movies: Movies, messages: Messages, conversations: Conversations, challenges: Challenges, predictions: Predictions, quizzes: Quizzes, games: Games, trivia: Trivia, guess: GuessObject, puzzles: DailyPuzzles, music: Music, books: Books, whiteboard: Whiteboard, 'ai-adventures': AiAdventures, 'ai-adventures/new': AiAdventures };

  function navigate(page) {
    if (page === 'home') {
      history.pushState({}, '', '/');
    } else {
      history.pushState({}, '', '/' + page);
    }
    currentPage = page;
  }

  function resolvePath() {
    const path = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '') || 'home';
    if (path.startsWith('ai-adventures')) {
      currentPage = 'ai-adventures';
    } else if (pageMap[path]) {
      currentPage = path;
    } else {
      currentPage = 'home';
    }
  }

  onMount(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const data = await api.get('/auth/me');
        currentUser.set(data.user);
      } catch {
        localStorage.removeItem('token');
      }
    }
    resolvePath();
    window.addEventListener('popstate', resolvePath);
    return () => window.removeEventListener('popstate', resolvePath);
  });

  function handleLogout() {
    localStorage.removeItem('token');
    currentUser.set(null);
    navigate('home');
  }
</script>

{#if !$isLoggedIn}
  <Login />
{:else}
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-left">
        {#if currentPage !== 'home'}
          <button class="back-btn" on:click={() => navigate('home')}>← Back</button>
        {/if}
      </div>
      <span class="topbar-title">Our Website</span>
      <div class="topbar-right">
        <span class="user-name">{$currentUser?.displayName || $currentUser?.username}</span>
        <button class="logout-btn" on:click={handleLogout}>Logout</button>
      </div>
    </header>
    <main class="content">
      <svelte:component this={pageMap[currentPage]} />
    </main>
  </div>
{/if}

<style>
  :global(:root) {
    --carbon-black: #181819;
    --yale-blue: #143e69;
    --midnight-blue: #1f1f7d;
    --deep-twilight: #0e0a69;
    --prussian-blue: #0d1a41;
    --bg-page: var(--carbon-black);
    --bg-surface: var(--prussian-blue);
    --bg-card: var(--yale-blue);
    --bg-elevated: var(--midnight-blue);
    --border-color: var(--deep-twilight);
    --text-primary: #e8e8f0;
    --text-secondary: #9098b0;
    --accent: #e94560;
    --accent-hover: #d63851;
    --radius: 8px;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    background: var(--bg-page);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  :global(h1) {
    color: var(--text-primary) !important;
  }
  :global(h2), :global(h3), :global(h4) {
    color: var(--text-primary) !important;
  }
  :global(p) {
    color: var(--text-primary);
  }
  :global(input), :global(textarea), :global(select) {
    background: var(--bg-card) !important;
    color: var(--text-primary) !important;
    border-color: var(--border-color) !important;
  }
  :global(input::placeholder), :global(textarea::placeholder) {
    color: var(--text-secondary) !important;
  }

  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    height: 52px;
    background: var(--bg-surface);
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .topbar-left {
    width: 80px;
  }

  .topbar-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--accent);
  }

  .topbar-right {
    width: 80px;
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: flex-end;
  }

  .back-btn {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 4px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-family: inherit;
  }

  .back-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--text-secondary);
  }

  .user-name {
    font-size: 0.8rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .logout-btn {
    background: none;
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 3px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    font-family: inherit;
    white-space: nowrap;
  }

  .logout-btn:hover {
    background: var(--accent);
    color: white;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-page);
  }
</style>
