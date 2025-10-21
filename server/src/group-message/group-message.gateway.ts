import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { AuthenticatedSocket, WsAuthMiddleware } from '../common/middleware/ws-auth.middleware'
import { Server } from 'socket.io'
import { ConnectionManager } from 'src/common/utilities/connection-manager';
import { Logger, UseGuards } from '@nestjs/common';
import { GroupMessageService } from './group-message.service';
import { AdminGuard, AdminOnly } from '../guards/admin.guard';
import { SessionService } from 'src/session/session.service';

@WebSocketGateway()
export class GroupMessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private typingUsers = new Map<string, Set<string>>();
    private readonly logger = new Logger(GroupMessageGateway.name)
    constructor(
        private readonly wsAuthMiddleware: WsAuthMiddleware,
        private readonly connectionManager: ConnectionManager,
        private readonly groupMessageService: GroupMessageService,
        private readonly sessionService: SessionService
    ) { }
    afterInit(server: Server) {
        server.use(this.wsAuthMiddleware.use);
    }
    async handleConnection(client: AuthenticatedSocket) {
        await this.connectionManager.connect(client, "GROUP");
    }
    async handleDisconnect(client: AuthenticatedSocket) {
        await this.connectionManager.disconnect(client.id)
    }

    @SubscribeMessage('chat:group.create')
    async createGroup(
        @MessageBody() payload: { name: string, description: string, members?: string[] },
        @ConnectedSocket() client: AuthenticatedSocket
    ) {
        const groupId = await this.groupMessageService.createGroup(client.user.id, payload);
        this.logger.log(`Group with id ${groupId} created successfully by ${client.user.id}`);

        await client.join(groupId);
        client.emit('chat:group.created', { groupId });

        if (payload.members) {
            for (const memberId of payload.members) {
                if (memberId !== client.user.id) {
                    const memberSessions = await this.groupMessageService.getUserSession(memberId);
                    for (const session of memberSessions) {
                        const memberSocket = this.server.sockets.sockets.get(session.socketId);
                        if (memberSocket) {
                            await memberSocket.join(groupId);
                            memberSocket.emit('chat:group.member.added', { groupId, groupName: payload.name, addedBy: client.user.id });
                        }
                    }
                }
            }
        }
    }

    @SubscribeMessage('chat:group.member.add')
    @AdminOnly()
    @UseGuards(AdminGuard)
    async addMember(
        @MessageBody() payload: { groupId: string, memberId: string },
        @ConnectedSocket() client: AuthenticatedSocket
    ) {
        await this.groupMessageService.addMember(payload.groupId, payload.memberId);
        this.logger.log(`Member ${payload.memberId} added to group ${payload.groupId} by ${client.user.id}`);

        const memberSessions = await this.groupMessageService.getUserSession(payload.memberId);
        for (const session of memberSessions) {
            const memberSocket = this.server.sockets.sockets.get(session.socketId);
            if (memberSocket) {
                await memberSocket.join(payload.groupId);
                memberSocket.emit('chat:group.member.added', { groupId: payload.groupId, addedBy: client.user.id });
            }
        }

        client.emit('chat:group.member.added', { groupId: payload.groupId, memberId: payload.memberId });
    }

    @SubscribeMessage('chat:message.send')
    async sendMessage(
        @MessageBody() payload: { groupId: string, message: string },
        @ConnectedSocket() client: AuthenticatedSocket
    ) {
        const message = await this.groupMessageService.saveMessage(client.user.id, payload.groupId, payload.message);
        this.logger.log(`Group message sent by ${client.user.id}`);

        this.server.to(payload.groupId).emit('chat:message.new', { ...message });

        const roomSockets = await this.server.in(payload.groupId).fetchSockets();
        const onlineMemberIds = roomSockets
            .filter(socket => socket.data.user?.id !== client.user.id)
            .map(socket => socket.data.user?.id);

        if (onlineMemberIds.length > 0) {
            await this.groupMessageService.markAsDelivered(message.id);
            client.emit('chat:message.delivered', { messageId: message.id, deliveredAt: new Date() });
        }
    }

    @SubscribeMessage('chat:message.read')
    async markAsRead(
        @MessageBody() payload: { messageId: string },
        @ConnectedSocket() client: AuthenticatedSocket
    ) {
        const updatedMessage = await this.groupMessageService.markAsRead(payload.messageId, client.user.id);
        const senderSessions = await this.groupMessageService.getUserSession(updatedMessage.senderId);
        for (const session of senderSessions) {
            const senderSocket = this.server.sockets.sockets.get(session.socketId);
            if (senderSocket) {
                senderSocket.emit('chat:message.read', {
                    messageId: payload.messageId,
                    readBy: client.user.id,
                    readAt: updatedMessage.readAt
                });
            }
        }

        this.logger.log(`Message ${payload.messageId} marked as read by ${client.user.id}`);
    }

    @SubscribeMessage('chat:group.leave')
    async leaveGroup(
        @MessageBody() payload: { groupId: string },
        @ConnectedSocket() client: AuthenticatedSocket
    ) {
        await this.groupMessageService.leaveGroup(client.user.id, payload.groupId);
        const sessions = await this.sessionService.getUserSessions(client.user.id);
        for (const session of sessions) {
            const socket = this.server.sockets.sockets.get(session.socketId);
            if (socket) {
                await socket.leave(payload.groupId);
            }
        }
        this.logger.log(`User ${client.user.id} left group ${payload.groupId}`);
        client.emit('chat:group.left', { groupId: payload.groupId });
        this.server.to(payload.groupId).emit('chat:group.member.left', { groupId: payload.groupId, memberId: client.user.id });
    }

    @SubscribeMessage('chat:group.typing.start')
  async typingStarted(
    @MessageBody() payload: { groupId: string },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    await this.groupMessageService.verifyUserInGroup(client.user.id, payload.groupId);
    let set = this.typingUsers.get(payload.groupId);
    if (!set) {
      set = new Set<string>();
      this.typingUsers.set(payload.groupId, set);
    }
    set.add(client.user.id);
    
    const typingUserIds = Array.from(set);
    
    client.to(payload.groupId).emit('chat:group.typing.update', { 
      groupId: payload.groupId, 
      userIds: typingUserIds 
    });
  }
  
  @SubscribeMessage('chat:group.typing.stop')
  async typingStopped(
    @MessageBody() payload: { groupId: string },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    await this.groupMessageService.verifyUserInGroup(client.user.id, payload.groupId);
    const set = this.typingUsers.get(payload.groupId);
    if (set) {
      set.delete(client.user.id);
      if (set.size === 0) {
        this.typingUsers.delete(payload.groupId);
      } else {
        this.typingUsers.set(payload.groupId, set);
      }
    }
    
    const typingUserIds = set ? Array.from(set) : [];
    
    client.to(payload.groupId).emit('chat:group.typing.update', { 
      groupId: payload.groupId, 
      userIds: typingUserIds 
    });
  }
}
