<script>
  import guessObjects from '../lib/guessObjects.js';

  let remaining = [...guessObjects];
  let currentObject = null;
  let guess = '';
  let message = '';
  let messageClass = '';
  let score = 0;
  let blurLevel = 10; // starts at 10px, decreases by 2 per wrong guess
  let gameOver = false;
  let round = 0;

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function nextRound() {
    if (remaining.length === 0) {
      gameOver = true;
      return;
    }
    const shuffled = shuffle(remaining);
    currentObject = shuffled[0];
    remaining = shuffled.slice(1);
    guess = '';
    message = '';
    messageClass = '';
    blurLevel = 10;
    round++;
  }

  function submitGuess() {
    if (!guess.trim() || !currentObject) return;

    if (guess.trim().toLowerCase() === currentObject.name.toLowerCase()) {
      score++;
      message = `✅ Correct! It's ${currentObject.name}`;
      messageClass = 'correct';
      setTimeout(() => nextRound(), 1500);
    } else {
      blurLevel = Math.max(1, blurLevel - 2);
      if (blurLevel <= 3) {
        message = `Hint: ${currentObject.hints[0]}`;
      } else if (blurLevel <= 1) {
        message = `Hint: ${currentObject.hints[1]}`;
      } else {
        message = '❌ Try again!';
      }
      messageClass = 'wrong';
    }
    guess = '';
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') submitGuess();
  }

  // Start first round
  if (!currentObject && !gameOver) nextRound();

  function resetGame() {
    remaining = shuffle([...guessObjects]);
    score = 0;
    round = 0;
    gameOver = false;
    nextRound();
  }

  const progress = blurLevel / 10;
</script>

<div class="guess-page">
  <h1>Guess the Object</h1>
  <p class="subtitle">Can you identify the blurred object?</p>

  <div class="scoreboard">
    <span>Score: <strong>{score}</strong></span>
    <span>Round: <strong>{round}/{guessObjects.length}</strong></span>
    <button class="reset-btn" on:click={resetGame}>Restart</button>
  </div>

  {#if gameOver}
    <div class="game-over">
      <h2>🎉 Game Over!</h2>
      <p class="final-score">You guessed <strong>{score}/{guessObjects.length}</strong> objects correctly!</p>
      <button class="reset-btn big" on:click={resetGame}>Play Again</button>
    </div>
  {:else if currentObject}
    <div class="game-area">
      <div class="emoji-display">
        <span class="blurred-emoji" style="filter: blur({blurLevel}px); image-rendering: pixelated;">
          {currentObject.emoji}
        </span>
        <div class="blur-indicator">
          <div class="blur-bar">
            <div class="blur-fill" style="width: {progress * 100}%"></div>
          </div>
          <span class="blur-label">{blurLevel}px blur</span>
        </div>
      </div>

      <div class="input-area">
        <input
          bind:value={guess}
          on:keydown={handleKeydown}
          placeholder="Type your guess..."
          disabled={messageClass === 'correct'}
        />
        <button class="guess-btn" on:click={submitGuess}
          disabled={!guess.trim() || messageClass === 'correct'}>
          Guess
        </button>
      </div>

      {#if message}
        <div class="message {messageClass}">
          {message}
        </div>
      {/if}

      <div class="category-hint">
        Category: <span class="cat-badge">{currentObject.category}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .guess-page { max-width: 500px; margin: 0 auto; text-align: center; }
  h1 { font-size: 1.8rem; color: var(--text-primary); }
  .subtitle { color: var(--text-secondary); margin-top: 0; margin-bottom: 1.5rem; }

  .scoreboard { display: flex; justify-content: center; gap: 1.5rem; align-items: center; margin-bottom: 2rem; font-size: 0.95rem; }
  .scoreboard strong { color: var(--accent); }
  .reset-btn { background: none; border: 1px solid var(--border-color); padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
  .reset-btn:hover { background: var(--bg-elevated); }
  .reset-btn.big { padding: 0.8rem 2rem; font-size: 1rem; background: var(--accent); color: white; border: none; border-radius: 8px; }

  .game-area { padding: 1rem; }

  .emoji-display { margin-bottom: 2rem; position: relative; }
  .blurred-emoji { font-size: 6rem; display: block; line-height: 1.5; transition: filter 0.3s; user-select: none; }

  .blur-indicator { margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; justify-content: center; }
  .blur-bar { width: 150px; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
  .blur-fill { height: 100%; background: linear-gradient(to right, #4caf50, #ff9800, var(--accent)); border-radius: 3px; transition: width 0.3s; }
  .blur-label { font-size: 0.75rem; color: var(--text-secondary); }

  .input-area { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .input-area input { flex: 1; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 1rem; text-align: center; }
  .guess-btn { padding: 0.6rem 1.5rem; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; }
  .guess-btn:disabled { background: #ccc; }
  .guess-btn:hover:not(:disabled) { background: var(--accent-hover); }

  .message { padding: 0.8rem; border-radius: 6px; margin-bottom: 1rem; font-size: 1rem; }
  .message.correct { background: #e8f5e9; color: #4caf50; }
  .message.wrong { background: #ffebee; color: var(--accent); }

  .category-hint { font-size: 0.85rem; color: var(--text-secondary); }
  .cat-badge { background: var(--bg-elevated); padding: 0.2rem 0.6rem; border-radius: 8px; text-transform: capitalize; }

  .game-over { padding: 3rem 1rem; }
  .game-over h2 { font-size: 2rem; color: var(--text-primary); }
  .final-score { font-size: 1.2rem; color: var(--text-secondary); margin-bottom: 1.5rem; }
</style>
