import React, { useState, useEffect, useRef } from 'react';
import '../styles/GameUI.css';

const GameUI = ({ gameInstance }) => {
  const [score, setScore] = useState({ red: 0, white: 0 });
  const [currentTurn, setCurrentTurn] = useState('red');
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
      gameScene = gameInstance.scene.getScene('GameScene');
    } catch (error) {
      console.error('Error accessing game scene:', error);
      return;
    }

    if (!gameScene) {
      console.error('GameScene not found');
      return;
    }

    // Define event handlers
    const handlers = {
      updateScore: (data) => {
        console.log('Score updated:', data);
        setScore({...data});
      },
      updateTurn: (data) => {
        console.log('Turn updated:', data);
        setCurrentTurn(data);
      },
      updateMoves: (data) => {
        console.log('Moves updated:', data);
        setMovesLeft(data);
      },
      gameStarted: (data) => {
        console.log('Game started:', data);
        setGameStarted(true);
      }
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
      setScore({...gameScene.goals});
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
        setScore({...gameScene.goals});
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
    <div className={`game-ui-overlay ${gameStarted ? 'visible' : 'hidden'}`}>
      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="team-indicator red"></div>
        <div className="score-display">
          <span className="score-red">{score.red}</span>
          <span className="score-separator">-</span>
          <span className="score-white">{score.white}</span>
        </div>
        <div className="team-indicator white"></div>
      </div>

      {/* Turn indicator */}
      <div className={`turn-indicator ${currentTurn}`}>
        <span>{currentTurn.toUpperCase()}'S TURN</span>
      </div>

      {/* Moves left indicator */}
      <div className="moves-indicator">
        <span>MOVES: {movesLeft}</span>
      </div>
    </div>
  );
};

export default GameUI;
