// ===== Model Release Form — Matched to index.html (no renames) =====
window.addEventListener('DOMContentLoaded', () => {
  // ---------- ELEMENTS ----------
  const form = document.getElementById('releaseForm');
  const confirmationEl = document.getElementById('confirmationMessage');

  const ageSelect = document.getElementById('ageCheck');
  const childrenSection = document.getElementById('childrenSection');
  const guardianSection = document.getElementById('guardianSection');

  const signatureDate = document.getElementById('signatureDate');

  const modelHidden = document.getElementById('modelSignatureData');
  const guardianHidden = document.getElementById('guardianSignatureData');

  const modelCanvas = document.getElementById('modelSignatureCanvas');
  const guardianCanvas = document.getElementById('guardianSignatureCanvas');

  const clearModelSigBtn = document.getElementById('clearModelSigBtn');
  const clearGuardianSigBtn = document.getElementById('clearGuardianSigBtn');

  // ---------- CONFIG: your backend endpoint ----------
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyCI8ycBdH2xE2ai4GCH2DE5qH8xHe3qu13UwUgeMh8SdcTzrZvCTxNFtEtgOh6qPuRoQ/exec';

  // ---------- SignaturePad (safe init) ----------
  let modelSigPad = null;
  let guardianSigPad = null;
  if (window.SignaturePad) {
    if (modelCanvas) modelSigPad = new SignaturePad(modelCanvas);
    if (guardianCanvas) guardianSigPad = new SignaturePad(guardianCanvas);
  }

  clearModelSigBtn && clearModelSigBtn.addEventListener('click', () => modelSigPad && modelSigPad.clear());
  clearGuardianSigBtn && clearGuardianSigBtn.addEventListener('click', () => guardianSigPad && guardianSigPad.clear());

  // ---------- Thank-you banner ----------
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

  // ---------- Age toggle ----------
  function updateAgeSections() {
    const v = (ageSelect && ageSelect.value || '').toLowerCase();
    if (v === 'no') {
      if (childrenSection) childrenSection.style.display = '';
      if (guardianSection) guardianSection.style.display = '';
    } else {
      if (childrenSection) childrenSection.style.display = 'none';
      if (guardianSection) guardianSection.style.display = 'none';
    }
  }
  if (ageSelect) { ageSelect.addEventListener('change', updateAgeSections); updateAgeSections(); }

  // ---------- Offline queue (text + signatures only) ----------
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

  // ---------- Submit (POST; no GET/414) ----------
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Timestamp
      if (signatureDate) {
        const now = new Date();
        signatureDate.value =
          `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ` +
          `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      }

      // Signatures -> hidden (JPEG smaller than PNG)
      if (modelHidden) {
        modelHidden.value = (modelSigPad && !modelSigPad.isEmpty())
          ? modelSigPad.toDataURL('image/jpeg', 0.85)
          : '';
      }
      if (guardianHidden) {
        guardianHidden.value = (guardianSection && guardianSection.style.display !== 'none' &&
                                guardianSigPad && !guardianSigPad.isEmpty())
          ? guardianSigPad.toDataURL('image/jpeg', 0.85)
          : '';
      }

      // Build payload
      const fd = new FormData(form);
      const payloadObj = Object.fromEntries(fd.entries()); // for offline queue

      try {
        const resp = await fetch(ENDPOINT, { method: 'POST', body: fd });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        form.reset();
        updateAgeSections();
        modelSigPad && modelSigPad.clear();
        guardianSigPad && guardianSigPad.clear();
        showThankYou('✅ Thank you! Submitted successfully.');
      } catch (err) {
        enqueue(payloadObj); // NOTE: headshot file is NOT queued offline
        form.reset();
        updateAgeSections();
        modelSigPad && modelSigPad.clear();
        guardianSigPad && guardianSigPad.clear();
        showThankYou('📶 Saved offline. I’ll auto-send when you’re back online.');
      }
    });
  }
});
