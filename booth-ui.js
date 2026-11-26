/* adambacch.us/beta: the selfie quest (panel 6) as a camera app. The existing buttons (same ids, same listeners in
   app.js) move into one bar at the bottom of the picture: "Start the camera" is a round camera button, which gives
   way to the shutter once the camera is live; after a capture, retake and save sit either side of it. */
(() => {
  'use strict';
  const booth = document.querySelector('#panel-6 .booth');
  const start = document.getElementById('openSelfie');
  const shot = document.getElementById('boothShot'), retake = document.getElementById('boothRetake'), save = document.getElementById('boothSave');
  if (!booth || !start || !shot || !retake || !save) return;
  const bar = document.createElement('div');
  bar.className = 'cam-bar';
  booth.appendChild(bar);
  bar.append(retake, start, shot, save);
  // the start button: a round camera glyph with a short label under it
  start.setAttribute('aria-label', 'Start the camera');
  start.innerHTML = '<svg class="cam-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="13.4" r="3.6" fill="none" stroke="currentColor" stroke-width="1.9"/></svg><span class="cam-l">Camera</span>';
  shot.setAttribute('aria-label', 'Take the photo');
  shot.textContent = '';
  retake.setAttribute('aria-label', 'Retake the photo');
  save.setAttribute('aria-label', 'Save or share the photo');
  // a quick flash and press when the shutter fires
  shot.addEventListener('click', () => {
    shot.classList.remove('fired'); void shot.offsetWidth; shot.classList.add('fired');
    booth.classList.remove('flash'); void booth.offsetWidth; booth.classList.add('flash');
  });
})();
