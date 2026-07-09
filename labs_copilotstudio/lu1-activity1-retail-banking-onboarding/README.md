# Hands-on Lab (LU1)
## Retail Banking Customer Onboarding Assistant — Power Automate + AI Builder

**Learning Unit:** LU1 — Overview of AI Agents and Agentic AI Workflows
**Duration:** 90 minutes (Part A discussion 35 min · Part B build 55 min)
**You will use:** Microsoft Forms · Power Automate · AI Builder · Excel Online · Outlook

**What you end up with:** a bank application form on a SharePoint page or a Teams tab. When someone submits
it, a flow cleans the data, checks whether they are already a customer, asks an AI model to apply the bank's
four rules, creates the customer record, emails the applicant, and writes an audit row — in about twenty
seconds, with no human involved.

---

## Scenario

**Marina Trust Bank** (fictitious) takes new-account applications on paper. Staff key them into a spreadsheet
by hand. Applications sit in a queue for days. The same customer sometimes ends up with two records under
slightly different spellings. Eligibility rules are printed in a binder, and different officers apply them
differently. Confirmation emails are typed one at a time, and often forgotten.

---

# Part A — Problem Solving (Steps 1–3, discussion)

### Step 1: Problem Definition — 10 min

1. What is the exact problem?  2. Who are the stakeholders?  3. What is the business impact?
4. Can it be measured?

> **Model answer.** Applications are processed manually, take 3–5 working days, and are never checked
> against existing records, so duplicate customers and typing errors reach the core banking system.
> Success is measurable: time-to-decision (target under 2 minutes), duplicate rate (target 0%),
> rule consistency (target 100%).

**Teaching point.** "Onboarding is slow" is not a problem definition — you cannot tell when it is fixed.

### Step 2: Root Cause Analysis — 10 min

| # | Root cause | Symptom |
|---|---|---|
| RC1 | No automated duplicate check | Two records for one customer |
| RC2 | Manual data-entry errors | Wrong NRIC or email; rework |
| RC3 | No integration between systems | The officer re-keys the same data three times |
| RC4 | Confirmation emails typed by hand | The applicant calls the branch |
| RC5 | Rules live in a binder | Different officers decide differently |

Keep this list. In the debrief you will name the action that kills each one.

### Step 3: Solution Ideation — groups of 3–4, 15 min

The question that matters: **which parts should the AI decide, and which should be ordinary actions?**

| Concern | Give it to | Why |
|---|---|---|
| Trim spaces, upper-case the NRIC | A **Compose** action | An AI model adds cost and delay to do a `trim()` |
| Work out the applicant's age | A **Compose** action | Date arithmetic is what language models are worst at |
| Look the NRIC up in Excel | A **List rows** action | Mechanical, and it must run every time |
| Choose APPROVED / REJECTED / DUPLICATE | The **AI Builder prompt** | It reasons over the rules and the lookup result |
| Write the email wording | The **AI Builder prompt** | Natural language and tone |
| The letterhead and no-reply footer | The **Outlook action** | Branding must never vary |
| Write the audit row | An **Excel action after the decision** | It must happen on every run, whatever the AI said |

> **Teaching point — the boundary of agency.** The AI decides *what to do*. Ordinary actions do the things
> that must always happen, the same way, every time.

---

# Part B — Build it (55 min)

```
Microsoft Form ─▶ Get response details ─▶ Normalise Application (Compose)
                                                   │
                                    Check Duplicate (Excel: List rows)
                                                   │
                                      Decide (AI Builder prompt)
                                                   │
                                            Parse JSON
                                                   │
                                  ┌────────────────┴────────────────┐
                             APPROVED?                        anything else
                                  │                                 │
                    Add row to Customers (Excel)               (skipped)
                                  └────────────────┬────────────────┘
                                                   ▼
                                Send email (Outlook)
                                                   ▼
                                Add row to Onboarding_Log (Excel)   ← runs every time
```

**Prerequisites:** a Microsoft 365 account with Power Automate and AI Builder (a trial is enough), plus
Excel Online and Outlook.

---

### Task 0 — Build the workbook (5 min)

In OneDrive, create **`Marina Trust Onboarding.xlsx`** with two sheets:

1. **`Customers`** — paste in [`customers.csv`](customers.csv), select it, press **Ctrl+T**, and in
   *Table Design* name the table **`Customers`**. It holds 5 seed customers.
2. **`Onboarding_Log`** — paste in [`onboarding-log.csv`](onboarding-log.csv) (headers only), Ctrl+T, name
   the table **`Onboarding_Log`**.

> **Power Automate can only read Excel *tables*, not loose cells.** If no tables appear in the dropdown
> later, this step is why.

---

### Task 1 — Build the form (10 min)

In **Microsoft Forms**, create **Marina Trust Bank — Account Application**. Eight questions, in this order:

| # | Question | Type |
|---|---|---|
| 1 | Full Name | Text |
| 2 | NRIC | Text |
| 3 | Date of Birth | Date |
| 4 | Email Address | Text |
| 5 | Account Type | Choice — Savings, Student Account, Current, Fixed Deposit |
| 6 | Employment Status | Choice — Employed, Self-Employed, Student, Unemployed |
| 7 | Annual Income (SGD) | Number |
| 8 | Initial Deposit (SGD) | Number |

