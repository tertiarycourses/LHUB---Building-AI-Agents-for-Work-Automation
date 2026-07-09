# Hands-on Lab (LU1) — Activity 1a
## Problem Solving in Retail Banking Customer Onboarding Assistant using n8n and AI Agent

**Learning Unit:** LU1 — Overview of AI Agents and Agentic AI Workflows
**Duration:** 90 minutes (Part A discussion 35 min · Part B build 55 min)
**Deliverable:** A working n8n workflow that takes a bank account application, checks for duplicates, screens it for KYC risk, applies the bank's eligibility rules, creates the customer record, and emails the applicant — decided entirely by an AI Agent.

This lab runs on the **4-Step Problem-Solving Framework**. Steps 1–3 are discussion and group work. Step 4 is the hands-on n8n build. Do not skip to Part B — the workflow you build in Step 4 is meant to be *your group's answer* to the root causes you name in Step 2.

> **Activity 1b** takes the same agent and puts a real bank website in front of it, using a Webhook instead of an n8n Form. See [`../lu1-activity1b-onboarding-website/`](../lu1-activity1b-onboarding-website/).

---

## Scenario

> Manual customer onboarding in banks is slow, prone to errors, and does not effectively validate duplicate customer entries.

**Marina Trust Bank** (a fictitious Singapore retail bank) takes new-account applications on paper. Branch staff key them into a spreadsheet by hand. Applications sit in a queue for days. The same customer sometimes ends up with two records under slightly different spellings. Eligibility rules for account types are printed in a binder, and different officers apply them differently. KYC screening for politically exposed persons is done by memory. Confirmation emails are typed one at a time and often forgotten.

---

# Part A — Problem Solving (Steps 1–3)

## Step 1: Problem Definition — *Guided discussion (10 min)*

Before you automate anything, state the problem precisely enough that you could tell whether you had solved it.

**Discussion prompts**

1. What is the exact problem in this scenario?
2. Who are the stakeholders involved?
3. What is the impact of this problem on business operations?
4. Can the problem be clearly measured or quantified?

**Worksheet — fill this in as a group**

| | Your answer |
|---|---|
| Problem statement (one sentence) | |
| Stakeholders | |
| Business impact | |
| Measure of success (a number) | |

**Facilitator's model answer** — reveal only after the group has attempted it.

- **Problem statement:** New-account applications are processed manually, taking 3–5 working days, with no systematic check for an existing customer record, so duplicate customers and data-entry errors reach the core banking system.
- **Stakeholders:** the applicant, branch onboarding officers, the compliance/KYC team, the operations manager, and downstream systems that consume the customer master record.
- **Business impact:** slow time-to-account (applicant abandonment), duplicate records that corrupt KYC and single-customer-view reporting, inconsistent application of eligibility rules (a compliance exposure), and officer time spent typing rather than serving customers.
- **Measure of success:** average time-to-decision (target: under 2 minutes, from 3–5 days), duplicate-record rate (target: 0%), rule-application consistency (target: 100%), confirmation-email delivery rate (target: 100%).

> **Teaching point.** "Onboarding is slow" is not a problem definition — you cannot tell when it is fixed. "Time-to-decision is 3–5 days and the duplicate rate is 6%" is, because both are numbers that move.

---

## Step 2: Root Cause Analysis — *Guided discussion (10 min)*

Now find the *causes*, not the symptoms. Slowness is a symptom. Ask "why" until you reach something you could actually change.

**Discussion prompts**

1. What are the possible causes of this issue?
2. Are there inefficiencies in the current process?
3. Are there system or technology limitations?
4. Does reliance on manual work contribute to delays or errors?

**Worksheet — the "5 Whys" ladder**

> Onboarding takes 3–5 days → *why?* → … → *why?* → **root cause**

**Expected observations**

