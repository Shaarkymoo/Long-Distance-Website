# Expeditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a procedural photography challenge generator. Challenges are AI-generated prompts. Photos shared via WhatsApp in real life. Site tracks acknowledgment, voting, and score.

**Architecture:** Each expedition is one MongoDB document. One Gemini call per challenge generation. Voting logic is purely client + server comparison (no AI). Score tracked in a separate document.

**Tech Stack:** Express, Mongoose, Gemini 1.5 Flash REST API, Svelte 5 (runes), Vite

**Spec:** `docs/superpowers/specs/2026-06-29-phase2-features-design.md` (§3)

## Global Constraints

- All Gemini calls through `server/services/gemini.js` — never inline
- No photo uploads on-site — photos shared via WhatsApp externally
- Both users must acknowledge "Ready" before voting phase starts
- Voting: both vote for same person → that person gets +1. Split → no points.
- Score is separate from expeditions (manual reset)
- Desktop-only layout
- Gemini API key from `process.env.GEMINI_API_KEY`
- Model: `gemini-1.5-flash`

---

## File Structure

### Create
| File | Purpose |
|---|---|
| `server/models/Expedition.js` | Mongoose schema for expeditions |
| `server/routes/expeditions.js` | API endpoints: current / new / ready / vote / score / reset |
| `client/src/pages/Expeditions.svelte` | Expeditions game page |

### Modify
| File | Change |
|---|---|
| `server/index.js` | Add route import and `app.use` |
| `client/src/App.svelte` | Add Expeditions to page map |

---

### Task 1: Create Expedition model

**Files:**
- Create: `server/models/Expedition.js`

**Interfaces:**
- Produces: Mongoose model `Expedition`

- [ ] **Step 1: Create the file**

```javascript
// server/models/Expedition.js
import mongoose from 'mongoose';

const expeditionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  status: { type: String, enum: ['active', 'voting', 'complete'], default: 'active' },
  acknowledgements: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date, default: Date.now },
  }],
  votes: [{
    voterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    votedForId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export default mongoose.model('Expedition', expeditionSchema);
```

- [ ] **Step 2: Verify syntax**

Run: `cd server && node -e "import('./models/Expedition.js').then(m => console.log('Expedition model OK:', !!m.default))"`
Expected: `Expedition model OK: true`

- [ ] **Step 3: Commit**

```bash
git add server/models/Expedition.js
git commit -m "feat(expeditions): add Expedition model"
```

---

### Task 2: Create Expeditions API routes

**Files:**
- Create: `server/routes/expeditions.js`
- Modify: `server/index.js` (register routes)

**Interfaces:**
- Consumes: `Expedition` model (Task 1), `callGemini` from `server/services/gemini.js`, `authMiddleware` from `server/middleware/auth.js`
- Produces: 6 API endpoints

- [ ] **Step 1: Create `server/routes/expeditions.js`**

