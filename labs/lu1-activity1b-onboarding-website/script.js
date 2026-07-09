/* ============================================================================
   Marina Trust Bank — customer onboarding front-end
   LU1 Activity 1b

   The n8n webhook URL is entered in the "Lab configuration" panel on the page,
   so you never have to edit this file. It is saved to localStorage.

     • Production URL — shown in the Webhook node. Works only when the workflow is Active.
     • Test URL       — shown while "Listen for test event" is armed. Accepts ONE request.

   DEFAULT_WEBHOOK_URL just pre-fills the box; the panel always wins.
   ========================================================================== */
const DEFAULT_WEBHOOK_URL = "https://n8n.tertiarytraining.com/webhook/marina-trust-onboarding";
const STORAGE_KEY = "mtb.webhookUrl";

/* Copy the decisions the agent can return, so the page can style each one. */
const DECISIONS = {
  APPROVED: {
    cls: "is-approved",
    icon: "✓",
    title: "Application approved",
    fallback: "Your account has been opened. A confirmation email is on its way."
  },
  REJECTED: {
    cls: "is-rejected",
    icon: "✕",
    title: "Application not approved",
    fallback: "Unfortunately you do not meet the criteria for the account you selected."
  },
  DUPLICATE: {
    cls: "is-duplicate",
    icon: "!",
    title: "You are already a customer",
    fallback: "An account already exists under this NRIC. Please visit a branch to add a new account."
  },
  REVIEW: {
    cls: "is-review",
    icon: "⏳",
    title: "Referred to compliance",
    fallback: "Your application requires enhanced due diligence. An officer will contact you within 5 working days."
  }
};

