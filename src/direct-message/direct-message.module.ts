import { Module } from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';
import { DirectMessageRepository } from './direct-message.repository';
import { DirectMessageGateway } from './direct-message.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports:[JwtModule,ConfigModule],
  providers: [DirectMessageService,DirectMessageRepository,DirectMessageGateway]
})
export class DirectMessageModule {}
