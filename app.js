// Генератор сторіс «З днем народження» (варіант «Орбіта»). Малює все на canvas 1080×1920.
const W = 1080, H = 1920, FH = 1300;               // FH — висота фото згори
const JET = '#172332', ALICE = '#EEF8FF', GOLD = '#F9DC5C';
const DEG = Math.PI / 180;
const DEF_VERSE = '«Господь тебе збереже від усякого зла, твою душу збереже! Господь стерегтиме вихід твій та вхід твій відтепер аж навіки!»';
const DEF_REF = 'Псалом 121:7–8';
const NAME_FONT = '"Fira Sans Extra Condensed"';

const $ = id => document.getElementById(id);
const cv = $('story'), ctx = cv.getContext('2d');
const ui = {
  file: $('file'), pick: $('pick'), pickText: $('pickText'), name: $('name'), zoom: $('zoom'), refit: $('refit'),
  crown: $('crown'), verse: $('verse'), ref: $('ref'), refPreview: $('refPreview'), save: $('save'), saveHint: $('saveHint'), status: $('status'),
};

const st = {
  img: null, iw: 0, ih: 0, s: 1, L: 0, T: 0, face: null,
  crown: null,               // центр і ширина корони в пікселях фото — їде разом із фото
  showCrown: true, item: 'cake', name: '', verse: DEF_VERSE, ref: DEF_REF,
};

/* ── малюнки (ті самі шляхи, що в bold.html) ── */
const P = {
  star: new Path2D('M0 -1 C.08 -.24 .24 -.08 1 0 C.24 .08 .08 .24 0 1 C-.08 .24 -.24 .08 -1 0 C-.24 -.08 -.08 -.24 0 -1Z'),
  spark: new Path2D('M50 0 C54 38 62 46 100 50 C62 54 54 62 50 100 C46 62 38 54 0 50 C38 46 46 38 50 0Z'),
  crown: ['M16 84 L8 24 L44 54 L70 8 L96 54 L132 22 L124 84 Z', 'M22 70 C60 66 90 66 120 70'].map(d => new Path2D(d)),
  cake: ['M22 112 C22 106 26 104 32 104 L168 104 C174 104 178 106 178 112 L178 182 L22 182 Z',
    'M48 104 L48 72 C48 68 50 66 54 66 L146 66 C150 66 152 68 152 72 L152 104',
    'M22 132 C36 144 50 120 64 132 C78 144 92 120 106 132 C120 144 134 120 148 132 C160 142 170 128 178 132',
    'M78 66 L78 38', 'M100 66 L100 32', 'M122 66 L122 38',
    'M78 32 C72 24 78 16 78 10 C80 16 84 24 78 32Z', 'M100 26 C94 18 100 10 100 4 C102 10 106 18 100 26Z', 'M122 32 C116 24 122 16 122 10 C124 16 128 24 122 32Z'].map(d => new Path2D(d)),
  gift: ['M32 98 L168 98 L168 184 L32 184 Z', 'M22 72 L178 72 L178 98 L22 98 Z', 'M100 72 L100 184',
    'M100 72 C86 44 56 38 54 56 C52 70 80 72 100 72', 'M100 72 C114 44 144 38 146 56 C148 70 120 72 100 72'].map(d => new Path2D(d)),
  orbitFront: new Path2D('M470 0 A470 112 0 0 1 -470 0 L-500 6 L-470 -2 A470 90 0 0 0 470 0 Z'),
  upload: ['M-60 -10 L-60 50 L60 50 L60 -10', 'M0 22 L0 -62', 'M-34 -30 L0 -64 L34 -30'].map(d => new Path2D(d)),
};
const STARS = [[930, 190, 62], [812, 268, 30], [986, 330, 24], [858, 150, 14], [1012, 96, 12], [760, 186, 10]];
const logo = new Image(); logo.src = 'mark-white.png';

/* ── кадр ── */
const smin = () => Math.max(W / st.iw, FH / st.ih);
function clampFrame() {
  st.s = Math.min(Math.max(st.s, smin()), smin() * 4);
  st.L = Math.min(0, Math.max(W - st.iw * st.s, st.L));
  st.T = Math.min(0, Math.max(FH - st.ih * st.s, st.T));
  ui.zoom.value = (st.s / smin()).toFixed(2);
}
function zoomAt(ns, px, py) {
  const u = (px - st.L) / st.s, v = (py - st.T) / st.s;
  st.s = Math.min(Math.max(ns, smin()), smin() * 4);
  st.L = px - u * st.s; st.T = py - v * st.s;
  clampFrame();
}
function autoFrame() {
  const m = smin(), f = st.face;
  if (f) {
    // f.a — середнє з «між очима» і «очі—рот»: стабільна міра обличчя на будь-якому фото
    st.s = Math.max(130 / f.a, m);
    st.L = 540 - f.cx * st.s; st.T = 660 - f.cy * st.s;
    clampFrame();
    const w = Math.max(110, Math.min(260, f.a * 1.5 * st.s)) / st.s;
    st.crown = { u: f.ex + f.a * .3, v: f.ey - f.a * 1.38 - w * .22, w };
  } else {
    st.s = m; st.L = (W - st.iw * m) / 2; st.T = (FH - st.ih * m) * .3;
    clampFrame();
    st.crown = { u: (560 - st.L) / st.s, v: (360 - st.T) / st.s, w: 180 / st.s };
  }
}
const crownScreen = () => st.crown && { x: st.L + st.crown.u * st.s, y: st.T + st.crown.v * st.s, w: st.crown.w * st.s };

