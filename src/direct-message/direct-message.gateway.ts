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
// Import services needed for manual authentication
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway(3001, { cors: { origin: '*' } })
export class DirectMessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(DirectMessageGateway.name);
    constructor(
        private readonly directMessageService: DirectMessageService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async handleConnection(client: AuthenticatedSocket) {
        try {
            const token =
                client.handshake.auth?.token ||
                client.handshake.query?.token ||
                client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                throw new Error('No token provided');
            }

            const {id,email}= await this.jwtService.verifyAsync(token, {
                secret: this.configService.get('JWT_SECRET'),
            });

            client.user = { id, email };
            
            await this.directMessageService.connect(client.user.id, client.id);
            this.logger.log(`Client connected: ${client.id}, User ID: ${client.user.id}`);

        } catch (error) {
            this.logger.error(`Authentication failed: ${error.message}`);
            client.emit('unauthorized', { message: 'Authentication failed' });
            client.disconnect();
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

    @UseGuards(WsAuthGuard)
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

    @UseGuards(WsAuthGuard)
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

        this.logger.log(`Message from ${senderId} sent to room ${conversationId}`);
        return {
            status: 'Message Sent',
            message,
        };
    }
}