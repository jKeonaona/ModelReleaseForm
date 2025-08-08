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
    if (this.value.toLowerCase() === "no") {
        guardianSection.style.display = "";
        childrenSection.style.display = "";
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

 window.addEventListener('DOMContentLoaded', () => {
  console.log('[FormWire] DOM ready');

  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyCI8ycBdH2xE2ai4GCH2DE5qH8xHe3qu13UwUgeMh8SdcTzrZvCTxNFtEtgOh6qPuRoQ/exec';
  const QUEUE_KEY = 'releaseFormQueue_v1';

  const form = document.getElementById('releaseForm');
  console.log('[FormWire] form found?', !!form);
  if (!form) return; // stops if wrong id

  function enqueue(obj){ const q=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]'); q.push(obj); localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
  async function flushQueue(){
    const q=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]'); if(!q.length) return;
    const keep=[]; for(const item of q){ try{ const fd=new FormData(); for(const [k,v] of Object.entries(item)) fd.append(k,v);
      const r=await fetch(ENDPOINT,{method:'POST',body:fd}); if(!r.ok) throw new Error(r.status);
    }catch{ keep.push(item);} }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(keep));
  }
  window.addEventListener('online', flushQueue);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[FormWire] submit intercepted');

    // Capture signatures to hidden inputs (if present)
    const modelHidden = document.getElementById('modelSignatureData');
    if (window.modelSigPad && !modelSigPad.isEmpty()) {
      modelHidden && (modelHidden.value = modelSigPad.toDataURL('image/jpeg', 0.85));
    }
    const guardianHidden = document.getElementById('guardianSignatureData');
    const guardianSection = document.getElementById('guardianSection');
    if (guardianSection && guardianSection.style.display !== 'none' && window.guardianSigPad && !guardianSigPad.isEmpty()) {
      guardianHidden && (guardianHidden.value = guardianSigPad.toDataURL('image/jpeg', 0.85));
    }

    // Build payload + POST
    const fd = new FormData(form);
    const payloadObj = Object.fromEntries(fd.entries());

    try {
      const resp = await fetch(ENDPOINT, { method: 'POST', body: fd });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      console.log('[FormWire] POST ok');

      // your success UI
      form.reset();
      window.modelSigPad?.clear?.(); window.guardianSigPad?.clear?.();
    } catch (err) {
      console.warn('[FormWire] POST failed, queued', err);
      enqueue(payloadObj);
      form.reset();
      window.modelSigPad?.clear?.(); window.guardianSigPad?.clear?.();
    }
  });

  flushQueue();
});
