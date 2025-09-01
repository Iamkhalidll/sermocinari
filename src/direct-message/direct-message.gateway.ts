import { Logger, UseGuards } from '@nestjs/common';
import {
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
} from '@nestjs/websockets';
import { WsAuthGuard } from '../guards/ws-guard';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../guards/ws-guard';
import { DirectMessageService } from './direct-message.service';

UseGuards(WsAuthGuard);
@WebSocketGateway({ cors: { origin: '*' } })
export class DirectMessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(DirectMessageGateway.name);
    private readonly directMessageService: DirectMessageService;

    handleConnection(client: AuthenticatedSocket) {
        this.logger.log(`Client connected ${client.id}`);
        client.broadcast.emit('user-joined', {
            message: `User joined the chat: ${client.id}`,
            clientId: client.id,
        });
    }

    handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
        this.logger.log(`Client disconnected ${client.id}`);
        this.server.emit('user-left', {
            message: `User left the chat: ${client.id}`,
            clientId: client.id,
        });
    }
    
    @SubscribeMessage('send-direct-message')
    async handleDirectMessage(
        @MessageBody() payload: { to: string; message: string },
        @ConnectedSocket() client: AuthenticatedSocket,
    ) {
        await this.directMessageService.sendTextMessage(client.user.id, payload.to, payload.message);
        this.logger.log(`Saved Direct  message from ${client.user.id} to ${payload.to}`);

        this.server.emit('direct-message', {
            from: client.user.id,
            to: payload.to,
            message: payload.message,
        });
        this.logger.log(`Direct message sent from ${client.user.id} to ${payload.to}`);
        return{
            status: 'Message sent'
        }
    }

}