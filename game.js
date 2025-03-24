// Sandcastle Builder Game
// Main game mechanics and variables

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 800;
canvas.height = 600;

// Game constants
const GRID_SIZE = 20; // Size of each grid cell in pixels
const GRID_WIDTH = Math.floor(canvas.width / GRID_SIZE);
const GRID_HEIGHT = Math.floor(canvas.height / GRID_SIZE);
const WATER_LINE = Math.floor(GRID_HEIGHT * 0.6); // Water starts at 60% of the canvas height (reduced from 70%)
const MAX_SAND_HEIGHT = 5; // Maximum height of sand blocks
const WAVE_INTERVAL_MIN = 20000; // Minimum time between waves (ms)
const WAVE_INTERVAL_MAX = 40000; // Maximum time between waves (ms)
const GAME_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAX_WAVES = 10; // Number of waves before game ends

// Game variables
let gameGrid = []; // 2D array to store sand heights
let shoreline = []; // Array to store the ragged shoreline positions
let protectedArea = []; // Area that needs to be protected
let isBuilding = false; // Flag to indicate if player is in building mode
let gameStarted = false; // Flag to indicate if game has started
let gameOver = false; // Flag to indicate if game is over
let score = 0; // Player's score
let waveCount = 0; // Number of waves that have hit
let timeRemaining = GAME_DURATION; // Time remaining in milliseconds
let lastWaveTime = 0; // Time when the last wave hit
let nextWaveTime = 0; // Time when the next wave will hit
let gameStartTime = 0; // Time when the game started
let sandcastleViewer3D = null; // 3D viewer for the sandcastle
let soundEnabled = true; // Flag to indicate if sound is enabled
let waveAnimation = { // Wave animation properties
    active: false,
    progress: 0,
    duration: 3000, // Duration of wave animation in ms
    startTime: 0,
    maxReach: 3, // Maximum number of cells the wave can reach
    direction: 'in', // 'in' or 'out'
    pattern: [] // Array to store variable wave reach across screen width
};
let currentShape = 'block'; // Current selected shape (default: single block)
let currentRotation = 0; // Current rotation angle in degrees (0, 90, 180, 270)
let floodedCells = []; // Array to track cells that are flooded behind broken walls

// Colors
const COLORS = {
    water: '#1E90FF', // Ocean blue
    beach: '#F0E68C', // Light yellow for beach
    sand: [
        '#F0E68C', // Level 1 (lightest)
        '#ECD279',
        '#D8B740',
        '#C49B32',
        '#A67C00'  // Level 5 (darkest)
    ],
    protectedArea: 'rgba(144, 238, 144, 0.3)', // Light green with transparency
    wave: '#4169E1', // Royal blue for waves
    text: '#333333', // Dark gray for text
    background: '#87CEEB', // Sky blue for background
    flood: 'rgba(30, 144, 255, 0.5)' // Semi-transparent blue for flooding
};

// Predefined shapes
const SHAPES = {
    block: { // Single block
        pattern: [[1]],
        description: "Single sand block"
    },
    wall: { // Horizontal wall
        pattern: [[1, 1, 1, 1, 1]],
        description: "Horizontal wall (5 blocks)"
    },
    tower: { // Square tower
        pattern: [
            [2, 2, 2],
            [2, 3, 2],
            [2, 2, 2]
        ],
        description: "Tower (3x3 blocks with higher center)"
    },
    gateway: { // Gateway/portcullis
        pattern: [
            [2, 0, 0, 0, 2],
            [2, 0, 0, 0, 2],
            [2, 2, 2, 2, 2]
        ],
        description: "Gateway with portcullis"
    },
    turret: { // Corner turret
        pattern: [
            [0, 2, 2],
            [2, 3, 2],
            [2, 2, 0]
        ],
        description: "Corner turret"
    },
    stairs: { // Stairs
        pattern: [
            [1, 0, 0],
            [2, 1, 0],
            [3, 2, 1]
        ],
        description: "Stairs (ascending height)"
    }
};

