# Hands-on Lab (LU2)
## Customer Rapport Assistant for Investment Clients — Power Automate + Approvals

**Learning Unit:** LU2 — Build Agentic AI Chatbots on No-Code Platforms
**Duration:** 75 minutes
**You will use:** Microsoft Forms · Power Automate · AI Builder · Approvals · Excel Online · Outlook · Teams

**What you end up with:** a "raise a concern" form on a Teams tab. When a worried client submits it, a flow
reads their emotional tone, raises compliance flags, and **drafts** a strictly non-advisory reply — then
**stops** and waits for a licensed human to approve it in Teams. Approved replies are sent and logged.
Declined drafts go to a rewrite queue.

> **Outcome.** Hands-on practice applying AI responsibly in a regulated environment — balancing automation
> with human oversight.

---

## Scenario

**Meridian Asset Management** (fictitious) manages portfolios for private clients in Singapore. When markets
move, clients write in, worried about performance, volatility and NAV.

The relationship managers are drowning. Replies take three days. Some clients get a warm, careful answer;
some get a rushed one. One manager, under pressure, once wrote *"don't worry, it always bounces back"* —
a sentence that is a regulatory problem in every jurisdiction that has a regulator.

The team wants AI to help them reply faster. Compliance says no. **Both are right.**

---

## The design question

This is not LU1. There, the AI decided and acted, and nobody checked. That was defensible: the rules were
mechanical and the outcome was auditable.

Here the AI is drafting **a letter from a licensed firm to a retail investor about their money**. Getting the
tone wrong is embarrassing. Getting the content wrong — *"hold on, it will recover"* — is unlicensed
financial advice.

So the AI does everything **except the one thing that matters. It never sends.**

```
    ┌──── the AI's territory ────┐     ┌── the human's ──┐
     read tone · flag · DRAFT     ───▶   approve         ───▶  reply sent + logged
                                        or decline       ───▶  rewrite queue
```

---

## What you build

```
Microsoft Form ─▶ Normalise Enquiry (Compose) ─▶ Draft Reply (AI Builder) ─▶ Parse JSON
                                                                                 │
                                                              Add row to Drafts (Excel)
                                                                                 │
                                             Start and wait for an approval  ◀── the flow PAUSES
                                                                                 │
                                            ┌────────────────────────────────────┴──────────────┐
                                        Approve                                            Reject
                                            │                                                  │
                        Send email (Outlook)                          Add row to Rewrite_Queue (Excel)
                        Add row to Approved_Replies (Excel)           Post message in Teams
```

**Prerequisites:** Microsoft 365 with Power Automate, AI Builder, Excel Online, Outlook and Teams.

---

### Task 0 — Build the workbook (5 min)

In OneDrive, create **`Meridian Client Rapport.xlsx`** with **three** sheets. Paste each CSV in, select it,
press **Ctrl+T**, and name the table exactly as shown:

| Sheet & table name | Paste in | What it holds |
|---|---|---|
| `Drafts` | [`drafts.csv`](drafts.csv) | Every draft the AI produced, before any human saw it |
| `Approved_Replies` | [`approved-replies.csv`](approved-replies.csv) | What was actually sent, and who approved it |
| `Rewrite_Queue` | [`rewrite-queue.csv`](rewrite-queue.csv) | Drafts a human rejected |

All three are headers only.

> **Why three tables and not one.** `Drafts` records what the machine proposed. `Approved_Replies` records
> what a licensed person authorised. Keeping them apart lets an auditor ask the only question that matters:
> *did anything reach a client that a human never saw?*

---

### Task 1 — Build the form (5 min)

In **Microsoft Forms**, create **Meridian — Raise a Concern**. Four questions:

| # | Question | Type |
|---|---|---|
| 1 | Your name | Text |
| 2 | Your email | Text |
| 3 | Your portfolio | Choice — Capital Preservation, Income, Balanced, Global Growth, Asia Opportunities |
| 4 | What is worrying you? | Long answer |

Add it as a **Teams tab** in your client-relations channel (**+** → *Forms*), or embed it on a SharePoint page.

---

### Task 2 — Create the AI prompt (10 min)

Follow [`prompts/rapport-draft-prompt.md`](prompts/rapport-draft-prompt.md).
Name it `Meridian Client Rapport Draft`, one text input called `Enquiry`.

**Read the non-advisory rule before you run anything.** The prompt forbids the AI from recommending,
predicting, guaranteeing, or naming a figure that was not in the client's own message. And it names four
compliance flags:

