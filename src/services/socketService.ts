import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001'; // Replace with your backend URL later

class SocketService {
  socket;

  connect() {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'], // Force WebSocket transport as specified
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }
}

export default new SocketService();