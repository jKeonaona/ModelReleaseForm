
const modelSigPad = new SignaturePad(document.getElementById("modelSignatureCanvas"));
const guardianSigPad = new SignaturePad(document.getElementById("guardianSignatureCanvas"));
const form = document.getElementById("releaseForm");

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const confirmation = document.getElementById("confirmationMessage");

  const modelSigImg = modelSigPad.toDataURL();
  const guardianSigImg = guardianSigPad.toDataURL();

  const modelSigImage = document.createElement("img");
  modelSigImage.src = modelSigImg;
  const guardianSigImage = document.createElement("img");
  guardianSigImage.src = guardianSigImg;

  const clone = document.getElementById("form-container").cloneNode(true);
  clone.querySelector("canvas#modelSignatureCanvas").replaceWith(modelSigImage);
  clone.querySelector("canvas#guardianSignatureCanvas").replaceWith(guardianSigImage);

  html2pdf().from(clone).save("Model_Release_Form.pdf");

  confirmation.style.display = "block";
  setTimeout(() => {
    confirmation.style.display = "none";
  }, 5000);
});

function clearModelSig() {
  modelSigPad.clear();
}
function clearGuardianSig() {
  guardianSigPad.clear();
}
