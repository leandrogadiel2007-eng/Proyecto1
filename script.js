const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const messageElement = document.getElementById("message");
const startBtn = document.getElementById("startBtn");

const gridWidth = 35;
const gridHeight = 20;
const tileWidth = canvas.width / gridWidth;
const tileHeight = canvas.height / gridHeight;

const normalSpeed = 110;
const speedStep = 20;
const minSpeed = 20;
const maxSpeed = 200;
const autoRestartDelay = 1000;

let snake = [];
let orangeFoods = [];
let roundNumber = 1;
let redFoods = [];
let blueFoods = [];
let wallBreakerFood = null;
let normalFoodCount = 0;

const wallBreakDuration = 7000;
const wallBreakBlinkTime = 1500;
let wallBreakActive = false;
let wallBreakUntil = 0;
let wallBreakTimer = null;
let wallBreakDrawTimer = null;

// Patrones de paredes. El patrón cambia cada 3 rondas.
const wallPatterns = [
    [
        ...Array.from({ length: 5 }, (_, i) => ({ x: 8, y: i + 3 })),
        ...Array.from({ length: 6 }, (_, i) => ({ x: i + 17, y: 4 })),
        ...Array.from({ length: 5 }, (_, i) => ({ x: 27, y: i + 11 })),
        ...Array.from({ length: 6 }, (_, i) => ({ x: i + 15, y: 16 }))
    ],
    [
        ...Array.from({ length: 5 }, (_, i) => ({ x: i + 5, y: 7 })),
        ...Array.from({ length: 5 }, (_, i) => ({ x: 24, y: i + 2 })),
        ...Array.from({ length: 5 }, (_, i) => ({ x: i + 18, y: 15 })),
        ...Array.from({ length: 4 }, (_, i) => ({ x: 12, y: i + 11 }))
    ],
    [
        ...Array.from({ length: 6 }, (_, i) => ({ x: 6, y: i + 2 })),
        ...Array.from({ length: 6 }, (_, i) => ({ x: i + 13, y: 6 })),
        ...Array.from({ length: 6 }, (_, i) => ({ x: 28, y: i + 10 })),
        ...Array.from({ length: 5 }, (_, i) => ({ x: i + 16, y: 17 }))
    ],
    [
        ...Array.from({ length: 5 }, (_, i) => ({ x: 10, y: i + 9 })),
        ...Array.from({ length: 6 }, (_, i) => ({ x: i + 14, y: 3 })),
        ...Array.from({ length: 5 }, (_, i) => ({ x: 25, y: i + 12 })),
        ...Array.from({ length: 6 }, (_, i) => ({ x: i + 5, y: 16 }))
    ]
];

let walls = [];

function setWallsForRound() {
    const patternIndex = Math.floor((roundNumber - 1) / 3) % wallPatterns.length;

    // No coloca una pared encima de la serpiente al cambiar de ronda.
    walls = wallPatterns[patternIndex].filter(
        wall => !snake.some(
            segment => segment.x === wall.x && segment.y === wall.y
        )
    );
}

let redSpeedLevel = 0;
let blueSlowLevel = 0;
let currentSpeed = normalSpeed;

let lastRedSpawnAt = 0;
let lastBlueSpawnAt = 0;

let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let highScore = Number(localStorage.getItem("snakeHighScore")) || 0;
let gameTimer = null;
let restartTimer = null;
let running = false;

highScoreElement.textContent = highScore;

function resetGame() {
    clearTimeout(restartTimer);
    clearInterval(gameTimer);
    clearTimeout(wallBreakTimer);
    clearInterval(wallBreakDrawTimer);

    snake = [
        { x: 14, y: 10 },
        { x: 13, y: 10 },
        { x: 12, y: 10 }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    normalFoodCount = 0;
    roundNumber = 1;

    orangeFoods = [];
    redFoods = [];
    blueFoods = [];
    wallBreakerFood = null;

    wallBreakActive = false;
    wallBreakUntil = 0;

    redSpeedLevel = 0;
    blueSlowLevel = 0;
    currentSpeed = normalSpeed;

    lastRedSpawnAt = 0;
    lastBlueSpawnAt = 0;

    running = false;

    setWallsForRound();
    updateScore();
    spawnOrangeFoods();
    draw();
}

function startGame() {
    if (running) return;

    running = true;
    messageElement.textContent = "¡Juega!";
    startTimer();
}

function startTimer() {
    clearInterval(gameTimer);
    gameTimer = setInterval(gameLoop, currentSpeed);
}

function updateSpeed() {
    currentSpeed = normalSpeed - (redSpeedLevel * speedStep) + (blueSlowLevel * speedStep);
    currentSpeed = Math.max(minSpeed, Math.min(maxSpeed, currentSpeed));

    if (running) {
        startTimer();
    }
}

function changeSpeedMessage() {
    if (redSpeedLevel > 0 || blueSlowLevel > 0) {
        messageElement.textContent =
            `🔴 Velocidad: ${redSpeedLevel}/3  |  🔵 Lentitud: ${blueSlowLevel}/3`;
    }
}

function endGame() {
    running = false;
    clearInterval(gameTimer);
    gameTimer = null;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("snakeHighScore", highScore);
        highScoreElement.textContent = highScore;
    }

    messageElement.textContent = "Game Over";

    restartTimer = setTimeout(() => {
        resetGame();
        messageElement.textContent = "¡Nueva partida!";
        startGame();
    }, autoRestartDelay);
}

