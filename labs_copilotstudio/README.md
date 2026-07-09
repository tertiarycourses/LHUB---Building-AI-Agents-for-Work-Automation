# Hands-on Labs — Microsoft Copilot Studio & Power Automate

Three labs, one per Learning Unit, for **Building AI Agents for Work Automation (SF)**.

Everything runs on Microsoft 365. There is no code to write and no website to host: forms are built in
**Microsoft Forms** and surfaced on a **SharePoint page** or a **Teams tab**, and the RAG chatbot is
published straight into **Microsoft Teams**.

| LU | Lab | Platform | The idea it teaches |
|----|-----|----------|---------------------|
| **LU1** | [Retail Banking Customer Onboarding](lu1-activity1-retail-banking-onboarding/) | Power Automate + AI Builder | The **boundary of agency** — the AI decides *what to do*; ordinary actions do what must always happen |
| **LU2** | [Client Rapport Assistant](lu2-activity2-client-rapport/) | Power Automate + Approvals | **Human oversight** — the AI drafts, and a licensed person approves before anything is sent |
| **LU3** | [Customer Care FAQ Chatbot](lu3-activity3-customer-care/) | Copilot Studio | **RAG and grounding** — the agent answers only from the documents, or says it does not know |

---

## What you need

- A Microsoft 365 account with **Power Automate** and **AI Builder** (a trial licence is enough).
- **Excel Online**, **Outlook** and **Microsoft Teams**.
- **Copilot Studio** (copilotstudio.microsoft.com) for LU3.

No Azure subscription is required. Part B of LU3 discusses Azure AI Search but does not require it.

---

## The three ideas, in order

**LU1 — the AI decides, but it does not act unsupervised.**
An AI Builder prompt applies the bank's four onboarding rules and returns a decision as JSON. The row it
writes to Excel is built from the *Compose* action, not from the model's answer — so an invented NRIC has no
route into the customer record. The audit row is written on **every** run, whatever the model said.

**LU2 — the AI drafts, and then it stops.**
The flow reads a worried client's emotional tone, raises compliance flags, drafts a strictly non-advisory
reply — and pauses on *Start and wait for an approval* until a licensed human clicks Approve in Teams.
Watch the run history sit there. That pause is the deliverable.

**LU3 — the AI answers only from what it was given.**
Twenty course brochures become a Copilot Studio knowledge source. *Use general knowledge* is switched off,
so the agent can only speak from the brochures. Then you try to make it lie — ask for a course it does not
run, a fact in no brochure, and a discount that does not exist.

---

## A note on the fictitious institutions

Marina Trust Bank, Meridian Asset Management and Cook & Bake Academy do not exist. They were created for
this course. No banking, investment or education service is offered, and nothing in these labs is financial
advice.