// Initialize the game grid
function initializeGrid() {
    gameGrid = [];
    shoreline = [];
    floodedCells = [];
    
    // Generate a ragged shoreline
    for (let x = 0; x < GRID_WIDTH; x++) {
        // Random variation around the WATER_LINE
        const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2 cells
        shoreline[x] = WATER_LINE + variation;
    }
    
    // Smooth the shoreline to avoid sharp changes
    for (let i = 1; i < GRID_WIDTH - 1; i++) {
        shoreline[i] = Math.floor((shoreline[i-1] + shoreline[i] + shoreline[i+1]) / 3);
    }
    
    // Initialize the grid with the ragged shoreline
    for (let x = 0; x < GRID_WIDTH; x++) {
        gameGrid[x] = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            // Set initial sand height (0 for water, 1 for beach)
            gameGrid[x][y] = y >= shoreline[x] ? 1 : 0;
        }
    }
    
    // Create protected area (a rectangle in the beach area)
    const protectedWidth = Math.floor(GRID_WIDTH * 0.2); // 20% of grid width
    const protectedHeight = Math.floor(GRID_HEIGHT * 0.1); // 10% of grid height
    const protectedX = Math.floor(GRID_WIDTH * 0.4); // Start at 40% of grid width
    
    // Find the average shoreline position for protected area placement
    const avgShorelinePos = shoreline.reduce((sum, pos) => sum + pos, 0) / GRID_WIDTH;
    const protectedY = Math.floor(avgShorelinePos + (GRID_HEIGHT - avgShorelinePos) * 0.3); // Start a bit below water line
    
    protectedArea = {
        x: protectedX,
        y: protectedY,
        width: protectedWidth,
        height: protectedHeight
    };
}

