import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

/**
 * SocketContext — manages a single Socket.IO connection per authenticated user.
 *
 * v2 — Organization Namespace Isolation:
 *  - Connects to /org/<companyId> instead of the shared root namespace
 *  - This matches the server's dynamic per-org namespace strategy
 *  - A user from org 42 connects to /org/42; they cannot receive events from /org/99
 */

const SocketContext = createContext(null);

const SOCKET_SERVER = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated, user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token || !user?.companyId) {
      // Disconnect if logged out or user not yet loaded
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Connect to the organization-specific namespace — strong isolation by design
    const orgNamespace = `/org/${user.companyId}`;

    const socket = io(`${SOCKET_SERVER}${orgNamespace}`, {
      auth: { token },
      transports: ['websocket', 'polling'], // prefer WS, fallback to polling
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log(`🔌 Socket connected [org:${user.companyId}]:`, socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket connection error:', err.message);
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, token, user?.companyId]);

  const emit = useCallback((event, data, ack) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data, ack);
    }
  }, []);

  const value = {
    socket: socketRef.current,
    connected,
    emit,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

/**
 * Hook to access the socket instance and connection status
 */
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
};

/**
 * Hook to subscribe to a socket event with automatic cleanup
 */
export const useSocketEvent = (event, handler) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !event) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, event, handler]);
};
