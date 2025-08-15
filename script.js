<script>
// ========== WildPx Model Release — UI ONLY (no network) ==========
(() => {
  if (window.__WILDPX_LOCK__) return; window.__WILDPX_LOCK__ = true;

  document.addEventListener('DOMContentLoaded', () => {
    const KEY = 'formEntries';

    // ----- elements -----
    const banner   = document.getElementById('banner');
    const form     = document.getElementById('releaseForm');

    const ageSelect       = document.getElementById('ageCheck');
    const guardianSection = document.getElementById('guardianSection');
    const childrenSection = document.getElementById('childrenSection');

    const signatureLabelEl   = document.getElementById('signatureLabel');
    const signatureCanvas    = document.getElementById('signatureCanvas');
    const signatureData      = document.getElementById('signatureData');
    const signatureDateInput = form ? form.querySelector('input[name="signatureDate"]') : null;

    const savedCountEl = document.getElementById('savedCount');
    const clearBtn     = document.getElementById('clearSigBtn');

    // ----- banner -----
    function toast(kind, msg){
      if (!banner) return;
      banner.className = kind; banner.textContent = msg;
      banner.style.display = 'block';
      setTimeout(()=>banner.style.display='none', kind==='ok'?3000:4500);
    }
    const ok  = (m)=>toast('ok', m||'OK');
    const err = (m)=>toast('err', m||'Error');

    // ----- storage -----
    const getAll = () => { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } };
    const setAll = (arr) => { localStorage.setItem(KEY, JSON.stringify(arr)); updateSavedCount(); };
    function updateSavedCount(){ if (savedCountEl) savedCountEl.textContent = 'Saved: ' + getAll().length; }
    updateSavedCount();

    // ----- age toggle -----
    function normalizeMinorChoice(v){
      const s = String(v||'').trim().toLowerCase();
      if (!s || s==='select') return null;
      return new Set(['no','false','0','minor','under','u18','under 18','<18']).has(s);
    }
    function updateMinorUI(){
      if (!(ageSelect && guardianSection && childrenSection && signatureLabelEl)) return;
      const choice  = normalizeMinorChoice(ageSelect.value);
      const isMinor = choice === true;

      guardianSection.style.display = isMinor ? 'block' : 'none';
      childrenSection.style.display = isMinor ? 'block' : 'none';

      const gName = form?.elements['guardianName'];
      const gRel  = form?.elements['guardianRelationship'];
      if (gName) gName.required = !!isMinor;
      if (gRel)  gRel.required  = !!isMinor;

      signatureLabelEl.textContent = isMinor ? 'Parent/Guardian Signature:' : 'Model Signature:';
      scheduleResize();
    }
    ageSelect?.addEventListener('change', updateMinorUI);
    ageSelect?.addEventListener('input',  updateMinorUI);
    form?.addEventListener('input', (e)=>{ if (e.target === ageSelect) updateMinorUI(); });
    document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) updateMinorUI(); });

    // ----- signature pad -----
    let primaryPad = null, lastCanvasCSSWidth = 0;

    // runtime CSS so you don't edit stylesheets
    if (signatureCanvas) {
      Object.assign(signatureCanvas.style, {
        width:'100%', height:'150px', border:'1px solid #aaa', borderRadius:'8px', touchAction:'none'
      });
    }

    function updateClearState(){ if (clearBtn) clearBtn.disabled = !primaryPad || primaryPad.isEmpty(); }

    function resizeCanvasPreserve(canvas, pad){
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.floor(rect.width);
      if (!cssW) return;
      if (cssW === lastCanvasCSSWidth && pad && !pad.isEmpty()) return;
      lastCanvasCSSWidth = cssW;

      const ratio = Math.max(window.devicePixelRatio||1, 1);
      const data = pad && !pad.isEmpty() ? pad.toData() : null;

      canvas.width  = Math.floor(cssW * ratio);
      canvas.height = Math.floor(150  * ratio);

      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio,0,0,ratio,0,0);

      if (pad) {
        pad.clear();
        if (data && data.length) pad.fromData(data);
      }
      updateClearState();
    }

    let rAF = null;
    function scheduleResize(){ if (rAF) return; rAF = requestAnimationFrame(()=>{ rAF=null; resizeCanvasPreserve(signatureCanvas, primaryPad); }); }

    function bindPadEvents(){ if (!primaryPad) return; primaryPad.onBegin = ()=>{}; primaryPad.onEnd = ()=>updateClearState(); }

    function initPrimaryPad(){
      if (!signatureCanvas) return;
      if (!window.SignaturePad) { console.error('SignaturePad missing'); err('Signature pad library missing.'); return; }
      if (!primaryPad) {
        primaryPad = new window.SignaturePad(signatureCanvas, { penColor:'#000' });
        bindPadEvents();
        requestAnimationFrame(()=>resizeCanvasPreserve(signatureCanvas, primaryPad));
        updateClearState();
      }
    }

    // clear button: long-press clears; click asks confirm
    let pressTimer=null;
    function startPress(e){ e.preventDefault(); if (clearBtn?.disabled) return; pressTimer=setTimeout(()=>{ primaryPad?.clear(); updateClearState(); },600); }
    function cancelPress(){ if (pressTimer){ clearTimeout(pressTimer); pressTimer=null; } }
    clearBtn?.addEventListener('touchstart', startPress, {passive:false});
    clearBtn?.addEventListener('touchend',   cancelPress);
    clearBtn?.addEventListener('touchcancel',cancelPress);
    clearBtn?.addEventListener('mousedown',  startPress);
    clearBtn?.addEventListener('mouseup',    cancelPress);
    clearBtn?.addEventListener('mouseleave', cancelPress);
    clearBtn?.addEventListener('click', (e)=>{ if (!primaryPad?.isEmpty() && pressTimer===null){ e.preventDefault(); if (confirm('Clear signature?')) { primaryPad.clear(); updateClearState(); } } });
    window.clearPrimarySig = ()=>{ primaryPad?.clear(); updateClearState(); };

    initPrimaryPad();
    updateMinorUI();

    // environment changes that used to nuke the pad
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', ()=>setTimeout(scheduleResize,300));
    window.addEventListener('pageshow', scheduleResize, {once:true});

    // ----- submit (local save only) -----
    function setTodayIfBlank(){ if (signatureDateInput && !signatureDateInput.value) signatureDateInput.value = new Date().toISOString().slice(0,10); }
    const fileToDataURL = (file)=> new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsDataURL(file); });

    form?.addEventListener('submit', async (e)=>{
      e.preventDefault();

      const fullName = (form.elements['fullName']?.value || '').trim();
      if (!fullName) { err('Please enter the model’s full name.'); return; }

      const ageVal  = ageSelect ? String(ageSelect.value||'') : '';
      const minorChoice = normalizeMinorChoice(ageVal);
      if (minorChoice === null) { err('Please select Yes/No for age.'); return; }
      const isMinor = minorChoice === true;

      if (!primaryPad || primaryPad.isEmpty()) { err(isMinor?'Please have the Parent/Guardian sign.':'Please sign as the model.'); return; }
      if (isMinor) {
        const gName = (form.elements['guardianName']?.value || '').trim();
        const gRel  = (form.elements['guardianRelationship']?.value || '').trim();
        if (!gName || !gRel) { err('Guardian Name and Relationship are required.'); return; }
      }

      setTodayIfBlank();
      if (signatureData && primaryPad) signatureData.value = primaryPad.toDataURL('image/jpeg', 0.85);

      const fd   = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.timestamp = new Date().toISOString();

      const file = form.elements['headshot']?.files?.[0];
      if (file) {
        try {
          if (file.size <= 300000) data.headshotDataURL = await fileToDataURL(file);
          else data.headshotNote = 'Headshot present but large; not saved inline (' + file.size + ' bytes)';
        } catch { data.headshotNote = 'Headshot present but could not be read'; }
      }

      try { const all = getAll(); all.push(data); setAll(all); }
      catch { err('Could not save locally. Check browser settings.'); return; }

      const ageValBeforeReset = ageSelect?.value;
      form.reset();
      if (ageSelect && ageValBeforeReset!=null) ageSelect.value = ageValBeforeReset;
      primaryPad?.clear();
      updateMinorUI(); updateClearState();

      window.scrollTo({ top:0, behavior:'smooth' });
      ok('Saved locally. Total: ' + getAll().length);
    }, {capture:true});

    // ===== ADMIN: triple-tap show controls (NO auto export) =====
    // If you have your own .logo/#adminHotspot/#adminBar they’ll be used; else we inject minimal ones.
    let hotspot = document.getElementById('adminHotspot') || document.querySelector('.logo');
    if (!hotspot) {
      hotspot = document.createElement('div');
      hotspot.id = 'adminHotspot';
      Object.assign(hotspot.style, {
        position:'fixed', right:'12px', bottom:'12px', width:'44px', height:'44px',
        borderRadius:'22px', background:'rgba(0,0,0,0.08)',
        zIndex:'9999', pointerEvents:'auto', touchAction:'manipulation', userSelect:'none'
      });
      document.body.appendChild(hotspot);
    } else {
      Object.assign(hotspot.style, { pointerEvents:'auto', touchAction:'manipulation', userSelect:'none' });
    }

    let adminBar = document.getElementById('adminBar');
    if (!adminBar) {
      adminBar = document.createElement('div');
      adminBar.id = 'adminBar';
      adminBar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;display:none;gap:8px;z-index:9998;align-items:center;justify-content:center;flex-wrap:wrap';
      adminBar.innerHTML = `
        <div style="background:#111;color:#fff;padding:10px 12px;border-radius:10px;display:flex;gap:8px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.25)">
          <button id="btnExportJSON"  type="button" style="padding:8px 12px;border-radius:8px">Export JSON</button>
          <button id="btnExportClear" type="button" style="padding:8px 12px;border-radius:8px">Export + Clear</button>
          <button id="btnCloseAdmin"  type="button" style="padding:8px 12px;border-radius:8px">Close</button>
        </div>`;
      document.body.appendChild(adminBar);
    }

    function toggleAdminBar(){
      adminBar.style.display = (adminBar.style.display==='none' || !adminBar.style.display) ? 'flex' : 'none';
    }

    // Triple-tap + long-press + Shift+A
    const REQUIRED_TAPS=3, WINDOW_MS=1200, LONG_MS=700;
    let taps=0, firstTapAt=0, timer=null, pressTimer=null, moved=false;

    function resetTap(){ taps=0; firstTapAt=0; if (timer){ clearTimeout(timer); timer=null; } }
    function endTap(e){
      if (e){ e.preventDefault(); e.stopPropagation(); }
      if (moved){ moved=false; return; }
      const now = Date.now();
      if (!firstTapAt || (now-firstTapAt)>WINDOW_MS) { firstTapAt=now; taps=1; timer=setTimeout(resetTap, WINDOW_MS+100); }
      else { taps++; }
      if (taps>=REQUIRED_TAPS){ if (timer) clearTimeout(timer); resetTap(); toggleAdminBar(); }
    }
    function startPress(){ moved=false; pressTimer=setTimeout(()=>toggleAdminBar(), LONG_MS); }
    function cancelPress(){ if (pressTimer){ clearTimeout(pressTimer); pressTimer=null; } }
    function move(){ moved=true; cancelPress(); }

    hotspot.addEventListener('pointerdown', startPress, {passive:true});
    hotspot.addEventListener('pointerup',   (e)=>{ cancelPress(); endTap(e); }, {passive:false});
    hotspot.addEventListener('pointercancel', cancelPress);
    hotspot.addEventListener('pointermove', move);
    hotspot.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); endTap(e); }, {passive:false});
    window.addEventListener('keydown', (e)=>{ if (e.shiftKey && (e.key==='A'||e.key==='a')) { e.preventDefault(); toggleAdminBar(); } });

    // Wire export buttons (manual only; no auto)
    function downloadJSON(filename, obj){
      const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 500);
    }
    adminBar.querySelector('#btnCloseAdmin')?.addEventListener('click', ()=>adminBar.style.display='none');
    adminBar.querySelector('#btnExportJSON')?.addEventListener('click', ()=>{
      const entries = getAll();
      if (!entries.length) { err('No saved forms to export.'); return; }
      const bundle = { exported_at:new Date().toISOString(), count:entries.length, entries };
      const fn = 'wildpx_releases_' + new Date().toISOString().slice(0,10) + '_n' + entries.length + '.json';
      downloadJSON(fn, bundle); ok('Exported ' + entries.length + ' forms.');
    });
    adminBar.querySelector('#btnExportClear')?.addEventListener('click', ()=>{
      const entries = getAll();
      if (!entries.length) { err('Nothing to export.'); return; }
      if (!confirm('Export all forms and then clear them from this device?')) return;
      const bundle = { exported_at:new Date().toISOString(), count:entries.length, entries };
      const fn = 'wildpx_releases_' + new Date().toISOString().slice(0,10) + '_n' + entries.length + '.json';
      downloadJSON(fn, bundle);
      localStorage.removeItem(KEY);
      updateSavedCount();
      ok('Exported and cleared.');
    });
  });
})();
</script>
