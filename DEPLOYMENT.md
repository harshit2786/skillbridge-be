# LMS Backend Deployment Guide

This guide walks you through deploying the LMS backend to free cloud services.

## Prerequisites

- Accounts created on: Supabase, Upstash, Qdrant Cloud, Render
- Git repository with your code (required for Render)
- Google Cloud Storage credentials (JSON key file)
- OpenAI API key

---

## Step 1: Supabase (PostgreSQL)

1. **Create New Project**
   - Go to [Supabase](https://supabase.com)
   - Click "New Project"
   - Name: `lms-postgres`
   - Database Password: Generate strong password
   - Region: Choose closest to your users
   - Pricing: Free tier
   - Click "Create new project"

2. **Wait for Project Creation**
   - This takes 1-3 minutes

3. **Get Connection String**
   - Go to Project Settings → Database
   - Copy the **"URI"** connection string:
     ```
     postgresql://postgres.YOUR_PROJECT_ID:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
     ```

4. **Store for Later**
   ```
   DATABASE_URL=postgres://postgres.YOUR_PROJECT_ID:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```
   **Important**: Add `?pgbouncer=true&connection_limit=1` to the end

---

## Step 2: Upstash (Redis)

1. **Create Redis Database**
   - Go to [Upstash](https://upstash.com)
   - Click "Create Database"
   - Name: `lms-redis`
   - Region: Choose same region as Supabase
   - Type: Regional (free)
   - Click "Create"

2. **Get Connection URL**
   - Go to your database details
   - Under "REST API", copy the **"Upstash REST URL"**
   - It looks like:
     ```
     https://us1-full-ferret-40248.upstash.io
     ```

3. **Get Token**
   - Still in "REST API" section
   - Copy **"API token"**

4. **Construct Redis URL**
   ```
   REDIS_URL=rediss://:TOKEN@HOST:PORT
   
   # Example:
   REDIS_URL=rediss://:AbCdEfGh@us1-full-ferret-40248.upstash.io:40248
   ```

---

## Step 3: Qdrant Cloud (Vector Database)

1. **Create Cluster**
   - Go to [Qdrant Cloud](https://cloud.qdrant.io)
   - Click "Create Cluster"
   - Name: `lms-qdrant`
   - Provider: AWS or GCP
   - Region: Same as your other services
   - Tier: Free (1GB)
   - Click "Create"

2. **Wait for Cluster Provisioning**
   - Takes 1-2 minutes

3. **Get API URL**
   - Click on your cluster name
   - Copy the **"API URL"** (not gRPC URL)
   - It looks like:
     ```
     https://abc12345-xyz.us-east-1-0.aws.cloud.qdrant.io:6333
     ```

4. **Get API Key**
   - Click "Data Access Control"
   - Copy the **"API Key"**

5. **Store Connection Info**
   ```
   QDRANT_URL=https://YOUR_CLUSTER_URL:6333
   # API Key will be added as a header by your application
   ```

---

## Step 4: Prepare Google Cloud Storage

1. **Service Account Key**
   - You should have a file named `gcs-key.json`
   - Keep it secure - never commit to git

2. **Create Production Environment File**
   ```bash
   # In lms-be/ directory, create:
   touch production.env
   ```

3. **Add all variables** (fill in your values):
   ```bash
   # production.env
   PORT=3000
   JWT_SECRET=generate-strong-random-key-here
   DATABASE_URL=postgresql://postgres.YOUR_PROJECT_ID:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   REDIS_URL=rediss://:TOKEN@HOST:PORT
   QDRANT_URL=https://YOUR_CLUSTER_URL:6333
   OPENAI_API_KEY=sk-your-openai-key
   GCS_BUCKET_NAME=your-bucket-name
   GCS_PROJECT_ID=your-gcp-project-id
   GCS_KEY_FILE=./gcs-key.json
   # Twilio (optional, for trainee login via SMS)
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

---

## Step 5: Deploy to Render

### Method A: Automatic Deployment (Recommended)

1. **Connect GitHub Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub account
   - Select your repository

2. **Upload GCS Credentials**
   - In the blueprint setup, you'll need to provide your `gcs-key.json`
   - Save it as a file and upload when prompted or set as environment variable

3. **Set Environment Variables**
   - Copy all variables from `production.env`
   - Paste into Render environment variables section
   - For the GCS key, you'll need to:
     - Convert JSON to single-line string:
       ```bash
       cat gcs-key.json | jq -c .
       ```
     - Or set as file mount (better - see below)

4. **Deploy**
   - Click "Apply Render Blueprint"
   - Render will create all 3 services automatically
   - Wait 5-10 minutes for initial deployment

### Method B: Manual Service Creation

If Blueprint doesn't work, create services manually:

1. **Create API Service**
   - Click "New" → "Web Service"
   - Connect GitHub repo
   - Build command: `npm ci && npx prisma generate && npx tsc -b`
   - Start command: `node dist/index.js`
   - Set environment variables
   - Click "Create Web Service"

2. **Create Worker Service**
   - Click "New" → "Background Worker"
   - Same repo
   - Build command: same as above
   - Start command: `node dist/worker/resourceWorker.js`
   - Copy environment variables from API service

3. **Create Grader Service**
   - Click "New" → "Background Worker"
   - Start command: `node dist/worker/quizGradingWorker.js`
   - Copy environment variables

---

## Step 6: Initial Database Setup

After deployment, you need to run migrations and seeding:

1. **Open Render Shell**
   - Go to your API service dashboard
   - Click "Shell" tab

2. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Run Seed Script**
   ```bash
   npm run prisma:seed
   # or
   npx tsx prisma/seed.ts
   ```

   **Note**: If `tsx` isn't available in production, you might need to install dev dependencies temporarily or run migration locally pointing to the cloud DB.

---

## Step 7: Verify Deployment

### Check Logs

1. **API Service**
   - View logs in Render dashboard
   - Should see: `Server running on port 3000`
   - Should see: `Connected to Redis, Qdrant, PostgreSQL`

2. **Worker Service**
   - Should see: `Resource worker started`
   - Should see: `Connected to Redis`

3. **Grader Service**
   - Should see: `Quiz grading worker started`
   - Should see: `Connected to Redis`

### Test the API

1. **Get API URL**
   - From Render dashboard, copy your API service URL
   - Looks like: `https://lms-be-api.onrender.com`

2. **Test Health Endpoint**
   ```bash
   curl https://lms-be-api.onrender.com/api/health
   # Should return: {"status":"OK"}
   ```

3. **Test Auth (if you seeded data)**
   ```bash
   # For trainer login
   curl -X POST https://lms-be-api.onrender.com/api/trainer/login \
     -H "Content-Type: application/json" \
     -d '{"email":"trainer@example.com","password":"password123"}'
   ```

---

## Step 8: Connect Frontend

Update your frontend `.env`:

```bash
VITE_API_BASE_URL=https://lms-be-api.onrender.com/api
```

Then redeploy your frontend.

---

## Troubleshooting

### GCS Credentials Issue

If you get GCS authentication errors:

1. **Check file permissions:**
   ```bash
   # In Render shell:
   ls -la /etc/secrets/gcs-key.json
   # Should be readable
   ```

2. **Verify GCS key format:**
   ```bash
   cat /etc/secrets/gcs-key.json | python -m json.tool
   # Should show valid JSON
   ```

### Database Connection Issues

1. **Check connection string:**
   ```bash
   # In Render shell:
   echo $DATABASE_URL
   # Should match your Supabase URI
   ```

2. **Test direct connection:**
   ```bash
   npm install pg
   node -e "
   const { Client } = require('pg');
   const client = new Client({ connectionString: process.env.DATABASE_URL });
   client.connect().then(() => console.log('Connected')).catch(console.error);
   "
   ```

### Redis Connection

1. **Test Redis:**
   ```bash
   npm install ioredis
   node -e "
   const Redis = require('ioredis');
   const redis = new Redis(process.env.REDIS_URL);
   redis.ping().then(console.log).catch(console.error);
   "
   ```

### Qdrant Connection

If AI Playground search doesn't work:

1. **Check Qdrant connectivity:**
   ```bash
   npm install @qdrant/js-client-rest
   node -e "
   const { QdrantClient } = require('@qdrant/js-client-rest');
   const client = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });
   client.getCollections().then(console.log).catch(console.error);
   "
   ```

2. **Add QDRANT_API_KEY environment variable** if missing

---

## Important Notes

### Free Tier Limitations

- **Supabase**: 500 MB storage, 2GB bandwidth
- **Upstash**: 10k commands/day (~1 req/sec average)
- **Qdrant**: 1GB storage
- **Render**: 750 hours/month (enough for all 3 services)
- **GCS**: 5GB free storage per month
- **OpenAI**: Pay-as-you-go, monitor usage!

### Scaling Workers

If workers are overloaded:

1. **Check queue length** in your app
2. **Scale workers** in Render dashboard (paid tier)
3. **Optimize** by reducing embedding chunk size

### Security Best Practices

1. **Never commit secrets** to git
2. **Use strong JWT secret** (generate with: `openssl rand -base64 32`)
3. **Rotate API keys** regularly
4. **Use environment-specific** database URLs
5. **Restrict GCS bucket** permissions

---

## Cleanup

To avoid charges if you stop using:

1. Delete Render services
2. Delete Supabase project
3. Delete Upstash database
4. Delete Qdrant Cloud cluster
5. Delete GCS bucket (or objects)

---

## Support

If you encounter issues:

1. Check service logs in respective dashboards
2. Test connections individually
3. Verify environment variables
4. Check free tier limits
5. Open GitHub issue in your repository

Good luck with your deployment!