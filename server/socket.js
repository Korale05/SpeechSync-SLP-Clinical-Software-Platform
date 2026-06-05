import { Server } from 'socket.io';

let io;
const userSockets = new Map(); // Map to store userId -> socketId

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // When a user logs in or connects, they emit an 'identify' event with their userId
    socket.on('identify', (userId) => {
      userSockets.set(userId, socket.id);
      socket.join(`user_${userId}`);
      console.log(`User ${userId} identified with socket ${socket.id}`);
    });

    // Subscribe to a specific patient's real-time updates
    socket.on('subscribe_patient', (patientId) => {
      socket.join(`patient_${patientId}`);
      console.log(`Socket ${socket.id} joined room patient_${patientId}`);
    });

    socket.on('unsubscribe_patient', (patientId) => {
      socket.leave(`patient_${patientId}`);
      console.log(`Socket ${socket.id} left room patient_${patientId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Remove from map
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Utility to emit to a specific user
export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user_${userId}`).emit(event, data);
};

// Utility to emit to all subscribers of a patient
export const emitToPatientRoom = (patientId, event, data) => {
  if (!io) return;
  io.to(`patient_${patientId}`).emit(event, data);
};
