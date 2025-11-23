// Enable side panel on extension icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting panel behavior:", error));

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processInvoice") {
    console.log("Processing invoice request received");

    // Generate mock data with PQ evaluation
    const mockInvoiceData = generateMockInvoiceData();

    console.log("Generated invoice data with PQ evaluation:", mockInvoiceData);

    // Send response back to side panel
    sendResponse({ success: true, data: mockInvoiceData });

    // Get active tab and send data to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "fillForm",
          data: mockInvoiceData,
        });
      }
    });

    return true;
  }

  // Placeholder for future WebSocket connection
  if (request.action === "connectBackend") {
    console.log("Backend connection placeholder - implement WebSocket here");
    sendResponse({ success: true, message: "WebSocket placeholder ready" });
  }

  // Placeholder for PDF extraction
  if (request.action === "extractInvoiceData") {
    console.log("PDF extraction placeholder - implement OCR/parser here");
    sendResponse({
      success: true,
      message: "Invoice extraction placeholder ready",
    });
  }
});

/**
 * Generate mock invoice data with PQ evaluation
 */
function generateMockInvoiceData() {
  // Different scenarios for testing
  const scenarios = [
    // Scenario 1: Mismatch + PQ FAIL (turnover too low)
    {
      vendorName: "Small Vendor Ltd",
      invoiceAmount: 5400,
      poAmount: 4500,
      status: invoiceAmount === poAmount ? "match" : "mismatch",
      // PQ Data
      projectBudget: 1000000,
      vendorTurnover: 2500000, // Only 2.5x budget (need 3x)
      requiredCapability: "Heavy Equipment Installation",
      vendorCapability: "Basic Supply Only",
      technicalScore: 45, // Out of 100
      financialScore: 60,
      pqEligible: false,
      pqReason:
        "Vendor turnover (2.5x) below minimum requirement (3x project budget)",
    },

    // Scenario 2: Match + PQ PASS (all criteria met)
    {
      vendorName: "Global Suppliers Inc",
      invoiceAmount: 3000,
      poAmount: 3000,
      status: invoiceAmount === poAmount ? "match" : "mismatch",
      // PQ Data
      projectBudget: 500000,
      vendorTurnover: 2000000, // 4x budget ✓
      requiredCapability: "IT Hardware Supply & Installation",
      vendorCapability: "IT Hardware Supply & Installation",
      technicalScore: 92,
      financialScore: 88,
      pqEligible: true,
      pqReason: "All pre-qualification criteria met",
    },

    // Scenario 3: Match + PQ FAIL (capability mismatch)
    {
      vendorName: "TechSupply Co",
      invoiceAmount: 1500,
      poAmount: 1500,
      status: invoiceAmount === poAmount ? "match" : "mismatch",
      // PQ Data
      projectBudget: 200000,
      vendorTurnover: 1500000, // 7.5x budget ✓ (good)
      requiredCapability: "Software Development & Cloud Integration",
      vendorCapability: "Hardware Sales Only",
      technicalScore: 35,
      financialScore: 85,
      pqEligible: false,
      pqReason: "Vendor capability does not match project requirements",
    },

    // Scenario 4: Mismatch + PQ PASS (eligible but amount issue)
    {
      vendorName: "Premium Enterprise Corp",
      invoiceAmount: 15000,
      poAmount: 12000,
      status: invoiceAmount === poAmount ? "match" : "mismatch",
      // PQ Data
      projectBudget: 2000000,
      vendorTurnover: 10000000, // 5x budget ✓
      requiredCapability: "Large-Scale Construction Project Management",
      vendorCapability: "Large-Scale Construction Project Management",
      technicalScore: 95,
      financialScore: 93,
      pqEligible: true,
      pqReason:
        "All pre-qualification criteria met (invoice mismatch requires review)",
    },
  ];
  
  // Randomly select a scenario for demo
  const randomScenario =
    scenarios[Math.floor(Math.random() * scenarios.length)];

  return randomScenario;

  // For consistent testing, uncomment one:
  // return scenarios[0]; // PQ FAIL
  // return scenarios[1]; // PQ PASS
}

/**
 * Evaluate PQ eligibility (for production use)
 */
function evaluatePQEligibility(vendorData, projectData) {
  const turnoverRatio = vendorData.turnover / projectData.budget;
  const minTurnoverRatio = 3; // Vendor must have 3x project budget as turnover

  const checks = {
    turnoverAdequate: turnoverRatio >= minTurnoverRatio,
    capabilityMatch: vendorData.capability
      .toLowerCase()
      .includes(projectData.requiredCapability.toLowerCase()),
    technicalScorePass: vendorData.technicalScore >= 70,
    financialScorePass: vendorData.financialScore >= 70,
  };

  const eligible = Object.values(checks).every((check) => check === true);

  let reason = "";
  if (!checks.turnoverAdequate) {
    reason = `Vendor turnover (${turnoverRatio.toFixed(
      1
    )}x) below minimum requirement (${minTurnoverRatio}x project budget)`;
  } else if (!checks.capabilityMatch) {
    reason = "Vendor capability does not match project requirements";
  } else if (!checks.technicalScorePass) {
    reason = "Technical capability score below minimum threshold (70/100)";
  } else if (!checks.financialScorePass) {
    reason = "Financial stability score below minimum threshold (70/100)";
  } else {
    reason = "All pre-qualification criteria met";
  }

  return {
    eligible,
    reason,
    checks,
    turnoverRatio: turnoverRatio.toFixed(1),
  };
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("ProcurePilot extension installed successfully");
});
