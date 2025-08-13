// ========== Model Release FORM — UI ONLY (no network) ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ script.js DOMContentLoaded running');

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

  // ---- Helpers ----
function showConfirm(text) {
  if (!confirmation) return;

  // Message
  confirmation.textContent = text || '✅ Thank you! Your form was submitted.';
  // Force visible and pin it to the top as a banner
  confirmation.style.display = 'block';
  confirmation.style.opacity = '1';
  confirmation.style.animation = 'none';

  // Make it a fixed banner so it can’t be hidden by layout
  confirmation.style.position = 'fixed';
  confirmation.style.top = '12px';
  confirmation.style.left = '16px';
  confirmation.style.right = '16px';
  confirmation.style.zIndex = '9999';
  confirmation.style.textAlign = 'center';
  confirmation.style.padding = '12px';
  confirmation.style.borderRadius = '8px';
  confirmation.style.background = 'rgba(34, 197, 94, 0.95)'; // bright green
  confirmation.style.color = '#ffffff';
  confirmation.style.border = 'none';

  // Bring focus for accessibility (optional)
  confirmation.setAttribute('role', 'status');
  confirmation.setAttribute('aria-live', 'polite');
}

  function hideConfirm() {
    if (!confirmation) return;
    confirmation.style.display = 'none';
    confirmation.textContent = '';
  }
  function setTodayIfBlank() {
    if (!signatureDateInput) return;
    if (!signatureDateInput.value) {
      const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
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

  // ---- Signature pads ----
  let modelPad = null;
  let guardianPad = null;

  function initModelPad() {
    if (!window.SignaturePad || !modelCanvas) return;
    modelPad = new window.SignaturePad(modelCanvas, { penColor: '#000' });
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
    if (guardianPad && guardianSection && guardianSection.style.display !== 'none') {
      requestAnimationFrame(() => resizeCanvas(guardianCanvas, guardianPad));
    }
  });

  // Clear buttons (used by inline onclick in HTML)
  window.clearModelSig = () => { if (modelPad) modelPad.clear(); };
  window.clearGuardianSig = () => { if (guardianPad) guardianPad.clear(); };

  // ---- Age toggle (No = minor -> show sections) ----
  function updateMinorUI() {
    if (!ageSelect || !guardianSection || !childrenSection) return;
    const isMinor = String(ageSelect.value || '').toLowerCase() === 'no';
    guardianSection.style.display = isMinor ? 'block' : 'none';
    childrenSection.style.display = isMinor ? 'block' : 'none';

    const gName = form.querySelector('input[name="guardianName"]');
    const gRel  = form.querySelector('input[name="guardianRelationship"]');
    if (gName) gName.required = isMinor;
    if (gRel)  gRel.required  = isMinor;

    if (isMinor) initGuardianPad();
  }
  ageSelect && ageSelect.addEventListener('change', updateMinorUI);
  ageSelect && ageSelect.addEventListener('input', updateMinorUI);
  updateMinorUI(); // set initial state on load

  // ---- Submit (NO sending) ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    hideConfirm();
    setTodayIfBlank();

    // Copy signatures into hidden inputs
    if (modelSigField && modelPad) {
      modelSigField.value = modelPad.isEmpty() ? '' : modelPad.toDataURL('image/jpeg', 0.85);
    }
    if (guardianSigField && guardianSection) {
      const needGuardian = guardianSection.style.display !== 'none';
      guardianSigField.value =
        (needGuardian && guardianPad && !guardianPad.isEmpty())
          ? guardianPad.toDataURL('image/jpeg', 0.85)
          : '';
    }

    // --- Save locally (simple localStorage) ---
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.timestamp = new Date().toISOString();

    try {
      const existing = JSON.parse(localStorage.getItem('formEntries') || '[]');
      existing.push(data);
      localStorage.setItem('formEntries', JSON.stringify(existing));
    } catch (err) {
      console.error('Local save failed:', err);
      alert('⚠️ Could not save locally. Please try again.');
      return;
    }

    showConfirm('✅ Form saved locally (offline mode)');
    setTimeout(() => {
      form.reset();
      if (modelPad) modelPad.clear();
      if (guardianPad) guardianPad.clear();
      hideConfirm();
      updateMinorUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 5000);
  }, { capture: true });
});


