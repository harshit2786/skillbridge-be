# SkillBridge LMS — Backend

Express.js + TypeScript API, Prisma/PostgreSQL, Redis (BullMQ), Qdrant (embeddings), and workers for resource indexing and quiz grading.

---

## Development setup

### Prerequisites

- Node.js 20+ recommended  
- `npm install` in this directory  
- Copy `.env.example` to `.env` and fill in secrets (see below)

---

### Google Cloud Storage (bucket and `gcs-key.json`)

The API and resource worker use a **GCS bucket** for uploads (e.g. knowledge-base PDFs) and authenticate with a **service account JSON key** file.

1. **Open Google Cloud Console** — [console.cloud.google.com](https://console.cloud.google.com/). Select an existing project or **create** one. Copy the **Project ID** into `.env` as `GCS_PROJECT_ID`.

2. **Enable Cloud Storage** — **APIs & Services → Library**, search for **Cloud Storage API**, and enable it if it is not already enabled.

3. **Create a bucket** — **Cloud Storage → Buckets → Create**. Pick a globally unique bucket name, location type/region, and the rest of the wizard (defaults are fine for local dev). After creation, set `GCS_BUCKET_NAME` in `.env` to that bucket name.

4. **Create a service account** — **IAM & Admin → Service Accounts → Create service account**. Give it a name (e.g. `skillbridge-storage`) and create it.

5. **Grant bucket access** — For development you can grant the principal at **project** level, for example **Storage Object Admin** (`roles/storage.objectAdmin`), so the account can create, read, and delete objects in your buckets. For tighter control, skip project-wide roles and instead open your bucket → **Permissions → Grant access**, add the service account’s email, and assign **Storage Object Admin** (or split **Object Creator** + **Object Viewer** if that matches your security policy).

6. **Download the JSON key** — Open the service account → **Keys** tab → **Add key → Create new key → JSON**. A JSON file downloads immediately; you can only download it once.

7. **Place the key in this repo** — Save that file as `gcs-key.json` under `lms-be/` (next to `package.json`). Point `.env` at it, e.g. `GCS_KEY_FILE=./gcs-key.json`. **Never commit `gcs-key.json`**; it should stay gitignored.

8. **Wire `.env`** — Set `GCS_PROJECT_ID`, `GCS_BUCKET_NAME`, and `GCS_KEY_FILE` to match the steps above (see `.env.example`).

When using **Docker**, the compose file mounts the host key into the container; use the default path `./gcs-key.json` or set `GCS_KEY_FILE_HOST` to the host path of your JSON key (see Option 1 below).

---

### Option 1: Docker (full stack)

Runs PostgreSQL, Redis, Qdrant, one-off **migrate + seed**, then **api**, **worker**, and **grader** containers.

1. Place your GCS service account JSON on the host (default path `./gcs-key.json`, same as `GCS_KEY_FILE` in `.env`).  
2. Ensure `.env` exists with at least `JWT_SECRET`, `OPENAI_API_KEY`, GCS fields, Twilio (if using SMS OTP), and any Zoom/Resend keys you need. For compose, `DATABASE_URL` / `REDIS_URL` / `QDRANT_URL` are overridden to service names—local URLs in `.env` are fine as placeholders.  
3. If your key file is not at `./gcs-key.json`, set `GCS_KEY_FILE_HOST` to the host path when starting compose.  
4. From `lms-be/`:

   ```bash
   docker compose up --build
   ```

The API listens on `PORT` (default **3000**). The **migrate** service runs `prisma migrate deploy` and `prisma/seed.ts` once; if the database already has trainers, the seed script **skips** (see seed notes below).

---

### Option 2: Plain local Node (no app containers)

1. **Infrastructure** — run PostgreSQL, Redis, and Qdrant reachable from your machine (install locally or e.g. `docker compose up postgres redis qdrant` if you add a profile, or run only those three services from the same `docker-compose.yml` by stopping after they are healthy and running migrate/seed yourself).  
2. Set `.env` with matching URLs, for example:

   - `DATABASE_URL=postgresql://user:password@localhost:5432/lms`  
   - `REDIS_URL=redis://localhost:6379`  
   - `QDRANT_URL=http://localhost:6333`  
   - `GCS_KEY_FILE=./gcs-key.json` (or your path) plus bucket/project IDs  

3. **Database**

   ```bash
   npm run prisma:generate
   npm run prisma:migrate    # creates/applies migrations (dev)
   npm run prisma:seed       # optional; see seed behavior below
   ```

4. **Compile and run** (three terminals for full behavior):

   ```bash
   npm run dev      # API on PORT (default 3000)
   npm run worker   # resource pipeline (PDF → chunks → embeddings → Qdrant)
   npm run grader   # quiz grading queue (MCQ/TF auto; long-answer via OpenAI)
   ```

There is no dev hot reload; restart processes after code changes.

---

## Seed data (`prisma/seed.ts`)

- Runs only when the database has **no trainers** yet (`trainer.count() === 0`). If you already seeded once, it prints a skip message—empty the DB or reset migrations if you need a fresh seed.  
- Creates **demo/guest** users, several **trainers** and **trainees**, **projects** (e.g. React JS, Node JS, Postgres, Next.js, plus **Demo Project — SkillBridge Tour**), and sample **courses** / **quizzes** with **learning path** order.  
- See the script’s end-of-run **console summary** for emails, phones, and passwords (`password123` for seeded trainers; demo trainer uses `demo123`).

Use this seed to explore the product end-to-end from the frontend against a realistic dataset.

---

## Useful commands

| Command | Purpose |
|--------|---------|
| `npm run dev` | Build TS and start API |
| `npm run worker` | Resource worker |
| `npm run grader` | Quiz grading worker |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Dev migrations |
| `npm run prisma:seed` | Run seed (if DB is empty of trainers) |
| `npm run prisma:studio` | Prisma Studio UI |

---

## Related docs

Deployment and hosting details live in `DEPLOYMENT.md` and `DEPLOYMENT_CHECKLIST.md` in this folder.
