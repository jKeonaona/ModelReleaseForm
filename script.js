document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("releaseForm");
  const signaturePad = new SignaturePad(document.getElementById("signature-pad"), {
    backgroundColor: 'rgba(255, 255, 255, 0)',
  });

  // Clear signature
  document.getElementById("clear").addEventListener("click", function () {
    signaturePad.clear();
  });

  // Download PDF
  document.getElementById("download").addEventListener("click", function () {
    window.print();
  });

  // Submit form
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (signaturePad.isEmpty()) {
      alert("Please provide a signature.");
      return;
    }

    const formData = new FormData(form);
    formData.append("signature", signaturePad.toDataURL());

    const entries = {};
    formData.forEach((value, key) => {
      entries[key] = value;
    });

    // Save as JSON blob
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ModelReleaseForm.json";
    a.click();

    // Show thank you message
    const thankYou = document.getElementById("thankYou");
    if (thankYou) {
      thankYou.style.display = "block";
      setTimeout(() => {
        thankYou.style.display = "none";
        form.reset();
        signaturePad.clear();
        window.scrollTo(0, 0);
      }, 5000);
    } else {
      form.reset();
      signaturePad.clear();
      window.scrollTo(0, 0);
    }
  });
});
