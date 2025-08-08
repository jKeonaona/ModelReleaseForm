window.addEventListener("load", () => {
  const form = document.getElementById("releaseForm");
  const confirmation = document.getElementById("confirmationMessage");

  const modelSigPad = new SignaturePad(document.getElementById("modelSignatureCanvas"));
  const guardianSigPad = new SignaturePad(document.getElementById("guardianSignatureCanvas"));

  // Show guardian section if user is under 18
  const ageCheck = document.getElementById("ageCheck");
  const childrenSection = document.getElementById("childrenSection");
  const guardianSection = document.getElementById("guardianSection");

  ageCheck.addEventListener("change", () => {
    const under18 = ageCheck.value === "no";
    childrenSection.style.display = under18 ? "block" : "none";
    guardianSection.style.display = under18 ? "block" : "none";
  });

  // Clear signature buttons
  window.clearModelSig = () => modelSigPad.clear();
  window.clearGuardianSig = () => guardianSigPad.clear();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    try {
      const modelSigData = modelSigPad.isEmpty() ? "" : modelSigPad.toDataURL();
      const guardianSigData = guardianSigPad.isEmpty() ? "" : guardianSigPad.toDataURL();

      document.getElementById("modelSignatureData").value = modelSigData;
      document.getElementById("guardianSignatureData").value = guardianSigData;

      // Just show confirmation message, no fetch or backend
      confirmation.textContent = "✅ Thank you! Your form was submitted.";
      confirmation.style.display = "block";

      setTimeout(() => {
        form.reset();
        confirmation.style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 5000);
    } catch (error) {
      confirmation.textContent = "❌ Error during form submission.";
      confirmation.style.display = "block";
      console.error("Submission error:", error);
    }
  });
});
