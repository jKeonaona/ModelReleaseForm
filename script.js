document.addEventListener("DOMContentLoaded", function () {
    // Model Signature
    const modelCanvas = document.getElementById("modelSignatureCanvas");
    const modelPad = new SignaturePad(modelCanvas);
    document.getElementById("modelSignatureData").value = "";

    window.clearModelSig = function () {
        modelPad.clear();
        document.getElementById("modelSignatureData").value = "";
    };

    // Guardian Signature
    const guardianCanvas = document.getElementById("guardianSignatureCanvas");
    let guardianPad = null;

    if (guardianCanvas) {
        guardianPad = new SignaturePad(guardianCanvas);
        document.getElementById("guardianSignatureData").value = "";
    }

    window.clearGuardianSig = function () {
        if (guardianPad) {
            guardianPad.clear();
            document.getElementById("guardianSignatureData").value = "";
        }
    };

    // Age check show/hide guardian section
    const ageCheck = document.getElementById("ageCheck");
    const guardianSection = document.getElementById("guardianSection");

    ageCheck.addEventListener("change", function () {
        if (this.value === "no") {
            guardianSection.style.display = "block";
        } else {
            guardianSection.style.display = "none";
        }
    });

    // Form submission
    const form = document.getElementById("releaseForm");
    const confirmation = document.getElementById("confirmationMessage");

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        // Save signatures to hidden fields
        if (!modelPad.isEmpty()) {
            document.getElementById("modelSignatureData").value = modelPad.toDataURL();
        }

        if (guardianPad && !guardianPad.isEmpty()) {
            document.getElementById("guardianSignatureData").value = guardianPad.toDataURL();
        }

        confirmation.textContent = '';
        confirmation.style.display = 'none';

        const formData = new FormData(form);

        try {
            const response = await fetch(
                'https://api.emailjs.com/api/v1.0/email/send-form',
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (response.ok) {
                confirmation.textContent = '✅ Thank you! Your form was submitted successfully.';
                confirmation.style.display = 'block';

                setTimeout(() => {
                    form.reset();
                    confirmation.style.display = 'none';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    modelPad.clear();
                    if (guardianPad) guardianPad.clear();
                }, 5000);
            } else {
                confirmation.textContent = '❌ Something went wrong. Please try again.';
                confirmation.style.display = 'block';
            }
        } catch (error) {
            confirmation.textContent = '⚠ Error submitting form. Please check your internet connection.';
            confirmation.style.display = 'block';
        }
    });
});
