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
const WATER_LINE = Math.floor(GRID_HEIGHT * 0.7); // Water starts at 70% of the canvas height
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
    direction: 'in' // 'in' or 'out'
};
let currentShape = 'block'; // Current selected shape (default: single block)

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
    background: '#87CEEB' // Sky blue for background
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
                    // Wave coming in
                    waveReach = Math.floor(waveAnimation.progress * waveAnimation.maxReach);
                    if (y >= baseShorelinePos - waveReach && y < baseShorelinePos) {
                        isWaveCell = true;
                        // Fade wave based on distance from shoreline
                        waveAlpha = 0.8 - (0.8 * (baseShorelinePos - y) / waveReach);
                    }
                } else {
                    // Wave going out
                    waveReach = Math.floor((1 - waveAnimation.progress) * waveAnimation.maxReach);
                    if (y >= baseShorelinePos - waveReach && y < baseShorelinePos) {
                        isWaveCell = true;
                        // Fade wave based on distance from shoreline
                        waveAlpha = 0.8 - (0.8 * (baseShorelinePos - y) / waveReach);
                    }
                }
            }
            
            if (height > 0) {
                // Draw sand with color based on height
                ctx.fillStyle = COLORS.sand[Math.min(height - 1, COLORS.sand.length - 1)];
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            } else if (y >= shoreline[x]) {
                // Draw beach
                ctx.fillStyle = COLORS.beach;
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
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
    ctx.moveTo(0, WATER_LINE * GRID_SIZE);
    ctx.lineTo(canvas.width, WATER_LINE * GRID_SIZE);
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
    if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
        // Check if clicked on water
        if (gridY < shoreline[gridX]) return;
        
        // Get the selected shape pattern
        const shape = SHAPES[currentShape];
        if (!shape) return;
        
        // Place the shape pattern
        placeShape(gridX, gridY, shape.pattern);
        
        // Recalculate score
        calculateScore();
    }
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
    
    initializeGrid();
    gameStarted = true;
    gameOver = false;
    score = 0;
    waveCount = 0;
    timeRemaining = GAME_DURATION;
    gameStartTime = Date.now();
    lastWaveTime = gameStartTime;
    scheduleNextWave();
    
    // Update UI
    updateScoreDisplay();
    updateWaveCountDisplay();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Schedule the next wave
function scheduleNextWave() {
    const interval = Math.random() * (WAVE_INTERVAL_MAX - WAVE_INTERVAL_MIN) + WAVE_INTERVAL_MIN;
    nextWaveTime = Date.now() + interval;
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
    waveAnimation.maxReach = waveHeight + 2; // Visual reach is slightly larger than erosion reach
    
    // Wave affects sand near the shoreline
    for (let x = 0; x < GRID_WIDTH; x++) {
        // Wave affects more blocks the higher it is
        const waveReach = waveHeight * 2;
        const baseShorelinePos = shoreline[x];
        
        for (let y = baseShorelinePos; y < baseShorelinePos + waveReach && y < GRID_HEIGHT; y++) {
            // Calculate probability of erosion based on distance from shoreline
            const distanceFromShoreline = y - baseShorelinePos;
            const erosionProbability = 1 - (distanceFromShoreline / waveReach);
            
            if (Math.random() < erosionProbability && gameGrid[x][y] > 0) {
                // Erode sand (reduce height)
                gameGrid[x][y] = Math.max(0, gameGrid[x][y] - 1);
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

// End the game
function endGame() {
    gameOver = true;
    
    // Calculate final score
    calculateScore();
    
    // Play game over sound if enabled
    if (soundEnabled) {
        const gameOverSound = document.getElementById('gameOverSound');
        gameOverSound.currentTime = 0; // Reset sound to beginning
        gameOverSound.play().catch(e => console.log("Error playing game over sound:", e));
    }
    
    // Display game over message
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Waves Survived: ${waveCount}/${MAX_WAVES}`, canvas.width / 2, canvas.height / 2 + 40);
    
    ctx.font = '18px Arial';
    ctx.fillText('Click "Reset Game" to play again', canvas.width / 2, canvas.height / 2 + 100);
}

// Reset the game
function resetGame() {
    gameStarted = false;
    gameOver = false;
    initializeGrid();
    drawGrid();
}

// Main game loop
function gameLoop() {
    if (!gameStarted || gameOver) return;
    
    // Update time remaining
    const currentTime = Date.now();
    timeRemaining = Math.max(0, GAME_DURATION - (currentTime - gameStartTime));
    
    // Check if time is up
    if (timeRemaining <= 0) {
        endGame();
        return;
    }
    
    // Check if it's time for a wave
    if (currentTime >= nextWaveTime) {
        generateWave();
    }
    
    // Update wave animation
    if (waveAnimation.active) {
        const elapsed = currentTime - waveAnimation.startTime;
        const halfDuration = waveAnimation.duration / 2;
        
        if (elapsed < halfDuration) {
            // First half: wave coming in
            waveAnimation.progress = Math.min(1, elapsed / halfDuration);
            waveAnimation.direction = 'in';
        } else if (elapsed < waveAnimation.duration) {
            // Second half: wave going out
            waveAnimation.progress = Math.min(1, (elapsed - halfDuration) / halfDuration);
            waveAnimation.direction = 'out';
        } else {
            // Animation complete
            waveAnimation.active = false;
        }
    }
    
    // Update displays
    updateTimerDisplay();
    
    // Draw game state
    drawGrid();
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Canvas click event
    canvas.addEventListener('click', handleCanvasClick);
    
    // Build button
    document.getElementById('buildButton').addEventListener('click', () => {
        isBuilding = !isBuilding;
        document.getElementById('buildButton').textContent = isBuilding ? 'Cancel Building' : 'Build Sand Block';
    });
    
    // Reset button
    document.getElementById('resetButton').addEventListener('click', resetGame);
    
    // 3D view button
    document.getElementById('view3dButton').addEventListener('click', () => {
        if (!gameStarted) return;
        
        // Initialize 3D viewer if not already created
        if (!sandcastleViewer3D) {
            sandcastleViewer3D = new SandcastleViewer3D(gameGrid, WATER_LINE);
        }
        
        // Render the current sandcastle in 3D
        sandcastleViewer3D.render();
    });
    
    // Sound toggle button
    document.getElementById('soundToggleButton').addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        document.getElementById('soundToggleButton').textContent = soundEnabled ? 'Sound: ON' : 'Sound: OFF';
    });
    
    // Shape selector buttons
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
    
    // Initialize game
    initializeGrid();
    drawGrid();
    
    // Start game automatically
    startGame();
});

// Highlight the selected shape button
function highlightSelectedShape(buttonId) {
    // Remove active class from all shape buttons
    const shapeButtons = document.querySelectorAll('.shape-button');
    shapeButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Add active class to selected button
    document.getElementById(buttonId).classList.add('active');
    
    // Ensure building mode is active
    if (!isBuilding) {
        isBuilding = true;
        document.getElementById('buildButton').textContent = 'Cancel Building';
    }
}
