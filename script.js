document.addEventListener("DOMContentLoaded", function () {
    const ageCheck = document.getElementById("ageCheck");
    const childrenSection = document.getElementById("childrenSection");
    const guardianSection = document.getElementById("guardianSection");

    const guardianCanvas = document.getElementById("guardianSignatureCanvas");
    const guardianSigPad = new SignaturePad(guardianCanvas);
    const guardianSignatureData = document.getElementById("guardianSignatureData");

    const modelCanvas = document.getElementById("modelSignatureCanvas");
    const modelSigPad = new SignaturePad(modelCanvas);
    const modelSignatureData = document.getElementById("modelSignatureData");

    // Show/hide guardian section
  ageCheck.addEventListener("change", function () {
    if (this.value.toLowerCase() === "no") {
        guardianSection.style.display = "";
        childrenSection.style.display = "";
    } else {
        guardianSection.style.display = "none";
        childrenSection.style.display = "none";
    }
});


    // Clear guardian signature
    window.clearGuardianSig = function () {
        guardianSigPad.clear();
        guardianSignatureData.value = "";
    };

    // Clear model signature
    window.clearModelSig = function () {
        modelSigPad.clear();
        modelSignatureData.value = "";
    };

    // ==== CONFIG: your backend endpoint (Google Apps Script Web App) ====
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyCI8ycBdH2xE2ai4GCH2DE5qH8xHe3qu13UwUgeMh8SdcTzrZvCTxNFtEtgOh6qPuRoQ/exec';

// Simple offline queue in localStorage
const QUEUE_KEY = 'releaseFormQueue_v1';

function enqueue(payloadObj) {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  q.push(payloadObj);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

async function flushQueue() {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (!q.length) return;
  const remaining = [];
  for (const item of q) {
    try {
      const fd = new FormData();
      Object.entries(item).forEach(([k, v]) => fd.append(k, v));
      const r = await fetch(ENDPOINT, { method: 'POST', body: fd });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch {
      remaining.push(item); // keep if failed
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
window.addEventListener('online', flushQueue);

// === Submit handler: capture sigs, POST, fallback to queue ===
document.getElementById('releaseForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  // Capture signatures to hidden inputs as JPEG (smaller than PNG)
  const modelHidden = document.getElementById('modelSignatureData');
  if (window.modelSigPad && !modelSigPad.isEmpty()) {
    modelHidden && (modelHidden.value = modelSigPad.toDataURL('image/jpeg', 0.85));
  }

  const guardianHidden = document.getElementById('guardianSignatureData');
  const guardianSection = document.getElementById('guardianSection');
  if (guardianSection && guardianSection.style.display !== 'none' && window.guardianSigPad && !guardianSigPad.isEmpty()) {
    guardianHidden && (guardianHidden.value = guardianSigPad.toDataURL('image/jpeg', 0.85));
  }

  const fd = new FormData(this);
  const payloadObj = Object.fromEntries(fd.entries()); // for queuing if needed

  try {
    const resp = await fetch(ENDPOINT, { method: 'POST', body: fd });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    // Success UI (your 5–7s thank-you + reset)
    // showThankYou(); // if you have this
    this.reset();
    if (window.modelSigPad) modelSigPad.clear?.();
    if (window.guardianSigPad) guardianSigPad.clear?.();
  } catch (err) {
    // Offline or server error → queue locally and reset UI
    enqueue(payloadObj);
    // showQueuedMessage(); // optional
    this.reset();
    if (window.modelSigPad) modelSigPad.clear?.();
    if (window.guardianSigPad) guardianSigPad.clear?.();
  }
});

// Call once on load in case we came back online
flushQueue();
