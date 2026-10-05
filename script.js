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
let redFood = null;
let blueFood = null;
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
    currentSpeed = normalSpeed;
    running = false;

    updateScore();
    placeAllFood();
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
        (redFood && redFood.x === position.x && redFood.y === position.y) ||
        (blueFood && blueFood.x === position.x && blueFood.y === position.y)
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

function placeAllFood() {
    food = randomFreePosition();
    redFood = randomFreePosition();
    blueFood = randomFreePosition();
}

function replaceFood(type) {
    if (type === "normal") {
        food = randomFreePosition();
    } else if (type === "red") {
        redFood = randomFreePosition();
    } else {
        blueFood = randomFreePosition();
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

    if (head.x === food.x && head.y === food.y) {
        score++;
        ateFood = true;
        replaceFood("normal");
    } else if (head.x === redFood.x && head.y === redFood.y) {
        score++;
        ateFood = true;
        replaceFood("red");
        changeSpeed(fastSpeed, "⚡ ¡Más rápido!");
    } else if (head.x === blueFood.x && head.y === blueFood.y) {
        score++;
        ateFood = true;
        replaceFood("blue");
        changeSpeed(slowSpeed, "❄️ ¡Más lento!");
    }

    if (!ateFood) {
        snake.pop();
    } else {
        updateScore();
    }

    draw();
}

function drawFood(position, color, radiusMultiplier = 0.35) {
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

    // Comida normal.
    drawFood(food, "#f59e0b");

    // Comida roja: aumenta la velocidad y hace crecer la serpiente.
    drawFood(redFood, "#ef4444", 0.38);

    // Comida azul: disminuye la velocidad y hace crecer la serpiente.
    drawFood(blueFood, "#3b82f6", 0.38);

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