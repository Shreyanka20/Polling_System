import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:5000';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    let newSocket;

    const initSocket = () => {
      // Create socket instance with improved configuration
      newSocket = io(SOCKET_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 5000,
        forceNew: false
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setConnected(true);
        setReconnectAttempts(0);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
        setReconnectAttempts(prev => prev + 1);
        
        // If we've tried too many times, force a new connection
        if (reconnectAttempts > 5) {
          console.log('Too many reconnection attempts, forcing new connection');
          newSocket.close();
          setTimeout(initSocket, 1000);
          setReconnectAttempts(0);
        }
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Store socket instance
      setSocket(newSocket);
    };

    // Initialize socket if not exists
    if (!socket) {
      initSocket();
    }

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket) {
        newSocket.removeAllListeners();
        // Only close if we're actually unmounting the app
        if (!document.body.contains(document.getElementById('root'))) {
          newSocket.close();
        }
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Improved emit wrapper function with better error handling
  const emit = useCallback((eventName, data) => {
    if (socket && connected) {
      console.log('Emitting event:', eventName, data);
      try {
        socket.emit(eventName, data);
      } catch (error) {
        console.error('Error emitting event:', error);
      }
    } else {
      console.warn('Cannot emit', eventName, '- Socket not connected. Will retry when connected.');
      // Store the event to retry when connected
      if (socket) {
        socket.once('connect', () => {
          console.log('Retrying event after reconnection:', eventName);
          socket.emit(eventName, data);
        });
      }
    }
  }, [socket, connected]);

  const value = {
    socket,
    connected,
    emit
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 