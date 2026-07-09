# Hands-on Lab (LU1) — Activity 1b
## Marina Trust Bank onboarding website → n8n Webhook → AI Agent

**Learning Unit:** LU1 — Overview of AI Agents and Agentic AI Workflows
**Duration:** 45 minutes
**Prerequisite:** [Activity 1a](../lu1-activity1-retail-banking-onboarding/) — same agent, same rules, same Google Sheet.

In Activity 1a the applicant filled in a form that n8n generated. That is fine for an internal tool, but no bank puts an n8n form in front of its customers. In **Activity 1b you replace the n8n Form Trigger with a Webhook**, and put a real bank website in front of it.

Nothing about the agent changes. The AI Agent, its three tools, its system message, its model and its temperature are byte-for-byte identical to Activity 1a. **Only the way the request arrives, and the way the answer is returned, are different.**

> That is the point of the activity. An agent is not a chat window. It is a decision engine you can put behind any front door you like.

---

## What changes

| | Activity 1a | Activity 1b |
|---|---|---|
| Front door | n8n **Form Trigger** | Your own **HTML page** |
| Entry node | `On form submission` | `Onboarding Webhook` (POST) |
| Data arrives as | `$json['Full Name']` | `$json.body.fullName` |
| Answer returned by | `Show Outcome` (Form completion page) | `Respond to Website` (JSON) |
| Who renders the result | n8n | Your JavaScript |

Everything between those two ends — Normalise → Agent → tools → Log — is unchanged.

```
  ┌────────────────┐   HTTP POST (JSON)   ┌──────────────────┐
  │  index.html    │ ───────────────────▶ │ Onboarding       │
  │  (your browser)│                      │ Webhook          │
  │                │ ◀─────────────────── │                  │
  └────────────────┘   {decision, reason} └────────┬─────────┘
                                                   ▼
                             Normalise ▶ AI Agent ▶ Log Decision ▶ Respond to Website
                                            │
                              (same three tools as Activity 1a)
```

---

## What a Webhook is

A **webhook** is simply a URL that a program can send data to. Where a Form Trigger says "n8n, draw me a form and wait for someone to fill it in", a Webhook node says "n8n, give me a URL, and start this workflow whenever anything POSTs to it."

That "anything" is the useful part. It can be your website, a mobile app, a payment provider telling you a card was charged, or another n8n workflow. The workflow does not know or care which — it just receives a JSON body.

n8n gives every Webhook node **two** URLs, and confusing them is the single most common failure in this activity:

| URL | When it works | How many requests |
|---|---|---|
| **Test URL** (`/webhook-test/…`) | Only while you have clicked **Listen for test event** | Exactly one, then it stops listening |
| **Production URL** (`/webhook/…`) | Only while the workflow is **Active** | Unlimited |

Use the Test URL while you are building — it shows you the incoming data live in the canvas. Switch to the Production URL the moment you want the website to work for anyone but you.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | The Marina Trust Bank page: hero, process explainer, criteria table, application form, result panel |
| `style.css` | White-theme bank styling |
| `script.js` | Validation, the POST to your webhook, and rendering the agent's decision |
| `LU1-Activity1b-Onboarding-Webhook.json` | The n8n workflow |

The page reuses the **same Google Sheet** as Activity 1a. Set that up first if you have not.

---

## Task 1 — Import and configure the workflow

