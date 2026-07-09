# Hands-on Lab (LU3)
## Customer Care FAQ Chatbot with RAG — Copilot Studio

**Learning Unit:** LU3 — Build Retrieval Augmented Generation (RAG) Applications on No-Code Platforms
**Duration:** 60 minutes
**You will use:** Copilot Studio · SharePoint · Microsoft Teams

**What you end up with:** a course assistant, published into Microsoft Teams, that answers questions about
20 courses — fees, durations, levels, campuses — grounded entirely in the school's own brochures, and that
says *"I don't have that"* rather than inventing a fee.

---

## Scenario

**Cook & Bake Academy** (fictitious) runs 20 courses across two Singapore campuses. Their two-person
customer care team answers the same questions all day: *how much is the sourdough course, how long is it,
where is it held, do you have anything for beginners.*

Every answer is already written down. It is in the course brochures. The problem is not that nobody knows
the answer — it is that a human must find the right brochure, read it, and retype the relevant sentence,
forty times a day.

Worse, when the team is busy they answer from memory, and memory drifts. Last month someone quoted a fee
that was six months out of date.

---

## The design question

You could paste all 20 brochures into the agent's instructions. For 20 short brochures that would even work.
Then the academy adds 40 more courses, the instructions exceed what the model can read, it starts ignoring
the middle, and every question costs you the price of 60 brochures.

**RAG** — Retrieval Augmented Generation — turns the problem around. Instead of giving the model everything
and hoping it finds the answer, you **retrieve** only the two or three brochures that resemble the question,
and give it only those.

```
   ┌─────── done once, when you upload ────────┐
   │  20 brochures → split → embed → indexed   │
   └───────────────────┬───────────────────────┘
                       │
  "how much is the     ▼            ┌──────────────┐
   sourdough course?" ─────────────▶│ search finds │
                                    │ the nearest  │
                                    │  brochures   │
   "BAK-101 costs S$680…" ◀─────────└──────────────┘
```

The agent never sees 19 of the 20 brochures. It sees the ones that matter, and answers from those.

**What "similar" means.** An *embedding* turns a piece of text into a list of numbers — a vector —
positioned so that text about similar things lands close together. "How much is the sourdough course?"
lands near the sourdough brochure and far from the sushi one, even though the two share no words.

**Copilot Studio does all of this for you.** When you upload a file as a knowledge source, it chunks it,
embeds it, and indexes it. You never choose an embedding model or a dimension. That is exactly why it is
the right place to *learn* RAG — and exactly why Part B exists, so you can see what it hid from you.

---

## Part A — Build the agent (35 min)

### Task 0 — Put the brochures somewhere the agent can read

Upload the 20 `.txt` files from [`brochures/`](brochures/) to a **SharePoint document library**, or keep
them on your machine to upload directly.

> Open one — say [`brochures/BAK-101_artisan_sourdough_bread_baking.txt`](brochures/BAK-101_artisan_sourdough_bread_baking.txt) — and read it.
> Everything the chatbot will ever say is in files like this one. It has no other knowledge.

### Task 1 — Create the agent

1. Go to **copilotstudio.microsoft.com** and pick your environment.
2. **Create → New agent**. Name it **`Cook & Bake Course Assistant`**.
3. Skip the conversational setup wizard — click **Skip to configure**.

### Task 2 — Give it its instructions

Open [`agent/instructions.md`](agent/instructions.md) and paste the text into the agent's **Instructions**.

The four lines that do the real work:

- *Always search the brochures before answering any question about courses.*
- *Base every factual claim on what the brochures say.*
- *If the brochures do not answer it, say "I don't have that in our course information."*
- *Never invent a fee, a date, a duration, a course code, an instructor name or a discount.*

> That last line is the point of RAG in a customer-facing setting. A language model asked *"how much is the
> sourdough course?"* with no grounding will produce a number. It will be a plausible number. It will be
> wrong, and the customer will quote it back to you.

### Task 3 — Add the brochures as knowledge

**Knowledge → Add knowledge → Files** (or **SharePoint**, and point it at your library).
Upload all 20 brochures. Wait for the status to move from *Processing* to **Ready** — it takes a few minutes.

### Task 4 — Turn off general knowledge ← *the switch that matters*

**Settings → Generative AI → Use general knowledge: Off.**

Leave it on and the agent will happily answer *"How much is the sourdough course?"* from the model's own
training data — a confident, fluent, invented fee. Turn it off and the agent can only speak from the
brochures.

### Task 5 — Test it

Use the **Test your agent** pane on the right. Ask: *"How much is the sourdough course?"*

Now click **the citation** under the answer. Copilot Studio shows you **which brochure it used**. Do this
for every test below — an answer without a citation is an answer you cannot trust.

### Task 6 — Publish it to Teams

1. **Publish** (top right).
2. **Channels → Microsoft Teams → Turn on Teams**.
3. **Availability options → Copy link**, open it, and **Add** the agent.

The academy's customer care team now has the assistant in their Teams sidebar. No website was written.

