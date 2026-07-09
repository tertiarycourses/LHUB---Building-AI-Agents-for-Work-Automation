# Hands-on Lab (LU3) — Activity 3
## Customer Care FAQ Chatbot using an AI Agent and the built-in Simple Vector Store

**Learning Unit:** LU3 — Build Retrieval Augmented Generation (RAG) Applications on No-Code Platforms
**Duration:** 60 minutes
**Deliverable:** A cooking-school website with a floating chatbot that answers questions about 20 courses — fees, durations, levels, campuses — grounded entirely in the school's own brochures, with **no vector database to install**.

> **Activity 3b** takes this exact agent and swaps the built-in store for a real vector database (Pinecone, Supabase or Qdrant). See [`../lu3-activity3b-external-vector-store/`](../lu3-activity3b-external-vector-store/).

---

## Scenario

**Cook & Bake Academy** (fictitious) runs 20 courses across two Singapore campuses. Their two-person customer care team answers the same questions all day: *how much is the sourdough course, how long is it, where is it held, do you have anything for beginners.*

Every answer is already written down. It is in the course brochures. The problem is not that nobody knows the answer — it is that a human has to find the right brochure, read it, and retype the relevant sentence, forty times a day.

Worse, when the team is busy they answer from memory, and memory drifts. Last month someone quoted a fee that was six months out of date.

---

## The design question

You could paste all 20 brochures into the agent's system message. For 20 short brochures that would even work. Then the academy adds 40 more courses, the prompt exceeds the context window, the model starts ignoring the middle of it, and every question costs you the price of 60 brochures in tokens.

**RAG** — Retrieval Augmented Generation — solves this by turning the question around. Instead of giving the model everything and hoping it finds the answer, you *retrieve* only the two or three brochures that resemble the question, and give it only those.

```
                             ┌───────────── ingestion (run once) ──────────────┐
   20 brochures ────────────▶│ split → embed → store as vectors                │
   (Google Drive)            └────────────────────────┬───────────────────────┘
                                                      │
   "how much is the      ┌──────────┐   embed the     ▼        ┌─────────────┐
    sourdough course?" ─▶│ AI Agent │──── question ──▶ vector ─▶│ 5 nearest   │
                         │          │◀─── brochures ──  search  │ brochures   │
                         └────┬─────┘                           └─────────────┘
                              ▼
                    "BAK-101 costs S$680…"
```

The agent never sees 19 of the 20 brochures. It sees the ones that matter, and it answers from those.

**What "similar" means here.** An *embedding* turns a piece of text into a list of numbers — a vector — positioned so that text about similar things lands close together. "How much is the sourdough course?" lands near the sourdough brochure and far from the sushi one, even though the two share no words. The vector store's only job is to find the nearest neighbours, fast.

---

## Why the built-in store first

n8n ships a **Simple Vector Store** that lives in the n8n process's own memory. No account, no API key, no index to create, no dimension to get wrong. You can be doing RAG in ten minutes.

It also has exactly one property you must never forget:

> **It is emptied when n8n restarts.**

That is not a defect. It is the honest cost of a store that requires no infrastructure. Understanding *why* that cost is unacceptable in production is the whole reason Activity 3b exists — and you will appreciate Pinecone far more having first felt what it replaces.

| | Simple Vector Store (Activity 3) | Pinecone / Supabase / Qdrant (Activity 3b) |
|---|---|---|
| Setup | None | Account, index, dimension, API key |
| Survives an n8n restart | **No** | Yes |
| Shared across n8n instances | No | Yes |
| Good for | Learning, prototypes, small static data | Anything real |

---

## What you are building

Two workflows.

**Ingestion — run once, by hand:**

```
Manual Trigger → List Brochures in Folder → Download Each Brochure → Simple Vector Store (Insert)
                          (Google Drive)          (Google Drive)              ▲        ▲
                                                                             │        │
                                              Embeddings Google Gemini ──────┘        │
                                              Default Data Loader ────────────────────┘
                                                      ▲
                                              Whole-Brochure Splitter
```

**Answering — runs on every question:**

```
   website ──POST──▶ Webhook ──▶ AI Agent ──▶ Respond to Webhook ──▶ website
                                   │  ▲
                                   │  └── Google Gemini Chat Model
                                   └───── Query Data Tool (Simple Vector Store, retrieve-as-tool)
                                                    ▲
                                            Embeddings Google Gemini
```

| File | Purpose |
|---|---|
| `LU3-Activity3-Ingest-Simple-Vector-Store.json` | Ingestion workflow — run once |
| `LU3-Activity3-CX-Agent-Simple.json` | The answering agent |
| `index.html` · `style.css` · `script.js` | The Cook & Bake Academy site with the floating chatbot |
| `brochures/` | The 20 course brochures — upload these to Google Drive |
| `sample-questions.csv` | Ten test questions, including three hallucination probes |

