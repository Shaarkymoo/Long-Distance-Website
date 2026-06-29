# Ripple Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a turn-based prediction game where Gemini generates a historical/alt-world scenario, both users submit blind predictions, and Gemini judges the winner.

**Architecture:** Each round is one MongoDB document. Gemini called twice per round: once for scenario generation, once for judging both submissions. Score tracked in a separate document.

**Tech Stack:** Express, Mongoose, Gemini 1.5 Flash REST API, Svelte 5 (runes), Vite

**Spec:** `docs/superpowers/specs/2026-06-29-phase2-features-design.md` (§2)

## Global Constraints

- All Gemini calls through `server/services/gemini.js` — never inline
- Blind submissions: users cannot see each other's predictions until judging is complete
- Auto-judge on second submission: when both predictions are in, Gemini evaluates immediately
- Draw: if Gemini declares both win or both lose, no score change
- Score is separate from rounds (manual reset)
- Desktop-only layout
- Gemini API key from `process.env.GEMINI_API_KEY`
- Model: `gemini-1.5-flash`

---

## File Structure

### Create
| File | Purpose |
|---|---|
| `server/models/RippleRound.js` | Mongoose schema for rounds |
| `server/routes/ripple.js` | API endpoints: start / predict / judge / score / reset |
| `client/src/pages/Ripple.svelte` | Ripple game page |

### Modify
| File | Change |
|---|---|
| `server/index.js` | Add route import and `app.use` |
| `client/src/App.svelte` | Add Ripple to page map |

---

### Task 1: Create RippleRound model

**Files:**
- Create: `server/models/RippleRound.js`

**Interfaces:**
- Produces: Mongoose model `RippleRound`

- [ ] **Step 1: Create the file**

```javascript
// server/models/RippleRound.js
import mongoose from 'mongoose';

const scenarioSchema = new mongoose.Schema({
  generatedBy: { type: String, default: 'gemini' },
  timePeriod: { type: String, required: true },
  setting: { type: String, required: true },
  incitingEvent: { type: String, required: true },
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prediction: { type: String, required: true },
  verdict: { type: String, enum: ['win', 'lose', null], default: null },
  reason: { type: String, default: '' },
}, { _id: false });

const rippleRoundSchema = new mongoose.Schema({
  scenario: { type: scenarioSchema, required: true },
  submissions: { type: [submissionSchema], default: [] },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['waiting', 'judging', 'complete'], default: 'waiting' },
}, { timestamps: true });

export default mongoose.model('RippleRound', rippleRoundSchema);
```

- [ ] **Step 2: Verify syntax**

Run: `cd server && node -e "import('./models/RippleRound.js').then(m => console.log('RippleRound model OK:', !!m.default))"`
Expected: `RippleRound model OK: true`

- [ ] **Step 3: Commit**

```bash
git add server/models/RippleRound.js
git commit -m "feat(ripple): add RippleRound model"
```

---

### Task 2: Create Ripple API routes

**Files:**
- Create: `server/routes/ripple.js`
- Modify: `server/index.js` (register routes)

**Interfaces:**
- Consumes: `RippleRound` model (Task 1), `callGemini` from `server/services/gemini.js`, `authMiddleware` from `server/middleware/auth.js`
- Produces: 5 API endpoints

- [ ] **Step 1: Create `server/routes/ripple.js`**

