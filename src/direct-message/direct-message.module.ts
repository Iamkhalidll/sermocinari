import { Module } from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';
import { DirectMessageRepository } from './direct-message.repository';
import { DirectMessageGateway } from './direct-message.gateway';

@Module({
  providers: [DirectMessageService,DirectMessageRepository,DirectMessageGateway]
})
export class DirectMessageModule {}