| # | Root cause | Symptom it produces |
|---|---|---|
| RC1 | Absence of automated duplicate validation | Two records for the same customer; broken single-customer-view |
| RC2 | Errors in manual data entry | Wrong NRIC/email; failed confirmations; rework |
| RC3 | Lack of integration across systems | Officer re-keys the same data into the form, the sheet, and email |
| RC4 | Delays in communication such as confirmation emails | Applicant does not know their status; calls the branch |
| RC5 | Eligibility and KYC rules live in a binder, applied by humans | Inconsistent decisions across officers and branches; missed PEP screening |

> **Teaching point.** Keep a numbered list. In the debrief at the end of Part B you will point at a specific n8n node and name the root cause it kills. A solution that maps to no root cause is a feature nobody asked for.

---

## Step 3: Solution Ideation — *Group activity, 3–4 members (15 min)*

**Discussion prompts**

1. What solutions can address the identified root causes?
2. How can automation improve this process?
3. Can AI support decision-making in this scenario?
4. What tools or technologies can be used?

**Worksheet — design before you build**

| Root cause | Your proposed countermeasure | Deterministic step or AI Agent decision? |
|---|---|---|
| RC1 | | |
| RC2 | | |
| RC3 | | |
| RC4 | | |
| RC5 | | |

**Expected solution direction**

- Use an **AI Agent** to process onboarding requests and decide the outcome.
- **Automate validation** of customer data — specifically, look the applicant up by NRIC before creating anything.
- **Integrate with a data source** (Google Sheets) for both validation and storage.
- **Automate communication** — the confirmation email is sent by the workflow, not by a person.

**The question that matters most:** *which parts of this should the AI Agent decide, and which parts should be plain deterministic steps?*

| Concern | Give it to | Why |
|---|---|---|
| Trimming whitespace, upper-casing the NRIC | A **Set** node | Deterministic. An LLM adds latency, cost, and non-determinism for a `.trim()`. |
| Working out the applicant's age from their date of birth | A **Set** node | Date arithmetic is exactly what a language model is worst at. Compute it, then hand the agent a number. |
| Looking up an NRIC in the sheet | A **tool** the agent calls | The lookup itself is deterministic; the *decision to call it* is the agent's. |
| Choosing APPROVE / REJECT / DUPLICATE / REVIEW | The **AI Agent** | It reasons over the rules and the lookup result. |
| Writing the customer-facing email copy | The **AI Agent** | Natural language and tone. |
| The bank's letterhead and no-reply footer | The **Gmail tool's template** | Branding must never vary. Do not let the model rewrite it each time. |
| Appending the audit-log row | A **Google Sheets** node | Must happen on every run, always, whatever the agent said. Never trust an agent to log itself. |

> **Teaching point — the boundary of agency.** The agent decides *what to do*; the tools do it. Anything that must happen *every single time* belongs outside the agent, downstream of it. This is the single most important design idea in LU1.

*Each group presents its design (2 min) before moving to Step 4.*

---

# Part B — Step 4: Implementation using Agentic AI (Hands-on)

You will now build the design as an n8n workflow.

```
                                     ┌──────────────────────────┐
                                     │  Google Gemini Chat Model│
                                     └────────────┬─────────────┘
                                                  │ ai_languageModel
┌────────────────┐   ┌──────────────────┐   ┌─────┴──────────┐   ┌─────────────┐   ┌──────────────┐
│ On form        │──▶│ Normalise        │──▶│ Onboarding     │──▶│ Log Decision│──▶│ Show Outcome │
│ submission     │   │ Application (Set)│   │ AI Agent       │   │ (Sheets)    │   │ (Form)       │
└────────────────┘   └──────────────────┘   └─────┬──────────┘   └─────────────┘   └──────────────┘
                                                  │ ai_tool
                     ┌────────────────────────────┼────────────────────────────┐
                     │                            │                            │
          ┌──────────┴───────────┐    ┌───────────┴──────────┐    ┌────────────┴───────────┐
          │check_duplicate_      │    │create_customer_      │    │send_confirmation_      │
          │customer (Sheets Tool)│    │record (Sheets Tool)  │    │email (Gmail Tool)      │
          └──────────────────────┘    └──────────────────────┘    └────────────────────────┘
                                                  │ ai_outputParser
                                       ┌──────────┴───────────┐
                                       │ Decision Parser      │
                                       └──────────────────────┘
```

