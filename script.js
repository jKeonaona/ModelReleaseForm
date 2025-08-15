<script>
// ========== WildPx Model Release — SINGLE DROP-IN ==========
// This file is self-contained. It:
// - Makes the signature canvas draw on Chrome + iOS
// - Preserves strokes on resize/orientation
// - Makes the age reveal reliably toggle on "no"
// - Restores TRIPLE-TAP (no long-press) on .logo to toggle #adminBar
// - Wires your existing export buttons (JSON, Export+Clear, CSV, Print)
// - Silently disables any stale service worker so new code actually runs

(() => {
  // Kill stale SW caches so this file really runs (no UI, no prompts)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations?.().then(rs => rs.forEach(r => r.unregister())).catch(()=>{});
  }

  // Prevent double init if the page hot-reloads
  if (window.__WILDPX_LOCK__) return;
  window.__WILDPX_LOCK__ = true;

  document.addEventListener('DOMContentLoaded', () => {
    // ===== Elements (MUST match your HTML) =====
    const banner           = document.getElementById('banner');
    const form             = document.getElementById('releaseForm');

    const ageSelect        = document.getElementById('ageCheck');
    const guardianSection  = document.getElementById('guardianSection');
    const childrenSection  = document.getElementById('childrenSection');

    const signatureLabelEl = document.getElementById('signatureLabel');
    const signatureCanvas  = document.getElementById('signatureCanvas');
    const signatureData    = document.getElementById('signatureData');
    const clearBtn         = document.getElementById('clearSigBtn');
    const signatureDateInp = form?.querySelector('input[name="signatureDate"]');

    const exportAllBtn     = document.getElementById('exportAllBtn');
    const exportClearBtn   = document.getElementById('exportClearBtn');
    const exportCsvBtn     = document.getElementById('exportCsvBtn');
    const printPdfBtn      = document.getElementById('printPdfBtn');
    const savedCountEl     = document.getElementById('savedCount');

    const logo             = document.querySelector('.logo');
    const adminBar         = document.getElementById('adminBar');

    // ===== Tiny helpers =====
    const KEY = 'formEntries';
    const getAll = () => { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } };
    const setAll = (arr) => { localStorage.setItem(KEY, JSON.stringify(arr)); updateSavedCount(); };

    function toast(kind, msg){
      if (!banner) return;
      banner.className = kind;
      banner.textContent = msg || (kind==='ok' ? 'Saved' : 'Error');
      banner.style.display = 'block';
      setTimeout(()=>banner.style.display='none', kind==='ok'?3000:4500);
    }
    const ok  = (m)=>toast('ok', m);
    const err = (m)=>toast('err', m);

    function updateSavedCount(){ if (savedCountEl) savedCountEl.textContent = 'Saved: ' + getAll().length; }
    updateSavedCount();

    // ===== Signature Pad =====
    // Make the canvas actually accept touch and have a visible height
    if (signatureCanvas) {
      signatureCanvas.style.touchAction = 'none';
      if (!signatureCanvas.style.height) signatureCanvas.style.height = '150px';
    }

    let pad = null;
    let lastCssW = 0;

    function resizeCanvasPreserve(canvas, pad){
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.floor(rect.width);
      if (!cssW) return; // hidden or zero width
      if (cssW === lastCssW && pad && !pad.isEmpty()) return;
      lastCssW = cssW;

      const ratio = Math.max(window.devicePixelRatio||1, 1);
      const data  = pad && !pad.isEmpty() ? pad.toData() : null;

      const cssH = Math.floor(parseFloat(getComputedStyle(canvas).height) || 150);
      canvas.width  = Math.floor(cssW * ratio);
      canvas.height = Math.floor(cssH * ratio);

      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      if (pad) {
        pad.clear();
        if (data && data.length) pad.fromData(data);
      }
    }

    function scheduleResize(){
      if (scheduleResize._id) return;
      scheduleResize._id = requestAnimationFrame(()=>{ scheduleResize._id=null; resizeCanvasPreserve(signatureCanvas, pad); });
    }

    function initPad(){
      if (!signatureCanvas) return;
      if (!window.SignaturePad) { err('Signature pad library missing.'); return; }
      if (!pad) {
        pad = new window.SignaturePad(signatureCanvas, { penColor:'#000' });
        pad.onEnd = updateClearState;
        requestAnimationFrame(()=>resizeCanvasPreserve(signatureCanvas, pad));
        updateClearState();
      }
    }

    function updateClearState(){
      if (!clearBtn) return;
      clearBtn.disabled = !pad || pad.isEmpty();
    }

    clearBtn?.addEventListener('click', (e)=>{
      if (!pad || pad.isEmpty()) return;
      e.preventDefault();
      if (confirm('Clear signature?')) { pad.clear(); updateClearState(); }
    });

    initPad();
    window.addEventListener('resize',            scheduleResize);
    window.addEventListener('orientationchange', ()=>setTimeout(scheduleResize, 300));
    window.addEventListener('pageshow',          scheduleResize, { once:true });

    // ===== Age reveal (Yes/No) =====
    function isMinor(){ return String(ageSelect?.value||'').trim().toLowerCase() === 'no'; }

    function updateMinorUI(){
      const minor = isMinor();
      if (guardianSection)  guardianSection.style.display = minor ? 'block' : 'none';
      if (childrenSection)  childrenSection.style.display = minor ? 'block' : 'none';

      const gName = form?.elements['guardianName'];
      const gRel  = form?.elements['guardianRelationship'];
      if (gName) gName.required = minor;
      if (gRel)  gRel.required  = minor;

      if (signatureLabelEl) signatureLabelEl.textContent = minor ? 'Parent/Guardian Signature:' : 'Model Signature:';
      scheduleResize();
    }

    ageSelect?.addEventListener('change', updateMinorUI);
    ageSelect?.addEventListener('input',  updateMinorUI);
    form?.addEventListener('input', (e)=>{ if (e.target === ageSelect) updateMinorUI(); });
    document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) updateMinorUI(); });
    updateMinorUI();

    // ===== Submit (local save only) =====
    function setTodayIfBlank(){
      if (signatureDateInp && !signatureDateInp.value) {
        signatureDateInp.value = new Date().toISOString().slice(0,10);
      }
    }

    form?.addEventListener('submit', (e)=>{
      e.preventDefault();

      const fullName = (form.elements['fullName']?.value || '').trim();
      if (!fullName) { err('Please enter the model’s full name.'); return; }

      if (!ageSelect?.value) { err('Please select Yes/No for age.'); return; }
      const minor = isMinor();

      if (!pad || pad.isEmpty()) { err(minor ? 'Please have the Parent/Guardian sign.' : 'Please sign as the model.'); return; }
      if (minor) {
        const gName = (form.elements['guardianName']?.value || '').trim();
        const gRel  = (form.elements['guardianRelationship']?.value || '').trim();
        if (!gName || !gRel) { err('Guardian Name and Relationship are required.'); return; }
      }

      setTodayIfBlank();
      if (signatureData && pad) signatureData.value = pad.toDataURL('image/jpeg', 0.85);

      const fd   = new FormData(form);
const data = Object.fromEntries(fd.entries());
data.timestamp = new Date().toISOString();

// Capture signature data from canvas
const sigCanvas = document.getElementById('signatureCanvas');
if (sigCanvas) {
  data.signatureImage = sigCanvas.toDataURL('image/jpeg', 0.85);
}

      try { const all = getAll(); all.push(data); setAll(all); }
      catch { err('Could not save locally. Check browser settings.'); return; }

      const holdAge = ageSelect.value;
      form.reset();
      ageSelect.value = holdAge;
      pad.clear();
      updateMinorUI();
      updateClearState();
      window.scrollTo({ top:0, behavior:'smooth' });

      ok('Saved locally. Total: ' + getAll().length);
    }, { capture:true });

    // ===== Admin reveal — TRIPLE TAP ONLY (no long-press) =====
    (function setupTripleTap(){
      if (!logo || !adminBar) return;

      // make sure the logo can receive taps
      logo.style.pointerEvents = 'auto';

      const REQUIRED_TAPS = 3;
      const WINDOW_MS     = 1200;
      let taps=0, firstAt=0, timer=null, lastTouch=0;

      function reset(){ taps=0; firstAt=0; if (timer){ clearTimeout(timer); timer=null; } }
      function toggle(){ adminBar.style.display = (adminBar.style.display==='none'||!adminBar.style.display) ? 'flex' : 'none'; }

      function onTouchEnd(ev){
        ev.preventDefault(); ev.stopPropagation();
        lastTouch = Date.now();
        const now = lastTouch;
        if (!firstAt || (now-firstAt)>WINDOW_MS) { firstAt=now; taps=1; if (timer) clearTimeout(timer); timer=setTimeout(reset, WINDOW_MS+100); }
        else { taps++; }
        if (taps>=REQUIRED_TAPS){ if (timer) clearTimeout(timer); reset(); toggle(); }
      }
      function onClick(ev){
        if (Date.now()-lastTouch < 700) return; // ignore synthetic click after touch
        ev.preventDefault(); ev.stopPropagation();
        const now = Date.now();
        if (!firstAt || (now-firstAt)>WINDOW_MS) { firstAt=now; taps=1; if (timer) clearTimeout(timer); timer=setTimeout(reset, WINDOW_MS+100); }
        else { taps++; }
        if (taps>=REQUIRED_TAPS){ if (timer) clearTimeout(timer); reset(); toggle(); }
      }

      logo.addEventListener('touchend', onTouchEnd, { passive:false });
      logo.addEventListener('click',    onClick,    { passive:false });
    })();

    // ===== Export buttons (manual only) =====
    function downloadJSON(filename, obj){
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type:'application/json' });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 500);
    }
    function toCSV(rows){
      if (!rows.length) return '';
      const headers = Array.from(new Set(rows.flatMap(r=>Object.keys(r))));
      const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
      const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => esc(r[h])).join(',')));
      return lines.join('\n');
    }

    exportAllBtn?.addEventListener('click', ()=>{
      const entries = getAll();
      if (!entries.length){ err('No saved forms to export.'); return; }
      const bundle = { exported_at:new Date().toISOString(), count:entries.length, entries };
      const fn = 'wildpx_releases_' + new Date().toISOString().slice(0,10) + '_n' + entries.length + '.json';
      downloadJSON(fn, bundle); ok('Exported ' + entries.length + ' forms.');
    });

    exportClearBtn?.addEventListener('click', ()=>{
      const entries = getAll();
      if (!entries.length){ err('Nothing to export.'); return; }
      if (!confirm('Export all forms and then clear them from this device?')) return;
      const bundle = { exported_at:new Date().toISOString(), count:entries.length, entries };
      const fn = 'wildpx_releases_' + new Date().toISOString().slice(0,10) + '_n' + entries.length + '.json';
      downloadJSON(fn, bundle);
      localStorage.removeItem(KEY);
      updateSavedCount();
      ok('Exported and cleared.');
    });

    exportCsvBtn?.addEventListener('click', ()=>{
      const entries = getAll();
      if (!entries.length){ err('No saved forms to export.'); return; }
      const csv = toCSV(entries);
      const blob = new Blob([csv], { type:'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='wildpx_releases_' + new Date().toISOString().slice(0,10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 500);
      ok('Exported CSV.');
    });

    printPdfBtn?.addEventListener('click', ()=>{ window.print(); });
  });
})();
</script>

