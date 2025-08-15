<script>
// ========== WildPx Model Release — UI ONLY (no network) ==========
(() => {
  if (window.__WILDPX_LOCK__) return;      // prevent double init if script is re-run
  window.__WILDPX_LOCK__ = true;

  document.addEventListener('DOMContentLoaded', () => {
    const KEY = 'formEntries';
    const DEBUG = false;

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

    // ----- helpers -----
    const log = (...a)=>{ if (DEBUG) console.log('[WildPx]', ...a); };
    function showBanner(kind, msg) {
      if (!banner) return;
      banner.className = kind; // 'ok' or 'err'
      banner.textContent = msg || (kind === 'ok' ? 'Saved' : 'Error');
      banner.style.display = 'block';
      setTimeout(() => (banner.style.display = 'none'), kind === 'ok' ? 3000 : 4500);
    }
    const ok  = (m) => showBanner('ok', m);
    const err = (m) => showBanner('err', m);

    function getAll() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
      catch { return []; }
    }
    function setAll(arr) {
      localStorage.setItem(KEY, JSON.stringify(arr));
      updateSavedCount();
    }
    function updateSavedCount() {
      if (savedCountEl) savedCountEl.textContent = 'Saved: ' + getAll().length;
    }
    updateSavedCount();

    // ----- AGE TOGGLE -----
    function normalizeMinorChoice(val){
      const v = String(val||'').trim().toLowerCase();
      if (v === '' || v === 'select') return null; // untouched
      const minorTokens = new Set(['no','false','0','minor','under','u18','under 18','<18']);
      return minorTokens.has(v);
    }
    function updateMinorUI() {
      if (!(ageSelect && guardianSection && childrenSection && signatureLabelEl)) return;
      const choice = normalizeMinorChoice(ageSelect.value);
      const isMinor = choice === true;

      guardianSection.style.display = isMinor ? 'block' : 'none';
      childrenSection.style.display = isMinor ? 'block' : 'none';

      const gName = form?.elements['guardianName'];
      const gRel  = form?.elements['guardianRelationship'];
      if (gName) gName.required = !!isMinor;
      if (gRel)  gRel.required  = !!isMinor;

      signatureLabelEl.textContent = isMinor ? 'Parent/Guardian Signature:' : 'Model Signature:';
      scheduleResize(); // ensure canvas fits after section show/hide
    }
    ageSelect?.addEventListener('change', updateMinorUI);
    ageSelect?.addEventListener('input',  updateMinorUI);
    form?.addEventListener('input', (e)=>{ if (e.target === ageSelect) updateMinorUI(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) updateMinorUI(); });

    // ----- SIGNATURE PAD -----
    let primaryPad = null;
    let lastCanvasCSSWidth = 0;

    // Force minimal CSS at runtime so you don't need stylesheet edits
    if (signatureCanvas) {
      signatureCanvas.style.width = '100%';
      signatureCanvas.style.height = '150px';
      signatureCanvas.style.border = signatureCanvas.style.border || '1px solid #aaa';
      signatureCanvas.style.borderRadius = signatureCanvas.style.borderRadius || '8px';
      signatureCanvas.style.touchAction = 'none'; // prevents scroll from hijacking touch drawing
    }

    function updateClearState() {
      if (!clearBtn) return;
      clearBtn.disabled = !primaryPad || primaryPad.isEmpty();
    }

    function resizeCanvasPreserve(canvas, pad) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.floor(rect.width);
      if (!cssW) { log('Canvas width 0; skip resize'); return; }
      if (cssW === lastCanvasCSSWidth && pad && !pad.isEmpty()) return; // no change

      lastCanvasCSSWidth = cssW;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad && !pad.isEmpty() ? pad.toData() : null;

      canvas.width  = Math.floor(cssW * ratio);
      canvas.height = Math.floor(150 * ratio);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      if (pad) {
        pad.clear();
        if (data && data.length) pad.fromData(data);
      }
      updateClearState();
    }

    let rAF = null;
    function scheduleResize(){
      if (rAF) return;
      rAF = requestAnimationFrame(() => { rAF = null; resizeCanvasPreserve(signatureCanvas, primaryPad); });
    }

    function bindPadEvents() {
      if (!primaryPad) return;
      primaryPad.onBegin = () => {};
      primaryPad.onEnd   = () => updateClearState();
    }

    function initPrimaryPad() {
      if (!signatureCanvas) return;
      if (!window.SignaturePad) {
        console.error('❌ SignaturePad not found. Include libs/signature_pad.umd.min.js before this script.');
        err('Signature pad library missing.');
        return;
      }
      if (!primaryPad) {
        primaryPad = new window.SignaturePad(signatureCanvas, { penColor: '#000' });
        bindPadEvents();
        requestAnimationFrame(() => resizeCanvasPreserve(signatureCanvas, primaryPad));
        updateClearState();
      }
    }

    // Clear button (long-press clears; click asks confirm)
    let pressTimer = null;
    function startPress(e){ e.preventDefault(); if (clearBtn?.disabled) return;
      pressTimer = setTimeout(() => { primaryPad?.clear(); updateClearState(); }, 600); }
    function cancelPress(){ if (pressTimer){ clearTimeout(pressTimer); pressTimer=null; } }

    clearBtn?.addEventListener('touchstart', startPress, { passive:false });
    clearBtn?.addEventListener('touchend',   cancelPress);
    clearBtn?.addEventListener('touchcancel',cancelPress);
    clearBtn?.addEventListener('mousedown',  startPress);
    clearBtn?.addEventListener('mouseup',    cancelPress);
    clearBtn?.addEventListener('mouseleave', cancelPress);
    clearBtn?.addEventListener('click', (e) => {
      if (!primaryPad?.isEmpty() && pressTimer === null) {
        e.preventDefault();
        if (confirm('Clear signature?')) { primaryPad.clear(); updateClearState(); }
      }
    });
    window.clearPrimarySig = () => { primaryPad?.clear(); updateClearState(); };

    initPrimaryPad();
    updateMinorUI();

    // Handle env changes that used to nuke the pad
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 300));
    window.addEventListener('pageshow', scheduleResize, { once:true });

    // ----- SUBMIT (local-only save) -----
    function setTodayIfBlank() {
      if (signatureDateInput && !signatureDateInput.value) {
        signatureDateInput.value = new Date().toISOString().slice(0, 10);
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

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = (form.elements['fullName']?.value || '').trim();
      if (!fullName) { err('Please enter the model’s full name.'); return; }

      const ageVal  = ageSelect ? String(ageSelect.value || '') : '';
      const minorChoice = normalizeMinorChoice(ageVal);
      if (minorChoice === null) { err('Please select Yes/No for age.'); return; }
      const isMinor = minorChoice === true;

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
      if (signatureData && primaryPad) {
        signatureData.value = primaryPad.toDataURL('image/jpeg', 0.85);
      }

      const fd   = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.timestamp = new Date().toISOString();

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
      updateClearState();

      window.scrollTo({ top: 0, behavior: 'smooth' });
      ok('Saved locally. Total: ' + getAll().length);
    }, { capture: true });

    // ----- ADMIN REVEAL (triple-tap + long-press + Shift+A) -----
    (function setupAdminReveal() {
      const hotspot = document.getElementById('adminHotspot') || document.querySelector('.logo');
      const adminBar = document.getElementById('adminBar');
      if (!hotspot || !adminBar) return;

      // Make sure the hotspot can receive taps even without CSS changes
      Object.assign(hotspot.style, {
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      });

      const REQUIRED_TAPS = 3;
      const WINDOW_MS     = 1200;
      const LONGPRESS_MS  = 700;
      const REQUIRE_PIN   = false;
      const PIN_CODE      = '2468';

      let taps = 0, firstTapAt = 0, timer = null, pressTimer = null, moved = false;

      function resetTapWindow(){ taps=0; firstTapAt=0; if (timer){ clearTimeout(timer); timer=null; } }
      function toggleAdmin(){
        if (REQUIRE_PIN) { const entered = prompt('Enter admin PIN:'); if (entered !== PIN_CODE) return; }
        adminBar.style.display =
          (adminBar.style.display === 'none' || !adminBar.style.display) ? 'flex' : 'none';
      }

      function onEndTap(ev){
        if (ev) { ev.preventDefault(); ev.stopPropagation(); }
        if (moved) { moved=false; return; }
        const now = Date.now();
        if (!firstTapAt || (now - firstTapAt) > WINDOW_MS) {
          firstTapAt = now; taps = 1;
          if (timer) clearTimeout(timer);
          timer = setTimeout(resetTapWindow, WINDOW_MS + 100);
        } else {
          taps++;
        }
        if (taps >= REQUIRED_TAPS) { if (timer) clearTimeout(timer); resetTapWindow(); toggleAdmin(); }
      }

      function startPress(){ moved=false; pressTimer = setTimeout(() => { toggleAdmin(); }, LONGPRESS_MS); }
      function cancelPress(){ if (pressTimer){ clearTimeout(pressTimer); pressTimer=null; } }
      function onMove(){ moved = true; cancelPress(); }

      hotspot.addEventListener('pointerdown', startPress, { passive:true });
      hotspot.addEventListener('pointerup',   (e)=>{ cancelPress(); onEndTap(e); }, { passive:false });
      hotspot.addEventListener('pointercancel', cancelPress);
      hotspot.addEventListener('pointermove', onMove);
      hotspot.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); onEndTap(e); }, { passive:false });

      window.addEventListener('keydown', (e)=>{
        if (e.shiftKey && (e.key === 'A' || e.key === 'a')) { e.preventDefault(); toggleAdmin(); }
      });
    })();

    // ----- EXPORT -----
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
})();
</script>
