import { Module } from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';

@Module({
  providers: [DirectMessageService]
})
export class DirectMessageModule {}
