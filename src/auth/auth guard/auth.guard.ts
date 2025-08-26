import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JWTAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Unauthorized: No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Unauthorized: Invalid token format');
    }

    try {
      const secretKey = process.env.JWT_SECRET;
      const decodedToken = await this.jwtService.verifyAsync(token, { secret: secretKey });

      // Attach user info to request
      request.user = {
        userId: decodedToken.id, // Assuming JWT `sub` contains user ID
      };

      return true;
    } catch (error) {
      console.error('JWT Verification Error:', error);
      throw new UnauthorizedException('Unauthorized: Invalid or expired token');
    }
  }
}
