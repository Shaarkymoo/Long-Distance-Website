# Evolution Pet + Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared virtual pet that evolves through Gemini-powered interactions and fills a shared Archive encyclopedia via exploration.

**Architecture:** Pet state stored in a single MongoDB document with capped interaction history and rolling Gemini-generated life summary. Archive entries stored in separate collection keyed by location + discovery name. All AI calls go through existing `server/services/gemini.js`.

**Tech Stack:** Express, Mongoose, Gemini 1.5 Flash REST API, Svelte 5 (runes), Vite

**Spec:** `docs/superpowers/specs/2026-06-29-phase2-features-design.md` (§1)

## Global Constraints

- All Gemini calls through `server/services/gemini.js` — never inline
- Pet `recentInteractions` capped at 10 entries (oldest dropped)
- `lifeSummary` regenerated when `recentInteractions.length >= 10`
- Trait system: weighted RNG from a static pool, no AI for trait generation
- Locations unlock at pet level milestones (1/3/5/8/12/16/20/25+)
- Desktop-only layout (no mobile breakpoints)
- Gemini API key from `process.env.GEMINI_API_KEY`
- Model: `gemini-1.5-flash`
- No cron jobs — summarization happens on interaction if threshold met
- Graceful degradation: if Gemini is down, return clear error, no data loss

---

## File Structure

### Create
| File | Purpose |
|---|---|
| `server/models/Pet.js` | Mongoose schema for pet state |
| `server/models/ArchiveEntry.js` | Mongoose schema for archive discoveries |
| `server/routes/pet.js` | API endpoints: GET /interact /explore /rename |
| `client/src/pages/Pet.svelte` | Pet main page (status + interact + explore) |
| `client/src/pages/Archive.svelte` | Archive encyclopedia page |

### Modify
| File | Change |
|---|---|
| `server/index.js` | Add route imports and `app.use` for pet + archive |
| `client/src/App.svelte` | Add Pet and Archive to page map and navigation (sidebar object on Home.svelte) |

---

### Task 1: Create Pet model

**Files:**
- Create: `server/models/Pet.js`

**Interfaces:**
- Produces: Mongoose model `Pet` with schema matching the spec

- [ ] **Step 1: Create the file**

```javascript
// server/models/Pet.js
import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const petSchema = new mongoose.Schema({
  name: { type: String, default: 'Creature' },
  level: { type: Number, default: 1 },
  ep: { type: Number, default: 0 },
  epToNextLevel: { type: Number, default: 100 },
  traits: [{ type: String }],
  personality: { type: String, default: '' },
  currentLocation: { type: String, default: 'The Nest' },
  locationsUnlocked: [{ type: String }],
  lifeSummary: { type: String, default: '' },
  recentInteractions: { type: [interactionSchema], default: [], maxlength: 10 },
}, { timestamps: true });

// Helper to calculate EP needed for next level
petSchema.statics.calcEpToNextLevel = function(level) {
  return level * 100;
};

export default mongoose.model('Pet', petSchema);
```

- [ ] **Step 2: Verify syntax**

Run: `cd server && node -e "import('./models/Pet.js').then(m => console.log('Pet model OK:', !!m.default))"`
Expected: `Pet model OK: true`

- [ ] **Step 3: Commit**

```bash
git add server/models/Pet.js
git commit -m "feat(pet): add Pet model with capped interactions"
```

---

### Task 2: Create ArchiveEntry model

**Files:**
- Create: `server/models/ArchiveEntry.js`

**Interfaces:**
- Produces: Mongoose model `ArchiveEntry`

- [ ] **Step 1: Create the file**

```javascript
// server/models/ArchiveEntry.js
import mongoose from 'mongoose';

const archiveEntrySchema = new mongoose.Schema({
  location: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  discoveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  discoveredAt: { type: Date, default: Date.now },
  discoveryCount: { type: Number, default: 1 },
});

// Unique per location + name so duplicates increment discoveryCount
archiveEntrySchema.index({ location: 1, name: 1 }, { unique: true });

export default mongoose.model('ArchiveEntry', archiveEntrySchema);
```

- [ ] **Step 2: Verify syntax**

