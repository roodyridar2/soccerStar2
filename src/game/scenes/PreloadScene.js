import Phaser from 'phaser';

class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: "Loading...",
      style: {
        font: "20px Arial",
        fill: "#ffffff",
      },
    });
    loadingText.setOrigin(0.5, 0.5);

    // Loading progress events
    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load game assets from local files
    this.load.image("field", "assets/images/field.png"); // Soccer field - green background
    this.load.image("ball", "assets/images/ball.png"); // Soccer ball
    this.load.image("player", "assets/images/player.png"); // Player
    this.load.image("bot", "assets/images/bot.png"); // Bot/opponent
    this.load.image("goal-post", "https://picsum.photos/seed/goalpost/100/200"); // Goal post
    this.load.image("button", "https://picsum.photos/seed/button/200/80"); // Button

    // Load UI assets
    this.load.image("logo", "https://picsum.photos/400/200?random=7"); // Game logo
    this.load.image("coin", "https://picsum.photos/40/40?random=8"); // Coin icon

    // Load audio from online sources
    // Using free sound effects from SoundBible and other free sources
    // this.load.audio('kick', 'https://soundbible.com/grab.php?id=1343&type=mp3');
    // this.load.audio('goal', 'https://soundbible.com/grab.php?id=1823&type=mp3');
    // this.load.audio('whistle', 'https://soundbible.com/grab.php?id=1806&type=mp3');
    // this.load.audio('background', 'https://soundbible.com/grab.php?id=2068&type=mp3');
  }

  create() {
    // Go to the main menu
    this.scene.start("MainMenuScene");
  }
}

export default PreloadScene;
