document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const score1Element = document.getElementById('score1');
    const score2Element = document.getElementById('score2');
    const classicBtn = document.getElementById('classic-btn');
    const modernBtn = document.getElementById('modern-btn');
    const startBtn = document.getElementById('start-btn');

    // --- Game Constants & State ---
    const GRID_SIZE = 20; // For classic mode
    const SNAKE_SIZE = 20; // For modern mode (can be different)
    const FOOD_RADIUS = 8;
    
    let gameMode = 'classic'; // 'classic' or 'modern'
    let gameRunning = false;
    let animationFrameId;
    let gameFrame = 0; // For classic mode speed control

    // Player 1
    let snake1, score1, direction1, nextDirection1;
    const P1_COLOR = '#61afef';

    // Player 2
    let snake2, score2, direction2, nextDirection2;
    const P2_COLOR = '#e5c07b';

    // Food
    let food;

    // --- Game Setup & Initialization ---

    function init() {
        // Reset player 1
        snake1 = [{ x: 8, y: 10 }]; // Start position in grid units
        score1 = 0;
        direction1 = { x: 1, y: 0 };
        nextDirection1 = { x: 1, y: 0 };
        score1Element.textContent = `Score: 0`;

        // Reset player 2
        snake2 = [{ x: canvas.width / GRID_SIZE - 9, y: 10 }];
        score2 = 0;
        direction2 = { x: -1, y: 0 };
        nextDirection2 = { x: -1, y: 0 };
        score2Element.textContent = `Score: 0`;

        // Reset game state
        gameFrame = 0;
        placeFood();
    }
    
    function startGame() {
        if (gameRunning) return;
        gameRunning = true;
        init();
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        gameLoop();
    }

    function placeFood() {
        let foodX, foodY;
        let onSnake;
        do {
            onSnake = false;
            foodX = Math.floor(Math.random() * (canvas.width / GRID_SIZE));
            foodY = Math.floor(Math.random() * (canvas.height / GRID_SIZE));
            
            // Check if food spawns on any snake
            for (const part of [...snake1, ...snake2]) {
                if (part.x === foodX && part.y === foodY) {
                    onSnake = true;
                    break;
                }
            }
        } while (onSnake);
        
        food = { x: foodX, y: foodY };
    }


    // --- Game Loop & Update Logic ---

    function gameLoop() {
        if (!gameRunning) return;
        
        update();
        draw();

        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    function update() {
        if (gameMode === 'classic') {
            // Slow down the classic mode update rate
            if (gameFrame++ % 5 !== 0) return;
        }

        moveSnake(snake1, direction1, nextDirection1);
        moveSnake(snake2, direction2, nextDirection2);
        
        checkCollisions();
    }

    function moveSnake(snake, direction, nextDirection) {
        // Update direction without allowing 180-degree turns
        if (Math.abs(nextDirection.x) !== Math.abs(direction.x) || Math.abs(nextDirection.y) !== Math.abs(direction.y)) {
             Object.assign(direction, nextDirection);
        }

        const head = { ...snake[0] }; // Copy head
        head.x += direction.x;
        head.y += direction.y;
        
        snake.unshift(head); // Add new head

        // Check for food consumption
        let ateFood = false;
        if (gameMode === 'classic') {
             if (head.x === food.x && head.y === food.y) ateFood = true;
        } else { // Modern mode needs proximity check
            const dx = (head.x * SNAKE_SIZE + SNAKE_SIZE / 2) - (food.x * GRID_SIZE + GRID_SIZE / 2);
            const dy = (head.y * SNAKE_SIZE + SNAKE_SIZE / 2) - (food.y * GRID_SIZE + GRID_SIZE / 2);
            if (Math.sqrt(dx*dx + dy*dy) < SNAKE_SIZE / 2 + FOOD_RADIUS) ateFood = true;
        }

        if (ateFood) {
            if (snake === snake1) {
                score1++;
                score1Element.textContent = `Score: ${score1}`;
            } else {
                score2++;
                score2Element.textContent = `Score: ${score2}`;
            }
            placeFood();
        } else {
            snake.pop(); // Remove tail if no food was eaten
        }
    }


    // --- Collision Detection ---

    function checkCollisions() {
        const head1 = snake1[0];
        const head2 = snake2[0];
        
        // Wall collision
        const wallCollision1 = head1.x < 0 || head1.x >= canvas.width / GRID_SIZE || head1.y < 0 || head1.y >= canvas.height / GRID_SIZE;
        const wallCollision2 = head2.x < 0 || head2.x >= canvas.width / GRID_SIZE || head2.y < 0 || head2.y >= canvas.height / GRID_SIZE;
        
        if (wallCollision1) return gameOver('Player 2 Wins! Player 1 hit a wall.');
        if (wallCollision2) return gameOver('Player 1 Wins! Player 2 hit a wall.');
        
        // Self collision
        if (checkSelfCollision(snake1)) return gameOver('Player 2 Wins! Player 1 crashed into itself.');
        if (checkSelfCollision(snake2)) return gameOver('Player 1 Wins! Player 2 crashed into itself.');
        
        // Snake-on-snake collision
        if (checkSnakeCollision(head1, snake2)) return gameOver('Player 2 Wins! Player 1 crashed into Player 2.');
        if (checkSnakeCollision(head2, snake1)) return gameOver('Player 1 Wins! Player 2 crashed into Player 1.');
        if (head1.x === head2.x && head1.y === head2.y) return gameOver("It's a tie! Head-on collision.");
    }

    function checkSelfCollision(snake) {
        const head = snake[0];
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) return true;
        }
        return false;
    }

    function checkSnakeCollision(head, otherSnake) {
        for (const part of otherSnake) {
            if (head.x === part.x && head.y === part.y) return true;
        }
        return false;
    }

    function gameOver(message) {
        gameRunning = false;
        ctx.fillStyle = 'rgba(40, 44, 52, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#abb2bf';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = '24px sans-serif';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 10);
        
        ctx.font = '18px sans-serif';
        ctx.fillText('Click "Start Game" to play again.', canvas.width / 2, canvas.height / 2 + 60);
    }


    // --- Drawing ---

    function draw() {
        // Clear canvas
        ctx.fillStyle = '#1c1f24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw food
        ctx.fillStyle = '#c678dd'; // Food color
        ctx.beginPath();
        ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, FOOD_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Draw snakes
        drawSnake(snake1, P1_COLOR);
        drawSnake(snake2, P2_COLOR);
    }

    function drawSnake(snake, color) {
        ctx.fillStyle = color;
        if (gameMode === 'classic') {
            for (const part of snake) {
                ctx.fillRect(part.x * GRID_SIZE, part.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
            }
        } else { // Modern mode smooth drawing
            for (let i = 0; i < snake.length; i++) {
                const part = snake[i];
                const size = SNAKE_SIZE * (1 - i * 0.02); // Taper the tail
                ctx.beginPath();
                ctx.arc(part.x * SNAKE_SIZE + SNAKE_SIZE/2, part.y * SNAKE_SIZE + SNAKE_SIZE/2, Math.max(size/2, 2), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    

    // --- Event Listeners ---

    // Player Controls
    document.addEventListener('keydown', e => {
        switch (e.key) {
            // Player 1 (WASD)
            case 'w':
            case 'W':
                if (direction1.y === 0) nextDirection1 = { x: 0, y: -1 };
                break;
            case 's':
            case 'S':
                if (direction1.y === 0) nextDirection1 = { x: 0, y: 1 };
                break;
            case 'a':
            case 'A':
                if (direction1.x === 0) nextDirection1 = { x: -1, y: 0 };
                break;
            case 'd':
            case 'D':
                if (direction1.x === 0) nextDirection1 = { x: 1, y: 0 };
                break;
            
            // Player 2 (Arrow Keys)
            case 'ArrowUp':
                if (direction2.y === 0) nextDirection2 = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
                if (direction2.y === 0) nextDirection2 = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
                if (direction2.x === 0) nextDirection2 = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
                if (direction2.x === 0) nextDirection2 = { x: 1, y: 0 };
                break;
        }
    });

    // UI Controls
    classicBtn.addEventListener('click', () => {
        gameMode = 'classic';
        classicBtn.classList.add('active');
        modernBtn.classList.remove('active');
    });

    modernBtn.addEventListener('click', () => {
        gameMode = 'modern';
        modernBtn.classList.add('active');
        classicBtn.classList.remove('active');
    });

    startBtn.addEventListener('click', startGame);

    // --- Initial Welcome Screen ---
    function drawWelcomeScreen() {
        ctx.fillStyle = '#1c1f24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#61afef';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('2-Player Snake', canvas.width / 2, canvas.height / 2 - 80);

        ctx.fillStyle = '#abb2bf';
        ctx.font = '20px sans-serif';
        ctx.fillText('Select a mode and press "Start Game" to begin.', canvas.width / 2, canvas.height / 2);

        ctx.font = '16px sans-serif';
        ctx.fillText('P1: WASD  |  P2: Arrow Keys', canvas.width / 2, canvas.height / 2 + 50);
    }
    
    drawWelcomeScreen();
});
