import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/messages',
  cors: { origin: '*', credentials: true },
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessageGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      });

      (client as any).userId = payload.sub;
      await client.join(`user:${payload.sub}`);
      this.logger.log(`WS connected: userId=${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS disconnected: userId=${(client as any).userId ?? 'unknown'}`);
  }

  /** Push a new message to the recipient's room. */
  emitNewMessage(recipientId: string, payload: Record<string, any>) {
    this.server.to(`user:${recipientId}`).emit('new_message', payload);
  }

  /** Confirm delivery back to the sender (multi-tab support). */
  emitMessageSent(senderId: string, payload: Record<string, any>) {
    this.server.to(`user:${senderId}`).emit('message_sent', payload);
  }
}