/* Trainer demo data — one row per test case in the lab guide. */
const DEMO_CASES = {
  tc1: {
    fullName: "Marcus Ng Jun Hao", nric: "S9512345F", dateOfBirth: "1995-03-18",
    nationality: "Singaporean", residencyStatus: "Singapore Citizen",
    mobile: "+65 9111 2222", address: "12 Bras Basah Road, #05-01", postalCode: "189556",
    accountType: "Savings", employmentStatus: "Employed", occupation: "Information Technology",
    employer: "Acme Systems Pte Ltd", annualIncome: 58000, initialDeposit: 1000,
    sourceOfFunds: "Salary / Employment Income", purposeOfAccount: "Daily Banking",
    pep: "No", foreignTaxResident: "No"
  },
  tc2: {
    fullName: "Tan Wei Ming", nric: "S8412345D", dateOfBirth: "1984-07-02",
    nationality: "Singaporean", residencyStatus: "Singapore Citizen",
    mobile: "+65 9123 4567", address: "80 Jurong East Street 21, #02-03", postalCode: "609607",
    accountType: "Current", employmentStatus: "Employed", occupation: "Banking & Insurance",
    employer: "Harbourfront Capital", annualIncome: 72000, initialDeposit: 5000,
    sourceOfFunds: "Salary / Employment Income", purposeOfAccount: "Salary Crediting",
    pep: "No", foreignTaxResident: "No"
  },
  tc3: {
    fullName: "Priya Devi", nric: "S9823456G", dateOfBirth: "1998-11-09",
    nationality: "Indian", residencyStatus: "Employment Pass",
    mobile: "+65 9333 4444", address: "11 Eunos Road 8, #05-01", postalCode: "408601",
    accountType: "Fixed Deposit", employmentStatus: "Student", occupation: "Student",
    employer: "", annualIncome: 12000, initialDeposit: 10000,
    sourceOfFunds: "Personal Savings", purposeOfAccount: "Savings & Investments",
    pep: "No", foreignTaxResident: "No"
  },
  tc4: {
    fullName: "Alvin Chua Kok Wei", nric: "S8734567H", dateOfBirth: "1987-01-25",
    nationality: "Singaporean", residencyStatus: "Singapore Citizen",
    mobile: "+65 9555 6666", address: "4 Tampines Central 5, #04-12", postalCode: "529510",
    accountType: "Current", employmentStatus: "Unemployed", occupation: "Not Applicable",
    employer: "", annualIncome: 0, initialDeposit: 3000,
    sourceOfFunds: "Personal Savings", purposeOfAccount: "Daily Banking",
    pep: "No", foreignTaxResident: "No"
  },
  tc5: {
    fullName: "  daniel wong  ", nric: " s9012345j ", dateOfBirth: "1990-06-30",
    nationality: "Singaporean", residencyStatus: "Singapore Citizen",
    mobile: "+65 9777 8888", address: "73 Bras Basah Road, #02-01", postalCode: "189556",
    accountType: "Savings", employmentStatus: "Employed", occupation: "Education",
    employer: "Riverside Secondary", annualIncome: 45000, initialDeposit: 500,
    sourceOfFunds: "Salary / Employment Income", purposeOfAccount: "Daily Banking",
    pep: "No", foreignTaxResident: "No"
  },
  tc6: {
    fullName: "Datuk Rahmat Bin Osman", nric: "S7645678K", dateOfBirth: "1976-02-14",
    nationality: "Malaysian", residencyStatus: "Permanent Resident",
    mobile: "+65 9222 3333", address: "1 Raffles Place, #40-01", postalCode: "048616",
    accountType: "Savings", employmentStatus: "Employed", occupation: "Government & Public Service",
    employer: "Ministry of Trade", annualIncome: 210000, initialDeposit: 20000,
    sourceOfFunds: "Salary / Employment Income", purposeOfAccount: "Savings & Investments",
    pep: "Yes", foreignTaxResident: "No"
  },
  tc7: {
    fullName: "Chloe Lim Xin Yi", nric: "T1045678M", dateOfBirth: "2010-05-14",
    nationality: "Singaporean", residencyStatus: "Singapore Citizen",
    mobile: "+65 9444 5555", address: "50 Ang Mo Kio Avenue 3, #11-08", postalCode: "569933",
    accountType: "Savings", employmentStatus: "Student", occupation: "Student",
    employer: "", annualIncome: 0, initialDeposit: 500,
    sourceOfFunds: "Personal Savings", purposeOfAccount: "Education Expenses",
    pep: "No", foreignTaxResident: "No"
  },
  tc8: {
    fullName: "Siti Nurhaliza Binte Karim", nric: "S9356789P", dateOfBirth: "1993-09-21",
    nationality: "Singaporean", residencyStatus: "Singapore Citizen",
    mobile: "+65 9666 7777", address: "21 Serangoon Central, #08-14", postalCode: "556082",
    accountType: "Savings", employmentStatus: "Employed", occupation: "Healthcare",
    employer: "Kandang Kerbau Hospital", annualIncome: 54000, initialDeposit: 100,
    sourceOfFunds: "Salary / Employment Income", purposeOfAccount: "Daily Banking",
    pep: "No", foreignTaxResident: "No"
  },
  tc9: {
    fullName: "James Whitfield", nric: "G7812345N", dateOfBirth: "1982-12-03",
    nationality: "British", residencyStatus: "Employment Pass",
    mobile: "+65 9888 9999", address: "9 Battery Road, #15-02", postalCode: "049910",
    accountType: "Multi-Currency", employmentStatus: "Employed", occupation: "Banking & Insurance",
    employer: "Thames Asset Management", annualIncome: 180000, initialDeposit: 25000,
    sourceOfFunds: "Salary / Employment Income", purposeOfAccount: "Savings & Investments",
    pep: "No", foreignTaxResident: "Yes"
  },
  // Age is checked before KYC, so this applicant is REJECTED as a minor — the PEP flag never fires.
  tc10: {
    fullName: "Ethan Tan Jia Hao", nric: "T1123456Q", dateOfBirth: "2011-08-19",
    nationality: "Singaporean", residencyStatus: "Singapore Citizen",
    mobile: "+65 9000 1111", address: "30 Sengkang East Way, #07-19", postalCode: "544818",
    accountType: "Savings", employmentStatus: "Student", occupation: "Student",
    employer: "", annualIncome: 0, initialDeposit: 500,
    sourceOfFunds: "Gift or Inheritance", purposeOfAccount: "Education Expenses",
    pep: "Yes", foreignTaxResident: "No"
  }
};

