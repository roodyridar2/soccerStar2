import React, { useState, useEffect, useRef } from "react";

const GameUI = ({ gameInstance }) => {
  const [score, setScore] = useState({ red: 0, white: 0 });
  const [currentTurn, setCurrentTurn] = useState("red");
  const [movesLeft, setMovesLeft] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const eventHandlersRef = useRef({});
  const intervalRef = useRef(null);

  // Setup polling to update UI state from game state
  useEffect(() => {
    if (!gameInstance) return;

    // Get the game scene
    let gameScene;
    try {
      gameScene = gameInstance.scene.getScene("GameScene");
    } catch (error) {
      console.error("Error accessing game scene:", error);
      return;
    }

    if (!gameScene) {
      console.error("GameScene not found");
      return;
    }

    // Define event handlers
    const handlers = {
      updateScore: (data) => {
        console.log("Score updated:", data);
        setScore({ ...data });
      },
      updateTurn: (data) => {
        console.log("Turn updated:", data);
        setCurrentTurn(data);
      },
      updateMoves: (data) => {
        console.log("Moves updated:", data);
        setMovesLeft(data);
      },
      gameStarted: (data) => {
        console.log("Game started:", data);
        setGameStarted(true);
      },
    };

    // Store handlers in ref for cleanup
    eventHandlersRef.current = handlers;

    // Remove any existing listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      gameScene.events.off(event, handler);
    });

    // Add new listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      gameScene.events.on(event, handler);
    });

    // Initialize UI with current game state
    if (gameScene.goals) {
      setScore({ ...gameScene.goals });
    }
    if (gameScene.turn) {
      setCurrentTurn(gameScene.turn);
    }
    if (gameScene.movesLeft !== undefined) {
      setMovesLeft(gameScene.movesLeft);
    }

    // Setup polling as a fallback to ensure UI stays in sync
    intervalRef.current = setInterval(() => {
      if (gameScene && gameScene.goals) {
        setScore({ ...gameScene.goals });
      }
      if (gameScene && gameScene.turn) {
        setCurrentTurn(gameScene.turn);
      }
      if (gameScene && gameScene.movesLeft !== undefined) {
        setMovesLeft(gameScene.movesLeft);
      }
    }, 500); // Poll every 500ms

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (gameScene) {
        Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
          gameScene.events.off(event, handler);
        });
      }
    };
  }, [gameInstance]);

  return (
    <div
      className={` pointer-events-none flex flex-col items-center justify-between p-4 ${
        gameStarted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Scoreboard */}
      <div className="flex items-center justify-center bg-gray-800 bg-opacity-75 rounded-lg px-6 py-2 shadow-lg">
        <div className="w-4 h-4 rounded-full bg-red-600 mr-3"></div>
        <div className="flex items-center text-white text-xl font-bold">
          <span className="text-red-500">{score.red}</span>
          <span className="mx-2">-</span>
          {/* Turn indicator */}
          <div
            className={`bg-opacity-75 rounded-lg px-2 py-2 font-bold  shadow-lg text-sm ${
              currentTurn === "red" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800"
            }`}
          >
            <span>{currentTurn.toUpperCase()}'S TURN</span>
          </div>
          <span className="mx-2">-</span>

          <span className="text-gray-200">{score.white}</span>
        </div>
        <div className="w-4 h-4 rounded-full bg-white ml-3"></div>
      </div>

  
    </div>
  );
};

export default GameUI;
