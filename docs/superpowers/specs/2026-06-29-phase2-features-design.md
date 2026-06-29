# Phase 2 Features — Design Spec

## Overview

Three independent features built on shared patterns: Gemini-driven content generation, minimal data storage, no images hosted on-site, desktop-only.

| Feature | AI Usage | Storage | Dependencies |
|---|---|---|---|
| Evolution Pet + Archive | Per-interaction generation, periodic summarization | One `Pet` doc, capped `ArchiveEntry` collection | None |
| Ripple Effect | 2 calls/round (scenario + evaluation) | One `RippleRound` doc per round | None |
| Expeditions | 1 call/round (challenge generation) | One `Expedition` doc per round | None |

---

## 1. Evolution Pet + Archive

### Concept

A shared virtual pet that evolves through interactions. Both users share one pet. Every interaction gives Evolution Points (EP). At EP thresholds, the pet levels up and gains a permanent trait via weighted random selection. The pet can explore locations (unlocked by pet level) and discover entries for the shared Archive.

The pet never dies, never needs scheduled care, and never punishes absence.

### Data Model

```
Pet {
  name: String,                    // user-chosen on creation
  level: Number,                   // starts at 1
  ep: Number,                      // current evolution points
  epToNextLevel: Number,           // EP needed for next level (scales)
  traits: [String],                // array of trait labels, e.g. ["fluffy", "glowing eyes"]
  personality: String,             // Gemini-generated starting description
  currentLocation: String,         // where the pet is (for exploration)
  locationsUnlocked: [String],     // milestone-locked areas
  lifeSummary: String,             // Gemini-generated rolling summary of pet's history
  recentInteractions: [{           // capped at 10, oldest dropped
    userId, action, response, timestamp
  }],
  createdAt, updatedAt
}
```

```
ArchiveEntry {
  location: String,                // which area it was discovered in
  name: String,                    // discovery name
  description: String,             // Gemini-generated on first discovery
  discoveredBy: ObjectId (User),
  discoveredAt: Date,
  discoveryCount: Number           // duplicates increment this
}
```

### API

| Endpoint | Method | Description |
|---|---|---|
| `/api/pet` | GET | Get current pet state (creates one if none exists) |
| `/api/pet/interact` | POST | Submit an interaction (`{ action: "pet it" / "feed it" / "explore" }`) → Gemini interprets, returns narrative, grants EP |
| `/api/pet/explore` | POST | Explore current location → pet discovers something, may add Archive entry |
| `/api/pet/rename` | PATCH | Rename the pet |
| `/api/archive` | GET | List all discovered Archive entries, grouped by location |

### Interaction Flow

1. User visits pet page. Sees pet name, level, EP bar, traits, current location, personality/lifeSummary, recent interactions.
2. User types an action (free text) or clicks an Explore button.
3. **If interact:** Server calls Gemini with pet's current state + user action. Gemini responds with narrative text. Pet gains fixed EP (e.g., 10-20 per interaction). If EP crosses threshold → level up. Server checks if new location should unlock. Periodic summarization: if `recentInteractions.length >= 10`, Gemini condenses the last 10 + existing `lifeSummary` into a new `lifeSummary`, truncates `recentInteractions`.
4. **If explore:** Server checks pet's level against location requirements. Calls Gemini with location context → generates a discovery name + description. Saves to Archive. Returns discovery text to user.

### Leveling Formula

```
epToNextLevel = level * 100
```

Each level: roll weighted RNG on trait pool. Uncommon traits have lower weight. Roll determines which trait the pet acquires. Trait is appended to `traits[]`.

### Locations

| Level | Location | Description |
|---|---|---|
| 1 | The Nest | Starting area, always available |
| 3 | Whispering Forest | Dense woodland with hidden clearings |
| 5 | Crystal Caverns | Underground caves with glowing formations |
| 8 | Ancient Ruins | Remnants of a forgotten civilization |
| 12 | Skybound Peaks | Mountain summits above the clouds |
| 16 | Abyssal Trench | Deep ocean trench |
| 20 | Chronos Gate | A place where time flows differently |
| 25+ | More unlocked by future additions | — |

