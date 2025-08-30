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
import { WsAuthGuard } from '../guards/ws-guard';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../guards/ws-guard';

UseGuards(WsAuthGuard);
@WebSocketGateway( { cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

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
}