function updateScore() {
    scoreElement.textContent = score;
}

function isWall(position) {
    return walls.some(
        wall => wall.x === position.x && wall.y === position.y
    );
}

function isOccupied(position) {
    return (
        snake.some(segment => segment.x === position.x && segment.y === position.y) ||
        isWall(position) ||
        orangeFoods.some(item => item.x === position.x && item.y === position.y) ||
        redFoods.some(item => item.x === position.x && item.y === position.y) ||
        blueFoods.some(item => item.x === position.x && item.y === position.y) ||
        (wallBreakerFood &&
            wallBreakerFood.x === position.x &&
            wallBreakerFood.y === position.y)
    );
}

function randomFreePosition() {
    let position;

    do {
        position = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight)
        };
    } while (isOccupied(position));

    return position;
}

function hasFoodOnBoard() {
    return (
        orangeFoods.length > 0 ||
        redFoods.length > 0 ||
        blueFoods.length > 0 ||
        wallBreakerFood !== null
    );
}

function spawnWallBreakerFood() {
    if (roundNumber % 10 !== 0 || wallBreakerFood) return;
    wallBreakerFood = randomFreePosition();
}

function spawnOrangeFoods() {
    // Rondas 1-4 = 1 naranja, rondas 5-8 = 2,
    // rondas 9-12 = 3 y desde la 13 = 4 como máximo.
    const orangeCountForRound = Math.min(
        Math.floor((roundNumber - 1) / 4) + 1,
        4
    );

    for (let i = 0; i < orangeCountForRound; i++) {
        orangeFoods.push(randomFreePosition());
    }
}

function spawnSpecialFoods() {
    // Roja: aparece cada 3 naranjas comidas.
    if (
        normalFoodCount > 0 &&
        normalFoodCount % 4 === 0 &&
        lastRedSpawnAt !== normalFoodCount
    ) {
        redFoods.push(randomFreePosition());
        lastRedSpawnAt = normalFoodCount;
    }

    // Azul: sigue apareciendo cada 5 naranjas y
    // contrarresta exactamente el efecto de una roja.
    if (
        normalFoodCount > 0 &&
        normalFoodCount % 5 === 0 &&
        lastBlueSpawnAt !== normalFoodCount
    ) {
        blueFoods.push(randomFreePosition());
        lastBlueSpawnAt = normalFoodCount;
    }
}

function spawnNextRound() {
    // Nunca inicia una nueva ronda si todavía queda alguna bolita.
    if (hasFoodOnBoard()) return;

    // Aumenta la ronda sin detenerse en la ronda 4.
    // El cambio a 2 naranjas ocurre al llegar a la ronda 5.
    roundNumber += 1;
    setWallsForRound();
    spawnOrangeFoods();

    // Cada 10 rondas aparece una bolita que permite romper paredes.
    spawnWallBreakerFood();

    draw();
}
function hitWall(head) {
    // Los bordes exteriores siguen siendo peligrosos incluso con el poder.
    if (
        head.x < 0 ||
        head.x >= gridWidth ||
        head.y < 0 ||
        head.y >= gridHeight
    ) {
        return true;
    }

    const wallIndex = walls.findIndex(
        wall => wall.x === head.x && wall.y === head.y
    );

    if (wallIndex !== -1) {
        if (wallBreakActive) {
            // Con el poder activo, la serpiente rompe la pared al tocarla.
            walls.splice(wallIndex, 1);
            return false;
        }

        return true;
    }

    return false;
}

function updateWallBreakEffect() {
    if (!wallBreakActive) return;

    const remaining = wallBreakUntil - Date.now();

    if (remaining <= 0) {
        wallBreakActive = false;
        wallBreakUntil = 0;
        clearTimeout(wallBreakTimer);
        clearInterval(wallBreakDrawTimer);
        wallBreakTimer = null;
        wallBreakDrawTimer = null;
        messageElement.textContent = "El poder terminó";
        draw();
        return;
    }

    messageElement.textContent =
        `💥 Romper paredes: ${(remaining / 1000).toFixed(1)} s`;
    draw();
}

function activateWallBreaker() {
    wallBreakActive = true;
    wallBreakUntil = Date.now() + wallBreakDuration;

    clearTimeout(wallBreakTimer);
    clearInterval(wallBreakDrawTimer);

    wallBreakTimer = setTimeout(() => {
        updateWallBreakEffect();
    }, wallBreakDuration);

    // Este intervalo permite que el parpadeo sea visible aunque la serpiente vaya lenta.
    wallBreakDrawTimer = setInterval(updateWallBreakEffect, 80);

    messageElement.textContent = "💥 ¡Ahora puedes romper paredes!";
}

