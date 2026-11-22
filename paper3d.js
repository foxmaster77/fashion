/* ============================================================
   ORI — closing 3D paper certificate
   Runs on Three.js r149 (window.__THREE_PAPER) so the cloth
   hero's r160 global stays untouched.
   ============================================================ */
(() => {
const T = window.__THREE_PAPER;
const ACCENT = '#D9502B';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ======================================================================
   1. RENDERER / SCENE / CAMERA
   ====================================================================== */
const canvas = document.getElementById('gl');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(35, 1.6, 0.1, 80);
camera.position.set(0, 0.15, 8);
scene.add(camera);

/* ======================================================================
   2. ENVIRONMENT — painted studio, so clearcoat/iridescence have something
      to reflect. Warm key side, cool fill, vermilion floor bounce.
   ====================================================================== */
function makeEnv() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2b2e33'); sky.addColorStop(.45, '#111316');
  sky.addColorStop(.55, '#090a0b'); sky.addColorStop(1, '#040405');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const soft = (x, y, r, col, a) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col + a + ')'); rg.addColorStop(1, col + '0)');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  soft(w * .5, h * .62, 430, 'rgba(150,160,172,', .17);   // horizon glow
  soft(w * .24, h * .30, 270, 'rgba(214,224,234,', .12);   // cool softbox L
  soft(w * .80, h * .20, 230, 'rgba(255,196,168,', .10);   // warm kicker R
  soft(w * .62, h * .96, 320, 'rgba(217,80,43,', .11);     // vermilion floor bounce
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.fillRect(w * .24 - 7, h * .30 - 96, 14, 192); g.fillRect(w * .24 - 34, h * .30 - 7, 68, 14);
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.fillRect(w * .80 - 6, h * .20 - 76, 12, 152); g.fillRect(w * .80 - 28, h * .20 - 6, 56, 12);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h * .52, w, 3);
  const tex = new T.CanvasTexture(c);
  tex.mapping = T.EquirectangularReflectionMapping;
  const pm = new T.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  tex.dispose(); pm.dispose();
  return env;
}
scene.environment = makeEnv();

/* ======================================================================
   3. LIGHTS
   ====================================================================== */
const key = new T.SpotLight(0xfff1e2, 3.4, 60, 0.5, 0.9, 1.4);
key.position.set(-4.2, 7.5, 6.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 6;
const fill = new T.DirectionalLight(0xbccadb, 0.7); fill.position.set(5.5, -1.5, 4);
const rim = new T.DirectionalLight(0xffffff, 2.4); rim.position.set(2.8, 4, -5);
const accent = new T.PointLight(new T.Color(ACCENT), 26, 26, 2);
accent.position.set(-4, -4.6, 4);
const hemi = new T.HemisphereLight(0x2b3036, 0x000000, 0.6);
scene.add(key, key.target, fill, rim, accent, hemi);
const touchLight = new T.PointLight(0xfff3e4, 0, 14, 2);
scene.add(touchLight);

/* ======================================================================
   4. SHEET — gently domed paper plane + halo glow behind it
   ====================================================================== */
const SW = 8, SH = 5;
function sheetGeometry(subX = 110, subY = 70) {
  const geo = new T.PlaneGeometry(SW, SH, subX, subY);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const dome = Math.cos(x / SW * Math.PI / 2) * Math.cos(y / SH * Math.PI / 2);
    const buckle = 0.05 * Math.sin(x * 1.4 + 0.6) * Math.sin(y * 1.1 - 0.4) * Math.sin(x * 0.5 - y * 0.8);
    p.setZ(i, 0.10 * (0.35 + 0.65 * dome) + buckle);
  }
  geo.computeVertexNormals();
  return geo;
}

/* halo: soft radial glow that fades in behind the sheet */
const haloCanvas = document.createElement('canvas');
haloCanvas.width = haloCanvas.height = 256;
{
  const g = haloCanvas.getContext('2d');
  const rg = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,244,230,.55)');
  rg.addColorStop(.4, 'rgba(255,240,225,.16)');
  rg.addColorStop(1, 'rgba(255,240,225,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
}
const haloTex = new T.CanvasTexture(haloCanvas);
const halo = new T.Mesh(
  new T.PlaneGeometry(SW * 1.9, SH * 1.9),
  new T.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })
);
halo.position.z = -0.55;
halo.renderOrder = -1;

