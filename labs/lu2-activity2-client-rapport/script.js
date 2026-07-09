/* ============================================================================
   Meridian Asset Management — client relationship chat widget
   LU2 Activity 2

   The widget POSTs the client's concern to an n8n Webhook. The workflow runs an
   AI Agent that classifies the concern, reads the emotional tone, raises
   compliance flags, and DRAFTS a reply.

   The draft is never returned to this page. What comes back is an
   acknowledgement plus the agent's assessment — because the reply itself must be
   approved by a licensed human before the client is allowed to see it. That is
   the whole point of the activity.
   ========================================================================== */
const DEFAULT_WEBHOOK_URL = "https://n8n.tertiarytraining.com/webhook/meridian-client-query";
const STORAGE_KEY = "meridian.webhookUrl";

/* Trainer demo queries — one per compliance flag path. */
const DEMO_CASES = {
  tc1: {
    clientName: "Jonathan Sim", accountRef: "MAM-88213", portfolio: "Balanced",
    message: "I noticed my portfolio dipped about 6% over the last few weeks. I understand markets move, " +
      "but could someone explain what drove it? No rush."
  },
  tc2: {
    clientName: "Rachel Ong", accountRef: "MAM-77401", portfolio: "Global Growth",
    message: "My portfolio is down 14% this quarter and I do not understand why. Should I move everything " +
      "to cash, or is it better to hold? Please tell me what to do."
  },
  tc3: {
    clientName: "Kenneth Yeo", accountRef: "MAM-65022", portfolio: "Income",
    message: "Can you guarantee that I will get my capital back by the end of next year? I just need someone " +
      "to promise me I will not lose money on this."
  },
  tc4: {
    clientName: "Amirah Ismail", accountRef: "MAM-90118", portfolio: "Asia Opportunities",
    message: "I have just seen the management fee on my statement and I am furious. Nobody explained this to " +
      "me when I signed up. This is completely unacceptable and your team has been evasive."
  },
  tc5: {
    clientName: "David Chua", accountRef: "MAM-51937", portfolio: "Sustainable Futures",
    message: "I have had enough of the volatility. Please start the process to redeem my entire holding and " +
      "close my account. I want to move to another manager."
  },
  tc6: {
    clientName: "Margaret Tan", accountRef: "MAM-40876", portfolio: "Capital Preservation",
    message: "This is my retirement savings and I am 68. I have not been sleeping since the statement arrived. " +
      "I cannot afford to lose this money. I do not know what to do and I feel very alone with it."
  },
  tc7: {
    clientName: "Victor Lim", accountRef: "MAM-33254", portfolio: "Global Growth",
    message: "The NAV reported on my statement does not match what your factsheet says. I have spoken to my " +
      "lawyer and I am prepared to raise this with MAS if I do not get a straight answer this week."
  },
  tc8: {
    clientName: "Priya Raman", accountRef: "MAM-72609", portfolio: "Income",
    message: "Could you help me understand how the NAV on my quarterly statement is calculated, and why it is " +
      "dated the 30th rather than the 31st? Purely a reporting question."
  }
};

const launcher = document.getElementById("chatLauncher");
const panel = document.getElementById("chatPanel");
const badge = document.getElementById("chatBadge");
const log = document.getElementById("chatLog");
const form = document.getElementById("chatForm");
const sendBtn = document.getElementById("chatSend");
const spinner = sendBtn.querySelector(".spinner");
const sendIcon = sendBtn.querySelector("svg");
const webhookInput = document.getElementById("webhookUrl");
const webhookStatus = document.getElementById("webhookStatus");

/* ------------------------------------------------------- webhook URL config */
webhookInput.value = localStorage.getItem(STORAGE_KEY) || DEFAULT_WEBHOOK_URL;
renderWebhookStatus();

webhookInput.addEventListener("input", () => {
  const url = webhookInput.value.trim();
  if (url) localStorage.setItem(STORAGE_KEY, url);
  else localStorage.removeItem(STORAGE_KEY);
  renderWebhookStatus();
});

function getWebhookUrl() {
  return webhookInput.value.trim();
}

function renderWebhookStatus() {
  const url = getWebhookUrl();
  webhookInput.classList.remove("invalid");

  if (!url) {
    webhookStatus.textContent = "No webhook URL set — the chat cannot send.";
    webhookStatus.className = "config-status is-warn";
  } else if (url.includes("/webhook-test/")) {
    webhookStatus.textContent = "Test URL detected. Arm “Listen for test event” in n8n before each message.";
    webhookStatus.className = "config-status is-warn";
  } else if (url.includes("/webhook/")) {
    webhookStatus.textContent = "Production URL detected. The workflow must be Active in n8n.";
    webhookStatus.className = "config-status is-ok";
  } else {
    webhookStatus.textContent = "This does not look like an n8n webhook URL.";
    webhookStatus.className = "config-status is-warn";
  }
}

/* ----------------------------------------------------------- open and close */
function openChat() {
  panel.hidden = false;
  launcher.classList.add("is-open");
  launcher.setAttribute("aria-expanded", "true");
  badge.hidden = true;
  document.getElementById("message").focus();
}