```javascript
// server/routes/ripple.js
import { Router } from 'express';
import RippleRound from '../models/RippleRound.js';
import { authMiddleware } from '../middleware/auth.js';
import { callGemini } from '../services/gemini.js';

const router = Router();
router.use(authMiddleware);

// Simple in-memory score (persists in Mongo through a singleton doc pattern)
// Using a fixed-id doc for simplicity
const SCORE_DOC_ID = 'ripple_score_singleton';
let scoreCache = { user1Id: null, user2Id: null, user1Wins: 0, user2Wins: 0 };

async function getScores() {
  const db = (await import('mongoose')).default.connection.db;
  const doc = await db.collection('ripplescores').findOne({ _id: SCORE_DOC_ID });
  if (doc) {
    scoreCache = {
      user1Id: doc.user1Id ? doc.user1Id.toString() : null,
      user2Id: doc.user2Id ? doc.user2Id.toString() : null,
      user1Wins: doc.user1Wins || 0,
      user2Wins: doc.user2Wins || 0,
    };
  }
  return scoreCache;
}

async function saveScores(scores) {
  const db = (await import('mongoose')).default.connection.db;
  await db.collection('ripplescores').updateOne(
    { _id: SCORE_DOC_ID },
    { $set: scores },
    { upsert: true }
  );
  scoreCache = scores;
}

// GET /api/ripple/round — get current round
router.get('/round', async (req, res) => {
  try {
    const round = await RippleRound.findOne({ status: { $ne: 'complete' } })
      .sort({ createdAt: -1 })
      .populate('submissions.userId', 'displayName username');

    if (!round) return res.json({ round: null });

    // Hide other user's prediction if waiting/judging
    if (round.status === 'waiting' || round.status === 'judging') {
      round.submissions = round.submissions.map(s => {
        if (s.userId._id.toString() !== req.user.id) {
          return { ...s.toObject(), prediction: '[waiting for their prediction]' };
        }
        return s;
      });
    }

    res.json({ round });
  } catch (err) {
    console.error('Get round error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ripple/start — generate a new scenario, create round
router.post('/start', async (req, res) => {
  try {
    // Check for existing active round
    const existing = await RippleRound.findOne({ status: { $ne: 'complete' } });
    if (existing) {
      return res.status(400).json({ error: 'An active round already exists. Complete or cancel it first.' });
    }

    const systemPrompt = [
      `Generate a historical or alternate-world scenario for a prediction game.`,
      `Include a time period, a setting, and an inciting event that changes things.`,
      `Make it concrete and specific. Avoid cliches like "aliens invade" or "zombie apocalypse".`,
      `Return JSON: { "timePeriod": "...", "setting": "...", "incitingEvent": "..." }`,
    ].join('\n');

    const result = await callGemini({ systemPrompt, history: [], maxOutputTokens: 500 });
    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    let scenario;
    try {
      scenario = JSON.parse(result.text);
    } catch {
      return res.status(502).json({ error: 'Failed to parse scenario from AI' });
    }

    if (!scenario.timePeriod || !scenario.setting || !scenario.incitingEvent) {
      return res.status(502).json({ error: 'AI returned incomplete scenario' });
    }

    const round = await RippleRound.create({
      scenario: {
        generatedBy: 'gemini',
        timePeriod: scenario.timePeriod,
        setting: scenario.setting,
        incitingEvent: scenario.incitingEvent,
      },
      status: 'waiting',
    });

    res.status(201).json({ round });
  } catch (err) {
    console.error('Start round error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ripple/predict — submit a prediction
router.post('/predict', async (req, res) => {
  try {
    const round = await RippleRound.findOne({ status: { $in: ['waiting', 'judging'] } });
    if (!round) {
      return res.status(400).json({ error: 'No active round. Start a new one first.' });
    }

    const { prediction } = req.body;
    if (!prediction || !prediction.trim()) {
      return res.status(400).json({ error: 'Prediction is required' });
    }

    // Check if user already submitted
    const alreadySubmitted = round.submissions.some(
      s => s.userId.toString() === req.user.id
    );
    if (alreadySubmitted) {
      return res.status(400).json({ error: 'You already submitted a prediction for this round' });
    }

    round.submissions.push({
      userId: req.user.id,
      prediction: prediction.trim(),
    });

    // If both have submitted, auto-judge
    if (round.submissions.length === 2) {
      round.status = 'judging';

      // Call Gemini to judge
      const user1Id = round.submissions[0].userId;
      const user2Id = round.submissions[1].userId;
      const user1 = await (await import('../models/User.js')).default.findById(user1Id).select('displayName username');
      const user2 = await (await import('../models/User.js')).default.findById(user2Id).select('displayName username');
      const user1Name = user1?.displayName || user1?.username || 'User 1';
      const user2Name = user2?.displayName || user2?.username || 'User 2';

      const judgePrompt = [
        `Evaluate these two predictions for the following scenario:`,
        ``,
        `--- Scenario ---`,
        `Time period: ${round.scenario.timePeriod}`,
        `Setting: ${round.scenario.setting}`,
        `Inciting event: ${round.scenario.incitingEvent}`,
        ``,
        `--- Prediction A (by ${user1Name}) ---`,
        `${round.submissions[0].prediction}`,
        ``,
        `--- Prediction B (by ${user2Name}) ---`,
        `${round.submissions[1].prediction}`,
        ``,
        `Rate each on:`,
        `1. Plausibility (0-10): How logically does it follow from the scenario?`,
        `2. Creativity (0-10): Is it interesting or unexpected while remaining grounded?`,
        ``,
        `A prediction "wins" if it scores higher on plausibility + creativity combined.`,
        `Both can win (draw) or both can lose (neither is reasonable).`,
        ``,
        `Return JSON:`,
        `{ "verdict_a": "win" | "lose", "reason_a": "string", "verdict_b": "win" | "lose", "reason_b": "string" }`,
      ].join('\n');

      const judgeResult = await callGemini({ systemPrompt: judgePrompt, history: [], maxOutputTokens: 500 });

      if (!judgeResult.error) {
        try {
          const verdict = JSON.parse(judgeResult.text);
          round.submissions[0].verdict = verdict.verdict_a === 'win' ? 'win' : 'lose';
          round.submissions[0].reason = verdict.reason_a || '';
          round.submissions[1].verdict = verdict.verdict_b === 'win' ? 'win' : 'lose';
          round.submissions[1].reason = verdict.reason_b || '';

          // Determine winner
          if (round.submissions[0].verdict === 'win' && round.submissions[1].verdict === 'lose') {
            round.winner = round.submissions[0].userId;
            const scores = await getScores();
            if (round.submissions[0].userId.toString() === scores.user1Id) {
              scores.user1Wins += 1;
            } else {
              scores.user2Wins += 1;
            }
            await saveScores(scores);
          } else if (round.submissions[0].verdict === 'lose' && round.submissions[1].verdict === 'win') {
            round.winner = round.submissions[1].userId;
            const scores = await getScores();
            if (round.submissions[1].userId.toString() === scores.user1Id) {
              scores.user1Wins += 1;
            } else {
              scores.user2Wins += 1;
            }
            await saveScores(scores);
          }
          // Both win or both lose → no score change
        } catch (parseErr) {
          console.error('Failed to parse judge verdict:', parseErr);
        }
      }

      round.status = 'complete';
      round.markModified('submissions');
      await round.save();

      // Return full results
      await round.populate('submissions.userId', 'displayName username');
      return res.json({ round, status: 'complete' });
    }

    await round.save();
    res.json({ round: { ...round.toObject(), submissions: round.submissions.map(s => ({
      ...s.toObject(),
      prediction: s.userId.toString() === req.user.id ? s.prediction : '[waiting for their prediction]',
    })) } });
  } catch (err) {
    console.error('Predict error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ripple/score — get current scores
router.get('/score', async (req, res) => {
  try {
    const scores = await getScores();
    // Initialize user IDs if not set
    if (!scores.user1Id) {
      const users = await (await import('../models/User.js')).default.find().select('_id').limit(2);
      if (users.length === 2) {
        scores.user1Id = users[0]._id.toString();
        scores.user2Id = users[1]._id.toString();
        await saveScores(scores);
      }
    }

    const user1 = scores.user1Id
      ? await (await import('../models/User.js')).default.findById(scores.user1Id).select('displayName username')
      : null;
    const user2 = scores.user2Id
      ? await (await import('../models/User.js')).default.findById(scores.user2Id).select('displayName username')
      : null;

    res.json({
      scores,
      user1: user1 ? { displayName: user1.displayName || user1.username } : null,
      user2: user2 ? { displayName: user2.displayName || user2.username } : null,
    });
  } catch (err) {
    console.error('Get score error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ripple/reset — reset scores
router.post('/reset', async (req, res) => {
  try {
    await saveScores({ ...scoreCache, user1Wins: 0, user2Wins: 0 });
    res.json({ message: 'Scores reset' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

- [ ] **Step 2: Register routes in `server/index.js`**

Read `server/index.js`. After all existing route imports, add:
```javascript
import rippleRoutes from './routes/ripple.js';
```

After all existing `app.use` lines, add:
```javascript
app.use('/api/ripple', rippleRoutes);
```

- [ ] **Step 3: Verify server starts**

Run: `cd server && timeout 5 node index.js 2>&1 | head -20`
Expected: Server starts with no errors.

- [ ] **Step 4: Commit**

```bash
git add server/routes/ripple.js server/index.js
git commit -m "feat(ripple): add Ripple Effect API routes with Gemini judging"
```

---

### Task 3: Build Ripple Svelte page

**Files:**
- Create: `client/src/pages/Ripple.svelte`
- Modify: `client/src/App.svelte`

- [ ] **Step 1: Create `client/src/pages/Ripple.svelte`**

```svelte
<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let { navigateTo } = $props();
  let round = null;
  let scores = null;
  let loading = true;
  let error = '';
  let predictionText = '';
  let submitting = false;
  let starting = false;
  let currentUserId = null;

  onMount(async () => {
    try {
      const me = await api.get('/auth/me');
      currentUserId = me.user._id;
    } catch (e) {}
    await Promise.all([loadRound(), loadScores()]);
  });

  async function loadRound() {
    try {
      const data = await api.get('/ripple/round');
      round = data.round;
    } catch (e) {
      error = 'Failed to load round.';
    } finally {
      loading = false;
    }
  }

  async function loadScores() {
    try {
      const data = await api.get('/ripple/score');
      scores = data;
    } catch (e) {}
  }

  async function startRound() {
    if (starting) return;
    starting = true;
    try {
      const data = await api.post('/ripple/start');
      round = data.round;
    } catch (e) {
      error = e.message || 'Could not start a new round.';
    } finally {
      starting = false;
    }
  }

  async function submitPrediction() {
    if (!predictionText.trim() || submitting) return;
    submitting = true;
    try {
      const data = await api.post('/ripple/predict', { prediction: predictionText.trim() });
      predictionText = '';

      if (data.status === 'complete') {
        round = data.round;
        await loadScores();
      } else {
        round = data.round;
      }
    } catch (e) {
      error = e.message || 'Could not submit prediction.';
    } finally {
      submitting = false;
    }
  }

  function mySubmission() {
    if (!round || !currentUserId) return null;
    return round.submissions?.find(s => s.userId?._id === currentUserId || s.userId === currentUserId) || null;
  }

  function otherSubmission() {
    if (!round || !currentUserId) return null;
    return round.submissions?.find(s => s.userId?._id !== currentUserId && s.userId !== currentUserId) || null;
  }

  $: isWaiting = round && round.status === 'waiting';
  $: isComplete = round && round.status === 'complete';
  $: iSubmitted = !!mySubmission();
  $: otherSubmitted = !!otherSubmission();
  $: iWon = isComplete && round.winner && (round.winner._id === currentUserId || round.winner === currentUserId);
