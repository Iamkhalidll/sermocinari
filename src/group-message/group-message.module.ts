import { Module } from '@nestjs/common';
import { GroupMessageService } from './group-message.service';
import { GroupMessageGateway } from './group-message.gateway';
import { WsAuthMiddleware } from 'src/common/middleware/ws-auth.middleware';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ConversationManager } from 'src/common/utilities/conversation-manager';
import { ConnectionManager } from 'src/common/utilities/connection-manager';

@Module({
  imports:[JwtModule,ConfigModule],
  providers: [GroupMessageService, GroupMessageGateway,WsAuthMiddleware,ConversationManager,ConnectionManager]
})
export class GroupMessageModule {}
