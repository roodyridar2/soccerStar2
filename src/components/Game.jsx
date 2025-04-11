import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import GameUI from "./GameUI";

// Import game scenes
import BootScene from "../game/scenes/BootScene";
import PreloadScene from "../game/scenes/PreloadScene";
import MainMenuScene from "../game/scenes/MainMenuScene";
import GameScene from "../game/scenes/GameScene";

const Game = () => {
  const gameContainerRef = useRef(null);
  const gameInstanceRef = useRef(null);
  const [gameReady, setGameReady] = useState(false);

  useEffect(() => {
    if (gameInstanceRef.current) {
      setGameReady(true);
      return; // Game already initialized
    }

    // Game configuration
    const config = {
      type: Phaser.AUTO,
      parent: "game-container",
      width: 480, // Mobile-friendly width
      height: 800, // Vertical orientation
      backgroundColor: "#333333",
      physics: {
        default: "matter",
        matter: {
          debug: false,
          gravity: { y: 0 },
          setBounds: true,
        },
      },
      // Mobile scaling options
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 480,
        height: 800,
      },
      // Define scene classes
      scene: [BootScene, PreloadScene, MainMenuScene, GameScene],
    };

    // Create the game instance
    const game = new Phaser.Game(config);

    // Store the game instance
    gameInstanceRef.current = game;

    // Add global game variables (if needed by your original code)
    window.game = game;

    // Mark the game as ready for the UI
    setGameReady(true);

    // Cleanup function
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
        window.game = null;
      }
    };
  }, [setGameReady]);

  return (
    <div className="game-wrapper bg-black"> 
      <div className=" bg-black w-full  h-20 ">
        {gameReady && <GameUI gameInstance={gameInstanceRef.current} />}
      </div>
      <div
        className="w-full h-full"
        id="game-container"
        ref={gameContainerRef}
        style={{
          touchAction: "none",
        }}
      />
     
    </div>
  );
};

export default Game;
