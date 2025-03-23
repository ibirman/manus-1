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

// Initialize the game grid
function initializeGrid() {
    gameGrid = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
        gameGrid[x] = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            // Set initial sand height (0 for water, 1 for beach)
            gameGrid[x][y] = y >= WATER_LINE ? 1 : 0;
        }
    }
    
    // Create protected area (a rectangle in the beach area)
    const protectedWidth = Math.floor(GRID_WIDTH * 0.2); // 20% of grid width
    const protectedHeight = Math.floor(GRID_HEIGHT * 0.1); // 10% of grid height
    const protectedX = Math.floor(GRID_WIDTH * 0.4); // Start at 40% of grid width
    const protectedY = Math.floor(WATER_LINE + (GRID_HEIGHT - WATER_LINE) * 0.3); // Start a bit below water line
    
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
            if (height > 0) {
                // Draw sand with color based on height
                ctx.fillStyle = COLORS.sand[Math.min(height - 1, COLORS.sand.length - 1)];
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            } else if (y >= WATER_LINE) {
                // Draw beach
                ctx.fillStyle = COLORS.beach;
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            } else {
                // Draw water
                ctx.fillStyle = COLORS.water;
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
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
    if (gameOver || !gameStarted) return;
    
    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Convert to grid coordinates
    const gridX = Math.floor(mouseX / GRID_SIZE);
    const gridY = Math.floor(mouseY / GRID_SIZE);
    
    // Check if click is within grid bounds
    if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
        // Check if we're building on existing sand or at the beach level
        if (gameGrid[gridX][gridY] > 0 && gameGrid[gridX][gridY] < MAX_SAND_HEIGHT) {
            // Increment sand height
            gameGrid[gridX][gridY]++;
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
    
    // Determine wave height (strength)
    const waveHeight = Math.floor(Math.random() * 3) + 1;
    
    // Wave affects sand near the water line
    for (let x = 0; x < GRID_WIDTH; x++) {
        // Wave affects more blocks the higher it is
        const waveReach = waveHeight * 2;
        
        for (let y = WATER_LINE; y < WATER_LINE + waveReach && y < GRID_HEIGHT; y++) {
            // Calculate probability of erosion based on distance from water
            const distanceFromWater = y - WATER_LINE;
            const erosionProbability = 1 - (distanceFromWater / waveReach);
            
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
    
    // Initialize game
    initializeGrid();
    drawGrid();
    
    // Start game automatically
    startGame();
});