| Flag | Raised when the client… | Escalates? |
|---|---|---|
| `ADVICE_REQUESTED` | asks what they should do | **yes** |
| `GUARANTEE_SOUGHT` | asks for a promise about returns | **yes** |
| `VULNERABLE_CLIENT` | mentions distress, illness, or savings they cannot afford to lose | **yes** |
| `COMPLAINT` | is dissatisfied with Meridian, its fees or its staff | no |

The three that escalate are the three that **cannot be answered by a drafted email at all**. For those, the
correct output is a draft that says so and offers a call — not a cleverer email.

---

### Task 3 — Build the flow (35 min)

**Power Automate → Create → Automated cloud flow**, named `Meridian — Client Rapport Assistant`.
Trigger: **When a new response is submitted** → your form. Then **Get response details**.

**1. Normalise Enquiry** — a **Compose** action:

```json
{
  "ticketId":    "@{concat('MAM-', formatDateTime(utcNow(),'yyyyMMdd'), '-', workflow()?['run']?['name'])}",
  "clientName":  "@{trim(<Your name>)}",
  "clientEmail": "@{trim(toLower(<Your email>))}",
  "portfolio":   "@{<Your portfolio>}",
  "message":     "@{trim(<What is worrying you?>)}"
}
```

**2. Draft Reply** — AI Builder → **Run a prompt** → `Meridian Client Rapport Draft`.
`Enquiry` = the **Outputs** of *Normalise Enquiry*.

**3. Parse JSON** — Content = the prompt's **Text** output. **Generate from sample**:

```json
{ "concernCategory": "Market Volatility", "emotionalTone": "Anxious",
  "complianceFlags": ["ADVICE_REQUESTED"], "escalate": true,
  "emailSubject": "…", "draftReply": "<p>…</p>" }
```

> `emotionalTone` is a **field**, not a paragraph. That is what lets you sort a queue and show a manager at
> a glance that the angriest client has been waiting longest. Prose cannot be sorted.

**4. Add a row into a table** → `Drafts`. Map the enquiry fields from *Normalise Enquiry*, and the
classification from *Parse JSON*. Set `Compliance Flags` to
`join(body('Parse_JSON')?['complianceFlags'], ', ')`.

> The draft now exists. **No human has seen it.**

**5. Start and wait for an approval** — Approvals connector.
- **Approval type:** *Approve/Reject – First to respond*
- **Title:** `@{if(body('Parse_JSON')?['escalate'], '[ESCALATE] ', '[REVIEW] ')}Draft reply to @{outputs('Normalise_Enquiry')['clientName']}`
- **Assigned to:** your own email address (you are playing the relationship manager)
- **Details** — paste this:

```
Ticket:   @{outputs('Normalise_Enquiry')['ticketId']}
Client:   @{outputs('Normalise_Enquiry')['clientName']}
Tone:     @{body('Parse_JSON')?['emotionalTone']}
Flags:    @{join(body('Parse_JSON')?['complianceFlags'], ', ')}
Escalate: @{body('Parse_JSON')?['escalate']}

CLIENT SAID
@{outputs('Normalise_Enquiry')['message']}

PROPOSED REPLY
@{body('Parse_JSON')?['draftReply']}

Approve to send this to the client as-is. Reject to send it back for a manual rewrite.
You are the licensed representative. Nothing reaches the client unless you approve it.
```

The approval arrives in the **Approvals** app in Teams, and by email.

**6. Condition** — `Outcome` (from the approval) **is equal to** `Approve`.

**If yes:**
- **Send an email (V2)** — **To** = `clientEmail` from *Normalise Enquiry* (not from the AI).
  **Subject** = `emailSubject`. **Body** — switch to `</>` code view and paste:

```html
<div style="font-family:Arial;max-width:620px;border:1px solid #e3e8ee;border-radius:8px">
  <div style="background:#10243e;color:#fff;padding:20px;font-size:17px;font-weight:bold">
    Meridian Asset Management
  </div>
  <div style="padding:24px;color:#1b2733;line-height:1.65">
    <p>Dear @{outputs('Normalise_Enquiry')['clientName']},</p>
    @{body('Parse_JSON')?['draftReply']}
    <p style="margin-top:20px">Yours sincerely,<br><b>Client Relationship Team</b><br>Meridian Asset Management</p>
  </div>
  <div style="background:#f5f7fa;padding:16px 24px;color:#5b6b7b;font-size:11px;line-height:1.5">
    <p><b>Important.</b> This email is for information only. It does not constitute financial advice or a
       recommendation, and does not take account of your objectives or financial situation. Past performance
       is not indicative of future performance. The value of investments may fall as well as rise.</p>
    <p>This message was drafted with AI assistance and reviewed and approved by a licensed representative
       before it was sent.</p>
    <p>Meridian Asset Management is a fictitious institution used for training. No investment service is
       offered and no advice of any kind is given.</p>
  </div>
</div>
```

