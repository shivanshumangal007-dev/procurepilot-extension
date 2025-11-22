// State management
let invoiceData = null;
let loading = false;

// DOM elements
const processBtn = document.getElementById("processBtn");
const errorCard = document.getElementById("errorCard");
const invoiceSection = document.getElementById("invoiceSection");
const infoSection = document.getElementById("infoSection");
const warningCard = document.getElementById("warningCard");
const successCard = document.getElementById("successCard");

// Invoice display elements
const vendorDisplay = document.getElementById("vendorDisplay");
const invoiceAmountDisplay = document.getElementById("invoiceAmountDisplay");
const poAmountDisplay = document.getElementById("poAmountDisplay");
const statusBadge = document.getElementById("statusBadge");
const warningText = document.getElementById("warningText");
const warningDiff = document.getElementById("warningDiff");

// PQ display elements
const pqCard = document.getElementById("pqCard");
const pqBadge = document.getElementById("pqBadge");
const vendorTurnover = document.getElementById("vendorTurnover");
const projectBudget = document.getElementById("projectBudget");
const turnoverRatio = document.getElementById("turnoverRatio");
const requiredCapability = document.getElementById("requiredCapability");
const vendorCapability = document.getElementById("vendorCapability");
const technicalScore = document.getElementById("technicalScore");
const financialScore = document.getElementById("financialScore");
const pqReasonCard = document.getElementById("pqReasonCard");

// Process invoice button click handler
processBtn.addEventListener("click", async () => {
  if (loading) return;

  resetUI();
  setLoading(true);
  hideError();

  try {
    chrome.runtime.sendMessage({ action: "processInvoice" }, (response) => {
      if (chrome.runtime.lastError) {
        showError(
          "Error communicating with extension: " +
            chrome.runtime.lastError.message
        );
        setLoading(false);
        return;
      }

      if (response && response.success) {
        invoiceData = null;

        setTimeout(() => {
          invoiceData = response.data;
          displayInvoiceData(invoiceData);
          console.log("Invoice processed:", invoiceData);
        }, 100);
      } else {
        showError("Failed to process invoice");
      }
      setLoading(false);
    });
  } catch (err) {
    console.error("Error processing invoice:", err);
    showError("Error communicating with extension");
    setLoading(false);
  }
});

// Reset UI
function resetUI() {
  console.log("Resetting UI state");

  invoiceData = null;
  invoiceSection.style.display = "none";
  warningCard.style.display = "none";
  successCard.style.display = "none";
  errorCard.style.display = "none";
  infoSection.style.display = "block";

  if (vendorDisplay) vendorDisplay.textContent = "";
  if (invoiceAmountDisplay) invoiceAmountDisplay.textContent = "";
  if (poAmountDisplay) poAmountDisplay.textContent = "";
  if (statusBadge) {
    statusBadge.textContent = "";
    statusBadge.className = "status-badge";
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "clearForm" },
        (response) => {
          console.log("Form cleared:", response);
        }
      );
    }
  });
}

// Set loading state
function setLoading(isLoading) {
  loading = isLoading;

  if (isLoading) {
    processBtn.disabled = true;
    processBtn.innerHTML = `
      <span class="spinner"></span>
      Processing...
    `;
  } else {
    processBtn.disabled = false;
    processBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 4h12v2H4V4zm0 5h12v2H4V9zm0 5h8v2H4v-2z"/>
      </svg>
      Process Invoice
    `;
  }
}

// Display invoice data with PQ evaluation
function displayInvoiceData(data) {
  if (!data) return;

  console.log("Displaying invoice data with PQ:", data);

  infoSection.style.display = "none";
  invoiceSection.style.display = "block";

  // Display PQ Data
  displayPQData(data);

  // Display Invoice Data
  vendorDisplay.textContent = data.vendorName;
  invoiceAmountDisplay.textContent = "$" + data.invoiceAmount.toLocaleString();
  poAmountDisplay.textContent = "$" + data.poAmount.toLocaleString();

  const isMismatch = data.status === "Mismatch";
  statusBadge.textContent = data.status;
  statusBadge.className = "status-badge " + (isMismatch ? "mismatch" : "match");

  if (isMismatch) {
    warningCard.style.display = "flex";
    successCard.style.display = "none";

    warningText.textContent = `Invoice amount ($${data.invoiceAmount.toLocaleString()}) does not match PO amount ($${data.poAmount.toLocaleString()}).`;
    warningDiff.textContent = `Difference: $${Math.abs(
      data.invoiceAmount - data.poAmount
    ).toLocaleString()}`;
  } else {
    warningCard.style.display = "none";
    successCard.style.display = "flex";
  }
}

// Display PQ evaluation data
function displayPQData(data) {
  // PQ Badge
  pqBadge.textContent = data.pqEligible ? "✓ ELIGIBLE" : "✗ NOT ELIGIBLE";
  pqBadge.className =
    "pq-badge " + (data.pqEligible ? "eligible" : "not-eligible");

  // Set card border color
  pqCard.className =
    "pq-card " + (data.pqEligible ? "eligible-card" : "ineligible-card");

  // Financial metrics
  vendorTurnover.textContent = "$" + data.vendorTurnover.toLocaleString();
  projectBudget.textContent = "$" + data.projectBudget.toLocaleString();

  const ratio = (data.vendorTurnover / data.projectBudget).toFixed(1);
  turnoverRatio.textContent = ratio + "x";
  turnoverRatio.className = "metric-value " + (ratio >= 3 ? "pass" : "fail");

  // Capabilities
  requiredCapability.textContent = data.requiredCapability;
  vendorCapability.textContent = data.vendorCapability;

  const capabilityMatch =
    data.requiredCapability.toLowerCase() ===
    data.vendorCapability.toLowerCase();
  vendorCapability.className =
    "capability-value " + (capabilityMatch ? "match" : "no-match");

  // Scores
  technicalScore.textContent = data.technicalScore + "/100";
  technicalScore.className =
    "score-value " + (data.technicalScore >= 70 ? "pass" : "fail");

  financialScore.textContent = data.financialScore + "/100";
  financialScore.className =
    "score-value " + (data.financialScore >= 70 ? "pass" : "fail");

  // Reason
  pqReasonCard.textContent = "📋 " + data.pqReason;
  pqReasonCard.className =
    "pq-reason " + (data.pqEligible ? "eligible-reason" : "ineligible-reason");
}

// Show error
function showError(message) {
  errorCard.innerHTML = "<strong>⚠️ Error:</strong> " + message;
  errorCard.style.display = "block";
}

// Hide error
function hideError() {
  errorCard.style.display = "none";
}

console.log("ProcurePilot side panel loaded with PQ evaluation");
