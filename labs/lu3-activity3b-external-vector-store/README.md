# Hands-on Lab (LU3) — Activity 3b
## The same chatbot, on a real vector database (Pinecone · Supabase · Qdrant)

**Learning Unit:** LU3 — Build Retrieval Augmented Generation (RAG) Applications on No-Code Platforms
**Duration:** 60 minutes
**Prerequisite:** [Activity 3](../lu3-activity3-simple-vector-store/) — same brochures, same agent, same website.

In Activity 3 your RAG chatbot worked, and then n8n restarted and it forgot everything it had ever read. In Activity 3b you give it a memory that survives.

**The agent barely changes.** Its system message, its model, its temperature, its tool name and its tool description are identical. What changes is where the vectors live — and, with that, three new ways to break it that the built-in store never let you experience.

---

## What changes

| | Activity 3 | Activity 3b |
|---|---|---|
| Vector store | Built-in **Simple Vector Store** | **Pinecone**, **Supabase pgvector**, or **Qdrant** |
| Where the vectors live | n8n's own memory | A managed database, over the network |
| Survives an n8n restart | No | **Yes** |
| Setup | None | Account, index, **dimension**, API key |
| Namespacing | `memoryKey` | Index / table / collection name |
| New failure modes | — | **Dimension mismatch**, credential mismatch, index-not-found |

Everything upstream is the same: the same 20 brochures on Google Drive, the same whole-brochure splitter, the same `gemini-embedding-001` embeddings, the same website.

---

## The one thing this activity is really about

An embedding model turns text into a vector of a fixed length. That length is the **dimension**.

- `models/gemini-embedding-001` → **3072** numbers
- OpenAI `text-embedding-3-small` → **1536** numbers

A vector database index is created with a fixed dimension, and it will only ever accept and compare vectors of exactly that length. So three things must agree, always:

```
   ingestion embedding model  ==  retrieval embedding model  ==  the index's dimension
```

Break the first equality and your searches return nonsense — the numbers no longer mean the same thing. Break the second and the database rejects the query outright.

> **This is not hypothetical.** The workflow originally supplied for this lab ingested into Pinecone with **Gemini embeddings (3072 dims)** and then queried the same index with **OpenAI embeddings (1536 dims)**. It could never have returned a single correct result. And because the website silently fell back to a local keyword search, it *looked* like it worked. Both bugs are fixed in the files you are given. Both are the whole lesson.

**Everything here is wired for Gemini.** If you switch an embeddings node to OpenAI, you must switch **both** of them and recreate your index at 1536.

---

## Choose one vector store

You only need one. Pinecone is the least work.

| | Pinecone | Supabase (pgvector) | Qdrant |
|---|---|---|---|
| Free tier | Yes | Yes | Yes (cloud) or `docker run` |
| Setup effort | Lowest — create an index | SQL to run first | Docker, or a cloud cluster |
| Ships wired for | **Gemini, 3072** | OpenAI, 1536 | OpenAI, 1536 |
| If you pick it | Nothing to change | **Also change the agent's embeddings node to OpenAI** | **Also change the agent's embeddings node to OpenAI** |

The supplied agent, `LU3-Activity3b-CX-Agent-Pinecone.json`, is wired for **Pinecone + Gemini**. Pick Supabase or Qdrant and the last column is your homework — which is the point.

---

## Files

| File | Purpose |
|---|---|
| `LU3-Activity3b-Ingest-Pinecone.json` | Ingestion → Pinecone (Gemini embeddings, 3072) |
| `LU3-Activity3b-Ingest-Supabase.json` | Ingestion → Supabase pgvector (OpenAI embeddings, 1536) |
| `LU3-Activity3b-Ingest-Qdrant.json` | Ingestion → Qdrant (OpenAI embeddings, 1536) |
| `LU3-Activity3b-CX-Agent-Pinecone.json` | The answering agent, retrieving from Pinecone |

The **brochures** and the **website** are the ones from Activity 3 — [`../lu3-activity3-simple-vector-store/`](../lu3-activity3-simple-vector-store/). You do not need a second copy of either.

---

## Path A — Pinecone (recommended)

### Task 1 — Create the index (5 min)