### Gemini Cost

- Per interaction: ~1 call (interpret action + respond). Tokens: ~800 in / ~300 out.
- Per explore: ~1 call (generate discovery). Tokens: ~500 in / ~200 out.
- Per periodic summary: ~1 call. Tokens: ~2K in / ~400 out.
- **Estimate:** 100 interactions + 20 explores = ~$0.06 on Flash.

---

## 2. Ripple Effect

### Concept

A turn-based prediction game. Gemini generates a historical or alternate-world scenario with a time period, setting, and an inciting event. Both users independently submit what they think happens next. Gemini evaluates both submissions on plausibility and creativity and declares a winner. Score is tracked as running counts.

### Data Model

```
RippleRound {
  scenario: {
    generatedBy: 'gemini',
    timePeriod: String,       // "1450 Inca Empire"
    setting: String,          // "A remote mountain village"
    incitingEvent: String,    // "A shepherd discovers a metal that glows in the dark"
  },
  submissions: [{
    userId: ObjectId,
    prediction: String,
    verdict: 'win' | 'lose' | null,
    reason: String,           // Gemini's explanation for this verdict
  }],
  winner: ObjectId | null,
  status: 'waiting' | 'judging' | 'complete',
  createdAt, updatedAt
}
```

```
RippleScore {
  user1Id: ObjectId,
  user2Id: ObjectId,
  user1Wins: Number,
  user2Wins: Number,
  updatedAt
}
```

### API

| Endpoint | Method | Description |
|---|---|---|
| `/api/ripple/round` | GET | Get current round state — scenario if started, submissions if made |
| `/api/ripple/start` | POST | Generate a new scenario via Gemini, create round |
| `/api/ripple/predict` | POST | Submit prediction (`{ prediction: "..." }`) — only once per user per round |
| `/api/ripple/judge` | POST | Lock both submissions, call Gemini to evaluate, declare winner |
| `/api/ripple/score` | GET | Get current win counts |
| `/api/ripple/reset` | POST | Reset score to 0-0 |

### Round Flow

1. **User A** clicks "New Round" → `POST /api/ripple/start`. Gemini generates scenario. Round enters `waiting` status. Both users see the scenario.
2. **Both users** independently type a prediction and submit via `POST /api/ripple/predict`. The server stores each submission. When the second submission arrives (`submissions.length === 2`), the server **automatically** calls Gemini to judge both predictions. No separate judge endpoint hit needed.
3. **Judging:** Sends both predictions + scenario to Gemini with a prompt to evaluate. Gemini returns for each: `verdict` (win/lose) and `reason`. If both get `win` → draw (no score change). If one `win` and one `lose` → winner gets +1. If both `lose` → no one scores. A `POST /api/ripple/judge` endpoint exists as a manual retry if the auto-judge fails.
4. Results revealed to both users (submissions visible now).
5. Round moves to `complete`. Any user can start a new round.

### Judging Prompt Structure (to Gemini)

```
Evaluate these two predictions for the following scenario:

--- Scenario ---
Time period: {timePeriod}
Setting: {setting}
Inciting event: {incitingEvent}

--- Prediction A (by {user1}) ---
{prediction}

--- Prediction B (by {user2}) ---
{prediction}

Rate each on:
1. Plausibility (0-10): How logically does it follow from the scenario?
2. Creativity (0-10): Is it interesting or unexpected while remaining grounded?

A prediction "wins" if it scores higher on plausibility + creativity combined.
Both can win (draw) or both can lose (neither is reasonable).

Return JSON:
{
  "verdict_a": "win" | "lose",
  "reason_a": "string",
  "verdict_b": "win" | "lose",
  "reason_b": "string"
}
```

### Gemini Cost

