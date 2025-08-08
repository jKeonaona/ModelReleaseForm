document.addEventListener("DOMContentLoaded", function () {
  // Elements
  const form = document.getElementById("releaseForm");
  const ageSelect = document.getElementById("ageCheck");
  const guardianSection = document.getElementById("guardianSection");
  const childrenSection = document.getElementById("childrenSection");
  const msg = document.getElementById("confirmationMessage");

  const modelCanvas = document.getElementById("modelSignatureCanvas");
  const guardianCanvas = document.getElementById("guardianSignatureCanvas");
  const modelSigField = document.getElementById("modelSignatureData");
  const guardianSigField = document.getElementById("guardianSignatureData");

  // --- Helpers ---
  function resizeCanvas(canvas) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (!w || !h) return;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
  }

  // Model signature pad (init immediately; canvas is visible)
  resizeCanvas(modelCanvas);
  const modelPad = new SignaturePad(modelCanvas);

  // Guardian signature pad (lazy-init only when section is visible)
  let guardianPad = null;
  function ensureGuardianPad() {
    if (!guardianPad && guardianCanvas) {
      resizeCanvas(guardianCanvas);            // make sure canvas has size
      guardianPad = new SignaturePad(guardianCanvas);
    }
  }

  // Show/hide sections based on age
  function updateMinorUI() {
    const isMinor = ageSelect && ageSelect.value === "no";
    if (guardianSection) guardianSection.style.display = isMinor ? "block" : "none";
    if (childrenSection) childrenSection.style.display = isMinor ? "block" : "none";

    // Initialize guardian pad only after it's visible (next tick so layout applies)
    if (isMinor) setTimeout(ensureGuardianPad, 0);
  }

  if (ageSelect) {
    ageSelect.addEventListener("change", updateMinorUI);
    // Apply on load in case a value is pre-selected
    updateMinorUI();
  }

  // Clear buttons called by HTML onclick
  window.clearModelSig = () => { if (modelPad) modelPad.clear(); };
  window.clearGuardianSig = () => {
    // If user taps clear before we've inited (rare), init first
    if (guardianSection && guardianSection.style.display !== "none") ensureGuardianPad();
    if (guardianPad) guardianPad.clear();
  };

  // Submit: save signatures to hidden inputs, show thank-you, reset
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Capture signatures safely
    modelSigField.value = (modelPad && !modelPad.isEmpty()) ? modelPad.toDataURL() : "";
    guardianSigField.value = (guardianPad && !guardianPad.isEmpty()) ? guardianPad.toDataURL() : "";

    if (msg) {
      msg.textContent = "✅ Thank you! Your form was submitted.";
      msg.style.display = "block";
    }

    // Reset everything after a brief pause
    setTimeout(() => {
      form.reset();
      modelPad && modelPad.clear();
      guardianPad && guardianPad.clear();
      if (msg) msg.style.display = "none";
      // Hide guardian/children again until "No" is selected
      if (guardianSection) guardianSection.style.display = "none";
      if (childrenSection) childrenSection.style.display = "none";
      // Focus the first field
      const first = form.querySelector('input[name="fullName"]');
      if (first) first.focus();
    }, 1200);
  });
});
