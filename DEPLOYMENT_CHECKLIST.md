# Quick Deployment Checklist

Follow this checklist to ensure you complete all deployment steps correctly.

## Pre-Deployment Setup

- [ ] Created Supabase account and project
- [ ] Created Upstash account and Redis database
- [ ] Created Qdrant Cloud account and cluster
- [ ] Created Render account and connected GitHub
- [ ] Have Google Cloud Storage bucket and service account key (`gcs-key.json`)
- [ ] Have OpenAI API key

---

## Environment Variable Collection

Fill in each value as you obtain it:

#### Supabase PostgreSQL
```
DATABASE_URL=
```

#### Upstash Redis
```
REDIS_URL=
```

#### Qdrant Cloud
```
QDRANT_URL=
QDRANT_API_KEY=
```

#### OpenAI
```
OPENAI_API_KEY=
```

#### JWT Secret (generate one)
```bash
openssl rand -base64 32
```
```
JWT_SECRET=
```

#### Google Cloud Storage
```
GCS_BUCKET_NAME=
GCS_PROJECT_ID=
```

#### Twilio (optional)
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Deployment Steps

### 1. Supabase Setup
- [ ] Project created
- [ ] Connection string copied from Project Settings → Database
- [ ] Added query parameters: `?pgbouncer=true&connection_limit=1`

### 2. Upstash Setup
- [ ] Redis database created
- [ ] Copied REST URL and API token
- [ ] Formatted REDIS_URL correctly (`rediss://:token@host:port`)

### 3. Qdrant Setup
- [ ] Cluster created and active
- [ ] API URL copied
- [ ] API key copied

### 4. Prepare gcs-key.json
- [ ] File is valid JSON
- [ ] File is accessible but not committed to git
- [ ] Has proper permissions set (if needed)

### 5. Render Deployment
**Method A: Blueprint (Recommended)**
- [ ] Created `render.yaml` file in project root
- [ ] Pushed changes to GitHub
- [ ] Connected repository to Render
- [ ] Uploaded `gcs-key.json` to persistent disk
- [ ] Set environment variables in Render dashboard
- [ ] Deployed successfully

**Method B: Manual**
- [ ] Created API web service
- [ ] Created Worker background service
- [ ] Created Grader background service
- [ ] Set environment variables for all three services
- [ ] All services show "Live" status

### 6. Database Migration & Seeding
- [ ] Opened Render shell for API service
- [ ] Ran: `npx prisma migrate deploy`
- [ ] Ran: `npm run prisma:seed`
- [ ] No errors in output

### 7. Post-Deployment Verification

#### Check Logs
- [ ] API service logs show "Server running"
- [ ] Worker service logs show "Resource worker started"
- [ ] Grader service logs show "Quiz grading worker started"
- [ ] No connection errors in any service

#### Test API Endpoints
- [ ] Health check: `GET /api/health` returns 200
- [ ] (Optional) Trainer login works: `POST /api/trainer/login`
- [ ] (Optional) API returns correct data for existing endpoints

#### Test Workers (if seed data exists)
- [ ] Upload a PDF resource → worker processes it
- [ ] Submit a quiz → grader processes it

#### Test Qdrant Integration
- [ ] AI Playground search works
- [ ] Resources are searchable after processing

---

## Frontend Configuration
- [ ] Updated frontend `.env` file with new API URL
- [ ] Rebuilt and redeployed frontend
- [ ] Frontend successfully connects to backend

---

## Cleanup (if needed)
- [ ] Know how to delete/scale down services
- [ ] Monitor free tier usage to avoid overages

---

## Troubleshooting Notes

If deployment fails, check:

1. **Environment Variables**
   - [ ] All variables copied correctly
   - [ ] No extra spaces or quotes
   - [ ] Sensitive values marked as secrets in Render

2. **Service Dependencies**
   - [ ] Workers start after API service
   - [ ] All services can reach Supabase
   - [ ] All services can reach Upstash
   - [ ] All services can reach Qdrant

3. **Database**
   - [ ] Migration ran successfully
   - [ ] Database has tables and seed data
   - [ ] Connection string is correct

4. **GCS Credentials**
   - [ ] File uploaded to Render persistent disk
   - [ ] Path matches `GCS_KEY_FILE` value
   - [ ] Service account has proper permissions

5. **External APIs**
   - [ ] OpenAI API key is valid
   - [ ] OpenAI account has available credits
   - [ ] Twilio credentials are correct (if used)

---

## Performance Monitoring

After successful deployment, monitor:

- [ ] Response times acceptable (< 1s for most requests)
- [ ] Worker queue not backing up
- [ ] Free tier usage within limits
- [ ] Error rate low (< 1%)

---

## Next Steps

Once deployed successfully:

- [ ] Set up custom domain (optional)
- [ ] Configure monitoring/alerts
- [ ] Review security settings
- [ ] Document any custom configurations
- [ ] Share API URL with team/users

---

**Deployment Date:** ___________
**Completed by:** ___________
**API URL:** https://_________________________.onrender.com