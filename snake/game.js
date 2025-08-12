const canvas = document.getElementById('snake');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const levelEl = document.getElementById('level');
const speedEl = document.getElementById('speed');

// Grid setup
const GRID_SIZE = 20; // 20x20 grid
const CELL = canvas.width / GRID_SIZE; // 24px cells for 480x480

// Colors
const SNAKE_COLOR = '#22d3ee';
const SNAKE_HEAD = '#38bdf8';
const FOOD_COLOR = '#f43f5e';

// Game state
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let level = 1;
let speedMs = 140; // initial tick speed
let lastTime = 0;
let acc = 0;
let paused = false;
let gameOver = false;

const HIGH_KEY = 'snake-high-score';
let highScore = Number(localStorage.getItem(HIGH_KEY) || 0);
highEl.textContent = highScore;

function init() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  level = 1;
  speedMs = 140;
  paused = false;
  gameOver = false;
  placeFood();
  updateUI();
}

function updateUI() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  speedEl.textContent = speedMs;
  highEl.textContent = highScore;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cellsEqual(a, b) { return a.x === b.x && a.y === b.y; }

function placeFood() {
  let spot;
  do {
    spot = { x: randomInt(0, GRID_SIZE - 1), y: randomInt(0, GRID_SIZE - 1) };
  } while (snake.some(seg => cellsEqual(seg, spot)));
  food = spot;
}

function setDirection(x, y) {
  // Prevent reversing directly
  if (x === -direction.x && y === -direction.y) return;
  nextDirection = { x, y };
}

function step() {
  if (paused || gameOver) return;
  // Apply buffered direction just before moving
  direction = nextDirection;
  const head = snake[0];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  // Wall collision
  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
    endGame();
    return;
  }
  // Self collision
  if (snake.some(seg => cellsEqual(seg, newHead))) {
    endGame();
    return;
  }

  snake.unshift(newHead);
  if (cellsEqual(newHead, food)) {
    score += 10;
    // speed up every 5 apples, down to a floor
    if ((score / 10) % 5 === 0) {
      level += 1;
      speedMs = Math.max(60, speedMs - 10);
    }
    placeFood();
  } else {
    snake.pop();
  }
  updateUI();
}

function endGame() {
  gameOver = true;
  highScore = Math.max(highScore, score);
  localStorage.setItem(HIGH_KEY, String(highScore));
  updateUI();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i <= GRID_SIZE; i++) {
    // vertical
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, canvas.height);
    ctx.stroke();
    // horizontal
    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(canvas.width, i * CELL);
    ctx.stroke();
  }
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // Draw food
  ctx.fillStyle = FOOD_COLOR;
  const fx = food.x * CELL;
  const fy = food.y * CELL;
  drawRoundedRect(fx + 4, fy + 4, CELL - 8, CELL - 8, 6);
  ctx.fill();

  // Draw snake
  for (let i = snake.length - 1; i >= 0; i--) {
    const seg = snake[i];
    const px = seg.x * CELL;
    const py = seg.y * CELL;
    ctx.fillStyle = i === 0 ? SNAKE_HEAD : SNAKE_COLOR;
    drawRoundedRect(px + 2, py + 2, CELL - 4, CELL - 4, 6);
    ctx.fill();
  }

  if (paused && !gameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,23,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('game paused', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('click either space or esc to resume', canvas.width / 2, canvas.height / 2 + 18);
    ctx.restore();
  }

  if (gameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,23,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('Press Space to restart', canvas.width / 2, canvas.height / 2 + 18);
    ctx.restore();
  }
}

function loop(time = 0) {
  const dt = time - lastTime;
  lastTime = time;
  if (!paused && !gameOver) {
    acc += dt;
    while (acc >= speedMs) {
      step();
      acc -= speedMs;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

// Controls
document.addEventListener('keydown', (e) => {
  const k = e.key;
  switch (k) {
    case 'ArrowUp': case 'w': case 'W': setDirection(0, -1); break;
    case 'ArrowDown': case 's': case 'S': setDirection(0, 1); break;
    case 'ArrowLeft': case 'a': case 'A': setDirection(-1, 0); break;
    case 'ArrowRight': case 'd': case 'D': setDirection(1, 0); break;
    case ' ': // Space
      if (gameOver) init();
      else if (paused) togglePause();
      break;
    case 'Escape':
      togglePause();
      break;
  }
});

function togglePause() {
  paused = !paused;
}

// Hook up visible Restart button
const restartBtn = document.getElementById('btn-restart');
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    init();
  });
}

// Start
init();
loop();


