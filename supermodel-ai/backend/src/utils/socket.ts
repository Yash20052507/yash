// src/utils/socket.ts
import { Server as HttpServer } from 'http';
import { Server as SocketIoServer, Socket } from 'socket.io';
import { logger } from './logger';
import config from '../config';

// Define a type for the data we expect for session messages for clarity
interface SessionMessageSendData {
    sessionId: string;
    content: string;
    // Potentially other fields like messageId (client-generated for ack), attachments etc.
}

// Define a type for the data we emit for received messages
interface SessionMessageReceiveData {
    sessionId: string;
    userId?: string; // User who sent the message (could be 'system' or AI's ID)
    username?: string; // Username of the sender
    content: string;
    role: 'user' | 'ai' | 'system';
    timestamp: Date;
    // Potentially messageId, tokensUsed, modelUsed for AI messages
}


export function initSocketServer(httpServer: HttpServer): SocketIoServer {
  const io = new SocketIoServer(httpServer, {
    cors: {
      origin: config.server.corsOrigin, // Use the configured origin
      methods: ["GET", "POST"],
      credentials: true // If your frontend sends cookies or auth headers
    },
    path: '/socket.io', // Default path, can be customized
    transports: ['websocket', 'polling'] // Specify transports
  });

  logger.info(`Socket.IO server initializing with CORS origin: ${config.server.corsOrigin}`);

  io.on('connection', (socket: Socket) => {
    logger.info(`New client connected: ${socket.id} from ${socket.handshake.address}`);

    socket.on('join:session', (sessionId: string) => {
      if (!sessionId || typeof sessionId !== 'string') {
        logger.warn(`Socket ${socket.id} attempted to join invalid session room: ${sessionId}`);
        socket.emit('error:session', { message: 'Invalid session ID provided.' });
        return;
      }
      socket.join(sessionId);
      logger.info(`Socket ${socket.id} joined session room: ${sessionId}`);
      socket.emit('session:joined', { sessionId, message: `Successfully joined session ${sessionId}` });
    });

    socket.on('leave:session', (sessionId: string) => {
      if (!sessionId || typeof sessionId !== 'string') {
        logger.warn(`Socket ${socket.id} attempted to leave invalid session room: ${sessionId}`);
        return; // No need to emit error back usually for leave
      }
      socket.leave(sessionId);
      logger.info(`Socket ${socket.id} left session room: ${sessionId}`);
      socket.emit('session:left', { sessionId, message: `Successfully left session ${sessionId}` });
    });

    // Example: Listen for messages from client for a session
    socket.on('session:message:send', (data: SessionMessageSendData) => {
        // Here you would typically interact with your SessionController or AIService
        // to process the message and then broadcast it back to the session room.
        // This requires proper authentication/authorization context for the socket.
        // For now, just log and perhaps echo or broadcast.
        logger.info(`Message received for session ${data.sessionId} from ${socket.id}: ${data.content.substring(0,50)}...`);

        // Placeholder: This should be replaced by actual message processing logic
        // which would involve saving the user's message, getting AI response, saving AI message,
        // and then emitting both messages to the session room.
        // Example: io.to(data.sessionId).emit('session:message:receive', { user: 'some_user', content: data.content, timestamp: new Date() });

        // For a simple echo back to the sender for testing:
        // socket.emit('session:message:receive', {
        //     sessionId: data.sessionId,
        //     userId: 'echo_user', // This would be the actual user ID in a real app
        //     username: 'Echo User',
        //     content: `Echo: ${data.content}`,
        //     role: 'ai', // Simulating an AI echo
        //     timestamp: new Date()
        // } as SessionMessageReceiveData);

        // To broadcast to everyone in the room *including sender*:
        // io.to(data.sessionId).emit('session:message:receive', { ... } as SessionMessageReceiveData);
    });


    socket.on('disconnect', (reason: string) => {
      logger.info(`Client disconnected: ${socket.id}. Reason: ${reason}`);
      // Handle cleanup if necessary, e.g., remove socket from any specific tracking
    });

    socket.on('error', (error: Error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
      // Send a generic error to the client if appropriate
      socket.emit('error:socket', { message: 'An internal socket error occurred.' });
    });
  });

  // Namespace example (optional, for more complex scenarios)
  // const adminNamespace = io.of('/admin');
  // adminNamespace.on('connection', (socket) => {
  //   logger.info(`Admin client connected: ${socket.id}`);
  //   // Add admin-specific event handlers
  // });

  return io;
}
