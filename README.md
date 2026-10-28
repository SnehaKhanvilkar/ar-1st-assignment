# AnatoAR – scan a printed heart, see it in 3D

Point your phone at a printed heart picture. A 3D heart appears on top of it. Turn it 360°, tap any structure and read what it does.
Built with HTML, CSS, JavaScript, **A-Frame 1.5.0** and **MindAR 1.2.5** (image tracking). No backend, no API keys.

## Two ways to use it
1. **3D demo (no camera):** `index.html` → "Explore the Human Heart". Works anywhere.
2. **Real AR:** `ar.html` → "Start AR" → point the camera at the printed marker. Needs localhost or HTTPS.

## Run it on your Windows laptop
1. Install Python from https://www.python.org/downloads/ (tick **Add python.exe to PATH**).
2. Right-click the ZIP > **Extract All**. Don't run it from inside the ZIP.
3. Double-click **`START_ANATOAR.bat`**. Your browser opens at http://localhost:8000 (or the next free port). Close the black window to stop.
4. No launcher? Open a terminal in the folder and run `python -m http.server 8000`, then visit http://localhost:8000.
5. Opening `index.html` with a double-click will **not** work for the camera or model (browsers block `file://`).

## Publish on GitHub Pages (free HTTPS, so the phone camera works)
**Without any coding (browser only)**
1. Sign in at https://github.com and click **New repository**. Name it `anatoar`, choose **Public**, click **Create repository**.
2. On the empty repo page click **uploading an existing file**.
3. Unzip this project. Drag **everything inside the folder** into the upload box: all files **and** the `assets`, `js` and `vendor` folders (including the hidden `.nojekyll`, if your computer shows it). Wait for every file to finish, then click **Commit changes**.
4. Open **Settings > Pages**. Under "Build and deployment" choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
5. After 1 to 2 minutes your site is live at `https://YOUR-USERNAME.github.io/anatoar/`.

**With git (optional)**
```
git init
git add .
git commit -m "AnatoAR"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/anatoar.git
git push -u origin main
```
Then do step 4 above.

**Test on your phone:** open `https://YOUR-USERNAME.github.io/anatoar/ar.html`, tap **Start AR**, allow the camera, and point it at the printed `assets/heart-marker.jpg`. All paths in the project are relative, so it works from the repository sub-folder URL.

> Before making the repository public: the heart picture (marker and home illustration) came from you. Only publish it if you have the right to share it, or replace it with your own image (see "Use your own marker"). Put your name in `LICENSE`.

## The marker (what you print)
- File: **`assets/heart-marker.jpg`** (also downloadable on the Help page). Print it about A5 or larger, flat, in good light.
- `assets/heart.mind` was compiled from **exactly this file** with MindAR's offline compiler (1 target, 800×960). Do not edit or crop the image, or detection will fail.
- Hold the phone 20 to 40 cm away so the whole sheet is visible. The border pattern helps the tracker; the heart is in the middle.
- The big UI poster is **not** a tracking target.

### Use your own marker
1. Make an image with lots of detail and contrast (photos, patterns, text; flat cartoons with big plain areas track badly).
2. Compile it at https://hiukim.github.io/mind-ar-js-doc/tools/compile (upload, Start, download `targets.mind`).
3. Rename to `heart.mind`, replace `assets/heart.mind`, and replace `assets/heart-marker.jpg` with the **same** image.

## Replace the 3D model
Put your GLB at `assets/heart.glb`. If its meshes are named `p0_*` … `p9_*` (the current naming) tapping a part works directly. Otherwise the red hotspot markers still work; edit their positions (`hot`) in `js/anatomy-data.js`. Keep it under about 5 MB for phones.

## Edit the learning text
`js/anatomy-data.js` holds every structure's name, colour, description, function, location, blood type and fact.

## What you get
- Rotate with drag/touch or the Left/Right buttons (full 360°), pinch or +/− to zoom, Reset.
- 10 structures: aorta, superior vena cava, inferior vena cava, pulmonary artery, pulmonary veins, right atrium, left atrium, right ventricle, left ventricle, coronary vessels.
- Information cards (Overview / Function / Facts, location, blood type), a structure list, Prev/Next, "Mark learned", explored/learned counters (saved only in your browser).
- AR: loading and scanning states, "Target detected" only when MindAR really finds the marker, heart hides when the marker is lost, **Exit AR** stops the camera.

## Files
```
AnatoAR/
  index.html  ar.html  style.css  script.js
  START_ANATOAR.bat  README.md  CREDITS.md  LICENSE  .nojekyll  .gitignore
  js/anatomy-data.js  js/ar-controller.js
  assets/heart.glb  heart.mind  heart-marker.jpg  images/heart-illustration.png
  vendor/ (A-Frame, MindAR and their licences)
```

## What was tested (and what was not)
Tested in headless Chromium: home and navigation; demo loads the GLB; 47 meshes with part names; all 10 list items open the right card and highlight the right hotspot and mesh; tapping a hotspot; dragging rotates without selecting; 13 × 30° turns = 390°; reset; mark learned and counters; mobile width has no sideways scroll; no camera or video exists until "Start AR" is pressed; AR scene is created with the heart inside the MindAR image target; Exit AR clears it; missing `heart.mind` / `heart.glb` show helpful messages; no JavaScript errors. The `.mind` file was loaded back and decodes as 1 target (800×960, 213 feature points at the largest scale).
**Not tested:** live camera tracking, real marker detection ("Target detected"), the heart staying aligned while you move, and target-loss handling (the test browser had no usable camera). Also untested: `START_ANATOAR.bat` (needs Windows), iPhone/Safari, other Android browsers. Please try these on your phone and tell me what you see.

## Troubleshooting
- **Camera blocked:** use the https link (or localhost); tap the lock icon in the address bar and allow Camera.
- **Marker not detected:** more light, no glare, whole sheet in view, 20 to 40 cm away, print larger, keep it flat.
- **Heart looks too big/small or floats:** in `js/ar-controller.js` change `scale="0.3 0.3 0.3"` and `position="0 0 0.25"`.
- **Blank page:** open through the launcher or an https link, not by double-clicking.
- **"Python was not found":** reinstall Python with "Add to PATH".
- **Port busy:** the launcher tries ports 8000 to 8020 automatically.
