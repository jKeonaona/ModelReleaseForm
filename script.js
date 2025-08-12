document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const form = document.getElementById('releaseForm');
  const confirmations = Array.from(document.querySelectorAll('#confirmationMessage'));
  const ageSelect = document.getElementById('ageCheck');
  const guardianSection = document.getElementById('guardianSection');
  const childrenSection = document.getElementById('childrenSection');

  const modelCanvas = document.getElementById('modelSignatureCanvas');
  const guardianCanvas = document.getElementById('guardianSignatureCanvas');

  const modelSigField = document.getElementById('modelSignatureData');
  const guardianSigField = document.getElementById('guardianSignatureData');
  const signatureDateInput = form.querySelector('input[name="signatureDate"]');

  // ------- small helpers -------
  function showConfirm(text) {
    confirmations.forEach(el => {
      if (!el) return;
      el.textContent = text || '✅ Thank you! Your form was submitted.';
      el.style.display = 'block';
    });
  }
  function hideConfirm() {
    confirmations.forEach(el => {
      if (!el) return;
      el.style.display = 'none';
      el.textContent = '';
    });
  }
  function setTodayIfBlank() {
    if (!signatureDateInput) return;
    if (!signatureDateInput.value) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      signatureDateInput.value = `${yyyy}-${mm}-${dd}`;
    }
  }
  function resizeCanvas(canvas, pad) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(150 * ratio);
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    pad?.clear();
  }

  // ------- signature pads -------
  let modelPad = null;
  let guardianPad = null;

  if (modelCanvas) {
    modelPad = new SignaturePad(modelCanvas, { penColor: '#000' });
    resizeCanvas(modelCanvas, modelPad);
  }
  function ensureGuardianPad() {
    if (!guardianCanvas) return;
    if (!guardianPad) guardianPad = new SignaturePad(guardianCanvas, { penColor: '#000' });
    resizeCanvas(guardianCanvas, guardianPad);
  }

  window.addEventListener('resize', () => {
    if (modelCanvas && modelPad) resizeCanvas(modelCanvas, modelPad);
    if (guardianSection?.style.display !== 'none' && guardianCanvas && guardianPad) {
      resizeCanvas(guardianCanvas, guardianPad);
    }
  });

  window.clearModelSig = () => { modelPad?.clear(); };
  window.clearGuardianSig = () => {
    if (guardianSection?.style.display !== 'none') ensureGuardianPad();
    guardianPad?.clear();
  };

  // ------- age toggle -------
  function updateMinorUI() {
    const isMinor = (ageSelect?.value || '').toLowerCase() === 'no';
    if (guardianSection) guardianSection.style.display = isMinor ? 'block' : 'none';
    if (childrenSection) childrenSection.style.display = isMinor ? 'block' : 'none';

    const gName = form.querySelector('input[name="guardianName"]');
    const gRel = form.querySelector('input[name="guardianRelationship"]');
    if (gName) gName.required = isMinor;
    if (gRel) gRel.required = isMinor;

    if (isMinor) ensureGuardianPad();
  }
  ageSelect?.addEventListener('change', updateMinorUI);
  updateMinorUI();

  // ------- submit to Google Apps Script -------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    hideConfirm();
    setTodayIfBlank();

    // Move signatures into hidden fields
    if (modelSigField && modelPad) {
      modelSigField.value = modelPad.isEmpty() ? '' : modelPad.toDataURL('image/jpeg', 0.85);
    }
    if (guardianSigField) {
      const needGuardian = guardianSection?.style.display !== 'none';
      guardianSigField.value =
        (needGuardian && guardianPad && !guardianPad.isEmpty())
          ? guardianPad.toDataURL('image/jpeg', 0.85)
          : '';
    }

    // Send form data to Google Apps Script
   // Send to Google Apps Script (no EmailJS)
try {
  await fetch('https://script.google.com/macros/s/AKfycbznYGTUPWd8UVplS7WCIiwIOG7JjOQAuNC1W25d4YRZM0DMGqACA6d6MStuZJqO21oZqA/exec', {
    method: 'POST',
    body: new FormData(form),
    mode: 'no-cors' // avoid browser CORS block
  });

  // We can't read a response in no-cors mode; just show success UI
  showConfirm('✅ Thank you! Your form was submitted.');
  setTimeout(() => {
    form.reset();
    modelPad?.clear();
    guardianPad?.clear?.();
    hideConfirm();
    updateMinorUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 5000);
} catch (err) {
  console.error('Google Script submit failed:', err);
  alert('Submission failed. Please try again.');
}
  }, { capture: true });
});

