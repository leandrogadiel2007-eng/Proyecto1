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
const speedStep = 30;
const minSpeed = 20;
const maxSpeed = 200;
const autoRestartDelay = 1000;

let snake = [];
let food = null;
let redFoods = [];
let blueFoods = [];
let normalFoodCount = 0;

// Paredes/obstáculos internos del tablero.
const walls = [
    // Pared vertical izquierda.
    ...Array.from({ length: 5 }, (_, i) => ({ x: 8, y: i + 3 })),
    // Pared horizontal superior.
    ...Array.from({ length: 6 }, (_, i) => ({ x: i + 17, y: 4 })),
    // Pared vertical derecha.
    ...Array.from({ length: 5 }, (_, i) => ({ x: 27, y: i + 11 })),
    // Pared horizontal inferior.
    ...Array.from({ length: 6 }, (_, i) => ({ x: i + 15, y: 16 }))
];

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

    snake = [
        { x: 14, y: 10 },
        { x: 13, y: 10 },
        { x: 12, y: 10 }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    normalFoodCount = 0;

    redFoods = [];
    blueFoods = [];

    redSpeedLevel = 0;
    blueSlowLevel = 0;
    currentSpeed = normalSpeed;

    lastRedSpawnAt = 0;
    lastBlueSpawnAt = 0;

    running = false;

    updateScore();
    food = randomFreePosition();
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
        (food && food.x === position.x && food.y === position.y) ||
        redFoods.some(item => item.x === position.x && item.y === position.y) ||
        blueFoods.some(item => item.x === position.x && item.y === position.y)
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
    return food !== null || redFoods.length > 0 || blueFoods.length > 0;
}

function spawnNextRound() {
    // Nunca inicia una nueva ronda si todavía queda alguna bolita.
    if (hasFoodOnBoard()) return;

    // TODA ronda tiene una naranja.
    food = randomFreePosition();

    // En cada múltiplo de 2 naranjas aparece una roja
    // junto a la naranja de esta misma ronda.
    if (
        normalFoodCount > 0 &&
        normalFoodCount % 2 === 0 &&
        lastRedSpawnAt !== normalFoodCount
    ) {
        redFoods.push(randomFreePosition());
        lastRedSpawnAt = normalFoodCount;
    }

    // En cada múltiplo de 5 naranjas aparece una azul
    // junto a la naranja de esta misma ronda.
    if (
        normalFoodCount > 0 &&
        normalFoodCount % 5 === 0 &&
        lastBlueSpawnAt !== normalFoodCount
    ) {
        blueFoods.push(randomFreePosition());
        lastBlueSpawnAt = normalFoodCount;
    }

    draw();
}
function hitWall(head) {
    return (
        head.x < 0 ||
        head.x >= gridWidth ||
        head.y < 0 ||
        head.y >= gridHeight ||
        isWall(head)
    );
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
    if (food && head.x === food.x && head.y === food.y) {
        score++;
        normalFoodCount++;
        ateFood = true;
        food = null;
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

    drawFood(food, "#f59e0b");
    redFoods.forEach(item => drawFood(item, "#ef4444", 0.42));
    blueFoods.forEach(item => drawFood(item, "#3b82f6", 0.42));

    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? "#67e8f9" : "#22d3ee";

        const padding = 2;

        ctx.fillRect(
            segment.x * tileWidth + padding,
            segment.y * tileHeight + padding,
            tileWidth - padding * 2,
            tileHeight - padding * 2
        );
    });
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