Run: `cd server && node -e "import('./models/ArchiveEntry.js').then(m => console.log('ArchiveEntry model OK:', !!m.default))"`
Expected: `ArchiveEntry model OK: true`

- [ ] **Step 3: Commit**

```bash
git add server/models/ArchiveEntry.js
git commit -m "feat(pet): add ArchiveEntry model"
```

---

### Task 3: Create pet API routes

**Files:**
- Create: `server/routes/pet.js`
- Modify: `server/index.js` (register routes)

**Interfaces:**
- Consumes: `Pet` model (Task 1), `ArchiveEntry` model (Task 2), `callGemini` from `server/services/gemini.js`, `authMiddleware` from `server/middleware/auth.js`
- Produces: 5 API endpoints

- [ ] **Step 1: Create `server/routes/pet.js`**

```javascript
// server/routes/pet.js
import { Router } from 'express';
import Pet from '../models/Pet.js';
import ArchiveEntry from '../models/ArchiveEntry.js';
import { authMiddleware } from '../middleware/auth.js';
import { callGemini } from '../services/gemini.js';

const router = Router();
router.use(authMiddleware);

const TRAIT_POOL = [
  { trait: 'fluffy', weight: 30 },
  { trait: 'shimmering', weight: 20 },
  { trait: 'glowing eyes', weight: 15 },
  { trait: 'translucent wings', weight: 10 },
  { trait: 'crystal scales', weight: 8 },
  { trait: 'shadow tendrils', weight: 6 },
  { trait: 'ancient runes', weight: 4 },
  { trait: 'star-touched', weight: 3 },
  { trait: 'void-touched', weight: 2 },
  { trait: 'timeless', weight: 2 },
];

const LOCATIONS = [
  { level: 1, name: 'The Nest', desc: 'A cozy starting area woven from light and curiosity.' },
  { level: 3, name: 'Whispering Forest', desc: 'Dense woodland where the trees murmur secrets.' },
  { level: 5, name: 'Crystal Caverns', desc: 'Underground caves with glowing mineral formations.' },
  { level: 8, name: 'Ancient Ruins', desc: 'Remnants of a forgotten civilization.' },
  { level: 12, name: 'Skybound Peaks', desc: 'Mountain summits above the clouds.' },
  { level: 16, name: 'Abyssal Trench', desc: 'Deep ocean trench with bioluminescent life.' },
  { level: 20, name: 'Chronos Gate', desc: 'A place where time flows differently.' },
];

function weightedRandomTrait() {
  const totalWeight = TRAIT_POOL.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of TRAIT_POOL) {
    roll -= entry.weight;
    if (roll <= 0) return entry.trait;
  }
  return TRAIT_POOL[0].trait;
}

async function getOrCreatePet() {
  let pet = await Pet.findOne();
  if (!pet) {
    // Generate initial personality via Gemini
    const result = await callGemini({
      systemPrompt: 'You are a creative writer. Describe a unique magical creature in 2-3 sentences. Make it whimsical and original. Do not use cliches like dragons or unicorns.',
      history: [],
      maxOutputTokens: 300,
    });
    const personality = result.text || 'A curious little creature made of starlight and wonder.';
    pet = await Pet.create({
      name: 'Creature',
      personality,
      currentLocation: 'The Nest',
      locationsUnlocked: ['The Nest'],
      epToNextLevel: Pet.calcEpToNextLevel(1),
    });
  }
  return pet;
}

// GET /api/pet — get current pet state
router.get('/', async (req, res) => {
  try {
    const pet = await getOrCreatePet();
    res.json({ pet });
  } catch (err) {
    console.error('Get pet error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/pet/interact — interact with the pet
router.post('/interact', async (req, res) => {
  try {
    const pet = await getOrCreatePet();
    const { action } = req.body;
    if (!action || !action.trim()) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const userDisplay = req.user.displayName || req.user.username;
    const traitsDesc = pet.traits.length > 0 ? pet.traits.join(', ') : 'no special traits yet';
    const systemPrompt = [
      `You are the pet described below. Respond in first person as the pet. Be warm, playful, and express personality through your traits.`,
      `--- Pet Personality ---`,
      pet.personality,
      `--- Current Traits ---`,
      traitsDesc,
      `--- Current Level ---`,
      `${pet.level}`,
      `--- Life Summary ---`,
      pet.lifeSummary || 'A new journey has just begun.',
      `--- Instructions ---`,
      `The user (${userDisplay}) interacts with you: "${action}"`,
      `Respond in 1-3 sentences as the pet. Show your personality through your traits. Be creative and warm.`,
    ].join('\n');

    const result = await callGemini({ systemPrompt, history: [], maxOutputTokens: 400 });
    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    // Add interaction to history (capped at 10)
    pet.recentInteractions.push({
      userId: req.user.id,
      action: action.trim(),
      response: result.text,
    });
    if (pet.recentInteractions.length > 10) {
      pet.recentInteractions.shift();
    }

    // Grant EP and check level up
    const epGain = 15 + Math.floor(Math.random() * 11); // 15-25 EP
    pet.ep += epGain;

    let leveledUp = false;
    let newTrait = null;
    while (pet.ep >= pet.epToNextLevel) {
      pet.ep -= pet.epToNextLevel;
      pet.level += 1;
      pet.epToNextLevel = Pet.calcEpToNextLevel(pet.level);
      leveledUp = true;
      newTrait = weightedRandomTrait();
      pet.traits.push(newTrait);

      // Check for new locations
      for (const loc of LOCATIONS) {
        if (pet.level >= loc.level && !pet.locationsUnlocked.includes(loc.name)) {
          pet.locationsUnlocked.push(loc.name);
        }
      }
    }

    // Auto-summarize if interactions hit threshold
    if (pet.recentInteractions.length >= 10) {
      const summaryPrompt = [
        `Summarize this creature's recent experiences into 2-3 sentences for its life story.`,
        `--- Current Life Summary ---`,
        pet.lifeSummary || 'No prior history.',
        `--- Recent Events ---`,
        pet.recentInteractions.map(i => `- ${i.action}: ${i.response}`).join('\n'),
      ].join('\n');
      const summaryResult = await callGemini({ systemPrompt: summaryPrompt, history: [], maxOutputTokens: 300 });
      if (!summaryResult.error) {
        pet.lifeSummary = summaryResult.text;
      }
      pet.recentInteractions = []; // Reset after summarization
    }

    await pet.save();

    res.json({
      response: result.text,
      epGained: epGain,
      pet: {
        name: pet.name,
        level: pet.level,
        ep: pet.ep,
        epToNextLevel: pet.epToNextLevel,
        traits: pet.traits,
        currentLocation: pet.currentLocation,
        personality: pet.personality,
        lifeSummary: pet.lifeSummary,
        recentInteractions: pet.recentInteractions,
      },
      leveledUp,
      newTrait,
    });
  } catch (err) {
    console.error('Interact error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/pet/explore — explore current location
router.post('/explore', async (req, res) => {
  try {
    const pet = await getOrCreatePet();

    const systemPrompt = [
      `You are the pet. You are exploring "${pet.currentLocation}".`,
      `--- Pet Personality ---`,
      pet.personality,
      `--- Traits ---`,
      pet.traits.join(', ') || 'none yet',
      `--- Instructions ---`,
      `Generate a discovery. What interesting thing does the pet find here?`,
      `Return JSON: { "discoveryName": "short name", "description": "2-3 sentence description" }`,
      `Make it unique and fitting for this location. Avoid repeating common discoveries.`,
    ].join('\n');

    const result = await callGemini({ systemPrompt, history: [], maxOutputTokens: 400 });
    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    let discovery;
    try {
      discovery = JSON.parse(result.text);
    } catch {
      // Fallback if Gemini returns non-JSON
      discovery = {
        discoveryName: 'Something Curious',
        description: result.text.slice(0, 200),
      };
    }

    // Upsert archive entry
    const existing = await ArchiveEntry.findOne({
      location: pet.currentLocation,
      name: discovery.discoveryName,
    });

    if (existing) {
      existing.discoveryCount += 1;
      await existing.save();
      // Duplicate discovery grants bonus EP
      pet.ep += 10;
      await pet.save();
      return res.json({
        discovery: existing,
        duplicate: true,
        bonusEp: 10,
      });
    }

    const entry = await ArchiveEntry.create({
      location: pet.currentLocation,
      name: discovery.discoveryName,
      description: discovery.description,
      discoveredBy: req.user.id,
    });

    // Exploration also grants EP
    pet.ep += 20;
    await pet.save();

    res.json({ discovery: entry, duplicate: false });
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/pet/rename — rename the pet
router.patch('/rename', async (req, res) => {
  try {
    const pet = await getOrCreatePet();
    const { name } = req.body;
    if (!name || !name.trim() || name.trim().length > 50) {
      return res.status(400).json({ error: 'Name must be 1-50 characters' });
    }
    pet.name = name.trim();
    await pet.save();
    res.json({ pet });
  } catch (err) {
    console.error('Rename error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/archive — list all archive entries grouped by location
router.get('/archive', async (req, res) => {
  try {
    const entries = await ArchiveEntry.find().sort({ location: 1, discoveredAt: -1 });
    res.json({ entries });
  } catch (err) {
    console.error('Archive error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

- [ ] **Step 2: Register routes in `server/index.js`**

Read `server/index.js`. After all existing route imports (around line 28), add:
```javascript
import petRoutes from './routes/pet.js';
```

After all existing `app.use` lines (around line 58), add:
```javascript
app.use('/api/pet', petRoutes);
```

- [ ] **Step 3: Verify server starts**

Run: `cd server && timeout 5 node index.js 2>&1 | head -20`
Expected: Server starts, no import errors.

- [ ] **Step 4: Test pet endpoints**

Run:
```bash
# Get or create pet
curl -s http://localhost:8080/api/pet | head -c 200

# Interact
curl -s -X POST http://localhost:8080/api/pet/interact \
  -H "Content-Type: application/json" \
  -d '{"action": "Hello there!"}' | head -c 300
```

Expected: Both return JSON with pet data.

- [ ] **Step 5: Commit**

```bash
git add server/routes/pet.js server/index.js
git commit -m "feat(pet): add pet API routes with interact, explore, archive"
```

---

### Task 4: Build Pet Svelte page

**Files:**
- Create: `client/src/pages/Pet.svelte`
- Modify: `client/src/App.svelte`

- [ ] **Step 1: Create `client/src/pages/Pet.svelte`**

```svelte
<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let { navigateTo } = $props();
  let pet = null;
  let loading = true;
  let error = '';
  let actionText = '';
  let sending = false;
  let exploreLoading = false;

  onMount(loadPet);

  async function loadPet() {
    try {
      const data = await api.get('/pet');
      pet = data.pet;
    } catch (e) {
      error = 'Failed to load pet. Is the server running?';
    } finally {
      loading = false;
    }
  }

  async function interact() {
    if (!actionText.trim() || sending) return;
    sending = true;
    try {
      const data = await api.post('/pet/interact', { action: actionText.trim() });
      actionText = '';
      pet = data.pet;
      // Show response temporarily
      alert(data.response);
      if (data.leveledUp) {
        alert(`🎉 Level up! Pet is now level ${pet.level}!\nNew trait: ${data.newTrait}`);
      }
    } catch (e) {
      error = 'The AI is resting. Try again in a moment.';
    } finally {
      sending = false;
    }
  }

  async function explore() {
    if (exploreLoading) return;
    exploreLoading = true;
    try {
      const data = await api.post('/pet/explore');
      if (data.duplicate) {
        alert(`Already discovered "${data.discovery.name}" (+10 bonus EP!)`);
      } else {
        alert(`Discovered: ${data.discovery.name}\n${data.discovery.description}`);
      }
      loadPet(); // Refresh pet EP
    } catch (e) {
      alert('Could not explore right now. Try again.');
    } finally {
      exploreLoading = false;
    }
  }

  async function renamePet() {
    const name = prompt('Rename your pet:', pet.name);
    if (name && name.trim() && name !== pet.name) {
      try {
        const data = await api.patch('/pet/rename', { name: name.trim() });
        pet = data.pet;
      } catch (e) {
        alert('Could not rename.');
      }
    }
  }

  $: epPercent = pet ? Math.round((pet.ep / pet.epToNextLevel) * 100) : 0;
</script>

<div class="pet-page">
  {#if loading}
    <p class="loading">Summoning your pet...</p>
  {:else if error && !pet}
    <p class="error">{error}</p>
  {:else if pet}
    <div class="pet-card">
      <div class="pet-header">
        <h1 class="pet-name" onclick={renamePet} title="Click to rename">{pet.name}</h1>
        <span class="pet-level">Level {pet.level}</span>
      </div>

      <div class="ep-bar-container">
        <div class="ep-bar" style="width: {epPercent}%"></div>
        <span class="ep-text">{pet.ep} / {pet.epToNextLevel} EP</span>
      </div>

      <p class="pet-personality">{pet.personality}</p>

      {#if pet.lifeSummary}
        <details class="life-summary">
          <summary>Life Story</summary>
          <p>{pet.lifeSummary}</p>
        </details>
      {/if}

      {#if pet.traits.length > 0}
        <div class="traits">
          {#each pet.traits as trait}
            <span class="trait-badge">{trait}</span>
          {/each}
        </div>
      {/if}

      <div class="location-info">
        <span class="location-label">📍 Currently exploring:</span>
        <span class="location-name">{pet.currentLocation}</span>
      </div>

      {#if pet.recentInteractions && pet.recentInteractions.length > 0}
        <details class="recent-log">
          <summary>Recent Interactions</summary>
          <div class="interaction-list">
            {#each [...pet.recentInteractions].reverse() as interaction}
              <div class="interaction">
                <span class="iaction">You: {interaction.action}</span>
                <span class="iresponse">{interaction.response}</span>
              </div>
            {/each}
          </div>
        </details>
      {/if}
    </div>

    <div class="actions">
      <form onsubmit={interact} class="interact-form">
        <input
          type="text"
          bind:value={actionText}
          placeholder="Pet it, feed it, play with it..."
          disabled={sending}
        />
        <button type="submit" disabled={sending || !actionText.trim()}>
          {sending ? '...' : 'Do'}
        </button>
      </form>

      <button class="explore-btn" onclick={explore} disabled={exploreLoading}>
        {exploreLoading ? 'Exploring...' : 'Explore ' + pet.currentLocation}
      </button>

      <button class="archive-btn" onclick={() => navigateTo('archive')}>
        📖 View Archive
      </button>
    </div>
  {/if}
</div>

<style>
  .pet-page { padding: 24px; max-width: 600px; margin: 0 auto; }
  .loading, .error { text-align: center; padding: 48px; color: var(--text-secondary); }
  .pet-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 24px; margin-bottom: 20px; }
  .pet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .pet-name { margin: 0; font-size: 1.5rem; cursor: pointer; }
  .pet-level { font-size: 0.85rem; color: var(--accent); font-weight: 600; }
  .ep-bar-container { position: relative; height: 20px; background: var(--bg-elevated); border-radius: 10px; margin-bottom: 16px; overflow: hidden; }
  .ep-bar { height: 100%; background: linear-gradient(90deg, var(--accent), #ff8a5c); border-radius: 10px; transition: width 0.3s ease; }
  .ep-text { position: absolute; right: 8px; top: 2px; font-size: 0.75rem; color: white; font-weight: 600; }
  .pet-personality { font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); margin-bottom: 16px; }
  .life-summary { margin-bottom: 12px; font-size: 0.85rem; color: var(--text-secondary); }
  .traits { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .trait-badge { background: var(--bg-elevated); color: var(--accent); font-size: 0.75rem; padding: 3px 10px; border-radius: 12px; border: 1px solid var(--border-color); }
  .location-info { margin-bottom: 16px; font-size: 0.85rem; }
  .location-label { color: var(--text-secondary); }
  .location-name { color: var(--text-primary); font-weight: 600; }
  .recent-log { margin-bottom: 12px; font-size: 0.85rem; }
  .recent-log summary { color: var(--text-secondary); cursor: pointer; }
  .interaction-list { margin-top: 8px; max-height: 300px; overflow-y: auto; }
  .interaction { padding: 8px; border-bottom: 1px solid var(--border-color); }
  .iaction { display: block; font-weight: 600; color: var(--accent); margin-bottom: 4px; }
  .iresponse { display: block; color: var(--text-secondary); line-height: 1.4; }
  .actions { display: flex; flex-direction: column; gap: 12px; }
  .interact-form { display: flex; gap: 8px; }
  .interact-form input { flex: 1; padding: 10px; border-radius: var(--radius); border: 1px solid var(--border-color); font-size: 0.9rem; background: var(--bg-card); color: var(--text-primary); }
  .interact-form button, .explore-btn, .archive-btn { padding: 10px 20px; border-radius: var(--radius); border: 1px solid var(--border-color); font-size: 0.85rem; cursor: pointer; background: var(--bg-elevated); color: var(--text-primary); }
  .interact-form button:hover, .explore-btn:hover, .archive-btn:hover { background: var(--accent); color: white; border-color: var(--accent); }
  .explore-btn { background: var(--bg-surface); }
  .archive-btn { background: var(--bg-surface); }
</style>
```

- [ ] **Step 2: Create `client/src/pages/Archive.svelte`**

```svelte
<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';

  let { navigateTo } = $props();
  let entries = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const data = await api.get('/pet/archive');
      entries = data.entries;
    } catch (e) {
      error = 'Failed to load archive.';
    } finally {
      loading = false;
    }
  });

  $: grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.location]) acc[entry.location] = [];
    acc[entry.location].push(entry);
    return acc;
  }, {});
</script>

<div class="archive-page">
  <div class="archive-header">
    <button class="back-btn" onclick={() => navigateTo('pet')}>← Pet</button>
    <h1>📖 Archive</h1>
  </div>

  {#if loading}
    <p class="loading">Loading discoveries...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if entries.length === 0}
    <div class="empty">
      <p>No discoveries yet. Explore with your pet to fill the archive!</p>
      <button class="back-btn" onclick={() => navigateTo('pet')}>Go to Pet</button>
    </div>
  {:else}
    {#each Object.entries(grouped) as [location, locEntries]}
      <div class="location-group">
        <h2 class="location-title">{location}</h2>
        <div class="entry-grid">
          {#each locEntries as entry}
            <div class="entry-card">
              <h3 class="entry-name">{entry.name}</h3>
              <p class="entry-desc">{entry.description}</p>
              <span class="entry-count">Found {entry.discoveryCount} time{entry.discoveryCount > 1 ? 's' : ''}</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .archive-page { padding: 24px; max-width: 700px; margin: 0 auto; }
  .archive-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .archive-header h1 { margin: 0; }
  .back-btn { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 6px 14px; border-radius: var(--radius); cursor: pointer; font-size: 0.85rem; }
  .back-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .loading, .error, .empty { text-align: center; padding: 48px; color: var(--text-secondary); }
  .location-group { margin-bottom: 28px; }
  .location-title { font-size: 1.1rem; color: var(--accent); margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color); }
  .entry-grid { display: flex; flex-direction: column; gap: 8px; }
  .entry-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 14px; }
  .entry-name { margin: 0 0 6px 0; font-size: 0.95rem; }
  .entry-desc { margin: 0 0 8px 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; }
  .entry-count { font-size: 0.75rem; color: var(--text-muted, #666); }
</style>
```

- [ ] **Step 3: Add routing in `client/src/App.svelte`**

Read `client/src/App.svelte`. Add imports after the existing `import PageHelp` line:
```javascript
import Pet from './pages/Pet.svelte';
import Archive from './pages/Archive.svelte';
```

Add to `pageMap`:
```javascript
const pageMap = { ...existing, pet: Pet, archive: Archive };
```

Update `resolvePath()` to handle the `pet` and `archive` paths. Read the existing function — it should already handle lookup via `pageMap[path]`, so registered pages should work automatically. Verify by checking the current logic.

- [ ] **Step 4: Build the client**

Run: `cd client && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Pet.svelte client/src/pages/Archive.svelte client/src/App.svelte
git commit -m "feat(pet): add pet and archive Svelte pages"
```
