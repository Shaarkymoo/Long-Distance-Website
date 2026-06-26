import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import authRoutes from './routes/auth.js';
import moviesRoutes from './routes/movies.js';
import messagesRoutes from './routes/messages.js';
import musicRoutes from './routes/music.js';
import booksRoutes from './routes/books.js';
import predictionsRoutes from './routes/predictions.js';
import triviaRoutes from './routes/trivia.js';
import challengesRoutes from './routes/challenges.js';
import conversationsRoutes from './routes/conversations.js';
import quizzesRoutes from './routes/quizzes.js';
import dailypuzzlesRoutes from './routes/dailypuzzles.js';
import guessobjectsRoutes from './routes/guessobjects.js';
import whiteboardRoutes from './routes/whiteboard.js';
import notebookRoutes from './routes/notebook.js';
import gamesRoutes from './routes/games.js';
import wledRoutes from './routes/wled.js';
import aiAdventureRoutes from './routes/ai-adventures.js';
import { setupWhiteboardWs } from './whiteboardWs.js';

import User from './models/User.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/couple-website';

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/trivia', triviaRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/dailypuzzles', dailypuzzlesRoutes);
app.use('/api/guessobjects', guessobjectsRoutes);
app.use('/api/whiteboard', whiteboardRoutes);
app.use('/api/ai-adventures', aiAdventureRoutes);
app.use('/api/notebook', notebookRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/wled', wledRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// SPA fallback — serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function seed() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      // No seed — user creates accounts via setup page
      console.log('No users found. Use the setup page to create accounts.');
    }

  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

async function start() {
  try {
    // Ensure temp upload directory exists
    fs.mkdirSync('/tmp/opencode/epub-uploads/', { recursive: true });

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    await seed();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  setupWhiteboardWs(server);
}

start();
