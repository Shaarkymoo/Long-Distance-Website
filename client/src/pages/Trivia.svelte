<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let questions = [];
  let leaderboard = [];
  let loading = true;

  // Create form
  let showCreate = false;
  let newQuestion = '';
  let newOptions = ['', '', '', ''];
  let newCorrect = '';
  let newCategory = 'general';

  // Answer state
  let answeringId = null;
  let selectedAnswer = '';
  let answerResult = null;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    try {
      const [qData, lData] = await Promise.all([
        api.get('/trivia/questions'),
        api.get('/trivia/leaderboard')
      ]);
      questions = qData.questions || [];
      leaderboard = lData.leaderboard || [];
    } catch (e) {}
    loading = false;
  }

  async function createQuestion() {
    if (!newQuestion.trim() || newOptions.some(o => !o.trim()) || !newCorrect) return;
    try {
      await api.post('/trivia/questions', {
        question: newQuestion.trim(),
        options: newOptions.map(o => o.trim()),
        correctAnswer: newCorrect,
        category: newCategory
      });
      newQuestion = ''; newOptions = ['', '', '', '']; newCorrect = ''; newCategory = 'general';
      showCreate = false;
      await loadData();
    } catch (e) {}
  }

  async function submitAnswer() {
    if (!selectedAnswer) return;
    try {
      const data = await api.post(`/trivia/questions/${answeringId}/answer`, { answer: selectedAnswer });
      answerResult = data;
      setTimeout(() => {
        answerResult = null;
        answeringId = null;
        selectedAnswer = '';
        loadData();
      }, 2000);
    } catch (e) {}
  }

  function statusLabel(q) {
    if (q.myAnswer) return q.myAnswer.correct ? '✅ Correct' : '❌ Wrong';
    return '⏳ Unanswered';
  }

  function statusClass(q) {
    if (!q.myAnswer) return 'unanswered';
    return q.myAnswer.correct ? 'correct' : 'wrong';
  }
</script>

