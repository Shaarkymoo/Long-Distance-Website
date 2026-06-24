<script>
  import { onMount } from 'svelte';
  import { currentUser } from '../lib/stores.js';

  let mode = 'login'; // 'login' | 'setup'
  let checking = true;

  // Login fields
  let loginUsername = '';
  let loginPassword = '';
  let loginError = '';
  let loggingIn = false;

  // Setup fields
  let setupUsername1 = '';
  let setupUsername2 = '';
  let setupPassword = '';
  let setupConfirm = '';
  let setupError = '';
  let settingUp = false;

  onMount(async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (!data.hasUsers) {
        mode = 'setup';
      }
    } catch (e) {
      // If server is down, default to login
    }
    checking = false;
  });

  async function handleLogin(e) {
    e.preventDefault();
    loginError = '';
    loggingIn = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      if (!res.ok) {
        const data = await res.json();
        loginError = data.error || 'Invalid credentials';
        loggingIn = false;
        return;
      }
      const data = await res.json();
      localStorage.setItem('token', data.token);
      currentUser.set(data.user);
    } catch {
      loginError = 'Connection error';
    }
    loggingIn = false;
  }

  async function handleSetup(e) {
    e.preventDefault();
    setupError = '';

    if (!setupUsername1.trim() || !setupUsername2.trim()) {
      setupError = 'Both usernames are required';
      return;
    }
    if (setupUsername1.trim() === setupUsername2.trim()) {
      setupError = 'Usernames must be different';
      return;
    }
    if (!setupPassword || setupPassword.length < 4) {
      setupError = 'Password must be at least 4 characters';
      return;
    }
    if (setupPassword !== setupConfirm) {
      setupError = 'Passwords do not match';
      return;
    }

    settingUp = true;
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username1: setupUsername1.trim(),
          username2: setupUsername2.trim(),
          password: setupPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setupError = data.error || 'Setup failed';
        settingUp = false;
        return;
      }

      // Switch to login and pre-fill
      mode = 'login';
      loginUsername = setupUsername1.trim();
      loginPassword = setupPassword;
      setupUsername1 = '';
      setupUsername2 = '';
      setupPassword = '';
      setupConfirm = '';
    } catch {
      setupError = 'Connection error';
    }
    settingUp = false;
  }

  function switchMode() {
    mode = mode === 'login' ? 'setup' : 'login';
    loginError = '';
    setupError = '';
  }
</script>

<div class="login-page">
  <div class="login-card">
    {#if checking}
      <h1>Our Website</h1>
      <p class="subtitle">Loading...</p>
    {:else if mode === 'login'}
      <h1>Our Website</h1>
      <p class="subtitle">Sign in to continue</p>
      <form on:submit={handleLogin}>
        <input bind:value={loginUsername} placeholder="Username" type="text" />
        <input bind:value={loginPassword} placeholder="Password" type="password" />
        {#if loginError}
          <p class="error">{loginError}</p>
        {/if}
        <button type="submit" disabled={loggingIn}>
          {loggingIn ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p class="switch-mode">
        First time?
        <button class="link-btn" on:click={switchMode}>Set up accounts</button>
      </p>
    {:else}
      <h1>Our Website</h1>
      <p class="subtitle">Create accounts for you and your partner</p>
      <form on:submit={handleSetup}>
        <input bind:value={setupUsername1} placeholder="Your username" type="text" />
        <input bind:value={setupUsername2} placeholder="Partner's username" type="text" />
        <input bind:value={setupPassword} placeholder="Shared password" type="password" />
        <input bind:value={setupConfirm} placeholder="Confirm password" type="password" />
        {#if setupError}
          <p class="error">{setupError}</p>
        {/if}
        <button type="submit" disabled={settingUp}>
          {settingUp ? 'Creating...' : 'Create Accounts'}
        </button>
      </form>
      <p class="switch-mode">
        Already have accounts?
        <button class="link-btn" on:click={switchMode}>Sign in</button>
      </p>
    {/if}
  </div>
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: linear-gradient(135deg, var(--carbon-black), var(--prussian-blue), var(--deep-twilight));
  }
  .login-card {
    background: var(--bg-surface);
    padding: 2.5rem;
    border-radius: 12px;
    width: 360px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    text-align: center;
  }
  .login-card h1 {
    color: var(--accent);
    margin: 0 0 0.3rem;
    font-size: 1.8rem;
  }
  .subtitle {
    color: var(--text-secondary);
    margin: 0 0 2rem;
    font-size: 0.9rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  input {
    padding: 0.8rem;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: 1rem;
    font-family: inherit;
  }
  input::placeholder {
    color: var(--text-secondary);
  }
  button[type="submit"] {
    padding: 0.8rem;
    border-radius: 6px;
    border: none;
    background: var(--accent);
    color: white;
    font-size: 1rem;
    cursor: pointer;
    font-weight: 600;
    font-family: inherit;
  }
  button[type="submit"]:hover {
    background: var(--accent-hover);
  }
  button[type="submit"]:disabled {
    background: var(--text-secondary);
    cursor: not-allowed;
  }
  .error {
    color: var(--accent);
    font-size: 0.85rem;
    margin: 0;
  }
  .switch-mode {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 1.25rem 0 0;
  }
  .link-btn {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 0.85rem;
    font-family: inherit;
    text-decoration: underline;
    padding: 0;
  }
  .link-btn:hover {
    color: var(--accent-hover);
  }
</style>
