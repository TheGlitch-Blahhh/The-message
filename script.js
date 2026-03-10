const WORD = 'Hai jhaz ◉⁠‿⁠◉';

const NUM_PARTICLES  = 15000;
const FORM_LERP      = 0.058;
const IDLE_LERP      = 0.040;
const POS_LERP       = 0.070;
const ROT_LERP       = 0.070;
const MAX_ROT_ANGLE  = 1.00;
const SHIMMER_COUNT  = 5;
const SHIMMER_SPEED  = 0.050;
const HOLD_DURATION  = 5000;

const PALETTE = [
  [1.00, 0.60, 0.80],
  [1.00, 0.75, 0.88],
  [0.90, 0.55, 1.00],
  [0.78, 0.60, 1.00],
  [1.00, 0.50, 0.75],
  [0.95, 0.80, 1.00],
];

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setClearColor(0x05000d, 1);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 380;

const hint     = document.getElementById('hint');
const ringWrap = document.getElementById('ring-wrap');
const ringFill = document.getElementById('ring-fill');
const openBtn  = document.getElementById('open-btn');

const RING_CIRC = 314;

let isHeld      = false;
let holdStart   = null;
let holdElapsed = 0;
let unlocked    = false;

let rotX = 0, rotY = 0;
let targetRotX = 0, targetRotY = 0;
let targetPosX = 0, targetPosY = 0;

const posArr = new Float32Array(NUM_PARTICLES * 3);
const colArr = new Float32Array(NUM_PARTICLES * 3);
const cX = new Float32Array(NUM_PARTICLES);
const cY = new Float32Array(NUM_PARTICLES);
const cZ = new Float32Array(NUM_PARTICLES);
const dX = new Float32Array(NUM_PARTICLES);
const dY = new Float32Array(NUM_PARTICLES);
const dZ = new Float32Array(NUM_PARTICLES);
const vX = new Float32Array(NUM_PARTICLES);
const vY = new Float32Array(NUM_PARTICLES);
const tX = new Float32Array(NUM_PARTICLES);
const tY = new Float32Array(NUM_PARTICLES);
const tZ = new Float32Array(NUM_PARTICLES);

const shimmerTarget = new Int32Array(NUM_PARTICLES).fill(-1);
let textPtsCache = null;

function screenToWorld(clientX, clientY) {
  const ndc = new THREE.Vector3(
    (clientX / innerWidth)  *  2 - 1,
    (clientY / innerHeight) * -2 + 1,
    0.5
  );
  ndc.unproject(camera);
  const dir = ndc.sub(camera.position).normalize();
  const t   = -camera.position.z / dir.z;
  return {
    x: camera.position.x + dir.x * t,
    y: camera.position.y + dir.y * t,
  };
}

function sampleTextPixels() {
  const W = 1024, H = 256;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 120px Arial, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(WORD, W / 2, H / 2);

  const { data } = ctx.getImageData(0, 0, W, H);
  const pts = [];
  const STEP = 1;

  for (let y = 0; y < H; y += STEP) {
    for (let x = 0; x < W; x += STEP) {
      if (data[(y * W + x) * 4] > 120) {
        pts.push([
          (x - W / 2) * 0.28,
          -(y - H / 2) * 0.28,
          (Math.random() - 0.5) * 10,
        ]);
      }
    }
  }

  for (let i = pts.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
}

function buildParticles() {
  const textPts = sampleTextPixels();
  textPtsCache  = textPts;

  for (let i = 0; i < NUM_PARTICLES; i++) {
    dX[i] = (Math.random() - 0.5) * 750;
    dY[i] = (Math.random() - 0.5) * 520;
    dZ[i] = (Math.random() - 0.5) * 260;
    vX[i] = (Math.random() - 0.5) * 0.32;
    vY[i] = (Math.random() - 0.5) * 0.32;

    cX[i] = dX[i]; cY[i] = dY[i]; cZ[i] = dZ[i];

    const tp = textPts[i % textPts.length];
    tX[i] = tp[0]; tY[i] = tp[1]; tZ[i] = tp[2];

    posArr[i * 3]     = cX[i];
    posArr[i * 3 + 1] = cY[i];
    posArr[i * 3 + 2] = cZ[i];

    const c = PALETTE[i % PALETTE.length];
    colArr[i * 3]     = c[0];
    colArr[i * 3 + 1] = c[1];
    colArr[i * 3 + 2] = c[2];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colArr, 3));

  const sprite = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,    'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.6,  'rgba(255,255,255,0.15)');
    g.addColorStop(1,    'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const mat = new THREE.PointsMaterial({
    vertexColors:    true,
    size:            3.5,
    map:             sprite,
    sizeAttenuation: false,
    transparent:     true,
    opacity:         0.95,
    blending:        THREE.NormalBlending,
    depthWrite:      false,
  });

  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);
  return { geo, mesh };
}

