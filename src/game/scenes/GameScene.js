import Phaser from 'phaser';
import ApiUtils from '../utils/api';

// Global score variable to track goals across the game
const WINNING_SCORE = 3; // Number of goals needed to win the game

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });

    // Get token and appVersion from URL parameters (if ApiUtils is loaded)
    if (window.ApiUtils) {
      const urlParams = ApiUtils.getUrlParams();
      this.token = urlParams.get("token");
      this.appVersion = ApiUtils.getAppVersion();

      console.log(
        `Game initialized with token: ${this.token}, appVersion: ${this.appVersion}`
      );

      // Initialize game session
      this.gameSession = ApiUtils.createGameSession();
      this.moveCount = 0;
    } else {
      console.warn("ApiUtils not loaded, session tracking disabled");
      this.token = null;
      this.appVersion = "1";
      this.gameSession = null;
      this.moveCount = 0;
    }

    // Physics configuration - easy to modify
    this.physics = {
      player: {
        friction: 0.0005, // Lower friction for smoother movement
        restitution: 0.98, // Higher restitution for more bouncing
        mass: 10,
        frictionAir: 0.008, // Air friction for gradual slowdown
      },
      ball: {
        friction: 0.001, // More friction to control speed
        restitution: 0.9, // Reduced restitution to prevent excessive bouncing
        mass: 0.5, // Increased mass for more stability
        frictionAir: 0.005, // More air friction to slow down faster
        speedBoost: 1.1, // Reduced speed boost
        bounceBoost: 1.05, // Minimal bounce energy boost
      },
      walls: {
        restitution: 1.05, // More bouncy walls - slightly over 1.0 for extra bounce
        friction: 0.0008, // Slightly less friction for smoother wall bounces
      },
      shot: {
        forceMultiplier: 8.0, // Higher force for more powerful shots
        spinFactor: 0.08, // More spin for unpredictable bounces
      },
      bot: {
        maxForce: 7.0, // Maximum force the bot can apply
        thinkingTime: 500, // Time in ms before bot makes a move
      },
    };

    this.players = {
      red: [],
      white: [],
    };
    this.ball = null;
    this.selectedPlayer = null;
    this.goals = { red: 0, white: 0 };
    this.turn = "red"; // Player is red, bot is white
    this.turnText = null;
    this.movesLeft = 1;
    this.isMoving = false;
    this.botEnabled = true; // Enable bot opponent
    this.gameOverScreen = null; // Reference to game over screen container
    this.isResetting = false; // Flag to prevent multiple reset calls
  }

  create() {
    // Add soccer field background
    this.add.image(240, 400, "field").setDisplaySize(480, 800);

    // Create walls first so other objects can collide with them
    this.createWalls();

    // Create goals
    this.createGoals();

    // Create players
    this.createPlayers();

    // Create ball
    this.createBall();

    // Create UI
    // this.createUI();

    // Setup collisions
    this.setupCollisions();

    // Setup input
    this.setupInput();

    // Play background music
    // this.sound.play('background', { loop: true, volume: 0.5 });
    
    // Emit event to signal game has started
    this.events.emit('gameStarted', true);
  }

  createWalls() {
    // Create walls around the field with bouncy properties
    const wallThickness = 50;
    const wallOptions = {
      isStatic: true,
      restitution: this.physics.walls.restitution,
      friction: this.physics.walls.friction,
    };

    // Top wall
    this.topWall = this.matter.add.rectangle(
      240,
      -wallThickness / 2,
      480,
      wallThickness,
      wallOptions
    );

    // Bottom wall
    this.bottomWall = this.matter.add.rectangle(
      240,
      800 + wallThickness / 2,
      480,
      wallThickness,
      wallOptions
    );

    // Left wall
    this.leftWall = this.matter.add.rectangle(
      -wallThickness / 2,
      400,
      wallThickness,
      800,
      wallOptions
    );

    // Right wall
    this.rightWall = this.matter.add.rectangle(
      480 + wallThickness / 2,
      400,
      wallThickness,
      800,
      wallOptions
    );
  }

  update() {
    // Check if any objects are still moving
    if (this.isMoving) {
      let stillMoving = false;

      // Check ball movement
      if (
        (this.ball && Math.abs(this.ball.body.velocity.x) > 0.1) ||
        Math.abs(this.ball.body.velocity.y) > 0.1
      ) {
        stillMoving = true;
      }

      // Check players movement
      const allPlayers = [...this.players.red, ...this.players.white];
      for (const player of allPlayers) {
        if (
          Math.abs(player.body.velocity.x) > 0.1 ||
          Math.abs(player.body.velocity.y) > 0.1
        ) {
          stillMoving = true;
          break;
        }
      }

      if (!stillMoving) {
        this.isMoving = false;
        this.checkGoal();

        // If a move was made, switch turns
        if (this.movesLeft <= 0) {
          this.switchTurn();
        }
      }
    }

    // Update UI elements
    if (this.scoreText) {
      this.scoreText.setText(`${this.goals.red}   -   ${this.goals.white}`);
    }

    if (this.movesLeftText) {
      this.movesLeftText.setText(`MOVES: ${this.movesLeft}`);
    }
  }

  keepBallInBounds() {
    // This function is no longer needed since we're using Matter.js physics walls
    // The ball will naturally bounce off the walls we created
  }

  createGoals() {
    // In vertical orientation, goals are at top and bottom
    // Top goal (red team) - visible rectangle
    this.add
      .rectangle(240, 20, 120, 40, 0xff0000, 0.5)
      .setStrokeStyle(4, 0xffffff);

    // Bottom goal (white team) - visible rectangle
    this.add
      .rectangle(240, 780, 120, 40, 0xffffff, 0.5)
      .setStrokeStyle(4, 0xff0000);

    // Top goal post (red team) - physics object
    this.topGoal = this.matter.add.image(240, 0, "goal-post", null, {
      isStatic: true,
      isSensor: true,
    });
    this.topGoal.setScale(0.5);
    this.topGoal.setPosition(240, -this.topGoal.height / 4);
    this.topGoal.setAngle(90); // Rotate for horizontal orientation
    this.topGoal.setAlpha(0.1); // Make original image nearly invisible

    // Bottom goal (white team) - physics object
    this.bottomGoal = this.matter.add.image(240, 800, "goal-post", null, {
      isStatic: true,
      isSensor: true,
    });
    this.bottomGoal.setScale(0.5);
    this.bottomGoal.setPosition(240, 800 + this.bottomGoal.height / 4);
    this.bottomGoal.setAngle(90); // Rotate for horizontal orientation
    this.bottomGoal.setAlpha(0.1); // Make original image nearly invisible

    // Goal detection zones
    this.topGoalZone = this.matter.add.rectangle(240, 40, 100, 20, {
      isSensor: true,
      isStatic: true,
    });
    this.topGoalZone.label = "topGoal";

    this.bottomGoalZone = this.matter.add.rectangle(240, 760, 100, 20, {
      isSensor: true,
      isStatic: true,
    });
    this.bottomGoalZone.label = "bottomGoal";

    // Add goal labels
    this.add
      .text(240, 60, "GOAL", {
        font: "bold 16px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(240, 740, "GOAL", {
        font: "bold 16px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5);
  }

  createPlayers() {
    // Red team positions (top half of the field)
    const redPositions = [
      { x: 160, y: 200 },
      { x: 320, y: 200 },
      { x: 240, y: 150 },
      { x: 180, y: 250 },
      { x: 300, y: 250 },
    ];

    // White team positions (bottom half of the field)
    const whitePositions = [
      { x: 160, y: 600 },
      { x: 320, y: 600 },
      { x: 240, y: 650 },
      { x: 180, y: 550 },
      { x: 300, y: 550 },
    ];

    // Create red players
    for (let i = 0; i < redPositions.length; i++) {
      const pos = redPositions[i];

      // Add circular border first (will be behind player)
      //   const border = this.add.circle(pos.x, pos.y, 15, 0xffffff, 0.5);
      //   border.setStrokeStyle(1, 0xffffff);

      const player = this.matter.add.image(pos.x, pos.y, "player", null, {
        shape: "circle",
        friction: this.physics.player.friction,
        restitution: this.physics.player.restitution,
        mass: this.physics.player.mass,
        frictionAir: this.physics.player.frictionAir,
      });
      player.setCircle(player.width / 2);
      player.setScale(0.1); // Reduced scale for bot
      player.team = "red";
      player.index = i;
      player.setInteractive(); // Make player interactive

      // Numbers on players removed as requested

      this.players.red.push(player);
    }

    // Create white players
    for (let i = 0; i < whitePositions.length; i++) {
      const pos = whitePositions[i];

      // Add circular border first (will be behind player)
      //   const border = this.add.circle(pos.x, pos.y, 15, 0xff0000, 0.5);
      //   border.setStrokeStyle(1, 0xff0000);

      const player = this.matter.add.image(pos.x, pos.y, "bot", null, {
        shape: "circle",
        friction: this.physics.player.friction,
        restitution: this.physics.player.restitution,
        mass: this.physics.player.mass,
        frictionAir: this.physics.player.frictionAir,
      });
      player.setCircle(player.width / 2);
      player.setScale(0.1); // Reduced scale for bot
      player.team = "white";
      player.index = i;
      player.setInteractive(); // Make player interactive

      // Numbers on players removed as requested

      this.players.white.push(player);
    }
  }

  createBall() {
    // Add ball shadow/border for better visibility
    const ballBorder = this.add.circle(240, 400, 8, 0x000000, 0.3);
    ballBorder.setStrokeStyle(1, 0x000000);

    this.ball = this.matter.add.image(240, 400, "ball", null, {
      shape: "circle",
      friction: this.physics.ball.friction,
      restitution: this.physics.ball.restitution,
      mass: this.physics.ball.mass,
      frictionAir: this.physics.ball.frictionAir,
    });
    this.ball.setCircle(this.ball.width / 2);
    this.ball.setScale(0.05); // Reduced scale for ball

    // Note: Removed mask that was causing visibility issues
  }

  createUI() {
    // Create a semi-transparent overlay for the left side scoreboard
    const scoreboardWidth = 120;
    const scoreboardHeight = 60;
    const scoreboard = this.add.graphics();
    scoreboard.fillStyle(0x000000, 0.6);
    scoreboard.fillRoundedRect(
      70 - scoreboardWidth / 2,
      50 - scoreboardHeight / 2,
      scoreboardWidth,
      scoreboardHeight,
      10 // rounded corners
    );

    // Add smaller team color indicators
    this.add.circle(70 - 35, 50, 10, 0xff0000).setAlpha(0.9); // Red team
    this.add.circle(70 + 35, 50, 10, 0xffffff).setAlpha(0.9); // White team

    // Score display on the left side with smaller styling
    this.scoreText = this.add
      .text(70, 50, `${this.goals.red} - ${this.goals.white}`, {
        font: "bold 24px Arial",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Create a smaller turn indicator on the left side
    const turnIndicatorY = 100;
    this.turnIndicatorContainer = this.add.container(70, turnIndicatorY);

    // Background for turn indicator
    const turnBg = this.add.graphics();
    turnBg.fillStyle(0x000000, 0.7);
    turnBg.fillRoundedRect(-60, -20, 120, 40, 8);
    this.turnIndicatorContainer.add(turnBg);

    // Turn text with team color - smaller
    this.turnText = this.add
      .text(0, 0, `${this.turn.toUpperCase()}`, {
        font: "bold 18px Arial",
        fill: this.turn === "red" ? "#ff5555" : "#ffffff",
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5);
    this.turnIndicatorContainer.add(this.turnText);

    // Make the turn indicator appear briefly and then fade out
    this.turnIndicatorContainer.setAlpha(0);
    this.tweens.add({
      targets: this.turnIndicatorContainer,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      ease: "Power2",
      yoyo: false,
    });

    // Moves left indicator at the bottom
    this.movesLeftContainer = this.add.container(240, 750);

    const movesBg = this.add.graphics();
    movesBg.fillStyle(0x000000, 0.7);
    movesBg.fillRoundedRect(-80, -20, 160, 40, 10);
    this.movesLeftContainer.add(movesBg);

    this.movesLeftText = this.add
      .text(0, 0, `MOVES: ${this.movesLeft}`, {
        font: "bold 18px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5);
    this.movesLeftContainer.add(this.movesLeftText);

    // Coin display at the top right (if needed)
    // this.add.image(430, 30, "coin").setScale(0.4);
    // this.add
    //   .text(450, 30, "50", {
    //     font: "bold 20px Arial",
    //     fill: "#ffffff",
    //   })
    //   .setOrigin(0, 0.5);

    // Player indicators (for current turn)
    this.updatePlayerIndicators();
  }

  updatePlayerIndicators() {
    // Remove previous indicators if they exist
    if (this.playerIndicators) {
      this.playerIndicators.forEach((indicator) => indicator.destroy());
    }

    this.playerIndicators = [];

    // Add indicators to current team's players
    const currentTeamPlayers = this.players[this.turn];
    currentTeamPlayers.forEach((player) => {
      const indicator = this.add.circle(
        player.x,
        player.y,
        player.width / 16 + 5,
        0x00ffff,
        0.1
      );
      this.playerIndicators.push(indicator);
    });
  }

  // Helper method to check if a body is a wall
  isWallBody(body) {
    return (
      body === this.topWall ||
      body === this.bottomWall ||
      body === this.leftWall ||
      body === this.rightWall
    );
  }

  // Helper method to handle wall collisions for any game object
  handleWallCollision(gameObject, wallBody) {
    // Different physics for ball vs players
    const isBall = gameObject === this.ball;
    const minVelocity = isBall ? 2.0 : 1.5; // Slightly lower minimum velocity for players
    const bounceFactor = isBall
      ? this.physics.walls.restitution
      : this.physics.player.restitution;

    // Get current velocity
    const vx = gameObject.body.velocity.x;
    const vy = gameObject.body.velocity.y;

    // Determine which wall was hit and apply appropriate bounce
    if (wallBody === this.leftWall || wallBody === this.rightWall) {
      // Horizontal wall hit - reverse x velocity with bounce factor
      let newVx = -vx * bounceFactor;
      if (Math.abs(newVx) < minVelocity) {
        newVx = newVx >= 0 ? minVelocity : -minVelocity;
      }
      gameObject.setVelocityX(newVx);
    } else if (wallBody === this.topWall || wallBody === this.bottomWall) {
      // Vertical wall hit - reverse y velocity with bounce factor
      let newVy = -vy * bounceFactor;
      if (Math.abs(newVy) < minVelocity) {
        newVy = newVy >= 0 ? minVelocity : -minVelocity;
      }
      gameObject.setVelocityY(newVy);
    }
  }

  setupCollisions() {
    // Create walls around the field with bouncy properties
    const wallThickness = 20;
    const wallOptions = {
      isStatic: true,
      restitution: this.physics.walls.restitution,
      friction: this.physics.walls.friction,
    };

    // Top wall
    this.topWall = this.matter.add.rectangle(
      240,
      -wallThickness / 2,
      480,
      wallThickness,
      wallOptions
    );

    // Bottom wall
    this.bottomWall = this.matter.add.rectangle(
      240,
      800 + wallThickness / 2,
      480,
      wallThickness,
      wallOptions
    );

    // Left wall
    this.leftWall = this.matter.add.rectangle(
      -wallThickness / 2,
      400,
      wallThickness,
      800,
      wallOptions
    );

    // Right wall
    this.rightWall = this.matter.add.rectangle(
      480 + wallThickness / 2,
      400,
      wallThickness,
      800,
      wallOptions
    );

    // Collision detection
    this.matter.world.on("collisionstart", (event) => {
      // Check all collision pairs
      const pairs = event.pairs;

      for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        // Check if this is a wall collision with any game object (ball or player)
        if (this.isWallBody(bodyA) || this.isWallBody(bodyB)) {
          const wallBody = this.isWallBody(bodyA) ? bodyA : bodyB;
          const otherBody = wallBody === bodyA ? bodyB : bodyA;

          // Only process if the other body has a gameObject (ball or player)
          if (otherBody.gameObject) {
            this.handleWallCollision(otherBody.gameObject, wallBody);
          }
          continue; // Skip further processing for wall collisions
        }

        // Handle ball collisions with non-wall objects
        if (bodyA.gameObject === this.ball || bodyB.gameObject === this.ball) {
          // this.sound.play('kick', { volume: 0.5 });

          // Get ball object and other colliding object
          const ball =
            bodyA.gameObject === this.ball
              ? bodyA.gameObject
              : bodyB.gameObject;
          const otherBody = bodyA.gameObject === this.ball ? bodyB : bodyA;

          // For non-wall collisions, apply the original bounce physics
          const velocity = ball.body.velocity;
          const speed = Math.sqrt(
            velocity.x * velocity.x + velocity.y * velocity.y
          );

          // Only enhance if the ball is moving
          if (speed > 0.1) {
            // Calculate bounce direction - away from collision point
            const bounceAngle = Phaser.Math.Angle.Between(
              otherBody.position.x,
              otherBody.position.y,
              ball.x,
              ball.y
            );

            // Calculate new velocity with enhanced bounce
            const newVelocityX =
              Math.cos(bounceAngle) * speed * this.physics.ball.bounceBoost;
            const newVelocityY =
              Math.sin(bounceAngle) * speed * this.physics.ball.bounceBoost;

            // Apply the enhanced bounce velocity with a maximum speed limit
            const maxSpeed = 10; // Maximum allowed speed
            const currentSpeed = Math.sqrt(
              newVelocityX * newVelocityX + newVelocityY * newVelocityY
            );

            if (currentSpeed > maxSpeed) {
              // Scale down the velocity to the maximum speed
              const scaleFactor = maxSpeed / currentSpeed;
              ball.setVelocity(
                newVelocityX * scaleFactor,
                newVelocityY * scaleFactor
              );
            } else {
              ball.setVelocity(newVelocityX, newVelocityY);
            }
          }
        }

        // Goal detection
        if (bodyA.gameObject !== this.ball && bodyB.gameObject !== this.ball)
          continue;

        // Check if ball collided with goal zone
        if (bodyA.label === "topGoal" || bodyB.label === "topGoal") {
          this.goalScored("white");
          break;
        } else if (
          bodyA.label === "bottomGoal" ||
          bodyB.label === "bottomGoal"
        ) {
          this.goalScored("red");
          break;
        }
      }
    });
  }

  setupInput() {
    // Player selection
    this.input.on("gameobjectdown", (pointer, gameObject) => {
      // Only allow selection if it's not moving and it's the correct turn
      if (!this.isMoving && gameObject.team === this.turn) {
        this.selectPlayer(gameObject);

        // Create a new drag line each time
        if (this.dragLine) {
          this.dragLine.destroy();
        }
        this.dragLine = this.add.graphics();
        this.dragLine.setDepth(100); // Ensure it's on top of everything

        // Start tracking drag
        this.isDragging = true;
        this.dragStartPos = { x: gameObject.x, y: gameObject.y };
      }
    });

    // Track pointer movement for drag line
    this.input.on("pointermove", (pointer) => {
      if (this.selectedPlayer && !this.isMoving && pointer.isDown) {
        // Calculate direction vector from drag (reversed for slingshot effect)
        const dx = this.selectedPlayer.x - pointer.x;
        const dy = this.selectedPlayer.y - pointer.y;

        // Calculate distance for power
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 100; // Maximum drag distance
        const power = Math.min(distance, maxDistance) / maxDistance;

        // Only proceed if there's enough drag distance
        if (distance > 5) {
          console.log("Drawing line with distance:", distance);

          // Normalize direction vector
          const length = Math.sqrt(dx * dx + dy * dy);
          const ndx = dx / length;
          const ndy = dy / length;

          // Clear and redraw
          if (this.dragLine) {
            this.dragLine.clear();

            // Create a modern dotted pull-back line
            const dotSpacing = 8; // Space between dots
            const dotSize = 4; // Size of dots
            const pullBackColor = 0x3498db; // Modern blue color

            // Draw pull-back dotted line
            const totalDots = Math.floor(distance / dotSpacing);
            for (let i = 0; i < totalDots; i++) {
              const ratio = i / totalDots;
              const dotX =
                this.selectedPlayer.x +
                (pointer.x - this.selectedPlayer.x) * ratio;
              const dotY =
                this.selectedPlayer.y +
                (pointer.y - this.selectedPlayer.y) * ratio;

              // Make dots fade out and get smaller as they get closer to the pointer
              const dotAlpha = 1 - ratio * 0.5;
              const currentDotSize = dotSize * (1 - ratio * 0.3);

              this.dragLine.fillStyle(pullBackColor, dotAlpha);
              this.dragLine.fillCircle(dotX, dotY, currentDotSize);
            }

            // Draw trajectory prediction with gradient-sized dots
            const trajectoryLength = 50 * power;
            const trajectoryColor = 0x2ecc71; // Modern green color
            const trajectoryDots = 12; // Number of dots in trajectory

            for (let i = 0; i < trajectoryDots; i++) {
              const ratio = i / trajectoryDots;
              const dotX =
                this.selectedPlayer.x + ndx * trajectoryLength * ratio;
              const dotY =
                this.selectedPlayer.y + ndy * trajectoryLength * ratio;

              // Make trajectory dots get smaller as they get further from the player
              const dotAlpha = 1 - ratio * 0.7;
              const currentDotSize = dotSize * (1 - ratio * 0.3);

              this.dragLine.fillStyle(trajectoryColor, dotAlpha);
              this.dragLine.fillCircle(dotX, dotY, currentDotSize);
            }

            // Add a target circle at the end of the trajectory
            const endX = this.selectedPlayer.x + ndx * trajectoryLength;
            const endY = this.selectedPlayer.y + ndy * trajectoryLength;

            // Draw pulsing target circle
            this.dragLine.lineStyle(2, trajectoryColor, 0.7);
            this.dragLine.strokeCircle(endX, endY, 8 * power);

            // Draw a subtle highlight at the player position
            this.dragLine.fillStyle(0xffffff, 0.7);
            this.dragLine.fillCircle(
              this.selectedPlayer.x,
              this.selectedPlayer.y,
              4
            );
          }
        } else {
          // Clear the line if distance is too small
          if (this.dragLine) this.dragLine.clear();
        }
      }
    });

    // Handle pointer up to shoot the player
    this.input.on("pointerup", (pointer) => {
      if (this.selectedPlayer && !this.isMoving && this.movesLeft > 0) {
        // Calculate distance
        const dx = this.selectedPlayer.x - pointer.x;
        const dy = this.selectedPlayer.y - pointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        console.log("Pointer up with distance:", distance);

        if (distance > 5) {
          this.movePlayerInOppositeDirection(pointer);
        }

        // Clear the drag line
        if (this.dragLine) {
          this.dragLine.clear();
        }

        this.isDragging = false;
      }
    });

    // Handle background clicks to deselect
    this.input.on("pointerdown", (pointer) => {
      if (!pointer.gameObject && this.selectedPlayer) {
        console.log("Clicked on background, deselecting");
        this.deselectPlayer();
      }
    });
  }

  selectPlayer(player) {
    // Deselect previous player if any
    if (this.selectedPlayer) {
      this.selectedPlayerIndicator.destroy();
    }

    // Select new player
    this.selectedPlayer = player;

    // Add selection indicator
    this.selectedPlayerIndicator = this.add.circle(
      player.x,
      player.y,
      player.width / 4,
      0xffff00,
      0.1
    );
  }

  movePlayer(pointer) {
    // Calculate direction and force
    const angle = Phaser.Math.Angle.Between(
      this.selectedPlayer.x,
      this.selectedPlayer.y,
      pointer.x,
      pointer.y
    );

    // Calculate distance (capped for maximum force)
    const distance = Phaser.Math.Distance.Between(
      this.selectedPlayer.x,
      this.selectedPlayer.y,
      pointer.x,
      pointer.y
    );

    const force = Math.min(distance / 10, 10);

    // Apply force to the player with improved physics
    const velocityX =
      Math.cos(angle) * force * this.physics.shot.forceMultiplier;
    const velocityY =
      Math.sin(angle) * force * this.physics.shot.forceMultiplier;

    this.selectedPlayer.setVelocity(velocityX, velocityY);

    // Add spin for more realistic and unpredictable physics
    const spin = (Math.random() - 0.5) * this.physics.shot.spinFactor;
    this.selectedPlayer.setAngularVelocity(spin);

    // Mark as moving
    this.isMoving = true;

    // Decrement moves left
    this.movesLeft--;
    
    // Emit event for React UI
    this.events.emit('updateMoves', this.movesLeft);

    // Remove selection indicator
    if (this.selectedPlayerIndicator) {
      this.selectedPlayerIndicator.destroy();
      this.selectedPlayerIndicator = null;
    }

    this.selectedPlayer = null;
  }

  movePlayerInOppositeDirection(pointer) {
    // Calculate direction vector (from player to pointer)
    const dx = this.selectedPlayer.x - pointer.x;
    const dy = this.selectedPlayer.y - pointer.y;

    // Calculate distance (capped for maximum force)
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 100;
    const cappedDistance = Math.min(distance, maxDistance);

    // Calculate force based on distance (slingshot effect)
    const force = cappedDistance / 10;

    // Normalize direction
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return; // Avoid division by zero

    const ndx = dx / length;
    const ndy = dy / length;

    // Apply force to the player in the opposite direction of drag
    this.selectedPlayer.setVelocity(ndx * force, ndy * force);

    // Mark as moving
    this.isMoving = true;

    // Decrement moves left
    this.movesLeft--;
    
    // Emit event for React UI
    this.events.emit('updateMoves', this.movesLeft);

    // Remove selection indicator
    if (this.selectedPlayerIndicator) {
      this.selectedPlayerIndicator.destroy();
      this.selectedPlayerIndicator = null;
    }

    this.selectedPlayer = null;
  }

  checkGoal() {
    // Check if ball is in goal zone
    const ballX = this.ball.x;
    const ballY = this.ball.y;

    // Top goal (white team scores)
    if (ballY < 50 && Math.abs(ballX - 240) < 60) {
      this.goalScored("white");
    }
    // Bottom goal (red team scores)
    else if (ballY > 750 && Math.abs(ballX - 240) < 60) {
      this.goalScored("red");
    }
  }

  goalScored(team) {
    // Prevent multiple goal calls
    if (this.goalScoring) return;
    this.goalScoring = true;

    // Update score
    this.goals[team]++;
    this.scoreText.setText(`${this.goals.red}   -   ${this.goals.white}`);
    
    // Emit event for React UI
    this.events.emit('updateScore', this.goals);

    // Update session score if session tracking is enabled
    if (this.gameSession) {
      // Only track red score as a number
      this.gameSession.session_score = this.goals.red;
    }

    // Flash the scoreboard
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1, to: 1.3 },
      yoyo: true,
      duration: 300,
      repeat: 1,
    });

    // Play goal sound
    // this.sound.play('goal', { volume: 0.7 });

    // Show goal message
    const goalText = this.add
      .text(240, 350, "GOAL!", {
        font: "bold 64px Arial",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScale(0.5);

    // Show team that scored with enhanced styling
    const teamColor = team === "red" ? "#ff5555" : "#ffffff";
    const teamText = this.add
      .text(240, 420, `${team.toUpperCase()} SCORES!`, {
        font: "bold 36px Arial",
        fill: teamColor,
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScale(0.5);

    // Create particle explosion
    const particleColors =
      team === "red"
        ? [0xff0000, 0xff5555, 0xff8888]
        : [0xffffff, 0xcccccc, 0xaaaaaa];

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 150;

      const particle = this.add.circle(
        240,
        380,
        3 + Math.random() * 5,
        particleColors[Math.floor(Math.random() * particleColors.length)],
        0.8
      );

      this.tweens.add({
        targets: particle,
        x: 240 + Math.cos(angle) * distance,
        y: 380 + Math.sin(angle) * distance,
        alpha: 0,
        scale: { from: 1, to: 0 },
        duration: 1000 + Math.random() * 500,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }

    // Animate goal text with a more dynamic effect
    this.tweens.add({
      targets: goalText,
      scale: { from: 0.5, to: 1.8 },
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: "Elastic.Out",
      onComplete: () => goalText.destroy(),
    });

    this.tweens.add({
      targets: teamText,
      scale: { from: 0.5, to: 1.3 },
      alpha: { from: 1, to: 0 },
      duration: 1800,
      ease: "Back.Out",
      onComplete: () => {
        teamText.destroy();

        // Check if the game is over (winning score reached by any team)
        if (
          this.goals.red >= WINNING_SCORE ||
          this.goals.white >= WINNING_SCORE
        ) {
          this.showGameOverScreen(team);
        } else {
          this.resetPositions();
          this.goalScoring = false;
        }
      },
    });
  }

  resetPositions() {
    // Reset ball position
    this.ball.setPosition(240, 400);
    this.ball.setVelocity(0, 0);
    this.ball.setAngularVelocity(0);

    // Reset red players (top half of the field)
    const redPositions = [
      { x: 160, y: 200 },
      { x: 320, y: 200 },
      { x: 240, y: 150 },
      { x: 180, y: 250 },
      { x: 300, y: 250 },
    ];

    // Reset white players (bottom half of the field)
    const whitePositions = [
      { x: 160, y: 600 },
      { x: 320, y: 600 },
      { x: 240, y: 650 },
      { x: 180, y: 550 },
      { x: 300, y: 550 },
    ];

    // Reset player positions
    for (let i = 0; i < this.players.red.length; i++) {
      const player = this.players.red[i];
      const pos = redPositions[i];
      player.setPosition(pos.x, pos.y);
      player.setVelocity(0, 0);
      player.setAngularVelocity(0);
    }

    for (let i = 0; i < this.players.white.length; i++) {
      const player = this.players.white[i];
      const pos = whitePositions[i];
      player.setPosition(pos.x, pos.y);
      player.setVelocity(0, 0);
      player.setAngularVelocity(0);
    }

    // Reset turn to red
    this.turn = "red";
    this.movesLeft = 1;
    
    // Emit events for React UI
    this.events.emit('updateTurn', this.turn);
    this.events.emit('updateMoves', this.movesLeft);
    
    this.updatePlayerIndicators();
  }

  switchTurn() {
    // Switch turn
    this.turn = this.turn === "red" ? "white" : "red";
    this.movesLeft = 1;
    
    // Emit events for React UI
    this.events.emit('updateTurn', this.turn);
    this.events.emit('updateMoves', this.movesLeft);

    // Update player indicators
    this.updatePlayerIndicators();

    // Update turn text color based on current turn
    if (this.turnText) {
      this.turnText.setText(`${this.turn.toUpperCase()}`);
      this.turnText.setFill(this.turn === "red" ? "#ff5555" : "#ffffff");
    }

    // Show turn indicator with animation
    if (this.turnIndicatorContainer) {
      this.turnIndicatorContainer.setAlpha(1);
      this.tweens.add({
        targets: this.turnIndicatorContainer,
        alpha: { from: 1, to: 0 },
        duration: 2000,
        ease: "Power2",
        yoyo: false,
      });
    }

    // Play whistle sound
    // this.sound.play('whistle', { volume: 0.3 });

    // If it's the bot's turn, make a move after a short delay
    if (this.botEnabled && this.turn === "white") {
      this.time.delayedCall(this.physics.bot.thinkingTime, () => {
        this.makeBotMove();
      });
    }
  }

  createSpeedTrail(ball) {
    // Create a trail effect behind the fast-moving ball
    const trail = this.add.circle(
      ball.x,
      ball.y,
      ball.width / 4,
      0xffff00,
      0.7
    );

    // Fade out and remove the trail
    this.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      onComplete: () => trail.destroy(),
    });
  }

  createBounceEffect(ball, bounceAngle) {
    // Create multiple particles in the direction of the bounce
    const particleCount = 5;
    const particleColors = [0xffff00, 0xff8800, 0xff0000]; // Yellow, orange, red

    for (let i = 0; i < particleCount; i++) {
      // Calculate particle position with slight randomness
      const distance = (i + 1) * 5;
      const angleVariation = (Math.random() - 0.5) * 0.5;
      const particleAngle = bounceAngle + angleVariation;

      const particleX = ball.x + Math.cos(particleAngle) * distance;
      const particleY = ball.y + Math.sin(particleAngle) * distance;

      // Create particle with random color from our palette
      const colorIndex = Math.floor(Math.random() * particleColors.length);
      const particle = this.add.circle(
        particleX,
        particleY,
        3 + Math.random() * 3, // Random size between 3-6
        particleColors[colorIndex],
        0.8
      );

      // Animate the particle
      this.tweens.add({
        targets: particle,
        x: particleX + Math.cos(particleAngle) * 30 * (Math.random() + 0.5),
        y: particleY + Math.sin(particleAngle) * 30 * (Math.random() + 0.5),
        alpha: 0,
        scale: { from: 1, to: 0.5 + Math.random() },
        duration: 300 + Math.random() * 200,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Bot AI logic to make a move
  showGameOverScreen(winningTeam) {
    // Disable input during game over screen
    this.input.enabled = false;

    // Update game session with final data if session tracking is enabled
    if (this.gameSession && window.ApiUtils) {
      this.gameSession.endTime = new Date().toISOString();
      this.gameSession.winner = winningTeam;
      // Only track red score as a number
      this.gameSession.session_score = this.goals.red;
      this.gameSession.moves = this.moveCount;

      // Send session data to API if token is available
      if (this.token) {
        console.log("Sending session data to API:", this.gameSession);
        ApiUtils.addSessionToDB(this.gameSession, this.token)
          .then((response) => {
            console.log("Session data sent successfully:", response);
          })
          .catch((error) => {
            console.error("Failed to send session data:", error);
          });
      } else {
        console.log("No token available, session data not sent");
      }
    }

    // Create a semi-transparent overlay
    const overlay = this.add.rectangle(240, 400, 480, 800, 0x000000, 0.7);

    // Create a container for all game over elements
    this.gameOverScreen = this.add.container(0, 0);
    this.gameOverScreen.add(overlay);

    // Create game over text with enhanced styling
    const gameOverText = this.add
      .text(240, 300, "GAME OVER", {
        font: "bold 48px Arial",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Show winning team text
    const winnerText = this.add
      .text(240, 370, `${winningTeam.toUpperCase()} WINS!`, {
        font: "bold 36px Arial",
        fill: winningTeam === "red" ? "#ff5555" : "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Show final score
    const scoreText = this.add
      .text(240, 430, `${this.goals.red} - ${this.goals.white}`, {
        font: "bold 32px Arial",
        fill: "#ffdd00",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Create a simple button directly in the scene (not in container)
    // This is a more direct approach that should be more reliable
    const playAgainButton = this.add.rectangle(240, 520, 200, 60, 0x4444ff, 1);
    playAgainButton.setStrokeStyle(4, 0x000000, 1);

    // Add button text
    const playAgainText = this.add
      .text(240, 520, "PLAY AGAIN", {
        font: "bold 24px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    // Make the button interactive
    playAgainButton.setInteractive();

    // Set up button events
    playAgainButton.on("pointerover", function () {
      this.fillColor = 0x6666ff;
    });

    playAgainButton.on("pointerout", function () {
      this.fillColor = 0x4444ff;
    });

    playAgainButton.on("pointerdown", function () {
      this.fillColor = 0x2222ff;
    });

    // Define a separate click handler function to ensure 'this' context is correct
    const handlePlayAgainClick = () => {
      console.log("Play Again button clicked");
      this.resetGame();
    };

    // Add the click handler
    playAgainButton.on("pointerup", handlePlayAgainClick);

    // Also make the text clickable for better UX
    playAgainText.setInteractive();
    playAgainText.on("pointerup", handlePlayAgainClick);

    // Add celebration particles for the winning team
    const particleColors =
      winningTeam === "red"
        ? [0xff0000, 0xff5555, 0xff8888]
        : [0xffffff, 0xcccccc, 0xaaaaaa];

    // Create particle emitters at the corners
    const emitterPositions = [
      { x: 80, y: 200 },
      { x: 400, y: 200 },
      { x: 80, y: 600 },
      { x: 400, y: 600 },
    ];

    emitterPositions.forEach((pos) => {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        const size = 3 + Math.random() * 5;

        const particle = this.add.circle(
          pos.x,
          pos.y,
          size,
          particleColors[Math.floor(Math.random() * particleColors.length)],
          0.8
        );

        this.gameOverScreen.add(particle);

        this.tweens.add({
          targets: particle,
          x: pos.x + Math.cos(angle) * 200 * speed,
          y: pos.y + Math.sin(angle) * 200 * speed,
          alpha: 0,
          scale: { from: 1, to: 0 },
          duration: 2000 + Math.random() * 1000,
          ease: "Power2",
          onComplete: () => particle.destroy(),
        });
      }
    });

    // Add all elements to the container
    this.gameOverScreen.add([
      gameOverText,
      winnerText,
      scoreText,
      playAgainButton,
      playAgainText,
    ]);

    // Animate the container from top
    this.gameOverScreen.setPosition(0, -800);
    this.tweens.add({
      targets: this.gameOverScreen,
      y: 0,
      duration: 800,
      ease: "Bounce.Out",
      onComplete: () => {
        // Re-enable input after animation completes
        this.input.enabled = true;
      },
    });
  }

  resetGame() {
    // Disable further button clicks during animation
    if (this.isResetting) return;
    this.isResetting = true;

    console.log("Reset game called"); // Debug log

    // Create a new game session if session tracking is enabled
    if (window.ApiUtils) {
      this.gameSession = ApiUtils.createGameSession();
      this.moveCount = 0;
    }

    // Immediately disable input to prevent multiple clicks
    this.input.enabled = false;

    // Reset scores
    this.goals.red = 0;
    this.goals.white = 0;
    this.scoreText.setText(`${this.goals.red}   -   ${this.goals.white}`);
    
    // Emit event for React UI
    this.events.emit('updateScore', this.goals);

    // Reset positions
    this.resetPositions();

    // Reset turn to red (player)
    this.turn = "red";
    this.updateTurnIndicator();

    // Reset moves
    this.movesLeft = 1;
    
    // Emit event for React UI
    this.events.emit('updateMoves', this.movesLeft);

    // Remove game over screen with animation
    if (this.gameOverScreen) {
      // Use a direct approach to handle the game over screen
      this.tweens.add({
        targets: this.gameOverScreen,
        y: -800,
        duration: 500,
        ease: "Back.In",
        onComplete: () => {
          // Destroy the game over screen
          this.gameOverScreen.destroy();
          this.gameOverScreen = null;

          // Re-enable input
          this.input.enabled = true;
          this.goalScoring = false;
          this.isResetting = false;
        },
      });
    } else {
      // If for some reason the game over screen doesn't exist
      this.input.enabled = true;
      this.goalScoring = false;
      this.isResetting = false;
    }
  }

  updateTurnIndicator() {
    if (this.turnText) {
      this.turnText.setText(`${this.turn.toUpperCase()}'S TURN`);
      this.turnText.setFill(this.turn === "red" ? "#ff5555" : "#ffffff");
    }
    
    // Emit event for React UI (in case this is called directly)
    this.events.emit('updateTurn', this.turn);
  }

  makeBotMove() {
    if (!this.botEnabled || this.turn !== "white" || this.isMoving) return;

    // Increment move counter for bot moves too if session tracking is enabled
    if (this.gameSession) {
      this.moveCount++;
    }

    // Find the best bot player to move
    const botPlayers = this.players.white;
    let bestPlayer = null;
    let bestScore = -Infinity;

    // Evaluate each player
    for (const player of botPlayers) {
      // Skip players that are already moving
      if (
        Math.abs(player.body.velocity.x) > 0.1 ||
        Math.abs(player.body.velocity.y) > 0.1
      ) {
        continue;
      }

      // Calculate distance to ball
      const distToBall = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        this.ball.x,
        this.ball.y
      );

      // Calculate distance to opponent's goal (top goal for white team)
      // We'll use this in a future version for more advanced AI
      const _distToGoal = Phaser.Math.Distance.Between(
        this.ball.x,
        this.ball.y,
        240,
        100 // Top goal
      );

      // Calculate angle between player, ball and goal
      const playerToBallAngle = Phaser.Math.Angle.Between(
        player.x,
        player.y,
        this.ball.x,
        this.ball.y
      );
      const ballToGoalAngle = Phaser.Math.Angle.Between(
        this.ball.x,
        this.ball.y,
        240,
        100
      );
      const angleDiff = Math.abs(
        Phaser.Math.Angle.Wrap(playerToBallAngle - ballToGoalAngle)
      );

      // Score is better if player is closer to ball and has a good angle
      const score = 500 / distToBall - angleDiff * 50;

      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    }

    // If no player found, just pick any non-moving player
    if (!bestPlayer) {
      for (const player of botPlayers) {
        if (
          Math.abs(player.body.velocity.x) <= 0.1 &&
          Math.abs(player.body.velocity.y) <= 0.1
        ) {
          bestPlayer = player;
          break;
        }
      }
    }

    if (bestPlayer) {
      // Calculate shot direction toward the ball
      const angle = Phaser.Math.Angle.Between(
        bestPlayer.x,
        bestPlayer.y,
        this.ball.x,
        this.ball.y
      );

      // Calculate distance to ball
      const distance = Phaser.Math.Distance.Between(
        bestPlayer.x,
        bestPlayer.y,
        this.ball.x,
        this.ball.y
      );

      // Calculate force based on distance
      const force = Math.min(distance / 50, this.physics.bot.maxForce);

      // Apply force in the direction of the ball
      const forceX = Math.cos(angle) * force;
      const forceY = Math.sin(angle) * force;

      bestPlayer.setVelocity(forceX, forceY);

      // Mark as moving and reduce moves left
      this.isMoving = true;
      this.movesLeft--;
      
      // Emit event for React UI
      this.events.emit('updateMoves', this.movesLeft);
    } else {
      // No valid player to move, switch turn back
      this.switchTurn();
    }
  }
}

export default GameScene;
