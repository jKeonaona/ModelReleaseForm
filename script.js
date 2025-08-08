document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("releaseForm");
  const ageSelect = document.getElementById("ageCheck");
  const guardianSection = document.getElementById("guardianSection");
  const childrenSection = document.getElementById("childrenSection");

  const modelCanvas = document.getElementById("modelSignatureCanvas");
  const guardianCanvas = document.getElementById("guardianSignatureCanvas");

  const modelSigField = document.getElementById("modelSignatureData");
  const guardianSigField = document.getElementById("guardianSignatureData");
  const msg = document.getElementById("confirmationMessage");

  let modelPad;
  let guardianPad = null;

  // Resize canvas and initialize signature pad
  function resizeCanvasAndInit(canvas, type) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    if (type === "model") {
      modelPad = new SignaturePad(canvas);
    } else if (type === "guardian") {
      guardianPad = new SignaturePad(canvas);
    }
  }

  // Initialize model signature pad
  resizeCanvasAndInit(modelCanvas, "model");

  ageSelect.addEventListener("change", function () {
    const isMinor = ageSelect.value === "no";
    guardianSection.style.display = isMinor ? "block" : "none";
    childrenSection.style.display = isMinor ? "block" : "none";

    if (isMinor && !guardianPad) {
      // Wait for DOM to apply display: block before resizing
      setTimeout(() => {
        resizeCanvasAndInit(guardianCanvas, "guardian");
      }, 150);
    }
  });

  // Clear signature buttons
  window.clearModelSig = () => modelPad?.clear();
  window.clearGuardianSig = () => guardianPad?.clear();

  // Submit handler
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Capture signatures safely
    try {
      modelSigField.value = modelPad && !modelPad.isEmpty() ? modelPad.toDataURL() : "";
    } catch (err) {
      console.warn("Model signature error:", err);
      modelSigField.value = "";
    }

    try {
      guardianSigField.value = guardianPad && !guardianPad.isEmpty() ? guardianPad.toDataURL() : "";
    } catch (err) {
      console.warn("Guardian signature error:", err);
      guardianSigField.value = "";
    }

    const formData = {
      name: form.elements["fullName"].value || "",
      email: form.elements["email"].value || "",
      phone: form.elements["phone"].value || "",
      date: form.elements["signatureDate"].value || "",
      modelSignature: modelSigField.value,
      guardianSignature: guardianSigField.value
    };

    if (navigator.onLine) {
      fetch("https://script.google.com/macros/s/AKfycbznYGTUPWd8UVplS7WCIiwIOG7JjOQAuNC1W25d4YRZM0DMGqACA6d6MStuZJqO21oZqA/exec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })
      .then(response => response.text())
      .then(result => {
        console.log("Server says:", result);
      })
      .catch(error => {
        console.error("Error:", error);
        alert("There was an issue submitting the form.");
      });
    } else {
      localStorage.setItem("form-Tb", JSON.stringify(formData));
      alert("Offline: Form saved and will send when you're back online.");
    }

    // Show thank-you message
    msg.style.display = "block";
    msg.scrollIntoView({ behavior: "smooth" });

    // Reset form and signature pads after delay
    setTimeout(() => {
      modelPad?.clear();
      guardianPad?.clear();

      form.reset();
      guardianSection.style.display = "none";
      childrenSection.style.display = "none";
      msg.style.display = "none";
    }, 3000);
  });
});

// ✅ Auto-submit saved form when back online
window.addEventListener("online", () => {
  const saved = localStorage.getItem("form-Tb");
  if (saved) {
    fetch("https://script.google.com/macros/s/AKfycbznYGTUPWd8UVplS7WCIiwIOG7JjOQAuNC1W25d4YRZM0DMGqACA6d6MStuZJqO21oZqA/exec", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: saved
    })
    .then(response => response.text())
    .then(result => {
      console.log("Offline-saved form submitted:", result);
      localStorage.removeItem("form-Tb");
      alert("✅ Your previously saved form has now been submitted.");
    })
    .catch(err => {
      console.error("Auto-submit failed:", err);
    });
  }
});
