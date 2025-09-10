import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { AuthenticatedSocket, WsAuthMiddleware } from '../common/middleware/ws-auth.middleware'
import { Server } from 'socket.io'
@WebSocketGateway()
export class GroupMessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly wsAuthMiddleware: WsAuthMiddleware
    ) { }
    afterInit(server: Server) {
        server.use(this.wsAuthMiddleware.use);
    }

    handleConnection(client: AuthenticatedSocket) {
        
    }
    handleDisconnect(client: AuthenticatedSocket) {

    }

}