/* ── текст ── */
const font = (wt, px, fam = 'Onest') => `${wt} ${px}px ${fam}`;
function tracked(text, f, track, cx, cy, rot = 0, skew = 0, color = GOLD) {
  ctx.save(); ctx.font = f; ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const ch = [...text], ws = ch.map(c => ctx.measureText(c).width);
  const total = ws.reduce((a, b) => a + b, 0) + track * (ch.length - 1);
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.transform(1, 0, Math.tan(skew), 1, 0, 0);
  let x = -total / 2; ch.forEach((c, i) => { ctx.fillText(c, x, 0); x += ws[i] + track; });
  ctx.restore();
}
function wrap(text, maxW) {
  const lines = []; let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/* ── малювання ── */
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = JET; ctx.fillRect(0, 0, W, H);

  // фото + затемнення
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, FH); ctx.clip();
  if (st.img) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(st.img, st.L, st.T, st.iw * st.s, st.ih * st.s);
  } else emptyPhoto();
  let g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, 'rgba(23,35,50,.55)'); g.addColorStop(1, 'rgba(23,35,50,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 300);
  g = ctx.createLinearGradient(0, 0, 0, FH);
  g.addColorStop(.58, 'rgba(23,35,50,0)'); g.addColorStop(.82, 'rgba(23,35,50,.8)'); g.addColorStop(1, JET);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, FH);
  ctx.restore();

  // зірки
  ctx.fillStyle = GOLD;
  for (const [x, y, r] of STARS) { ctx.save(); ctx.translate(x, y); ctx.scale(r, r); ctx.fill(P.star); ctx.restore(); }
  ctx.fillStyle = ALICE;
  for (const [x, y, r] of [[890, 356, 7], [1036, 232, 6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); }

  // торт / подарунок
  ctx.save(); ctx.translate(946, 1730); ctx.rotate(12 * DEG); ctx.translate(-100, -100);
  ctx.strokeStyle = ALICE; ctx.lineWidth = st.item === 'cake' ? 6 : 7; ctx.lineCap = ctx.lineJoin = 'round';
  P[st.item].forEach(p => ctx.stroke(p)); ctx.restore();

  // корона
  const c = crownScreen();
  if (st.img && st.showCrown && c) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(-8 * DEG); const k = c.w / 140; ctx.scale(k, k); ctx.translate(-70, -50);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 7; ctx.lineCap = ctx.lineJoin = 'round';
    P.crown.forEach(p => ctx.stroke(p)); ctx.restore();
  }

  // іскра біля імені, задня частина орбіти
  ctx.save(); ctx.translate(110, 1210); ctx.scale(.74, .74); ctx.fillStyle = GOLD; ctx.fill(P.spark); ctx.restore();
  ctx.save(); ctx.translate(540, 1290); ctx.rotate(-9 * DEG);
  ctx.beginPath(); ctx.ellipse(0, 0, 470, 112, 0, Math.PI, 2 * Math.PI); ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();

  // «Платформа вітає / ІМ'Я / з днем народження»
  tracked('ПЛАТФОРМА ВІТАЄ', font(600, 40), 8.8, 540, 1121, -4 * DEG, -10 * DEG);
  const name = (st.name.trim() || 'Ім\'я').toLocaleUpperCase('uk');
  let fs = 220; ctx.font = font(900, fs, NAME_FONT);
  while (ctx.measureText(name).width > 820 && fs > 60) { fs -= 4; ctx.font = font(900, fs, NAME_FONT); }
  ctx.save(); ctx.translate(540, 1150 + fs * .47); ctx.rotate(-4 * DEG); ctx.transform(1, 0, Math.tan(-9 * DEG), 1, 0, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ALICE; ctx.globalAlpha = st.name.trim() ? 1 : .35;
  ctx.fillText(name, 0, 0); ctx.restore();
  ctx.save(); ctx.translate(540, 1290); ctx.rotate(-9 * DEG); ctx.fillStyle = GOLD; ctx.fill(P.orbitFront); ctx.restore();
  tracked('З ДНЕМ НАРОДЖЕННЯ', font(600, 40), 8.8, 540, 1449, -4 * DEG, -10 * DEG);

  // вірш
  const verse = st.verse.trim(), ref = st.ref.trim().toLocaleUpperCase('uk');
  if (verse) {
    let vf = 36, lines, lh, total;
    for (; ; vf--) {
      ctx.font = font(500, vf); lines = wrap(verse, 888); lh = vf * 1.36;
      total = lines.length * lh + (ref ? 16 + 36 : 0);
      if (total <= 250 || vf <= 24) break;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(238,248,255,.92)';
    lines.forEach((l, i) => ctx.fillText(l, 540, 1516 + lh * (i + .5)));
    if (ref) tracked(ref, font(600, 28), 3.36, 540, 1516 + lines.length * lh + 16 + 18);
  }

  // логотип
  if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, 96, 228, 104 * logo.naturalWidth / logo.naturalHeight, 104);
}