```javascript
// server/routes/expeditions.js
import { Router } from 'express';
import Expedition from '../models/Expedition.js';
import { authMiddleware } from '../middleware/auth.js';
import { callGemini } from '../services/gemini.js';

const router = Router();
router.use(authMiddleware);

const SCORE_DOC_ID = 'expedition_score_singleton';
let scoreCache = { user1Id: null, user2Id: null, user1Wins: 0, user2Wins: 0 };

async function getScores() {
  const db = (await import('mongoose')).default.connection.db;
  const doc = await db.collection('expeditionscores').findOne({ _id: SCORE_DOC_ID });
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
  await db.collection('expeditionscores').updateOne(
    { _id: SCORE_DOC_ID },
    { $set: scores },
    { upsert: true }
  );
  scoreCache = scores;
}

// GET /api/expeditions/current — get active expedition
router.get('/current', async (req, res) => {
  try {
    const expedition = await Expedition.findOne({ status: { $ne: 'complete' } })
      .sort({ createdAt: -1 })
      .populate('acknowledgements.userId', 'displayName username')
      .populate('votes.voterId', 'displayName username')
      .populate('votes.votedForId', 'displayName username');

    res.json({ expedition });
  } catch (err) {
    console.error('Get current error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/expeditions/new — create new expedition
router.post('/new', async (req, res) => {
  try {
    const existing = await Expedition.findOne({ status: { $ne: 'complete' } });
    if (existing) {
      return res.status(400).json({ error: 'An active expedition already exists. Complete it first.' });
    }

    const systemPrompt = [
      `Generate a photography challenge for a couple.`,
      `Format: "Capture a {adjective} {subject} in a {setting} setting."`,
      `Pick from diverse categories: colors, textures, emotions, objects, environments, light conditions.`,
      `Make it concrete enough to be doable at home or nearby, but creative enough to be interesting.`,
      `Return JSON: { "prompt": "..." }`,
    ].join('\n');

    const result = await callGemini({ systemPrompt, history: [], maxOutputTokens: 200 });
    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    let prompt;
    try {
      const parsed = JSON.parse(result.text);
      prompt = parsed.prompt;
    } catch {
      prompt = result.text.replace(/^["']|["']$/g, '').trim();
    }

    if (!prompt) {
      return res.status(502).json({ error: 'AI returned empty prompt' });
    }

    const expedition = await Expedition.create({ prompt });
    res.status(201).json({ expedition });
  } catch (err) {
    console.error('New expedition error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/expeditions/ready — mark user as ready
router.post('/ready', async (req, res) => {
  try {
    const expedition = await Expedition.findOne({ status: 'active' });
    if (!expedition) {
      return res.status(400).json({ error: 'No active expedition.' });
    }

    const alreadyAcked = expedition.acknowledgements.some(
      a => a.userId.toString() === req.user.id
    );
    if (!alreadyAcked) {
      expedition.acknowledgements.push({ userId: req.user.id });
    }

    // Check if both are ready → move to voting
    if (expedition.acknowledgements.length >= 2) {
      expedition.status = 'voting';
    }

    await expedition.save();
    res.json({ expedition });
  } catch (err) {
    console.error('Ready error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/expeditions/vote — cast a vote
router.post('/vote', async (req, res) => {
  try {
    const expedition = await Expedition.findOne({ status: 'voting' });
    if (!expedition) {
      return res.status(400).json({ error: 'No expedition in voting phase.' });
    }

    const { votedForId } = req.body;
    if (!votedForId) {
      return res.status(400).json({ error: 'votedForId is required' });
    }
    if (votedForId === req.user.id) {
      return res.status(400).json({ error: 'Cannot vote for yourself' });
    }

    const alreadyVoted = expedition.votes.some(
      v => v.voterId.toString() === req.user.id
    );
    if (alreadyVoted) {
      return res.status(400).json({ error: 'You already voted.' });
    }

    expedition.votes.push({ voterId: req.user.id, votedForId });

    // If both voted, determine winner
    if (expedition.votes.length >= 2) {
      const vote1 = expedition.votes[0];
      const vote2 = expedition.votes[1];

      if (vote1.votedForId.toString() === vote2.votedForId.toString()) {
        expedition.winner = vote1.votedForId;
        // Update score
        const scores = await getScores();
        if (vote1.votedForId.toString() === scores.user1Id) {
          scores.user1Wins += 1;
        } else {
          scores.user2Wins += 1;
        }
        await saveScores(scores);
      }
      // Split votes → no winner, no score change

      expedition.status = 'complete';
    }

    await expedition.save();
    await expedition.populate('acknowledgements.userId', 'displayName username');
    await expedition.populate('votes.voterId', 'displayName username');
    await expedition.populate('votes.votedForId', 'displayName username');
    await expedition.populate('winner', 'displayName username');

    res.json({ expedition });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expeditions/score — get current scores
router.get('/score', async (req, res) => {
  try {
    const scores = await getScores();
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

// POST /api/expeditions/reset — reset scores
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
import expeditionsRoutes from './routes/expeditions.js';
```

After all existing `app.use` lines, add:
```javascript
app.use('/api/expeditions', expeditionsRoutes);
```

- [ ] **Step 3: Verify server starts**

Run: `cd server && timeout 5 node index.js 2>&1 | head -20`
Expected: Server starts, no errors.

- [ ] **Step 4: Commit**

```bash
git add server/routes/expeditions.js server/index.js
git commit -m "feat(expeditions): add Expeditions API routes with voting"
```

---

### Task 3: Build Expeditions Svelte page

**Files:**
- Create: `client/src/pages/Expeditions.svelte`
- Modify: `client/src/App.svelte`

