import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QueueService } from './queue.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class QueueGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly queueService: QueueService) {}

  handleConnection(socket: Socket): void {
    socket.emit('connected', { ok: true, state: this.queueService.snapshot() });
  }

  broadcast(): void {
    this.server.emit('state-updated', this.queueService.snapshot());
  }
}