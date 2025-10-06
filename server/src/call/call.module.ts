import { Logger, Module } from '@nestjs/common';
import { CallGateway } from './call.gateway';
import { CallService } from './call.service';
import { CallRepository } from './call.repository';
import { WsAuthMiddleware } from 'src/common/middleware/ws-auth.middleware';
import { ConversationManager } from 'src/common/utilities/conversation-manager';
import { ConnectionManager } from 'src/common/utilities/connection-manager';
import { SessionModule } from ' /session/session.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [SessionModule,JwtModule,ConfigModule],
  providers: [CallGateway, CallService,CallRepository,WsAuthMiddleware,ConversationManager,ConnectionManager,Logger]
})
export class CallModule {}
