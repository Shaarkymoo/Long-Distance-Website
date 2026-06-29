<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let rounds = [];
  let loading = true;
  let error = '';

  let view = 'list';
  let newQuestion = '';

  let submittingId = null;
  let answerText = '';
  let answerConfirmed = null;
  let judgingId = null;
  let judgingLoading = false;

  let expandedId = null;

  onMount(async () => {
    await loadRounds();
  });

  async function loadRounds() {
    loading = true;
    error = '';
    try {
      const data = await api.get('/ripple');
      rounds = data.rounds || [];
    } catch (e) {
      error = 'Failed to load rounds.';
    }
    loading = false;
  }

  async function createRound() {
    if (!newQuestion.trim()) return;
    try {
      const data = await api.post('/ripple', { question: newQuestion.trim() });
      rounds = [data.round, ...rounds];
      newQuestion = '';
      view = 'list';
    } catch (e) {
      error = 'Failed to create round.';
    }
  }

  async function submitAnswer() {
    if (!answerText.trim()) return;
    try {
      await api.post(`/ripple/${submittingId}/submit`, { answer: answerText.trim() });
      answerConfirmed = answerText.trim();
      answerText = '';
      setTimeout(() => {
        answerConfirmed = null;
        submittingId = null;
        loadRounds();
      }, 2000);
    } catch (e) {
      error = 'Failed to submit answer.';
    }
  }

  async function judgeRound(id) {
    judgingId = id;
    judgingLoading = true;
    error = '';
    try {
      await api.post(`/ripple/${id}/judge`);
      await loadRounds();
    } catch (e) {
      error = 'Failed to judge round.';
    }
    judgingLoading = false;
    judgingId = null;
  }

  function toggleExpand(id) {
    expandedId = expandedId === id ? null : id;
  }

  function statusBadge(status) {
    if (status === 'open') return { label: 'Open', cls: 'badge-open' };
    if (status === 'judging') return { label: 'Judging', cls: 'badge-judging' };
    return { label: 'Complete', cls: 'badge-complete' };
  }

  function verdictText(v) {
    if (v === 'win') return 'Winner';
    if (v === 'lose') return 'Lost';
    return 'Draw';
  }

  function verdictCls(v) {
    if (v === 'win') return 'verdict-win';
    if (v === 'lose') return 'verdict-lose';
    return 'verdict-draw';
  }

  function userName(u) {
    return u?.displayName || u?.username || 'Unknown';
  }

  function userSubmitted(round) {
    return round.submissions?.some(s => s.answer);
  }
</script>

