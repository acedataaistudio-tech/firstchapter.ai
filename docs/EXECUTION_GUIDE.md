cd C:\\Firstchapter.ai\\firstchapter-ai\\firstchapter-ai\\backend
venv\\Scripts\\activate
uvicorn main:app --reload --port 8000



cd C:\\Firstchapter.ai\\firstchapter-ai\\firstchapter-ai\\frontend
npm run dev
http://localhost:3000/

Clerk Public Key: NEXT\_PUBLIC\_CLERK\_PUBLISHABLE\_KEY=pk\_test\_bGVnaWJsZS1iYWJvb24tOTcuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK\_SECRET\_KEY=sk\_test\_p4615RrE3134vEdvCOHKj1DkjtT6TK0pcQ17qSfQlT

\---

# Firstchapter.ai — Step by Step Execution Guide

Follow these steps in exact order.

\---

## DAY 1 — Backend Setup (2-3 hours)

### Step 1 — Get your API keys

Before anything else, get these:

1. **OpenAI API key**

   * Go to platform.openai.com
   * Create account → API Keys → Create new key
   * Add $5 credit to start (enough for hundreds of queries)
2. **Supabase project** -> \*\*\* login through GitHub username acedataaistudio@gmail.com/madhavaram@1984

   * Go to supabase.com → New project \*\*\*password 'Logan@1984aa"
   * Copy Project URL and anon key from Settings → API \*\*\*https://supabase.com/dashboard/project/jucspftpoecayjgdgegm \*\*\*Publishable API sb\_publishable\_oMifxPW32L24beORAddalA\_hWqR0gzI \*\*\* Secret Key sb\_secret\_u9175WH6yQikDmXy7UYBcQ\_7klwlgjP
   * Go to SQL Editor → paste contents of backend/database/schema.sql → Run \*\*\*
3. **Qdrant Cloud (optional for day 1)** \*\*\* login through GitHub username acedataaistudio@gmail.com/madhavaram@1984

   * Go to cloud.qdrant.io → Free tier \*\*\* created a cluster 'FirstChapter'
   * Or skip and use local Qdrant (in-memory mode works fine to start) \*\*\* API Key: 6b23ae1d-b839-40d8-b4ea-b098f41e0b1e|pKyyXsxZq5Gv5ZmL\_W23bq3bTUtXcIUpOxzQit2k2m\_4Rt28bzRMKg
4. **Cohere API (for reranking)** \*\*\* login through GitHub username acedataaistudio@gmail.com/madhavaram@1984

   * Go to cohere.com → Free tier
   * Get API key \*\*\* API Key FzZvrPd8FbYkQbR7Re4AT3vjxuXMQuOOKb2winco

\---

### Step 2 — Set up Python environment

```bash
cd firstchapter-ai/backend
python -m venv venv
venv\\Scripts\\activate       # Windows
pip install -r requirements.txt
```

\---

### Step 3 — Configure environment

```bash
copy .env.example .env
```

Open .env and fill in:

```
OPENAI\_API\_KEY=sk-...        # Required
SUPABASE\_URL=https://...     # Required
SUPABASE\_KEY=...             # Required
COHERE\_API\_KEY=...           # Optional but recommended
QDRANT\_URL=http://localhost:6333  # For local Qdrant
```

\---

### Step 4 — Ingest your first books

```bash
cd firstchapter-ai
python scripts/download\_and\_ingest.py
```

This will:

* Download 5 classic books from Project Gutenberg (free, no rights issues)
* Chunk and embed them
* Store in Qdrant

Takes about 5-10 minutes on first run.

\---

### Step 5 — Start the backend

```bash
cd firstchapter-ai/backend
uvicorn main:app --reload --port 8000

(venv) C:\\Firstchapter.ai\\firstchapter-ai\\firstchapter-ai\\backend>uvicorn main:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

\---

### Step 6 — Test the API

Open browser: http://localhost:8000/docs

This opens Swagger UI. Test these endpoints:

1. POST /api/discover — try topic: "success and leadership"
2. POST /api/query — try question: "What is the secret to success?"

\---

### Step 7 — Run automated tests

```bash
cd firstchapter-ai
python tests/test\_rag.py
```

All 3 tests should pass.

\---

## DAY 2 — Frontend Setup (2-3 hours)

### Step 8 — Get Clerk auth keys

1. Go to clerk.com → Create application
2. Choose "Email" sign-in method
3. Copy Publishable key and Secret key

\---

### Step 9 — Set up frontend

```bash
cd firstchapter-ai/frontend
npm install
cp .env.local.example .env.local
```

Open .env.local and fill in:

```
NEXT\_PUBLIC\_CLERK\_PUBLISHABLE\_KEY=pk\_test\_...
CLERK\_SECRET\_KEY=sk\_test\_...
NEXT\_PUBLIC\_API\_URL=http://localhost:8000
```

\---

### Step 10 — Start the frontend

```bash
npm run dev
```

Open http://localhost:3000

You should see the Firstchapter.ai interface.

\---

## DAY 3 — End to End Test

### Step 11 — Full flow test

1. Open http://localhost:3000
2. Type "leadership and success" in the search box
3. Press Enter
4. You should see book tiles with relevance scores
5. Click on 1-2 books to select them
6. Type "What is the most important principle for success?"
7. You should get an answer with book citations
8. Try clicking Download → Export to Word

If all steps work — your MVP is functional.

\---

## Common Issues and Fixes

### "No books found"

* Make sure ingestion script completed successfully
* Check Qdrant is running: http://localhost:6333/dashboard

### "OpenAI API error"

* Check your API key in .env
* Verify you have credits at platform.openai.com

### "Supabase connection error"

* Check SUPABASE\_URL and SUPABASE\_KEY
* Make sure you ran the schema.sql in Supabase SQL editor

### "Frontend can't connect to backend"

* Make sure backend is running on port 8000
* Check NEXT\_PUBLIC\_API\_URL in frontend .env.local

### "CORS error in browser"

* Check the CORS origins in backend/main.py
* Add http://localhost:3000 if not already there

\---

## Production Deployment (Phase 2)

When you're ready to deploy:

**Backend**

* Railway.app or Render.com — free tier available
* Add all .env variables in their dashboard
* Switch Qdrant to Qdrant Cloud

**Frontend**

* Vercel — connect your GitHub repo, auto-deploys
* Add .env.local variables in Vercel dashboard

**Domain**

* Point firstchapter.ai DNS to Vercel (frontend)
* Point api.firstchapter.ai to Railway/Render (backend)

\---

## Weekly Milestone Targets

|Week|Target|
|-|-|
|Week 1|Backend running, 5 books ingested, API tested|
|Week 2|Frontend live locally, full flow working|
|Week 3|Auth added, query limits working|
|Week 4|Deploy to production, share with first beta user|
|Month 2|Export working, first institution demo|
|Month 3|Publisher onboarding portal live|



