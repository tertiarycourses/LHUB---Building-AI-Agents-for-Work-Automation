/* ============================================================================
   Investment Advisor — website chatbot
   LU2 Activity 2

   There is no enquiry form. The chat widget is the only way in, and it posts to
   one n8n webhook: the Investment Advisor AI agent.

   The webhook URL is entered in the "Lab configuration" panel on the page, so
   you never edit this file. It is remembered in localStorage.

     • Production URL — from the Chat Webhook node. Works while the workflow is Active.
     • Test URL       — works while "Listen for test event" is armed. ONE message only.
   ========================================================================== */
const STORAGE_KEY = "advisor.webhookUrl";
const DEFAULT_WEBHOOK_URL = "https://n8n.tertiarytraining.com/webhook/investment-advisor-chat";

const chatToggle = document.querySelector("#chatToggle");
const chatWindow = document.querySelector("#chatWindow");
const chatClose = document.querySelector("#chatClose");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatHistory = document.querySelector("#chatHistory");
const chatSuggestions = document.querySelector("#chatSuggestions");
const webhookInput = document.querySelector("#webhookUrl");
const webhookStatus = document.querySelector("#webhookStatus");

/* One session id per visit, so the agent's memory never blends two visitors. */
const sessionId =
  sessionStorage.getItem("advisor.sessionId") ||
  (() => {
    const id = "web-" + Math.random().toString(36).slice(2);
    sessionStorage.setItem("advisor.sessionId", id);
    return id;
  })();

const chatContact = { name: "", phone: "", email: "" };
let chatStep = "name";

/* -------------------------------------------------------- webhook URL config */
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
    webhookStatus.textContent = "No webhook URL set — the chatbot cannot answer.";
    webhookStatus.className = "config-status is-warn";
  } else if (url.includes("/webhook-test/")) {
    webhookStatus.textContent =
      "Test URL detected. Arm “Listen for test event” before each message — it accepts one only.";
    webhookStatus.className = "config-status is-warn";
  } else if (url.includes("/webhook/")) {
    webhookStatus.textContent = "Production URL detected. The workflow must be Active.";
    webhookStatus.className = "config-status is-ok";
  } else {
    webhookStatus.textContent = "This does not look like a webhook URL.";
    webhookStatus.className = "config-status is-warn";
  }
}

/* ------------------------------------------------------------- chat plumbing */
function openChat() {
  chatWindow.hidden = false;
  chatToggle.hidden = true;
  chatToggle.setAttribute("aria-expanded", "true");
  window.setTimeout(() => chatInput.focus(), 80);
}

function closeChat() {
  chatWindow.hidden = true;
  chatToggle.hidden = false;
  chatToggle.setAttribute("aria-expanded", "false");
}

function appendMessage(text, sender, extraClass) {
  const message = document.createElement("div");
  message.className = ["chat-message", sender, extraClass].filter(Boolean).join(" ");
  message.textContent = text;
  chatHistory.appendChild(message);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return message;
}

function updateChatPrompt() {
  const prompts = {
    name: "Enter your full name...",
    phone: "Enter your phone number...",
    email: "Enter your email address...",
    question: "Type your investment question...",
  };
  chatInput.placeholder = prompts[chatStep];
  chatInput.type = chatStep === "email" ? "email" : chatStep === "phone" ? "tel" : "text";
  chatInput.autocomplete = chatStep === "email" ? "email" : chatStep === "phone" ? "tel" : "off";

  // The suggested questions only make sense once contact details are collected.
  chatSuggestions.hidden = chatStep !== "question";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function readWebhookReply(response) {
  const fallback = "Thank you. A licensed advisor will get back to you shortly.";
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return data.reply || data.message || fallback;
  }

  const text = (await response.text()).trim();
  if (!text) return fallback;

  try {
    const data = JSON.parse(text);
    return data.reply || data.message || fallback;
  } catch {
    return text;
  }
}

chatToggle.addEventListener("click", openChat);
chatClose.addEventListener("click", closeChat);

/* Suggested FAQ queries — click one to ask it. */
chatSuggestions.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip || chatStep !== "question") return;
  chatInput.value = chip.textContent.trim();
  chatForm.requestSubmit();
});

/* -------------------------------------------------------------------- submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  chatInput.value = "";

  // The agent enforces this too. Collecting the details in the widget first
  // just saves a round trip to the model.
  if (chatStep === "name") {
    chatContact.name = message;
    chatStep = "phone";
    appendMessage("Thank you. What phone number can our advisor use to reach you?", "bot");
    updateChatPrompt();
    chatInput.focus();
    return;
  }

  if (chatStep === "phone") {
    chatContact.phone = message;
    chatStep = "email";
    appendMessage("Thanks. Please share your email address as well.", "bot");
    updateChatPrompt();
    chatInput.focus();
    return;
  }

  if (chatStep === "email") {
    if (!isValidEmail(message)) {
      appendMessage("Please enter a valid email address so our advisor can follow up.", "bot");
      chatInput.focus();
      return;
    }
    chatContact.email = message;
    chatStep = "question";
    appendMessage(
      "Thank you. I have your contact details. What investment planning question can I help with?",
      "bot"
    );
    updateChatPrompt();
    chatInput.focus();
    return;
  }

  const endpoint = getWebhookUrl();
  if (!endpoint) {
    webhookInput.classList.add("invalid");
    appendMessage(
      "No webhook URL is configured. Set it in the Lab configuration panel on this page.",
      "bot",
      "error"
    );
    return;
  }

  chatInput.disabled = true;
  const sendButton = chatForm.querySelector("button");
  sendButton.disabled = true;
  const loadingMessage = appendMessage("Thinking...", "bot", "loading");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        message,
        name: chatContact.name,
        phone: chatContact.phone,
        email: chatContact.email,
        sessionId,
        source: "investment-advisor-website",
      }),
    });

    if (!response.ok) throw new Error(`The advisor service returned ${response.status}.`);

    const reply = await readWebhookReply(response);
    loadingMessage.remove();
    appendMessage(reply, "bot");
  } catch (error) {
    loadingMessage.remove();
    appendMessage(
      `We could not reach the advisor assistant. ${error.message} ` +
        "(Trainer: check the Webhook URL in the Lab configuration panel, and that the workflow is active.)",
      "bot",
      "error"
    );
  } finally {
    chatInput.disabled = false;
    sendButton.disabled = false;
    chatInput.focus();
  }
});

updateChatPrompt();