<div class="trivia-page">
  <h1>Trivia 1v1</h1>
  <p class="subtitle">Test each other's knowledge</p>

  <button class="create-btn" on:click={() => { showCreate = !showCreate; }}>
    {showCreate ? 'Cancel' : '+ Add Question'}
  </button>

  {#if showCreate}
    <div class="create-form">
      <h3>New Trivia Question</h3>
      <input bind:value={newQuestion} placeholder="Question..." class="wide" />
      <div class="options-grid">
        {#each newOptions as opt, i}
          <input bind:value={opt} placeholder="Option {i + 1}..." />
        {/each}
      </div>
      <div class="correct-row">
        <label>Correct answer:</label>
        <select bind:value={newCorrect}>
          <option value="">-- Select --</option>
          {#each newOptions.filter(o => o.trim()) as opt}
            <option value={opt}>{opt}</option>
          {/each}
        </select>
        <input bind:value={newCategory} placeholder="category" class="cat-input" />
      </div>
      <button class="save-btn" on:click={createQuestion}
        disabled={!newQuestion.trim() || newOptions.some(o => !o.trim()) || !newCorrect}>
        Create
      </button>
    </div>
  {/if}

  {#if loading}
    <p class="loading">Loading...</p>
  {:else}
    <div class="leaderboard-card">
      <h3>🏆 Leaderboard</h3>
      {#if leaderboard.length === 0}
        <p class="empty-sm">No answers yet</p>
      {:else}
        {#each leaderboard as entry}
          <div class="lb-row">
            <span class="lb-name">{entry.name}</span>
            <span class="lb-score">{entry.correct} correct</span>
          </div>
        {/each}
      {/if}
    </div>

    <div class="questions-list">
      {#if questions.length === 0}
        <p class="empty">No questions yet. Add one to get started!</p>
      {:else}
        {#each questions as q}
          <div class="q-card {statusClass(q)}">
            <div class="q-header">
              <strong>{q.question}</strong>
              <span class="cat-badge">{q.category}</span>
            </div>
            <div class="q-options">
              {#each q.options as opt}
                <span class="q-option">{opt}</span>
              {/each}
            </div>
            <div class="q-footer">
              <span class="status">{statusLabel(q)}</span>
              {#if q.correctAnswer}
                <span class="correct-ans">Answer: {q.correctAnswer}</span>
              {/if}
              {#if !q.myAnswer}
                <button class="answer-btn" on:click={() => { answeringId = q._id; }}>
                  {answeringId === q._id ? 'Selecting...' : 'Answer'}
                </button>
              {/if}
              {#if q.otherAnswered}
                <span class="other-badge" class:correct={q.otherCorrect} class:wrong={!q.otherCorrect}>
                  Partner: {q.otherCorrect ? '✅' : '❌'}
                </span>
              {/if}
            </div>
            <div class="q-meta">
              <span class="by">by {q.createdBy?.displayName || q.createdBy?.username}</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  {#if answeringId}
    <div class="answer-modal">
      <div class="modal-content">
        <h3>Your Answer</h3>
        {#if answerResult}
          <div class="result-box" class:correct={answerResult.correct} class:wrong={!answerResult.correct}>
            {answerResult.correct ? '✅ Correct!' : '❌ Wrong!'}
            {#if !answerResult.correct && answerResult.correctAnswer}
              <p>The answer was: {answerResult.correctAnswer}</p>
            {/if}
          </div>
        {:else}
          {#each questions.filter(q => q._id === answeringId) as q}
            <p class="modal-question">{q.question}</p>
            <div class="modal-options">
              {#each q.options as opt}
                <button class="modal-opt" class:selected={selectedAnswer === opt} on:click={() => selectedAnswer = opt}>
                  {opt}
                </button>
              {/each}
            </div>
            <button class="submit-btn" on:click={submitAnswer} disabled={!selectedAnswer}>Submit</button>
          {/each}
        {/if}
        <button class="close-btn" on:click={() => { answeringId = null; answerResult = null; selectedAnswer = ''; }}>Close</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .trivia-page { max-width: 700px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1rem; }
  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }
  .empty-sm { color: var(--text-secondary); font-size: 0.85rem; }
  .create-btn { padding: 0.5rem 1rem; background: var(--bg-surface); color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 1rem; }

  .create-form { background: var(--bg-card); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
  .create-form h3 { margin: 0 0 0.5rem 0; }
  .wide { width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 0.5rem; box-sizing: border-box; }
  .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin-bottom: 0.5rem; }
  .options-grid input { padding: 0.4rem; border: 1px solid var(--border-color); border-radius: 4px; }
  .correct-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
  .correct-row select { padding: 0.4rem; border: 1px solid var(--border-color); border-radius: 4px; }
  .cat-input { padding: 0.4rem; border: 1px solid var(--border-color); border-radius: 4px; }
  .save-btn { padding: 0.4rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; }
  .save-btn:disabled { background: #ccc; }

  .leaderboard-card { background: var(--bg-card); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #ffd700; }
  .leaderboard-card h3 { margin: 0 0 0.5rem 0; }
  .lb-row { display: flex; justify-content: space-between; padding: 0.3rem 0; }
  .lb-name { font-weight: 600; }
  .lb-score { color: var(--accent); }

  .questions-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .q-card { background: var(--bg-card); padding: 0.8rem; border-radius: 6px; border-left: 3px solid var(--border-color); }
  .q-card.correct { border-left-color: #4caf50; }
  .q-card.wrong { border-left-color: var(--accent); }
  .q-card.unanswered { border-left-color: #ff9800; }
  .q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; }
  .cat-badge { background: var(--bg-elevated); padding: 0.15rem 0.5rem; border-radius: 8px; font-size: 0.75rem; text-transform: capitalize; }
  .q-options { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.3rem; }
  .q-option { background: var(--bg-elevated); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }
  .q-footer { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .status { font-size: 0.85rem; }
  .correct-ans { font-size: 0.8rem; color: #4caf50; }
  .answer-btn { padding: 0.3rem 0.6rem; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
  .other-badge { font-size: 0.8rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--bg-elevated); }
  .other-badge.correct { background: #e8f5e9; color: #4caf50; }
  .other-badge.wrong { background: #ffebee; color: var(--accent); }
  .q-meta .by { font-size: 0.75rem; color: var(--text-secondary); }

  .answer-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
  .modal-content { background: var(--bg-surface); padding: 1.5rem; border-radius: 10px; max-width: 450px; width: 90%; }
  .modal-content h3 { margin: 0 0 0.5rem 0; }
  .modal-question { font-size: 1.1rem; margin-bottom: 1rem; }
  .modal-options { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
  .modal-opt { padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-card); cursor: pointer; text-align: left; }
  .modal-opt.selected { background: #e3f2fd; border-color: #2196f3; }
  .modal-opt:hover { background: var(--bg-elevated); }
  .submit-btn { padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
  .submit-btn:disabled { background: #ccc; }
  .result-box { text-align: center; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 1.2rem; }
  .result-box.correct { background: #e8f5e9; color: #4caf50; }
  .result-box.wrong { background: #ffebee; color: var(--accent); }
  .result-box p { font-size: 0.9rem; margin: 0.3rem 0 0 0; }
  .close-btn { padding: 0.4rem 1rem; background: var(--text-secondary); color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%; margin-top: 0.5rem; }
</style>
