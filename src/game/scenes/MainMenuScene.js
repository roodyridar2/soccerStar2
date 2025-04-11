import Phaser from 'phaser';

class MainMenuScene extends Phaser.Scene {
    constructor() {
      super({ key: "MainMenuScene" });
  
      // --- Configuration ---
      this.config = {
        colors: {
          // Modern gradient options (can choose one)
          // Option 1: Deep Blue/Purple
          // gradientTop: 0x4e54c8,
          // gradientBottom: 0x8f94fb,
          // Option 2: Vibrant Blue/Purple (Original)
          gradientTop: 0x3a86ff,
          gradientBottom: 0x8338ec,
          // Option 3: Teal/Green
          // gradientTop: 0x1CD8D2,
          // gradientBottom: 0x93EDC7,
  
          buttonBg: 0xffffff, // Clean white button
          buttonText: "#333333", // Dark text for contrast
          buttonHoverTint: 0xf0f0f0, // Slight grey tint on hover
          versionText: "rgba(255, 255, 255, 0.7)", // Slightly more visible
        },
        fonts: {
          // Prioritize modern system fonts, fallback to sans-serif
          main: "'Helvetica Neue', 'Arial', 'sans-serif'",
          buttonSize: "30px",
          versionSize: "14px",
        },
        button: {
          width: 220,
          height: 65,
          cornerRadius: 20, // Slightly softer corners
          hoverScale: 1.08, // Slightly larger hover effect
          normalScale: 1.0,
          clickScale: 0.95,
        },
        tweens: {
          hoverDuration: 150, // Smoother hover
          clickDuration: 80,
          logoBobAmp: 5, // How much the logo moves
          logoBobDur: 2000, // Duration of one bob cycle
        },
        layout: {
          logoY: 0.35, // Position logo 35% down
          buttonY: 0.65, // Position button 65% down
        },
        // --- Optional: Add a subtle background animation ---
        backgroundAnimation: true, // Set to false to disable
        backgroundZoom: 1.03, // How much the background zooms
        backgroundZoomDuration: 15000, // Duration of one zoom cycle
      };
    }
  
    // --- Preload ---
    // Make sure your 'logo' image is loaded in a PreloadScene before this scene starts
    // preload() {
    //     this.load.image('logo', 'assets/logo.png');
    // }
  
    // --- Create ---
    create() {
      const { width, height } = this.cameras.main;
  
      this._createBackground(width, height);
      this._createPlayButton(width, height);
    }
  
    // --- Private Helper Methods ---
  
    _createBackground(width, height) {
      const { colors, backgroundAnimation, backgroundZoom, backgroundZoomDuration } = this.config;
      const bg = this.add.image(width / 2, height / 2,
          this._createGradientTexture("bgGradient", width, height, colors.gradientTop, colors.gradientBottom)
      );
  
      if (backgroundAnimation) {
          this.tweens.add({
              targets: bg,
              scaleX: backgroundZoom,
              scaleY: backgroundZoom,
              duration: backgroundZoomDuration,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: -1
          });
      }
    }

  
    _createPlayButton(width, height) {
      const { colors, fonts, button, tweens, layout } = this.config;
  
      const btnX = width / 2;
      const btnY = height * layout.buttonY;
  
      // Container for button elements
      const playButton = this.add.container(btnX, btnY);
  
      // Button Background Graphic
      const buttonBg = this.add.graphics();
      buttonBg.fillStyle(colors.buttonBg, 1);
      // Draw from center for easier container positioning
      buttonBg.fillRoundedRect(
        -button.width / 2,
        -button.height / 2,
        button.width,
        button.height,
        button.cornerRadius
      );
      // Optional: Add a subtle border
      // buttonBg.lineStyle(2, 0xffffff, 0.5); // Subtle white border
      // buttonBg.strokeRoundedRect(-button.width / 2, -button.height / 2, button.width, button.height, button.cornerRadius);
  
  
      // Button Text
      const playText = this.add.text(0, 0, "PLAY", {
          fontFamily: fonts.main,
          fontSize: fonts.buttonSize,
          color: colors.buttonText,
          fontStyle: 'bold', // Bolder text
          align: 'center'
        })
        .setOrigin(0.5); // Center text within the container
  
      // Add elements to container
      playButton.add([buttonBg, playText]);
  
      // Make button interactive
      playButton.setSize(button.width, button.height); // Set interactive area size
      playButton.setInteractive({ useHandCursor: true });
  
      // --- Button Interactions ---
      playButton.on("pointerover", () => {
        // Scale tween
        this.tweens.add({
          targets: playButton,
          scaleX: button.hoverScale,
          scaleY: button.hoverScale,
          duration: tweens.hoverDuration,
          ease: "Power2", // Smoother ease
        });
        // Tint tween on the background graphic
        this.tweens.add({
          targets: buttonBg,
          tint: colors.buttonHoverTint,
          duration: tweens.hoverDuration,
          ease: "Power1",
        });
      });
  
      playButton.on("pointerout", () => {
        // Scale tween back
        this.tweens.add({
          targets: playButton,
          scaleX: button.normalScale,
          scaleY: button.normalScale,
          duration: tweens.hoverDuration,
          ease: "Power2", // Consistent ease
        });
        // Tint tween back
         this.tweens.add({
          targets: buttonBg,
          tint: 0xffffff, // Back to original white
          duration: tweens.hoverDuration,
          ease: "Power1",
        });
      });
  
      playButton.on("pointerdown", () => {
        // Click scale effect
        this.tweens.add({
          targets: playButton,
          scaleX: button.clickScale,
          scaleY: button.clickScale,
          duration: tweens.clickDuration,
          ease: "Power1",
          yoyo: true, // Scale back up automatically
          onComplete: () => {
              // Ensure scale is reset before fade starts
              playButton.setScale(button.normalScale);
  
              // Start transition
              this.cameras.main.fadeOut(500, 0, 0, 0); // Use fadeOut helper
          }
        });
      });
  
      // Scene transition listener
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start("GameScene");
      });
  
      return playButton; // Return in case needed elsewhere
    }

  
    // Helper to create a gradient texture (avoids recreating if key exists)
    _createGradientTexture(key, width, height, colorTop, colorBottom) {
      if (this.textures.exists(key)) {
          return key; // Return existing texture key
      }
  
      const texture = this.textures.createCanvas(key, width, height);
      const context = texture.getContext();
      const gradient = context.createLinearGradient(0, 0, width, height); // Diagonal
  
      gradient.addColorStop(0, this._hexToRGBA(colorTop));
      gradient.addColorStop(1, this._hexToRGBA(colorBottom));
  
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      texture.refresh(); // Important: Update the canvas texture
  
      return key; // Return the newly created texture key
    }
  
    // Helper to convert hex color to rgba string (required by canvas gradient)
    _hexToRGBA(hex, alpha = 1) {
      const r = (hex >> 16) & 0xff;
      const g = (hex >> 8) & 0xff;
      const b = hex & 0xff;
      return `rgba(${r},${g},${b},${alpha})`;
    }
  }

export default MainMenuScene;