1. Sign up at **https://app.pinecone.io** (free tier).
2. **Create index**:
   - **Name:** `course-brochures`
   - **Dimension:** **`3072`** ← must match `gemini-embedding-001`
   - **Metric:** `cosine`
   - **Type:** Serverless
3. **API Keys** → copy your key.
4. In n8n: **Credentials → Add credential → Pinecone API** → paste the key.

> Get the dimension wrong and Pinecone will not tell you politely. Ingestion fails with a vector-dimension error, or — if you created it at 1536 and query with Gemini — retrieval does.

### Task 2 — Ingest (10 min)

Import [`LU3-Activity3b-Ingest-Pinecone.json`](LU3-Activity3b-Ingest-Pinecone.json).
Class copy: **[LU3 Activity 3b — Ingest Brochures (Pinecone)](https://n8n.tertiarytraining.com/workflow/ILTYfH6iCnmceCEP)**.

1. `List Brochures in Folder` → your Drive `brochures` folder + your Drive credential.
2. `Pinecone Vector Store (Insert)` → your Pinecone credential, index `course-brochures`.
3. `Embeddings Google Gemini` → your Gemini credential. Model is `models/gemini-embedding-001`. **Do not change it.**

Click **Execute workflow**. Then open Pinecone and look at the index: **20 records**, one per brochure — because the splitter's chunk size of 4000 keeps each brochure whole, exactly as in Activity 3.

If you see 60 records, your splitter is chunking. If you see 40, you ran it twice — Pinecone upserts by ID, so identical runs overwrite, but a changed chunk size creates new IDs.

### Task 3 — Point the agent at Pinecone (10 min)

Import [`LU3-Activity3b-CX-Agent-Pinecone.json`](LU3-Activity3b-CX-Agent-Pinecone.json).
Class copy: **[LU3 Activity 3b — CX Agent (Pinecone)](https://n8n.tertiarytraining.com/workflow/rd5qc1SPsHKs8qiM)**.

1. `Pinecone Vector Store` → **the same credential and the same index** you ingested with. A different Pinecone *credential* may point at an entirely different project, with an empty index of the same name. The agent will not complain; it will just know nothing.
2. `Embeddings Google Gemini` → your Gemini credential, model unchanged.
3. `Google Gemini Chat Model` → your Gemini credential.
4. `Webhook` → path is `cookbake-course-enquiry-rag`. CORS is already `*`.

Activate, copy the **Production URL**.

### Task 4 — Same website, different brain (5 min)

```bash
cd ../lu3-activity3-simple-vector-store
python3 -m http.server 8000
```

In **Lab configuration**, replace the Activity 3 URL with your `.../webhook/cookbake-course-enquiry-rag` URL.

Ask *"How much is the sourdough course?"* You should get the same answer as Activity 3.

Nothing about the page changed. Nothing about the agent's instructions changed. You replaced the memory, and the chatbot did not notice.

**Now restart n8n and ask again.** This is the moment the activity exists for.

---

## Path B — Supabase pgvector

1. Create a project at **https://supabase.com**.
2. **SQL Editor** → run n8n's schema. Note the vector size:

```sql
create extension if not exists vector;

create table documents (
  id        bigserial primary key,
  content   text,
  metadata  jsonb,
  embedding vector(1536)   -- OpenAI text-embedding-3-small
);

create function match_documents (
  query_embedding vector(1536),
  match_count int default null,
  filter jsonb default '{}'
) returns table (id bigint, content text, metadata jsonb, similarity float)
language plpgsql as $$
begin
  return query
  select id, content, metadata, 1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

3. Import [`LU3-Activity3b-Ingest-Supabase.json`](LU3-Activity3b-Ingest-Supabase.json) and set the Supabase, Drive and OpenAI credentials.
4. **Then change the agent.** `LU3-Activity3b-CX-Agent-Pinecone.json` retrieves from Pinecone with Gemini embeddings. To use Supabase you must swap the vector-store node **and** the embeddings node to OpenAI, so it matches what ingested the table.

> **Why 1536 and not 3072 here?** pgvector will happily *store* a `vector(3072)`, but its HNSW and IVFFlat indexes are capped at 2000 dimensions — so you would be left with an unindexed exact scan. This is a genuine engineering constraint, and it is exactly the sort of thing that decides which embedding model a real project can use. The model does not choose itself.

---

## Path C — Qdrant

1. Run it locally — `docker run -p 6333:6333 qdrant/qdrant` — or use Qdrant Cloud's free tier.
2. Create a collection named `course-brochures` with size **1536** and distance **Cosine**.
3. Import [`LU3-Activity3b-Ingest-Qdrant.json`](LU3-Activity3b-Ingest-Qdrant.json), set the Qdrant, Drive and OpenAI credentials.
4. As with Supabase, swap the agent's vector-store **and** embeddings nodes to match.

> If n8n runs in Docker and Qdrant runs on your host, `localhost:6333` from inside the container is not your Qdrant. Use `http://host.docker.internal:6333`.

---

## Test it

Run the same ten questions from [`../lu3-activity3-simple-vector-store/sample-questions.csv`](../lu3-activity3-simple-vector-store/sample-questions.csv). You should get the same answers as Activity 3, including the three hallucination probes (TC7, TC8, TC9).

Then run the tests that only Activity 3b can run:

| # | Test | Expected |
|---|---|---|
| **TC11** | Restart n8n. Ask TC1 again. | Correct answer. **In Activity 3 this returned "I don't have that."** |
| **TC12** | In the agent's `Embeddings` node, switch to OpenAI. Ask anything. | A dimension error, or silent nonsense. Switch it back. |
| **TC13** | Change the Pinecone index name to `course-brochure` (no `s`). Ask TC1. | Index not found, or an empty store answering "I don't have that." |
| **TC14** | Edit `BAK-101`'s fee on Google Drive, re-run ingestion, ask TC1. | The **new** fee. This is why the brochures are the source of truth. |

TC12 is the one to actually perform. Break it deliberately, read the error, and fix it. You will recognise that error for the rest of your career.

---

## Debrief

1. **You changed the database and the agent did not notice.** Its system message, tool name and tool description were untouched. What does that tell you about where a RAG system's intelligence lives — and about what you should be most careful to get right?

2. **TC14 changed a fee in a text file and the chatbot's answer changed.** No prompt was edited, no model retrained. Who at Cook & Bake Academy now owns the chatbot's accuracy — the engineer, or the person who maintains the brochures?

3. **Three stores, three dimensions, three chances to be wrong.** Which of these mistakes fails loudly, and which fails silently? Rank them by how long they would survive undetected in production: wrong index name, wrong dimension, wrong credential pointing at an empty index of the right name.

4. **The built-in store needed no credentials, no index and no dimension — and lost everything on restart.** Pinecone survives restarts and adds four ways to misconfigure it. Name the thing you actually bought, in one sentence, and the price you paid for it.

5. **`topK` is 5, and each brochure is one chunk.** So five whole brochures enter the prompt on every question. Estimate the token cost. At what catalogue size does this design stop being sensible, and what would you change first?

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Vector dimension 1536 does not match the dimension of the index 3072` | The classic. Your ingestion and retrieval embeddings differ, or the index was created at the wrong size. All three must agree. |
| Every answer is "I don't have that in our course information" | The index is empty, or the agent's Pinecone credential points at a different project than the ingestion workflow's did. Check the record count in the Pinecone console. |
| Ingestion succeeds, retrieval finds nothing | Different namespaces. Both nodes here leave the namespace blank (the default). If you set one, set both. |
| 60 records in Pinecone instead of 20 | The splitter is chunking. Chunk size must be 4000, overlap 0. |
| Supabase: `expected 1536 dimensions, not 3072` | You pointed a Gemini embeddings node at the OpenAI-sized `documents` table. Use OpenAI, or recreate the column at 3072 and accept an unindexed scan. |
| Qdrant: `connection refused` from n8n in Docker | Use `http://host.docker.internal:6333`, not `localhost`. |
| Answers are correct but carry a yellow "Offline demo answer" banner | The webhook is unset or unreachable and you are reading the website's local fallback, not your agent. Nothing you see is a test of your vector store. |
| It all works, then stops after n8n restarts | You are still pointing the website at the **Activity 3** webhook (`cookbake-course-enquiry`), not the 3b one (`cookbake-course-enquiry-rag`). |
