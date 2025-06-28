document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const score1Element = document.getElementById('score1');
    const score2Element = document.getElementById('score2');
    const classicBtn = document.getElementById('classic-btn');
    const modernBtn = document.getElementById('modern-btn');
    const startBtn = document.getElementById('start-btn');
    const p1BotBtn = document.getElementById('p1-bot-btn');
    const p2BotBtn = document.getElementById('p2-bot-btn');
    const p1AiName = document.getElementById('p1-ai-name');
    const p2AiName = document.getElementById('p2-ai-name');

    // --- Game Constants & State ---
    const GRID_SIZE = 20;
    const CANVAS_WIDTH_UNITS = canvas.width / GRID_SIZE;
    const CANVAS_HEIGHT_UNITS = canvas.height / GRID_SIZE;
    const SNAKE_SIZE = 20;
    const FOOD_RADIUS = 8;
    
    let gameMode = 'classic';
    let gameRunning = false;
    let animationFrameId;
    let gameFrame = 0;

    let snake1, score1, direction1, nextDirection1;
    let snake2, score2, direction2, nextDirection2;
    let food;

    // --- AI State ---
    let p1BotActive = false;
    let p2BotActive = false;
    let currentAiIndex = 2; // Default to Smart Greedy

    // --- Game Setup & Initialization ---
    function init() {
        snake1 = [{ x: 8, y: 10 }];
        score1 = 0;
        direction1 = { x: 1, y: 0 };
        nextDirection1 = { x: 1, y: 0 };
        score1Element.textContent = `Score: 0`;

        snake2 = [{ x: CANVAS_WIDTH_UNITS - 9, y: 10 }];
        score2 = 0;
        direction2 = { x: -1, y: 0 };
        nextDirection2 = { x: -1, y: 0 };
        score2Element.textContent = `Score: 0`;

        gameFrame = 0;
        placeFood();
    }
    
    function startGame() {
        if (gameRunning) return;
        gameRunning = true;
        init();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        gameLoop();
    }

    function placeFood() {
        let foodX, foodY;
        let onSnake;
        do {
            onSnake = false;
            foodX = Math.floor(Math.random() * CANVAS_WIDTH_UNITS);
            foodY = Math.floor(Math.random() * CANVAS_HEIGHT_UNITS);
            for (const part of [...snake1, ...snake2]) {
                if (part.x === foodX && part.y === foodY) {
                    onSnake = true;
                    break;
                }
            }
        } while (onSnake);
        food = { x: foodX, y: foodY };
    }

    // --- AI ALGORITHMS ---
    const aiAlgorithms = [
        { name: 'Random', func: aiRandom },
        { name: 'Greedy', func: aiGreedy },
        { name: 'Smart Greedy', func: aiSmartGreedy },
        { name: 'Defensive', func: aiDefensive },
        { name: 'A* Pathfind', func: aiAStar },
    ];

    function updateAiChoice(newIndex) {
        currentAiIndex = newIndex;
        const aiName = aiAlgorithms[currentAiIndex].name;
        p1AiName.textContent = aiName;
        p2AiName.textContent = aiName;
    }

    function getPossibleMoves(snake, otherSnake) {
        const head = snake[0];
        const possibleMoves = [
            { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: 0 }, { x: 1, y: 0 },
        ];
        
        const obstacles = new Set([...snake.map(p => `${p.x},${p.y}`), ...otherSnake.map(p => `${p.x},${p.y}`)]);

        return possibleMoves.filter(move => {
            const nextPos = { x: head.x + move.x, y: head.y + move.y };
            if (nextPos.x < 0 || nextPos.x >= CANVAS_WIDTH_UNITS || nextPos.y < 0 || nextPos.y >= CANVAS_HEIGHT_UNITS) return false;
            if (obstacles.has(`${nextPos.x},${nextPos.y}`)) return false;
            return true;
        });
    }

    function aiRandom(snake, otherSnake, food, direction) {
        let possibleMoves = getPossibleMoves(snake, otherSnake);
        if (possibleMoves.length === 0) return direction; 
        const straightMove = possibleMoves.find(m => m.x === direction.x && m.y === direction.y);
        if (straightMove && Math.random() > 0.1) return straightMove;
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    // **** UPDATED: The simple Greedy AI now uses the safer "Smart Greedy" logic ****
    // This prevents it from trapping itself, which was the cause of the bug.
    function aiGreedy(snake, otherSnake, food, direction) {
        const head = snake[0];
        let possibleMoves = getPossibleMoves(snake, otherSnake);
        if (possibleMoves.length === 0) return direction;

        // Filter for moves that don't lead to an immediate dead end.
        const safeMoves = possibleMoves.filter(move => {
            const nextPos = { x: head.x + move.x, y: head.y + move.y };
            const futureSnake = [nextPos, ...snake];
            return getPossibleMoves(futureSnake, otherSnake).length > 0;
        });

        // If there are safe moves, use them. Otherwise, use any move as a last resort.
        const movesToConsider = safeMoves.length > 0 ? safeMoves : possibleMoves;
        
        // From the list of safer moves, pick the one closest to the food.
        movesToConsider.sort((a, b) => {
            const distA = Math.hypot(head.x + a.x - food.x, head.y + a.y - food.y);
            const distB = Math.hypot(head.x + b.x - food.x, head.y + b.y - food.y);
            return distA - distB;
        });
        
        return movesToConsider[0];
    }
    
    // The Smart Greedy algorithm (now identical to the fixed Greedy one)
    function aiSmartGreedy(snake, otherSnake, food, direction) {
        const head = snake[0];
        let possibleMoves = getPossibleMoves(snake, otherSnake);
        if (possibleMoves.length === 0) return direction;

        const safeMoves = possibleMoves.filter(move => {
            const nextPos = { x: head.x + move.x, y: head.y + move.y };
            const futureSnake = [nextPos, ...snake];
            return getPossibleMoves(futureSnake, otherSnake).length > 0;
        });

        const movesToConsider = safeMoves.length > 0 ? safeMoves : possibleMoves;
        
        movesToConsider.sort((a, b) => {
            const distA = Math.hypot(head.x + a.x - food.x, head.y + a.y - food.y);
            const distB = Math.hypot(head.x + b.x - food.x, head.y + b.y - food.y);
            return distA - distB;
        });
        
        return movesToConsider[0];
    }

    function aiDefensive(snake, otherSnake, food, direction) {
        const head = snake[0];
        let possibleMoves = getPossibleMoves(snake, otherSnake);
        if (possibleMoves.length === 0) return direction;

        possibleMoves.sort((a, b) => {
            const nextPosA = { x: head.x + a.x, y: head.y + a.y };
            const futureSnakeA = [nextPosA, ...snake];
            const futureMovesA = getPossibleMoves(futureSnakeA, otherSnake).length;
            const nextPosB = { x: head.x + b.x, y: head.y + b.y };
            const futureSnakeB = [nextPosB, ...snake];
            const futureMovesB = getPossibleMoves(futureSnakeB, otherSnake).length;
            return futureMovesB - futureMovesA;
        });

        return possibleMoves[0];
    }
    
    function findPathWithAStar(snake, otherSnake, targetNode) {
        const startNode = snake[0];
        const obstacles = new Set([...snake.slice(1).map(p => `${p.x},${p.y}`), ...otherSnake.map(p => `${p.x},${p.y}`)]);

        let openSet = [startNode];
        let cameFrom = new Map();
        let gScore = new Map([[ `${startNode.x},${startNode.y}`, 0 ]]);
        let fScore = new Map([[ `${startNode.x},${startNode.y}`, Math.hypot(startNode.x - targetNode.x, startNode.y - targetNode.y) ]]);
        
        const maxIterations = 2000;
        let iterations = 0;

        while (openSet.length > 0) {
            if (iterations++ > maxIterations) return null;

            let lowestIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if ((fScore.get(`${openSet[i].x},${openSet[i].y}`) || Infinity) < (fScore.get(`${openSet[lowestIndex].x},${openSet[lowestIndex].y}`) || Infinity)) {
                    lowestIndex = i;
                }
            }
            let current = openSet[lowestIndex];
            
            if (current.x === targetNode.x && current.y === targetNode.y) {
                let path = [];
                let temp = current;
                while (cameFrom.has(`${temp.x},${temp.y}`)) {
                    path.unshift(temp);
                    temp = cameFrom.get(`${temp.x},${temp.y}`);
                }
                if (path.length > 0) {
                    const nextStep = path[0];
                    return { x: nextStep.x - startNode.x, y: nextStep.y - startNode.y };
                }
            }

            openSet.splice(lowestIndex, 1);
            
            const neighbors = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].map(d => ({x: current.x+d.x, y: current.y+d.y}));
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (neighbor.x < 0 || neighbor.x >= CANVAS_WIDTH_UNITS || neighbor.y < 0 || neighbor.y >= CANVAS_HEIGHT_UNITS || obstacles.has(neighborKey)) continue;

                let tentativeGScore = gScore.get(`${current.x},${current.y}`) + 1;
                if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + Math.hypot(neighbor.x - targetNode.x, neighbor.y - targetNode.y));
                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        return null;
    }

    function aiAStar(snake, otherSnake, food, direction) {
        const pathToFood = findPathWithAStar(snake, otherSnake, food);
        if (pathToFood) {
            return pathToFood;
        }

        const tail = snake[snake.length - 1];
        const pathToTail = findPathWithAStar(snake, otherSnake, tail);
        if (pathToTail) {
            return pathToTail;
        }

        return aiDefensive(snake, otherSnake, food, direction);
    }
    
    // --- Game Loop ---
    function gameLoop() {
        if (!gameRunning) return;
        update();
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    function update() {
        const speed = gameMode === 'classic' ? 5 : 2;
        if (gameFrame++ % speed !== 0) return;
        
        if (p1BotActive) nextDirection1 = aiAlgorithms[currentAiIndex].func(snake1, snake2, food, direction1);
        if (p2BotActive) nextDirection2 = aiAlgorithms[currentAiIndex].func(snake2, snake1, food, direction2);

        moveSnake(snake1, direction1, nextDirection1, 1);
        moveSnake(snake2, direction2, nextDirection2, 2);
        
        checkCollisions();
    }

    function moveSnake(snake, direction, nextDirection, playerNum) {
        if (nextDirection && ((nextDirection.x !== 0 && direction.x !== -nextDirection.x) || (nextDirection.y !== 0 && direction.y !== -nextDirection.y))) {
            Object.assign(direction, nextDirection);
        }

        const head = { ...snake[0] };
        head.x += direction.x;
        head.y += direction.y;
        snake.unshift(head);

        let ateFood = false;
        if (gameMode === 'classic') {
             if (head.x === food.x && head.y === food.y) ateFood = true;
        } else {
            const dx = (head.x * SNAKE_SIZE + SNAKE_SIZE / 2) - (food.x * GRID_SIZE + GRID_SIZE / 2);
            const dy = (head.y * SNAKE_SIZE + SNAKE_SIZE / 2) - (food.y * GRID_SIZE + GRID_SIZE / 2);
            if (Math.sqrt(dx*dx + dy*dy) < SNAKE_SIZE / 2 + FOOD_RADIUS) ateFood = true;
        }

        if (ateFood) {
            if (playerNum === 1) {
                score1++;
                score1Element.textContent = `Score: ${score1}`;
            } else {
                score2++;
                score2Element.textContent = `Score: ${score2}`;
            }
            placeFood();
        } else {
            snake.pop();
        }
    }

    // --- Collision & Drawing ---
    function checkCollisions() {
        const head1 = snake1[0];
        const head2 = snake2[0];
        
        if (head1.x < 0 || head1.x >= CANVAS_WIDTH_UNITS || head1.y < 0 || head1.y >= CANVAS_HEIGHT_UNITS) return gameOver('Player 2 Wins! Player 1 hit a wall.');
        if (head2.x < 0 || head2.x >= CANVAS_WIDTH_UNITS || head2.y < 0 || head2.y >= CANVAS_HEIGHT_UNITS) return gameOver('Player 1 Wins! Player 2 hit a wall.');
        
        if (checkSelfCollision(snake1)) return gameOver('Player 2 Wins! Player 1 crashed into itself.');
        if (checkSelfCollision(snake2)) return gameOver('Player 1 Wins! Player 2 crashed into itself.');

        if (checkSnakeCollision(head1, snake2)) return gameOver('Player 2 Wins! Player 1 crashed into Player 2.');
        if (checkSnakeCollision(head2, snake1)) return gameOver('Player 1 Wins! Player 2 crashed into Player 1.');

        if (head1.x === head2.x && head1.y === head2.y) return gameOver("It's a tie! Head-on collision.");
    }

    function checkSelfCollision(snake) {
        for (let i = 1; i < snake.length; i++) if (snake[0].x === snake[i].x && snake[0].y === snake[i].y) return true;
        return false;
    }

    function checkSnakeCollision(head, otherSnake) {
        for (const part of otherSnake) if (head.x === part.x && head.y === part.y) return true;
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

    function draw() {
        ctx.fillStyle = '#1c1f24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#c678dd';
        ctx.beginPath();
        ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, FOOD_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        drawSnake(snake1, '#61afef');
        drawSnake(snake2, '#e5c07b');
    }

    function drawSnake(snake, color) {
        ctx.fillStyle = color;
        if (gameMode === 'classic') {
            for (const part of snake) {
                 ctx.fillRect(part.x * GRID_SIZE, part.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
            }
        } else {
            for (let i = 0; i < snake.length; i++) {
                const part = snake[i];
                const size = SNAKE_SIZE * (1 - i * 0.02);
                ctx.beginPath();
                ctx.arc(part.x * SNAKE_SIZE + SNAKE_SIZE/2, part.y * SNAKE_SIZE + SNAKE_SIZE/2, Math.max(size/2, 2), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // --- Event Listeners ---
    document.addEventListener('keydown', e => {
        if (e.key >= '0' && e.key <= '4') {
            const index = parseInt(e.key);
            if (index < aiAlgorithms.length) {
                updateAiChoice(index);
            }
            return;
        }

        switch (e.key) {
            case 'w': case 'W': if (direction1.y === 0 && !p1BotActive) nextDirection1 = { x: 0, y: -1 }; break;
            case 's': case 'S': if (direction1.y === 0 && !p1BotActive) nextDirection1 = { x: 0, y: 1 }; break;
            case 'a': case 'A': if (direction1.x === 0 && !p1BotActive) nextDirection1 = { x: -1, y: 0 }; break;
            case 'd': case 'D': if (direction1.x === 0 && !p1BotActive) nextDirection1 = { x: 1, y: 0 }; break;
            case 'ArrowUp': if (direction2.y === 0 && !p2BotActive) nextDirection2 = { x: 0, y: -1 }; break;
            case 'ArrowDown': if (direction2.y === 0 && !p2BotActive) nextDirection2 = { x: 0, y: 1 }; break;
            case 'ArrowLeft': if (direction2.x === 0 && !p2BotActive) nextDirection2 = { x: -1, y: 0 }; break;
            case 'ArrowRight': if (direction2.x === 0 && !p2BotActive) nextDirection2 = { x: 1, y: 0 }; break;
        }
    });

    p1BotBtn.addEventListener('click', () => {
        p1BotActive = !p1BotActive;
        p1BotBtn.classList.toggle('active', p1BotActive);
    });

    p2BotBtn.addEventListener('click', () => {
        p2BotActive = !p2BotActive;
        p2BotBtn.classList.toggle('active', p2BotActive);
    });

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

    // --- Initial Screen ---
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
    }
    
    updateAiChoice(currentAiIndex);
    drawWelcomeScreen();
});
