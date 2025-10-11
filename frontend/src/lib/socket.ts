import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../features/auth/stores/authStore';
import type { ChatMessage, TypingIndicator } from '../types/api';

class SocketClient {
  private socket: Socket | null = null;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second, exponential backoff

  // Event callbacks
  private messageCallbacks: ((message: ChatMessage) => void)[] = [];
  private messageEditedCallbacks: ((data: { id: number; content: string; edited: boolean; editedAt: string }) => void)[] = [];
  private messageDeletedCallbacks: ((data: { id: number; deletedAt: string }) => void)[] = [];
  private typingCallbacks: ((data: TypingIndicator) => void)[] = [];
  private userJoinedCallbacks: ((data: { userId: number; displayName: string }) => void)[] = [];
  private userLeftCallbacks: ((data: { userId: number; displayName: string }) => void)[] = [];
  private errorCallbacks: ((message: string) => void)[] = [];
  private connectionCallbacks: (() => void)[] = [];
  private disconnectionCallbacks: (() => void)[] = [];

  constructor() {
    // Initialize socket lazily - only when connect() is called
  }

  private initializeSocket() {
    const token = useAuthStore.getState().token;

    if (!token) {
      console.warn('No auth token available for socket connection');
      return;
    }

    // Use environment variable for socket URL or default to localhost
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

    this.socket = io(socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.connectionCallbacks.forEach(callback => callback());
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.disconnectionCallbacks.forEach(callback => callback());
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.errorCallbacks.forEach(callback => callback('Connection failed'));
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
    });

    // Chat events
    this.socket.on('new-message', (message: ChatMessage) => {
      this.messageCallbacks.forEach(callback => callback(message));
    });

    this.socket.on('message-edited', (data) => {
      this.messageEditedCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('message-deleted', (data) => {
      this.messageDeletedCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('user-typing', (data: TypingIndicator) => {
      this.typingCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('user-joined', (data) => {
      this.userJoinedCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('user-left', (data) => {
      this.userLeftCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('error', (message: string) => {
      console.error('Socket error:', message);
      this.errorCallbacks.forEach(callback => callback(message));
    });
  }

  // Connection methods
  connect() {
    if (!this.socket) {
      this.initializeSocket();
      return;
    }

    if (!this.socket.connected) {
      const token = useAuthStore.getState().token;
      if (token) {
        this.socket.auth = { token };
        this.socket.connect();
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  reconnect() {
    if (this.socket) {
      const token = useAuthStore.getState().token;
      if (token) {
        this.socket.auth = { token };
        this.socket.connect();
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Room management
  joinRecipeChat(recipeId: number) {
    if (this.socket?.connected) {
      this.socket.emit('join-recipe-chat', recipeId);
    }
  }

  leaveRecipeChat(recipeId: number) {
    if (this.socket?.connected) {
      this.socket.emit('leave-recipe-chat', recipeId);
    }
  }

  // Chat methods
  sendMessage(recipeId: number, content: string, messageType: string = 'message') {
    if (this.socket?.connected) {
      this.socket.emit('send-message', { recipeId, content, messageType });
    }
  }

  editMessage(messageId: number, newContent: string) {
    if (this.socket?.connected) {
      this.socket.emit('edit-message', { messageId, newContent });
    }
  }

  deleteMessage(messageId: number) {
    if (this.socket?.connected) {
      this.socket.emit('delete-message', { messageId });
    }
  }

  startTyping(recipeId: number) {
    if (this.socket?.connected) {
      this.socket.emit('typing-start', recipeId);
    }
  }

  stopTyping(recipeId: number) {
    if (this.socket?.connected) {
      this.socket.emit('typing-stop', recipeId);
    }
  }

  // Event listener registration
  onMessage(callback: (message: ChatMessage) => void) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageEdited(callback: (data: { id: number; content: string; edited: boolean; editedAt: string }) => void) {
    this.messageEditedCallbacks.push(callback);
    return () => {
      this.messageEditedCallbacks = this.messageEditedCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageDeleted(callback: (data: { id: number; deletedAt: string }) => void) {
    this.messageDeletedCallbacks.push(callback);
    return () => {
      this.messageDeletedCallbacks = this.messageDeletedCallbacks.filter(cb => cb !== callback);
    };
  }

  onTyping(callback: (data: TypingIndicator) => void) {
    this.typingCallbacks.push(callback);
    return () => {
      this.typingCallbacks = this.typingCallbacks.filter(cb => cb !== callback);
    };
  }

  onUserJoined(callback: (data: { userId: number; displayName: string }) => void) {
    this.userJoinedCallbacks.push(callback);
    return () => {
      this.userJoinedCallbacks = this.userJoinedCallbacks.filter(cb => cb !== callback);
    };
  }

  onUserLeft(callback: (data: { userId: number; displayName: string }) => void) {
    this.userLeftCallbacks.push(callback);
    return () => {
      this.userLeftCallbacks = this.userLeftCallbacks.filter(cb => cb !== callback);
    };
  }

  onError(callback: (message: string) => void) {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnected(callback: () => void) {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  onDisconnected(callback: () => void) {
    this.disconnectionCallbacks.push(callback);
    return () => {
      this.disconnectionCallbacks = this.disconnectionCallbacks.filter(cb => cb !== callback);
    };
  }

  // Cleanup
  destroy() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.clearAllCallbacks();
  }

  private clearAllCallbacks() {
    this.messageCallbacks = [];
    this.messageEditedCallbacks = [];
    this.messageDeletedCallbacks = [];
    this.typingCallbacks = [];
    this.userJoinedCallbacks = [];
    this.userLeftCallbacks = [];
    this.errorCallbacks = [];
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
  }

  // Utility methods for authentication updates
  updateAuthToken(newToken: string) {
    if (this.socket) {
      this.socket.auth = { token: newToken };
      if (!this.socket.connected) {
        this.socket.connect();
      }
    }
  }

  // Handle auth store changes
  handleAuthChange(_user: any, token: string | null) {
    if (!token) {
      this.disconnect();
    } else {
      this.updateAuthToken(token);
      this.connect();
    }
  }
}

// Singleton instance
const socketClient = new SocketClient();

// Export the singleton instance
export default socketClient;

// Export types for usage
export type { SocketClient };
