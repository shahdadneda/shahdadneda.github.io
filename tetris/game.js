const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nctx = nextCanvas.getContext('2d');
const stage = document.getElementById('stage');

const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const linesEl = document.getElementById('lines');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');
const pauseBtn = document.getElementById('btn-pause');

const COLS = 10;
const ROWS = 20;
const HIGH_KEY = 'tetris-high-score';
const LINE_SCORE = [0, 100, 300, 500, 800];

const COLORS = {
  I: '#62c3cb',
  J: '#7287d0',
  L: '#d99a55',
  O: '#d3ba58',
  S: '#8cb96e',
  T: '#af7fd0',
  Z: '#d96a5f',
};

function createPiece(type) {
  switch (type) {
    case 'I': return [
      ['', '', '', ''],
      ['I', 'I', 'I', 'I'],
      ['', '', '', ''],
      ['', '', '', ''],
    ];
    case 'J': return [
      ['J', '', ''],
      ['J', 'J', 'J'],
      ['', '', ''],
    ];
    case 'L': return [
      ['', '', 'L'],
      ['L', 'L', 'L'],
      ['', '', ''],
    ];
    case 'O': return [
      ['O', 'O'],
      ['O', 'O'],
    ];
    case 'S': return [
      ['', 'S', 'S'],
      ['S', 'S', ''],
      ['', '', ''],
    ];
    case 'T': return [
      ['', 'T', ''],
      ['T', 'T', 'T'],
      ['', '', ''],
    ];
    case 'Z': return [
      ['Z', 'Z', ''],
      ['', 'Z', 'Z'],
      ['', '', ''],
    ];
  }
}

function createMatrix(w, h) {
  const m = [];
  for (let y = 0; y < h; y++) m.push(new Array(w).fill(''));
  return m;
}

const lb = window.Leaderboard
  ? Leaderboard.create({ game: 'tetris', panel: document.getElementById('leaderboard'), overlaySub })
  : { gameOver() {}, reset() {}, isCapturing() { return false; } };

let B = 30; // block size in canvas px
const arena = createMatrix(COLS, ROWS);
const player = { pos: { x: 0, y: 0 }, matrix: null };

let score = 0;
let lines = 0;
let level = 1;
let high = Number(localStorage.getItem(HIGH_KEY) || 0);
let dropInterval = 520;
let dropCounter = 0;
let lastTime = 0;
let state = 'run'; // run | pause | over
let bag = [];
let nextType = null;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(stage.clientWidth * dpr);
  canvas.height = Math.round(stage.clientWidth * 2 * dpr);
  B = canvas.width / COLS;
  drawNext();
}

function drawFromBag() {
  if (bag.length === 0) {
    bag = 'IJLOSZT'.split('');
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
}

function collide(arena, piece) {
  const m = piece.matrix;
  const o = piece.pos;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] && (!arena[y + o.y] || arena[y + o.y][x + o.x] !== '')) {
        return true;
      }
    }
  }
  return false;
}

function merge() {
  player.matrix.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v) arena[y + player.pos.y][x + player.pos.x] = v;
    });
  });
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

function spawn() {
  if (nextType === null) nextType = drawFromBag();
  player.matrix = createPiece(nextType);
  nextType = drawFromBag();
  player.pos.y = 0;
  player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
  drawNext();
  if (collide(arena, player)) gameOver();
}

function sweep() {
  let cleared = 0;
  outer: for (let y = arena.length - 1; y >= 0; y--) {
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === '') continue outer;
    }
    const row = arena.splice(y, 1)[0].fill('');
    arena.unshift(row);
    y++;
    cleared++;
  }
  if (cleared > 0) {
    score += LINE_SCORE[cleared];
    lines += cleared;
    level = 1 + Math.floor(lines / 10);
    dropInterval = Math.max(90, 520 - (level - 1) * 45);
    if (score > high) {
      high = score;
      localStorage.setItem(HIGH_KEY, String(high));
    }
    updateStats();
  }
}

function playerDrop() {
  if (state !== 'run') return false;
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge();
    sweep();
    updateStats();
    spawn();
    return false;
  }
  dropCounter = 0;
  return true;
}

function hardDrop() {
  while (playerDrop()) {}
}

function playerMove(dir) {
  if (state !== 'run') return;
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir) {
  if (state !== 'run') return;
  const startX = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = startX;
      return;
    }
  }
}

function updateStats() {
  scoreEl.textContent = score;
  highEl.textContent = high;
  linesEl.textContent = lines;
}

function gameOver() {
  state = 'over';
  localStorage.setItem(HIGH_KEY, String(high));
  showOverlay('Game over', 'score ' + score + ' · press or tap to go again');
  lb.gameOver(score);
}

function setPause(on) {
  if (state === 'over') return;
  state = on ? 'pause' : 'run';
  pauseBtn.textContent = on ? 'resume' : 'pause';
  if (on) showOverlay('Paused', 'press or tap to resume');
  else hideOverlay();
}

function showOverlay(title, sub) {
  overlayTitle.textContent = title;
  overlaySub.textContent = sub;
  overlay.hidden = false;
}

function hideOverlay() { overlay.hidden = true; }

function restart() {
  arena.forEach(row => row.fill(''));
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 520;
  dropCounter = 0;
  bag = [];
  nextType = null;
  state = 'run';
  pauseBtn.textContent = 'pause';
  lb.reset();
  hideOverlay();
  updateStats();
  spawn();
}

