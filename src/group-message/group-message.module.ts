import { Module } from '@nestjs/common';
import { GroupMessageService } from './group-message.service';
import { GroupMessageGateway } from './group-message.gateway';
import { WsAuthMiddleware } from 'src/common/middleware/ws-auth.middleware';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ConversationManager } from 'src/common/utilities/conversation-manager';
import { ConnectionManager } from 'src/common/utilities/connection-manager';
import { GroupMessageRepository } from './group-message.repository';
import { SessionModule } from 'src/session/session.module';

@Module({
  imports:[JwtModule,ConfigModule,SessionModule],
  providers: [GroupMessageService, GroupMessageGateway,WsAuthMiddleware,ConversationManager,ConnectionManager,GroupMessageRepository]
})
export class GroupMessageModule {}
