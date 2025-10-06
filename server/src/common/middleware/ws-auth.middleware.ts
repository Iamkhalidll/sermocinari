import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  user: { id: string; email: string };
}

@Injectable()
export class WsAuthMiddleware {
  private readonly logger = new Logger(WsAuthMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

 use = (client: AuthenticatedSocket, next: (err?: any) => void) => {
  const authenticate = async () => {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`No token provided for socket ${client.id}`);
        return next(new Error('Unauthorized'));
      }

      const { id, email } = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.user = { id, email };
      this.logger.log(`Authenticated socket ${client.id}, user ${id}`);
      return next();
    } catch (error) {
      this.logger.error(`Auth failed for socket ${client.id}: ${error.message}`);
      return next(new Error('Unauthorized'));
    }
  };

  authenticate().catch((error) => {
    this.logger.error(`Unexpected error in auth middleware: ${error.message}`);
    next(new Error('Internal server error'));
  });
};
}