function emptyPhoto() {
  const g = ctx.createLinearGradient(0, 0, 0, FH);
  g.addColorStop(0, '#2A3B54'); g.addColorStop(1, JET);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, FH);
  ctx.save(); ctx.translate(540, 560); ctx.strokeStyle = 'rgba(238,248,255,.75)'; ctx.lineWidth = 7; ctx.lineCap = ctx.lineJoin = 'round';
  P.upload.forEach(p => ctx.stroke(p)); ctx.restore();
  ctx.fillStyle = 'rgba(238,248,255,.85)'; ctx.font = font(600, 46); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Натисни, щоб додати фото', 540, 690);
}

let raf = 0;
const redraw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };

/* ── обличчя: MediaPipe, вантажиться лише коли з'являється фото ── */
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
let detP = null;
function detector() {
  detP ??= (async () => {
    const v = await import(`${MP}/vision_bundle.mjs`);
    const files = await v.FilesetResolver.forVisionTasks(`${MP}/wasm`);
    return v.FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite', delegate: 'CPU' },
      runningMode: 'IMAGE', minDetectionConfidence: .5,
    });
  })();
  return detP;
}
async function findFace(src) {
  try {
    // детектор погано бачить дрібні обличчя на великому кадрі: даємо зменшену копію
    const k = Math.min(1, 1024 / Math.max(src.width, src.height));
    const c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    const det = await detector();
    const d = det.detect(c).detections.sort((a, b) => b.boundingBox.width - a.boundingBox.width)[0];
    if (!d) return null;
    const kp = d.keypoints?.map(p => ({ x: p.x * c.width / k, y: p.y * c.height / k }));
    if (kp?.length >= 4) {                       // 0,1 — очі, 3 — рот
      const ex = (kp[0].x + kp[1].x) / 2, ey = (kp[0].y + kp[1].y) / 2;
      const eye = Math.hypot(kp[0].x - kp[1].x, kp[0].y - kp[1].y), mouth = Math.hypot(kp[3].x - ex, kp[3].y - ey);
      return { ex, ey, a: (eye + mouth) / 2, cx: (ex + kp[3].x) / 2, cy: (ey + kp[3].y) / 2 };
    }
    const b = d.boundingBox, a = b.height / k * .42;
    return { ex: (b.originX + b.width / 2) / k, ey: (b.originY + b.height * .4) / k, a, cx: (b.originX + b.width / 2) / k, cy: (b.originY + b.height / 2) / k };
  } catch (e) { console.warn('face detection failed', e); return null; }
}