</script>

<div class="ripple-page">
  <h1>🌊 Ripple Effect</h1>

  {#if error}
    <p class="error-msg">{error}</p>
  {/if}

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if !round}
    <div class="empty-state">
      <p>No active round. Start one to see a scenario and make a prediction!</p>
      <button class="btn-primary" onclick={startRound} disabled={starting}>
        {starting ? 'Generating...' : 'New Round'}
      </button>
    </div>
  {:else}
    <div class="scenario-card">
      <div class="scenario-period">{round.scenario.timePeriod}</div>
      <div class="scenario-setting">{round.scenario.setting}</div>
      <div class="scenario-event">⚡ {round.scenario.incitingEvent}</div>
    </div>

    {#if isWaiting}
      <div class="status-bar">
        {#if !iSubmitted}
          <p class="status-text">What happens next? Make your prediction.</p>
        {:else if !otherSubmitted}
          <p class="status-text wait">You've predicted. Waiting for the other person...</p>
        {/if}
      </div>

      {#if !iSubmitted}
        <form onsubmit={submitPrediction} class="predict-form">
          <textarea
            bind:value={predictionText}
            placeholder="What happens next in this society?"
            rows="3"
            disabled={submitting}
          ></textarea>
          <button type="submit" disabled={submitting || !predictionText.trim()}>
            {submitting ? 'Submitting...' : 'Submit Prediction'}
          </button>
        </form>
      {/if}
    {:else if isComplete}
      <div class="results">
        <h2 class="result-header {iWon ? 'won' : 'lost'}">
          {iWon ? '🎉 You Won!' : round.winner ? 'They Won This Round' : '🤝 Draw — No Winner'}
        </h2>

        <div class="submissions-reveal">
          {#each round.submissions as sub}
            <div class="submission-card {sub.verdict}">
              <div class="sub-author">{sub.userId?.displayName || sub.userId?.username || 'Unknown'}</div>
              <div class="sub-prediction">{sub.prediction}</div>
              <div class="sub-verdict">
                {#if sub.verdict === 'win'}
                  ✅ Win
                {:else}
                  ❌ Lose
                {/if}
                — {sub.reason}
              </div>
            </div>
          {/each}
        </div>

        <button class="btn-primary" onclick={startRound} disabled={starting}>
          {starting ? 'Generating...' : 'Next Round'}
        </button>
      </div>
    {/if}
  {/if}

  {#if scores}
    <div class="scoreboard">
      <h3>Score</h3>
      <div class="score-row">
        <span class="score-name">{scores.user1?.displayName || 'Player 1'}:</span>
        <span class="score-num">{scores.scores.user1Wins}</span>
      </div>
      <div class="score-row">
        <span class="score-name">{scores.user2?.displayName || 'Player 2'}:</span>
        <span class="score-num">{scores.scores.user2Wins}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .ripple-page { padding: 24px; max-width: 650px; margin: 0 auto; }
  .ripple-page h1 { margin-bottom: 20px; }
  .loading, .empty-state { text-align: center; padding: 48px; color: var(--text-secondary); }
  .empty-state p { margin-bottom: 16px; }
  .error-msg { color: var(--accent); text-align: center; margin-bottom: 16px; }
  .btn-primary { background: var(--accent); color: white; border: none; padding: 10px 24px; border-radius: var(--radius); cursor: pointer; font-size: 0.9rem; }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .scenario-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 20px; margin-bottom: 20px; }
  .scenario-period { font-size: 0.8rem; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .scenario-setting { font-size: 1rem; color: var(--text-primary); font-weight: 600; margin-bottom: 8px; }
  .scenario-event { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; }

  .status-bar { text-align: center; margin-bottom: 16px; }
  .status-text { color: var(--text-secondary); font-size: 0.9rem; }
  .status-text.wait { color: var(--accent); }

  .predict-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .predict-form textarea { width: 100%; padding: 12px; border-radius: var(--radius); border: 1px solid var(--border-color); font-size: 0.9rem; background: var(--bg-card); color: var(--text-primary); font-family: inherit; resize: vertical; }
  .predict-form button { align-self: flex-end; background: var(--accent); color: white; border: none; padding: 10px 24px; border-radius: var(--radius); cursor: pointer; font-size: 0.9rem; }
  .predict-form button:disabled { opacity: 0.5; cursor: not-allowed; }
  .predict-form button:hover:not(:disabled) { background: var(--accent-hover); }

  .results { text-align: center; }
  .result-header { font-size: 1.2rem; margin-bottom: 20px; }
  .result-header.won { color: #4caf50; }
  .result-header.lost { color: var(--text-secondary); }

  .submissions-reveal { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
  .submission-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 16px; text-align: left; }
  .submission-card.win { border-left: 4px solid #4caf50; }
  .submission-card.lose { border-left: 4px solid var(--border-color); }
  .sub-author { font-size: 0.85rem; font-weight: 600; color: var(--accent); margin-bottom: 6px; }
  .sub-prediction { font-size: 0.9rem; line-height: 1.5; margin-bottom: 8px; }
  .sub-verdict { font-size: 0.8rem; color: var(--text-secondary); }

  .scoreboard { margin-top: 24px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 16px; }
  .scoreboard h3 { margin: 0 0 12px 0; font-size: 0.95rem; }
  .score-row { display: flex; justify-content: space-between; padding: 6px 0; }
  .score-name { font-size: 0.85rem; color: var(--text-secondary); }
  .score-num { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
</style>
```

- [ ] **Step 2: Add routing in `client/src/App.svelte`**

Read `client/src/App.svelte`. Add import:
```javascript
import Ripple from './pages/Ripple.svelte';
```

Add to `pageMap`:
```javascript
const pageMap = { ...existing, ripple: Ripple };
```

- [ ] **Step 3: Build the client**

Run: `cd client && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Ripple.svelte client/src/App.svelte
git commit -m "feat(ripple): add Ripple Effect Svelte page"
```
