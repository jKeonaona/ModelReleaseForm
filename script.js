// ========== Model Release FORM — UI ONLY (no network) ==========

document.addEventListener('DOMContentLoaded', () => {
  // ---- Elements ----
  const form = document.getElementById('releaseForm');
  const confirmation = document.getElementById('confirmationMessage');

  const ageSelect = document.getElementById('ageCheck');
  const guardianSection = document.getElementById('guardianSection');
  const childrenSection = document.getElementById('childrenSection');

  const modelCanvas = document.getElementById('modelSignatureCanvas');
  const guardianCanvas = document.getElementById('guardianSignatureCanvas');

  const modelSigField = document.getElementById('modelSignatureData');
  const guardianSigField = document.getElementById('guardianSignatureData');

  const signatureDateInput = form.querySelector('input[name="signatureDate"]');

  // ---- Small helpers ----
  function showConfirm(text) {
    if (!confirmation) return;
    confirmation.textContent = text || '✅ Thank you! Your form was submitted.';
    confirmation.style.display = 'block';
  }
  function hideConfirm() {
    if (!confirmation) return;
    confirmation.style.display = 'none';
    confirmation.textContent = '';
  }
  function setTodayIfBlank() {
    if (!signatureDateInput) return;
    if (!signatureDateInput.value) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      signatureDateInput.value = today;
    }
  }
  function resizeCanvas(canvas, pad) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return; // avoid 0-width init
    canvas.width  = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(150 * ratio); // matches CSS height
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    if (pad && typeof pad.clear === 'function') pad.clear();
  }

  // ---- Signature pads (no network, UI only) ----
  let modelPad = null;
  let guardianPad = null;

  function initModelPad() {
    if (!window.SignaturePad || !modelCanvas) return;
    modelPad = new window.SignaturePad(modelCanvas, { penColor: '#000' });
    // size next frame (layout is ready)
    requestAnimationFrame(() => resizeCanvas(modelCanvas, modelPad));
  }
  function initGuardianPad() {
    if (!window.SignaturePad || !guardianCanvas) return;
    if (!guardianPad) guardianPad = new window.SignaturePad(guardianCanvas, { penColor: '#000' });
    requestAnimationFrame(() => resizeCanvas(guardianCanvas, guardianPad));
  }

  initModelPad();

  window.addEventListener('resize', () => {
    if (modelPad) requestAnimationFrame(() => resizeCanvas(modelCanvas, modelPad));
    if (guardianPad && guardianSection.style.display !== 'none') {
      requestAnimationFrame(() => resizeCanvas(guardianCanvas, guardianPad));
    }
  });

  // Clear buttons (used by inline onclick in HTML)
  window.clearModelSig = () => { if (modelPad) modelPad.clear(); };
  window.clearGuardianSig = () => { if (guardianPad) guardianPad.clear(); };

  // ---- Age toggle (No = minor -> show sections) ----
  function updateMinorUI() {
    const isMinor = String(ageSelect.value || '').toLowerCase() === 'no';
    guardianSection.style.display = isMinor ? 'block' : 'none';
    childrenSection.style.display = isMinor ? 'block' : 'none';

    const gName = form.querySelector('input[name="guardianName"]');
    const gRel  = form.querySelector('input[name="guardianRelationship"]');
    if (gName) gName.required = isMinor;
    if (gRel)  gRel.required  = isMinor;

    if (isMinor) initGuardianPad();
  }
  ageSelect.addEventListener('change', updateMinorUI);
  ageSelect.addEventListener('input', updateMinorUI);
  updateMinorUI(); // set initial state on load

  // ---- Submit (NO sending) ----
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    hideConfirm();
    setTodayIfBlank();

    // Move signatures into hidden inputs (so you can see they capture)
    if (modelSigField && modelPad) {
      modelSigField.value = modelPad.isEmpty() ? '' : modelPad.toDataURL('image/jpeg', 0.85);
    }
    if (guardianSigField) {
      const needGuardian = guardianSection.style.display !== 'none';
      guardianSigField.value =
        (needGuardian && guardianPad && !guardianPad.isEmpty())
          ? guardianPad.toDataURL('image/jpeg', 0.85)
          : '';
    }

    // Show a local success (no network) and reset for testing
    showConfirm('✅ Form captured locally (no email sent).');
    setTimeout(() => {
      form.reset();
      if (modelPad) modelPad.clear();
      if (guardianPad) guardianPad.clear();
      hideConfirm();
      updateMinorUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 3000);
  }, { capture: true });

  // ---- Sanity logs (optional; remove later) ----
  if (!window.SignaturePad) console.error('SignaturePad library not loaded. Check the CDN <script> tag order.');
  if (!modelCanvas) console.error('#modelSignatureCanvas not found.');
});
