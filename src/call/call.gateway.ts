import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { AuthenticatedSocket, WsAuthMiddleware } from '../common/middleware/ws-auth.middleware'
import { Server } from 'socket.io';

@WebSocketGateway()
export class CallGateway {
  constructor(
      private readonly wsAuthMiddleware: WsAuthMiddleware,
  ){}

   afterInit(server: Server) {
          server.use(this.wsAuthMiddleware.use);
      }

  
}