/* ======================================================================
   5. CERTIFICATE TEXTURE — the printed design on the paper
   ====================================================================== */
const CW = 1600, CH = 1000;
const INK = '#17181b', MUTE = '#787c83', LINE = '#cfcfc9';
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Inter", Helvetica, Arial, sans-serif';
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const wd of words) {
    const t = line ? line + ' ' + wd : wd;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = wd; yy += lh; }
    else line = t;
  }
  g.fillText(line, x, yy); return yy + lh;
}
function drawCert(g) {
  const grainC = document.createElement('canvas'); grainC.width = grainC.height = 256;
  const gg = grainC.getContext('2d'), id = gg.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 118 + Math.random() * 60;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  gg.putImageData(id, 0, 0);
  const pt = g.createPattern(grainC, 'repeat');
  const vg = g.createRadialGradient(CW / 2, CH / 2, CH * 0.42, CW / 2, CH / 2, CH * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(96,96,92,0.055)');

  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, CW, CH);
  g.fillStyle = pt; g.globalAlpha = .08; g.fillRect(0, 0, CW, CH); g.globalAlpha = 1;

  g.strokeStyle = LINE; g.lineWidth = 1.2; g.strokeRect(28.5, 28.5, CW - 57, CH - 57);
  g.strokeStyle = 'rgba(22,23,26,.35)'; g.lineWidth = 1; g.strokeRect(40.5, 40.5, CW - 81, CH - 81);

  const M = 84, x0 = M, x1 = CW - M, top = M + 6;
  const hline = (y, xa = x0, xb = x1) => { g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(xa, y); g.lineTo(xb, y); g.stroke(); };
  const label = (y, text, cx) => { g.fillStyle = MUTE; g.font = '500 20px ' + SANS; g.textAlign = 'center'; g.fillText(text, cx, y); };

  // logo + award seal
  g.textAlign = 'center';
  g.fillStyle = INK; g.font = '600 52px ' + SANS; g.fillText('ori', x0 + 90, top + 58);
  g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.arc(x1 - 42, top + 18, 28, 0, Math.PI * 2); g.stroke();
  g.save(); g.translate(x1 - 42, top + 18); g.rotate(-0.35);
  g.font = '700 17px ' + SANS; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText('SOTW', 0, 1); g.restore();

  // title block
  const ly = top + 220;
  g.fillStyle = INK; g.font = '600 20px ' + SANS; g.fillText('Studio of the Week.', CW / 2, ly);
  g.fillStyle = INK; g.font = 'italic 500 66px ' + SERIF; g.fillText('ORI.', CW / 2, ly + 98);
  g.fillStyle = MUTE; g.font = '500 22px ' + SANS;
  g.fillText('Awarded by the International Screen & Print Guild', CW / 2, ly + 150);
  g.fillText('for outstanding visual design in digital craft', CW / 2, ly + 184);
  hline(ly + 232);
  label(ly + 270, 'Presented to', CW / 2 - 270);
  label(ly + 270, 'Year', CW / 2 + 300);
  g.fillStyle = INK; g.font = 'italic 500 56px ' + SERIF; g.fillText('ORI.', CW / 2 - 270, ly + 344);
  g.font = '600 40px ' + SANS; g.fillText('2026', CW / 2 + 300, ly + 334);
  g.fillStyle = MUTE; g.font = '500 19px ' + SANS; g.fillText('Official Certificate', CW / 2 + 300, ly + 364);
  hline(ly + 410);

  // body
  g.textAlign = 'left';
  g.fillStyle = INK; g.font = '600 17px ' + SANS; g.fillText('This is to certify that', x0, ly + 470);
  g.fillStyle = INK; g.font = 'italic 500 40px ' + SERIF; g.fillText('ORI.', x0, ly + 528);
  g.fillStyle = MUTE; g.font = '400 24px ' + SANS;
  const endY = wrapText(g,
    'has been selected for the Studio of the Week distinction, in recognition of exceptional art direction, typographic craft and motion design.',
    x0, ly + 600, x1 - x0, 36);

  // jury
  const jy = endY + 40;
  g.strokeStyle = LINE; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, jy); g.lineTo(x1, jy); g.stroke();
  g.fillStyle = MUTE; g.font = '600 14px ' + SANS; g.textAlign = 'center'; g.fillText('J U R Y   O F   T H E   M O N T H', CW / 2, jy + 36);
  g.textAlign = 'left'; g.fillStyle = INK;
  const cols = [[x0, 'Ilya Marchetti', 'Creative Director'], [CW / 2 - 40, 'Dara Okonkwo', 'Type Designer'], [x1 - 230, 'Sena Vidal', 'Motion Lead']];
  for (const [x, n, r] of cols) {
    g.font = '600 22px ' + SANS; g.fillText(n, x, jy + 94);
    g.fillStyle = MUTE; g.font = '400 20px ' + SANS; g.fillText(r, x, jy + 124);
    g.fillStyle = INK;
  }

  // seal
  const cy = CH - 150;
  g.save(); g.translate(x1 - 96, cy); g.rotate(0.22);
  g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 74, 0, Math.PI * 2); g.stroke();
  g.lineWidth = .7; g.beginPath(); g.arc(0, 0, 66, 0, Math.PI * 2); g.stroke();
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '600 15px ' + SANS; g.fillText('O R I', 0, -12);
  g.font = 'italic 500 22px ' + SERIF; g.fillText('2026', 0, 14);
  g.restore();

  // signature + footer
  g.textAlign = 'left';
  g.fillStyle = MUTE; g.font = '500 16px ' + SANS; g.fillText('Award Director', x1 - 330, CH - 196);
  g.fillStyle = INK; g.font = 'italic 500 40px ' + SERIF; g.fillText('AVA Lindqvist', x1 - 330, CH - 152);
  g.strokeStyle = INK; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x1 - 330, CH - 118);
  g.bezierCurveTo(x1 - 280, CH - 96, x1 - 210, CH - 126, x1 - 150, CH - 108); g.stroke();
  hline(CH - 92);
  label(CH - 60, 'Certificate No. SOTW-2026-0417', x0 + 200);
  label(CH - 60, 'This certificate is the property of its recipient.', CW / 2);
  label(CH - 60, 'Verify at ori.studio', x1 - 240);

  g.fillStyle = vg; g.fillRect(0, 0, CW, CH);
}
function makeCertTexture() {
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  drawCert(c.getContext('2d'));
  const t = new T.CanvasTexture(c);
  t.encoding = T.sRGBEncoding;
  t.anisotropy = 8;
  return t;
}
const tex = makeCertTexture();

