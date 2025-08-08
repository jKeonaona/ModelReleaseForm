document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("releaseForm");
  const ageSelect = document.getElementById("ageCheck");
  const guardianSection = document.getElementById("guardianSection");
  const childrenSection = document.getElementById("childrenSection");
  const msg = document.getElementById("confirmationMessage");

  // Setup signature pads
  const modelCanvas = document.getElementById("modelSignatureCanvas");
  const guardianCanvas = document.getElementById("guardianSignatureCanvas");

  function initPad(canvas) {
    if (!canvas) return null;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    return new SignaturePad(canvas);
  }

  const modelPad = initPad(modelCanvas);
  const guardianPad = initPad(guardianCanvas);

  // Age -> show/hide guardian + children sections
  if (ageSelect) {
    ageSelect.addEventListener("change", function () {
      const isMinor = ageSelect.value === "no";
      if (guardianSection) guardianSection.style.display = isMinor ? "block" : "none";
      if (childrenSection) childrenSection.style.display = isMinor ? "block" : "none";
    });
  }

  // Clear buttons used by HTML onclick
  window.clearModelSig = () => modelPad && modelPad.clear();
  window.clearGuardianSig = () => guardianPad && guardianPad.clear();

  // --- EmailJS offline queue ---
  const QUEUE_KEY = "emailjs-queue";
  function enqueue(payload) {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    q.push(payload);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  }
  async function flushQueue() {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    if (!q.length) return;
    const remaining = [];
    for (const payload of q) {
      try {
        await emailjs.send("service_xpgramm", "template_xsg9cft", payload);
      } catch (e) {
        remaining.push(payload);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  }
  window.addEventListener("online", flushQueue);

  // Submit -> EmailJS
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const get = (name) => (form.elements[name] ? form.elements[name].value : "");

    const params = {
      // recipient (your EmailJS template should use {{user_email}})
      user_email: get("email"),

      // contact details
      fullName: get("fullName"),
      email: get("email"),
      phone: get("phone"),
      address1: get("address1"),
      address2: get("address2"),
      city: get("city"),
      state: get("state"),
      zip: get("zip"),

      // age/children/guardian
      ageCheck: get("ageCheck"),
      additionalChildren: get("additionalChildren"),
      guardianName: get("guardianName"),
      guardianRelationship: get("guardianRelationship"),

      // signatures (base64 images)
      model_signature: modelPad && !modelPad.isEmpty() ? modelPad.toDataURL() : "",
      guardian_signature: guardianPad && !guardianPad.isEmpty() ? guardianPad.toDataURL() : "",

      // date
      signatureDate: get("signatureDate"),
    };

    function showThankYouAndReset() {
      if (msg) {
        msg.textContent = "✅ Thank you! Your form has been sent (or queued if offline).";
        msg.style.display = "block";
      }
      setTimeout(() => {
        form.reset();
        modelPad && modelPad.clear();
        guardianPad && guardianPad.clear();
        if (msg) msg.style.display = "none";
        const first = form.querySelector('input[name="fullName"]');
        if (first) first.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 1200);
    }

    try {
      if (navigator.onLine) {
        await emailjs.send("service_xpgramm", "template_xsg9cft", params);
      } else {
        enqueue(params);
      }
      showThankYouAndReset();
    } catch (err) {
      console.error("Email send failed:", err);
      enqueue(params);
      if (msg) {
        msg.textContent =
          "⚠️ Network issue. Your form is saved and will send automatically when you're back online.";
        msg.style.display = "block";
      }
    }
  });

  // Try to send any queued submissions now
  flushQueue();
});