- [ ] **Step 1: Create `client/src/pages/Expeditions.svelte`**

```svelte
<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let { navigateTo } = $props();
  let expedition = null;
  let scores = null;
  let loading = true;
  let error = '';
  let starting = false;
  let currentUserId = null;
  let users = [];

  onMount(async () => {
    try {
      const me = await api.get('/auth/me');
      currentUserId = me.user._id;
    } catch (e) {}
    await Promise.all([loadCurrent(), loadScores()]);
  });

  async function loadCurrent() {
    try {
      const data = await api.get('/expeditions/current');
      expedition = data.expedition;
    } catch (e) {
      error = 'Failed to load.';
    } finally {
      loading = false;
    }
  }

  async function loadScores() {
    try {
      const data = await api.get('/expeditions/score');
      scores = data;
    } catch (e) {}
  }

  async function newExpedition() {
    if (starting) return;
    starting = true;
    error = '';
    try {
      const data = await api.post('/expeditions/new');
      expedition = data.expedition;
    } catch (e) {
      error = e.message || 'Could not start.';
    } finally {
      starting = false;
    }
  }

  async function markReady() {
    try {
      const data = await api.post('/expeditions/ready');
      expedition = data.expedition;
    } catch (e) {
      error = e.message || 'Could not mark ready.';
    }
  }

  async function voteFor(userId) {
    try {
      const data = await api.post('/expeditions/vote', { votedForId: userId });
      expedition = data.expedition;
      await loadScores();
    } catch (e) {
      error = e.message || 'Could not vote.';
    }
  }

  async function resetScores() {
    try {
      await api.post('/expeditions/reset');
      await loadScores();
    } catch (e) {}
  }

  // Derived state
  $: isActive = expedition && expedition.status === 'active';
  $: isVoting = expedition && expedition.status === 'voting';
  $: isComplete = expedition && expedition.status === 'complete';

  $: iAmReady = expedition && currentUserId
    ? expedition.acknowledgements?.some(a => a.userId?._id === currentUserId || a.userId === currentUserId)
    : false;

  $: iVoted = expedition && currentUserId
    ? expedition.votes?.some(v => v.voterId?._id === currentUserId || v.voterId === currentUserId)
    : false;

  $: otherReady = expedition && expedition.acknowledgements?.length >= (
    iAmReady ? 2 : 1
  );

  $: otherVoted = expedition && expedition.votes?.length >= (
    iVoted ? 2 : 1
  );

  $: iWon = isComplete && expedition.winner && (expedition.winner._id === currentUserId || expedition.winner === currentUserId);
</script>

<div class="expeditions-page">
  <h1>📸 Expeditions</h1>

  {#if error}
    <p class="error-msg">{error}</p>
  {/if}

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if !expedition}
    <div class="empty-state">
      <p>No active expedition. Start one!</p>
      <button class="btn-primary" onclick={newExpedition} disabled={starting}>
        {starting ? 'Generating...' : 'New Expedition'}
      </button>
    </div>
  {:else}
    <div class="challenge-card">
      <h2 class="challenge-label">📋 Challenge</h2>
      <p class="challenge-prompt">{expedition.prompt}</p>
    </div>

    <div class="phase-indicator">
      Status: <strong>
        {#if isActive}
          📷 Take photos
        {:else if isVoting}
          🗳️ Voting
        {:else}
          ✅ Complete
        {/if}
      </strong>
    </div>

    {#if isActive}
      <div class="active-phase">
        <p class="instruction">Take a photo matching the challenge and share it on WhatsApp. Then mark yourself ready here.</p>
        <div class="ready-status">
          <div class="ready-row">
            <span>You: {iAmReady ? '✅ Ready' : '⏳ Not yet'}</span>
            <span>Partner: {otherReady ? '✅ Ready' : '⏳ Not yet'}</span>
          </div>
        </div>

        {#if !iAmReady}
          <button class="btn-primary" onclick={markReady}>I've taken my photo</button>
        {:else if !otherReady}
          <p class="waiting-text">Waiting for your partner to take their photo...</p>
        {/if}
      </div>
    {/if}

    {#if isVoting}
      <div class="voting-phase">
        <p class="instruction">Check WhatsApp to see both photos, then vote for who you think completed the challenge better.</p>

        {#if !iVoted}
          <div class="vote-buttons">
            <p class="vote-label">Who wins this round?</p>
            {#each expedition.acknowledgements as ack}
              {#if ack.userId?._id !== currentUserId && ack.userId !== currentUserId}
                <button class="btn-vote" onclick={() => voteFor(ack.userId._id || ack.userId)}>
                  Vote for {ack.userId?.displayName || ack.userId?.username || 'Them'}
                </button>
              {/if}
            {/each}
          </div>
        {:else if !otherVoted}
          <p class="waiting-text">Waiting for your partner to vote...</p>
        {/if}
      </div>
    {/if}

    {#if isComplete}
      <div class="result-card">
        <h2 class="result-header {iWon ? 'won' : 'lost'}">
          {#if expedition.winner}
            {iWon ? '🎉 You Won!' : `${expedition.winner.displayName || expedition.winner.username || 'They'} Won`}
          {:else}
            🤝 Split Vote — No Winner
          {/if}
        </h2>

        <button class="btn-primary" onclick={newExpedition} disabled={starting}>
          {starting ? 'Generating...' : 'Next Expedition'}
        </button>
      </div>
    {/if}
  {/if}

  {#if scores}
    <div class="scoreboard">
      <div class="score-header">
        <h3>Score</h3>
        <button class="btn-small" onclick={resetScores}>Reset</button>
      </div>
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
  .expeditions-page { padding: 24px; max-width: 600px; margin: 0 auto; }
  .expeditions-page h1 { margin-bottom: 20px; }
  .loading, .empty-state { text-align: center; padding: 48px; color: var(--text-secondary); }
  .empty-state p { margin-bottom: 16px; }
  .error-msg { color: var(--accent); text-align: center; margin-bottom: 16px; }

  .btn-primary { background: var(--accent); color: white; border: none; padding: 10px 24px; border-radius: var(--radius); cursor: pointer; font-size: 0.9rem; }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-small { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 4px 12px; border-radius: var(--radius); cursor: pointer; font-size: 0.75rem; }

  .challenge-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; }
  .challenge-label { font-size: 0.8rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .challenge-prompt { font-size: 1.1rem; line-height: 1.5; }

  .phase-indicator { text-align: center; margin-bottom: 20px; font-size: 0.85rem; color: var(--text-secondary); }
  .phase-indicator strong { color: var(--text-primary); }

  .active-phase, .voting-phase { margin-bottom: 20px; }
  .instruction { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px; text-align: center; }
  .ready-status { margin-bottom: 16px; }
  .ready-row { display: flex; justify-content: space-around; font-size: 0.85rem; }
  .waiting-text { text-align: center; color: var(--accent); font-size: 0.9rem; }

  .vote-buttons { text-align: center; }
  .vote-label { font-size: 0.9rem; margin-bottom: 12px; }
  .btn-vote { background: var(--bg-elevated); border: 1px solid var(--border-color); color: var(--text-primary); padding: 12px 24px; border-radius: var(--radius); cursor: pointer; font-size: 0.9rem; margin: 4px; }
  .btn-vote:hover { background: var(--accent); color: white; border-color: var(--accent); }

  .result-card { text-align: center; padding: 20px; }
  .result-header { font-size: 1.2rem; margin-bottom: 16px; }
  .result-header.won { color: #4caf50; }
  .result-header.lost { color: var(--text-secondary); }

  .scoreboard { margin-top: 24px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 16px; }
  .score-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .score-header h3 { margin: 0; font-size: 0.95rem; }
  .score-row { display: flex; justify-content: space-between; padding: 6px 0; }
  .score-name { font-size: 0.85rem; color: var(--text-secondary); }
  .score-num { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
</style>
```

- [ ] **Step 2: Add routing in `client/src/App.svelte`**

Read `client/src/App.svelte`. Add import:
```javascript
import Expeditions from './pages/Expeditions.svelte';
```

Add to `pageMap`:
```javascript
const pageMap = { ...existing, expeditions: Expeditions };
```

- [ ] **Step 3: Build the client**

Run: `cd client && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Expeditions.svelte client/src/App.svelte
git commit -m "feat(expeditions): add Expeditions Svelte page"
```
