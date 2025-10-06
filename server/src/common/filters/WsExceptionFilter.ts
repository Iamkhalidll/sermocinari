import {
  Catch,
  ArgumentsHost,
} from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io'; 

@Catch(WsException)
export class CustomWsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>(); 
    const data = host.switchToWs().getData();

    const errorResponse = {
      status: 'error',
      message: exception.message,
      data,
      timestamp: new Date().toISOString(),
    };

    client.emit('error', errorResponse); 
  }
}
