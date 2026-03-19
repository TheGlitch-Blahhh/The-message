const cur = document.getElementById('cur');
let mx = 0, my = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
(function moveCur() {
  cur.style.left = mx + 'px';
  cur.style.top  = my + 'px';
  requestAnimationFrame(moveCur);
})();

const cv  = document.getElementById('star-canvas');
const ctx = cv.getContext('2d');
let W, H, stars = [];

function resize() {
  W = cv.width  = window.innerWidth;
  H = cv.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); buildStars(); });

function buildStars() {
  stars = [];
  const n = Math.min(180, Math.floor(W * H / 5000));
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.1 + 0.25,
      phase: Math.random() * Math.PI * 2,
      spd: Math.random() * 0.008 + 0.002,
      h: 320 + Math.floor(Math.random() * 40),
      s: 60 + Math.floor(Math.random() * 30),
    });
  }
}
buildStars();

let shoot = null;
function launchShoot() {
  shoot = {
    x: Math.random() * W * 0.65,
    y: Math.random() * H * 0.35,
    len: 80 + Math.random() * 110,
    prog: 0,
  };
  setTimeout(launchShoot, 6000 + Math.random() * 10000);
}
setTimeout(launchShoot, 3000);

let t = 0, last = 0;
function draw(ts) {
  if (ts - last < 25) { requestAnimationFrame(draw); return; }
  last = ts;
  t += 0.018;

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const a = 0.2 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.spd * 55 + s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 6.2832);
    ctx.fillStyle = `hsla(${s.h},${s.s}%,88%,${a})`;
    ctx.fill();
  }

  if (shoot) {
    shoot.prog += 0.055;
    if (shoot.prog >= 1) { shoot = null; }
    else {
      const angle = Math.PI / 5;
      const ex = shoot.x + Math.cos(angle) * shoot.len * shoot.prog;
      const ey = shoot.y + Math.sin(angle) * shoot.len * shoot.prog;
      const g = ctx.createLinearGradient(shoot.x, shoot.y, ex, ey);
      const fade = 1 - shoot.prog;
      g.addColorStop(0, 'rgba(255,200,220,0)');
      g.addColorStop(0.6, `rgba(255,210,228,${0.45 * fade})`);
      g.addColorStop(1,   `rgba(255,240,248,${0.8 * fade})`);
      ctx.beginPath();
      ctx.moveTo(shoot.x, shoot.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

const pw   = document.getElementById('petals');
const syms = ['✿','❀','✾','❁','·'];
const pcol = [
  'rgba(240,150,185,0.8)',
  'rgba(220,130,165,0.7)',
  'rgba(255,180,210,0.75)',
  'rgba(200,120,155,0.65)',
];
let petalCount = 0;
const MAX_PETALS = 10;

function spawnPetal() {
  if (petalCount >= MAX_PETALS) return;
  petalCount++;
  const p = document.createElement('div');
  p.className = 'fp';
  p.textContent = syms[Math.floor(Math.random() * syms.length)];
  p.style.left       = Math.random() * 100 + 'vw';
  p.style.top        = '-30px';
  p.style.fontSize   = (0.5 + Math.random() * 0.7) + 'rem';
  p.style.color      = pcol[Math.floor(Math.random() * pcol.length)];
  p.style.textShadow = '0 0 6px rgba(240,140,180,0.6)';
  const dur = 15 + Math.random() * 10;
  p.style.animationDuration = dur + 's';
  p.style.animationDelay    = '0s';
  pw.appendChild(p);
  setTimeout(() => { p.remove(); petalCount--; }, dur * 1000);
}
setInterval(spawnPetal, 1800);
for (let i = 0; i < 6; i++) setTimeout(spawnPetal, i * 400);

const els = document.querySelectorAll('.reveal');
const io  = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
  });
}, { threshold: 0.1 });
els.forEach(r => io.observe(r));
