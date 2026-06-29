import { Router } from 'express';
import Pet from '../models/Pet.js';
import ArchiveEntry from '../models/ArchiveEntry.js';
import { authMiddleware } from '../middleware/auth.js';
import { callGemini } from '../services/gemini.js';

const router = Router();

router.use(authMiddleware);

const TRAIT_POOL = [
  { trait: 'Loyal', weight: 30 },
  { trait: 'Affectionate', weight: 20 },
  { trait: 'Playful', weight: 15 },
  { trait: 'Curious', weight: 10 },
  { trait: 'Brave', weight: 8 },
  { trait: 'Gentle', weight: 6 },
  { trait: 'Witty', weight: 4 },
  { trait: 'Artistic', weight: 3 },
  { trait: 'Mysterious', weight: 2 },
  { trait: 'Wise', weight: 2 },
];

const LOCATIONS = [
  { level: 1, name: 'The Cozy Home' },
  { level: 3, name: 'Sunset Garden' },
  { level: 5, name: 'Memory Beach' },
  { level: 8, name: 'Starry Observatory' },
  { level: 12, name: 'Whispering Woods' },
  { level: 16, name: 'Crystal Cavern' },
  { level: 20, name: 'Celestial Summit' },
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

function getLocationsForLevel(level) {
  return LOCATIONS.filter(l => l.level <= level).map(l => l.name);
}

router.get('/', async (req, res) => {
  try {
    let pet = await Pet.findOne({ coupleId: req.user.coupleId });
    if (!pet) {
      const result = await callGemini({
        systemPrompt: 'You are creating a virtual pet for a couple in a long-distance relationship. Generate a unique personality for their pet (2-3 sentences describing its temperament, quirks, and how it brings them together). Be creative and warm.',
        history: [],
        maxOutputTokens: 300,
      });
      if (result.error) {
        return res.status(502).json({ error: result.error });
      }
      pet = await Pet.create({
        personality: result.text,
        locationsUnlocked: ['The Cozy Home'],
        coupleId: req.user.coupleId,
      });
    }
    res.json({ pet });
  } catch (err) {
    console.error('Get pet error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/interact', async (req, res) => {
  try {
    const { action } = req.body;
    if (!action || !action.trim()) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const pet = await Pet.findOne({ coupleId: req.user.coupleId });
    if (!pet) {
      return res.status(404).json({ error: 'No pet found. Create one first.' });
    }

    const systemPrompt = [
      `You are ${pet.name || 'the pet'}, a virtual pet for a couple in a long-distance relationship.`,
      `Personality: ${pet.personality}`,
      `Level: ${pet.level}`,
      `Traits: ${pet.traits.join(', ') || 'none yet'}`,
      `Current Location: ${pet.currentLocation}`,
      ``,
      `Respond to the user's action in character as the pet. Keep responses to 1-2 sentences. Be warm, playful, and affectionate.`,
    ].join('\n');

    const recentHistory = pet.recentInteractions.slice(-5).map(i => ({
      author: 'user',
      content: i.action,
    }));

    const result = await callGemini({
      systemPrompt,
      history: recentHistory,
      maxOutputTokens: 300,
    });

    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    const response = result.text;

    pet.recentInteractions.push({
      userId: req.user.id,
      action: action.trim(),
      response,
    });

    if (pet.recentInteractions.length > 10) {
      pet.recentInteractions = pet.recentInteractions.slice(-10);
    }

    pet.totalInteractions += 1;

    const epGain = Math.floor(Math.random() * 11) + 15;
    pet.ep += epGain;

    while (pet.ep >= pet.epToNextLevel) {
      pet.ep -= pet.epToNextLevel;
      pet.level += 1;
      pet.epToNextLevel = Pet.calcEpToNextLevel(pet.level);

      const newTrait = weightedRandomTrait();
      if (!pet.traits.includes(newTrait)) {
        pet.traits.push(newTrait);
      }

      const newLocations = getLocationsForLevel(pet.level);
      for (const loc of newLocations) {
        if (!pet.locationsUnlocked.includes(loc)) {
          pet.locationsUnlocked.push(loc);
        }
      }
      pet.currentLocation = newLocations[newLocations.length - 1] || pet.currentLocation;
    }

    if (pet.totalInteractions > 0 && pet.totalInteractions % 10 === 0) {
      const summaryPrompt = [
        `Write a brief life summary (2-3 sentences) for ${pet.name || 'the pet'}, our virtual pet.`,
        `Personality: ${pet.personality}`,
        `Level: ${pet.level}`,
        `Traits: ${pet.traits.join(', ') || 'none yet'}`,
        `Location: ${pet.currentLocation}`,
        ``,
        `Capture its journey, growth, and key memories in a warm, narrative tone.`,
      ].join('\n');

      const summaryResult = await callGemini({
        systemPrompt: summaryPrompt,
        history: [],
        maxOutputTokens: 300,
      });

      if (!summaryResult.error) {
        pet.lifeSummary = summaryResult.text;
      }
    }

    pet.markModified('recentInteractions');
    await pet.save();

    res.json({ response, pet });
  } catch (err) {
    console.error('Interact error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/explore', async (req, res) => {
  try {
    const pet = await Pet.findOne({ coupleId: req.user.coupleId });
    if (!pet) {
      return res.status(404).json({ error: 'No pet found. Create one first.' });
    }

    const systemPrompt = [
      `You generate discoveries for a virtual pet exploring "${pet.currentLocation}".`,
      `Personality: ${pet.personality}`,
      `Traits: ${pet.traits.join(', ') || 'none yet'}`,
      ``,
      `Generate one unique discovery in JSON: { "name": "...", "description": "..." }`,
      `Name: short title. Description: 1-2 sentences, sentimental and meaningful for a couple.`,
      `Respond ONLY with valid JSON. No markdown.`,
    ].join('\n');

    const result = await callGemini({
      systemPrompt,
      history: [],
      maxOutputTokens: 300,
    });

    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    let discovery;
    try {
      discovery = JSON.parse(result.text.replace(/```json|```/g, ''));
    } catch {
      return res.status(502).json({ error: 'Invalid discovery format from AI' });
    }

    if (!discovery.name || !discovery.description) {
      return res.status(502).json({ error: 'Discovery missing name or description' });
    }

    const trimmedName = discovery.name.trim();
    const trimmedDesc = discovery.description.trim();

    const existing = await ArchiveEntry.findOne({
      coupleId: req.user.coupleId,
      location: pet.currentLocation,
      name: trimmedName,
    });

    if (existing) {
      existing.discoveryCount += 1;
      existing.discoveredAt = new Date();
      await existing.save();
      return res.json({ discovery: existing, duplicate: true });
    }

    const entry = await ArchiveEntry.create({
      coupleId: req.user.coupleId,
      location: pet.currentLocation,
      name: trimmedName,
      description: trimmedDesc,
      discoveredBy: req.user.id,
    });

    res.status(201).json({ discovery: entry });
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/rename', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 1 || name.trim().length > 50) {
      return res.status(400).json({ error: 'Name must be between 1 and 50 characters' });
    }

    const pet = await Pet.findOne({ coupleId: req.user.coupleId });
    if (!pet) {
      return res.status(404).json({ error: 'No pet found. Create one first.' });
    }

    pet.name = name.trim();
    await pet.save();

    res.json({ pet });
  } catch (err) {
    console.error('Rename error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/archive', async (req, res) => {
  try {
    const entries = await ArchiveEntry.find({ coupleId: req.user.coupleId })
      .populate('discoveredBy', 'username displayName')
      .sort({ location: 1 });
    res.json({ entries });
  } catch (err) {
    console.error('Archive error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