Ten nodes. The agent has three tools and one structured-output contract.

### Prerequisites

Covered in full in the Learner Guide (`LG_Building_AI_Agents_for_Work_Automation_SF_n8n.docx`, Learning Activity 1 → Prerequisites): an n8n instance (cloud or local, or local with Ollama + Gemma), a Google Gemini API key, and Google Sheets + Gmail credentials.

On the class instance the credentials already exist — select them from the dropdown, do not create new ones:

| Node | Credential |
|---|---|
| Google Gemini Chat Model | `Gemini API Key (n8n TMS)` |
| The two Google Sheets tools + Log Decision | `Google Sheets (Sales Account)` |
| send_confirmation_email | `Gmail OAuth (Sales Account)` |

---

### Task 0 — Prepare the data source (5 min)

1. Create a Google Sheet named **`Retail Banking Onboarding`**.
2. Rename the first tab to **`Customers`** and import [`customers.csv`](customers.csv) — 5 seed customers, the records your duplicate check will hit.
3. Add a second tab named **`Onboarding_Log`** and import [`onboarding-log.csv`](onboarding-log.csv) (headers only).

Column headers must match exactly. `Full Name`, not `Name`. The agent's tool calls are wired to these header strings.

---

### Task 1 — Import the workflow (2 min)

**Workflows → Import from File →** [`LU1-Activity1-Retail-Banking-Onboarding.json`](LU1-Activity1-Retail-Banking-Onboarding.json)

