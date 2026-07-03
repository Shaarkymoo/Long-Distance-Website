# Long Distance Website

A private shared website for couples, featuring shared activities, games, and tools — all self-hosted.

## Features

- **Movies** — suggest movies, track who watched what, automatic debt calculation
- **Books** — per-user book tracker with page progress
- **Games** — curated directory of multiplayer games to play together
- **Conversations** — random conversation starter prompts
- **Predictions** — bet tracker with scoreboard
- **Quizzes** — personality quiz compare mode
- **Trivia** — 1v1 trivia with leaderboard
- **Puzzles** — daily puzzle links with completion tracking
- **AI Adventures** — turn-based co-op text adventures powered by Gemini 2.5 Flash
- **Whiteboard** — shared drawing canvas
- **Messages** — leave notes for each other
- **Notebook** — collaborative notes
- **Challenges** — couple challenge generator
- **Ripple** — effects/playground page
- **Expeditions** — photo challenge board
- **Pet** — digital pet
- **Archive** — shared media archive
- **Light** — smart light control (WLED-ready)

## Tech Stack

- **Frontend:** Svelte 4 + Vite 5
- **Backend:** Node.js + Express 4
- **Database:** MongoDB (Mongoose 8)
- **Auth:** JWT with bcryptjs password hashing
- **AI:** Google Gemini 2.5 Flash API
- **Hosting:** Docker → Google Cloud Run
- **Security:** helmet, express-rate-limit

## Development

```bash
# Install dependencies
npm run install:all

# Start server (http://localhost:8080)
cd server && npm run dev

# Start client dev server (http://localhost:5173)
cd client && npm run dev

# Build client for production
npm run build

# Run tests
npm test
```

### Environment Variables

Create `server/.env`:

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
GEMINI_API_KEY=your-key
```

## Deployment

```bash
npm run deploy
```

Deploys to Google Cloud Run with scale-to-zero.
Uses a single Docker container (Express serves both API and client static files).

## Project Structure

```
├── client/          Svelte SPA
│   ├── src/
│   │   ├── pages/       Page components
│   │   ├── lib/         Utilities, stores, API client
│   │   └── components/  Shared components
├── server/          Express API
│   ├── routes/          API route handlers
│   ├── models/          Mongoose schemas
│   ├── middleware/      Auth middleware
│   └── services/        Shared services (Gemini)
├── tests/           Test files
├── other files/     Planning docs, reference content
└── .omo/            Agent working files
```

## License

Private — for personal use.
