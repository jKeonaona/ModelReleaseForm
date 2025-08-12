// ===== EMAILJS CONFIG (YOUR VALUES) =====
const EMAILJS_PUBLIC_KEY = 'ZL6bzLecBAW63-WVz';
const EMAILJS_SERVICE_ID = 'service_xpgramm';
const EMAILJS_TEMPLATE_ID = 'template_xsg9cft';

// Load EmailJS SDK without editing index.html
async function loadEmailJS() {
  // Try jsdelivr, then fallback to EmailJS CDN
  function inject(src) {
    return new Promise((resolve, reject) => {
      if (window.emailjs) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }
  try {
    await inject('https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js');
  } catch {
    await inject('https://cdn.emailjs.com/dist/email.min.js');
  }
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
  // Do NOT prefill on page load. Only set if user left it empty at submit.
  if (!signatureDateInput || signatureDateInput.value) return;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  signatureDateInput.value = today;
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

 // submit  (REPLACE YOUR WHOLE SUBMIT BLOCK WITH THIS)
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  console.log('[Submit] handler started');

  hideConfirm();

  // If date is empty, set it to today (YYYY-MM-DD) right now
  if (signatureDateInput && !signatureDateInput.value) {
    const today = new Date().toISOString().slice(0, 10);
    signatureDateInput.value = today;
  }

  // Capture signatures into hidden fields (JPEG is smaller)
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

  // Prevent double-submits
  const btn = form.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    if (!window.emailjs) throw new Error('EmailJS not loaded');
    console.log('[Submit] EmailJS ready?', typeof window.emailjs, window.emailjs && window.emailjs.__version);

    await window.emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form);

    console.log('[Submit] sendForm success');
    showConfirm('✅ Thank you! Your form was submitted.');

    setTimeout(() => {
      form.reset();
      modelPad?.clear();
      guardianPad?.clear?.();
      hideConfirm();
      updateMinorUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 4000);
  } catch (err) {
    console.error('EmailJS error -> status:', err?.status, 'text:', err?.text || err?.message);
    const reason = (err && (err.text || err.message)) ? ` Details: ${err.text || err.message}` : '';
    showConfirm('⚠️ Email failed. ' + reason);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
  }
}, { capture: true });
