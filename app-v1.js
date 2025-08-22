<script>
/* ---------- WildPx Model Release — Clean, Verified Drop-In ---------- */
/* Global helpers available before any early checks */
function toast(kind, msg){
  const banner = document.getElementById('banner'); // lazy lookup
  if (!banner) return;
  banner.className = kind;
  banner.textContent = msg || (kind === 'ok' ? 'Saved' : 'Error');
  banner.style.display = 'block';
  setTimeout(() => { banner.style.display = 'none'; }, kind === 'ok' ? 3000 : 4500);
}
const ok  = (m)=>toast('ok', m);
const err = (m)=>toast('err', m);

function debounce(fn, ms){
  let t;
  const debounced = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  debounced._cancel = () => clearTimeout(t);
  return debounced;
}

/* Kill stale service workers early so fresh code runs */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.()
    .then(rs => rs.forEach(r => r.unregister()))
    .catch(e => console.error('Failed to unregister service worker:', e));
}

/* Prevent double init */
if (window.__WILDPX_LOCK__) { /* no-op */ }
else {
  window.__WILDPX_LOCK__ = true;

  document.addEventListener('DOMContentLoaded', () => {
    /* ----- Elements (declare before use) ----- */
    const form             = document.getElementById('releaseForm');
    const savedCountEl     = document.getElementById('savedCount');

    const ageSelect        = document.getElementById('ageCheck');
    const guardianSection  = document.getElementById('guardianSection');
    const childrenSection  = document.getElementById('childrenSection');

    const signatureCanvas  = document.getElementById('signatureCanvas');
    const signatureData    = document.getElementById('signatureData');
    const signatureDateInp = form?.querySelector('input[name="signatureDate"]');
    const clearBtn         = document.getElementById('clearSigBtn');

    const headIn           = form?.elements?.['headshot'] ?? null;

    const exportAllBtn     = document.getElementById('exportAllBtn');
    const exportClearBtn   = document.getElementById('exportClearBtn');
    const exportCsvBtn     = document.getElementById('exportCsvBtn');
    const printPdfBtn      = document.getElementById('printPdfBtn');

    const logo             = document.querySelector('.logo');
    const adminBar         = document.getElementById('adminBar');

    /* ----- Early dependency checks (now safe: err exists) ----- */
    if (!form)             { err('Form element #releaseForm not found.'); return; }
    if (!signatureCanvas)  { err('Signature canvas #signatureCanvas not found.'); return; }
    if (!window.SignaturePad) { err('SignaturePad library is missing.'); return; }

    /* ----- Storage helpers ----- */
    const KEY = 'formEntries';
    const getAll = () => { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } };
    const setAll = (arr) => { localStorage.setItem(KEY, JSON.stringify(arr)); updateSavedCount(); };
    function updateSavedCount(){ if (savedCountEl) savedCountEl.textContent = 'Saved: ' + getAll().length; }
    updateSavedCount();

    /* ----- Prefill signature date on load ----- */
    function setTodayIfBlank() {
      if (signatureDateInp && !signatureDateInp.value) {
        signatureDateInp.value = new Date().toISOString().slice(0,10);
      }
    }
    setTodayIfBlank();

    /* ----- Headshot capture to data URL (string), guarded ----- */
    let headshotDataURL = '';
    if (headIn) {
      headIn.addEventListener('change', (ev) => {
        const f = ev.target?.files?.[0];
        if (!f) { headshotDataURL = ''; return; }
        const r = new FileReader();
        r.onload  = () => { headshotDataURL = String(r.result || ''); };
        r.onerror = () => { headshotDataURL = ''; };
        r.readAsDataURL(f);
      });
    }

    /* ----- SignaturePad + resize-preserve ----- */
    signatureCanvas.style.touchAction = 'none';
    if (!signatureCanvas.style.height) signatureCanvas.style.height = '150px';

    const pad = new window.SignaturePad(signatureCanvas, { penColor:'#000' });
    pad.onEnd = updateClearState;

    let lastCssW = 0;
    function resizeCanvasPreserve(canvas, padInst){
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.floor(rect.width);
      if (!cssW) return;
      if (cssW === lastCssW && padInst && !padInst.isEmpty()) return;
      lastCssW = cssW;

      const ratio = Math.max(window.devicePixelRatio||1, 1);
      const data  = padInst && !padInst.isEmpty() ? padInst.toData() : null;

      const cssH = Math.floor(parseFloat(getComputedStyle(canvas).height) || 150);
      canvas.width  = Math.floor(cssW * ratio);
      canvas.height = Math.floor(cssH * ratio);

      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      padInst.clear();
      if (data && data.length) padInst.fromData(data);
    }
    function updateClearState(){ if (clearBtn) clearBtn.disabled = pad.isEmpty(); }
    function scheduleResize(){ resizeCanvasPreserve(signatureCanvas, pad); }

    requestAnimationFrame(scheduleResize);

    clearBtn?.addEventListener('click', (e)=>{
      if (pad.isEmpty()) return;
      e.preventDefault();
      if (confirm('Clear signature?')) { pad.clear(); updateClearState(); }
    });

    /* Stable debounced handler (add & remove use same ref) */
    const onResizeDebounced = debounce(scheduleResize, 100);
    window.addEventListener('resize', onResizeDebounced);
    window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 300));
    window.addEventListener('pageshow', () => scheduleResize(), { once:true });

    /* ----- Age reveal UI ----- */
    function isMinor(){ return String(ageSelect?.value||'').trim().toLowerCase() === 'no'; }
    function updateMinorUI(){
      const minor = isMinor();
      if (guardianSection) guardianSection.style.display = minor ? 'block' : 'none';
      if (childrenSection) childrenSection.style.display = minor ? 'block' : 'none';
      const gName = form.elements['guardianName'];
      const gRel  = form.elements['guardianRelationship'];
      if (gName) gName.required = minor;
      if (gRel)  gRel.required  = minor;
      scheduleResize();
    }
    ageSelect?.addEventListener('change', updateMinorUI);
    ageSelect?.addEventListener('input',  updateMinorUI);
    updateMinorUI();

    /* ----- Submit: save locally with PNG signature & string headshot ----- */
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const fullName = (form.elements['fullName']?.value || '').trim();
      if (!fullName) { err('Please enter the model’s full name.'); return; }

      if (!ageSelect?.value) { err('Please select Yes/No for age.'); return; }
      const minor = isMinor();

      const gName = form.elements['guardianName']?.value?.trim() || '';
      const gRel  = form.elements['guardianRelationship']?.value?.trim() || '';
      if (minor && (!gName || !gRel)) { err('Please provide guardian name and relationship.'); return; }

      if (pad.isEmpty()) { err(minor ? 'Please have the Parent/Guardian sign.' : 'Please sign as the model.'); return; }

      setTodayIfBlank();

      const fd   = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.timestamp = new Date().toISOString();

      const sigPNG = pad.toDataURL('image/png'); // robust for PDF libs
      data.modelSignature    = sigPNG;
      data.guardianSignature = minor ? sigPNG : '';
      if (signatureData) signatureData.value = sigPNG;

      if (typeof headshotDataURL === 'string' && headshotDataURL.startsWith('data:image/')) {
        data.headshot = headshotDataURL;
      } else {
        if ('headshot' in data) delete data.headshot; // avoid "{}"
      }

      try {
        const all = getAll();
        all.push(data);
        setAll(all);
      } catch {
        err('Could not save locally. LocalStorage may be disabled or full.');
        return;
      }

      const holdAge = ageSelect.value;
      form.reset();
      ageSelect.value = holdAge;
      pad.clear();
      headshotDataURL = '';
      if (headIn) headIn.value = '';
      updateMinorUI();
      updateClearState();
      window.scrollTo({ top:0, behavior:'smooth' });
      ok('Saved locally. Total: ' + getAll().length);
    }, { capture:true });

    /* ----- Triple-tap admin (tight window) ----- */
    (function setupTripleTap(){
      if (!logo || !adminBar) return;
      logo.style.pointerEvents = 'auto';

      const REQUIRED_TAPS = 3;
      const WINDOW_MS     = 800;
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
        if (Date.now()-lastTouch < 700) return;
        ev.preventDefault(); ev.stopPropagation();
        const now = Date.now();
        if (!firstAt || (now-firstAt)>WINDOW_MS) { firstAt=now; taps=1; if (timer) clearTimeout(timer); timer=setTimeout(reset, WINDOW_MS+100); }
        else { taps++; }
        if (taps>=REQUIRED_TAPS){ if (timer) clearTimeout(timer); reset(); toggle(); }
      }

      logo.addEventListener('touchend', onTouchEnd, { passive:false });
      logo.addEventListener('click',    onClick,    { passive:false });
    })();

    /* ----- Export helpers & buttons ----- */
    function downloadJSON(filename, obj){
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type:'application/json' });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 500);
    }
    function toCSV(rows){
      if (!rows.length) return '';
      const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
        .filter(h => !['modelSignature','guardianSignature','headshot'].includes(h));
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => esc(r[h])).join(',')));
      return lines.join('\n');
    }

    exportAllBtn?.addEventListener('click', ()=>{
      const entries = getAll();
      if (!entries.length){ err('No saved forms to export.'); return; }
      const bundle = { exported_at:new Date().toISOString(), count:entries.length, entries };
      const fn = 'wildpx_releases_' + new Date().toISOString().slice(0,10) + '_n' + entries.length + '.json';
      downloadJSON(fn, bundle);
      ok('Exported ' + entries.length + ' forms.');
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

    /* ----- Cleanup ----- */
    window.addEventListener('unload', () => {
      window.removeEventListener('resize', onResizeDebounced);
      onResizeDebounced._cancel?.();
      // orientationchange listener uses anonymous setTimeout; safe to leave
    });
  });
}
</script>
