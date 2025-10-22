import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthenticatedSocket, WsAuthMiddleware } from '../common/middleware/ws-auth.middleware';
import { DirectMessageService } from './direct-message.service';
import { ConnectionManager } from 'src/common/utilities/connection-manager';

@WebSocketGateway(3001, { cors: { origin: '*' } })
export class DirectMessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(DirectMessageGateway.name);

  constructor(
    private readonly directMessageService: DirectMessageService,
    private readonly wsAuthMiddleware: WsAuthMiddleware,
    private readonly connectionManager: ConnectionManager,
  ) { }

  afterInit(server: Server) {
    server.use(this.wsAuthMiddleware.use);
  }

  async handleConnection(client: AuthenticatedSocket) {
    await this.connectionManager.connect(client, 'DIRECT');
  }

  async handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
    await this.connectionManager.disconnect(client.id);
  }

  /** --------------------------------------------------
   *  Utility: emit an event to all active sessions of a user
   * -------------------------------------------------- */

  private async emitToUserSockets<T extends { conversationId?: string }>(
    userId: string,
    event: string,
    data: T,
    joinRoom = false,
  ) {
    const sessions = await this.directMessageService.getUserSockets(userId);

    for (const session of sessions) {
      const socket = this.server.sockets.sockets.get(session.socketId);
      if (!socket) continue;

      if (joinRoom && data?.conversationId) {
        await socket.join(data.conversationId);
        this.logger.log(`User ${userId} (${session.socketId}) joined room ${data.conversationId}`);
      } else {
        socket.emit(event, data);
      }
    }
  }

  @SubscribeMessage('chat:conversation.start')
  async startConversation(
    @MessageBody() payload: { toUserId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const senderId = client.user.id;
    const recipientId = payload.toUserId;

    const conversationId = await this.directMessageService.startConversation(senderId, recipientId);

    await client.join(conversationId);
    this.logger.log(`Sender ${senderId} (${client.id}) joined room ${conversationId}`);

    await this.emitToUserSockets(recipientId, 'chat:conversation.joined', { conversationId }, true);

    return {
      status: 'OK',
      conversationId,
    };
  }

  @SubscribeMessage('chat:message.read')
  async markAsRead(
    @MessageBody() payload: { messageId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const updatedMessage = await this.directMessageService.markAsRead(payload.messageId, client.user.id);

    await this.emitToUserSockets(updatedMessage.senderId, 'chat:message.read', {
      conversationId: updatedMessage.conversationId,
      messageId: payload.messageId,
      readBy: client.user.id,
      readAt: updatedMessage.readAt,
    });

    this.logger.log(`Message ${payload.messageId} marked as read by ${client.user.id}`);
  }

  @SubscribeMessage('chat:message.send')
  async handleDirectMessage(
    @MessageBody() payload: { conversationId: string; content: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { conversationId, content } = payload;
    const senderId = client.user.id;

    const message = await this.directMessageService.sendTextMessage(conversationId, senderId, content);

    client.emit('chat:message.sent', { ...message, isDelivered: false, deliveredAt: null });

    const recipientId = message.recipientId as string;
    const recipientSessions = await this.directMessageService.getUserSockets(recipientId);

    if (recipientSessions.length > 0) {
      await this.emitToUserSockets(recipientId, 'chat:message.new', message);
      this.logger.log(`Message delivered from ${senderId} sent to ${recipientId}`);

      await this.directMessageService.markAsDelivered(message.id);

      client.emit('chat:message.delivered', {
        messageId: message.id,
        deliveredAt: new Date(),
      });
    } else {
      client.to(conversationId).emit('chat:message.new', message);
    }

    return {
      status: 'Message Sent',
      message,
    };
  }

  @SubscribeMessage('chat:typing.start')
  async handleTypingStarted(
    @MessageBody() payload: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const recipientId = await this.directMessageService.verifyUserAndGetRecipient(
      payload.conversationId,
      client.user.id
    );

    await this.emitToUserSockets(recipientId, 'chat:typing.start', {
      conversationId: payload.conversationId,
      userId: client.user.id,
    });
  }

  @SubscribeMessage('chat:typing.stop')
  async handleTypingStopped(
    @MessageBody() payload: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const recipientId = await this.directMessageService.verifyUserAndGetRecipient(
      payload.conversationId,
      client.user.id
    );

    await this.emitToUserSockets(recipientId, 'chat:typing.stop', {
      conversationId: payload.conversationId,
      userId: client.user.id,
    });
  }

  @SubscribeMessage('chat:voice.record.start')
  async handleVoiceRecordStarted(
    @MessageBody() payload: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const recipientId = await this.directMessageService.verifyUserAndGetRecipient(
      payload.conversationId,
      client.user.id
    );
    await this.emitToUserSockets(recipientId, 'chat:voice.record.start',{userId:client.user.id,conversationId:payload.conversationId});
  }
  
  @SubscribeMessage('chat:voice.record.stop')
  async handleVoiceRecordStopped(
    @MessageBody() payload: { conversationId: string ,url:string, duration:number, createdAt:Date,mimeType:string},
    @ConnectedSocket() client: AuthenticatedSocket,
  ){
    const message = await this.directMessageService.sendVoiceMessage(payload.conversationId,payload.url,payload.duration,payload.mimeType,client.user.id,new Date(payload.createdAt));

    client.emit('chat:message.sent', { ...message, isDelivered: false, deliveredAt: null });
    this.logger.log(`Voice Message sent from ${client.user.id} in conversation ${payload.conversationId}`);
    const recipientId = message.recipientId as string;
    const recipientSessions = await this.directMessageService.getUserSockets(recipientId);
    if (recipientSessions.length > 0) {
      await this.emitToUserSockets(recipientId, 'chat:message.new', message);
      this.logger.log(`Voice Message delivered from ${client.user.id} sent to ${recipientId}`);
      await this.directMessageService.markAsDelivered(message.id);
      client.emit('chat:message.delivered', {
        messageId: message.id,
        deliveredAt: new Date(),
      });
    }else{
      client.to(payload.conversationId).emit('chat:message.new', message);
    }
  }
}