const { geo: geometry, mesh: points } = buildParticles();

function onHoldStart(clientX, clientY) {
  isHeld    = true;
  holdStart = performance.now() - holdElapsed;

  if (!unlocked) {
    hint.classList.add('hidden');
    ringWrap.classList.add('visible');
  }

  const wp   = screenToWorld(clientX, clientY);
  targetPosX = wp.x;
  targetPosY = wp.y;
  updateRotation(clientX, clientY);
}

function onMove(clientX, clientY) {
  if (!isHeld) return;
  updateRotation(clientX, clientY);
}

function updateRotation(clientX, clientY) {
  const nx = (clientX / innerWidth)  - 0.5;
  const ny = (clientY / innerHeight) - 0.5;
  targetRotY =  nx * MAX_ROT_ANGLE * 2;
  targetRotX =  ny * MAX_ROT_ANGLE * 2;
}

function onHoldEnd() {
  isHeld      = false;
  holdElapsed = 0;
  targetRotX  = 0;
  targetRotY  = 0;
  targetPosX  = 0;
  targetPosY  = 0;

  if (!unlocked) {
    hint.classList.remove('hidden');
    ringWrap.classList.remove('visible');
    ringFill.style.strokeDashoffset = RING_CIRC;
  }
}

function onUnlock() {
  unlocked = true;
  ringWrap.classList.remove('visible');
  openBtn.classList.add('visible');
}

const el = renderer.domElement;

el.addEventListener('touchstart', e => {
  e.preventDefault();
  onHoldStart(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

el.addEventListener('touchmove', e => {
  e.preventDefault();
  onMove(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

el.addEventListener('touchend',    e => { e.preventDefault(); onHoldEnd(); }, { passive: false });
el.addEventListener('touchcancel', e => { e.preventDefault(); onHoldEnd(); }, { passive: false });

el.addEventListener('mousedown',  e => onHoldStart(e.clientX, e.clientY));
el.addEventListener('mousemove',  e => onMove(e.clientX, e.clientY));
el.addEventListener('mouseup',    ()  => onHoldEnd());
el.addEventListener('mouseleave', ()  => { if (isHeld) onHoldEnd(); });

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  requestAnimationFrame(animate);

  if (isHeld && !unlocked) {
    holdElapsed = performance.now() - holdStart;
    const progress = Math.min(holdElapsed / HOLD_DURATION, 1);
    ringFill.style.strokeDashoffset = RING_CIRC * (1 - progress);
    if (progress >= 1) onUnlock();
  }

  const buf = geometry.attributes.position.array;

  rotX += (targetRotX - rotX) * ROT_LERP;
  rotY += (targetRotY - rotY) * ROT_LERP;
  points.rotation.x = rotX;
  points.rotation.y = rotY;

  points.position.x += (targetPosX - points.position.x) * POS_LERP;
  points.position.y += (targetPosY - points.position.y) * POS_LERP;

  if (isHeld && textPtsCache) {
    for (let s = 0; s < SHIMMER_COUNT; s++) {
      const i = (Math.random() * NUM_PARTICLES) | 0;
      const j = (Math.random() * textPtsCache.length) | 0;
      shimmerTarget[i] = j;
    }
  }

  for (let i = 0; i < NUM_PARTICLES; i++) {
    let gx, gy, gz, speed;

    if (isHeld) {
      if (shimmerTarget[i] !== -1) {
        const tp = textPtsCache[shimmerTarget[i]];
        gx    = tp[0];
        gy    = tp[1];
        gz    = tp[2];
        speed = SHIMMER_SPEED;
        const dx = gx - cX[i], dy = gy - cY[i];
        if (dx * dx + dy * dy < 4) shimmerTarget[i] = -1;
      } else {
        gx    = tX[i];
        gy    = tY[i];
        gz    = tZ[i];
        speed = FORM_LERP;
      }
    } else {
      dX[i] += vX[i];
      dY[i] += vY[i];

      if (dX[i] >  400) dX[i] = -400;
      if (dX[i] < -400) dX[i] =  400;
      if (dY[i] >  290) dY[i] = -290;
      if (dY[i] < -290) dY[i] =  290;

      gx    = dX[i];
      gy    = dY[i];
      gz    = dZ[i];
      speed = IDLE_LERP;
    }

    cX[i] += (gx - cX[i]) * speed;
    cY[i] += (gy - cY[i]) * speed;
    cZ[i] += (gz - cZ[i]) * speed;

    buf[i * 3]     = cX[i];
    buf[i * 3 + 1] = cY[i];
    buf[i * 3 + 2] = cZ[i];
  }

  geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}

animate();
