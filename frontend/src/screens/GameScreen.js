import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameEngine from '../engine/GameEngine';
import useWebSocket from '../hooks/useWebSocket';
import ShapeDisplay from '../components/ShapeDisplay';
import AnalyticsPanel from '../components/AnalyticsPanel';

const START_URL = 'http://10.172.94.13:8000/start';

export default function GameScreen() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const timerRef = useRef(null);
  const lastHandledPegRef = useRef(null);

  const [elapsed, setElapsed] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState(null);

  const {
    status,
    currentShape,
    currentSide,
    targetHole,
    lastPegResult,
    gameOver,
    analytics,
    shapesCompleted,
    totalRounds,
  } = useWebSocket();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.start();

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!timerRunning || !startTimestamp) {
      return undefined;
    }

    setElapsed((Date.now() - startTimestamp) / 1000);

    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimestamp) / 1000);
    }, 100);

    return () => clearInterval(timerRef.current);
  }, [startTimestamp, timerRunning]);

  useEffect(() => {
    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (engine) {
        setIsWaiting(engine.state === 'waiting');
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastPegResult) return;

    const pegKey = `${lastPegResult.correct}-${lastPegResult.hole_id}-${lastPegResult.shape}-${lastPegResult.side}-${Date.now()}`;
    if (lastHandledPegRef.current === pegKey) return;
    lastHandledPegRef.current = pegKey;

    if (lastPegResult.correct && engineRef.current) {
      engineRef.current.triggerJump();
    }
  }, [lastPegResult]);

  useEffect(() => {
    if (gameOver && engineRef.current) {
      engineRef.current.setDone();
    }
    if (gameOver) {
      setTimerRunning(false);
    }
  }, [gameOver]);

  useEffect(() => {
    if (currentShape && !timerRunning && !startTimestamp && shapesCompleted === 0) {
      setElapsed(0);
      setStartTimestamp(Date.now());
      setTimerRunning(true);
    }
  }, [currentShape, shapesCompleted, startTimestamp, timerRunning]);

  const startGame = useCallback(async () => {
    setIsStarting(true);
    setStartError(null);
    setElapsed(0);
    setStartTimestamp(Date.now());
    setTimerRunning(true);

    if (engineRef.current) {
      engineRef.current.stop();
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const engine = new GameEngine(canvas);
      engineRef.current = engine;
      engine.start();
    }

    try {
      const response = await fetch(START_URL, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
      await response.json();
    } catch (error) {
      setStartTimestamp(null);
      setTimerRunning(false);
      setStartError('Could not start the game. Check that the FastAPI backend is running on port 8000.');
      console.error('[Start Game] Failed:', error);
    } finally {
      setIsStarting(false);
    }
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  return (
    <div className="game-container" id="game-container">
      <canvas ref={canvasRef} className="game-canvas" id="game-canvas" />

      <div className="hud">
        <div className="hud-panel hud-timer" id="hud-timer">
          <div>
            <div className="label">Mission Time</div>
            <div className="value">{formatTime(elapsed)}</div>
          </div>
        </div>

        <div className="hud-panel hud-pegs" id="hud-pegs">
          <div className="label">Round</div>
          <div className="value">
            {shapesCompleted}
            <span className="total">/{totalRounds}</span>
          </div>
          <div className="peg-dots">
            {Array.from({ length: totalRounds }).map((_, index) => (
              <div key={index} className={`peg-dot ${index < shapesCompleted ? 'filled' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      {currentShape ? (
        <ShapeDisplay
          shape={currentShape}
          side={currentSide}
          targetHole={targetHole}
          lastPegResult={lastPegResult}
        />
      ) : (
        !gameOver && (
          <div className="start-panel">
            <style>{startPanelStyles}</style>
            <div className="start-panel-kicker">Rehab Pegboard</div>
            <h1>Shape Match Run</h1>
            <p>Press start, then insert each peg into the highlighted shape and side.</p>
            <button onClick={startGame} disabled={isStarting || status !== 'CONNECTED'}>
              {isStarting ? 'Starting...' : 'Start Game'}
            </button>
            {status !== 'CONNECTED' && <span className="start-panel-note">Waiting for backend WebSocket...</span>}
            {startError && <span className="start-panel-error">{startError}</span>}
          </div>
        )
      )}

      {isWaiting && currentShape && !gameOver && (
        <div className="waiting-indicator" id="waiting-indicator">
          <span>Awaiting Peg Placement...</span>
        </div>
      )}

      <div className={`connection-badge ${status === 'CONNECTED' ? 'connected' : 'disconnected'}`} id="connection-badge">
        {status === 'CONNECTED' ? 'LINK ACTIVE' : 'LINK DOWN'}
      </div>

      {gameOver && <AnalyticsPanel analytics={analytics} onRestart={startGame} />}
    </div>
  );
}

const startPanelStyles = `
.start-panel {
  position: absolute;
  z-index: 22;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(560px, 92vw);
  padding: 30px;
  text-align: center;
  background: linear-gradient(145deg, rgba(8, 18, 10, 0.94), rgba(14, 42, 26, 0.84));
  border: 1px solid rgba(51, 255, 102, 0.22);
  border-radius: 22px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 44px rgba(51, 255, 102, 0.12);
}

.start-panel-kicker {
  font-family: var(--font-stencil);
  color: var(--accent-amber);
  letter-spacing: 2px;
  font-size: 11px;
  text-transform: uppercase;
}

.start-panel h1 {
  margin-top: 8px;
  font-family: var(--font-stencil);
  color: var(--accent-green);
  font-size: clamp(34px, 7vw, 56px);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.start-panel p {
  margin: 10px auto 20px;
  max-width: 420px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.start-panel button {
  padding: 13px 42px;
  border-radius: 999px;
  border: 2px solid var(--accent-green);
  background: var(--accent-green);
  color: #041006;
  cursor: pointer;
  font-family: var(--font-stencil);
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.start-panel button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 24px rgba(51, 255, 102, 0.35);
}

.start-panel button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.start-panel-note,
.start-panel-error {
  display: block;
  margin-top: 12px;
  font-family: var(--font-mono);
  font-size: 12px;
}

.start-panel-note { color: var(--text-muted); }
.start-panel-error { color: var(--accent-red); }
`;

