const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const upgradeMenu = document.getElementById('upgradeMenu');
const startButton = document.getElementById('startButton');
const upgradeButton = document.getElementById('upgradeButton');
const closeUpgradeButton = document.getElementById('closeUpgradeButton');
const coinsDisplay = document.getElementById('coinsDisplay');
const heartImage = new Image();
heartImage.src = 'heart.png';
const settingsButton = document.getElementById('settingsButton');
let soundEnabled = true; // Sound is enabled by default


// Load sound effects
const hitSound = new Audio('hit.mp3');
const shotSound = new Audio('shot.mp3');
const lifeLostSound = new Audio('fhit.mp3'); // Load the life lost sound effect
const clickSound = new Audio('click.mp3');


// Canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game state variables
let bullets = [];
let enemies = [];
let coins = 0;
let health = 3;
let gameStarted = false;
let spawnInterval = 2000;
let spawnIntervalId;

let upgradeCosts = {
    speed: 10,
    fireRate: 10,
    bulletSize: 10
};

// Player and upgrade variables
const keys = {};
const shootingKeys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
let speed = 3;
let fireRate = 500;
let bulletSize = 5; // Initial bullet size

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    color: 'white',
};

// Update player position when the game starts or canvas resizes
function resetPlayerPosition() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
}

// Play the click sound whenever a button is clicked
function playClickSound() {
    clickSound.play();
}

// Background image
const menuBackground = new Image();
menuBackground.src = 'background.png'; // Menu background image

const gameBackground = new Image(); // New game background
gameBackground.src = 'background.png'; // Game screen background

let currentBackground = menuBackground; // Default background is the menu background

gameBackground.onload = () => {
    drawMenuBackground();
};

// Timer Variables
let startTime;
let elapsedTime = 0; // Elapsed time in seconds
let personalRecord = 0; // Personal record in seconds

// Track key presses for movement and shooting
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key in shootingKeys) shootingKeys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key in shootingKeys) shootingKeys[e.key] = false;
});

// Update shooting direction based on key presses
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') shootingDirection = { x: 0, y: -1 };
    else if (e.key === 'ArrowDown') shootingDirection = { x: 0, y: 1 };
    else if (e.key === 'ArrowLeft') shootingDirection = { x: -1, y: 0 };
    else if (e.key === 'ArrowRight') shootingDirection = { x: 1, y: 0 };
});

// Ensure shooting stops when all keys are released
document.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!Object.values(shootingKeys).includes(true)) {
            shootingDirection = null; // Stop shooting if no direction is set
        }
    }
});

// Resize canvas dynamically
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Start button event listener
startButton.addEventListener('click', () => {
    playClickSound(); // Play click sound
    menu.style.display = 'none';
    gameStarted = true;
    resetPlayerPosition(); // Reset player position to the center when the game starts
    startGame();
    currentBackground = gameBackground; // Change background to the game screen
    drawMenuBackground(); // Redraw with the new background
    startTime = Date.now(); // Start the timer when the game begins
});

window.addEventListener('resize', () => {
    resizeCanvas();
    resetPlayerPosition(); // Keep player in the center on resize
});

// Hide and show main menu buttons in submenus
function hideMainButtons() {
    startButton.style.display = 'none';
    upgradeButton.style.display = 'none';
}

function showMainButtons() {
    startButton.style.display = 'block';
    upgradeButton.style.display = 'block';
}

function gameLoop() {
    if (gameStarted) {
        updatePlayer();
        updateBullets();
        updateEnemies();
        requestAnimationFrame(gameLoop); // Keep the game running in the background
    }
}

requestAnimationFrame(gameLoop); // Start the game loop when the game starts


// Update the stats display in the upgrade menu
function updateUpgradeMenuStats() {
    document.getElementById('speedStat').textContent = speed.toFixed(1);
    document.getElementById('fireRateStat').textContent = fireRate;
    document.getElementById('bulletSizeStat').textContent = bulletSize;
}

// Upgrade button event listener
upgradeButton.addEventListener('click', () => {
    playClickSound(); // Play click sound
    hideMainButtons(); // Hide main buttons when upgrade menu opens
    updateUpgradeMenuCoins();
    updateUpgradeMenuStats(); // Update stats display before showing the menu
    upgradeMenu.style.display = 'flex';
});

// Close upgrade button event listener
closeUpgradeButton.addEventListener('click', () => {
    playClickSound(); // Play click sound
    upgradeMenu.style.display = 'none';
    showMainButtons();
});

