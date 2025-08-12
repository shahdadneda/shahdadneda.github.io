const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

const COLS = 10;
const ROWS = 20;
const BLOCK = 36; // canvas is 360x720

ctx.scale(1, 1);

function createMatrix(width, height) {
    const matrix = [];
    for (let y = 0; y < height; y++) {
        matrix.push(new Array(width).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    switch (type) {
        case 'I': return [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        case 'J': return [
            [2, 0, 0],
            [2, 2, 2],
            [0, 0, 0],
        ];
        case 'L': return [
            [0, 0, 3],
            [3, 3, 3],
            [0, 0, 0],
        ];
        case 'O': return [
            [4, 4],
            [4, 4],
        ];
        case 'S': return [
            [0, 5, 5],
            [5, 5, 0],
            [0, 0, 0],
        ];
        case 'T': return [
            [0, 6, 0],
            [6, 6, 6],
            [0, 0, 0],
        ];
        case 'Z': return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

const colors = [
    null,
    '#00BCD4', // I
    '#3F51B5', // J
    '#FF9800', // L
    '#FFC107', // O
    '#4CAF50', // S
    '#9C27B0', // T
    '#F44336', // Z
];

const arena = createMatrix(COLS, ROWS);

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    lines: 0,
    level: 1,
};

let dropCounter = 0;
let dropInterval = 500; // ms, reduced with levels
let lastTime = 0;
let paused = false;
let gameOver = false;

function collide(arena, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerReset() {
    const pieces = 'TJLOSZI';
    const type = pieces[(pieces.length * Math.random()) | 0];
    player.matrix = createPiece(type);
    player.pos.y = 0;
    player.pos.x = ((COLS / 2) | 0) - ((player.matrix[0].length / 2) | 0);
    if (collide(arena, player)) {
        // Game over
        gameOver = true;
        return;
    }
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.score += rowCount * 100;
        player.lines += 1;
        player.level += 1;
        dropInterval = Math.max(150, dropInterval - 100);
        rowCount *= 2;
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        arenaSweep();
        playerReset();
        updateScore();
        return false;
    }
    dropCounter = 0;
    return true;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect((x + offset.x) * (BLOCK), (y + offset.y) * (BLOCK), BLOCK - 1, BLOCK - 1);
            }
        });
    });
}

// Add a translucent outline renderer for the ghost landing position
function drawMatrixOutline(matrix, offset) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            const value = matrix[y][x];
            if (value !== 0) {
                ctx.strokeStyle = colors[value];
                ctx.lineWidth = 2;
                const px = (x + offset.x) * BLOCK;
                const py = (y + offset.y) * BLOCK;
                ctx.strokeRect(px + 0.5, py + 0.5, BLOCK - 1, BLOCK - 1);
            }
        }
    }
    ctx.restore();
}

function drawGhost() {
    // Clone current piece position and drop until collision
    const ghost = { pos: { x: player.pos.x, y: player.pos.y }, matrix: player.matrix };
    while (!collide(arena, { matrix: ghost.matrix, pos: { x: ghost.pos.x, y: ghost.pos.y + 1 } })) {
        ghost.pos.y++;
    }
    if (ghost.pos.y !== player.pos.y) {
        drawMatrixOutline(ghost.matrix, ghost.pos);
    }
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK, 0);
        ctx.lineTo(x * BLOCK, ROWS * BLOCK);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK);
        ctx.lineTo(COLS * BLOCK, y * BLOCK);
        ctx.stroke();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawMatrix(arena, { x: 0, y: 0 });
    if (!gameOver) {
        drawGhost();
        drawMatrix(player.matrix, player.pos);
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

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    if (!paused && !gameOver) {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
    }
    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    scoreEl.textContent = player.score;
}

// Controls

document.addEventListener('keydown', (event) => {
    const key = event.key;
    const lower = key.toLowerCase();

    // Handle gameOver and paused first
    if (gameOver) {
        if (key === ' ') {
            event.preventDefault();
            restartGame();
        }
        return;
    }
    if (paused) {
        if (key === ' ' || key === 'Escape') {
            event.preventDefault();
            togglePause();
        }
        return;
    }

    if (lower === 'a') {
        playerMove(-1);
    } else if (lower === 'd') {
        playerMove(1);
    } else if (lower === 's') {
        playerDrop();
    } else if (lower === 'w') {
        playerRotate(1);
    } else if (key === 'ArrowRight') {
        event.preventDefault();
        playerRotate(1);
    } else if (key === 'ArrowLeft') {
        event.preventDefault();
        playerRotate(-1);
    } else if (key === ' ') {
        // Hard drop
        event.preventDefault();
        while (playerDrop()) {}
    } else if (key === 'Escape') {
        togglePause();
    }
});

function togglePause() {
    paused = !paused;
}

function restartGame() {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    dropInterval = 500;
    updateScore();
    gameOver = false;
    paused = false;
    playerReset();
}

playerReset();
updateScore();
update();

// Hook up Restart button
const restartBtn = document.getElementById('btn-restart');
if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        restartGame();
    });
}


