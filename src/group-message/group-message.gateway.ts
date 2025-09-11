import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { AuthenticatedSocket, WsAuthMiddleware } from '../common/middleware/ws-auth.middleware'
import { Server } from 'socket.io'
import { ConnectionManager } from 'src/common/utilities/connection-manager';
@WebSocketGateway()
export class GroupMessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly wsAuthMiddleware: WsAuthMiddleware,
        private readonly connectionManager:ConnectionManager
    ) { }
    afterInit(server: Server) {
        server.use(this.wsAuthMiddleware.use);
    }
   async handleConnection(client: AuthenticatedSocket) {
        await this.connectionManager.connect(client,"GROUP")
    }
   async handleDisconnect(client: AuthenticatedSocket) {
        await this.connectionManager.disconnect(client.id)
    }




}
