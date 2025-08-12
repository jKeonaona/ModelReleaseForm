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

  // --- helpers ---
  function showConfirm(text) {
    confirmations.forEach(el => {
      el.textContent = text || '✅ Thank you! Your form was submitted.';
      el.style.display = 'block';
    });
  }
  function hideConfirm() {
    confirmations.forEach(el => { el.style.display = 'none'; el.textContent = ''; });
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
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(150 * ratio); // match CSS height
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    pad?.clear();
  }

  // --- signature pads ---
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

  // Clear buttons used in HTML
  window.clearModelSig = () => { modelPad?.clear(); };
  window.clearGuardianSig = () => { if (guardianSection?.style.display !== 'none') ensureGuardianPad(); guardianPad?.clear(); };

  // --- age toggle ---
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
  ageSelect?.addEv