function closeChat() {
  panel.hidden = true;
  launcher.classList.remove("is-open");
  launcher.setAttribute("aria-expanded", "false");
}

launcher.addEventListener("click", () => (panel.hidden ? openChat() : closeChat()));
document.getElementById("chatMin").addEventListener("click", closeChat);
document.getElementById("heroChatBtn").addEventListener("click", openChat);
document.getElementById("navChatBtn").addEventListener("click", openChat);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) closeChat(); });

/* Nudge the visitor once, the way a real support widget does. */
setTimeout(() => { if (panel.hidden) badge.hidden = false; }, 6000);

/* -------------------------------------------------------------- demo filler */
document.getElementById("demoCase").addEventListener("change", (e) => {
  const demo = DEMO_CASES[e.target.value];
  if (!demo) return;

  Object.entries(demo).forEach(([name, value]) => {
    const field = form.elements[name];
    if (field) field.value = value;
  });

  // Never autofill an email — an approved reply is a real message to a real inbox.
  form.elements.clientEmail.value = "";
  openChat();
  form.elements.clientEmail.focus();
});

/* ------------------------------------------------------------------ helpers */
function bubble(html, cls) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.innerHTML = html;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

function typing() {
  const div = document.createElement("div");
  div.className = "msg msg-bot typing";
  div.innerHTML = "<span></span><span></span><span></span>";
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function validate() {
  form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  const missing = [];

  for (const el of form.elements) {
    if (!el.name || !el.required) continue;
    const empty = !String(el.value).trim();
    if (empty || (el.type === "email" && !el.checkValidity())) {
      el.classList.add("invalid");
      missing.push(el);
    }
  }
  if (missing.length) missing[0].focus();
  return missing.length === 0;
}

function setLoading(on) {
  sendBtn.disabled = on;
  spinner.hidden = !on;
  sendIcon.style.opacity = on ? "0" : "1";
}

/* ------------------------------------------------------------------- submit */
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validate()) return;

  const endpoint = getWebhookUrl();
  if (!endpoint) {
    bubble("No webhook URL is configured. Set it in the <strong>Lab configuration</strong> panel on this page.", "msg-error");
    webhookInput.classList.add("invalid");
    return;
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.channel = "Website chat";

  bubble(`<p>${escapeHtml(payload.message)}</p>`, "msg-user");
  form.elements.message.value = "";

  const dots = typing();
  setLoading(true);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`The client care service returned HTTP ${response.status}.`);

    let data = await response.json();
    if (typeof data === "string") data = JSON.parse(data);
    if (Array.isArray(data)) data = data[0];

    dots.remove();
    showReceipt(data);
  } catch (err) {
    dots.remove();
    bubble(
      `<p>We could not send your message. ${escapeHtml(err.message)}</p>` +
      `<p><em>Trainer: check the Webhook URL in the Lab configuration panel, and that the n8n workflow is active.</em></p>`,
      "msg-error"
    );
  } finally {
    setLoading(false);
  }
});

/* --------------------------------------------------------- the acknowledgement
   Note what is NOT here: the drafted reply. It exists, but it is sitting in a
   relationship manager's inbox awaiting approval. The client sees a receipt.

   Note also what the workflow deliberately does not send back — the emotional
   tone it read, and the compliance flags it raised. Those are internal
   assessments. Returning "we have classified you as Angry, flagged you as a
   COMPLAINT" would be both a poor experience and a disclosure a compliance
   officer would not sign off on. The response contract is: status, ticketId,
   urgency, escalated, message. Nothing more. */
function showReceipt(data) {
  const escalated = Boolean(data?.escalated);

  const message = data?.message ||
    "Thank you. Your message has reached the Meridian client relationship team.";

  const escalationLine = escalated
    ? `<p><strong>Because of what you have told us, a relationship manager will call you rather than reply by email alone.</strong></p>`
    : "";

  bubble(
    `<p class="receipt-title">Message received</p>
     <p>${escapeHtml(message)}</p>
     ${escalationLine}
     <dl class="receipt-meta">
       <dt>Reference</dt><dd>${escapeHtml(data?.ticketId || "—")}</dd>
       <dt>Priority</dt><dd>${escapeHtml(data?.urgency || "—")}</dd>
     </dl>`,
    `msg-receipt${escalated ? " is-escalated" : ""}`
  );

  bubble(
    `<p>A licensed relationship manager is reviewing the reply now. You will hear from us by email.</p>
     <p><em>We do not send investment advice through this chat.</em></p>`,
    "msg-bot"
  );

  form.classList.add("is-done");
  const again = document.createElement("button");
  again.type = "button";
  again.className = "btn btn-primary btn-block";
  again.textContent = "Send another message";
  again.style.margin = "0 16px 16px";
  again.addEventListener("click", () => {
    again.remove();
    form.classList.remove("is-done");
    form.reset();
    document.getElementById("demoCase").value = "";
    form.elements.message.focus();
  });
  panel.appendChild(again);
}
