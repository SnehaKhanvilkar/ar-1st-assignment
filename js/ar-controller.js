// Real image-tracking AR with MindAR. The camera is requested only when the user presses "Start AR".
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  let sys = null, scene = null, running = false, ready = false;

  const show = (id, on) => { const e = $(id); if (e) e.hidden = !on; };
  function fail(html) { show("#loader", false); show("#err", true); $("#errText").innerHTML = html; show("#start", true); }
  async function exists(u) {
    if (u.startsWith("data:")) return true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      // Use GET rather than HEAD: some static hosts/proxies do not answer HEAD reliably.
      const response = await fetch(u, { method: "GET", cache: "no-store", headers: { "Range": "bytes=0-0" }, signal: controller.signal });
      return response.ok || response.status === 206;
    } catch (e) {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
  function setStatus(t, ok) { const s = $("#status"); s.textContent = t; s.classList.toggle("ok", !!ok); }

  async function start() {
    show("#err", false); show("#start", false);
    if (!window.AFRAME || !AFRAME.systems["mindar-image-system"]) return fail("The AR libraries didn't load. Make sure the <code>vendor</code> folder is next to this page and open the site through the launcher or an HTTPS link.");
    if (!window.isSecureContext) return fail("The camera only works on <b>https://</b> or <b>localhost</b>. This page was opened insecurely (for example with file:// or a plain http:// network address). Use START_ANATOAR.bat on your laptop, or deploy to an HTTPS host to test on your phone.");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fail("This browser can't open the camera. Try the latest Chrome, Edge or Safari, or use the <a href='index.html#explore'>3D demo</a>.");
    show("#loader", true); $("#loadText").textContent = "Checking model and tracking files (up to 8 seconds)…";
    const [hasMind, hasGlb] = await Promise.all([exists(window.MODEL.markerUrl), exists(window.MODEL.url)]);
    if (!hasMind) return fail("<b>Tracking file missing:</b> <code>assets/heart.mind</code>. Compile <code>assets/heart-marker.jpg</code> with the MindAR compiler (see README) and put the result in <code>assets/</code>. Meanwhile, try the <a href='index.html#explore'>3D demo</a>.");
    if (!hasGlb) return fail("<b>3D model missing:</b> <code>assets/heart.glb</code>. Add your heart model there (see README), or try the <a href='index.html#explore'>3D demo</a>.");
    $("#loadText").textContent = "Starting camera and tracker…";
    document.body.classList.add("ar");
    $("#stage").innerHTML = `<a-scene mindar-image="imageTargetSrc:${window.MODEL.markerUrl};autoStart:false;uiLoading:no;uiScanning:no;uiError:no" color-space="sRGB" renderer="colorManagement:true;physicallyCorrectLights:true;alpha:true" vr-mode-ui="enabled:false" device-orientation-permission-ui="enabled:false">
      <a-camera position="0 0 0" look-controls="enabled:false" cursor="fuse:false;rayOrigin:mouse" raycaster="far:10000;objects:.clickable"></a-camera>
      <a-entity light="type:ambient;intensity:.7"></a-entity><a-entity light="type:directional;intensity:1.2" position="1 2 3"></a-entity>
      <a-entity id="anchor" mindar-image-target="targetIndex:0">
        <a-entity id="rig" position="0 0 0.25" scale="0.3 0.3 0.3"><a-entity id="spin"><a-entity id="heart" class="clickable" scale="2.5 2.5 2.5" gltf-model="url(${window.MODEL.url})"></a-entity></a-entity></a-entity>
      </a-entity></a-scene>`;
    scene = $("#stage a-scene"); const anchor = $("#anchor"), heart = $("#heart");
    HeartUI.setup(scene, heart, $("#spin"));
    heart.addEventListener("model-error", () => { stop(); fail("<b>The 3D model couldn't be read.</b> Replace <code>assets/heart.glb</code> with a valid GLB file."); });
    // These events come from MindAR's real image detection. Nothing here is timer-based.
    anchor.addEventListener("targetFound", () => { show("#scan", false); setStatus("Target detected ✓", true); });
    anchor.addEventListener("targetLost", () => { show("#scan", true); setStatus("Target lost. Point back at the marker"); const k = $("#callout"); if (k) k.hidden = true; });
    scene.addEventListener("arReady", () => {
      ready = true;
      show("#loader", false);
      show("#intro", false);
      show("#scan", true);
      show("#hud", true);
      setStatus("Scanning for the marker…");
    });
    scene.addEventListener("arError", () => { stop(); fail("<b>The camera couldn't start.</b> Allow camera access in your browser (tap the lock icon in the address bar), close other apps using the camera, then try again. If it keeps failing, use the <a href='index.html#explore'>3D demo</a>."); });
    const go = async () => {
      try { sys = scene.systems["mindar-image-system"]; running = true; await sys.start(); }
      catch (e) { stop(); fail("<b>Camera access was denied or no camera was found.</b> Allow camera access and press Start AR again, or use the <a href='index.html#explore'>3D demo</a>."); }
    };
    scene.hasLoaded ? go() : scene.addEventListener("loaded", go, { once: true });
  }

  // Stops tracking and every camera track, then returns to the start screen.
  function stop() {
    try { if (sys && ready && sys.controller) sys.stop(); } catch (e) { /* already stopped */ }
    ready = false;
    document.querySelectorAll("video").forEach(v => { if (v.srcObject) v.srcObject.getTracks().forEach(t => t.stop()); v.srcObject = null; v.remove(); });
    HeartUI.destroy(); $("#stage").innerHTML = ""; sys = scene = null; running = false;
    document.body.classList.remove("ar"); show("#hud", false); show("#scan", false); show("#loader", false); show("#intro", true); show("#start", true);
  }
  // MindAR can throw a harmless error if the page is closed while the tracker is still loading.
  addEventListener("error", e => { if (/stopProcessVideo/.test(e.message || "")) e.preventDefault(); });
  $("#start").onclick = start;
  $("#exit").onclick = () => { stop(); setStatus("Camera stopped"); };
  addEventListener("pagehide", () => { if (running) stop(); });
  HeartUI.mount();
})();
