# 🚀 ProcurePilot – Autonomous Procurement & Document Intelligence

ProcurePilot is an **AI-powered autonomous browser agent** that automates the most painful parts of corporate procurement: invoice verification, vendor onboarding, PQ/eligibility checking, and form filling across legacy ERP portals.

Built for hackathons, but engineered like a real startup.

---

## ⭐ Problem We Are Solving

Corporate procurement teams waste hundreds of hours every month on tedious, error‑prone tasks:

* Copy‑pasting data from **invoices → ERP portals**
* Doing **3‑way matching** (Invoice vs PO vs GRN) manually
* Checking **vendor eligibility** (PQ/impairment forms like turnover ≥ 3× budget)
* Updating **vendor details** like bank accounts (major fraud vector)
* Navigating clunky legacy portals with no APIs

This leads to:

* Overpayments
* Delays in onboarding vendors
* Invoice fraud (BEC scams)
* Burnout for procurement teams

ProcurePilot eliminates all of this.

---

## 💡 Our Solution: ProcurePilot AI Agent

An **autonomous browser extension** + **Python agent backend** that:

### ✅ 1. Reads ANY document (Invoice, PO, PQ, GRN)

* Extracts data using `pdfplumber`, Donut, Vision‑LLMs
* Handles PDFs, scanned docs, images, screenshots

### ✅ 2. Performs full **3-Way Match** automatically

* Invoice ↔ PO ↔ Delivery Receipt
* Highlights discrepancies visually on the webpage

### ✅ 3. Runs **PQ/Eligibility checks**

Example:

* Project budget = ₹10,00,000
* Requirement = Last 3 years turnover ≥ 3× budget
* AI extracts turnover fields from PQ form and instantly decides: **Eligible / Not eligible**

### ✅ 4. Fills ERP/Vendor Portals automatically

* Opens pages
* Detects form fields visually
* Types and selects fields using computer‑vision driven actions

### ✅ 5. Fraud Detection (Vendor Bank Change Alert)

* Flags suspicious edits to vendor banking details
* Compares with previous records
* Recognizes country mismatch or unexpected changes

### ✅ 6. Live "Thought Stream"

* Shows real‑time agent reasoning
* A Hackathon "WOW" moment
---

## 📁 Project Structure

```
HACKATHON/
│
├── extraction/
│   ├── pdf_reader.py
│   ├── donut_reader.py
│   ├── pq_checker.py
│   └── matcher.py
├── extension/
│   ├── popup.tsx
│   ├── sidepanel.tsx
│   ├── content.ts
│   └── manifest.json
│
├── training_data/
├── test_docs/
└── README.md
```

---

## 🧪 How It Works (Flow)

1. User opens any invoice/PQ form/ERP portal
2. ProcurePilot Side Panel is activated
3. Document is extracted → parsed → structured JSON
4. Agent plans next steps (open PO page, fill form, compare values)
5. Browser agent executes actions visually using CV
6. Results shown with highlights and discrepancy cards

---

## 🎬 Hackathon Demo Storyline

1. Show a messy manual workflow
2. Click "Run ProcurePilot"
3. Hands off keyboard → watch the agent:

   * read invoice
   * fetch PO
   * do matching
   * flag mismatch
   * check PQ eligibility
   * fill vendor form automatically
4. Judges see red/green highlight overlays + thought logs

**Guaranteed WOW moment.**

---

## 📦 Installation

### 1. Clone the Repository
git clone https://github.com/yourusername/procurepilot.git
cd procurepilot

### 2. Load into Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `procurepilot-extension` folder from this repository.

## 📈 Business Model (Future Scope)

* **Per‑workflow pricing** (₹X per invoice matched)
* **Enterprise dashboard** for audit logs
* **Custom agent fine‑tuning** for large enterprises
* **Fraud protection add‑on**

---

## 🚧 Procurement Extractor (AI Engine) - *Coming Soon*

We are currently developing an advanced **AI-Powered Document Intelligence Engine** (`procurement_extractor`) to replace the current simulation logic. This module is architected to handle unstructured data with enterprise-grade accuracy.

> **Status**: 🟡 In Development (Alpha)
> *The source code for this module is available in the `procurement_extractor/` directory but is not yet connected to the live extension.*
## 🤝 Team

We are Team **ProcurePilot** — builders of agentic enterprise automation!

---

## 📜 License

MIT License

---

## ⭐ If you like this project, give it a star!
