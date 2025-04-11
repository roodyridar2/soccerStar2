import Phaser from 'phaser';

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Load assets needed for the loading screen from picsum.photos
        this.load.image('loading-background', 'https://picsum.photos/800/600?random=11');
        this.load.image('loading-bar', 'https://picsum.photos/400/50?random=12');
    }

    create() {
        // Go to the preload scene
        this.scene.start('PreloadScene');
    }
}

export default BootScene;
