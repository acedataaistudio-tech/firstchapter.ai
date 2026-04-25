# Firstchapter.ai — Complete Build Guide

AI-powered book querying platform for academic institutions.

\---

## Architecture Overview

```
firstchapter-ai/
├── backend/              # Python FastAPI backend
│   ├── api/              # Route handlers
│   ├── ingestion/        # Book loading and chunking
│   ├── retrieval/        # RAG query pipeline
│   ├── generation/       # LLM prompts and responses
│   ├── database/         # Supabase DB operations
│   ├── export/           # docx / pptx export
│   └── realtime/         # WebSocket group sessions
├── frontend/             # Next.js web app
│   ├── components/       # Reusable UI components
│   ├── pages/            # App pages
│   ├── hooks/            # Custom React hooks
│   └── lib/              # API client and utilities
├── scripts/              # CLI tools
└── docs/                 # Documentation
```

\---

## Tech Stack

|Layer|Technology|
|-|-|
|Backend framework|FastAPI (Python)|
|RAG framework|LangChain|
|Embeddings|OpenAI text-embedding-3-small|
|Vector DB|Qdrant (local dev → Qdrant Cloud prod)|
|LLM|GPT-4o-mini (dev) / GPT-4o (prod)|
|Relational DB|Supabase (PostgreSQL)|
|Cache / Session|Redis|
|Frontend|Next.js + Tailwind CSS|
|Auth|Clerk|
|Export|python-docx + python-pptx|
|Realtime|WebSockets (FastAPI)|

\---

## Quick Start

### 1\. Clone and setup

```bash
git clone <your-repo>
cd firstchapter-ai
```

### 2\. Backend setup

```bash
cd backend
python -m venv venv
venv\\\\Scripts\\\\activate        # Windows
source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
```

### 3\. Start Qdrant (choose one)

**Option A — In-memory (no Docker, for development):**
Already handled in code via `QdrantClient(":memory:")`

**Option B — Docker:**

```bash
docker run -p 6333:6333 qdrant/qdrant
```

**Option C — Qdrant Cloud (recommended for production):**
Create free account at cloud.qdrant.io
Add QDRANT\_URL and QDRANT\_API\_KEY to .env

### 4\. Ingest test books

```bash
python scripts/download\\\_and\\\_ingest.py
```

This downloads 5 open-license books from Project Gutenberg and ingests them.

### 5\. Start backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 6\. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Add your Clerk publishable key
npm run dev
```

Visit http://localhost:3000

\---

## Environment Variables

### Backend (.env)

```
OPENAI\\\_API\\\_KEY=sk-...
COHERE\\\_API\\\_KEY=...
QDRANT\\\_URL=http://localhost:6333
QDRANT\\\_API\\\_KEY=
SUPABASE\\\_URL=https://xxx.supabase.co
SUPABASE\\\_KEY=...
REDIS\\\_URL=redis://localhost:6379
CLERK\\\_SECRET\\\_KEY=sk\\\_test\\\_...
ENVIRONMENT=development
```

### Frontend (.env.local)

```
NEXT\\\_PUBLIC\\\_CLERK\\\_PUBLISHABLE\\\_KEY=pk\\\_test\\\_...
CLERK\\\_SECRET\\\_KEY=sk\\\_test\\\_...
NEXT\\\_PUBLIC\\\_API\\\_URL=http://localhost:8000
```

\---

## MVP Build Phases

### Phase 1 (Week 1-2) — Core RAG

* Book ingestion pipeline
* Basic query endpoint
* Source attribution

### Phase 2 (Week 3) — Web Portal

* Next.js frontend
* Search and book discovery
* Chat interface

### Phase 3 (Week 4) — Institution Features

* Auth with Clerk
* Query limits per user
* Basic admin dashboard

### Phase 4 (Month 2) — Collaboration

* Save and export answers
* Share links
* Group sessions (WebSockets)

### Phase 5 (Month 3) — Mobile

* React Native app
* Push notifications
* Offline history

\---

## API Endpoints

|Method|Endpoint|Description|
|-|-|-|
|POST|/api/discover|Find books by topic|
|POST|/api/query|Deep query selected books|
|GET|/api/books|List all books|
|GET|/api/history|User chat history|
|POST|/api/export/doc|Export chat to docx|
|POST|/api/export/ppt|Export chat to pptx|
|POST|/api/share|Create share link|
|WS|/ws/session/{id}|Group session WebSocket|