const form = document.getElementById("onboardingForm");
const submitBtn = document.getElementById("submitBtn");
const spinner = submitBtn.querySelector(".spinner");
const btnLabel = submitBtn.querySelector(".btn-label");
const errorBox = document.getElementById("formError");
const result = document.getElementById("result");
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
    webhookStatus.textContent = "No webhook URL set — the form cannot be submitted.";
    webhookStatus.className = "config-status is-warn";
  } else if (url.includes("/webhook-test/")) {
    webhookStatus.textContent = "Test URL detected. Arm “Listen for test event” in n8n before each submission.";
    webhookStatus.className = "config-status is-warn";
  } else if (url.includes("/webhook/")) {
    webhookStatus.textContent = "Production URL detected. The workflow must be Active in n8n.";
    webhookStatus.className = "config-status is-ok";
  } else {
    webhookStatus.textContent = "This does not look like an n8n webhook URL.";
    webhookStatus.className = "config-status is-warn";
  }
}

/* -------------------------------------------------------------- demo autofill */
document.getElementById("demoCase").addEventListener("change", (e) => {
  const demo = DEMO_CASES[e.target.value];
  if (!demo) { form.reset(); return; }

  Object.entries(demo).forEach(([name, value]) => {
    const input = form.elements[name];
    if (input) input.value = value;
  });
  document.getElementById("declaration").checked = true;
  clearInvalid();

  // Never autofill an email — the agent sends a real message to whatever is here.
  form.elements.email.value = "";
  form.elements.email.focus();
});

/* ----------------------------------------------------------------- validation */
function clearInvalid() {
  form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  errorBox.hidden = true;
}

function validate() {
  clearInvalid();
  const missing = [];

  for (const el of form.elements) {
    if (!el.name && el.id !== "declaration") continue;
    if (!el.required) continue;

    const empty = el.type === "checkbox" ? !el.checked : !String(el.value).trim();
    if (empty || (el.type === "email" && !el.checkValidity())) {
      el.classList.add("invalid");
      missing.push(el);
    }
  }

  if (missing.length) {
    errorBox.textContent =
      `Please complete ${missing.length} highlighted field${missing.length > 1 ? "s" : ""} before submitting.`;
    errorBox.hidden = false;
    missing[0].scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

/* --------------------------------------------------------------------- submit */
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validate()) return;

  const endpoint = getWebhookUrl();
  if (!endpoint) {
    webhookInput.classList.add("invalid");
    errorBox.textContent = "Enter your n8n Webhook URL in the Lab configuration panel first.";
    errorBox.hidden = false;
    webhookInput.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  delete payload.declaration;                       // consent is not a data field
  payload.annualIncome = Number(payload.annualIncome);
  payload.initialDeposit = Number(payload.initialDeposit);

  setLoading(true);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`The bank's onboarding service returned HTTP ${response.status}.`);
    }

    // n8n's Respond to Webhook node returns the agent's structured decision.
    let decision = await response.json();
    if (typeof decision === "string") decision = JSON.parse(decision);
    if (Array.isArray(decision)) decision = decision[0];

    showResult(decision);
  } catch (err) {
    errorBox.textContent =
      `We could not submit your application. ${err.message} ` +
      `(Trainer: check the Webhook URL in the Lab configuration panel, and that the n8n workflow is active.)`;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  submitBtn.disabled = on;
  spinner.hidden = !on;
  btnLabel.textContent = on ? "Checking your details…" : "Submit application";
}

/* --------------------------------------------------------------------- result */
function showResult(decision) {
  const key = String(decision?.decision || "").toUpperCase();
  const style = DECISIONS[key] || {
    cls: "", icon: "?", title: "Application received",
    fallback: "We could not read the decision. Check the n8n execution log."
  };

  result.className = `result ${style.cls}`;
  document.getElementById("resultIcon").textContent = style.icon;
  document.getElementById("resultTitle").textContent = style.title;
  document.getElementById("resultReason").textContent = decision?.reason || style.fallback;
  document.getElementById("resultRef").textContent = decision?.applicationId || "—";
  document.getElementById("resultEmail").textContent = decision?.emailSent ? "Sent" : "Not sent";

  const flags = Array.isArray(decision?.riskFlags) ? decision.riskFlags : [];
  const flagList = document.getElementById("resultFlags");
  flagList.innerHTML = flags.map((f) => `<li>${f}</li>`).join("");
  flagList.hidden = flags.length === 0;

  form.hidden = true;
  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.getElementById("againBtn").addEventListener("click", () => {
  form.reset();
  clearInvalid();
  result.hidden = true;
  form.hidden = false;
  document.getElementById("demoCase").value = "";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});
