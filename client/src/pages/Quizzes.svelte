<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';
  import { currentUser } from '../lib/stores.js';

  let entries = [];
  let total = 0;
  let page = 1;
  let totalPages = 0;
  const limit = 20;
  let sort = 'asc'; // asc = oldest first (default), desc = newest first
  let loading = true;
  let loadingMore = false;
  let myName = 'Me';
  let partnerName = 'Partner';

  // Add / Edit state
  let showForm = false;
  let editingId = null;
  let formTitle = '';
  let formMyResult = '';
  let formPartnerResult = '';
  let saving = false;

  onMount(async () => {
    await loadPage(1, true);
  });

  async function loadPage(p, replace = false) {
    if (replace) loading = true;
    else loadingMore = true;
    try {
      const data = await api.get(`/quizzes?sort=${sort}&page=${p}&limit=${limit}`);
      if (replace) {
        entries = data.entries || [];
      } else {
        entries = [...entries, ...(data.entries || [])];
      }
      total = data.total || 0;
      page = data.page || 1;
      totalPages = data.totalPages || 0;
      myName = data.myName || 'Me';
      partnerName = data.partnerName || 'Partner';
    } catch (e) { console.error(e); }
    loading = false;
    loadingMore = false;
  }

  function getMyResult(entry) {
    if (entry.addedBy === $currentUser?.id) return entry.myResult;
    return entry.partnerResult;
  }

  function getPartnerResult(entry) {
    if (entry.addedBy === $currentUser?.id) return entry.partnerResult;
    return entry.myResult;
  }

  function toggleSort() {
    sort = sort === 'asc' ? 'desc' : 'asc';
    loadPage(1, true);
  }

  function loadMore() {
    if (page < totalPages && !loadingMore) {
      loadPage(page + 1, false);
    }
  }

  function openAdd() {
    editingId = null;
    formTitle = '';
    formMyResult = '';
    formPartnerResult = '';
    showForm = true;
  }

  function openEdit(entry) {
    editingId = entry._id;
    formTitle = entry.quizTitle;
    formMyResult = getMyResult(entry);
    formPartnerResult = getPartnerResult(entry);
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editingId = null;
  }

  async function saveEntry() {
    if (!formTitle.trim()) return;
    saving = true;
    try {
      if (editingId) {
        await api.patch(`/quizzes/${editingId}`, {
          quizTitle: formTitle.trim(),
          myResult: formMyResult,
          partnerResult: formPartnerResult,
        });
      } else {
        await api.post('/quizzes', {
          quizTitle: formTitle.trim(),
          myResult: formMyResult,
          partnerResult: formPartnerResult,
        });
      }
      closeForm();
      await loadPage(1, true);
    } catch (e) { console.error(e); }
    saving = false;
  }

  async function deleteEntry(id) {
    if (!confirm('Delete this quiz entry?')) return;
    try {
      await api.del(`/quizzes/${id}`);
      await loadPage(1, true);
    } catch (e) { console.error(e); }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
</script>

<div class="quizzes-page">
  <!-- Header -->
  <div class="header">
    <h1>Quiz Log</h1>
    <p class="subtitle">Every quiz you've taken, side by side</p>
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <button class="sort-btn" on:click={toggleSort} title="Toggle sort order">
      {#if sort === 'asc'}
        ↑ Oldest first
      {:else}
        ↓ Newest first
      {/if}
    </button>
    <button class="add-btn" on:click={openAdd}>+ Add Quiz</button>
  </div>

  <!-- Empty state -->
  {#if !loading && entries.length === 0}
    <div class="empty-state">
      <p>No quiz entries yet.</p>
      <button class="add-btn big" on:click={openAdd}>+ Add Your First Quiz</button>
    </div>
  {/if}

  <!-- Three-column grid -->
  {#if loading}
    <p class="loading">Loading...</p>
  {:else if entries.length > 0}
    <div class="grid">
      <!-- Header row -->
      <div class="grid-header">
        <div class="col col-left">{myName}</div>
        <div class="col col-center">Quiz Title</div>
        <div class="col col-right">{partnerName}</div>
      </div>

      <!-- Data rows -->
      {#each entries as entry}
        <div class="grid-row">
          <div class="col col-left">{getMyResult(entry)}</div>
          <div class="col col-center">
            <span class="title">{entry.quizTitle}</span>
            <span class="date">{formatDate(entry.createdAt)}</span>
          </div>
          <div class="col col-right">{getPartnerResult(entry)}</div>
          <div class="row-actions">
            <button class="icon-btn" on:click={() => openEdit(entry)} title="Edit">✎</button>
            <button class="icon-btn" on:click={() => deleteEntry(entry._id)} title="Delete">✕</button>
          </div>
        </div>
      {/each}
    </div>

    <!-- Load more -->
    {#if page < totalPages}
      <div class="load-more">
        <button on:click={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : `Load More (${entries.length} of ${total})`}
        </button>
      </div>
    {:else if total > 0}
      <div class="load-more done">
        <span>Showing all {total} quizzes</span>
      </div>
    {/if}
  {/if}
</div>

<!-- Add / Edit modal -->
{#if showForm}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="modal-overlay" on:click={closeForm} role="dialog">
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="modal" on:click|stopPropagation>
      <h3>{editingId ? 'Edit Quiz Entry' : 'Add Quiz Entry'}</h3>
      <div class="form">
        <label>
          Quiz Title <span class="req">*</span>
          <input bind:value={formTitle} placeholder="e.g. Which HP House Are You?" />
        </label>
        <label>
          My Result
          <textarea bind:value={formMyResult} placeholder="What did you get?" rows="3"></textarea>
        </label>
        <label>
          {partnerName}'s Result
          <textarea bind:value={formPartnerResult} placeholder="What did they get?" rows="3"></textarea>
        </label>
      </div>
      <div class="modal-actions">
        <button class="cancel-btn" on:click={closeForm}>Cancel</button>
        <button class="save-btn" on:click={saveEntry} disabled={!formTitle.trim() || saving}>
          {saving ? 'Saving...' : editingId ? 'Update' : 'Add Entry'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .quizzes-page { max-width: 960px; margin: 0 auto; padding: 40px 24px; }

  .header h1 { font-size: 1.8rem; color: var(--text-primary); margin-bottom: 0; }
  .subtitle { color: var(--text-secondary); margin-top: 0.3rem; margin-bottom: 1.5rem; }

  /* Toolbar */
  .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .sort-btn { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
  .sort-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .add-btn { padding: 0.5rem 1rem; background: var(--bg-surface); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
  .add-btn:hover { filter: brightness(1.15); }
  .add-btn.big { padding: 0.8rem 1.5rem; font-size: 1rem; }

  .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-secondary); }
  .empty-state p { margin-bottom: 1rem; }
  .loading { color: var(--text-secondary); text-align: center; padding: 2rem; }

  /* Grid */
  .grid { display: flex; flex-direction: column; }
  .grid-header { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; border-bottom: 2px solid var(--border-color); padding: 0 2.5rem 0.5rem 0; }
  .grid-header .col { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
  .grid-header .col-left { text-align: left; }
  .grid-header .col-center { text-align: center; min-width: 140px; }
  .grid-header .col-right { text-align: right; }

  .grid-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; padding: 1rem 2.5rem 1rem 0; border-bottom: 1px solid var(--border-color); position: relative; align-items: start; }
  .grid-row:hover { background: var(--bg-elevated); }
  .grid-row:hover .row-actions { opacity: 1; }

  .col { font-size: 0.92rem; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .col-center { text-align: center; min-width: 140px; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
  .col-left { text-align: left; padding-right: 1rem; }
  .col-right { text-align: right; padding-left: 1rem; }

  .title { font-weight: 600; font-size: 0.95rem; }
  .date { font-size: 0.75rem; color: var(--text-disabled); white-space: nowrap; }

  .row-actions { position: absolute; right: 0; top: 0.5rem; display: flex; gap: 0.2rem; opacity: 0; transition: opacity 0.15s; }
  .icon-btn { background: none; border: none; cursor: pointer; padding: 0.2rem 0.35rem; border-radius: 4px; color: var(--text-secondary); font-size: 0.9rem; }
  .icon-btn:hover { background: var(--bg-card); color: var(--text-primary); }

  /* Load more */
  .load-more { text-align: center; padding: 1.5rem; }
  .load-more button { padding: 0.5rem 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem; }
  .load-more button:hover:not(:disabled) { background: var(--bg-elevated); color: var(--text-primary); }
  .load-more button:disabled { opacity: 0.5; cursor: default; }
  .load-more.done span { font-size: 0.85rem; color: var(--text-disabled); }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
  .modal { background: var(--bg-card); border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
  .modal h3 { margin: 0 0 1rem; }
  .form { display: flex; flex-direction: column; gap: 0.8rem; }
  .form label { font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.3rem; }
  .form input, .form textarea { padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-main); color: var(--text-primary); font-size: 0.9rem; font-family: inherit; }
  .form textarea { resize: vertical; }
  .req { color: var(--accent); }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.2rem; }
  .cancel-btn { padding: 0.5rem 1rem; background: none; border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-secondary); cursor: pointer; }
  .save-btn { padding: 0.5rem 1.2rem; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; }
  .save-btn:disabled { opacity: 0.5; cursor: default; }
  .save-btn:hover:not(:disabled) { filter: brightness(1.15); }
</style>