// Upgrades
document.querySelectorAll('.upgrade-option').forEach((button) => {
    button.addEventListener('click', () => {
        playClickSound(); // Play click sound
        const upgradeType = button.dataset.upgrade;

        if (coins >= upgradeCosts[upgradeType]) {
            coins -= upgradeCosts[upgradeType];
            if (upgradeType === 'speed') {
                speed += 0.5;
            } else if (upgradeType === 'fireRate') {
                fireRate = Math.max(fireRate - 70, 0);
            } else if (upgradeType === 'bulletSize') {
                bulletSize += 2; // Increase bullet size
            }

            // Increase the cost for the next purchase of this upgrade
            upgradeCosts[upgradeType] = Math.floor(upgradeCosts[upgradeType] * 1.5);

            // Update the displayed cost for this upgrade
            button.textContent = `Increase ${upgradeType.charAt(0).toUpperCase() + upgradeType.slice(1)} (Cost: ${upgradeCosts[upgradeType]} coins)`;

            updateUpgradeMenuCoins();
            updateUpgradeMenuStats(); // Update stats display after upgrade
        } else {
            alert('Not enough coins!');
        }
    });
});

// Start the game
function startGame() {
    // Do NOT reset coins here to preserve them across rounds
    health = 3;
    enemies = [];
    bullets = [];
    spawnInterval = 2000;
    increaseSpawnRate();
    draw();
}

// Enemy spawn logic with increasing rate
function increaseSpawnRate() {
    spawnIntervalId = setInterval(() => {
        spawnEnemy();
        spawnInterval = Math.max(500, spawnInterval - 100);
        clearInterval(spawnIntervalId);
        increaseSpawnRate();
    }, spawnInterval);
}

function spawnEnemy() {
    const enemyTypes = ['square', 'triangle'];
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const spawnSide = Math.floor(Math.random() * 4);
    let x, y;

    if (spawnSide === 0) { x = Math.random() * canvas.width; y = -50; }
    else if (spawnSide === 1) { x = Math.random() * canvas.width; y = canvas.height + 50; }
    else if (spawnSide === 2) { x = -50; y = Math.random() * canvas.height; }
    else { x = canvas.width + 50; y = Math.random() * canvas.height; }

    enemies.push({
        x, y,
        size: 30,
        color: 'red',
        type,
        speed: 2 + Math.random() * 1.5,
        targetX: player.x,
        targetY: player.y,
    });
}

// Continuous shooting
setInterval(() => {
    if (!gameStarted) return;
    if (shootingDirection) { // Check if there's a direction set
        const magnitude = Math.hypot(shootingDirection.x, shootingDirection.y);
        bullets.push({
            x: player.x,
            y: player.y,
            vx: (shootingDirection.x / magnitude) * 10,
            vy: (shootingDirection.y / magnitude) * 10,
        });
        shotSound.play(); // Play the shot sound effect
    }
}, fireRate);

function updateUpgradeMenuCoins() {
    coinsDisplay.textContent = `Coins: ${coins}`;
}

// Movement logic for player
function updatePlayer() {
    const direction = { x: 0, y: 0 };
    if (keys['w']) direction.y -= 1;
    if (keys['s']) direction.y += 1;
    if (keys['a']) direction.x -= 1;
    if (keys['d']) direction.x += 1;

    if (direction.x !== 0 || direction.y !== 0) {
        const magnitude = Math.hypot(direction.x, direction.y);
        player.x = Math.max(0, Math.min(canvas.width, player.x + (direction.x / magnitude) * speed));
        player.y = Math.max(0, Math.min(canvas.height, player.y + (direction.y / magnitude) * speed));
    }
}

function updateBullets() {
    bullets.forEach((bullet, bulletIndex) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Remove bullet if it goes off-screen
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(bulletIndex, 1);
            return; // Skip to the next bullet
        }

        enemies.forEach((enemy, enemyIndex) => {
            if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.size) {
                // Play hit sound effect
                hitSound.currentTime = 0; // Reset playback position for overlap
                hitSound.play();

                // Award coins for hitting an enemy
                coins += 1;

                // Remove the enemy
                enemies.splice(enemyIndex, 1); // Remove enemy

                // Remove bullet after hitting an enemy
                bullets.splice(bulletIndex, 1);

                return; // Stop checking further enemies
            }
        });
    });
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const magnitude = Math.hypot(dx, dy);
        enemy.x += (dx / magnitude) * enemy.speed;
        enemy.y += (dy / magnitude) * enemy.speed;

        // Check for collision with player
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < player.radius + enemy.size / 2) {
            enemies.splice(index, 1);
            health -= 1;

            // Reset and play the life lost sound to allow overlapping sounds
            lifeLostSound.currentTime = 0; // Reset playback position to the start
            lifeLostSound.play(); // Play the sound effect when losing a life

            if (health <= 0) gameOver();
        }
    });
}

