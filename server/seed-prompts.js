import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/couple-website';

async function seedPrompts() {
  console.log(`Connecting to ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  // Define schema inline so we don't depend on the model file
  const promptSchema = new mongoose.Schema({
    coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', default: null },
    promptText: { type: String },
    isCurrent: { type: Boolean, default: false },
    thoughts: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
  });
  const Prompt = mongoose.model('ConversationPrompt', promptSchema);

  // Drop existing prompts
  await Prompt.deleteMany({});
  console.log('Cleared existing prompts.\n');

  const projectRoot = path.join(__dirname);
  const file1 = path.join(projectRoot, 'other files', 'parade_fun_questions.txt');
  const file2 = path.join(projectRoot, 'other files', 'conversation_parade_questions.txt');

  // Normalize paths to handle the actual location
  const tryPaths = [
    file1, file2,
    path.join(projectRoot, '..', 'other files', 'parade_fun_questions.txt'),
    path.join(projectRoot, '..', 'other files', 'conversation_parade_questions.txt'),
    '/media/shaarky/Data/Projects/Long-Distance-Website/other files/parade_fun_questions.txt',
    '/media/shaarky/Data/Projects/Long-Distance-Website/other files/conversation_parade_questions.txt',
  ];

  const lines = [];

  for (const filePath of tryPaths) {
    if (!fs.existsSync(filePath)) continue;
    if (lines.some(l => l.source === filePath)) continue; // skip if already read

    console.log(`Reading ${path.basename(filePath)}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileLines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(l => l.length > 0);
    lines.push(...fileLines.map(t => ({ text: t, source: filePath })));
  }

  // Deduplicate
  const seen = new Set();
  const unique = lines.filter(l => {
    const lower = l.text.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  }).map(l => l.text);

  console.log(`Parsed ${lines.length} lines, ${unique.length} unique prompts.\n`);

  // Insert
  await Prompt.insertMany(
    unique.map(text => ({ promptText: text, coupleId: null }))
  );

  const count = await Prompt.countDocuments();
  console.log(`Seeded ${count} conversation prompts successfully. Check coupleId is null:`, await Prompt.countDocuments({ coupleId: null }));

  await mongoose.disconnect();
  console.log('Done.');
}

seedPrompts().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