/* ======================================================================
   6. MATERIAL / MESH
   ====================================================================== */
const uni = {
  uTime: { value: 0 },
  uMouse: { value: new T.Vector2(0, 0) },
  uHover: { value: 0 }
};
const mat = new T.MeshPhysicalMaterial({
  map: tex, roughness: 0.58, metalness: 0,
  clearcoat: 1.0, clearcoatRoughness: 0.06,
  sheen: 0.45, sheenRoughness: 0.5, sheenColor: new T.Color(0xffffff),
  iridescence: 0.09, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 420],
  reflectivity: 0.4, specularIntensity: 1.0, envMapIntensity: 0.6,
  transparent: true, side: T.DoubleSide
});
mat.userData.uniforms = uni;

const geo = sheetGeometry();
const mesh = new T.Mesh(geo, mat);
mesh.castShadow = true;
mesh.visible = false;
const group = new T.Group();
group.add(mesh, halo);
scene.add(group);

/* ======================================================================
   7. POINTER — drag to spin with inertia, hover to tilt + light
   ====================================================================== */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
const sheetEl = document.querySelector('.paper3d');
let dragging = false, dragYaw = 0.5, dragPitch = -0.16;
let prevYaw = dragYaw, prevPitch = dragPitch;
let velYaw = 0, velPitch = 0, release = 0;
let hover = 0, hoverTarget = 0, overSheet = false, cursorNow = '';
const hintEl = document.getElementById('hint');
let hintUsed = false;

