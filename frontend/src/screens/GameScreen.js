import React, { useRef, useEffect, useState, useCallback } from 'react';
import GameEngine from '../engine/GameEngine';
import useWebSocket from '../hooks/useWebSocket';
import AnalyticsScreen from '../components/AnalyticsScreen';

// Difficulty → rock speed multiplier
const SPEED_MAP = {
  Easy: 2.5,
  Medium: 4,
  Hard: 6,
  'Expert / More Reps': 7.5,
};

export default function GameScreen() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const timerRef = useRef(null);

  const [elapsed, setElapsed] = useState(0);
  const [pegsDone, setPegsDone] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const startTimeRef = useRef(null);

  // ─── WebSocket event handler ───
  const handleWsMessage = useCallback((msg) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (msg.type === 'LIVE_UPDATE') {
      const data = msg.data;

      // Start the timer on the first peg if not started
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      // Trigger jump animation (includes white flash via engine)
      engine.triggerJump();
      setPegsDone(data.holes_done);
      setIsWaiting(false);
    }

    if (msg.type === 'SESSION_SUMMARY') {
      const data = msg.data;

      // Apply difficulty-based speed for next session reference
      if (data.suggested_difficulty && SPEED_MAP[data.suggested_difficulty]) {
        engine.setRockSpeed(SPEED_MAP[data.suggested_difficulty]);
      }

      engine.setDone();
      setSessionSummary(data);

      // Short delay before showing analytics for the final jump animation
      setTimeout(() => {
        setShowAnalytics(true);
      }, 1200);
    }
  }, []);

  const { connected } = useWebSocket(handleWsMessage);

  // ─── Initialize canvas game engine ───
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

  // ─── Timer tick ───
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (startTimeRef.current && !showAnalytics) {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [showAnalytics]);

  // ─── Track waiting state from engine ───
  useEffect(() => {
    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (engine) {
        setIsWaiting(engine.state === 'waiting');
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // ─── Restart ───
  const handleRestart = useCallback(() => {
    // Stop old engine
    if (engineRef.current) {
      engineRef.current.stop();
    }

    setShowAnalytics(false);
    setSessionSummary(null);
    setPegsDone(0);
    setElapsed(0);
    startTimeRef.current = null;

    const canvas = canvasRef.current;
    if (canvas) {
      const engine = new GameEngine(canvas);
      engineRef.current = engine;
      engine.start();
    }
  }, []);

  // ─── Format timer ───
  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="game-container" id="game-container">
      <canvas ref={canvasRef} className="game-canvas" id="game-canvas" />

      {/* HUD */}
      <div className="hud">
        {/* Timer — Top Left */}
        <div className="hud-panel hud-timer" id="hud-timer">
          <div>
            <div className="label">Mission Time</div>
            <div className="value">{formatTime(elapsed)}</div>
          </div>
        </div>

        {/* Pegs — Top Right */}
        <div className="hud-panel hud-pegs" id="hud-pegs">
          <div className="label">Objectives</div>
          <div className="value">
            {pegsDone}
            <span className="total">/8</span>
          </div>
          <div className="peg-dots">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`peg-dot ${i < pegsDone ? 'filled' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Waiting indicator */}
      {isWaiting && (
        <div className="waiting-indicator" id="waiting-indicator">
          <span>⏳ Awaiting Peg Placement…</span>
        </div>
      )}

      {/* Connection status */}
      <div
        className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}
        id="connection-badge"
      >
        {connected ? '● LINK ACTIVE' : '○ LINK DOWN'}
      </div>

      {/* Analytics overlay */}
      {showAnalytics && (
        <AnalyticsScreen summary={sessionSummary} onRestart={handleRestart} />
      )}
    </div>
  );
}
