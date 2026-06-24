<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let quizzes = [];
  let loading = true;
  let currentView = 'list'; // list | create | take | compare
  let currentQuiz = null;
  let compareData = null;

  // Create form
  let newName = '';
  let newQuestions = [{ questionText: '', options: ['', ''] }];

  // Take quiz
  let currentResponses = [];

  onMount(async () => {
    await loadQuizzes();
  });

  async function loadQuizzes() {
    loading = true;
    try {
      const data = await api.get('/quizzes');
      quizzes = data.quizzes || [];
    } catch (e) {}
    loading = false;
  }

  function addQuestion() {
    newQuestions = [...newQuestions, { questionText: '', options: ['', ''] }];
  }

  function removeQuestion(i) {
    newQuestions = newQuestions.filter((_, idx) => idx !== i);
  }

  function addOption(qIdx) {
    const updated = [...newQuestions];
    updated[qIdx] = { ...updated[qIdx], options: [...updated[qIdx].options, ''] };
    newQuestions = updated;
  }

  function removeOption(qIdx, oIdx) {
    const updated = [...newQuestions];
    updated[qIdx] = { ...updated[qIdx], options: updated[qIdx].options.filter((_, i) => i !== oIdx) };
    newQuestions = updated;
  }

  async function createQuiz() {
    if (!newName.trim()) return;
    const valid = newQuestions.every(q => q.questionText.trim() && q.options.every(o => o.trim()) && q.options.length >= 2);
    if (!valid) return;
    try {
      await api.post('/quizzes', {
        quizName: newName.trim(),
        questions: newQuestions.map(q => ({
          questionText: q.questionText.trim(),
          options: q.options.map(o => o.trim()).filter(Boolean)
        }))
      });
      newName = '';
      newQuestions = [{ questionText: '', options: ['', ''] }];
      currentView = 'list';
      await loadQuizzes();
    } catch (e) {}
  }

  async function startQuiz(quiz) {
    try {
      const data = await api.get(`/quizzes/${quiz._id}`);
      currentQuiz = data.quiz;
      currentResponses = currentQuiz.questions.map(() => '');
      currentView = 'take';
    } catch (e) {}
  }

  async function submitQuiz() {
    try {
      await api.post(`/quizzes/${currentQuiz._id}/answer`, { responses: currentResponses });
      currentView = 'compare';
      await loadCompare(currentQuiz._id);
      await loadQuizzes();
    } catch (e) {}
  }

  async function loadCompare(quizId) {
    try {
      const data = await api.get(`/quizzes/${quizId}/compare`);
      compareData = data.compare;
      currentView = 'compare';
    } catch (e) {}
  }

  async function goToCompare(quiz) {
    currentQuiz = quiz;
    await loadCompare(quiz._id);
  }

  function statusLabel(status) {
    const labels = { not_taken: 'Not taken', taken_by_me: 'Taken by me', taken_by_both: 'Both taken', compare_ready: 'Ready to compare' };
    return labels[status] || status;
  }

  function statusClass(status) {
    const classes = { not_taken: '', taken_by_me: 'taken', taken_by_both: 'both', compare_ready: 'ready' };
    return classes[status] || '';
  }
</script>

