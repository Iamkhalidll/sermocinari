import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    email: string;
  };
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    
    try {
      const token = 
        client.handshake.auth?.token || 
        client.handshake.query?.token ||
        client.request.headers.authorization?.split(' ')[1];

      if (!token) {
        client.emit('unauthorized', { message: 'No token provided' });
        client.disconnect();
        return false;
      }

      // Verify token
      const {id,email} = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Attach user to socket
      (client as AuthenticatedSocket).user = {
        id ,
        email
      };

      return true;
    } catch (error) {
      client.emit('unauthorized', { message: 'Invalid or expired token' });
      client.disconnect();
      return false;
    }
  }
}