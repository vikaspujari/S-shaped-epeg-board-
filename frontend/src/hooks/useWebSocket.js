import { useCallback, useEffect, useRef, useState } from 'react';

const WS_URL = 'ws://10.172.94.13:8000/ws/frontend';
const RECONNECT_DELAY = 3000;

const initialState = {
  status: 'DISCONNECTED',
  currentShape: null,
  currentSide: null,
  targetHole: null,
  lastPegResult: null,
  gameOver: false,
  analytics: null,
  shapesCompleted: 0,
  totalRounds: 8,
};

export default function useWebSocket() {
  const [gameState, setGameState] = useState(initialState);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);

    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        setGameState((prev) => ({ ...prev, status: 'CONNECTED' }));
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          setGameState((prev) => {
            if (message.type === 'show_shape') {
              return {
                ...prev,
                currentShape: message.shape || null,
                currentSide: message.side || null,
                targetHole: Number.isInteger(message.target_hole) ? message.target_hole : null,
                lastPegResult: null,
                gameOver: false,
                analytics: null,
                shapesCompleted: message.shapes_completed ?? prev.shapesCompleted,
                totalRounds: message.total_shapes ?? prev.totalRounds,
              };
            }

            if (message.type === 'peg_result') {
              return {
                ...prev,
                lastPegResult: {
                  correct: Boolean(message.correct),
                  hole_id: message.hole_id,
                  shape: message.shape,
                  side: message.side,
                  expected_hole: message.expected_hole,
                },
                shapesCompleted: message.shapes_completed ?? prev.shapesCompleted,
                totalRounds: message.total_shapes ?? prev.totalRounds,
              };
            }

            if (message.type === 'game_over') {
              return {
                ...prev,
                currentShape: null,
                currentSide: null,
                targetHole: null,
                gameOver: true,
                analytics: message.analytics || null,
                shapesCompleted: message.analytics?.total_rounds ?? prev.totalRounds,
                totalRounds: message.analytics?.total_rounds ?? prev.totalRounds,
              };
            }

            return prev;
          });
        } catch (error) {
          console.warn('[WS] Failed to parse message:', error);
        }
      };

      socket.onclose = () => {
        setGameState((prev) => ({ ...prev, status: 'DISCONNECTED' }));
        if (shouldReconnectRef.current) {
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (error) {
      console.error('[WS] Connection attempt failed:', error);
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return gameState;
}

