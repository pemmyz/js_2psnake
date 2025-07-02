document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    // Renamed and new score elements
    const currentScore1Element = document.getElementById('current-score1');
    const currentScore2Element = document.getElementById('current-score2');
    const totalScore1Element = document.getElementById('total-score1');
    const totalScore2Element = document.getElementById('total-score2');
    const faults1Element = document.getElementById('faults1');
    const faults2Element = document.getElementById('faults2');
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
    const SPAWN_RADIUS = 5;
    const FOOD_TIMEOUT_FRAMES = 12 * 60; // 12 seconds at 60fps
    const FOOD_PROXIMITY_TIMEOUT_FRAMES = 5 * 60; // 5 seconds for proximity timeout
    const FOOD_PROXIMITY_DISTANCE = 1; // Manhattan distance for proximity check

    let gameMode = 'classic';
    let gameRunning = false;
    let animationFrameId;
    let gameFrame = 0;
    
    // --- Countdown Timer State ---
    let countdownInterval;
    let countdownValue = 7;

    let snake1, currentScore1, direction1, nextDirection1;
    let snake2, currentScore2, direction2, nextDirection2;
    let food;
    let foodTargetPlayer = null; 
    let foodSpawnFrame = 0;
    let player1NearFoodSince = null;
    let player2NearFoodSince = null;
    
    // --- NEW: Persistent State (Total Score & Faults) ---
    let totalScore1 = 0;
    let totalScore2 = 0;
    let faults1 = 0;
    let faults2 = 0;

    // --- AI State ---
    let p1BotActive = false;
    let p2BotActive = false;
    let p1AiIndex = 1; // Default AI for Player 1 (Greedy)
    let p2AiIndex = 2; // Default AI for Player 2 (Smart Greedy)

    // --- Game Setup & Initialization ---
    function init() {
        const startX1 = 8;
        const startY1 = 10;
        snake1 = [ { x: startX1, y: startY1 }, { x: startX1 - 1, y: startY1 }, { x: startX1 - 2, y: startY1 }];
        currentScore1 = 0; // Only reset current score
        direction1 = { x: 1, y: 0 };
        nextDirection1 = { x: 1, y: 0 };
        currentScore1Element.textContent = `Current: 0`;

        const startX2 = CANVAS_WIDTH_UNITS - 9;
        const startY2 = 10;
        snake2 = [ { x: startX2, y: startY2 }, { x: startX2 + 1, y: startY2 }, { x: startX2 + 2, y: startY2 }];
        currentScore2 = 0; // Only reset current score
        direction2 = { x: -1, y: 0 };
        nextDirection2 = { x: -1, y: 0 };
        currentScore2Element.textContent = `Current: 0`;

        foodTargetPlayer = null; 
        gameFrame = 0;
        placeFood();
    }
    
    function startGame(isManualStart = false) {
        clearInterval(countdownInterval); 
        if (gameRunning) return;
        
        // On manual start, reset all persistent stats
        if (isManualStart) {
            totalScore1 = 0;
            totalScore2 = 0;
            faults1 = 0;
            faults2 = 0;
        }

        // Update persistent stat displays every time a game starts
        totalScore1Element.textContent = `Total: ${totalScore1}`;
        totalScore2Element.textContent = `Total: ${totalScore2}`;
        faults1Element.textContent = `Faults: ${faults1}`;
        faults2Element.textContent = `Faults: ${faults2}`;
        
        gameRunning = true;
        init(); // Resets round-specific stats
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        gameLoop();
    }

    function placeFood() {
        let foodX, foodY;
        let onSnake;
        let foundSpot = false;

        const applyTargetedSpawning = 
            foodTargetPlayer !== null && 
            snake1 && snake1.length <= 3 &&
            snake2 && snake2.length <= 3;

        if (applyTargetedSpawning) {
            const targetSnake = (foodTargetPlayer === 1) ? snake1 : snake2;
            const head = targetSnake[0];
            
            for (let i = 0; i < 50; i++) { 
                const angle = Math.random() * 2 * Math.PI;
                const radius = 2 + Math.random() * SPAWN_RADIUS;
                foodX = Math.round(head.x + Math.cos(angle) * radius);
                foodY = Math.round(head.y + Math.sin(angle) * radius);

                if (foodX <= 0 || foodX >= CANVAS_WIDTH_UNITS - 1 || foodY <= 0 || foodY >= CANVAS_HEIGHT_UNITS - 1) {
                    continue; 
                }

                onSnake = false;
                for (const part of [...snake1, ...snake2]) {
                    if (part.x === foodX && part.y === foodY) {
                        onSnake = true;
                        break;
                    }
                }

                if (!onSnake) {
                    foundSpot = true;
                    break; 
                }
            }
        }
        
        if (!foundSpot) {
            do {
                onSnake = false;
                foodX = Math.floor(Math.random() * (CANVAS_WIDTH_UNITS - 2)) + 1;
                foodY = Math.floor(Math.random() * (CANVAS_HEIGHT_UNITS - 2)) + 1; 
                
                for (const part of [...snake1, ...snake2]) {
                    if (part.x === foodX && part.y === foodY) {
                        onSnake = true;
                        break;
                    }
                }
            } while (onSnake);
        }
        
        food = { x: foodX, y: foodY };
        
        if (foodTargetPlayer === null && snake1 && snake2) {
            const head1 = snake1[0];
            const head2 = snake2[0];
            const dist1 = Math.hypot(head1.x - food.x, head1.y - food.y);
            const dist2 = Math.hypot(head2.x - food.x, head2.y - food.y);
            
            foodTargetPlayer = (dist1 <= dist2) ? 1 : 2;
        }

        foodSpawnFrame = gameFrame;
        player1NearFoodSince = null; // Reset proximity timers
        player2NearFoodSince = null;
    }


    // --- AI ALGORITHMS ---
    const aiAlgorithms = [
        { name: 'Random', func: aiRandom },
        { name: 'Greedy', func: aiGreedy },
        { name: 'Smart Greedy', func: aiSmartGreedy },
        { name: 'Defensive', func: aiDefensive },
        { name: 'A* Pathfind', func: aiAStar },
    ];

    function updateAiChoice(playerNum, newIndex) {
        if (newIndex >= aiAlgorithms.length) return; // Safety check

        const aiName = aiAlgorithms[newIndex].name;
        if (playerNum === 1) {
            p1AiIndex = newIndex;
            p1AiName.textContent = aiName;
        } else if (playerNum === 2) {
            p2AiIndex = newIndex;
            p2AiName.textContent = aiName;
        }
    }

    function getPossibleMoves(snake, otherSnake) {
        const head = snake[0];
        const possibleMoves = [ { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
        const obstacles = new Set([...snake.map(p => `${p.x},${p.y}`), ...otherSnake.map(p => `${p.x},${p.y}`)]);

        return possibleMoves.filter(move => {
            const nextPos = { x: head.x + move.x, y: head.y + move.y };
            if (nextPos.x < 0 || nextPos.x >= CANVAS_WIDTH_UNITS || nextPos.y < 0 || nextPos.y >= CANVAS_HEIGHT_UNITS) return false;
            if (obstacles.has(`${nextPos.x},${nextPos.y}`)) return false;
            if (otherSnake.length > 1 && nextPos.x === otherSnake[0].x && nextPos.y === otherSnake[0].y) {
                 const theirNextPos = { x: otherSnake[0].x + (otherSnake[0].x - otherSnake[1].x), y: otherSnake[0].y + (otherSnake[0].y - otherSnake[1].y) };
                 if (nextPos.x === theirNextPos.x && nextPos.y === theirNextPos.y) return false;
            }
            return true;
        });
    }

    function aiRandom(snake, otherSnake, food, direction, playerNum) {
        let possibleMoves = getPossibleMoves(snake, otherSnake);
        if (possibleMoves.length === 0) return direction; 
        const straightMove = possibleMoves.find(m => m.x === direction.x && m.y === direction.y);
        if (straightMove && Math.random() > 0.1) return straightMove;
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    function aiGreedy(snake, otherSnake, food, direction, playerNum) {
        const head = snake[0];
        if (!food) return aiDefensive(snake, otherSnake, food, direction, playerNum);
        let possibleMoves = getPossibleMoves(snake, otherSnake);
        if (possibleMoves.length === 0) return aiDefensive(snake, otherSnake, food, direction, playerNum);
        possibleMoves.sort((a, b) => {
            const distA = Math.hypot(head.x + a.x - food.x, head.y + a.y - food.y);
            const distB = Math.hypot(head.x + b.x - food.x, head.y + b.y - food.y);
            return distA - distB;
        });
        return possibleMoves[0];
    }
    
    function aiSmartGreedy(snake, otherSnake, food, direction, playerNum) {
        if (foodTargetPlayer === playerNum) {
            return aiAStar(snake, otherSnake, food, direction); 
        } else {
            return aiDefensive(snake, otherSnake, food, direction);
        }
    }

    function aiDefensive(snake, otherSnake, food, direction, playerNum) {
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
            if (futureMovesA !== futureMovesB) { return futureMovesB - futureMovesA; }
            const distA = Math.hypot(nextPosA.x - food.x, nextPosA.y - food.y);
            const distB = Math.hypot(nextPosB.x - food.x, nextPosB.y - food.y);
            return distA - distB;
        });
        return possibleMoves[0];
    }
    
    function findPathWithAStar(snake, otherSnake, targetNode) {
        if (!targetNode) return null;
        const startNode = snake[0];
        const obstacles = new Set([...snake.slice(1).map(p => `${p.x},${p.y}`), ...otherSnake.slice(1).map(p => `${p.x},${p.y}`)]);
        const targetKey = `${targetNode.x},${targetNode.y}`;
        obstacles.delete(targetKey);
        const otherHead = otherSnake[0];
        if (otherHead) {
            const otherHeadKey = `${otherHead.x},${otherHead.y}`;
            if (otherHeadKey !== targetKey) { obstacles.add(otherHeadKey); }
        }
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
                return null;
            }
            openSet.splice(lowestIndex, 1);
            const neighbors = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].map(d => ({x: current.x+d.x, y: current.y+d.y}));
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (neighbor.x < 0 || neighbor.x >= CANVAS_WIDTH_UNITS || neighbor.y < 0 || neighbor.y >= CANVAS_HEIGHT_UNITS || obstacles.has(neighborKey)) continue;
                let tentativeGScore = (gScore.get(`${current.x},${current.y}`) || Infinity) + 1;
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

    function aiAStar(snake, otherSnake, food, direction, playerNum) {
        const pathToFood = findPathWithAStar(snake, otherSnake, food);
        if (pathToFood) {
            const hypotheticalSnake = [food, ...snake]; 
            const hypotheticalTail = hypotheticalSnake[hypotheticalSnake.length - 1];
            const pathFromFoodToTail = findPathWithAStar(hypotheticalSnake, otherSnake, hypotheticalTail);
            if (pathFromFoodToTail) { return pathToFood; }
        }
        const tail = snake[snake.length - 1];
        const pathToTail = findPathWithAStar(snake, otherSnake, tail);
        if (pathToTail) { return pathToTail; }
        return aiDefensive(snake, otherSnake, food, direction);
    }
    
    function gameLoop() {
        if (!gameRunning) return;
        update();
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    function update() {
        const speed = gameMode === 'classic' ? 5 : 2;
        
        if (p1BotActive && p2BotActive && gameRunning) {
            // Condition 1: Global 12-second timeout
            const globalTimeout = (gameFrame - foodSpawnFrame) > FOOD_TIMEOUT_FRAMES;

            // Condition 2: Player 1 proximity timeout
            const head1 = snake1[0];
            const dist1 = Math.abs(head1.x - food.x) + Math.abs(head1.y - food.y);
            if (dist1 <= FOOD_PROXIMITY_DISTANCE) {
                if (player1NearFoodSince === null) player1NearFoodSince = gameFrame;
            } else {
                player1NearFoodSince = null;
            }
            const p1ProximityTimeout = player1NearFoodSince !== null && (gameFrame - player1NearFoodSince) > FOOD_PROXIMITY_TIMEOUT_FRAMES;
            
            // Condition 3: Player 2 proximity timeout
            const head2 = snake2[0];
            const dist2 = Math.abs(head2.x - food.x) + Math.abs(head2.y - food.y);
            if (dist2 <= FOOD_PROXIMITY_DISTANCE) {
                if (player2NearFoodSince === null) player2NearFoodSince = gameFrame;
            } else {
                player2NearFoodSince = null;
            }
            const p2ProximityTimeout = player2NearFoodSince !== null && (gameFrame - player2NearFoodSince) > FOOD_PROXIMITY_TIMEOUT_FRAMES;

            // Respawn food if any timeout condition is met
            if (globalTimeout || p1ProximityTimeout || p2ProximityTimeout) {
                if(globalTimeout) console.log("Food timed out (global 12s). Respawning.");
                if(p1ProximityTimeout) console.log("Food timed out (P1 proximity 5s). Respawning.");
                if(p2ProximityTimeout) console.log("Food timed out (P2 proximity 5s). Respawning.");
                placeFood();
            }
        }

        if (gameFrame++ % speed !== 0) return;
        
        if (p1BotActive) nextDirection1 = aiAlgorithms[p1AiIndex].func(snake1, snake2, food, direction1, 1);
        if (p2BotActive) nextDirection2 = aiAlgorithms[p2AiIndex].func(snake2, snake1, food, direction2, 2);

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
                currentScore1++;
                totalScore1++;
                currentScore1Element.textContent = `Current: ${currentScore1}`;
                totalScore1Element.textContent = `Total: ${totalScore1}`;
            } else {
                currentScore2++;
                totalScore2++;
                currentScore2Element.textContent = `Current: ${currentScore2}`;
                totalScore2Element.textContent = `Total: ${totalScore2}`;
            }
            foodTargetPlayer = (playerNum === 1) ? 2 : 1;
            placeFood();
        } else {
            snake.pop();
        }
    }

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
        if (message.startsWith('Player 2 Wins')) {
            faults1++;
            faults1Element.textContent = `Faults: ${faults1}`;
        } else if (message.startsWith('Player 1 Wins')) {
            faults2++;
            faults2Element.textContent = `Faults: ${faults2}`;
        }
        ctx.fillStyle = 'rgba(40, 44, 52, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#abb2bf';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '24px sans-serif';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 10);
        ctx.font = '18px sans-serif';
        ctx.fillText('Restarting in 3 seconds...', canvas.width / 2, canvas.height / 2 + 60);
        setTimeout(() => startGame(false), 3000);
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
    
    document.addEventListener('keydown', e => {
        // Player 1 AI selection: Keys 1-5
        if (e.key >= '1' && e.key <= '5') {
            const index = parseInt(e.key, 10) - 1; // 1 -> 0, 2 -> 1, etc.
            if (index < aiAlgorithms.length) {
                updateAiChoice(1, index);
            }
            return; // Consume the event so it doesn't affect other things
        }

        // Player 2 AI selection: Keys 6-9 and 0
        if ((e.key >= '6' && e.key <= '9') || e.key === '0') {
            let index;
            if (e.key === '0') {
                index = 4; // Key '0' maps to the 5th algorithm
            } else {
                index = parseInt(e.key, 10) - 6; // 6->0, 7->1, 8->2, 9->3
            }
             if (index < aiAlgorithms.length) {
                updateAiChoice(2, index);
            }
            return; // Consume the event
        }

        // Snake movement controls
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

    p1BotBtn.addEventListener('click', () => { p1BotActive = !p1BotActive; p1BotBtn.classList.toggle('active', p1BotActive); });
    p2BotBtn.addEventListener('click', () => { p2BotActive = !p2BotActive; p2BotBtn.classList.toggle('active', p2BotActive); });
    classicBtn.addEventListener('click', () => { gameMode = 'classic'; classicBtn.classList.add('active'); modernBtn.classList.remove('active'); });
    modernBtn.addEventListener('click', () => { gameMode = 'modern'; modernBtn.classList.add('active'); classicBtn.classList.remove('active'); });
    startBtn.addEventListener('click', () => startGame(true));

    function startWelcomeCountdown() {
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            if (gameRunning) { clearInterval(countdownInterval); return; }
            ctx.fillStyle = '#1c1f24';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#61afef';
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('2-Player Snake', canvas.width / 2, canvas.height / 2 - 80);
            ctx.fillStyle = '#abb2bf';
            ctx.font = '20px sans-serif';
            ctx.fillText('Select a mode and press "Start Game" to begin.', canvas.width / 2, canvas.height / 2);
            if (countdownValue >= 1) {
                ctx.font = '18px sans-serif';
                ctx.fillStyle = '#e5c07b';
                ctx.fillText(`Auto-starting bot match in ${countdownValue}...`, canvas.width / 2, canvas.height / 2 + 50);
            } else {
                ctx.font = '18px sans-serif';
                ctx.fillStyle = '#98c379';
                ctx.fillText('Starting bot match!', canvas.width / 2, canvas.height / 2 + 50);
            }
            countdownValue--;
            if (countdownValue < -1) { 
                clearInterval(countdownInterval);
                if (!gameRunning) {
                    p1BotActive = true;
                    p2BotActive = true;
                    p1BotBtn.classList.add('active');
                    p2BotBtn.classList.add('active');
                    startGame();
                }
            }
        }, 1000);
    }
    
    // Set initial AI names in the UI
    updateAiChoice(1, p1AiIndex);
    updateAiChoice(2, p2AiIndex);
    startWelcomeCountdown();
});
