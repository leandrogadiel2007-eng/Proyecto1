const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const messageElement = document.getElementById("message");
const startBtn = document.getElementById("startBtn");

const gridWidth = 28;
const gridHeight = 20;
const tileWidth = canvas.width / gridWidth;
const tileHeight = canvas.height / gridHeight;
const speed = 110;
const autoRestartDelay = 1000;

let snake = [];
let food = null;
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

    snake = [
        { x: 14, y: 10 },
        { x: 13, y: 10 },
        { x: 12, y: 10 }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;

    updateScore();
    placeFood();
    draw();
}

function startGame() {
    if (running) return;

    running = true;
    messageElement.textContent = "¡Juega!";
    clearInterval(gameTimer);
    gameTimer = setInterval(gameLoop, speed);
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

function placeFood() {
    do {
        food = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight)
        };
    } while (
        snake.some(segment => segment.x === food.x && segment.y === food.y)
    );
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

    if (head.x === food.x && head.y === food.y) {
        score++;
        updateScore();
        placeFood();
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    ctx.fillStyle = "#171f36";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Comida
    ctx.fillStyle = "#00d9ff";
    ctx.beginPath();
    ctx.arc(
        food.x * tileWidth + tileWidth / 2,
        food.y * tileHeight + tileHeight / 2,
        Math.min(tileWidth, tileHeight) * 0.35,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Serpiente
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? "#ff85a8" : "#ff4d8d";

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