// ===== EMAILJS CONFIG (YOUR VALUES) =====
const EMAILJS_PUBLIC_KEY = 'ZL6bzLecBAW63-WVz';
const EMAILJS_SERVICE_ID = 'service_xpgramm';
const EMAILJS_TEMPLATE_ID = 'template_xsg9cft';

// Load EmailJS SDK without editing index.html
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

  // helpers
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
    if (!signatureDateInput?.value) {
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
    if (!rect.width) return;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(150 * ratio);
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    pad?.clear();
  }

  // signatures
  let modelPad = null;
  let guardianPad = null;

  function initModelPad() {
    const Sig = window.SignaturePad;
    if (!Sig || !modelCanvas) return;
    modelPad = new Sig(modelCanvas, { penColor: '#000' });
    resizeCanvas(modelCanvas, modelPad);
  }
  function initGuardianPad() {
    const Sig = window.SignaturePad;
    if (!Sig || !guardianCanvas) return;
    if (!guardianPad) guardianPad = new Sig(guardianCanvas, { penColor: '#000' });
    resizeCanvas(guardianCanvas, guardianPad);
  }

  initModelPad();

  window.addEventListener('resize', () => {
    if (modelPad) resizeCanvas(modelCanvas, modelPad);
    if (guardianPad && guardianSection?.style.display !== 'none') {
      resizeCanvas(guardianCanvas, guardianPad);
    }
  });

  window.clearModelSig = () => { modelPad?.clear(); };
  window.clearGuardianSig = () => { guardianPad?.clear(); };

  // age toggle
  function updateMinorUI() {
    const isMinor = (ageSelect?.value || '').toLowerCase() === 'no';
    if (guardianSection) guardianSection.style.display = isMinor ? 'block' : 'none';
    if (childrenSection) childrenSection.style.display = isMinor ? 'block' : 'none';
    const gName = form.querySelector('input[name="guardianName"]');
    const gRel  = form.querySelector('input[name="guardianRelationship"]');
    if (gName) gName.required = isMinor;
    if (gRel)  gRel.required  = isMinor;
    if (isMinor) initGuardianPad();
  }
  ageSelect?.addEventListener('change', updateMinorUI);
  updateMinorUI();

  // EmailJS
  try {
    await loadEmailJS();
    if (window.emailjs) {
      window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    } else {
      console.error('EmailJS failed to attach to window');
    }
  } catch (e) {
    console.error('EmailJS load/init failed:', e);
  }

  // submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideConfirm();
    setTodayIfBlank();

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

    try {
      if (!window.emailjs) throw new Error('EmailJS not loaded');
      await window.emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form);

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
      showConfirm('⚠️ Email failed. Check EmailJS keys/service/template and try again.' + reason);
    }
  }, { capture: true });
});
