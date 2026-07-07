const canvas = document.getElementById('snake');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');

const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');

const GRID = 20;
const HIGH_KEY = 'snake-high-score';

const COLOR = {
  grid: 'rgba(236, 231, 222, 0.045)',
  body: '#e0a458',
  head: '#f0be74',
  food: '#d95f54',
};

const lb = window.Leaderboard
  ? Leaderboard.create({ game: 'snake', panel: document.getElementById('leaderboard'), overlaySub })
  : { gameOver() {}, reset() {}, isCapturing() { return false; } };

let cell = 24;
let snake, dir, nextDir, food, score, speedMs;
let state = 'ready'; // ready | run | pause | over
let high = Number(localStorage.getItem(HIGH_KEY) || 0);
let lastTime = 0;
let acc = 0;

function resize() {
  const size = stage.clientWidth;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  cell = canvas.width / GRID;
}

function init() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  speedMs = 140;
  acc = 0;
  state = 'ready';
  placeFood();
  lb.reset();
  hideOverlay();
  updateScores();
}

function updateScores() {
  scoreEl.textContent = score;
  highEl.textContent = high;
}

function cellsEqual(a, b) { return a.x === b.x && a.y === b.y; }

function placeFood() {
  let spot;
  do {
    spot = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (snake.some(seg => cellsEqual(seg, spot)));
  food = spot;
}

function setDirection(x, y) {
  if (state === 'over') return;
  if (x === -dir.x && y === -dir.y) return;
  nextDir = { x, y };
  if (state === 'ready') state = 'run';
  if (state === 'pause') setPause(false);
}

function step() {
  dir = nextDir;
  const head = snake[0];
  const next = { x: head.x + dir.x, y: head.y + dir.y };

  const hitWall = next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID;
  if (hitWall || snake.some(seg => cellsEqual(seg, next))) {
    endGame();
    return;
  }

  snake.unshift(next);
  if (cellsEqual(next, food)) {
    score += 10;
    if ((score / 10) % 5 === 0) speedMs = Math.max(60, speedMs - 10);
    if (score > high) {
      high = score;
      localStorage.setItem(HIGH_KEY, String(high));
    }
    placeFood();
    updateScores();
  } else {
    snake.pop();
  }
}

function endGame() {
  state = 'over';
  updateScores();
  showOverlay('Game over', 'score ' + score + ' · press or tap to go again');
  lb.gameOver(score);
}

function setPause(on) {
  if (state !== 'run' && state !== 'pause') return;
  state = on ? 'pause' : 'run';
  if (on) showOverlay('Paused', 'press or tap to resume');
  else hideOverlay();
}

function showOverlay(title, sub) {
  overlayTitle.textContent = title;
  overlaySub.textContent = sub;
  overlay.hidden = false;
}

function hideOverlay() { overlay.hidden = true; }

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = COLOR.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(canvas.width, i * cell);
    ctx.stroke();
  }

  // Food: a dot
  ctx.fillStyle = COLOR.food;
  ctx.beginPath();
  ctx.arc((food.x + 0.5) * cell, (food.y + 0.5) * cell, cell * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Snake
  const inset = cell * 0.09;
  const r = cell * 0.24;
  for (let i = snake.length - 1; i >= 0; i--) {
    const seg = snake[i];
    ctx.fillStyle = i === 0 ? COLOR.head : COLOR.body;
    ctx.beginPath();
    ctx.roundRect(seg.x * cell + inset, seg.y * cell + inset, cell - inset * 2, cell - inset * 2, r);
    ctx.fill();
  }
}

function loop(time = 0) {
  const dt = time - lastTime;
  lastTime = time;
  if (state === 'run') {
    acc += dt;
    while (acc >= speedMs && state === 'run') {
      step();
      acc -= speedMs;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

// Keyboard
document.addEventListener('keydown', (e) => {
  if (lb.isCapturing()) return;
  const k = e.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();

  if (state === 'over') {
    if (k === ' ' || k === 'Enter') { init(); return; }
  }

  switch (k) {
    case 'ArrowUp': case 'w': case 'W': setDirection(0, -1); break;
    case 'ArrowDown': case 's': case 'S': setDirection(0, 1); break;
    case 'ArrowLeft': case 'a': case 'A': setDirection(-1, 0); break;
    case 'ArrowRight': case 'd': case 'D': setDirection(1, 0); break;
    case ' ': case 'Escape':
      if (state === 'run') setPause(true);
      else if (state === 'pause') setPause(false);
      break;
  }
});

// Touch: swipe steers (works mid-swipe), tap pauses/restarts
const SWIPE = 22;
let touch = null;

stage.addEventListener('touchstart', (e) => {
  if (lb.isCapturing()) { e.preventDefault(); touch = null; return; }
  e.preventDefault();
  const p = e.touches[0];
  touch = { x: p.clientX, y: p.clientY, moved: false };
}, { passive: false });

stage.addEventListener('touchmove', (e) => {
  if (!touch) return;
  e.preventDefault();
  const p = e.touches[0];
  const dx = p.clientX - touch.x;
  const dy = p.clientY - touch.y;
  if (Math.abs(dx) < SWIPE && Math.abs(dy) < SWIPE) return;
  if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
  else setDirection(0, dy > 0 ? 1 : -1);
  touch = { x: p.clientX, y: p.clientY, moved: true };
}, { passive: false });

stage.addEventListener('touchend', (e) => {
  if (!touch) return;
  if (lb.isCapturing()) { touch = null; return; }
  e.preventDefault();
  if (!touch.moved) {
    if (state === 'over') init();
    else if (state === 'run') setPause(true);
    else if (state === 'pause') setPause(false);
  }
  touch = null;
}, { passive: false });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'run') setPause(true);
});

document.getElementById('btn-restart').addEventListener('click', () => {
  init();
});

window.addEventListener('resize', resize);
resize();
init();
loop();
