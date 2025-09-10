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
import { AuthenticatedSocket,WsAuthMiddleware } from '../common/middleware/ws-auth.middleware'
import { DirectMessageService } from './direct-message.service';

@WebSocketGateway(3001, { cors: { origin: '*' } })
export class DirectMessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(DirectMessageGateway.name);
    constructor(
        private readonly directMessageService: DirectMessageService,
        private readonly wsAuthMiddleware:WsAuthMiddleware
    ) { }
    async pendingMessages(client: AuthenticatedSocket) {
        const unDeliveredMessages = await this.directMessageService.getPendingMessage(client.user.id)
        if (unDeliveredMessages) {
            for (const message of unDeliveredMessages) {
                client.emit("new-direct-message", message)
                await this.directMessageService.markAsDelivered(message.id)
            }
            this.logger.log("Messages have been delivered")
        }

    }
    afterInit(server: Server) {
        server.use(this.wsAuthMiddleware.use);
        }
    async handleConnection(client: AuthenticatedSocket) {
        try {
            await this.pendingMessages(client);
            await this.directMessageService.connect(client.user.id, client.id);
            const conversations = await this.directMessageService.getUserConversations(client.user.id);
            if (conversations.length > 0) {
                for (const conversation of conversations) {
                    await client.join(conversation.id);
                }
            }
            this.logger.log(`Client connected: ${client.id}, User ID: ${client.user.id}`);

        } catch (error) {
            this.logger.error(`Authentication failed: ${error.message}`);
            client.emit('unauthorized', { message: 'Authentication failed' });
        }
    }
    async handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
        if (client.user) {
            await this.directMessageService.disconnect(client.id);
            this.logger.log(`Client disconnected: ${client.id}, User ID: ${client.user.id}`);
        } else {
            this.logger.log(`Client disconnected: ${client.id} (unauthenticated)`);
        }
        client.disconnect();
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
        const recipientSessions = await this.directMessageService.getUserSockets(message.recipientId as string)
        if (recipientSessions.length > 0) {
            this.server.to(conversationId).emit('new-direct-message', message);
            await this.directMessageService.markAsDelivered(message.id);
            this.logger.log(`Message delivered from ${senderId} sent to ${message.recipientId}`);
        }
        this.server.to(conversationId).emit('new-direct-message', message);

        return {
            status: 'Message Sent',
            message,
        };
    }
}