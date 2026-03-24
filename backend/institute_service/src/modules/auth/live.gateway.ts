import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { LiveClassService } from './live-class.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  instituteId: string;
}

@WebSocketGateway({
  namespace: '/live',
  cors: { origin: '*', credentials: true },
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveGateway.name);
  /** Maps socketId → sessionId for cleanup on disconnect */
  private socketSessionMap = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly liveClassService: LiveClassService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      });

      client.userId = payload.sub;
      client.email = payload.email;
      client.role = payload.role;
      client.instituteId = payload.instituteId;
      this.logger.log(`Live WS connected: userId=${payload.sub} role=${payload.role}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const sessionId = this.socketSessionMap.get(client.id);
    if (sessionId && client.userId) {
      await this._handleLeave(client, sessionId);
    }
    this.socketSessionMap.delete(client.id);
    this.logger.log(`Live WS disconnected: userId=${client.userId ?? 'unknown'}`);
  }

  // ─── Room Management ────────────────────────────────────────────────────────

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const { sessionId } = data;
    await client.join(`session:${sessionId}`);
    this.socketSessionMap.set(client.id, sessionId);

    // Track DB participation
    try {
      await this.liveClassService.joinSession(sessionId, client.userId, client.instituteId);
    } catch { /* session might not exist yet */ }

    const participants = await this.liveClassService.getSessionParticipants(sessionId);

    // Notify the joining user of current room state
    client.emit('room-state', {
      sessionId,
      participants,
      userId: client.userId,
    });

    // Notify others that a new peer joined (triggers WebRTC offer from teacher)
    client.to(`session:${sessionId}`).emit('peer-joined', {
      peerId: client.userId,
      email: client.email,
      role: client.role,
      socketId: client.id,
    });

    this.logger.log(`User ${client.userId} joined session ${sessionId}`);
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    await this._handleLeave(client, data.sessionId);
    this.socketSessionMap.delete(client.id);
  }

  private async _handleLeave(client: AuthenticatedSocket, sessionId: string) {
    client.leave(`session:${sessionId}`);
    try {
      await this.liveClassService.leaveSession(sessionId, client.userId);
    } catch { /* ignore */ }

    client.to(`session:${sessionId}`).emit('peer-left', {
      peerId: client.userId,
      socketId: client.id,
    });

    this.logger.log(`User ${client.userId} left session ${sessionId}`);
  }

  // ─── WebRTC Signaling ────────────────────────────────────────────────────────

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetSocketId: string; offer: RTCSessionDescriptionInit; sessionId: string },
  ) {
    this.server.to(data.targetSocketId).emit('offer', {
      offer: data.offer,
      fromSocketId: client.id,
      fromUserId: client.userId,
      sessionId: data.sessionId,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetSocketId: string; answer: RTCSessionDescriptionInit; sessionId: string },
  ) {
    this.server.to(data.targetSocketId).emit('answer', {
      answer: data.answer,
      fromSocketId: client.id,
      sessionId: data.sessionId,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetSocketId: string; candidate: RTCIceCandidateInit; sessionId: string },
  ) {
    this.server.to(data.targetSocketId).emit('ice-candidate', {
      candidate: data.candidate,
      fromSocketId: client.id,
      sessionId: data.sessionId,
    });
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────

  @SubscribeMessage('chat-message')
  handleChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; message: string },
  ) {
    const payload = {
      id: `${Date.now()}-${client.id}`,
      userId: client.userId,
      email: client.email,
      role: client.role,
      message: data.message,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`session:${data.sessionId}`).emit('chat-message', payload);
  }

  // ─── Hand Raise ──────────────────────────────────────────────────────────

  @SubscribeMessage('raise-hand')
  handleRaiseHand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; raised: boolean },
  ) {
    client.to(`session:${data.sessionId}`).emit('hand-raised', {
      userId: client.userId,
      email: client.email,
      raised: data.raised,
    });
  }

  // ─── Session Control (teacher) ─────────────────────────────────────────────

  @SubscribeMessage('session-started')
  handleSessionStarted(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    this.server.to(`session:${data.sessionId}`).emit('session-started', {
      sessionId: data.sessionId,
      teacherId: client.userId,
    });
  }

  @SubscribeMessage('session-ended')
  handleSessionEnded(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    this.server.to(`session:${data.sessionId}`).emit('session-ended', {
      sessionId: data.sessionId,
    });
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  emitToSession(sessionId: string, event: string, payload: Record<string, any>) {
    this.server.to(`session:${sessionId}`).emit(event, payload);
  }
}
