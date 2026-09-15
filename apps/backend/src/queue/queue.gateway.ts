import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QueueService } from './queue.service';
import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class QueueGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly queueService: QueueService,
    private readonly auth: AuthService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token
      : '';
    if (!token) {
      socket.disconnect(true);
      return;
    }
    try {
      const user = await this.auth.verify(token);
      socket.data.user = user;
      socket.emit('connected', { ok: true, state: this.stateFor(user) });
    } catch {
      socket.disconnect(true);
    }
  }

  broadcast(): void {
    for (const socket of this.server.sockets.sockets.values()) {
      const user = socket.data.user as AuthUser | undefined;
      if (user) socket.emit('state-updated', this.stateFor(user));
    }
  }

  private stateFor(user: AuthUser) {
    return user.role === 'patient' && user.patientId
      ? this.queueService.patientSnapshot(user.patientId)
      : this.queueService.snapshot();
  }
}