// Draw the game grid
function drawGrid() {
    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid cells
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            const height = gameGrid[x][y];
            
            // Calculate wave effect
            let isWaveCell = false;
            let waveAlpha = 0;
            
            if (waveAnimation.active) {
                const baseShorelinePos = shoreline[x];
                let waveReach = 0;
                
                if (waveAnimation.direction === 'in') {
                    // Wave coming in with variable reach based on pattern
                    waveReach = Math.floor(waveAnimation.progress * waveAnimation.pattern[x]);
                    if (y >= baseShorelinePos - waveReach && y < baseShorelinePos) {
                        isWaveCell = true;
                        // Fade wave based on distance from shoreline
                        waveAlpha = 0.8 - (0.8 * (baseShorelinePos - y) / waveReach);
                    }
                } else {
                    // Wave going out
                    waveReach = Math.floor((1 - waveAnimation.progress) * waveAnimation.pattern[x]);
                    if (y >= baseShorelinePos - waveReach && y < baseShorelinePos) {
                        isWaveCell = true;
                        // Fade wave based on distance from shoreline
                        waveAlpha = 0.8 - (0.8 * (baseShorelinePos - y) / waveReach);
                    }
                }
            }
            
            // Check if this is a flooded cell
            const isFlooded = floodedCells.some(cell => cell.x === x && cell.y === y);
            
            if (height > 0) {
                // Draw sand with color based on height
                ctx.fillStyle = COLORS.sand[Math.min(height - 1, COLORS.sand.length - 1)];
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                
                // Draw flood overlay if this cell is flooded
                if (isFlooded) {
                    ctx.fillStyle = COLORS.flood;
                    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            } else if (y >= shoreline[x]) {
                // Draw beach
                ctx.fillStyle = COLORS.beach;
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                
                // Draw flood overlay if this cell is flooded
                if (isFlooded) {
                    ctx.fillStyle = COLORS.flood;
                    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            } else {
                // Draw water
                ctx.fillStyle = COLORS.water;
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                
                // Draw wave overlay if this is a wave cell
                if (isWaveCell) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${waveAlpha})`;
                    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            }
        }
    }
    
    // Draw protected area
    ctx.fillStyle = COLORS.protectedArea;
    ctx.fillRect(
        protectedArea.x * GRID_SIZE,
        protectedArea.y * GRID_SIZE,
        protectedArea.width * GRID_SIZE,
        protectedArea.height * GRID_SIZE
    );
    
    // Draw grid lines (optional)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    for (let x = 0; x <= GRID_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * GRID_SIZE, 0);
        ctx.lineTo(x * GRID_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * GRID_SIZE);
        ctx.lineTo(canvas.width, y * GRID_SIZE);
        ctx.stroke();
    }
    
    // Draw water line
    ctx.strokeStyle = 'rgba(30, 144, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Draw a wavy water line instead of straight
    for (let x = 0; x < GRID_WIDTH; x++) {
        const y = shoreline[x] * GRID_SIZE;
        if (x === 0) {
            ctx.moveTo(x * GRID_SIZE, y);
        } else {
            ctx.lineTo(x * GRID_SIZE, y);
        }
    }
    
    ctx.stroke();
    ctx.lineWidth = 1;
}

// Handle mouse click on canvas
function handleCanvasClick(event) {
    if (gameOver || !gameStarted || !isBuilding) return;
    
    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Convert to grid coordinates
    const gridX = Math.floor(mouseX / GRID_SIZE);
    const gridY = Math.floor(mouseY / GRID_SIZE);
    
    // Check if click is within grid bounds
    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return;
    
    // Get the selected shape
    const shape = SHAPES[currentShape];
    if (!shape) return;
    
    // Place the shape with current rotation
    placeShape(gridX, gridY, rotatePattern(shape.pattern, currentRotation));
}

// Rotate a pattern based on the rotation angle
function rotatePattern(pattern, rotation) {
    // No rotation needed
    if (rotation === 0) return pattern;
    
    const height = pattern.length;
    const width = pattern[0].length;
    let rotatedPattern = [];
    
    // 90 degrees rotation
    if (rotation === 90) {
        rotatedPattern = Array(width).fill().map(() => Array(height).fill(0));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                rotatedPattern[x][height - 1 - y] = pattern[y][x];
            }
        }
    }
    // 180 degrees rotation
    else if (rotation === 180) {
        rotatedPattern = Array(height).fill().map(() => Array(width).fill(0));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                rotatedPattern[height - 1 - y][width - 1 - x] = pattern[y][x];
            }
        }
    }
    // 270 degrees rotation
    else if (rotation === 270) {
        rotatedPattern = Array(width).fill().map(() => Array(height).fill(0));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                rotatedPattern[width - 1 - x][y] = pattern[y][x];
            }
        }
    }
    
    return rotatedPattern;
}

// Place a shape pattern at the specified position
function placeShape(startX, startY, pattern) {
    const patternHeight = pattern.length;
    const patternWidth = pattern[0].length;
    
    // Calculate the offset to center the pattern on the click point
    const offsetX = Math.floor(patternWidth / 2);
    const offsetY = Math.floor(patternHeight / 2);
    
    // Adjust start position to center the pattern
    startX = startX - offsetX;
    startY = startY - offsetY;
    
    // Check if shape fits within grid bounds
    if (startX < 0 || startX + patternWidth > GRID_WIDTH || 
        startY < 0 || startY + patternHeight > GRID_HEIGHT) return;
    
    // Check if shape is on land
    for (let y = 0; y < patternHeight; y++) {
        for (let x = 0; x < patternWidth; x++) {
            const gridX = startX + x;
            const gridY = startY + y;
            
            // Skip if this part of the pattern is empty (0)
            if (pattern[y][x] === 0) continue;
            
            // Check if this position is on water
            if (gridY < shoreline[gridX]) return;
        }
    }
    
    // Place the shape
    for (let y = 0; y < patternHeight; y++) {
        for (let x = 0; x < patternWidth; x++) {
            const gridX = startX + x;
            const gridY = startY + y;
            const blockHeight = pattern[y][x];
            
            // Skip if this part of the pattern is empty (0)
            if (blockHeight === 0) continue;
            
            // Add sand blocks (set to specified height or add to existing height)
            gameGrid[gridX][gridY] = Math.min(MAX_SAND_HEIGHT, gameGrid[gridX][gridY] + blockHeight);
        }
    }
}

// Start the game
function startGame() {
    if (gameStarted) return;
    
    // Initialize the game grid
    initializeGrid();
    
    // Set game state
    gameStarted = true;
    gameOver = false;
    isBuilding = true;
    score = 0;
    waveCount = 0;
    timeRemaining = GAME_DURATION;
    gameStartTime = Date.now();
    
    // Schedule the first wave
    scheduleNextWave();
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
    
    // Update UI
    document.getElementById('start-button').textContent = 'Restart Game';
    document.getElementById('game-status').textContent = 'Game in progress...';
    updateScoreDisplay();
    updateWaveCountDisplay();
    updateTimerDisplay();
}

// End the game
function endGame() {
    gameOver = true;
    isBuilding = false;
    
    // Update UI
    document.getElementById('game-status').textContent = 'Game Over!';
    
    // Display final score
    const finalScoreMessage = `Final Score: ${score}`;
    document.getElementById('game-status').textContent += ` ${finalScoreMessage}`;
}

// Generate a wave
function generateWave() {
    if (waveCount >= MAX_WAVES) {
        endGame();
        return;
    }
    
    // Play wave sound if enabled
    if (soundEnabled) {
        const waveSound = document.getElementById('waveSound');
        waveSound.currentTime = 0; // Reset sound to beginning
        waveSound.play().catch(e => console.log("Error playing wave sound:", e));
    }
    
    // Start wave animation coming in
    waveAnimation.active = true;
    waveAnimation.progress = 0;
    waveAnimation.startTime = Date.now();
    waveAnimation.direction = 'in';
    
    // Determine wave height (strength)
    const waveHeight = Math.floor(Math.random() * 3) + 1;
    
    // Generate a realistic wave pattern with variable reach across the screen
    waveAnimation.pattern = [];
    
    // Create 2-3 wave peaks with higher reach
    const numPeaks = Math.floor(Math.random() * 2) + 2; // 2-3 peaks
    const peakPositions = [];
    
    // Determine random peak positions
    for (let i = 0; i < numPeaks; i++) {
        peakPositions.push(Math.floor(Math.random() * GRID_WIDTH));
    }
    
    // Sort peak positions
    peakPositions.sort((a, b) => a - b);
    
    // Generate wave pattern with peaks and valleys
    for (let x = 0; x < GRID_WIDTH; x++) {
        // Find the closest peak
        let closestPeakDist = GRID_WIDTH;
        for (const peakPos of peakPositions) {
            const dist = Math.abs(x - peakPos);
            if (dist < closestPeakDist) {
                closestPeakDist = dist;
            }
        }
        
        // Calculate reach based on distance from peak (using a bell curve)
        const maxPeakReach = waveHeight * 3; // Maximum reach at peak
        const minValleyReach = waveHeight; // Minimum reach at valley
        
        // Use a bell curve formula to calculate reach
        const peakWidth = GRID_WIDTH / (numPeaks * 2); // Width of peak influence
        const normalizedDist = closestPeakDist / peakWidth;
        const bellCurveValue = Math.exp(-(normalizedDist * normalizedDist) / 2);
        
        // Calculate final reach for this position
        const reach = minValleyReach + (maxPeakReach - minValleyReach) * bellCurveValue;
        waveAnimation.pattern[x] = reach;
    }
    
    // Set max reach for animation
    waveAnimation.maxReach = maxPeakReach;
    
    // Wave affects sand near the shoreline with variable reach
    for (let x = 0; x < GRID_WIDTH; x++) {
        // Wave affects more blocks based on the pattern
        const waveReach = Math.floor(waveAnimation.pattern[x]);
        const baseShorelinePos = shoreline[x];
        
        for (let y = baseShorelinePos; y < baseShorelinePos + waveReach && y < GRID_HEIGHT; y++) {
            // Calculate probability of erosion based on distance from shoreline
            const distanceFromShoreline = y - baseShorelinePos;
            const erosionProbability = 1 - (distanceFromShoreline / waveReach);
            
            if (Math.random() < erosionProbability && gameGrid[x][y] > 0) {
                // Erode sand (reduce height)
                gameGrid[x][y] = Math.max(0, gameGrid[x][y] - 1);
                
                // Check for flooding behind walls
                checkForFlooding(x, y);
            }
        }
    }
    
    waveCount++;
    updateWaveCountDisplay();
    lastWaveTime = Date.now();
    
    // Check if protected area is still protected
    calculateScore();
    
    // Schedule next wave if game is still running
    if (waveCount < MAX_WAVES && !gameOver) {
        scheduleNextWave();
    } else if (waveCount >= MAX_WAVES) {
        endGame();
    }
}

// Check for flooding behind walls when a cell is eroded
function checkForFlooding(x, y) {
    // If the cell was completely eroded (height is now 0)
    if (gameGrid[x][y] === 0) {
        // Check if this was a wall breach (had sand on both sides)
        let hadWallOnLeft = false;
        let hadWallOnRight = false;
        
        // Check left side
        for (let checkX = x - 1; checkX >= 0; checkX--) {
            if (gameGrid[checkX][y] > 0) {
                hadWallOnLeft = true;
                break;
            }
            if (checkX < shoreline[checkX]) {
                // Reached water, no wall
                break;
            }
        }
        
        // Check right side
        for (let checkX = x + 1; checkX < GRID_WIDTH; checkX++) {
            if (gameGrid[checkX][y] > 0) {
                hadWallOnRight = true;
                break;
            }
            if (checkX < shoreline[checkX]) {
                // Reached water, no wall
                break;
            }
        }
        
        // If there was a wall on both sides, flood behind the breach
        if (hadWallOnLeft && hadWallOnRight) {
            floodBehindWall(x, y);
        }
    }
}

// Flood the area behind a breached wall
function floodBehindWall(x, y) {
    // Start flood from the breach point
    const floodQueue = [{x, y}];
    const visited = new Set();
    
    // Breadth-first search to flood connected empty cells
    while (floodQueue.length > 0) {
        const current = floodQueue.shift();
        const key = `${current.x},${current.y}`;
        
        // Skip if already visited
        if (visited.has(key)) continue;
        visited.add(key);
        
        // Add to flooded cells if not already flooded
        if (!floodedCells.some(cell => cell.x === current.x && cell.y === current.y)) {
            floodedCells.push({x: current.x, y: current.y});
        }
        
        // Check adjacent cells (4-directional)
        const directions = [
            {dx: 1, dy: 0},  // right
            {dx: -1, dy: 0}, // left
            {dx: 0, dy: 1},  // down
            {dx: 0, dy: -1}  // up
        ];
        
        for (const dir of directions) {
            const nextX = current.x + dir.dx;
            const nextY = current.y + dir.dy;
            
            // Check bounds
            if (nextX < 0 || nextX >= GRID_WIDTH || nextY < 0 || nextY >= GRID_HEIGHT) continue;
            
            // Only flood cells that are on land and not already sand blocks
            if (nextY >= shoreline[nextX] && gameGrid[nextX][nextY] === 0) {
                floodQueue.push({x: nextX, y: nextY});
            }
        }
    }
}

// Calculate score based on protected area and proximity to water
function calculateScore() {
    // Check if protected area is still intact
    let isProtected = true;
    let totalProtectedCells = 0;
    
    for (let x = protectedArea.x; x < protectedArea.x + protectedArea.width; x++) {
        for (let y = protectedArea.y; y < protectedArea.y + protectedArea.height; y++) {
            if (gameGrid[x][y] <= 0) {
                isProtected = false;
            } else {
                totalProtectedCells++;
            }
        }
    }
    
    // Calculate base score based on protected cells
    const baseScore = totalProtectedCells * 10;
    
    // Calculate bonus based on proximity to water
    const proximityToWater = WATER_LINE / protectedArea.y;
    const proximityBonus = Math.floor(baseScore * proximityToWater * 0.5);
    
    // Update score
    score = baseScore + proximityBonus;
    updateScoreDisplay();
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Update wave count display
function updateWaveCountDisplay() {
    document.getElementById('wave-count').textContent = waveCount;
}

// Update score display
function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
}

// Schedule the next wave
function scheduleNextWave() {
    const interval = Math.floor(Math.random() * (WAVE_INTERVAL_MAX - WAVE_INTERVAL_MIN)) + WAVE_INTERVAL_MIN;
    nextWaveTime = Date.now() + interval;
}

// Game loop
function gameLoop() {
    if (!gameStarted) return;
    
    // Update time remaining
    const currentTime = Date.now();
    timeRemaining = Math.max(0, GAME_DURATION - (currentTime - gameStartTime));
    updateTimerDisplay();
    
    // Check if time is up
    if (timeRemaining <= 0 && !gameOver) {
        endGame();
    }
    
    // Update wave animation
    if (waveAnimation.active) {
        const elapsed = currentTime - waveAnimation.startTime;
        waveAnimation.progress = Math.min(1, elapsed / waveAnimation.duration);
        
        // Check if wave animation is complete
        if (waveAnimation.progress >= 1) {
            if (waveAnimation.direction === 'in') {
                // Switch to wave going out
                waveAnimation.direction = 'out';
                waveAnimation.startTime = currentTime;
                waveAnimation.progress = 0;
            } else {
                // End wave animation
                waveAnimation.active = false;
            }
        }
    }
    
    // Check if it's time for the next wave
    if (!gameOver && !waveAnimation.active && currentTime >= nextWaveTime) {
        generateWave();
    }
    
    // Draw the game state
    drawGrid();
    
    // Continue the game loop
    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

// Toggle building mode
function toggleBuildingMode() {
    if (!gameStarted || gameOver) return;
    isBuilding = !isBuilding;
    document.getElementById('build-button').textContent = isBuilding ? 'Stop Building' : 'Start Building';
}

// Toggle sound
function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('sound-button').textContent = soundEnabled ? 'Sound: ON' : 'Sound: OFF';
}

// Rotate the current shape
function rotateShape() {
    // Rotate 90 degrees clockwise
    currentRotation = (currentRotation + 90) % 360;
    document.getElementById('rotation-display').textContent = `Rotation: ${currentRotation}°`;
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    // Set up event listeners
    canvas.addEventListener('click', handleCanvasClick);
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('build-button').addEventListener('click', toggleBuildingMode);
    document.getElementById('sound-button').addEventListener('click', toggleSound);
    document.getElementById('rotate-button').addEventListener('click', rotateShape);
    
    // Set up shape selection buttons
    document.getElementById('blockButton').addEventListener('click', () => {
        currentShape = 'block';
        highlightSelectedShape('blockButton');
    });
    document.getElementById('wallButton').addEventListener('click', () => {
        currentShape = 'wall';
        highlightSelectedShape('wallButton');
    });
    document.getElementById('towerButton').addEventListener('click', () => {
        currentShape = 'tower';
        highlightSelectedShape('towerButton');
    });
    document.getElementById('gatewayButton').addEventListener('click', () => {
        currentShape = 'gateway';
        highlightSelectedShape('gatewayButton');
    });
    document.getElementById('turretButton').addEventListener('click', () => {
        currentShape = 'turret';
        highlightSelectedShape('turretButton');
    });
    document.getElementById('stairsButton').addEventListener('click', () => {
        currentShape = 'stairs';
        highlightSelectedShape('stairsButton');
    });
    
    // Initialize the game grid
    initializeGrid();
    
    // Draw the initial state
    drawGrid();
    
    // Display shape descriptions
    updateShapeDescription();
});

// Highlight the selected shape button
function highlightSelectedShape(buttonId) {
    // Remove highlight from all buttons
    const shapeButtons = document.querySelectorAll('.shape-button');
    shapeButtons.forEach(button => {
        button.classList.remove('selected');
    });
    
    // Add highlight to selected button
    document.getElementById(buttonId).classList.add('selected');
    
    // Update shape description
    updateShapeDescription();
}

// Update the shape description
function updateShapeDescription() {
    const shape = SHAPES[currentShape];
    if (shape) {
        document.getElementById('shape-description').textContent = shape.description;
    }
}
