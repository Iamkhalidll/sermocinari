import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface ReqInrf extends Request {
   user:{
    id:string,
    email:string
   }
}
@Injectable()
export class JWTAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request:ReqInrf= context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Unauthorized: No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Unauthorized: Invalid token format');
    }

    try {
      const secretKey = process.env.JWT_SECRET;
      const {id,email}= await this.jwtService.verifyAsync(token, { secret: secretKey });

      // Attach user info to request
      request.user = {
        id,
        email
      };

      return true;
    } catch (error) {
      console.error('JWT Verification Error:', error);
      throw new UnauthorizedException('Unauthorized: Invalid or expired token');
    }
  }
}