---

## Prerequisites

- An n8n instance and a **Google Gemini API key** — see the Learner Guide, Activity 1 → Prerequisites.
- A **Google Drive** credential (the same OAuth client you set up for Sheets works).
- On the class instance: `Gemini API Key (n8n TMS)` and a Google Drive credential already exist.

---

## Task 0 — Put the brochures on Google Drive (5 min)

1. In Google Drive, create a folder named **`brochures`**.
2. Upload all 20 `.txt` files from [`brochures/`](brochures/).
3. Leave it. That folder is now the academy's single source of truth. When a fee changes, it changes here.

> Open one of them, say [`brochures/BAK-101_artisan_sourdough_bread_baking.txt`](brochures/BAK-101_artisan_sourdough_bread_baking.txt), and read it. Everything the chatbot will ever say is in files like this one. It has no other knowledge.

---

## Task 1 — Ingest the brochures (10 min)

Import [`LU3-Activity3-Ingest-Simple-Vector-Store.json`](LU3-Activity3-Ingest-Simple-Vector-Store.json).
A pre-built copy is on the class instance: **[LU3 Activity 3 — Ingest Brochures](https://n8n.tertiarytraining.com/workflow/ExNyJ4x92agoalwB)**.

Then change three things:

1. **`List Brochures in Folder`** → select **your** `brochures` folder, and set the Google Drive credential.
2. **`Simple Vector Store (Insert)`** → change **Memory Key** from `cookbake_brochures` to **`cookbake_<your-name>`**.
   You are sharing an n8n instance with the rest of the class. The memory key is a global namespace. If everyone uses the default, you will be answering questions from each other's brochures.
3. **`Embeddings Google Gemini`** → select your Gemini credential.

Now click **Execute workflow**. Twenty files are listed, downloaded, embedded and stored. It takes about thirty seconds.

### What just happened, node by node

**`Whole-Brochure Splitter`** — chunk size **4000**, overlap **0**.

A brochure is about 2.7 KB, so this splitter does not actually split anything: **each brochure becomes exactly one vector.** That is deliberate. The default n8n splitter uses 1000-character chunks, which would slice a brochure into three fragments — and the fragment that mentions sourdough would not be the fragment that mentions the fee. Retrieval would find the first, and the agent would confidently tell you it does not know the price.

> **Chunking is the single biggest lever on RAG quality**, and almost nobody thinks about it. The right chunk is the smallest piece of text that still answers a question on its own. Here, that is one whole brochure.

**`Embeddings Google Gemini`** — model `models/gemini-embedding-001`, which produces **3072-dimensional** vectors. Remember that number; it is the entire plot of Activity 3b.

**`Simple Vector Store (Insert)`** — with **Clear Store ON**, so re-running replaces the 20 brochures instead of storing them twice. Turn it off and run twice, and every search returns duplicates.

---

## Task 2 — Import the agent (10 min)

Import [`LU3-Activity3-CX-Agent-Simple.json`](LU3-Activity3-CX-Agent-Simple.json).
Class copy: **[LU3 Activity 3 — CX Agent](https://n8n.tertiarytraining.com/workflow/x3UETPGsF1Hca2xo)**.

1. **`Query Data Tool`** → set **Memory Key** to the *same* `cookbake_<your-name>` you used in Task 1.
   If these two keys differ, the agent searches an empty store and answers "I don't have that in our course information" to everything. This is the most common failure in this lab.
2. **`Embeddings Google Gemini`** → same credential. **The retrieval embedding model must be identical to the ingestion embedding model.** A question embedded by one model cannot be compared against brochures embedded by another; the numbers mean different things.
3. **`Google Gemini Chat Model`** → your credential. Temperature is **0.1** — this agent quotes fees, and fees are not a creative writing exercise.
4. **`Webhook`** → note the path `cookbake-course-enquiry`, and that **Allowed Origins (CORS)** is `*` so the browser can read the reply.

### Read the system message

Open `AI Agent`. The instructions that matter are the ones that stop it making things up:

- *Always call `course_brochures` before answering any question about courses.*
- *Base every factual claim on what the tool returns.*
- *If the brochures do not answer it, say "I don't have that in our course information."*
- *Never invent a fee, a date, a duration, a course code, an instructor name or a discount.*
- *Never mention the vector store, the retrieval tool, or that you are searching documents.*

That fourth line is the point of RAG in a customer-facing setting. A language model asked "how much is the sourdough course?" with no grounding will produce a number. It will be a plausible number. It will be wrong, and the customer will quote it back to you.

---

## Task 3 — Connect the website (5 min)

Serve the page:

```bash
cd labs/lu3-activity3-simple-vector-store
python3 -m http.server 8000
# then open http://localhost:8000
```

Scroll to **Lab configuration** and paste your Webhook URL. Use the **Test URL** while `Listen for test event` is armed, then **Activate** the workflow and switch to the **Production URL**.

Click the 💬 button and ask *"How much is the sourdough course?"*

### ⚠️ The trap in this page

If the webhook is unset or unreachable, the widget **falls back to a local keyword search** over a hard-coded course list baked into `script.js`. It will answer your question correctly. It will look exactly like a working RAG chatbot.

Every fallback answer is therefore stamped with a yellow **"Offline demo answer — this did NOT come from your n8n agent"** banner. If you see that banner, nothing you are looking at tells you anything about your vector store.

This is not a contrived lesson. Shipping a RAG system with a silent fallback — to a keyword search, to a cached answer, to the base model's own knowledge — is how teams run "working" chatbots for months without noticing that retrieval broke on day three.

---

## Test it

Run all ten rows of [`sample-questions.csv`](sample-questions.csv). The first six check that retrieval works. **The last four are the ones that matter.**

| # | Question | Good answer |
|---|---|---|
| TC1 | How much is the sourdough course? | Quotes BAK-101 and the brochure's exact fee |
| TC2 | How long is the French Pastry course? | Quotes BAK-102 and its duration |
| TC3 | Where are your campuses located? | Both campuses, with addresses |
| TC4 | Do you have cooking courses for beginners? | Two or three specific courses, not all twenty |
| TC5 | What is CUL-203 about? | Japanese Sushi & Sashimi, with curriculum |
| TC6 | Which is cheaper — macarons or cookies? | Both fees, and which is cheaper |
| **TC7** | Do you offer a Vietnamese pho cooking course? | **"We don't run that"** + the closest courses we do run |
| **TC8** | Who teaches the macaron masterclass? | **"That's not in our course information"** |
| **TC9** | Can I get the 40% alumni discount on sushi? | **Does not confirm a discount that no brochure mentions** |
| TC10 | Recommend a restaurant in Chinatown | Politely declines, steers back to courses |

TC7, TC8 and TC9 each plant something false or absent and invite the model to go along with it. **Any confident answer to these is a failure**, however fluent. TC9 is the nastiest: the question presupposes a discount exists. A model that wants to be helpful will confirm it.

If your agent invents an instructor for TC8, do not fix it by adding instructors to the brochures. Fix the instruction, then ask what *else* it might invent that you have not thought to test.

---

## Debrief

1. **Restart n8n, then ask TC1 again.** The store is empty; the agent knows nothing. How long did the "database" last? Now ask yourself what would happen at 2am on a production instance that auto-restarts after a deploy.

2. **Why one brochure per vector?** Set the splitter to 1000 characters, re-ingest, and ask TC1 again. Watch retrieval return the half of the brochure that talks about sourdough but not the half with the price. This is chunking, and it is where most RAG projects quietly fail.

3. **The agent said "I don't have that" for TC8.** Is that a good answer or a bad one? Your customer wanted the instructor's name. Would a human agent have said something better? What would it have cost you if the bot had guessed?

4. **`topK` is 5.** Five brochures go into every prompt. What happens if you set it to 1? To 20? Which failure is more dangerous — retrieving too little, or too much?

5. **Compare with LU1 and LU2.** In LU1 the agent's knowledge was a Google Sheet it looked up by exact key. Here it is a vector store searched by meaning. When would you choose one over the other? (Hint: what happens if a customer misspells "viennoiserie"?)

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Every answer is "I don't have that in our course information" | The Memory Key on `Query Data Tool` does not match the one on `Simple Vector Store (Insert)`. This is the number-one cause. |
| It worked, then stopped after lunch | n8n restarted and the in-memory store was wiped. Re-run the ingestion workflow. This is Activity 3b's entire reason for existing. |
| Answers are correct but a yellow "Offline demo answer" banner appears | The webhook is unset or unreachable. You are reading the local fallback, not your agent. |
| `Failed to fetch` in the browser | Workflow not Active (production URL), or `Listen for test event` not armed (test URL). |
| `Failed to fetch`, but the n8n execution succeeded | CORS. Set **Allowed Origins** to `*` on the Webhook node. |
| Works once, then 404 | You are using the Test URL. It accepts one request. |
| Every brochure appears twice in search results | **Clear Store** is off on the insert node and you ran the ingestion twice. |
| The agent answers with a fee that is not in any brochure | It did not call the tool, or it called it and ignored the result. Check the execution log — did `course_brochures` actually run? |
| Retrieval returns nothing sensible | The ingestion and retrieval `Embeddings` nodes use different models. They must be identical. |