const ray = new T.Raycaster();
const ndc = new T.Vector2();
const quad = []; // 4 NDC-space corners, rebuilt every frame
const hitNdc = new T.Vector3();
const corner = new T.Vector3();
const CORNERS = [[-SW / 2, SH / 2, 0], [SW / 2, SH / 2, 0], [SW / 2, -SH / 2, 0], [-SW / 2, -SH / 2, 0]];

function buildQuad() {
  quad.length = 0;
  for (const c of CORNERS) {
    corner.set(c[0], c[1], c[2]).applyMatrix4(mesh.matrixWorld).project(camera);
    quad.push({ x: corner.x, y: corner.y });
  }
}
function pointInQuad(px, py) {
  // convex quad: point must stay on the same side of every edge
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i], b = quad[(i + 1) % 4];
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (Math.abs(cross) < 1e-6) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s; else if (s !== sign) return false;
  }
  return true;
}
function inQuad(cx, cy) {
  if (quad.length < 4) return false;
  const px = (cx / window.innerWidth) * 2 - 1;
  const py = -((cy / window.innerHeight) * 2 - 1);
  return pointInQuad(px, py);
}
function pointerNdc(cx, cy) {
  return { x: (cx / window.innerWidth) * 2 - 1, y: -((cy / window.innerHeight) * 2 - 1) };
}

addEventListener('pointerdown', e => {
  if (!inQuad(e.clientX, e.clientY)) return;
  dragging = true; release = 0;
  prevYaw = dragYaw; prevPitch = dragPitch;
  velYaw = velPitch = 0;
  try { sheetEl.setPointerCapture(e.pointerId); } catch (_) {}
}, { passive: true });

let lastPX = 0, lastPY = 0, hasLast = false;
addEventListener('pointermove', e => {
  const p = pointerNdc(e.clientX, e.clientY);
  mouse.tx = p.x; mouse.ty = p.y;
  const inside = inQuad(e.clientX, e.clientY);
  overSheet = inside;
  hoverTarget = inside ? 1 : 0;
  if (!dragging) { hasLast = false; return; }
  let dx = e.movementX, dy = e.movementY;
  if (dx === undefined || (dx === 0 && dy === 0 && hasLast)) { dx = e.clientX - lastPX; dy = e.clientY - lastPY; }
  lastPX = e.clientX; lastPY = e.clientY; hasLast = true;
  dragYaw += dx * 0.0085;
  dragPitch = clamp(dragPitch + dy * 0.0055, -0.6, 0.6);
}, { passive: true });

const endDrag = () => { if (dragging) { dragging = false; release = 1.4; } };
addEventListener('pointerup', endDrag, { passive: true });
addEventListener('pointercancel', endDrag, { passive: true });
addEventListener('blur', endDrag);

/* ======================================================================
   8. SIZING
   ====================================================================== */
let vw = 0, vh = 0;
function resize() {
  vw = window.innerWidth; vh = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(vw, vh, false);
  camera.aspect = vw / vh; camera.updateProjectionMatrix();
  const visH = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov) / 2);
  const visW = visH * camera.aspect;
  const wCap = Math.min(0.88, 0.60 + Math.max(0, 1.45 - camera.aspect) * 0.45);
  group.scale.setScalar(Math.min(visH * 0.735 / SH, visW * wCap / SW));
}
window.addEventListener('resize', resize);

/* ======================================================================
   9. LOOP
   ====================================================================== */
const clock = new T.Clock();
const lightPos = new T.Vector3();
let intro = 0;

var p3visible = true;
if ('IntersectionObserver' in window) {
  new IntersectionObserver(function(en){ p3visible = en[0].isIntersecting; }, { threshold: 0 })
    .observe(document.querySelector('.paper3d'));
}

