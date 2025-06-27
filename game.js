document.addEventListener('DOMContentLoaded', () => {
    // Game elements
    const background = document.getElementById('background');
    const player = document.getElementById('player');
    const healthFill = document.getElementById('health-fill');
    const healthText = document.getElementById('health-text');
    const startButton = document.getElementById('start-button');
    const killCountElement = document.getElementById('kill-count');
    const maxKillCountElement = document.getElementById('max-kill-count');
    const gameArea = document.querySelector('.game-area');

    // Game state
    const gameState = {
        backgroundX: 0,
        speed: 2,
        gameRunning: false,
        playerHealth: 100,
        killCount: 0,
        maxKillCount: 0,
        enemyPresent: false,
        enemyHealth: 0,
        enemyX: 0,
        enemyElement: null,
        enemyDirection: -1, // -1 for left, 1 for right (after bounce)
        collisionCooldown: 0,
        waitingForNextEnemy: false // Flag to track when we're waiting for the next enemy
    };

    // Load max kill count from local storage if available
    if (localStorage.getItem('maxKillCount')) {
        gameState.maxKillCount = parseInt(localStorage.getItem('maxKillCount'));
        maxKillCountElement.textContent = gameState.maxKillCount;
    }

    // Update player health display
    function updatePlayerHealth() {
        healthFill.style.width = `${gameState.playerHealth}%`;
        healthText.textContent = Math.round(gameState.playerHealth);

        // Change health bar color based on health level
        if (gameState.playerHealth < 25) {
            healthFill.style.backgroundColor = '#e74c3c'; // Red when low health
        } else if (gameState.playerHealth < 50) {
            healthFill.style.backgroundColor = '#f39c12'; // Orange when medium health
        } else {
            healthFill.style.backgroundColor = '#2ecc71'; // Green when high health
        }
    }

    // Create enemy with health bar
    function createEnemy() {
        // Create enemy element if it doesn't exist
        if (!gameState.enemyElement) {
            // Create enemy square
            const enemy = document.createElement('div');
            enemy.className = 'enemy';

            // Create enemy health container
            const healthContainer = document.createElement('div');
            healthContainer.className = 'enemy-health-container';

            // Create enemy health bar
            const healthBar = document.createElement('div');
            healthBar.className = 'enemy-health-bar';

            // Create enemy health fill
            const healthFill = document.createElement('div');
            healthFill.className = 'enemy-health-fill';
            healthFill.id = 'enemy-health-fill';

            // Create enemy health text
            const healthText = document.createElement('div');
            healthText.className = 'enemy-health-text';
            healthText.id = 'enemy-health-text';
            healthText.textContent = '12';

            // Assemble enemy health components
            healthBar.appendChild(healthFill);
            healthContainer.appendChild(healthBar);
            healthContainer.appendChild(healthText);
            enemy.appendChild(healthContainer);

            // Add enemy to game area
            gameArea.appendChild(enemy);

            // Store enemy element in game state
            gameState.enemyElement = enemy;
        }

        // Reset enemy state
        gameState.enemyHealth = 12;
        gameState.enemyX = gameArea.offsetWidth - 50; // Start at right edge
        gameState.enemyDirection = -1; // Moving left
        gameState.enemyPresent = true;
        gameState.enemyElement.style.display = 'block';

        // Position enemy
        gameState.enemyElement.style.right = '0px';

        // Update enemy health display
        updateEnemyHealth();
    }

    // Update enemy health display
    function updateEnemyHealth() {
        if (gameState.enemyElement) {
            const healthFill = gameState.enemyElement.querySelector('.enemy-health-fill');
            const healthText = gameState.enemyElement.querySelector('.enemy-health-text');

            const healthPercent = (gameState.enemyHealth / 12) * 100;
            healthFill.style.width = `${healthPercent}%`;
            healthText.textContent = gameState.enemyHealth;
        }
    }

    // Remove enemy
    function removeEnemy() {
        if (gameState.enemyElement) {
            gameState.enemyElement.style.display = 'none';
        }
        gameState.enemyPresent = false;
    }

    // Move the background to create illusion of player movement
    function moveBackground() {
        // Only move if speed is greater than 0
        if (gameState.speed > 0) {
            gameState.backgroundX -= gameState.speed;

            // Reset background position when it has moved one pattern length
            if (gameState.backgroundX <= -200) {
                gameState.backgroundX = 0;
            }

            background.style.transform = `translateX(${gameState.backgroundX}px)`;
        }
    }

    // Move the enemy
    function moveEnemy() {
        if (gameState.enemyPresent && gameState.enemyElement) {
            // Move enemy based on direction and speed
            gameState.enemyX += gameState.speed * gameState.enemyDirection;

            // Position enemy
            if (gameState.enemyDirection < 0) {
                // Moving left
                gameState.enemyElement.style.right = `${gameArea.offsetWidth - gameState.enemyX - 50}px`;
            } else {
                // Moving right (after bounce)
                gameState.enemyElement.style.right = `${gameArea.offsetWidth - gameState.enemyX - 50}px`;
            }

            // Check if enemy is off screen to the left
            if (gameState.enemyX < -50) {
                removeEnemy();
            }
        }
    }

    // Check for collision between player and enemy
    function checkCollision() {
        if (!gameState.enemyPresent || !gameState.enemyElement || gameState.collisionCooldown > 0) {
            return;
        }

        // Get player position
        const playerRect = player.getBoundingClientRect();
        const playerLeft = playerRect.left;
        const playerRight = playerRect.right;

        // Get enemy position
        const enemyRect = gameState.enemyElement.getBoundingClientRect();
        const enemyLeft = enemyRect.left;
        const enemyRight = enemyRect.right;

        // Check for horizontal collision
        if (playerRight >= enemyLeft && playerLeft <= enemyRight) {
            handleCollision();
        }
    }

    // Store the default game speed
    const DEFAULT_GAME_SPEED = 2;

    // Handle collision between player and enemy
    function handleCollision() {
        // Set collision cooldown to prevent multiple collisions
        gameState.collisionCooldown = 30; // 30 frames (about 0.5 seconds at 60fps)

        // Both take 10 damage
        gameState.playerHealth -= 10;
        gameState.enemyHealth -= 10;

        // Update health displays
        updatePlayerHealth();
        updateEnemyHealth();

        // Remove bobbing animation during collision
        player.classList.remove('bobbing');

        // Bounce enemy in opposite direction
        gameState.enemyDirection *= -1;

        // Apply a more pronounced bounce effect - move enemy back by about the width of a square
        if (gameState.enemyDirection > 0) {
            // If bouncing right, move enemy left by 50px (square width)
            gameState.enemyX -= 50;
        } else {
            // If bouncing left, move enemy right by 50px (square width)
            gameState.enemyX += 50;
        }

        // Apply the position change immediately
        gameState.enemyElement.style.right = `${gameArea.offsetWidth - gameState.enemyX - 50}px`;

        // Add a visual bounce effect to the player (since player is stationary)
        player.style.transform = 'translateX(-10px)';
        setTimeout(() => {
            player.style.transform = 'translateX(0)';
        }, 150);

        // Stop background scrolling temporarily
        gameState.speed = 0;

        // Resume background scrolling after a delay
        setTimeout(() => {
            // Only resume if game is still running
            if (gameState.gameRunning) {
                gameState.speed = DEFAULT_GAME_SPEED;

                // Add bobbing animation back after collision is resolved
                player.classList.add('bobbing');
            }
        }, 500);

        // Check if enemy is defeated
        if (gameState.enemyHealth <= 0) {
            // Increment kill count
            gameState.killCount++;
            killCountElement.textContent = gameState.killCount;

            // Update max kill count if needed
            if (gameState.killCount > gameState.maxKillCount) {
                gameState.maxKillCount = gameState.killCount;
                maxKillCountElement.textContent = gameState.maxKillCount;
                localStorage.setItem('maxKillCount', gameState.maxKillCount);
            }

            // Remove enemy
            removeEnemy();

            // Set waiting for next enemy flag
            gameState.waitingForNextEnemy = true;

            // Make sure the game continues running
            gameState.speed = DEFAULT_GAME_SPEED;
            player.classList.add('bobbing');

            // Spawn a new enemy after a delay (2 seconds)
            setTimeout(() => {
                if (gameState.gameRunning) {
                    gameState.waitingForNextEnemy = false;
                    createEnemy();
                }
            }, 2000);
        }

        // Check if player is defeated
        if (gameState.playerHealth <= 0) {
            gameOver();
        }
    }

    // Game over
    function gameOver() {
        gameState.gameRunning = false;

        // Show start button
        startButton.style.display = 'block';

        // Remove enemy
        removeEnemy();

        // Remove bobbing animation when game is over
        player.classList.remove('bobbing');

        // Stop background animation
        stopBackgroundAnimation();

        // Alert game over
        setTimeout(() => {
            alert(`Game Over! You defeated ${gameState.killCount} enemies.`);
        }, 100);
    }

    // Start game
    function startGame() {
        // Hide start button
        startButton.style.display = 'none';

        // Reset game state
        gameState.gameRunning = true;
        gameState.playerHealth = 100;
        gameState.killCount = 0;
        gameState.backgroundX = 0;
        gameState.speed = 2;
        gameState.collisionCooldown = 0;

        // Update displays
        updatePlayerHealth();
        killCountElement.textContent = '0';

        // Add bobbing animation to player
        player.classList.add('bobbing');

        // Start background animation
        startBackgroundAnimation();

        // Create enemy
        createEnemy();
    }

    // Background animation interval
    let backgroundInterval = null;

    // Start background animation
    function startBackgroundAnimation() {
        // Clear any existing interval
        if (backgroundInterval) {
            clearInterval(backgroundInterval);
        }

        // Set up a new interval to continuously move the background
        backgroundInterval = setInterval(() => {
            if (gameState.gameRunning && gameState.speed > 0) {
                moveBackground();
            }
        }, 16); // ~60fps
    }

    // Stop background animation
    function stopBackgroundAnimation() {
        if (backgroundInterval) {
            clearInterval(backgroundInterval);
            backgroundInterval = null;
        }
    }

    // Game loop
    function gameLoop() {
        if (gameState.gameRunning) {
            // Move enemy
            moveEnemy();

            // Check for collision
            checkCollision();

            // Decrease collision cooldown
            if (gameState.collisionCooldown > 0) {
                gameState.collisionCooldown--;
            }
        }

        // Continue game loop
        requestAnimationFrame(gameLoop);
    }

    // Start button click event
    startButton.addEventListener('click', startGame);

    // Optional: Add keyboard controls to speed up or slow down
    document.addEventListener('keydown', (event) => {
        if (!gameState.gameRunning) return;

        if (event.key === 'ArrowRight') {
            gameState.speed = 5; // Speed up
        } else if (event.key === 'ArrowLeft') {
            gameState.speed = 1; // Slow down
        }
    });

    document.addEventListener('keyup', () => {
        if (!gameState.gameRunning) return;

        gameState.speed = 2; // Reset to normal speed
    });

    // Initialize health
    updatePlayerHealth();

    // Start the game loop
    gameLoop();
});
