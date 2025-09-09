import { SubscribeMessage, WebSocketGateway,OnGatewayConnection,OnGatewayDisconnect } from '@nestjs/websockets';

@WebSocketGateway()
export class GroupMessageGateway implements OnGatewayConnection, OnGatewayDisconnect{
handleConnection(client: any, ...args: any[]) {
  
}
handleDisconnect(client: any) {
  
}

}