function drawCell(c, x, y, type, size) {
  const inset = Math.max(1, size * 0.055);
  c.fillStyle = COLORS[type];
  c.fillRect(x * size + inset, y * size + inset, size - inset * 2, size - inset * 2);
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v) drawCell(ctx, x + offset.x, y + offset.y, v, B);
    });
  });
}

function drawGhost() {
  const ghost = { matrix: player.matrix, pos: { x: player.pos.x, y: player.pos.y } };
  while (!collide(arena, { matrix: ghost.matrix, pos: { x: ghost.pos.x, y: ghost.pos.y + 1 } })) {
    ghost.pos.y++;
  }
  if (ghost.pos.y === player.pos.y) return;
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.lineWidth = Math.max(1.5, B * 0.05);
  ghost.matrix.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v) {
        const inset = Math.max(1, B * 0.055);
        ctx.strokeStyle = COLORS[v];
        ctx.strokeRect(
          (x + ghost.pos.x) * B + inset,
          (y + ghost.pos.y) * B + inset,
          B - inset * 2,
          B - inset * 2
        );
      }
    });
  });
  ctx.restore();
}

function drawNext() {
  nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (nextType === null) return;
  const m = createPiece(nextType);
  // Trim to occupied bounding box so the piece sits centered
  let minX = 4, maxX = -1, minY = 4, maxY = -1;
  m.forEach((row, y) => row.forEach((v, x) => {
    if (v) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }));
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const s = 22;
  const ox = (nextCanvas.width - w * s) / 2;
  const oy = (nextCanvas.height - h * s) / 2;
  const inset = 1.5;
  m.forEach((row, y) => row.forEach((v, x) => {
    if (v) {
      nctx.fillStyle = COLORS[v];
      nctx.fillRect(ox + (x - minX) * s + inset, oy + (y - minY) * s + inset, s - inset * 2, s - inset * 2);
    }
  }));
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(236, 231, 222, 0.045)';
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * B, 0);
    ctx.lineTo(x * B, canvas.height);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * B);
    ctx.lineTo(canvas.width, y * B);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawMatrix(arena, { x: 0, y: 0 });
  if (state !== 'over' && player.matrix) {
    drawGhost();
    drawMatrix(player.matrix, player.pos);
  }
}

function update(time = 0) {
  const dt = time - lastTime;
  lastTime = time;
  if (state === 'run') {
    dropCounter += dt;
    if (dropCounter > dropInterval) playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

// Keyboard
document.addEventListener('keydown', (e) => {
  if (lb.isCapturing()) return;
  const k = e.key;
  const lo = k.toLowerCase();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();

  if (state === 'over') {
    if (k === ' ' || k === 'Enter') restart();
    return;
  }
  if (state === 'pause') {
    if (k === ' ' || k === 'Escape' || lo === 'p') setPause(false);
    return;
  }

  if (k === 'ArrowLeft' || lo === 'a') playerMove(-1);
  else if (k === 'ArrowRight' || lo === 'd') playerMove(1);
  else if (k === 'ArrowDown' || lo === 's') playerDrop();
  else if (k === 'ArrowUp' || lo === 'w') playerRotate(1);
  else if (k === ' ') hardDrop();
  else if (k === 'Escape' || lo === 'p') setPause(true);
});

// Touch: drag sideways to move, drag down to soft-drop,
// tap to rotate, quick flick down to hard-drop
let touch = null;

stage.addEventListener('touchstart', (e) => {
  if (lb.isCapturing()) { e.preventDefault(); touch = null; return; }
  e.preventDefault();
  const p = e.touches[0];
  touch = {
    x: p.clientX, y: p.clientY,
    startX: p.clientX, startY: p.clientY,
    t0: performance.now(), moved: false,
  };
}, { passive: false });

stage.addEventListener('touchmove', (e) => {
  if (!touch || state !== 'run') return;
  e.preventDefault();
  const p = e.touches[0];
  const cw = canvas.clientWidth / COLS;

  let dx = p.clientX - touch.x;
  while (Math.abs(dx) >= cw) {
    playerMove(dx > 0 ? 1 : -1);
    touch.x += Math.sign(dx) * cw;
    touch.moved = true;
    dx = p.clientX - touch.x;
  }

  let dy = p.clientY - touch.y;
  while (dy >= cw) {
    playerDrop();
    touch.y += cw;
    touch.moved = true;
    dy = p.clientY - touch.y;
  }
}, { passive: false });

stage.addEventListener('touchend', (e) => {
  if (!touch) return;
  if (lb.isCapturing()) { touch = null; return; }
  e.preventDefault();
  const p = e.changedTouches[0];
  const dt = performance.now() - touch.t0;
  const totalY = p.clientY - touch.startY;
  const totalX = Math.abs(p.clientX - touch.startX);

  if (state === 'over') {
    if (!touch.moved) restart();
  } else if (state === 'pause') {
    if (!touch.moved) setPause(false);
  } else if (!touch.moved && dt < 350) {
    playerRotate(1);
  } else if (totalY > 70 && dt < 230 && totalX < 40) {
    hardDrop();
  }
  touch = null;
}, { passive: false });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'run') setPause(true);
});

pauseBtn.addEventListener('click', () => setPause(state === 'run'));
document.getElementById('btn-restart').addEventListener('click', restart);

window.addEventListener('resize', resize);
resize();
updateStats();
spawn();
update();