> To put it in front of *customers* rather than staff, use **Channels → Demo website**, which gives you a
> shareable page, or embed the agent in a **SharePoint page** with the *Copilot* web part.

---

## Test it — including trying to make it lie

Run all ten questions from [`sample-questions.csv`](sample-questions.csv). The first six check that
retrieval works. **The last four are the ones that matter.**

| # | Question | A good answer |
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

TC7, TC8 and TC9 each plant something false or absent and invite the model to agree. **Any confident answer
to these is a failure**, however fluent. TC9 is the nastiest: the question *presupposes* the discount
exists, and a model that wants to be helpful will confirm it.

If your agent invents an instructor for TC8, do not fix it by adding instructors to the brochures.
Fix the instruction — then ask what *else* it might invent that you have not thought to test.

**Now turn *Use general knowledge* back on and re-run TC7, TC8 and TC9.** Watch it start inventing.
Turn it off again.

---

## Part B — What Copilot Studio hid from you (20 min, discussion + optional build)

In Part A you built a working RAG chatbot without ever meeting an embedding model, a dimension, a chunk
size, or an index. Copilot Studio chose all four for you. That is a genuine feature — and a genuine cost,
because you cannot tune what you cannot see.

A production team that outgrows the built-in knowledge source moves to **Azure AI Search** and adds it to
the agent as a knowledge source (**Add knowledge → Advanced → Azure AI Search**). Now every hidden choice
becomes yours:

| Choice | What Copilot Studio did | What you must now decide |
|---|---|---|
| **Chunking** | Split each file automatically | Chunk size and overlap |
| **Embedding model** | Picked one | `text-embedding-3-large` (**3072** dims) or `ada-002` (**1536** dims) |
| **Index dimension** | Matched it | Must equal the embedding model's dimension |
| **Results returned** | Chose a number | *top K* |

### The one rule you cannot break

```
ingestion embedding model  ==  query embedding model  ==  the index's dimension
```

Break the first equality and the search returns nonsense — the numbers no longer mean the same thing.
Break the second and Azure AI Search rejects the query with an error naming two numbers, such as
*"the vector field dimension 1536 does not match the query vector dimension 3072"*.

### Chunking is the biggest lever, and nobody thinks about it

Each brochure is about 2,700 characters.

- **Chunk at 1,000 characters** → each brochure becomes **about 4 chunks**. The chunk containing the word
  *"sourdough"* is not the chunk containing *"S$680"*. Search finds the first, the agent never sees the fee,
  and it tells your customer — honestly and uselessly — that it does not know the price.
  **No error is raised.** The index just holds ~80 chunks instead of 20.
- **Chunk at 4,000 characters** → each brochure stays whole. One search returns the code, the fee, the
  duration and the campus, together.

> **The rule:** a chunk should be the smallest piece of text that still answers a question on its own.
> For a course brochure, that is the whole brochure. For a 400-page manual, it is not.

### Discussion

1. **Which of these faults fails loudly, and which fails silently?** Rank them by how long each would
   survive undetected in production: wrong chunk size · wrong index name · wrong embedding dimension.
2. **Copilot Studio's built-in knowledge needed none of this.** Name the thing you actually bought by moving
   to Azure AI Search, in one sentence, and the price you paid for it.
3. **Change a fee** in one brochure, re-upload it, and ask TC1 again. The answer changes. No prompt was
   edited and no model retrained. **Who at Cook & Bake Academy now owns the chatbot's accuracy** — the
   engineer, or the person who maintains the brochures?

---

## Debrief

1. **The agent said "I don't have that" for TC8.** Is that a good answer or a bad one? The customer wanted a
   name. What would it have cost you if the bot had guessed?
2. **Every answer carries a citation.** Why does that matter more here than in LU1 or LU2?
3. **Compare with LU1.** There, the agent's knowledge was an Excel table looked up by an exact NRIC match.
   Here it is a set of documents searched *by meaning*. When would you choose one over the other?
   (Hint: what happens when a customer misspells "viennoiserie"?)
4. **You never wrote a line of code, and never chose an embedding model.** Under what circumstances would
   that stop being acceptable?

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| The agent answers course questions with invented fees | **Use general knowledge** is on. Turn it off. |
| Every answer is "I don't have that in our course information" | The knowledge source is still *Processing*, or no files were added. Check it says **Ready**. |
| Answers have no citation | The answer did not come from your brochures. Treat it as untrustworthy. |
| It answers about a course you never uploaded | Same cause — general knowledge, or another knowledge source is still attached. |
| The Teams channel does not appear | You have not clicked **Publish** since making your changes. |
| Colleagues cannot open the Teams link | **Availability options** → share with your security group or the whole tenant. |
| A changed fee does not show up | Re-upload the brochure and wait for the knowledge source to return to **Ready**. |

---

## Files

| File | Purpose |
|---|---|
| `agent/instructions.md` | The agent's Instructions — the grounding rules |
| `brochures/` | The 20 course brochures — upload as the knowledge source |
| `sample-questions.csv` | Ten test questions, including three hallucination probes |
