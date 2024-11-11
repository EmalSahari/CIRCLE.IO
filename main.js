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
const settingsMenu = document.getElementById('settingsMenu');
const soundToggleButton = document.getElementById('soundToggleButton');
const closeSettingsButton = document.getElementById('closeSettingsButton');

// Global freeze icon image (loaded only once)
const freezeIcon = new Image();
freezeIcon.src = 'freeze.png';  // Path to the freeze icon image

// Load sound effects
const hitSound = new Audio('hit.mp3');
const shotSound = new Audio('shot.mp3');
const lifeLostSound = new Audio('fhit.mp3');
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
let multipleBulletsCount = 1;

let freezeUpgrade = false;
let freezeDuration = 2;
let freezeCost = 200;
let enemiesFrozen = false;

let freezeCooldown = 0;  // Cooldown timer in seconds
let freezeTimeRemaining = 0;  // Time remaining for the freeze effect

let timePassed = 0;  // Track the time passed
const purpleThreshold = 100;  // Time after which enemies turn purple

let upgradeCosts = {
    speed: 10,
    fireRate: 10,
    bulletSize: 10,
    multipleBullets: 100,
};

// Player and upgrade variables
const keys = {};
const shootingKeys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
let speed = 3;
let fireRate = 500;
let bulletSize = 5;

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    color: 'white',
};

function resetPlayerPosition() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
}

function playClickSound() {
    clickSound.play();
}

// Background images
const menuBackground = new Image();
menuBackground.src = 'background.png';
const gameBackground = new Image();
gameBackground.src = 'background.png';
let currentBackground = menuBackground;

gameBackground.onload = () => {
    drawMenuBackground();
};

// Timer variables
let startTime;
let personalRecord = 0;

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key in shootingKeys) shootingKeys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key in shootingKeys) shootingKeys[e.key] = false;
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') shootingDirection = { x: 0, y: -1 };
    else if (e.key === 'ArrowDown') shootingDirection = { x: 0, y: 1 };
    else if (e.key === 'ArrowLeft') shootingDirection = { x: -1, y: 0 };
    else if (e.key === 'ArrowRight') shootingDirection = { x: 1, y: 0 };
});

document.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!Object.values(shootingKeys).includes(true)) {
            shootingDirection = null;
        }
    }
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

startButton.addEventListener('click', () => {
    playClickSound();
    menu.style.display = 'none';
    gameStarted = true;
    resetPlayerPosition();
    startGame();
    currentBackground = gameBackground;
    drawMenuBackground();
    startTime = Date.now();
});

window.addEventListener('resize', () => {
    resizeCanvas();
    resetPlayerPosition();
});

// Hide and show buttons
function hideMainButtons() {
    startButton.style.display = 'none';
    upgradeButton.style.display = 'none';
}

function showMainButtons() {
    startButton.style.display = 'block';
    upgradeButton.style.display = 'block';
}

// Game loop to update everything, including freeze cooldown
function gameLoop() {
    if (gameStarted) {
        timePassed = Math.floor((Date.now() - startTime) / 1000);

        updateFreezeCooldown();  // Update freeze cooldown
        updateFreezeEffect();  // Update the freeze effect

        updatePlayer();
        updateBullets();
        updateEnemies();
        requestAnimationFrame(gameLoop);
    }
}

requestAnimationFrame(gameLoop);

// Update freeze cooldown (decrement it)
function updateFreezeCooldown() {
    if (freezeCooldown > 0) {
        freezeCooldown -= 1;  // Decrease the cooldown
    }
}

// Decrease the time remaining for the freeze effect
function updateFreezeEffect() {
    if (freezeTimeRemaining > 0) {
        freezeTimeRemaining -= 1;  // Decrease freeze time remaining
    }

    // When freeze time is over and cooldown is zero, reset freeze status
    if (freezeTimeRemaining === 0 && freezeCooldown === 0) {
        enemiesFrozen = false;
        enemies.forEach(enemy => {
            enemy.speed = 2 + Math.random() * 1.5;  // Reset enemy speed
        });
    }
}

// Freeze ability activation on pressing "C" with cooldown
document.addEventListener('keydown', (e) => {
    if (e.key === 'c' && freezeUpgrade && freezeCooldown === 0) {
        // Start freeze effect
        enemiesFrozen = true;
        freezeTimeRemaining = freezeDuration;
        enemies.forEach(enemy => {
            enemy.speed = 0;  // Stop enemy movement
        });

        // Start cooldown for the freeze ability (30 seconds)
        freezeCooldown = 30;
        playClickSound();  // Play sound when freeze is activated
    }
});

