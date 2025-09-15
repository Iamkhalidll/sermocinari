import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { AuthenticatedSocket, WsAuthMiddleware } from '../common/middleware/ws-auth.middleware'
import { Server } from 'socket.io'
import { ConnectionManager } from 'src/common/utilities/connection-manager';
import { Logger } from '@nestjs/common';
import { GroupMessageService } from './group-message.service';
@WebSocketGateway()
export class GroupMessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(GroupMessageGateway.name)
    constructor(
        private readonly wsAuthMiddleware: WsAuthMiddleware,
        private readonly connectionManager:ConnectionManager,
        private readonly groupMessageService : GroupMessageService
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
    @SubscribeMessage('create-group')
    async createGroup(
        @MessageBody() payload:{name:string,description:string,members?:string[]},
        @ConnectedSocket() client: AuthenticatedSocket
    ){
        const groupId = await this.groupMessageService.createGroup(client.user.id,payload);
        this.logger.log(`Group with id ${groupId} created successfully by ${client.user.id}`)
        client.emit('group-created');
    }


}