function hitSelf(head) {
    return snake.some(
        segment => segment.x === head.x && segment.y === head.y
    );
}

function gameLoop() {
    direction = nextDirection;

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    if (hitWall(head) || hitSelf(head)) {
        endGame();
        return;
    }

    snake.unshift(head);

    let ateFood = false;

    // Comida naranja.
    const orangeIndex = orangeFoods.findIndex(
        item => item.x === head.x && item.y === head.y
    );

    if (orangeIndex !== -1) {
        score++;
        normalFoodCount++;
        ateFood = true;
        orangeFoods.splice(orangeIndex, 1);
        spawnSpecialFoods();
    }

    // Comida roja.
    const redIndex = redFoods.findIndex(
        item => item.x === head.x && item.y === head.y
    );

    if (redIndex !== -1) {
        score++;
        ateFood = true;
        redFoods.splice(redIndex, 1);

        if (redSpeedLevel < 3) {
            redSpeedLevel++;
        }

        updateSpeed();
        changeSpeedMessage();
    }

    // Comida azul.
    const blueIndex = blueFoods.findIndex(
        item => item.x === head.x && item.y === head.y
    );

    if (blueIndex !== -1) {
        score++;
        ateFood = true;
        blueFoods.splice(blueIndex, 1);

        if (blueSlowLevel < 3) {
            blueSlowLevel++;
        }

        updateSpeed();
        changeSpeedMessage();
    }

    // Bolita para romper paredes.
    if (
        wallBreakerFood &&
        wallBreakerFood.x === head.x &&
        wallBreakerFood.y === head.y
    ) {
        score++;
        ateFood = true;
        wallBreakerFood = null;
        activateWallBreaker();
    }

    // Cualquier alimento hace crecer la serpiente.
    if (!ateFood) {
        snake.pop();
    } else {
        updateScore();
    }

    // La siguiente ronda se crea únicamente cuando se han
    // comido TODAS las bolitas de la ronda actual.
    if (!hasFoodOnBoard()) {
        spawnNextRound();
    }

    draw();
}

function drawFood(position, color, radiusMultiplier = 0.35) {
    if (!position) return;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
        position.x * tileWidth + tileWidth / 2,
        position.y * tileHeight + tileHeight / 2,
        Math.min(tileWidth, tileHeight) * radiusMultiplier,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

function draw() {
    ctx.fillStyle = "#10182b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Paredes internas.
    walls.forEach(wall => {
        ctx.fillStyle = "#5b647f";
        ctx.fillRect(
            wall.x * tileWidth + 1,
            wall.y * tileHeight + 1,
            tileWidth - 2,
            tileHeight - 2
        );
    });

    orangeFoods.forEach(item => drawFood(item, "#f59e0b"));
    redFoods.forEach(item => drawFood(item, "#ef4444", 0.42));
    blueFoods.forEach(item => drawFood(item, "#3b82f6", 0.42));

    // Bolita especial de romper paredes.
    if (wallBreakerFood) {
        drawFood(wallBreakerFood, "#facc15", 0.45);
        drawFood(wallBreakerFood, "#ffffff", 0.16);
    }

    const remainingPower = wallBreakUntil - Date.now();
    const isBlinking = wallBreakActive && remainingPower <= wallBreakBlinkTime;
    const blinkOff = isBlinking && Math.floor(Date.now() / 120) % 2 === 0;

    if (!blinkOff) {
        snake.forEach((segment, index) => {
            if (wallBreakActive) {
                ctx.fillStyle = index === 0 ? "#facc15" : "#fde68a";
            } else {
                ctx.fillStyle = index === 0 ? "#67e8f9" : "#22d3ee";
            }

            const padding = 2;

            ctx.fillRect(
                segment.x * tileWidth + padding,
                segment.y * tileHeight + padding,
                tileWidth - padding * 2,
                tileHeight - padding * 2
            );
        });
    }
}

function changeDirection(newDirection) {
    const isOpposite =
        newDirection.x === -direction.x &&
        newDirection.y === -direction.y;

    if (!isOpposite) {
        nextDirection = newDirection;
    }
}

window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    const code = event.code;

    const keyMap = {
        arrowup: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        a: { x: -1, y: 0 },
        s: { x: 0, y: 1 },
        d: { x: 1, y: 0 },
        keyw: { x: 0, y: -1 },
        keya: { x: -1, y: 0 },
        keys: { x: 0, y: 1 },
        keyd: { x: 1, y: 0 }
    };

    const newDirection = keyMap[key] || keyMap[code.toLowerCase()];

    if (!newDirection) return;

    event.preventDefault();

    if (!running) {
        startGame();
    }

    changeDirection(newDirection);
});

document.querySelectorAll("[data-direction]").forEach(button => {
    button.addEventListener("click", () => {
        const directions = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };

        if (!running) {
            startGame();
        }

        changeDirection(directions[button.dataset.direction]);
    });
});

startBtn.addEventListener("click", () => {
    if (!running) {
        resetGame();
        startGame();
    }
});

resetGame();
messageElement.textContent = 'Pulsa "Iniciar" para jugar';