/* ── фото ── */
function setStatus(t, warn = false) { ui.status.textContent = t; ui.status.classList.toggle('warn', warn); }
function loadImage(src) {
  return new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = src; });
}
async function usePhoto(src) {
  let im;
  try { im = await loadImage(src); } catch { setStatus('Це фото не відкрилось. Спробуй інше, у форматі JPG або PNG.', true); return; }
  const k = Math.min(1, 2400 / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  Object.assign(st, { img: c, iw: c.width, ih: c.height, face: null });
  autoFrame(); draw(); syncUi();
  setStatus('Шукаю обличчя…');
  const f = await findFace(c);
  if (st.img !== c) return;
  st.face = f; autoFrame(); draw(); syncUi();
  setStatus(f ? 'Кадр поставлено по обличчю. Можна посунути фото й корону.' : 'Обличчя не знайшов. Постав фото й корону вручну.', !f);
}
ui.pick.onclick = () => ui.file.click();
ui.file.onchange = () => {
  const f = ui.file.files[0]; if (!f) return;
  const url = URL.createObjectURL(f);
  usePhoto(url).finally(() => setTimeout(() => URL.revokeObjectURL(url), 1000));
  ui.file.value = '';
};

/* ── жести: тягнути фото / корону, щипок і колесо — масштаб ── */
const ptrs = new Map(); let mode = null, last = null, pinch = null;
const toCanvas = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
function hitCrown(p) {
  const c = crownScreen(); if (!c || !st.showCrown) return false;
  return Math.abs(p.x - c.x) < c.w * .65 && Math.abs(p.y - c.y) < c.w * .55;
}
const pair = () => { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
cv.addEventListener('pointerdown', e => {
  const p = toCanvas(e);
  if (!st.img) { if (p.y < FH) ui.file.click(); return; }
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, p);
  if (ptrs.size === 1) { mode = hitCrown(p) ? 'crown' : (p.y < FH ? 'photo' : null); last = p; }
  else if (ptrs.size === 2) { mode = 'pinch'; pinch = { ...pair(), s: st.s }; }
  cv.classList.toggle('dragging', !!mode);
});
cv.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  const p = toCanvas(e); ptrs.set(e.pointerId, p);
  if (mode === 'photo') { st.L += p.x - last.x; st.T += p.y - last.y; clampFrame(); last = p; redraw(); }
  else if (mode === 'crown') { st.crown.u += (p.x - last.x) / st.s; st.crown.v += (p.y - last.y) / st.s; last = p; redraw(); }
  else if (mode === 'pinch' && ptrs.size === 2) {
    const q = pair(); st.L += q.x - pinch.x; st.T += q.y - pinch.y; pinch.x = q.x; pinch.y = q.y;
    zoomAt(pinch.s * q.d / pinch.d, q.x, q.y); redraw();
  }
});
const up = e => {
  ptrs.delete(e.pointerId);
  if (ptrs.size === 1 && mode === 'pinch') { mode = 'photo'; last = [...ptrs.values()][0]; }
  if (!ptrs.size) { mode = null; cv.classList.remove('dragging'); }
};
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => {
  if (!st.img) return; e.preventDefault();
  const p = toCanvas(e); zoomAt(st.s * Math.exp(-e.deltaY * .0015), p.x, Math.min(p.y, FH)); redraw();
}, { passive: false });
ui.zoom.oninput = () => { zoomAt(smin() * +ui.zoom.value, 540, 650); redraw(); };
ui.refit.onclick = () => { autoFrame(); redraw(); };

/* ── поля ── */
ui.verse.value = DEF_VERSE; ui.ref.value = DEF_REF;
function syncUi() {
  const ready = !!st.img && !!st.name.trim();
  ui.save.disabled = !ready;
  ui.saveHint.textContent = !st.img && !st.name.trim() ? 'Спершу додай фото й ім\'я' : !st.img ? 'Ще потрібне фото' : !st.name.trim() ? 'Ще потрібне ім\'я' : '1080 × 1920, PNG для сторіс';
  ui.zoom.disabled = ui.refit.disabled = !st.img;
  ui.pickText.textContent = st.img ? 'Змінити фото' : 'Обрати фото';
  ui.refPreview.textContent = st.verse.trim() ? (st.ref.trim() || 'без посилання') : 'немає';
}
ui.name.oninput = () => { st.name = ui.name.value; redraw(); syncUi(); };
ui.verse.oninput = () => { st.verse = ui.verse.value; redraw(); syncUi(); };
ui.ref.oninput = () => { st.ref = ui.ref.value; redraw(); syncUi(); };
ui.crown.onchange = () => { st.showCrown = ui.crown.checked; redraw(); };
document.querySelectorAll('input[name=item]').forEach(r => r.onchange = () => { st.item = r.value; redraw(); });

/* ── збереження ── */
ui.save.onclick = async () => {
  draw();
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const slug = st.name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'imenynnyk';
  const file = new File([blob], `z-dnem-narodzhennya-${slug}.png`, { type: 'image/png' });
  if (matchMedia('(pointer:coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/* ── старт ── */
const sample = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯабвгґдеєжзиіїйклмнопрстуфхцчшщьюя«»’!–:0123456789';
await Promise.all([
  document.fonts.load(font(900, 100, NAME_FONT), sample), document.fonts.load(font(600, 40), sample), document.fonts.load(font(500, 36), sample),
  new Promise(r => { if (logo.complete) r(); else logo.onload = logo.onerror = r; }),
]);
draw(); syncUi();
// для перевірки: ?photo=_test/x.jpg&name=Даню (лише файли з цього ж сайту)
const qs = new URLSearchParams(location.search);
if (qs.get('name')) { ui.name.value = qs.get('name'); ui.name.oninput(); }
if (qs.get('photo') && !/^[a-z]+:/i.test(qs.get('photo'))) usePhoto(qs.get('photo'));
if (qs.get('raw')) { document.querySelector('.panel').style.display = 'none'; Object.assign(cv.style, { position: 'fixed', left: 0, top: 0, width: '1080px', height: '1920px', zIndex: 9 }); }
setTimeout(() => { document.body.dataset.ready = '1'; }, 0);
