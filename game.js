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
        totalBackgroundDistanceSinceDeath: 0, // Track total distance background has moved
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
        gameState.totalBackgroundDistanceSinceDeath = 0; // Reset distance tracking
    }

    // Move the background to create illusion of player movement
    function moveBackground() {
        // Only move if speed is greater than 0
        if (gameState.speed > 0) {
            // Update background position
            gameState.backgroundX -= gameState.speed;

            // Track total distance for particles
            gameState.totalBackgroundDistanceSinceDeath += gameState.speed;

            // Reset background position when it has moved one pattern length
            if (gameState.backgroundX <= -200) {
                gameState.backgroundX = 0;
            }

            background.style.transform = `translateX(${gameState.backgroundX}px)`;
        }
    }

    // Move the enemy
    function moveEnemy() {
        if (gameState.enemyPresent && gameState.enemyElement && gameState.speed > 0) {
            // Move enemy at exactly the same speed as the background
            // When background moves left, enemy moves left at same rate
            gameState.enemyX += gameState.speed * gameState.enemyDirection;

            // Position enemy
            gameState.enemyElement.style.right = `${gameArea.offsetWidth - gameState.enemyX - 50}px`;

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

    // Variables for bouncy physics
    let bouncingInterval = null;
    let bounceVelocity = 0;
    let bouncePhase = 0; // 0: not bouncing, 1: bouncing away, 2: slowing down, 3: returning

    // Handle collision between player and enemy
    function handleCollision() {
        // Only proceed if both have health and we're not already in a bounce animation
        if (gameState.playerHealth <= 0 || gameState.enemyHealth <= 0 || bouncePhase !== 0) {
            return;
        }

        // Set collision cooldown to prevent multiple collisions
        gameState.collisionCooldown = 60; // 60 frames (about 1 second at 60fps)

        // Process player's attack first
        gameState.enemyHealth -= 10;

        // Update enemy health display
        updateEnemyHealth();

        // Check if enemy will be defeated by this hit
        const willDefeatEnemy = gameState.enemyHealth <= 0;

        // Only apply damage to player if enemy survives
        if (!willDefeatEnemy) {
            gameState.playerHealth -= 10;
            // Update player health display
            updatePlayerHealth();
        }

        // Remove bobbing animation during collision
        player.classList.remove('bobbing');

        // If enemy will be defeated, handle immediate defeat with dash and crumble effects
        if (willDefeatEnemy) {
            // Increment kill count
            gameState.killCount++;
            killCountElement.textContent = gameState.killCount;

            // Update max kill count if needed
            if (gameState.killCount > gameState.maxKillCount) {
                gameState.maxKillCount = gameState.killCount;
                maxKillCountElement.textContent = gameState.maxKillCount;
                localStorage.setItem('maxKillCount', gameState.maxKillCount);
            }

            // Create particle effect with 4 smaller squares
            if (gameState.enemyElement) {
                // Get enemy position
                const enemyRect = gameState.enemyElement.getBoundingClientRect();
                const gameAreaRect = gameArea.getBoundingClientRect();

                // Calculate relative position within game area
                const enemyLeft = enemyRect.left - gameAreaRect.left;
                const enemyTop = enemyRect.top - gameAreaRect.top;

                // Remove bobbing from player during dash
                player.classList.remove('bobbing');

                // Apply dash forward animation to player
                player.style.animation = 'dashForward 0.3s forwards';

                // Create 4 particles
                for (let i = 0; i < 4; i++) {
                    // Create particle element
                    const particle = document.createElement('div');
                    particle.className = 'enemy-particle';

                    // Position particle at enemy's position
                    const particleLeft = enemyLeft + 15 + (i % 2) * 20;
                    const particleTop = enemyTop + 15 + Math.floor(i / 2) * 20;
                    particle.style.left = `${particleLeft}px`;
                    particle.style.top = `${particleTop}px`;

                    // Calculate distance to ground level (bottom of game area - 20px - particle height)
                    const groundLevel = gameArea.offsetHeight - 20 - 15; // 20px from bottom, 15px particle height
                    const distanceToGround = groundLevel - particleTop;

                    // Set random horizontal direction for falling
                    const fallX = (Math.random() * 100 - 50); // -50 to 50px
                    particle.style.setProperty('--fall-x', `${fallX}px`);
                    particle.style.setProperty('--fall-y', `${distanceToGround}px`);

                    // Add falling animation with different durations
                    const fallDuration = 0.5 + Math.random() * 0.3; // 0.5 to 0.8s
                    particle.style.animation = `fall ${fallDuration}s forwards cubic-bezier(0.4, 0, 1, 1)`;

                    // Add to game area
                    gameArea.appendChild(particle);

                    // Store particle reference in an array for tracking
                    if (!gameState.particles) {
                        gameState.particles = [];
                    }
                    gameState.particles.push({
                        element: particle,
                        initialLeft: parseFloat(particle.style.left),
                        fallDuration: fallDuration
                    });

                    // After fall animation completes, remove the particle
                    setTimeout(() => {
                        if (particle.parentNode === gameArea) {
                            // Remove particle immediately after falling
                            gameArea.removeChild(particle);
                        }
                    }, fallDuration * 1000);
                }

                // Remove enemy immediately
                removeEnemy();

                // After dash completes, return player to original position
                setTimeout(() => {
                    player.style.animation = 'returnToPosition 0.8s ease-out forwards';

                    // After return animation completes, restore bobbing
                    setTimeout(() => {
                        player.style.animation = '';
                        player.classList.add('bobbing');
                    }, 800);
                }, 300);
            }

            // Set waiting for next enemy flag
            gameState.waitingForNextEnemy = true;

            // Keep the game running - no pause
            gameState.speed = DEFAULT_GAME_SPEED;

            // Spawn a new enemy after a delay (2 seconds)
            setTimeout(() => {
                if (gameState.gameRunning) {
                    gameState.waitingForNextEnemy = false;
                    createEnemy();
                }
            }, 2000);
        } else {
            // Enemy survives - proceed with normal bounce physics

            // Stop background scrolling during combat
            gameState.speed = 0;

            // Start bounce physics
            startBounceAnimation();

            // Check if player is defeated
            if (gameState.playerHealth <= 0) {
                setTimeout(() => {
                    gameOver();
                }, 1000); // Wait for bounce animation to complete
            }
        }
    }

    // Start bounce animation with physics
    function startBounceAnimation() {
        // Clear any existing bounce animation
        if (bouncingInterval) {
            clearInterval(bouncingInterval);
        }

        // Initialize bounce variables
        bouncePhase = 1; // Start with bouncing away
        bounceVelocity = 8; // Initial velocity (pixels per frame)
        let bounceDistance = 0;
        let maxBounceDistance = 60; // Maximum bounce distance

        // Get initial enemy position
        const initialEnemyX = gameState.enemyX;

        // Start bounce animation interval
        bouncingInterval = setInterval(() => {
            if (!gameState.gameRunning) {
                clearInterval(bouncingInterval);
                return;
            }

            switch (bouncePhase) {
                case 1: // Bouncing away
                    // Move enemy away from player
                    bounceDistance += bounceVelocity;
                    gameState.enemyX += bounceVelocity;

                    // Slow down as we reach maximum distance
                    bounceVelocity *= 0.9;

                    // Check if we've reached maximum distance or velocity is too low
                    if (bounceDistance >= maxBounceDistance || bounceVelocity < 0.5) {
                        bouncePhase = 2; // Switch to slowing down
                        bounceVelocity = 0; // Reset velocity
                    }
                    break;

                case 2: // Slowing down at maximum distance
                    bounceVelocity += 0.2; // Gradually increase return velocity

                    if (bounceVelocity >= 2) {
                        bouncePhase = 3; // Switch to returning
                    }
                    break;

                case 3: // Returning for another collision
                    // Move enemy back toward player
                    bounceDistance -= bounceVelocity;
                    gameState.enemyX -= bounceVelocity;

                    // Speed up as we approach the player
                    bounceVelocity *= 1.05;

                    // Check if we've returned to original position
                    if (bounceDistance <= 0) {
                        // Reset enemy position to prevent overlap
                        gameState.enemyX = initialEnemyX;

                        // End bounce animation
                        clearInterval(bouncingInterval);
                        bouncingInterval = null;
                        bouncePhase = 0;

                        // Resume game if both still have health
                        if (gameState.playerHealth > 0 && gameState.enemyHealth > 0) {
                            gameState.speed = DEFAULT_GAME_SPEED;
                            player.classList.add('bobbing');
                        }
                    }
                    break;
            }

            // Update enemy position on screen
            gameState.enemyElement.style.right = `${gameArea.offsetWidth - gameState.enemyX - 50}px`;

            // Update player visual bounce effect
            if (bouncePhase === 1) {
                // Player bounces back slightly
                player.style.transform = `translateX(${-bounceDistance/6}px)`;
            } else if (bouncePhase === 3) {
                // Player returns to position
                player.style.transform = `translateX(${-bounceDistance/6}px)`;
            }

        }, 16); // ~60fps
    }

    // Game over
    function gameOver() {
        gameState.gameRunning = false;

        // Remove enemy
        removeEnemy();

        // Remove bobbing animation when game is over
        player.classList.remove('bobbing');

        // Stop background animation
        stopBackgroundAnimation();

        // Apply crumble animation to player
        player.style.animation = 'playerCrumble 1s forwards';

        // Show try again button after player crumbles
        setTimeout(() => {
            document.getElementById('try-again-button').style.display = 'block';
        }, 1000);
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

    // Clean up particles that are no longer needed
    function cleanupParticles() {
        if (gameState.particles && gameState.particles.length > 0) {
            // Filter out particles that are no longer in the DOM
            gameState.particles = gameState.particles.filter(particle =>
                particle.element && particle.element.parentNode === gameArea);
        }
    }

    // Game loop
    function gameLoop() {
        if (gameState.gameRunning) {
            // Move enemy
            moveEnemy();

            // Clean up particles
            cleanupParticles();

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

    // Try again button click event
    document.getElementById('try-again-button').addEventListener('click', () => {
        // Hide try again button
        document.getElementById('try-again-button').style.display = 'none';

        // Reset player appearance
        player.style.animation = '';
        player.style.opacity = '1';
        player.style.transform = 'scale(1) rotate(0)';

        // Start a new game
        startGame();
    });

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
