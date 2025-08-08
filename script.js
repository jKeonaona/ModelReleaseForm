// ===== Model Release Form — Matched to index.html =====
window.addEventListener('DOMContentLoaded', () => {
  // ---------- ELEMENTS ----------
  const form = document.getElementById('releaseForm');
  const confirmationEl = document.getElementById('confirmationMessage');

  const ageSelect = document.getElementById('ageCheck');
  const childrenSection = document.getElementById('childrenSection');
  const guardianSection = document.getElementById('guardianSection');

  const signatureDate = document.getElementById('signatureDate');

  // Hidden inputs for signatures
  const modelHidden = document.getElementById('modelSignatureData');
  const guardianHidden = document.getElementById('guardianSignatureData');

  // Canvases for signatures
  const modelCanvas = document.getElementById('modelSignatureCanvas');
  const guardianCanvas = document.getElementById('guardianSignatureCanvas');

  // Clear buttons
  const clearModelSigBtn = document.getElementById('clearModelSigBtn');
  const clearGuardianSigBtn = document.getElementById('clearGuardianSigBtn');

  // ---------- CONFIG: Your backend endpoint (Google Apps Script) ----------
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyCI8ycBdH2xE2ai4GCH2DE5qH8xHe3qu13UwUgeMh8SdcTzrZvCTxNFtEtgOh6qPuRoQ/exec';

  // ---------- SIGNATURE PADS ----------
  let modelSigPad = null;
  let guardianSigPad = null;
  if (window.SignaturePad) {
    if (modelCanvas) modelSigPad = new SignaturePad(modelCanvas);
    if (guardianCanvas) guardianSigPad = new SignaturePad(guardianCanvas);
  }

  clearModelSigBtn?.addEventListener('click', () => modelSigPad?.clear?.());
  clearGuardianSigBtn?.addEventListener('click', () => guardianSigPad?.clear?.());

  // ---------- THANK-YOU UI ----------
  function showThankYou(text = '✅ Thank you! Your form was submitted.') {
    if (confirmationEl) {
      confirmationEl.textContent = text;
      confirmationEl.style.display = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { confirmationEl.style.display = 'none'; }, 6000);
    } else {
      alert(text);
    }
  }

  // ---------- AGE TOGGLE ----------
  function updateAgeSections() {
    const v = (ageSelect?.value || '').toLowerCase();
    if (v === 'no') {
      childrenSection && (childrenSection.style.display = '');
      guardianSection && (guardianSection.style.display = '');
    } else {
      childrenSection && (childrenSection.style.display = 'none');
      guardianSection && (guardianSection.style.display = 'none');
    }
  }
  ageSelect?.addEventListener('change', updateAgeSections);
  updateAgeSections();

  // ---------- OFFLINE QUEUE ----------
  const QUEUE_KEY = 'releaseFormQueue_v1';

  function enqueue(obj) {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    q.push(obj);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  }

  async function flushQueue() {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (!q.length) return;
    const keep = [];
    for (const item of q) {
      try {
        const fd = new FormData();
        for (const [k, v] of Object.entries(item)) fd.append(k, v);
        const r = await fetch(ENDPOINT, { method: 'POST', body: fd });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } catch {
        keep.push(item);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(keep));
  }
  window.addEventListener('online', flushQueue);
  flushQueue();

  // ---------- SUBMIT HANDLER (POST; no GET/414) ----------
    form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Stamp signature date (local time)
    if (signatureDate) {
      const now = new Date();
      signatureDate.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    }

    // Capture signatures to hidden fields (JPEG smaller than PNG)
    if (modelHidden && modelSigPad && !modelSigPad.isEmpty()) {
      modelHidden.value = modelSigPad.toDataURL('image/jpeg', 0.85);
    } else if (modelHidden) {
      modelHidden.value = ''; // ensure field exists
    }

    if (guardianHidden) {
      if (guardianSection && guardianSection.style.display !== 'none' &&
          guardianSigPad && !guardianSigPad.isEmpty()) {
        guardianHidden.value = guardianSigPad.toDataURL('image/jpeg', 0.85);
      } else {
        guardianHidden.value = '';
      }
    }

    const fd = new FormData(form);
    const payloadObj = Object.fromEntries(fd.entries()); // for queue if needed

    try {
      const resp = await fetch(ENDPOINT, { method: 'POST', body: fd });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      form.reset();
      updateAgeSections();
      modelSigPad?.clear?.();
      guardianSigPad?.clear?.();
      showThankYou('✅ Thank you! Submitted successfully.');
    } catch (err) {
      enqueue(payloadObj);
      form.reset();
      updateAgeSections();
      modelSigPad?.clear?.();
      guardianSigPad?.clear?.();
      showThankYou('📶 Saved offline. I’ll auto-send when you’re back online.');
    }
  });

}); // <--- this closes the DOMContentLoaded wrapper
