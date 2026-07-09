# Building AI Agents for Work Automation (SF)

![n8n](https://img.shields.io/badge/n8n-AI_Agent_workflows-EA4B71?logo=n8n&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-chat_%2B_embeddings-4285F4?logo=google&logoColor=white)
![RAG](https://img.shields.io/badge/RAG-vector_search-0FA6A0)
![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-E34F26?logo=html5&logoColor=white)

Courseware for the NTUC LearningHub / Tertiary Infotech WSQ course **Building AI Agents for Work Automation (SF)**.

Learners import a working n8n workflow, reconfigure it for their own accounts, and drive it from a real
web front end — then break it on purpose. Every lab is built around one design idea: **the agent decides
*what to do*; deterministic nodes do the things that must always happen.**

---

## Learning units

| LU | Topics | Hands-on lab |
|----|--------|--------------|
| **LU1** — Overview of AI Agents and Agentic AI Workflows | Agentic AI vs Generative AI · Use cases · Creating an agent on a platform | **Activity 1a / 1b** — Retail banking customer onboarding |
| **LU2** — Build Agentic AI Chatbots on No-Code Platforms | Prompt engineering · Low-code platforms · Model configuration | **Activity 2** — Client rapport assistant with human approval |
| **LU3** — Build RAG Applications on No-Code Platforms | RAG · Embeddings & dimensions · Chunking · Agentic search | **Activity 3 / 3b** — Customer care FAQ chatbot with RAG |

---

## The labs

All five labs live in [`labs/`](labs/). Each folder has its own README with the scenario,
a step-by-step build, test cases, a debrief and a troubleshooting table.

### [LU1 · Activity 1a](labs/lu1-activity1-retail-banking-onboarding/) — Onboarding, behind an n8n Form
Marina Trust Bank (fictitious). Applications take 3–5 days, duplicate customers reach the core banking
system, and eligibility rules live in a binder. Learners run the 4-Step Problem-Solving Framework, then
build a ten-node workflow whose AI Agent applies six ordered rules — duplicate check, age, KYC screening,
eligibility, minimum deposit, approval.

The lesson: `create_customer_record` declares **no** `$fromAI()` arguments. The agent chooses *whether* a
customer is created, never *who they are*.

### [LU1 · Activity 1b](labs/lu1-activity1b-onboarding-website/) — The same agent, behind a real website
Swap the Form Trigger for a Webhook and put the bank's own page in front of it. Two nodes and one
expression change. The agent is byte-for-byte identical.

### [LU2 · Activity 2](labs/lu2-activity2-client-rapport/) — Automation with human oversight
Meridian Asset Management (fictitious). An agent reads a worried client's emotional tone, raises compliance
flags, and drafts a **strictly non-advisory** reply — then the execution *pauses* on a Gmail
*Send and Wait* node until a licensed human approves or declines it. Approved replies are logged for audit;
declined drafts go to a rewrite queue.

### [LU3 · Activity 3](labs/lu3-activity3-simple-vector-store/) — RAG on the built-in vector store
Cook & Bake Academy (fictitious). Twenty course brochures are embedded into n8n's **Simple Vector Store**,
and a floating chat widget answers questions about fees, durations and campuses. No database, no API key,
no dimension to get wrong — and everything is lost when n8n restarts.

### [LU3 · Activity 3b](labs/lu3-activity3b-external-vector-store/) — RAG on a real vector database
The same chatbot on **Pinecone**, **Supabase pgvector** or **Qdrant**. The activity exists to teach one rule:

```
ingestion embedding model  ==  retrieval embedding model  ==  the index's dimension
```

---

## Two platforms, same three ideas

The course ships in two flavours. The scenarios, the design lessons and the assessment are identical;
only the tooling differs. Pick whichever your learners' organisation actually uses.

| | [`labs/`](labs/) | [`labs_copilotstudio/`](labs_copilotstudio/) |
|---|---|---|
| Platform | **n8n** (5 labs) | **Power Automate + Copilot Studio** (3 labs, one per LU) |
| Agent | AI Agent node + tools | AI Builder prompt · Copilot Studio agent |
| Front door | Webhook + your own web page | Microsoft Forms on a SharePoint page or Teams tab |
| Data | Google Sheets | Excel Online tables |
| Email | Gmail | Outlook |
| Human gate | Gmail *Send and Wait* | **Approvals** in Teams |
| Knowledge | Simple Vector Store · Pinecone / Supabase / Qdrant | Copilot Studio knowledge · Azure AI Search |
| Learner Guide | `LG_..._n8n.docx` | `LG_..._copilotstudio.docx` |

The Microsoft set requires no code, no hosting and no vector database — a Microsoft 365 account with an
AI Builder trial is enough.

---

## Prerequisites (n8n labs)

- An n8n instance — [n8n Cloud](https://n8n.io) free trial, or locally via Docker.
- A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey).
  The workflows use `gemini-2.5-flash` for chat and `gemini-embedding-001` (3072 dimensions) for embeddings.
- **Google Sheets**, **Gmail** and **Google Drive** OAuth credentials in n8n.
- Optional: [Ollama](https://ollama.com) with `gemma3:4b` to run the model locally, so no data leaves your machine.

Full setup instructions are in the Learner Guide (`LG_*.docx`), under *Learning Activity 1 → Prerequisites*.

---

## Running a lab

```bash
# 1. Import the workflow JSON into n8n (Workflows → Import from File)
# 2. Re-select your own credentials and Google Sheet on every red-flagged node
# 3. Serve the lab's web page
cd labs/lu1-activity1b-onboarding-website
python3 -m http.server 8000
# 4. Paste your n8n Webhook URL into the page's "Lab configuration" panel
```

Every lab page has a **Lab configuration** panel for the webhook URL, so you never edit `script.js`.
The URL is stored in `localStorage`.

> **Test URL vs Production URL.** A Webhook node's *Test URL* works only while *Listen for test event*
> is armed, and accepts exactly one request. The *Production URL* works only while the workflow is Active.
> Mixing them up is the most common failure in these labs.

---

## Repository layout

```
.
├── labs/                                         # n8n
│   ├── lu1-activity1-retail-banking-onboarding/   # Form Trigger → AI Agent → Sheets → Gmail
│   ├── lu1-activity1b-onboarding-website/         # Webhook → same agent → JSON → web page
│   ├── lu2-activity2-client-rapport/              # Agent → human approval gate → send or rewrite
│   ├── lu3-activity3-simple-vector-store/         # RAG on n8n's built-in store (+ 20 brochures)
│   └── lu3-activity3b-external-vector-store/      # RAG on Pinecone / Supabase / Qdrant
├── labs_copilotstudio/                           # Power Automate + Copilot Studio
│   ├── lu1-activity1-retail-banking-onboarding/   # Forms → AI Builder → Excel → Outlook
│   ├── lu2-activity2-client-rapport/              # AI Builder → Approvals in Teams → send or rewrite
│   └── lu3-activity3-customer-care/               # Copilot Studio agent grounded in 20 brochures
├── Building AI Agents for Work Automation (SF).pptx        # Trainer slide deck (platform-neutral)
├── LG_..._SF_n8n.docx / LG_..._SF_copilotstudio.docx        # Learner Guide, one per platform
└── TG_Building_AI_Agents_for_Work_Automation_SF.docx       # Trainer Guide
```

**Not in this repository, by design:** the Assessment Plan and its answer keys (confidential WSQ
assessment material), `.env` (live API keys), and local reference copies of other courses' courseware.

---

## A note on the fictitious institutions

Marina Trust Bank, Meridian Asset Management and Cook & Bake Academy do not exist. They were created for
this course. No banking, investment or education service is offered, and nothing in these labs is
financial advice. The lab web pages say so on every page.

---

## Acknowledgements

Course delivered by [NTUC LearningHub](https://www.ntuclearninghub.com/).
Courseware by [Tertiary Infotech Academy Pte Ltd](https://www.tertiaryinfotech.com/).

Built with [n8n](https://n8n.io), [Google Gemini](https://ai.google.dev),
and the [Smart QR Code Generator](https://github.com/alfredang/qrcodegenerator).
