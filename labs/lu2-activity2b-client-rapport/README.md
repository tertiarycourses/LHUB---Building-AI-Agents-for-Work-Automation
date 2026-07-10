# Hands-on Lab (LU2) — Activity 2b
## Customer Rapport Assistant with Human Handover

**Learning Unit:** LU2 — Build Agentic AI Chatbots on No-Code Platforms
**Duration:** 75 minutes
**Prerequisite:** [Activity 2](../lu2-activity2-investment-advisor/) — the unsupervised chatbot this lab supervises.

**Deliverable:** A single-page asset-management website with a floating chat widget, backed by an n8n AI Agent that reads a client's concern and emotional tone, drafts a strictly non-advisory reply, and **sends nothing until a licensed human approves it**.

> **Outcome.** Hands-on practice applying AI responsibly in a regulated environment — balancing automation with human oversight.

---

## Scenario

**Meridian Asset Management** (fictitious) manages six discretionary portfolios for private clients in Singapore. When markets move, clients write in. They are worried about portfolio performance, market volatility, and NAV fluctuations.

The relationship managers are drowning. Replies take three days. Some clients get a warm, careful answer; some get a rushed one; one manager, under pressure, once wrote *"don't worry, it always bounces back"* — a sentence that is a regulatory problem in every jurisdiction that has a regulator.

The team wants AI to help them reply faster. Compliance says no. Both are right.

---

## The design question

This is not Activity 1. In LU1's onboarding assistant, the agent decided and acted, and nobody checked. That was defensible: the rules were mechanical and the outcome was auditable.

Here, the agent is drafting **a communication from a licensed firm to a retail investor about their money**. Getting the tone wrong is embarrassing. Getting the content wrong — "hold on, it will recover" — is unlicensed financial advice.

So the agent does everything **except the one thing that matters**: it never sends.

```
                    ┌── the agent's territory ──┐  ┌── the human's ──┐
  client message ──▶ classify · read tone ·      ──▶  approve         ──▶ reply sent + logged
                     flag · DRAFT                     or decline      ──▶ human agent calls the client
```

Everything the agent produces is a proposal. A licensed relationship manager reads the classification, the flags and the draft in an email, and clicks **Approve** or **Decline**. Only then does anything reach the client.

---

## What you are building

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ index.html   │ POST │ Client Query │      │ Normalise    │      │ Rapport      │
│ chat widget  │─────▶│ Webhook      │─────▶│ Query (Set)  │─────▶│ AI Agent     │
│              │◀─────│              │      └──────────────┘      └──────┬───────┘
└──────────────┘ ack  └──────────────┘                                   │
                                        ┌────────────────────────────────┤
                                        │                                │
                          Google Gemini Chat Model            Draft Parser (structured)
                                                                         │
   ┌─────────────────┐      ┌───────────┐      ┌─────────────┐          │
   │ Acknowledge     │◀─────┴───────────┴──────┤             │◀─────────┘
   │ Client (respond)│                          └─────────────┘
   └────────┬────────┘
            ▼
   ┌─────────────────┐      ┌──────────────┐      ┌─────────────┐
   │ Log Draft       │─────▶│ RM Approval  │─────▶│ If Approved │
   │ (Sheets)        │      │ (Gmail send  │      └──────┬──────┘
   └─────────────────┘      │  and wait)   │        true │ false
                            └──────────────┘             │
              ┌──────────────────────────────────────────┴─────────────┐
              ▼                                                        ▼
   ┌────────────────────┐   ┌────────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
   │ Send Approved Reply│──▶│ Log Approved Reply │   │ Assign to Human      │──▶│ Email Human      │
   │ (Gmail, HTML)      │   │ (Sheets)           │   │ Agent (Sheets)       │   │ Agent (Gmail)    │
   └────────────────────┘   └────────────────────┘   └──────────────────────┘   └──────────────────┘