1. **Workflows → Import from File →** [`LU1-Activity1b-Onboarding-Webhook.json`](LU1-Activity1b-Onboarding-Webhook.json)
   A pre-built copy sits on the class instance: **[LU1 Activity 1b — Marina Trust Bank Onboarding](https://n8n.tertiarytraining.com/workflow/KHeKbjH0wpNpLA5Z)**.
2. Open `check_duplicate_customer`, `create_customer_record` and `Log Decision`, and re-select **your** `Retail Banking Onboarding` spreadsheet in each *Document* dropdown.
3. Confirm the credentials on the Gemini, Sheets and Gmail nodes.
4. Open the `Onboarding Webhook` node. Note three settings:
   - **HTTP Method** `POST`
   - **Path** `marina-trust-onboarding`
   - **Respond** `Using 'Respond to Webhook' Node` — this is what lets the workflow send the agent's decision back to the browser instead of an immediate `200 OK`.
   - **Options → Allowed Origins (CORS)** is `*`. Without this your browser refuses to read the response. Ask yourself what you would set it to in production.

---

## Task 2 — Open the website

Open `index.html` in your browser — double-click it, or serve the folder:

```bash
cd labs/lu1-activity1b-onboarding-website
python3 -m http.server 8000
# then open http://localhost:8000
```

You should see a white, professional bank page: the four-step application process, the account criteria table, and the application form.

---

## Task 3 — Point the website at your webhook

At the top of the application section there is a **Lab configuration** panel with an **n8n Webhook URL** field.

1. In n8n, open the `Onboarding Webhook` node and copy the **Test URL**.
2. Paste it into the field. The panel tells you which kind of URL it detected. The value is saved in your browser, so you only do this once.
3. In n8n, click **Listen for test event**.
4. On the website, pick **TC1 · Happy path** from the *Trainer demo data* dropdown, type **your own email address**, and submit.

You will see the request land in the n8n canvas. Follow it through the Set node into the agent, and watch the agent call `check_duplicate_customer`.

⚠️ The email is real. Always put your own address in the Email field.

Once it works, **Activate** the workflow, copy the **Production URL**, and paste that into the panel instead. Now the page works from any device — including a phone.

---

## Task 4 — Publish it with a QR code

1. With the workflow **Active**, copy the Webhook **Production URL** — or, if you have hosted `index.html` somewhere (GitHub Pages works well), copy the page URL instead. The page URL is the better choice: it is what a customer should scan.
2. Open the **Smart QR Code Generator**: **https://alfredang.github.io/qrcodegenerator/**
   (source: [github.com/alfredang/qrcodegenerator](https://github.com/alfredang/qrcodegenerator) — 100% client-side, nothing is uploaded).
3. Select the **URL** type, paste the URL, set the foreground to the bank navy `#0B2A4A`, add a logo if you have one, and **Download PNG** or **SVG**.
4. Scan it with your phone and submit an application from there.

> A QR code encoding the **Test URL** scans perfectly and works exactly once. If your QR code dies after the first person tries it, that is what happened.

---

## Task 5 — Read the decision panel

The `Respond to Website` node returns the agent's structured output as JSON:

```json
{
  "applicationId": "APP-20260710-1042",
  "decision": "REVIEW",
  "reason": "Applicant declared Politically Exposed Person status. Referred to compliance for enhanced due diligence.",
  "riskFlags": ["PEP"],
  "emailSent": true
}
```

`script.js` maps `decision` onto one of four styled cards:

| Decision | Card |
|---|---|
| `APPROVED` | Green — "Application approved" |
| `REJECTED` | Red — "Application not approved" |
| `DUPLICATE` | Amber — "You are already a customer" |
| `REVIEW` | Blue — "Referred to compliance", with the risk flags as chips |

This is why Activity 1a insisted on a **Structured Output Parser**. A paragraph of prose from the model could not have been coloured, counted, or branched on. `decision` is a field precisely so that something downstream — a sheet, a dashboard, or this web page — can act on it.

---

## Test it

Use the **Trainer demo data** dropdown. It autofills every field except the email, which it deliberately clears so you cannot send a stranger a bank decision by accident.

| # | Case | Expect |
|---|---|---|
| TC1 | New applicant, Savings | `APPROVED` (green) |
| TC2 | `S8412345D`, already seeded | `DUPLICATE` (amber) |
| TC3 | Fixed Deposit, income 12,000 | `REJECTED` (red) |
| TC4 | Current account, Unemployed | `REJECTED` (red) |
| TC5 | Messy casing and spacing | `APPROVED` (green) |
| TC6 | PEP = Yes | `REVIEW` (blue, flag `PEP`) |
| TC7 | Date of birth 2010 | `REJECTED`, flag `MINOR` |
| TC8 | Savings, deposit 100 | `REJECTED` (red) |
| TC9 | Foreign tax resident | `REVIEW` (blue, flag `CRS_FATCA`) |
| TC10 | Under 18 **and** a PEP | `REJECTED`, flag `MINOR` — age is checked first |

Compare the `Onboarding_Log` rows against Activity 1a's. Same inputs, same decisions, different front door.

---

## Debrief

1. **The webhook is open to the internet.** Anyone who learns the URL can POST to it, and every POST calls Gemini and sends an email — at your expense. Open the Webhook node and find the **Authentication** option. What would you turn on before this went anywhere near production?
2. **CORS is `*`.** Any website on the internet can POST to your bank's onboarding endpoint from a visitor's browser. What should it be instead?
3. **The browser sends `annualIncome` as a number it controls.** The bank never verifies it. Where in this workflow would income verification belong — the website, the Set node, a new tool, or the agent's rules?
4. **The website validates the form; so does the agent.** Both are needed, for different reasons. Which one protects the customer's time, and which one protects the bank?
5. **Compare 1a and 1b.** The agent did not change at all. Write down, in one sentence, what that tells you about where the "intelligence" in an agentic system actually lives.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Failed to fetch` in the browser | The workflow is not active (production URL), or *Listen for test event* is not armed (test URL). |
| `Failed to fetch`, and the n8n execution succeeded | CORS. Set **Allowed Origins** to `*` in the Webhook node's options. |
| Works once, then `404` | You are using the Test URL. It listens for one request only. |
| `Cannot read properties of undefined (reading 'trim')` | The Set node expects `$json.body.fullName`. Check the browser's Network tab: is the payload nested under `body`? |
| The result card says "Application received" with no reason | The response was not the agent's object. Check `Respond to Website` → *Response Body*. |
| Result card is blank / white | The `Decision Parser` is disconnected, so `$json.output` is a string. |
| Everyone is `REJECTED` as a minor | The `age` expression in the Set node. Check that the browser sends `dateOfBirth` as `yyyy-MM-dd`. |