function frame() {
  requestAnimationFrame(frame);
  if (!p3visible) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  uni.uTime.value = REDUCED ? 2.4 : t;

  intro += (1 - intro) * Math.min(1, dt * 1.9);
  mat.opacity = intro;
  halo.material.opacity = intro * 0.30;
  if (intro > 0.7 && !hintUsed) { hintEl.style.opacity = '1'; }

  if (dragging) {
    const k = Math.min(1, dt * 14);
    velYaw += ((dragYaw - prevYaw) / Math.max(dt, 1e-3) - velYaw) * k;
    velPitch += ((dragPitch - prevPitch) / Math.max(dt, 1e-3) - velPitch) * k;
    velYaw = clamp(velYaw, -7, 7);
    velPitch = clamp(velPitch, -4, 4);
  } else {
    dragYaw += velYaw * dt;
    dragPitch = clamp(dragPitch + velPitch * dt, -0.60, 0.60);
    const decay = Math.pow(0.018, dt);
    velYaw *= decay; velPitch *= decay;
    release = Math.max(0, release - dt);
    if (release <= 0) {
      const home = Math.round(dragYaw / (Math.PI * 2)) * Math.PI * 2;
      const k = Math.min(1, dt * 0.55);
      dragYaw += (home - dragYaw) * k;
      dragPitch -= dragPitch * k;
    }
  }
  prevYaw = dragYaw; prevPitch = dragPitch;

  mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3.0);
  mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3.0);
  const idle = REDUCED ? 0 : 1;
  const rise = 1 - intro;
  group.rotation.y = dragYaw + mouse.x * 0.16 + Math.sin(t * 0.23) * 0.045 * idle;
  group.rotation.x = dragPitch - mouse.y * 0.11 + Math.sin(t * 0.19) * 0.026 * idle + rise * 0.28;
  group.rotation.z = Math.sin(t * 0.27) * 0.018 * idle;
  group.position.y = Math.sin(t * 0.36) * 0.06 * idle - rise * 0.7;
  group.position.x = Math.sin(t * 0.21) * 0.05 * idle + mouse.x * 0.10;
  group.updateMatrixWorld();

  hover += (hoverTarget - hover) * Math.min(1, dt * 4.5);
  uni.uMouse.value.set(mouse.x, mouse.y);
  uni.uHover.value = hover;
  touchLight.intensity = hover * 2.6 * intro;
  if (hover > 0.002) {
    lightPos.set(mouse.tx, -mouse.ty, 0.5).unproject(camera).sub(camera.position).normalize();
    touchLight.position.copy(camera.position)
      .addScaledVector(lightPos, (1.75 - camera.position.z) / lightPos.z);
  }

  buildQuad();
  const wantCursor = dragging ? 'grabbing' : (overSheet ? 'grab' : '');
  if (wantCursor !== cursorNow) { cursorNow = wantCursor; if (sheetEl) sheetEl.style.cursor = wantCursor; }

  renderer.render(scene, camera);
}

function boot() {
  const t2 = makeCertTexture();
  tex.dispose(); mat.map = t2; mat.needsUpdate = true;
  resize();
  mesh.visible = true; mat.opacity = 0.002;
  renderer.compile(scene, camera); renderer.render(scene, camera);
  mat.opacity = 1;
  frame();
}

if (document.fonts && document.fonts.ready) {
  Promise.race([
    Promise.all([
      document.fonts.load('700 104px "Inter Tight"'),
      document.fonts.load('600 110px "Inter Tight"'),
      document.fonts.load('600 34px "Inter"'),
      document.fonts.load('500 22px "Inter"')
    ]).then(() => document.fonts.ready),
    new Promise(r => setTimeout(r, 2500))
  ]).then(boot);
} else boot();

window.__sheet = {
  group, mat, uni, renderer, scene, camera, mesh,
  state: () => ({ intro, dragYaw, dragPitch, hover, quad }),
  hit: (x, y) => inQuad(x, y),
  spin: (y) => { dragYaw = y; release = 1e9; }
};
})();