- **Add a row into a table** → `Approved_Replies`. Set `Approved By` to the approval's **Responder** email.

**If no:**
- **Add a row into a table** → `Rewrite_Queue`, with `Status` = `Awaiting manual rewrite`.
- **Post message in a chat or channel** (Teams) → your channel:
  `@{outputs('Normalise_Enquiry')['ticketId']} — the client has NOT been contacted and is still waiting.`

**Save**, then submit the form.

---

### Task 4 — Watch the pause

Submit **TC2** ("Should I move everything to cash?"). Then, before you touch the approval, look at the
flow's **run history**.

The run is sitting on *Start and wait for an approval*, doing nothing, and it will sit there for days if you
let it. **That pause is the entire lesson.** Every other action in this flow could be replaced with a faster
one and the lesson would survive. Remove the pause and you have built exactly the thing compliance said no to.

Then open **Teams → Approvals**, read the draft, and click **Approve**.

---

## Test it

Run all six rows of [`sample-queries.csv`](sample-queries.csv). Use **your own email** as the client email.

| # | Case | Must flag | Escalate | You should |
|---|---|---|---|---|
| TC1 | Calm question about volatility | none | no | **Approve** |
| TC2 | "Should I move to cash?" | `ADVICE_REQUESTED` | **yes** | **Approve** |
| TC3 | "Guarantee I won't lose money" | `GUARANTEE_SOUGHT` | **yes** | **Approve** |
| TC4 | Furious about fees | `COMPLAINT` | no | **Reject** |
| TC5 | 68, retirement savings, not sleeping | `VULNERABLE_CLIENT` | **yes** | **Reject** |
| TC6 | Factual NAV question | none | no | **Approve** |

Afterwards: `Drafts` has **6 rows**, `Approved_Replies` has **4**, `Rewrite_Queue` has **2**.
Every row in `Approved_Replies` names a human in `Approved By`. Both clients in `Rewrite_Queue` are still
waiting for a person to write to them — which is exactly what should happen.

**Read the drafts, not just the flags.** For TC2 and TC3, check the draft actually *refuses*: it should say
the manager cannot give a recommendation or a guarantee by email, and offer a call. If a draft says anything
resembling *"markets typically recover over the long term"*, you have just watched a language model commit a
regulatory offence — and proved, in front of the whole room, why the approval gate exists.

---

## Debrief

1. **TC5 is the hard one.** A distressed 68-year-old asks what to do with her retirement savings. Should this
   enquiry have reached the AI at all? What would a rule that routed it straight to a human — before any
   model saw it — cost you, and what would it buy?
2. **The approval button is a rubber stamp.** After forty of these, your manager clicks Approve without
   reading. What in this flow makes that more likely, and what would you change?
3. **`emotionalTone` is a judgement about a person, stored in a spreadsheet.** Under the PDPA, is that
   personal data? Who can see the `Drafts` table? How long should it be kept?
4. **Three controls, ranked.** The non-advisory rule lives in the prompt; the approval gate lives in the flow;
   the disclaimer lives in the Outlook action. Which is *probabilistic*, which is *procedural*, and which is
   *structural* — that is, which one works because the model physically cannot reach the text?
5. **Compare with LU1.** Same platform, same shape. The onboarding flow acted alone; this one cannot send a
   sentence unsupervised. What is the actual variable? It is not the technology, and it is not the chance of
   the model being wrong.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| No approval arrives | *Assigned to* is empty or wrong. Use your own email address. |
| The approval arrives but the flow never continues | You used **Create an approval** instead of **Start and wait for an approval**. |
| The flow finished instantly with no pause | Same cause as above. |
| *Parse JSON* fails | The model wrapped its answer in ```` ```json ```` fences. Add "Return only JSON" to the prompt. |
| `Compliance Flags` writes `System.Object[]` | It is an array. Wrap it: `join(body('Parse_JSON')?['complianceFlags'], ', ')`. |
| Every draft escalates | The AI is flagging `ADVICE_REQUESTED` on any question at all. Tighten the definition: it means *asks what they should do*, not *asks a question*. |
| The draft has its own "Dear …" and sign-off | The AI ignored "body only", so they appear twice. Restate it in the prompt. |
| The draft gives investment advice | Read it aloud in the debrief. The approval gate caught it. That is what it is for. |

---

## Files

| File | Purpose |
|---|---|
| `prompts/rapport-draft-prompt.md` | The AI Builder prompt — the non-advisory rule and the four flags |
| `drafts.csv` · `approved-replies.csv` · `rewrite-queue.csv` | Headers for the three Excel tables |
| `sample-queries.csv` | The six test enquiries |
