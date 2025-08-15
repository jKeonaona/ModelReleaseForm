<script>
// ========== WildPx Model Release — UI ONLY (no network) ==========
(() => {
  // prevent double init if script is injected twice
  if (window.__WILDPX_LOCK__) return; window.__WILDPX_LOCK__ = true;

  document.addEventListener('DOMContentLoaded', () => {
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

    // ===== Banners =====
    function showBanner(kind, msg){
      if (!banner) return;
      banner.className = kind; // 'ok' | 'err'
      banner.textContent = msg || (kind === 'ok' ? 'Saved' : 'Error');
      banner.style.display = 'block';
      setTimeout(() => banner.style.display = 'none', kind === 'ok' ? 3000 : 4500);
    }
    const ok  = (m)=>showBanner('ok',  m);
    const err = (m)=>showBanner('err', m);

    // ===== Signature Pad =====
    let primaryPad = null;
    let lastCanvasCSSWidth = 0;

    // Ensure touch drawing (no page scroll) — runtime style only
    if (signatureCanvas) {
      signatureCanvas.style.touchAction = 'none';
      // Give the canvas a reliable CSS height if none was set
      if (!signatureCanvas.style.height) signatureCanvas.style.height = '150px';
    }

    function updateClearState(){
      if (!clearBtn) return;
      clearBtn.disabled = !primaryPad || primaryPad.isEmpty();
    }

    // Resize WITHOUT losing strokes
    function resizeCanvasPreserve(canvas, pad){
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.floor(rect.width);
      if (!cssW) return;                               // hidden or 0 width
      if (cssW === lastCanvasCSSWidth && pad && !pad.isEmpty()) return; // no change
      lastCanvasCSSWidth = cssW;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data  = pad && !pad.isEmpty() ? pad.toData() : null;

      canvas.width  = Math.floor(cssW * ratio);
      // Keep in sync with CSS height (150px default)
      const cssH = Math.floor(parseFloat(getComputedStyle(canvas).height) || 150);
      canvas.height = Math.floor(cssH * ratio);

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
      rAF = requestAnimationFrame(()=>{ rAF = null; resizeCanvasPreserve(signatureCanvas, primaryPad); });
    }

    function initPrimaryPad(){
      if (!signatureCanvas) return;
      if (!window.SignaturePad) {
        console.error('❌ SignaturePad library missing');
        err('Signature pad not loaded.');
        return;
      }
      if (!primaryPad) {
        primaryPad = new window.SignaturePad(signatureCanvas, { penColor:'#000' });
        primaryPad.onEnd = updateClearState;
        requestAnimationFrame(()=>resizeCanvasPreserve(signatureCanvas, primaryPad));
        updateClearState();
      }
    }

    // Clear button (NO long-press; iOS context menu stays untouched)
    clearBtn?.addEventListener('click', (e)=>{
      if (!primaryPad || primaryPad.isEmpty()) return;
      e.preventDefault();
      if (confirm('Clear signature?')) { primaryPad.clear(); updateClearState(); }
    });

    initPrimaryPad();

    // Keep pad intact on env changes
    window.addEventListener('resize',            scheduleResize);
    window.addEventListener('orientationchange', ()=>setTimeout(scheduleResize, 300));
    window.addEventListener('pageshow',          scheduleResize, { once:true });

    // ===== Age Reveal =====
    // Treat ONLY explicit "no" (case-insensitive) as minor; everything else = not minor
    function isMinorValue(v){ return String(v||'').trim().toLowerCase() === 'no'; }

    function updateMinorUI(){
      if (!(ageSelect && guardianSection && childrenSection && signatureLabelEl)) return;

      const isMinor = isMinorValue(ageSelect.value);

      guardianSection.style.display = isMinor ? 'block' : 'none';
      childrenSection.style.display = isMinor ? 'block' : 'none';

      const gName = form?.elements['guardianName'];
      const gRel  = form?.elements['guardianRelationship'];
      if (gName) gName.required = isMinor;
      if (gRel)  gRel.required  = isMinor;

      signatureLabelEl.textContent = isMinor ? 'Parent/Guardian Signature:' : 'Model Signature:';

      scheduleResize(); // if layout shifted, keep canvas correct
    }

    // Primary listeners
    ageSelect?.addEventListener('change', updateMinorUI);
    ageSelect?.addEventListener('input',  updateMinorUI);
    // Fallback if browser swallows select event
    form?.addEventListener('input', (e)=>{ if (e.target === ageSelect) updateMinorUI(); });
    // Restore UI on tab return / iOS PWA resume
    document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) updateMinorUI(); });

    updateMinorUI();

    // ===== Submit (local save only) =====
    function setTodayIfBlank(){
      if (signatureDateInput && !signatureDateInput.value) {
        signatureDateInput.value = new Date().toISOString().slice(0,10);
      }
    }

    function getAll(){
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
    }
    function setAll(arr){
      localStorage.setItem(KEY, JSON.stringify(arr));
      if (savedCountEl) savedCountEl.textContent = 'Saved: ' + arr.length;
    }
    if (savedCountEl) savedCountEl.textContent = 'Saved: ' + getAll().length;

    function fileToDataURL(file){
      return new Promise((resolve, reject)=>{
        const r = new FileReader();
        r.onload = ()=>resolve(r.result);
        r.onerror = ()=>reject(r.error);
        r.readAsDataURL(file);
      });
    }

    form?.addEventListener('submit', async (e)=>{
      e.preventDefault();

      const fullName = (form.elements['fullName']?.value || '').trim();
      if (!fullName) { err('Please enter the model’s full name.'); return; }

      const isMinor = isMinorValue(ageSelect ? ageSelect.value : '');
      if (ageSelect && !ageSelect.value) { err('Please select Yes/No for age.'); return; }

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
          if (file.size <= 300000) data.headshotDataURL = await fileToDataURL(file);
          else data.headshotNote = 'Headshot present but large; not saved inline (' + file.size + ' bytes)';
        } catch {
          data.headshotNote = 'Headshot present but could not be read';
        }
      }

      try {
        const all = getAll(); all.push(data); setAll(all);
      } catch {
        err('Could not save locally. Check browser settings.');
        return;
      }

      const ageValBeforeReset = ageSelect?.value;
      form.reset();
      if (ageSelect && ageValBeforeReset != null) ageSelect.value = ageValBeforeReset;
      primaryPad?.clear();
      updateMinorUI();
      updateClearState();

      window.scrollTo({ top:0, behavior:'smooth' });
      ok('Saved locally. Total: ' + getAll().length);
    }, { capture:true });

    // ===== Admin reveal — TRIPLE TAP ONLY (no long-press) =====
    (function setupTripleTap() {
      const logo = document.querySelector('.logo');
      const adminBar = document.getElementById('adminBar');
      if (!logo || !adminBar) return;

      const REQUIRED_TAPS = 3;
      const WINDOW_MS     = 1200;

      let taps = 0;
      let firstAt = 0;
      let timer = null;
      let lastTouchAt = 0;

      function resetWindow(){
        taps = 0; firstAt = 0;
        if (timer) { clearTimeout(timer); timer = null; }
      }
      function toggleAdmin(){
        adminBar.style.display =
          (adminBar.style.display === 'none' || !adminBar.style.display) ? 'flex' : 'none';
      }

      // Use touchend primarily to avoid iOS double-tap quirks; click is a fallback only
      function onTouchEnd(ev){
        ev.preventDefault(); ev.stopPropagation();
        lastTouchAt = Date.now();

        const now = lastTouchAt;
        if (!firstAt || (now - firstAt) > WINDOW_MS) {
          firstAt = now; taps = 1;
          if (timer) clearTimeout(timer);
          timer = setTimeout(resetWindow, WINDOW_MS + 100);
        } else {
          taps++;
        }
        if (taps >= REQUIRED_TAPS) { if (timer) clearTimeout(timer); resetWindow(); toggleAdmin(); }
      }

      function onClick(ev){
        // Ignore the synthetic click that follows a touch on iOS
        if (Date.now() - lastTouchAt < 700) return;
        ev.preventDefault(); ev.stopPropagation();

        const now = Date.now();
        if (!firstAt || (now - firstAt) > WINDOW_MS) {
          firstAt = now; taps = 1;
          if (timer) clearTimeout(timer);
          timer = setTimeout(resetWindow, WINDOW_MS + 100);
        } else {
          taps++;
        }
        if (taps >= REQUIRED_TAPS) { if (timer) clearTimeout(timer); resetWindow(); toggleAdmin(); }
      }

      logo.addEventListener('touchend', onTouchEnd, { passive:false });
      logo.addEventListener('click',    onClick,    { passive:false });
    })();

    // ===== Export buttons you already have =====
    function downloadJSON(filename, obj) {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }
    exportAllBtn?.addEventListener('click', () => {
      const entries = (function(){ try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } })();
      if (!entries.length) { err('No saved forms to export.'); return; }
      const bundle = { exported_at: new Date().toISOString(), count: entries.length, entries };
      const fn = 'wildpx_releases_' + new Date().toISOString().slice(0,10) + '_n' + entries.length + '.json';
      downloadJSON(fn, bundle);
      ok('Exported ' + entries.length + ' forms.');
    });
    exportClearBtn?.addEventListener('click', () => {
      const entries = (function(){ try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } })();
      if (!entries.length) { err('Nothing to export.'); return; }
      if (!confirm('Export all forms and then clear them from this device?')) return;
      const bundle = { exported_at: new Date().toISOString(), count: entries.length, entries };
      const fn = 'wildpx_releases_' + new Date().toISOString().slice(0,10) + '_n' + entries.length + '.json';
      downloadJSON(fn, bundle);
      localStorage.removeItem(KEY);
      if (savedCountEl) savedCountEl.textContent = 'Saved: 0';
      ok('Exported and cleared.');
    });
  });
})();
</script>
