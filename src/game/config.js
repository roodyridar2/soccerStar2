// Game configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 480,  // Mobile-friendly width
    height: 800, // Vertical orientation
    backgroundColor: '#333333',
    physics: {
        default: 'matter',
        matter: {
            debug: false,
            gravity: { y: 0 },
            setBounds: true
        }
    },
    // Mobile scaling options
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 480,
        height: 800
    },
    // Define scene classes that were loaded before this file
    scene: [
        BootScene,
        PreloadScene,
        MainMenuScene,
        GameScene
    ]
};
