// AnatoAR shared interface: 3D controls, hotspots, information cards, structure list, learning progress.
// Used by index.html (standard 3D demo) and ar.html (real WebAR).
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be blocked */ }
    }
  };
  const D = window.ANATOMY;
  const H = window.HeartUI = {
    sel: -1, tab: "overview", yaw: 0, tyaw: 0, pitch: 0, tpitch: 0, zoom: 1, tzoom: 1,
    dragged: false, hots: [], scene: null, heart: null, spin: null, raf: 0, off: [],
    explored: new Set(store.get("anatoar.explored", [])), learned: new Set(store.get("anatoar.learned", []))
  };
  const save = () => { store.set("anatoar.explored", [...H.explored]); store.set("anatoar.learned", [...H.learned]); };

  // ---------- build the on-screen controls ----------
  H.mount = function () {
    const ui = $("#ui");
    ui.innerHTML = `
      <div class="callout" id="callout" hidden><span class="pill" id="calloutText"></span><span class="dot"></span></div>
      <aside class="panel" id="panel" hidden><div class="panel-h"><b>Structures</b><button class="x" data-act="list" aria-label="Close list">✕</button></div>
        <ul id="list"></ul><p class="prog" id="prog"></p><button class="btn ghost small" data-act="resetProg">Reset progress</button></aside>
      <section class="card" id="card" hidden aria-live="polite"></section>
      <div class="controls" role="toolbar" aria-label="Model controls">
        <button data-act="left" aria-label="Rotate left">⟲<small>Left</small></button>
        <button data-act="right" aria-label="Rotate right">⟳<small>Right</small></button>
        <button data-act="reset" aria-label="Reset view">↺<small>Reset</small></button>
        <button data-act="zout" aria-label="Zoom out">−<small>Zoom</small></button>
        <button data-act="zin" aria-label="Zoom in">+<small>Zoom</small></button>
        <button data-act="list" aria-label="Show structure list">☰<small>Parts</small></button></div>`;
    ui.addEventListener("click", onUi);
    renderList(); updateProg();
  };
  function onUi(e) {
    const item = e.target.closest("[data-i]"); if (item) return select(+item.dataset.i);
    const tab = e.target.closest("[data-tab]"); if (tab) { H.tab = tab.dataset.tab; return renderCard(); }
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.dataset.act, step = Math.PI / 6;
    if (a === "left") H.tyaw -= step; else if (a === "right") H.tyaw += step;
    else if (a === "reset") { H.tyaw = Math.round(H.yaw / (2 * Math.PI)) * 2 * Math.PI; H.tpitch = 0; H.tzoom = 1; }
    else if (a === "zin") H.tzoom = Math.min(2.2, H.tzoom * 1.2);
    else if (a === "zout") H.tzoom = Math.max(.6, H.tzoom / 1.2);
    else if (a === "list") $("#panel").hidden = !$("#panel").hidden;
    else if (a === "close") H.close();
    else if (a === "prev") select(H.sel < 0 ? D.length - 1 : (H.sel + D.length - 1) % D.length);
    else if (a === "next") select(H.sel < 0 ? 0 : (H.sel + 1) % D.length);
    else if (a === "learned") { H.learned.has(H.sel) ? H.learned.delete(H.sel) : H.learned.add(H.sel); save(); renderCard(); renderList(); updateProg(); }
    else if (a === "resetProg") { if (confirm("Reset explored and learned progress on this device?")) { H.explored.clear(); H.learned.clear(); save(); renderList(); updateProg(); if (H.sel >= 0) renderCard(); } }
  }

  // ---------- list, card, progress ----------
  function renderList() {
    $("#list").innerHTML = D.map((d, i) => `<li><button class="item ${i === H.sel ? "on" : ""}" data-i="${i}"><span class="swatch" style="background:${d.color}"></span>${esc(d.name)}<span class="chk">${H.learned.has(i) ? "✓" : H.explored.has(i) ? "•" : ""}</span></button></li>`).join("");
  }
  function updateProg() { $("#prog").textContent = `Explored ${H.explored.size}/${D.length} · Learned ${H.learned.size}/${D.length}`; }
  function renderCard() {
    const d = D[H.sel], c = $("#card"), text = { overview: d.overview, function: d.fn, facts: d.fact }[H.tab];
    c.hidden = false;
    c.innerHTML = `<div class="card-h"><span class="swatch" style="background:${d.color}"></span><h2>${esc(d.name)}</h2><button class="x" data-act="close" aria-label="Close information">✕</button></div>
      <div class="tabs" role="tablist">${["overview", "function", "facts"].map(t => `<button role="tab" aria-selected="${t === H.tab}" data-tab="${t}" class="${t === H.tab ? "on" : ""}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
      <p class="card-body">${esc(text)}</p>
      <dl class="meta"><dt>Location</dt><dd>${esc(d.location)}</dd><dt>Blood type</dt><dd>${esc(d.blood)}</dd></dl>
      <div class="card-f"><button data-act="prev">‹ Prev</button><button data-act="learned" class="${H.learned.has(H.sel) ? "on" : ""}">${H.learned.has(H.sel) ? "✓ Learned" : "Mark learned"}</button><button data-act="next">Next ›</button></div>`;
  }
  function select(i) {
    H.sel = i; H.tab = "overview"; H.explored.add(i); save();
    renderCard(); renderList(); updateProg(); highlight();
  }
  H.close = function () { H.sel = -1; const c = $("#card"); if (c) c.hidden = true; const k = $("#callout"); if (k) k.hidden = true; renderList(); highlight(); };

  // Highlight the real mesh that belongs to the selected structure, and the matching hotspot.
  function highlight() {
    const obj = H.heart && H.heart.getObject3D("mesh");
    if (obj) obj.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.emissive) return;
      const m = /^p(\d+)_/.exec(o.name), on = H.sel >= 0 && m && +m[1] === D[H.sel].part;
      o.material.emissive.setHex(on ? 0x0ea5c4 : 0); o.material.emissiveIntensity = on ? .7 : 0;
    });
    H.hots.forEach((h, i) => { const on = i === H.sel; h.setAttribute("scale", on ? "1.8 1.8 1.8" : "1 1 1"); h.setAttribute("material", "color", on ? "#22d3ee" : "#ef4444"); });
  }

  // ---------- connect to an A-Frame scene ----------
  H.setup = function (scene, heart, spin) {
    H.scene = scene; H.heart = heart; H.spin = spin; H.hots = [];
    // Hotspots: small markers placed on the model. The GLB also has separate named meshes, so tapping the model itself works too.
    D.forEach((d, i) => {
      const h = document.createElement("a-sphere");
      h.setAttribute("class", "clickable hot"); h.setAttribute("radius", ".075"); h.setAttribute("position", d.hot.join(" "));
      h.setAttribute("material", "color:#ef4444;shader:flat;depthTest:false;transparent:true;opacity:.92");
      h.addEventListener("click", () => { if (!H.dragged) select(i); });
      spin.appendChild(h); H.hots.push(h);
    });
    heart.addEventListener("click", e => {
      if (H.dragged) return;
      // A hotspot under the finger wins over the mesh behind it.
      const rc = e.detail && e.detail.cursorEl && e.detail.cursorEl.components && e.detail.cursorEl.components.raycaster;
      const hit = rc && rc.intersections.find(x => x.object && x.object.el && x.object.el.classList.contains("hot")); if (hit) hit.el = hit.object.el;
      if (hit) { const hi = H.hots.indexOf(hit.el); if (hi >= 0) return select(hi); }
      const o = e.detail && e.detail.intersection && e.detail.intersection.object, m = o && /^p(\d+)_/.exec(o.name);
      if (m) { const i = D.findIndex(d => d.part === +m[1]); if (i >= 0) select(i); }
    });
    heart.addEventListener("model-loaded", highlight);
    const ready = () => { bindPointer(scene.canvas); loop(); };
    scene.renderStarted ? ready() : scene.addEventListener("renderstart", ready, { once: true });
  };

  // Drag = rotate, two fingers = zoom. A drag never counts as a tap on a hotspot.
  function bindPointer(el) {
    if (!el) return;
    const pts = new Map(); let moved = 0, lx = 0, ly = 0, pinch = 0;
    const gap = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); };
    const down = e => { el.setPointerCapture && el.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); moved = 0; lx = e.clientX; ly = e.clientY; if (pts.size === 2) pinch = gap(); };
    const move = e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
      if (pts.size === 2) { const g = gap(); H.tzoom = Math.max(.6, Math.min(2.2, H.tzoom * g / pinch)); pinch = g; moved = 99; H.dragged = true; return; }
      const dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); lx = e.clientX; ly = e.clientY;
      if (moved > 6) { H.dragged = true; H.tyaw += dx * .012; H.tpitch = Math.max(-1.2, Math.min(1.2, H.tpitch + dy * .01)); }
    };
    const up = e => { pts.delete(e.pointerId); setTimeout(() => { H.dragged = false; }, 120); };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    H.off.push(() => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); });
  }

  // One animation loop: smooth rotation/zoom and keep the name label attached to the selected hotspot.
  function loop() {
    H.raf = requestAnimationFrame(loop);
    H.yaw += (H.tyaw - H.yaw) * .18; H.pitch += (H.tpitch - H.pitch) * .18; H.zoom += (H.tzoom - H.zoom) * .18;
    if (H.spin) { H.spin.object3D.rotation.set(H.pitch, H.yaw, 0); H.spin.object3D.scale.setScalar(H.zoom); }
    const k = $("#callout"); if (!k) return;
    if (H.sel < 0 || !H.hots[H.sel] || !H.scene.camera || !H.scene.canvas) { k.hidden = true; return; }
    const o = H.hots[H.sel].object3D; let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
    const v = new AFRAME.THREE.Vector3(); o.getWorldPosition(v); v.project(H.scene.camera);
    if (!vis || v.z > 1) { k.hidden = true; return; }
    const r = H.scene.canvas.getBoundingClientRect(), host = $("#ui").getBoundingClientRect();
    k.hidden = false; $("#calloutText").textContent = D[H.sel].name;
    k.style.left = (r.left - host.left + (v.x * .5 + .5) * r.width) + "px"; k.style.top = (r.top - host.top + (-v.y * .5 + .5) * r.height) + "px";
  }
  H.destroy = function () {
    cancelAnimationFrame(H.raf); H.off.forEach(f => f()); H.off = []; H.hots = []; H.scene = H.heart = H.spin = null; H.sel = -1;
    H.yaw = H.tyaw = H.pitch = H.tpitch = 0; H.zoom = H.tzoom = 1; H.dragged = false;
    const c = $("#card"); if (c) c.hidden = true; const k = $("#callout"); if (k) k.hidden = true;
  };
  H.resetView = function () { H.yaw = H.tyaw = H.pitch = H.tpitch = 0; H.zoom = H.tzoom = 1; };

  // ---------- website pages (index.html only) ----------
  if (!$("#home")) return;
  const views = ["home", "explore", "help"]; let demoStarted = false;
  async function exists(u) { if (u.startsWith("data:")) return true; try { return (await fetch(u, { method: "HEAD", cache: "no-store" })).ok; } catch (e) { return false; } }
  async function startDemo() {
    if (demoStarted) return; demoStarted = true; H.mount();
    const msg = $("#demoMsg");
    try { const c = document.createElement("canvas"); if (!(c.getContext("webgl2") || c.getContext("webgl"))) throw 0; }
    catch (e) { msg.innerHTML = "3D isn't supported on this device or browser. Try Chrome, Edge or Safari. You can still read about every structure in the <b>Parts</b> list."; $("#panel").hidden = false; return; }
    if (!(await exists(window.MODEL.url))) { msg.innerHTML = "<b>The 3D model file is missing.</b><br>Put your <code>heart.glb</code> inside the <code>assets</code> folder and reload. See the README."; return; }
    $("#demoStage").innerHTML = `<a-scene embedded vr-mode-ui="enabled:false" renderer="colorManagement:true" background="color:#0a1226" cursor="rayOrigin:mouse" raycaster="objects:.clickable">
      <a-entity light="type:ambient;intensity:.55"></a-entity><a-entity light="type:directional;intensity:1.1" position="2 4 5"></a-entity><a-entity light="type:directional;color:#9cc4ff;intensity:.4" position="-4 -1 -3"></a-entity>
      <a-entity id="rig"><a-entity id="spin"><a-entity id="heart" class="clickable" scale="2.5 2.5 2.5" gltf-model="url(${window.MODEL.url})"></a-entity></a-entity></a-entity>
      <a-entity camera position="0 0 4.4"></a-entity></a-scene>`;
    const heart = $("#heart");
    heart.addEventListener("model-loaded", () => { msg.hidden = true; });
    heart.addEventListener("model-error", () => { msg.hidden = false; msg.innerHTML = "<b>The 3D model couldn't be read.</b><br>The file may be damaged. Replace <code>assets/heart.glb</code> with a valid GLB."; });
    H.setup($("#demoStage a-scene"), heart, $("#spin"));
  }
  function route() {
    let v = (location.hash || "#home").slice(1); const how = v === "how"; if (how) v = "home";
    if (!views.includes(v)) v = "home";
    views.forEach(id => $("#" + id).classList.toggle("on", id === v));
    document.querySelectorAll("nav a[data-v]").forEach(a => a.classList.toggle("on", a.dataset.v === v));
    if (v === "explore") startDemo();
    if (how) $("#how").scrollIntoView({ behavior: "smooth" }); else window.scrollTo(0, 0);
  }
  addEventListener("hashchange", route); route();
})();