<div class="ripple-page">
  <h1>Ripple Effect</h1>
  <p class="subtitle">Butterfly effect game — who gave the better answer?</p>

  <div class="toolbar">
    <button class="toggle-btn" on:click={() => { view = view === 'list' ? 'create' : 'list'; error = ''; }}>
      {view === 'list' ? '+ New Round' : '← Back to Rounds'}
    </button>
  </div>

  {#if error}
    <p class="error-msg">{error}</p>
  {/if}

  {#if view === 'create'}
    <div class="create-form">
      <h3>New Ripple Round</h3>
      <p class="form-hint">Ask a thought-provoking question for both of you to answer.</p>
      <input bind:value={newQuestion} placeholder="What would you change if you could relive one day?" class="wide" />
      <button class="save-btn" on:click={createRound} disabled={!newQuestion.trim()}>
        Start Round
      </button>
    </div>
  {:else if loading}
    <p class="loading">Loading rounds...</p>
  {:else if rounds.length === 0}
    <p class="empty">No rounds yet. Start one to begin the ripple effect!</p>
  {:else}
    <div class="rounds-list">
      {#each rounds as round}
        {@const badge = statusBadge(round.status)}
        <div class="round-card" class:expanded={expandedId === round._id}>
          <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
          <div class="round-header" on:click={() => toggleExpand(round._id)} on:keydown={(e) => e.key === 'Enter' && toggleExpand(round._id)} role="button" tabindex="0">
            <div class="round-info">
              <strong class="round-question">{round.question}</strong>
              <span class="round-creator">by {userName(round.createdBy)}</span>
            </div>
            <div class="round-meta">
              <span class="badge {badge.cls}">{badge.label}</span>
              <span class="sub-count">{round.submissions?.length || 0} submitted</span>
              <span class="expand-icon">{expandedId === round._id ? '▲' : '▼'}</span>
            </div>
          </div>

          {#if expandedId === round._id}
            <div class="round-body">
              {#if round.status === 'open'}
                {#if submittingId === round._id}
                  {#if answerConfirmed}
                    <div class="answer-confirmed">
                      <p>✅ Answer submitted!</p>
                      <p class="answer-preview">"{answerConfirmed}"</p>
                    </div>
                  {:else}
                    <div class="submit-area">
                      <textarea bind:value={answerText} placeholder="Type your answer..." rows="3"></textarea>
                      <div class="submit-actions">
                        <button class="cancel-btn" on:click={() => { submittingId = null; answerText = ''; }}>Cancel</button>
                        <button class="submit-btn" on:click={submitAnswer} disabled={!answerText.trim()}>Submit</button>
                      </div>
                    </div>
                  {/if}
                {:else if userSubmitted(round)}
                  <div class="already-submitted">
                    <p>✅ You already submitted an answer for this round.</p>
                  </div>
                {:else}
                  <button class="action-btn" on:click={() => { submittingId = round._id; answerText = ''; answerConfirmed = null; }}>
                    Submit Answer
                  </button>
                {/if}

              {:else if round.status === 'judging'}
                <div class="judging-area">
                  <p class="judging-text">Both answers submitted. Ready for the AI verdict?</p>
                  <button class="action-btn judge-btn" on:click={() => judgeRound(round._id)}
                    disabled={judgingId === round._id && judgingLoading}>
                    {judgingId === round._id && judgingLoading ? 'Judging...' : 'Judge Round'}
                  </button>
                </div>

              {:else if round.status === 'complete'}
                <div class="results-area">
                  {#if round.results && round.results.length > 0}
                    {#each round.results as result}
                      <div class="result-card">
                        <div class="answer-row">
                          <span class="answer-user">{userName(round.submissions?.find(s => s.userId?._id === result.userId)?.userId)}</span>
                          <span class="answer-text">{round.submissions?.find(s => s.userId?._id === result.userId)?.answer || '—'}</span>
                          <span class="verdict-tag {verdictCls(result.verdict)}">{verdictText(result.verdict)}</span>
                        </div>
                        {#if result.explanation}
                          <p class="verdict-explanation">💬 {result.explanation}</p>
                        {/if}
                      </div>
                    {/each}
                  {:else if round.submissions && round.submissions.length > 0}
                    {#each round.submissions as sub}
                      <div class="answer-only">
                        <span class="answer-user">{userName(sub.userId)}</span>
                        <span class="answer-text">{sub.answer || '—'}</span>
                      </div>
                    {/each}
                  {:else}
                    <p class="empty-sm">No submissions to show.</p>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .ripple-page { max-width: 700px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1.5rem; }
  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }
  .empty-sm { color: var(--text-secondary); font-size: 0.85rem; }
  .error-msg { color: var(--accent); padding: 0.5rem; background: rgba(233, 69, 96, 0.1); border-radius: 6px; margin-bottom: 1rem; }

  .toolbar { margin-bottom: 1rem; }
  .toggle-btn { padding: 0.5rem 1rem; background: var(--bg-surface); color: white; border: none; border-radius: 4px; cursor: pointer; }
  .toggle-btn:hover { background: var(--bg-elevated); }

  .create-form { background: var(--bg-card); padding: 1.2rem; border-radius: 8px; margin-bottom: 1rem; }
  .create-form h3 { margin: 0 0 0.3rem 0; }
  .form-hint { font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 0.8rem 0; }
  .wide { width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 0.6rem; box-sizing: border-box; font-size: 0.95rem; }
  .save-btn { padding: 0.5rem 1.2rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; }
  .save-btn:disabled { background: #555; cursor: default; }

  .rounds-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .round-card { background: var(--bg-card); border-radius: 6px; overflow: hidden; }
  .round-header { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1rem; cursor: pointer; gap: 1rem; }
  .round-header:hover { background: rgba(255,255,255,0.03); }
  .round-info { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
  .round-question { font-size: 0.95rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .round-creator { font-size: 0.75rem; color: var(--text-secondary); }
  .round-meta { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
  .badge { padding: 0.15rem 0.5rem; border-radius: 8px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
  .badge-open { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
  .badge-judging { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
  .badge-complete { background: rgba(33, 150, 243, 0.15); color: #64b5f6; }
  .sub-count { font-size: 0.75rem; color: var(--text-secondary); }
  .expand-icon { font-size: 0.7rem; color: var(--text-secondary); }

  .round-body { border-top: 1px solid var(--border-color); padding: 1rem; }
  .action-btn { padding: 0.5rem 1rem; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; }
  .action-btn:hover { background: var(--accent-hover); }
  .action-btn:disabled { background: #555; cursor: default; }

  .submit-area textarea { width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical; margin-bottom: 0.5rem; box-sizing: border-box; font-family: inherit; font-size: 0.9rem; }
  .submit-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .cancel-btn { padding: 0.4rem 0.8rem; background: var(--text-secondary); color: white; border: none; border-radius: 4px; cursor: pointer; }
  .submit-btn { padding: 0.4rem 0.8rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; }
  .submit-btn:disabled { background: #555; cursor: default; }
  .answer-confirmed { text-align: center; padding: 0.5rem; }
  .answer-confirmed p { margin: 0.2rem 0; }
  .answer-preview { font-style: italic; color: var(--text-secondary); font-size: 0.9rem; }
  .already-submitted p { color: var(--text-secondary); margin: 0; }

  .judging-area { text-align: center; padding: 0.5rem; }
  .judging-text { color: var(--text-secondary); margin: 0 0 0.8rem 0; }
  .judge-btn { background: #ffc107; color: #222; }
  .judge-btn:hover { background: #ffca28; }

  .results-area { display: flex; flex-direction: column; gap: 0.6rem; }
  .result-card { background: var(--bg-elevated); padding: 0.7rem; border-radius: 6px; }
  .answer-row { display: flex; align-items: flex-start; gap: 0.5rem; }
  .answer-user { font-size: 0.8rem; color: var(--accent); font-weight: 600; white-space: nowrap; min-width: 70px; }
  .answer-text { font-size: 0.9rem; color: var(--text-primary); flex: 1; }
  .verdict-tag { font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 8px; white-space: nowrap; }
  .verdict-win { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
  .verdict-lose { background: rgba(233, 69, 96, 0.15); color: #e94560; }
  .verdict-draw { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
  .verdict-explanation { font-size: 0.85rem; color: var(--text-secondary); margin: 0.4rem 0 0 0; font-style: italic; line-height: 1.4; }
  .answer-only { background: var(--bg-elevated); padding: 0.5rem 0.7rem; border-radius: 4px; display: flex; gap: 0.5rem; }
</style>