<div class="quizzes-page">
  <h1>Personality Quizzes</h1>
  <p class="subtitle">Take quizzes and compare answers</p>

  {#if currentView === 'list'}
    <button class="create-btn" on:click={() => { currentView = 'create' }}>+ Create Quiz</button>

    {#if loading}
      <p class="loading">Loading...</p>
    {:else if quizzes.length === 0}
      <p class="empty">No quizzes yet. Create one to get started!</p>
    {:else}
      <div class="quiz-list">
        {#each quizzes as q}
          <div class="quiz-card {statusClass(q.status)}">
            <div class="quiz-info">
              <strong>{q.quizName}</strong>
              <span class="meta">{q.questionCount} questions · <span class="badge">{statusLabel(q.status)}</span></span>
            </div>
            <div class="quiz-actions">
              {#if q.status === 'not_taken'}
                <button class="action-btn" on:click={() => startQuiz(q)}>Take Quiz</button>
              {:else if q.status === 'taken_by_me'}
                <button class="action-btn" on:click={() => startQuiz(q)}>Review</button>
              {:else}
                <button class="action-btn" on:click={() => goToCompare(q)}>Compare</button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

  {:else if currentView === 'create'}
    <button class="back-btn" on:click={() => { currentView = 'list' }}>← Back</button>
    <div class="create-form">
      <h3>Create a Quiz</h3>
      <input bind:value={newName} placeholder="Quiz name..." class="name-input" />

      {#each newQuestions as q, qi}
        <div class="question-block">
          <div class="q-header">
            <strong>Question {qi + 1}</strong>
            <button class="remove-btn" on:click={() => removeQuestion(qi)} disabled={newQuestions.length <= 1}>✕</button>
          </div>
          <input bind:value={q.questionText} placeholder="Question text..." />
          <div class="options-list">
            {#each q.options as opt, oi}
              <div class="option-row">
                <input bind:value={opt} placeholder="Option {oi + 1}..." />
                <button class="remove-btn small" on:click={() => removeOption(qi, oi)} disabled={q.options.length <= 2}>✕</button>
              </div>
            {/each}
          </div>
          <button class="add-opt-btn" on:click={() => addOption(qi)}>+ Add Option</button>
        </div>
      {/each}

      <div class="form-actions">
        <button class="add-q-btn" on:click={addQuestion}>+ Add Question</button>
        <button class="save-btn" on:click={createQuiz}
          disabled={!newName.trim() || !newQuestions.every(q => q.questionText.trim() && q.options.every(o => o.trim()))}>
          Create Quiz
        </button>
      </div>
    </div>

  {:else if currentView === 'take'}
    <button class="back-btn" on:click={() => { currentView = 'list' }}>← Back</button>
    <div class="take-quiz">
      <h2>{currentQuiz.quizName}</h2>
      {#each currentQuiz.questions as q, qi}
        <div class="question-card">
          <p class="q-text"><strong>{qi + 1}.</strong> {q.questionText}</p>
          <div class="options">
            {#each q.options as opt, oi}
              <label class="option-label" class:selected={currentResponses[qi] === opt}>
                <input type="radio" name="q{qi}" value={opt} bind:group={currentResponses[qi]} />
                {opt}
              </label>
            {/each}
          </div>
        </div>
      {/each}
      <button class="submit-btn" on:click={submitQuiz}
        disabled={currentResponses.some(r => !r)}>
        Submit Answers
      </button>
    </div>

  {:else if currentView === 'compare'}
    <button class="back-btn" on:click={() => { currentView = 'list' }}>← Back</button>
    <div class="compare-view">
      <h2>{currentQuiz?.quizName || 'Comparison'}</h2>
      {#if !compareData}
        <p class="waiting">Waiting for both users to answer...</p>
      {:else}
        <div class="compare-table">
          <div class="compare-header">
            <div class="col-question">Question</div>
            <div class="col-ans">Your Answer</div>
            <div class="col-ans">Their Answer</div>
          </div>
          {#each compareData as row, i}
            <div class="compare-row" class:match={row.user1 === row.user2}>
              <div class="col-question"><strong>{i + 1}.</strong> {row.question}</div>
              <div class="col-ans">{row.user1}</div>
              <div class="col-ans">{row.user2}</div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .quizzes-page { max-width: 700px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1rem; }
  .loading, .empty { color: var(--text-secondary); text-align: center; padding: 2rem; }
  .back-btn { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; margin-bottom: 1rem; }
  .back-btn:hover { background: var(--bg-elevated); }
  .create-btn { padding: 0.5rem 1rem; background: var(--bg-surface); color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 1rem; }
  .create-btn:hover { background: var(--bg-surface); }

  .quiz-list { display: flex; flex-direction: column; gap: 0.4rem; }
  .quiz-card { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 0.8rem 1rem; border-radius: 6px; border-left: 3px solid var(--border-color); }
  .quiz-card.taken { border-left-color: #4caf50; }
  .quiz-card.both { border-left-color: #2196f3; }
  .quiz-card.ready { border-left-color: #ff9800; }
  .quiz-info { display: flex; flex-direction: column; gap: 0.2rem; }
  .meta { font-size: 0.8rem; color: var(--text-secondary); }
  .badge { font-weight: 600; color: var(--text-secondary); }
  .action-btn { padding: 0.4rem 0.8rem; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
  .action-btn:hover { background: var(--accent-hover); }

  .create-form { background: var(--bg-card); padding: 1.5rem; border-radius: 8px; }
  .create-form h3 { margin: 0 0 1rem 0; }
  .name-input { width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 1rem; box-sizing: border-box; }
  .question-block { background: var(--bg-elevated); padding: 1rem; border-radius: 6px; margin-bottom: 1rem; }
  .q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .q-header input { flex: 1; margin-left: 0.5rem; }
  .remove-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 1rem; }
  .remove-btn:disabled { color: var(--text-secondary); }
  .remove-btn.small { font-size: 0.8rem; }
  .question-block input[type="text"] { width: 100%; padding: 0.4rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 0.4rem; box-sizing: border-box; }
  .options-list { margin: 0.5rem 0; }
  .option-row { display: flex; gap: 0.3rem; align-items: center; }
  .option-row input { flex: 1; }
  .add-opt-btn, .add-q-btn { background: none; border: 1px dashed var(--border-color); color: var(--text-secondary); padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
  .add-opt-btn:hover, .add-q-btn:hover { background: var(--bg-elevated); }
  .form-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; }
  .save-btn { padding: 0.5rem 1.2rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; }
  .save-btn:disabled { background: var(--text-secondary); }

  .take-quiz { background: var(--bg-card); padding: 1.5rem; border-radius: 8px; }
  .take-quiz h2 { margin: 0 0 1rem 0; }
  .question-card { margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
  .q-text { margin: 0 0 0.5rem 0; }
  .options { display: flex; flex-direction: column; gap: 0.3rem; }
  .option-label { display: block; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; }
  .option-label:hover { background: var(--bg-elevated); }
  .option-label.selected { background: #e3f2fd; border-color: #2196f3; }
  .option-label input { margin-right: 0.5rem; }
  .submit-btn { padding: 0.6rem 1.5rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem; }
  .submit-btn:disabled { background: var(--text-secondary); }

  .compare-view { background: var(--bg-card); padding: 1.5rem; border-radius: 8px; }
  .compare-view h2 { margin: 0 0 1rem 0; }
  .waiting { color: #ff9800; text-align: center; padding: 2rem; }
  .compare-table { font-size: 0.9rem; }
  .compare-header { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.5rem; font-weight: 600; color: var(--text-secondary); padding: 0.5rem; border-bottom: 2px solid var(--border-color); }
  .compare-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid var(--border-color); }
  .compare-row.match { background: #e8f5e9; }
  .col-question { color: var(--text-primary); }
  .col-ans { color: var(--text-secondary); }
</style>
