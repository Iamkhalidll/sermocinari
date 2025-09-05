import { Logger, UseGuards } from '@nestjs/common';
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
import { AuthenticatedSocket, WsAuthGuard } from '../guards/ws-guard';
import { DirectMessageService } from './direct-message.service';

@UseGuards(WsAuthGuard)
@WebSocketGateway(3001, { cors: { origin: '*' } })
export class DirectMessageGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(DirectMessageGateway.name);
    private readonly onlineUsers = new Map<string, string>();

    constructor(private readonly directMessageService: DirectMessageService) {}

    handleConnection(client: AuthenticatedSocket) {
        this.logger.log(`Client connected: ${client.id}, User ID: ${client.user.id}`);
        this.onlineUsers.set(client.user.id, client.id);
    }

    handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
        this.logger.log(`Client disconnected: ${client.id}, User ID: ${client.user.id}`);
        if (client.user) {
            this.onlineUsers.delete(client.user.id);
        }
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

        const recipientSocketId = this.onlineUsers.get(recipientId);
        if (recipientSocketId) {
            const recipientSocket = this.server.sockets.sockets.get(recipientSocketId);
            if(recipientSocket) {
               await recipientSocket.join(conversationId);
                this.logger.log(
                    `Recipient ${recipientId} (${recipientSocketId}) joined room ${conversationId}`,
                );
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

        this.server.to(conversationId).emit('new-direct-message', message);

        this.logger.log(
            `Message from ${senderId} sent to room ${conversationId}`,
        );

        return {
            status: 'Message Sent',
            message,
        };
    }
}