**Put it in front of customers without writing any HTML.** In Forms → **Collect responses → Embed**, copy the
code and paste it into a **SharePoint page** (Insert → Embed), or add it as a **Teams tab**
(channel → **+** → *Forms*). That is the bank's website.

---

### Task 2 — Create the AI prompt (10 min)

Follow [`prompts/onboarding-decision-prompt.md`](prompts/onboarding-decision-prompt.md):
**Power Automate → AI hub → Prompts → New custom prompt**, name it `Marina Trust Onboarding Decision`, add
two text inputs (`Application`, `DuplicateCount`), paste the prompt, **Save**.

Read it before you use it. The four rules are **ordered, and they stop at the first one that fires**:

| Rule | Check | Outcome |
|---|---|---|
| 1 | NRIC already in `Customers` | `DUPLICATE` |
| 2 | Age under 18 | `REJECTED` |
| 3 | Account eligibility (below) | `REJECTED` |
| 4 | Deposit below the minimum | `REJECTED` |
| — | Nothing fired | `APPROVED` |

| Account Type | Eligibility | Minimum deposit |
|---|---|---|
| Savings | none | SGD 500 |
| Student Account | Employment Status is `Student` | SGD 0 |
| Current | `Employed` or `Self-Employed` | SGD 3,000 |
| Fixed Deposit | Annual Income ≥ SGD 30,000 | SGD 10,000 |

---

### Task 3 — Build the flow (25 min)

**Power Automate → Create → Automated cloud flow**, named `Marina Trust — Customer Onboarding`.
Trigger: **When a new response is submitted** (Microsoft Forms) → pick your form.

**1. Get response details** — Form Id = your form, Response Id = `Response Id` from the trigger.

**2. Normalise Application** — a **Compose** action. Paste this, replacing each `<…>` with the matching
field from *Get response details*:

```json
{
  "applicationId": "@{concat('APP-', formatDateTime(utcNow(),'yyyyMMdd'), '-', workflow()?['run']?['name'])}",
  "fullName": "@{trim(toUpper(<Full Name>))}",
  "nric":     "@{trim(toUpper(<NRIC>))}",
  "email":    "@{trim(toLower(<Email Address>))}",
  "dateOfBirth": "@{<Date of Birth>}",
  "age":      "@{div(sub(ticks(utcNow()), ticks(<Date of Birth>)), 315360000000000)}",
  "accountType": "@{<Account Type>}",
  "employmentStatus": "@{<Employment Status>}",
  "annualIncome": "@{<Annual Income>}",
  "initialDeposit": "@{<Initial Deposit>}"
}
```

Two lines here do the real work:

- **`nric`** — ` s9012345j ` and `S9012345J` are the same person, and an Excel lookup does not know that.
  Upper-casing **before** the lookup is what actually kills the duplicate problem (**RC1**, **RC2**).
  Test case TC7 fails without it.
- **`age`** — the AI is handed a whole number. It is never asked "how many years since 2010-05-14?",
  because that is exactly the sort of question a language model answers confidently and wrongly.
  (`315360000000000` is the number of ticks in 365 days.)

**3. Check Duplicate** — Excel Online (Business) → **List rows present in a table**.
Workbook `Marina Trust Onboarding.xlsx`, table `Customers`. Under **Advanced parameters → Filter Query**:

```
NRIC eq '@{outputs('Normalise_Application')['nric']}'
```

**4. Decide** — AI Builder → **Run a prompt** → `Marina Trust Onboarding Decision`.
- `Application` = the **Outputs** of *Normalise Application*
- `DuplicateCount` = `length(outputs('Check_Duplicate')?['body/value'])`

**5. Parse JSON** — Content = the prompt's **Text** output. Click **Generate from sample** and paste:

```json
{ "decision": "APPROVED", "reason": "…", "emailSubject": "…", "emailBodyHtml": "<p>…</p>" }
```

> This is the **structured-output contract**. Without it the decision is a paragraph of prose, and nothing
> downstream can branch on it, count it or file it.

**6. Condition** — `decision` **is equal to** `APPROVED`.
- **If yes** → Excel → **Add a row into a table** → `Customers`. Map every column **from *Normalise
  Application***, never from the AI's answer. `Onboarded On` = `formatDateTime(utcNow(),'yyyy-MM-dd')`.
- **If no** → leave it empty.

> Look hard at this. The AI decides **whether** a customer is created. It cannot decide **who they are**,
> because no column reads from its output. An invented NRIC has no way to reach the customer record.

**7. Send email** — Outlook → **Send an email (V2)**, placed *after* the Condition so it runs on every path.
- **To** = `email` from *Normalise Application* — not from the AI, so it cannot redirect the bank's mail
- **Subject** = `emailSubject` from *Parse JSON*
- **Body** — click `</>` to switch to **code view**, then paste:

```html
<div style="font-family:Arial;max-width:600px;border:1px solid #e2e8f0;border-radius:8px">
  <div style="background:#0b2a4a;color:#fff;padding:20px;font-size:17px;font-weight:bold">
    Marina Trust Bank
  </div>
  <div style="padding:24px;color:#1b2733;line-height:1.6">
    <p>Dear @{outputs('Normalise_Application')['fullName']},</p>
    @{body('Parse_JSON')?['emailBodyHtml']}
    <p style="margin-top:20px">Yours sincerely,<br><b>Customer Onboarding Team</b><br>Marina Trust Bank</p>
  </div>
  <div style="background:#f6f9fc;padding:16px 24px;color:#5b6b7b;font-size:11px;line-height:1.5">
    <p><b>This is an automated message. Please do not reply</b> — replies are not monitored.
       Marina Trust Bank will never ask for your PIN or password by email.</p>
    <p>Marina Trust Bank is a fictitious institution used for training. No real account is opened.</p>
  </div>
</div>
```

> The AI writes only the middle paragraph. The letterhead, the sign-off and the *"do not reply"* footer are
> typed by you and never vary. **The model is not allowed near them.**

**8. Log Decision** — Excel → **Add a row into a table** → `Onboarding_Log`.

| Column | Value |
|---|---|
| Timestamp | `utcNow()` |
| Application ID | `applicationId` from *Normalise Application* |
| NRIC | `nric` from ***Normalise Application*** |
| Account Type | from *Normalise Application* |
| Decision · Reason | from *Parse JSON* |

Then click **⋯ → Configure run after** on this action and tick **Succeeded, Failed and Skipped**, so it
still writes a row even if the email fails.

> The NRIC comes from the Compose action, not from the AI. The model cannot skip this row and cannot
> falsify it. An auditor needs a log the model could not have written.

**Save**, then submit the form.

---

## Test it

Submit each row of [`test-applications.csv`](test-applications.csv). Put **your own email address** in every
one — the flow sends real mail.

| # | Case | Expect |
|---|---|---|
| TC1 | New applicant, Savings, deposit 1,000 | `APPROVED` |
| TC2 | `S8412345D` — already in `Customers` | `DUPLICATE` |
| TC3 | Born 2010 | `REJECTED` |
| TC4 | Fixed Deposit, income 12,000 | `REJECTED` |
| TC5 | Current account, Unemployed | `REJECTED` |
| TC6 | Savings, deposit 100 | `REJECTED` |
| TC7 | `  daniel wong  ` / ` s9012345j ` | `APPROVED` |

Only `APPROVED` creates a customer, and only TC1 and TC7 are approved. So afterwards:

- `Customers` has gained **exactly 2 rows**
- `Onboarding_Log` has gained **exactly 7 rows**

If `Customers` gained more, the Condition is wrong, or it is reading `decision` from the wrong place.

Open the flow's **run history** and read the actions in order. That is the decision, made visible.

---

## Debrief (10 min)

| Root cause | The action that kills it |
|---|---|
| RC1 — no duplicate check | *Check Duplicate* + *Normalise Application* |
| RC2 — data-entry errors | *Normalise Application* + the form's typed fields |
| RC3 — no integration | Forms → Excel → Outlook, one flow |
| RC4 — delayed emails | *Send email* |
| RC5 — inconsistent rules | The AI Builder prompt, at the lowest temperature |

Then argue:

1. **Where is the human?** This flow approves bank accounts with nobody checking. Should it?
2. **What if the AI invents an NRIC?** Trace it. Which action stops it reaching `Customers`? Now imagine
   *Add a row* had mapped its columns from the AI's JSON instead. What breaks?
3. **The log records the decision.** Could the AI have written a different NRIC into that log? Why not?
4. **Rule order is policy.** Swap Rule 2 and Rule 3, and TC3 becomes a different rejection with a different
   reason. Who decides the order — the developer, or the bank?
5. **The duplicate lookup runs every time**, whether the AI wants it or not. What do you gain by that,
   and what do you give up?

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| No tables in the Excel dropdown | The sheet is not formatted as a **table**. Select the data → Ctrl+T. |
| *Parse JSON* fails with "invalid type" | The model wrapped its answer in ```` ```json ```` fences. Add "Return only JSON, no markdown fences" to the prompt. |
| Duplicate applicants get approved | The NRIC is not trimmed and upper-cased **before** the Filter Query. |
| Everyone is rejected as under 18 | The `age` expression. Check *Date of Birth* is a **Date** question, not Text. |
| Filter Query never matches | Quotes. It must read `NRIC eq 'S1234567A'` — single quotes around the value. |
| The email shows raw `<p>` tags | The Outlook body is in plain-text mode. Click `</>` for code view. |
| `Log Decision` is skipped when the email fails | *Configure run after* on that action — tick **Failed** and **Skipped**. |
| The same application gives different answers | Temperature is not at its minimum. |

---

## Files

| File | Purpose |
|---|---|
| `prompts/onboarding-decision-prompt.md` | The AI Builder prompt — the bank's rules, in English |
| `customers.csv` | Seed data for the `Customers` table (5 existing customers) |
| `onboarding-log.csv` | Headers for the `Onboarding_Log` table |
| `test-applications.csv` | The seven test cases |
