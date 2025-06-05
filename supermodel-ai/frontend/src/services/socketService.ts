// src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import { Message, Task } from '../types';
import { useAuthStore } from '../store/authStore'; // For auth token
import { useSessionStore } from '../store/sessionStore'; // To add messages
import { useTaskStore } from '../store/taskStore'; // To update tasks

const WEBSOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5000';

type SocketEventCallback<T = any> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;

  // Removed direct taskUpdateHandlers, will use Zustand for updates

  connect(): void {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected:', this.socket.id);
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) {
        console.warn('SocketService: No auth token found, connection aborted.');
        return;
    }

    console.log(`SocketService: Attempting to connect to ${WEBSOCKET_URL}`);
    this.socket = io(WEBSOCKET_URL, {
      path: '/socket.io',
      auth: { token: `Bearer ${token}` }, // Send token with Bearer prefix
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5, // Try to reconnect a few times
      reconnectionDelay: 3000, // Delay between retries
    });

    this.socket.on('connect', () => {
      console.log('Socket connected successfully:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // The server intentionally disconnected the socket, possibly due to auth error
        // Potentially trigger logout if token seems invalid
        // useAuthStore.getState().logout();
      }
      // else: Handle other disconnection reasons, e.g., network issues, server down
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error.message);
      // If auth error (e.g. token expired during connection attempt)
      if (error.message.includes('Unauthorized') || error.message.includes('Token expired')) {
          useAuthStore.getState().logout(); // Force logout
      }
    });

    this.socket.on('error', (error: any) => { // General socket errors
        console.error('Socket error received:', error);
    });

    // Listen for task updates
    this.socket.on('task:updated', (task: Task) => {
        console.log('Task update received via WebSocket:', task);
        useTaskStore.getState().updateTaskInList(task);
    });

    // Listen for new messages in a session
    this.socket.on('session:message:new', (message: Message) => {
        console.log('New message received via WebSocket for session:', message.session_id, message);
        useSessionStore.getState().addMessage(message.session_id, message);
    });

    // Listen for session join/leave confirmations or errors
    this.socket.on('session:joined', (data: { sessionId: string, message?: string }) => {
        console.log(`Successfully joined session room: ${data.sessionId}. Message: ${data.message}`);
    });
    this.socket.on('session:left', (data: { sessionId: string, message?: string }) => {
        console.log(`Successfully left session room: ${data.sessionId}. Message: ${data.message}`);
    });
    this.socket.on('error:session', (data: { message: string }) => {
        console.error(`Session error from socket: ${data.message}`);
        // Potentially show this to the user via a notification system
    });
  }

  disconnect(): void {
    if (this.socket) {
        console.log('SocketService: Disconnecting socket...');
        this.socket.disconnect();
        this.socket = null;
    }
  }

  // Ensure socket is connected before emitting events
  private emit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Socket not connected. Event "${event}" not sent. Data:`, data);
      // Optionally, queue events to send upon reconnection, or notify user.
    }
  }

  joinSession(sessionId: string): void {
    this.emit('join:session', sessionId);
  }

  leaveSession(sessionId:string): void {
    this.emit('leave:session', sessionId);
  }

  sendSessionMessage(sessionId: string, content: string): void {
      // Note: The primary way to send messages is via HTTP POST.
      // This WS emit would be for a scenario where client directly sends via WS,
      // which might require different handling on the backend socket listener.
      // For now, this is less critical as HTTP POST handles the user->AI->broadcast flow.
      this.emit('session:message:send', { sessionId, content });
      console.log(`DEBUG: Emitted session:message:send for session ${sessionId} via WS.`);
  }

  // Task subscription is now primarily handled by the task store listening to 'task:updated'
  // If specific subscription messages to backend were needed:
  // subscribeToTask(taskId: string): void {
  //   this.emit('task:subscribe', taskId);
  // }
  // unsubscribeFromTask(taskId: string): void {
  //   this.emit('task:unsubscribe', taskId);
  // }
}

export const socketService = new SocketService();
// Connection is typically initiated after successful login / auth state hydration.
// Disconnection on logout. These are handled in authStore.ts.
