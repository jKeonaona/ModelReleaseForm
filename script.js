<script>
// ========== WildPx Model Release — UI ONLY (no network) ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ script.js DOMContentLoaded running');

  // ----- storage key -----
  const KEY = 'formEntries';

  // ----- elements -----
  const banner             = document.getElementById('banner');
  const form               = document.getElementById('releaseForm');

  const ageSelect          = document.getElementById('ageCheck');
  const guardianSection    = document.getElementById('guardianSection');
  const childrenSection    = document.getElementById('childrenSection');

  const signatureLabelEl   = document.getElementById('signatureLabel');
  const signatureCanvas    = document.getElementById('signatureCanvas');
  const signatureData      = document.getElementById('signatureData');
  const signatureDateInput = form ? form.querySelector('input[name="signatureDate"]') : null;

  const exportAllBtn       = document.getElementById('exportAllBtn');
  const exportClearBtn     = document.getElementById('exportClearBtn');
  const savedCountEl       = document.getElementById('savedCount');
  const clearBtn           = document.getElementById('clearSigBtn');

  // ---- guard rails / fast fail logs ----
  function need(id, el){ if(!el){ console.warn(`⚠️ Missing #${id} in HTML`);} return !!el; }
  need('releaseForm', form);
  need('ageCheck', ageSelect);
  need('guardianSection', guardianSection);
  need('childrenSection', childrenSection);
  need('signatureLabel', signatureLabelEl);
  need('signatureCanvas', signatureCanvas);
  need('signatureData', signatureData);

  // ----- banner helpers -----
  function showBanner(kind, msg) {
    if (!banner) return;
    banner.className = kind; // 'ok' or 'err'
    banner.textContent = msg || (kind === 'ok' ? 'Saved' : 'Error');
    banner.style.display = 'block';
    setTimeout(() => (banner.style.display = 'none'), kind === 'ok' ? 4000 : 5000);
  }
  const ok  = (m) => showBanner('ok', m);
  const err = (m) => showBanner('err', m);

  // ----- signature pad (single, shared) -----
  let primaryPad = null;

  function updateClearState() {
    if (!clearBtn) return;
    clearBtn.disabled = !primaryPad || primaryPad.isEmpty();
  }

  function resizeCanvas(canvas, pad) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect  = canvas.getBoundingClientRect();
    if (!rect.width) return; // avoid zero width
    canvas.width  = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(150 * ratio); // CSS height should be 150px
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    pad?.clear?.();
  }

  function bindPadEvents() {
    if (!primaryPad) return;
    primaryPad.onBegin = () => {};
    primaryPad.onEnd   = () => updateClearState();
  }

  function initPrimaryPad() {
    if (!signatureCanvas) return;
    if (!window.SignaturePad) {
      console.error('❌ SignaturePad library not found. Include signature_pad.min.js before this script.');
      return;
    }
    if (!primaryPad) {
      primaryPad = new window.SignaturePad(signatureCanvas, { penColor: '#000' });
      bindPadEvents();
      // first layout pass
      requestAnimationFrame(() => resizeCanvas(signatureCanvas, primaryPad));
      updateClearState();
    }
  }

  // Clear button: long-press to clear; click asks confirm
  let pressTimer = null;
  function startPressTimer(e){
    e.preventDefault();
    if (clearBtn?.disabled) return;
    pressTimer = setTimeout(() => { primaryPad?.clear(); updateClearState(); }, 600);
  }
  function cancelPressTimer(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } }

  clearBtn?.addEventListener('touchstart', startPressTimer, { passive: false });
  clearBtn?.addEventListener('touchend',   cancelPressTimer);
  clearBtn?.addEventListener('touchcancel',cancelPressTimer);
  clearBtn?.addEventListener('mousedown',  startPressTimer);
  clearBtn?.addEventListener('mouseup',    cancelPressTimer);
  clearBtn?.addEventListener('mouseleave', cancelPressTimer);
  clearBtn?.addEventListener('click', (e) => {
    if (!primaryPad?.isEmpty() && pressTimer === null) {
      e.preventDefault();
      if (confirm('Clear signature?')) { primaryPad.clear(); updateClearState(); }
    }
  });

  // Fallback for HTML onclick if present
  window.clearPrimarySig = () => { primaryPad?.clear(); updateClearState(); };

  initPrimaryPad();
  window.addEventListener('resize', () => requestAnimationFrame(() => resizeCanvas(signatureCanvas, primaryPad)));
  window.addEventListener('orientationchange', () =>
    setTimeout(() => resizeCanvas(signatureCanvas, primaryPad), 350)
  );

  // ----- age toggle -----
  function normalizeMinorChoice(val){
    const v = String(val||'').trim().toLowerCase();
    // treat these as MINOR
    const minorTokens = new Set(['no','false','0','minor','under','u18','under 18','<18']);
    return minorTokens.has(v);
  }

  function updateMinorUI() {
    if (!(ageSelect && guardianSection && childrenSection && signatureLabelEl)) return;

    const isMinor = normalizeMinorChoice(ageSelect.value);

    guardianSection.style.display = isMinor ? 'block' : 'none';
    childrenSection.style.display = isMinor ? 'block' : 'none';

    const gName = form?.elements['guardianName'];
    const gRel  = form?.elements['guardianRelationship'];
    if (gName) gName.required = isMinor;
    if (gRel)  gRel.required  = isMinor;

    signatureLabelEl.textContent = isMinor ? 'Parent/Guardian Signature:' : 'Model Signature:';

    // If sections just appeared, ensure canvas sizing is still valid
    requestAnimationFrame(() => resizeCanvas(signatureCanvas, primaryPad));
  }

  ageSelect?.addEventListener('change', updateMinorUI);
  ageSelect?.addEventListener('input',  updateMinorUI);
  updateMinorUI();

  // ----- small utils -----
  function setTodayIfBlank() {
    if (signatureDateInput && !signatureDateInput.value) {
      signatureDateInput.value = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    }
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  // ----- local storage helpers -----
  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }
  function setAll(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
    updateSavedCount();
  }
  function updateSavedCount() {
    if (!savedCountEl) return;
    const n = getAll().length;
    savedCountEl.textContent = 'Saved: ' + n;
  }
  updateSavedCount();

  // ----- submit (save locally only) -----
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = (form.elements['fullName']?.value || '').trim();
    if (!fullName) { err('Please enter the model’s full name.'); return; }

    const ageVal  = ageSelect ? String(ageSelect.value || '') : '';
    const isMinor = normalizeMinorChoice(ageVal);
    if (!ageVal) { err('Please select Yes/No for age.'); return; }

    if (!primaryPad || primaryPad.isEmpty()) {
      err(isMinor ? 'Please have the Parent/Guardian sign.' : 'Please sign as the model.');
      return;
    }

    if (isMinor) {
      const gName = (form.elements['guardianName']?.value || '').trim();
      const gRel  = (form.elements['guardianRelationship']?.value || '').trim();
      if (!gName || !gRel) { err('Guardian Name and Relationship are required.'); return; }
    }

    setTodayIfBlank();

    // capture signature image into hidden input
    if (signatureData && primaryPad) {
      signatureData.value = primaryPad.toDataURL('image/jpeg', 0.85);
    }

    // collect fields
    const fd   = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    data.timestamp = new Date().toISOString();

    // optional headshot embed (small files)
    const file = form.elements['headshot']?.files?.[0];
    if (file) {
      try {
        if (file.size <= 300000) {
          data.headshotDataURL = await fileToDataURL(file);
        } else {
          data.headshotNote = 'Headshot present but large; not saved inline (' + file.size + ' bytes)';
        }
      } catch {
        data.headshotNote = 'Headshot present but could not be read';
      }
    }

    // store
    try {
      const all = getAll();
      all.push(data);
      setAll(all);
    } catch {
      err('Could not save locally. Check browser settings.');
      return;
    }

    // reset for next signer — keep age choice sticky
    const ageValBeforeReset = ageSelect?.value;
    form.reset();
    if (ageSelect && ageValBeforeReset != null) ageSelect.value = ageValBeforeReset;
    primaryPad?.clear();
    updateMinorUI();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    ok('Saved locally. Total: ' + getAll().length);
  }, { capture: true });

  // ----- secure admin bar reveal: triple-tap + optional PIN -----
  (function setupAdminReveal() {
    const logo = document.querySelector('.logo');
    const adminBar = document.getElementById('adminBar');
    if (!logo || !adminBar) return;

    const REQUIRED_TAPS = 3;
    const WINDOW_MS     = 1200;
    const REQUIRE_PIN   = false;
    const PIN_CODE      = '2468';

    let taps = 0, firstTapAt = 0, timer = null;

    function reset(){ taps=0; firstTapAt=0; if(timer){clearTimeout(timer); timer=null;} }
    function toggleAdmin(){
      if (REQUIRE_PIN) { const entered = prompt('Enter admin PIN:'); if (entered !== PIN_CODE) return; }
      adminBar.style.display =
        (adminBar.style.display === 'none' || !adminBar.style.display) ? 'flex' : 'none';
    }
    function handleTap(ev){
      ev.preventDefault(); ev.stopPropagation();
      const now = Date.now();
      if (!firstTapAt || (now - firstTapAt) > WINDOW_MS) {
        firstTapAt = now; taps = 1;
        if (timer) clearTimeout(timer);
        timer = setTimeout(reset, WINDOW_MS + 100);
      } else { taps++; }
      if (taps >= REQUIRED_TAPS) { if (timer) clearTimeout(timer); reset(); toggleAdmin(); }
    }
    logo.addEventListener('touchend', handleTap, { passive: false });
    logo.addEventListener('click',    handleTap, { passive: false });
  })();

  // ----- export helpers -----
  function downloadJSON(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  exportAllBtn?.addEventListener('click', () => {
    const entries = getAll();
    if (!entries.length) { err('No saved forms to export.'); return; }
    const bundle = { exported_at: new Date().toISOString(), count: entries.length, entries };
    const fn = 'wildpx_releases_' + new Date().toISOString().slice(0,10) + '_n' + entries.length + '.json';
    downloadJSON(fn, bundle);
    ok('Exported ' + entries.length + ' forms.');
  });

  exportClearBtn?.addEventListener('click', () => {
    const entries = getAll();
    if (!entries.length) { err('Nothing to export.'); return; }
    if (!confirm('Export all forms and then clear them from this device?')) return;
    const bundle = { exported_at: new Date().toISOString(), count: entries.length, entries };
    const fn = 'wildpx_releases_' + new Date().toISOString().slice(0,10) + '_n' + entries.length + '.json';
    downloadJSON(fn, bundle);
    localStorage.removeItem(KEY);
    updateSavedCount();
    ok('Exported and cleared.');
  });
});
</script>