```

Thirteen nodes. One agent. One human gate.

| File | Purpose |
|---|---|
| `index.html` | The Meridian site: hero, portfolios, "how we respond", lab config, and the floating chat widget |
| `style.css` | White-theme asset-management styling |
| `script.js` | Widget behaviour, validation, the POST, and the acknowledgement receipt |
| `LU2-Activity2b-Client-Rapport-Assistant.json` | The n8n workflow |
| `drafts.csv` · `approved-replies.csv` · `handover-queue.csv` | Headers for the three sheet tabs |
| `sample-queries.csv` | The eight test cases |

---

## Prerequisites

- An n8n instance, a Google Gemini API key, and Google Sheets + Gmail credentials — all set up in the Learner Guide (`LG_..._SF_n8n.docx`, Learning Activity 1 → Prerequisites).
- On the class instance the credentials already exist: `Gemini API Key (n8n TMS)`, `Google Sheets (Sales Account)`, `Gmail OAuth (Sales Account)`.

---

## Task 0 — Build the audit sheet (5 min)

Create a Google Sheet named exactly **`Meridian Client Rapport`** with **three tabs**. For each, import the matching CSV with **File → Import → Upload → Replace current sheet**, and **turn off** *Convert text to numbers, dates and formulas*.

| Tab name | Import | Holds |
|---|---|---|
| `Drafts` | `drafts.csv` | Every draft the agent produced, before any human saw it |
| `Approved_Replies` | `approved-replies.csv` | What was actually sent, and who approved it |
| `Handover_Queue` | `handover-queue.csv` | Drafts a human rejected — the ticket is now a person's job |

All three files are headers only. Tab names must match exactly — underscores, not spaces.

> **Why three tabs and not one.** `Drafts` records what the machine proposed. `Approved_Replies` records what a licensed person authorised. Keeping them apart is what lets an auditor ask the only question that matters: *did a human ever approve something the agent had not drafted, or send something a human never saw?*

---

## Task 1 — Import and configure the workflow (10 min)

1. **Workflows → Import from File →** [`LU2-Activity2b-Client-Rapport-Assistant.json`](LU2-Activity2b-Client-Rapport-Assistant.json)
   A pre-built copy sits on the class instance: **[LU2 Activity 2b — Client Rapport Assistant with Human Handover](https://n8n.tertiarytraining.com/workflow/u8fCvX1dvPZWicKg)**.

2. **Repoint the three Google Sheets nodes** (`Log Draft`, `Log Approved Reply`, `Assign to Human Agent`) at *your* `Meridian Client Rapport` spreadsheet. They ship with a `REPLACE_WITH_YOUR_SHEET_ID` placeholder and will fail until you do.

3. **Set the approver's email.** Four fields across four nodes carry `REPLACE_WITH_YOUR_EMAIL@example.com`:

   | Node | Field |
   |---|---|
   | `RM Approval` | **Send To** — where the approval request lands |
   | `Email Human Agent` | **Send To** — the human agent who will phone the client |
   | `Log Approved Reply` | the `Approved By` column |
   | `Assign to Human Agent` | the `Assigned To` column |

   Use **your own address**. You are playing the relationship manager.

4. Confirm the credentials on the Gemini, Sheets and Gmail nodes.

⚠️ **`Send Approved Reply` sends real email to whatever the client typed.** In every test, put your own address in the widget's *Your email* field.

---

## Task 2 — Read the agent (15 min)

Open `Rapport AI Agent`. This node is the lab. Read the whole system message before you run anything.

### The non-advisory rule

The agent is told, explicitly, that in the draft it may never:

- recommend buying, selling, holding, switching or redeeming anything;
- predict, forecast or estimate future returns, prices or NAV;
- guarantee or imply any outcome — *"markets always recover"*, *"you will not lose money"*;
- tell the client their portfolio is suitable, safe, or right for them;
- comment on whether now is a good or bad time to invest or redeem;
- state a fee, NAV or return figure that was not in the client's own message.

And what it **may** do: acknowledge the emotion by name, restate the concern accurately, explain the process, and offer a call with a licensed manager.

> *When in doubt, say less and offer the call.* That single sentence does more compliance work than the six bullets above it.

### The compliance flags

| Flag | Raised when the client… | Escalates? |
|---|---|---|
| `ADVICE_REQUESTED` | asks what they should do | **yes** |
| `GUARANTEE_SOUGHT` | asks for a promise about returns | **yes** |
| `VULNERABLE_CLIENT` | mentions distress, illness, bereavement, or savings they cannot afford to lose | **yes** |
| `LEGAL_OR_MEDIA_THREAT` | mentions a lawyer, MAS, the press | **yes** |
| `COMPLAINT` | is dissatisfied with Meridian, its fees or its staff | no |
| `WITHDRAWAL_INTENT` | raises redeeming, closing or moving the account | no |

The four that escalate are the four that **cannot be answered by a drafted email at all**. For those, the correct output is a draft that says so and offers a call — not a cleverer email.

### The output contract

`Draft Parser` forces the agent to return exactly:

```json
{
  "ticketId": "MAM-20260710-1042",
  "concernCategory": "Market Volatility",
  "emotionalTone": "Anxious",
  "urgency": "High",
  "complianceFlags": ["ADVICE_REQUESTED", "WITHDRAWAL_INTENT"],
  "escalate": true,
  "suggestedSubject": "Your enquiry about recent market movements (MAM-20260710-1042)",
  "draftReply": "<p style=\"margin:0 0 16px;\">Thank you for writing, and I am sorry…</p>"
}
```

`emotionalTone` is a **field**, not a paragraph. That is what lets the workflow colour a card, sort a queue, and let a manager see at a glance that the angriest client has been waiting longest. Prose cannot be sorted.

### What the agent does *not* write

Open `Send Approved Reply`. The **Message** field is a complete HTML letter: the Meridian letterhead, `Dear <name>`, a reference block with the account number masked, a sign-off, and a footer carrying the regulatory disclaimer — *this is not financial advice, past performance is not indicative of future performance, and this message was drafted with AI assistance and approved by a licensed representative*.

The agent fills exactly one slot in the middle: `draftReply`.

> The disclaimer is the most legally important sentence in the entire workflow, and the model is not allowed anywhere near it. Ask yourself why. Then ask what happens the one time in a thousand that a model "helpfully" rewrites a disclaimer.

Note also the **Temperature is 0.2**, not 0. The LU1 agent made a compliance decision and had to be deterministic. This one writes prose, and prose at temperature 0 reads like a fax machine. The classification is still stable because it is constrained to enumerated values.

---

## Task 3 — Run the widget (10 min)

Open the site:

```bash
cd labs/lu2-activity2-client-rapport
python3 -m http.server 8000
# then open http://localhost:8000
```

1. Scroll to **Lab configuration** and paste your Webhook **Test URL**. The panel tells you which kind of URL it recognised, and remembers it.
2. In n8n, click **Listen for test event**.
3. Pick **TC2 · Asks "what should I do?"** from the *Trainer demo queries* dropdown. The chat opens, filled in — except the email, which it clears on purpose.
4. Type **your own email** and send.

Watch three things happen, in order:

- **The widget** shows a receipt: reference number, priority, and — because TC2 escalates — a line saying a manager will call rather than reply by email.
- **The `Drafts` tab** gains a row. The draft now exists, and no human has seen it.
- **Your inbox** gets `[ESCALATE] Draft reply to Rachel Ong — MAM-…` with the agent's assessment, the client's own words, and the proposed reply, plus **Approve** and **Decline** buttons.

The n8n execution is now **paused**, waiting on you. That pause is the entire lesson. Look at the canvas: the workflow is sitting on `RM Approval`, and it will sit there until a human decides.

5. Click **Approve**. The reply is sent to the client and logged in `Approved_Replies`.
6. Run **TC4** and click **Decline** instead. Now watch what does *not* happen: **nothing is sent to the
   client**. The ticket is written to `Handover_Queue`, stamped with the name of a human agent, and that
   agent receives an **`[ACTION REQUIRED]`** email carrying the client's own words, the agent's assessment,
   and the declined draft — clearly labelled *for context only, do not send it*.

> **A decline is not a deletion. It is a reassignment.** The old design dropped the rejected draft into a
> "rewrite queue" and hoped someone noticed. This one names a person, tells them the client is waiting, and
> tells them to pick up the phone. The difference between a queue and an assignment is whether anyone is
> accountable for the silence.

Then activate the workflow, copy the **Production URL**, and paste it into the panel so the widget works from any device.

---

## Task 4 — What the client is allowed to see

Open `Acknowledge Client`. The response body is deliberately small:

```json
{ "status": "received", "ticketId": "…", "urgency": "High", "escalated": true, "message": "…" }
```

The agent worked out `emotionalTone` and `complianceFlags`. Neither is returned.

Sending a client `"emotionalTone": "Angry", "complianceFlags": ["COMPLAINT"]` would be a poor experience and a disclosure no compliance officer would sign. Those are **internal assessments about a person**, and the browser is not where they belong. The response contract is five fields, and the widget renders four of them.

> This is the same discipline as `create_customer_record` in LU1, pointed the other way. There, you limited what the agent could *write*. Here, you limit what the system will *reveal*.

---

## Test it

Run all eight rows of [`sample-queries.csv`](sample-queries.csv) from the demo dropdown. Expected flags are the ones that **must** appear; the agent may reasonably raise others alongside them.

| # | Case | Must flag | Escalate | Approve or Decline? |
|---|---|---|---|---|
| TC1 | Calm volatility question | none | no | Approve |
| TC2 | "Should I move to cash?" | `ADVICE_REQUESTED` | **yes** | Approve |
| TC3 | "Guarantee I won't lose money" | `GUARANTEE_SOUGHT` | **yes** | Approve |
| TC4 | Furious about fees | `COMPLAINT` | no | **Decline** |
| TC5 | "Redeem everything" | `WITHDRAWAL_INTENT` | no | Approve |
| TC6 | 68, retirement savings, not sleeping | `VULNERABLE_CLIENT` | **yes** | **Decline** |
| TC7 | Lawyer and MAS | `LEGAL_OR_MEDIA_THREAT` | **yes** | **Decline** |
| TC8 | Factual NAV query | none | no | Approve |

When you are done: `Drafts` has **8 rows**, `Approved_Replies` has **5**, `Handover_Queue` has **3**.

Every row in `Approved_Replies` has a named human in `Approved By` — that person authorised the email that
reached the client. Every row in `Handover_Queue` has a named human in `Assigned To` — that person now owes
the client a phone call. **Neither table has an empty accountability column**, and that is the audit trail a
regulator asks for: not *what did the machine decide*, but *which licensed person is answerable for it*.

**Read the drafts, not just the flags.** For TC2 and TC3, check the drafted reply actually *refuses*: it should say the manager cannot give a recommendation or a guarantee by email, and offer a call. If a draft says anything resembling "markets typically recover over the long term", you have just watched a language model commit an offence, and you have also just proved why the approval gate exists.

---

## Debrief

1. **TC6 is the hard one.** A distressed 68-year-old asks what to do with her retirement savings. The agent drafts something careful and offers a call. Should this query have reached the agent at all? What would a rule that routed it straight to a human — before any model saw it — cost you, and what would it buy?

2. **The approval button is a rubber stamp.** After forty of these, your relationship manager clicks Approve without reading. What in this workflow makes that more likely, and what would you change to make careful reading the path of least resistance?

3. **`emotionalTone` is a judgement about a person, stored in a spreadsheet.** Under the PDPA, is that personal data? Who can see the `Drafts` tab? How long should it be kept?

4. **The `Drafts` tab records what the agent proposed, including drafts a human rejected.** Is that an asset or a liability in litigation? Argue both sides. (There is no comfortable answer, which is the point.)

5. **Compare with LU1.** Same model, same platform, same shape — webhook, agent, structured output, sheets, email. The onboarding assistant acted alone; the rapport assistant cannot send a sentence unsupervised. What is the actual variable? It is not the technology, and it is not the risk of the model being wrong. Name it.

6. **Compare with Activity 2.** The investment advisor chatbot talks to the public with nobody checking, on the same regulated topic. Why is that acceptable there and not here? Work through: who is the audience, what is at stake in a wrong sentence, and — the one that actually decides it — does the agent speak in *generalities* or about *this client's money*?

7. **The declined draft is emailed to the human agent for context, marked "do not send".** You have just put an unapproved, possibly non-compliant paragraph into a mailbox. Was that wise? What would you do instead, and what would the agent lose?

6. **Temperature 0.2 for the prose, enumerated values for the classification.** You have made half the output creative and half deterministic, in one model call. Where else would you draw that line?

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Failed to fetch` in the browser | Workflow not Active (production URL), or *Listen for test event* not armed (test URL). |
| `Failed to fetch`, but the execution ran | CORS. Set **Allowed Origins** to `*` in the Webhook node's options. |
| Works once, then `404` | You are on the Test URL. It listens for one request. |
| No approval email arrives | `RM Approval` still has `REPLACE_WITH_YOUR_EMAIL@example.com` in **Send To**. |
| The approval email arrives but the buttons do nothing | The workflow must stay running. If n8n restarted, the paused execution is gone — resubmit. |
| `Cannot read properties of undefined (reading 'trim')` | The Set node expects `$json.body.clientName`. Check the browser's Network tab. |
| The sheet rows are blank | *Require Specific Output Format* is off on the agent, so `$json.output` is a string, not an object. |
| Every draft is escalated | The agent is flagging `ADVICE_REQUESTED` on any question at all. Tighten the flag's definition — it means *asks what they should do*, not *asks a question*. |
| The draft contains a greeting and a sign-off | The agent ignored "body only". They now appear twice, because the letterhead adds its own. Restate the instruction. |
| The draft gives advice | Read it aloud in the debrief. This is the most valuable failure in the lab — the approval gate caught it, which is what it is for. |
