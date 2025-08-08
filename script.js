document.addEventListener("DOMContentLoaded", function () {
    const ageCheck = document.getElementById("ageCheck");
    const childrenSection = document.getElementById("childrenSection");
    const guardianSection = document.getElementById("guardianSection");

    const guardianCanvas = document.getElementById("guardianSignatureCanvas");
    const guardianSigPad = new SignaturePad(guardianCanvas);
    const guardianSignatureData = document.getElementById("guardianSignatureData");

    const modelCanvas = document.getElementById("modelSignatureCanvas");
    const modelSigPad = new SignaturePad(modelCanvas);
    const modelSignatureData = document.getElementById("modelSignatureData");

    // Show/hide guardian section
    ageCheck.addEventListener("change", function () {
        if (this.value === "no") {
            guardianSection.style.display = "block";
            childrenSection.style.display = "block";
        } else {
            guardianSection.style.display = "none";
            childrenSection.style.display = "none";
        }
    });

    // Clear guardian signature
    window.clearGuardianSig = function () {
        guardianSigPad.clear();
        guardianSignatureData.value = "";
    };

    // Clear model signature
    window.clearModelSig = function () {
        modelSigPad.clear();
        modelSignatureData.value = "";
    };

    // On form submit — save signatures to hidden inputs
    document.getElementById("releaseForm").addEventListener("submit", function (e) {
        e.preventDefault();

        if (!modelSigPad.isEmpty()) {
            modelSignatureData.value = modelSigPad.toDataURL();
        }

        if (!guardianSigPad.isEmpty()) {
            guardianSignatureData.value = guardianSigPad.toDataURL();
        }

        this.submit();
    });
});
