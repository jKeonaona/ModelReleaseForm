// ===== CONFIG =====
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyCI8ycBdH2xE2ai4GCH2DE5qH8xHe3qu13UwUgeMh8SdcTzrZvCTxNFtEtgOh6qPuRoQ/exec';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('releaseForm');
  // There are TWO #confirmationMessage in your HTML — handle both safely:
  const confirmations = Array.from(document.querySelectorAll('#confirmationMessage'));

  const ageSelect = document.getElementById('ageCheck');
  const guardianSection = document.getElementById('guardianSection');
  const childrenSection = document.getElementById('childrenSection');

  const modelCanvas = document.getElementById('modelSignatureCanvas');
  const guardianCanvas = document.getElementById('guardianSignatureCanvas');

  const modelSigField = document.getElementById('modelSignatureData');
  const guardianSigField = document.getElementById('guardianSignatureData');

  const signatureDateInput = form.querySelector('input[name="signatureDate"]');

  // ===== Helpers =====
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
    canvas.height = Math.floor(150 * ratio); // match CSS height
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    pad?.clear();
  }

  // ===== Signature pads =====
  let modelPad = null;
  let guardianPad = null;

  if (modelCanvas) {
    modelPad = new SignaturePad(modelCanvas, { penColor: '#000' });
    resizeCanvas(modelCanvas, modelPad);
  }

  function ensureGuardianPad() {
    if (!guardianCanvas) return;
    if (!guardianPad) {
      guardianPad = new SignaturePad(guardianCanvas, { penColor: '#000' });
    }
    resizeCanvas(guardianCanvas, guardianPad);
  }

  window.addEventListener('resize', () => {
    if (modelCanvas && modelPad) resizeCanvas(modelCanvas, modelPad);
    if (guardianSection?.style.display !== 'none' && guardianCanvas && guardianPad) {
      resizeCanvas(guardianCanvas, guardianPad);
    }
  });

  // Clear buttons referenced inline in HTML
  window.clearModelSig = () => { modelPad?.clear(); };
  window.clearGuardianSig = () => {
    if (guardianSection?.style.display !== 'none') ensureGuardianPad();
    guardianPad?.clear();
  };

  // ===== Age toggle =====
  function updateMinorUI() {
    const isMinor = (ageSelect?.value || '').toLowerCase() === 'no';
    if (guardianSection) guardianSection.style.display = isMinor ? 'block' : 'none';
    if (childrenSection) childrenSection.style.display = isMinor ? 'block' : 'none';

    // Toggle requireds for guardian fields
    const gName = form.querySelector('input[name="guardianName"]');
    const gRel  = form.querySelector('input[name="guardianRelationship"]');
    if (gName) gName.required = isMinor;
    if (gRel)  gRel.required  = isMinor;

    if (isMinor) ensureGuardianPad();
  }
  ageSelect?.addEventListener('change', updateMinorUI);
  updateMinorUI();

  // ===== Submit (capture phase to suppress any other handlers) =====
  form.addEventListener('submit', async (e) => {
    // Stop any other submit listeners attached elsewhere in the page
    e.preventDefault();
    e.stopImmediatePropagation();

    hideConfirm();
    setTodayIfBlank();

    // Copy signatures to hidden fields (JPEG smaller than PNG)
    if (modelSigField && modelPad) {
      modelSigField.value = modelPad.isEmpty() ? '' : modelPad.toDataURL('image/jpeg', 0.85);
    }
    if (guardianSigField) {
      const needGuardian = guardianSection?.style.display !== 'none';
      guardianSigField.value = (needGuardian && guardianPad && !guardianPad.isEmpty())
        ? guardianPad.toDataURL('image/jpeg', 0.85)
        : '';
    }

    const fd = new FormData(form); // includes headshot file automatically

    try {
      const resp = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: fd });

      if (resp.ok) {
        showConfirm('✅ Thank you! Your form was submitted.');
        setTimeout(() => {
          form.reset();
          modelPad?.clear();
          guardianPad?.clear?.();
          hideConfirm();
          updateMinorUI(); // re-hide sections
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 5000);
      } else {
        let msg = '⚠️ Submission failed. Please try again.';
        try {
          const t = await resp.text();
          if (t) msg = `⚠️ Submission failed: ${t.slice(0, 160)}…`;
        } catch {}
        showConfirm(msg);
      }
    } catch (err) {
      showConfirm('⚠️ Offline or server error. Please reconnect and try again.');
    }
  }, { capture: true }); // capture=true so our handler wins
});
