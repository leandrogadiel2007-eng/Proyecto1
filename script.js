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
const fastSpeed = 65;
const slowSpeed = 165;
const autoRestartDelay = 1000;

let snake = [];
let food = null;
let redFoods = [];
let blueFoods = [];
let normalFoodCount = 0;

let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let highScore = Number(localStorage.getItem("snakeHighScore")) || 0;
let currentSpeed = normalSpeed;
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
    currentSpeed = normalSpeed;
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

function changeSpeed(newSpeed, message) {
    currentSpeed = newSpeed;
    messageElement.textContent = message;

    if (running) {
        startTimer();
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

function isOccupied(position) {
    return (
        snake.some(segment => segment.x === position.x && segment.y === position.y) ||
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

function spawnSpecialFoods() {
    // Cada 3 naranjas comidas aparece una nueva roja.
    if (normalFoodCount % 3 === 0) {
        redFoods.push(randomFreePosition());
    }

    // Cada 7 naranjas comidas aparece una nueva azul.
    if (normalFoodCount % 7 === 0) {
        blueFoods.push(randomFreePosition());
    }
}

function hitWall(head) {
    return (
        head.x < 0 ||
        head.x >= gridWidth ||
        head.y < 0 ||
        head.y >= gridHeight
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

    // Comida naranja normal.
    if (head.x === food.x && head.y === food.y) {
        score++;
        normalFoodCount++;
        ateFood = true;

        food = randomFreePosition();
        spawnSpecialFoods();
    }

    // Comida roja: más velocidad y crecimiento.
    const redIndex = redFoods.findIndex(
        item => item.x === head.x && item.y === head.y
    );

    if (redIndex !== -1) {
        score++;
        ateFood = true;
        redFoods.splice(redIndex, 1);
        changeSpeed(fastSpeed, "🔴 ¡Más rápido!");
    }

    // Comida azul: menos velocidad y crecimiento.
    const blueIndex = blueFoods.findIndex(
        item => item.x === head.x && item.y === head.y
    );

    if (blueIndex !== -1) {
        score++;
        ateFood = true;
        blueFoods.splice(blueIndex, 1);
        changeSpeed(slowSpeed, "🔵 ¡Más lento!");
    }

    // Cualquier comida hace crecer la serpiente.
    if (!ateFood) {
        snake.pop();
    } else {
        updateScore();
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

    // Comida naranja.
    drawFood(food, "#f59e0b");

    // Comidas especiales.
    redFoods.forEach(item => drawFood(item, "#ef4444", 0.42));
    blueFoods.forEach(item => drawFood(item, "#3b82f6", 0.42));

    // Serpiente.
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

document.addEventListener("keydown", event => {
    const keyMap = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }
    };

    if (!keyMap[event.key]) return;

    event.preventDefault();

    if (!running) {
        startGame();
    }

    changeDirection(keyMap[event.key]);
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