<script>
  import { onMount, onDestroy } from 'svelte';
  import { currentUser } from '../lib/stores.js';
  import api from '../lib/api.js';

  // --- State ---
  let view = 'list';
  let currentAdventureId = null;
  let adventures = [];
  let loading = true;
  let error = '';

  // Setup form
  let form = {
    title: '',
    persona: '',
    environment: '',
    user1Profile: '',
    user2Profile: '',
    user2Id: '',
    maxRounds: 30,
  };
  let users = [];
  let formError = '';
  let creating = false;

  // Room
  let adventure = null;
  let messageText = '';
  let sending = false;
  let chatContainer = null;
  let pollTimer = null;

  $: myId = $currentUser?.id;

  // --- Derived ---
  $: myRole = adventure ? (
    adventure.user1?._id === myId || adventure.user1?.id === myId ? 'user1'
    : adventure.user2?._id === myId || adventure.user2?.id === myId ? 'user2'
    : null
  ) : null;

  $: isMyTurn = adventure?.status === 'active' && adventure?.currentTurn === myRole;
  $: partnerName = adventure ? (
    myRole === 'user1'
      ? (adventure.user2?.displayName || adventure.user2?.username || 'Partner')
      : (adventure.user1?.displayName || adventure.user1?.username || 'Partner')
  ) : '';

  onMount(async () => {
    // Load users for the player select
    try {
      if ($currentUser?.id) {
        // Get both users via couple info from conversations endpoint
        const allUsers = await api.get('/conversations/current');
        if (allUsers.couple) {
          users = allUsers.couple;
          // Pre-select the other user
          const other = users.find(u => u.id !== $currentUser.id);
          if (other) form.user2Id = other.id;
        }
      }
    } catch (e) {
      // fallback: just the current user
      users = [];
    }

    resolveView();
    window.addEventListener('popstate', resolveView);
  });

  onDestroy(() => {
    window.removeEventListener('popstate', resolveView);
    if (pollTimer) clearInterval(pollTimer);
  });

  function resolveView() {
    const path = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (path === 'ai-adventures/new') {
      view = 'setup';
    } else if (path.startsWith('ai-adventures/')) {
      const segments = path.split('/');
      if (segments.length >= 2 && segments[1]) {
        view = 'room';
        currentAdventureId = segments[1];
        loadAdventure(segments[1]);
        startPolling(segments[1]);
      }
    } else {
      view = 'list';
      loadList();
    }
  }

  function navigate(page) {
    history.pushState({}, '', '/' + page);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  // --- List ---
  async function loadList() {
    loading = true;
    try {
      const data = await api.get('/ai-adventures');
      adventures = data.adventures;
    } catch (e) {
      error = 'Failed to load adventures';
    }
    loading = false;
  }

  function viewAdventure(id) {
    navigate('ai-adventures/' + id);
  }

  function newAdventure() {
    navigate('ai-adventures/new');
  }

  // --- Setup ---
  async function handleCreate(e) {
    e.preventDefault();
    if (!form.persona.trim()) { formError = 'AI Persona is required'; return; }
    if (!form.environment.trim()) { formError = 'Environment is required'; return; }
    if (!form.user2Id) { formError = 'Select the other player'; return; }

    creating = true;
    formError = '';
    try {
      const data = await api.post('/ai-adventures', form);
      navigate('ai-adventures/' + data.adventure._id);
    } catch (e) {
      formError = e.error || 'Failed to create adventure';
    }
    creating = false;
  }

  // --- Room ---
  async function loadAdventure(id) {
    try {
      const data = await api.get('/ai-adventures/' + id);
      adventure = data.adventure;
    } catch (e) {
      error = 'Failed to load adventure';
    }
  }

  function startPolling(id) {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      if (view !== 'room') { clearInterval(pollTimer); return; }
      try {
        const data = await api.get('/ai-adventures/' + id);
        if (data.adventure) {
          const oldLen = adventure?.history?.length || 0;
          adventure = data.adventure;
          // Auto-scroll if new messages
          if (data.adventure.history?.length > oldLen) {
            setTimeout(scrollToBottom, 100);
          }
        }
      } catch (e) {
        // ignore poll errors
      }
    }, 3000);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!messageText.trim() || sending) return;
    sending = true;
    try {
      const data = await api.post('/ai-adventures/' + currentAdventureId + '/act', { message: messageText.trim() });
      messageText = '';
      adventure = data.adventure;
      setTimeout(scrollToBottom, 200);
    } catch (e) {
      error = e.error || 'Failed to send message';
    }
    sending = false;
  }

  async function endAdventure() {
    if (!confirm('End this adventure? This cannot be undone.')) return;
    try {
      const data = await api.post('/ai-adventures/' + currentAdventureId + '/end');
      adventure = data.adventure;
    } catch (e) {
      error = e.error || 'Failed to end adventure';
    }
  }

  async function deleteAdventure() {
    if (!confirm('Delete this adventure permanently?')) return;
    try {
      await api.del('/ai-adventures/' + currentAdventureId);
      if (pollTimer) clearInterval(pollTimer);
      navigate('ai-adventures');
    } catch (e) {
      error = e.error || 'Failed to delete adventure';
    }
  }

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
</script>

