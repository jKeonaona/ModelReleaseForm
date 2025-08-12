// ===== EMAILJS CONFIG (FILL THESE) =====
const EMAILJS_PUBLIC_KEY = 'HmCo7TY_HYL8r7Buq';
const EMAILJS_SERVICE_ID = 'service_xpgramm';
const EMAILJS_TEMPLATE_ID = 'template_xsg9cft';

// Loads EmailJS SDK without editing index.html
function loadEmailJS() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('EmailJS SDK failed to load'));
    document.head.appendChild(s);
  });
}

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
  await loadEmailJS();
window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });


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
    const gRel  = form.querySelector('input[name="guardianRelationship"]');
    if (gName) gName.required = isMinor;
    if (gRel)  gRel.required  = isMinor;

    if (isMinor) ensureGuardianPad();
  }
  ageSelect?.addEventListener('change', updateMinorUI);
  updateMinorUI();

  // ------- EmailJS init -------
  try {
    await loadEmailJS();
   window.emailjs.init(EMAILJS_PUBLIC_KEY.trim());
  } catch (err) {
    console.error(err);
    // We can still allow local UI to function; submit will show an error if tried.
  }

  // ------- submit via EmailJS -------
  console.log('EmailJS key at runtime:', EMAILJS_PUBLIC_KEY);
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    hideConfirm();
    setTodayIfBlank();

    // Move signatures into hidden fields BEFORE sendForm
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

    // Send the entire form (includes <input type="file" name="headshot">) through EmailJS
  try {
    await fetch('https://script.google.com/macros/s/AKfycbyCI8ycBdH2xE2ai4GCH2DE5qH8xHe3qu13UwUgeMh8SdcTzrZvCTxNFtEtgOh6qPuRoQ/exec
', {
        method: 'POST',
        body: new FormData(form)
    });

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
  console.error('EmailJS error -> status:', err?.status, 'text:', err?.text || err?.message);
  const reason = (err && (err.text || err.message)) ? ` Details: ${err.text || err.message}` : '';
  alert('Email failed.' + reason); // temporary: show exact reason
}
  }, { capture: true });
});











