# LMS Backend - Agent Instructions

## Build & Run

**Critical**: Always compile TypeScript before running:
```bash
# Build everything
tsc -b

# Run API server
npm run dev

# In separate terminals, run workers:
npm run worker      # Resource processing worker
npm run grader      # Quiz grading worker
```

All three processes (API, worker, grader) must run simultaneously for full functionality.

## Database

```bash
# Generate Prisma client (required after schema changes)
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Explore data
npm run prisma:studio
```

Database URL format: `postgresql://user:pass@host:5432/dbname`

## Environment Requirements

Copy `.env.example` to `.env` and configure:
- **JWT_SECRET**: Must be set for auth
- **DATABASE_URL**: PostgreSQL connection
- **REDIS_URL**: `redis://localhost:6379` (required for queues)
- **QDRANT_URL**: `http://localhost:6333` (vector search)
- **GCS_KEY_FILE**: Path to Google Cloud Storage service account key
- **OPENAI_API_KEY**: For embeddings generation
- **TWILIO_***: For SMS OTP (trainee auth)

## Architecture

- **Entry**: `src/index.ts` → Express API server
- **Workers**: 
  - `src/worker/resourceWorker.ts` - Processes uploaded resources (PDFs → embeddings)
  - `src/worker/quizGradingWorker.ts` - Grades quiz attempts asynchronously
- **Queues**: BullMQ over Redis (`src/lib/queue.ts`)
- **Auth**: JWT-based, separate trainer/trainee flows
- **Storage**: Google Cloud Storage for resources
- **Search**: Qdrant vector DB for content similarity

## Development Workflow

1. Edit source in `src/`
2. `tsc -b` to compile
3. Restart relevant process(es)
4. No tests currently configured (`npm test` exits with error)

## API Structure

RESTful design with nested routes:
- Projects contain Courses, Quizzes, Resources, Playground chats
- Courses/Quizzes have Sections, which have Questions
- All routes scoped under `/api/projects/:projectId/`

See README.md for complete endpoint list.

## Known Quirks

- **Module system**: ES modules (`"type": "module"` in package.json)
- **Build output**: Compiled to `dist/`, run from there
- **Queue persistence**: Jobs remain in Redis until processed
- **No hot reload**: Manual restart required after changes
- **Seed script**: Uses `tsx` (TypeScript execute) directly
