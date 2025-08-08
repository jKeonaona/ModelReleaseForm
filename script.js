document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("releaseForm");
  const signatureCanvas = document.getElementById("signature-pad");
  const signaturePad = new SignaturePad(signatureCanvas, {
    backgroundColor: 'rgba(255, 255, 255, 0)'
  });

  const clearButton = document.getElementById("clear");
  const downloadButton = document.getElementById("download");

  clearButton.addEventListener("click", function () {
    signaturePad.clear();
  });

  downloadButton.addEventListener("click", function () {
    window.print();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (signaturePad.isEmpty()) {
      alert("Please provide a signature.");
      return;
    }

    const formData = new FormData(form);
    formData.append("signature", signaturePad.toDataURL());

    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ModelReleaseForm.json";
    a.click();

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
