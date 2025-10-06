import { SetMetadata,  ExecutionContext, CanActivate, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { AuthenticatedSocket } from 'src/common/middleware/ws-auth.middleware';
import { PrismaService } from 'src/prisma/prisma.service';

export const AdminOnly = () => SetMetadata('adminOnly', true);
interface GroupActionPayload {
  groupId: string;
  [key: string]: any;
}
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const adminOnly = this.reflector.get<boolean>('adminOnly', context.getHandler());
    if (!adminOnly) return true;

    const client:AuthenticatedSocket = context.switchToWs().getClient();
    const data:GroupActionPayload = context.switchToWs().getData();
    const userId = client.user.id;
    const groupId = data.groupId;

    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: groupId,
        userId,
        role: 'ADMIN'
      }
    });

    if (!participant) {
      throw new WsException('Only admins can perform this action');
    }

    return true;
  }
}