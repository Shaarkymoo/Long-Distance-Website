<script>
  import { onMount, onDestroy } from 'svelte';
  import api from '../lib/api.js';

  let loading = true;
  let book = null;
  let currentPage = 0;
  let totalPages = 0;
  let pageContent = '';
  let pageLoading = false;
  let goToInput = '';
  let error = '';
  let uploading = false;
  let counterpart = null;

  onMount(async () => {
    await loadBook();
  });

  async function loadBook() {
    loading = true;
    error = '';
    try {
      const data = await api.get('/books');
      if (data.book) {
        book = data.book;
        totalPages = data.book.totalPages;
        currentPage = data.progress?.currentPage ?? 0;
        counterpart = data.counterpart || null;
        await loadPage(currentPage);
      } else {
        book = null;
        counterpart = null;
      }
    } catch (e) {
      error = 'Failed to load book';
    }
    loading = false;
  }

  async function loadPage(pageNum) {
    if (!book) return;
    pageLoading = true;
    error = '';
    try {
      const data = await api.get(`/books/page/${pageNum}`);
      pageContent = data.content;
      currentPage = data.pageNumber;
      totalPages = data.totalPages;
      // Save progress (fire-and-forget)
      api.put('/books/progress', { currentPage }).catch(() => {});
    } catch (e) {
      pageContent = '';
      error = 'Failed to load page';
    }
    pageLoading = false;
  }

  function prevPage() {
    if (currentPage > 0) loadPage(currentPage - 1);
  }

  function nextPage() {
    if (currentPage < totalPages - 1) loadPage(currentPage + 1);
  }

  function goToPage() {
    const num = parseInt(goToInput, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      loadPage(num - 1); // convert 1-based input to 0-based
      goToInput = '';
    }
  }

  function handleGoKeydown(e) {
    if (e.key === 'Enter') goToPage();
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploading = true;
    error = '';
    try {
      const formData = new FormData();
      formData.append('epub', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/books/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      await loadBook();
    } catch (e) {
      error = e.message;
    }
    uploading = false;
    // Reset file input so re-uploading the same file triggers change
    e.target.value = '';
  }

  async function handleDelete() {
    if (!confirm('Delete this book? All reading progress will be lost.')) return;
    try {
      await api.del('/books');
      book = null;
      currentPage = 0;
      pageContent = '';
      error = '';
    } catch (e) {
      error = 'Failed to delete book';
    }
  }
</script>

<div class="books-page">
  {#if loading}
    <p class="status">Loading...</p>

  {:else if !book}
    <!-- No book: show upload -->
    <div class="upload-area">
      <h1>Upload a Book</h1>
      <p class="subtitle">Only one book at a time, shared between you both.</p>
      <label class="upload-btn" class:uploading>
        {uploading ? 'Uploading...' : '📂 Choose EPUB File'}
        <input type="file" accept=".epub,application/epub+zip" on:change={handleUpload} disabled={uploading} />
      </label>
      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

  {:else}
    <!-- Reader view -->
    <div class="reader">
      <header class="reader-header">
        <div class="book-meta">
          <h1>{book.title}</h1>
          <span class="author">by {book.author}</span>
          {#if counterpart}
            <span class="counterpart">{counterpart.displayName} is on page {counterpart.currentPage + 1}</span>
          {/if}
        </div>
        <button class="delete-btn" on:click={handleDelete} title="Delete book">🗑</button>
      </header>

      <div class="page-content">
        {#if pageLoading}
          <p class="status">Loading page...</p>
        {:else if pageContent}
          <div class="page-text">{pageContent}</div>
        {:else}
          <p class="status empty">No content</p>
        {/if}
      </div>

      <nav class="page-nav">
        <button class="nav-btn" on:click={prevPage} disabled={currentPage === 0}>← Prev</button>

        <div class="page-indicator">
          Page <strong>{currentPage + 1}</strong> / {totalPages}
        </div>

        <div class="go-to">
          <input
            type="number"
            bind:value={goToInput}
            on:keydown={handleGoKeydown}
            min="1"
            max={totalPages}
            placeholder="#"
            class="go-input"
          />
          <button class="go-btn" on:click={goToPage}>Go</button>
        </div>

        <button class="nav-btn" on:click={nextPage} disabled={currentPage >= totalPages - 1}>Next →</button>
      </nav>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .books-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px;
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  .status {
    color: var(--text-secondary);
    text-align: center;
    padding: 40px 0;
  }
  .status.empty {
    color: var(--text-secondary);
  }
  .error {
    color: var(--accent);
    font-size: 0.9rem;
    text-align: center;
    margin-top: 12px;
  }

  /* ---- Upload ---- */
  .upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
    gap: 16px;
  }

  .upload-area h1 {
    font-size: 1.8rem;
    color: var(--text-primary);
    margin: 0;
  }

  .subtitle {
    color: var(--text-secondary);
    margin: 0;
    font-size: 0.95rem;
  }

  .upload-btn {
    display: inline-block;
    padding: 14px 28px;
    background: var(--bg-surface);
    color: white;
    border-radius: 10px;
    cursor: pointer;
    font-size: 1rem;
    transition: background 150ms;
  }

  .upload-btn:hover {
    background: var(--bg-elevated);
  }

  .upload-btn.uploading {
    opacity: 0.6;
    pointer-events: none;
  }

  .upload-btn input {
    display: none;
  }

  /* ---- Reader ---- */
  .reader {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 16px;
  }

  .reader-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .book-meta h1 {
    margin: 0;
    font-size: 1.4rem;
    color: var(--text-primary);
  }

  .author {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .counterpart {
    display: block;
    color: var(--accent);
    font-size: 0.85rem;
    margin-top: 4px;
  }

  .delete-btn {
    background: none;
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    flex-shrink: 0;
    transition: all 150ms;
  }

  .delete-btn:hover {
    background: var(--accent);
    color: white;
  }

  /* ---- Page content ---- */
  .page-content {
    flex: 1;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 28px 32px;
    overflow-y: auto;
    min-height: 300px;
    max-height: 60vh;
    line-height: 1.7;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .page-text {
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* ---- Navigation ---- */
  .page-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 0;
  }

  .nav-btn {
    padding: 8px 18px;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
    color: var(--text-primary);
    transition: all 150ms;
  }

  .nav-btn:hover:not(:disabled) {
    border-color: var(--text-primary);
    background: var(--bg-elevated);
  }

  .nav-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .page-indicator {
    font-size: 0.9rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .go-to {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .go-input {
    width: 50px;
    padding: 6px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.85rem;
    text-align: center;
  }

  .go-btn {
    padding: 6px 12px;
    background: var(--bg-surface);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    font-family: inherit;
  }

  .go-btn:hover {
    background: var(--bg-elevated);
  }
</style>
