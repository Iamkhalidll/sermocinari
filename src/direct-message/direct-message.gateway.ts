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
import { AuthenticatedSocket, WsAuthMiddleware } from '../common/middleware/ws-auth.middleware'
import { DirectMessageService } from './direct-message.service';
import { ConnectionManager } from 'src/common/utilities/connection-manager';

@WebSocketGateway(3001, { cors: { origin: '*' } })
export class DirectMessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(DirectMessageGateway.name);
    constructor(
        private readonly directMessageService: DirectMessageService,
        private readonly wsAuthMiddleware: WsAuthMiddleware,
        private readonly connectionManager: ConnectionManager
    ) { }

    afterInit(server: Server) {
        server.use(this.wsAuthMiddleware.use);
    }
    async handleConnection(client: AuthenticatedSocket) {
        await this.connectionManager.connect(client, 'DIRECT')

    }
    async handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
        await this.connectionManager.disconnect(client.id)
    }

    @SubscribeMessage('start-conversation')
    async startConversation(
        @MessageBody() payload: { toUserId: string },
        @ConnectedSocket() client: AuthenticatedSocket,
    ) {
        const senderId = client.user.id;
        const recipientId = payload.toUserId;

        const conversationId = await this.directMessageService.startConversation(
            senderId,
            recipientId,
        );

        await client.join(conversationId);
        this.logger.log(
            `Sender ${senderId} (${client.id}) joined room ${conversationId}`,
        );

        const recipientSessions = await this.directMessageService.getUserSockets(recipientId);
        console.log(recipientSessions)
        if (recipientSessions.length > 0) {
            for (const session of recipientSessions) {
                const recipientSocket = this.server.sockets.sockets.get(session.socketId);
                if (recipientSocket) {
                    await recipientSocket.join(conversationId);
                    this.logger.log(`Recipient ${recipientId} (${session.socketId}) joined room ${conversationId}`);
                }
            }
        }
        return {
            status: 'OK',
            conversationId,
        };
    }

    @SubscribeMessage('send-direct-message')
    async handleDirectMessage(
        @MessageBody() payload: { conversationId: string; content: string },
        @ConnectedSocket() client: AuthenticatedSocket,
    ) {
        const { conversationId, content } = payload;
        const senderId = client.user.id;

        const message = await this.directMessageService.sendTextMessage(
            conversationId,
            senderId,
            content,
        );
        client.emit('message-sent', {
            ...message,
            isDelivered: false,
            deliveredAt: null,
        }); const recipientSessions = await this.directMessageService.getUserSockets(message.recipientId as string)
        if (recipientSessions.length > 0) {
            for (const session of recipientSessions) {
                const recipientSocket = this.server.sockets.sockets.get(session.socketId);
                if (recipientSocket) {
                    recipientSocket.emit('new-direct-message', message);
                }
            }
            this.logger.log(`Message delivered from ${senderId} sent to ${message.recipientId}`);
            await this.directMessageService.markAsDelivered(message.id);
            client.emit(' ', {
                messageId: message.id,
                deliveredAt: new Date(),
            });
        } else { this.server.to(conversationId).emit('new-direct-message', message); }

        return {
            status: 'Message Sent',
            message,
        };
    }
}