// Draw freeze icon with cooldown timer
function drawFreezeIcon() {
    if (gameStarted && freezeUpgrade) {
        const iconSize = 40;  // Size of the icon
        const borderWidth = 3;  // Border width around the icon
        const iconX = 20;  // X position of the icon
        const iconY = canvas.height - 60;  // Y position of the icon

        // Draw the border around the icon
        ctx.strokeStyle = 'black';
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(iconX, iconY, iconSize, iconSize);

        // Draw the freeze icon image
        ctx.drawImage(freezeIcon, iconX + borderWidth, iconY + borderWidth, iconSize - borderWidth * 2, iconSize - borderWidth * 2);

        // If the freeze ability is on cooldown, draw a gray icon with the countdown timer
        if (freezeCooldown > 0) {
            ctx.fillStyle = 'gray';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(iconX + borderWidth, iconY + borderWidth, iconSize - borderWidth * 2, iconSize - borderWidth * 2);
            ctx.globalAlpha = 1;

            // Draw the countdown timer in the icon
            ctx.fillStyle = 'black';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${freezeCooldown}`, iconX + iconSize / 2, iconY + iconSize / 1.5);
        }
    }
}

function updateUpgradeMenuStats() {
    document.getElementById('speedStat').textContent = speed.toFixed(1);
    document.getElementById('fireRateStat').textContent = fireRate;
    document.getElementById('bulletSizeStat').textContent = bulletSize;
    document.getElementById('multipleBulletsStat').textContent = multipleBulletsCount;
    document.getElementById('multipleBulletsCost').textContent = upgradeCosts.multipleBullets;
    document.getElementById('freezeDurationStat').textContent = freezeUpgrade ? freezeDuration : 0; // Display 0 if freezeUpgrade is false
}

// Handle upgrade button clicks
upgradeButton.addEventListener('click', () => {
    playClickSound();
    hideMainButtons();
    updateUpgradeMenuCoins();
    upgradeMenu.style.display = 'flex';
});

closeUpgradeButton.addEventListener('click', () => {
    playClickSound();
    upgradeMenu.style.display = 'none';
    showMainButtons();
});

document.querySelectorAll('.upgrade-option').forEach((button) => {
    button.addEventListener('click', () => {
        const upgradeType = button.dataset.upgrade;
        if (upgradeType === 'freeze') {
            if (coins >= freezeCost) {
                coins -= freezeCost;
                freezeUpgrade = true;
                freezeCost = 100;
                freezeDuration += 1;
                button.textContent = `Freeze Enemies (Cost: ${freezeCost} coins)`;
                playClickSound(); // Play the click sound when freeze is purchased
                updateUpgradeMenuCoins();
                updateUpgradeMenuStats();
            } else {
                alert('Not enough coins!');
            }
        } else if (upgradeType === 'multipleBullets') {
            if (coins >= upgradeCosts.multipleBullets) {
                multipleBulletsCount++;
                coins -= upgradeCosts.multipleBullets;
                upgradeCosts.multipleBullets = Math.floor(upgradeCosts.multipleBullets * 1.5);
                button.textContent = `Multiple Bullets (Cost: ${upgradeCosts.multipleBullets} coins)`;
                playClickSound(); // Play the click sound when multiple bullets is purchased
                updateUpgradeMenuCoins();
                updateUpgradeMenuStats();
            } else {
                alert('Not enough coins!');
            }
        } else {
            if (coins >= upgradeCosts[upgradeType]) {
                coins -= upgradeCosts[upgradeType];
                if (upgradeType === 'speed') {
                    speed += 0.5;
                } else if (upgradeType === 'fireRate') {
                    fireRate = Math.max(fireRate - 70, 0);
                } else if (upgradeType === 'bulletSize') {
                    bulletSize += 2;
                }
                upgradeCosts[upgradeType] = Math.floor(upgradeCosts[upgradeType] * 1.5);
                button.textContent = `Increase ${upgradeType.charAt(0).toUpperCase() + upgradeType.slice(1)} (Cost: ${upgradeCosts[upgradeType]} coins)`;
                playClickSound(); // Play the click sound when any other upgrade is purchased
                updateUpgradeMenuCoins();
                updateUpgradeMenuStats();
            } else {
                alert('Not enough coins!');
            }
        }
    });
});

// Start the game
function startGame() {
    health = 3;
    enemies = [];
    bullets = [];
    spawnInterval = 2000;
    increaseSpawnRate();
    draw();
}

// Enemy spawn logic
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
        hitCount: 1,
    });
}

// Bullet spawning
setInterval(() => {
    if (!gameStarted) return;
    if (shootingDirection) {
        const magnitude = Math.hypot(shootingDirection.x, shootingDirection.y);
        const baseAngle = Math.atan2(shootingDirection.y, shootingDirection.x);

        for (let i = 0; i < multipleBulletsCount; i++) {
            const angleOffset = (Math.PI / 12) * (i - Math.floor(multipleBulletsCount / 2));
            const angle = baseAngle + angleOffset;

            bullets.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * 10,
                vy: Math.sin(angle) * 10,
            });
        }

        shotSound.play();
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

        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(bulletIndex, 1);
            return;
        }

        enemies.forEach((enemy, enemyIndex) => {
            if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.size) {
                if (timePassed >= purpleThreshold && enemy.hitCount < 2) {
                    enemy.hitCount += 1;
                    bullets.splice(bulletIndex, 1);
                    return;
                }

                if (enemy.hitCount < 2) {
                    hitSound.currentTime = 0;
                    hitSound.play();
                    coins += 1;
                    enemies.splice(enemyIndex, 1);
                    bullets.splice(bulletIndex, 1);
                    return;
                }
            }
        });
    });
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        if (timePassed >= purpleThreshold) {
            let purpleIntensity = Math.min(255, (timePassed - purpleThreshold) * 2);
            enemy.color = `rgb(${255 - purpleIntensity}, 0, ${purpleIntensity})`;
        }

        if (enemy.hitCount >= 2) {
            enemies.splice(index, 1);
            coins += 2;
        } else {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const magnitude = Math.hypot(dx, dy);
            enemy.x += (dx / magnitude) * enemy.speed;
            enemy.y += (dy / magnitude) * enemy.speed;

            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < player.radius + enemy.size / 2) {
                enemies.splice(index, 1);
                health -= 1;

                lifeLostSound.currentTime = 0;
                lifeLostSound.play();

                if (health <= 0) gameOver();
            }
        }
    });
}

function draw() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    ctx.drawImage(currentBackground, 0, 0, canvas.width, canvas.height);

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
        ctx.stroke();
    });

    // Draw the freeze icon if the freeze upgrade is active
    drawFreezeIcon();  // Call to draw the icon

    for (let i = 0; i < 3; i++) {
        if (i < health) {
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.drawImage(heartImage, 50 + i * 50, 20, 40, 40);
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        } else {
            ctx.globalAlpha = 0.3;
            ctx.drawImage(heartImage, 50 + i * 50, 20, 40, 40);
            ctx.globalAlpha = 1;
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

    ctx.textAlign = 'center';
    ctx.font = '24px Arial';
    ctx.fillText(`Time: ${elapsedTime}s`, canvas.width / 2, 30);

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
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    if (elapsedTime > personalRecord) {
        personalRecord = elapsedTime;
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
    ctx.drawImage(menuBackground, 0, 0, canvas.width, canvas.height);
}

// Open settings menu
settingsButton.addEventListener('click', () => {
    playClickSound();
    settingsMenu.style.display = 'flex';  // Show settings menu
    menu.style.display = 'none';  // Hide main menu
});

// Close settings menu
closeSettingsButton.addEventListener('click', () => {
    playClickSound();
    settingsMenu.style.display = 'none';  // Hide settings menu
    menu.style.display = 'flex';  // Show main menu again
});

// Sound toggle functionality
soundToggleButton.addEventListener('click', () => {
    playClickSound();
    soundEnabled = !soundEnabled;

    if (soundEnabled) {
        hitSound.muted = false;
        shotSound.muted = false;
        lifeLostSound.muted = false;
        document.getElementById('soundStatus').textContent = 'Sound: On';
    } else {
        hitSound.muted = true;
        shotSound.muted = true;
        lifeLostSound.muted = true;
        document.getElementById('soundStatus').textContent = 'Sound: Off';
    }
});
