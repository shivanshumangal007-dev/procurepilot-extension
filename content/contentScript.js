// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm") {
    console.log("Filling form with data:", request.data);
    // Clear previous styling first, then fill form
    clearPreviousStyling();
    fillERPForm(request.data);
    sendResponse({ success: true });
  }

  if (request.action === "clearForm") {
    console.log("Clearing form styling");
    clearPreviousStyling();
    sendResponse({ success: true });
  }

  return true;
});

/**
 * Clear all previous styling and warnings before new fill
 */
function clearPreviousStyling() {
  console.log("Clearing previous form styling and warnings");

  const fieldIds = ["vendorName", "invoiceAmount", "poAmount"];

  fieldIds.forEach((id) => {
    const field = document.getElementById(id);
    if (field) {
      // Remove all custom styling
      field.style.border = "";
      field.style.backgroundColor = "";
      field.style.outline = "";
      field.style.boxShadow = "";

      // Remove warning labels
      const warning = field.parentNode.querySelector(".procurepilot-warning");
      if (warning) {
        warning.remove();
      }
    }
  });

  // Remove any notification banners
  const notification = document.getElementById("procurepilot-notification");
  if (notification) {
    notification.remove();
  }

  console.log("Previous styling cleared successfully");
}

/**
 * Auto-fill ERP form fields and perform 3-Way Match validation
 */
function fillERPForm(data) {
  const { vendorName, invoiceAmount, poAmount, status } = data;

  // Find form fields
  const vendorField = document.getElementById("vendorName");
  const invoiceField = document.getElementById("invoiceAmount");
  const poField = document.getElementById("poAmount");

  if (!vendorField || !invoiceField || !poField) {
    console.warn("ERP form fields not found on this page");
    showNotification("ERP form not detected on this page", "warning");
    return;
  }

  // Clear existing values first
  vendorField.value = "";
  invoiceField.value = "";
  poField.value = "";

  // Small delay to ensure clearing is visible
  setTimeout(() => {
    // Fill form fields with new values
    if (vendorField) {
      vendorField.value = vendorName;
      vendorField.dispatchEvent(new Event("input", { bubbles: true }));
      vendorField.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (invoiceField) {
      invoiceField.value = invoiceAmount;
      invoiceField.dispatchEvent(new Event("input", { bubbles: true }));
      invoiceField.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (poField) {
      poField.value = poAmount;
      poField.dispatchEvent(new Event("input", { bubbles: true }));
      poField.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Perform 3-Way Match validation
    if (status === "Mismatch") {
      // Highlight mismatched fields with red border
      if (invoiceField) {
        invoiceField.style.border = "3px solid #dc2626";
        invoiceField.style.backgroundColor = "#fee2e2";
      }
      if (poField) {
        poField.style.border = "3px solid #dc2626";
        poField.style.backgroundColor = "#fee2e2";
      }

      // Add warning label
      addMismatchWarning(invoiceField);
      addMismatchWarning(poField);

      showNotification(
        "⚠️ Mismatch detected: Invoice and PO amounts differ",
        "error"
      );
    } else {
      // Success - green border
      if (invoiceField) {
        invoiceField.style.border = "3px solid #16a34a";
        invoiceField.style.backgroundColor = "#dcfce7";
      }
      if (poField) {
        poField.style.border = "3px solid #16a34a";
        poField.style.backgroundColor = "#dcfce7";
      }
      if (vendorField) {
        vendorField.style.border = "3px solid #16a34a";
        vendorField.style.backgroundColor = "#dcfce7";
      }

      showNotification(
        "✓ 3-Way Match successful - All amounts match!",
        "success"
      );
    }

    console.log("Form filled successfully with 3-Way Match validation");
  }, 100);
}

/**
 * Add warning label next to mismatched field
 */
function addMismatchWarning(element) {
  if (!element) return;

  // Remove existing warning if present
  const existingWarning = element.parentNode.querySelector(
    ".procurepilot-warning"
  );
  if (existingWarning) existingWarning.remove();

  const warning = document.createElement("div");
  warning.className = "procurepilot-warning";
  warning.style.cssText = `
    color: #991b1b;
    font-weight: bold;
    font-size: 13px;
    margin-top: 6px;
    padding: 8px 12px;
    background: #fee2e2;
    border-left: 4px solid #dc2626;
    border-radius: 4px;
    animation: slideDown 0.3s ease-out;
  `;
  warning.textContent = "⚠️ Amount mismatch detected";

  element.parentNode.insertBefore(warning, element.nextSibling);
}

/**
 * Show notification banner on page
 */
function showNotification(message, type = "info") {
  // Remove existing notification
  const existing = document.getElementById("procurepilot-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.id = "procurepilot-notification";

  const colors = {
    success: { bg: "#16a34a", text: "#fff" },
    error: { bg: "#dc2626", text: "#fff" },
    warning: { bg: "#f59e0b", text: "#fff" },
    info: { bg: "#2563eb", text: "#fff" },
  };

  const color = colors[type] || colors.info;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${color.bg};
    color: ${color.text};
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;

  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Add animation styles
if (!document.getElementById("procurepilot-styles")) {
  const style = document.createElement("style");
  style.id = "procurepilot-styles";
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
    @keyframes slideDown {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

console.log("ProcurePilot content script loaded");