- Scenario generation: ~1 call, ~600 in / ~200 out
- Judging: ~1 call, ~1.5K in / ~300 out
- **Per complete round:** ~$0.001 on Flash.

---

## 3. Expeditions

### Concept

A procedural photography challenge generator. The site generates a challenge prompt. Both users are notified. They take photos via WhatsApp in real life. They come back to the site to vote on whose photo completed the challenge better. Both voting for the same person → that person gets a point. Split votes → no points. Next challenge starts when the previous one is resolved.

### Data Model

```
Expedition {
  prompt: String,                 // e.g. "Capture a rusty orange object in a kitchen setting"
  status: 'active' | 'voting' | 'complete',
  acknowledgements: [{ userId, acknowledgedAt }],  // both mark Ready
  votes: [{ voterId, votedForUserId }],
  winner: ObjectId | null,
  createdAt, updatedAt
}
```

```
ExpeditionScore {
  user1Id: ObjectId,
  user2Id: ObjectId,
  user1Wins: Number,
  user2Wins: Number,
  updatedAt
}
```

### API

| Endpoint | Method | Description |
|---|---|---|
| `/api/expeditions/current` | GET | Get active expedition or null |
| `/api/expeditions/new` | POST | Generate a new challenge via Gemini, create expedition |
| `/api/expeditions/ready` | POST | Mark current user as ready (photo taken via WhatsApp) |
| `/api/expeditions/vote` | POST | Vote for a user (`{ votedFor: userId }`) |
| `/api/expeditions/score` | GET | Get current score |
| `/api/expeditions/reset` | POST | Reset score to 0-0 |

### Round Flow

1. Any user clicks "New Expedition" → `POST /api/expeditions/new`. Gemini generates a challenge prompt. Status: `active`.
2. Both users take photos via WhatsApp in real life. They return to the site and click "Ready" (`POST /api/expeditions/ready`).
3. Once both have acknowledged: status changes to `voting`. A voting UI appears with two buttons: "Vote for [User1]" and "Vote for [User2]".
4. Both users vote (`POST /api/expeditions/vote`).
5. Once both votes are cast: if both voted for the same person, that person wins (+1). If split, nobody gets points. Status: `complete`. Winner displayed.
6. Any user can start a new expedition.

### Voting Logic

```
if votes[0].votedFor == votes[1].votedFor:
    winner = votes[0].votedFor
    increment winner's score
else:
    winner = null  // split vote, no score change
```

### Challenge Generation Prompt (to Gemini)

```
Generate a photography challenge for a couple.
Format: "Capture a {adjective} {subject} in a {setting} setting."

Pick from diverse categories: colors, textures, emotions, objects, environments, light conditions.
Make it concrete enough to be doable at home or nearby, but creative enough to be interesting.

Return JSON:
{ "prompt": "..." }
```

### Gemini Cost

- Per challenge: ~1 call, ~400 in / ~100 out.
- **Nearly zero ($0.00005/call).**

---

## Shared Patterns

### Middleware
All endpoints require `authMiddleware` (existing).

### Gemini Service
All Gemini calls go through `server/services/gemini.js` (already exists). No inline API calls.

### Data Growth Control
- Pet: `recentInteractions` capped at 10. `lifeSummary` periodically condensed.
- Ripple: Each round is one small document. Can archive rounds older than N days periodically if needed.
- Expeditions: Same as Ripple — one small doc per round.

### Error States
- **Gemini API down:** All features gracefully degrade with a message: "The AI is resting right now. Try again in a moment." No data loss — user actions that depend on Gemini simply fail with a clear error.
- **Pet not yet created:** Auto-create on first API call.
- **No active expedition:** Show "No active expedition" with "Start New" button.

### UI Pattern
All three features follow the same layout:
- **Pet:** Big center card showing state. Interaction input below. Archive as a sub-tab or separate page.
- **Ripple:** Scenario card at top. Prediction input (visible when it's your turn). Results after judging.
- **Expeditions:** Challenge prompt card. Ready toggle. Voting buttons when both are ready.
