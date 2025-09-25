import { Module } from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';
import { DirectMessageRepository } from './direct-message.repository';
import { DirectMessageGateway } from './direct-message.gateway';
import { WsAuthMiddleware } from 'src/common/middleware/ws-auth.middleware';
import { ConnectionManager } from 'src/common/utilities/connection-manager';
import { ConversationManager } from 'src/common/utilities/conversation-manager';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { SessionModule } from 'src/session/session.module';

@Module({
  imports:[JwtModule,ConfigModule,SessionModule],
  providers: [DirectMessageService,DirectMessageRepository,DirectMessageGateway,WsAuthMiddleware,ConnectionManager,ConversationManager]
})
export class DirectMessageModule {}