<div class="page">
  {#if view === 'list'}
    <!-- ======== LIST VIEW ======== -->
    <div class="list-page">
      <div class="list-header">
        <h1>AI Adventures</h1>
        <button class="btn-primary" on:click={newAdventure}>+ New Adventure</button>
      </div>

      {#if loading}
        <p class="status-msg">Loading...</p>
      {:else if error}
        <p class="error-msg">{error}</p>
      {:else if adventures.length === 0}
        <div class="empty-state">
          <p>No adventures yet.</p>
          <p>Create one and let the AI take you on a journey!</p>
        </div>
      {:else}
        <div class="adventure-cards">
          <!-- Active -->
          {#each adventures.filter(a => a.status === 'active') as adv}
            <button class="adventure-card active" on:click={() => viewAdventure(adv._id)}>
              <h3>{adv.title || 'Untitled Adventure'}</h3>
              <p class="card-meta">Round {adv.currentRound}/{adv.maxRounds} · Active</p>
              <p class="card-preview">{adv.persona.slice(0, 100)}{adv.persona.length > 100 ? '...' : ''}</p>
            </button>
          {/each}

          {#if adventures.filter(a => a.status === 'active').length > 0 && adventures.filter(a => a.status === 'concluded').length > 0}
            <hr class="divider">
          {/if}

          <!-- Concluded -->
          {#each adventures.filter(a => a.status === 'concluded') as adv}
            <button class="adventure-card concluded" on:click={() => viewAdventure(adv._id)}>
              <h3>{adv.title || 'Untitled Adventure'}</h3>
              <p class="card-meta">Concluded · {adv.currentRound} rounds</p>
              <p class="card-preview">{adv.persona.slice(0, 100)}{adv.persona.length > 100 ? '...' : ''}</p>
            </button>
          {/each}
        </div>
      {/if}
    </div>

  {:else if view === 'setup'}
    <!-- ======== SETUP VIEW ======== -->
    <div class="setup-page">
      <h1>New Adventure</h1>
      <form on:submit={handleCreate} class="setup-form">
        <label>
          Adventure Title <em>(optional)</em>
          <input type="text" bind:value={form.title} placeholder="The Great Debate" />
        </label>
        <label>
          AI Persona / System
          <textarea bind:value={form.persona} rows="3" placeholder="You are a stern judge named Justice..." required></textarea>
        </label>
        <label>
          Environment / Setting
          <textarea bind:value={form.environment} rows="3" placeholder="A courtroom in session..." required></textarea>
        </label>
        <label>
          Your Character
          <textarea bind:value={form.user1Profile} rows="2" placeholder="I am a nervous first-time prosecutor..."></textarea>
        </label>
        <label>
          Their Character
          <textarea bind:value={form.user2Profile} rows="2" placeholder="I am a slick defense attorney..."></textarea>
        </label>
        <label>
          Turn Limit
          <select bind:value={form.maxRounds}>
            <option value={10}>10 rounds</option>
            <option value={20}>20 rounds</option>
            <option value={30}>30 rounds</option>
            <option value={50}>50 rounds</option>
            <option value={100}>100 rounds</option>
          </select>
        </label>
        <label>
          Playing with
          <select bind:value={form.user2Id} required>
            <option value="">-- Select --</option>
            {#each users.filter(u => u.id !== $currentUser?.id) as user}
              <option value={user.id}>{user.displayName || user.username}</option>
            {/each}
          </select>
        </label>
        {#if formError}
          <p class="form-error">{formError}</p>
        {/if}
        <div class="form-actions">
          <button type="button" class="btn-secondary" on:click={() => navigate('ai-adventures')}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={creating}>
            {creating ? 'Creating...' : 'Start Adventure'}
          </button>
        </div>
      </form>
    </div>

  {:else if view === 'room'}
    <!-- ======== ROOM VIEW ======== -->
    <div class="room-page">
      <div class="room-header">
        <button class="btn-back" on:click={() => navigate('ai-adventures')}>← Back</button>
        <h2>{adventure?.title || 'Adventure'}</h2>
        {#if adventure?.status === 'active'}
          <button class="btn-end" on:click={endAdventure}>End Adventure</button>
        {:else}
          <button class="btn-del" on:click={deleteAdventure}>Delete</button>
        {/if}
      </div>

      <div class="chat-log" bind:this={chatContainer}>
        {#if adventure}
          {#each adventure.history as msg}
            <div class="message {msg.author}">
              <div class="msg-bubble">
                {#if msg.author === 'ai'}
                  <div class="msg-author">AI</div>
                {/if}
                <div class="msg-content">{msg.content}</div>
                <div class="msg-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          {/each}
        {:else}
          <p class="status-msg">Loading adventure...</p>
        {/if}
      </div>

      {#if adventure?.status === 'active'}
        <div class="input-area">
          {#if isMyTurn}
            <form on:submit={sendMessage} class="message-form">
              <textarea
                bind:value={messageText}
                placeholder="Type your message..."
                rows="2"
                disabled={sending}
              ></textarea>
              <button type="submit" class="btn-send" disabled={sending || !messageText.trim()}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          {:else}
            <p class="waiting">Waiting for {partnerName}...</p>
          {/if}
        </div>
      {/if}

      {#if error}
        <div class="error-bar">{error}</div>
      {/if}

      <div class="status-bar">
        Round {adventure?.currentRound || 0}/{adventure?.maxRounds || '?'} · {adventure?.status === 'active' ? 'Active' : 'Concluded'}
      </div>
    </div>
  {/if}
</div>

<style>
  .page {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* --- List --- */
  .list-page {
    padding: 40px 32px;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
  }

  .list-header h1 {
    margin: 0;
    font-size: 1.8rem;
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

  .adventure-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .adventure-card {
    display: block;
    width: 100%;
    text-align: left;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 18px 20px;
    cursor: pointer;
    transition: all 150ms ease;
    font-family: inherit;
    color: var(--text-primary);
  }

  .adventure-card:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  .adventure-card.active {
    border-left: 4px solid #58D68D;
  }

  .adventure-card.concluded {
    border-left: 4px solid var(--text-secondary);
    opacity: 0.7;
  }

  .adventure-card h3 {
    margin: 0 0 4px;
    font-size: 1.05rem;
  }

  .card-meta {
    margin: 0 0 8px;
    font-size: 0.82rem;
    color: var(--text-secondary);
  }

  .card-preview {
    margin: 0;
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  .divider {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: 4px 0;
  }

  /* --- Setup --- */
  .setup-page {
    padding: 40px 32px;
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .setup-page h1 {
    font-size: 1.8rem;
    margin: 0 0 24px;
  }

  .setup-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .setup-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.88rem;
    font-weight: 500;
  }

  .setup-form label em {
    font-weight: 400;
    color: var(--text-secondary);
    font-size: 0.82rem;
  }

  .setup-form input,
  .setup-form textarea,
  .setup-form select {
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.92rem;
    background: var(--bg-card);
    color: var(--text-primary);
    box-sizing: border-box;
  }

  .setup-form textarea {
    resize: vertical;
  }

  .setup-form select {
    cursor: pointer;
  }

  .form-error {
    color: var(--accent);
    font-size: 0.88rem;
    margin: 0;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
  }

  /* --- Room --- */
  .room-page {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .room-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-surface);
    flex-shrink: 0;
  }

  .room-header h2 {
    margin: 0;
    font-size: 1.1rem;
    text-align: center;
    flex: 1;
  }

  .chat-log {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--bg-page);
  }

  .message {
    display: flex;
  }

  .message.user1 {
    justify-content: flex-start;
  }

  .message.user2 {
    justify-content: flex-end;
  }

  .message.ai {
    justify-content: center;
  }

  .msg-bubble {
    max-width: 70%;
    padding: 12px 16px;
    border-radius: 10px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
  }

  .message.user1 .msg-bubble {
    background: var(--yale-blue);
    border-color: var(--yale-blue);
    border-bottom-left-radius: 4px;
  }

  .message.user2 .msg-bubble {
    background: var(--midnight-blue);
    border-color: var(--midnight-blue);
    border-bottom-right-radius: 4px;
  }

  .message.ai .msg-bubble {
    background: var(--bg-surface);
    border-color: var(--border-color);
    text-align: center;
    max-width: 80%;
  }

  .msg-author {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--accent);
    margin-bottom: 4px;
    font-weight: 600;
  }

  .msg-content {
    font-size: 0.95rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .msg-time {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin-top: 6px;
    text-align: right;
  }

  .input-area {
    border-top: 1px solid var(--border-color);
    padding: 12px 20px;
    background: var(--bg-surface);
    flex-shrink: 0;
  }

  .message-form {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }

  .message-form textarea {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.92rem;
    resize: none;
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .message-form textarea::placeholder {
    color: var(--text-secondary);
  }

  .message-form textarea:disabled {
    opacity: 0.6;
  }

  .waiting {
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
    margin: 0;
    padding: 12px;
  }

  .error-bar {
    background: var(--accent);
    color: white;
    text-align: center;
    padding: 8px;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .status-bar {
    padding: 8px 20px;
    border-top: 1px solid var(--border-color);
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-align: center;
    background: var(--bg-surface);
    flex-shrink: 0;
  }

  /* --- Shared buttons --- */
  .btn-primary {
    background: var(--accent);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.92rem;
    font-family: inherit;
  }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-primary:disabled { background: var(--text-secondary); cursor: not-allowed; }

  .btn-secondary {
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.92rem;
    font-family: inherit;
  }
  .btn-secondary:hover { border-color: var(--text-secondary); }

  .btn-back {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-family: inherit;
  }
  .btn-back:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--text-secondary);
  }

  .btn-end {
    background: none;
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.82rem;
    font-family: inherit;
  }
  .btn-end:hover {
    background: var(--accent);
    color: white;
  }

  .btn-del {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.82rem;
    font-family: inherit;
  }
  .btn-del:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .btn-send {
    background: var(--accent);
    color: white;
    border: none;
    padding: 10px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.92rem;
    font-family: inherit;
    white-space: nowrap;
  }
  .btn-send:hover { background: var(--accent-hover); }
  .btn-send:disabled { background: var(--text-secondary); cursor: not-allowed; }
</style>
