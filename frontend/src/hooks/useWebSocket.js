import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = 'ws://localhost:8000/ws/frontend';
const RECONNECT_DELAY = 3000;

export default function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Keep the callback ref fresh without re-triggering the effect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    // Clean up any previous connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to backend');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (err) {
          console.warn('[WS] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected, will reconnect...');
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        ws.close();
      };
    } catch (err) {
      console.error('[WS] Connection attempt failed:', err);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected };
}
