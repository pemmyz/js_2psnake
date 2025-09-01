document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
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
    const p1GpStatusEl = document.getElementById('p1-gp-status');
    const p2GpStatusEl = document.getElementById('p2-gp-status');
    const p1ReadyIndicator = document.getElementById('p1-ready-indicator');
    const p2ReadyIndicator = document.getElementById('p2-ready-indicator');


    // --- Game Constants & State ---
    const GRID_SIZE = 20;
    const CANVAS_WIDTH_UNITS = canvas.width / GRID_SIZE;
    const CANVAS_HEIGHT_UNITS = canvas.height / GRID_SIZE;
    const SNAKE_SIZE = 20;
    const FOOD_RADIUS = 8;
    const SPAWN_RADIUS = 5;
    const FOOD_TIMEOUT_FRAMES = 12 * 60;
    const FOOD_PROXIMITY_TIMEOUT_FRAMES = 5 * 60;
    const FOOD_PROXIMITY_DISTANCE = 1;

    let gameMode = 'classic';
    let gameRunning = false;
    let animationFrameId;
    let gameFrame = 0;
    
    // Game start and ready-up state
    let isAwaitingPlayerInput = false;
    let player1Ready = false;
    let player2Ready = false;
    let startCountdownInterval = null;
    let idleStartTime = null; 
    let onePlayerReadyTime = null; 

    let snake1, currentScore1, direction1, nextDirection1;
    let snake2, currentScore2, direction2, nextDirection2;
    let food;
    let foodTargetPlayer = null; 
    let foodSpawnFrame = 0;
    let player1NearFoodSince = null;
    let player2NearFoodSince = null;
    
    let totalScore1 = 0;
    let totalScore2 = 0;
    let faults1 = 0;
    let faults2 = 0;

    let p1BotActive = false;
    let p2BotActive = false;
    let p1AiIndex = 1; 
    let p2AiIndex = 2; 

    let playerGamepadAssignments = { p1: null, p2: null };
    const gamepadAssignmentCooldown = {};

    function init() {
        const startX1 = 8;
        const startY1 = 10;
        snake1 = [ { x: startX1, y: startY1 }, { x: startX1 - 1, y: startY1 }, { x: startX1 - 2, y: startY1 }];
        currentScore1 = 0;
        direction1 = { x: 1, y: 0 };
        nextDirection1 = { x: 1, y: 0 };
        currentScore1Element.textContent = `Current: 0`;

        const startX2 = CANVAS_WIDTH_UNITS - 9;
        const startY2 = 10;
        snake2 = [ { x: startX2, y: startY2 }, { x: startX2 + 1, y: startY2 }, { x: startX2 + 2, y: startY2 }];
        currentScore2 = 0;
        direction2 = { x: -1, y: 0 };
        nextDirection2 = { x: -1, y: 0 };
        currentScore2Element.textContent = `Current: 0`;

        foodTargetPlayer = null; 
        gameFrame = 0;
        placeFood();
    }
    
    function startGame(isNewMatch = false) {
        clearInterval(startCountdownInterval);
        startCountdownInterval = null;
        isAwaitingPlayerInput = false;
        player1Ready = false;
        player2Ready = false;
        updateReadyIndicators();
        
        if (gameRunning) return;
        
        if (isNewMatch) {
            totalScore1 = 0;
            totalScore2 = 0;
            faults1 = 0;
            faults2 = 0;
        }

        totalScore1Element.textContent = `Total: ${totalScore1}`;
        totalScore2Element.textContent = `Total: ${totalScore2}`;
        faults1Element.textContent = `Faults: ${faults1}`;
        faults2Element.textContent = `Faults: ${faults2}`;
        
        gameRunning = true;
        init();
    }

    function placeFood() {
        let foodX, foodY, onSnake, foundSpot = false;
        const applyTargetedSpawning = foodTargetPlayer !== null && snake1 && snake1.length <= 3 && snake2 && snake2.length <= 3;

        if (applyTargetedSpawning) {
            const targetSnake = (foodTargetPlayer === 1) ? snake1 : snake2;
            const head = targetSnake[0];
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = 2 + Math.random() * SPAWN_RADIUS;
                foodX = Math.round(head.x + Math.cos(angle) * radius);
                foodY = Math.round(head.y + Math.sin(angle) * radius);
                if (foodX <= 0 || foodX >= CANVAS_WIDTH_UNITS - 1 || foodY <= 0 || foodY >= CANVAS_HEIGHT_UNITS - 1) continue;
                onSnake = [...snake1, ...snake2].some(p => p.x === foodX && p.y === foodY);
                if (!onSnake) { foundSpot = true; break; }
            }
        }
        if (!foundSpot) {
            do {
                foodX = Math.floor(Math.random() * (CANVAS_WIDTH_UNITS - 2)) + 1;
                foodY = Math.floor(Math.random() * (CANVAS_HEIGHT_UNITS - 2)) + 1;
                onSnake = [...snake1, ...snake2].some(p => p.x === foodX && p.y === foodY);
            } while (onSnake);
        }
        food = { x: foodX, y: foodY };
        if (foodTargetPlayer === null && snake1 && snake2) {
            const dist1 = Math.hypot(snake1[0].x - food.x, snake1[0].y - food.y);
            const dist2 = Math.hypot(snake2[0].x - food.x, snake2[0].y - food.y);
            foodTargetPlayer = (dist1 <= dist2) ? 1 : 2;
        }
        foodSpawnFrame = gameFrame;
        player1NearFoodSince = null; player2NearFoodSince = null;
    }

    const aiAlgorithms = [
        { name: 'Random', func: aiRandom }, { name: 'Greedy', func: aiGreedy },
        { name: 'Smart Greedy', func: aiSmartGreedy }, { name: 'Defensive', func: aiDefensive },
        { name: 'A* Pathfind', func: aiAStar },
    ];
    function updateAiChoice(playerNum, newIndex) {
        if (newIndex >= aiAlgorithms.length) return;
        const aiName = aiAlgorithms[newIndex].name;
        if (playerNum === 1) { p1AiIndex = newIndex; p1AiName.textContent = aiName; }
        else if (playerNum === 2) { p2AiIndex = newIndex; p2AiName.textContent = aiName; }
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
    function aiRandom(snake, otherSnake, food, direction) {
        let possibleMoves = getPossibleMoves(snake, otherSnake); if (possibleMoves.length === 0) return direction;
        const straightMove = possibleMoves.find(m => m.x === direction.x && m.y === direction.y);
        if (straightMove && Math.random() > 0.1) return straightMove;
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }
    function aiGreedy(snake, otherSnake, food, direction) {
        if (!food) return aiDefensive(snake, otherSnake, food, direction);
        let possibleMoves = getPossibleMoves(snake, otherSnake); if (possibleMoves.length === 0) return aiDefensive(snake, otherSnake, food, direction);
        possibleMoves.sort((a, b) => Math.hypot(snake[0].x + a.x - food.x, snake[0].y + a.y - food.y) - Math.hypot(snake[0].x + b.x - food.x, snake[0].y + b.y - food.y));
        return possibleMoves[0];
    }
    function aiSmartGreedy(snake, otherSnake, food, direction, playerNum) {
        if (foodTargetPlayer === playerNum) return aiAStar(snake, otherSnake, food, direction);
        else return aiDefensive(snake, otherSnake, food, direction);
    }
    function aiDefensive(snake, otherSnake, food, direction) {
        const head = snake[0]; let possibleMoves = getPossibleMoves(snake, otherSnake); if (possibleMoves.length === 0) return direction;
        possibleMoves.sort((a, b) => {
            const futureMovesA = getPossibleMoves([ { x: head.x + a.x, y: head.y + a.y }, ...snake], otherSnake).length;
            const futureMovesB = getPossibleMoves([ { x: head.x + b.x, y: head.y + b.y }, ...snake], otherSnake).length;
            if (futureMovesA !== futureMovesB) return futureMovesB - futureMovesA;
            return Math.hypot(head.x + a.x - food.x, head.y + a.y - food.y) - Math.hypot(head.x + b.x - food.x, head.y + b.y - food.y);
        });
        return possibleMoves[0];
    }
    function findPathWithAStar(snake, otherSnake, targetNode) {
        if (!targetNode) return null; const startNode = snake[0];
        const obstacles = new Set([...snake.slice(1).map(p => `${p.x},${p.y}`), ...otherSnake.slice(1).map(p => `${p.x},${p.y}`)]);
        const targetKey = `${targetNode.x},${targetNode.y}`; obstacles.delete(targetKey);
        const otherHeadKey = otherSnake[0] ? `${otherSnake[0].x},${otherSnake[0].y}` : '';
        if (otherHeadKey && otherHeadKey !== targetKey) obstacles.add(otherHeadKey);
        let openSet = [startNode]; let cameFrom = new Map();
        let gScore = new Map([[ `${startNode.x},${startNode.y}`, 0 ]]);
        let fScore = new Map([[ `${startNode.x},${startNode.y}`, Math.hypot(startNode.x - targetNode.x, startNode.y - targetNode.y) ]]);
        for (let i = 0; i < 2000 && openSet.length > 0; i++) {
            let lowestIndex = 0;
            for (let j = 1; j < openSet.length; j++) if ((fScore.get(`${openSet[j].x},${openSet[j].y}`) || Infinity) < (fScore.get(`${openSet[lowestIndex].x},${openSet[lowestIndex].y}`) || Infinity)) lowestIndex = j;
            let current = openSet[lowestIndex];
            if (current.x === targetNode.x && current.y === targetNode.y) {
                let path = []; let temp = current;
                while (cameFrom.has(`${temp.x},${temp.y}`)) { path.unshift(temp); temp = cameFrom.get(`${temp.x},${temp.y}`); }
                if (path.length > 0) return { x: path[0].x - startNode.x, y: path[0].y - startNode.y };
                return null;
            }
            openSet.splice(lowestIndex, 1);
            const neighbors = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].map(d => ({x: current.x+d.x, y: current.y+d.y}));
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (neighbor.x < 0 || neighbor.x >= CANVAS_WIDTH_UNITS || neighbor.y < 0 || neighbor.y >= CANVAS_HEIGHT_UNITS || obstacles.has(neighborKey)) continue;
                let tentativeGScore = (gScore.get(`${current.x},${current.y}`) || Infinity) + 1;
                if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                    cameFrom.set(neighborKey, current); gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + Math.hypot(neighbor.x - targetNode.x, neighbor.y - targetNode.y));
                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) openSet.push(neighbor);
                }
            }
        }
        return null;
    }
    function aiAStar(snake, otherSnake, food, direction) {
        const pathToFood = findPathWithAStar(snake, otherSnake, food);
        if (pathToFood && findPathWithAStar([food, ...snake], otherSnake, snake[snake.length - 1])) return pathToFood;
        const pathToTail = findPathWithAStar(snake, otherSnake, snake[snake.length - 1]);
        if (pathToTail) return pathToTail;
        return aiDefensive(snake, otherSnake, food, direction);
    }
    
    function updateGamepadStatusHUD() {
        p1GpStatusEl.textContent = playerGamepadAssignments.p1 !== null ? `GP: Connected (ID ${playerGamepadAssignments.p1})` : 'GP: N/A';
        p2GpStatusEl.textContent = playerGamepadAssignments.p2 !== null ? `GP: Connected (ID ${playerGamepadAssignments.p2})` : 'GP: N/A';
    }
    function setAssignmentCooldown(gamepadIndex) {
        gamepadAssignmentCooldown[gamepadIndex] = true;
        setTimeout(() => { delete gamepadAssignmentCooldown[gamepadIndex]; }, 1000);
    }
    function applyGamepadControlsToSnake(playerNum, pad) {
        const DPAD_UP = 12, DPAD_DOWN = 13, DPAD_LEFT = 14, DPAD_RIGHT = 15;
        const stickX = pad.axes[0], stickY = pad.axes[1];
        const dpadUp = pad.buttons[DPAD_UP]?.pressed, dpadDown = pad.buttons[DPAD_DOWN]?.pressed,
              dpadLeft = pad.buttons[DPAD_LEFT]?.pressed, dpadRight = pad.buttons[DPAD_RIGHT]?.pressed;
        let currentDirection = (playerNum === 1) ? direction1 : direction2;
        let newDirection = null;
        if ((stickY < -0.5 || dpadUp) && currentDirection.y === 0) newDirection = { x: 0, y: -1 };
        else if ((stickY > 0.5 || dpadDown) && currentDirection.y === 0) newDirection = { x: 0, y: 1 };
        else if ((stickX < -0.5 || dpadLeft) && currentDirection.x === 0) newDirection = { x: -1, y: 0 };
        else if ((stickX > 0.5 || dpadRight) && currentDirection.x === 0) newDirection = { x: 1, y: 0 };
        if (newDirection) {
            if (playerNum === 1) nextDirection1 = newDirection; else nextDirection2 = newDirection;
        }
    }
    function handleGamepadInput() {
        const polledPads = navigator.getGamepads ? navigator.getGamepads() : []; if (!polledPads) return;
        const FACE_BUTTON_INDICES = [0, 1, 2, 3];
        for (let i = 0; i < polledPads.length; i++) {
            const pad = polledPads[i]; if (!pad || gamepadAssignmentCooldown[i]) continue;
            const isAssigned = (playerGamepadAssignments.p1 === i || playerGamepadAssignments.p2 === i);
            if (!isAssigned && FACE_BUTTON_INDICES.some(index => pad.buttons[index]?.pressed)) {
                if (playerGamepadAssignments.p1 === null) { playerGamepadAssignments.p1 = i; updateGamepadStatusHUD(); setAssignmentCooldown(i); }
                else if (playerGamepadAssignments.p2 === null) { playerGamepadAssignments.p2 = i; updateGamepadStatusHUD(); setAssignmentCooldown(i); }
            }
        }
        if (isAwaitingPlayerInput) {
            let playerReadyChanged = false; const ANY_BTN = (pad) => pad.buttons.some(b => b.pressed);
            if (playerGamepadAssignments.p1 !== null && !p1BotActive && !player1Ready) {
                if (polledPads[playerGamepadAssignments.p1] && ANY_BTN(polledPads[playerGamepadAssignments.p1])) { player1Ready = true; playerReadyChanged = true; }
            }
            if (playerGamepadAssignments.p2 !== null && !p2BotActive && !player2Ready) {
                if (polledPads[playerGamepadAssignments.p2] && ANY_BTN(polledPads[playerGamepadAssignments.p2])) { player2Ready = true; playerReadyChanged = true; }
            }
            if (playerReadyChanged) handleReadyStateChange();
        }
        if (gameRunning) {
            if (playerGamepadAssignments.p1 !== null && !p1BotActive) {
                if (polledPads[playerGamepadAssignments.p1]) applyGamepadControlsToSnake(1, polledPads[playerGamepadAssignments.p1]);
                else { playerGamepadAssignments.p1 = null; updateGamepadStatusHUD(); }
            }
            if (playerGamepadAssignments.p2 !== null && !p2BotActive) {
                if (polledPads[playerGamepadAssignments.p2]) applyGamepadControlsToSnake(2, polledPads[playerGamepadAssignments.p2]);
                else { playerGamepadAssignments.p2 = null; updateGamepadStatusHUD(); }
            }
        }
    }

    function mainLoop() {
        if (gameRunning) {
            update();
            draw();
        } else {
            handleGamepadInput();
            if (isAwaitingPlayerInput && !startCountdownInterval) {
                const p1IsReady = p1BotActive || player1Ready;
                const p2IsReady = p2BotActive || player2Ready;

                if (!p1IsReady && !p2IsReady && idleStartTime && (Date.now() - idleStartTime > 6000)) {
                    p1BotActive = true; p2BotActive = true;
                    p1BotBtn.classList.add('active'); p2BotBtn.classList.add('active');
                    handleReadyStateChange(); idleStartTime = null;
                }
                else if ((p1IsReady ^ p2IsReady) && onePlayerReadyTime && (Date.now() - onePlayerReadyTime > 7000)) {
                    if (p1IsReady) { p2BotActive = true; p2BotBtn.classList.add('active'); }
                    else { p1BotActive = true; p1BotBtn.classList.add('active'); }
                    handleReadyStateChange(); onePlayerReadyTime = null;
                }
                drawWelcomeScreen();
            }
        }
        animationFrameId = requestAnimationFrame(mainLoop);
    }
    
    function update() {
        handleGamepadInput();
        const speed = gameMode === 'classic' ? 5 : 2;
        if (gameFrame++ % speed !== 0) return;
        if (p1BotActive) nextDirection1 = aiAlgorithms[p1AiIndex].func(snake1, snake2, food, direction1, 1);
        if (p2BotActive) nextDirection2 = aiAlgorithms[p2AiIndex].func(snake2, snake1, food, direction2, 2);
        moveSnake(snake1, direction1, nextDirection1, 1);
        moveSnake(snake2, direction2, nextDirection2, 2);
        checkCollisions();
    }
    function moveSnake(snake, direction, nextDirection, playerNum) {
        if (nextDirection && ((nextDirection.x * direction.x === 0) || (nextDirection.y * direction.y === 0))) Object.assign(direction, nextDirection);
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
        snake.unshift(head);
        let ateFood = false;
        if (gameMode === 'classic') { if (head.x === food.x && head.y === food.y) ateFood = true; }
        else { const dx = (head.x * SNAKE_SIZE + SNAKE_SIZE / 2) - (food.x * GRID_SIZE + GRID_SIZE / 2);
               const dy = (head.y * SNAKE_SIZE + SNAKE_SIZE / 2) - (food.y * GRID_SIZE + GRID_SIZE / 2);
               if (Math.sqrt(dx*dx + dy*dy) < SNAKE_SIZE / 2 + FOOD_RADIUS) ateFood = true; }
        if (ateFood) {
            if (playerNum === 1) { currentScore1++; totalScore1++; } else { currentScore2++; totalScore2++; }
            currentScore1Element.textContent = `Current: ${currentScore1}`; totalScore1Element.textContent = `Total: ${totalScore1}`;
            currentScore2Element.textContent = `Current: ${currentScore2}`; totalScore2Element.textContent = `Total: ${totalScore2}`;
            foodTargetPlayer = (playerNum === 1) ? 2 : 1; placeFood();
        } else { snake.pop(); }
    }
    function checkCollisions() {
        const head1 = snake1[0], head2 = snake2[0];
        if (head1.x < 0 || head1.x >= CANVAS_WIDTH_UNITS || head1.y < 0 || head1.y >= CANVAS_HEIGHT_UNITS) return gameOver('Player 2 Wins! Player 1 hit a wall.');
        if (head2.x < 0 || head2.x >= CANVAS_WIDTH_UNITS || head2.y < 0 || head2.y >= CANVAS_HEIGHT_UNITS) return gameOver('Player 1 Wins! Player 2 hit a wall.');
        if (checkSelfCollision(snake1)) return gameOver('Player 2 Wins! Player 1 crashed into itself.');
        if (checkSelfCollision(snake2)) return gameOver('Player 1 Wins! Player 2 crashed into itself.');
        if (checkSnakeCollision(head1, snake2)) return gameOver('Player 2 Wins! Player 1 crashed into Player 2.');
        if (checkSnakeCollision(head2, snake1)) return gameOver('Player 1 Wins! Player 2 crashed into Player 1.');
        if (head1.x === head2.x && head1.y === head2.y) return gameOver("It's a tie! Head-on collision.");
    }
    function checkSelfCollision(snake) { for (let i = 1; i < snake.length; i++) if (snake[0].x === snake[i].x && snake[0].y === snake[i].y) return true; return false; }
    function checkSnakeCollision(head, otherSnake) { for (const part of otherSnake) if (head.x === part.x && head.y === part.y) return true; return false; }
    function gameOver(message) {
        gameRunning = false;
        if (message.startsWith('Player 2 Wins')) { faults1++; faults1Element.textContent = `Faults: ${faults1}`; }
        else if (message.startsWith('Player 1 Wins')) { faults2++; faults2Element.textContent = `Faults: ${faults2}`; }
        ctx.fillStyle = 'rgba(40, 44, 52, 0.75)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#abb2bf'; ctx.font = '40px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '24px sans-serif'; ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 10);
        ctx.font = '18px sans-serif'; ctx.fillText('Next round in 3 seconds...', canvas.width / 2, canvas.height / 2 + 60);
        setTimeout(() => startGame(false), 3000);
    }
    function draw() {
        ctx.fillStyle = '#1c1f24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#c678dd'; ctx.beginPath();
        ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, FOOD_RADIUS, 0, Math.PI * 2); ctx.fill();
        drawSnake(snake1, '#61afef'); drawSnake(snake2, '#e5c07b');
    }
    function drawSnake(snake, color) {
        ctx.fillStyle = color;
        if (gameMode === 'classic') { snake.forEach(part => ctx.fillRect(part.x * GRID_SIZE, part.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2)); }
        else { snake.forEach((part, i) => { const size = SNAKE_SIZE * (1 - i * 0.02); ctx.beginPath();
            ctx.arc(part.x * SNAKE_SIZE + SNAKE_SIZE/2, part.y * SNAKE_SIZE + SNAKE_SIZE/2, Math.max(size/2, 2), 0, Math.PI * 2); ctx.fill(); });
        }
    }
    document.addEventListener('keydown', e => {
        if (e.key >= '1' && e.key <= '5') { updateAiChoice(1, parseInt(e.key, 10) - 1); return; }
        if ((e.key >= '6' && e.key <= '9') || e.key === '0') { updateAiChoice(2, e.key === '0' ? 4 : parseInt(e.key, 10) - 6); return; }
        if (isAwaitingPlayerInput) {
            let changed = false;
            if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase()) && !p1BotActive && !player1Ready) { player1Ready = true; changed = true; }
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !p2BotActive && !player2Ready) { player2Ready = true; changed = true; }
            if (changed) { e.preventDefault(); handleReadyStateChange(); } return;
        }
        if (!gameRunning) return;
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
    window.addEventListener("gamepadconnected", () => updateGamepadStatusHUD());
    window.addEventListener("gamepaddisconnected", e => {
        if (playerGamepadAssignments.p1 === e.gamepad.index) playerGamepadAssignments.p1 = null;
        if (playerGamepadAssignments.p2 === e.gamepad.index) playerGamepadAssignments.p2 = null;
        updateGamepadStatusHUD();
    });
    p1BotBtn.addEventListener('click', () => { p1BotActive = !p1BotActive; p1BotBtn.classList.toggle('active', p1BotActive); if (p1BotActive) player1Ready = false; if (isAwaitingPlayerInput) handleReadyStateChange(); });
    p2BotBtn.addEventListener('click', () => { p2BotActive = !p2BotActive; p2BotBtn.classList.toggle('active', p2BotActive); if (p2BotActive) player2Ready = false; if (isAwaitingPlayerInput) handleReadyStateChange(); });
    classicBtn.addEventListener('click', () => { gameMode = 'classic'; classicBtn.classList.add('active'); modernBtn.classList.remove('active'); });
    modernBtn.addEventListener('click', () => { gameMode = 'modern'; modernBtn.classList.add('active'); classicBtn.classList.remove('active'); });
    startBtn.addEventListener('click', () => { gameRunning = false; clearInterval(startCountdownInterval); startCountdownInterval = null; showInitialWelcomeScreen(); });

    function updateReadyIndicators() { p1ReadyIndicator.textContent = (p1BotActive || player1Ready) ? 'Ready!' : ''; p2ReadyIndicator.textContent = (p2BotActive || player2Ready) ? 'Ready!' : ''; }
    function handleReadyStateChange() {
        updateReadyIndicators();
        idleStartTime = null; 
        const p1IsReady = p1BotActive || player1Ready;
        const p2IsReady = p2BotActive || player2Ready;
        if (p1IsReady ^ p2IsReady) { if (!onePlayerReadyTime) onePlayerReadyTime = Date.now(); }
        else { onePlayerReadyTime = null; }
        checkForGameStart();
    }
    function checkForGameStart() {
        if (gameRunning || startCountdownInterval) return;
        const p1IsReady = p1BotActive || player1Ready;
        const p2IsReady = p2BotActive || player2Ready;
        if (p1IsReady && p2IsReady) {
            idleStartTime = null; onePlayerReadyTime = null; isAwaitingPlayerInput = false;
            let countdown = 3;
            startCountdownInterval = setInterval(() => {
                ctx.fillStyle = '#1c1f24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#e5c07b'; ctx.font = '40px sans-serif'; ctx.textAlign = 'center';
                if (countdown > 0) { ctx.fillText(`Starting in ${countdown}...`, canvas.width / 2, canvas.height / 2); countdown--; }
                else { clearInterval(startCountdownInterval); startCountdownInterval = null; startGame(true); }
            }, 1000);
        }
    }
    function drawWelcomeScreen() {
        ctx.fillStyle = '#1c1f24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#61afef'; ctx.font = '48px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('2-Player Snake', canvas.width / 2, canvas.height / 2 - 80);
        ctx.fillStyle = '#abb2bf'; ctx.font = '20px sans-serif';
        ctx.fillText('Ready up to start!', canvas.width / 2, canvas.height / 2);
        const p1Text = p1BotActive ? 'Bot is Ready' : 'P1: Press W,A,S,D or Gamepad';
        const p2Text = p2BotActive ? 'Bot is Ready' : 'P2: Press Arrows or Gamepad';
        ctx.font = '18px sans-serif'; ctx.fillStyle = '#e5c07b';
        ctx.fillText(p1Text, canvas.width / 2, canvas.height / 2 + 50);
        ctx.fillText(p2Text, canvas.width / 2, canvas.height / 2 + 80);

        let countdownText = '';
        if (idleStartTime) {
            const remainingTime = Math.ceil(6 - (Date.now() - idleStartTime) / 1000);
            if (remainingTime > 0) countdownText = `Starting bot match in ${remainingTime}...`;
        } else if (onePlayerReadyTime) {
            const remainingTime = Math.ceil(7 - (Date.now() - onePlayerReadyTime) / 1000);
            if (remainingTime > 0) countdownText = `Adding bot for other player in ${remainingTime}...`;
        }
        if (countdownText) {
            ctx.font = '16px sans-serif'; ctx.fillStyle = '#c678dd';
            ctx.fillText(countdownText, canvas.width / 2, canvas.height / 2 + 120);
        }
    }
    function showInitialWelcomeScreen() {
        gameRunning = false; isAwaitingPlayerInput = true;
        player1Ready = false; player2Ready = false;
        idleStartTime = Date.now(); onePlayerReadyTime = null;
        updateReadyIndicators();
        checkForGameStart(); // For immediate bot vs bot
    }

    // --- INITIALIZE ---
    updateAiChoice(1, p1AiIndex); updateAiChoice(2, p2AiIndex);
    updateGamepadStatusHUD();
    showInitialWelcomeScreen();
    mainLoop();
});
