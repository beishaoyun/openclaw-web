import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketOptions {
  reconnectInterval?: number;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
) {
  const {
    reconnectInterval = 3000,
    onMessage,
    onError,
    onOpen,
    onClose,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      const wsUrl = url.replace('http', 'ws').replace('https', 'wss');

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        onOpen?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        onError?.(error);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        onClose?.();

        // 自动重连
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [url, reconnectInterval, onMessage, onError, onOpen, onClose]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, [isConnected]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, send, disconnect };
}