function draw() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000); // Calculate elapsed time in seconds

    ctx.drawImage(currentBackground, 0, 0, canvas.width, canvas.height); // Use the current background image

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.stroke();

    bullets.forEach((bullet) => {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bulletSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();  // Adds thin stroke to bullets
    });

    // Draw hearts based on the player's health
    for (let i = 0; i < 3; i++) {
        if (i < health) {
            // Draw the heart image for each remaining life
            ctx.drawImage(heartImage, 50 + i * 50, 20, 40, 40); // Adjust size to 40x40 for bigger hearts
        } else {
            // Optionally, you can add a transparent heart image or a different image to indicate a lost life
            ctx.globalAlpha = 0.3; // Make the missing heart faded
            ctx.drawImage(heartImage, 50 + i * 50, 20, 40, 40); // Use faded heart to represent lost life
            ctx.globalAlpha = 1; // Reset alpha after drawing the faded heart
        }
    }

    enemies.forEach((enemy) => {
        ctx.fillStyle = enemy.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        if (enemy.type === 'square') {
            ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
            ctx.strokeRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
        } else {
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y - enemy.size / 2);
            ctx.lineTo(enemy.x - enemy.size / 2, enemy.y + enemy.size / 2);
            ctx.lineTo(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    });

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Coins: ${coins}`, canvas.width - 10, 30);

    // Display elapsed time in the top middle
    ctx.textAlign = 'center';
    ctx.font = '24px Arial';
    ctx.fillText(`Time: ${elapsedTime}s`, canvas.width / 2, 30);

    // Display personal record
    ctx.font = '18px Arial';
    ctx.fillText(`Best Time: ${personalRecord}s`, canvas.width / 2, 60);

    if (gameStarted) {
        updatePlayer();
        updateBullets();
        updateEnemies();
        requestAnimationFrame(draw);
    }
}

function gameOver() {
    // Check if the current time is the new personal record
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    if (elapsedTime > personalRecord) {
        personalRecord = elapsedTime; // Update personal record
    }

    gameStarted = false;
    clearInterval(spawnIntervalId);

    setTimeout(() => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '20px Arial';
        ctx.fillText(`Coins Earned: ${coins}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Press any key to return to menu', canvas.width / 2, canvas.height / 2 + 60);

        document.addEventListener('keydown', returnToMenu, { once: true });
    }, 500);
}

function returnToMenu() {
    menu.style.display = 'flex';
    drawMenuBackground();
}

function drawMenuBackground() {
    ctx.drawImage(menuBackground, 0, 0, canvas.width, canvas.height); // Draw the menu background
}

// Add event listener to the settings button
settingsButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled; // Toggle sound state

    if (soundEnabled) {
        hitSound.muted = false;
        shotSound.muted = false;
        lifeLostSound.muted = false;
    } else {
        hitSound.muted = true;
        shotSound.muted = true;
        lifeLostSound.muted = true;
    }

    // Optionally, show a message or indicator (could be added here)
    console.log(`Sound Effects ${soundEnabled ? 'Enabled' : 'Disabled'}`);
});

// Get elements for settings menu
const settingsMenu = document.getElementById('settingsMenu');
const soundToggleButton = document.getElementById('soundToggleButton');
const closeSettingsButton = document.getElementById('closeSettingsButton');

// Event listener for the Settings button (opens the settings menu)
settingsButton.addEventListener('click', () => {
    playClickSound(); // Play click sound
    settingsMenu.style.display = 'flex';  // Show settings menu
});

// Event listener for the Close button inside the settings menu
closeSettingsButton.addEventListener('click', () => {
    playClickSound(); // Play click sound
    settingsMenu.style.display = 'none';  // Hide settings menu
});

// Event listener for toggling sound in settings
soundToggleButton.addEventListener('click', () => {
    playClickSound(); // Play click sound
    soundEnabled = !soundEnabled; // Toggle the sound state

    // Mute or unmute the sound effects based on the soundEnabled state
    if (soundEnabled) {
        hitSound.muted = false;
        shotSound.muted = false;
        lifeLostSound.muted = false;
        document.getElementById('soundStatus').textContent = 'Sound: On'; // Update the sound status
    } else {
        hitSound.muted = true;
        shotSound.muted = true;
        lifeLostSound.muted = true;
        document.getElementById('soundStatus').textContent = 'Sound: Off'; // Update the sound status
    }

    // Optionally log the sound state (you can remove this later)
    console.log(`Sound Effects ${soundEnabled ? 'Enabled' : 'Disabled'}`);
});