A pre-built copy sits on the class instance: **[LU1 Activity 1 — Retail Banking Customer Onboarding Assistant](https://n8n.tertiarytraining.com/workflow/1GoAiJCgURV1D9vN)**.

Then open the three Google Sheets nodes (`check_duplicate_customer`, `create_customer_record`, `Log Decision`) and re-select **your** spreadsheet in the *Document* dropdown. They ship with a `REPLACE_WITH_YOUR_SHEET_ID` placeholder and **will fail until you do this**.

---

### Task 2 — `On form submission` (Form Trigger)

Title: **Marina Trust Bank — Bank Account Application Form**. Twenty fields, in four groups.

| Group | Fields |
|---|---|
| Personal | Full Name, NRIC / FIN, Date of Birth *(date)*, Nationality *(13)*, Residency Status *(9)* |
| Contact | Email Address *(email)*, Mobile Number, Residential Address *(textarea)*, Postal Code |
| Account & employment | Account Type *(6)*, Employment Status *(9)*, Occupation / Industry *(15)*, Employer *(optional)*, Annual Income *(number)*, Initial Deposit *(number)* |
| Regulatory | Source of Funds *(8)*, Purpose of Account *(7)*, PEP *(Yes/No)*, Foreign tax resident *(Yes/No)*, Declaration |

Every dropdown is pre-populated. **Options → Append n8n Attribution** is **off**, so the form carries no n8n branding.

This node replaces the paper form and the officer's keyboard — **RC3**.

---

### Task 3 — `Normalise Application` (Set / Edit Fields)

21 assignments. The ones that matter:

| Field | Value |
|---|---|
| `applicationId` | `APP-{{ $now.format('yyyyLLdd') }}-{{ $execution.id }}` |
| `nric` | `{{ $json['NRIC / FIN'].trim().toUpperCase() }}` |
| `email` | `{{ $json['Email Address'].trim().toLowerCase() }}` |
| `age` | `{{ Math.floor($now.diff(DateTime.fromISO($json['Date of Birth']), 'years').years) }}` |

Two things happen here that decide whether the whole workflow works:

**Normalisation.** ` s9012345j ` and `S9012345J` are the same person, and a spreadsheet lookup does not know that. Normalising **before** the lookup is what actually kills the duplicate problem — **RC1**, **RC2**. Test case TC5 fails without it.

**Age.** The agent is never asked to do date arithmetic. It receives `age` as an integer. Language models are unreliable at "how many years between 2010-05-14 and today"; `Math.floor(...)` is not.

> Note the bracket syntax: `$json['NRIC / FIN']` because the field label contains spaces and a slash.

---

### Task 4 — `Onboarding AI Agent` (AI Agent)

- **Source for Prompt:** *Define below* — the normalised fields, one per line.
- **Require Specific Output Format:** ON
- **System Message:** the onboarding rules. Open the node and read it in full.

The rules are **ordered, and they stop at the first one that fires**. That ordering is the whole design:

| Step | Check | Outcome if it fires |
|---|---|---|
| 1 | NRIC already in `Customers` | `DUPLICATE` |
| 2 | Age below 18 | `REJECTED` (flag `MINOR`) |
| 3 | PEP · foreign tax resident · high-risk source of funds | `REVIEW` (flags `PEP`, `CRS_FATCA`, `SOURCE_OF_FUNDS`) |
| 4 | Account eligibility (see below) | `REJECTED` |
| 5 | Initial deposit below the minimum | `REJECTED` |
| 6 | Nothing fired | `APPROVED` |

**Account eligibility and minimum deposit** — this is **RC5**, the binder made executable:

| Account Type | Eligibility | Minimum deposit |
|---|---|---|
| Savings | none | SGD 500 |
| Joint Savings | none | SGD 1,000 |
| Student Account | Employment Status is exactly `Student` | SGD 0 |
| Current | gainfully employed | SGD 3,000 |
| Fixed Deposit | Annual Income ≥ SGD 30,000 | SGD 10,000 |
| Multi-Currency | Annual Income ≥ SGD 60,000 **and** gainfully employed | SGD 5,000 |

*Gainfully employed* = Employed, Self-Employed, Contract, or Part-Time.

And the ordering rule that matters most: **the duplicate check always runs first, and `create_customer_record` is forbidden until it comes back clean.** An agent that creates the record before it checks is the bug this whole lab is about.

---

### Task 5 — Model, memory, and output parser

**Google Gemini Chat Model** → model `models/gemini-2.5-flash`, **Temperature `0`**.

Temperature 0 is not a style preference. This agent makes a compliance decision; the same application must produce the same decision every time. Turn it up to 1 during the debrief and re-run TC3 a few times to see why this matters.

**No memory node.** Each application is independent. Conversation memory here would let one applicant's data leak into the next one's decision. (Contrast with the Telegram agent in LU2, where memory is the point.)

**Decision Parser** (Structured Output Parser) — the agent must return exactly:

```json
{
  "applicationId": "APP-20260710-1042",
  "decision": "APPROVED",
  "reason": "No existing record for this NRIC. Applicant is 34, cleared KYC screening, is gainfully employed and meets the SGD 3,000 minimum deposit for a Current account.",
  "riskFlags": ["PEP"],
  "emailSent": true
}
```

A free-text answer cannot be logged, filtered, or counted. The parser turns the agent's reasoning into fields a downstream node can branch on.

---

### Task 6 — The three tools

Attach all three to the agent's **Tool** connector. The tool *names* are what the agent sees in its system prompt — keep them exactly as given.

**`check_duplicate_customer`** — Google Sheets Tool, operation **Get Row(s)**
- Filter → Lookup Column `NRIC`, Lookup Value:
  ```
  {{ $fromAI('nric', 'The applicant NRIC or FIN, trimmed and in uppercase, e.g. S1234567A', 'string') }}
  ```
- The tool description tells the agent that an *empty* result means "not an existing customer". Without that sentence it will loop.

**`create_customer_record`** — Google Sheets Tool, operation **Append**
- Every one of the 21 columns is mapped from the Set node: `{{ $('Normalise Application').first().json.nric }}`, and so on.
- **This tool takes no `$fromAI` arguments at all.** The agent decides *whether* to call it; it cannot decide *what goes in it*. A hallucinated NRIC cannot reach the Customers sheet, because the agent was never given a slot to put one in.

**`send_confirmation_email`** — Gmail Tool, operation **Send**, *Email Type* = HTML
- `To` = `{{ $('Normalise Application').first().json.email }}` — again, not `$fromAI`. The agent cannot redirect the bank's email to an address of its choosing.
- `Subject` and one `body_html` slot come from `$fromAI(...)`.
- The **letterhead, greeting, reference block, masked NRIC, sign-off and no-reply footer are hard-coded in the node's HTML template**. The agent writes 2–3 paragraphs of body copy and nothing else.
- **Options → Append n8n Attribution** is **off**.
- **RC4** dies here.

> **`$fromAI()` is the whole idea of a tool** — you are not passing the agent a value, you are declaring a slot and letting the agent fill it from its own reasoning. Which is exactly why you should declare as *few* slots as the job needs. Compare the three tools above: the only things the agent is trusted to author are one NRIC to look up, one subject line, and one body of prose.

⚠️ **Before you run TC1:** `send_confirmation_email` sends real email from a real mailbox. Put **your own address** in the Email field of every test application.

---

### Task 7 — `Log Decision` and `Show Outcome`

**`Log Decision`** — Google Sheets, Append to `Onboarding_Log`:

| Column | Value |
|---|---|
| `Timestamp` | `{{ $now.toISO() }}` |
| `Application ID` | `{{ $json.output.applicationId }}` |
| `NRIC` | `{{ $('Normalise Application').item.json.nric }}` |
| `Decision` | `{{ $json.output.decision }}` |
| `Reason` | `{{ $json.output.reason }}` |
| `Risk Flags` | `{{ ($json.output.riskFlags \|\| []).join(', ') }}` |
| `Email Sent` | `{{ $json.output.emailSent }}` |

This node is **downstream of the agent, not a tool of it** — the design decision from Step 3. The agent cannot choose to skip the audit log, and it cannot choose what goes in the NRIC column, because that value is pulled from `Normalise Application` rather than from the agent's output. An auditor needs a log the agent could not have falsified.

**`Show Outcome`** — Form node, operation **Completion**. This is the page the applicant sees in the browser the moment they press Submit: the decision as a title, the agent's reason as the message, and the application reference. Attribution off.

---

### Task 8 — Publish the form and generate a QR code (5 min)

The form is only useful if a customer can reach it.

1. **Activate** the workflow with the toggle at the top right. The Form Trigger's **Production URL** only responds while the workflow is active — the **Test URL** works only while *Listen for test event* is armed, and only for one submission.
2. Open the `On form submission` node and copy the **Production URL**. It looks like
   `https://n8n.tertiarytraining.com/form/<webhook-id>`.
3. Open the **Smart QR Code Generator**: **https://alfredang.github.io/qrcodegenerator/**
   (source: [github.com/alfredang/qrcodegenerator](https://github.com/alfredang/qrcodegenerator) — everything runs in your browser, nothing is uploaded).
4. Choose the **URL** type and paste the production URL.
5. Set the foreground to the bank's navy (`#0B2A4A`), upload a logo if you have one, and **Download PNG**.
6. Scan it with your phone. The application form should open. Submit an application from the phone and watch the execution appear in n8n.

That QR code is what goes on the branch tent-card or the poster. It is also the quickest way to prove to a room that the thing is genuinely live, and not a mock-up.

> Common mistake: generating the QR code from the **Test URL**. It scans fine, works once for you, and then fails for everyone else in the room. If your QR code stops working after one scan, this is why.

---

## Test it

Run each row of [`test-applications.csv`](test-applications.csv) through the form URL. Replace `<your-email>` with your own address first.

| # | Case | Expect | What it proves |
|---|---|---|---|
| TC1 | New applicant, Savings, deposit 1,000 | `APPROVED` | Happy path: lookup → create → email |
| TC2 | `S8412345D` (Tan Wei Ming, seeded) | `DUPLICATE` | RC1 — and **no new row** in `Customers` |
| TC3 | Fixed Deposit, income 12,000 | `REJECTED` | RC5 — income rule |
| TC4 | Current account, Unemployed | `REJECTED` | RC5 — employment rule |
| TC5 | `  daniel wong  ` / ` s9012345j ` | `APPROVED` | RC2 — normalisation before lookup |
| TC6 | PEP = Yes | `REVIEW` | KYC screening; flag `PEP` |
| TC7 | Date of birth 2010 | `REJECTED` | Age computed in the Set node, not by the model |
| TC8 | Savings, deposit 100 | `REJECTED` | Minimum-deposit rule |
| TC9 | Foreign tax resident = Yes | `REVIEW` | Flag `CRS_FATCA` |
| TC10 | Under 18 **and** a PEP | `REJECTED` | Rule **order** — age fires before KYC, so the flag is `MINOR`, not `PEP` |

Only an `APPROVED` decision creates a customer, and TC1 and TC5 are the only approvals. So after all ten runs, **`Customers` must have gained exactly 2 rows** and **`Onboarding_Log` exactly 10**.

> If `Customers` gained 3 or more, the agent either created a record before its duplicate check returned, or created one for an applicant it sent to `REVIEW`. Go back and read STEP 1 and STEP 3 of the system message.

Open the agent node's execution log and read the tool calls in order. That sequence — `check_duplicate_customer` → *decision* → `create_customer_record` → `send_confirmation_email` — **is** the agentic loop from slide 15. You have just watched a model reason, act, observe, and act again.

---

## Debrief (10 min)

Return to your Step 2 worksheet. For each root cause, name the node that kills it:

| Root cause | Node |
|---|---|
| RC1 — no duplicate validation | `check_duplicate_customer` + `Normalise Application` |
| RC2 — manual data-entry errors | `Normalise Application` + the form's typed fields |
| RC3 — no system integration | `On form submission` → Sheets → Gmail, one workflow |
| RC4 — delayed communication | `send_confirmation_email` |
| RC5 — inconsistent rule and KYC application | The agent's system message, at temperature 0 |

Then argue about these:

1. **Where is the human?** This workflow approves bank accounts unsupervised. The `REVIEW` decision is the one place it hands back to a person. Is that the right place? Which of the other decisions would you *actually* let an agent make alone in a real bank? (LU2 Activity 8 builds the approval step.)
2. **What if Gemini hallucinates an NRIC?** Trace it. Which node stops it reaching the `Customers` sheet? Now imagine `create_customer_record` had used `$fromAI` for every column, as a naive build would. What breaks?
3. **The `Onboarding_Log` says `emailSent: true`.** Does it? Who told the log that — and is the agent's claim the same thing as Gmail having accepted the message? How would you log what *actually* happened?
4. **Rule order is policy.** TC10 is rejected as a minor, so the `PEP` flag is never raised and compliance never sees the name. Is that the right order? What would change if Step 3 ran before Step 2?
5. **Slide 16, Risk Considerations.** Name one risk in this workflow from each of: data privacy, auditability, and model non-determinism.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `The resource you are requesting could not be found` | The Sheets nodes still hold `REPLACE_WITH_YOUR_SHEET_ID`. Re-select your document in all three. |
| Agent loops, calling `check_duplicate_customer` repeatedly | The tool description does not say what an *empty* result means. Say it explicitly. |
| Duplicate applicants get approved | `Normalise Application` is not upper-casing the NRIC, or the tool reads `$json.nric` instead of `$fromAI('nric', …)`. |
| Everyone under 40 is rejected as a minor | The `age` expression. `DateTime.fromISO()` needs `yyyy-MM-dd`; check what the date field actually returns. |
| `Log Decision` writes empty cells | *Require Specific Output Format* is off, so the agent's answer is at `$json.output` as a string, not an object. |
| Two emails per application | The agent called `send_confirmation_email` in both the rejection branch and a closing summary. Tighten the "exactly one email" constraint. |
| Different decision on identical input | Temperature is not 0. |
| QR code works once, then stops | It encodes the Test URL. Regenerate from the Production URL with the workflow active. |

---

## Files

| File | Purpose |
|---|---|
| `LU1-Activity1-Retail-Banking-Onboarding.json` | The complete workflow — import into n8n |
| `customers.csv` | Seed data for the `Customers` tab (5 existing customers) |
| `onboarding-log.csv` | Headers for the `Onboarding_Log` tab |
| `test-applications.csv` | The ten test cases |
